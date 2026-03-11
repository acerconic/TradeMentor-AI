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

                // System prompt for TradeMentor AI
                const systemPrompt = `You are TradeMentor AI, a professional trading mentor specializing in SMC (Smart Money Concepts), ICT, Price Action, Market Structure, and Trading Psychology.
Your goal is to help students learn these concepts deeply. 
Rules:
1. ONLY answer questions related to trading, finance, and psychology.
2. If a question is not related to trading (e.g., "how to cook pasta" or "who are you"), politely decline by saying you are strictly a trading mentor.
3. Use professional, encouraging, and analytical tone.
4. When talking about "liquid", always assume "liquidity" in a trading context unless specified otherwise.`;

                // Call OpenRouter API
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_KEY_1}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://tradementor-ai.com',
                        'X-Title': 'TradeMentor AI',
                    },
                    body: JSON.stringify({
                        model: 'meta-llama/llama-3.1-405b-instruct:free',
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: message }
                        ],
                    }),
                })

                if (!response.ok) {
                    const errorText = await response.text();
                    server.log.error(`OpenRouter Error: ${response.status} - ${errorText}`);
                    throw new Error(`AI Gateway responded with ${response.status}`);
                }

                const data = await response.json()
                const aiMessage = data.choices?.[0]?.message?.content || 'I apologize, but I am unable to process your request at this moment.'

                // Log the AI request to DB
                await query(
                    'INSERT INTO ai_requests (user_id, type, message, response, provider) VALUES ($1, $2, $3, $4, $5)',
                    [userId, 'chat', message, aiMessage, 'openrouter']
                ).catch(e => server.log.error('DB Log Error:', e));

                return { response: aiMessage }
            } catch (err: any) {
                server.log.error('AI Route Error:', err.message);
                return reply.status(500).send({ error: 'AI processing failed', details: err.message })
            }
        }
    )
}
