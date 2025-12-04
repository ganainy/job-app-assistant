// server/src/adapters/base.ts

export interface GenerateContentOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
}

export interface GenerateContentResult {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Abstract base class for AI model adapters
 */
export abstract class ModelAdapter {
  /**
   * Generate content from a text prompt
   */
  abstract generateContent(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult>;

  /**
   * Generate content from a prompt with file input
   */
  abstract generateContentWithFile(
    prompt: string,
    filePath: string,
    mimeType: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult>;

  /**
   * Generate a structured JSON response from a prompt
   */
  abstract generateStructuredResponse<T>(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<T>;

  /**
   * Get information about the model
   */
  abstract getModelInfo(): {
    provider: string;
    modelName: string;
    capabilities: {
      imageSupport: boolean;
      maxTokens?: number;
    };
  };
}

