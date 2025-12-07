// server/src/domain/providers/OpenRouterProvider.ts
import { AIProvider } from './AIProvider';
import {
    ProviderStrategy,
    ModelInfo,
    ProviderCapabilities,
    ValidationResult,
    DependencyCheck
} from './ProviderStrategy';
import { decrypt } from '../../utils/encryption';

/**
 * OpenRouter AI provider strategy
 * Implements the ProviderStrategy interface for OpenRouter (multi-model access)
 */
export class OpenRouterProvider extends ProviderStrategy {
    getProviderType(): AIProvider {
        return AIProvider.OPENROUTER;
    }

    async getModels(config: any): Promise<ModelInfo[]> {
        // Return curated list of recommended models for job processing
        // These are optimized for different task types (fast, balanced, quality)
        return [
            // Fast models (for analysis)
            {
                id: 'google/gemini-flash-1.5',
                name: 'Gemini Flash 1.5',
                contextWindow: 1000000,
                costPer1kTokens: 0.00025,
                supportsImages: true
            },
            {
                id: 'meta-llama/llama-3.1-8b-instruct',
                name: 'Llama 3.1 8B',
                contextWindow: 128000,
                costPer1kTokens: 0.00006,
                supportsImages: false
            },
            // Balanced models (for relevance checking)
            {
                id: 'anthropic/claude-3-haiku',
                name: 'Claude 3 Haiku',
                contextWindow: 200000,
                costPer1kTokens: 0.00025,
                supportsImages: true
            },
            {
                id: 'google/gemini-pro-1.5',
                name: 'Gemini Pro 1.5',
                contextWindow: 2000000,
                costPer1kTokens: 0.00125,
                supportsImages: true
            },
            {
                id: 'meta-llama/llama-3.1-70b-instruct',
                name: 'Llama 3.1 70B',
                contextWindow: 128000,
                costPer1kTokens: 0.00052,
                supportsImages: false
            },
            // Premium models (for content generation)
            {
                id: 'anthropic/claude-3.5-sonnet',
                name: 'Claude 3.5 Sonnet',
                contextWindow: 200000,
                costPer1kTokens: 0.003,
                supportsImages: true
            },
            {
                id: 'openai/gpt-4o',
                name: 'GPT-4o',
                contextWindow: 128000,
                costPer1kTokens: 0.0025,
                supportsImages: true
            },
            {
                id: 'openai/gpt-4o-mini',
                name: 'GPT-4o Mini',
                contextWindow: 128000,
                costPer1kTokens: 0.00015,
                supportsImages: true
            }
        ];
    }

    validateConfig(config: any): ValidationResult {
        const apiKey = this.getApiKey(config);

        if (!apiKey) {
            return {
                valid: false,
                error: 'OpenRouter API key not configured. Please add your API key in Settings.'
            };
        }

        // Basic validation: OpenRouter keys start with "sk-or-v1-"
        if (!apiKey.startsWith('sk-or-v1-')) {
            return {
                valid: false,
                error: 'Invalid OpenRouter API key format. Key should start with "sk-or-v1-".'
            };
        }

        return { valid: true };
    }

    getApiKey(config: any): string | null {
        // Try to get from user's profile integrations
        const encryptedKey = config?.integrations?.openRouter?.accessToken;

        if (encryptedKey) {
            const decryptedKey = decrypt(encryptedKey);
            if (decryptedKey) {
                return decryptedKey;
            }
        }

        // Fallback to environment variable
        return process.env.OPENROUTER_API_KEY || null;
    }

    checkDependencies(): DependencyCheck {
        // OpenRouter uses OpenAI SDK
        try {
            require('openai');
            return { installed: true };
        } catch {
            return {
                installed: false,
                message: 'Please install openai SDK: npm install openai'
            };
        }
    }

    supportsImageContext(modelName?: string): boolean {
        // Check if specific model supports images
        if (!modelName) return false;

        const imageModels = [
            'gemini-flash',
            'gemini-pro',
            'claude',
            'gpt-4o',
            'gpt-4-vision'
        ];

        return imageModels.some(model => modelName.toLowerCase().includes(model));
    }

    getCapabilities(): ProviderCapabilities {
        return {
            maxTokens: 128000, // Conservative default
            supportsImages: true, // Many models support images
            supportsStreaming: true,
            rateLimitPerMinute: 200, // OpenRouter has generous limits
            costPer1kTokens: 0.0005 // Average cost
        };
    }

    getRateLimitDelay(): number {
        // 200 requests per minute = 0.3 seconds between requests
        // Very minimal delay needed
        return 500; // 0.5 seconds for safety
    }
}
