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
}

interface IngestionResult {
    success: boolean;
    course_id?: string;
    course_title?: string;
    lesson_id?: string;
    lesson_title?: string;
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

    return { category, course_title, module_title, lesson_title, summary };
}

// ── PDF Text Extraction ──────────────────────────────────────
async function extractPdfText(filePath: string): Promise<string> {
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
    const text = (data.text || '').replace(/\s+/g, ' ').trim();
    // Limit to ~4000 chars for AI classification
    return text.substring(0, 4000);
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
PDF content (first 4000 chars):
${extractedText}

Return ONLY this JSON (no markdown, no explanation):
{
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
        category,
        course_title: category + ' Trading Mastery',
        module_title: 'Core Concepts',
        lesson_title: name.length > 60 ? name.substring(0, 60) : name,
        summary: `A comprehensive guide on ${name} for professional traders.`
    };
}

// ── Course / Module / Lesson Upsert ──────────────────────────
async function upsertCourseModuleLesson(
    classification: AIClassification,
    pdfPath: string
): Promise<{ course_id: string; module_id: string; lesson_id: string }> {
    return withTransaction(async (client) => {
        // Guard against concurrent imports producing duplicates.
        // Uses advisory locks (no schema changes required).
        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`course:${classification.course_title.toLowerCase()}`]);

        // 1. Find or create course by title
        let courseId: string;
        const existingCourse = await client.query(
            `SELECT id FROM courses WHERE LOWER(title) = LOWER($1) LIMIT 1`,
            [classification.course_title]
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
                    'RU'
                ]
            );
            courseId = newCourse.rows[0].id;
        }

        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`module:${courseId}:${classification.module_title.toLowerCase()}`]);

        // 2. Find or create module by title + course_id
        let moduleId: string;
        const existingModule = await client.query(
            `SELECT id FROM modules WHERE course_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
            [courseId, classification.module_title]
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
                [crypto.randomUUID(), courseId, classification.module_title, newPos]
            );
            moduleId = newModule.rows[0].id;
        }

        await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`lesson:${moduleId}:${classification.lesson_title.toLowerCase()}`]);

        // 3. Upsert lesson by title within module (idempotent re-import)
        const existingLesson = await client.query(
            `SELECT id FROM lessons WHERE module_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
            [moduleId, classification.lesson_title]
        );

        let lessonId: string;
        if (existingLesson.rows.length > 0) {
            lessonId = existingLesson.rows[0].id;
        } else {
            const maxLessonPos = await client.query(
                `SELECT COALESCE(MAX(sort_order), 0) as max_pos FROM lessons WHERE module_id = $1`,
                [moduleId]
            );
            const newLessonPos = (parseInt(maxLessonPos.rows[0].max_pos) || 0) + 1;

            // Prefer inserting with summary/pdf_path when columns exist.
            try {
                const newLesson = await client.query(
                    `INSERT INTO lessons (id, module_id, title, content, summary, pdf_path, sort_order, position, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $4, $5, $6, $6, NOW(), NOW()) RETURNING id`,
                    [
                        crypto.randomUUID(),
                        moduleId,
                        classification.lesson_title,
                        classification.summary,
                        pdfPath,
                        newLessonPos
                    ]
                );
                lessonId = newLesson.rows[0].id;
            } catch (e: any) {
                if (!isPgUndefinedColumnError(e)) throw e;
                const newLesson = await client.query(
                    `INSERT INTO lessons (id, module_id, title, content, sort_order, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id`,
                    [
                        crypto.randomUUID(),
                        moduleId,
                        classification.lesson_title,
                        classification.summary,
                        newLessonPos
                    ]
                );
                lessonId = newLesson.rows[0].id;
            }
        }

        // Update lesson metadata (safe even on re-import)
        try {
            await client.query(
                `UPDATE lessons SET summary = $1, pdf_path = $2, updated_at = NOW() WHERE id = $3`,
                [classification.summary, pdfPath, lessonId]
            );
        } catch (e: any) {
            if (!isPgUndefinedColumnError(e)) throw e;
        }

        return { course_id: courseId, module_id: moduleId, lesson_id: lessonId };
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
        try {
            extractedText = await extractPdfText(filePath);
        } catch (pdfErr: any) {
            if (log) log.warn(`[Ingestion] pdf-parse failed: ${pdfErr.message} — using filename fallback`);
        }

        // If PDF has no extractable text (image-based), use fallback classification
        if (!extractedText || extractedText.length < 20) {
            if (log) log.warn(`[Ingestion] PDF has no/little text, using filename fallback: ${originalFileName}`);
            extractedText = `Trading material: ${originalFileName.replace('.pdf', '')}`;
        }

        // 2. AI Classification
        if (log) log.info(`[Ingestion] Classifying with AI: ${originalFileName}`);
        const classification = await classifyWithAI(extractedText, originalFileName, log);
        if (log) log.info(`[Ingestion] Classified: ${JSON.stringify(classification)}`);

        // 3. Upsert Course → Module → Lesson
        const { course_id, lesson_id } = await upsertCourseModuleLesson(classification, filePath);

        // 4. Update material record
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
                extractedText.substring(0, 5000),
                classification.category,
                JSON.stringify(classification),
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
            lesson_title: classification.lesson_title,
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
        // Skip if already processed
        try {
            const existing = await query(
                `SELECT id FROM uploaded_materials WHERE original_name = $1 AND status = 'processed'`,
                [file]
            );
            if (existing.rows.length > 0) {
                if (log) log.info(`[scanLibrary] Skipping (already processed): ${file}`);
                skipped++;
                continue;
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
