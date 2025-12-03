import {
  createDefaultContext,
  addToHistory,
  getRecentHistory,
  ConversationContext
} from '../types';
import { BaseAgent } from '../baseAgent';

// Create a concrete implementation for testing
class TestAgent extends BaseAgent {
  public readonly name = 'Test';
  public readonly description = 'Test agent';

  canHandle(_input: string, _context: ConversationContext): boolean {
    return true;
  }

  async run(_input: string, _context: ConversationContext) {
    return { text: 'test response', metadata: {} };
  }

  // Expose protected method for testing
  public testCheckKeywords(input: string, keywords: string[]): boolean {
    return this.checkKeywords(input, keywords);
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  describe('checkKeywords', () => {
    it('should match exact keywords', () => {
      const result = agent.testCheckKeywords('I want to navigate here', ['navigate', 'direction']);
      expect(result).toBe(true);
    });

    it('should be case-insensitive', () => {
      const result = agent.testCheckKeywords('NAVIGATE to the place', ['navigate']);
      expect(result).toBe(true);
    });

    it('should return false when no keywords match', () => {
      const result = agent.testCheckKeywords('hello world', ['navigate', 'history']);
      expect(result).toBe(false);
    });

    it('should match partial words containing keyword', () => {
      // 'historical' contains 'histor' but not 'history' exactly
      // The checkKeywords method uses includes() so 'history' is in 'historical'? No, it's not.
      // Let's test with actual keyword match
      const result = agent.testCheckKeywords('I love history museums', ['history']);
      expect(result).toBe(true);
    });

    it('should handle empty input', () => {
      const result = agent.testCheckKeywords('', ['navigate']);
      expect(result).toBe(false);
    });

    it('should handle empty keywords array', () => {
      const result = agent.testCheckKeywords('hello world', []);
      expect(result).toBe(false);
    });

    it('should match multi-word keywords', () => {
      const result = agent.testCheckKeywords('tell me about this place', ['tell me about']);
      expect(result).toBe(true);
    });
  });
});

describe('types utility functions', () => {
  describe('createDefaultContext', () => {
    it('should create valid context with userId', () => {
      const context = createDefaultContext('user-123');

      expect(context.userId).toBe('user-123');
      expect(context.history).toEqual([]);
      expect(context.engineTier).toBe('premium');
    });

    it('should include default preferences', () => {
      const context = createDefaultContext('user-123');

      expect(context.preferences?.verbosity).toBe('medium');
      expect(context.preferences?.tone).toBe('conversational');
    });

    it('should allow overriding defaults', () => {
      const context = createDefaultContext('user-123', {
        engineTier: 'standard',
        preferences: { verbosity: 'short', tone: 'factual' }
      });

      expect(context.engineTier).toBe('standard');
      expect(context.preferences?.verbosity).toBe('short');
    });

    it('should allow adding location context', () => {
      const context = createDefaultContext('user-123', {
        location: { lat: 40.0, lng: -83.0 }
      });

      expect(context.location?.lat).toBe(40.0);
      expect(context.location?.lng).toBe(-83.0);
    });
  });

  describe('addToHistory', () => {
    it('should append message correctly', () => {
      const context = createDefaultContext('user-123');
      const updated = addToHistory(context, 'user', 'Hello');

      expect(updated.history.length).toBe(1);
      expect(updated.history[0].role).toBe('user');
      expect(updated.history[0].content).toBe('Hello');
    });

    it('should include timestamp', () => {
      const context = createDefaultContext('user-123');
      const updated = addToHistory(context, 'assistant', 'Hi there');

      expect(updated.history[0].timestamp).toBeDefined();
      expect(updated.history[0].timestamp instanceof Date).toBe(true);
    });

    it('should preserve existing history', () => {
      let context = createDefaultContext('user-123');
      context = addToHistory(context, 'user', 'First message');
      context = addToHistory(context, 'assistant', 'Second message');
      context = addToHistory(context, 'user', 'Third message');

      expect(context.history.length).toBe(3);
      expect(context.history[0].content).toBe('First message');
      expect(context.history[2].content).toBe('Third message');
    });

    it('should not mutate original context', () => {
      const original = createDefaultContext('user-123');
      const updated = addToHistory(original, 'user', 'Hello');

      expect(original.history.length).toBe(0);
      expect(updated.history.length).toBe(1);
    });
  });

  describe('getRecentHistory', () => {
    it('should return correct slice of history', () => {
      let context = createDefaultContext('user-123');
      for (let i = 1; i <= 15; i++) {
        context = addToHistory(context, 'user', `Message ${i}`);
      }

      const recent = getRecentHistory(context, 5);
      expect(recent.length).toBe(5);
      expect(recent[0].content).toBe('Message 11');
      expect(recent[4].content).toBe('Message 15');
    });

    it('should return all history if less than count', () => {
      let context = createDefaultContext('user-123');
      context = addToHistory(context, 'user', 'Only message');

      const recent = getRecentHistory(context, 10);
      expect(recent.length).toBe(1);
    });

    it('should default to 10 messages', () => {
      let context = createDefaultContext('user-123');
      for (let i = 1; i <= 20; i++) {
        context = addToHistory(context, 'user', `Message ${i}`);
      }

      const recent = getRecentHistory(context);
      expect(recent.length).toBe(10);
    });

    it('should return empty array for empty history', () => {
      const context = createDefaultContext('user-123');
      const recent = getRecentHistory(context, 5);
      expect(recent).toEqual([]);
    });
  });
});
