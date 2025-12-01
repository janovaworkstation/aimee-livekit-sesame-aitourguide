"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from the root .env file
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const express_1 = __importDefault(require("express"));
const openaiRealtimeEngine_1 = require("./engines/openaiRealtimeEngine");
const config_1 = require("./brains/config");
const agentRouter_1 = require("./agents/agentRouter");
const types_1 = require("./agents/types");
const app = (0, express_1.default)();
const port = 3000;
app.use(express_1.default.json());
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'aimee-backend' });
});
// OpenAI Realtime API test endpoint
app.post('/realtime-test', async (req, res) => {
    try {
        const { message, instructions } = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid "message" field in request body'
            });
        }
        console.log('Processing realtime test request:', { message: message.substring(0, 100) + '...' });
        // Check if OpenAI is configured
        const status = openaiRealtimeEngine_1.openaiRealtimeEngine.getStatus();
        if (!status.configured) {
            return res.status(400).json({
                success: false,
                error: 'OpenAI Realtime API not configured. Set OPENAI_API_KEY environment variable.',
                brain: status.brain
            });
        }
        // Process the request through OpenAI Realtime API
        const result = await (0, openaiRealtimeEngine_1.testOpenAIRealtime)(message, instructions);
        if (result.success) {
            console.log('Realtime test successful, response length:', result.response?.length);
            res.json({
                success: true,
                response: result.response,
                sessionId: result.sessionId,
                brain: (0, config_1.getBrainForEnvironment)(),
                timestamp: new Date().toISOString()
            });
        }
        else {
            console.error('Realtime test failed:', result.error);
            res.status(500).json({
                success: false,
                error: result.error,
                brain: (0, config_1.getBrainForEnvironment)(),
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('Unexpected error in /realtime-test:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during realtime test',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Brain configuration status endpoint
app.get('/brain-status', (req, res) => {
    try {
        const brain = (0, config_1.getBrainForEnvironment)();
        const realtimeStatus = openaiRealtimeEngine_1.openaiRealtimeEngine.getStatus();
        res.json({
            currentBrain: brain,
            openaiRealtime: realtimeStatus,
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error getting brain status:', error);
        res.status(500).json({
            error: 'Failed to get brain status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// AImee Multi-Agent Chat Endpoint
app.post('/aimee-chat', async (req, res) => {
    try {
        const { userId, input, context: contextOverrides } = req.body;
        // Validate required fields
        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid "userId" field in request body'
            });
        }
        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Missing or invalid "input" field in request body'
            });
        }
        console.log('AImee Chat: Processing request for user:', userId);
        console.log('AImee Chat: Input:', input.substring(0, 100) + (input.length > 100 ? '...' : ''));
        // Build conversation context
        const context = (0, types_1.createDefaultContext)(userId, contextOverrides || {});
        // Add user input to conversation history
        const contextWithHistory = (0, types_1.addToHistory)(context, 'user', input);
        // Route to appropriate agent
        const result = await (0, agentRouter_1.routeToAgent)(input, contextWithHistory);
        // Add assistant response to history for next interactions
        const finalContext = (0, types_1.addToHistory)(contextWithHistory, 'assistant', result.text);
        console.log('AImee Chat: Response generated by', result.metadata?.routing?.selectedAgent || 'unknown agent');
        res.json({
            success: true,
            agent: result.metadata?.routing?.selectedAgent || result.metadata?.agent || 'unknown',
            response: result.text,
            metadata: {
                ...result.metadata,
                userId: userId,
                timestamp: new Date().toISOString(),
                conversationLength: finalContext.history.length
            }
        });
    }
    catch (error) {
        console.error('AImee Chat: Error processing request:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during multi-agent processing',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Agent testing endpoint (for debugging)
app.post('/aimee-chat/debug', async (req, res) => {
    try {
        const { userId, input, context: contextOverrides } = req.body;
        if (!userId || !input) {
            return res.status(400).json({
                error: 'Missing userId or input'
            });
        }
        const context = (0, types_1.createDefaultContext)(userId, contextOverrides || {});
        // Import router for debugging
        const { AgentRouter } = await Promise.resolve().then(() => __importStar(require('./agents/agentRouter')));
        const router = new AgentRouter();
        // Get debug information about agent matching
        const debugResults = await router.testAllAgents(input, context);
        res.json({
            input,
            userId,
            context,
            agentAnalysis: debugResults,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('AImee Chat Debug: Error:', error);
        res.status(500).json({
            error: 'Debug analysis failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
app.listen(port, () => {
    console.log(`AImee Backend running on port ${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /health - Health check');
    console.log('  POST /realtime-test - Test OpenAI Realtime API');
    console.log('  GET  /brain-status - Brain configuration status');
    console.log('  POST /aimee-chat - Multi-agent conversation endpoint');
    console.log('  POST /aimee-chat/debug - Agent routing debug information');
    // Log brain configuration on startup
    try {
        const brain = (0, config_1.getBrainForEnvironment)();
        const realtimeStatus = openaiRealtimeEngine_1.openaiRealtimeEngine.getStatus();
        console.log('Current brain configuration:', brain.name, `(${brain.provider})`);
        console.log('OpenAI Realtime configured:', realtimeStatus.configured);
    }
    catch (error) {
        console.warn('Could not determine brain configuration on startup:', error);
    }
});
