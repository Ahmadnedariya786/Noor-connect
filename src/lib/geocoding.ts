/**
 * Geocoding Service using Nominatim (OpenStreetMap)
 * Free and open-source geocoding API
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
}

import { searchOfflineCities, getOfflineCityCoordinates } from '@/data/cities';

export class GeocodingService {
  private static readonly NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

  /**
   * Search for a location by query (city name, address, town, village, or postal code)
   * Online-first: Queries Nominatim for global coverage (including towns, villages, postal codes)
   * and falls back to offline pre-indexed cities if offline.
   */
  static async searchLocation(query: string): Promise<GeocodingResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // 1. Primary Live Search when online
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const url = `${this.NOMINATIM_BASE}?q=${encodeURIComponent(trimmed)}&format=json&limit=8&addressdetails=1`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'NoorConnect-IslamicApp/2.2 (contact@noorconnect.app)',
            'Accept-Language': 'en'
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const results = await response.json();
          if (Array.isArray(results) && results.length > 0) {
            return results;
          }
        }
      } catch (error) {
        // Fall through to offline search on network drop or timeout
      }
    }

    // 2. Offline Fallback: Search offline dataset (instant local search)
    const offlineMatches = searchOfflineCities(trimmed, 10);
    return offlineMatches.map(city => ({
      display_name: `${city.city}, ${city.state ? city.state + ', ' : ''}${city.country}`,
      lat: city.lat.toString(),
      lon: city.lon.toString(),
      address: {
        city: city.city,
        town: city.city,
        state: city.state,
        country: city.country
      }
    }));
  }

  /**
   * Get coordinates for a specific city and country
   * Offline-first: immediately resolves known cities without network calls
   */
  static async getCityCoordinates(city: string, country: string): Promise<{
    latitude: number;
    longitude: number;
    displayName: string;
  }> {
    // 1. Check offline dataset first (instant, zero network)
    const offlineMatch = getOfflineCityCoordinates(city, country);
    if (offlineMatch) {
      return {
        latitude: offlineMatch.lat,
        longitude: offlineMatch.lon,
        displayName: `${offlineMatch.city}, ${offlineMatch.state ? offlineMatch.state + ', ' : ''}${offlineMatch.country}`
      };
    }

    // 2. Fallback to searchLocation
    const query = city ? `${city}, ${country}` : country;
    const results = await this.searchLocation(query);

    if (results.length === 0) {
      throw new Error(`Location not found: ${query}`);
    }

    // Find the best match (prefer exact city matches if city was provided)
    let bestMatch = results[0];
    if (city) {
      const cityLower = city.toLowerCase();
      const match = results.find(result =>
        result.address.city?.toLowerCase() === cityLower ||
        result.address.town?.toLowerCase() === cityLower ||
        result.address.village?.toLowerCase() === cityLower ||
        result.display_name.toLowerCase().startsWith(cityLower)
      );
      if (match) bestMatch = match;
    }

    return {
      latitude: parseFloat(bestMatch.lat),
      longitude: parseFloat(bestMatch.lon),
      displayName: bestMatch.display_name
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
    // Extract city and country from display name
    const parts = displayName.split(',').map(p => p.trim());
    const city = parts[0] || 'Unknown';
    const country = parts[parts.length - 1] || 'Unknown';

    return {
      latitude,
      longitude,
      city,
      country,
      displayName,
      source,
      timestamp: new Date().toISOString()
    };
  }
}
