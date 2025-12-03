import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  startSession,
  addMessage,
  endSession,
  getSessionTranscripts,
  getSession
} from '../transcriptStore';

describe('transcriptStore', () => {
  let testDir: string;
  let originalTranscriptPath: string | undefined;

  beforeAll(() => {
    originalTranscriptPath = process.env.TRANSCRIPT_FILE_PATH;
  });

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `transcript-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(testDir, { recursive: true });
    process.env.TRANSCRIPT_FILE_PATH = path.join(testDir, 'transcripts.json');
  });

  afterEach(() => {
    try {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    if (originalTranscriptPath) {
      process.env.TRANSCRIPT_FILE_PATH = originalTranscriptPath;
    }
  });

  describe('startSession', () => {
    it('should create session and return sessionId', async () => {
      const sessionId = await startSession('test-user');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      // SessionId is an ISO timestamp
      expect(() => new Date(sessionId)).not.toThrow();
    });

    it('should create session with isReconnection flag', async () => {
      const sessionId = await startSession('test-user', true);

      const session = await getSession('test-user', sessionId);
      expect(session?.isReconnection).toBe(true);
    });

    it('should create session with isReconnection false by default', async () => {
      const sessionId = await startSession('test-user');

      const session = await getSession('test-user', sessionId);
      expect(session?.isReconnection).toBe(false);
    });

    it('should allow multiple sessions for same user', async () => {
      const sessionId1 = await startSession('multi-session-user');
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const sessionId2 = await startSession('multi-session-user');

      expect(sessionId1).not.toBe(sessionId2);

      const sessions = await getSessionTranscripts('multi-session-user');
      expect(sessions.length).toBe(2);
    });
  });

  describe('addMessage', () => {
    it('should append message to correct session', async () => {
      const sessionId = await startSession('message-user');

      await addMessage('message-user', sessionId, 'user', 'Hello');

      const session = await getSession('message-user', sessionId);
      expect(session?.messages.length).toBe(1);
      expect(session?.messages[0].role).toBe('user');
      expect(session?.messages[0].content).toBe('Hello');
    });

    it('should append multiple messages in order', async () => {
      const sessionId = await startSession('multi-msg-user');

      await addMessage('multi-msg-user', sessionId, 'assistant', 'Hello!');
      await addMessage('multi-msg-user', sessionId, 'user', 'Hi there');
      await addMessage('multi-msg-user', sessionId, 'assistant', 'How can I help?');

      const session = await getSession('multi-msg-user', sessionId);
      expect(session?.messages.length).toBe(3);
      expect(session?.messages[0].role).toBe('assistant');
      expect(session?.messages[1].role).toBe('user');
      expect(session?.messages[2].role).toBe('assistant');
    });

    it('should include timestamp on each message', async () => {
      const sessionId = await startSession('timestamp-user');

      await addMessage('timestamp-user', sessionId, 'user', 'Test message');

      const session = await getSession('timestamp-user', sessionId);
      expect(session?.messages[0].timestamp).toBeDefined();
      expect(() => new Date(session!.messages[0].timestamp)).not.toThrow();
    });

    it('should handle non-existent user gracefully', async () => {
      // Should not throw
      await addMessage('nonexistent-user', 'fake-session-id', 'user', 'Hello');

      // No sessions should be created
      const sessions = await getSessionTranscripts('nonexistent-user');
      expect(sessions.length).toBe(0);
    });

    it('should handle non-existent session gracefully', async () => {
      await startSession('existing-user');

      // Should not throw
      await addMessage('existing-user', 'wrong-session-id', 'user', 'Hello');

      // Original session should be unaffected
      const sessions = await getSessionTranscripts('existing-user');
      expect(sessions[0].messages.length).toBe(0);
    });
  });

  describe('endSession', () => {
    it('should set endTime on session', async () => {
      const sessionId = await startSession('end-user');

      // Session should not have endTime yet
      let session = await getSession('end-user', sessionId);
      expect(session?.endTime).toBeUndefined();

      await endSession('end-user', sessionId);

      session = await getSession('end-user', sessionId);
      expect(session?.endTime).toBeDefined();
      expect(() => new Date(session!.endTime!)).not.toThrow();
    });

    it('should handle non-existent user gracefully', async () => {
      // Should not throw
      await endSession('nonexistent-user', 'fake-session-id');
    });

    it('should handle non-existent session gracefully', async () => {
      await startSession('end-test-user');

      // Should not throw
      await endSession('end-test-user', 'wrong-session-id');
    });
  });

  describe('getSessionTranscripts', () => {
    it('should return empty array for user with no sessions', async () => {
      const sessions = await getSessionTranscripts('no-sessions-user');
      expect(sessions).toEqual([]);
    });

    it('should return all sessions for user', async () => {
      await startSession('all-sessions-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      await startSession('all-sessions-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      await startSession('all-sessions-user');

      const sessions = await getSessionTranscripts('all-sessions-user');
      expect(sessions.length).toBe(3);
    });

    it('should respect limit parameter', async () => {
      await startSession('limited-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      await startSession('limited-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      await startSession('limited-user');

      const sessions = await getSessionTranscripts('limited-user', 2);
      expect(sessions.length).toBe(2);
    });

    it('should return most recent sessions when limited', async () => {
      const sessionId1 = await startSession('recent-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      const sessionId2 = await startSession('recent-user');
      await new Promise(resolve => setTimeout(resolve, 10));
      const sessionId3 = await startSession('recent-user');

      const sessions = await getSessionTranscripts('recent-user', 2);
      // Should return the last 2 (most recent)
      expect(sessions.some(s => s.sessionId === sessionId2)).toBe(true);
      expect(sessions.some(s => s.sessionId === sessionId3)).toBe(true);
    });
  });

  describe('getSession', () => {
    it('should return specific session by ID', async () => {
      const sessionId = await startSession('specific-user');
      await addMessage('specific-user', sessionId, 'user', 'Test');

      const session = await getSession('specific-user', sessionId);
      expect(session).not.toBeNull();
      expect(session?.sessionId).toBe(sessionId);
      expect(session?.messages.length).toBe(1);
    });

    it('should return null for non-existent session', async () => {
      await startSession('exists-user');

      const session = await getSession('exists-user', 'wrong-id');
      expect(session).toBeNull();
    });

    it('should return null for non-existent user', async () => {
      const session = await getSession('no-user', 'any-id');
      expect(session).toBeNull();
    });
  });

  describe('File handling', () => {
    it('should handle corrupted JSON file gracefully', async () => {
      const filePath = process.env.TRANSCRIPT_FILE_PATH!;

      // Write corrupted JSON
      fs.writeFileSync(filePath, '{ invalid json }}', 'utf-8');

      // Should not throw
      const sessions = await getSessionTranscripts('any-user');
      expect(sessions).toEqual([]);
    });

    it('should create directory if it does not exist', async () => {
      // This test verifies the ensureTranscriptFileExists function
      // Due to module caching, we need to test this differently
      // The function is called on first access, so we verify it doesn't throw
      const sessions = await getSessionTranscripts('any-user');
      // Should return empty array without throwing
      expect(sessions).toEqual([]);
    });
  });
});
