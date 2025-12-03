import fs from "fs";
import path from "path";

const TRANSCRIPT_FILE_PATH = process.env.TRANSCRIPT_FILE_PATH || "/app/rag-json/transcripts.json";

export type TranscriptMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
};

export type Session = {
  sessionId: string;
  startTime: string;
  endTime?: string;
  isReconnection: boolean;
  messages: TranscriptMessage[];
};

export type TranscriptDB = {
  sessions: Record<string, Session[]>; // userId -> array of sessions
};

function ensureTranscriptFileExists() {
  if (!fs.existsSync(TRANSCRIPT_FILE_PATH)) {
    const dir = path.dirname(TRANSCRIPT_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const initial: TranscriptDB = { sessions: {} };
    fs.writeFileSync(TRANSCRIPT_FILE_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function loadDB(): TranscriptDB {
  ensureTranscriptFileExists();
  try {
    const raw = fs.readFileSync(TRANSCRIPT_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.sessions) {
      return { sessions: {} };
    }
    return parsed as TranscriptDB;
  } catch (err) {
    // On any read/parse error, fall back to empty
    return { sessions: {} };
  }
}

function saveDB(db: TranscriptDB) {
  fs.writeFileSync(TRANSCRIPT_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
}

/**
 * Start a new session for a user
 * @returns sessionId
 */
export async function startSession(userId: string, isReconnection: boolean = false): Promise<string> {
  const db = loadDB();
  const sessionId = new Date().toISOString();

  if (!db.sessions[userId]) {
    db.sessions[userId] = [];
  }

  const newSession: Session = {
    sessionId,
    startTime: sessionId,
    isReconnection,
    messages: []
  };

  db.sessions[userId].push(newSession);
  saveDB(db);

  console.log(`Transcript: Started session ${sessionId} for user ${userId} (reconnection: ${isReconnection})`);
  return sessionId;
}

/**
 * Add a message to an existing session
 */
export async function addMessage(
  userId: string,
  sessionId: string,
  role: "user" | "assistant" | "system",
  content: string
): Promise<void> {
  const db = loadDB();

  if (!db.sessions[userId]) {
    console.warn(`Transcript: No sessions found for user ${userId}`);
    return;
  }

  const session = db.sessions[userId].find(s => s.sessionId === sessionId);
  if (!session) {
    console.warn(`Transcript: Session ${sessionId} not found for user ${userId}`);
    return;
  }

  const message: TranscriptMessage = {
    role,
    content,
    timestamp: new Date().toISOString()
  };

  session.messages.push(message);
  saveDB(db);

  console.log(`Transcript: Added ${role} message to session ${sessionId}`);
}

/**
 * End a session by setting the endTime
 */
export async function endSession(userId: string, sessionId: string): Promise<void> {
  const db = loadDB();

  if (!db.sessions[userId]) {
    console.warn(`Transcript: No sessions found for user ${userId}`);
    return;
  }

  const session = db.sessions[userId].find(s => s.sessionId === sessionId);
  if (!session) {
    console.warn(`Transcript: Session ${sessionId} not found for user ${userId}`);
    return;
  }

  session.endTime = new Date().toISOString();
  saveDB(db);

  console.log(`Transcript: Ended session ${sessionId} for user ${userId} with ${session.messages.length} messages`);
}

/**
 * Get all sessions for a user (optionally limited)
 */
export async function getSessionTranscripts(userId: string, limit?: number): Promise<Session[]> {
  const db = loadDB();
  const userSessions = db.sessions[userId] || [];

  if (limit && limit > 0) {
    return userSessions.slice(-limit);
  }

  return userSessions;
}

/**
 * Get a specific session by ID
 */
export async function getSession(userId: string, sessionId: string): Promise<Session | null> {
  const db = loadDB();

  if (!db.sessions[userId]) {
    return null;
  }

  return db.sessions[userId].find(s => s.sessionId === sessionId) || null;
}
