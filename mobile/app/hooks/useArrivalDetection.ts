// AImee Arrival Detection Hook
// Phase 4: Smart arrival detection with cooldown and state management

import { useState, useEffect, useRef } from 'react';
import { useGPS, Position } from './useGPS';
import {
  Marker,
  getNearestMarker,
  isWithinRadius,
  getApproachStatus,
  TEST_MARKERS
} from '../lib/markers';

export interface ArrivalEvent {
  marker: Marker;
  timestamp: Date;
  distanceMeters: number;
}

export interface ArrivalDetectionState {
  // GPS state
  currentPosition: Position | null;
  isTracking: boolean;

  // Marker proximity
  nearestMarker: Marker | null;
  nearestDistance: number | null;
  approachStatus: 'arrived' | 'approaching' | 'distant' | 'idle';

  // Arrival events
  arrivedMarker: Marker | null;
  lastArrival: ArrivalEvent | null;
  arrivalHistory: ArrivalEvent[];

  // Status
  error: string | null;
  lastUpdateTime: Date | null;
}

export interface ArrivalDetectionHookReturn extends ArrivalDetectionState {
  // Control functions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  clearArrivedMarker: () => void;
  simulateArrival: (markerId: string) => void;

  // Configuration
  setCooldownMinutes: (minutes: number) => void;
  setMarkers: (markers: Marker[]) => void;
}

const DEFAULT_COOLDOWN_MINUTES = 5;
const MAX_ARRIVAL_HISTORY = 20;

/**
 * Hook for intelligent arrival detection with cooldown management
 */
export function useArrivalDetection(): ArrivalDetectionHookReturn {
  // GPS tracking
  const gps = useGPS();

  // State
  const [nearestMarker, setNearestMarker] = useState<Marker | null>(null);
  const [nearestDistance, setNearestDistance] = useState<number | null>(null);
  const [approachStatus, setApproachStatus] = useState<'arrived' | 'approaching' | 'distant' | 'idle'>('idle');
  const [arrivedMarker, setArrivedMarker] = useState<Marker | null>(null);
  const [lastArrival, setLastArrival] = useState<ArrivalEvent | null>(null);
  const [arrivalHistory, setArrivalHistory] = useState<ArrivalEvent[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Configuration
  const [cooldownMinutes, setCooldownMinutes] = useState(DEFAULT_COOLDOWN_MINUTES);
  const [markers, setMarkers] = useState<Marker[]>(TEST_MARKERS);

  // Internal refs
  const arrivalCooldowns = useRef<Map<string, Date>>(new Map());
  const lastPosition = useRef<Position | null>(null);

  /**
   * Check if a marker is in cooldown period
   */
  const isMarkerInCooldown = (markerId: string): boolean => {
    const cooldownEnd = arrivalCooldowns.current.get(markerId);
    if (!cooldownEnd) return false;

    const now = new Date();
    return now < cooldownEnd;
  };

  /**
   * Set cooldown for a marker
   */
  const setMarkerCooldown = (markerId: string): void => {
    const cooldownEnd = new Date();
    cooldownEnd.setMinutes(cooldownEnd.getMinutes() + cooldownMinutes);
    arrivalCooldowns.current.set(markerId, cooldownEnd);

    console.log(`Arrival Detection: Set cooldown for ${markerId} until ${cooldownEnd.toLocaleTimeString()}`);
  };

  /**
   * Process position update and check for arrivals
   */
  const processPositionUpdate = (position: Position): void => {
    // Find nearest marker
    const nearestResult = getNearestMarker(position, markers);

    setNearestMarker(nearestResult.marker);
    setNearestDistance(nearestResult.distanceMeters);
    setLastUpdateTime(new Date());

    if (!nearestResult.marker || nearestResult.distanceMeters === null) {
      setApproachStatus('idle');
      return;
    }

    // Determine approach status
    const status = getApproachStatus(nearestResult.distanceMeters, nearestResult.marker.radiusMeters);
    setApproachStatus(status);

    // Check for arrival
    if (status === 'arrived' && !isMarkerInCooldown(nearestResult.marker.id)) {
      triggerArrival(nearestResult.marker, nearestResult.distanceMeters);
    }

    // Log proximity changes
    if (lastPosition.current) {
      const prevNearestResult = getNearestMarker(lastPosition.current, markers);
      if (prevNearestResult.marker?.id !== nearestResult.marker.id) {
        console.log(`Arrival Detection: Nearest marker changed to ${nearestResult.marker.name} (${nearestResult.distanceMeters.toFixed(0)}m)`);
      }
    }

    lastPosition.current = position;
  };

  /**
   * Trigger an arrival event
   */
  const triggerArrival = (marker: Marker, distance: number): void => {
    console.log(`Arrival Detection: ARRIVED at ${marker.name} (${distance.toFixed(0)}m)`);

    const arrivalEvent: ArrivalEvent = {
      marker,
      timestamp: new Date(),
      distanceMeters: distance
    };

    // Update state
    setArrivedMarker(marker);
    setLastArrival(arrivalEvent);

    // Add to history
    setArrivalHistory(prev => {
      const updated = [...prev, arrivalEvent];
      return updated.slice(-MAX_ARRIVAL_HISTORY); // Keep only recent arrivals
    });

    // Set cooldown
    setMarkerCooldown(marker.id);
  };

  /**
   * Simulate arrival for testing
   */
  const simulateArrival = (markerId: string): void => {
    const marker = markers.find(m => m.id === markerId);
    if (!marker) {
      console.warn(`Arrival Detection: Cannot simulate arrival - marker ${markerId} not found`);
      return;
    }

    console.log(`Arrival Detection: SIMULATING arrival at ${marker.name}`);
    triggerArrival(marker, 0);
  };

  /**
   * Clear the current arrived marker
   */
  const clearArrivedMarker = (): void => {
    console.log('Arrival Detection: Clearing arrived marker');
    setArrivedMarker(null);
  };

  /**
   * Start arrival detection (delegates to GPS hook)
   */
  const startTracking = async (): Promise<void> => {
    console.log('Arrival Detection: Starting tracking...');
    await gps.startTracking();
  };

  /**
   * Stop arrival detection (delegates to GPS hook)
   */
  const stopTracking = (): void => {
    console.log('Arrival Detection: Stopping tracking...');
    gps.stopTracking();

    // Reset state
    setNearestMarker(null);
    setNearestDistance(null);
    setApproachStatus('idle');
  };

  /**
   * Process GPS position updates
   */
  useEffect(() => {
    if (gps.currentPosition && gps.isTracking) {
      processPositionUpdate(gps.currentPosition);
    } else if (!gps.isTracking) {
      // Reset state when not tracking
      setApproachStatus('idle');
      setNearestMarker(null);
      setNearestDistance(null);
    }
  }, [gps.currentPosition, gps.isTracking, markers, cooldownMinutes]);

  /**
   * Cleanup cooldowns periodically
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const cooldowns = arrivalCooldowns.current;

      for (const [markerId, cooldownEnd] of cooldowns.entries()) {
        if (now >= cooldownEnd) {
          cooldowns.delete(markerId);
          console.log(`Arrival Detection: Cooldown expired for ${markerId}`);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return {
    // GPS state
    currentPosition: gps.currentPosition,
    isTracking: gps.isTracking,

    // Proximity state
    nearestMarker,
    nearestDistance,
    approachStatus,

    // Arrival state
    arrivedMarker,
    lastArrival,
    arrivalHistory,

    // Status
    error: gps.error,
    lastUpdateTime,

    // Control functions
    startTracking,
    stopTracking,
    clearArrivedMarker,
    simulateArrival,

    // Configuration
    setCooldownMinutes,
    setMarkers,
  };
}

/**
 * Get cooldown status for all markers
 */
export function getCooldownStatus(arrivalDetection: ArrivalDetectionHookReturn): Record<string, Date | null> {
  // This would need access to internal cooldown state
  // For now, return empty object - could be enhanced if needed
  return {};
}

/**
 * Format approach status for display
 */
export function formatApproachStatus(status: string, markerName?: string): string {
  switch (status) {
    case 'arrived':
      return markerName ? `Arrived at ${markerName}` : 'Arrived';
    case 'approaching':
      return markerName ? `Approaching ${markerName}` : 'Approaching';
    case 'distant':
      return 'Distant';
    case 'idle':
    default:
      return 'Idle';
  }
}