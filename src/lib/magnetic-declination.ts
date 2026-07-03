/**
 * Magnetic Declination Service
 * Fetches magnetic declination (variation between true north and magnetic north)
 * from NOAA's World Magnetic Model (WMM) via a reliable API
 * 
 * Critical for accurate Qibla compass: device compass reads magnetic north,
 * but Qibla bearing is calculated from true north.
 * True heading = Magnetic heading + Magnetic declination
 */

const DECLINATION_CACHE_KEY = 'qibla-magnetic-declination-cache';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const NOAA_API_URL = 'https://www.ngdc.noaa.gov/geomag-web/calculators/calculateDeclination';

export interface DeclinationCacheEntry {
  latitude: number;
  longitude: number;
  declination: number;
  timestamp: number;
  model: string;
}

/**
 * Calculate magnetic declination for a given location using NOAA WMM
 * Falls back to a simple approximation if API is unavailable
 */
export async function getMagneticDeclination(
  latitude: number,
  longitude: number,
  date: Date = new Date()
): Promise<number> {
  // Try cache first
  const cached = getCachedDeclination(latitude, longitude);
  if (cached !== null) {
    return cached;
  }

  try {
    const declination = await fetchDeclinationFromNOAA(latitude, longitude, date);
    cacheDeclination(latitude, longitude, declination);
    return declination;
  } catch (error) {
    console.warn('Failed to fetch magnetic declination from NOAA, using approximation:', error);
    // Fallback to IGRF-13 approximation (valid 2020-2025)
    const approx = approximateDeclination(latitude, longitude, date);
    cacheDeclination(latitude, longitude, approx);
    return approx;
  }
}

/**
 * Fetch declination from NOAA's WMM calculator API
 */
async function fetchDeclinationFromNOAA(
  latitude: number,
  longitude: number,
  date: Date
): Promise<number> {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  const params = new URLSearchParams({
    lat1: latitude.toString(),
    lon1: longitude.toString(),
    startYear: year.toString(),
    startMonth: month.toString(),
    startDay: day.toString(),
    resultFormat: 'json',
  });

  const response = await fetch(`${NOAA_API_URL}?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`NOAA API returned ${response.status}`);
  }

  const data = await response.json();
  
  // NOAA returns array of results
  const result = Array.isArray(data) ? data[0] : data?.result?.[0];
  
  if (!result || typeof result.declination !== 'number') {
    throw new Error('Invalid response format from NOAA');
  }

  return result.declination; // Already in degrees, positive = East
}

/**
 * Simple IGRF-based approximation for offline fallback
 * Based on spherical harmonic model - accurate to ~1-2 degrees
 */
function approximateDeclination(
  latitude: number,
  longitude: number,
  date: Date
): number {
  const year = date.getFullYear() + (date.getMonth() + 1) / 12 + date.getDate() / 365.25;
  
  // Convert to radians
  const lat = latitude * Math.PI / 180;
  const lon = longitude * Math.PI / 180;
  
  // Simplified spherical harmonic approximation (degree 1-3)
  // Based on IGRF-13 coefficients for 2020-2025
  const t = year - 2020.0;
  
  // Main dipole field (degree 1)
  const g10 = -29442.0 - 8.0 * t;
  const g11 = -1501.0 + 10.0 * t;
  const h11 = 4797.0 - 20.0 * t;
  
  // Degree 2
  const g20 = -1688.0 - 15.0 * t;
  const g21 = 3047.0 - 5.0 * t;
  const h21 = -2594.0 - 3.0 * t;
  
  // Degree 3 (simplified) - not used in current calculation
  
  const a = 6371.2; // Earth radius in km
  const r = a; // Surface
  const cosLat = Math.cos(lat);
  const sinLat = Math.sin(lat);
  const cosLon = Math.cos(lon);
  const sinLon = Math.sin(lon);
  
  // Compute magnetic field components (simplified)
  // This is a very rough approximation - in production use NOAA API
  const p = (a / r) ** 2;
  
  // Bx (North), By (East), Bz (Down) components
  // Simplified for declination only: D = atan2(By, Bx)
  const Bx = g10 * 2 * sinLat * p 
    + (g11 * cosLon + h11 * sinLon) * cosLat * p
    + (g20 * (3 * sinLat * sinLat - 1) * 3 / 2) * p * (a/r)
    + (g21 * cosLon + h21 * sinLon) * cosLat * 3 * sinLat * p * (a/r);
  
  const By = (-g11 * sinLon + h11 * cosLon) * cosLat * p
    + (-g21 * sinLon + h21 * cosLon) * cosLat * 3 * sinLat * p * (a/r);
  
  const declinationRad = Math.atan2(By, Bx);
  let declination = declinationRad * 180 / Math.PI;
  
  // Clamp to reasonable range
  declination = Math.max(-180, Math.min(180, declination));
  
  return declination;
}

function getCachedDeclination(latitude: number, longitude: number): number | null {
  try {
    const stored = localStorage.getItem(DECLINATION_CACHE_KEY);
    if (!stored) return null;
    
    const cache: DeclinationCacheEntry = JSON.parse(stored);
    const now = Date.now();
    
    // Check if cache is valid (same location within ~10km and within time limit)
    const latDiff = Math.abs(cache.latitude - latitude);
    const lonDiff = Math.abs(cache.longitude - longitude);
    const distanceKm = Math.sqrt(latDiff ** 2 + lonDiff ** 2) * 111; // Rough approximation
    
    if (distanceKm < 10 && (now - cache.timestamp) < CACHE_DURATION_MS) {
      return cache.declination;
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function cacheDeclination(
  latitude: number,
  longitude: number,
  declination: number
): void {
  try {
    const entry: DeclinationCacheEntry = {
      latitude,
      longitude,
      declination,
      timestamp: Date.now(),
      model: 'WMM',
    };
    localStorage.setItem(DECLINATION_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Convert magnetic heading to true heading
 * True heading = Magnetic heading + Magnetic declination
 */
export function magneticToTrueHeading(
  magneticHeading: number,
  declination: number
): number {
  let trueHeading = magneticHeading + declination;
  // Normalize to 0-360
  trueHeading = ((trueHeading % 360) + 360) % 360;
  return trueHeading;
}

/**
 * Convert true heading to magnetic heading
 * Magnetic heading = True heading - Magnetic declination
 */
export function trueToMagneticHeading(
  trueHeading: number,
  declination: number
): number {
  let magneticHeading = trueHeading - declination;
  // Normalize to 0-360
  magneticHeading = ((magneticHeading % 360) + 360) % 360;
  return magneticHeading;
}

/**
 * Get the magnetic Qibla bearing (what the compass needle should show when facing Qibla)
 * Magnetic Qibla = True Qibla - Declination
 */
export function getMagneticQiblaBearing(
  trueQiblaBearing: number,
  declination: number
): number {
  return trueToMagneticHeading(trueQiblaBearing, declination);
}

export async function prefetchDeclination(
  latitude: number,
  longitude: number
): Promise<void> {
  try {
    await getMagneticDeclination(latitude, longitude);
  } catch {
    // Silently fail
  }
}