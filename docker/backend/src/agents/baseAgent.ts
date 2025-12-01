// AImee Base Agent Interface
// Phase 3: Common interface and utilities for all agents

import { ConversationContext, AgentResult, IntentMatch, AgentPriority } from './types';

/**
 * Base interface that all AImee agents must implement
 */
export interface Agent {
  /** Unique identifier for the agent */
  readonly name: string;

  /** Human-readable description of agent capabilities */
  readonly description: string;

  /**
   * Determines if this agent can handle the given input and context
   * @param input User input text
   * @param context Full conversation context
   * @returns Boolean indicating if agent can handle this input
   */
  canHandle(input: string, context: ConversationContext): boolean;

  /**
   * Processes the input and generates a response
   * @param input User input text
   * @param context Full conversation context
   * @returns Agent result with response text and metadata
   */
  run(input: string, context: ConversationContext): Promise<AgentResult>;

  /**
   * Optional: Provides detailed intent matching with confidence scores
   * @param input User input text
   * @param context Full conversation context
   * @returns Intent match details or null if not applicable
   */
  getIntentMatch?(input: string, context: ConversationContext): IntentMatch | null;
}

/**
 * Abstract base class providing common agent functionality
 */
export abstract class BaseAgent implements Agent {
  public abstract readonly name: string;
  public abstract readonly description: string;

  /**
   * Default keyword-based intent detection
   * Subclasses should override for more sophisticated detection
   */
  protected checkKeywords(input: string, keywords: string[]): boolean {
    const normalizedInput = input.toLowerCase().trim();
    return keywords.some(keyword =>
      normalizedInput.includes(keyword.toLowerCase())
    );
  }

  /**
   * Extract location context for agents that need it
   */
  protected getLocationInfo(context: ConversationContext): string {
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
  protected getTourStateInfo(context: ConversationContext): string {
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
  protected getUserPreferences(context: ConversationContext): string {
    const prefs = context.preferences;
    if (!prefs) {
      return "User preferences: default settings";
    }

    return `User preferences: ${prefs.verbosity || 'medium'} responses, ${prefs.tone || 'conversational'} tone`;
  }

  /**
   * Get formatted conversation history for context
   */
  protected getConversationSummary(context: ConversationContext, maxMessages: number = 5): string {
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
  protected buildContextString(context: ConversationContext): string {
    const sections = [
      this.getLocationInfo(context),
      this.getTourStateInfo(context),
      this.getUserPreferences(context),
      this.getConversationSummary(context)
    ];

    return sections.join('\n\n');
  }

  /**
   * Default implementation - subclasses should override
   */
  abstract canHandle(input: string, context: ConversationContext): boolean;

  /**
   * Default implementation - subclasses should override
   */
  abstract run(input: string, context: ConversationContext): Promise<AgentResult>;

  /**
   * Optional detailed intent matching - can be overridden for more sophisticated analysis
   */
  getIntentMatch(input: string, context: ConversationContext): IntentMatch | null {
    // Default implementation returns null - subclasses can override
    return null;
  }
}

/**
 * Utility function to validate agent implementation
 */
export function validateAgent(agent: Agent): boolean {
  return (
    typeof agent.name === 'string' &&
    agent.name.length > 0 &&
    typeof agent.description === 'string' &&
    typeof agent.canHandle === 'function' &&
    typeof agent.run === 'function'
  );
}