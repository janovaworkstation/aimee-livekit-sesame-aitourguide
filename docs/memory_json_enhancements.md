# Memory JSON Enhancements

## Overview

This document outlines the comprehensive enhancements needed for AImee's memory system to fully support the behavioral specifications defined in `/specs/features/aimee_memory.feature`. The analysis reveals significant gaps between the current implementation and the requirements, particularly around trip memory separation and privacy controls.

## Current Memory Structure

The existing `memory.json` structure in `/config/docker/rag-db/memory.json` is minimal:

```json
{
  "users": {
    "voice-user": {
      "name": "Jeff",
      "interests": ["places around New Albany, Ohio"],
      "visitedMarkers": []
    }
  }
}
```

## Proposed Enhanced Memory Structure

### Complete Recommended Structure

```json
{
  "users": {
    "voice-user": {
      // ===== USER IDENTITY =====
      "name": "Jeff",
      "nameRefusalCount": 0,  // Track if user declined to share name

      // ===== CONTENT PREFERENCES =====
      "storyLengthPreference": "normal",  // "short" | "normal" | "deep"
      "interests": [
        "places around New Albany, Ohio",
        "things that are close to New Albany"
      ],

      // ===== ROUTE & TRAVEL PREFERENCES =====
      "routePreferences": [
        {
          "type": "scenic",  // "scenic" | "fast" | "small-towns" | "back-roads"
          "confidence": "medium",  // "low" | "medium" | "high"
          "lastUpdated": "2025-12-05T10:30:00Z",
          "inferredFrom": "repeated_choices"  // How we learned this
        }
      ],

      // ===== VISIT HISTORY =====
      "visitHistory": [
        {
          "markerId": "old-depot-12345",
          "markerName": "Old Depot Museum",
          "visitedAt": "2025-12-05T09:00:00Z",
          "duration": 45,  // minutes spent at location
          "notes": "User enjoyed the railroad history exhibit",
          "rating": null  // User's rating if provided
        }
      ],

      // ===== TRIP MEMORY (Session-specific) =====
      "currentTrip": {
        "tripId": "trip-2025-12-05-001",
        "startedAt": "2025-12-05T08:00:00Z",
        "region": "Central Ohio",
        "activeRoute": "US-62 scenic route",
        "constraints": {
          "timeLimit": "2 hours",
          "mustReturn": true,
          "avoidHighways": false
        },
        "temporaryPreferences": [],  // Trip-specific prefs that don't persist
        "plannedStops": [],
        "completedStops": []
      },

      // ===== TRIP HISTORY (Long-term) =====
      "tripHistory": [
        {
          "tripId": "trip-2025-12-04-001",
          "date": "2025-12-04",
          "region": "Columbus area",
          "stopsVisited": ["german-village", "scioto-mile"],
          "totalDuration": 240  // minutes
        }
      ],

      // ===== PRIVACY SETTINGS =====
      "privacy": {
        "mode": false,  // Privacy mode on/off
        "activatedAt": null,
        "consentToStore": true,
        "dataRetentionDays": 90,
        "excludeFromAnalytics": false
      },

      // ===== MEMORY METADATA =====
      "metadata": {
        "lastInteraction": "2025-12-05T10:35:00Z",
        "firstInteraction": "2025-12-01T14:00:00Z",
        "totalSessions": 5,
        "preferenceConfidence": "medium",
        "memoryVersion": "2.0",
        "lastModifiedBy": "memory-agent"
      },

      // ===== LEARNED BEHAVIORS =====
      "learnedBehaviors": {
        "preferredGreeting": "casual",  // "formal" | "casual" | "brief"
        "detailLevel": "moderate",  // "minimal" | "moderate" | "detailed"
        "humorAppreciation": true,
        "historicalInterestLevel": "high",
        "photoStopFrequency": "occasional"  // "never" | "occasional" | "frequent"
      },

      // ===== CONVERSATION CONTEXT =====
      "conversationPatterns": {
        "commonQuestions": ["What's nearby?", "Tell me about this area"],
        "avoidedTopics": [],
        "preferredTopics": ["local history", "architecture"]
      }
    }
  },

  // ===== GLOBAL SETTINGS =====
  "system": {
    "schemaVersion": "2.0",
    "lastMigration": "2025-12-05T00:00:00Z",
    "maintenanceMode": false
  }
}
```

## Implementation Gap Analysis

### Currently Implemented ✅

From `jsonMemoryStore.ts`, the following features already exist:
- Basic user name storage
- Interests array
- Story length preferences
- Visit history with timestamps (partial)
- Route preferences with confidence tracking
- Basic privacy mode toggle (boolean only)
- Helper functions for adding visits and preferences

### Not Yet Implemented ❌

#### 1. Trip Memory System (Critical)
- No `currentTrip` object for session-specific memory
- No trip history tracking for completed trips
- No automatic trip memory clearing between sessions
- No temporary preferences that expire with the trip
- **Impact**: Fails 2 behavioral tests

#### 2. Enhanced Visit Tracking
- Missing marker names (only IDs stored)
- No visit duration tracking
- No user ratings for visits
- No detailed notes beyond basic string
- **Impact**: Affects recommendation quality

#### 3. Advanced Privacy Controls
- Only basic on/off toggle exists
- No consent tracking
- No data retention policies
- No analytics exclusion options
- **Impact**: Fails 3 behavioral tests

#### 4. Learned Behaviors & Patterns
- No behavioral learning system
- No conversation pattern tracking
- No topic preference tracking
- No interaction style learning
- **Impact**: Reduces personalization quality

#### 5. Session Management
- No session counting
- No first interaction tracking
- No modification tracking by agent
- **Impact**: Affects memory confidence

## Required Functionality Updates

### 1. jsonMemoryStore.ts Updates

#### New Type Definitions
```typescript
export type TripMemory = {
  tripId: string;
  startedAt: Date;
  region?: string;
  activeRoute?: string;
  constraints: TripConstraints;
  temporaryPreferences: string[];
  plannedStops: string[];
  completedStops: string[];
}

export type TripConstraints = {
  timeLimit?: string;
  mustReturn?: boolean;
  avoidHighways?: boolean;
  maxDistance?: number;
}

export type PrivacySettings = {
  mode: boolean;
  activatedAt?: Date;
  consentToStore: boolean;
  dataRetentionDays: number;
  excludeFromAnalytics: boolean;
}
```

#### New Functions Required
```typescript
// Trip Memory Management
- startNewTrip(userId: string, region: string, route?: string, constraints?: TripConstraints): Promise<TripMemory>
- updateCurrentTrip(userId: string, updates: Partial<TripMemory>): Promise<TripMemory>
- endCurrentTrip(userId: string): Promise<void>
- clearTripMemory(userId: string): Promise<void>
- getCurrentTrip(userId: string): Promise<TripMemory | null>
- addTripConstraint(userId: string, constraint: Partial<TripConstraints>): Promise<TripMemory>

// Privacy Management
- setPrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<PrivacySettings>
- shouldStoreMemory(userId: string): Promise<boolean>
- getDataRetentionDate(userId: string): Promise<Date | null>
- purgeExpiredData(): Promise<void>
- isExcludedFromAnalytics(userId: string): Promise<boolean>

// Enhanced Visit Tracking
- addVisitWithDetails(userId: string, markerId: string, name: string, duration?: number, notes?: string, rating?: number): Promise<UserMemory>

// Behavioral Learning
- updateLearnedBehavior(userId: string, behavior: string, value: any): Promise<UserMemory>
- trackConversationPattern(userId: string, pattern: string): Promise<UserMemory>
- incrementSessionCount(userId: string): Promise<UserMemory>
```

### 2. memoryAgent.ts Updates

- Detect and handle trip boundaries (new region = new trip)
- Parse time constraints from conversation ("we have 2 hours")
- Differentiate temporary vs. permanent preferences
- Track conversation patterns automatically
- Learn user behaviors over time
- Respect privacy settings before any memory operations

### 3. Python Agent Updates (aimee_agent.py)

- Send session start/end events to backend
- Include trip context in all messages
- Clear trip memory on reconnection
- Track visit durations when user leaves a location

### 4. New API Endpoints

```typescript
// Trip Management
POST /api/trip/start
POST /api/trip/end
PUT /api/trip/update
GET /api/trip/current/:userId

// Privacy Management
POST /api/memory/privacy
GET /api/memory/privacy/:userId

// Behavioral Learning
POST /api/memory/behavior
POST /api/memory/pattern
```

## Required Test Updates

### 1. Unit Tests (jsonMemoryStore.test.ts)

#### New Test Suites
```typescript
describe('Trip Memory Management', () => {
  - 'should create new trip with constraints'
  - 'should update current trip memory'
  - 'should clear trip memory on end'
  - 'should preserve long-term memory when clearing trip'
  - 'should track trip history'
  - 'should handle concurrent trips gracefully'
})

describe('Enhanced Visit Tracking', () => {
  - 'should store visit with full details'
  - 'should calculate visit duration'
  - 'should prevent duplicate visits within time window'
  - 'should track user ratings'
})

describe('Privacy Controls', () => {
  - 'should respect data retention settings'
  - 'should exclude from analytics when requested'
  - 'should clear data after retention period'
  - 'should prevent memory storage in privacy mode'
  - 'should handle consent withdrawal'
})

describe('Learned Behaviors', () => {
  - 'should update behavior preferences'
  - 'should track conversation patterns'
  - 'should increment session counts'
  - 'should build confidence over time'
})
```

### 2. Integration Tests (aimeeMemory.test.ts)

Currently only 1/14 tests passing. Updates needed:
- Fix trip memory scenarios (2 tests)
- Fix privacy mode scenarios (3 tests)
- Fix visit history accuracy (3 tests)
- Add behavioral learning validation (new tests)

### 3. LLM Judge Updates (llmJudge.ts)

- Update `judgeTripMemoryUsage()` for proper constraint handling
- Update `judgeTripMemoryClearing()` for session boundaries
- Update privacy judge methods for enhanced settings
- Add new judge methods for behavioral learning

## Implementation Phases

### Phase 1: Critical Trip Memory (Required for Specs)
**Priority: HIGH - Blocks 2 failing tests**

1. Add `TripMemory` and `TripConstraints` types
2. Implement trip management functions
3. Update Memory Agent to detect trip boundaries
4. Add session event handling in Python agent
5. Create unit tests for trip operations
6. Fix failing behavioral tests

**Estimated Effort**: 2-3 days

### Phase 2: Privacy Controls (Required for Specs)
**Priority: HIGH - Blocks 3 failing tests**

1. Enhance privacy types beyond boolean
2. Add privacy management functions
3. Create privacy middleware for memory operations
4. Update Memory Agent privacy handling
5. Add comprehensive privacy tests
6. Fix failing privacy behavioral tests

**Estimated Effort**: 1-2 days

### Phase 3: Enhanced Visit Tracking (Improves UX)
**Priority: MEDIUM - Enhances recommendations**

1. Add full visit details (name, duration, rating)
2. Improve duplicate detection logic
3. Track visit patterns for better suggestions
4. Update visit-related tests

**Estimated Effort**: 1 day

### Phase 4: Behavioral Learning (Nice to Have)
**Priority: LOW - Not in current specs**

1. Implement learned behaviors tracking
2. Build conversation pattern detection
3. Add preference confidence scoring
4. Create new test scenarios

**Estimated Effort**: 2-3 days

### Phase 5: Metadata & Maintenance (Future-proofing)
**Priority: LOW - Infrastructure improvement**

1. Add schema versioning
2. Implement data migration tools
3. Add modification tracking
4. Create maintenance utilities

**Estimated Effort**: 1 day

## Implementation Impact

### Immediate Benefits (Phase 1 & 2)
- **5 failing tests fixed** (out of 13 total)
- Trip memory separation working correctly
- Privacy mode fully functional
- Compliance with specification requirements

### Code Changes Required
- **~15-20 new functions** in jsonMemoryStore.ts
- **Major updates** to memoryAgent.ts
- **4-5 new API endpoints**
- **~25-30 new unit tests**
- **Python agent session handling**

### Backward Compatibility
- Existing `visitedMarkers` array maintained
- Current memory structure still valid
- Gradual migration path available

## Recommendations

1. **Start with Phase 1 & 2 only** - These are explicitly required by specifications
2. **Defer Phase 3-5** - Can be added incrementally based on user feedback
3. **Consider simpler alternatives** - Some features might be overkill for MVP
4. **Test incrementally** - Fix tests as each phase completes
5. **Document changes** - Update CLAUDE.md after implementation

## Migration Strategy

For existing users with current memory structure:
1. Detect schema version on load
2. Auto-migrate to new structure preserving existing data
3. Set reasonable defaults for new fields
4. Log migration for debugging

## Conclusion

The enhanced memory structure provides comprehensive support for all behavioral specifications while maintaining backward compatibility. However, only Phase 1 (Trip Memory) and Phase 2 (Privacy Controls) are critical for meeting the current specification requirements. These two phases will fix 5 of the 13 failing memory tests and provide the essential trip/long-term memory separation that AImee needs to function correctly.