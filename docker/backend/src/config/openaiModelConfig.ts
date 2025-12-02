/**
 * AImee OpenAI Model Configuration
 *
 * Centralized configuration for OpenAI model selection across the AImee backend.
 * This ensures consistent model usage and makes it easy to switch models via environment variables.
 *
 * PHASE 8 - THREE MODEL ARCHITECTURE:
 * - LLM Model: Used TODAY for text-based Chat Completions (currently gpt-4o-mini)
 * - TTS Model: RESERVED for future GPT-4o-TTS integration (currently not used)
 * - Realtime Model: RESERVED for future OpenAI Realtime STS API (currently not used)
 *
 * Current behavior: Standard Chat Completions API
 * Future behavior: Direct GPT-4o-TTS or Realtime STS models with minimal code changes
 */

/**
 * Get the OpenAI LLM model for text completions.
 *
 * This model is ACTIVELY USED for Chat Completions API in the current backend.
 *
 * @returns Model name, defaults to 'gpt-4o-mini' if OPENAI_MODEL env var not set
 */
export function getDefaultLLMModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/**
 * Get the OpenAI TTS model for voice synthesis.
 *
 * RESERVED FOR FUTURE USE: This model will be used when we upgrade to
 * direct GPT-4o-TTS integration. Currently not actively used.
 *
 * @returns Model name, defaults to 'gpt-4o-tts' if OPENAI_TTS_MODEL env var not set
 */
export function getTTSModel(): string {
  return process.env.OPENAI_TTS_MODEL || "gpt-4o-tts";
}

/**
 * Get the OpenAI Realtime model for speech-to-speech conversation.
 *
 * RESERVED FOR FUTURE USE: This model will be used when we upgrade to
 * OpenAI Realtime STS API. Currently not used.
 *
 * @returns Model name, defaults to 'gpt-4o-realtime-preview-2024-10-01' if env var not set
 */
export function getRealtimeModel(): string {
  return process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview-2024-10-01";
}

// Legacy function for backward compatibility
export function getDefaultModel(): string {
  return getDefaultLLMModel();
}

/**
 * Get complete model configuration for the AImee backend.
 *
 * @returns Configuration object with all model settings
 */
export function getModelConfig() {
  const llmModel = getDefaultLLMModel();
  const ttsModel = getTTSModel();
  const realtimeModel = getRealtimeModel();

  return {
    llmModel,
    ttsModel,
    realtimeModel,
    temperature: 0.7,
    maxTokens: 500,
    description: {
      llm: `ACTIVE: ${llmModel} for Chat Completions API`,
      tts: `RESERVED: ${ttsModel} for future GPT-4o-TTS integration`,
      realtime: `RESERVED: ${realtimeModel} for future Realtime STS integration`
    }
  } as const;
}

/**
 * Model configuration interface for type safety
 */
export interface OpenAIModelConfig {
  llmModel: string;
  ttsModel: string;
  realtimeModel: string;
  temperature: number;
  maxTokens: number;
  description: {
    llm: string;
    tts: string;
    realtime: string;
  };
}