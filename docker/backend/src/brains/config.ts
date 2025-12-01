// Brain Configuration for AImee POC
// Defines the different AI brain tiers and their models

export interface BrainConfig {
  name: string;
  provider: 'standard' | 'premium' | 'offline';
  model: string;
  description: string;
  capabilities: string[];
}

// Standard LLM Model as specified in Phase 2 requirements
export const STANDARD_LLM_MODEL = 'llama-3.1-8b-instruct';

// Brain Configurations
export const BRAIN_CONFIGS: Record<string, BrainConfig> = {
  STANDARD: {
    name: 'Standard Brain',
    provider: 'standard',
    model: STANDARD_LLM_MODEL,
    description: 'Standard local LLM for basic interactions',
    capabilities: ['text_generation', 'basic_conversation']
  },

  PREMIUM: {
    name: 'Premium Brain',
    provider: 'premium',
    model: 'gpt-4o-realtime-preview',
    description: 'OpenAI Realtime API for advanced conversational AI',
    capabilities: ['text_generation', 'real_time_conversation', 'advanced_reasoning', 'function_calling']
  },

  OFFLINE: {
    name: 'Offline Brain',
    provider: 'offline',
    model: 'local-model',
    description: 'Offline model for privacy-focused interactions',
    capabilities: ['text_generation', 'offline_operation']
  }
};

// Active brain selection
export const getActiveBrain = (tier: 'standard' | 'premium' | 'offline' = 'standard'): BrainConfig => {
  switch (tier) {
    case 'premium':
      return BRAIN_CONFIGS.PREMIUM;
    case 'offline':
      return BRAIN_CONFIGS.OFFLINE;
    case 'standard':
    default:
      return BRAIN_CONFIGS.STANDARD;
  }
};

// Environment-based brain selection
export const getBrainForEnvironment = (): BrainConfig => {
  const env = process.env.NODE_ENV || 'development';
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // Use Premium brain if OpenAI API key is available
  if (openaiApiKey && openaiApiKey.trim() !== '') {
    return getActiveBrain('premium');
  }

  // Fallback to standard brain
  return getActiveBrain('standard');
};

export default BRAIN_CONFIGS;