# Phase 1 - LiveKit Audio POC Testing Guide

## Overview
This guide explains how to test the LiveKit audio loopback functionality implemented in Phase 1.

## Prerequisites
- Physical device (iOS or Android) - **Required for audio testing**
- LiveKit server (cloud or local)
- Valid LiveKit access token

## Setup Instructions

### 1. Configure LiveKit Server
You have several options:

#### Option A: LiveKit Cloud (Recommended)
1. Sign up at https://cloud.livekit.io/
2. Create a new project
3. Get your WebSocket URL (e.g., `wss://your-project.livekit.cloud`)
4. Generate an access token at https://livekit.io/jwt with:
   - Room: `test-room`
   - Permissions: `room_join`, `can_publish`, `can_subscribe`

#### Option B: Local Development Server
1. Download LiveKit server: https://github.com/livekit/livekit/releases
2. Run: `./livekit-server --dev`
3. Server will be available at `ws://localhost:7880`
4. Generate token at https://livekit.io/jwt using default dev keys

### 2. Update Configuration
Edit `/mobile/app/lib/config.ts`:

```typescript
export const LIVEKIT_CONFIG: LiveKitConfig = {
  url: 'wss://your-project.livekit.cloud', // Your actual server URL
  token: 'eyJhbGc...' // Your generated access token
};
```

### 3. Build and Deploy
```bash
cd mobile

# Install dependencies (if not already done)
npm install

# Start development server
npx expo start

# Build for device (required for audio functionality)
npx expo run:ios     # For iOS
npx expo run:android # For Android
```

**Note**: Audio functionality requires running on a physical device, not the simulator/emulator.

## Testing Steps

### 1. Basic Connection Test
1. Launch the app on your device
2. Tap "Connect to LiveKit"
3. Verify status shows "Connected to LiveKit"
4. Check status log for connection messages

### 2. Microphone Test
1. Ensure connection is established
2. Tap "Start Microphone"
3. Verify status shows "🎤 Recording"
4. Speak into the device microphone
5. You should hear your voice through the speakers (loopback)

### 3. Disconnect Test
1. Tap "Stop Microphone" to disable audio
2. Tap "Disconnect" to leave the room
3. Verify status shows "Disconnected"

## Expected Behavior

### Successful Loopback
- **Connect**: Status changes to "Connected to LiveKit"
- **Mic Start**: Status shows "🎤 Recording"
- **Audio**: Your voice is heard through device speakers with <200ms latency
- **Mic Stop**: Status shows "🔇 Muted", audio stops
- **Disconnect**: Clean disconnection from room

### Troubleshooting

#### Connection Fails
- Verify server URL is correct and reachable
- Check token is valid and not expired
- Ensure device has internet connectivity

#### No Audio Loopback
- Confirm app has microphone permissions
- Test on physical device (not simulator)
- Check device volume levels
- Verify token has `can_publish` and `can_subscribe` permissions

#### Audio Quality Issues
- Test with different devices
- Check network stability
- Adjust audio session configuration if needed

## Multi-Device Testing
For enhanced testing:
1. Connect multiple devices to the same room
2. Enable microphone on one device
3. Verify audio is heard on all other devices
4. Test simultaneous audio from multiple sources

## Development Notes

### Current Implementation
- **Audio Only**: Video is disabled for Phase 1
- **Single Room**: All connections use `test-room`
- **Placeholder Config**: Default values will not work for real testing
- **Error Handling**: Basic error display and logging

### Known Limitations
- Token must be manually generated/updated
- Room name is hardcoded
- No participant management UI
- Basic error recovery

## Next Steps (Phase 2)
- OpenAI Realtime API integration
- Dynamic token generation
- Enhanced error handling
- Multiple room support

## Debug Information

### Status Log
The app includes a status log showing:
- Connection attempts
- Audio session state changes
- Error messages
- Microphone enable/disable events

### Configuration Help
Tap "📖 View Setup Instructions" in the app for quick reference.

### Console Logs
Check device logs for detailed debugging:
- iOS: Xcode Console or Device Console
- Android: `adb logcat` or Android Studio Logcat

Look for logs prefixed with `LiveKit:` or `VoiceScreen:`