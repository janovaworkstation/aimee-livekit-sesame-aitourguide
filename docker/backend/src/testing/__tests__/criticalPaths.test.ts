/**
 * Critical Path Tests using LLM-as-Judge
 *
 * These tests use real LLM calls and should be run sparingly.
 * Run with: npm run test:llm
 *
 * Note: These tests require OPENAI_API_KEY to be set and will incur API costs.
 */

import { LLMJudge } from '../llmJudge';
import { assertJudgeResultWithDebug } from '../debugHelper';

// Skip these tests if no API key is available
const SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-api-key';

describe('Critical Path Tests (LLM-as-Judge)', () => {
  let judge: LLMJudge;

  beforeAll(() => {
    if (!SKIP_LLM_TESTS) {
      judge = new LLMJudge();
    }
  });

  describe('Greeting Quality', () => {
    it('should pass for a good first-time greeting', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const response = "Hello! I'm Amy, your AI tour guide assistant. I'm here to help you discover interesting places and stories wherever you go. What should I call you?";

      const result = await judge.judgeGreeting(response, false);

      assertJudgeResultWithDebug(result, 'Good first-time greeting', response, undefined, true);
      expect(result.pass).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 30000);

    it('should pass for a good returning user greeting', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const response = "Welcome back, Jeff! It's great to see you again. How can I help you explore today?";

      const result = await judge.judgeGreeting(response, true, 'Jeff');

      assertJudgeResultWithDebug(result, 'Good returning user greeting', response, undefined, true);
      expect(result.pass).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    }, 30000);

    it('should fail for a greeting that does not ask for name (first-time)', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const response = "Hello! I'm here to help you. Let me tell you about nearby attractions.";

      const result = await judge.judgeGreeting(response, false);

      assertJudgeResultWithDebug(result, 'Greeting without name request (should fail)', response);
      expect(result.pass).toBe(false);
    }, 30000);
  });

  describe('Name Capture Quality', () => {
    it('should pass for proper name acknowledgment', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const userInput = "My name is Sarah";
      const response = "Nice to meet you, Sarah! I'll remember that. How can I help you explore today?";

      const result = await judge.judgeNameCapture(userInput, response);

      assertJudgeResultWithDebug(result, 'Proper name acknowledgment', userInput, undefined, true);
      expect(result.pass).toBe(true);
    }, 30000);

    it('should fail if name is not acknowledged', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const userInput = "My name is Sarah";
      const response = "Great! What would you like to know about?";

      const result = await judge.judgeNameCapture(userInput, response);

      assertJudgeResultWithDebug(result, 'Name not acknowledged (should fail)', userInput);
      expect(result.pass).toBe(false);
    }, 30000);
  });

  describe('Reconnection Quality', () => {
    it('should pass for brief reconnection greeting', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const response = "Welcome back! How can I help you?";

      const result = await judge.judgeReconnection(response);

      assertJudgeResultWithDebug(result, 'Brief reconnection greeting', response, undefined, true);
      expect(result.pass).toBe(true);
    }, 30000);

    it('should fail for overly long reconnection greeting', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      const response = "Hello and welcome! I'm Amy, your AI tour guide assistant. I specialize in helping you discover interesting places, learn about local history, find great experiences, and remember your preferences. I noticed you were here before! Let me introduce myself again - I can help with navigation, historical information, local recommendations, and much more. What would you like to explore today?";

      const result = await judge.judgeReconnection(response);

      assertJudgeResultWithDebug(result, 'Overly long reconnection (should fail)', response);
      expect(result.pass).toBe(false);
    }, 30000);
  });
});

describe('LLMJudge Static Assertions', () => {
  describe('assertContains', () => {
    it('should return true when substring exists', () => {
      expect(LLMJudge.assertContains('Hello, Jeff!', 'Jeff')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(LLMJudge.assertContains('Hello, JEFF!', 'jeff')).toBe(true);
    });

    it('should return false when substring does not exist', () => {
      expect(LLMJudge.assertContains('Hello, Jeff!', 'Sarah')).toBe(false);
    });
  });

  describe('assertNotContains', () => {
    it('should return true when substring does not exist', () => {
      expect(LLMJudge.assertNotContains('Hello!', 'error')).toBe(true);
    });

    it('should return false when substring exists', () => {
      expect(LLMJudge.assertNotContains('There was an error', 'error')).toBe(false);
    });
  });

  describe('assertLengthBetween', () => {
    it('should return true when length is within range', () => {
      expect(LLMJudge.assertLengthBetween('Hello', 1, 10)).toBe(true);
    });

    it('should return false when length is below range', () => {
      expect(LLMJudge.assertLengthBetween('Hi', 5, 10)).toBe(false);
    });

    it('should return false when length is above range', () => {
      expect(LLMJudge.assertLengthBetween('Hello World!', 1, 5)).toBe(false);
    });
  });

  describe('assertWordCountBetween', () => {
    it('should return true when word count is within range', () => {
      expect(LLMJudge.assertWordCountBetween('Hello there friend', 2, 5)).toBe(true);
    });

    it('should return false when word count is below range', () => {
      expect(LLMJudge.assertWordCountBetween('Hi', 3, 10)).toBe(false);
    });

    it('should return false when word count is above range', () => {
      expect(LLMJudge.assertWordCountBetween('This is a very long sentence with many words', 1, 3)).toBe(false);
    });
  });
});
