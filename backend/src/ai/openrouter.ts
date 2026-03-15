import { FastifyInstance } from 'fastify'

interface ChatOptions {
    temperature?: number;
    max_tokens?: number;
}

export class OpenRouterService {
    private keys: string[] = [];

    // Keys are loaded dynamically on use or initialized here
    // But it's better to fetch from process.env internally on method call in case env takes time to inject
    private getKeys(): string[] {
        const possibleKeys = [
            process.env.OPENROUTER_KEY_1,
            process.env.OPENROUTER_KEY_2,
            process.env.OPENROUTER_KEY_3
        ];
        return possibleKeys.filter(k => k && k.trim() !== '') as string[];
    }

    public async chat(model: string, messages: any[], server?: FastifyInstance, options?: ChatOptions) {
        const keys = this.getKeys();
        if (keys.length === 0) {
            throw new Error("No OpenRouter API keys configured. Please set OPENROUTER_KEY_1 in environment.");
        }

        const temperatureRaw = Number(options?.temperature);
        const temperature = Number.isFinite(temperatureRaw)
            ? Math.max(0, Math.min(2, temperatureRaw))
            : undefined;
        const maxTokensRaw = Number(options?.max_tokens);
        const max_tokens = Number.isFinite(maxTokensRaw)
            ? Math.max(1, Math.min(16000, Math.floor(maxTokensRaw)))
            : undefined;

        const errorsToRotate = [401, 403, 429, 500, 502, 503];
        let lastError = "";

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            try {
                if (server) {
                    server.log.info(`Calling OpenRouter API... Model: ${model}, Key Index: ${i + 1}`);
                } else {
                    console.log(`Calling OpenRouter API... Model: ${model}, Key Index: ${i + 1}`);
                }

                const payload: Record<string, any> = {
                    model,
                    ...(typeof temperature === 'number' ? { temperature } : {}),
                    ...(typeof max_tokens === 'number' ? { max_tokens } : {}),
                    messages
                };

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://tradementor-ai.com',
                        'X-Title': 'TradeMentor AI',
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    if (server) server.log.info(`Success: Model ${model}, Status 200`);
                    return data;
                } else {
                    const errText = await response.text();
                    lastError = `Status ${response.status}: ${errText}`;
                    if (server) server.log.warn(`OpenRouter Request Failed (Key ${i + 1}): ${lastError}`);
                    else console.warn(`OpenRouter Request Failed (Key ${i + 1}): ${lastError}`);

                    if (!errorsToRotate.includes(response.status)) {
                        // If it's a Bad Request or similar, shifting the key won't help
                        if (response.status === 400 || response.status === 404) {
                            throw new Error(`Unrecoverable error: ${lastError}`);
                        }
                    }
                }
            } catch (error: any) {
                lastError = error.message || String(error);
                if (server) server.log.error(`Fetch Error on Key ${i + 1}: ${lastError}`);
                else console.error(`Fetch Error on Key ${i + 1}: ${lastError}`);

                if (lastError.includes('Unrecoverable error')) {
                    throw error;
                }
            }
        }

        throw new Error(`OpenRouter all keys failed. Last error: ${lastError}`);
    }
}

export const openRouterService = new OpenRouterService();
