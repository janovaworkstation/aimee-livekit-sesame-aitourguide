/**
 * AImee Personality Feature Tests
 *
 * Test-driven development based on /specs/features/aimee_personality.feature
 * Uses LLM-as-Judge pattern to evaluate semantic correctness of responses.
 *
 * Run with: RUN_LLM_TESTS=true npx jest --testPathPattern=aimeePersonality
 */

import { LLMJudge } from '../llmJudge';
import { routeToAgent } from '../../agents/agentRouter';
import { createDefaultContext, addToHistory } from '../../agents/types';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Skip these tests if no API key is available
const SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-api-key';

describe('AImee Personality Feature Tests', () => {
  let judge: LLMJudge;
  let testDir: string;
  let originalMemoryPath: string | undefined;

  beforeAll(() => {
    if (!SKIP_LLM_TESTS) {
      judge = new LLMJudge();
    }
    // Save original memory path
    originalMemoryPath = process.env.MEMORY_FILE_PATH;
  });

  beforeEach(() => {
    // Create isolated test directory for memory
    testDir = path.join(os.tmpdir(), `aimee-personality-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    process.env.MEMORY_FILE_PATH = path.join(testDir, 'memory.json');
  });

  afterEach(() => {
    // Clean up test directory
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    // Restore original memory path
    if (originalMemoryPath !== undefined) {
      process.env.MEMORY_FILE_PATH = originalMemoryPath;
    } else {
      delete process.env.MEMORY_FILE_PATH;
    }
  });

  // ============================================================
  // SECTION 1: VOICE, WARMTH & CONSISTENCY
  // ============================================================
  describe('Section 1: Voice, Warmth & Consistency', () => {

    /**
     * Scenario: Warm conversational response
     * Given the user asks a general travel-question such as "Where are we right now?"
     * When AImee responds
     * Then the response should sound warm, friendly, and conversational
     * And the response should avoid robotic or overly formal language
     * And the tone should be suitable for in-car listening
     */
    it('Scenario: Warm conversational response', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks a general travel question
      const userId = `test-warm-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks where they are
      const input = 'Where are we right now?';
      const result = await routeToAgent(input, context);

      // Then: Response should be warm and conversational
      const judgeResult = await judge.judgeWarmConversational(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Natural human pacing and clarity
     * Given the user is driving
     * When AImee responds
     * Then the response should have short, clear sentences
     * And the pacing should sound like natural spoken conversation
     */
    it('Scenario: Natural human pacing and clarity', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving
      const userId = `test-pacing-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' },
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks about the area
      const input = 'Tell me about this area';
      const result = await routeToAgent(input, context);

      // Then: Response should have natural pacing
      console.log(`[PACING TEST] Response: "${result.text.substring(0, 400)}..."`);
      const judgeResult = await judge.judgeNaturalPacing(result.text);
      console.log(`[PACING TEST] Judge: pass=${judgeResult.pass}, reasoning="${judgeResult.reasoning}"`);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Name pronunciation consistency
     * Given AImee introduces herself by name
     * When speaking aloud
     * Then she must always pronounce her name as "Amy"
     * And she must never spell her name letter-by-letter
     */
    it('Scenario: Name pronunciation consistency', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: First-time user session where AImee introduces herself
      const userId = `test-name-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: Session starts (AImee introduces herself)
      const input = '[SYSTEM: This is a new session for a first-time user]';
      const result = await routeToAgent(input, context);

      // Then: Name should be pronounced as "Amy", not spelled out
      console.log(`[NAME TEST] Response: "${result.text.substring(0, 300)}..."`);
      const judgeResult = await judge.judgeNamePronunciation(result.text);
      console.log(`[NAME TEST] Judge: pass=${judgeResult.pass}, reasoning="${judgeResult.reasoning}"`);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 2: RESPONSE LENGTH AND STRUCTURE
  // ============================================================
  describe('Section 2: Response Length and Structure', () => {

    /**
     * Scenario: Default conciseness unless asked for more
     * Given the user asks a question that does not require deep detail
     * When AImee responds
     * Then the response should be concise and structured for audio
     * And AImee should offer more detail only if the user requests it
     */
    it('Scenario: Default conciseness unless asked for more', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks a simple question
      const userId = `test-concise-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks what's nearby
      const input = "What's nearby?";
      const result = await routeToAgent(input, context);

      // Then: Response should be concise
      const wordCount = result.text.split(/\s+/).filter((w: string) => w.length > 0).length;
      console.log(`[CONCISE TEST] Response (${wordCount} words): "${result.text.substring(0, 400)}..."`);
      const judgeResult = await judge.judgeDefaultConciseness(result.text);
      console.log(`[CONCISE TEST] Judge: pass=${judgeResult.pass}, reasoning="${judgeResult.reasoning}"`);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Structured storytelling
     * Given AImee is explaining a historical marker or location
     * When AImee responds
     * Then the response should include:
     *   - a location anchor
     *   - why it matters
     *   - one interesting fact
     * And AImee should end with a natural invitation such as:
     *   - "Want more detail?"
     *   - "Would you like another story?"
     */
    it('Scenario: Structured storytelling', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User near a historical marker
      const userId = `test-storytelling-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          nearestMarkerId: 'marker-historic-site'
        },
        tourState: {
          currentMarkerId: 'marker-historic-site',
          mode: 'drive'
        }
      });

      // When: User asks about the marker
      const input = 'Tell me about this marker';
      const result = await routeToAgent(input, context);

      // Then: Response should follow storytelling structure
      console.log(`[STORYTELLING TEST] Response: "${result.text.substring(0, 400)}..."`);
      const judgeResult = await judge.judgeStructuredStorytelling(result.text);
      console.log(`[STORYTELLING TEST] Judge: pass=${judgeResult.pass}, reasoning="${judgeResult.reasoning}"`);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 3: HANDLING UNKNOWN INFORMATION
  // ============================================================
  describe('Section 3: Handling Unknown Information', () => {

    /**
     * Scenario: Graceful uncertainty
     * Given the user asks for obscure or unavailable information
     * When AImee determines she does not have exact details
     * Then AImee should briefly acknowledge uncertainty
     * And AImee should provide the closest relevant context
     * And AImee should never fabricate precise facts
     */
    it('Scenario: Graceful uncertainty', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks an obscure question
      const userId = `test-uncertainty-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks for unavailable information
      const input = 'Who built this bridge in 1847 and what was the exact cost?';
      const result = await routeToAgent(input, context);

      // Then: Response should handle uncertainty gracefully
      const judgeResult = await judge.judgeGracefulUncertainty(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });
});
