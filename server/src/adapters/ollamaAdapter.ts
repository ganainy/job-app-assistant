// server/src/adapters/ollamaAdapter.ts
import { ModelAdapter, GenerateContentOptions, GenerateContentResult } from './base';

/**
 * Parse JSON response from AI text output
 */
function parseJsonResponse<T>(responseText: string): T {
  const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
  const jsonMatch = responseText.match(jsonRegex);
  if (jsonMatch && jsonMatch[1]) {
    const extractedJsonString = jsonMatch[1].trim();
    try {
      return JSON.parse(extractedJsonString) as T;
    } catch (e: any) {
      console.error('JSON.parse failed on extracted content:', e.message);
      throw new Error(`AI response was not valid JSON. Parse error: ${e.message}`);
    }
  }
  
  // Try to extract JSON from plain text (fallback)
  const startIndex = responseText.indexOf('{');
  const endIndex = responseText.lastIndexOf('}');
  if (startIndex !== -1 && endIndex !== -1) {
    const cleanedText = responseText.substring(startIndex, endIndex + 1);
    try {
      return JSON.parse(cleanedText) as T;
    } catch {
      throw new Error('AI failed to return data in the expected JSON format.');
    }
  }
  
  throw new Error('AI failed to return data in the expected JSON format.');
}

/**
 * Ollama model adapter
 */
export class OllamaAdapter extends ModelAdapter {
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl: string, modelName: string = 'llama2') {
    super();
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.modelName = modelName;
  }

  async generateContent(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.modelName,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            top_p: options?.topP,
            top_k: options?.topK,
            num_predict: options?.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const text = data.response || '';
      
      if (!text) {
        throw new Error('No content generated from Ollama');
      }

      // Ollama doesn't provide detailed usage info in the same format
      const usage = data.eval_count || data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      } : undefined;

      return { text, usage };
    } catch (error: any) {
      console.error('Error during Ollama content generation:', error);
      throw new Error(`Failed to generate content: ${error.message || error}`);
    }
  }

  async generateContentWithFile(
    prompt: string,
    filePath: string,
    mimeType: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult> {
    // Ollama's vision models can handle images, but we need to convert to base64
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString('base64');

    try {
      // Use vision-capable model if available (e.g., llava)
      const visionModel = this.modelName.includes('llava') || this.modelName.includes('vision')
        ? this.modelName
        : 'llava'; // Default to llava for vision

      // Ollama vision API uses a different endpoint
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: visionModel,
          prompt: `${prompt}\n\n[Image: ${base64File}]`,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7,
            num_predict: options?.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const text = data.response || '';
      
      if (!text) {
        throw new Error('No content generated from Ollama');
      }

      const usage = data.eval_count || data.prompt_eval_count ? {
        promptTokens: data.prompt_eval_count,
        completionTokens: data.eval_count,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      } : undefined;

      return { text, usage };
    } catch (error: any) {
      console.error('Error during Ollama file content generation:', error);
      throw new Error(`Failed to generate content from file: ${error.message || error}`);
    }
  }

  async generateStructuredResponse<T>(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<T> {
    const jsonPrompt = `${prompt}\n\nIMPORTANT: Your response MUST be a valid JSON object wrapped in triple backticks (\`\`\`json). Do not include any additional text outside the JSON block.`;
    
    const result = await this.generateContent(jsonPrompt, options);
    return parseJsonResponse<T>(result.text);
  }

  getModelInfo() {
    return {
      provider: 'ollama',
      modelName: this.modelName,
      capabilities: {
        imageSupport: this.modelName.includes('llava') || this.modelName.includes('vision'),
        maxTokens: 4096, // Ollama default
      },
    };
  }
}

