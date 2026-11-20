/**
 * Free Nearby Mosque Finder & Local Jamaat Times Service
 * Noor Connect — Privacy-First Islamic Companion
 *
 * Uses OpenStreetMap Overpass API (zero paid API keys) with automatic multi-mirror fallback,
 * 24-hour localStorage caching, Haversine distance sorting, offline Jamaat times, and
 * direct Google Maps navigation.
 */

export interface MosqueJamaatTimes {
  fajr?: string;
  dhuhr?: string;
  asr?: string;
  maghrib?: string;
  isha?: string;
  jummah?: string;
  updatedAt?: string;
}

export interface MosqueItem {
  id: string;
  name: string;
  nativeName?: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceFormatted: string;
  walkingEstimate: string;
  drivingEstimate: string;
  address: string;
  isFavourite: boolean;
  jamaatTimes?: MosqueJamaatTimes | null;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const STORAGE_FAVOURITES = 'noor_favourite_mosques';
const STORAGE_JAMAAT_PREFIX = 'noor_mosque_jamaat_';
const STORAGE_CACHE_PREFIX = 'noor_mosques_cache_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Calculates Haversine distance in meters between two lat/lon points.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats distance in meters to a clean readable string (e.g. '170 m' or '1.2 km').
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  const km = meters / 1000;
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

/**
 * Calculates walking estimate based on average 5 km/h.
 */
export function formatWalkingEstimate(meters: number): string {
  const mins = Math.max(1, Math.round((meters / 5000) * 60));
  return `~${mins} min walk`;
}

/**
 * Calculates driving estimate based on average 30 km/h city speed.
 */
export function formatDrivingEstimate(meters: number): string {
  const mins = Math.max(1, Math.round((meters / 30000) * 60));
  return `~${mins} min drive`;
}

/**
 * Get favourite mosque IDs from storage.
 */
export function getFavouriteMosqueIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_FAVOURITES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Toggle favourite status for a mosque.
 */
export function toggleFavouriteMosque(mosqueId: string): boolean {
  try {
    const favs = new Set(getFavouriteMosqueIds());
    let isNowFav = false;
    if (favs.has(mosqueId)) {
      favs.delete(mosqueId);
    } else {
      favs.add(mosqueId);
      isNowFav = true;
    }
    localStorage.setItem(STORAGE_FAVOURITES, JSON.stringify(Array.from(favs)));
    window.dispatchEvent(new CustomEvent('noor-favourite-mosques-changed', { detail: { mosqueId, isNowFav } }));
    return isNowFav;
  } catch {
    return false;
  }
}

/**
 * Get saved custom Jamaat times for a specific mosque.
 */
export function getMosqueJamaatTimes(mosqueId: string): MosqueJamaatTimes | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_JAMAAT_PREFIX}${mosqueId}`);
    if (!raw) return null;
    return JSON.parse(raw) as MosqueJamaatTimes;
  } catch {
    return null;
  }
}

/**
 * Save custom Jamaat times for a specific mosque.
 */
export function saveMosqueJamaatTimes(mosqueId: string, times: MosqueJamaatTimes): void {
  try {
    localStorage.setItem(
      `${STORAGE_JAMAAT_PREFIX}${mosqueId}`,
      JSON.stringify({ ...times, updatedAt: new Date().toISOString() })
    );
    window.dispatchEvent(new CustomEvent('noor-jamaat-times-changed', { detail: { mosqueId, times } }));
  } catch (err) {
    console.warn('[MosqueService] Failed to save Jamaat times:', err);
  }
}

/**
 * Get cached mosques from localStorage if within 24h TTL.
 */
function getCachedMosques(lat: number, lon: number, radiusMeters: number): MosqueItem[] | null {
  try {
    const key = `${STORAGE_CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusMeters}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { timestamp, items } = JSON.parse(raw);
    if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(items)) {
      const favSet = new Set(getFavouriteMosqueIds());
      // Re-hydrate favourites & Jamaat times
      return items.map((m: MosqueItem) => ({
        ...m,
        isFavourite: favSet.has(m.id),
        jamaatTimes: getMosqueJamaatTimes(m.id),
      }));
    }
  } catch {
    // Storage fallback
  }
  return null;
}

/**
 * Save mosques to localStorage with 24h timestamp.
 */
function setCachedMosques(lat: number, lon: number, radiusMeters: number, items: MosqueItem[]): void {
  try {
    const key = `${STORAGE_CACHE_PREFIX}${lat.toFixed(2)}_${lon.toFixed(2)}_${radiusMeters}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        items,
      })
    );
  } catch {
    // Storage quota fallback
  }
}

/**
 * Fetch nearby mosques within radius (in meters) from OpenStreetMap Overpass API.
 * Automatically tries mirror endpoints with 12s timeout and falls back to 24h cache.
 */
export async function fetchNearbyMosques(
  lat: number,
  lon: number,
  radiusMeters: number = 5000,
  forceRefresh = false
): Promise<MosqueItem[]> {
  // 1. Check local 24h cache first unless force refresh requested
  if (!forceRefresh) {
    const cached = getCachedMosques(lat, lon, radiusMeters);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  // 2. Build Overpass QL query
  const query = `[out:json][timeout:12];(node["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lon});way["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lon}););out center;`;
  const body = 'data=' + encodeURIComponent(query);

  let rawData: any = null;

  // 3. Try each mirror with timeout
  for (const mirror of OVERPASS_MIRRORS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(mirror, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.elements)) {
          rawData = json;
          break;
        }
      }
    } catch {
      // Try next mirror
    }
  }

  // 4. If all mirrors failed or timed out, fallback to expired cache if available
  if (!rawData || !Array.isArray(rawData.elements)) {
    const expiredCache = getCachedMosques(lat, lon, radiusMeters);
    if (expiredCache) {
      return expiredCache;
    }
    return [];
  }

  // 5. Transform and sort elements
  const favSet = new Set(getFavouriteMosqueIds());
  const elements = rawData.elements as any[];
  const seenIds = new Set<string>();
  const mosques: MosqueItem[] = [];

  for (const el of elements) {
    const id = String(el.id);
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const mLat = el.lat || el.center?.lat;
    const mLon = el.lon || el.center?.lon;
    if (typeof mLat !== 'number' || typeof mLon !== 'number') continue;

    const tags = el.tags || {};
    const name = tags.name || tags['name:en'] || tags['name:ur'] || tags['name:hi'] || 'Masjid / Islamic Centre';
    const nativeName = tags['name:ar'] || tags['name:ur'] || undefined;

    const street = tags['addr:street'] || '';
    const city = tags['addr:city'] || '';
    const suburb = tags['addr:suburb'] || '';
    const addressParts = [street, suburb, city].filter(Boolean);
    const address = addressParts.length > 0 ? addressParts.join(', ') : `${mLat.toFixed(3)}° N, ${mLon.toFixed(3)}° E`;

    const distMeters = calculateHaversineDistanceMeters(lat, lon, mLat, mLon);
    const isFavourite = favSet.has(id);
    const jamaat = getMosqueJamaatTimes(id);

    mosques.push({
      id,
      name,
      nativeName,
      latitude: mLat,
      longitude: mLon,
      distanceMeters: distMeters,
      distanceFormatted: formatDistance(distMeters),
      walkingEstimate: formatWalkingEstimate(distMeters),
      drivingEstimate: formatDrivingEstimate(distMeters),
      address,
      isFavourite,
      jamaatTimes: jamaat,
    });
  }

  // Sort: Favourites first, then nearest distance first
  mosques.sort((a, b) => {
    if (a.isFavourite && !b.isFavourite) return -1;
    if (!a.isFavourite && b.isFavourite) return 1;
    return a.distanceMeters - b.distanceMeters;
  });

  // Save to 24h cache
  setCachedMosques(lat, lon, radiusMeters, mosques);

  return mosques;
}

/**
 * Open external navigation to mosque via Google Maps.
 */
export function openGoogleMapsDirections(lat: number, lon: number): void {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open nearby mosque search in Google Maps.
 */
export function openGoogleMapsSearchNearby(lat: number, lon: number): void {
  const url = `https://www.google.com/maps/search/mosque/@${lat},${lon},15z`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
