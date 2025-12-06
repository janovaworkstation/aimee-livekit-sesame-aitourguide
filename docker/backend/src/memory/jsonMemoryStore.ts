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

// Trip-specific constraints
export type TripConstraints = {
  timeLimit?: string;  // e.g., "2 hours", "90 minutes"
  mustReturn?: boolean;
  avoidHighways?: boolean;
  maxDistance?: number; // in miles
};

// Session-specific trip memory
export type TripMemory = {
  tripId: string;
  startedAt: Date;
  region?: string;
  activeRoute?: string;
  constraints: TripConstraints;
  temporaryPreferences: string[]; // Preferences that don't persist beyond trip
  plannedStops: string[];
  completedStops: string[];
};

// Completed trip history
export type TripHistoryEntry = {
  tripId: string;
  date: string; // YYYY-MM-DD format
  region?: string;
  stopsVisited: string[];
  totalDuration?: number; // in minutes
};

// Enhanced privacy settings
export type PrivacySettings = {
  mode: boolean;
  activatedAt?: Date;
  consentToStore: boolean;
  dataRetentionDays: number;
  excludeFromAnalytics: boolean;
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

  // Trip-specific memory
  currentTrip?: TripMemory;
  tripHistory?: TripHistoryEntry[];

  // Privacy settings - enhanced from simple boolean
  privacyMode?: boolean; // Keep for backward compatibility
  privacyActivatedAt?: Date;
  privacySettings?: PrivacySettings;

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

    // Trip-specific memory
    currentTrip: patch.currentTrip ?? current.currentTrip,
    tripHistory: patch.tripHistory ?? current.tripHistory ?? [],

    // Privacy settings - enhanced from simple boolean
    privacyMode: patch.privacyMode ?? current.privacyMode ?? false,
    privacyActivatedAt: patch.privacyActivatedAt ?? current.privacyActivatedAt,
    privacySettings: patch.privacySettings ?? current.privacySettings,

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

// ========== TRIP MEMORY MANAGEMENT ==========

/**
 * Start a new trip session
 */
export async function startNewTrip(
  userId: string,
  region?: string,
  route?: string,
  constraints?: Partial<TripConstraints>
): Promise<TripMemory> {
  const db = loadDB();
  const current = db.users[userId] || {};

  // If there's an existing trip, move it to history first
  if (current.currentTrip) {
    await endCurrentTrip(userId);
    // Reload DB after endCurrentTrip modifies it
    const updatedDb = loadDB();
    const updatedCurrent = updatedDb.users[userId] || {};
    Object.assign(current, updatedCurrent);
  }

  const newTrip: TripMemory = {
    tripId: `trip-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    startedAt: new Date(),
    region,
    activeRoute: route,
    constraints: constraints || {},
    temporaryPreferences: [],
    plannedStops: [],
    completedStops: []
  };

  const updated: UserMemory = {
    ...current,
    currentTrip: newTrip,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return newTrip;
}

/**
 * Update the current trip with new information
 */
export async function updateCurrentTrip(
  userId: string,
  updates: Partial<TripMemory>
): Promise<TripMemory | null> {
  const db = loadDB();
  const current = db.users[userId] || {};

  if (!current.currentTrip) {
    return null;
  }

  const updatedTrip: TripMemory = {
    ...current.currentTrip,
    ...updates,
    // Ensure we don't overwrite constraints, merge them
    constraints: {
      ...current.currentTrip.constraints,
      ...(updates.constraints || {})
    }
  };

  const updated: UserMemory = {
    ...current,
    currentTrip: updatedTrip,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return updatedTrip;
}

/**
 * End the current trip and move it to trip history
 */
export async function endCurrentTrip(userId: string): Promise<void> {
  const db = loadDB();
  const current = db.users[userId] || {};

  if (!current.currentTrip) {
    return;
  }

  // Calculate trip duration
  const startTime = new Date(current.currentTrip.startedAt).getTime();
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

  // Create history entry
  const historyEntry: TripHistoryEntry = {
    tripId: current.currentTrip.tripId,
    date: new Date(current.currentTrip.startedAt).toISOString().split('T')[0],
    region: current.currentTrip.region,
    stopsVisited: current.currentTrip.completedStops,
    totalDuration: durationMinutes
  };

  // Add to history
  const tripHistory = current.tripHistory || [];
  tripHistory.push(historyEntry);

  // Clear current trip
  const updated: UserMemory = {
    ...current,
    currentTrip: undefined,
    tripHistory,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
}

/**
 * Clear trip memory without saving to history (for privacy mode or reset)
 */
export async function clearTripMemory(userId: string): Promise<void> {
  const db = loadDB();
  const current = db.users[userId] || {};

  const updated: UserMemory = {
    ...current,
    currentTrip: undefined,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
}

/**
 * Get the current active trip
 */
export async function getCurrentTrip(userId: string): Promise<TripMemory | null> {
  const memory = await getUserMemory(userId);
  return memory?.currentTrip || null;
}

/**
 * Add a constraint to the current trip
 */
export async function addTripConstraint(
  userId: string,
  constraint: Partial<TripConstraints>
): Promise<TripMemory | null> {
  const db = loadDB();
  const current = db.users[userId] || {};

  if (!current.currentTrip) {
    return null;
  }

  const updatedTrip: TripMemory = {
    ...current.currentTrip,
    constraints: {
      ...current.currentTrip.constraints,
      ...constraint
    }
  };

  const updated: UserMemory = {
    ...current,
    currentTrip: updatedTrip,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return updatedTrip;
}

/**
 * Add a temporary preference to the current trip (doesn't persist)
 */
export async function addTemporaryPreference(
  userId: string,
  preference: string
): Promise<TripMemory | null> {
  const db = loadDB();
  const current = db.users[userId] || {};

  if (!current.currentTrip) {
    return null;
  }

  const temporaryPreferences = current.currentTrip.temporaryPreferences || [];
  if (!temporaryPreferences.includes(preference)) {
    temporaryPreferences.push(preference);
  }

  const updatedTrip: TripMemory = {
    ...current.currentTrip,
    temporaryPreferences
  };

  const updated: UserMemory = {
    ...current,
    currentTrip: updatedTrip,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return updatedTrip;
}

/**
 * Mark a stop as completed in the current trip
 */
export async function completeStop(
  userId: string,
  stopId: string
): Promise<TripMemory | null> {
  const db = loadDB();
  const current = db.users[userId] || {};

  if (!current.currentTrip) {
    return null;
  }

  const completedStops = current.currentTrip.completedStops || [];
  if (!completedStops.includes(stopId)) {
    completedStops.push(stopId);
  }

  const updatedTrip: TripMemory = {
    ...current.currentTrip,
    completedStops
  };

  const updated: UserMemory = {
    ...current,
    currentTrip: updatedTrip,
    lastInteraction: new Date()
  };

  db.users[userId] = updated;
  saveDB(db);
  return updatedTrip;
}

// ========== PRIVACY MANAGEMENT ==========

/**
 * Set comprehensive privacy settings
 */
export async function setPrivacySettings(
  userId: string,
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const current = await getUserMemory(userId) || {};

  const currentSettings = current.privacySettings || {
    mode: false,
    consentToStore: true,
    dataRetentionDays: 90,
    excludeFromAnalytics: false
  };

  const newSettings: PrivacySettings = {
    ...currentSettings,
    ...settings
  };

  // Update legacy privacy fields for backward compatibility
  await upsertUserMemory(userId, {
    privacyMode: newSettings.mode,
    privacyActivatedAt: newSettings.mode ? new Date() : undefined,
    privacySettings: newSettings
  });

  return newSettings;
}

/**
 * Check if memory storage is allowed for user
 */
export async function shouldStoreMemory(userId: string): Promise<boolean> {
  const memory = await getUserMemory(userId);

  // Check new privacy settings first, fall back to legacy mode
  if (memory?.privacySettings) {
    return !memory.privacySettings.mode && memory.privacySettings.consentToStore;
  }

  // Fall back to legacy privacy mode
  return !(memory?.privacyMode ?? false);
}

/**
 * Check if user data is excluded from analytics
 */
export async function isExcludedFromAnalytics(userId: string): Promise<boolean> {
  const memory = await getUserMemory(userId);
  return memory?.privacySettings?.excludeFromAnalytics ?? false;
}