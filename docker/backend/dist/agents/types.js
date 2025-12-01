"use strict";
// AImee Multi-Agent System Type Definitions
// Phase 3: Core types for conversation context and agent results
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPriority = void 0;
exports.createDefaultContext = createDefaultContext;
exports.addToHistory = addToHistory;
exports.getRecentHistory = getRecentHistory;
/**
 * Agent capabilities and priority levels
 */
var AgentPriority;
(function (AgentPriority) {
    AgentPriority[AgentPriority["LOW"] = 1] = "LOW";
    AgentPriority[AgentPriority["MEDIUM"] = 2] = "MEDIUM";
    AgentPriority[AgentPriority["HIGH"] = 3] = "HIGH";
    AgentPriority[AgentPriority["CRITICAL"] = 4] = "CRITICAL";
})(AgentPriority || (exports.AgentPriority = AgentPriority = {}));
/**
 * Default conversation context builder
 */
function createDefaultContext(userId, overrides) {
    return {
        userId,
        history: [],
        engineTier: 'premium',
        preferences: {
            verbosity: 'medium',
            tone: 'conversational'
        },
        ...overrides
    };
}
/**
 * Utility function to add message to context history
 */
function addToHistory(context, role, content) {
    return {
        ...context,
        history: [
            ...context.history,
            {
                role,
                content,
                timestamp: new Date()
            }
        ]
    };
}
/**
 * Utility function to get recent history (last N messages)
 */
function getRecentHistory(context, count = 10) {
    return context.history.slice(-count);
}
