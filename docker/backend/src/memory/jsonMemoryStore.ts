import fs from "fs";
import path from "path";

const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH || "/app/rag-json/memory.json";

export type UserMemory = {
  name?: string;
  storyLengthPreference?: "short" | "normal" | "deep";
  interests?: string[];
  visitedMarkers?: string[];
};

export type MemoryDB = {
  users: Record<string, UserMemory>;
};

function ensureMemoryFileExists() {
  if (!fs.existsSync(MEMORY_FILE_PATH)) {
    const dir = path.dirname(MEMORY_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const initial: MemoryDB = { users: {} };
    fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function loadDB(): MemoryDB {
  ensureMemoryFileExists();
  try {
    const raw = fs.readFileSync(MEMORY_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.users) {
      return { users: {} };
    }
    return parsed as MemoryDB;
  } catch (err) {
    // On any read/parse error, fall back to empty memory
    return { users: {} };
  }
}

function saveDB(db: MemoryDB) {
  fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function getUserMemory(userId: string): Promise<UserMemory | null> {
  const db = loadDB();
  return db.users[userId] || null;
}

export async function upsertUserMemory(
  userId: string,
  patch: Partial<UserMemory>
): Promise<UserMemory> {
  const db = loadDB();
  const current = db.users[userId] || {};
  const merged: UserMemory = {
    name: patch.name ?? current.name,
    storyLengthPreference: patch.storyLengthPreference ?? current.storyLengthPreference,
    interests: patch.interests ?? current.interests ?? [],
    visitedMarkers: patch.visitedMarkers ?? current.visitedMarkers ?? [],
  };

  db.users[userId] = merged;
  saveDB(db);
  return merged;
}

export async function addVisitedMarker(userId: string, markerId: string): Promise<UserMemory> {
  const db = loadDB();
  const current = db.users[userId] || {};
  const visited = new Set(current.visitedMarkers || []);
  visited.add(markerId);

  const updated: UserMemory = {
    ...current,
    visitedMarkers: Array.from(visited),
  };

  db.users[userId] = updated;
  saveDB(db);
  return updated;
}