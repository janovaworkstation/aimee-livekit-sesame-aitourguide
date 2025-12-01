"use strict";
// AImee Base Agent Interface
// Phase 3: Common interface and utilities for all agents
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
exports.validateAgent = validateAgent;
/**
 * Abstract base class providing common agent functionality
 */
class BaseAgent {
    /**
     * Default keyword-based intent detection
     * Subclasses should override for more sophisticated detection
     */
    checkKeywords(input, keywords) {
        const normalizedInput = input.toLowerCase().trim();
        return keywords.some(keyword => normalizedInput.includes(keyword.toLowerCase()));
    }
    /**
     * Extract location context for agents that need it
     */
    getLocationInfo(context) {
        if (!context.location) {
            return "Location information not available.";
        }
        const { lat, lng, nearestMarkerId } = context.location;
        let locationInfo = `Current location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (nearestMarkerId) {
            locationInfo += ` (near marker: ${nearestMarkerId})`;
        }
        return locationInfo;
    }
    /**
     * Extract tour state context for navigation-aware agents
     */
    getTourStateInfo(context) {
        if (!context.tourState) {
            return "Tour state not available.";
        }
        const { currentMarkerId, nextMarkerId, mode } = context.tourState;
        let tourInfo = `Tour mode: ${mode || 'idle'}`;
        if (currentMarkerId) {
            tourInfo += `, current: ${currentMarkerId}`;
        }
        if (nextMarkerId) {
            tourInfo += `, next: ${nextMarkerId}`;
        }
        return tourInfo;
    }
    /**
     * Get user preference context for personalized responses
     */
    getUserPreferences(context) {
        const prefs = context.preferences;
        if (!prefs) {
            return "User preferences: default settings";
        }
        return `User preferences: ${prefs.verbosity || 'medium'} responses, ${prefs.tone || 'conversational'} tone`;
    }
    /**
     * Get formatted conversation history for context
     */
    getConversationSummary(context, maxMessages = 5) {
        const recentHistory = context.history.slice(-maxMessages);
        if (recentHistory.length === 0) {
            return "No previous conversation.";
        }
        const summary = recentHistory
            .map(msg => `${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`)
            .join('\n');
        return `Recent conversation:\n${summary}`;
    }
    /**
     * Build comprehensive context string for LLM prompts
     */
    buildContextString(context) {
        const sections = [
            this.getLocationInfo(context),
            this.getTourStateInfo(context),
            this.getUserPreferences(context),
            this.getConversationSummary(context)
        ];
        return sections.join('\n\n');
    }
    /**
     * Optional detailed intent matching - can be overridden for more sophisticated analysis
     */
    getIntentMatch(input, context) {
        // Default implementation returns null - subclasses can override
        return null;
    }
}
exports.BaseAgent = BaseAgent;
/**
 * Utility function to validate agent implementation
 */
function validateAgent(agent) {
    return (typeof agent.name === 'string' &&
        agent.name.length > 0 &&
        typeof agent.description === 'string' &&
        typeof agent.canHandle === 'function' &&
        typeof agent.run === 'function');
}
