import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import z from 'zod'
import { openRouterService } from './openrouter'

const ChatSchema = z.object({
    message: z.string().min(1),
    image: z.string().optional(),
    context: z.object({
        courseId: z.string().optional(),
        courseTitle: z.string().optional(),
        courseLevel: z.string().optional(),
        lessonId: z.string().optional(),
        lessonTitle: z.string().optional(),
        lessonType: z.string().optional(),
        lessonLanguage: z.string().optional(),
        sourceLanguage: z.string().optional(),
        lessonSummary: z.string().optional(),
        moduleTitle: z.string().optional(),
        lessonContent: z.string().optional(),
        keyPoints: z.array(z.string()).optional(),
        practice: z.string().optional(),
        commonMistakes: z.array(z.string()).optional(),
        selfCheckQuestions: z.array(z.string()).optional(),
        homework: z.string().optional(),
        glossary: z.any().optional(),
    }).optional(),
})

export default async function aiRoutes(server: FastifyInstance) {

    // ── GET /ai/test ───────────────────────────────────────────
    server.get(
        '/test',
        async (request: any, reply) => {
            try {
                const model = 'meta-llama/llama-3.1-8b-instruct:free';
                const messages = [{ role: 'user', content: 'Say "hello world" if you are online.' }];
                const data = await openRouterService.chat(model, messages, server);
                return { success: true, ai_response: data.choices[0].message.content, model };
            } catch (error: any) {
                return reply.status(500).send({ success: false, error: 'OpenRouter Test Failed', details: error.message });
            }
        }
    )

    // ── POST /ai/chat ──────────────────────────────────────────
    server.post(
        '/chat',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const { message, image, context } = ChatSchema.parse(request.body)
                const userId = request.user.id

                let userLanguage: 'RU' | 'UZ' = 'RU'
                let userLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner'
                try {
                    const userRes = await query(`SELECT language, trading_level FROM users WHERE id = $1 LIMIT 1`, [userId])
                    const lang = String(userRes.rows[0]?.language || 'RU').toUpperCase()
                    userLanguage = lang === 'UZ' ? 'UZ' : 'RU'
                    const levelRaw = String(userRes.rows[0]?.trading_level || 'Beginner')
                    userLevel = levelRaw === 'Advanced' ? 'Advanced' : levelRaw === 'Intermediate' ? 'Intermediate' : 'Beginner'
                } catch {
                    userLanguage = 'RU'
                    userLevel = 'Beginner'
                }

                // Validate Image
                let validatedImage = "";
                if (image) {
                    if (image.startsWith('blob:') || image.startsWith('http')) {
                        return reply.status(400).send({ error: 'Local or blob URLs are not supported. Upload a valid image file.' });
                    }
                    if (!image.startsWith('data:image/jpeg;base64,') && !image.startsWith('data:image/png;base64,')) {
                        return reply.status(400).send({ error: 'Invalid image format. Only JPEG and PNG are allowed.' });
                    }

                    const base64Data = image.split(',')[1];
                    const sizeBytes = (base64Data.length * 3) / 4;
                    if (sizeBytes > 5 * 1024 * 1024) {
                        return reply.status(400).send({ error: 'Image too large. Maximum size is 5MB.' });
                    }
                    validatedImage = image;
                }

                // 1. Получаем контекст из книг в библиотеке
                let libraryContext = "";
                try {
                    const { getLibraryContext } = await import('./libraryService');
                    libraryContext = await getLibraryContext(message);
                } catch (e: any) {
                    server.log.error(e, 'Library Service Error');
                }

                let lessonContextText = ''
                if (context?.lessonId) {
                    try {
                        const lessonRes = await query(
                            `SELECT l.title,
                                    COALESCE(CASE WHEN $2 = 'UZ' THEN l.summary_uz ELSE l.summary_ru END, l.summary) as summary,
                                    l.content,
                                    l.content_ru,
                                    l.content_uz,
                                    l.key_points_json,
                                    l.glossary_json,
                                    l.practice_notes,
                                    l.common_mistakes_json,
                                    l.self_check_questions_json,
                                    l.homework_json,
                                    l.lesson_steps_json,
                                    l.visual_blocks_json,
                                    l.lesson_test_json,
                                    l.lesson_type,
                                    l.source_section,
                                    l.source_language,
                                    l.difficulty_level,
                                    m.title AS module_title,
                                    c.title AS course_title,
                                    c.level AS course_level
                             FROM lessons l
                             JOIN modules m ON m.id = l.module_id
                             JOIN courses c ON c.id = m.course_id
                             WHERE l.id = $1
                             LIMIT 1`,
                            [context.lessonId, userLanguage]
                        )
                        if (lessonRes.rows.length) {
                            const row = lessonRes.rows[0]

                            const pickLocalized = (raw: any) => {
                                if (!raw || typeof raw !== 'object') return null
                                return raw[userLanguage] ?? raw[String(userLanguage).toLowerCase()] ??
                                    raw[userLanguage === 'UZ' ? 'RU' : 'UZ'] ?? raw[userLanguage === 'UZ' ? 'ru' : 'uz'] ?? null
                            }

                            const localizedContent =
                                userLanguage === 'UZ'
                                    ? (row.content_uz || row.content || '')
                                    : (row.content_ru || row.content || '')

                            const keyPointsRaw = pickLocalized(row.key_points_json)
                            const keyPoints = Array.isArray(keyPointsRaw)
                                ? keyPointsRaw.slice(0, 6).join(' | ')
                                : ''

                            const glossaryRaw = pickLocalized(row.glossary_json)
                            const glossary = Array.isArray(glossaryRaw)
                                ? glossaryRaw
                                    .slice(0, 6)
                                    .map((item: any) => `${item.term}: ${item.definition}`)
                                    .join(' | ')
                                : ''

                            const practiceText = String(pickLocalized(row.practice_notes) || '').replace(/\s+/g, ' ').trim().substring(0, 800)

                            const mistakesRaw = pickLocalized(row.common_mistakes_json)
                            const mistakes = Array.isArray(mistakesRaw)
                                ? mistakesRaw.slice(0, 4).join(' | ')
                                : ''

                            const selfCheckRaw = pickLocalized(row.self_check_questions_json)
                            const selfCheck = Array.isArray(selfCheckRaw)
                                ? selfCheckRaw.slice(0, 4).join(' | ')
                                : ''

                            const homeworkText = String(pickLocalized(row.homework_json) || '').replace(/\s+/g, ' ').trim().substring(0, 800)

                            const lessonStepsRaw = pickLocalized(row.lesson_steps_json)
                            const lessonSteps = Array.isArray(lessonStepsRaw)
                                ? lessonStepsRaw
                                    .slice(0, 4)
                                    .map((step: any) => `${step.title || ''}: ${String(step.explanation || '').replace(/\s+/g, ' ').substring(0, 220)}`)
                                    .join(' | ')
                                : ''

                            const visualBlocksRaw = Array.isArray(row.visual_blocks_json) ? row.visual_blocks_json : []
                            const visualBlocks = visualBlocksRaw
                                .slice(0, 3)
                                .map((block: any) => `step:${block.step_id || ''} pages:${block.page_from || 1}-${block.page_to || block.page_from || 1}`)
                                .join(' | ')

                            const lessonTestRaw = pickLocalized(row.lesson_test_json)
                            const lessonTestInfo = Array.isArray(lessonTestRaw)
                                ? `questions:${lessonTestRaw.length}`
                                : ''

                            const contentSnippet = String(localizedContent || '').replace(/\s+/g, ' ').substring(0, 1800)
                            lessonContextText = `
Current lesson context:
- Course: ${row.course_title}
- Course level: ${row.course_level || ''}
- Module: ${row.module_title}
- Lesson: ${row.title}
- Lesson type: ${row.lesson_type || ''}
- Difficulty: ${row.difficulty_level || ''}
- Source language: ${row.source_language || ''}
- Source section: ${row.source_section || ''}
- Lesson summary: ${row.summary || ''}
- Key points: ${keyPoints}
- Glossary: ${glossary}
- Practice block: ${practiceText}
- Common mistakes: ${mistakes}
- Self-check questions: ${selfCheck}
- Homework: ${homeworkText}
- Lesson steps: ${lessonSteps}
- Visual blocks: ${visualBlocks}
- Lesson test: ${lessonTestInfo}
- Lesson content snippet: ${contentSnippet}`
                        }
                    } catch (e: any) {
                        server.log.warn(`Failed to load lesson context: ${e.message}`)
                    }
                } else if (context) {
                    const fallbackGlossary = Array.isArray(context.glossary)
                        ? context.glossary
                            .slice(0, 6)
                            .map((item: any) => `${item.term || ''}: ${item.definition || ''}`)
                            .join(' | ')
                        : ''

                    lessonContextText = `
Current lesson context:
- Course: ${context.courseTitle || ''}
- Course level: ${context.courseLevel || ''}
- Module: ${context.moduleTitle || ''}
- Lesson: ${context.lessonTitle || ''}
- Lesson type: ${context.lessonType || ''}
- Lesson language: ${context.lessonLanguage || ''}
- Source language: ${context.sourceLanguage || ''}
- Lesson summary: ${context.lessonSummary || ''}
- Lesson content snippet: ${String(context.lessonContent || '').replace(/\s+/g, ' ').substring(0, 1500)}
- Key points: ${Array.isArray(context.keyPoints) ? context.keyPoints.slice(0, 6).join(' | ') : ''}
- Practice block: ${String(context.practice || '').replace(/\s+/g, ' ').substring(0, 600)}
- Common mistakes: ${Array.isArray(context.commonMistakes) ? context.commonMistakes.slice(0, 4).join(' | ') : ''}
- Self-check questions: ${Array.isArray(context.selfCheckQuestions) ? context.selfCheckQuestions.slice(0, 4).join(' | ') : ''}
- Homework: ${String(context.homework || '').replace(/\s+/g, ' ').substring(0, 600)}
- Glossary: ${fallbackGlossary}
`
                }

                // System prompt for TradeMentor AI
                const systemPrompt = `You are TradeMentor AI, a professional trading mentor specializing in SMC, ICT, Price Action, and Psychology.
You have access to a private library of professional trading books. Use the provided context to answer the student's question accurately.

PRIVATE LIBRARY CONTEXT:
${libraryContext || "No specific books found in library yet."}

Rules:
1. ONLY answer questions related to trading, finance, and psychology.
2. If the context contains relevant information, prioritize it.
3. Use a professional, encouraging mentor tone.
4. Be concise but deep. When talking about "liquid", always assume "liquidity" in a trading context.
5. Answer language must match student's preferred UI language: ${userLanguage}.
   - If RU: answer fully in Russian.
   - If UZ: answer fully in Uzbek (Latin script).
6. Adjust explanation depth to student level: ${userLevel}.`;

                const finalSystemPrompt = `${systemPrompt}\n\nStudent level: ${userLevel}.${lessonContextText || ''}`;

                // Try Multiple models (Fallback system)
                const models = [
                    'meta-llama/llama-3.3-70b-instruct',
                    'meta-llama/llama-3.1-70b-instruct',
                    'meta-llama/llama-3.1-8b-instruct:free',
                    'google/gemma-2-9b-it:free'
                ];

                let aiMessage = "";
                let successfullyCalled = false;
                let lastError = "";

                // Formatting message properly if an image is attached
                let finalUserContent: any = message;
                if (validatedImage) {
                    finalUserContent = [
                        { type: 'text', text: message },
                        { type: 'image_url', image_url: { url: validatedImage } }
                    ];
                }

                for (const model of models) {
                    if (successfullyCalled) break;
                    try {
                        const data = await openRouterService.chat(model, [
                            { role: 'system', content: finalSystemPrompt },
                            { role: 'user', content: finalUserContent }
                        ], server);

                        aiMessage = data.choices?.[0]?.message?.content;
                        if (aiMessage) successfullyCalled = true;
                    } catch (e: any) {
                        lastError = `Fetch error for ${model}: ${e.message}`;
                    }
                }

                if (!successfullyCalled) {
                    throw new Error(lastError || "All models failed");
                }

                // Log the AI request to DB
                await query(
                    'INSERT INTO ai_requests (user_id, type, message, response, provider, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
                    [
                        userId,
                        'chat',
                        message + (validatedImage ? " [IMAGE ATTACHED]" : ""),
                        aiMessage,
                        'openrouter',
                        JSON.stringify({
                            language: userLanguage,
                            level: userLevel,
                            lessonContext: context || null,
                        })
                    ]
                ).catch(e => server.log.error('DB Log Error:', e));

                // Audit log
                await query(
                    'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
                    [userId, 'AI_REQUEST', JSON.stringify({ prompt_length: message.length, success: true })]
                ).catch(e => server.log.error('Audit Log Error:', e));

                return { response: aiMessage }
            } catch (err: any) {
                server.log.error('AI Final Error:', err.message);
                return reply.status(500).send({
                    error: 'AI is currently overloaded',
                    details: err.message,
                    hint: "Please check your OPENROUTER_KEY_1 in Render environment."
                })
            }
        }
    )
}
