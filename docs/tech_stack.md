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

## Summary
This stack is:
- fully containerized
- reproducible
- cloud GPU ready (Runpod)
- scalable
- perfect for rapid development using Claude Code
