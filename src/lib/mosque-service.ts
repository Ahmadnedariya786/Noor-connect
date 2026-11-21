/**
 * Free Nearby Mosque Finder & Local Jamaat Times Service
 * Noor Connect — Privacy-First Islamic Companion
 *
 * Uses OpenStreetMap Overpass API (zero paid API keys) + Photon Komoot Geo-Search
 * with parallel multi-mirror racing (<3s response), 24-hour localStorage caching,
 * Haversine distance sorting, offline Jamaat times, custom masjid creator,
 * and direct Google Maps navigation.
 */

import {
  formatDistance,
  formatWalkingEstimate,
  calculateHaversineDistanceMeters,
} from './prayer-offsets';

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
  isPrimary?: boolean;
  isCustom?: boolean;
  jamaatTimes?: MosqueJamaatTimes | null;
}

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

export const STORAGE_FAVOURITES = 'noor_favourite_mosques';
export const STORAGE_PRIMARY_MASJID = 'noor_primary_masjid';
export const STORAGE_CUSTOM_MOSQUES = 'noor_custom_mosques';
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
 * Calculates walking estimate based on average 5 km/h (12 min/km).
 * Only shown for nearby walkable mosques (<= 3.0 km).
 */
export function formatWalkingEstimate(meters: number): string {
  if (meters > 3000) return '';
  const mins = Math.max(1, Math.round((meters / 1000) * 12));
  return `~${mins} min walk`;
}

/**
 * Calculates driving estimate based on average 40 km/h speed.
 * Only shown for mosques within driving reach (<= 100 km).
 */
export function formatDrivingEstimate(meters: number): string {
  if (meters > 100000) return '';
  const totalMins = Math.max(1, Math.round((meters / 40000) * 60));
  if (totalMins < 60) {
    return `~${totalMins} min drive`;
  }
  const hrs = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  return remMins > 0 ? `~${hrs}h ${remMins}m drive` : `~${hrs}h drive`;
}

export interface StreetLocationResult {
  latitude: number;
  longitude: number;
  lat: number;
  lon: number;
  isFresh: boolean;
  isLiveGps: boolean;
}

/**
 * Attempt to acquire fresh street-level coordinates safely.
 * Uses standard browser navigator.geolocation wrapped in try/catch + timeout.
 * Never calls native Capacitor plugin directly to avoid WebView crash.
 * Only attempts GPS if userRequested is true, otherwise returns fallback coordinates instantly.
 */
export async function getCurrentStreetLocation(
  fallbackLat: number,
  fallbackLon: number,
  userRequested = false
): Promise<StreetLocationResult> {
  if (userRequested && typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4500,
          maximumAge: 60000,
        });
      });
      if (pos?.coords && Number.isFinite(pos.coords.latitude) && Number.isFinite(pos.coords.longitude)) {
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          isFresh: true,
          isLiveGps: true,
        };
      }
    } catch {
      // Safe fallback on denial or timeout
    }
  }

  return {
    latitude: fallbackLat,
    longitude: fallbackLon,
    lat: fallbackLat,
    lon: fallbackLon,
    isFresh: false,
    isLiveGps: false,
  };
}

/**
 * Get primary pinned masjid from storage.
 */
export function getPrimaryMasjid(): MosqueItem | null {
  try {
    const raw = localStorage.getItem(STORAGE_PRIMARY_MASJID);
    if (!raw) return null;
    const item = JSON.parse(raw) as MosqueItem;
    return {
      ...item,
      jamaatTimes: getMosqueJamaatTimes(item.id) || item.jamaatTimes || null,
      isPrimary: true,
    };
  } catch {
    return null;
  }
}

/**
 * Set or clear primary pinned masjid in storage.
 */
export function setPrimaryMasjid(mosque: MosqueItem | null): void {
  try {
    if (!mosque) {
      localStorage.removeItem(STORAGE_PRIMARY_MASJID);
    } else {
      localStorage.setItem(
        STORAGE_PRIMARY_MASJID,
        JSON.stringify({ ...mosque, isPrimary: true })
      );
    }
    window.dispatchEvent(new CustomEvent('noor-primary-masjid-changed', { detail: { mosque } }));
  } catch {
    // Storage fallback
  }
}

/**
 * Get custom user-added mosques.
 */
export function getCustomMosques(): MosqueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_MOSQUES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a new user-added custom local masjid.
 */
export function saveCustomMosque(
  data: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    jamaatTimes?: MosqueJamaatTimes;
    setAsPrimary?: boolean;
  },
  userLat: number,
  userLon: number
): MosqueItem {
  const id = `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const distMeters = calculateHaversineDistanceMeters(userLat, userLon, data.latitude, data.longitude);

  const mosque: MosqueItem = {
    id,
    name: data.name.trim(),
    latitude: data.latitude,
    longitude: data.longitude,
    distanceMeters: distMeters,
    distanceFormatted: formatDistance(distMeters),
    walkingEstimate: formatWalkingEstimate(distMeters),
    drivingEstimate: formatDrivingEstimate(distMeters),
    address: data.address?.trim() || `${data.latitude.toFixed(3)}° N, ${data.longitude.toFixed(3)}° E`,
    isFavourite: true,
    isCustom: true,
    isPrimary: !!data.setAsPrimary,
    jamaatTimes: data.jamaatTimes || null,
  };

  const existing = getCustomMosques();
  existing.unshift(mosque);
  try {
    localStorage.setItem(STORAGE_CUSTOM_MOSQUES, JSON.stringify(existing));
  } catch {
    // Storage fallback
  }

  if (data.jamaatTimes) {
    saveMosqueJamaatTimes(id, data.jamaatTimes);
  }

  if (data.setAsPrimary) {
    setPrimaryMasjid(mosque);
  }

  window.dispatchEvent(new CustomEvent('noor-custom-mosques-changed', { detail: { mosque } }));
  return mosque;
}

/**
 * Delete a custom masjid.
 */
export function deleteCustomMosque(id: string): void {
  try {
    const existing = getCustomMosques().filter((m) => m.id !== id);
    localStorage.setItem(STORAGE_CUSTOM_MOSQUES, JSON.stringify(existing));
    const primary = getPrimaryMasjid();
    if (primary && primary.id === id) {
      setPrimaryMasjid(null);
    }
    window.dispatchEvent(new CustomEvent('noor-custom-mosques-changed', { detail: { id } }));
  } catch {
    // Storage fallback
  }
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

    const primary = getPrimaryMasjid();
    if (primary && primary.id === mosqueId) {
      setPrimaryMasjid({ ...primary, jamaatTimes: times });
    }

    window.dispatchEvent(new CustomEvent('noor-jamaat-times-changed', { detail: { mosqueId, times } }));
  } catch (err) {
    console.warn('[MosqueService] Failed to save Jamaat times:', err);
  }
}

/**
 * Normalize mosque name for proximity deduplication.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/masjid/g, '')
    .replace(/mosque/g, '');
}

/**
 * Fetch mosques from Photon Komoot (<400ms, free, rural-safe).
 */
async function fetchPhotonMosques(
  lat: number,
  lon: number,
  query: string = 'masjid',
  limit: number = 30
): Promise<MosqueItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lon}&limit=${limit}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    if (!data || !Array.isArray(data.features)) return [];

    const favSet = new Set(getFavouriteMosqueIds());
    const primary = getPrimaryMasjid();
    const results: MosqueItem[] = [];

    for (const f of data.features) {
      const geom = f.geometry?.coordinates;
      if (!Array.isArray(geom) || geom.length < 2) continue;
      const mLon = Number(geom[0]);
      const mLat = Number(geom[1]);
      if (isNaN(mLat) || isNaN(mLon)) continue;

      const p = f.properties || {};
      const rawName = p.name || p.street || 'Masjid';

      // Strict Mosque-Only filter:
      // Must have place_of_worship or match mosque naming pattern.
      // This eliminates 3,443 km Kazakhstan "Aqsal" (village) and non-mosque locations.
      const isPlaceOfWorship = p.osm_value === 'place_of_worship' || p.osm_value === 'mosque' || p.osm_key === 'amenity';
      const matchesMosquePattern = /masjid|mosque|jama|juma|jamiya|eidgah|idgah|musalla|مسجد/i.test(rawName);
      if (!isPlaceOfWorship && !matchesMosquePattern) {
        continue;
      }

      const distMeters = calculateHaversineDistanceMeters(lat, lon, mLat, mLon);
      // Hard distance cap: discard anything beyond 50 km
      if (distMeters > 50000) {
        continue;
      }

      const city = p.city || p.district || p.state || '';
      const street = p.street || '';
      const address = [street, city].filter(Boolean).join(', ') || `${mLat.toFixed(3)}° N, ${mLon.toFixed(3)}° E`;

      const id = `photon_${p.osm_type || 'N'}_${p.osm_id || Math.abs(Math.round(mLat * 10000 + mLon * 10000))}`;
      const isFav = favSet.has(id);
      const isPrim = primary?.id === id;

      results.push({
        id,
        name: rawName,
        latitude: mLat,
        longitude: mLon,
        distanceMeters: distMeters,
        distanceFormatted: formatDistance(distMeters),
        walkingEstimate: formatWalkingEstimate(distMeters),
        drivingEstimate: formatDrivingEstimate(distMeters),
        address,
        isFavourite: isFav,
        isPrimary: isPrim,
        jamaatTimes: getMosqueJamaatTimes(id),
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Race all Overpass mirrors in parallel using Promise.any (<6.5s).
 */
async function raceOverpassMirrors(
  lat: number,
  lon: number,
  radiusMeters: number
): Promise<MosqueItem[]> {
  const query = `[out:json][timeout:5];(nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusMeters},${lat},${lon});nwr["building"="mosque"](around:${radiusMeters},${lat},${lon});nwr["name"~"Masjid|Mosque|Jama|Juma|Jamiya|Madina|Aqsa|Ibrahim|Eidgah|Idgah|مسجد",i](around:${radiusMeters},${lat},${lon}););out center 40;`;
  const body = 'data=' + encodeURIComponent(query);

  const fetchSingleMirror = async (mirror: string): Promise<any> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(mirror, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Mirror ${mirror} HTTP ${res.status}`);
    const json = await res.json();
    if (!json || !Array.isArray(json.elements)) throw new Error('Invalid Overpass JSON');
    return json;
  };

  try {
    const rawData = await Promise.any(OVERPASS_MIRRORS.map((m) => fetchSingleMirror(m)));
    if (!rawData || !Array.isArray(rawData.elements)) return [];

    const favSet = new Set(getFavouriteMosqueIds());
    const primary = getPrimaryMasjid();
    const mosques: MosqueItem[] = [];

    for (const el of rawData.elements) {
      const id = String(el.id);
      const mLat = el.lat || el.center?.lat;
      const mLon = el.lon || el.center?.lon;
      if (typeof mLat !== 'number' || typeof mLon !== 'number') continue;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || tags['name:ur'] || tags['name:hi'] || 'Masjid';
      const nativeName = tags['name:ar'] || tags['name:ur'] || undefined;

      const street = tags['addr:street'] || '';
      const city = tags['addr:city'] || '';
      const suburb = tags['addr:suburb'] || '';
      const addressParts = [street, suburb, city].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : `${mLat.toFixed(3)}° N, ${mLon.toFixed(3)}° E`;

      const distMeters = calculateHaversineDistanceMeters(lat, lon, mLat, mLon);
      const isFav = favSet.has(id);
      const isPrim = primary?.id === id;

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
        isFavourite: isFav,
        isPrimary: isPrim,
        jamaatTimes: getMosqueJamaatTimes(id),
      });
    }

    return mosques;
  } catch {
    return [];
  }
}

/**
 * Deduplicate and sort mosques (Primary & Favourites first, then nearest).
 */
function deduplicateAndSort(mosques: MosqueItem[], maxRadiusMeters?: number): MosqueItem[] {
  const primary = getPrimaryMasjid();
  const favSet = new Set(getFavouriteMosqueIds());

  // Filter within maxRadius if specified
  const filtered = typeof maxRadiusMeters === 'number'
    ? mosques.filter((m) => m.distanceMeters <= maxRadiusMeters)
    : mosques;

  const result: MosqueItem[] = [];

  for (const candidate of filtered) {
    // Check if duplicate of already selected
    const isDuplicate = result.some((existing) => {
      const dist = calculateHaversineDistanceMeters(
        existing.latitude,
        existing.longitude,
        candidate.latitude,
        candidate.longitude
      );
      if (dist < 65) return true;
      if (dist < 400) {
        const normExisting = normalizeName(existing.name);
        const normCand = normalizeName(candidate.name);
        if (normExisting && normCand && (normExisting.includes(normCand) || normCand.includes(normExisting))) {
          return true;
        }
      }
      return false;
    });

    if (!isDuplicate) {
      const isFav = favSet.has(candidate.id) || !!candidate.isFavourite;
      const isPrim = primary?.id === candidate.id || !!candidate.isPrimary;
      result.push({
        ...candidate,
        isFavourite: isFav,
        isPrimary: isPrim,
        jamaatTimes: getMosqueJamaatTimes(candidate.id) || candidate.jamaatTimes || null,
      });
    }
  }

  // Sorting hierarchy:
  // 1. Primary masjid first
  // 2. Favourites next
  // 3. Nearest distance first
  result.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    if (a.isFavourite && !b.isFavourite) return -1;
    if (!a.isFavourite && b.isFavourite) return 1;
    return a.distanceMeters - b.distanceMeters;
  });

  return result;
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
      return deduplicateAndSort(items);
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
 * Fetch nearby mosques within radius (in meters).
 * Runs Photon + Overpass mirror race + Local Custom/Favourites in parallel (<3s).
 */
export async function fetchNearbyMosques(
  lat: number,
  lon: number,
  radiusMeters: number = 5000,
  forceRefresh = false
): Promise<MosqueItem[]> {
  // 1. Check local 24h cache first
  if (!forceRefresh) {
    const cached = getCachedMosques(lat, lon, radiusMeters);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  // 2. Always prepare user's custom & primary mosques
  const customMosques = getCustomMosques().map((m) => {
    const dist = calculateHaversineDistanceMeters(lat, lon, m.latitude, m.longitude);
    return {
      ...m,
      distanceMeters: dist,
      distanceFormatted: formatDistance(dist),
      walkingEstimate: formatWalkingEstimate(dist),
      drivingEstimate: formatDrivingEstimate(dist),
      jamaatTimes: getMosqueJamaatTimes(m.id) || m.jamaatTimes,
    };
  });

  // 3. Parallel multi-source fetch
  const [photonMasjids, photonMosques, overpassMosques] = await Promise.allSettled([
    fetchPhotonMosques(lat, lon, 'masjid', 30),
    fetchPhotonMosques(lat, lon, 'mosque', 30),
    raceOverpassMirrors(lat, lon, Math.max(radiusMeters, 5000)),
  ]);

  const pool: MosqueItem[] = [...customMosques];

  if (photonMasjids.status === 'fulfilled') {
    pool.push(...photonMasjids.value);
  }
  if (photonMosques.status === 'fulfilled') {
    pool.push(...photonMosques.value);
  }
  if (overpassMosques.status === 'fulfilled') {
    pool.push(...overpassMosques.value);
  }

  // 4. Radius filter with auto-expansion if < 3 mosques
  let candidateRadius = radiusMeters;
  let deduplicated = deduplicateAndSort(pool, candidateRadius);

  if (deduplicated.length < 3 && candidateRadius < 15000) {
    // Auto-expand to 15km so rural users always find mosques
    candidateRadius = 15000;
    deduplicated = deduplicateAndSort(pool, candidateRadius);
  }

  if (deduplicated.length > 0) {
    setCachedMosques(lat, lon, radiusMeters, deduplicated);
    return deduplicated;
  }

  // If online query yielded 0, return expired cache if any
  const expired = getCachedMosques(lat, lon, radiusMeters);
  if (expired && expired.length > 0) {
    return expired;
  }

  return deduplicateAndSort(customMosques);
}

/**
 * Query Nominatim bounded search in parallel with Overpass & Photon (<4.5s).
 * Strictly bounded to +/- 0.5 degrees (~55 km) around user coordinates.
 */
async function fetchNominatimMosques(
  lat: number,
  lon: number,
  query: string,
  limit: number = 10
): Promise<MosqueItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);

    const viewbox = `${lon - 0.5},${lat + 0.5},${lon + 0.5},${lat - 0.5}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ' masjid')}&format=json&limit=${limit}&viewbox=${viewbox}&bounded=1`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const favSet = new Set(getFavouriteMosqueIds());
    const primary = getPrimaryMasjid();
    const results: MosqueItem[] = [];

    for (const item of data) {
      const mLat = parseFloat(item.lat);
      const mLon = parseFloat(item.lon);
      if (isNaN(mLat) || isNaN(mLon)) continue;

      const rawName = item.display_name?.split(',')[0] || item.name || 'Masjid';
      const distMeters = calculateHaversineDistanceMeters(lat, lon, mLat, mLon);
      if (distMeters > 50000) continue; // enforce 50 km cap

      const isFav = favSet.has(item.osm_id?.toString() || '');
      const isPrim = primary?.id === item.osm_id?.toString();

      results.push({
        id: `osm_${item.osm_type || 'N'}_${item.osm_id || Math.abs(Math.round(mLat * 10000 + mLon * 10000))}`,
        name: rawName,
        latitude: mLat,
        longitude: mLon,
        distanceMeters: distMeters,
        distanceFormatted: formatDistance(distMeters),
        walkingEstimate: formatWalkingEstimate(distMeters),
        drivingEstimate: formatDrivingEstimate(distMeters),
        address: item.display_name || `${mLat.toFixed(3)}° N, ${mLon.toFixed(3)}° E`,
        isFavourite: isFav,
        isPrimary: isPrim,
        jamaatTimes: getMosqueJamaatTimes(String(item.osm_id)),
      });
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Live online search across Photon + Nominatim + Local Mosques (for "Aqsa", "Chhapi", "Jumma", etc.).
 * Strictly capped to <= 50 km.
 */
export async function searchMosquesOnline(
  query: string,
  lat: number,
  lon: number
): Promise<MosqueItem[]> {
  const cleanQ = query.trim();
  if (cleanQ.length < 2) {
    return fetchNearbyMosques(lat, lon);
  }

  // 1. Local custom matching (always included)
  const custom = getCustomMosques().map((m) => {
    const dist = calculateHaversineDistanceMeters(lat, lon, m.latitude, m.longitude);
    return {
      ...m,
      distanceMeters: dist,
      distanceFormatted: formatDistance(dist),
      walkingEstimate: formatWalkingEstimate(dist),
      drivingEstimate: formatDrivingEstimate(dist),
    };
  }).filter((m) => m.name.toLowerCase().includes(cleanQ.toLowerCase()) || m.address.toLowerCase().includes(cleanQ.toLowerCase()));

  // 2. Parallel Online Queries: Photon + Bounded Nominatim
  const [q1, q2, nom] = await Promise.allSettled([
    fetchPhotonMosques(lat, lon, `${cleanQ} masjid`, 25),
    fetchPhotonMosques(lat, lon, cleanQ, 25),
    fetchNominatimMosques(lat, lon, cleanQ, 10),
  ]);

  const pool: MosqueItem[] = [...custom];
  if (q1.status === 'fulfilled') pool.push(...q1.value);
  if (q2.status === 'fulfilled') pool.push(...q2.value);
  if (nom.status === 'fulfilled') pool.push(...nom.value);

  // 3. Strict 50 km cap across all online results
  const capped = pool.filter((m) => m.isCustom || m.distanceMeters <= 50000);

  // Return deduplicated results sorted by proximity
  return deduplicateAndSort(capped);
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
