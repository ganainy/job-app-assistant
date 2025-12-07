// server/src/domain/adapters/ModelAdapter.ts

/**
 * Abstract interface for AI model adapters
 * Translates between application interface and provider-specific APIs
 */
export interface ModelAdapter {
    /**
     * Generate content from a text prompt
     * @param prompt - The text prompt
     * @returns Generated text response
     */
    generateContent(prompt: string): Promise<string>;

    /**
     * Generate structured JSON response from a prompt
     * @param prompt - The text prompt
     * @returns Parsed JSON object
     */
    generateJSON<T = any>(prompt: string): Promise<T>;

    /**
     * Get the model name being used
     */
    getModelName(): string;

    /**
     * Get the provider type
     */
    getProvider(): string;
}

/**
 * Configuration for creating a model adapter
 */
export interface AdapterConfig {
    provider: string;
    apiKey: string;
    modelName: string;
    temperature?: number;
    maxTokens?: number;
}
