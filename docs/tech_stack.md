# AImee Tech Stack Specification

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
- RAG engine (SQLite or PostgreSQL)

## LiveKit Agent Container

- Python-based LiveKit Agents framework
- Handles real-time media logic
- Turn detection and voice activity detection
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

- docker compose starts:
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
- 107+ unit tests covering:
  - Intent routing logic
  - Memory/transcript storage
  - Agent selection and routing
  - Context utilities
- Behavioral tests (18 Gherkin scenarios):
  - AImee core features (12 scenarios)
  - AImee personality (6 scenarios)
- LLM-as-Judge tests for critical paths:
  - Greeting quality (first-time vs returning users)
  - Name capture acknowledgment
  - Reconnection brevity
  - Safety disclaimers
  - Conversational rules

### Test Commands

```bash
cd docker/backend
npm test                  # Run all unit tests (fast, no API calls)
npm run test:llm          # Run LLM-as-Judge tests (uses OpenAI API)
npm run test:coverage     # Run with coverage report
npm run test:watch        # Watch mode for development

# Run behavioral tests
RUN_LLM_TESTS=true npx jest --testPathPattern=aimeeCoreFeature
RUN_LLM_TESTS=true npx jest --testPathPattern=aimeePersonality
```

## Summary

This stack is:
- Fully containerized
- Reproducible
- Cloud GPU ready (Runpod)
- Scalable
- Test-driven with LLM-as-Judge quality evaluation
- Perfect for rapid development using Claude Code