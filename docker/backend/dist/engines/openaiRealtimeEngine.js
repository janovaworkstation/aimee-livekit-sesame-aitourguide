"use strict";
// OpenAI Engine for AImee POC Phase 2
// Text-based testing implementation using OpenAI Chat Completions API
//
// NOTE: This implementation uses OpenAI Chat Completions API (text-based LLM).
// We are NOT using the OpenAI Realtime STS API yet.
// Architecture: HTTP Request → Text LLM → Text Response
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiRealtimeEngine = exports.OpenAIRealtimeEngine = void 0;
exports.testOpenAIRealtime = testOpenAIRealtime;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../brains/config");
const openaiModelConfig_1 = require("../config/openaiModelConfig");
class OpenAIRealtimeEngine {
    constructor() {
        this.openai = null;
        // Don't initialize OpenAI client immediately - wait for first request
        // This allows the server to start even without an API key
    }
    initializeOpenAI() {
        if (this.openai)
            return; // Already initialized
        const apiKey = process.env.OPENAI_API_KEY || '';
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        this.openai = new openai_1.default({
            apiKey: apiKey
        });
    }
    /**
     * Test OpenAI with text-based interaction using Chat Completions API
     * Note: This uses the standard Chat Completions API as the Realtime WebSocket API
     * implementation differs in the current SDK version
     */
    async testTextInteraction(request) {
        const brain = (0, config_1.getBrainForEnvironment)();
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
            console.log(`OpenAI Models - LLM (ACTIVE): ${(0, openaiModelConfig_1.getDefaultLLMModel)()}, TTS (RESERVED): ${(0, openaiModelConfig_1.getTTSModel)()}, Realtime (RESERVED): ${(0, openaiModelConfig_1.getRealtimeModel)()}`);
            const systemMessage = request.instructions ||
                'You are a helpful AI assistant for the AImee POC. Provide concise and helpful responses. This is a test of the OpenAI integration for Phase 2.';
            const completion = await this.openai.chat.completions.create({
                model: (0, openaiModelConfig_1.getDefaultLLMModel)(), // Centralized LLM model configuration
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
        }
        catch (error) {
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
    isConfigured() {
        return !!process.env.OPENAI_API_KEY?.trim();
    }
    /**
     * Get current configuration status
     */
    getStatus() {
        return {
            configured: this.isConfigured(),
            brain: (0, config_1.getBrainForEnvironment)(),
            hasApiKey: !!process.env.OPENAI_API_KEY
        };
    }
    /**
     * Test connection to OpenAI API
     */
    async testConnection() {
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
        }
        catch (error) {
            return {
                success: false,
                error: error.message || 'Unknown connection error'
            };
        }
    }
}
exports.OpenAIRealtimeEngine = OpenAIRealtimeEngine;
// Singleton instance for the engine
exports.openaiRealtimeEngine = new OpenAIRealtimeEngine();
// Helper function for easy testing
async function testOpenAIRealtime(message, instructions) {
    try {
        return await exports.openaiRealtimeEngine.testTextInteraction({ message, instructions });
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
}
