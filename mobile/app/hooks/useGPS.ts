// AImee GPS Location Hook
// Phase 4: GPS tracking and location services for arrival detection

import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export interface Position {
  lat: number;
  lng: number;
}

export interface GPSState {
  currentPosition: Position | null;
  isTracking: boolean;
  lastUpdateTime: Date | null;
  error: string | null;
  accuracy: number | null;
  permissionGranted: boolean;
}

export interface GPSHookReturn extends GPSState {
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for GPS location tracking in AImee
 * Provides current position with arrival detection capabilities
 */
export function useGPS(): GPSHookReturn {
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);

  /**
   * Request location permissions from the user
   */
  const requestPermissions = async (): Promise<boolean> => {
    try {
      console.log('GPS Hook: Requesting location permissions...');

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access in settings.');
        setPermissionGranted(false);
        return false;
      }

      console.log('GPS Hook: Location permissions granted');
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = `Failed to request location permissions: ${err}`;
      console.error('GPS Hook:', errorMessage);
      setError(errorMessage);
      setPermissionGranted(false);
      return false;
    }
  };

  /**
   * Start GPS tracking
   */
  const startTracking = async (): Promise<void> => {
    try {
      console.log('GPS Hook: Starting location tracking...');

      // Check permissions first
      const hasPermission = permissionGranted || await requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permissions are required to start tracking');
      }

      // Stop any existing tracking
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }

      // Configure location tracking options
      const locationOptions: Location.LocationOptions = {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000, // Update every 5 seconds
        distanceInterval: 10, // Update every 10 meters
      };

      // Start watching position
      watchSubscription.current = await Location.watchPositionAsync(
        locationOptions,
        (location) => {
          const newPosition: Position = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };

          console.log('GPS Hook: Position update:', newPosition);

          setCurrentPosition(newPosition);
          setLastUpdateTime(new Date());
          setAccuracy(location.coords.accuracy || null);
          setError(null);
        }
      );

      setIsTracking(true);
      console.log('GPS Hook: Location tracking started successfully');

    } catch (err) {
      const errorMessage = `Failed to start location tracking: ${err}`;
      console.error('GPS Hook:', errorMessage);
      setError(errorMessage);
      setIsTracking(false);
    }
  };

  /**
   * Stop GPS tracking
   */
  const stopTracking = (): void => {
    try {
      console.log('GPS Hook: Stopping location tracking...');

      if (watchSubscription.current) {
        watchSubscription.current.remove();
        watchSubscription.current = null;
      }

      setIsTracking(false);
      console.log('GPS Hook: Location tracking stopped');

    } catch (err) {
      console.error('GPS Hook: Error stopping location tracking:', err);
      setError(`Failed to stop tracking: ${err}`);
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (watchSubscription.current) {
        watchSubscription.current.remove();
      }
    };
  }, []);

  /**
   * Check initial permission status
   */
  useEffect(() => {
    const checkInitialPermissions = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        setPermissionGranted(status === 'granted');
      } catch (err) {
        console.warn('GPS Hook: Failed to check initial permissions:', err);
      }
    };

    checkInitialPermissions();
  }, []);

  return {
    currentPosition,
    isTracking,
    lastUpdateTime,
    error,
    accuracy,
    permissionGranted,
    startTracking,
    stopTracking,
    requestPermissions,
  };
}

/**
 * Calculate distance between two positions using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (pos1.lat * Math.PI) / 180;
  const φ2 = (pos2.lat * Math.PI) / 180;
  const Δφ = ((pos2.lat - pos1.lat) * Math.PI) / 180;
  const Δλ = ((pos2.lng - pos1.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(position: Position): string {
  return `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`;
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}