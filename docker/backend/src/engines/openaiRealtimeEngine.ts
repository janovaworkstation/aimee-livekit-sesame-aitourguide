// OpenAI Engine for AImee POC Phase 2
// Text-based testing implementation using OpenAI Chat Completions API
//
// NOTE: This implementation uses OpenAI Chat Completions API (text-based LLM).
// We are NOT using the OpenAI Realtime STS API yet.
// Architecture: HTTP Request → Text LLM → Text Response

import OpenAI from 'openai';
import { getBrainForEnvironment } from '../brains/config';
import { getDefaultLLMModel, getTTSModel, getRealtimeModel } from '../config/openaiModelConfig';

export interface RealtimeTestRequest {
  message: string;
  instructions?: string;
}

export interface RealtimeTestResponse {
  success: boolean;
  response?: string;
  error?: string;
  sessionId?: string;
}

export class OpenAIRealtimeEngine {
  private openai: OpenAI | null = null;

  constructor() {
    // Don't initialize OpenAI client immediately - wait for first request
    // This allows the server to start even without an API key
  }

  private initializeOpenAI(): void {
    if (this.openai) return; // Already initialized

    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: apiKey
    });
  }

  /**
   * Test OpenAI with text-based interaction using Chat Completions API
   * Note: This uses the standard Chat Completions API as the Realtime WebSocket API
   * implementation differs in the current SDK version
   */
  async testTextInteraction(request: RealtimeTestRequest): Promise<RealtimeTestResponse> {
    const brain = getBrainForEnvironment();

    if (brain.provider !== 'premium') {
      return {
        success: false,
        error: 'Premium brain (OpenAI) not configured. Check OPENAI_API_KEY environment variable.'
      };
    }

    try {
      // Initialize OpenAI client on first use
      this.initializeOpenAI();

      if (!this.openai) {
        return {
          success: false,
          error: 'OpenAI client initialization failed'
        };
      }

      console.log('OpenAI: Processing text interaction request');
      console.log(`OpenAI Models - LLM (ACTIVE): ${getDefaultLLMModel()}, TTS (RESERVED): ${getTTSModel()}, Realtime (RESERVED): ${getRealtimeModel()}`);

      const systemMessage = request.instructions ||
        'You are a helpful AI assistant for the AImee POC. Provide concise and helpful responses. This is a test of the OpenAI integration for Phase 2.';

      const completion = await this.openai.chat.completions.create({
        model: getDefaultLLMModel(), // Centralized LLM model configuration
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: request.message
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        return {
          success: false,
          error: 'No response received from OpenAI API'
        };
      }

      console.log('OpenAI: Text interaction successful, response length:', response.length);

      return {
        success: true,
        response: response.trim(),
        sessionId: completion.id // Use completion ID as session identifier
      };

    } catch (error: any) {
      console.error('OpenAI: Error during text interaction', error);

      return {
        success: false,
        error: `OpenAI API error: ${error.message || 'Unknown error'}`,
      };
    }
  }

  /**
   * Check if OpenAI is properly configured
   */
  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY?.trim();
  }

  /**
   * Get current configuration status
   */
  getStatus() {
    return {
      configured: this.isConfigured(),
      brain: getBrainForEnvironment(),
      hasApiKey: !!process.env.OPENAI_API_KEY
    };
  }

  /**
   * Test connection to OpenAI API
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      this.initializeOpenAI();

      if (!this.openai) {
        return {
          success: false,
          error: 'OpenAI client not initialized'
        };
      }

      const models = await this.openai.models.list();
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown connection error'
      };
    }
  }
}

// Singleton instance for the engine
export const openaiRealtimeEngine = new OpenAIRealtimeEngine();

// Helper function for easy testing
export async function testOpenAIRealtime(message: string, instructions?: string): Promise<RealtimeTestResponse> {
  try {
    return await openaiRealtimeEngine.testTextInteraction({ message, instructions });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}