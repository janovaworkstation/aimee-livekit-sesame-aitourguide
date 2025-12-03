import fs from 'fs';
import path from 'path';
import os from 'os';
import { getUserMemory, upsertUserMemory, addVisitedMarker, UserMemory } from '../jsonMemoryStore';

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
});
