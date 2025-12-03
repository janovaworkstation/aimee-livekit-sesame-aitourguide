# AImee Tech Stack Specification (Docker + Runpod Edition)

## Mobile (React Native)
- Expo SDK 51
- LiveKit React Native SDK
- Expo-Location
- Expo-AV or expo-speech (offline TTS)
- SQLite for offline marker DB

## Backend (Dockerized Node.js)
- Node 20+ inside container
- Express/Fastify API
- LiveKit Server SDK
- Multi-agent system
- RAG engine (sqlite or postgres)

## LiveKit Agent Container
- Runs realtime media logic
- Handles turn detection
- Custom Dockerfile
- Communicates with backend container

## Sesame AI (Runpod)
- Hosted in Runpod GPU instance
- Docker image with:
  - Python
  - CUDA
  - Sesame model
  - FastAPI or Node adapter
- Exposed via public or VPN endpoint

## On-Device LLM
- iOS: Apple Foundation Models
- Android: Gemini Nano
- Native modules exposed to RN

## Docker / Compose
- docker-compose up starts:
  - backend
  - livekit-agent
  - rag-db (optional)
- Sesame runs on Runpod using docker-compose.runpod.yml

## Networking
- Backend ↔ Sesame via secure HTTP
- LiveKit cloud or self-hosted instance
- Mobile app connects to LiveKit directly

## Testing Framework
- Jest with ts-jest for TypeScript testing
- LLM-as-Judge pattern for response quality evaluation
- 107 unit tests covering:
  - Intent routing logic
  - Memory/transcript storage
  - Agent selection and routing
  - Context utilities
- LLM-as-Judge tests for critical paths:
  - Greeting quality (first-time vs returning users)
  - Name capture acknowledgment
  - Reconnection brevity

### Test Commands
```bash
cd docker/backend
npm test              # Run all unit tests (fast, no API calls)
npm run test:llm      # Run LLM-as-Judge tests (uses OpenAI API)
npm run test:coverage # Run with coverage report
```

## Summary
This stack is:
- fully containerized
- reproducible
- cloud GPU ready (Runpod)
- scalable
- test-driven with LLM-as-Judge quality evaluation
- perfect for rapid development using Claude Code
