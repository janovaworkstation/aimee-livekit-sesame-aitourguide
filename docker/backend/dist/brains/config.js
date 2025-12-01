"use strict";
// Brain Configuration for AImee POC
// Defines the different AI brain tiers and their models
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrainForEnvironment = exports.getActiveBrain = exports.BRAIN_CONFIGS = exports.STANDARD_LLM_MODEL = void 0;
// Standard LLM Model as specified in Phase 2 requirements
exports.STANDARD_LLM_MODEL = 'llama-3.1-8b-instruct';
// Brain Configurations
exports.BRAIN_CONFIGS = {
    STANDARD: {
        name: 'Standard Brain',
        provider: 'standard',
        model: exports.STANDARD_LLM_MODEL,
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
const getActiveBrain = (tier = 'standard') => {
    switch (tier) {
        case 'premium':
            return exports.BRAIN_CONFIGS.PREMIUM;
        case 'offline':
            return exports.BRAIN_CONFIGS.OFFLINE;
        case 'standard':
        default:
            return exports.BRAIN_CONFIGS.STANDARD;
    }
};
exports.getActiveBrain = getActiveBrain;
// Environment-based brain selection
const getBrainForEnvironment = () => {
    const env = process.env.NODE_ENV || 'development';
    const openaiApiKey = process.env.OPENAI_API_KEY;
    // Use Premium brain if OpenAI API key is available
    if (openaiApiKey && openaiApiKey.trim() !== '') {
        return (0, exports.getActiveBrain)('premium');
    }
    // Fallback to standard brain
    return (0, exports.getActiveBrain)('standard');
};
exports.getBrainForEnvironment = getBrainForEnvironment;
exports.default = exports.BRAIN_CONFIGS;
