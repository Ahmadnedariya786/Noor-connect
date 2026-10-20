/**
 * Geolocation Service
 * Bridges native device GPS via @capacitor/geolocation and web navigator.geolocation
 * with strict timeouts, clear permission handling, and zero freeze.
 */

import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  country?: string;
}

export interface PermissionStatus {
  location: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
  coarseLocation: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale';
}

export class GeolocationService {
  /**
   * Check if geolocation is supported
   */
  static isSupported(): boolean {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  /**
   * Check current permission status
   */
  static async checkPermissions(): Promise<PermissionStatus> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Geolocation.checkPermissions();
        return {
          location: result.location,
          coarseLocation: result.coarseLocation
        };
      } catch (error) {
        console.warn('Native checkPermissions error:', error);
        return {
          location: 'prompt',
          coarseLocation: 'prompt'
        };
      }
    }

    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        const state = result.state as 'granted' | 'denied' | 'prompt';
        return {
          location: state,
          coarseLocation: state
        };
      } catch (error) {
        console.warn('Error checking browser permissions:', error);
      }
    }

    // Fallback for browsers that don't support permissions.query
    return {
      location: 'prompt',
      coarseLocation: 'prompt'
    };
  }

  /**
   * Request location permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await Geolocation.requestPermissions({
          permissions: ['location', 'coarseLocation']
        });
        return result.location === 'granted' || result.coarseLocation === 'granted';
      } catch (error) {
        console.warn('Native requestPermissions failed:', error);
        return false;
      }
    }

    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        resolve(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          console.warn('Geolocation permission request failed or denied:', error);
          resolve(false);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    });
  }

  /**
   * Get current position with strict timeout and fallback handling
   * Defaults to 10s timeout to prevent hanging on "Detecting..."
   */
  static async getCurrentPosition(options?: {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
  }): Promise<LocationCoordinates> {
    const timeoutMs = options?.timeout ?? 10000;
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;
    const maximumAge = options?.maximumAge ?? 300000;

    // Hard timeout race promise so detection NEVER hangs
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Location request timed out. Please select your city manually.'));
      }, timeoutMs);
    });

    if (Capacitor.isNativePlatform()) {
      const nativePromise = (async (): Promise<LocationCoordinates> => {
        // Check and request permissions first if needed
        try {
          const perm = await Geolocation.checkPermissions();
          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            const requested = await Geolocation.requestPermissions({
              permissions: ['location', 'coarseLocation']
            });
            if (requested.location === 'denied' && requested.coarseLocation === 'denied') {
              throw new Error('Location permission denied. Please enable location access in settings or pick your city manually.');
            }
          }
        } catch (permError: any) {
          if (permError.message?.includes('denied')) {
            throw permError;
          }
          // Native permission check unavailable, proceeding with standard geolocation
        }

        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy,
          timeout: timeoutMs,
          maximumAge
        });

        if (!position?.coords || typeof position.coords.latitude !== 'number' || typeof position.coords.longitude !== 'number' || Number.isNaN(position.coords.latitude) || Number.isNaN(position.coords.longitude)) {
          throw new Error('Invalid GPS coordinates received from native provider');
        }

        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : 1000
        };
      })();

      return Promise.race([nativePromise, timeoutPromise]);
    }

    // Web platform
    const webPromise = new Promise<LocationCoordinates>((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied. Please enable location permissions or pick your city manually.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information unavailable. Please select your city manually.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out. Please select your city manually.'));
              break;
            default:
              reject(new Error('An error occurred while getting location. Please select your city manually.'));
              break;
          }
        },
        {
          enableHighAccuracy,
          timeout: timeoutMs,
          maximumAge
        }
      );
    });

    return Promise.race([webPromise, timeoutPromise]);
  }

  static async watchPosition(
    callback: (position: LocationCoordinates) => void,
    options?: {
      enableHighAccuracy?: boolean;
      timeout?: number;
      maximumAge?: number;
    }
  ): Promise<string> {
    const timeout = options?.timeout ?? 15000;
    const enableHighAccuracy = options?.enableHighAccuracy ?? true;
    const maximumAge = options?.maximumAge ?? 300000;

    if (Capacitor.isNativePlatform()) {
      try {
        if (!Geolocation || typeof Geolocation.watchPosition !== 'function') {
          return "";
        }
        const callbackId = await Geolocation.watchPosition(
          { enableHighAccuracy, timeout, maximumAge },
          (position, err) => {
            if (err) {
              console.warn('Native Geolocation watch error:', err);
              return;
            }
            if (position?.coords && typeof position.coords.latitude === 'number' && typeof position.coords.longitude === 'number' && !Number.isNaN(position.coords.latitude) && !Number.isNaN(position.coords.longitude)) {
              try {
                callback({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : 1000
                });
              } catch (cbErr) {
                console.warn('Geolocation watch callback error:', cbErr);
              }
            }
          }
        );
        return callbackId || "";
      } catch (err) {
        console.warn('Native watchPosition failed to start:', err);
        return "";
      }
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return "";
    }

    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (position?.coords && typeof position.coords.latitude === 'number' && typeof position.coords.longitude === 'number' && !Number.isNaN(position.coords.latitude) && !Number.isNaN(position.coords.longitude)) {
            try {
              callback({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: typeof position.coords.accuracy === 'number' ? position.coords.accuracy : 1000
              });
            } catch (cbErr) {
              console.warn('Geolocation watch callback error:', cbErr);
            }
          }
        },
        () => {},
        { enableHighAccuracy, timeout, maximumAge }
      );
      return watchId.toString();
    } catch {
      return "";
    }
  }

  /**
   * Clear position watch
   */
  static async clearWatch(watchId: string): Promise<void> {
    if (!watchId) return;

    try {
      if (Capacitor.isNativePlatform()) {
        if (Geolocation && typeof Geolocation.clearWatch === 'function') {
          await Geolocation.clearWatch({ id: watchId });
        }
      } else if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(parseInt(watchId, 10));
      }
    } catch (err) {
      console.warn('Failed to clear watch:', err);
    }
  }
}

