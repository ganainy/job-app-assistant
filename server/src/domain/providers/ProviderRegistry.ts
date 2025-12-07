// server/src/domain/providers/ProviderRegistry.ts
import { AIProvider } from './AIProvider';
import { ProviderStrategy } from './ProviderStrategy';

/**
 * Registry for managing AI provider strategies
 * Implements the Registry pattern for provider management
 */
export class ProviderRegistry {
    private static providers: Map<AIProvider, ProviderStrategy> = new Map();

    /**
     * Register a provider strategy
     * @param provider - Provider type
     * @param strategy - Provider strategy implementation
     */
    static register(provider: AIProvider, strategy: ProviderStrategy): void {
        this.providers.set(provider, strategy);
    }

    /**
     * Get a provider strategy by type
     * @param provider - Provider type
     * @returns Provider strategy or undefined if not found
     */
    static get(provider: AIProvider): ProviderStrategy | undefined {
        return this.providers.get(provider);
    }

    /**
     * Get a provider strategy by name (string)
     * @param providerName - Provider name as string
     * @returns Provider strategy or undefined if not found
     */
    static getByName(providerName: string): ProviderStrategy | undefined {
        const provider = Object.values(AIProvider).find(p => p === providerName);
        if (!provider) {
            return undefined;
        }
        return this.providers.get(provider);
    }

    /**
     * Check if a provider is registered
     * @param provider - Provider type
     */
    static has(provider: AIProvider): boolean {
        return this.providers.has(provider);
    }

    /**
     * Get all registered providers
     */
    static getAll(): Map<AIProvider, ProviderStrategy> {
        return new Map(this.providers);
    }

    /**
     * Clear all registered providers (useful for testing)
     */
    static clear(): void {
        this.providers.clear();
    }
}
