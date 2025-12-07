// server/src/providers/openRouterProvider.ts
import { AIProvider } from './enums';
import { ProviderStrategy, ProviderCapabilities } from './base';
import { ModelAdapter } from '../adapters/base';
import { OpenRouterAdapter } from '../adapters/openRouterAdapter';
import Profile from '../models/Profile';
import { decrypt, isEncrypted } from '../utils/encryption';

/**
 * OpenRouter provider strategy
 */
export class OpenRouterProvider extends ProviderStrategy {
  constructor() {
    super(AIProvider.OPENROUTER);
  }

  getName(): string {
    return 'openrouter';
  }

  async getModels(userId: string): Promise<string[]> {
    const apiKey = await this.getApiKey(userId);
    
    // If no API key, return empty array - user must configure API key first
    if (!apiKey) {
      console.warn('OpenRouter API key not configured. User must add API key in Settings to load models.');
      return [];
    }

    try {
      // Fetch models from OpenRouter API
      const url = 'https://openrouter.ai/api/v1/models';
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorText}`);
        return [];
      }

      const data = await response.json();
      const modelsList = data.data || []; // OpenRouter uses "data" key

      if (modelsList.length === 0) {
        console.warn('No OpenRouter models found in API response');
        return [];
      }

      // Extract model IDs and sort
      const modelIds = modelsList
        .map((model: any) => model.id || model.name || '')
        .filter((id: string) => id.length > 0)
        .sort();

      return modelIds;
    } catch (error: any) {
      console.error('Error fetching OpenRouter models from API:', error);
      return [];
    }
  }

  getApiKeyName(): string {
    return 'OPENROUTER_API_KEY';
  }

  async validateConfig(userId: string): Promise<{ valid: boolean; error?: string }> {
    const apiKey = await this.getApiKey(userId);
    if (!apiKey) {
      return {
        valid: false,
        error: 'OPENROUTER_API_KEY is not set in configuration. Please add your OpenRouter API key in Settings.',
      };
    }
    return { valid: true };
  }

  async getApiKey(userId: string): Promise<string | null> {
    try {
      const profile = await Profile.findOne({ userId });
      const key = profile?.aiProviderSettings?.providers?.openrouter?.accessToken;
      if (key) {
        return isEncrypted(key) ? decrypt(key) : key;
      }
      return null;
    } catch (error) {
      console.error('Error getting OpenRouter API key:', error);
      return null;
    }
  }

  checkDependencies(): { installed: boolean; message?: string } {
    // OpenRouter uses fetch API which is available in Node 18+
    // No additional dependencies needed
    return { installed: true };
  }

  supportsImageContext(modelName?: string): boolean {
    // Some models support images, check model name
    if (!modelName) return false;
    return modelName.includes('vision') || 
           modelName.includes('gpt-4') || 
           modelName.includes('claude-3');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      xmlMaxLen: 200000,
      imageSupported: true, // Model-dependent
      imageMaxWidth: 640,
      payloadMaxSizeKb: 500,
      online: true,
    };
  }

  createModelAdapter(apiKey: string, modelName: string): ModelAdapter {
    return new OpenRouterAdapter(apiKey, modelName);
  }
}

// Register the provider
import { ProviderRegistry } from './registry';
ProviderRegistry.register(AIProvider.OPENROUTER, new OpenRouterProvider());

