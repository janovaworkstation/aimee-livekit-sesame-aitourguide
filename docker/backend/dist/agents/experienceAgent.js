"use strict";
// AImee Experience Agent
// Phase 3: Handles experiential recommendations, atmosphere, and activity suggestions
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExperienceAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const types_1 = require("./types");
const agentBrainHelper_1 = require("../brains/agentBrainHelper");
const promptLoader_1 = require("../prompts/promptLoader");
/**
 * Experience Agent - Specializes in experiential recommendations, atmosphere, and activities
 * Handles: "recommend", "what should I do", "experience", "vibe", "suggestions"
 */
class ExperienceAgent extends baseAgent_1.BaseAgent {
    constructor() {
        super(...arguments);
        this.name = 'Experience';
        this.description = 'Provides experiential recommendations, atmosphere insights, and activity suggestions';
        this.experienceKeywords = [
            'recommend', 'recommendation', 'suggest', 'suggestion', 'advice',
            'what should i do', 'what to do', 'activities', 'experience',
            'vibe', 'atmosphere', 'feel', 'mood', 'ambiance',
            'fun', 'enjoy', 'entertainment', 'leisure', 'relax',
            'visit', 'see', 'explore', 'discover', 'check out',
            'best', 'top', 'favorite', 'popular', 'must-see',
            'food', 'eat', 'drink', 'restaurant', 'cafe',
            'shop', 'shopping', 'buy', 'souvenir', 'gift',
            'photo', 'picture', 'scenic', 'view', 'instagram'
        ];
    }
    // System prompt loaded from external file
    getSystemPrompt() {
        return (0, promptLoader_1.getExperiencePrompt)();
    }
    /**
     * Determines if this agent should handle the input
     */
    canHandle(input, context) {
        const normalizedInput = input.toLowerCase().trim();
        // High priority for explicit experience requests
        const explicitExperienceTerms = [
            'what should i do', 'what to do here', 'any recommendations',
            'suggest something', 'recommend', 'what can i see',
            'where should i eat', 'what\'s the vibe', 'how does it feel'
        ];
        if (explicitExperienceTerms.some(term => normalizedInput.includes(term))) {
            return true;
        }
        // Check for experience-related keywords
        return this.checkKeywords(input, this.experienceKeywords);
    }
    /**
     * Process experience and recommendation requests
     */
    async run(input, context) {
        try {
            console.log('Experience Agent: Processing experience/recommendation request');
            // Generate experience-focused response
            const response = await (0, agentBrainHelper_1.runSmartAgentPrompt)(this.name, this.getSystemPrompt(), input, context);
            return {
                text: response,
                metadata: {
                    agent: this.name,
                    hasLocation: !!context.location,
                    tourMode: context.tourState?.mode || 'unknown',
                    userTone: context.preferences?.tone || 'conversational',
                    recommendationType: this.categorizeRequest(input),
                    confidence: this.calculateConfidence(input, context)
                }
            };
        }
        catch (error) {
            console.error('Experience Agent: Error processing request:', error);
            // Fallback response
            return {
                text: "I'd love to help you discover amazing experiences here! I'm having a technical moment - please ask me again about what you'd like to do or see.",
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
        // High confidence for explicit recommendation requests
        const explicitPhrases = [
            'what should i do', 'what to do here', 'any recommendations',
            'suggest something', 'what can i see', 'what\'s fun here',
            'where should i eat', 'best place to', 'what\'s the vibe'
        ];
        for (const phrase of explicitPhrases) {
            if (normalizedInput.includes(phrase)) {
                confidence += 0.9;
                matchedKeywords.push(phrase);
                break;
            }
        }
        // High confidence for recommendation verbs
        const recommendationVerbs = ['recommend', 'suggest', 'advise'];
        for (const verb of recommendationVerbs) {
            if (normalizedInput.includes(verb)) {
                confidence += 0.8;
                matchedKeywords.push(verb);
                break;
            }
        }
        // Medium confidence for experience keywords
        for (const keyword of this.experienceKeywords) {
            if (normalizedInput.includes(keyword)) {
                confidence += 0.3;
                matchedKeywords.push(keyword);
            }
        }
        // Boost confidence for specific activity mentions
        const activityMentions = ['eat', 'food', 'photo', 'view', 'shop', 'visit', 'see'];
        for (const activity of activityMentions) {
            if (normalizedInput.includes(activity)) {
                confidence += 0.2;
                matchedKeywords.push(activity);
            }
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
     * Categorize the type of recommendation request
     */
    categorizeRequest(input) {
        const normalizedInput = input.toLowerCase();
        if (normalizedInput.includes('eat') || normalizedInput.includes('food') || normalizedInput.includes('restaurant')) {
            return 'dining';
        }
        if (normalizedInput.includes('photo') || normalizedInput.includes('picture') || normalizedInput.includes('view')) {
            return 'photography';
        }
        if (normalizedInput.includes('shop') || normalizedInput.includes('buy') || normalizedInput.includes('souvenir')) {
            return 'shopping';
        }
        if (normalizedInput.includes('vibe') || normalizedInput.includes('atmosphere') || normalizedInput.includes('feel')) {
            return 'atmosphere';
        }
        if (normalizedInput.includes('visit') || normalizedInput.includes('see') || normalizedInput.includes('do')) {
            return 'activity';
        }
        return 'general';
    }
    /**
     * Calculate confidence score for this agent's ability to handle the request
     */
    calculateConfidence(input, context) {
        const intentMatch = this.getIntentMatch(input, context);
        return intentMatch?.confidence || 0;
    }
}
exports.ExperienceAgent = ExperienceAgent;
