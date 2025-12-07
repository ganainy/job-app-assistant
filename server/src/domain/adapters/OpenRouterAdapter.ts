// server/src/domain/adapters/OpenRouterAdapter.ts
import OpenAI from 'openai';
import { ModelAdapter } from './ModelAdapter';

/**
 * OpenRouter model adapter
 * Implements ModelAdapter for OpenRouter (uses OpenAI SDK)
 */
export class OpenRouterAdapter implements ModelAdapter {
    private client: OpenAI;
    private modelName: string;
    private temperature: number;
    private maxTokens: number;

    constructor(apiKey: string, modelName: string, temperature: number = 0.7, maxTokens: number = 8192) {
        this.client = new OpenAI({
            baseURL: 'https://openrouter.ai/api/v1',
            apiKey: apiKey,
            defaultHeaders: {
                'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
                'X-Title': 'Job App Assistant'
            }
        });
        this.modelName = modelName;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    async generateContent(prompt: string): Promise<string> {
        const completion = await this.client.chat.completions.create({
            model: this.modelName,
            messages: [
                { role: 'user', content: prompt }
            ],
            temperature: this.temperature,
            max_tokens: this.maxTokens,
        });

        return completion.choices[0]?.message?.content || '';
    }

    async generateJSON<T = any>(prompt: string): Promise<T> {
        const responseText = await this.generateContent(prompt);

        // Clean up response (remove markdown code blocks if present)
        let jsonText = responseText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        return JSON.parse(jsonText);
    }

    getModelName(): string {
        return this.modelName;
    }

    getProvider(): string {
        return 'openrouter';
    }
}
