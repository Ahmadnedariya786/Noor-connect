export const LOCATION_STORAGE_KEY = 'location-storage';

export const FALLBACK_LOCATIONS = {
  'Asia/Kolkata': { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  'Asia/Calcutta': { name: 'New Delhi', lat: 28.6139, lon: 77.2090 },
  'Asia/Karachi': { name: 'Karachi', lat: 24.8607, lon: 67.0011 },
  'Asia/Dhaka': { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
  'Asia/Jakarta': { name: 'Jakarta', lat: -6.2088, lon: 106.8456 },
  'Asia/Makassar': { name: 'Makassar', lat: -5.1429, lon: 119.4126 },
  'Asia/Jayapura': { name: 'Jayapura', lat: -2.5337, lon: 140.7031 },
  'Asia/Istanbul': { name: 'Istanbul', lat: 41.0082, lon: 28.9784 },
  'Asia/Riyadh': { name: 'Riyadh', lat: 24.7136, lon: 46.6753 },
  'Asia/Cairo': { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
  'Asia/Dubai': { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  'Asia/Tehran': { name: 'Tehran', lat: 35.6892, lon: 51.389 },
  'Europe/London': { name: 'London', lat: 51.5074, lon: -0.1278 },
  'America/New_York': { name: 'New York', lat: 40.7128, lon: -74.006 },
  'America/Los_Angeles': { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  'Australia/Sydney': { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
} as const;

const DEFAULT_FALLBACK_LOCATION = { name: 'Mecca', lat: 21.3891, lon: 39.8579 } as const;

export function getFallbackLocationByTimezone(timezone: string) {
  return FALLBACK_LOCATIONS[timezone as keyof typeof FALLBACK_LOCATIONS] ?? DEFAULT_FALLBACK_LOCATION;
}
