/**
 * Worldwide Geocoding Service
 *
 * Multi-provider worldwide location search with zero rate-limit:
 * 1. Open-Meteo Worldwide Geocoding API (Primary - instant, free, no API key, returns exact IANA timezone)
 * 2. Photon Komoot OSM API (Fast worldwide fallback)
 * 3. Nominatim OpenStreetMap (Third fallback)
 * 4. Offline pre-indexed city database (Local offline fallback)
 */

export interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    county?: string;
    country: string;
    state?: string;
    postcode?: string;
  };
  timezone?: string;
  countryCode?: string;
}

import { searchOfflineCities, getOfflineCityCoordinates } from '@/data/cities';

export class GeocodingService {
  private static readonly OPEN_METEO_BASE = 'https://geocoding-api.open-meteo.com/v1/search';
  private static readonly PHOTON_BASE = 'https://photon.komoot.io/api';
  private static readonly NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

  /**
   * Search worldwide locations (city, town, village, district, province)
   * Multi-provider cascade ensuring zero 429/403 rate-limits across 200+ countries.
   */
  static async searchLocation(query: string): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Primary Live Search: Open-Meteo Worldwide Geocoding (Zero rate limit, fast, IANA timezone)
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const url = `${this.OPEN_METEO_BASE}?name=${encodeURIComponent(trimmed)}&count=12&language=en&format=json`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.results) && data.results.length > 0) {
            return data.results.map((item: any) => {
              const nameParts = [item.name, item.admin1, item.country].filter(Boolean);
              return {
                display_name: nameParts.join(', '),
                lat: String(item.latitude),
                lon: String(item.longitude),
                address: {
                  city: item.name,
                  town: item.name,
                  state: item.admin1,
                  country: item.country || '',
                },
                timezone: item.timezone,
                countryCode: item.country_code ? String(item.country_code).toUpperCase() : undefined,
              };
            });
          }
        }
      } catch {
        // Fall through to Photon Komoot on network drop or timeout
      }

      // 2. Secondary Live Fallback: Photon Komoot OSM API
      try {
        const url = `${this.PHOTON_BASE}/?q=${encodeURIComponent(trimmed)}&limit=10`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data?.features) && data.features.length > 0) {
            return data.features.map((feat: any) => {
              const props = feat.properties || {};
              const coords = feat.geometry?.coordinates || [0, 0];
              const name = props.name || props.city || props.town || trimmed;
              const state = props.state || props.county || '';
              const country = props.country || '';
              const parts = [name, state, country].filter(Boolean);

              return {
                display_name: parts.join(', '),
                lat: String(coords[1]),
                lon: String(coords[0]),
                address: {
                  city: name,
                  town: name,
                  state,
                  country,
                },
                countryCode: props.countrycode ? String(props.countrycode).toUpperCase() : undefined,
              };
            });
          }
        }
      } catch {
        // Fall through to Nominatim
      }

      // 3. Third Live Fallback: Nominatim OpenStreetMap
      try {
        const url = `${this.NOMINATIM_BASE}?q=${encodeURIComponent(trimmed)}&format=json&limit=10&addressdetails=1`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NoorConnect-IslamicApp/2.2 (contact@noorconnect.app)',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
            return results.map((item: any) => ({
              display_name: item.display_name,
              lat: item.lat,
              lon: item.lon,
              address: item.address || { country: '' },
              countryCode: item.address?.country_code
                ? String(item.address.country_code).toUpperCase()
                : undefined,
            }));
          }
        }
      } catch {
        // Fall through to offline dataset
      }
    }

    // 4. Offline Fallback: Search offline pre-indexed database (instant, local)
    const offlineMatches = searchOfflineCities(trimmed, 10);
    return offlineMatches.map((city) => ({
      display_name: `${city.city}, ${city.state ? city.state + ', ' : ''}${city.country}`,
      lat: city.lat.toString(),
      lon: city.lon.toString(),
      address: {
        city: city.city,
        town: city.city,
        state: city.state,
        country: city.country,
      },
      timezone: city.timezone,
    }));
  }

  /**
   * Get coordinates for a specific city and country
   */
  static async getCityCoordinates(
    city: string,
    country: string
  ): Promise<{
    latitude: number;
    longitude: number;
    displayName: string;
    timezone?: string;
    countryCode?: string;
  }> {
    // 1. Check offline dataset first (instant, zero network)
    const offlineMatch = getOfflineCityCoordinates(city, country);
    if (offlineMatch) {
      return {
        latitude: offlineMatch.lat,
        longitude: offlineMatch.lon,
        displayName: `${offlineMatch.city}, ${offlineMatch.state ? offlineMatch.state + ', ' : ''}${offlineMatch.country}`,
        timezone: offlineMatch.timezone,
      };
    }

    // 2. Fallback to searchLocation
    const query = city ? `${city}, ${country}` : country;
    const results = await this.searchLocation(query);

    if (results.length === 0) {
      throw new Error(`Location not found: ${query}`);
    }

    // Find the best match
    let bestMatch = results[0];
    if (city) {
      const cityLower = city.toLowerCase();
      const match = results.find(
        (r) =>
          r.address.city?.toLowerCase() === cityLower ||
          r.address.town?.toLowerCase() === cityLower ||
          r.address.village?.toLowerCase() === cityLower ||
          r.display_name.toLowerCase().startsWith(cityLower)
      );
      if (match) bestMatch = match;
    }

    return {
      latitude: parseFloat(bestMatch.lat),
      longitude: parseFloat(bestMatch.lon),
      displayName: bestMatch.display_name,
      timezone: bestMatch.timezone,
      countryCode: bestMatch.countryCode,
    };
  }

  /**
   * Format location data for storage
   */
  static formatLocationData(
    latitude: number,
    longitude: number,
    displayName: string,
    source: 'manual' | 'geolocation' | 'ip' | 'default' = 'manual'
  ) {
    const parts = displayName.split(',').map((p) => p.trim());
    const city = parts[0] || 'Unknown';
    const country = parts[parts.length - 1] || 'Unknown';

    return {
      latitude,
      longitude,
      city,
      country,
      displayName,
      source,
      timestamp: new Date().toISOString(),
    };
  }
}
