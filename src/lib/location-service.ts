/**
 * Worldwide Location & Geocoding Service
 *
 * Integrated engine providing:
 * 1. Multi-provider worldwide city/town/village search with zero rate-limit (Open-Meteo, Photon Komoot, Nominatim)
 * 2. High-accuracy reverse-geocoding (BigDataCloud + Nominatim)
 * 3. Timezone-aware metadata & regional prayer calculation method auto-recommendation
 */

import { GeocodingService, type GeocodingResult } from './geocoding';
import { getRecommendedPrayerMethod, type PrayerMethodInfo } from './prayer-method-recommendation';

export interface ReverseGeocodeResult {
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  displayName: string;
  timezone?: string;
}

export interface DetectedIPLocation {
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  displayName: string;
  timezone?: string;
}

export class LocationService {
  /**
   * Fast, rate-limit-free, multi-source HTTPS IP geolocation
   * Queries BigDataCloud, ipwho.is, and GeoJS concurrently with AbortController timeouts.
   * Completely safe on Android WebView and web browsers (0 native prompts, 0 permission popups, 0 crashes).
   */
  static async detectLocationViaIP(): Promise<DetectedIPLocation | null> {
    const fetchBigDataCloud = async (): Promise<DetectedIPLocation> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('BDC error');
        const d = await res.json();
        const lat = typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude);
        const lon = typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid coords');
        const city = d.locality || d.city || d.principalSubdivision || 'Detected Location';
        const state = d.principalSubdivision;
        const country = d.countryName || 'India';
        const countryCode = d.countryCode ? String(d.countryCode).toUpperCase() : undefined;
        const parts = [city, state, country].filter(Boolean);
        return {
          city,
          state,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
          displayName: parts.join(', '),
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchIpWhoIs = async (): Promise<DetectedIPLocation> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch('https://ipwho.is/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('ipwhois error');
        const d = await res.json();
        if (d.success === false) throw new Error('ipwhois failed');
        const lat = typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude);
        const lon = typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid coords');
        const city = d.city || d.region || 'Detected Location';
        const state = d.region;
        const country = d.country || '';
        const countryCode = d.country_code ? String(d.country_code).toUpperCase() : undefined;
        const parts = [city, state, country].filter(Boolean);
        return {
          city,
          state,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
          displayName: parts.join(', '),
          timezone: d.timezone?.id,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    const fetchGeoJs = async (): Promise<DetectedIPLocation> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('geojs error');
        const d = await res.json();
        const lat = parseFloat(d.latitude);
        const lon = parseFloat(d.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Invalid coords');
        const city = d.city || d.region || 'Detected Location';
        const state = d.region;
        const country = d.country || '';
        const countryCode = d.country_code ? String(d.country_code).toUpperCase() : undefined;
        const parts = [city, state, country].filter(Boolean);
        return {
          city,
          state,
          country,
          countryCode,
          latitude: lat,
          longitude: lon,
          displayName: parts.join(', '),
          timezone: d.timezone,
        };
      } finally {
        clearTimeout(timeoutId);
      }
    };

    try {
      return await Promise.any([fetchBigDataCloud(), fetchIpWhoIs(), fetchGeoJs()]);
    } catch {
      return null;
    }
  }
  /**
   * Search worldwide locations by query string (supports cities, towns, villages worldwide)
   */
  static async search(query: string): Promise<GeocodingResult[]> {
    return GeocodingService.searchLocation(query);
  }

  /**
   * Reverse-geocode coordinates into localized place names
   * Primary: BigDataCloud Reverse Geocode Client (free, high accuracy, zero rate-limit)
   * Secondary: Nominatim OSM reverse geocode
   */
  static async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    // 1. Primary Provider: BigDataCloud Reverse Geocoding
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const city = data.locality || data.city || data.principalSubdivision || 'Detected Location';
        const state = data.principalSubdivision;
        const country = data.countryName || '';
        const countryCode = data.countryCode ? String(data.countryCode).toUpperCase() : undefined;
        const parts = [city, state, country].filter(Boolean);

        return {
          city,
          state,
          country,
          countryCode,
          displayName: parts.join(', '),
        };
      }
    } catch {
      // Fall through to Nominatim
    }

    // 2. Secondary Fallback: Nominatim OpenStreetMap
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=12`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'NoorConnect-IslamicApp/2.2' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data?.address) {
          const addr = data.address;
          const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || 'Detected Location';
          const state = addr.state || addr.state_district;
          const country = addr.country || '';
          const countryCode = addr.country_code ? String(addr.country_code).toUpperCase() : undefined;
          const parts = [city, state, country].filter(Boolean);

          return {
            city,
            state,
            country,
            countryCode,
            displayName: parts.join(', '),
          };
        }
      }
    } catch {
      // Fall through
    }

    return null;
  }

  /**
   * Recommend calculation method based on country code
   */
  static getRecommendedMethod(countryCode?: string): PrayerMethodInfo {
    return getRecommendedPrayerMethod(countryCode);
  }
}

export { getRecommendedPrayerMethod, type PrayerMethodInfo };
