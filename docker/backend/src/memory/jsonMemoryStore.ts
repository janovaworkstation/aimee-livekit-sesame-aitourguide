import fs from "fs";
import path from "path";

const MEMORY_FILE_PATH = process.env.MEMORY_FILE_PATH || "/app/rag-json/memory.json";

export type VisitedMarker = {
  markerId: string;
  visitedAt: Date;
  notes?: string;
};

export type RoutePreference = {
  type: "scenic" | "fast" | "small-towns" | "back-roads";
  confidence: "low" | "medium" | "high"; // How sure we are about this preference
  lastUpdated: Date;
};

export type UserMemory = {
  // User identity
  name?: string;

  // Content preferences
  storyLengthPreference?: "short" | "normal" | "deep";
  interests?: string[];

  // Route and travel preferences
  routePreferences?: RoutePreference[];

  // Visit history with timestamps
  visitedMarkers?: string[]; // Keep for backward compatibility
  visitHistory?: VisitedMarker[];

  // Privacy settings
  privacyMode?: boolean;
  privacyActivatedAt?: Date;

  // Memory metadata
  lastInteraction?: Date;
  preferenceConfidence?: "low" | "medium" | "high";
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
    // User identity
    name: patch.name ?? current.name,

    // Content preferences
    storyLengthPreference: patch.storyLengthPreference ?? current.storyLengthPreference,
    interests: patch.interests ?? current.interests ?? [],

    // Route and travel preferences
    routePreferences: patch.routePreferences ?? current.routePreferences ?? [],

    // Visit history (maintain backward compatibility)
    visitedMarkers: patch.visitedMarkers ?? current.visitedMarkers ?? [],
    visitHistory: patch.visitHistory ?? current.visitHistory ?? [],

    // Privacy settings
    privacyMode: patch.privacyMode ?? current.privacyMode ?? false,
    privacyActivatedAt: patch.privacyActivatedAt ?? current.privacyActivatedAt,

    // Memory metadata
    lastInteraction: patch.lastInteraction ?? new Date(),
    preferenceConfidence: patch.preferenceConfidence ?? current.preferenceConfidence ?? "medium",
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

/**
 * Add a visited marker with timestamp and optional notes
 */
export async function addVisitedMarkerWithTimestamp(
  userId: string,
  markerId: string,
  notes?: string
): Promise<UserMemory> {
  const db = loadDB();
  const current = db.users[userId] || {};

  // Add to legacy visitedMarkers for backward compatibility
  const visited = new Set(current.visitedMarkers || []);
  visited.add(markerId);

  // Add to enhanced visit history
  const visitHistory = current.visitHistory || [];
  const newVisit: VisitedMarker = {
    markerId,
    visitedAt: new Date(),
    notes
  };

  // Check if already visited recently (avoid duplicates within 1 hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentVisit = visitHistory.find(v =>
    v.markerId === markerId && new Date(v.visitedAt) > oneHourAgo
  );

  if (!recentVisit) {
    visitHistory.push(newVisit);
  }

  const updated: UserMemory = {
    ...current,
    visitedMarkers: Array.from(visited),
    visitHistory,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return updated;
}

/**
 * Set privacy mode for a user
 */
export async function setPrivacyMode(userId: string, enabled: boolean): Promise<UserMemory> {
  const current = await getUserMemory(userId) || {};

  return await upsertUserMemory(userId, {
    privacyMode: enabled,
    privacyActivatedAt: enabled ? new Date() : undefined
  });
}

/**
 * Check if user has privacy mode enabled
 */
export async function isPrivacyModeEnabled(userId: string): Promise<boolean> {
  const memory = await getUserMemory(userId);
  return memory?.privacyMode ?? false;
}

/**
 * Add or update a route preference with confidence tracking
 */
export async function addRoutePreference(
  userId: string,
  preferenceType: "scenic" | "fast" | "small-towns" | "back-roads",
  confidence: "low" | "medium" | "high" = "medium"
): Promise<UserMemory> {
  const current = await getUserMemory(userId) || {};
  const routePreferences = current.routePreferences || [];

  // Find existing preference of this type
  const existingIndex = routePreferences.findIndex(p => p.type === preferenceType);

  const newPreference: RoutePreference = {
    type: preferenceType,
    confidence,
    lastUpdated: new Date()
  };

  if (existingIndex >= 0) {
    // Update existing preference, potentially increasing confidence
    const existing = routePreferences[existingIndex];
    if (confidence === "high" || existing.confidence === "low") {
      routePreferences[existingIndex] = newPreference;
    }
  } else {
    // Add new preference
    routePreferences.push(newPreference);
  }

  return await upsertUserMemory(userId, {
    routePreferences,
    preferenceConfidence: confidence
  });
}

/**
 * Get user's route preferences sorted by confidence and recency
 */
export async function getUserRoutePreferences(userId: string): Promise<RoutePreference[]> {
  const memory = await getUserMemory(userId);
  const preferences = memory?.routePreferences || [];

  // Sort by confidence (high first) and then by recency
  return preferences.sort((a, b) => {
    const confidenceOrder = { high: 3, medium: 2, low: 1 };
    const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    if (confidenceDiff !== 0) return confidenceDiff;

    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
  });
}