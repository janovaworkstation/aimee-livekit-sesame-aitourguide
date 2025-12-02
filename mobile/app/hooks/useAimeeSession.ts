import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AudioSession,
  useTracks,
  useLocalParticipant,
  TrackReferenceOrPlaceholder,
  isTrackReference,
  registerGlobals,
} from '@livekit/react-native';
import { LIVEKIT_CONFIG } from '../lib/config';

export type AimeeState = 'connecting' | 'idle' | 'listening' | 'speaking' | 'thinking';

export interface UseAimeeSessionReturn {
  // Connection state
  connected: boolean;
  connecting: boolean;
  error: string | null;

  // Visual state for animations
  state: AimeeState;
  setState: (state: AimeeState) => void;

  // Session control
  startSession: () => Promise<void>;
  stopSession: () => Promise<void>;

  // Microphone control
  startMic: () => Promise<void>;
  stopMic: () => Promise<void>;
  isMuted: boolean;

  // Internal LiveKit state
  shouldConnect: boolean;
  audioSessionReady: boolean;
}

// Main hook for AImee session management (voice-first)
export function useAimeeSession(): UseAimeeSessionReturn {
  // Core state
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [state, setState] = useState<AimeeState>('connecting');

  // LiveKit state
  const [audioSessionReady, setAudioSessionReady] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  // Refs for cleanup
  const sessionStarted = useRef(false);

  const addToLog = useCallback((message: string) => {
    console.log(`AimeeSession: ${message}`);
  }, []);

  // Initialize audio session
  useEffect(() => {
    let mounted = true;

    const initializeAudio = async () => {
      try {
        addToLog('Registering LiveKit globals...');
        registerGlobals();

        addToLog('Starting audio session...');
        await AudioSession.startAudioSession();

        if (mounted) {
          setAudioSessionReady(true);
          addToLog('Audio session ready');
        }
      } catch (err) {
        if (mounted) {
          const errorMsg = `Failed to start audio session: ${err}`;
          addToLog(errorMsg);
          setError(errorMsg);
        }
      }
    };

    initializeAudio();

    return () => {
      mounted = false;
      AudioSession.stopAudioSession();
    };
  }, [addToLog]);

  // Session control methods
  const startSession = useCallback(async () => {
    if (!audioSessionReady) {
      const errorMsg = 'Audio session not ready';
      addToLog(errorMsg);
      setError(errorMsg);
      return;
    }

    if (sessionStarted.current) {
      addToLog('Session already started');
      return;
    }

    try {
      sessionStarted.current = true;
      setConnecting(true);
      setState('connecting');
      setError(null);
      addToLog('Starting AImee session...');

      // Start connection
      setShouldConnect(true);

    } catch (err) {
      const errorMsg = `Failed to start session: ${err}`;
      addToLog(errorMsg);
      setError(errorMsg);
      setConnecting(false);
      setState('connecting');
      sessionStarted.current = false;
    }
  }, [audioSessionReady, addToLog]);

  const stopSession = useCallback(async () => {
    try {
      addToLog('Stopping AImee session...');
      setShouldConnect(false);
      setConnected(false);
      setConnecting(false);
      setState('connecting');
      setError(null);
      sessionStarted.current = false;
      addToLog('Session stopped');
    } catch (err) {
      addToLog(`Error stopping session: ${err}`);
    }
  }, [addToLog]);

  const startMic = useCallback(async () => {
    try {
      addToLog('Unmuting microphone...');
      setIsMuted(false);
      setState('listening');
    } catch (err) {
      addToLog(`Error unmuting microphone: ${err}`);
    }
  }, [addToLog]);

  const stopMic = useCallback(async () => {
    try {
      addToLog('Muting microphone...');
      setIsMuted(true);
      setState(connected ? 'idle' : 'connecting');
    } catch (err) {
      addToLog(`Error muting microphone: ${err}`);
    }
  }, [addToLog, connected]);

  return {
    // State
    connected,
    connecting,
    error,
    state,
    setState, // Expose setState for room hook

    // Methods
    startSession,
    stopSession,
    startMic,
    stopMic,
    isMuted,

    // Internal state
    shouldConnect,
    audioSessionReady,
  };
}

// Hook for use inside LiveKit room context to handle participants and agent detection
export function useAimeeRoomSession(
  onAgentConnected: (connected: boolean) => void,
  onStateChange: (state: AimeeState) => void,
  isMuted: boolean,
  setConnected: (connected: boolean) => void,
  setConnecting: (connecting: boolean) => void
) {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks();

  // Find agent tracks
  const agentTracks = tracks.filter(track =>
    isTrackReference(track) &&
    track.participant.identity === 'aimee-agent' &&
    track.publication?.kind === 'audio'
  );

  // More flexible agent detection - any non-local participant
  const nonLocalTracks = tracks.filter(track =>
    isTrackReference(track) &&
    !track.participant.isLocal &&
    track.publication?.kind === 'audio'
  );

  const aimeeConnected = agentTracks.length > 0 || nonLocalTracks.length > 0;

  // Handle agent connection and update main session state
  useEffect(() => {
    onAgentConnected(aimeeConnected);
    setConnected(aimeeConnected);

    if (aimeeConnected) {
      console.log('🟢 AImee agent detected - ready for voice interaction');
      setConnecting(false);
      onStateChange('idle'); // Start in idle, let AImee speak first with greeting
    } else {
      setConnecting(true);
      onStateChange('connecting');
    }
  }, [aimeeConnected, onAgentConnected, setConnected, setConnecting, onStateChange]);

  // Handle microphone state
  useEffect(() => {
    const updateMicrophoneState = async () => {
      if (!localParticipant) return;

      try {
        await localParticipant.setMicrophoneEnabled(!isMuted);
        console.log(`Microphone ${isMuted ? 'muted' : 'unmuted'}`);
      } catch (error) {
        console.log(`Microphone control error: ${error}`);
      }
    };

    updateMicrophoneState();
  }, [isMuted, localParticipant]);

  return {
    aimeeConnected,
    localParticipant,
  };
}