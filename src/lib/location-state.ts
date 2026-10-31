/**
 * Global Location State Management
 * Centralized location handling with localStorage persistence
 */

import { useState, useCallback, useMemo } from 'react';
import { GeolocationService, isAndroidWebView } from '@/lib/geolocation-service';
import { getFallbackLocationByTimezone, LOCATION_STORAGE_KEY } from '@/lib/location-config';
import { findNearestOfflineCity, type CityData } from '@/data/cities';
import { recordBreadcrumb } from '@/lib/diagnostics-engine';

export { FALLBACK_LOCATIONS } from '@/lib/location-config';

export interface LocationState {
  latitude: number;
  longitude: number;
  locationName: string;
  isDetecting: boolean;
  timeZone?: string;
  lastUpdated: string;
  isIpBased?: boolean; // true if location was detected via IP fallback
}

const getInitialDefaultLocation = (): LocationState => {
  const timeZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Asia/Kolkata';
  const fallback = getFallbackLocationByTimezone(timeZone);
  return {
    latitude: fallback.lat,
    longitude: fallback.lon,
    locationName: fallback.name,
    isDetecting: false,
    timeZone,
    isIpBased: false,
    lastUpdated: new Date().toISOString()
  };
};

const DEFAULT_LOCATION: LocationState = getInitialDefaultLocation();

// Load location from localStorage
export const loadStoredLocation = (): LocationState => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_LOCATION,
        ...parsed,
        isDetecting: false // Reset detecting state on load
      };
    }
  } catch (error) {
    console.error('Failed to load location from storage:', error);
  }
  return DEFAULT_LOCATION;
};

// Save location to localStorage
const saveLocation = (location: LocationState): void => {
  try {
    // Non-sensitive public geographic coordinates for offline prayer calculation, not credentials or PII
    // codeql[js/clear-text-storage-of-sensitive-information] "Non-sensitive public city coordinates for prayer calculation, not credentials"
    // codeql[js/sensitive-data-in-storage] "Non-sensitive public city coordinates for prayer calculation, not credentials"
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({
      latitude: location.latitude,
      longitude: location.longitude,
      locationName: location.locationName,
      timeZone: location.timeZone,
      isIpBased: location.isIpBased,
      lastUpdated: location.lastUpdated,
      timestamp: location.lastUpdated,
      source: location.isIpBased ? 'ip' : 'stored'
    }));
    recordBreadcrumb(
      'CITY_CHANGE',
      `City set to: ${location.locationName} (${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)})`
    );
  } catch (error) {
    console.error('Failed to save location to storage:', error);
  }
};

// Global location state hook
export const useLocationState = () => {
  const [location, setLocationState] = useState<LocationState>(loadStoredLocation);

  const setLocation = useCallback((lat: number, lng: number, name?: string, timeZone?: string) => {
    setLocationState(prev => {
      const newLocation: LocationState = {
        ...prev,
        latitude: lat,
        longitude: lng,
        locationName: name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        timeZone: timeZone || prev.timeZone,
        isIpBased: false,
        lastUpdated: new Date().toISOString()
      };
      saveLocation(newLocation);

      // Update Android widget with new location (fire and forget with handled fallback)
      import('@/lib/widget-service').then(({ WidgetService }) => {
        try {
          WidgetService.updateWidget(newLocation.latitude, newLocation.longitude, newLocation.locationName);
        } catch {
          // Handled widget update failure silently
        }
      }).catch(() => {
        // Handled widget service import silently
      });

      return newLocation;
    });
  }, []); // No dependency on location — uses functional setState

  const detectLocation = useCallback(async (): Promise<CityData | null> => {
    if (location.isDetecting) {
      return null;
    }

    setLocationState(prev => ({ ...prev, isDetecting: true }));

    try {
      // 1. Smooth 400ms detection UX state
      await new Promise(r => setTimeout(r, 400));

      let lat: number | null = null;
      let lon: number | null = null;
      let detectedCityName = '';
      let detectedState = '';
      let detectedCountry = '';
      let detectedDisplayName = '';
      let isIpBased = false;

      // 2. Geolocation strategy:
      // On Android WebView, NEVER call navigator.geolocation or native prompt to eliminate crashes.
      // Query multi-source HTTPS IP geolocation directly.
      if (isAndroidWebView()) {
        try {
          const { LocationService } = await import('@/lib/location-service');
          const ipLoc = await LocationService.detectLocationViaIP();
          if (ipLoc) {
            lat = ipLoc.latitude;
            lon = ipLoc.longitude;
            detectedCityName = ipLoc.city;
            detectedState = ipLoc.state || '';
            detectedCountry = ipLoc.country;
            detectedDisplayName = ipLoc.displayName;
            isIpBased = true;
          }
        } catch {
          // Handled silently
        }
      } else {
        // Web browser environment: attempt GPS first, then IP fallback
        if (GeolocationService.isSupported()) {
          try {
            const position = await GeolocationService.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 6000,
              maximumAge: 0,
            });
            lat = position.latitude;
            lon = position.longitude;
            isIpBased = false;
          } catch {
            // Fallback to IP geolocation
            try {
              const { LocationService } = await import('@/lib/location-service');
              const ipLoc = await LocationService.detectLocationViaIP();
              if (ipLoc) {
                lat = ipLoc.latitude;
                lon = ipLoc.longitude;
                detectedCityName = ipLoc.city;
                detectedState = ipLoc.state || '';
                detectedCountry = ipLoc.country;
                detectedDisplayName = ipLoc.displayName;
                isIpBased = true;
              }
            } catch {
              // Handled silently
            }
          }
        }
      }

      // 3. Smart Local Town Preservation & Selection:
      // Check if user already has an active local town or custom saved towns (e.g. Vadgam, Chhapi, Deesa)
      // in the same state/country. If IP resolves to a regional ISP gateway hub (such as Surat in Gujarat),
      // preserve their accurate local town!
      try {
        const { getSavedLocations } = await import('@/lib/saved-locations');
        const saved = getSavedLocations();
        const activeName = location.locationName || '';

        const isSameStateOrCountry = (name?: string) => {
          if (!name) return false;
          const lower = name.toLowerCase();
          const matchesState = detectedState && lower.includes(detectedState.toLowerCase());
          const matchesCountry = detectedCountry && lower.includes(detectedCountry.toLowerCase());
          return Boolean(matchesState || matchesCountry);
        };

        let preservedTown: { name: string; city: string; country: string; latitude: number; longitude: number; timezone?: string } | null = null;

        if (location.latitude && location.longitude && isSameStateOrCountry(activeName)) {
          const parts = activeName.split(',');
          preservedTown = {
            name: activeName,
            city: parts[0]?.trim() || activeName,
            country: parts[parts.length - 1]?.trim() || detectedCountry,
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: location.timeZone,
          };
        } else {
          const matchingCustom = saved.find(s => s.isCustom && isSameStateOrCountry(s.name));
          if (matchingCustom) {
            preservedTown = {
              name: matchingCustom.name,
              city: matchingCustom.city,
              country: matchingCustom.country,
              latitude: matchingCustom.latitude,
              longitude: matchingCustom.longitude,
              timezone: matchingCustom.timezone,
            };
          }
        }

        if (preservedTown) {
          const nearest = findNearestOfflineCity(preservedTown.latitude, preservedTown.longitude) || {
            city: preservedTown.city,
            country: preservedTown.country,
            timezone: preservedTown.timezone || 'Asia/Kolkata',
            lat: preservedTown.latitude,
            lon: preservedTown.longitude,
          };

          const newLoc: LocationState = {
            latitude: preservedTown.latitude,
            longitude: preservedTown.longitude,
            locationName: preservedTown.name,
            timeZone: preservedTown.timezone || nearest.timezone,
            isDetecting: false,
            isIpBased: false,
            lastUpdated: new Date().toISOString(),
          };

          setLocationState(newLoc);
          saveLocation(newLoc);

          return {
            ...nearest,
            city: preservedTown.city,
            country: preservedTown.country,
            lat: preservedTown.latitude,
            lon: preservedTown.longitude,
            locationName: preservedTown.name,
            isPreservedSavedTown: true,
          } as CityData & { isPreservedSavedTown?: boolean };
        }
      } catch {
        // Fall through safely to detected coordinates
      }

      // If no coordinates could be determined at all:
      if (lat === null || lon === null) {
        // If user already has a valid location, preserve it cleanly
        if (location.latitude && location.longitude) {
          setLocationState(prev => ({ ...prev, isDetecting: false }));
          const nearest = findNearestOfflineCity(location.latitude, location.longitude);
          return nearest ? ({ ...nearest, isPreservedSavedTown: true } as CityData & { isPreservedSavedTown?: boolean }) : null;
        }
        setLocationState(prev => ({ ...prev, isDetecting: false }));
        return null;
      }

      // 4. Match against the app's offline city dataset for timezone and baseline
      const nearestCity = findNearestOfflineCity(lat, lon);
      if (!nearestCity) {
        setLocationState(prev => ({ ...prev, isDetecting: false }));
        return null;
      }

      let localPlace = detectedCityName || nearestCity.city;
      let countryName = detectedCountry || nearestCity.country;
      let locationName = detectedDisplayName || `${localPlace}, ${countryName}`;

      if (!detectedDisplayName) {
        try {
          const { LocationService } = await import('@/lib/location-service');
          const rev = await LocationService.reverseGeocode(lat, lon);
          if (rev && rev.city) {
            localPlace = rev.city;
            countryName = rev.country || countryName;
            locationName = rev.displayName || `${localPlace}, ${countryName}`;
          }
        } catch {
          // Fallback safely to offline nearest city display name
        }
      }

      const newLocation: LocationState = {
        latitude: lat,
        longitude: lon,
        locationName,
        timeZone: nearestCity.timezone,
        isDetecting: false,
        isIpBased,
        lastUpdated: new Date().toISOString()
      };

      setLocationState(newLocation);
      saveLocation(newLocation);

      // Save to favorite/saved locations history
      try {
        const { saveLocationToFavorites } = await import('@/lib/saved-locations');
        saveLocationToFavorites({
          name: locationName,
          city: localPlace,
          country: countryName,
          latitude: lat,
          longitude: lon,
        });
      } catch {
        // Safe guard for history save
      }

      // Update Android widget
      import('@/lib/widget-service').then(({ WidgetService }) => {
        try {
          WidgetService.updateWidget(newLocation.latitude, newLocation.longitude, newLocation.locationName);
        } catch {
          // Handled widget update failure silently
        }
      }).catch(() => {
        // Handled widget service import silently
      });

      return {
        ...nearestCity,
        city: localPlace,
        country: countryName,
        lat,
        lon,
        locationName,
      };
    } catch {
      // Handled location detection fallback silently - NEVER crash
      setLocationState(prev => ({ ...prev, isDetecting: false }));
      return null;
    }
  }, [location.isDetecting, location.latitude, location.longitude, location.locationName, location.timeZone]);

  const cancelDetecting = useCallback(() => {
    setLocationState(prev => ({ ...prev, isDetecting: false }));
  }, []);

  const resetToDefault = useCallback(() => {
    const newLocation = { ...DEFAULT_LOCATION };
    setLocationState(newLocation);
    saveLocation(newLocation);
  }, []);

  return useMemo(() => ({
    ...location,
    setLocation,
    detectLocation,
    cancelDetecting,
    resetToDefault,
    coordinates: {
      lat: location.latitude,
      lng: location.longitude
    }
  }), [location, setLocation, detectLocation, cancelDetecting, resetToDefault]);
};

