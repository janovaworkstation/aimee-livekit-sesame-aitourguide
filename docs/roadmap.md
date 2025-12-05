# AImee POC Implementation Roadmap

## Phase 0 — Environment Setup

### Mobile

- Install Expo CLI
- Install LiveKit RN SDK
- Test Expo Dev Client on your physical phone

### Docker

- Install Docker Desktop
- Clone repo + run docker compose up for backend
- Confirm backend container runs
- Confirm LiveKit agent container runs

### Runpod

- Create Runpod GPU instance (3090 or A40 recommended)
- Deploy sesame Docker image
- Open firewall port for sesame service
- Verify connectivity from local backend

**Deliverable**: Mobile + Docker backend + Runpod sesame all running.

## Phase 1 — LiveKit Audio POC

- Integrate LiveKit RN client
- Connect to LiveKit cloud instance
- Implement mic → LiveKit → loopback
- Validate <200ms latency
- Add VoiceScreen

**Deliverable**: AImee audio loopback works.

## Phase 2 — Premium Brain (OpenAI GPT-4o-mini)

- Add OpenAI GPT-4o-mini connection from backend container
- Stream audio through LiveKit
- Round-trip conversation working end-to-end

**Deliverable**: AImee speaks with OpenAI quality.

## Phase 3 — Multi-Agent Router

- Implement Navigator, Historian, Experience, Memory agents
- Add AgentRouter with context object
- Integrate RAG for markers

**Deliverable**: AImee responds with context and personality.

## Phase 4 — GPS → Voice Triggers

- Implement useGPS hook
- Add geofence logic
- Send GPS triggers via LiveKit data tracks
- Trigger Historian narratives on arrival

**Deliverable**: Driving test works.

## Phase 5 — Standard Brain (Sesame on Runpod)

- Add sesame engine endpoint
- Add BrainSelector logic
- Test live switching between OpenAI and Sesame

**Deliverable**: Multi-engine intelligence online.

## Phase 6 — Offline Mode

- Integrate on-device LLM
- Use device TTS/STT when offline
- Offline DB + RAG queries

**Deliverable**: AImee runs with no signal.

## Phase 7 — UI Polish + Driving Mode

- Auto-start tour mode
- Safety-first interactions
- Engine indicator (Premium / Standard / Offline)

**Deliverable**: Demo-ready POC.