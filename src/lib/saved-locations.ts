/**
 * Saved Locations Service
 * Allows users to bookmark favorite cities/towns and switch between them in 1 tap
 */

export interface SavedLocation {
  id: string;
  name: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  isCustom?: boolean;
}

const STORAGE_KEY = 'noor_saved_locations';
export const SAVED_LOCATIONS_CHANGED_EVENT = 'noor-saved-locations-changed';

export const DEFAULT_SAVED_LOCATIONS: SavedLocation[] = [
  {
    id: 'makkah',
    name: 'Makkah, Saudi Arabia',
    city: 'Makkah',
    country: 'Saudi Arabia',
    latitude: 21.4225,
    longitude: 39.8262,
    timezone: 'Asia/Riyadh',
  },
  {
    id: 'madinah',
    name: 'Madinah, Saudi Arabia',
    city: 'Madinah',
    country: 'Saudi Arabia',
    latitude: 24.4672,
    longitude: 39.6111,
    timezone: 'Asia/Riyadh',
  },
  {
    id: 'al-quds',
    name: 'Al-Quds (Jerusalem), Palestine',
    city: 'Jerusalem',
    country: 'Palestine',
    latitude: 31.7767,
    longitude: 35.2345,
    timezone: 'Asia/Jerusalem',
  },
];

export function getSavedLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [...DEFAULT_SAVED_LOCATIONS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [...DEFAULT_SAVED_LOCATIONS];
  } catch (error) {
    // Return defaults on parse error
    return [...DEFAULT_SAVED_LOCATIONS];
  }
}

export function saveLocationToFavorites(loc: Omit<SavedLocation, 'id'> & { id?: string }): SavedLocation {
  try {
    const existing = getSavedLocations();
    // Check if duplicate by coords
    const foundIndex = existing.findIndex(
      item => Math.abs(item.latitude - loc.latitude) < 0.01 && Math.abs(item.longitude - loc.longitude) < 0.01
    );

    const newLoc: SavedLocation = {
      ...loc,
      id: loc.id || `loc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isCustom: true,
    };

    let updated: SavedLocation[];
    if (foundIndex >= 0) {
      updated = [...existing];
      updated[foundIndex] = newLoc;
    } else {
      updated = [newLoc, ...existing];
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SAVED_LOCATIONS_CHANGED_EVENT, { detail: updated }));
    }
    return newLoc;
  } catch (error) {
    // Ignore storage errors safely
    return { ...loc, id: loc.id || `loc_${Date.now()}` };
  }
}

export function removeSavedLocation(id: string): void {
  try {
    const existing = getSavedLocations();
    const updated = existing.filter(loc => loc.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SAVED_LOCATIONS_CHANGED_EVENT, { detail: updated }));
    }
  } catch (error) {
    // Ignore storage errors safely
  }
}

export function isLocationFavorited(lat: number, lng: number): boolean {
  const existing = getSavedLocations();
  return existing.some(
    item => Math.abs(item.latitude - lat) < 0.01 && Math.abs(item.longitude - lng) < 0.01
  );
}
