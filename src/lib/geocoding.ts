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
   * Search for a location by query (city name, address, etc.)
   * Offline-first: returns local pre-indexed cities instantly without network calls
   */
  static async searchLocation(query: string): Promise<GeocodingResult[]> {
    // 1. Search offline dataset first (instant, zero network)
    const offlineMatches = searchOfflineCities(query, 10);
    const offlineResults: GeocodingResult[] = offlineMatches.map(city => ({
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

    if (offlineResults.length > 0) {
      return offlineResults;
    }

    // 2. If no offline matches, attempt online search if network is available
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return [];
    }

    try {
      const url = `${this.NOMINATIM_BASE}?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Noor-Connect-Islamic-App/1.0' // Required by Nominatim policy
        }
      });

      if (!response.ok) {
        return [];
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.warn('Network search failed or offline:', error);
      return [];
    }
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
