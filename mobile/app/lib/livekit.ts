import { AudioSession, registerGlobals } from '@livekit/react-native';

export interface LiveKitConfig {
  url: string;
  token: string;
}

export class LiveKitManager {
  private isConnected = false;
  private isMicEnabled = false;
  private aimeeConnected = false;
  private globalsRegistered = false;
  private audioSessionActive = false;

  constructor() {
    // Register LiveKit globals when manager is created
    this.ensureGlobalsRegistered();
    console.log('LiveKit: Manager created (simplified for Phase 6)');
  }

  private ensureGlobalsRegistered(): void {
    if (!this.globalsRegistered) {
      try {
        registerGlobals();
        this.globalsRegistered = true;
        console.log('LiveKit: Globals registered successfully');
      } catch (error) {
        console.warn('LiveKit: Failed to register globals:', error);
      }
    }
  }

  async connectToRoom(config: LiveKitConfig): Promise<void> {
    try {
      console.log('LiveKit: Starting connection process...');

      // Start audio session
      console.log('LiveKit: Starting audio session...');
      await AudioSession.startAudioSession();
      this.audioSessionActive = true;

      // For Phase 6, we'll simulate connection since the agent handles the real LiveKit room
      // In a full implementation, this would create WebRTC connection to LiveKit server
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate connection time

      this.isConnected = true;
      this.aimeeConnected = true; // Since agent is already connected

      console.log('LiveKit: Successfully connected to room (simulated)');
    } catch (error) {
      console.error('LiveKit: Failed to connect to room', error);
      throw new Error(`Failed to connect to LiveKit room: ${error}`);
    }
  }

  async startMicrophone(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Must be connected to room before enabling microphone');
    }

    try {
      console.log('LiveKit: Enabling microphone...');

      // For Phase 6, we'll simulate microphone enabling
      // The real audio will go through the agent to OpenAI Realtime API
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate mic setup

      this.isMicEnabled = true;
      console.log('LiveKit: Microphone enabled (audio routed through agent)');
    } catch (error) {
      console.error('LiveKit: Failed to enable microphone', error);
      throw new Error(`Failed to enable microphone: ${error}`);
    }
  }

  async stopMicrophone(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      console.log('LiveKit: Disabling microphone...');
      this.isMicEnabled = false;
      console.log('LiveKit: Microphone disabled');
    } catch (error) {
      console.error('LiveKit: Failed to disable microphone', error);
      throw new Error(`Failed to disable microphone: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isMicEnabled) {
        await this.stopMicrophone();
      }

      console.log('LiveKit: Disconnecting...');

      if (this.audioSessionActive) {
        console.log('LiveKit: Stopping audio session...');
        await AudioSession.stopAudioSession();
        this.audioSessionActive = false;
      }

      this.isConnected = false;
      this.aimeeConnected = false;

      console.log('LiveKit: Successfully disconnected');
    } catch (error) {
      console.error('LiveKit: Error during disconnect', error);
      // Still try to stop audio session even if other cleanup fails
      try {
        if (this.audioSessionActive) {
          await AudioSession.stopAudioSession();
          this.audioSessionActive = false;
        }
      } catch (audioError) {
        console.error('LiveKit: Failed to stop audio session', audioError);
      }
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getMicrophoneStatus(): boolean {
    return this.isMicEnabled;
  }

  getAimeeStatus(): { connected: boolean; speaking: boolean; track: any } {
    return {
      connected: this.aimeeConnected,
      speaking: this.aimeeConnected && this.isMicEnabled, // Simulate speaking when mic is on
      track: null
    };
  }

  isAimeeConnected(): boolean {
    return this.aimeeConnected;
  }

  getRoom(): any {
    return null; // No room object in simplified version
  }

  getLocalParticipant(): any {
    return null;
  }

  // Get all audio tracks (for loopback testing)
  getAudioTracks() {
    return [];
  }
}

// Singleton instance for easy access throughout the app
export const liveKitManager = new LiveKitManager();

// Helper functions for common operations
export async function connectToLiveKitRoom(url: string, token: string): Promise<void> {
  await liveKitManager.connectToRoom({ url, token });
}

export async function startMicrophone(): Promise<void> {
  await liveKitManager.startMicrophone();
}

export async function stopMicrophone(): Promise<void> {
  await liveKitManager.stopMicrophone();
}

export async function disconnectFromRoom(): Promise<void> {
  await liveKitManager.disconnect();
}

export function getConnectionStatus(): boolean {
  return liveKitManager.getConnectionStatus();
}

export function getMicrophoneStatus(): boolean {
  return liveKitManager.getMicrophoneStatus();
}

export function getAimeeStatus() {
  return liveKitManager.getAimeeStatus();
}

export function isAimeeConnected(): boolean {
  return liveKitManager.isAimeeConnected();
}