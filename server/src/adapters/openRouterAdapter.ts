// server/src/adapters/openRouterAdapter.ts
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
 * OpenRouter model adapter (OpenAI-compatible API)
 */
export class OpenRouterAdapter extends ModelAdapter {
  private apiKey: string;
  private modelName: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string, modelName: string = 'openai/gpt-4o-mini') {
    super();
    this.apiKey = apiKey;
    this.modelName = modelName;
  }

  async generateContent(
    prompt: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vibehired.ai',
          'X-Title': 'VibeHired AI',
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      if (!text) {
        throw new Error('No content generated from OpenRouter');
      }

      const usage = data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined;

      return { text, usage };
    } catch (error: any) {
      console.error('Error during OpenRouter content generation:', error);
      throw new Error(`Failed to generate content: ${error.message || error}`);
    }
  }

  async generateContentWithFile(
    prompt: string,
    filePath: string,
    mimeType: string,
    options?: GenerateContentOptions
  ): Promise<GenerateContentResult> {
    // OpenRouter supports vision models, but file handling needs to be done via base64
    // For now, we'll read the file and include it in the message
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(filePath);
    const base64File = fileBuffer.toString('base64');

    try {
      // Use vision-capable model if available
      const visionModel = this.modelName.includes('vision') || this.modelName.includes('gpt-4')
        ? this.modelName
        : 'openai/gpt-4o'; // Default to vision-capable model

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vibehired.ai',
          'X-Title': 'VibeHired AI',
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64File}`,
                  },
                },
              ],
            },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';
      
      if (!text) {
        throw new Error('No content generated from OpenRouter');
      }

      const usage = data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined;

      return { text, usage };
    } catch (error: any) {
      console.error('Error during OpenRouter file content generation:', error);
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
      provider: 'openrouter',
      modelName: this.modelName,
      capabilities: {
        imageSupport: this.modelName.includes('vision') || this.modelName.includes('gpt-4'),
        maxTokens: 8192,
      },
    };
  }
}

