// AImee Memory Agent
// Phase 3: Handles personalization, user preferences, and conversation memory

import { BaseAgent } from './baseAgent';
import { ConversationContext, AgentResult, IntentMatch, AgentPriority } from './types';
import { runSmartAgentPrompt } from '../brains/agentBrainHelper';
import { getMemoryPrompt } from '../prompts/promptLoader';
import {
  getUserMemory,
  upsertUserMemory,
  getCurrentTrip,
  startNewTrip,
  clearTripMemory,
  addTripConstraint,
  shouldStoreMemory,
  setPrivacySettings
} from '../memory/jsonMemoryStore';

/**
 * Memory Agent - Specializes in personalization, preferences, and user context management
 * Handles: preference updates, personal information, conversation context, memory management
 */
export class MemoryAgent extends BaseAgent {
  public readonly name = 'Memory';
  public readonly description = 'Manages user preferences, personalization, and conversation memory';

  private readonly memoryKeywords = [
    'remember', 'forget', 'preference', 'prefer', 'like', 'dislike',
    'always', 'never', 'usually', 'typically', 'normally',
    'set', 'change', 'update', 'modify', 'adjust',
    'personal', 'customize', 'personalize', 'settings',
    'my name is', 'call me', 'i am', 'i\'m', 'myself',
    'remind me', 'note that', 'keep in mind', 'remember that',
    'next time', 'from now on', 'in the future'
  ];

  // System prompt loaded from external file
  private getSystemPrompt(): string {
    return getMemoryPrompt();
  }

  /**
   * Check if the input is likely a name response based on conversation context
   */
  private isLikelyNameResponse(input: string, context: ConversationContext): boolean {
    // Only consider short responses (1-2 words) that are alphabetic
    const words = input.trim().split(/\s+/);
    if (words.length > 2 || words.length < 1) {
      return false;
    }

    const firstWord = words[0];
    if (firstWord.length < 2 || !/^[A-Za-z]+$/.test(firstWord)) {
      return false;
    }

    // Check if the last assistant message in conversation history asked for a name
    if (!context.history || context.history.length === 0) {
      return false;
    }

    // Find the most recent assistant message
    const lastAssistantMessage = context.history
      .slice()
      .reverse()
      .find(msg => msg.role === 'assistant');

    if (!lastAssistantMessage) {
      return false;
    }

    // Check if the assistant message contained a name-related question
    const nameQuestions = [
      'what should i call you',
      'how should i address you',
      'what do you want me to call you',
      'what would you like me to call you',
      'what is your name',
      'may i have your name'
    ];

    const messageText = lastAssistantMessage.content.toLowerCase();
    return nameQuestions.some(question => messageText.includes(question));
  }

  /**
   * Determines if this agent should handle the input
   */
  canHandle(input: string, context: ConversationContext): boolean {
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

    // Context-aware name response detection
    if (this.isLikelyNameResponse(input, context)) {
      return true;
    }

    // Check for memory-related keywords
    return this.checkKeywords(input, this.memoryKeywords);
  }

  /**
   * Parse time constraints from user input
   */
  private parseTimeConstraint(input: string): string | undefined {
    const timePatterns = [
      /(?:only |about |around |roughly |approximately )?(\d+(?:\.\d+)?\s*(?:hour|hr)s?)\b/i,
      /(?:only |about |around |roughly |approximately )?(\d+(?:\.\d+)?\s*(?:minute|min)s?)\b/i,
      /(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:hour|hr)s?/i
    ];

    for (const pattern of timePatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return undefined;
  }

  /**
   * Detect if this is a new trip context (region change, etc)
   */
  private async detectTripBoundary(input: string, context: ConversationContext): Promise<boolean> {
    const tripIndicators = [
      /^(?:i'm|i am|we're|we are)\s+(?:in|at|near|around|visiting)/i,
      /^(?:just arrived|arrived|got to|reached)/i,
      /^(?:starting|beginning)\s+(?:a|our|the)?\s*(?:new)?\s*(?:trip|tour|journey)/i,
      /^(?:heading to|going to|driving to)\s+(?:a\s+)?(?:new|different)\s+(?:area|region|place)/i
    ];

    return tripIndicators.some(pattern => pattern.test(input.trim()));
  }

  /**
   * Process memory and personalization requests
   */
  async run(input: string, context: ConversationContext): Promise<AgentResult> {
    try {
      console.log('Memory Agent: Processing personalization/memory request');

      // Special handling for session start greeting check
      // Match various session start patterns
      if (input.includes('[SYSTEM: This is the initial session') ||
          input.includes('[SYSTEM: This is a new session')) {
        return await this.handleSessionStart(context);
      }

      // Check for session end to save trip to history
      if (input.includes('[SYSTEM: Session ending]') ||
          input.includes('[SYSTEM: User disconnecting]')) {
        return await this.handleSessionEnd(context);
      }

      // Detect new trip boundary
      const isNewTrip = await this.detectTripBoundary(input, context);
      if (isNewTrip) {
        const userId = context.userId || 'voice-user';
        // Parse region from input if possible
        const regionMatch = input.match(/(?:in|at|near|around|visiting)\s+([^,.!?]+)/i);
        const region = regionMatch ? regionMatch[1].trim() : undefined;
        await startNewTrip(userId, region);
        console.log(`Memory Agent: Started new trip${region ? ` in ${region}` : ''}`);
      }

      // Check for time constraints in current trip
      const timeConstraint = this.parseTimeConstraint(input);
      if (timeConstraint) {
        const userId = context.userId || 'voice-user';
        const currentTrip = await getCurrentTrip(userId);
        if (currentTrip) {
          await addTripConstraint(userId, { timeLimit: timeConstraint });
          console.log(`Memory Agent: Added time constraint to trip: ${timeConstraint}`);
        }
      }

      // Check for privacy mode requests
      if (input.toLowerCase().includes('do not remember') ||
          input.toLowerCase().includes('privacy mode') ||
          input.toLowerCase().includes('don\'t store') ||
          input.toLowerCase().includes('no memory')) {
        const userId = context.userId || 'voice-user';
        await setPrivacySettings(userId, { mode: true, activatedAt: new Date() });
        console.log('Memory Agent: Privacy mode activated');
      }

      // Check for privacy mode deactivation
      if ((input.toLowerCase().includes('you can remember') ||
           input.toLowerCase().includes('it\'s fine to remember') ||
           input.toLowerCase().includes('disable privacy')) &&
          !input.toLowerCase().includes('do not')) {
        const userId = context.userId || 'voice-user';
        await setPrivacySettings(userId, { mode: false });
        console.log('Memory Agent: Privacy mode deactivated');
      }

      // Get current user memory and trip for context
      const userId = context.userId || 'voice-user';
      const currentMemory = await getUserMemory(userId);
      const currentTrip = await getCurrentTrip(userId);

      // Check if we should store memory (privacy mode check)
      const canStore = await shouldStoreMemory(userId);

      // Add memory and trip context to the prompt
      let memoryContext = currentMemory ?
        `Current stored memory for this user: ${JSON.stringify(currentMemory)}` :
        'No stored memory for this user yet.';

      if (currentTrip) {
        memoryContext += `\n\nCurrent active trip: ${JSON.stringify(currentTrip)}`;
      }

      if (!canStore) {
        memoryContext += '\n\nNOTE: Privacy mode is active - do not store any new memory.';
      }

      // Generate memory-focused response with memory context
      const response = await runSmartAgentPrompt(
        this.name,
        this.getSystemPrompt() + '\n\n' + memoryContext + '\n\nUser input: ' + input,
        `Please analyze this input for any memory updates (names, preferences, interests, visited markers). If you detect memory updates:
1. Output a single line starting with: SAVE_MEMORY: {valid_json_object}
2. This line must contain ONLY that text - the literal prefix "SAVE_MEMORY:" followed by valid JSON with double quotes
3. JSON may include fields: "name", "storyLengthPreference", "interests", "visitedMarkers"
4. After that line, provide your natural response to the user
5. If no memory changes, do NOT output any SAVE_MEMORY line`,
        context
      );

      // Parse SAVE_MEMORY directive using line-based approach
      let memorySaved = false;
      let memoryUpdate: any = null;
      const lines = response.split('\n');

      // Find the SAVE_MEMORY line
      const memoryLineIndex = lines.findIndex(line => line.trim().startsWith('SAVE_MEMORY:'));

      if (memoryLineIndex !== -1) {
        const memoryLine = lines[memoryLineIndex];
        const jsonPart = memoryLine.substring(memoryLine.indexOf(':') + 1).trim();

        console.log(`Memory Agent: SAVE_MEMORY line detected: ${memoryLine.trim()}`);
        console.log(`Memory Agent: JSON part: ${jsonPart}`);

        try {
          memoryUpdate = JSON.parse(jsonPart);

          // Only save if privacy mode allows
          if (canStore) {
            await upsertUserMemory(userId, memoryUpdate);
            memorySaved = true;
          } else {
            console.log('Memory Agent: Skipping memory save due to privacy mode');
          }

          // Log successful memory update with specific fields
          const updatedFields = Object.keys(memoryUpdate);
          console.log(`Memory Agent: Updated memory for user ${userId}. Fields: ${updatedFields.join(', ')}`);
        } catch (error) {
          console.error(`Memory Agent: Error parsing SAVE_MEMORY JSON. Line: "${memoryLine.trim()}", JSON: "${jsonPart}", Error:`, error);

          // Fallback: try to extract name manually from the memory line
          const nameMatch = memoryLine.match(/["']?name["']?\s*:\s*["']([^"']+)["']/i);
          if (nameMatch) {
            try {
              memoryUpdate = { name: nameMatch[1] };
              await upsertUserMemory(userId, memoryUpdate);
              console.log(`Memory Agent: Fallback name extraction saved: ${nameMatch[1]}`);
              memorySaved = true;
            } catch (fallbackError) {
              console.error('Memory Agent: Fallback name extraction also failed:', fallbackError);
            }
          }
        }
      }

      // Clean response by removing SAVE_MEMORY lines
      const cleanLines = lines.filter(line => !line.trim().startsWith('SAVE_MEMORY:'));
      const cleanResponse = cleanLines.join('\n').trim();

      const metadata: any = {
        agent: this.name,
        conversationLength: context.history.length,
        confidence: this.calculateConfidence(input, context),
        memorySaved
      };

      // Add memory update details to metadata
      if (memorySaved && memoryUpdate) {
        metadata.memoryUpdatedFields = Object.keys(memoryUpdate);
      }

      return {
        text: cleanResponse,
        metadata
      };

    } catch (error) {
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
  getIntentMatch(input: string, _context: ConversationContext): IntentMatch | null {
    const normalizedInput = input.toLowerCase();
    let confidence = 0;
    const matchedKeywords: string[] = [];

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
      priority: confidence > 0.8 ? AgentPriority.HIGH : AgentPriority.MEDIUM,
      keywords: matchedKeywords
    };
  }


  /**
   * Handle session start - check memory and provide appropriate greeting
   */
  private async handleSessionStart(context: ConversationContext): Promise<AgentResult> {
    try {
      const userId = context.userId || 'voice-user';
      console.log(`Memory Agent: Checking stored memory for user ${userId}`);

      const userMemory = await getUserMemory(userId);

      // Create dynamic greeting using LLM
      const memoryInfo = userMemory ?
        `User memory found: ${JSON.stringify(userMemory)}` :
        'No stored memory for this user.';

      const greetingPrompt = userMemory?.name ?
        `Generate a BRIEF, warm greeting for ${userMemory.name} who is returning to use AImee. Keep it to 1-2 sentences MAX. Just say welcome back and ask how you can help. Do NOT re-introduce yourself or explain what you do - they already know. Example: "Welcome back, ${userMemory.name}! Great to see you again. How can I help you explore today?"` :
        `Generate a warm, welcoming first-time greeting for a new user. Introduce yourself as Amy, their AI tour guide assistant. Explain briefly what you do (help discover interesting places and stories) and ask what you should call them. Keep it concise for in-car listening. Make it sound natural and friendly, not scripted.`;

      const response = await runSmartAgentPrompt(
        this.name,
        this.getSystemPrompt() + '\n\n' + memoryInfo,
        greetingPrompt,
        context
      );

      if (userMemory?.name) {
        console.log(`Memory Agent: Generated personalized greeting for returning user: ${userMemory.name}`);
        return {
          text: response,
          metadata: {
            agent: this.name,
            sessionStart: true,
            hasStoredMemory: true,
            userName: userMemory.name,
            confidence: 1.0,
            greetingType: 'returning_user'
          }
        };
      } else {
        console.log(`Memory Agent: Generated first-time greeting for new user`);
        return {
          text: response,
          metadata: {
            agent: this.name,
            sessionStart: true,
            hasStoredMemory: false,
            confidence: 1.0,
            greetingType: 'new_user'
          }
        };
      }
    } catch (error) {
      console.error('Memory Agent: Error during session start:', error);
      return {
        text: "Hello! I'm Amy, your AI tour guide assistant. I'm having a little trouble accessing my memory right now, but I'm ready to help you discover interesting places. What should I call you?",
        metadata: {
          agent: this.name,
          sessionStart: true,
          hasStoredMemory: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          confidence: 0.5,
          greetingType: 'error_fallback'
        }
      };
    }
  }

  /**
   * Handle session end - save trip to history
   */
  private async handleSessionEnd(context: ConversationContext): Promise<AgentResult> {
    try {
      const userId = context.userId || 'voice-user';
      const currentTrip = await getCurrentTrip(userId);

      if (currentTrip) {
        // Trip will be automatically moved to history by endCurrentTrip
        // which is called by startNewTrip when a new trip begins
        console.log(`Memory Agent: Session ending, trip ${currentTrip.tripId} preserved`);
      }

      return {
        text: '',  // No user-facing message for session end
        metadata: {
          agent: this.name,
          sessionEnd: true,
          hadActiveTrip: !!currentTrip,
          confidence: 1.0
        }
      };
    } catch (error) {
      console.error('Memory Agent: Error during session end:', error);
      return {
        text: '',
        metadata: {
          agent: this.name,
          sessionEnd: true,
          error: error instanceof Error ? error.message : 'Unknown error',
          confidence: 0.5
        }
      };
    }
  }

  /**
   * Calculate confidence score for this agent's ability to handle the request
   */
  private calculateConfidence(input: string, context: ConversationContext): number {
    const intentMatch = this.getIntentMatch(input, context);
    return intentMatch?.confidence || 0;
  }
}