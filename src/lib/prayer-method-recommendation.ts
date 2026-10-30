/**
 * Worldwide Regional Prayer Calculation Method Auto-Recommendation Engine
 *
 * Automatically recommends and applies the recognized regional Islamic authority
 * calculation parameters based on ISO 3166-1 alpha-2 country codes.
 */

export interface PrayerMethodInfo {
  id: number;
  name: string;
  fajrAngle?: number;
  ishaAngle?: number;
}

export function getRecommendedPrayerMethod(countryCode?: string): PrayerMethodInfo {
  const code = (countryCode || '').toUpperCase().trim();

  switch (code) {
    // South Asia: Karachi (Method 1) - Fajr 18°, Isha 18°
    case 'IN': // India
    case 'PK': // Pakistan
    case 'BD': // Bangladesh
    case 'AF': // Afghanistan
    case 'LK': // Sri Lanka
    case 'NP': // Nepal
    case 'MV': // Maldives
      return { id: 1, name: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 };

    // Arabian Peninsula / Gulf: Umm al-Qura Makkah (Method 4) - Fajr 18.5°, Isha 90min
    case 'SA': // Saudi Arabia
    case 'AE': // United Arab Emirates
    case 'QA': // Qatar
    case 'KW': // Kuwait
    case 'BH': // Bahrain
    case 'OM': // Oman
    case 'YE': // Yemen
      return { id: 4, name: 'Umm Al-Qura University, Makkah', fajrAngle: 18.5 };

    // North America: ISNA (Method 2) - Fajr 15°, Isha 15°
    case 'US': // United States
    case 'CA': // Canada
      return { id: 2, name: 'Islamic Society of North America (ISNA)', fajrAngle: 15, ishaAngle: 15 };

    // North & East Africa / Levant: Egyptian General Authority (Method 5) - Fajr 19.5°, Isha 17.5°
    case 'EG': // Egypt
    case 'SD': // Sudan
    case 'LY': // Libya
    case 'DZ': // Algeria
    case 'TN': // Tunisia
    case 'MA': // Morocco
    case 'SY': // Syria
    case 'JO': // Jordan
    case 'LB': // Lebanon
    case 'PS': // Palestine
    case 'IQ': // Iraq
    case 'SO': // Somalia
      return { id: 5, name: 'Egyptian General Authority of Survey', fajrAngle: 19.5, ishaAngle: 17.5 };

    // Turkey: Diyanet (Method 13) - Fajr 18°, Isha 17°
    case 'TR': // Turkey
    case 'AZ': // Azerbaijan
      return { id: 13, name: 'Diyanet İşleri Başkanlığı, Turkey', fajrAngle: 18, ishaAngle: 17 };

    // Global / Europe / UK / Australia / Southeast Asia: Muslim World League (Method 3)
    default:
      return { id: 3, name: 'Muslim World League (MWL)', fajrAngle: 18, ishaAngle: 17 };
  }
}
