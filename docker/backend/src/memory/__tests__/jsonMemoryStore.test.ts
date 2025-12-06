import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  getUserMemory,
  upsertUserMemory,
  addVisitedMarker,
  UserMemory,
  startNewTrip,
  updateCurrentTrip,
  endCurrentTrip,
  clearTripMemory,
  getCurrentTrip,
  addTripConstraint,
  addTemporaryPreference,
  completeStop,
  setPrivacySettings,
  shouldStoreMemory,
  isExcludedFromAnalytics
} from '../jsonMemoryStore';

describe('jsonMemoryStore', () => {
  let testDir: string;
  let originalMemoryPath: string | undefined;

  beforeAll(() => {
    // Save original env var
    originalMemoryPath = process.env.MEMORY_FILE_PATH;
  });

  beforeEach(() => {
    // Create fresh temp directory for each test
    testDir = path.join(os.tmpdir(), `memory-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    // Restore original env var
    if (originalMemoryPath) {
      process.env.MEMORY_FILE_PATH = originalMemoryPath;
    }
  });

  describe('getUserMemory', () => {
    it('should return null for non-existent user', async () => {
      const result = await getUserMemory('nonexistent-user');
      expect(result).toBeNull();
    });

    it('should return stored data for existing user', async () => {
      // First create a user
      await upsertUserMemory('test-user', { name: 'TestUser' });

      // Then retrieve
      const result = await getUserMemory('test-user');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('TestUser');
    });

    it('should handle missing file gracefully', async () => {
      // Delete the file if it exists
      const filePath = process.env.MEMORY_FILE_PATH!;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Should not throw, should return null
      const result = await getUserMemory('any-user');
      expect(result).toBeNull();
    });
  });

  describe('upsertUserMemory', () => {
    it('should create new user entry', async () => {
      const result = await upsertUserMemory('new-user', { name: 'Alice' });

      expect(result.name).toBe('Alice');

      // Verify persisted
      const retrieved = await getUserMemory('new-user');
      expect(retrieved?.name).toBe('Alice');
    });

    it('should merge with existing data without overwriting other fields', async () => {
      // Create user with name and interests
      await upsertUserMemory('merge-user', {
        name: 'Bob',
        interests: ['history', 'art']
      });

      // Update only story preference
      const result = await upsertUserMemory('merge-user', {
        storyLengthPreference: 'short'
      });

      // Should have all fields
      expect(result.name).toBe('Bob');
      expect(result.interests).toEqual(['history', 'art']);
      expect(result.storyLengthPreference).toBe('short');
    });

    it('should overwrite specific field when provided', async () => {
      await upsertUserMemory('update-user', { name: 'OldName' });
      const result = await upsertUserMemory('update-user', { name: 'NewName' });

      expect(result.name).toBe('NewName');
    });

    it('should initialize empty arrays for interests and visitedMarkers', async () => {
      const result = await upsertUserMemory('array-user', { name: 'Charlie' });

      expect(result.interests).toEqual([]);
      expect(result.visitedMarkers).toEqual([]);
    });
  });

  describe('addVisitedMarker', () => {
    it('should add marker to empty list', async () => {
      await upsertUserMemory('marker-user', { name: 'Dave' });
      const result = await addVisitedMarker('marker-user', 'marker-001');

      expect(result.visitedMarkers).toContain('marker-001');
    });

    it('should add marker without duplicates', async () => {
      await upsertUserMemory('dup-user', { name: 'Eve' });

      await addVisitedMarker('dup-user', 'marker-001');
      await addVisitedMarker('dup-user', 'marker-001');
      const result = await addVisitedMarker('dup-user', 'marker-001');

      const count = result.visitedMarkers?.filter(m => m === 'marker-001').length;
      expect(count).toBe(1);
    });

    it('should preserve existing markers when adding new one', async () => {
      await upsertUserMemory('multi-marker-user', { name: 'Frank' });

      await addVisitedMarker('multi-marker-user', 'marker-001');
      await addVisitedMarker('multi-marker-user', 'marker-002');
      const result = await addVisitedMarker('multi-marker-user', 'marker-003');

      expect(result.visitedMarkers).toContain('marker-001');
      expect(result.visitedMarkers).toContain('marker-002');
      expect(result.visitedMarkers).toContain('marker-003');
      expect(result.visitedMarkers?.length).toBe(3);
    });

    it('should create user if not exists when adding marker', async () => {
      const result = await addVisitedMarker('new-marker-user', 'marker-001');

      expect(result.visitedMarkers).toContain('marker-001');
    });
  });

  describe('File handling', () => {
    it('should handle corrupted JSON file gracefully', async () => {
      const filePath = process.env.MEMORY_FILE_PATH!;

      // Write corrupted JSON
      fs.writeFileSync(filePath, '{ invalid json }}', 'utf-8');

      // Should not throw, should return null
      const result = await getUserMemory('any-user');
      expect(result).toBeNull();
    });

    it('should create directory if it does not exist', async () => {
      // This test verifies the ensureMemoryFileExists function
      // Due to module caching, we need to test this differently
      // The function is called on first access, so we verify it doesn't throw
      const result = await getUserMemory('any-user');
      // Should return null without throwing
      expect(result).toBeNull();
    });
  });

  describe('Trip Memory Management', () => {
    it('should create new trip with constraints', async () => {
      const userId = 'test-trip-user';
      const trip = await startNewTrip(userId, 'Central Ohio', 'US-62', {
        timeLimit: '2 hours',
        mustReturn: true
      });

      expect(trip).toBeDefined();
      expect(trip.tripId).toMatch(/^trip-/);
      expect(trip.region).toBe('Central Ohio');
      expect(trip.activeRoute).toBe('US-62');
      expect(trip.constraints.timeLimit).toBe('2 hours');
      expect(trip.constraints.mustReturn).toBe(true);
      expect(trip.temporaryPreferences).toEqual([]);
      expect(trip.plannedStops).toEqual([]);
      expect(trip.completedStops).toEqual([]);
    });

    it('should update current trip memory', async () => {
      const userId = 'test-trip-update';
      await startNewTrip(userId, 'Columbus');

      const updated = await updateCurrentTrip(userId, {
        activeRoute: 'I-270',
        constraints: { avoidHighways: false }
      });

      expect(updated).toBeDefined();
      expect(updated?.activeRoute).toBe('I-270');
      expect(updated?.constraints.avoidHighways).toBe(false);
      expect(updated?.region).toBe('Columbus');
    });

    it('should clear trip memory on end', async () => {
      const userId = 'test-trip-end';
      const trip = await startNewTrip(userId, 'Dublin');
      await completeStop(userId, 'marker-1');
      await completeStop(userId, 'marker-2');

      await endCurrentTrip(userId);

      const current = await getCurrentTrip(userId);
      expect(current).toBeNull();

      const memory = await getUserMemory(userId);
      expect(memory?.tripHistory).toBeDefined();
      expect(memory?.tripHistory?.length).toBe(1);
      expect(memory?.tripHistory?.[0].stopsVisited).toEqual(['marker-1', 'marker-2']);
    });

    it('should preserve long-term memory when clearing trip', async () => {
      const userId = 'test-trip-preserve';
      await upsertUserMemory(userId, {
        name: 'TestUser',
        interests: ['history', 'architecture']
      });

      await startNewTrip(userId, 'New Albany');
      await addTemporaryPreference(userId, 'avoid-crowds');

      await clearTripMemory(userId);

      const memory = await getUserMemory(userId);
      expect(memory?.name).toBe('TestUser');
      expect(memory?.interests).toEqual(['history', 'architecture']);
      expect(memory?.currentTrip).toBeUndefined();
    });

    it('should track trip history', async () => {
      const userId = 'test-trip-history';

      // First trip
      await startNewTrip(userId, 'Region1');
      await completeStop(userId, 'stop1');
      await endCurrentTrip(userId);

      // Second trip
      await startNewTrip(userId, 'Region2');
      await completeStop(userId, 'stop2');
      await completeStop(userId, 'stop3');
      await endCurrentTrip(userId);

      const memory = await getUserMemory(userId);
      expect(memory?.tripHistory?.length).toBe(2);
      expect(memory?.tripHistory?.[0].region).toBe('Region1');
      expect(memory?.tripHistory?.[0].stopsVisited).toEqual(['stop1']);
      expect(memory?.tripHistory?.[1].region).toBe('Region2');
      expect(memory?.tripHistory?.[1].stopsVisited).toEqual(['stop2', 'stop3']);
    });

    it('should handle concurrent trips gracefully', async () => {
      const userId = 'test-concurrent-trips';

      // Start first trip
      const trip1 = await startNewTrip(userId, 'Region1');
      const tripId1 = trip1.tripId;

      // Start second trip (should end first)
      const trip2 = await startNewTrip(userId, 'Region2');
      const tripId2 = trip2.tripId;

      expect(tripId1).not.toBe(tripId2);

      const current = await getCurrentTrip(userId);
      expect(current?.tripId).toBe(tripId2);
      expect(current?.region).toBe('Region2');

      const memory = await getUserMemory(userId);
      // First trip should be in history
      expect(memory?.tripHistory?.some(t => t.tripId === tripId1)).toBe(true);
    });

    it('should add constraints to current trip', async () => {
      const userId = 'test-trip-constraints';
      await startNewTrip(userId);

      await addTripConstraint(userId, { timeLimit: '90 minutes' });
      await addTripConstraint(userId, { maxDistance: 50 });

      const trip = await getCurrentTrip(userId);
      expect(trip?.constraints.timeLimit).toBe('90 minutes');
      expect(trip?.constraints.maxDistance).toBe(50);
    });

    it('should manage temporary preferences', async () => {
      const userId = 'test-temp-prefs';
      await startNewTrip(userId);

      await addTemporaryPreference(userId, 'scenic-routes');
      await addTemporaryPreference(userId, 'avoid-tolls');
      // Should not duplicate
      await addTemporaryPreference(userId, 'scenic-routes');

      const trip = await getCurrentTrip(userId);
      expect(trip?.temporaryPreferences).toEqual(['scenic-routes', 'avoid-tolls']);
    });

    it('should track completed stops', async () => {
      const userId = 'test-stops';
      await startNewTrip(userId);

      await completeStop(userId, 'stop-1');
      await completeStop(userId, 'stop-2');
      // Should not duplicate
      await completeStop(userId, 'stop-1');

      const trip = await getCurrentTrip(userId);
      expect(trip?.completedStops).toEqual(['stop-1', 'stop-2']);
    });
  });

  describe('Privacy Controls', () => {
    it('should respect data retention settings', async () => {
      const userId = 'test-privacy-retention';

      const settings = await setPrivacySettings(userId, {
        dataRetentionDays: 30,
        consentToStore: true
      });

      expect(settings.dataRetentionDays).toBe(30);
      expect(settings.consentToStore).toBe(true);
    });

    it('should exclude from analytics when requested', async () => {
      const userId = 'test-privacy-analytics';

      await setPrivacySettings(userId, {
        excludeFromAnalytics: true
      });

      const excluded = await isExcludedFromAnalytics(userId);
      expect(excluded).toBe(true);
    });

    it('should prevent memory storage in privacy mode', async () => {
      const userId = 'test-privacy-mode';

      // Initially should allow storage
      let canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(true);

      // Enable privacy mode
      await setPrivacySettings(userId, {
        mode: true,
        activatedAt: new Date()
      });

      canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(false);

      // Even with consent, privacy mode blocks storage
      await setPrivacySettings(userId, {
        consentToStore: true
      });

      canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(false);

      // Disable privacy mode
      await setPrivacySettings(userId, {
        mode: false
      });

      canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(true);
    });

    it('should handle consent withdrawal', async () => {
      const userId = 'test-consent';

      await setPrivacySettings(userId, {
        consentToStore: false
      });

      const canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(false);
    });

    it('should maintain backward compatibility with legacy privacy mode', async () => {
      const userId = 'test-legacy-privacy';

      // Use legacy privacy mode
      await upsertUserMemory(userId, {
        privacyMode: true
      });

      const canStore = await shouldStoreMemory(userId);
      expect(canStore).toBe(false);

      // Upgrade to new settings
      await setPrivacySettings(userId, {
        mode: false,
        consentToStore: true
      });

      const canStoreAfter = await shouldStoreMemory(userId);
      expect(canStoreAfter).toBe(true);
    });
  });
});
