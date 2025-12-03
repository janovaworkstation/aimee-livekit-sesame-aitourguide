# AImee Architecture Blueprint 2.1 (Docker + Runpod Edition)

## Overview
AImee is a voice-first, GPS-triggered, multi-agent tour guide supporting three intelligence tiers:
- Premium: OpenAI Realtime API
- Standard: Sesame AI (self-hosted via Docker on Runpod)
- Offline: On-device LLM (Apple Foundation Models, Gemini Nano, Phi models)

All backend components run in Docker containers.  
Runpod provides GPU hosting for Sesame AI during the POC.  
React Native + Expo powers the mobile app for iOS/Android POC testing.

LiveKit handles realtime audio transport and data tracks.

---

## Deployment Layer

All backend components run in Docker with internal networking:

```
docker/
   backend/           (Node server + brain router + memory/transcripts)
   agent/             (LiveKit agent container - Python)
   sesame/            (Sesame AI GPU container)
   rag-db/            (JSON storage volume)
   docker-compose.yml
```

### Docker Networking
- Services communicate via Docker internal network (no ngrok required)
- Agent → Backend: `http://backend:3001`
- Shared volume: `config/docker/rag-db/` → `/app/rag-json/`

Sesame runs on Runpod GPU using docker-compose or direct Docker commands.

---

## High-Level System Diagram

```
📱 Mobile App (React Native + Expo)
    ├── RN UI
    ├── GPS Engine
    ├── Offline DB
    ├── Mic → LiveKit
    ├── Speaker ← LiveKit
    └── BrainSelector
         ▼

🌐 LiveKit (Cloud or Self-hosted Container)
    ├── WebRTC audio in/out
    ├── Data Tracks
    └── Room Mgmt
         ▼

🤖 AImee Brain Engine (Dockerized Backend)
    ├── Multi-Agent Router
    │     ├── Navigator
    │     ├── Historian
    │     ├── Experience
    │     └── Memory
    ├── Tool Layer
    └── Engine Selector
         ▼

🧠 Intelligence Engines
    ├── Premium: OpenAI Realtime API
    ├── Standard: Sesame AI (Runpod Docker)
    └── Offline: On-device LLM
```

---

## Audio Streaming Pipeline

1. React Native mic → WebRTC → LiveKit
2. LiveKit routes stream to AImee backend container
3. Backend forwards audio to selected brain:
   - OpenAI Realtime API
   - Sesame AI (Runpod)
   - Local device STT/LLM (offline)
4. TTS returns over LiveKit → app speaker

---

## GPS → Voice Trigger Pipeline

1. useGPS monitors live location  
2. Marker DB loaded locally from SQLite  
3. Geofence triggered → data event sent to backend (LiveKit data track)  
4. Multi-Agent Router generates site-specific narrative  
5. Voice response streamed back via LiveKit  

---

## Brain Selection Logic

```
If premium user AND network strong:
    Use OpenAI Realtime API
Else if network OK:
    Use Sesame (Runpod)
Else:
    Use On-device LLM
```

---

## Multi-Agent Architecture

### Navigator Agent
- Tour flow, route logic, next marker selection

### Historian Agent
- RAG search, long-form descriptions, accuracy handling

### Experience Agent
- Tone, pacing, interaction style, mood

### Memory Agent
- User preferences, recent history, personalization

---

## Offline Architecture

- SQLite DB for markers  
- Offline tiles via Mapbox  
- On-device LLM for fallback  
- On-device TTS (Apple/Android)  
- Offline geofencing remains fully local

---

## Data Persistence

### User Memory
- Stored in JSON file (`/app/rag-json/memory.json`)
- Contains user preferences, name, interests, visited markers
- Persists across sessions via Docker volume mount

### Conversation Transcripts
- Stored in JSON file (`/app/rag-json/transcripts.json`)
- Full session history with timestamps
- Supports multiple sessions per user
- API endpoints for session management

---

## Testing Architecture

### Layered Testing Approach
1. **Unit Tests** - Deterministic logic (routing, storage, utilities)
2. **Behavioral Tests** - Side effects verification (memory saved, agent selected)
3. **LLM-as-Judge Tests** - Response quality for critical user interactions

### Test-Driven Development
- Define features as Given-When-Then statements
- Write failing tests first
- Implement to pass tests

---

## Summary
This architecture is:
- scalable
- portable
- cloud-ready
- offline-capable
- future-proof
- test-driven with quality evaluation
- optimized for Claude Code automation  
