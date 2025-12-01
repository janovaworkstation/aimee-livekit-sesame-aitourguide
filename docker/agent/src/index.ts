// AImee LiveKit Agent - Main Entry Point
// Bridges user audio from LiveKit to OpenAI Realtime API and back

import dotenv from 'dotenv';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteAudioTrack,
  AudioFrame,
  AudioSource,
  LocalAudioTrack,
  TrackSource,
  TrackPublishOptions
} from '@livekit/rtc-node';
import { AccessToken } from 'livekit-server-sdk';
import { RealtimeSession, RealtimeConfig, AudioChunk } from './realtimeSession';
import {
  livekitToRealtime,
  realtimeToLivekit,
  FORMATS,
  logAudioStats,
  validateAudioBuffer
} from './audioUtils';

// Load environment variables
dotenv.config();

interface AgentConfig {
  livekitUrl: string;
  livekitApiKey: string;
  livekitApiSecret: string;
  openaiApiKey: string;
  openaiModel: string;
  roomName: string;
  participantIdentity: string;
}

class AImeeAgent {
  private config: AgentConfig;
  private room: Room;
  private realtimeSession: RealtimeSession | null = null;
  private audioSource: AudioSource | null = null;
  private localAudioTrack: LocalAudioTrack | null = null;
  private activeUserTrack: RemoteAudioTrack | null = null;
  private isProcessing = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.room = new Room();
    this.setupRoomEventHandlers();
  }

  private setupRoomEventHandlers(): void {
    this.room.on(RoomEvent.Connected, () => {
      console.log('Agent: Connected to LiveKit room');
      console.log('Agent: RoomEvent.Connected handler executing...');
      // Immediately set up local audio track so mobile app can detect agent
      console.log('Agent: About to call setupLocalAudioTrack()');
      this.setupLocalAudioTrack();
      console.log('Agent: About to call initializeRealtimeSession()');
      this.initializeRealtimeSession();
      console.log('Agent: RoomEvent.Connected handler completed');
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('Agent: Disconnected from LiveKit room');
      this.cleanup();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Agent: Participant connected:', participant.identity);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Agent: Participant disconnected:', participant.identity);
      if (this.activeUserTrack && participant.identity !== this.config.participantIdentity) {
        this.activeUserTrack = null;
      }
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (!track || !participant) {
        console.warn('Agent: TrackSubscribed event received with missing track or participant');
        return;
      }

      console.log(`Agent: Track subscribed - ${track.kind} from ${participant.identity}`);

      if (track instanceof RemoteAudioTrack && participant.identity !== this.config.participantIdentity) {
        console.log('Agent: Setting up user audio track for processing');
        this.activeUserTrack = track;
        this.setupUserAudioProcessing(track);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      if (!track || !participant) {
        console.warn('Agent: TrackUnsubscribed event received with missing track or participant');
        return;
      }

      console.log(`Agent: Track unsubscribed - ${track.kind} from ${participant.identity}`);

      if (this.activeUserTrack === track) {
        console.log('Agent: User audio track removed');
        this.activeUserTrack = null;
      }
    });
  }

  private async initializeRealtimeSession(): Promise<void> {
    try {
      const realtimeConfig: RealtimeConfig = {
        apiKey: this.config.openaiApiKey,
        model: this.config.openaiModel,
        instructions: `You are AImee, a friendly and knowledgeable AI tour guide. You help people discover interesting places and provide engaging location-based information. Speak in a warm, conversational tone as if you're guiding someone on a personal tour. Keep your responses concise but informative.`
      };

      this.realtimeSession = new RealtimeSession(realtimeConfig);

      // Set up Realtime session event handlers
      this.realtimeSession.on('assistantAudio', (audioChunk: AudioChunk) => {
        this.handleAssistantAudio(audioChunk);
      });

      this.realtimeSession.on('userSpeechStarted', () => {
        console.log('Agent: User started speaking (detected by OpenAI)');
      });

      this.realtimeSession.on('userSpeechStopped', () => {
        console.log('Agent: User stopped speaking (detected by OpenAI)');
      });

      this.realtimeSession.on('assistantText', (text: string) => {
        console.log('Agent: Assistant text:', text);
      });

      this.realtimeSession.on('userTranscript', (transcript: string) => {
        console.log('Agent: User transcript:', transcript);
      });

      this.realtimeSession.on('error', (error: Error) => {
        console.error('Agent: Realtime session error:', error);
      });

      await this.realtimeSession.connect();
      console.log('Agent: OpenAI Realtime session initialized');

    } catch (error) {
      console.error('Agent: Failed to initialize Realtime session:', error);
    }
  }

  private async setupLocalAudioTrack(): Promise<void> {
    try {
      console.log('Agent: Setting up local audio track...');

      // Create audio source and local audio track for AImee's voice
      // Use OpenAI Realtime format: 24kHz mono
      console.log('Agent: Creating AudioSource...');
      this.audioSource = new AudioSource(24000, 1);

      console.log('Agent: Creating LocalAudioTrack...');
      this.localAudioTrack = LocalAudioTrack.createAudioTrack('aimee-voice', this.audioSource);

      console.log('Agent: Creating TrackPublishOptions...');
      const options = new TrackPublishOptions();
      options.source = TrackSource.SOURCE_MICROPHONE;

      console.log('Agent: Publishing track to room...');
      await this.room.localParticipant?.publishTrack(this.localAudioTrack, options);

      console.log('Agent: Local audio track created and published for AImee voice');
    } catch (error) {
      console.error('Agent: Failed to create local audio track:', error);
      if (error instanceof Error) {
        console.error('Agent: Error details:', error.message);
        console.error('Agent: Error stack:', error.stack);
      }
    }
  }

  private setupUserAudioProcessing(audioTrack: RemoteAudioTrack): void {
    console.log('Agent: Setting up audio processing for user track');

    try {
      // For now, just log that we've detected the track
      // The LiveKit rtc-node SDK doesn't provide direct frame access
      // We'll need to implement audio processing differently
      console.log('Agent: User audio track detected and stored');
      console.log('Agent: Track details:', {
        sid: audioTrack.sid,
        name: audioTrack.name,
        kind: audioTrack.kind
      });

      // TODO: Implement actual audio frame processing
      // This may require using WebRTC directly or finding another approach
      console.log('Agent: Audio processing implementation needed');

    } catch (error) {
      console.error('Agent: Error setting up user audio processing:', error);
    }
  }

  private processUserAudioFrame(frame: AudioFrame): void {
    try {
      // Convert AudioFrame data to Buffer
      const audioBuffer = Buffer.from(frame.data);

      // Validate the audio buffer
      if (!validateAudioBuffer(audioBuffer, FORMATS.LIVEKIT_DEFAULT)) {
        return;
      }

      // Convert LiveKit format to OpenAI Realtime format
      const realtimeBuffer = livekitToRealtime(audioBuffer);

      // Log audio stats for debugging (less frequent logging)
      if (Math.random() < 0.01) { // 1% of frames
        logAudioStats(audioBuffer, 'User→Realtime', FORMATS.LIVEKIT_DEFAULT);
      }

      // Send to OpenAI Realtime
      const audioChunk: AudioChunk = {
        audio: realtimeBuffer,
        format: 'pcm16',
        sampleRate: FORMATS.OPENAI_REALTIME.sampleRate,
        channels: FORMATS.OPENAI_REALTIME.channels
      };

      this.realtimeSession?.sendAudioChunk(audioChunk);

    } catch (error) {
      console.error('Agent: Error processing user audio frame:', error);
    }
  }

  private async handleAssistantAudio(audioChunk: AudioChunk): Promise<void> {
    try {
      if (!this.audioSource) {
        console.warn('Agent: No audio source available for assistant audio');
        return;
      }

      // Convert OpenAI Realtime format to AudioFrame for LiveKit
      // AudioChunk.audio is already in the correct format for AudioSource
      const audioBuffer = new Int16Array(audioChunk.audio.buffer);

      // Log audio stats for debugging (less frequent logging)
      if (Math.random() < 0.1) { // 10% of chunks
        logAudioStats(audioChunk.audio, 'Assistant→LiveKit', FORMATS.OPENAI_REALTIME);
      }

      // Create AudioFrame and send to LiveKit via audio source
      const audioFrame = new AudioFrame(
        audioBuffer,
        audioChunk.sampleRate,
        audioChunk.channels,
        audioBuffer.length / audioChunk.channels
      );

      await this.audioSource.captureFrame(audioFrame);

    } catch (error) {
      console.error('Agent: Error handling assistant audio:', error);
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('Agent: Connecting to LiveKit...');
      console.log('Agent: Connection URL:', this.config.livekitUrl);

      // Create access token for the agent
      const token = new AccessToken(
        this.config.livekitApiKey,
        this.config.livekitApiSecret,
        {
          identity: this.config.participantIdentity,
          name: 'AImee Tour Guide'
        }
      );

      // Grant permissions for the agent
      token.addGrant({
        room: this.config.roomName,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true
      });

      console.log('Agent: Generating JWT token...');
      const jwt = await token.toJwt();
      console.log('Agent: JWT token generated successfully');

      // Connect to room with rtc-node API
      console.log('Agent: Calling room.connect()...');
      await this.room.connect(this.config.livekitUrl, jwt, {
        autoSubscribe: true,
        dynacast: true
      });
      console.log('Agent: room.connect() completed successfully');
      console.log(`Agent: Connected to room "${this.config.roomName}" as "${this.config.participantIdentity}"`);

      // Manually call setup methods since RoomEvent.Connected might not fire properly
      console.log('Agent: Manually calling setup methods after connection...');
      await this.setupLocalAudioTrack();
      this.initializeRealtimeSession();

    } catch (error) {
      console.error('Agent: Failed to connect to LiveKit:', error);
      throw error;
    }
  }

  private cleanup(): void {
    console.log('Agent: Cleaning up resources...');

    if (this.realtimeSession) {
      this.realtimeSession.disconnect();
      this.realtimeSession = null;
    }

    if (this.localAudioTrack) {
      // LocalAudioTrack cleanup - may not have stop() method
      this.localAudioTrack = null;
    }

    if (this.audioSource) {
      this.audioSource = null;
    }

    this.activeUserTrack = null;
    this.isProcessing = false;
  }

  async disconnect(): Promise<void> {
    this.cleanup();
    await this.room.disconnect();
    console.log('Agent: Disconnected and cleaned up');
  }
}

// Configuration from environment variables
function getConfig(): AgentConfig {
  const requiredEnvVars = [
    'LIVEKIT_URL',
    'LIVEKIT_API_KEY',
    'LIVEKIT_API_SECRET',
    'OPENAI_API_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    livekitUrl: process.env.LIVEKIT_URL!,
    livekitApiKey: process.env.LIVEKIT_API_KEY!,
    livekitApiSecret: process.env.LIVEKIT_API_SECRET!,
    openaiApiKey: process.env.OPENAI_API_KEY!,
    openaiModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-4o-realtime-preview-2024-10-01',
    roomName: process.env.ROOM_NAME || 'aimee-dev',
    participantIdentity: process.env.PARTICIPANT_IDENTITY || 'aimee-agent'
  };
}

// Main application entry point
async function main(): Promise<void> {
  console.log('AImee LiveKit Agent starting...');

  try {
    const config = getConfig();
    console.log('Agent: Configuration loaded');
    console.log(`Agent: Room: ${config.roomName}, Identity: ${config.participantIdentity}`);
    console.log(`Agent: OpenAI Model: ${config.openaiModel}`);

    const agent = new AImeeAgent(config);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nAgent: Received SIGINT, shutting down gracefully...');
      await agent.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\nAgent: Received SIGTERM, shutting down gracefully...');
      await agent.disconnect();
      process.exit(0);
    });

    await agent.connect();
    console.log('Agent: AImee LiveKit Agent ready and listening...');

  } catch (error) {
    console.error('Agent: Fatal error:', error);
    process.exit(1);
  }
}

// Start the agent
main().catch((error) => {
  console.error('Agent: Unhandled error:', error);
  process.exit(1);
});