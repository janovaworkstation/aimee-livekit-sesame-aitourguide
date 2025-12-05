/**
 * AImee Memory Feature Tests
 *
 * Test-driven development based on /specs/features/aimee_memory.feature
 * Uses LLM-as-Judge pattern to evaluate memory and personalization behaviors.
 *
 * Run with: RUN_LLM_TESTS=true npx jest --testPathPattern=aimeeMemory
 */

import { LLMJudge } from '../llmJudge';
import { routeToAgent } from '../../agents/agentRouter';
import { createDefaultContext, addToHistory, ConversationContext } from '../../agents/types';
import { upsertUserMemory, getUserMemory, addVisitedMarker } from '../../memory/jsonMemoryStore';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Skip these tests if no API key is available
const SKIP_LLM_TESTS = !process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-api-key';

describe('AImee Memory Feature Tests', () => {
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
    testDir = path.join(os.tmpdir(), `aimee-memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
  // SECTION 1: USER IDENTITY AND NAME MEMORY
  // ============================================================
  describe('Section 1: User Identity and Name Memory', () => {

    /**
     * Scenario: Storing user name on first session
     * Given there is no stored profile for the user
     * And the user greets AImee for the first time
     * When AImee asks "What should I call you?"
     * And the user says "Jeff"
     * Then AImee should store the name "Jeff" using the Memory Agent
     * And AImee should use "Jeff" in this session when addressing the user
     */
    it('Scenario: Storing user name on first session', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No stored profile for the user, user provides name
      const userId = `test-name-storage-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User provides name "Jeff"
      const input = 'Jeff';
      const result = await routeToAgent(input, context);

      // Then: Should store and use the name properly
      const judgeResult = await judge.judgeNameStorage(result.text, 'Jeff');

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);

      // Verify name was actually stored in memory
      const storedMemory = await getUserMemory(userId);
      expect(storedMemory?.name).toBe('Jeff');
    }, 60000);

    /**
     * Scenario: Greeting returning user by name
     * Given the user's name is stored as "Jeff"
     * And the user starts a new session
     * When AImee responds to the first greeting
     * Then AImee should greet the user by name
     * And AImee should not repeat the first-time onboarding explanation
     */
    it('Scenario: Greeting returning user by name', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User's name is stored as "Jeff"
      const userId = `test-returning-user-${Date.now()}`;
      await upsertUserMemory(userId, { name: 'Jeff' });

      const context = createDefaultContext(userId);

      // When: User starts a new session
      const input = '[SYSTEM: This is a reconnection for a returning user with stored name]';
      const result = await routeToAgent(input, context);

      // Then: Should greet by name without onboarding
      const judgeResult = await judge.judgeReturningUserGreeting(result.text, 'Jeff');

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Respecting user refusal to share a name
     * Given there is no stored profile for the user
     * And the user greets AImee for the first time
     * When AImee asks "What should I call you?"
     * And the user declines to give a name
     * Then AImee should accept the refusal gracefully
     * And AImee should not ask for the name again in this session
     * And AImee should continue normally without using a stored name
     */
    it('Scenario: Respecting user refusal to share a name', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: No stored profile, user declines to give name
      const userId = `test-name-refusal-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User declines to provide name
      const input = 'I prefer not to say';
      const result = await routeToAgent(input, context);

      // Then: Should respect refusal gracefully
      const judgeResult = await judge.judgeNameRefusalRespect(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 2: TRIP MEMORY VS LONG-TERM MEMORY
  // ============================================================
  describe('Section 2: Trip Memory vs Long-Term Memory', () => {

    /**
     * Scenario: Using trip memory within a session
     * Given the user is on a road trip with an active route
     * And the user tells AImee "We only have about two hours today"
     * When the user later asks "What else can we see today?"
     * Then AImee should use the two-hour constraint from trip memory
     * And AImee should suggest options that respect this time limit
     */
    it('Scenario: Using trip memory within a session', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User on road trip with time constraint in context
      const userId = `test-trip-memory-${Date.now()}`;
      const context = createDefaultContext(userId, {
        tourState: { mode: 'drive' },
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // Add trip context from earlier in session
      addToHistory(context, 'user', 'We only have about two hours today');
      addToHistory(context, 'assistant', 'Got it, I\'ll keep that in mind when suggesting stops.');

      // When: User asks for more suggestions
      const input = 'What else can we see today?';
      const result = await routeToAgent(input, context);

      // Then: Should respect time constraint from trip memory
      const judgeResult = await judge.judgeTripMemoryUsage(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Clearing trip memory between trips
     * Given the user completed a trip earlier today
     * And AImee stored trip-specific details for that route
     * When the user starts a new trip in a different region
     * Then AImee should not assume the previous route or stops are still active
     * And AImee should ask for or infer the new trip context instead
     */
    it('Scenario: Clearing trip memory between trips', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User starting new trip in different region
      const userId = `test-trip-clearing-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 34.0522, lng: -118.2437 } // Different location (LA vs NYC)
      });

      // When: User starts new trip
      const input = '[SYSTEM: User starting new trip in different region after completing previous trip earlier today]';
      const result = await routeToAgent(input, context);

      // Then: Should treat as fresh trip, not continuation
      const judgeResult = await judge.judgeTripMemoryClearing(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Preserving long-term preferences across trips
     * Given the user has previously preferred scenic overlooks over museums
     * And this preference is stored in long-term memory
     * When the user starts a new trip and asks "What should we see around here?"
     * Then AImee should gently bias suggestions toward scenic locations
     * And AImee should still respect any explicit request the user gives
     */
    it('Scenario: Preserving long-term preferences across trips', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User has stored preference for scenic overlooks
      const userId = `test-long-term-prefs-${Date.now()}`;
      await upsertUserMemory(userId, {
        interests: ['scenic overlooks', 'nature views'],
        name: 'Alex'
      });

      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks for suggestions on new trip
      const input = 'What should we see around here?';
      const result = await routeToAgent(input, context);

      // Then: Should bias toward scenic locations based on preferences
      const judgeResult = await judge.judgeLongTermPreferences(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 3: VISITED MARKERS AND HISTORY
  // ============================================================
  describe('Section 3: Visited Markers and History', () => {

    /**
     * Scenario: Logging a visited marker after departure
     * Given the user stops at a marker called "Old Depot"
     * And the user departs that location
     * When AImee processes the visit
     * Then AImee should mark "Old Depot" as visited in the user's history
     */
    it('Scenario: Logging a visited marker after departure', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User visited "Old Depot" and is now departing
      const userId = `test-marker-logging-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 },
        tourState: { currentMarkerId: 'old-depot', mode: 'drive' }
      });

      // When: Processing visit after departure
      const input = '[SYSTEM: User stopped at "Old Depot" marker and has now departed, processing the visit for logging]';
      const result = await routeToAgent(input, context);

      // Then: Should acknowledge visit logging
      const judgeResult = await judge.judgeMarkerLogging(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Avoiding repeat suggestions for recent visits
     * Given "Old Depot" is marked as visited for this user
     * And the user is driving near "Old Depot" again
     * When the user asks "What should we see nearby?"
     * Then AImee should not promote "Old Depot" as a primary new suggestion
     * And AImee may mention it only as a place they have already visited
     */
    it('Scenario: Avoiding repeat suggestions for recent visits', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: "Old Depot" is marked as visited
      const userId = `test-repeat-avoidance-${Date.now()}`;
      await upsertUserMemory(userId, { visitedMarkers: ['old-depot'] });

      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 },
        tourState: { mode: 'drive' }
      });

      // When: User asks for nearby suggestions
      const input = 'What should we see nearby?';
      const result = await routeToAgent(input, context);

      // Then: Should avoid suggesting already-visited location
      const judgeResult = await judge.judgeRepeatSuggestionAvoidance(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Never inventing visit history
     * Given "Old Depot" is not recorded as visited in the user's history
     * When the user asks "Have we been here before?"
     * Then AImee must not claim that the user has visited "Old Depot"
     * And AImee should say that she does not have a record of a visit
     */
    it('Scenario: Never inventing visit history', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: "Old Depot" is NOT in visit history
      const userId = `test-visit-honesty-${Date.now()}`;
      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User asks about previous visits
      const input = 'Have we been here before?';
      const result = await routeToAgent(input, context);

      // Then: Should not invent visit history
      const judgeResult = await judge.judgeVisitHistoryHonesty(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 4: PREFERENCE LEARNING AND PERSONALIZATION
  // ============================================================
  describe('Section 4: Preference Learning and Personalization', () => {

    /**
     * Scenario: Learning preferences from repeated choices
     * Given the user has chosen small towns and back roads several times
     * And these choices have been stored as preference signals
     * When the user asks "What kind of route would you suggest today?"
     * Then AImee should suggest a route that emphasizes small towns and back roads
     * And AImee should present it as a preference-based suggestion, not a rule
     */
    it('Scenario: Learning preferences from repeated choices', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User has preference for small towns and back roads
      const userId = `test-preference-learning-${Date.now()}`;
      await upsertUserMemory(userId, {
        interests: ['small towns', 'back roads', 'scenic routes'],
        name: 'Sam'
      });

      const context = createDefaultContext(userId);

      // When: User asks for route suggestions
      const input = 'What kind of route would you suggest today?';
      const result = await routeToAgent(input, context);

      // Then: Should suggest based on learned preferences
      const judgeResult = await judge.judgePreferenceLearning(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Personalization must not override explicit commands
     * Given the user has a stored preference for scenic routes
     * When the user says "Take us the fastest way to the interstate"
     * Then AImee must prioritize speed over scenic preferences
     * And AImee must not argue with or override the explicit request
     */
    it('Scenario: Personalization must not override explicit commands', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User has stored preference for scenic routes
      const userId = `test-explicit-override-${Date.now()}`;
      await upsertUserMemory(userId, {
        interests: ['scenic routes', 'overlooks'],
        name: 'Taylor'
      });

      const context = createDefaultContext(userId, {
        location: { lat: 40.7128, lng: -74.0060 }
      });

      // When: User explicitly requests fastest route
      const input = 'Take us the fastest way to the interstate';
      const result = await routeToAgent(input, context);

      // Then: Should prioritize explicit request over preferences
      const judgeResult = await judge.judgeExplicitOverride(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 5: PRIVACY AND NO-MEMORY MODE
  // ============================================================
  describe('Section 5: Privacy and No-Memory Mode', () => {

    /**
     * Scenario: Enabling privacy or no-memory mode
     * Given the user is concerned about stored data
     * When the user says "Do not remember anything I say today"
     * Then AImee should confirm that she will not update long-term memory
     * And AImee should limit storage to trip memory only for functionality
     */
    it('Scenario: Enabling privacy or no-memory mode', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User concerned about data storage
      const userId = `test-privacy-activation-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User requests privacy mode
      const input = 'Do not remember anything I say today';
      const result = await routeToAgent(input, context);

      // Then: Should confirm privacy mode activation
      const judgeResult = await judge.judgePrivacyModeActivation(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Behavior while privacy mode is active
     * Given privacy mode is active for this session
     * And the user shares preferences such as "We love lighthouses"
     * When the session ends
     * Then AImee must not store "We love lighthouses" in long-term memory
     * And AImee must not use that preference in future sessions
     */
    it('Scenario: Behavior while privacy mode is active', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Privacy mode is active
      const userId = `test-privacy-behavior-${Date.now()}`;
      const context = createDefaultContext(userId, {
        // Simulate privacy mode context
        preferences: { verbosity: 'medium', tone: 'conversational' }
      });

      // When: User shares preferences in privacy mode
      const input = 'We love lighthouses';
      const result = await routeToAgent(input, context);

      // Then: Should respect privacy mode limitations
      const judgeResult = await judge.judgePrivacyModeBehavior(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Disabling privacy or no-memory mode
     * Given privacy mode is currently active
     * When the user says "It is fine to remember my trips again"
     * Then AImee should confirm that long-term memory is re-enabled
     * And AImee may resume updating long-term preferences and history
     */
    it('Scenario: Disabling privacy or no-memory mode', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Privacy mode currently active
      const userId = `test-privacy-disabling-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User re-enables memory storage
      const input = 'It is fine to remember my trips again';
      const result = await routeToAgent(input, context);

      // Then: Should confirm memory re-enablement
      const judgeResult = await judge.judgePrivacyModeDisabling(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

  // ============================================================
  // SECTION 6: MEMORY UNCERTAINTY AND HONESTY
  // ============================================================
  describe('Section 6: Memory Uncertainty and Honesty', () => {

    /**
     * Scenario: Acknowledging missing memory gracefully
     * Given the user asks "Do you remember where we stopped last weekend?"
     * And there is no stored record for that specific stop
     * When AImee responds
     * Then she should say that she does not have that exact stop recorded
     * And she may offer to help rebuild the memory from the user's description
     * And she must not pretend to recall details that are not stored
     */
    it('Scenario: Acknowledging missing memory gracefully', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: User asks about missing memory
      const userId = `test-missing-memory-${Date.now()}`;
      const context = createDefaultContext(userId);

      // When: User asks about unrecorded stop
      const input = 'Do you remember where we stopped last weekend?';
      const result = await routeToAgent(input, context);

      // Then: Should acknowledge missing memory gracefully
      const judgeResult = await judge.judgeMissingMemoryGrace(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

    /**
     * Scenario: Avoiding overconfident personalization
     * Given AImee has partial or incomplete preference data
     * When the user asks "What do you think we like best?"
     * Then AImee should frame preferences as observations, not absolute facts
     * And she should avoid strong claims that are not clearly supported by memory
     */
    it('Scenario: Avoiding overconfident personalization', async () => {
      if (SKIP_LLM_TESTS) {
        console.log('Skipping LLM test - no API key');
        return;
      }

      // Given: Partial preference data
      const userId = `test-personalization-confidence-${Date.now()}`;
      await upsertUserMemory(userId, {
        interests: ['history'], // Limited data
        name: 'Chris'
      });

      const context = createDefaultContext(userId);

      // When: User asks for preference assessment
      const input = 'What do you think we like best?';
      const result = await routeToAgent(input, context);

      // Then: Should be appropriately cautious about claims
      const judgeResult = await judge.judgePersonalizationConfidence(result.text);

      expect(judgeResult.pass).toBe(true);
      expect(judgeResult.confidence).toBeGreaterThan(0.5);
    }, 60000);

  });

});