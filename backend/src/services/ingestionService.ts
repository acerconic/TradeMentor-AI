/**
 * PDF Ingestion Pipeline Service
 * 
 * Pipeline:
 * 1. Read PDF file
 * 2. Extract text with pdf-parse
 * 3. Send to OpenRouter for classification (JSON only)
 * 4. Create / update course → module → lesson
 * 5. Save uploaded_materials record
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pool, query } from '../config/db';
import { openRouterService } from '../ai/openrouter';
import { FastifyBaseLogger } from 'fastify';

// ── Types ────────────────────────────────────────────────────
interface AIClassification {
    category: string;
    course_title: string;
    module_title: string;
    lesson_title: string;
    summary: string;
    language: 'RU' | 'UZ';
    source_language: string;
}

interface ExtractedPdfText {
    fullText: string;
    aiText: string;
}

interface LessonPlanItem {
    title: string;
    summary: string;
    sourceText: string;
}

interface StructuredLessonContent {
    summary_ru: string;
    summary_uz: string;
    content_source: string;
    content_ru: string;
    content_uz: string;
    key_points_ru: string[];
    key_points_uz: string[];
    glossary_ru: Array<{ term: string; definition: string }>;
    glossary_uz: Array<{ term: string; definition: string }>;
    practice_ru: string;
    practice_uz: string;
    conclusion_ru: string;
    conclusion_uz: string;
    additional_ru: string;
    additional_uz: string;
}

interface EnrichedLessonPlanItem extends LessonPlanItem {
    structured: StructuredLessonContent;
}

interface IngestionResult {
    success: boolean;
    course_id?: string;
    course_title?: string;
    lesson_id?: string;
    lesson_title?: string;
    lessons_created?: number;
    category?: string;
    material_id?: string;
    error?: string;
}

type PgClient = {
    query: (text: string, params?: any[]) => Promise<any>;
};

function isPgUndefinedColumnError(e: any): boolean {
    return e?.code === '42703' || String(e?.message || '').toLowerCase().includes('column') && String(e?.message || '').toLowerCase().includes('does not exist');
}

async function withTransaction<T>(fn: (client: PgClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (e) {
        try { await client.query('ROLLBACK'); } catch { /* ignore */ }
        throw e;
    } finally {
        client.release();
    }
}

function normalizeClassification(input: Partial<AIClassification>, fallbackName: string): AIClassification {
    const safe = (v: any) => String(v ?? '').replace(/\s+/g, ' ').trim();
    const clamp = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

    const category = clamp(safe(input.category) || 'Other', 100);
    const course_title = clamp(safe(input.course_title) || `${category} Trading Mastery`, 50);
    const module_title = clamp(safe(input.module_title) || 'Core Concepts', 50);
    const lesson_title = clamp(safe(input.lesson_title) || safe(fallbackName).replace(/\.pdf$/i, ''), 60);
    const summary = clamp(safe(input.summary) || `A comprehensive guide on ${lesson_title} for professional traders.`, 1000);
    const language = normalizeLanguage(input.language, fallbackName, summary);
    const source_language = normalizeSourceLanguage(input.source_language, fallbackName, summary);

    return { category, course_title, module_title, lesson_title, summary, language, source_language };
}

function normalizeLanguage(value: any, filename: string, contentSample = ''): 'RU' | 'UZ' {
    const v = String(value || '').trim().toUpperCase();
    if (v === 'RU' || v === 'RUSSIAN') return 'RU';
    if (v === 'UZ' || v === 'UZBEK' || v === 'UZBEKISTAN') return 'UZ';

    const filenameLower = String(filename || '').toLowerCase();
    if (/(^|[^a-z])(ru|rus)([^a-z]|$)/.test(filenameLower)) return 'RU';
    if (/(^|[^a-z])(uz|uzb)([^a-z]|$)/.test(filenameLower)) return 'UZ';

    const text = String(contentSample || '');
    const cyrillicMatches = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
    const uzLatinHints = (text.match(/\b(uchun|bozor|savdo|dars|daraja|xatar|psixologiya|kurs|modul|likvid|tahlil)\b/gi) || []).length;

    if (cyrillicMatches > 80) return 'RU';
    if (uzLatinHints >= 3) return 'UZ';
    return 'RU';
}

function normalizeSourceLanguage(value: any, filename: string, contentSample = ''): string {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized && normalized.length <= 8) {
        if (normalized === 'RUSSIAN') return 'RU';
        if (normalized === 'UZBEK' || normalized === 'UZBEKISTAN') return 'UZ';
        if (normalized === 'ENGLISH') return 'EN';
        return normalized;
    }

    const filenameLower = String(filename || '').toLowerCase();
    if (/(^|[^a-z])(ru|rus)([^a-z]|$)/.test(filenameLower)) return 'RU';
    if (/(^|[^a-z])(uz|uzb)([^a-z]|$)/.test(filenameLower)) return 'UZ';
    if (/(^|[^a-z])(en|eng)([^a-z]|$)/.test(filenameLower)) return 'EN';

    const text = String(contentSample || '');
    const cyrillicMatches = (text.match(/[а-яА-ЯёЁ]/g) || []).length;
    const uzLatinHints = (text.match(/\b(uchun|bozor|savdo|dars|daraja|xatar|psixologiya|kurs|modul|likvid|tahlil)\b/gi) || []).length;
    const enHints = (text.match(/\b(the|and|with|market|trading|risk|entry|liquidity|trend)\b/gi) || []).length;

    if (cyrillicMatches > 80) return 'RU';
    if (uzLatinHints >= 3) return 'UZ';
    if (enHints >= 6) return 'EN';

    return 'UNKNOWN';
}

// ── PDF Text Extraction ──────────────────────────────────────
async function extractPdfText(filePath: string): Promise<ExtractedPdfText> {
    const buffer = fs.readFileSync(filePath);

    // Dynamically require pdf-parse (handles both ESM and CJS)
    let pdfParse: any;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        pdfParse = require('pdf-parse');
        if (typeof pdfParse !== 'function' && typeof pdfParse.default === 'function') {
            pdfParse = pdfParse.default;
        }
    } catch (e1) {
        try {
            const mod = await import('pdf-parse');
            pdfParse = typeof mod === 'function' ? mod : mod.default;
        } catch {
            throw new Error('pdf-parse module not found. Run: npm install pdf-parse');
        }
    }

    const data = await pdfParse(buffer);
    const raw = String(data.text || '')
        .replace(/\u0000/g, '')
        .replace(/\r/g, '\n')
        .replace(/\t/g, ' ');

    const fullText = raw
        .replace(/\n{3,}/g, '\n\n')
        .split('\n')
        .map(line => line.trimEnd())
        .join('\n')
        .trim()
        .substring(0, 220000);

    // Keep compact text for LLM prompts.
    const aiText = fullText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 6000);

    return { fullText, aiText };
}

// ── AI Classification ────────────────────────────────────────
async function classifyWithAI(
    extractedText: string,
    originalFileName: string,
    log?: FastifyBaseLogger
): Promise<AIClassification> {
    const prompt = `You are a trading education content classifier.
Analyze this PDF content and return ONLY a JSON object with no explanations.

PDF filename: "${originalFileName}"
PDF content sample:
${extractedText}

Return ONLY this JSON (no markdown, no explanation):
{
  "source_language": "ISO-like source language code, e.g. RU/UZ/EN/TR/AR",
  "language": "RU or UZ (detected main language of this PDF)",
  "category": "one of: SMC, ICT, Price Action, Risk Management, Psychology, Fundamental, Technical, Other",
  "course_title": "suggested course title (short, max 50 chars)",
  "module_title": "suggested module name (short, max 50 chars)",
  "lesson_title": "specific lesson title derived from this PDF (short, max 60 chars)",
  "summary": "a 1-2 sentence summary of what this PDF teaches"
}`;

    const models = [
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.1-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct:free',
        'google/gemma-2-9b-it:free'
    ];

    let lastError = '';
    for (const model of models) {
        try {
            const data = await openRouterService.chat(model, [
                { role: 'system', content: 'You are a JSON-only API. Return only valid JSON with no extra text.' },
                { role: 'user', content: prompt }
            ], undefined);

            const raw = data?.choices?.[0]?.message?.content || '';

            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found in response');

            const parsed = JSON.parse(jsonMatch[0]) as AIClassification;

            // Validate required fields
            if (!parsed.category || !parsed.course_title || !parsed.lesson_title) {
                throw new Error('Missing required classification fields');
            }

            return normalizeClassification(parsed, originalFileName);
        } catch (e: any) {
            lastError = e.message;
            if (log) log.warn(`Classification failed for model ${model}: ${e.message}`);
        }
    }

    // Fallback: classify from filename
    if (log) log.warn(`AI classification failed, using filename fallback. Last error: ${lastError}`);
    return normalizeClassification(classifyFromFilename(originalFileName), originalFileName);
}

// ── Filename Fallback Classifier ─────────────────────────────
function classifyFromFilename(filename: string): AIClassification {
    const name = filename.replace('.pdf', '').replace(/_/g, ' ');

    let category = 'SMC';
    const lower = name.toLowerCase();
    if (lower.includes('ict') || lower.includes('inner circle')) category = 'ICT';
    else if (lower.includes('elliot') || lower.includes('wave')) category = 'Technical';
    else if (lower.includes('psychology') || lower.includes('psych')) category = 'Psychology';
    else if (lower.includes('risk') || lower.includes('management')) category = 'Risk Management';
    else if (lower.includes('price action') || lower.includes('snr') || lower.includes('snd')) category = 'Price Action';
    else if (lower.includes('order block') || lower.includes('ob')) category = 'SMC';
    else if (lower.includes('fvg')) category = 'SMC';

    return {
        language: normalizeLanguage('', filename, name),
        source_language: normalizeSourceLanguage('', filename, name),
        category,
        course_title: category + ' Trading Mastery',
        module_title: 'Core Concepts',
        lesson_title: name.length > 60 ? name.substring(0, 60) : name,
        summary: `A comprehensive guide on ${name} for professional traders.`
    };
}

function sanitizeTitle(input: string, fallback: string, max = 60): string {
    const value = String(input || '')
        .replace(/\s+/g, ' ')
        .trim();
    const base = value || fallback;
    return base.length > max ? base.substring(0, max).trim() : base;
}

function sanitizeSummary(input: string, fallback: string, max = 1200): string {
    const value = String(input || '')
        .replace(/\s+/g, ' ')
        .trim();
    const base = value || fallback;
    return base.length > max ? `${base.substring(0, max - 3).trim()}...` : base;
}

function extractHeadingCandidates(fullText: string, max = 30): string[] {
    const lines = fullText.split('\n').map(l => l.trim());
    const headings: string[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
        if (!line || line.length < 4 || line.length > 90) continue;
        const isNumbered = /^(chapter|section|module|part)?\s*\d+[\.:\-\)]?\s+/i.test(line);
        const hasFewPunctuation = !/[\.\?!]$/.test(line);
        const words = line.split(/\s+/);
        const titleCaseLike = words.length <= 12 && words.every(w => /^[\p{L}\p{N}'\-:]+$/u.test(w));
        if (!(isNumbered || (hasFewPunctuation && titleCaseLike))) continue;

        const key = line.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        headings.push(line);
        if (headings.length >= max) break;
    }

    return headings;
}

function splitIntoLogicalBlocks(fullText: string): Array<{ heading: string; text: string }> {
    const lines = fullText.split('\n');
    const blocks: Array<{ heading: string; text: string }> = [];

    let currentHeading = 'Introduction';
    let currentLines: string[] = [];

    const flush = () => {
        const text = currentLines.join('\n').trim();
        if (text.length > 0) {
            blocks.push({ heading: currentHeading, text });
        }
        currentLines = [];
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        const headingLike =
            line.length >= 4 &&
            line.length <= 90 &&
            (/^(chapter|section|module|part)?\s*\d+[\.:\-\)]?\s+/i.test(line) ||
                (/^[\p{L}\p{N}'\-:\s]+$/u.test(line) && !/[\.\?!]$/.test(line) && line.split(/\s+/).length <= 12));

        if (headingLike) {
            flush();
            currentHeading = line;
            continue;
        }

        currentLines.push(rawLine);
    }
    flush();

    if (blocks.length >= 2) return blocks;

    // Fallback for PDFs without clear headings: split by size.
    const compact = fullText.replace(/\n{2,}/g, '\n').trim();
    if (!compact) return [];

    const parts: Array<{ heading: string; text: string }> = [];
    const chunkSize = 7000;
    for (let i = 0; i < compact.length; i += chunkSize) {
        const chunk = compact.substring(i, i + chunkSize).trim();
        if (chunk.length > 0) {
            parts.push({ heading: `Part ${parts.length + 1}`, text: chunk });
        }
    }

    return parts;
}

async function generateLessonPlanWithAI(
    classification: AIClassification,
    fileName: string,
    blocks: Array<{ heading: string; text: string }>,
    headingCandidates: string[],
    log?: FastifyBaseLogger
): Promise<{ moduleTitle: string; lessons: Array<{ title: string; summary: string; from: number; to: number }> } | null> {
    if (blocks.length <= 1) return null;

    const compactBlocks = blocks.slice(0, 16).map((b, index) => ({
        index,
        heading: b.heading,
        excerpt: b.text.replace(/\s+/g, ' ').substring(0, 500)
    }));

    const prompt = `Create a practical lesson structure for a trading education PDF.

Filename: ${fileName}
Suggested category: ${classification.category}
Suggested course title: ${classification.course_title}
Suggested module title: ${classification.module_title}
Detected headings: ${headingCandidates.slice(0, 20).join(' | ') || 'n/a'}

Blocks:
${JSON.stringify(compactBlocks, null, 2)}

Return ONLY JSON with this shape:
{
  "module_title": "string, max 50 chars",
  "lessons": [
    {
      "title": "string, max 60 chars",
      "summary": "one concise learning outcome",
      "from": 0,
      "to": 0
    }
  ]
}

Rules:
- Use 1 lesson for small material, 2-12 lessons for bigger material.
- from/to are inclusive block indexes.
- Keep lesson order logical and non-overlapping.
- Do not invent missing topics.`;

    const models = [
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.1-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct:free'
    ];

    for (const model of models) {
        try {
            const data = await openRouterService.chat(model, [
                { role: 'system', content: 'Return only valid JSON. No markdown.' },
                { role: 'user', content: prompt }
            ], undefined);

            const raw = data?.choices?.[0]?.message?.content || '';
            const match = raw.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('No JSON in lesson plan response');

            const parsed = JSON.parse(match[0]);
            const lessons = Array.isArray(parsed?.lessons) ? parsed.lessons : [];
            if (!lessons.length) throw new Error('Empty lessons array');

            const normalized = lessons
                .slice(0, 12)
                .map((item: any, idx: number) => {
                    const fromRaw = Number.isInteger(item?.from) ? Number(item.from) : idx;
                    const toRaw = Number.isInteger(item?.to) ? Number(item.to) : fromRaw;
                    const from = Math.max(0, Math.min(blocks.length - 1, fromRaw));
                    const to = Math.max(from, Math.min(blocks.length - 1, toRaw));
                    return {
                        title: sanitizeTitle(item?.title, `${classification.lesson_title} - Part ${idx + 1}`),
                        summary: sanitizeSummary(item?.summary, `Lesson ${idx + 1} from imported material.`),
                        from,
                        to
                    };
                });

            return {
                moduleTitle: sanitizeTitle(parsed?.module_title, classification.module_title, 50),
                lessons: normalized
            };
        } catch (e: any) {
            if (log) log.warn(`[Ingestion] Lesson plan failed for model ${model}: ${e.message}`);
        }
    }

    return null;
}

async function buildLessonPlan(
    classification: AIClassification,
    originalFileName: string,
    fullText: string,
    log?: FastifyBaseLogger
): Promise<{ moduleTitle: string; lessons: LessonPlanItem[] }> {
    const blocks = splitIntoLogicalBlocks(fullText);

    if (blocks.length <= 1) {
        return {
            moduleTitle: classification.module_title,
            lessons: [{
                title: classification.lesson_title,
                summary: classification.summary,
                sourceText: fullText || classification.summary
            }]
        };
    }

    const headingCandidates = extractHeadingCandidates(fullText, 30);
    const aiPlan = await generateLessonPlanWithAI(classification, originalFileName, blocks, headingCandidates, log);

    if (aiPlan) {
        return {
            moduleTitle: aiPlan.moduleTitle,
            lessons: aiPlan.lessons.map((item, idx) => {
                const sourceText = blocks
                    .slice(item.from, item.to + 1)
                    .map(b => b.text)
                    .join('\n\n')
                    .trim();

                return {
                    title: sanitizeTitle(item.title, `${classification.lesson_title} - Part ${idx + 1}`),
                    summary: sanitizeSummary(item.summary, classification.summary),
                    sourceText: sourceText || classification.summary
                };
            })
        };
    }

    // Deterministic fallback when AI plan is unavailable.
    const maxLessons = Math.min(blocks.length, 10);
    const grouped: LessonPlanItem[] = [];
    const groupSize = Math.ceil(blocks.length / maxLessons);
    for (let i = 0; i < blocks.length; i += groupSize) {
        const part = blocks.slice(i, i + groupSize);
        const index = grouped.length + 1;
        const heading = part[0]?.heading || `Part ${index}`;
        const sourceText = part.map(p => p.text).join('\n\n').trim();
        const excerpt = sourceText.replace(/\s+/g, ' ').substring(0, 220);

        grouped.push({
            title: sanitizeTitle(`${heading} (${index})`, `${classification.lesson_title} - Part ${index}`),
            summary: sanitizeSummary(`Focused section: ${excerpt}`, classification.summary),
            sourceText: sourceText || classification.summary
        });
    }

    return { moduleTitle: classification.module_title, lessons: grouped };
}

function normalizeGlossary(raw: any): Array<{ term: string; definition: string }> {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => ({
            term: sanitizeTitle(String(item?.term || ''), '', 80),
            definition: sanitizeSummary(String(item?.definition || ''), '', 350),
        }))
        .filter((item) => item.term && item.definition)
        .slice(0, 25);
}

function normalizeStringArray(raw: any, maxItems = 15): string[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((item) => sanitizeSummary(String(item || ''), '', 280))
        .filter(Boolean)
        .slice(0, maxItems);
}

async function generateStructuredLessonContent(
    lesson: LessonPlanItem,
    classification: AIClassification,
    sourceLanguage: string,
    originalFileName: string,
    index: number,
    log?: FastifyBaseLogger
): Promise<StructuredLessonContent> {
    const sourceSnippet = lesson.sourceText.replace(/\s+/g, ' ').substring(0, 9000);

    const prompt = `You are a professional trading education editor.
Goal: transform source material into a structured lesson while preserving author's terminology and meaning.

File: ${originalFileName}
Detected source language: ${sourceLanguage}
Course: ${classification.course_title}
Module: ${classification.module_title}
Lesson title: ${lesson.title}
Lesson index: ${index + 1}

Source content:
${sourceSnippet}

Return ONLY valid JSON with this shape:
{
  "summary_ru": "short concise summary in Russian",
  "summary_uz": "short concise summary in Uzbek",
  "content_source": "clean explanation in source language",
  "content_ru": "full lesson explanation in Russian",
  "content_uz": "full lesson explanation in Uzbek",
  "key_points_ru": ["..."],
  "key_points_uz": ["..."],
  "glossary_ru": [{"term":"...", "definition":"..."}],
  "glossary_uz": [{"term":"...", "definition":"..."}],
  "practice_ru": "practical task / checklist in Russian",
  "practice_uz": "practical task / checklist in Uzbek",
  "conclusion_ru": "lesson conclusion in Russian",
  "conclusion_uz": "lesson conclusion in Uzbek",
  "additional_ru": "optional useful clarifications in Russian",
  "additional_uz": "optional useful clarifications in Uzbek"
}

Rules:
- Keep original trading terms and definitions accurate.
- Do NOT invent facts that are absent in source.
- Make explanation pedagogical and clear.
- Keep RU and UZ high quality and natural.`;

    const models = [
        'meta-llama/llama-3.3-70b-instruct',
        'meta-llama/llama-3.1-70b-instruct',
        'meta-llama/llama-3.1-8b-instruct:free',
    ];

    let lastError = '';
    for (const model of models) {
        try {
            const data = await openRouterService.chat(model, [
                { role: 'system', content: 'Return only valid JSON. No markdown, no prose.' },
                { role: 'user', content: prompt }
            ], undefined);

            const raw = data?.choices?.[0]?.message?.content || '';
            const jsonMatch = raw.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in lesson generation response');

            const parsed = JSON.parse(jsonMatch[0]);

            const summaryRu = sanitizeSummary(parsed?.summary_ru, lesson.summary || classification.summary, 1200);
            const summaryUz = sanitizeSummary(parsed?.summary_uz, summaryRu, 1200);

            const contentSource = sanitizeSummary(parsed?.content_source, lesson.sourceText || lesson.summary || classification.summary, 12000);
            const contentRu = sanitizeSummary(parsed?.content_ru, summaryRu, 15000);
            const contentUz = sanitizeSummary(parsed?.content_uz, summaryUz, 15000);

            const keyPointsRu = normalizeStringArray(parsed?.key_points_ru, 15);
            const keyPointsUz = normalizeStringArray(parsed?.key_points_uz, 15);

            const glossaryRu = normalizeGlossary(parsed?.glossary_ru);
            const glossaryUz = normalizeGlossary(parsed?.glossary_uz);

            const practiceRu = sanitizeSummary(parsed?.practice_ru, summaryRu, 3000);
            const practiceUz = sanitizeSummary(parsed?.practice_uz, summaryUz, 3000);

            const conclusionRu = sanitizeSummary(parsed?.conclusion_ru, summaryRu, 2500);
            const conclusionUz = sanitizeSummary(parsed?.conclusion_uz, summaryUz, 2500);

            const additionalRu = sanitizeSummary(parsed?.additional_ru, '', 3000);
            const additionalUz = sanitizeSummary(parsed?.additional_uz, '', 3000);

            return {
                summary_ru: summaryRu,
                summary_uz: summaryUz,
                content_source: contentSource,
                content_ru: contentRu,
                content_uz: contentUz,
                key_points_ru: keyPointsRu,
                key_points_uz: keyPointsUz,
                glossary_ru: glossaryRu,
                glossary_uz: glossaryUz,
                practice_ru: practiceRu,
                practice_uz: practiceUz,
                conclusion_ru: conclusionRu,
                conclusion_uz: conclusionUz,
                additional_ru: additionalRu,
                additional_uz: additionalUz,
            };
        } catch (e: any) {
            lastError = e.message;
            if (log) log.warn(`[Ingestion] Structured lesson generation failed for model ${model}: ${e.message}`);
        }
    }

    throw new Error(`Structured lesson generation failed for "${lesson.title}": ${lastError || 'unknown error'}`);
}

async function enrichLessonPlanWithStructuredContent(
    lessonPlan: { moduleTitle: string; lessons: LessonPlanItem[] },
    classification: AIClassification,
    sourceLanguage: string,
    originalFileName: string,
    log?: FastifyBaseLogger
): Promise<{ moduleTitle: string; lessons: EnrichedLessonPlanItem[] }> {
    const enrichedLessons: EnrichedLessonPlanItem[] = [];

    for (let index = 0; index < lessonPlan.lessons.length; index++) {
        const lesson = lessonPlan.lessons[index];
        const structured = await generateStructuredLessonContent(
            lesson,
            classification,
            sourceLanguage,
            originalFileName,
            index,
            log
        );

        enrichedLessons.push({ ...lesson, structured });
    }

    return {
        moduleTitle: lessonPlan.moduleTitle,
        lessons: enrichedLessons,
    };
}

// ── Course / Module / Lesson Upsert ──────────────────────────
async function upsertCourseModuleLessons(
    classification: AIClassification,
    lessonPlan: { moduleTitle: string; lessons: EnrichedLessonPlanItem[] },
    pdfPath: string
): Promise<{ course_id: string; module_id: string; lesson_id: string; lessons_created: number }> {
    return withTransaction(async (client) => {
        // Guard against concurrent imports producing duplicates.
        // Uses advisory locks (no schema changes required).
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`course:${classification.course_title.toLowerCase()}:${classification.language}`]);

        // 1. Find or create course by title
        let courseId: string;
        const existingCourse = await client.query(
            `SELECT id FROM courses WHERE LOWER(title) = LOWER($1) AND language = $2 LIMIT 1`,
            [classification.course_title, classification.language]
        );

        if (existingCourse.rows.length > 0) {
            courseId = existingCourse.rows[0].id;
        } else {
            const newCourse = await client.query(
                `INSERT INTO courses (id, title, description, category, level, language, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
                [
                    crypto.randomUUID(),
                    classification.course_title,
                    classification.summary,
                    classification.category,
                    'Beginner',
                    classification.language
                ]
            );
            courseId = newCourse.rows[0].id;
        }

        const moduleTitle = sanitizeTitle(lessonPlan.moduleTitle, classification.module_title, 50);
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`module:${courseId}:${moduleTitle.toLowerCase()}`]);

        // 2. Find or create module by title + course_id
        let moduleId: string;
        const existingModule = await client.query(
            `SELECT id FROM modules WHERE course_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
            [courseId, moduleTitle]
        );

        if (existingModule.rows.length > 0) {
            moduleId = existingModule.rows[0].id;
        } else {
            const maxPos = await client.query(
                `SELECT COALESCE(MAX(sort_order), 0) as max_pos FROM modules WHERE course_id = $1`,
                [courseId]
            );
            const newPos = (parseInt(maxPos.rows[0].max_pos) || 0) + 1;

            // Keep both sort_order and position in sync where position exists.
            const newModule = await client.query(
                `INSERT INTO modules (id, course_id, title, sort_order, position, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $4, NOW(), NOW()) RETURNING id`,
                [crypto.randomUUID(), courseId, moduleTitle, newPos]
            );
            moduleId = newModule.rows[0].id;
        }

        const existingLessons = await client.query(
            `SELECT id, title, sort_order FROM lessons WHERE module_id = $1`,
            [moduleId]
        );

        const byLowerTitle = new Map<string, { id: string; sort_order: number }>();
        let maxSort = 0;
        for (const row of existingLessons.rows) {
            const key = String(row.title || '').toLowerCase();
            if (key) byLowerTitle.set(key, { id: row.id, sort_order: Number(row.sort_order) || 0 });
            maxSort = Math.max(maxSort, Number(row.sort_order) || 0);
        }

        let firstLessonId = '';
        const seenInBatch = new Set<string>();

        for (let index = 0; index < lessonPlan.lessons.length; index++) {
            const lesson = lessonPlan.lessons[index];
            let titleBase = sanitizeTitle(lesson.title, `${classification.lesson_title} - Part ${index + 1}`);
            if (!titleBase) titleBase = `${classification.lesson_title} - Part ${index + 1}`;

            let title = titleBase;
            let suffix = 2;
            while (seenInBatch.has(title.toLowerCase())) {
                title = sanitizeTitle(`${titleBase} (${suffix})`, `${titleBase} (${suffix})`);
                suffix += 1;
            }
            seenInBatch.add(title.toLowerCase());

            await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`lesson:${moduleId}:${title.toLowerCase()}`]);

            const summary = sanitizeSummary(lesson.summary, classification.summary);
            const content = lesson.sourceText?.trim() || summary;
            const existing = byLowerTitle.get(title.toLowerCase());

            const keyPointsJson = {
                RU: lesson.structured.key_points_ru,
                UZ: lesson.structured.key_points_uz,
            };
            const glossaryJson = {
                RU: lesson.structured.glossary_ru,
                UZ: lesson.structured.glossary_uz,
            };
            const practiceNotesJson = {
                RU: lesson.structured.practice_ru,
                UZ: lesson.structured.practice_uz,
            };
            const conclusionJson = {
                RU: lesson.structured.conclusion_ru,
                UZ: lesson.structured.conclusion_uz,
            };
            const additionalNotesJson = {
                RU: lesson.structured.additional_ru,
                UZ: lesson.structured.additional_uz,
            };

            let lessonId = existing?.id || '';
            if (existing) {
                try {
                    await client.query(
                        `UPDATE lessons
                         SET content = $1,
                             summary = $2,
                             pdf_path = $3,
                             language = $4,
                             source_language = $5,
                             content_source = $6,
                             content_ru = $7,
                             content_uz = $8,
                             summary_ru = $9,
                             summary_uz = $10,
                             key_points_json = $11,
                             glossary_json = $12,
                             practice_notes = $13,
                             conclusion_json = $14,
                             additional_notes_json = $15,
                             updated_at = NOW()
                         WHERE id = $16`,
                        [
                            content,
                            summary,
                            pdfPath,
                            classification.language,
                            classification.source_language,
                            lesson.structured.content_source,
                            lesson.structured.content_ru,
                            lesson.structured.content_uz,
                            lesson.structured.summary_ru,
                            lesson.structured.summary_uz,
                            JSON.stringify(keyPointsJson),
                            JSON.stringify(glossaryJson),
                            JSON.stringify(practiceNotesJson),
                            JSON.stringify(conclusionJson),
                            JSON.stringify(additionalNotesJson),
                            existing.id,
                        ]
                    );
                } catch (e: any) {
                    if (!isPgUndefinedColumnError(e)) throw e;
                    await client.query(
                        `UPDATE lessons SET content = $1, updated_at = NOW() WHERE id = $2`,
                        [content, existing.id]
                    );
                }
            } else {
                maxSort += 1;
                try {
                    const created = await client.query(
                        `INSERT INTO lessons (
                            id, module_id, title,
                            content, summary, pdf_path, language,
                            source_language, content_source, content_ru, content_uz,
                            summary_ru, summary_uz,
                            key_points_json, glossary_json, practice_notes, conclusion_json, additional_notes_json,
                            sort_order, position, created_at, updated_at
                         )
                         VALUES (
                            $1, $2, $3,
                            $4, $5, $6, $7,
                            $8, $9, $10, $11,
                            $12, $13,
                            $14, $15, $16, $17, $18,
                            $19, $19, NOW(), NOW()
                         )
                         RETURNING id`,
                        [
                            crypto.randomUUID(),
                            moduleId,
                            title,
                            content,
                            summary,
                            pdfPath,
                            classification.language,
                            classification.source_language,
                            lesson.structured.content_source,
                            lesson.structured.content_ru,
                            lesson.structured.content_uz,
                            lesson.structured.summary_ru,
                            lesson.structured.summary_uz,
                            JSON.stringify(keyPointsJson),
                            JSON.stringify(glossaryJson),
                            JSON.stringify(practiceNotesJson),
                            JSON.stringify(conclusionJson),
                            JSON.stringify(additionalNotesJson),
                            maxSort,
                        ]
                    );
                    lessonId = created.rows[0].id;
                } catch (e: any) {
                    if (!isPgUndefinedColumnError(e)) throw e;
                    const created = await client.query(
                        `INSERT INTO lessons (id, module_id, title, content, sort_order, created_at, updated_at)
                         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                         RETURNING id`,
                        [crypto.randomUUID(), moduleId, title, content, maxSort]
                    );
                    lessonId = created.rows[0].id;
                }
                byLowerTitle.set(title.toLowerCase(), { id: lessonId, sort_order: maxSort });
            }

            if (!firstLessonId) firstLessonId = lessonId;
        }

        return { course_id: courseId, module_id: moduleId, lesson_id: firstLessonId, lessons_created: lessonPlan.lessons.length };
    });
}

// ── Main Ingestion Function ───────────────────────────────────
export async function ingestPdf(
    filePath: string,
    originalFileName: string,
    log?: FastifyBaseLogger
): Promise<IngestionResult> {

    const materialId = crypto.randomUUID();

    // Record in DB as pending
    await query(
        `INSERT INTO uploaded_materials (id, original_name, stored_path, status, created_at)
         VALUES ($1, $2, $3, 'pending', NOW())`,
        [materialId, originalFileName, filePath]
    );

    try {
        // 1. Extract PDF text
        if (log) log.info(`[Ingestion] Extracting text from: ${originalFileName}`);
        let extractedText = '';
        let fullText = '';
        try {
            const extracted = await extractPdfText(filePath);
            extractedText = extracted.aiText;
            fullText = extracted.fullText;
        } catch (pdfErr: any) {
            if (log) log.warn(`[Ingestion] pdf-parse failed: ${pdfErr.message} — using filename fallback`);
        }

        // If PDF has no extractable text (image-based), use fallback classification
        if (!extractedText || extractedText.length < 20) {
            if (log) log.warn(`[Ingestion] PDF has no/little text, using filename fallback: ${originalFileName}`);
            extractedText = `Trading material: ${originalFileName.replace('.pdf', '')}`;
            fullText = extractedText;
        }

        // 2. AI Classification
        if (log) log.info(`[Ingestion] Classifying with AI: ${originalFileName}`);
        const classification = await classifyWithAI(extractedText, originalFileName, log);
        const sourceLanguage = normalizeSourceLanguage(classification.source_language, originalFileName, fullText || extractedText);
        if (log) log.info(`[Ingestion] Classified: ${JSON.stringify(classification)}`);

        // 3. Build lesson structure from extracted content
        if (log) log.info(`[Ingestion] Building lesson plan: ${originalFileName}`);
        const lessonPlan = await buildLessonPlan(classification, originalFileName, fullText || extractedText, log);

        // 4. Generate structured multilingual content for each lesson (RU + UZ)
        if (log) log.info(`[Ingestion] Generating multilingual lesson content: ${originalFileName}`);
        const enrichedLessonPlan = await enrichLessonPlanWithStructuredContent(
            lessonPlan,
            classification,
            sourceLanguage,
            originalFileName,
            log
        );

        // 5. Upsert Course → Module → Lessons
        const { course_id, lesson_id, lessons_created } = await upsertCourseModuleLessons(classification, enrichedLessonPlan, filePath);

        // 6. Update material record
        await query(
            `UPDATE uploaded_materials SET 
                extracted_text = $1,
                detected_category = $2,
                ai_metadata = $3,
                status = 'processed',
                course_id = $4,
                lesson_id = $5
             WHERE id = $6`,
            [
                (fullText || extractedText).substring(0, 12000),
                classification.category,
                JSON.stringify({
                    ...classification,
                    source_language: sourceLanguage,
                    module_title: lessonPlan.moduleTitle,
                    lessons_created,
                    lesson_titles: lessonPlan.lessons.map(l => l.title)
                }),
                course_id,
                lesson_id,
                materialId
            ]
        );

        if (log) log.info(`[Ingestion] ✅ Done: ${originalFileName} → Course: ${classification.course_title}`);

        return {
            success: true,
            course_id,
            course_title: classification.course_title,
            lesson_id,
            lesson_title: lessonPlan.lessons[0]?.title || classification.lesson_title,
            lessons_created,
            category: classification.category,
            material_id: materialId
        };
    } catch (error: any) {
        const errMsg = error.message || String(error);
        if (log) log.error(`[Ingestion] ❌ Failed: ${originalFileName} — ${errMsg}`);

        await query(
            `UPDATE uploaded_materials SET status = 'failed', error_message = $1 WHERE id = $2`,
            [errMsg, materialId]
        );

        return { success: false, error: errMsg };
    }
}

// ── Scan Library Function ─────────────────────────────────────
export async function scanLibrary(log?: FastifyBaseLogger): Promise<{
    total: number;
    processed: number;
    skipped: number;
    failed: number;
    results: IngestionResult[];
}> {
    // Try multiple possible paths (works locally and on Render)
    const possiblePaths = [
        path.resolve(process.cwd(), '..', 'data', 'library'),
        path.resolve(process.cwd(), 'data', 'library'),
        path.resolve(__dirname, '..', '..', '..', 'data', 'library'),
        '/opt/render/project/src/data/library',
    ];

    let libraryDir = '';
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            libraryDir = p;
            break;
        }
    }

    if (!libraryDir) {
        if (log) log.warn(`[scanLibrary] Library not found in any of: ${possiblePaths.join(', ')}`);
        return { total: 0, processed: 0, skipped: 0, failed: 0, results: [] };
    }

    if (log) log.info(`[scanLibrary] Using library path: ${libraryDir}`);

    const files = fs.readdirSync(libraryDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (log) log.info(`[scanLibrary] Found ${files.length} PDFs in library`);

    const results: IngestionResult[] = [];
    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
        // Skip only when previous processed record has valid linked course+lesson.
        // If historical record is broken (no links / deleted links), reprocess it.
        try {
            const existing = await query(
                `SELECT id, course_id, lesson_id
                 FROM uploaded_materials
                 WHERE original_name = $1 AND status = 'processed'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [file]
            );
            if (existing.rows.length > 0) {
                const row = existing.rows[0];

                const hasLinks = !!row.course_id && !!row.lesson_id;
                if (hasLinks) {
                    const [courseExists, lessonExists] = await Promise.all([
                        query(`SELECT 1 FROM courses WHERE id = $1 LIMIT 1`, [row.course_id]),
                        query(`SELECT 1 FROM lessons WHERE id = $1 LIMIT 1`, [row.lesson_id]),
                    ]);

                    const validLinks = courseExists.rows.length > 0 && lessonExists.rows.length > 0;
                    if (validLinks) {
                        // For new multilingual lesson system, ensure generated content exists.
                        const lessonContentRes = await query(
                            `SELECT content_ru, content_uz FROM lessons WHERE id = $1 LIMIT 1`,
                            [row.lesson_id]
                        ).catch(() => ({ rows: [] as any[] }));

                        const lessonRow = lessonContentRes.rows[0];
                        const hasMultilingualContent = !!lessonRow?.content_ru && !!lessonRow?.content_uz;

                        if (hasMultilingualContent) {
                            if (log) log.info(`[scanLibrary] Skipping (already processed): ${file}`);
                            skipped++;
                            continue;
                        }

                        if (log) log.info(`[scanLibrary] Reprocessing material without multilingual lesson content: ${file}`);
                    }
                }

                if (log) log.info(`[scanLibrary] Reprocessing broken material links: ${file}`);
            }
        } catch {
            // Table may not exist - proceed
        }

        const filePath = path.join(libraryDir, file);
        const result = await ingestPdf(filePath, file, log);
        results.push(result);

        if (result.success) processed++;
        else failed++;

        // Small delay between files to avoid API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return { total: files.length, processed, skipped, failed, results };
}
