// server/src/domain/adapters/GeminiAdapter.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ModelAdapter } from './ModelAdapter';

/**
 * Gemini model adapter
 * Implements ModelAdapter for Google Gemini models
 */
export class GeminiAdapter implements ModelAdapter {
    private genAI: GoogleGenerativeAI;
    private modelName: string;
    private temperature: number;
    private maxTokens: number;

    constructor(apiKey: string, modelName: string, temperature: number = 0.7, maxTokens: number = 8192) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
        this.temperature = temperature;
        this.maxTokens = maxTokens;
    }

    async generateContent(prompt: string): Promise<string> {
        const model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: {
                temperature: this.temperature,
                maxOutputTokens: this.maxTokens,
            }
        });

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text();
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
        return 'gemini';
    }
}
