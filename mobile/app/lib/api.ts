// AImee API Client
// Phase 4: HTTP client for backend integration

import { Position } from '../hooks/useGPS';
import { Marker } from './markers';

/**
 * API configuration
 */
const API_CONFIG = {
  // Development URL - update for production deployment
  baseUrl: 'http://192.168.4.24:3000',
  timeout: 30000, // 30 seconds
  retryAttempts: 2,
  retryDelay: 1000, // 1 second
};

/**
 * Request parameters for arrival narrative
 */
export interface ArrivalNarrativeRequest {
  userId: string;
  markerId: string;
  markerName: string;
  location: Position;
  mode?: 'drive' | 'walk';
}

/**
 * Response from arrival narrative API
 */
export interface ArrivalNarrativeResponse {
  success: boolean;
  markerId: string;
  markerName: string;
  agent: string;
  response: string;
  metadata?: {
    userId: string;
    markerId: string;
    location: Position;
    mode: string;
    timestamp: string;
    arrivalType: string;
    [key: string]: any;
  };
  error?: string;
}

/**
 * Network error class
 */
export class NetworkError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

/**
 * Make HTTP request with timeout and error handling
 */
async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_CONFIG.baseUrl}${endpoint}`;

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  console.log('API Client: Making request to', endpoint);

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new NetworkError('Request timeout')),
        API_CONFIG.timeout
      );
    });

    // Make the request with timeout
    const response = await Promise.race([
      fetch(url, requestOptions),
      timeoutPromise,
    ]);

    console.log('API Client: Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // Ignore JSON parse errors for error responses
      }

      throw new NetworkError(errorMessage, response.status);
    }

    const data = await response.json();
    console.log('API Client: Request successful');
    return data as T;

  } catch (error) {
    if (error instanceof NetworkError) {
      throw error;
    }

    // Handle network and other errors
    console.error('API Client: Request failed:', error);
    throw new NetworkError(
      error instanceof Error ? error.message : 'Unknown network error'
    );
  }
}

/**
 * Make request with retry logic
 */
async function makeRequestWithRetry<T>(
  endpoint: string,
  options: RequestInit = {},
  attempt: number = 1
): Promise<T> {
  try {
    return await makeRequest<T>(endpoint, options);
  } catch (error) {
    if (
      attempt < API_CONFIG.retryAttempts &&
      error instanceof NetworkError &&
      (!error.status || error.status >= 500)
    ) {
      console.log(`API Client: Retrying request (attempt ${attempt + 1})`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.retryDelay));

      return makeRequestWithRetry<T>(endpoint, options, attempt + 1);
    }

    throw error;
  }
}

/**
 * Fetch arrival narrative from backend
 */
export async function fetchArrivalNarrative(
  params: ArrivalNarrativeRequest
): Promise<string> {
  try {
    console.log('API Client: Fetching arrival narrative for:', params.markerName);

    const response = await makeRequestWithRetry<ArrivalNarrativeResponse>(
      '/aimee-arrival',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to get arrival narrative');
    }

    console.log('API Client: Received narrative from', response.agent, 'agent');
    return response.response;

  } catch (error) {
    console.error('API Client: Failed to fetch arrival narrative:', error);

    // Return fallback narrative for better user experience
    const fallbackNarrative = `Welcome to ${params.markerName}! Unfortunately, I'm having trouble connecting to get detailed information right now, but this is a wonderful place to explore. Take your time to look around and discover what makes this location special.`;

    if (error instanceof NetworkError) {
      throw error; // Re-throw for specific error handling
    }

    return fallbackNarrative;
  }
}

/**
 * Test backend connectivity
 */
export async function testConnection(): Promise<boolean> {
  try {
    console.log('API Client: Testing backend connection...');

    await makeRequest('/health');
    console.log('API Client: Backend connection successful');
    return true;

  } catch (error) {
    console.error('API Client: Backend connection failed:', error);
    return false;
  }
}

/**
 * Get backend brain status
 */
export async function getBrainStatus(): Promise<any> {
  try {
    console.log('API Client: Getting brain status...');

    const response = await makeRequest('/brain-status');
    console.log('API Client: Brain status retrieved');
    return response;

  } catch (error) {
    console.error('API Client: Failed to get brain status:', error);
    throw error;
  }
}

/**
 * Send general chat message to backend
 */
export async function sendChatMessage(
  userId: string,
  message: string,
  context?: any
): Promise<string> {
  try {
    console.log('API Client: Sending chat message...');

    const response = await makeRequestWithRetry<any>('/aimee-chat', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        input: message,
        context,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to get chat response');
    }

    console.log('API Client: Received chat response from', response.agent, 'agent');
    return response.response;

  } catch (error) {
    console.error('API Client: Failed to send chat message:', error);
    throw error;
  }
}

/**
 * Helper to create arrival request from marker and position
 */
export function createArrivalRequest(
  marker: Marker,
  position: Position,
  userId: string = 'default-user',
  mode: 'drive' | 'walk' = 'drive'
): ArrivalNarrativeRequest {
  return {
    userId,
    markerId: marker.id,
    markerName: marker.name,
    location: position,
    mode,
  };
}

/**
 * Validate API configuration
 */
export function validateApiConfig(): boolean {
  return (
    API_CONFIG.baseUrl &&
    API_CONFIG.baseUrl.startsWith('http') &&
    API_CONFIG.timeout > 0
  );
}

/**
 * Update API configuration (useful for environment switching)
 */
export function updateApiConfig(config: Partial<typeof API_CONFIG>): void {
  Object.assign(API_CONFIG, config);
  console.log('API Client: Configuration updated');
}

/**
 * Get current API configuration
 */
export function getApiConfig(): typeof API_CONFIG {
  return { ...API_CONFIG };
}