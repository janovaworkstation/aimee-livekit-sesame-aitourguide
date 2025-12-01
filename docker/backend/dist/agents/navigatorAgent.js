"use strict";
// AImee Navigator Agent
// Phase 3: Handles navigation, location awareness, and tour flow logic
Object.defineProperty(exports, "__esModule", { value: true });
exports.NavigatorAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const types_1 = require("./types");
const agentBrainHelper_1 = require("../brains/agentBrainHelper");
/**
 * Navigator Agent - Specializes in location, navigation, and tour flow
 * Handles: "where are we", "what's next", "directions", "navigation", "route"
 */
class NavigatorAgent extends baseAgent_1.BaseAgent {
    constructor() {
        super(...arguments);
        this.name = 'Navigator';
        this.description = 'Handles navigation, location awareness, and tour flow management';
        this.navigationKeywords = [
            'where', 'location', 'navigate', 'direction', 'route', 'map',
            'next', 'go', 'move', 'travel', 'drive', 'walk',
            'here', 'there', 'place', 'position', 'coordinates',
            'tour', 'stop', 'destination', 'waypoint', 'marker'
        ];
        this.systemPrompt = `You are the Navigator agent for AImee, a GPS-triggered tour guide system. Your role is to:

1. LOCATION AWARENESS: Help users understand their current location and surroundings
2. NAVIGATION GUIDANCE: Provide directions and route information
3. TOUR FLOW MANAGEMENT: Guide users through the tour sequence and suggest next destinations
4. SPATIAL CONTEXT: Explain spatial relationships between locations and points of interest

Key responsibilities:
- Answer "where am I?" and location-related questions
- Suggest optimal routes and navigation paths
- Manage tour progression and recommend next stops
- Provide directional guidance and orientation help
- Handle GPS and mapping-related queries

Response style:
- Be precise with directions and locations
- Use clear, actionable language for navigation
- Reference landmarks and visual cues when helpful
- Consider the user's current mode of transportation (drive/walk)
- Keep responses practical and immediately useful

Always incorporate the current GPS context, tour state, and user preferences in your responses.`;
    }
    /**
     * Determines if this agent should handle the input
     */
    canHandle(input, context) {
        const normalizedInput = input.toLowerCase().trim();
        // High priority for explicit navigation requests
        const explicitNavigationTerms = ['where am i', 'where are we', "what's next", 'navigate to', 'how do i get'];
        if (explicitNavigationTerms.some(term => normalizedInput.includes(term))) {
            return true;
        }
        // Check for navigation-related keywords
        const keywordMatch = this.checkKeywords(input, this.navigationKeywords);
        // Also handle if we have location context and user is asking about place/position
        const hasLocationContext = !!context.location;
        const isLocationQuery = normalizedInput.includes('here') || normalizedInput.includes('this place');
        return keywordMatch || (hasLocationContext && isLocationQuery);
    }
    /**
     * Process navigation-related requests
     */
    async run(input, context) {
        try {
            console.log('Navigator Agent: Processing navigation request');
            // Generate navigation-focused response
            const response = await (0, agentBrainHelper_1.runSmartAgentPrompt)(this.name, this.systemPrompt, input, context);
            return {
                text: response,
                metadata: {
                    agent: this.name,
                    hasLocation: !!context.location,
                    hasTourState: !!context.tourState,
                    tourMode: context.tourState?.mode || 'unknown',
                    confidence: this.calculateConfidence(input, context)
                }
            };
        }
        catch (error) {
            console.error('Navigator Agent: Error processing request:', error);
            // Fallback response
            return {
                text: "I'm having trouble accessing navigation information right now. Please try again or check your location settings.",
                metadata: {
                    agent: this.name,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    confidence: 0.1
                }
            };
        }
    }
    /**
     * Detailed intent matching for the router
     */
    getIntentMatch(input, context) {
        const normalizedInput = input.toLowerCase();
        let confidence = 0;
        const matchedKeywords = [];
        // High confidence for explicit navigation phrases
        const explicitPhrases = [
            'where am i', 'where are we', 'current location',
            "what's next", 'next stop', 'next destination',
            'how do i get', 'navigate to', 'directions to',
            'which way', 'where should i go'
        ];
        for (const phrase of explicitPhrases) {
            if (normalizedInput.includes(phrase)) {
                confidence += 0.9;
                matchedKeywords.push(phrase);
                break;
            }
        }
        // Medium confidence for navigation keywords
        for (const keyword of this.navigationKeywords) {
            if (normalizedInput.includes(keyword)) {
                confidence += 0.3;
                matchedKeywords.push(keyword);
            }
        }
        // Boost confidence if we have location context
        if (context.location) {
            confidence += 0.2;
        }
        // Boost confidence if we have tour state
        if (context.tourState) {
            confidence += 0.1;
        }
        // Cap confidence at 1.0
        confidence = Math.min(confidence, 1.0);
        if (confidence < 0.3) {
            return null;
        }
        return {
            confidence,
            priority: confidence > 0.7 ? types_1.AgentPriority.HIGH : types_1.AgentPriority.MEDIUM,
            keywords: matchedKeywords
        };
    }
    /**
     * Calculate confidence score for this agent's ability to handle the request
     */
    calculateConfidence(input, context) {
        const intentMatch = this.getIntentMatch(input, context);
        return intentMatch?.confidence || 0;
    }
}
exports.NavigatorAgent = NavigatorAgent;
