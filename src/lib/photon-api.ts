/**
 * Photon API Service
 * Search-as-you-type city selection using Komoot's Photon API
 * FOSS-friendly alternative to proprietary geocoding services
 * Updated: Fixed OpenCage API references
 */

export interface CityResult {
  place_id: number;
  osm_id: number;
  osm_type: string;
  extent: number[];
  country: string;
  osm_key: string;
  osm_value: string;
  name: string;
  state?: string;
  postcode?: string;
  city?: string;
  street?: string;
  house_number?: string;
  lat: number;
  lon: number;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon: string;
  boundingbox: [number, number, number, number];
}

export interface SearchOptions {
  limit?: number;
  language?: string;
  country?: string;
}

import { searchOfflineCities, type CityData } from '@/data/cities';

function mapCityDataToCityResult(city: CityData, index: number): CityResult {
  return {
    place_id: 1000 + index,
    osm_id: 1000 + index,
    osm_type: 'node',
    extent: [],
    country: city.country,
    osm_key: 'place',
    osm_value: 'city',
    name: city.city,
    state: city.state,
    city: city.city,
    lat: city.lat,
    lon: city.lon,
    display_name: `${city.city}, ${city.state ? city.state + ', ' : ''}${city.country}`,
    class: 'place',
    type: 'city',
    importance: city.isPopular ? 1 : 0.8,
    icon: '',
    boundingbox: [city.lat, city.lon, city.lat, city.lon]
  };
}

class PhotonAPIService {
  private readonly BASE_URL = 'https://photon.komoot.io/api/';
  private searchAbortController: AbortController | null = null;

  /**
   * Search for cities with debouncing
   */
  async searchCities(query: string, options: SearchOptions = {}): Promise<CityResult[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    // Check offline database first
    const offlineMatches = searchOfflineCities(query, options.limit || 10);
    if (offlineMatches.length > 0) {
      return offlineMatches.map(mapCityDataToCityResult);
    }

    // Cancel previous search if still pending
    if (this.searchAbortController) {
      this.searchAbortController.abort();
    }

    // Create new abort controller for this search
    this.searchAbortController = new AbortController();

    try {
      const params = new URLSearchParams({
        q: query,
        // Filter for cities and towns only
        osm_tag: 'place:city',
        // Limit results for better performance
        limit: (options.limit || 10).toString(),
        // Language preference
        lang: options.language || 'en'
      });

      // Add country filter if specified
      if (options.country) {
        params.append('osm_tag', `place:city&country:${options.country}`);
      }

      const url = `${this.BASE_URL}?${params.toString()}`;
      
      const response = await fetch(url, {
        signal: this.searchAbortController.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Noor-Connect-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter results to ensure we only get cities and towns
      const cities = data.features?.filter((feature: any) => {
        const properties = feature.properties;
        return properties.osm_key === 'place' && 
               (properties.osm_value === 'city' || properties.osm_value === 'town');
      }) || [];

      // Transform to our CityResult interface
      return cities.map((feature: any) => ({
        place_id: feature.properties.place_id,
        osm_id: feature.properties.osm_id,
        osm_type: feature.properties.osm_type,
        extent: feature.properties.extent || [],
        country: feature.properties.country || '',
        osm_key: feature.properties.osm_key,
        osm_value: feature.properties.osm_value,
        name: feature.properties.name,
        state: feature.properties.state,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        street: feature.properties.street,
        house_number: feature.properties.house_number,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        display_name: feature.properties.display_name || feature.properties.name,
        class: feature.properties.class || '',
        type: feature.properties.type || '',
        importance: feature.properties.importance || 0,
        icon: feature.properties.icon || '',
        boundingbox: feature.properties.boundingbox || [0, 0, 0, 0]
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Search request was aborted');
        return [];
      }
      
      console.error('Photon API search error:', error);
      return [];
    } finally {
      this.searchAbortController = null;
    }
  }

  /**
   * Search for both cities and towns
   */
  async searchCitiesAndTowns(query: string, options: SearchOptions = {}): Promise<CityResult[]> {
    if (!query.trim() || query.length < 2) {
      return [];
    }

    // Check offline database first
    const offlineMatches = searchOfflineCities(query, options.limit || 15);
    if (offlineMatches.length > 0) {
      return offlineMatches.map(mapCityDataToCityResult);
    }

    // Cancel previous search if still pending
    if (this.searchAbortController) {
      this.searchAbortController.abort();
    }

    // Create new abort controller for this search
    this.searchAbortController = new AbortController();

    try {
      const params = new URLSearchParams({
        q: query,
        limit: (options.limit || 15).toString(),
        lang: options.language || 'en'
      });

      // Add country filter if specified
      if (options.country) {
        params.append('osm_tag', `country:${options.country}`);
      }

      const url = `${this.BASE_URL}?${params.toString()}`;
      
      const response = await fetch(url, {
        signal: this.searchAbortController.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Noor-Connect-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter results to ensure we only get cities, towns, and villages
      const places = data.features?.filter((feature: any) => {
        const properties = feature.properties;
        return properties.osm_key === 'place' && 
               ['city', 'town', 'village'].includes(properties.osm_value);
      }) || [];

      // Sort by importance and limit results
      const sortedPlaces = places.sort((a: any, b: any) => 
        (b.properties.importance || 0) - (a.properties.importance || 0)
      ).slice(0, options.limit || 15);

      // Transform to our CityResult interface
      return sortedPlaces.map((feature: any) => ({
        place_id: feature.properties.place_id,
        osm_id: feature.properties.osm_id,
        osm_type: feature.properties.osm_type,
        extent: feature.properties.extent || [],
        country: feature.properties.country || '',
        osm_key: feature.properties.osm_key,
        osm_value: feature.properties.osm_value,
        name: feature.properties.name,
        state: feature.properties.state,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
        street: feature.properties.street,
        house_number: feature.properties.house_number,
        lat: feature.geometry.coordinates[1],
        lon: feature.geometry.coordinates[0],
        display_name: this.formatDisplayName(feature.properties),
        class: feature.properties.class || '',
        type: feature.properties.type || '',
        importance: feature.properties.importance || 0,
        icon: feature.properties.icon || '',
        boundingbox: feature.properties.boundingbox || [0, 0, 0, 0]
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Search request was aborted');
        return [];
      }
      
      console.error('Photon API search error:', error);
      return [];
    } finally {
      this.searchAbortController = null;
    }
  }

  /**
   * Format display name for better UX
   */
  private formatDisplayName(properties: any): string {
    const parts = [properties.name];
    
    if (properties.state && properties.state !== properties.name) {
      parts.push(properties.state);
    }
    
    if (properties.country) {
      parts.push(properties.country);
    }
    
    return parts.join(', ');
  }

  /**
   * Cancel any pending search requests
   */
  cancelSearch(): void {
    if (this.searchAbortController) {
      this.searchAbortController.abort();
      this.searchAbortController = null;
    }
  }

  /**
   * Get popular Islamic cities as fallback
   */
  getPopularIslamicCities(): CityResult[] {
    return [
      {
        place_id: 1,
        osm_id: 1,
        osm_type: 'relation',
        extent: [],
        country: 'Saudi Arabia',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Mecca',
        state: 'Mecca Region',
        lat: 21.3891,
        lon: 39.8579,
        display_name: 'Mecca, Mecca Region, Saudi Arabia',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [21.3891, 39.8579, 21.3891, 39.8579]
      },
      {
        place_id: 2,
        osm_id: 2,
        osm_type: 'relation',
        extent: [],
        country: 'Saudi Arabia',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Medina',
        state: 'Medina Region',
        lat: 24.4686,
        lon: 39.6119,
        display_name: 'Medina, Medina Region, Saudi Arabia',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [24.4686, 39.6119, 24.4686, 39.6119]
      },
      {
        place_id: 3,
        osm_id: 3,
        osm_type: 'relation',
        extent: [],
        country: 'Palestine',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Jerusalem',
        state: 'Jerusalem',
        lat: 31.7683,
        lon: 35.2137,
        display_name: 'Jerusalem, Jerusalem, Palestine',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [31.7683, 35.2137, 31.7683, 35.2137]
      },
      {
        place_id: 4,
        osm_id: 4,
        osm_type: 'relation',
        extent: [],
        country: 'India',
        osm_key: 'place',
        osm_value: 'city',
        name: 'New Delhi',
        state: 'Delhi',
        lat: 28.6139,
        lon: 77.2090,
        display_name: 'New Delhi, Delhi, India',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [28.6139, 77.2090, 28.6139, 77.2090]
      },
      {
        place_id: 5,
        osm_id: 5,
        osm_type: 'relation',
        extent: [],
        country: 'India',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Mumbai',
        state: 'Maharashtra',
        lat: 19.0760,
        lon: 72.8777,
        display_name: 'Mumbai, Maharashtra, India',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [19.0760, 72.8777, 19.0760, 72.8777]
      },
      {
        place_id: 6,
        osm_id: 6,
        osm_type: 'relation',
        extent: [],
        country: 'India',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Hyderabad',
        state: 'Telangana',
        lat: 17.3850,
        lon: 78.4867,
        display_name: 'Hyderabad, Telangana, India',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [17.3850, 78.4867, 17.3850, 78.4867]
      },
      {
        place_id: 7,
        osm_id: 7,
        osm_type: 'relation',
        extent: [],
        country: 'India',
        osm_key: 'place',
        osm_value: 'city',
        name: 'Lucknow',
        state: 'Uttar Pradesh',
        lat: 26.8467,
        lon: 80.9462,
        display_name: 'Lucknow, Uttar Pradesh, India',
        class: 'place',
        type: 'city',
        importance: 1,
        icon: '',
        boundingbox: [26.8467, 80.9462, 26.8467, 80.9462]
      }
    ];
  }
}

export const photonAPI = new PhotonAPIService();
