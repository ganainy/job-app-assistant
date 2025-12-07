// server/src/utils/aiService.ts
import { ProviderRegistry } from '../providers/registry';
import { AIProvider, AIProviderHelper } from '../providers/enums';
import { ProviderStrategy } from '../providers/base';
import { ModelAdapter, GenerateContentOptions, GenerateContentResult } from '../adapters/base';
import Profile from '../models/Profile';
import { NotFoundError } from './errors/AppError';

/**
 * Get user's configured provider strategy with fallback chain
 */
export async function getProviderStrategy(userId: string): Promise<ProviderStrategy> {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new NotFoundError('User profile not found');
  }

  const aiProviderSettings = profile.aiProviderSettings;
  const defaultProvider = aiProviderSettings?.defaultProvider;

  // Fallback chain: default provider -> Gemini -> OpenRouter -> Ollama
  const providersToTry = [
    defaultProvider,
    'gemini',
    'openrouter',
    'ollama',
  ].filter(Boolean) as string[];

  for (const providerName of providersToTry) {
    const provider = AIProviderHelper.fromString(providerName);
    const strategy = ProviderRegistry.get(provider);
    
    if (!strategy) {
      continue;
    }

    // Check if provider is configured
    const apiKey = await strategy.getApiKey(userId);
    if (!apiKey) {
      continue;
    }

    // Validate configuration
    const validation = await strategy.validateConfig(userId);
    if (validation.valid) {
      return strategy;
    }
  }

  throw new NotFoundError(
    'No AI provider configured. Please add at least one AI provider API key in Settings. ' +
    'Supported providers: Gemini, OpenRouter, or Ollama.'
  );
}

/**
 * Get model adapter for user's configured provider
 */
export async function getModelAdapter(
  userId: string,
  modelName?: string
): Promise<ModelAdapter> {
  const strategy = await getProviderStrategy(userId);
  const apiKey = await strategy.getApiKey(userId);
  
  if (!apiKey) {
    throw new NotFoundError(`API key not found for provider: ${strategy.getName()}`);
  }

  // Get model name from user settings or use default
  if (!modelName) {
    const profile = await Profile.findOne({ userId });
    modelName = profile?.aiProviderSettings?.defaultModel;
    
    // If still no model, get first available model from provider
    if (!modelName) {
      const models = await strategy.getModels(userId);
      if (models.length === 0) {
        throw new NotFoundError(`No models available for provider: ${strategy.getName()}`);
      }
      modelName = models[0];
    }
  }

  return strategy.createModelAdapter(apiKey, modelName);
}

/**
 * Generate content using user's configured provider
 */
export async function generateContent(
  userId: string,
  prompt: string,
  options?: GenerateContentOptions
): Promise<GenerateContentResult> {
  const adapter = await getModelAdapter(userId);
  return adapter.generateContent(prompt, options);
}

/**
 * Generate content with file input using user's configured provider
 */
export async function generateContentWithFile(
  userId: string,
  prompt: string,
  filePath: string,
  mimeType: string,
  options?: GenerateContentOptions
): Promise<GenerateContentResult> {
  const adapter = await getModelAdapter(userId);
  return adapter.generateContentWithFile(prompt, filePath, mimeType, options);
}

/**
 * Generate structured JSON response using user's configured provider
 */
export async function generateStructuredResponse<T>(
  userId: string,
  prompt: string,
  options?: GenerateContentOptions
): Promise<T> {
  const adapter = await getModelAdapter(userId);
  return adapter.generateStructuredResponse<T>(prompt, options);
}

/**
 * Get available models for user's configured provider
 */
export async function getAvailableModels(userId: string): Promise<string[]> {
  const strategy = await getProviderStrategy(userId);
  return strategy.getModels(userId);
}

/**
 * Check if user's configured provider supports image context
 */
export async function supportsImageContext(userId: string, modelName?: string): Promise<boolean> {
  const strategy = await getProviderStrategy(userId);
  return strategy.supportsImageContext(modelName);
}

/**
 * Get provider capabilities
 */
export async function getProviderCapabilities(userId: string) {
  const strategy = await getProviderStrategy(userId);
  return strategy.getCapabilities();
}

