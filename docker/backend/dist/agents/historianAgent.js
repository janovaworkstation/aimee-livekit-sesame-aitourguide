"use strict";
// AImee Historian Agent
// Phase 3: Handles historical information, facts, and educational content
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistorianAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const types_1 = require("./types");
const agentBrainHelper_1 = require("../brains/agentBrainHelper");
/**
 * Historian Agent - Specializes in historical context, facts, and educational information
 * Handles: "tell me about", "history", "what happened here", "facts", "story"
 */
class HistorianAgent extends baseAgent_1.BaseAgent {
    constructor() {
        super(...arguments);
        this.name = 'Historian';
        this.description = 'Provides historical context, facts, and educational information about locations and points of interest';
        this.historyKeywords = [
            'history', 'historical', 'past', 'story', 'stories',
            'tell me about', 'what is', 'what was', 'who was', 'when did',
            'fact', 'facts', 'information', 'details', 'background',
            'explain', 'describe', 'learn', 'education', 'significance',
            'happened', 'occurred', 'built', 'founded', 'established',
            'culture', 'heritage', 'tradition', 'origin', 'legacy'
        ];
        this.systemPrompt = `You are the Historian agent for AImee, a GPS-triggered tour guide system. Your role is to:

1. HISTORICAL CONTEXT: Provide accurate historical information about locations, buildings, and landmarks
2. EDUCATIONAL CONTENT: Share interesting facts, stories, and educational details
3. CULTURAL INSIGHTS: Explain cultural significance and heritage aspects
4. STORYTELLING: Present information in an engaging, narrative format

Key responsibilities:
- Answer questions about history, background, and significance of places
- Provide accurate historical facts and timelines
- Share interesting stories and anecdotes about locations
- Explain cultural and historical context
- Handle educational and informational queries
- Connect past events to present-day relevance

Response style:
- Be informative but engaging, not dry or academic
- Use storytelling techniques to make history come alive
- Include specific dates, names, and facts when relevant
- Connect historical events to their broader context
- Adapt depth of information to user's verbosity preference
- Make history relatable and interesting

Always ensure historical accuracy while maintaining an engaging narrative style. Reference the user's location context when providing site-specific information.`;
    }
    /**
     * Determines if this agent should handle the input
     */
    canHandle(input, context) {
        const normalizedInput = input.toLowerCase().trim();
        // High priority for explicit information requests
        const explicitInfoTerms = [
            'tell me about', 'what is this', 'what happened here',
            'history of', 'story of', 'information about', 'facts about'
        ];
        if (explicitInfoTerms.some(term => normalizedInput.includes(term))) {
            return true;
        }
        // Check for question patterns that suggest information seeking
        const questionPatterns = [
            /^what is/, /^what was/, /^who was/, /^when did/, /^how was/,
            /^why is/, /^why was/, /^where was/
        ];
        if (questionPatterns.some(pattern => pattern.test(normalizedInput))) {
            return true;
        }
        // Check for history-related keywords
        return this.checkKeywords(input, this.historyKeywords);
    }
    /**
     * Process historical information requests
     */
    async run(input, context) {
        try {
            console.log('Historian Agent: Processing historical information request');
            // Generate history-focused response
            const response = await (0, agentBrainHelper_1.runSmartAgentPrompt)(this.name, this.systemPrompt, input, context);
            return {
                text: response,
                metadata: {
                    agent: this.name,
                    hasLocation: !!context.location,
                    nearestMarker: context.location?.nearestMarkerId || null,
                    informationDepth: this.determineInformationDepth(context),
                    confidence: this.calculateConfidence(input, context)
                }
            };
        }
        catch (error) {
            console.error('Historian Agent: Error processing request:', error);
            // Fallback response
            return {
                text: "I'm having trouble accessing historical information right now. I'd love to share the fascinating stories of this place with you - please try your question again.",
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
        // High confidence for explicit information requests
        const explicitPhrases = [
            'tell me about', 'what is this place', 'what happened here',
            'history of', 'story behind', 'information about',
            'what is the significance', 'what makes this special',
            'who built this', 'when was this built'
        ];
        for (const phrase of explicitPhrases) {
            if (normalizedInput.includes(phrase)) {
                confidence += 0.9;
                matchedKeywords.push(phrase);
                break;
            }
        }
        // High confidence for information-seeking question patterns
        const questionStarters = ['what is', 'what was', 'who was', 'when did', 'how was', 'why is'];
        for (const starter of questionStarters) {
            if (normalizedInput.startsWith(starter)) {
                confidence += 0.8;
                matchedKeywords.push(starter);
                break;
            }
        }
        // Medium confidence for history-related keywords
        for (const keyword of this.historyKeywords) {
            if (normalizedInput.includes(keyword)) {
                confidence += 0.3;
                matchedKeywords.push(keyword);
            }
        }
        // Boost confidence if we have location context with a specific marker
        if (context.location?.nearestMarkerId) {
            confidence += 0.2;
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
     * Determine appropriate information depth based on user preferences
     */
    determineInformationDepth(context) {
        const verbosity = context.preferences?.verbosity || 'medium';
        switch (verbosity) {
            case 'short':
                return 'concise';
            case 'long':
                return 'detailed';
            default:
                return 'balanced';
        }
    }
    /**
     * Calculate confidence score for this agent's ability to handle the request
     */
    calculateConfidence(input, context) {
        const intentMatch = this.getIntentMatch(input, context);
        return intentMatch?.confidence || 0;
    }
}
exports.HistorianAgent = HistorianAgent;
