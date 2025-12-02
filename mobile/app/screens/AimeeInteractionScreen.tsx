import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useAimeeSession, useAimeeRoomSession, AimeeState } from '../hooks/useAimeeSession';
import {
  LiveKitRoom,
} from '@livekit/react-native';
import { LIVEKIT_CONFIG } from '../lib/config';

const warmStoneBackground = '#E6D5C3';
const bronzeAccent = '#CD7F32';
const charcoalText = '#333333';

type AimeeInteractionScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AimeeInteraction'>;

interface Props {
  navigation: AimeeInteractionScreenNavigationProp;
}

// Animated AImee Logo Component with State-Based Animations
function AnimatedAimeeLogo({ state, isMuted }: { state: AimeeState; isMuted: boolean }) {
  const pulseValue = useRef(new Animated.Value(1)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const glowValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stop all animations first
    pulseValue.stopAnimation();
    rotateValue.stopAnimation();
    glowValue.stopAnimation();

    // If muted, show pulsing regardless of state
    if (isMuted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
      return;
    }

    // Normal state animations when not muted
    switch (state) {
      case 'connecting':
        // Rotating animation for connecting
        Animated.loop(
          Animated.timing(rotateValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          })
        ).start();
        break;

      case 'idle':
        // Gentle breathing pulse for idle
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseValue, {
              toValue: 1.1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseValue, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'listening':
        // Gentle pulse while waiting for user input
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseValue, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(pulseValue, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'thinking':
        // Gentle glow animation for thinking
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowValue, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(glowValue, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ])
        ).start();
        break;

      case 'speaking':
        // Rotating animation when AImee is speaking
        Animated.loop(
          Animated.timing(rotateValue, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          })
        ).start();
        break;
    }
  }, [state, isMuted, pulseValue, rotateValue, glowValue]);

  const rotate = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glowValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.logoAnimationContainer}>
      {/* Glow effect for thinking state */}
      {state === 'thinking' && (
        <Animated.View
          style={[
            styles.logoGlow,
            {
              opacity: glowOpacity,
            },
          ]}
        />
      )}

      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: pulseValue },
              { rotate: rotate },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/aimee-ui-transparent.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

export default function AimeeInteractionScreen({ navigation }: Props) {
  const session = useAimeeSession();
  const {
    connected,
    connecting,
    error,
    state,
    startSession,
    stopSession,
    startMic,
    stopMic,
    isMuted,
    shouldConnect,
    audioSessionReady,
  } = session;

  const sessionInitialized = useRef(false);

  // Start session when component mounts and session is ready
  useEffect(() => {
    if (audioSessionReady && !sessionInitialized.current) {
      console.log('🔴 Auto-starting session on mount');
      sessionInitialized.current = true;
      startSession();
    }
  }, [audioSessionReady, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔴 Stopping session on unmount');
      stopSession();
    };
  }, [stopSession]);

  // Show loading while audio session initializes
  if (!audioSessionReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={bronzeAccent} />
          <Text style={styles.loadingText}>Initializing Audio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render with LiveKit wrapper if connecting
  if (shouldConnect) {
    return (
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
          console.log('LiveKit room connected');
        }}
        onDisconnected={() => {
          console.log('LiveKit room disconnected');
        }}
        onError={(error) => {
          console.log('LiveKit room error:', error);
        }}
      >
        <RoomInteractionComponent session={session} />
      </LiveKitRoom>
    );
  }

  return <VoiceInteractionUI state={state} isMuted={isMuted} startMic={startMic} stopMic={stopMic} />;
}

// Component that runs inside LiveKit room context
interface RoomInteractionComponentProps {
  session: any; // UseAimeeSessionReturn
}

function RoomInteractionComponent({ session }: RoomInteractionComponentProps) {
  const { state, isMuted, startMic, stopMic, setState } = session;

  const handleAgentConnected = useCallback((connected: boolean) => {
    console.log('🟢 AImee agent in room:', connected);
  }, []);

  const handleStateChange = useCallback((newState: AimeeState) => {
    console.log('🟡 Room state changed:', newState);
    setState(newState); // Actually update the state!
  }, [setState]);

  // Use room session hook for participant detection and state updates
  const { aimeeConnected, localParticipant } = useAimeeRoomSession(
    handleAgentConnected,
    handleStateChange,
    isMuted,
    () => {}, // setConnected - handled by main session hook
    () => {}  // setConnecting - handled by main session hook
  );

  return <VoiceInteractionUI state={state} isMuted={isMuted} startMic={startMic} stopMic={stopMic} />;
}

// Voice-first UI component with state-based animations
interface VoiceInteractionUIProps {
  state: AimeeState;
  isMuted: boolean;
  startMic: () => Promise<void>;
  stopMic: () => Promise<void>;
}

function VoiceInteractionUI({ state, isMuted, startMic, stopMic }: VoiceInteractionUIProps) {
  const micPressValue = useRef(new Animated.Value(1)).current;
  const micPulseValue = useRef(new Animated.Value(1)).current;

  // Get state description for display - hide during speaking/listening
  const getStateDescription = (currentState: AimeeState): string => {
    switch (currentState) {
      case 'connecting': return 'Connecting to AImee...';
      case 'idle': return 'Ready to chat';
      case 'thinking': return 'AImee is thinking...';
      case 'listening': return ''; // Hide during listening
      case 'speaking': return ''; // Hide during speaking
      default: return 'Ready';
    }
  };

  // Get dynamic instruction text
  const getMicInstructionText = (): string => {
    if (isMuted) {
      return 'Press to speak with AImee';
    } else {
      return 'Press to Mute';
    }
  };

  // Handle mic toggle
  const handleMicPress = useCallback(() => {
    // Visual feedback
    Animated.sequence([
      Animated.spring(micPressValue, {
        toValue: 0.9,
        useNativeDriver: true,
        speed: 20,
      }),
      Animated.spring(micPressValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
      }),
    ]).start();

    // Toggle mute state
    if (isMuted) {
      startMic();
    } else {
      stopMic();
    }
  }, [isMuted, startMic, stopMic, micPressValue]);

  // Add pulsing animation when muted
  useEffect(() => {
    if (isMuted) {
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulseValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(micPulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Stop pulsing animation
      micPulseValue.stopAnimation();
      Animated.timing(micPulseValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isMuted, micPulseValue]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            <Text style={styles.titleAI}>AI</Text>
            <Text style={styles.titleMee}>mee</Text>
          </Text>
          <Text style={styles.subtitle}>Your AI Travel Companion</Text>
        </View>

        {/* Animated AImee Logo */}
        <View style={styles.logoSection}>
          <AnimatedAimeeLogo state={state} isMuted={isMuted} />
          <Text style={styles.stateDescription}>
            {getStateDescription(state)}
          </Text>
        </View>

        {/* Microphone Button */}
        <View style={styles.micSection}>
          <Animated.View style={{
            transform: [
              { scale: micPressValue },
              { scale: micPulseValue }
            ]
          }}>
            <TouchableOpacity
              style={[
                styles.micButton,
                !isMuted && styles.micButtonActive
              ]}
              onPress={handleMicPress}
              activeOpacity={0.8}
            >
              <Text style={styles.micIcon}>
                {isMuted ? '🎤' : '🎙️'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
          <Text style={styles.micInstruction}>
            {getMicInstructionText()}
          </Text>
        </View>

        {/* Bottom Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Discover • Explore • Learn</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: warmStoneBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: charcoalText,
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleAI: {
    color: bronzeAccent,
  },
  titleMee: {
    color: charcoalText,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: charcoalText,
    opacity: 0.8,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoAnimationContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 220,
    marginBottom: 24,
  },
  logoGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: bronzeAccent,
    opacity: 0.3,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  stateDescription: {
    fontSize: 20,
    fontWeight: '500',
    color: charcoalText,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 16,
  },
  micSection: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E6D2',
    borderWidth: 3,
    borderColor: bronzeAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 12,
  },
  micButtonActive: {
    backgroundColor: bronzeAccent,
    borderColor: '#B06B20',
  },
  micIcon: {
    fontSize: 32,
  },
  micInstruction: {
    fontSize: 16,
    fontWeight: '400',
    color: charcoalText,
    opacity: 0.7,
    textAlign: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '300',
    color: charcoalText,
    opacity: 0.7,
    letterSpacing: 1,
  },
});