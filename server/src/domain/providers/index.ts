// server/src/domain/providers/index.ts

/**
 * Provider module exports
 * Central export point for all provider-related classes and types
 */

export { AIProvider, isValidProvider, getProvider } from './AIProvider';
export {
    ProviderStrategy,
    ModelInfo,
    ProviderCapabilities,
    ValidationResult,
    DependencyCheck
} from './ProviderStrategy';
export { ProviderRegistry } from './ProviderRegistry';
export { GeminiProvider } from './GeminiProvider';
export { OpenRouterProvider } from './OpenRouterProvider';
export { OllamaProvider } from './OllamaProvider';

/**
 * Initialize and register all providers
 * Call this function once at application startup
 */
export function initializeProviders(): void {
    const { ProviderRegistry } = require('./ProviderRegistry');
    const { AIProvider } = require('./AIProvider');
    const { GeminiProvider } = require('./GeminiProvider');
    const { OpenRouterProvider } = require('./OpenRouterProvider');
    const { OllamaProvider } = require('./OllamaProvider');

    // Register all providers
    ProviderRegistry.register(AIProvider.GEMINI, new GeminiProvider());
    ProviderRegistry.register(AIProvider.OPENROUTER, new OpenRouterProvider());
    ProviderRegistry.register(AIProvider.OLLAMA, new OllamaProvider());

    console.log('✓ AI Providers initialized: Gemini, OpenRouter, Ollama');
}
