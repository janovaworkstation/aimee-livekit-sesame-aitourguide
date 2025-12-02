# AImee - AI Tour Guide with Real-time Voice

AImee is an intelligent tour guide application that provides real-time voice conversations using LiveKit and OpenAI. Users can have natural conversations with AImee about locations, landmarks, and travel information through their mobile device.

## 🎯 Current Status: Phase 6

**Real-time Voice Conversations** - Complete voice-to-voice interaction using LiveKit Agents framework with OpenAI integration.

### Features
- ✅ Real-time speech-to-speech conversations
- ✅ Natural tour guide personality
- ✅ Automatic greeting when users join
- ✅ Mute/unmute controls for privacy
- ✅ Low-latency audio processing
- ✅ Cross-platform mobile support (iOS/Android)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Python Agent  │    │ Node.js Backend │
│  (React Native) │◄──►│ (LiveKit Agent) │    │ (Multi-Agent)   │
│                 │    │                 │    │                 │
│ • Voice UI      │    │ • Speech-to-Text│    │ • OpenAI API    │
│ • LiveKit Client│    │ • LLM Processing│    │ • Agent Routing │
│ • Mute Controls │    │ • Text-to-Speech│    │ • Conversation  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   LiveKit Cloud │
                    │ (Voice Transport)│
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm
- Physical iOS/Android device (required for voice functionality)
- OpenAI API key
- LiveKit account and credentials

### 1. Environment Setup

Create a `.env` file in the project root:

```bash
# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Room Configuration
ROOM_NAME=aimee-phase1
PARTICIPANT_IDENTITY=aimee-agent
```

### 2. Start the Voice Agent

```bash
# Start the Python voice agent
docker compose up agent

# Or rebuild from scratch
docker compose down && docker compose build --no-cache agent && docker compose up agent
```

### 3. Run the Mobile App

```bash
cd mobile

# Install dependencies
npm install

# Start development server
npx expo start

# Deploy to physical device (required for voice)
npx expo run:ios     # iOS
npx expo run:android # Android
```

### 4. Test Voice Conversation

1. Open the mobile app on your physical device
2. Tap "Connect to AImee"
3. AImee will automatically greet you
4. Use "Mute/Unmute" button to control your microphone
5. Have a natural conversation about travel and locations!

## 📱 Mobile App Usage

### Voice Controls
- **Connect to AImee**: Join the LiveKit room and start conversation
- **🎤 Mute**: Disable microphone (AImee can't hear you)
- **🔇 Unmute**: Enable microphone (AImee can hear you)
- **Disconnect**: Leave the room and end conversation

### Status Indicators
- **Listening**: Microphone is active, AImee can hear you
- **Muted**: Microphone is disabled for privacy
- **Connected**: Successfully connected to AImee's voice agent
- **Connecting**: Establishing connection to LiveKit room

## 🛠️ Development

### Project Structure
```
aimee-livekit-sesame-aitourguide/
├── mobile/                      # React Native mobile app
│   ├── app/
│   │   ├── screens/VoiceScreen.tsx    # Main voice interface
│   │   └── lib/config.ts              # LiveKit configuration
│   └── package.json
├── docker/
│   ├── agent/                   # Python voice agent
│   │   ├── aimee_agent.py            # LiveKit Agents implementation
│   │   ├── requirements.txt          # Python dependencies
│   │   └── Dockerfile
│   └── backend/                 # Node.js backend (legacy)
│       ├── src/index.ts              # Express server
│       └── package.json
├── docker-compose.yml           # Service orchestration
└── .env                        # Environment configuration
```

### Running Individual Services

**Python Voice Agent**:
```bash
docker compose up agent
```

**Node.js Backend**:
```bash
docker compose up backend
```

**Mobile Development**:
```bash
cd mobile
npx expo start
```

### Common Development Tasks

**Rebuild Agent with Code Changes**:
```bash
docker compose down && docker compose build --no-cache agent && docker compose up agent
```

**View Agent Logs**:
```bash
docker compose logs -f agent
```

**Mobile App Development**:
```bash
cd mobile
npx expo start --clear    # Clear cache
```

## 🔧 Configuration

### LiveKit Setup

1. **LiveKit Cloud** (Recommended):
   - Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
   - Create a new project
   - Get WebSocket URL and API credentials
   - Update `.env` file with your values

2. **Local LiveKit Server**:
   - Download from [LiveKit Releases](https://github.com/livekit/livekit/releases)
   - Run: `./livekit-server --dev`
   - Use `ws://localhost:7880` as URL

### OpenAI Models

The system uses OpenAI for:
- **Speech-to-Text**: Converts user voice to text
- **Language Model**: `gpt-4o-mini` for conversation processing
- **Text-to-Speech**: Converts AImee's responses to voice

### Mobile App Configuration

Update `mobile/app/lib/config.ts` if needed:
- LiveKit server URL
- JWT token for room access (for development)
- Room and participant settings

## 📋 Testing

### Voice Functionality Testing

**Requirements**:
- Physical device (voice doesn't work in simulators)
- Stable internet connection
- Microphone permissions granted

**Test Flow**:
1. Start the voice agent: `docker compose up agent`
2. Deploy mobile app to physical device
3. Connect to AImee and verify automatic greeting
4. Test mute/unmute functionality
5. Have a conversation to verify speech-to-speech pipeline

**Expected Behavior**:
- AImee greets automatically when you join
- Voice recognition works with <200ms latency
- Mute button properly controls microphone state
- Natural conversation flow with tour guide personality

### Multi-Device Testing

Connect multiple devices to the same room to test:
- Multiple users hearing AImee simultaneously
- Audio quality with multiple participants
- Room management and participant handling

## 🐛 Troubleshooting

### Agent Won't Start
- Check Docker is running: `docker --version`
- Verify environment variables in `.env` file
- Clear Docker cache: `docker system prune -f`
- Check agent logs: `docker compose logs agent`

### Mobile App Connection Issues
- Verify LiveKit credentials are correct
- Ensure device has internet connectivity
- Check mobile app has microphone permissions
- Confirm you're using a physical device (not simulator)

### No Voice Recognition
- Grant microphone permissions to the app
- Test with different devices to isolate hardware issues
- Check LiveKit room connection in app status log
- Verify OpenAI API key is valid

### Audio Quality Issues
- Test with different network conditions
- Check device volume levels
- Verify LiveKit server connectivity
- Review audio session configuration

## 📚 Documentation

- **Phase 1 Testing Guide**: `mobile/PHASE_1_TESTING.md` - Detailed testing instructions
- **Development Guide**: `CLAUDE.md` - Architecture and commands for AI assistants
- **LiveKit Documentation**: [LiveKit Docs](https://docs.livekit.io/)
- **OpenAI API Reference**: [OpenAI API Docs](https://platform.openai.com/docs)

## 🔄 Project Phases

- **Phase 1**: ✅ Basic LiveKit audio loopback
- **Phase 2-5**: ✅ OpenAI integration and multi-agent backend
- **Phase 6**: ✅ Real-time voice conversations with LiveKit Agents
- **Future**: Enhanced tour guide features, location integration, multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test voice functionality on physical devices
4. Ensure Docker services build correctly
5. Submit pull request with detailed description

## 📄 License

This project is for educational and demonstration purposes. Please ensure you have appropriate licenses for OpenAI API usage and LiveKit services.