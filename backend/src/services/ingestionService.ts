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
    totalPages: number;
    pageFragments: PdfPageFragment[];
    hasVisualHints: boolean;
}

interface PdfPageFragment {
    page: number;
    excerpt: string;
    has_visual_hints: boolean;
}

interface LessonPlanItem {
    title: string;
    summary: string;
    sourceText: string;
}

interface QuizItem {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
}

interface LessonStepBlock {
    step_id: string;
    step_type: 'intro' | 'visual' | 'concept' | 'practice' | 'takeaway' | 'quiz';
    title: string;
    source_excerpt: string;
    explanation: string;
    what_to_notice: string;
    visual_hint: string;
    page_from: number;
    page_to: number;
}

interface VisualBlockItem {
    step_id: string;
    page_from: number;
    page_to: number;
    visual_kind: 'page_fragment' | 'diagram' | 'image' | 'none';
    caption_ru: string;
    caption_uz: string;
    importance_ru: string;
    importance_uz: string;
}

interface StructuredLessonContent {
    lesson_type: 'theory' | 'strategy' | 'chart' | 'glossary' | 'psychology';
    difficulty_level: 'Beginner' | 'Intermediate' | 'Advanced';
    source_section: string;
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
    common_mistakes_ru: string[];
    common_mistakes_uz: string[];
    self_check_ru: string[];
    self_check_uz: string[];
    homework_ru: string;
    homework_uz: string;
    quiz_ru: QuizItem[];
    quiz_uz: QuizItem[];
    lesson_steps_ru: LessonStepBlock[];
    lesson_steps_uz: LessonStepBlock[];
    visual_blocks: VisualBlockItem[];
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

    const totalPages = Math.max(1, Number(data?.numpages || 1));

    const visualHintRegex = /(figure|fig\.|chart|diagram|image|table|illustration|рис\.|рисунок|схема|график|таблица|иллюстрац|jadval|rasm|diagramma|chizma)/i;

    const pageFromFormFeed = raw
        .split('\f')
        .map((chunk) => chunk.trim())
        .filter(Boolean);

    const compactForPaging = raw.replace(/\n{3,}/g, '\n\n').trim();
    const pageFragments: PdfPageFragment[] = [];

    if (pageFromFormFeed.length >= 2) {
        for (let i = 0; i < pageFromFormFeed.length; i++) {
            const excerpt = pageFromFormFeed[i].replace(/\s+/g, ' ').trim().substring(0, 340);
            if (!excerpt) continue;
            pageFragments.push({
                page: i + 1,
                excerpt,
                has_visual_hints: visualHintRegex.test(pageFromFormFeed[i]),
            });
        }
    } else {
        const chunkSize = Math.max(1200, Math.ceil(Math.max(compactForPaging.length, 1) / totalPages));
        let page = 1;
        for (let i = 0; i < compactForPaging.length; i += chunkSize) {
            const chunk = compactForPaging.substring(i, i + chunkSize);
            const excerpt = chunk.replace(/\s+/g, ' ').trim().substring(0, 340);
            if (!excerpt) continue;
            pageFragments.push({
                page,
                excerpt,
                has_visual_hints: visualHintRegex.test(chunk),
            });
            page += 1;
            if (page > totalPages) break;
        }
    }

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

    const hasVisualHints = pageFragments.some((fragment) => fragment.has_visual_hints);

    return { fullText, aiText, totalPages, pageFragments, hasVisualHints };
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

function normalizeQuiz(raw: any): QuizItem[] {
    if (!Array.isArray(raw)) return [];

    return raw
        .map((item: any) => {
            const question = sanitizeSummary(String(item?.question || ''), '', 260);
            const optionsRaw = Array.isArray(item?.options) ? item.options : [];
            const options = optionsRaw
                .map((opt: any) => sanitizeSummary(String(opt || ''), '', 180))
                .filter(Boolean)
                .slice(0, 6);

            if (!question || options.length < 2) return null;

            const correctRaw = Number(item?.correct_index);
            const correct_index = Number.isInteger(correctRaw)
                ? Math.max(0, Math.min(options.length - 1, correctRaw))
                : 0;

            const explanation = sanitizeSummary(String(item?.explanation || ''), '', 500);

            return {
                question,
                options,
                correct_index,
                explanation,
            } as QuizItem;
        })
        .filter(Boolean)
        .slice(0, 6) as QuizItem[];
}

function fallbackKeyPoints(language: 'RU' | 'UZ', lessonTitle: string, summary: string): string[] {
    if (language === 'UZ') {
        return [
            `${lessonTitle}: asosiy g'oyani bitta aniq qoidaga aylantiring.`,
            `Trend va bozor strukturasi bo'yicha xulosani oldindan yozib chiqing.`,
            `Kirishdan oldin risk-limit (1-2%) va stop joylashuvini tekshiring.`,
            `Likvidlik zonasi va tasdiqlovchi signalni birga baholang.`,
            sanitizeSummary(summary, 'Dars mazmunini qisqa chek-listga aylantiring.', 240),
        ];
    }

    return [
        `${lessonTitle}: переведите ключевую идею в одно прикладное правило.`,
        `Перед входом зафиксируйте вывод по тренду и структуре рынка.`,
        `Проверьте риск-лимит (1-2%) и расположение стопа до открытия сделки.`,
        `Оценивайте ликвидность и подтверждающий сигнал в связке.`,
        sanitizeSummary(summary, 'Сведите урок к краткому чек-листу исполнения.', 240),
    ];
}

function fallbackGlossary(language: 'RU' | 'UZ'): Array<{ term: string; definition: string }> {
    if (language === 'UZ') {
        return [
            { term: 'Liquidity', definition: "Bozorda buyurtmalar to'plangan hudud, narx tez-tez shu zonaga qaytadi." },
            { term: 'Break of Structure', definition: "Muhim maksimum/minimum buzilishi orqali trend yo'nalishi tasdiqlanadi." },
            { term: 'Order Block', definition: "Yirik ishtirokchilar izi ko'rinadigan zona, kirish uchun orientir bo'ladi." },
            { term: 'Risk-to-Reward', definition: "Potensial foyda va zarar nisbati, strategiya sifatini baholaydi." },
        ];
    }

    return [
        { term: 'Liquidity', definition: 'Зона концентрации ордеров, куда цена часто возвращается перед движением.' },
        { term: 'Break of Structure', definition: 'Пробой ключевого максимума/минимума, подтверждающий смену структуры.' },
        { term: 'Order Block', definition: 'Область активности крупных участников, часто дающая рабочий вход.' },
        { term: 'Risk-to-Reward', definition: 'Соотношение потенциальной прибыли к риску в сделке.' },
    ];
}

function fallbackCommonMistakes(language: 'RU' | 'UZ'): string[] {
    if (language === 'UZ') {
        return [
            `Setupni timeframe kontekstisiz baholash.`,
            `Stop-lossni rejasiz surish yoki bekor qilish.`,
            `Risk qoidalarini buzib pozitsiya hajmini oshirish.`,
            `Tasdiq signalini kutmasdan shoshma-shosharlik bilan kirish.`,
        ];
    }

    return [
        `Оценка сетапа без контекста старшего таймфрейма.`,
        `Перенос или удаление стоп-лосса без плана.`,
        `Увеличение объема позиции с нарушением risk-правил.`,
        `Вход в сделку до подтверждающего сигнала.`,
    ];
}

function fallbackSelfCheck(language: 'RU' | 'UZ', lessonTitle: string): string[] {
    if (language === 'UZ') {
        return [
            `${lessonTitle} bo'yicha asosiy kirish sharti nimadan iborat?`,
            `Bitimdan oldin qaysi risk-checklist bandlarini tasdiqlaysiz?`,
            `Noto'g'ri scenariy bo'lsa chiqish rejangiz qanday ishlaydi?`,
        ];
    }

    return [
        `Какое ключевое условие входа вы используете по теме "${lessonTitle}"?`,
        `Какие пункты risk-checklist вы подтверждаете до сделки?`,
        `Как работает ваш план выхода при неверном сценарии?`,
    ];
}

function fallbackHomework(language: 'RU' | 'UZ', lessonTitle: string, practice: string): string {
    if (language === 'UZ') {
        return [
            `Uyga vazifa (${lessonTitle}):`,
            `- 3 ta chart toping va setupni bosqichma-bosqich tahlil qiling.`,
            `- Har bir chart uchun kirish, stop va targetni yozing.`,
            `- Amaliy blokdan quyidagini jurnalga kiriting: ${sanitizeSummary(practice, 'setup execution', 180)}.`,
        ].join('\n');
    }

    return [
        `Домашнее задание (${lessonTitle}):`,
        `- Выберите 3 графика и разберите сетап по шагам.`,
        `- Для каждого графика пропишите вход, стоп и цель.`,
        `- В дневнике зафиксируйте применение блока практики: ${sanitizeSummary(practice, 'execution чек-лист', 180)}.`,
    ].join('\n');
}

function fallbackQuiz(language: 'RU' | 'UZ', keyPoints: string[]): QuizItem[] {
    const focus = sanitizeSummary(keyPoints[0] || '', language === 'UZ' ? 'trend konteksti' : 'контекст тренда', 120);

    if (language === 'UZ') {
        return [
            {
                question: `Setupdan oldin birinchi navbatda nimani tekshirasiz (${focus})?`,
                options: ['Faqat oxirgi sham', 'Kontekst va struktura', 'Faqat indikator rangi'],
                correct_index: 1,
                explanation: `To'g'ri javob - kontekst va struktura, chunki signal alohida holda yetarli emas.`,
            },
            {
                question: `Riskni boshqarishda eng to'g'ri yondashuv qaysi?`,
                options: ["Lotni his-tuyg'u bo'yicha oshirish", 'Riskni oldindan belgilash', 'Stop-losssiz savdo qilish'],
                correct_index: 1,
                explanation: `Risk oldindan belgilanganda strategiya barqaror bo'ladi.`,
            },
        ];
    }

    return [
        {
            question: `Что проверяется в первую очередь перед входом (${focus})?`,
            options: ['Только последняя свеча', 'Контекст и структура', 'Только индикатор'],
            correct_index: 1,
            explanation: `Верно: контекст и структура, без этого сигнал ненадежен.`,
        },
        {
            question: `Какой подход к risk management наиболее корректный?`,
            options: ['Увеличивать объем по эмоциям', 'Фиксировать риск до входа', 'Торговать без стопа'],
            correct_index: 1,
            explanation: `Риск нужно фиксировать до входа, чтобы сохранить статистическое преимущество.`,
        },
    ];
}

function ensureMinItems(items: string[], min: number, fallbackItems: string[]): string[] {
    const normalized = (items || []).map((item) => sanitizeSummary(item, '', 280)).filter(Boolean);
    if (normalized.length >= min) return normalized.slice(0, 15);

    const combined = [...normalized];
    for (const fallback of fallbackItems) {
        if (combined.length >= min) break;
        const value = sanitizeSummary(fallback, '', 280);
        if (value && !combined.includes(value)) combined.push(value);
    }

    return combined.slice(0, 15);
}

function ensureMinGlossary(
    items: Array<{ term: string; definition: string }>,
    min: number,
    fallbackItems: Array<{ term: string; definition: string }>
): Array<{ term: string; definition: string }> {
    const normalized = (items || [])
        .map((item) => ({
            term: sanitizeTitle(item?.term || '', '', 80),
            definition: sanitizeSummary(item?.definition || '', '', 350),
        }))
        .filter((item) => item.term && item.definition);

    if (normalized.length >= min) return normalized.slice(0, 25);

    const combined = [...normalized];
    for (const fallback of fallbackItems) {
        if (combined.length >= min) break;
        const term = sanitizeTitle(fallback.term || '', '', 80);
        const definition = sanitizeSummary(fallback.definition || '', '', 350);
        if (!term || !definition) continue;
        if (!combined.some((item) => item.term.toLowerCase() === term.toLowerCase())) {
            combined.push({ term, definition });
        }
    }

    return combined.slice(0, 25);
}

function ensureMinQuiz(items: QuizItem[], min: number, fallbackItems: QuizItem[]): QuizItem[] {
    const normalized = (items || [])
        .map((item) => {
            const question = sanitizeSummary(item?.question || '', '', 260);
            const options = Array.isArray(item?.options)
                ? item.options.map((option) => sanitizeSummary(option || '', '', 180)).filter(Boolean).slice(0, 6)
                : [];
            if (!question || options.length < 2) return null;

            const correctRaw = Number(item?.correct_index);
            const correct_index = Number.isInteger(correctRaw)
                ? Math.max(0, Math.min(options.length - 1, correctRaw))
                : 0;

            const explanation = sanitizeSummary(item?.explanation || '', '', 500);

            return {
                question,
                options,
                correct_index,
                explanation,
            } as QuizItem;
        })
        .filter(Boolean) as QuizItem[];

    if (normalized.length >= min) return normalized.slice(0, 6);

    const combined = [...normalized];
    for (const fallback of fallbackItems) {
        if (combined.length >= min) break;
        const normalizedFallback = normalizeQuiz([fallback]);
        if (!normalizedFallback.length) continue;

        const candidate = normalizedFallback[0];
        if (!combined.some((item) => item.question.toLowerCase() === candidate.question.toLowerCase())) {
            combined.push(candidate);
        }
    }

    return combined.slice(0, 6);
}

function buildPageWindow(totalPages: number, lessonIndex: number, totalLessons: number): { page_from: number; page_to: number } {
    const pages = Math.max(1, totalPages || 1);
    const lessons = Math.max(1, totalLessons || 1);
    const idx = Math.max(0, lessonIndex || 0);

    if (pages === 1 || lessons === 1) {
        return { page_from: 1, page_to: pages };
    }

    const start = Math.min(pages, Math.max(1, Math.floor((idx / lessons) * pages) + 1));
    const end = Math.min(pages, Math.max(start, Math.floor(((idx + 1) / lessons) * pages)));
    return { page_from: start, page_to: end };
}

function pickPageFragments(pageFragments: PdfPageFragment[], pageFrom: number, pageTo: number): PdfPageFragment[] {
    const relevant = (pageFragments || [])
        .filter((item) => item.page >= pageFrom && item.page <= pageTo)
        .slice(0, 4);

    if (relevant.length > 0) return relevant;
    return (pageFragments || []).slice(0, 2);
}

function normalizeStepType(value: any): LessonStepBlock['step_type'] {
    const raw = String(value || '').toLowerCase();
    if (raw === 'visual') return 'visual';
    if (raw === 'concept') return 'concept';
    if (raw === 'practice') return 'practice';
    if (raw === 'takeaway') return 'takeaway';
    if (raw === 'quiz') return 'quiz';
    return 'intro';
}

function normalizeLessonSteps(
    raw: any,
    defaultLanguage: 'RU' | 'UZ',
    fallbackPageFrom: number,
    fallbackPageTo: number
): LessonStepBlock[] {
    if (!Array.isArray(raw)) return [];

    const seen = new Set<string>();

    return raw
        .map((item: any, index: number) => {
            const step_id_base = sanitizeTitle(String(item?.step_id || item?.id || `step_${index + 1}`), `step_${index + 1}`, 32)
                .toLowerCase()
                .replace(/[^a-z0-9_\-]/g, '_');

            let step_id = step_id_base || `step_${index + 1}`;
            let suffix = 2;
            while (seen.has(step_id)) {
                step_id = `${step_id_base}_${suffix}`;
                suffix += 1;
            }
            seen.add(step_id);

            const page_from_raw = Number(item?.page_from);
            const page_to_raw = Number(item?.page_to);
            const page_from = Number.isInteger(page_from_raw) ? Math.max(1, page_from_raw) : fallbackPageFrom;
            const page_to = Number.isInteger(page_to_raw) ? Math.max(page_from, page_to_raw) : Math.max(page_from, fallbackPageTo);

            const titleFallback = defaultLanguage === 'UZ' ? `Qadam ${index + 1}` : `Шаг ${index + 1}`;
            const explanationFallback = defaultLanguage === 'UZ'
                ? 'Ushbu qadam bozor mantiqini amalda ko‘rsatadi.'
                : 'Этот шаг помогает применить рыночную логику на практике.';

            return {
                step_id,
                step_type: normalizeStepType(item?.step_type),
                title: sanitizeSummary(String(item?.title || ''), titleFallback, 180),
                source_excerpt: sanitizeSummary(String(item?.source_excerpt || ''), '', 420),
                explanation: sanitizeSummary(String(item?.explanation || ''), explanationFallback, 1200),
                what_to_notice: sanitizeSummary(String(item?.what_to_notice || ''), '', 420),
                visual_hint: sanitizeSummary(String(item?.visual_hint || ''), '', 280),
                page_from,
                page_to,
            } as LessonStepBlock;
        })
        .filter((item: LessonStepBlock) => item.title && item.explanation)
        .slice(0, 12);
}

function buildFallbackLessonSteps(
    language: 'RU' | 'UZ',
    lessonTitle: string,
    summary: string,
    content: string,
    keyPoints: string[],
    practice: string,
    remember: string,
    quiz: QuizItem[],
    pageWindow: { page_from: number; page_to: number },
    fragments: PdfPageFragment[],
    hasVisualHints: boolean
): LessonStepBlock[] {
    const pageHintText = fragments
        .map((item) => `p.${item.page}: ${sanitizeSummary(item.excerpt, '', 160)}`)
        .join(' | ');

    const introTitle = language === 'UZ' ? 'Kirish va lesson maqsadi' : 'Введение и цель урока';
    const visualTitle = language === 'UZ' ? 'Kitobdan vizual fragment' : 'Визуальный фрагмент из книги';
    const conceptTitle = language === 'UZ' ? 'Asosiy tushunchalar' : 'Ключевые концепции';
    const practiceTitle = language === 'UZ' ? 'Amaliy qo‘llash' : 'Практическое применение';
    const takeawayTitle = language === 'UZ' ? 'Nimani eslab qolish kerak' : 'Что важно запомнить';
    const quizTitle = language === 'UZ' ? 'Mini testga tayyorgarlik' : 'Подготовка к мини-тесту';

    const introExplain = language === 'UZ'
        ? `Bu dars ${lessonTitle} bo‘yicha asosiy mantiqni bosqichma-bosqich ochib beradi.`
        : `Этот урок по теме "${lessonTitle}" раскрывает рыночную логику по шагам.`;

    const visualExplain = language === 'UZ'
        ? 'Quyidagi sahifa fragmentida setup konteksti va muhim signalni ko‘rib chiqing.'
        : 'Визуальный блок показывает контекст сетапа и сигнал, который нужно подтвердить.';

    const conceptExplain = language === 'UZ'
        ? 'Ushbu qadamda terminlar va asosiy qoidalar bir tizimga yig‘iladi.'
        : 'На этом шаге термины и ключевые правила объединяются в рабочую систему.';

    const practiceExplain = language === 'UZ'
        ? 'Nazariyani chartda qo‘llash uchun aniq execution ketma-ketligi beriladi.'
        : 'Здесь показана последовательность execution, чтобы перенести теорию на график.';

    const takeawayExplain = language === 'UZ'
        ? 'Asosiy xulosa va xatolardan saqlanish bo‘yicha checklist.'
        : 'Итог урока и checklist, который помогает избегать повторяющихся ошибок.';

    const quizExplain = language === 'UZ'
        ? `Yakunda ${quiz.length} ta savol orqali tushuncha mustahkamlanadi.`
        : `В конце ${quiz.length} вопросов проверяют понимание именно этого урока.`;

    const introStep: LessonStepBlock = {
        step_id: 'step_intro',
        step_type: 'intro',
        title: introTitle,
        source_excerpt: sanitizeSummary(summary, '', 340),
        explanation: sanitizeSummary(introExplain, '', 1100),
        what_to_notice: sanitizeSummary(keyPoints[0] || '', '', 280),
        visual_hint: '',
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    const visualStep: LessonStepBlock = {
        step_id: 'step_visual',
        step_type: 'visual',
        title: visualTitle,
        source_excerpt: sanitizeSummary(pageHintText || summary, '', 380),
        explanation: sanitizeSummary(visualExplain, '', 1100),
        what_to_notice: sanitizeSummary(
            keyPoints[1] || (language === 'UZ' ? 'Likvidlik va tasdiq signalini birga kuzating.' : 'Следите за связкой ликвидности и подтверждения.'),
            '',
            280
        ),
        visual_hint: hasVisualHints
            ? sanitizeSummary(pageHintText || (language === 'UZ' ? 'Diagram/chizma fragmenti' : 'Фрагмент с диаграммой/схемой'), '', 260)
            : (language === 'UZ' ? 'Vizual signal topilmadi, sahifa konteksti ko‘rsatiladi.' : 'Визуальный сигнал не найден, показан контекст страницы.'),
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    const conceptStep: LessonStepBlock = {
        step_id: 'step_concept',
        step_type: 'concept',
        title: conceptTitle,
        source_excerpt: sanitizeSummary(content, summary, 380),
        explanation: sanitizeSummary(conceptExplain, '', 1100),
        what_to_notice: sanitizeSummary(keyPoints.slice(0, 3).join(' | '), '', 320),
        visual_hint: '',
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    const practiceStep: LessonStepBlock = {
        step_id: 'step_practice',
        step_type: 'practice',
        title: practiceTitle,
        source_excerpt: sanitizeSummary(practice, '', 420),
        explanation: sanitizeSummary(practiceExplain, '', 1100),
        what_to_notice: sanitizeSummary(
            language === 'UZ' ? 'Kirish-stop-target rejasini savdodan oldin yozing.' : 'Фиксируйте план входа-стопа-цели до сделки.',
            '',
            280
        ),
        visual_hint: '',
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    const takeawayStep: LessonStepBlock = {
        step_id: 'step_takeaway',
        step_type: 'takeaway',
        title: takeawayTitle,
        source_excerpt: sanitizeSummary(remember, summary, 420),
        explanation: sanitizeSummary(takeawayExplain, '', 1100),
        what_to_notice: sanitizeSummary(
            keyPoints.slice(0, 2).join(' | ') || (language === 'UZ' ? 'Asosiy signalni kontekstsiz talqin qilmang.' : 'Не интерпретируйте сигнал вне контекста.'),
            '',
            280
        ),
        visual_hint: '',
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    const quizStep: LessonStepBlock = {
        step_id: 'step_quiz',
        step_type: 'quiz',
        title: quizTitle,
        source_excerpt: sanitizeSummary(summary, '', 320),
        explanation: sanitizeSummary(quizExplain, '', 1100),
        what_to_notice: sanitizeSummary(
            language === 'UZ' ? 'Har savolga javob berishda darsdagi setup mantiqiga qayting.' : 'Отвечая, опирайтесь на логику сетапов из урока.',
            '',
            280
        ),
        visual_hint: '',
        page_from: pageWindow.page_from,
        page_to: pageWindow.page_to,
    };

    return [introStep, visualStep, conceptStep, practiceStep, takeawayStep, quizStep];
}

function buildVisualBlocks(stepsRu: LessonStepBlock[], stepsUz: LessonStepBlock[]): VisualBlockItem[] {
    const uzById = new Map<string, LessonStepBlock>();
    for (const step of stepsUz) uzById.set(step.step_id, step);

    return stepsRu
        .filter((step) => step.step_type === 'visual' || step.visual_hint || step.page_from > 0)
        .slice(0, 8)
        .map((step) => {
            const uz = uzById.get(step.step_id);
            const kind: VisualBlockItem['visual_kind'] = step.page_from > 0 ? 'page_fragment' : 'none';
            return {
                step_id: step.step_id,
                page_from: Math.max(1, Number(step.page_from) || 1),
                page_to: Math.max(Math.max(1, Number(step.page_from) || 1), Number(step.page_to) || Number(step.page_from) || 1),
                visual_kind: kind,
                caption_ru: sanitizeSummary(step.title || 'Визуальный блок', 'Визуальный блок', 200),
                caption_uz: sanitizeSummary(uz?.title || "Vizual blok", "Vizual blok", 200),
                importance_ru: sanitizeSummary(step.what_to_notice || step.visual_hint || '', 'Смотрите на контекст и подтверждение сигнала.', 260),
                importance_uz: sanitizeSummary(uz?.what_to_notice || uz?.visual_hint || '', "Kontekst va signal tasdig'iga e'tibor bering.", 260),
            };
        });
}

async function generateStructuredLessonContent(
    lesson: LessonPlanItem,
    classification: AIClassification,
    sourceLanguage: string,
    originalFileName: string,
    index: number,
    lessonCount: number,
    pageFragments: PdfPageFragment[],
    totalPages: number,
    hasVisualHints: boolean,
    log?: FastifyBaseLogger
): Promise<StructuredLessonContent> {
    const sourceSnippet = lesson.sourceText.replace(/\s+/g, ' ').substring(0, 9000);
    const pageWindow = buildPageWindow(totalPages, index, lessonCount);
    const lessonPageFragments = pickPageFragments(pageFragments, pageWindow.page_from, pageWindow.page_to);
    const pageHintText = lessonPageFragments
        .map((item) => `Page ${item.page}: ${item.excerpt}${item.has_visual_hints ? ' [visual hint]' : ''}`)
        .join('\n');

    const prompt = `You are a professional trading education editor.
Goal: transform source material into a structured lesson while preserving author's terminology and meaning.

File: ${originalFileName}
Detected source language: ${sourceLanguage}
Course: ${classification.course_title}
Module: ${classification.module_title}
Lesson title: ${lesson.title}
Lesson index: ${index + 1}
Estimated source pages for this lesson: ${pageWindow.page_from}-${pageWindow.page_to}
Page hints:
${pageHintText || 'No reliable page hints extracted'}
Visual hints detected in PDF: ${hasVisualHints ? 'yes' : 'no'}

Source content:
${sourceSnippet}

Return ONLY valid JSON with this shape:
{
  "lesson_type": "one of: theory, strategy, chart, glossary, psychology",
  "difficulty_level": "Beginner or Intermediate or Advanced",
  "source_section": "source chapter/section/page range used for this lesson",
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
  "common_mistakes_ru": ["..."],
  "common_mistakes_uz": ["..."],
  "self_check_ru": ["..."],
  "self_check_uz": ["..."],
  "homework_ru": "homework in Russian",
  "homework_uz": "homework in Uzbek",
  "quiz_ru": [{"question":"...", "options":["..."], "correct_index":0, "explanation":"..."}],
  "quiz_uz": [{"question":"...", "options":["..."], "correct_index":0, "explanation":"..."}],
  "lesson_steps_ru": [{"step_id":"step_intro","step_type":"intro|visual|concept|practice|takeaway|quiz","title":"...","source_excerpt":"...","explanation":"...","what_to_notice":"...","visual_hint":"...","page_from":1,"page_to":2}],
  "lesson_steps_uz": [{"step_id":"step_intro","step_type":"intro|visual|concept|practice|takeaway|quiz","title":"...","source_excerpt":"...","explanation":"...","what_to_notice":"...","visual_hint":"...","page_from":1,"page_to":2}],
  "conclusion_ru": "lesson conclusion in Russian",
  "conclusion_uz": "lesson conclusion in Uzbek",
  "additional_ru": "optional useful clarifications in Russian",
  "additional_uz": "optional useful clarifications in Uzbek"
}

Rules:
- Keep original trading terms and definitions accurate.
- Do NOT invent facts that are absent in source.
- Make explanation pedagogical and clear.
- Keep RU and UZ high quality and natural.
- Include practical application on chart where relevant.
- Include what to remember and what beginners should not confuse in mistakes/check/questions.
- Fill key points with at least 4 items.
- Fill glossary with at least 3 terms.
- Fill self-check with at least 3 questions.
- Fill quiz with 3-7 questions.
- lesson_steps_ru and lesson_steps_uz must have at least 6 steps.
- Include at least one "visual" step with page_from/page_to and visual_hint.`;

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

            const lessonTypeRaw = String(parsed?.lesson_type || '').toLowerCase();
            const lesson_type: StructuredLessonContent['lesson_type'] =
                lessonTypeRaw === 'strategy' || lessonTypeRaw === 'chart' || lessonTypeRaw === 'glossary' || lessonTypeRaw === 'psychology'
                    ? lessonTypeRaw
                    : 'theory';

            const difficultyRaw = String(parsed?.difficulty_level || '').toLowerCase();
            const difficulty_level: StructuredLessonContent['difficulty_level'] =
                difficultyRaw === 'advanced'
                    ? 'Advanced'
                    : difficultyRaw === 'intermediate'
                        ? 'Intermediate'
                        : 'Beginner';

            const source_section = sanitizeSummary(parsed?.source_section, `${classification.module_title} / ${lesson.title}`, 220);

            const summaryRu = sanitizeSummary(parsed?.summary_ru, lesson.summary || classification.summary, 1200);
            const summaryUz = sanitizeSummary(parsed?.summary_uz, summaryRu, 1200);

            const contentSource = sanitizeSummary(parsed?.content_source, lesson.sourceText || lesson.summary || classification.summary, 12000);
            const contentRu = sanitizeSummary(parsed?.content_ru, summaryRu, 15000);
            const contentUz = sanitizeSummary(parsed?.content_uz, summaryUz, 15000);

            const keyPointsRuRaw = normalizeStringArray(parsed?.key_points_ru, 15);
            const keyPointsUzRaw = normalizeStringArray(parsed?.key_points_uz, 15);

            const keyPointsRu = ensureMinItems(
                keyPointsRuRaw,
                4,
                fallbackKeyPoints('RU', lesson.title, summaryRu)
            );
            const keyPointsUz = ensureMinItems(
                keyPointsUzRaw,
                4,
                fallbackKeyPoints('UZ', lesson.title, summaryUz)
            );

            const glossaryRuRaw = normalizeGlossary(parsed?.glossary_ru);
            const glossaryUzRaw = normalizeGlossary(parsed?.glossary_uz);

            const glossaryRu = ensureMinGlossary(glossaryRuRaw, 3, fallbackGlossary('RU'));
            const glossaryUz = ensureMinGlossary(glossaryUzRaw, 3, fallbackGlossary('UZ'));

            const practiceRu = sanitizeSummary(parsed?.practice_ru, summaryRu, 3000);
            const practiceUz = sanitizeSummary(parsed?.practice_uz, summaryUz, 3000);

            const commonMistakesRuRaw = normalizeStringArray(parsed?.common_mistakes_ru, 12);
            const commonMistakesUzRaw = normalizeStringArray(parsed?.common_mistakes_uz, 12);
            const selfCheckRuRaw = normalizeStringArray(parsed?.self_check_ru, 10);
            const selfCheckUzRaw = normalizeStringArray(parsed?.self_check_uz, 10);

            const commonMistakesRu = ensureMinItems(commonMistakesRuRaw, 3, fallbackCommonMistakes('RU'));
            const commonMistakesUz = ensureMinItems(commonMistakesUzRaw, 3, fallbackCommonMistakes('UZ'));
            const selfCheckRu = ensureMinItems(selfCheckRuRaw, 3, fallbackSelfCheck('RU', lesson.title));
            const selfCheckUz = ensureMinItems(selfCheckUzRaw, 3, fallbackSelfCheck('UZ', lesson.title));

            const homeworkRuRaw = sanitizeSummary(parsed?.homework_ru, '', 3000);
            const homeworkUzRaw = sanitizeSummary(parsed?.homework_uz, '', 3000);

            const homeworkRu = homeworkRuRaw || fallbackHomework('RU', lesson.title, practiceRu);
            const homeworkUz = homeworkUzRaw || fallbackHomework('UZ', lesson.title, practiceUz);

            const quizRuRaw = normalizeQuiz(parsed?.quiz_ru);
            const quizUzRaw = normalizeQuiz(parsed?.quiz_uz);

            const quizRu = ensureMinQuiz(quizRuRaw, 3, fallbackQuiz('RU', keyPointsRu));
            const quizUz = ensureMinQuiz(quizUzRaw, 3, fallbackQuiz('UZ', keyPointsUz));

            const conclusionRu = sanitizeSummary(parsed?.conclusion_ru, summaryRu, 2500);
            const conclusionUz = sanitizeSummary(parsed?.conclusion_uz, summaryUz, 2500);

            const additionalRu = sanitizeSummary(parsed?.additional_ru, '', 3000);
            const additionalUz = sanitizeSummary(parsed?.additional_uz, '', 3000);

            const rememberRu = [conclusionRu, additionalRu, keyPointsRu.slice(0, 2).join(' | ')].filter(Boolean).join(' ');
            const rememberUz = [conclusionUz, additionalUz, keyPointsUz.slice(0, 2).join(' | ')].filter(Boolean).join(' ');

            const lessonStepsRuRaw = normalizeLessonSteps(parsed?.lesson_steps_ru, 'RU', pageWindow.page_from, pageWindow.page_to);
            const lessonStepsUzRaw = normalizeLessonSteps(parsed?.lesson_steps_uz, 'UZ', pageWindow.page_from, pageWindow.page_to);

            const lessonStepsRu = lessonStepsRuRaw.length >= 6
                ? lessonStepsRuRaw
                : buildFallbackLessonSteps(
                    'RU',
                    lesson.title,
                    summaryRu,
                    contentRu,
                    keyPointsRu,
                    practiceRu,
                    rememberRu,
                    quizRu,
                    pageWindow,
                    lessonPageFragments,
                    hasVisualHints
                );

            const lessonStepsUz = lessonStepsUzRaw.length >= 6
                ? lessonStepsUzRaw
                : buildFallbackLessonSteps(
                    'UZ',
                    lesson.title,
                    summaryUz,
                    contentUz,
                    keyPointsUz,
                    practiceUz,
                    rememberUz,
                    quizUz,
                    pageWindow,
                    lessonPageFragments,
                    hasVisualHints
                );

            const visualBlocks = buildVisualBlocks(lessonStepsRu, lessonStepsUz);

            return {
                lesson_type,
                difficulty_level,
                source_section,
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
                common_mistakes_ru: commonMistakesRu,
                common_mistakes_uz: commonMistakesUz,
                self_check_ru: selfCheckRu,
                self_check_uz: selfCheckUz,
                homework_ru: homeworkRu,
                homework_uz: homeworkUz,
                quiz_ru: quizRu,
                quiz_uz: quizUz,
                lesson_steps_ru: lessonStepsRu,
                lesson_steps_uz: lessonStepsUz,
                visual_blocks: visualBlocks,
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
    pageFragments: PdfPageFragment[],
    totalPages: number,
    hasVisualHints: boolean,
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
            lessonPlan.lessons.length,
            pageFragments,
            totalPages,
            hasVisualHints,
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
            const commonMistakesJson = {
                RU: lesson.structured.common_mistakes_ru,
                UZ: lesson.structured.common_mistakes_uz,
            };
            const selfCheckQuestionsJson = {
                RU: lesson.structured.self_check_ru,
                UZ: lesson.structured.self_check_uz,
            };
            const homeworkJson = {
                RU: lesson.structured.homework_ru,
                UZ: lesson.structured.homework_uz,
            };
            const quizJson = {
                RU: lesson.structured.quiz_ru,
                UZ: lesson.structured.quiz_uz,
            };
            const lessonStepsJson = {
                RU: lesson.structured.lesson_steps_ru,
                UZ: lesson.structured.lesson_steps_uz,
            };
            const visualBlocksJson = lesson.structured.visual_blocks;
            const lessonTestJson = {
                RU: lesson.structured.quiz_ru,
                UZ: lesson.structured.quiz_uz,
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
                             common_mistakes_json = $14,
                             self_check_questions_json = $15,
                             homework_json = $16,
                             quiz_json = $17,
                             lesson_steps_json = $18,
                             visual_blocks_json = $19,
                             lesson_test_json = $20,
                             lesson_type = $21,
                             source_section = $22,
                             difficulty_level = $23,
                             conclusion_json = $24,
                             additional_notes_json = $25,
                             updated_at = NOW()
                         WHERE id = $26`,
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
                            JSON.stringify(commonMistakesJson),
                            JSON.stringify(selfCheckQuestionsJson),
                            JSON.stringify(homeworkJson),
                            JSON.stringify(quizJson),
                            JSON.stringify(lessonStepsJson),
                            JSON.stringify(visualBlocksJson),
                            JSON.stringify(lessonTestJson),
                            lesson.structured.lesson_type,
                            lesson.structured.source_section,
                            lesson.structured.difficulty_level,
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
                            common_mistakes_json, self_check_questions_json, homework_json, quiz_json,
                            lesson_steps_json, visual_blocks_json, lesson_test_json,
                            lesson_type, source_section, difficulty_level,
                            sort_order, position, created_at, updated_at
                         )
                         VALUES (
                            $1, $2, $3,
                            $4, $5, $6, $7,
                            $8, $9, $10, $11,
                            $12, $13,
                            $14, $15, $16, $17, $18,
                            $19, $20, $21, $22,
                            $23, $24, $25,
                            $26, $27, $28,
                            $29, $29, NOW(), NOW()
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
                            JSON.stringify(commonMistakesJson),
                            JSON.stringify(selfCheckQuestionsJson),
                            JSON.stringify(homeworkJson),
                            JSON.stringify(quizJson),
                            JSON.stringify(lessonStepsJson),
                            JSON.stringify(visualBlocksJson),
                            JSON.stringify(lessonTestJson),
                            lesson.structured.lesson_type,
                            lesson.structured.source_section,
                            lesson.structured.difficulty_level,
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
        let totalPages = 1;
        let pageFragments: PdfPageFragment[] = [];
        let hasVisualHints = false;
        try {
            const extracted = await extractPdfText(filePath);
            extractedText = extracted.aiText;
            fullText = extracted.fullText;
            totalPages = extracted.totalPages;
            pageFragments = extracted.pageFragments;
            hasVisualHints = extracted.hasVisualHints;
        } catch (pdfErr: any) {
            if (log) log.warn(`[Ingestion] pdf-parse failed: ${pdfErr.message} — using filename fallback`);
        }

        // If PDF has no extractable text (image-based), use fallback classification
        if (!extractedText || extractedText.length < 20) {
            if (log) log.warn(`[Ingestion] PDF has no/little text, using filename fallback: ${originalFileName}`);
            extractedText = `Trading material: ${originalFileName.replace('.pdf', '')}`;
            fullText = extractedText;
            totalPages = Math.max(totalPages, 1);
            pageFragments = pageFragments.length
                ? pageFragments
                : [{ page: 1, excerpt: extractedText.substring(0, 320), has_visual_hints: false }];
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
            pageFragments,
            totalPages,
            hasVisualHints,
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
                    lesson_titles: lessonPlan.lessons.map(l => l.title),
                    total_pages: totalPages,
                    has_visual_hints: hasVisualHints,
                    step_blocks_per_lesson: enrichedLessonPlan.lessons.map((l) => l.structured.lesson_steps_ru.length),
                    visual_blocks_per_lesson: enrichedLessonPlan.lessons.map((l) => l.structured.visual_blocks.length),
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
                            `SELECT content_ru, content_uz, lesson_steps_json, visual_blocks_json, lesson_test_json
                             FROM lessons WHERE id = $1 LIMIT 1`,
                            [row.lesson_id]
                        ).catch(() => ({ rows: [] as any[] }));

                        const lessonRow = lessonContentRes.rows[0];
                        const hasMultilingualContent = !!lessonRow?.content_ru && !!lessonRow?.content_uz;
                        const hasStepBlocks = !!lessonRow?.lesson_steps_json;
                        const hasLessonTest = !!lessonRow?.lesson_test_json;

                        if (hasMultilingualContent && hasStepBlocks && hasLessonTest) {
                            if (log) log.info(`[scanLibrary] Skipping (already processed): ${file}`);
                            skipped++;
                            continue;
                        }

                        if (log) log.info(`[scanLibrary] Reprocessing material without full step-based lesson structure: ${file}`);
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
