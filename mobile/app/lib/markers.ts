// AImee Marker System
// Phase 4: Marker definitions and proximity detection for arrival triggers

import { Position, calculateDistance } from '../hooks/useGPS';

/**
 * Marker interface for location-based tour points
 */
export interface Marker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  description?: string;
  category?: 'historical' | 'landmark' | 'natural' | 'cultural' | 'entertainment';
}

/**
 * Result of nearest marker calculation
 */
export interface NearestMarkerResult {
  marker: Marker | null;
  distanceMeters: number | null;
}

/**
 * Test markers for Phase 4 development
 * These can be updated to real locations for testing
 */
export const TEST_MARKERS: Marker[] = [
  {
    id: 'downtown-square',
    name: 'Historic Downtown Square',
    lat: 34.0522, // Example coordinates - Los Angeles area
    lng: -118.2437,
    radiusMeters: 50,
    description: 'The heart of downtown with historic architecture and local shops',
    category: 'historical'
  },
  {
    id: 'city-park',
    name: 'Riverside City Park',
    lat: 34.0500,
    lng: -118.2400,
    radiusMeters: 75,
    description: 'Beautiful park with walking trails and a scenic river view',
    category: 'natural'
  },
  {
    id: 'art-museum',
    name: 'Metropolitan Art Museum',
    lat: 34.0550,
    lng: -118.2450,
    radiusMeters: 40,
    description: 'World-class art collection featuring local and international artists',
    category: 'cultural'
  },
  {
    id: 'old-theater',
    name: 'Grand Palace Theater',
    lat: 34.0480,
    lng: -118.2420,
    radiusMeters: 30,
    description: '1920s theater hosting live performances and classic films',
    category: 'entertainment'
  },
  {
    id: 'lighthouse',
    name: 'Harbor Lighthouse',
    lat: 34.0600,
    lng: -118.2500,
    radiusMeters: 60,
    description: 'Historic lighthouse guiding ships since 1887, now a maritime museum',
    category: 'landmark'
  }
];

/**
 * Find the nearest marker to a given position
 */
export function getNearestMarker(position: Position, markers: Marker[] = TEST_MARKERS): NearestMarkerResult {
  if (!position || markers.length === 0) {
    return { marker: null, distanceMeters: null };
  }

  let nearestMarker: Marker | null = null;
  let shortestDistance: number | null = null;

  for (const marker of markers) {
    const markerPosition: Position = { lat: marker.lat, lng: marker.lng };
    const distance = calculateDistance(position, markerPosition);

    if (shortestDistance === null || distance < shortestDistance) {
      shortestDistance = distance;
      nearestMarker = marker;
    }
  }

  return {
    marker: nearestMarker,
    distanceMeters: shortestDistance
  };
}

/**
 * Check if a position is within a marker's arrival radius
 */
export function isWithinRadius(position: Position, marker: Marker): boolean {
  const markerPosition: Position = { lat: marker.lat, lng: marker.lng };
  const distance = calculateDistance(position, markerPosition);
  return distance <= marker.radiusMeters;
}

/**
 * Get all markers within a certain distance of a position
 */
export function getNearbyMarkers(
  position: Position,
  maxDistanceMeters: number,
  markers: Marker[] = TEST_MARKERS
): Array<{ marker: Marker; distanceMeters: number }> {
  if (!position) {
    return [];
  }

  const nearbyMarkers: Array<{ marker: Marker; distanceMeters: number }> = [];

  for (const marker of markers) {
    const markerPosition: Position = { lat: marker.lat, lng: marker.lng };
    const distance = calculateDistance(position, markerPosition);

    if (distance <= maxDistanceMeters) {
      nearbyMarkers.push({ marker, distanceMeters: distance });
    }
  }

  // Sort by distance (closest first)
  return nearbyMarkers.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Find a marker by ID
 */
export function getMarkerById(id: string, markers: Marker[] = TEST_MARKERS): Marker | null {
  return markers.find(marker => marker.id === id) || null;
}

/**
 * Get markers by category
 */
export function getMarkersByCategory(
  category: Marker['category'],
  markers: Marker[] = TEST_MARKERS
): Marker[] {
  return markers.filter(marker => marker.category === category);
}

/**
 * Format marker information for display
 */
export function formatMarkerInfo(marker: Marker, distance?: number): string {
  const distanceText = distance !== undefined ? ` (${formatDistance(distance)})` : '';
  return `${marker.name}${distanceText}`;
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

/**
 * Get approach status based on distance to marker
 */
export function getApproachStatus(distanceMeters: number, radiusMeters: number): 'arrived' | 'approaching' | 'distant' {
  if (distanceMeters <= radiusMeters) {
    return 'arrived';
  } else if (distanceMeters <= radiusMeters * 3) {
    return 'approaching';
  } else {
    return 'distant';
  }
}

/**
 * Validate marker data
 */
export function validateMarker(marker: Partial<Marker>): marker is Marker {
  return (
    typeof marker.id === 'string' &&
    typeof marker.name === 'string' &&
    typeof marker.lat === 'number' &&
    typeof marker.lng === 'number' &&
    typeof marker.radiusMeters === 'number' &&
    marker.lat >= -90 && marker.lat <= 90 &&
    marker.lng >= -180 && marker.lng <= 180 &&
    marker.radiusMeters > 0
  );
}

/**
 * Create custom marker for testing (useful for development)
 */
export function createTestMarker(position: Position, name: string = 'Test Location'): Marker {
  return {
    id: `test-${Date.now()}`,
    name,
    lat: position.lat,
    lng: position.lng,
    radiusMeters: 50,
    description: 'Test marker for development purposes',
    category: 'landmark'
  };
}