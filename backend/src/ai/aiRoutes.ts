import { FastifyInstance } from 'fastify'
import { query } from '../config/db'
import z from 'zod'

const ChatSchema = z.object({
    message: z.string().min(1),
})

export default async function aiRoutes(server: FastifyInstance) {

    // ── POST /ai/chat ──────────────────────────────────────────
    server.post(
        '/chat',
        { preValidation: [server.authenticate] },
        async (request: any, reply) => {
            try {
                const { message } = ChatSchema.parse(request.body)
                const userId = request.user.id

                // 1. Получаем контекст из книг в библиотеке
                let libraryContext = "";
                try {
                    const { getLibraryContext } = await import('./libraryService');
                    libraryContext = await getLibraryContext(message);
                } catch (e: any) {
                    server.log.error(e, 'Library Service Error');
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
4. Be concise but deep. When talking about "liquid", always assume "liquidity" in a trading context.`;

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

                for (const model of models) {
                    if (successfullyCalled) break;

                    try {
                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${process.env.OPENROUTER_KEY_1}`,
                                'Content-Type': 'application/json',
                                'HTTP-Referer': 'https://tradementor-ai.com',
                                'X-Title': 'TradeMentor AI',
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [
                                    { role: 'system', content: systemPrompt },
                                    { role: 'user', content: message }
                                ],
                            }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            aiMessage = data.choices?.[0]?.message?.content;
                            if (aiMessage) successfullyCalled = true;
                        } else {
                            const errText = await response.text();
                            lastError = `Model ${model} failed (${response.status}): ${errText}`;
                            server.log.warn(lastError);
                        }
                    } catch (e: any) {
                        lastError = `Fetch error for ${model}: ${e.message}`;
                        server.log.error(lastError);
                    }
                }

                if (!successfullyCalled) {
                    throw new Error(lastError || "All models failed");
                }

                // Log the AI request to DB
                await query(
                    'INSERT INTO ai_requests (user_id, type, message, response, provider) VALUES ($1, $2, $3, $4, $5)',
                    [userId, 'chat', message, aiMessage, 'openrouter']
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
