# Phase 6 Setup: Real-time Voice Loop

## Overview

Phase 6 implements true speech-to-speech conversation using OpenAI's GPT-4o-mini model bridged through LiveKit Agents framework.

## Architecture

```
Mobile App (User) ←→ LiveKit Cloud ←→ Agent Container ←→ OpenAI API (GPT-4o-mini)
```

## Setup Instructions

### 1. Environment Configuration
Copy the environment template:
```bash
cp .env.example .env
```

Fill in your credentials:
- `OPENAI_API_KEY`: Your OpenAI API key
- `LIVEKIT_URL`: Your LiveKit server URL (from existing Phase 1 setup)
- `LIVEKIT_API_KEY`: Your LiveKit API key
- `LIVEKIT_API_SECRET`: Your LiveKit API secret

### 2. Start Services
```bash
# Start backend and agent containers
docker compose up --build

# Or start individual services
docker compose up backend agent
```

### 3. Mobile App
The mobile app should already be configured from previous phases. Ensure:
- Room name matches: `aimee-phase1`
- LiveKit credentials are valid
- Mobile app can connect to LiveKit

### 4. Testing the Voice Loop

1. **Start containers**: Ensure backend and agent are running
2. **Connect mobile app**: Tap "Connect to LiveKit" in VoiceScreen
3. **Enable microphone**: Tap "Start Microphone"
4. **Wait for AImee**: Agent should join room and show "AImee Connected"
5. **Talk to AImee**: Speak into the microphone for real-time conversation

## Expected Behavior

- **Green status**: AImee Connected
- **Orange dot**: AImee is speaking
- **Real-time responses**: Low latency speech-to-speech conversation
- **Auto-playback**: AImee's voice plays through device speaker

## Troubleshooting

### Agent won't connect
- Check environment variables in docker compose logs
- Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET are correct
- Ensure OpenAI API key is valid

### No audio from AImee
- Check mobile app shows "AImee Connected"
- Verify microphone is enabled and recording
- Check agent logs for OpenAI API connection errors

### Poor audio quality
- Check network connection quality
- Monitor agent logs for audio processing errors
- Verify LiveKit server has good connectivity

## Development

### Agent Development
```bash
# Work on agent code
cd docker/agent
# Edit aimee_agent.py and rebuild container
docker compose build agent
docker compose up agent
```

### Mobile Development
The mobile app supports hot reload via Expo dev server as in previous phases.

## What's Different from Previous Phases?

- **OpenAI Integration**: Uses GPT-4o-mini with STT/TTS for voice processing
- **LiveKit Agents**: Python-based agent framework handles voice pipeline
- **Real-time conversation**: Low latency streaming audio
- **Agent container**: Dedicated container bridges audio to OpenAI

## Next Steps

After Phase 6 is working:
- Integrate GPS context into voice sessions
- Add multi-agent brain routing
- Implement voice activity detection improvements
- Add conversation memory and context persistence