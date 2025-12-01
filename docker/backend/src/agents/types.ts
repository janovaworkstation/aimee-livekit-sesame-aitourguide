// AImee Multi-Agent System Type Definitions
// Phase 3: Core types for conversation context and agent results

/**
 * GPS location context for geo-aware responses
 */
export interface LocationContext {
  lat: number;
  lng: number;
  nearestMarkerId?: string;
}

/**
 * Tour state for navigation and flow control
 */
export interface TourState {
  currentMarkerId?: string;
  nextMarkerId?: string;
  mode?: 'drive' | 'walk' | 'idle';
}

/**
 * User preferences for response personalization
 */
export interface UserPreferences {
  verbosity?: 'short' | 'medium' | 'long';
  tone?: 'conversational' | 'factual' | 'playful';
}

/**
 * Conversation message for maintaining dialogue history
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Comprehensive conversation context for multi-agent processing
 */
export interface ConversationContext {
  /** User identifier for personalization and memory */
  userId: string;

  /** GPS location and proximity data */
  location?: LocationContext;

  /** Current tour state and navigation context */
  tourState?: TourState;

  /** User-specific preferences for response style */
  preferences?: UserPreferences;

  /** Conversation history for context-aware responses */
  history: ConversationMessage[];

  /** Selected intelligence tier */
  engineTier?: 'premium' | 'standard' | 'offline';

  /** Additional metadata for agent processing */
  metadata?: Record<string, any>;
}

/**
 * Result from agent processing
 */
export interface AgentResult {
  /** Primary response text */
  text: string;

  /** Agent-specific metadata (confidence, sources, etc.) */
  metadata?: Record<string, any>;
}

/**
 * Agent capabilities and priority levels
 */
export enum AgentPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Agent intent detection result
 */
export interface IntentMatch {
  confidence: number;
  priority: AgentPriority;
  keywords: string[];
}

/**
 * Default conversation context builder
 */
export function createDefaultContext(userId: string, overrides?: Partial<ConversationContext>): ConversationContext {
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
export function addToHistory(
  context: ConversationContext,
  role: 'user' | 'assistant' | 'system',
  content: string
): ConversationContext {
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
export function getRecentHistory(context: ConversationContext, count: number = 10): ConversationMessage[] {
  return context.history.slice(-count);
}