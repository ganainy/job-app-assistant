// server/src/providers/registry.ts
import { AIProvider, AIProviderHelper } from './enums';
import { ProviderStrategy } from './base';

/**
 * Registry for managing AI provider strategies
 */
export class ProviderRegistry {
  private static providers: Map<AIProvider, ProviderStrategy> = new Map();
  private static initialized = false;

  /**
   * Initialize the registry with default providers
   */
  private static initialize(): void {
    if (this.initialized) {
      return;
    }

    // Import providers dynamically to avoid circular dependencies
    // They will be registered when imported
    this.initialized = true;
  }

  /**
   * Register a provider strategy
   */
  static register(provider: AIProvider, strategy: ProviderStrategy): void {
    this.providers.set(provider, strategy);
  }

  /**
   * Get a provider strategy by enum value
   */
  static get(provider: AIProvider): ProviderStrategy | null {
    this.initialize();
    return this.providers.get(provider) || null;
  }

  /**
   * Get a provider strategy by name string
   */
  static getByName(providerName: string): ProviderStrategy | null {
    try {
      const provider = AIProviderHelper.fromString(providerName);
      return this.get(provider);
    } catch {
      return null;
    }
  }

  /**
   * Get all registered provider names
   */
  static getAllNames(): string[] {
    this.initialize();
    return Array.from(this.providers.keys()).map(p => p.toString());
  }

  /**
   * Check if a provider is registered
   */
  static has(provider: AIProvider): boolean {
    this.initialize();
    return this.providers.has(provider);
  }
}

