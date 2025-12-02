// AImee Tour Screen
// Phase 4: GPS tracking, arrival detection, and narrative display

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import * as Speech from 'expo-speech';
import { useArrivalDetection, formatApproachStatus } from '../hooks/useArrivalDetection';
import { formatCoordinates, formatDistance } from '../hooks/useGPS';
import { formatMarkerInfo } from '../lib/markers';
import { fetchArrivalNarrative, createArrivalRequest, NetworkError } from '../lib/api';

type TourScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Tour'>;

interface Props {
  navigation: TourScreenNavigationProp;
}

export default function TourScreen({ navigation }: Props) {
  const arrival = useArrivalDetection();
  const [narrative, setNarrative] = useState<string>('');
  const [isLoadingNarrative, setIsLoadingNarrative] = useState(false);
  const [lastNarrativeMarkerId, setLastNarrativeMarkerId] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  /**
   * Handle arrival events and fetch narrative
   */
  useEffect(() => {
    const handleArrival = async () => {
      if (
        arrival.arrivedMarker &&
        arrival.arrivedMarker.id !== lastNarrativeMarkerId &&
        !isLoadingNarrative
      ) {
        console.log('TourScreen: Handling arrival at', arrival.arrivedMarker.name);
        await fetchNarrativeForMarker(arrival.arrivedMarker);
      }
    };

    handleArrival();
  }, [arrival.arrivedMarker, lastNarrativeMarkerId, isLoadingNarrative]);

  /**
   * Fetch arrival narrative from backend
   */
  const fetchNarrativeForMarker = async (marker: any) => {
    if (!arrival.currentPosition) {
      console.warn('TourScreen: No current position for narrative request');
      return;
    }

    setIsLoadingNarrative(true);

    try {
      console.log('TourScreen: Fetching arrival narrative for', marker.name);

      // Create request for backend
      const request = createArrivalRequest(
        marker,
        arrival.currentPosition,
        'tour-user', // TODO: Use actual user ID
        'drive' // TODO: Determine actual mode
      );

      // Fetch narrative from backend
      const narrativeText = await fetchArrivalNarrative(request);

      setNarrative(narrativeText);
      setLastNarrativeMarkerId(marker.id);

      console.log('TourScreen: Narrative received:', narrativeText.substring(0, 50) + '...');

      // Speak the narrative if enabled
      if (speechEnabled && narrativeText) {
        await speakNarrative(narrativeText);
      }

    } catch (error) {
      console.error('TourScreen: Failed to fetch narrative:', error);

      let fallbackMessage = 'Welcome to this location! ';

      if (error instanceof NetworkError) {
        fallbackMessage += "I'm having trouble connecting to get detailed information right now, but this is a wonderful place to explore.";
      } else {
        fallbackMessage += 'Take a moment to explore and discover what makes this place special.';
      }

      setNarrative(fallbackMessage);
      setLastNarrativeMarkerId(marker.id);

      // Speak fallback message if enabled
      if (speechEnabled) {
        await speakNarrative(fallbackMessage);
      }
    } finally {
      setIsLoadingNarrative(false);
    }
  };

  /**
   * Speak narrative using text-to-speech
   */
  const speakNarrative = async (text: string) => {
    if (!speechEnabled || isSpeaking) {
      return;
    }

    try {
      console.log('TourScreen: Speaking narrative...');
      setIsSpeaking(true);

      const speechOptions: Speech.SpeechOptions = {
        language: 'en-US',
        pitch: 1.0,
        rate: 0.9, // Slightly slower for better comprehension
        onDone: () => {
          console.log('TourScreen: Speech completed');
          setIsSpeaking(false);
        },
        onStopped: () => {
          console.log('TourScreen: Speech stopped');
          setIsSpeaking(false);
        },
        onError: (error) => {
          console.error('TourScreen: Speech error:', error);
          setIsSpeaking(false);
        },
      };

      await Speech.speak(text, speechOptions);

    } catch (error) {
      console.error('TourScreen: Failed to speak narrative:', error);
      setIsSpeaking(false);
    }
  };

  /**
   * Stop current speech
   */
  const stopSpeech = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
      console.log('TourScreen: Speech stopped by user');
    } catch (error) {
      console.error('TourScreen: Failed to stop speech:', error);
    }
  };

  /**
   * Toggle speech enabled/disabled
   */
  const toggleSpeech = () => {
    setSpeechEnabled(!speechEnabled);
    if (isSpeaking) {
      stopSpeech();
    }
  };

  /**
   * Manually trigger arrival for testing
   */
  const handleManualArrival = () => {
    if (arrival.nearestMarker) {
      Alert.alert(
        'Simulate Arrival',
        `Simulate arrival at ${arrival.nearestMarker.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate',
            onPress: () => arrival.simulateArrival(arrival.nearestMarker!.id),
          },
        ]
      );
    } else {
      Alert.alert('No nearby markers', 'Move closer to a marker to simulate arrival.');
    }
  };

  /**
   * Clear current narrative
   */
  const clearNarrative = () => {
    setNarrative('');
    setLastNarrativeMarkerId(null);
    arrival.clearArrivedMarker();
  };

  /**
   * Request location permissions and start tracking
   */
  const handleStartTracking = async () => {
    try {
      await arrival.startTracking();
    } catch (error) {
      Alert.alert(
        'Location Error',
        'Failed to start location tracking. Please check your location permissions in Settings.',
        [{ text: 'OK' }]
      );
    }
  };

  /**
   * Get status color based on approach status
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'arrived':
        return '#4CAF50'; // Green
      case 'approaching':
        return '#FF9800'; // Orange
      case 'distant':
        return '#2196F3'; // Blue
      default:
        return '#9E9E9E'; // Gray
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AImee Tour Guide</Text>
          <Text style={styles.subtitle}>GPS-powered location assistance</Text>

          <TouchableOpacity
            style={styles.voiceButton}
            onPress={() => navigation.navigate('Voice')}
          >
            <Text style={styles.voiceButtonText}>🎤 Audio Test</Text>
          </TouchableOpacity>
        </View>

        {/* GPS Status */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>GPS Status</Text>
            <View style={[styles.statusIndicator, {
              backgroundColor: arrival.isTracking ? '#4CAF50' : '#F44336'
            }]} />
          </View>

          {arrival.currentPosition ? (
            <Text style={styles.coordinates}>
              📍 {formatCoordinates(arrival.currentPosition)}
            </Text>
          ) : (
            <Text style={styles.noData}>No location data</Text>
          )}

          {arrival.lastUpdateTime && (
            <Text style={styles.updateTime}>
              Last update: {arrival.lastUpdateTime.toLocaleTimeString()}
            </Text>
          )}

          {arrival.error && (
            <Text style={styles.errorText}>⚠️ {arrival.error}</Text>
          )}
        </View>

        {/* Tracking Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Tracking</Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, arrival.isTracking ? styles.buttonSecondary : styles.buttonPrimary]}
              onPress={arrival.isTracking ? arrival.stopTracking : handleStartTracking}
            >
              <Text style={[styles.buttonText, arrival.isTracking ? styles.buttonTextSecondary : styles.buttonTextPrimary]}>
                {arrival.isTracking ? 'Stop Tracking' : 'Start Tracking'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonTest]}
              onPress={handleManualArrival}
              disabled={!arrival.nearestMarker}
            >
              <Text style={styles.buttonTextTest}>
                Test Arrival
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nearest Marker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nearest Location</Text>

          {arrival.nearestMarker ? (
            <View>
              <Text style={styles.markerName}>
                📍 {arrival.nearestMarker.name}
              </Text>

              {arrival.nearestDistance !== null && (
                <Text style={styles.markerDistance}>
                  Distance: {formatDistance(arrival.nearestDistance)}
                </Text>
              )}

              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(arrival.approachStatus) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(arrival.approachStatus) }]}>
                  {formatApproachStatus(arrival.approachStatus, arrival.nearestMarker.name)}
                </Text>
              </View>

              {arrival.nearestMarker.description && (
                <Text style={styles.markerDescription}>
                  {arrival.nearestMarker.description}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>
              {arrival.isTracking ? 'Searching for nearby locations...' : 'Start tracking to find locations'}
            </Text>
          )}
        </View>

        {/* Arrival Narrative */}
        {(arrival.arrivedMarker || narrative || isLoadingNarrative) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Location Story</Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity onPress={toggleSpeech} style={[styles.speechButton, !speechEnabled && styles.speechButtonDisabled]}>
                  <Text style={styles.speechButtonText}>
                    {speechEnabled ? '🔊' : '🔇'}
                  </Text>
                </TouchableOpacity>
                {isSpeaking && (
                  <TouchableOpacity onPress={stopSpeech} style={styles.stopButton}>
                    <Text style={styles.stopButtonText}>⏹️</Text>
                  </TouchableOpacity>
                )}
                {narrative && (
                  <TouchableOpacity onPress={clearNarrative} style={styles.clearButton}>
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {isLoadingNarrative ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.loadingText}>Getting location story...</Text>
              </View>
            ) : narrative ? (
              <View style={styles.narrativeContainer}>
                <Text style={styles.narrativeText}>{narrative}</Text>
                {arrival.arrivedMarker && (
                  <Text style={styles.narrativeFooter}>
                    📍 {arrival.arrivedMarker.name}
                  </Text>
                )}
              </View>
            ) : arrival.arrivedMarker && (
              <Text style={styles.arrivalNotice}>
                🎉 You've arrived at {arrival.arrivedMarker.name}!
              </Text>
            )}
          </View>
        )}

        {/* Debug Info */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <Text style={styles.debugTitle}>Debug Info</Text>
            <Text style={styles.debugText}>
              Tracking: {arrival.isTracking ? 'Yes' : 'No'}{'\n'}
              Approach: {arrival.approachStatus}{'\n'}
              Arrived: {arrival.arrivedMarker?.name || 'None'}{'\n'}
              History: {arrival.arrivalHistory.length} arrivals
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  voiceButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  coordinates: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
    marginBottom: 4,
  },
  updateTime: {
    fontSize: 12,
    color: '#666',
  },
  noData: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2196F3',
  },
  buttonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  buttonTest: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonTextPrimary: {
    color: 'white',
  },
  buttonTextSecondary: {
    color: '#333',
  },
  buttonTextTest: {
    color: 'white',
  },
  markerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  markerDistance: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  markerDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  clearButtonText: {
    fontSize: 12,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speechButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechButtonDisabled: {
    backgroundColor: '#ccc',
  },
  speechButtonText: {
    fontSize: 16,
  },
  stopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F44336',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    fontSize: 14,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  narrativeContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  narrativeText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  narrativeFooter: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    textAlign: 'right',
  },
  arrivalNotice: {
    fontSize: 16,
    color: '#4CAF50',
    textAlign: 'center',
    padding: 16,
  },
  debugSection: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
    marginTop: 16,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#666',
  },
});