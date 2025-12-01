// LiveKit Configuration for AImee POC
// This file contains placeholder values for development and testing

export interface LiveKitConfig {
  url: string;
  token: string;
}

// Default configuration for Phase 6 development
// Note: For production, tokens should be generated server-side
export const LIVEKIT_CONFIG: LiveKitConfig = {
  // LiveKit server URL - matches the agent configuration
  url: 'wss://aimee-sesame-ai-tourguide-tvynvi64.livekit.cloud',

  // Development token for room "aimee-phase1"
  // This token is safe to include in mobile code as it has limited scope and expires
  // Room: aimee-phase1, Identity: AImee phase 1, Expires: 2025-12-10
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3NjUyMTUzNzAsImlkZW50aXR5IjoiQUltZWUgcGhhc2UgMSIsImlzcyI6IkFQSVNlY21IN05DM0pyaiIsIm5iZiI6MTc2NDYxMDU3MCwic3ViIjoiQUltZWUgcGhhc2UgMSIsInZpZGVvIjp7ImNhblB1Ymxpc2giOnRydWUsImNhblB1Ymxpc2hEYXRhIjp0cnVlLCJjYW5TdWJzY3JpYmUiOnRydWUsInJvb20iOiJhaW1lZS1waGFzZTEiLCJyb29tSm9pbiI6dHJ1ZX19.YEFBPfNUuNEs754G6SKgZPS8iI3fJovCYult_PNivHY'
};

// Environment-specific configurations
export const getConfigForEnvironment = (env: 'development' | 'staging' | 'production'): LiveKitConfig => {
  switch (env) {
    case 'development':
      return {
        url: 'wss://aimee-sesame-ai-tourguide-tvynvi64.livekit.cloud',
        token: LIVEKIT_CONFIG.token // Use the same placeholder token
      };

    case 'staging':
      return {
        url: 'wss://staging-your-project.livekit.cloud',
        token: LIVEKIT_CONFIG.token
      };

    case 'production':
      return {
        url: 'wss://your-project.livekit.cloud',
        token: LIVEKIT_CONFIG.token
      };

    default:
      return LIVEKIT_CONFIG;
  }
};

// Room configuration for testing
export const ROOM_CONFIG = {
  // Room name for testing - in production this should be dynamic
  roomName: 'test-room',

  // Participant identity - in production this should be unique per user
  participantIdentity: `user-${Date.now()}`,

  // Audio/Video settings
  audio: true,
  video: false, // Phase 1 is audio-only

  // Quality settings
  adaptiveStream: true,
  dynacast: true,
};

// Instructions for setting up real LiveKit server and tokens
export const SETUP_INSTRUCTIONS = `
🔧 LIVEKIT SETUP INSTRUCTIONS

To test with a real LiveKit server:

1. OPTION A - Use LiveKit Cloud:
   • Sign up at https://cloud.livekit.io/
   • Create a new project
   • Get your WebSocket URL and API keys
   • Generate a JWT token with room_join, can_publish, can_subscribe permissions

2. OPTION B - Local LiveKit Server:
   • Download from https://github.com/livekit/livekit/releases
   • Run: ./livekit-server --dev
   • Server will run on ws://localhost:7880
   • Generate token at https://livekit.io/jwt using default keys

3. UPDATE CONFIG:
   • Replace the URL in LIVEKIT_CONFIG.url
   • Replace the token in LIVEKIT_CONFIG.token
   • Ensure the token has the correct room name and permissions

4. TESTING:
   • Connect multiple devices to the same room
   • Enable microphone on one device
   • Audio should be heard on other devices

Current config is using placeholder values and will not work for real testing.
`;

export default LIVEKIT_CONFIG;