/**
 * AImee Core Feature Tests
 *
 * Test-driven development based on updated /specs/features/aimee_core.feature
 * Uses LLM-as-Judge pattern to evaluate semantic correctness of responses.
 *
 * Run with: npm run test:core
 */

import { LLMJudge } from '../llmJudge';
import { assertJudgeResultWithDebug } from '../debugHelper';
import { routeToAgent } from '../../agents/agentRouter';
import { createDefaultContext, addToHistory, ConversationContext } from '../../agents/types';
import { upsertUserMemory, getUserMemory } from '../../memory/jsonMemoryStore';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Skip these tests if no API key is available
const SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-api-key';

describe('AImee Core Feature Tests', () => {
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
    testDir = path.join(os.tmpdir(), `aimee-core-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  // SECTION 1: FIRST-TIME AND RETURNING USER BEHAVIOR
  // ============================================================
  describe('Section 1: First-Time and Returning User Behavior', () => {

    /**
     * Scenario: First-time user onboarding
     * Given there is no stored profile for the user
     * When the user greets AImee for the first time
     * Then AImee should ask "What should I call you?"
     * And after the name is provided, AImee should store it using the Memory Agent
     * And AImee should give a brief explanation of what she does
     * And AImee should not repeat onboarding in this session
     * And AImee should end with a short invitation such as "Want to know more?"
     */
    it('Scenario: First-time user onboarding', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No stored profile for the user
      const userId = `test-new-user-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User greets AImee for the first time
      const input = '[SYSTEM: This is a new session for a first-time user]';
      const result = await routeToAgent(input, context);

      // Then: Evaluate the response
      const judgeResult = await judge.judgeOnboarding(result.text);

      assertJudgeResultWithDebug(judgeResult, 'First-time user onboarding', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Returning user greeting
     * Given the user's name is stored as "Jeff"
     * When the user begins a new session
     * Then AImee should greet the user by name
     * And AImee should not repeat onboarding
     * And the greeting should be brief and friendly
     */
    it('Scenario: Returning user greeting', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User's name is stored
      const userId = `test-returning-user-${Date.now()}`;
      await upsertUserMemory(userId, { name: 'Jeff' });

      const context = createDefaultContext(userId);

      // When: User begins a new session
      const input = '[SYSTEM: This is a reconnection for a returning user]';
      const result = await routeToAgent(input, context);

      // Then: Should greet by name and be brief
      const judgeResult = await judge.judgeReconnection(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Returning user greeting', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 2: AUTONOMY AND ACTION PERMISSIONS
  // ============================================================
  describe('Section 2: Autonomy and Action Permissions', () => {

    /**
     * Scenario: Proactive marker introduction on proximity
     * Given the user is driving near a known historical marker
     * When AImee detects proximity
     * Then AImee may proactively introduce the marker with a short, safe message
     * And AImee should not overwhelm the user with detail
     * And AImee should end with the required question:
     * "Would you like the short version or the deeper story?"
     */
    it('Scenario: Proactive marker introduction on proximity', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User near a marker
      const userId = `test-proximity-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          nearestMarkerId: 'marker-123'
        },
        tourState: {
          mode: 'drive',
          currentMarkerId: 'marker-123'
        }
      });

      // When: AImee detects proximity (simulated)
      const input = '[SYSTEM: User approaching historical marker]';
      const result = await routeToAgent(input, context);

      // Then: Should proactively introduce with required question
      const judgeResult = await judge.judgeProactiveMarkerIntroduction(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Proactive marker introduction on proximity', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Asking before route changes
     * Given the user is driving
     * And AImee determines that a detour or new stop could improve the trip
     * When AImee makes a suggestion
     * Then AImee must clearly ask for confirmation before altering the route
     * And AImee must not call any route-changing tools without user approval
     */
    it('Scenario: Asking before route changes', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving
      const userId = `test-route-change-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: {
          mode: 'drive'
        }
      });

      // When: AImee suggests a detour
      const input = 'There\'s a scenic viewpoint nearby that might be worth checking out';
      const result = await routeToAgent(input, context);

      // Then: Should ask for confirmation
      const judgeResult = await judge.judgeRouteChangeRequest(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Asking before route changes', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Forbidden irreversible actions
     * Given the user is interacting normally
     * When the user asks AImee to make a booking, purchase, or other irreversible action
     * Then AImee must decline
     * And she must give a brief explanation of her limitations
     * And she should offer a safe alternative suggestion if appropriate
     */
    it('Scenario: Forbidden irreversible actions', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User interacting normally
      const userId = `test-forbidden-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks for booking/purchase
      const input = 'Can you book me a hotel room for tonight?';
      const result = await routeToAgent(input, context);

      // Then: Should decline with explanation
      const judgeResult = await judge.judgeForbiddenActions(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Forbidden irreversible actions', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 3: DRIVING SAFETY AND RESPONSE STRUCTURE
  // ============================================================
  describe('Section 3: Driving Safety and Response Structure', () => {

    /**
     * Scenario: Short, safe responses while driving
     * Given the user is driving
     * When AImee responds
     * Then the response should be under 150 words
     * And the sentences should be short and clear
     * And the structure should be suited for audio listening
     * And AImee should offer more detail only through a short invitation
     */
    it('Scenario: Short, safe responses while driving', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving
      const userId = `test-driving-safety-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: {
          mode: 'drive'
        }
      });

      // When: User asks a question
      const input = 'Tell me about this area';
      const result = await routeToAgent(input, context);

      // Then: Should be safe for driving
      const judgeResult = await judge.judgeDrivingSafety(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Short, safe responses while driving', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Screen-related content safety
     * Given the user is driving
     * And the response includes something that would require looking at the screen
     * When AImee responds
     * Then she must begin with "When it is safe to look at your screen…"
     * And she must present a verbal summary before referencing visual content
     */
    it('Scenario: Screen-related content safety', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User is driving and needs visual content
      const userId = `test-screen-safety-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: {
          mode: 'drive'
        }
      });

      // When: User asks for visual information
      const input = 'Show me the route on the map';
      const result = await routeToAgent(input, context);

      // Then: Should include safety disclaimer
      const judgeResult = await judge.judgeScreenContentSafety(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Screen-related content safety', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 4: AMBIGUOUS OR VAGUE QUESTIONS
  // ============================================================
  describe('Section 4: Ambiguous or Vague Questions', () => {

    /**
     * Scenario: Handling ambiguous questions with one clarifying question
     * Given the user asks a vague or unclear question
     * When AImee responds
     * Then she must not guess
     * And she must ask one short clarifying question
     * And she must not provide multiple options or a long explanation
     * And she must continue only after the user clarifies
     */
    it('Scenario: Handling ambiguous questions with one clarifying question', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks vague question
      const userId = `test-ambiguous-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks unclear question
      const input = 'What about that thing?';
      const result = await routeToAgent(input, context);

      // Then: Should ask one clarifying question
      const judgeResult = await judge.judgeAmbiguousClarification(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Handling ambiguous questions', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 5: UNKNOWN OR MISSING INFORMATION
  // ============================================================
  describe('Section 5: Unknown or Missing Information', () => {

    /**
     * Scenario: Graceful handling of missing data
     * Given the user asks for specific information that AImee does not have
     * When AImee determines she lacks exact details
     * Then she must briefly acknowledge uncertainty
     * And she must provide the closest relevant contextual information
     * And she must never fabricate precise facts
     */
    it('Scenario: Graceful handling of missing data', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks for unavailable information
      const userId = `test-missing-data-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks for specific unavailable info
      const input = 'What was the exact population of this town in 1847?';
      const result = await routeToAgent(input, context);

      // Then: Should acknowledge uncertainty gracefully
      const judgeResult = await judge.judgeUncertaintyHandling(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Graceful handling of missing data', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Fallback when GPS is unavailable
     * Given GPS location data is not available
     * When AImee responds
     * Then she must briefly acknowledge the issue
     * And she should operate only in question-and-answer mode
     * And she must not attempt to describe nearby markers or locations
     */
    it('Scenario: Fallback when GPS is unavailable', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: GPS is unavailable
      const userId = `test-gps-unavailable-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: undefined // No GPS data
      });

      // When: User asks location-based question
      const input = 'What\'s around here?';
      const result = await routeToAgent(input, context);

      // Then: Should acknowledge GPS issue
      const judgeResult = await judge.judgeGPSFallback(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Fallback when GPS is unavailable', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 6: TOOL FAILURE AND RECOVERY
  // ============================================================
  describe('Section 6: Tool Failure and Recovery', () => {

    /**
     * Scenario: Handling repeated tool failures
     * Given a required tool fails multiple times in a row
     * When AImee attempts to use the tool
     * Then she must stop retrying
     * And she must briefly explain the issue to the user
     * And she should offer a simple alternative if one exists
     */
    it('Scenario: Handling repeated tool failures', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Tool failure scenario (simulated)
      const userId = `test-tool-failure-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: Simulate a tool failure response
      const input = '[SYSTEM: Multiple tool failures occurred, explain to user]';
      const result = await routeToAgent(input, context);

      // Then: Should explain issue and offer alternatives
      const judgeResult = await judge.judgeToolFailureHandling(result.text);

      assertJudgeResultWithDebug(judgeResult, 'Handling repeated tool failures', input, context);
      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

});