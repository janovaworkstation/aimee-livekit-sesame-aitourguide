"use strict";
// AImee Memory Agent
// Phase 3: Handles personalization, user preferences, and conversation memory
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryAgent = void 0;
const baseAgent_1 = require("./baseAgent");
const types_1 = require("./types");
const agentBrainHelper_1 = require("../brains/agentBrainHelper");
/**
 * Memory Agent - Specializes in personalization, preferences, and user context management
 * Handles: preference updates, personal information, conversation context, memory management
 */
class MemoryAgent extends baseAgent_1.BaseAgent {
    constructor() {
        super(...arguments);
        this.name = 'Memory';
        this.description = 'Manages user preferences, personalization, and conversation memory';
        this.memoryKeywords = [
            'remember', 'forget', 'preference', 'prefer', 'like', 'dislike',
            'always', 'never', 'usually', 'typically', 'normally',
            'set', 'change', 'update', 'modify', 'adjust',
            'personal', 'customize', 'personalize', 'settings',
            'my name is', 'call me', 'i am', 'i\'m', 'myself',
            'remind me', 'note that', 'keep in mind', 'remember that',
            'next time', 'from now on', 'in the future'
        ];
        this.systemPrompt = `You are the Memory agent for AImee, a GPS-triggered tour guide system. Your role is to:

1. PERSONALIZATION MANAGEMENT: Track and apply user preferences for personalized experiences
2. CONVERSATION MEMORY: Maintain context and continuity across interactions
3. PREFERENCE LEARNING: Learn from user feedback and behavior to improve future interactions
4. USER PROFILE BUILDING: Build a comprehensive understanding of user interests and needs

Key responsibilities:
- Process requests to update user preferences (verbosity, tone, interests)
- Remember personal information shared by users (name, interests, accessibility needs)
- Apply learned preferences to improve future interactions
- Handle requests for the system to remember or forget specific information
- Maintain conversation continuity and context awareness
- Learn from implicit feedback and user behavior patterns

Response style:
- Be attentive and remembering, showing you value user input
- Acknowledge preference updates clearly and confirm understanding
- Reference past interactions appropriately to show continuity
- Be helpful in explaining how preferences will affect future interactions
- Respect privacy and give users control over their information

Focus on building a helpful, personalized experience while respecting user privacy and autonomy.`;
    }
    /**
     * Determines if this agent should handle the input
     */
    canHandle(input, context) {
        const normalizedInput = input.toLowerCase().trim();
        // High priority for explicit preference/memory requests
        const explicitMemoryTerms = [
            'remember', 'my name is', 'call me', 'i prefer', 'my preference',
            'set my', 'change my', 'update my', 'i like', 'i don\'t like',
            'remind me', 'note that', 'keep in mind', 'from now on'
        ];
        if (explicitMemoryTerms.some(term => normalizedInput.includes(term))) {
            return true;
        }
        // Check for personal information sharing patterns
        const personalPatterns = [
            /^my name is/, /^call me/, /^i am/, /^i'm/,
            /i prefer/, /i like/, /i don't like/, /i hate/
        ];
        if (personalPatterns.some(pattern => pattern.test(normalizedInput))) {
            return true;
        }
        // Check for memory-related keywords
        return this.checkKeywords(input, this.memoryKeywords);
    }
    /**
     * Process memory and personalization requests
     */
    async run(input, context) {
        try {
            console.log('Memory Agent: Processing personalization/memory request');
            // Check if this is a preference update request
            const preferenceUpdate = this.extractPreferenceUpdate(input);
            // Generate memory-focused response
            const response = await (0, agentBrainHelper_1.runSmartAgentPrompt)(this.name, this.systemPrompt, input, context);
            const metadata = {
                agent: this.name,
                hasPreferenceUpdate: !!preferenceUpdate,
                conversationLength: context.history.length,
                confidence: this.calculateConfidence(input, context)
            };
            if (preferenceUpdate) {
                metadata.preferenceUpdate = preferenceUpdate;
                // TODO: In future phases, actually persist preference updates to user profile
                console.log('Memory Agent: Detected preference update:', preferenceUpdate);
            }
            return {
                text: response,
                metadata
            };
        }
        catch (error) {
            console.error('Memory Agent: Error processing request:', error);
            // Fallback response
            return {
                text: "I want to remember what's important to you! I'm having trouble processing your preference right now - please try telling me again.",
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
        // High confidence for explicit memory/preference requests
        const explicitPhrases = [
            'remember that', 'my name is', 'call me', 'i prefer',
            'my preference is', 'set my', 'change my setting',
            'i like when', 'i don\'t like', 'from now on'
        ];
        for (const phrase of explicitPhrases) {
            if (normalizedInput.includes(phrase)) {
                confidence += 0.9;
                matchedKeywords.push(phrase);
                break;
            }
        }
        // High confidence for personal information patterns
        if (normalizedInput.startsWith('my name is') || normalizedInput.startsWith('call me')) {
            confidence += 0.95;
            matchedKeywords.push('name_introduction');
        }
        // Medium confidence for preference indicators
        const preferenceIndicators = ['prefer', 'like', 'dislike', 'always', 'never', 'usually'];
        for (const indicator of preferenceIndicators) {
            if (normalizedInput.includes(indicator)) {
                confidence += 0.4;
                matchedKeywords.push(indicator);
            }
        }
        // Medium confidence for memory-related keywords
        for (const keyword of this.memoryKeywords) {
            if (normalizedInput.includes(keyword)) {
                confidence += 0.3;
                matchedKeywords.push(keyword);
            }
        }
        // Boost confidence if this is clearly about changing settings or preferences
        if (normalizedInput.includes('set') || normalizedInput.includes('change') || normalizedInput.includes('update')) {
            confidence += 0.2;
        }
        // Cap confidence at 1.0
        confidence = Math.min(confidence, 1.0);
        if (confidence < 0.3) {
            return null;
        }
        return {
            confidence,
            priority: confidence > 0.8 ? types_1.AgentPriority.HIGH : types_1.AgentPriority.MEDIUM,
            keywords: matchedKeywords
        };
    }
    /**
     * Extract preference updates from user input
     */
    extractPreferenceUpdate(input) {
        const normalizedInput = input.toLowerCase();
        // Name updates
        if (normalizedInput.includes('my name is') || normalizedInput.includes('call me')) {
            const nameMatch = normalizedInput.match(/(?:my name is|call me)\s+(\w+)/);
            if (nameMatch) {
                return { type: 'name', value: nameMatch[1] };
            }
        }
        // Verbosity preferences
        if (normalizedInput.includes('short') || normalizedInput.includes('brief') || normalizedInput.includes('concise')) {
            return { type: 'verbosity', value: 'short' };
        }
        if (normalizedInput.includes('long') || normalizedInput.includes('detailed') || normalizedInput.includes('thorough')) {
            return { type: 'verbosity', value: 'long' };
        }
        // Tone preferences
        if (normalizedInput.includes('playful') || normalizedInput.includes('fun') || normalizedInput.includes('casual')) {
            return { type: 'tone', value: 'playful' };
        }
        if (normalizedInput.includes('factual') || normalizedInput.includes('formal') || normalizedInput.includes('professional')) {
            return { type: 'tone', value: 'factual' };
        }
        return null;
    }
    /**
     * Calculate confidence score for this agent's ability to handle the request
     */
    calculateConfidence(input, context) {
        const intentMatch = this.getIntentMatch(input, context);
        return intentMatch?.confidence || 0;
    }
}
exports.MemoryAgent = MemoryAgent;
