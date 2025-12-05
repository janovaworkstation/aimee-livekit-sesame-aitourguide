/**
 * AImee Personality Feature Tests
 *
 * Test-driven development based on updated /specs/features/aimee_personality.feature
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
  // SECTION 1: VOICE, WARMTH, AND CONSISTENCY
  // ============================================================
  describe('Section 1: Voice, Warmth, and Consistency', () => {

    /**
     * Scenario: Warm conversational response
     * Given the user asks a general travel-related question such as "Where are we right now?"
     * When AImee responds
     * Then the response should sound warm, friendly, and conversational
     * And the response should avoid robotic, formal, or academic language
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
     * Then the response should use short, clear sentences
     * And the pacing should sound like natural spoken conversation
     * And the response should avoid long or complex sentence structures
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

      // When: AImee responds
      const input = 'Tell me about this area';
      const result = await routeToAgent(input, context);

      // Then: Response should have natural pacing
      const judgeResult = await judge.judgeNaturalPacing(result.text);

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
  // SECTION 2: RESPONSE LENGTH, DRIVE CONTEXT, AND INVITATIONS
  // ============================================================
  describe('Section 2: Response Length, Drive Context, and Invitations', () => {

    /**
     * Scenario: Conciseness in driving context
     * Given the user is driving
     * When AImee responds
     * Then the response should be concise and under a safe word-count limit
     * And the sentences should be short and easy to follow
     * And AImee should end with a brief, natural invitation for more
     * And the invitation must not be overwhelming or lengthy
     */
    it('Scenario: Conciseness in driving context', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving
      const userId = `test-driving-concise-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' },
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: AImee responds
      const input = 'Tell me about this area';
      const result = await routeToAgent(input, context);

      // Then: Response should be concise for driving
      const judgeResult = await judge.judgeDrivingConciseness(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Required invitation after each answer
     * Given the user asks any question
     * When AImee responds
     * Then she must end with a natural invitation such as:
     * | invitation                          |
     * | "Want to know more?"                |
     * | "Would you like another nearby story?" |
     * And the invitation should match the tone and context of the conversation
     */
    it('Scenario: Required invitation after each answer', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks any question
      const userId = `test-invitation-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: AImee responds
      const input = 'What can you tell me about this place?';
      const result = await routeToAgent(input, context);

      // Then: Should end with a natural invitation
      const judgeResult = await judge.judgeRequiredInvitation(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Structured storytelling rules
     * Given AImee is explaining a historical marker or location
     * When AImee responds
     * Then the response should include:
     * | element             |
     * | a location anchor   |
     * | why it matters      |
     * | one interesting fact|
     * And AImee should end with an appropriate invitation
     * And if this is the first introduction of a nearby marker
     * Then AImee must end with the exact required question:
     * "Would you like the short version or the deeper story?"
     */
    it('Scenario: Structured storytelling rules', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: AImee is explaining a historical marker
      const userId = `test-structured-storytelling-${Date.now()}`;
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

      // When: AImee responds about a marker (first introduction)
      const input = '[SYSTEM: User approaching historical marker for first time]';
      const result = await routeToAgent(input, context);

      // Then: Response should follow structured storytelling
      const judgeResult = await judge.judgeEnhancedStructuredStorytelling(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 3: PERSONALITY BOUNDARIES AND DOMAIN CONSISTENCY
  // ============================================================
  describe('Section 3: Personality Boundaries and Domain Consistency', () => {

    /**
     * Scenario: Staying within domain unless user requests otherwise
     * Given the user is driving
     * And the user asks a question unrelated to travel, geography, or history
     * When AImee responds
     * Then she should give a short, safe acknowledgment
     * And she should gently redirect toward travel or exploration
     * And she must avoid acting as a general-purpose assistant
     */
    it('Scenario: Staying within domain unless user requests otherwise', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving and asks unrelated question
      const userId = `test-domain-boundaries-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' }
      });

      // When: User asks about cooking
      const input = 'Can you help me with a recipe for pasta?';
      const result = await routeToAgent(input, context);

      // Then: Should redirect to travel domain
      const judgeResult = await judge.judgeDomainBoundaries(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 4: HANDLING UNKNOWN INFORMATION
  // ============================================================
  describe('Section 4: Handling Unknown Information', () => {

    /**
     * Scenario: Graceful uncertainty
     * Given the user asks for obscure or unavailable information
     * When AImee determines she does not have exact details
     * Then she should briefly acknowledge uncertainty
     * And she should provide the closest relevant contextual information
     * And she must never fabricate precise facts
     * And she should end with a natural invitation such as "Want more detail?"
     */
    it('Scenario: Graceful uncertainty', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks for obscure/unavailable information
      const userId = `test-uncertainty-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: AImee determines she lacks exact details
      const input = 'What was the exact population of this town in 1847?';
      const result = await routeToAgent(input, context);

      // Then: Should handle uncertainty gracefully with invitation
      const judgeResult = await judge.judgeGracefulUncertaintyWithInvitation(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });
});
