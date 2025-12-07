// server/src/domain/providers/OllamaProvider.ts
import { AIProvider } from './AIProvider';
import {
    ProviderStrategy,
    ModelInfo,
    ProviderCapabilities,
    ValidationResult,
    DependencyCheck
} from './ProviderStrategy';

/**
 * Ollama AI provider strategy
 * Implements the ProviderStrategy interface for local Ollama models
 */
export class OllamaProvider extends ProviderStrategy {
    getProviderType(): AIProvider {
        return AIProvider.OLLAMA;
    }

    async getModels(config: any): Promise<ModelInfo[]> {
        // Return common Ollama models
        // In production, this could query the local Ollama instance
        return [
            {
                id: 'llama3.1:8b',
                name: 'Llama 3.1 8B',
                contextWindow: 128000,
                costPer1kTokens: 0, // Local models are free
                supportsImages: false
            },
            {
                id: 'llama3.1:70b',
                name: 'Llama 3.1 70B',
                contextWindow: 128000,
                costPer1kTokens: 0,
                supportsImages: false
            },
            {
                id: 'llama3.2:3b',
                name: 'Llama 3.2 3B',
                contextWindow: 128000,
                costPer1kTokens: 0,
                supportsImages: false
            },
            {
                id: 'mistral:7b',
                name: 'Mistral 7B',
                contextWindow: 32000,
                costPer1kTokens: 0,
                supportsImages: false
            },
            {
                id: 'phi3:mini',
                name: 'Phi-3 Mini',
                contextWindow: 128000,
                costPer1kTokens: 0,
                supportsImages: false
            },
            {
                id: 'qwen2.5:7b',
                name: 'Qwen 2.5 7B',
                contextWindow: 128000,
                costPer1kTokens: 0,
                supportsImages: false
            }
        ];
    }

    validateConfig(config: any): ValidationResult {
        // Ollama is optional, always valid if base URL is set
        const baseUrl = this.getApiKey(config);

        if (!baseUrl) {
            return {
                valid: false,
                error: 'Ollama base URL not configured. Default: http://localhost:11434'
            };
        }

        return { valid: true };
    }

    getApiKey(config: any): string | null {
        // For Ollama, "API key" is actually the base URL
        const baseUrl = config?.integrations?.ollama?.baseUrl;

        if (baseUrl) {
            return baseUrl;
        }

        // Fallback to environment variable or default
        return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    }

    checkDependencies(): DependencyCheck {
        // Ollama doesn't require npm packages, just running server
        // We could check if Ollama is running, but that's optional
        return { installed: true };
    }

    supportsImageContext(modelName?: string): boolean {
        // Check if specific model supports images
        if (!modelName) return false;

        // Vision models in Ollama
        const visionModels = ['llava', 'bakllava', 'vision'];

        return visionModels.some(model => modelName.toLowerCase().includes(model));
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxTokens: 4096,
            supportsImages: false, // Most models don't support images
            supportsStreaming: true,
            rateLimitPerMinute: 1000, // Local, no limits
            costPer1kTokens: 0 // Free!
        };
    }

    getRateLimitDelay(): number {
        // No rate limiting for local models
        return 0;
    }
}
