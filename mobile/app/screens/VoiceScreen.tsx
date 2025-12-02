import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import {
  AudioSession,
  LiveKitRoom,
  useTracks,
  useLocalParticipant,
  TrackReferenceOrPlaceholder,
  isTrackReference,
  registerGlobals
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { LIVEKIT_CONFIG, SETUP_INSTRUCTIONS } from '../lib/config';

type VoiceScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Voice'>;

interface Props {
  navigation: VoiceScreenNavigationProp;
}

export default function VoiceScreen({ navigation }: Props) {
  const [audioSessionStarted, setAudioSessionStarted] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);
  const [statusLog, setStatusLog] = useState<string[]>(['VoiceScreen initialized']);

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `${timestamp}: ${message}`;
    setStatusLog(prev => [...prev.slice(-9), logMessage]); // Keep last 10 messages
    console.log('VoiceScreen:', logMessage);
  };

  // Start audio session when component mounts
  useEffect(() => {
    let startAudio = async () => {
      try {
        addToLog('Registering LiveKit globals...');
        registerGlobals();
        addToLog('LiveKit globals registered successfully');

        addToLog('Starting audio session...');
        await AudioSession.startAudioSession();
        setAudioSessionStarted(true);
        addToLog('Audio session started successfully');
      } catch (error) {
        addToLog(`Failed to start audio session: ${error}`);
      }
    };

    startAudio();

    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  const handleConnect = () => {
    if (!audioSessionStarted) {
      Alert.alert('Audio Session Not Ready', 'Please wait for audio session to initialize');
      return;
    }

    addToLog('Connecting to LiveKit room...');
    setShouldConnect(true);
  };

  const handleDisconnect = () => {
    addToLog('Disconnecting from LiveKit room...');
    setShouldConnect(false);
  };

  if (!audioSessionStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Starting Audio Session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (shouldConnect) {
    return (
      <SafeAreaView style={styles.container}>
        <LiveKitRoom
          serverUrl={LIVEKIT_CONFIG.url}
          token={LIVEKIT_CONFIG.token}
          connect={true}
          options={{
            adaptiveStream: { pixelDensity: 'screen' },
          }}
          audio={true}
          video={false}
          onConnected={() => {
            addToLog('Successfully connected to LiveKit room');
          }}
          onDisconnected={() => {
            addToLog('Disconnected from LiveKit room');
          }}
          onError={(error) => {
            addToLog(`LiveKit error: ${error}`);
          }}
        >
          <RoomView
            addToLog={addToLog}
            onDisconnect={handleDisconnect}
            statusLog={statusLog}
          />
        </LiveKitRoom>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>AImee Voice Assistant</Text>
          <Text style={styles.subtitle}>Phase 6: Real-time Voice Chat</Text>
        </View>

        <View style={styles.connectionSection}>
          <TouchableOpacity
            style={[styles.button, styles.connectButton]}
            onPress={handleConnect}
          >
            <Text style={styles.buttonText}>Connect to AImee</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logSection}>
          <Text style={styles.logTitle}>Status Log</Text>
          <ScrollView style={styles.logContainer}>
            {statusLog.map((log, index) => (
              <Text key={index} style={styles.logText}>
                {log}
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Component that renders inside the LiveKitRoom context
const RoomView = ({ addToLog, onDisconnect, statusLog }: {
  addToLog: (message: string) => void;
  onDisconnect: () => void;
  statusLog: string[];
}) => {
  const [isMicMuted, setIsMicMuted] = useState(false); // Start unmuted by default (mic is active)
  const { localParticipant } = useLocalParticipant();

  // Get all audio tracks from the room
  const audioTracks = useTracks();
  const agentTracks = audioTracks.filter(track =>
    isTrackReference(track) &&
    track.participant.identity === 'aimee-agent' &&
    track.publication?.kind === 'audio'
  );

  const aimeeConnected = agentTracks.length > 0;

  useEffect(() => {
    if (aimeeConnected) {
      addToLog('AImee agent detected in room');
    }
  }, [aimeeConnected]);

  const toggleMicrophone = async () => {
    try {
      if (!localParticipant) {
        addToLog('Local participant not available');
        return;
      }

      if (isMicMuted) {
        addToLog('Unmuting microphone...');
        await localParticipant.setMicrophoneEnabled(true);
        setIsMicMuted(false);
        addToLog('Microphone unmuted - speak to AImee');
      } else {
        addToLog('Muting microphone...');
        await localParticipant.setMicrophoneEnabled(false);
        setIsMicMuted(true);
        addToLog('Microphone muted');
      }
    } catch (error) {
      addToLog(`Microphone toggle error: ${error}`);
    }
  };

  return (
    <View style={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>🎤 Connected to LiveKit</Text>
        <Text style={styles.subtitle}>
          {aimeeConnected ? '✅ AImee Connected' : '⏳ Waiting for AImee...'}
        </Text>
      </View>

      <View style={styles.connectionSection}>
        <TouchableOpacity
          style={[
            styles.button,
            isMicMuted ? styles.micMutedButton : styles.micUnmutedButton
          ]}
          onPress={toggleMicrophone}
          disabled={!aimeeConnected}
        >
          <Text style={styles.buttonText}>
            {isMicMuted ? '🔇 Unmute' : '🎤 Mute'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={onDisconnect}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>AImee Status:</Text>
          <Text style={[
            styles.statusValue,
            aimeeConnected ? styles.statusConnected : styles.statusDisconnected
          ]}>
            {aimeeConnected ? (isMicMuted ? 'Muted' : 'Listening') : 'Connecting...'}
          </Text>
        </View>
      </View>

      <View style={styles.logSection}>
        <Text style={styles.logTitle}>Status Log</Text>
        <ScrollView style={styles.logContainer}>
          {statusLog.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 30,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  connectionSection: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  connectButton: {
    backgroundColor: '#007AFF',
  },
  micUnmutedButton: {
    backgroundColor: '#34C759', // Green for unmuted/listening
  },
  micMutedButton: {
    backgroundColor: '#6C6C70', // Gray for muted
  },
  disconnectButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusConnected: {
    color: '#34C759',
  },
  statusDisconnected: {
    color: '#FF9500',
  },
  logSection: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    maxHeight: 300,
  },
  logText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Courier',
  },
});