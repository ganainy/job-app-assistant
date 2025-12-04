// server/src/providers/base.ts
import { AIProvider } from './enums';
import { ModelAdapter } from '../adapters/base';

export interface ProviderCapabilities {
  xmlMaxLen?: number;
  imageSupported: boolean;
  imageMaxWidth?: number;
  payloadMaxSizeKb?: number;
  online: boolean;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  enabled: boolean;
}

/**
 * Abstract base class for AI provider strategies
 */
export abstract class ProviderStrategy {
  constructor(protected provider: AIProvider) {}

  /**
   * Return the provider name as a string
   */
  abstract getName(): string;

  /**
   * Get the list of available models for this provider
   */
  abstract getModels(userId: string): Promise<string[]>;

  /**
   * Get the configuration key name for the API key/URL
   */
  abstract getApiKeyName(): string;

  /**
   * Validate that the provider configuration is correct
   */
  abstract validateConfig(userId: string): Promise<{ valid: boolean; error?: string }>;

  /**
   * Get the API key or base URL for this provider
   */
  abstract getApiKey(userId: string): Promise<string | null>;

  /**
   * Check if required dependencies are installed for this provider
   */
  abstract checkDependencies(): { installed: boolean; message?: string };

  /**
   * Check if the provider/model supports image context
   */
  abstract supportsImageContext(modelName?: string): boolean;

  /**
   * Get provider-specific capabilities and limits
   */
  abstract getCapabilities(): ProviderCapabilities;

  /**
   * Create a model adapter instance for this provider
   */
  abstract createModelAdapter(apiKey: string, modelName: string): ModelAdapter;

  /**
   * Get the provider enum value
   */
  getProvider(): AIProvider {
    return this.provider;
  }
}

