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
3. **Node.js Backend** - Multi-agent conversation processing, memory, and transcript storage

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

### Docker Networking
- **Agent ↔ Backend**: Python agent communicates with Node.js backend via Docker internal networking (`http://backend:3001`)
- **No ngrok required**: Services communicate directly within Docker network
- **Volume mounts**: `config/docker/rag-db/` mounted to `/app/rag-json/` for persistent storage

## Testing Mobile Voice Features

Physical device deployment is required. See `mobile/PHASE_1_TESTING.md` for detailed testing instructions including LiveKit server setup and token generation.

## Backend Testing

### Test Commands

```bash
cd docker/backend

# Run all unit tests (107 tests, fast, no API calls)
npm test

# Run LLM-as-Judge tests (uses OpenAI API from .env)
npm run test:llm

# Run AImee core feature tests (12 Gherkin scenarios)
RUN_LLM_TESTS=true npx jest --testPathPattern=aimeeCoreFeature

# Run AImee personality tests (6 Gherkin scenarios)
RUN_LLM_TESTS=true npx jest --testPathPattern=aimeePersonality

# Run all behavioral tests (18 scenarios total)
RUN_LLM_TESTS=true npx jest --testPathPattern="aimee(CoreFeature|Personality)"

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Test Reports

HTML test reports are automatically generated in `docker/backend/test-reports/` with timestamped filenames:

```
test-reports/test-report_2025-12-04_18-03-40.html
```

Open in browser to view pass/fail status, failure messages, and test durations.

### Test Structure

```text
src/
├── __tests__/setup.ts              # Test environment configuration
├── brain/__tests__/                # Intent routing tests
├── memory/__tests__/               # Memory & transcript store tests
├── agents/__tests__/               # Agent routing & utility tests
└── testing/
    ├── llmJudge.ts                 # LLM-as-Judge evaluation module
    └── __tests__/
        ├── criticalPaths.test.ts    # Quality evaluation tests
        ├── aimeeCoreFeature.test.ts # Core behavioral tests (12 scenarios)
        └── aimeePersonality.test.ts # Personality tests (6 scenarios)
```

### Test-Driven Development

Behavioral tests are defined using Gherkin specs in `/specs/features/`. Two test files implement 18 total scenarios:

**`aimeeCoreFeature.test.ts`** - 12 scenarios from `aimee_core.feature`:
- **Section 1**: First-time user experience (onboarding, name handling)
- **Section 2**: Returning user experience (greetings, preferences)
- **Section 3**: Driving safety rules (visual disclaimers, conciseness)
- **Section 4**: Nearby markers & storytelling (marker intro, prioritization)
- **Section 5**: Conversational rules (interruptions, ambiguity, uncertainty)

**`aimeePersonality.test.ts`** - 6 scenarios from `aimee_personality.feature`:
- **Section 1**: Voice, warmth & consistency (warm tone, natural pacing, name pronunciation)
- **Section 2**: Response length and structure (conciseness, structured storytelling)
- **Section 3**: Handling unknown information (graceful uncertainty)

For new features, provide Given-When-Then statements:

```gherkin
Scenario: User asks for food nearby
  Given the user has shared their location
  When the user asks "What's good to eat around here?"
  Then AImee should reference their location
  And suggest nearby options
```

### LLM-as-Judge Pattern

Tests use `LLMJudge` class to semantically evaluate responses against criteria:

```typescript
const judge = new LLMJudge();
const result = await judge.judgeOnboarding(response);
expect(result.pass).toBe(true);
```

Judge methods evaluate responses for warmth, accuracy, safety disclaimers, conciseness, and behavioral compliance.

## Data Storage

### User Memory

- Location: `/app/rag-json/memory.json` (Docker volume)
- Contains: name, interests, preferences, visited markers
- API: `GET/POST /api/memory/:userId`

### Conversation Transcripts

- Location: `/app/rag-json/transcripts.json` (Docker volume)
- Contains: full session history with timestamps
- API:
  - `POST /api/session/start` - Start new session
  - `POST /api/session/end` - End session
  - `GET /api/transcripts/:userId` - Get user's transcripts
