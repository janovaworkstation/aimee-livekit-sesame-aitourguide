/**
 * AImee Core Feature Tests
 *
 * Test-driven development based on /specs/features/aimee_core.feature
 * Uses LLM-as-Judge pattern to evaluate semantic correctness of responses.
 *
 * Run with: npm run test:llm
 */

import { LLMJudge } from '../llmJudge';
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
  // SECTION 1: FIRST-TIME USER EXPERIENCE
  // ============================================================
  describe('Section 1: First-Time User Experience', () => {

    /**
     * Scenario: First-time user onboarding
     * Given AImee has no stored profile for the user
     * When the user greets AImee (e.g., "Hi", "Hello", "Hey there")
     * Then AImee should ask the user what she should call them
     * And AImee should give a brief, friendly explanation of what she does
     * And AImee should explain how the user can interact with her
     * And AImee should not repeat onboarding during future sessions
     * And AImee must keep the onboarding concise for in-car listening
     */
    it('Scenario: First-time user onboarding', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No stored profile for the user
      const userId = `test-new-user-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User greets AImee (simulated via session start)
      const input = '[SYSTEM: This is a new session for a first-time user]';
      const result = await routeToAgent(input, context);

      // Then: Evaluate the response
      const judgeResult = await judge.judgeOnboarding(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: First-time user declines to give a name
     * Given AImee has no stored profile for the user
     * And the user declines to provide a preferred name
     * When AImee continues the conversation
     * Then AImee should proceed without personalization
     * And AImee should not repeatedly ask for the name
     * And AImee should continue offering guidance normally
     */
    it('Scenario: First-time user declines to give a name', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No stored profile, user declines name
      const userId = `test-no-name-${Date.now()}`;
      let context = createDefaultContext(userId);

      // Simulate prior conversation where AImee asked for name
      context = addToHistory(context, 'assistant', "Hello! I'm Amy, your AI tour guide. What should I call you?");
      context = addToHistory(context, 'user', "I'd rather not say");

      // When: Continue the conversation
      const input = "What's interesting around here?";
      const result = await routeToAgent(input, context);

      // Then: Should proceed without asking for name again
      const judgeResult = await judge.judgeNameDeclineHandling(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 2: RETURNING USER EXPERIENCE
  // ============================================================
  describe('Section 2: Returning User Experience', () => {

    /**
     * Scenario: Greeting a returning user
     * Given AImee has stored the user name "Jeff"
     * And this is not the user's first session
     * When the user greets AImee
     * Then AImee should greet the user as "Jeff"
     * And AImee should keep the greeting brief and warm
     * And AImee should not repeat onboarding
     */
    it('Scenario: Greeting a returning user', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Stored name "Jeff"
      const userId = `test-returning-${Date.now()}`;
      await upsertUserMemory(userId, { name: 'Jeff' });

      const context = createDefaultContext(userId);

      // When: User starts new session
      const input = '[SYSTEM: This is a new session for a returning user]';
      const result = await routeToAgent(input, context);

      // Then: Should greet by name, be brief, no onboarding
      const judgeResult = await judge.judgeReturningGreeting(result.text, 'Jeff');

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Referencing past preferences (high level)
     * Given the user previously interacted with AImee
     * And AImee has stored lightweight preferences (e.g., short vs deeper stories)
     * When the user engages again
     * Then AImee may optionally adapt responses using those preferences
     * And AImee must do so subtly and without sounding robotic
     */
    it('Scenario: Referencing past preferences', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User with stored preferences
      const userId = `test-prefs-${Date.now()}`;
      await upsertUserMemory(userId, {
        name: 'Sarah',
        storyLengthPreference: 'short',
        interests: ['architecture', 'food']
      });

      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 },
        preferences: { verbosity: 'short' }  // Pass preference in context
      });

      // When: User asks about a place
      const input = 'Tell me about this area';
      const result = await routeToAgent(input, context);

      // Then: Response should adapt to preferences subtly
      const judgeResult = await judge.judgePreferenceAdaptation(result.text, 'short');

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 3: DRIVING SAFETY & ATTENTION RULES
  // ============================================================
  describe('Section 3: Driving Safety & Attention Rules', () => {

    /**
     * Scenario: Visual content requires a safety disclaimer
     * Given the user is in a driving context
     * And the answer would require looking at the screen or reading text
     * When AImee provides the information
     * Then AImee must begin with "When it's safe to look at your screen…"
     * And AImee must never instruct the user to interact with the phone while driving
     */
    it('Scenario: Visual content requires a safety disclaimer', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Driving context
      const userId = `test-safety-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' }
      });

      // When: User asks for something visual
      const input = 'Can you show me a map of nearby restaurants?';
      const result = await routeToAgent(input, context);

      // Then: Should include safety disclaimer
      const judgeResult = await judge.judgeSafetyDisclaimer(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Avoiding long, complex explanations while driving
     * Given the user is driving
     * When AImee responds
     * Then the response should remain concise and easy to follow
     * And AImee should offer extended detail only if the user asks for it
     */
    it('Scenario: Avoiding long explanations while driving', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Driving context
      const userId = `test-concise-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' },
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks about the area
      const input = 'Tell me about the history of this region';
      const result = await routeToAgent(input, context);

      // Then: Response should be concise
      const judgeResult = await judge.judgeDrivingConciseness(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 4: NEARBY MARKERS & STORYTELLING LOGIC
  // ============================================================
  describe('Section 4: Nearby Markers & Storytelling Logic', () => {

    /**
     * Scenario: Notifying a user about a nearby historical marker
     * Given the user is near a historical marker within the configured radius
     * And the user is not overwhelmed with interruptions
     * When the marker becomes relevant
     * Then AImee should introduce the marker briefly and naturally
     * And AImee should explain why the location matters
     * And AImee should ask whether the user wants the short version or the deeper story
     */
    it('Scenario: Notifying about nearby historical marker', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User near a marker
      const userId = `test-marker-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          nearestMarkerId: 'marker-123'
        },
        tourState: {
          currentMarkerId: 'marker-123',
          mode: 'drive'
        }
      });

      // When: User asks what's nearby
      const input = "What's interesting near me?";
      const result = await routeToAgent(input, context);

      // Then: Should introduce marker and offer short/deep choice
      const judgeResult = await judge.judgeMarkerIntroduction(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Marker introduction should not overwhelm the user
     * Given multiple markers are nearby
     * When AImee speaks
     * Then AImee should prioritize the most significant or closest marker
     * And AImee should avoid listing too many markers at once
     * And AImee may offer to explore others afterward
     */
    it('Scenario: Marker introduction should not overwhelm', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Multiple markers nearby (simulated in prompt)
      const userId = `test-multi-marker-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: {
          lat: 40.7128,
          lng: -74.0060,
          nearestMarkerId: 'marker-main'
        },
        metadata: {
          nearbyMarkers: ['marker-main', 'marker-2', 'marker-3', 'marker-4']
        }
      });

      // When: User asks what's around (include context about multiple markers in input)
      const input = "What historical sites are around here? [CONTEXT: There are multiple historical markers nearby: Old Town Hall, Revolutionary War Memorial, Historic Church, Founder's Monument]";
      const result = await routeToAgent(input, context);

      // Then: Should focus on most relevant, not list all
      const judgeResult = await judge.judgeMarkerPrioritization(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: No markers nearby
     * Given the user is in an area without historical markers in range
     * When the user asks "What's around here?" or similar
     * Then AImee should shift to nearby towns, parks, landmarks, or regional context
     * And AImee should keep the explanation brief unless the user requests more
     */
    it('Scenario: No markers nearby', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No markers nearby
      const userId = `test-no-markers-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: {
          lat: 40.7128,
          lng: -74.0060
          // No nearestMarkerId
        }
      });

      // When: User asks what's around
      const input = "What's around here?";
      const result = await routeToAgent(input, context);

      // Then: Should shift to regional context
      const judgeResult = await judge.judgeNoMarkersResponse(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });

  // ============================================================
  // SECTION 5: CONVERSATIONAL RULES
  // ============================================================
  describe('Section 5: Conversational Rules', () => {

    /**
     * Scenario: Handling interruptions naturally
     * Given the user interrupts AImee mid-story
     * When the interruption occurs
     * Then AImee should gracefully pause
     * And AImee should immediately shift to the user's new request
     * And AImee should not insist on finishing her previous sentence
     */
    it('Scenario: Handling interruptions naturally', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Mid-story conversation (simulated via history)
      const userId = `test-interrupt-${Date.now()}`;
      let context = createDefaultContext(userId);

      // Simulate AImee telling a story
      context = addToHistory(context, 'user', "Tell me about the Civil War history here");
      context = addToHistory(context, 'assistant', "This area has a fascinating Civil War history. In 1863, there was a significant battle here that changed the course of—");

      // When: User interrupts with new request
      const input = "Actually, where's the nearest bathroom?";
      const result = await routeToAgent(input, context);

      // Then: Should shift to new request without insisting on finishing
      const judgeResult = await judge.judgeInterruptionHandling(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Handling ambiguous questions
     * Given the user asks a vague or unclear question
     * When AImee responds
     * Then AImee should ask a short clarifying question
     * And avoid overwhelming the user with options
     */
    it('Scenario: Handling ambiguous questions', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Vague context
      const userId = `test-ambiguous-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks vague question
      const input = "What about that thing you mentioned?";
      const result = await routeToAgent(input, context);

      // Then: Should ask clarifying question without overwhelming
      const judgeResult = await judge.judgeClarificationRequest(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Handling unknown information
     * Given the user asks a highly obscure question
     * And the information is not available
     * When AImee responds
     * Then AImee should briefly acknowledge uncertainty
     * And offer the closest relevant historical or travel insight
     * And avoid making up precise facts
     */
    it('Scenario: Handling unknown information', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Obscure question
      const userId = `test-unknown-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks obscure question
      const input = "Who was the 47th person to cross the bridge here in 1847?";
      const result = await routeToAgent(input, context);

      // Then: Should acknowledge uncertainty and offer related insight
      const judgeResult = await judge.judgeUncertaintyHandling(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);
  });
});
