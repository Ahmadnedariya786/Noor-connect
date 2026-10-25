/**
 * Global Location State Management
 * Centralized location handling with localStorage persistence
 */

import { useState, useCallback, useMemo } from 'react';
import { GeolocationService } from '@/lib/geolocation-service';
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

      // Update Android widget with new location (fire and forget with error handling)
      import('@/lib/widget-service').then(({ WidgetService }) => {
        try {
          WidgetService.updateWidget(newLocation.latitude, newLocation.longitude, newLocation.locationName);
        } catch (widgetError) {
          console.warn('Failed to update widget:', widgetError);
        }
      }).catch(err => console.warn('Failed to import widget service:', err));

      return newLocation;
    });
  }, []); // No dependency on location — uses functional setState

  const detectLocation = useCallback(async (): Promise<CityData | null> => {
    if (location.isDetecting) {
      return null;
    }

    setLocationState(prev => ({ ...prev, isDetecting: true }));

    try {
      let lat: number | null = null;
      let lon: number | null = null;
      let isIpBased = false;

      // 1. PRIMARY: Try real device GPS (Capacitor Geolocation on native, navigator.geolocation on web)
      if (GeolocationService.isSupported()) {
        try {
          const position = await GeolocationService.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 4000,
            maximumAge: 60000
          });
          lat = position.latitude;
          lon = position.longitude;
          isIpBased = false;
        } catch (gpsError) {
          // GPS detection failed, disabled, or timed out — proceed cleanly to IP fallback
        }
      }

      // 2. FALLBACK: If GPS failed or was denied, try IP geolocation fallback with 3000ms timeout
      if (lat === null || lon === null) {
        try {
          const ipResponse = await fetch('https://ipapi.co/json/', {
            signal: AbortSignal.timeout(3000)
          });
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            if (typeof ipData.latitude === 'number' && typeof ipData.longitude === 'number') {
              lat = ipData.latitude;
              lon = ipData.longitude;
              isIpBased = true;
            }
          }
        } catch (ipError) {
          // Try secondary IP geolocation provider: get.geojs.io
          try {
            const geojsRes = await fetch('https://get.geojs.io/v1/ip/geo.json', {
              signal: AbortSignal.timeout(3000)
            });
            if (geojsRes.ok) {
              const geojsData = await geojsRes.json();
              const gLat = parseFloat(geojsData.latitude);
              const gLon = parseFloat(geojsData.longitude);
              if (!isNaN(gLat) && !isNaN(gLon)) {
                lat = gLat;
                lon = gLon;
                isIpBased = true;
              }
            }
          } catch {
            // Both IP fallbacks failed or device is completely offline
          }
        }
      }

      // 3. If neither GPS nor IP returned coordinates, do NOT silently fall back to Karachi.
      if (lat === null || lon === null) {
        setLocationState(prev => ({ ...prev, isDetecting: false }));
        return null;
      }

      // 4. Match against the app's offline city dataset for timezone and baseline
      const nearestCity = findNearestOfflineCity(lat, lon);
      if (!nearestCity) {
        setLocationState(prev => ({ ...prev, isDetecting: false }));
        return null;
      }

      // 5. Live reverse geocode with Nominatim (zoom=12) to extract real town/city/taluka + country
      let localPlace = nearestCity.city;
      let countryName = nearestCity.country;
      let locationName = `${nearestCity.city}, ${nearestCity.country}`;

      try {
        const nominatimRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=12`,
          {
            headers: { 'User-Agent': 'Noor-Connect-Islamic-App/1.0' },
            signal: AbortSignal.timeout(3500)
          }
        );
        if (nominatimRes.ok) {
          const data = await nominatimRes.json();
          if (data?.address) {
            const addr = data.address;
            localPlace = addr.city || addr.town || addr.county || addr.suburb || addr.village || addr.municipality || addr.state_district || nearestCity.city;
            countryName = addr.country || nearestCity.country;
            if (localPlace && countryName) {
              locationName = `${localPlace}, ${countryName}`;
            }
          }
        }
      } catch {
        // Fallback safely to offline nearest city display name
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
        } catch (widgetError) {
          console.warn('Failed to update widget:', widgetError);
        }
      }).catch(err => console.warn('Failed to import widget service:', err));

      return {
        ...nearestCity,
        city: localPlace,
        country: countryName,
        lat,
        lon,
        locationName,
      };
    } catch (err) {
      console.error('Unexpected error during location detection:', err);
      setLocationState(prev => ({ ...prev, isDetecting: false }));
      return null;
    }
  }, [location.isDetecting]);

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

