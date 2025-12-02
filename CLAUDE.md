# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AImee is a voice AI tour guide application with real-time speech-to-speech capabilities using LiveKit and OpenAI. The project consists of three main components:

1. **Mobile App (React Native/Expo)** - Voice interface for users
2. **Python Voice Agent** - Real-time voice processing using LiveKit Agents framework
3. **Node.js Backend** - Multi-agent conversation processing and OpenAI integration

This is currently in "Phase 6" - implementing real-time voice conversations through LiveKit Agents + OpenAI.

## Key Commands

### Docker Environment
```bash
# Start all services
docker compose up

# Start with rebuilding
docker compose up --build

# Start specific service (recommended for development)
docker compose up agent

# Rebuild specific service from scratch
docker compose down && docker compose build --no-cache agent && docker compose up agent

# Stop all services
docker compose down
```

### Mobile Development
```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Build for physical device (required for voice functionality)
npx expo run:ios     # iOS
npx expo run:android # Android
```

### Backend Development
```bash
cd docker/backend

# Install dependencies
npm install

# Development mode
npm run dev

# Build TypeScript
npm run build

# Production mode
npm start
```

## Architecture

### Voice Processing Flow
1. **Mobile App** connects to LiveKit room using `@livekit/react-native`
2. **Python Agent** (`docker/agent/aimee_agent.py`) handles real-time voice processing:
   - Uses LiveKit Agents framework with `@server.rtc_session()` pattern
   - Integrates OpenAI STT, LLM (gpt-4o-mini), and TTS
   - Implements `AImeeAgent` class with personality prompts
3. **Node.js Backend** provides multi-agent conversation endpoints (legacy, not used in Phase 6)

### Key Configuration
- **Environment Variables**: Set in `.env` file (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY)
- **LiveKit Token**: Hardcoded in `mobile/app/lib/config.ts` for development
- **OpenAI Model**: Configurable via `OPENAI_MODEL` environment variable (defaults to gpt-4o-mini)

### Mobile App Structure
- **VoiceScreen.tsx**: Main voice interface with mute/unmute controls
- **config.ts**: LiveKit configuration and connection settings
- **livekit.ts**: LiveKit manager (simplified for current implementation)
- Uses `useLocalParticipant` hook for microphone control

### Agent Implementation
- **Entry Point**: `docker/agent/aimee_agent.py`
- **Framework**: LiveKit Agents with OpenAI plugins (`livekit-agents[openai]`)
- **Voice Pipeline**: Silero VAD → OpenAI STT → OpenAI LLM → OpenAI TTS
- **Personality**: AImee tour guide persona defined in `AIMEE_SYSTEM_PROMPT`

## Development Notes

### Voice Testing Requirements
- **Physical Device Required**: Voice functionality only works on real devices, not simulators
- **LiveKit Cloud**: Uses cloud-hosted LiveKit service (configured in environment variables)
- **Audio Permissions**: Mobile app must have microphone permissions

### Common Issues
- **Import Errors**: Ensure Python agent uses correct LiveKit Agents API (not deprecated `voice_assistant` module)
- **Model Configuration**: Use `gpt-4o-mini` for chat completions, not realtime-specific models
- **Docker Cache**: Run `docker system prune -f` if builds use stale images

### Agent Session Flow
1. User joins LiveKit room via mobile app
2. Agent automatically detects participant and starts session
3. Agent sends greeting using `on_enter()` method
4. User can mute/unmute microphone for conversation control
5. Agent processes speech → text → LLM → speech pipeline continuously

### Environment Configuration
The system supports multiple OpenAI models and brain configurations through the backend's agent routing system, but Phase 6 primarily uses the direct LiveKit Agent integration.

## Testing Mobile Voice Features

Physical device deployment is required. See `mobile/PHASE_1_TESTING.md` for detailed testing instructions including LiveKit server setup and token generation.