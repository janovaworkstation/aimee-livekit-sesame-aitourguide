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

## Deployment Layer (NEW)
All backend components run in Docker:

```
docker/
   backend/           (Node server + brain router)
   agent/             (LiveKit agent container)
   sesame/            (Sesame AI GPU container)
   rag-db/            (SQLite or Postgres optional container)
   docker-compose.yml
```

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

## Summary
This architecture is:
- scalable  
- portable  
- cloud-ready  
- offline-capable  
- future-proof  
- optimized for Claude Code automation  
