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
import { query } from '../config/db';
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

// ── PDF Text Extraction ──────────────────────────────────────
async function extractPdfText(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);

    // Dynamically import pdf-parse to handle ESM/CJS differences
    let pdfParse: any;
    try {
        const mod = await import('pdf-parse');
        pdfParse = typeof mod === 'function' ? mod : mod.default;
    } catch {
        throw new Error('pdf-parse not available');
    }

    const data = await pdfParse(buffer);
    const text = data.text || '';
    // Limit to ~4000 chars for AI classification (We don't need full text)
    return text.substring(0, 4000).trim();
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

            return parsed;
        } catch (e: any) {
            lastError = e.message;
            if (log) log.warn(`Classification failed for model ${model}: ${e.message}`);
        }
    }

    // Fallback: classify from filename
    if (log) log.warn(`AI classification failed, using filename fallback. Last error: ${lastError}`);
    return classifyFromFilename(originalFileName);
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

    // 1. Find or create course by title
    let courseId: string;
    const existingCourse = await query(
        `SELECT id FROM courses WHERE LOWER(title) = LOWER($1) LIMIT 1`,
        [classification.course_title]
    );

    if (existingCourse.rows.length > 0) {
        courseId = existingCourse.rows[0].id;
    } else {
        const newCourse = await query(
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

    // 2. Find or create module by title + course_id
    let moduleId: string;
    const existingModule = await query(
        `SELECT id FROM modules WHERE course_id = $1 AND LOWER(title) = LOWER($2) LIMIT 1`,
        [courseId, classification.module_title]
    );

    if (existingModule.rows.length > 0) {
        moduleId = existingModule.rows[0].id;
    } else {
        // Get current max position
        const maxPos = await query(
            `SELECT COALESCE(MAX(position), 0) as max_pos FROM modules WHERE course_id = $1`,
            [courseId]
        );
        const newPos = (parseInt(maxPos.rows[0].max_pos) || 0) + 1;

        const newModule = await query(
            `INSERT INTO modules (id, course_id, title, position, sort_order, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $4, NOW(), NOW()) RETURNING id`,
            [crypto.randomUUID(), courseId, classification.module_title, newPos]
        );
        moduleId = newModule.rows[0].id;
    }

    // 3. Create lesson (always new per PDF)
    const maxLessonPos = await query(
        `SELECT COALESCE(MAX(position), 0) as max_pos FROM lessons WHERE module_id = $1`,
        [moduleId]
    );
    const newLessonPos = (parseInt(maxLessonPos.rows[0].max_pos) || 0) + 1;

    const newLesson = await query(
        `INSERT INTO lessons (id, module_id, title, content, summary, pdf_path, position, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $7, NOW(), NOW()) RETURNING id`,
        [
            crypto.randomUUID(),
            moduleId,
            classification.lesson_title,
            classification.summary,  // content = summary for now
            classification.summary,
            pdfPath,
            newLessonPos
        ]
    );
    const lessonId = newLesson.rows[0].id;

    return { course_id: courseId, module_id: moduleId, lesson_id: lessonId };
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
    ).catch(() => {/* Table may not exist yet, ignore */ });

    try {
        // 1. Extract PDF text
        if (log) log.info(`[Ingestion] Extracting text from: ${originalFileName}`);
        const extractedText = await extractPdfText(filePath);

        if (!extractedText || extractedText.length < 50) {
            throw new Error('PDF appears to be empty or contains no readable text (possibly image-based PDF)');
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
        ).catch(() => { });

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
        ).catch(() => { });

        return { success: false, error: errMsg };
    }
}

// ── Scan Library Function ─────────────────────────────────────
export async function scanLibrary(log?: FastifyBaseLogger): Promise<{
    total: number;
    processed: number;
    failed: number;
    results: IngestionResult[];
}> {
    const libraryDir = path.resolve(process.cwd(), '..', 'data', 'library');

    if (!fs.existsSync(libraryDir)) {
        if (log) log.warn(`[scanLibrary] Library directory not found: ${libraryDir}`);
        return { total: 0, processed: 0, failed: 0, results: [] };
    }

    const files = fs.readdirSync(libraryDir).filter(f => f.toLowerCase().endsWith('.pdf'));

    if (log) log.info(`[scanLibrary] Found ${files.length} PDFs in library`);

    const results: IngestionResult[] = [];
    let processed = 0;
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

    return { total: files.length, processed, failed, results };
}
