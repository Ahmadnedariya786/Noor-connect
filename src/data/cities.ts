/**
 * Offline Cities Database for Noor Connect
 * Comprehensive dataset containing major Indian cities and global popular cities
 * Provides instant, zero-network coordinate resolution, prayer calculation methods, and timezone matching.
 */

export interface CityData {
  city: string;
  name: string; // for OSM/Photon compatibility
  country: string;
  state?: string;
  lat: number;
  latitude: number; // alias for compatibility
  lon: number;
  longitude: number; // alias for compatibility
  timezone: string;
  calculationMethod: string;
  aliases?: string[];
  isPopular?: boolean;
  region: 'india' | 'global';
}

export const INDIAN_CITIES: CityData[] = [
  // Top 10 Popular Indian Cities (Anchors)
  {
    city: "New Delhi",
    name: "New Delhi",
    country: "India",
    state: "Delhi",
    lat: 28.6139,
    latitude: 28.6139,
    lon: 77.2090,
    longitude: 77.2090,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Delhi", "NCR", "Old Delhi"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Mumbai",
    name: "Mumbai",
    country: "India",
    state: "Maharashtra",
    lat: 19.0760,
    latitude: 19.0760,
    lon: 72.8777,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Bombay"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Bengaluru",
    name: "Bengaluru",
    country: "India",
    state: "Karnataka",
    lat: 12.9716,
    latitude: 12.9716,
    lon: 77.5946,
    longitude: 77.5946,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Bangalore"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Hyderabad",
    name: "Hyderabad",
    country: "India",
    state: "Telangana",
    lat: 17.3850,
    latitude: 17.3850,
    lon: 78.4867,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Secunderabad"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Ahmedabad",
    name: "Ahmedabad",
    country: "India",
    state: "Gujarat",
    lat: 23.0225,
    latitude: 23.0225,
    lon: 72.5714,
    longitude: 72.5714,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Amdavad"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Chennai",
    name: "Chennai",
    country: "India",
    state: "Tamil Nadu",
    lat: 13.0827,
    latitude: 13.0827,
    lon: 80.2707,
    longitude: 80.2707,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Madras"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Kolkata",
    name: "Kolkata",
    country: "India",
    state: "West Bengal",
    lat: 22.5726,
    latitude: 22.5726,
    lon: 88.3639,
    longitude: 88.3639,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Calcutta"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Lucknow",
    name: "Lucknow",
    country: "India",
    state: "Uttar Pradesh",
    lat: 26.8467,
    latitude: 26.8467,
    lon: 80.9462,
    longitude: 80.9462,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Lakhnau", "Awadh"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Jaipur",
    name: "Jaipur",
    country: "India",
    state: "Rajasthan",
    lat: 26.9124,
    latitude: 26.9124,
    lon: 75.7873,
    longitude: 75.7873,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Pink City"],
    isPopular: true,
    region: "india"
  },
  {
    city: "Surat",
    name: "Surat",
    country: "India",
    state: "Gujarat",
    lat: 21.1702,
    latitude: 21.1702,
    lon: 72.8311,
    longitude: 72.8311,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    isPopular: true,
    region: "india"
  },
  // Additional Curated Major Indian Cities (Verified Coordinates)
  {
    city: "Kanpur",
    name: "Kanpur",
    country: "India",
    state: "Uttar Pradesh",
    lat: 26.4499,
    latitude: 26.4499,
    lon: 80.3319,
    longitude: 80.3319,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Cawnpore"],
    region: "india"
  },
  {
    city: "Nagpur",
    name: "Nagpur",
    country: "India",
    state: "Maharashtra",
    lat: 21.1458,
    latitude: 21.1458,
    lon: 79.0882,
    longitude: 79.0882,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Indore",
    name: "Indore",
    country: "India",
    state: "Madhya Pradesh",
    lat: 22.7196,
    latitude: 22.7196,
    lon: 75.8577,
    longitude: 75.8577,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Thane",
    name: "Thane",
    country: "India",
    state: "Maharashtra",
    lat: 19.2183,
    latitude: 19.2183,
    lon: 72.9781,
    longitude: 72.9781,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Bhopal",
    name: "Bhopal",
    country: "India",
    state: "Madhya Pradesh",
    lat: 23.2599,
    latitude: 23.2599,
    lon: 77.4126,
    longitude: 77.4126,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Patna",
    name: "Patna",
    country: "India",
    state: "Bihar",
    lat: 25.5941,
    latitude: 25.5941,
    lon: 85.1376,
    longitude: 85.1376,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Pataliputra"],
    region: "india"
  },
  {
    city: "Vadodara",
    name: "Vadodara",
    country: "India",
    state: "Gujarat",
    lat: 22.3072,
    latitude: 22.3072,
    lon: 73.1812,
    longitude: 73.1812,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Baroda"],
    region: "india"
  },
  {
    city: "Ghaziabad",
    name: "Ghaziabad",
    country: "India",
    state: "Uttar Pradesh",
    lat: 28.6692,
    latitude: 28.6692,
    lon: 77.4538,
    longitude: 77.4538,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Agra",
    name: "Agra",
    country: "India",
    state: "Uttar Pradesh",
    lat: 27.1767,
    latitude: 27.1767,
    lon: 78.0081,
    longitude: 78.0081,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Nashik",
    name: "Nashik",
    country: "India",
    state: "Maharashtra",
    lat: 19.9975,
    latitude: 19.9975,
    lon: 73.7898,
    longitude: 73.7898,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Nasik"],
    region: "india"
  },
  {
    city: "Faridabad",
    name: "Faridabad",
    country: "India",
    state: "Haryana",
    lat: 28.4089,
    latitude: 28.4089,
    lon: 77.3178,
    longitude: 77.3178,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Meerut",
    name: "Meerut",
    country: "India",
    state: "Uttar Pradesh",
    lat: 28.9845,
    latitude: 28.9845,
    lon: 77.7064,
    longitude: 77.7064,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Rajkot",
    name: "Rajkot",
    country: "India",
    state: "Gujarat",
    lat: 22.3039,
    latitude: 22.3039,
    lon: 70.8022,
    longitude: 70.8022,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Prayagraj",
    name: "Prayagraj",
    country: "India",
    state: "Uttar Pradesh",
    lat: 25.4358,
    latitude: 25.4358,
    lon: 81.8463,
    longitude: 81.8463,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Allahabad", "Ilahabad"],
    region: "india"
  },
  {
    city: "Varanasi",
    name: "Varanasi",
    country: "India",
    state: "Uttar Pradesh",
    lat: 25.3176,
    latitude: 25.3176,
    lon: 82.9739,
    longitude: 82.9739,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Banaras", "Benares", "Kashi"],
    region: "india"
  },
  {
    city: "Srinagar",
    name: "Srinagar",
    country: "India",
    state: "Jammu and Kashmir",
    lat: 34.0837,
    latitude: 34.0837,
    lon: 74.7973,
    longitude: 74.7973,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Amritsar",
    name: "Amritsar",
    country: "India",
    state: "Punjab",
    lat: 31.6340,
    latitude: 31.6340,
    lon: 74.8723,
    longitude: 74.8723,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Visakhapatnam",
    name: "Visakhapatnam",
    country: "India",
    state: "Andhra Pradesh",
    lat: 17.6868,
    latitude: 17.6868,
    lon: 83.2185,
    longitude: 83.2185,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Vizag"],
    region: "india"
  },
  {
    city: "Coimbatore",
    name: "Coimbatore",
    country: "India",
    state: "Tamil Nadu",
    lat: 11.0168,
    latitude: 11.0168,
    lon: 76.9558,
    longitude: 76.9558,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Kovai"],
    region: "india"
  },
  {
    city: "Aurangabad",
    name: "Aurangabad",
    country: "India",
    state: "Maharashtra",
    lat: 19.8762,
    latitude: 19.8762,
    lon: 75.3433,
    longitude: 75.3433,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Chhatrapati Sambhajinagar", "Sambhajinagar"],
    region: "india"
  },
  {
    city: "Pune",
    name: "Pune",
    country: "India",
    state: "Maharashtra",
    lat: 18.5204,
    latitude: 18.5204,
    lon: 73.8567,
    longitude: 73.8567,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Poona"],
    region: "india"
  },
  {
    city: "Kozhikode",
    name: "Kozhikode",
    country: "India",
    state: "Kerala",
    lat: 11.2588,
    latitude: 11.2588,
    lon: 75.7804,
    longitude: 75.7804,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: ["Calicut"],
    region: "india"
  },
  {
    city: "Aligarh",
    name: "Aligarh",
    country: "India",
    state: "Uttar Pradesh",
    lat: 27.8974,
    latitude: 27.8974,
    lon: 78.0880,
    longitude: 78.0880,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Bareilly",
    name: "Bareilly",
    country: "India",
    state: "Uttar Pradesh",
    lat: 28.3670,
    latitude: 28.3670,
    lon: 79.4304,
    longitude: 79.4304,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  },
  {
    city: "Chandigarh",
    name: "Chandigarh",
    country: "India",
    state: "Chandigarh",
    lat: 30.7333,
    latitude: 30.7333,
    lon: 76.7794,
    longitude: 76.7794,
    timezone: "Asia/Kolkata",
    calculationMethod: "Karachi",
    aliases: [],
    region: "india"
  }
];

export const GLOBAL_CITIES: CityData[] = [
  {
    city: "Mecca",
    name: "Mecca",
    country: "Saudi Arabia",
    state: "Mecca Region",
    lat: 21.3891,
    latitude: 21.3891,
    lon: 39.8579,
    longitude: 39.8579,
    timezone: "Asia/Riyadh",
    calculationMethod: "UmmAlQura",
    aliases: ["Makkah"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Medina",
    name: "Medina",
    country: "Saudi Arabia",
    state: "Medina Region",
    lat: 24.4686,
    latitude: 24.4686,
    lon: 39.6119,
    longitude: 39.6119,
    timezone: "Asia/Riyadh",
    calculationMethod: "UmmAlQura",
    aliases: ["Madinah"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Karachi",
    name: "Karachi",
    country: "Pakistan",
    state: "Sindh",
    lat: 24.8607,
    latitude: 24.8607,
    lon: 67.0011,
    longitude: 67.0011,
    timezone: "Asia/Karachi",
    calculationMethod: "Karachi",
    aliases: [],
    isPopular: true,
    region: "global"
  },
  {
    city: "Lahore",
    name: "Lahore",
    country: "Pakistan",
    state: "Punjab",
    lat: 31.5204,
    latitude: 31.5204,
    lon: 74.3587,
    longitude: 74.3587,
    timezone: "Asia/Karachi",
    calculationMethod: "Karachi",
    aliases: [],
    isPopular: true,
    region: "global"
  },
  {
    city: "Cairo",
    name: "Cairo",
    country: "Egypt",
    state: "Cairo Governorate",
    lat: 30.0444,
    latitude: 30.0444,
    lon: 31.2357,
    longitude: 31.2357,
    timezone: "Africa/Cairo",
    calculationMethod: "Egyptian",
    aliases: ["Al-Qahira"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Istanbul",
    name: "Istanbul",
    country: "Turkey",
    state: "Istanbul",
    lat: 41.0082,
    latitude: 41.0082,
    lon: 28.9784,
    longitude: 28.9784,
    timezone: "Europe/Istanbul",
    calculationMethod: "Turkey",
    aliases: ["Constantinople"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Jakarta",
    name: "Jakarta",
    country: "Indonesia",
    state: "Jakarta",
    lat: -6.2088,
    latitude: -6.2088,
    lon: 106.8456,
    longitude: 106.8456,
    timezone: "Asia/Jakarta",
    calculationMethod: "MuslimWorldLeague",
    aliases: [],
    isPopular: true,
    region: "global"
  },
  {
    city: "Dubai",
    name: "Dubai",
    country: "United Arab Emirates",
    state: "Dubai",
    lat: 25.2048,
    latitude: 25.2048,
    lon: 55.2708,
    longitude: 55.2708,
    timezone: "Asia/Dubai",
    calculationMethod: "Dubai",
    aliases: ["UAE"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Riyadh",
    name: "Riyadh",
    country: "Saudi Arabia",
    state: "Riyadh Province",
    lat: 24.7136,
    latitude: 24.7136,
    lon: 46.6753,
    longitude: 46.6753,
    timezone: "Asia/Riyadh",
    calculationMethod: "UmmAlQura",
    aliases: [],
    isPopular: true,
    region: "global"
  },
  {
    city: "London",
    name: "London",
    country: "United Kingdom",
    state: "England",
    lat: 51.5074,
    latitude: 51.5074,
    lon: -0.1278,
    longitude: -0.1278,
    timezone: "Europe/London",
    calculationMethod: "MuslimWorldLeague",
    aliases: ["UK"],
    isPopular: true,
    region: "global"
  },
  {
    city: "New York",
    name: "New York",
    country: "United States",
    state: "New York",
    lat: 40.7128,
    latitude: 40.7128,
    lon: -74.0060,
    longitude: -74.0060,
    timezone: "America/New_York",
    calculationMethod: "NorthAmerica",
    aliases: ["NYC", "New York City"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Los Angeles",
    name: "Los Angeles",
    country: "United States",
    state: "California",
    lat: 34.0522,
    latitude: 34.0522,
    lon: -118.2437,
    longitude: -118.2437,
    timezone: "America/Los_Angeles",
    calculationMethod: "NorthAmerica",
    aliases: ["LA"],
    isPopular: true,
    region: "global"
  },
  {
    city: "Jerusalem",
    name: "Jerusalem",
    country: "Palestine",
    state: "Jerusalem",
    lat: 31.7683,
    latitude: 31.7683,
    lon: 35.2137,
    longitude: 35.2137,
    timezone: "Asia/Jerusalem",
    calculationMethod: "MuslimWorldLeague",
    aliases: ["Al-Quds"],
    isPopular: false,
    region: "global"
  },
  {
    city: "Dhaka",
    name: "Dhaka",
    country: "Bangladesh",
    state: "Dhaka Division",
    lat: 23.8103,
    latitude: 23.8103,
    lon: 90.4125,
    longitude: 90.4125,
    timezone: "Asia/Dhaka",
    calculationMethod: "Karachi",
    aliases: ["Dacca"],
    isPopular: false,
    region: "global"
  },
  {
    city: "Tehran",
    name: "Tehran",
    country: "Iran",
    state: "Tehran",
    lat: 35.6892,
    latitude: 35.6892,
    lon: 51.3890,
    longitude: 51.3890,
    timezone: "Asia/Tehran",
    calculationMethod: "Tehran",
    aliases: [],
    isPopular: false,
    region: "global"
  }
];

export const ALL_OFFLINE_CITIES: CityData[] = [
  ...INDIAN_CITIES,
  ...GLOBAL_CITIES
];

// Top Indian popular cities for quick chips
export const POPULAR_INDIAN_CITIES = INDIAN_CITIES.filter(c => c.isPopular).map(c => ({
  city: c.city,
  country: c.country
}));

// Original global cities preserved exactly
export const POPULAR_GLOBAL_CITIES = [
  { city: "Mecca", country: "Saudi Arabia" },
  { city: "Medina", country: "Saudi Arabia" },
  { city: "Karachi", country: "Pakistan" },
  { city: "Lahore", country: "Pakistan" },
  { city: "Cairo", country: "Egypt" },
  { city: "Istanbul", country: "Turkey" },
  { city: "Jakarta", country: "Indonesia" },
  { city: "Dubai", country: "United Arab Emirates" },
  { city: "Riyadh", country: "Saudi Arabia" },
  { city: "London", country: "United Kingdom" },
  { city: "New York", country: "United States" },
  { city: "Los Angeles", country: "United States" }
];

// Complete list of popular cities
export const POPULAR_CITIES = [
  ...POPULAR_INDIAN_CITIES,
  ...POPULAR_GLOBAL_CITIES
];

/**
 * Fast offline fuzzy search for cities
 */
export function searchOfflineCities(query: string, limit: number = 10): CityData[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  // Scored matching
  const scored = ALL_OFFLINE_CITIES.map(city => {
    let score = 0;
    const cityNameLower = city.city.toLowerCase();
    const stateLower = (city.state || "").toLowerCase();
    const countryLower = city.country.toLowerCase();
    const aliases = (city.aliases || []).map(a => a.toLowerCase());

    if (cityNameLower === q) score += 100;
    else if (cityNameLower.startsWith(q)) score += 50;
    else if (cityNameLower.includes(q)) score += 25;

    // Check aliases
    for (const alias of aliases) {
      if (alias === q) score += 90;
      else if (alias.startsWith(q)) score += 45;
      else if (alias.includes(q)) score += 20;
    }

    // Check state / country
    if (stateLower.startsWith(q)) score += 15;
    else if (stateLower.includes(q)) score += 10;

    if (countryLower.startsWith(q)) score += 10;
    else if (countryLower.includes(q)) score += 5;

    if (city.isPopular) score += 5;

    return { city, score };
  })
  .filter(item => item.score > 0)
  .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(item => item.city);
}

/**
 * Get offline coordinates for a city and country
 */
export function getOfflineCityCoordinates(city: string, country?: string): CityData | null {
  const cLower = city.trim().toLowerCase();
  const cntryLower = country ? country.trim().toLowerCase() : "";

  // 1. Exact match on city + country
  if (cntryLower) {
    const exact = ALL_OFFLINE_CITIES.find(c =>
      (c.city.toLowerCase() === cLower || (c.aliases || []).some(a => a.toLowerCase() === cLower)) &&
      c.country.toLowerCase().includes(cntryLower)
    );
    if (exact) return exact;
  }

  // 2. Exact match on city or alias
  const cityMatch = ALL_OFFLINE_CITIES.find(c =>
    c.city.toLowerCase() === cLower || (c.aliases || []).some(a => a.toLowerCase() === cLower)
  );
  if (cityMatch) return cityMatch;

  // 3. Prefix match
  const prefixMatch = ALL_OFFLINE_CITIES.find(c =>
    c.city.toLowerCase().startsWith(cLower) || (c.aliases || []).some(a => a.toLowerCase().startsWith(cLower))
  );
  if (prefixMatch) return prefixMatch;

  // 4. Substring match
  const substringMatch = ALL_OFFLINE_CITIES.find(c =>
    c.city.toLowerCase().includes(cLower) || (c.aliases || []).some(a => a.toLowerCase().includes(cLower))
  );
  if (substringMatch) return substringMatch;

  return null;
}

/**
 * Calculate great-circle distance between two points on Earth using Haversine formula
 * @returns distance in kilometers
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const lat1Rad = lat1 * toRad;
  const lat2Rad = lat2 * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find closest city in offline database by coordinates using Haversine distance
 */
export function findNearestOfflineCity(latitude: number, longitude: number): CityData | null {
  if (!ALL_OFFLINE_CITIES || ALL_OFFLINE_CITIES.length === 0) return null;
  let closest: CityData | null = null;
  let minDistance = Infinity;

  for (const city of ALL_OFFLINE_CITIES) {
    const dist = haversineDistanceKm(latitude, longitude, city.lat, city.lon);
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }

  return closest;
}

