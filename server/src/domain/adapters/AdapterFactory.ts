// server/src/domain/adapters/AdapterFactory.ts
import { ModelAdapter, AdapterConfig } from './ModelAdapter';
import { GeminiAdapter } from './GeminiAdapter';
import { OpenRouterAdapter } from './OpenRouterAdapter';
import { AIProvider } from '../providers/AIProvider';

/**
 * Factory for creating model adapters
 * Centralizes adapter creation logic
 */
export class AdapterFactory {
    /**
     * Create a model adapter based on provider and configuration
     * @param config - Adapter configuration
     * @returns ModelAdapter instance
     */
    static create(config: AdapterConfig): ModelAdapter {
        const { provider, apiKey, modelName, temperature, maxTokens } = config;

        switch (provider) {
            case AIProvider.GEMINI:
                return new GeminiAdapter(apiKey, modelName, temperature, maxTokens);

            case AIProvider.OPENROUTER:
                return new OpenRouterAdapter(apiKey, modelName, temperature, maxTokens);

            case AIProvider.OLLAMA:
                // TODO: Implement OllamaAdapter when needed
                throw new Error('Ollama adapter not yet implemented');

            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }

    /**
     * Create adapter with fallback to Gemini if primary fails
     * @param primaryConfig - Primary adapter configuration
     * @param fallbackApiKey - Gemini API key for fallback
     * @returns ModelAdapter instance
     */
    static createWithFallback(
        primaryConfig: AdapterConfig,
        fallbackApiKey: string
    ): ModelAdapter {
        try {
            return this.create(primaryConfig);
        } catch (error) {
            console.warn(`Failed to create ${primaryConfig.provider} adapter, falling back to Gemini:`, error);
            return new GeminiAdapter(
                fallbackApiKey,
                'gemini-1.5-flash',
                primaryConfig.temperature,
                primaryConfig.maxTokens
            );
        }
    }
}
