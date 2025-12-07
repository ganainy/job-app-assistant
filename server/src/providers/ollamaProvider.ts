// server/src/providers/ollamaProvider.ts
import { AIProvider } from './enums';
import { ProviderStrategy, ProviderCapabilities } from './base';
import { ModelAdapter } from '../adapters/base';
import { OllamaAdapter } from '../adapters/ollamaAdapter';
import Profile from '../models/Profile';
import { decrypt, isEncrypted } from '../utils/encryption';

/**
 * Ollama provider strategy
 */
export class OllamaProvider extends ProviderStrategy {
  constructor() {
    super(AIProvider.OLLAMA);
  }

  getName(): string {
    return 'ollama';
  }

  async getModels(userId: string): Promise<string[]> {
    const baseUrl = await this.getApiKey(userId);
    
    // For Ollama, we use default localhost if not set, but still try to connect
    const effectiveUrl = baseUrl || 'http://localhost:11434';

    try {
      // Fetch models from Ollama API
      const url = `${effectiveUrl}/api/tags`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        console.error(`Ollama API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const modelsList = data.models || [];

      if (modelsList.length === 0) {
        console.warn('No Ollama models found. User may need to install models first (e.g., ollama pull llama3)');
        return [];
      }

      // Extract model names and sort
      const modelNames = modelsList
        .map((m: any) => m.name || m.model || '')
        .filter((name: string) => name.length > 0)
        .sort();

      return modelNames;
    } catch (error: any) {
      // Handle timeout and connection errors
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.error(`Ollama connection timeout at ${effectiveUrl}. Ensure Ollama is running.`);
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        console.error(`Cannot connect to Ollama at ${effectiveUrl}. Ensure Ollama service is running.`);
      } else {
        console.error('Error fetching Ollama models:', error);
      }
      return [];
    }
  }

  getApiKeyName(): string {
    return 'OLLAMA_BASE_URL';
  }

  async validateConfig(userId: string): Promise<{ valid: boolean; error?: string }> {
    const baseUrl = await this.getApiKey(userId);
    if (!baseUrl) {
      return {
        valid: false,
        error: 'OLLAMA_BASE_URL is not set in configuration. Please add your Ollama base URL in Settings (default: http://localhost:11434).',
      };
    }

    // Validate URL format
    try {
      new URL(baseUrl);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid Ollama base URL format: ${baseUrl}`,
      };
    }

    // Try to ping Ollama
    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (!response.ok) {
        return {
          valid: false,
          error: `Cannot connect to Ollama at ${baseUrl}. Please ensure Ollama is running.`,
        };
      }
    } catch (error: any) {
      return {
        valid: false,
        error: `Cannot connect to Ollama at ${baseUrl}: ${error.message}`,
      };
    }

    return { valid: true };
  }

  async getApiKey(userId: string): Promise<string | null> {
    try {
      const profile = await Profile.findOne({ userId });
      const baseUrl = profile?.aiProviderSettings?.providers?.ollama?.baseUrl;
      if (baseUrl) {
        // Decrypt if encrypted
        return isEncrypted(baseUrl) ? decrypt(baseUrl) : baseUrl;
      }
      return 'http://localhost:11434'; // Default
    } catch (error) {
      console.error('Error getting Ollama base URL:', error);
      return 'http://localhost:11434'; // Default fallback
    }
  }

  checkDependencies(): { installed: boolean; message?: string } {
    // Ollama uses fetch API which is available in Node 18+
    // No additional dependencies needed
    return { installed: true };
  }

  supportsImageContext(modelName?: string): boolean {
    // Ollama vision models support images
    if (!modelName) return false;
    return modelName.includes('llava') || modelName.includes('vision');
  }

  getCapabilities(): ProviderCapabilities {
    return {
      xmlMaxLen: 200000,
      imageSupported: true, // Model-dependent
      imageMaxWidth: 640,
      payloadMaxSizeKb: undefined, // No strict limits
      online: false, // Local
    };
  }

  createModelAdapter(apiKey: string, modelName: string): ModelAdapter {
    return new OllamaAdapter(apiKey, modelName);
  }
}

// Register the provider
import { ProviderRegistry } from './registry';
ProviderRegistry.register(AIProvider.OLLAMA, new OllamaProvider());

