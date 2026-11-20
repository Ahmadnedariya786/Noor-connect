/**
 * Pinpoint Regional Prayer Time Engine & Schedule Calculator
 * Noor Connect — Privacy-First Islamic Companion
 *
 * Implements:
 * 1. Smart Country Regional Auto-Preset (Karachi 18°/18° + Hanafi Asr + Zawaal Dhuhr + India Hilal -1d)
 * 2. Optional Maghrib +3m Ihtiyat toggle
 * 3. Exact Start -> End (Qaza) times for all 5 Fard prayers
 * 4. Sunnah & Fasting times (Khatm Sehri, Ishraq, Chasht, Zawaal, Sunset, Iftaar, Tahajjud, Midnight)
 * 5. Static 3-Window Makruh Schedule (synchronized with existing live Makruh engine)
 */

import { Coordinates, CalculationMethod, PrayerTimes, CalculationParameters, Madhab, Rounding, HighLatitudeRule } from 'adhan';
import { getMadhab, setMadhab, type MadhabType } from './storage';
import {
  type CalculationMethodName,
  getCalculationMethod,
  setCalculationMethod,
  CALCULATION_METHOD_LABELS
} from './prayer-calculator';

export {
  type CalculationMethodName,
  getCalculationMethod,
  setCalculationMethod,
  CALCULATION_METHOD_LABELS
};
import { prayerMethods, type PrayerMethod } from './prayer-methods';
import { getPrayerMinuteOffsets, applyOffsetToDate, type PrayerMinuteOffsets } from './prayer-offsets';

export interface RegionalPrayerPreset {
  id: string;
  regionLabel: string;
  countrySummary: string;
  method: CalculationMethodName;
  methodId: number; // for Aladhan API / prayerMethods
  methodName: string;
  madhab: MadhabType;
  dhuhrZawaalSafetyMin: number;
  maghribIhtiyatMin: number;
  hijriOffset: number;
  fajrAngle: number;
  ishaAngle: number;
  summary: string;
}

export const REGIONAL_PRESETS: Record<string, RegionalPrayerPreset> = {
  south_asia: {
    id: 'south_asia',
    regionLabel: 'South Asia (India, Pakistan, Bangladesh, AF, LK, NP)',
    countrySummary: 'India / Pakistan / Bangladesh / Afghanistan / Nepal / Sri Lanka',
    method: 'Karachi',
    methodId: 1, // 1 in Aladhan API, 5 in local prayerMethods
    methodName: 'University of Islamic Sciences, Karachi',
    madhab: 'hanafi',
    dhuhrZawaalSafetyMin: 5,
    maghribIhtiyatMin: 3,
    hijriOffset: -1,
    fajrAngle: 18,
    ishaAngle: 18,
    summary: 'Karachi (18°/18°) • Hanafi • Dhuhr +5m • Maghrib +3m • -1d Hijri',
  },
  saudi_arabia: {
    id: 'saudi_arabia',
    regionLabel: 'Saudi Arabia & Yemen (Umm Al-Qura)',
    countrySummary: 'Saudi Arabia / Yemen',
    method: 'UmmAlQura',
    methodId: 4,
    methodName: 'Umm Al-Qura University, Makkah',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 18.5,
    ishaAngle: 0, // 90 min interval
    summary: 'Umm Al-Qura • Shafi\'i • 0d Hijri',
  },
  gulf_region: {
    id: 'gulf_region',
    regionLabel: 'Gulf Region (UAE, Kuwait, Qatar, Bahrain, Oman)',
    countrySummary: 'UAE / Kuwait / Qatar / Bahrain / Oman',
    method: 'Dubai',
    methodId: 8,
    methodName: 'Gulf Region / Dubai',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 18.5,
    ishaAngle: 18,
    summary: 'Gulf / Dubai • Shafi\'i • 0d Hijri',
  },
  north_america: {
    id: 'north_america',
    regionLabel: 'North America (ISNA)',
    countrySummary: 'USA / Canada',
    method: 'NorthAmerica',
    methodId: 2,
    methodName: 'Islamic Society of North America (ISNA)',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 15,
    ishaAngle: 15,
    summary: 'ISNA (15°/15°) • Shafi\'i • 0d Hijri',
  },
  europe_mwl: {
    id: 'europe_mwl',
    regionLabel: 'UK, Europe & Australia (MWL)',
    countrySummary: 'UK / Europe / Australia',
    method: 'MuslimWorldLeague',
    methodId: 3,
    methodName: 'Muslim World League (MWL)',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 18,
    ishaAngle: 17,
    summary: 'Muslim World League • Shafi\'i • 0d Hijri',
  },
  southeast_asia: {
    id: 'southeast_asia',
    regionLabel: 'Southeast Asia (Singapore / KEMENAG)',
    countrySummary: 'Indonesia / Malaysia / Singapore',
    method: 'Singapore',
    methodId: 11,
    methodName: 'Singapore / MUIS',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 20,
    ishaAngle: 18,
    summary: 'Singapore / KEMENAG • Shafi\'i • 0d Hijri',
  },
  egypt_north_africa: {
    id: 'egypt_north_africa',
    regionLabel: 'Egypt & North Africa (Egyptian Authority)',
    countrySummary: 'Egypt / North Africa',
    method: 'Egyptian',
    methodId: 5,
    methodName: 'Egyptian General Authority',
    madhab: 'shafi',
    dhuhrZawaalSafetyMin: 0,
    maghribIhtiyatMin: 0,
    hijriOffset: 0,
    fajrAngle: 19.5,
    ishaAngle: 17.5,
    summary: 'Egyptian Authority • Shafi\'i • 0d Hijri',
  },
};

/**
 * Determine regional prayer preset based on country code/name or GPS coordinates.
 */
export function getRegionalPrayerPreset(
  countryCodeOrName?: string,
  lat?: number,
  lng?: number
): RegionalPrayerPreset {
  const code = (countryCodeOrName || '').toUpperCase().trim();
  const nameLower = (countryCodeOrName || '').toLowerCase().trim();

  // 1. South Asia: India, Pakistan, Bangladesh, Afghanistan, Sri Lanka, Nepal
  const isSouthAsiaCode = ['IN', 'PK', 'BD', 'AF', 'LK', 'NP', 'MV'].includes(code);
  const isSouthAsiaName = nameLower.includes('india') ||
    nameLower.includes('pakistan') ||
    nameLower.includes('bangladesh') ||
    nameLower.includes('afghanistan') ||
    nameLower.includes('sri lanka') ||
    nameLower.includes('nepal');
  const isSouthAsiaCoords = typeof lat === 'number' && typeof lng === 'number' &&
    lat >= 6 && lat <= 38 && lng >= 60 && lng <= 98;

  if (isSouthAsiaCode || isSouthAsiaName || isSouthAsiaCoords) {
    return REGIONAL_PRESETS.south_asia;
  }

  // 2. Saudi Arabia & Yemen
  const isSaudiCode = ['SA', 'YE'].includes(code);
  const isSaudiName = nameLower.includes('saudi') || nameLower.includes('makkah') || nameLower.includes('yemen');
  const isSaudiCoords = typeof lat === 'number' && typeof lng === 'number' &&
    lat >= 12 && lat <= 32 && lng >= 34 && lng <= 56;

  if (isSaudiCode || isSaudiName || isSaudiCoords) {
    return REGIONAL_PRESETS.saudi_arabia;
  }

  // 3. Gulf Region: UAE, Kuwait, Qatar, Bahrain, Oman
  const isGulfCode = ['AE', 'KW', 'QA', 'BH', 'OM'].includes(code);
  const isGulfName = nameLower.includes('emirates') ||
    nameLower.includes('dubai') ||
    nameLower.includes('kuwait') ||
    nameLower.includes('qatar') ||
    nameLower.includes('bahrain') ||
    nameLower.includes('oman');
  const isGulfCoords = typeof lat === 'number' && typeof lng === 'number' &&
    lat >= 22 && lat <= 30 && lng >= 46 && lng <= 60;

  if (isGulfCode || isGulfName || isGulfCoords) {
    return REGIONAL_PRESETS.gulf_region;
  }

  // 4. North America: USA, Canada
  const isNACode = ['US', 'CA'].includes(code);
  const isNAName = nameLower.includes('united states') || nameLower.includes('usa') || nameLower.includes('canada');
  const isNACoords = typeof lat === 'number' && typeof lng === 'number' &&
    lat >= 24 && lat <= 72 && lng >= -168 && lng <= -52;

  if (isNACode || isNAName || isNACoords) {
    return REGIONAL_PRESETS.north_america;
  }

  // 5. Southeast Asia: Indonesia, Malaysia, Singapore
  const isSEAsiaCode = ['ID', 'MY', 'SG'].includes(code);
  const isSEAsiaName = nameLower.includes('indonesia') || nameLower.includes('malaysia') || nameLower.includes('singapore');
  if (isSEAsiaCode || isSEAsiaName) {
    return REGIONAL_PRESETS.southeast_asia;
  }

  // 6. Egypt & North Africa
  const isEgyptCode = ['EG', 'SD', 'LY', 'DZ', 'TN', 'MA'].includes(code);
  const isEgyptName = nameLower.includes('egypt') ||
    nameLower.includes('sudan') ||
    nameLower.includes('libya') ||
    nameLower.includes('algeria') ||
    nameLower.includes('tunisia') ||
    nameLower.includes('morocco');
  if (isEgyptCode || isEgyptName) {
    return REGIONAL_PRESETS.egypt_north_africa;
  }

  // 7. UK, Europe, Australia & Global fallback
  return REGIONAL_PRESETS.europe_mwl;
}

export const STORAGE_MAGHRIB_IHTIYAT = 'maghrib_ihtiyat_min';
export const STORAGE_DHUHR_ZAWAAL_SAFETY = 'dhuhr_zawaal_safety_min';
export const REGIONAL_PRESET_APPLIED_FLAG = 'noor_prayer_precision_v3_migrated';

/**
 * Get Maghrib precautionary ihtiyat minutes (0 or 3).
 */
export function getMaghribIhtiyatMin(): number {
  try {
    const val = localStorage.getItem(STORAGE_MAGHRIB_IHTIYAT);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
  } catch {
    // Storage fallback
  }
  return 0; // Default exact sunset
}

/**
 * Set Maghrib precautionary ihtiyat minutes (0 or 3).
 */
export function setMaghribIhtiyatMin(minutes: number): void {
  try {
    localStorage.setItem(STORAGE_MAGHRIB_IHTIYAT, minutes.toString());
    localStorage.removeItem('cached_prayer_times');
    localStorage.removeItem('noor_cached_dashboard_prayers');
    localStorage.removeItem('noor_cached_suhoor_iftaar');
    try {
      import('@/lib/aladhan-api').then(({ AladhanAPI }) => {
        AladhanAPI.clearCache();
      }).catch(() => {});
    } catch {
      // Handled silently
    }
    window.dispatchEvent(new Event('prayer-offsets-changed'));
    window.dispatchEvent(new CustomEvent('prayer-method-changed', { detail: { maghribIhtiyat: minutes } }));
  } catch {
    // Storage fallback
  }
}

/**
 * Get Dhuhr Zawaal safety minutes (default 5 for South Asia, 0 otherwise).
 */
export function getDhuhrZawaalSafetyMin(fallback = 0): number {
  try {
    const val = localStorage.getItem(STORAGE_DHUHR_ZAWAAL_SAFETY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? fallback : parsed;
    }
  } catch {
    // Storage fallback
  }
  return fallback;
}

/**
 * Set Dhuhr Zawaal safety minutes.
 */
export function setDhuhrZawaalSafetyMin(minutes: number): void {
  try {
    localStorage.setItem(STORAGE_DHUHR_ZAWAAL_SAFETY, minutes.toString());
    localStorage.removeItem('cached_prayer_times');
    window.dispatchEvent(new Event('prayer-offsets-changed'));
  } catch {
    // Storage fallback
  }
}

/**
 * Apply regional prayer preset to storage and notify all listeners.
 */
export function applyRegionalPreset(preset: RegionalPrayerPreset): void {
  try {
    // 1. Calculation method
    const localMethod = prayerMethods.getAllMethods().find(m =>
      m.calculationMethod.toLowerCase() === preset.method.toLowerCase() ||
      m.name.toLowerCase().includes(preset.method.toLowerCase())
    );
    if (localMethod) {
      prayerMethods.saveSelectedMethod(localMethod);
    }
    setCalculationMethod(preset.method);

    // 2. Madhab
    setMadhab(preset.madhab);

    // 3. Hijri offset
    localStorage.setItem('hijri-date-offset', preset.hijriOffset.toString());

    // 4. Dhuhr safety min
    localStorage.setItem(STORAGE_DHUHR_ZAWAAL_SAFETY, preset.dhuhrZawaalSafetyMin.toString());

    // 5. Maghrib ihtiyat min (apply regional preset value, e.g. 3m for South Asia)
    localStorage.setItem(STORAGE_MAGHRIB_IHTIYAT, preset.maghribIhtiyatMin.toString());

    // 6. Clear cached times
    localStorage.removeItem('cached_prayer_times');
    localStorage.removeItem('noor_cached_dashboard_prayers');

    // 7. Mark migration flag
    localStorage.setItem(REGIONAL_PRESET_APPLIED_FLAG, 'true');

    // 8. Dispatch notification events
    window.dispatchEvent(new CustomEvent('prayer-method-changed', { detail: { preset } }));
    window.dispatchEvent(new CustomEvent('madhab-changed', { detail: { madhab: preset.madhab } }));
    window.dispatchEvent(new Event('hijri-date-offset-changed'));
    window.dispatchEvent(new Event('prayer-offsets-changed'));
  } catch (err) {
    console.warn('[RegionalPreset] Failed to apply preset:', err);
  }
}

/**
 * Automatically apply regional preset on first migration if not already applied.
 */
export function autoApplyRegionalPresetIfFirstMigration(
  countryCodeOrName?: string,
  lat?: number,
  lng?: number
): boolean {
  try {
    const alreadyApplied = localStorage.getItem(REGIONAL_PRESET_APPLIED_FLAG);
    if (alreadyApplied === 'true') {
      return false;
    }
    const preset = getRegionalPrayerPreset(countryCodeOrName, lat, lng);
    applyRegionalPreset(preset);
    return true;
  } catch {
    return false;
  }
}

export interface FardPrayerScheduleItem {
  id: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  name: string;
  startTime: Date;
  startTimeFormatted: string;
  endTime: Date;
  endTimeFormatted: string;
  alternateAsrTime?: Date;
  alternateAsrFormatted?: string;
  alternateMadhabLabel?: string;
  isCurrent: boolean;
  timeUntilEndFormatted?: string;
}

export interface SunnahFastingTimes {
  khatmSehri: Date;
  khatmSehriFormatted: string;
  ishraaq: Date;
  ishraaqFormatted: string;
  chaasht: Date;
  chaashtFormatted: string;
  zawaal: Date;
  zawaalFormatted: string;
  sunset: Date;
  sunsetFormatted: string;
  iftaar: Date;
  iftaarFormatted: string;
  islamicMidnight: Date;
  islamicMidnightFormatted: string;
  tahajjud: Date;
  tahajjudFormatted: string;
  tahajjudLastThird?: Date;
  tahajjudLastThirdFormatted?: string;
  tahajjudDescription?: string;
}

export interface StaticMakruhWindow {
  id: 'sunrise' | 'zawaal' | 'sunset';
  title: string;
  titleUrdu: string;
  start: Date;
  end: Date;
  startFormatted: string;
  endFormatted: string;
  description: string;
}

export interface FullPrayerSchedule {
  fardPrayers: FardPrayerScheduleItem[];
  sunrise: Date;
  sunriseFormatted: string;
  sunnahTimes: SunnahFastingTimes;
  makruhWindows: StaticMakruhWindow[];
  activeMadhab: MadhabType;
  calculationMethod: CalculationMethodName;
  maghribIhtiyatMin: number;
}

/**
 * Format a Date object to clean 12h or 24h string.
 */
export function formatScheduleTime(date: Date, is24h = false, roundToMinute = true): string {
  if (!date || isNaN(date.getTime())) return '--:--';
  const target = roundToMinute
    ? new Date(Math.round(date.getTime() / 60000) * 60000)
    : date;
  return target.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !is24h,
  });
}

/**
 * Compute the complete authenticated Islamic prayer schedule for any given date and coordinates.
 */
export function computeFullPrayerSchedule(
  date: Date = new Date(),
  latitude: number,
  longitude: number,
  options?: {
    method?: CalculationMethodName;
    madhab?: MadhabType;
    maghribIhtiyatMin?: number;
    dhuhrZawaalSafetyMin?: number;
    is24h?: boolean;
    offsets?: PrayerMinuteOffsets;
  }
): FullPrayerSchedule {
  const is24h = Boolean(options?.is24h);
  const activeMadhab = options?.madhab || getMadhab();
  const methodName = options?.method || getCalculationMethod();
  const maghribIhtiyat = typeof options?.maghribIhtiyatMin === 'number'
    ? options.maghribIhtiyatMin
    : getMaghribIhtiyatMin();
  const dhuhrSafety = typeof options?.dhuhrZawaalSafetyMin === 'number'
    ? options.dhuhrZawaalSafetyMin
    : getDhuhrZawaalSafetyMin(activeMadhab === 'hanafi' ? 5 : 0);
  const offsets = options?.offsets || getPrayerMinuteOffsets();

  const coordinates = new Coordinates(latitude, longitude);

  // Setup calculation parameters
  const getParams = () => {
    switch (methodName) {
      case 'Karachi':
        return CalculationMethod.Karachi();
      case 'Egyptian':
        return CalculationMethod.Egyptian();
      case 'UmmAlQura':
        return CalculationMethod.UmmAlQura();
      case 'Dubai':
        return CalculationMethod.Dubai();
      case 'MoonsightingCommittee':
        return CalculationMethod.MoonsightingCommittee();
      case 'NorthAmerica':
        return CalculationMethod.NorthAmerica();
      case 'Kuwait':
        return CalculationMethod.Kuwait();
      case 'Qatar':
        return CalculationMethod.Qatar();
      case 'Singapore':
        return CalculationMethod.Singapore();
      case 'Turkey':
        return CalculationMethod.Turkey();
      case 'Tehran':
        return CalculationMethod.Tehran();
      default:
        return CalculationMethod.MuslimWorldLeague();
    }
  };

  // Primary Madhab calculation
  const primaryParams = getParams();
  primaryParams.madhab = activeMadhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  if (primaryParams.methodAdjustments) {
    primaryParams.methodAdjustments.dhuhr = 0;
  }
  if (Math.abs(latitude) > 48) {
    primaryParams.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  }

  const primaryTimes = new PrayerTimes(coordinates, date, primaryParams);

  // Alternate Madhab calculation for Asr (Hanafi vs Shafi)
  const alternateParams = getParams();
  alternateParams.madhab = activeMadhab === 'hanafi' ? Madhab.Shafi : Madhab.Hanafi;
  if (alternateParams.methodAdjustments) {
    alternateParams.methodAdjustments.dhuhr = 0;
  }
  if (Math.abs(latitude) > 48) {
    alternateParams.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  }
  const alternateTimes = new PrayerTimes(coordinates, date, alternateParams);

  // Tomorrow times for Isha end time (tomorrow's Fajr)
  const tomorrow = new Date(date);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowParams = getParams();
  tomorrowParams.madhab = primaryParams.madhab;
  if (tomorrowParams.methodAdjustments) {
    tomorrowParams.methodAdjustments.dhuhr = 0;
  }
  if (Math.abs(latitude) > 48) {
    tomorrowParams.highLatitudeRule = HighLatitudeRule.recommended(coordinates);
  }
  const tomorrowTimes = new PrayerTimes(coordinates, tomorrow, tomorrowParams);

  // Apply minute offsets and safety margins
  const rawFajr = primaryTimes.fajr;
  const rawSunrise = primaryTimes.sunrise;
  // Astronomical Solar Noon (Zawaal)
  // Fix double +5m offset bug: solarNoon (Zawaal) is computed strictly BEFORE the +5 min safety margin.
  // rawDhuhr represents the Fard Dhuhr start (12:26 PM for Vadgam/Chhapi on 20 Nov 2026),
  // while solarNoon is 12:21 PM, giving Zawaal (12:21 PM) and Zawaal Makruh (12:21 PM – 12:26 PM).
  const rawDhuhr = primaryTimes.dhuhr;
  const rawSolarNoon = dhuhrSafety > 0
    ? new Date(rawDhuhr.getTime() - dhuhrSafety * 60000)
    : rawDhuhr;
  const rawAsr = primaryTimes.asr;
  const rawAltAsr = alternateTimes.asr;
  // Maghrib with Ihtiyat
  const rawSunset = primaryTimes.maghrib;
  const rawMaghrib = maghribIhtiyat > 0
    ? new Date(rawSunset.getTime() + maghribIhtiyat * 60000)
    : rawSunset;
  const rawIsha = primaryTimes.isha;
  const rawTomorrowFajr = tomorrowTimes.fajr;

  // Apply user-configured minute offsets
  const fajr = applyOffsetToDate(rawFajr, 'fajr', offsets);
  const sunrise = applyOffsetToDate(rawSunrise, 'sunrise', offsets);
  const dhuhr = applyOffsetToDate(rawDhuhr, 'dhuhr', offsets);
  const asr = applyOffsetToDate(rawAsr, 'asr', offsets);
  const altAsr = applyOffsetToDate(rawAltAsr, 'asr', offsets);
  const maghrib = applyOffsetToDate(rawMaghrib, 'maghrib', offsets);
  const isha = applyOffsetToDate(rawIsha, 'isha', offsets);
  const tomorrowFajr = applyOffsetToDate(rawTomorrowFajr, 'fajr', offsets);

  // End / Qaza boundaries:
  // Fajr ends at Sunrise
  const fajrEnd = sunrise;
  // Dhuhr ends at Asr start
  const dhuhrEnd = asr;
  // Asr ends at Sunset
  const asrEnd = rawSunset;
  // Maghrib ends at Isha start
  const maghribEnd = isha;
  // Isha ends at Tomorrow Fajr start
  const ishaEnd = tomorrowFajr;

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  const getRemainingTime = (end: Date) => {
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return '0m';
    const hrs = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const fardPrayers: FardPrayerScheduleItem[] = [
    {
      id: 'fajr',
      name: 'Fajr',
      startTime: fajr,
      startTimeFormatted: formatScheduleTime(fajr, is24h),
      endTime: fajrEnd,
      endTimeFormatted: formatScheduleTime(fajrEnd, is24h),
      isCurrent: isToday && now >= fajr && now < fajrEnd,
      timeUntilEndFormatted: isToday && now >= fajr && now < fajrEnd ? getRemainingTime(fajrEnd) : undefined,
    },
    {
      id: 'dhuhr',
      name: date.getDay() === 5 ? 'Jummah' : 'Dhuhr',
      startTime: dhuhr,
      startTimeFormatted: formatScheduleTime(dhuhr, is24h),
      endTime: dhuhrEnd,
      endTimeFormatted: formatScheduleTime(dhuhrEnd, is24h),
      isCurrent: isToday && now >= dhuhr && now < dhuhrEnd,
      timeUntilEndFormatted: isToday && now >= dhuhr && now < dhuhrEnd ? getRemainingTime(dhuhrEnd) : undefined,
    },
    {
      id: 'asr',
      name: 'Asr',
      startTime: asr,
      startTimeFormatted: formatScheduleTime(asr, is24h),
      endTime: asrEnd,
      endTimeFormatted: formatScheduleTime(asrEnd, is24h),
      alternateAsrTime: altAsr,
      alternateAsrFormatted: formatScheduleTime(altAsr, is24h),
      alternateMadhabLabel: activeMadhab === 'hanafi' ? 'Shafi\'i' : 'Hanafi',
      isCurrent: isToday && now >= asr && now < asrEnd,
      timeUntilEndFormatted: isToday && now >= asr && now < asrEnd ? getRemainingTime(asrEnd) : undefined,
    },
    {
      id: 'maghrib',
      name: 'Maghrib',
      startTime: maghrib,
      startTimeFormatted: formatScheduleTime(maghrib, is24h),
      endTime: maghribEnd,
      endTimeFormatted: formatScheduleTime(maghribEnd, is24h),
      isCurrent: isToday && now >= maghrib && now < maghribEnd,
      timeUntilEndFormatted: isToday && now >= maghrib && now < maghribEnd ? getRemainingTime(maghribEnd) : undefined,
    },
    {
      id: 'isha',
      name: 'Isha',
      startTime: isha,
      startTimeFormatted: formatScheduleTime(isha, is24h),
      endTime: ishaEnd,
      endTimeFormatted: formatScheduleTime(ishaEnd, is24h),
      isCurrent: isToday && now >= isha && now < ishaEnd,
      timeUntilEndFormatted: isToday && now >= isha && now < ishaEnd ? getRemainingTime(ishaEnd) : undefined,
    },
  ];

  // Sunnah and Fasting Times calculation
  // Khatm Sehri: 10 mins before Fajr start
  const khatmSehri = new Date(fajr.getTime() - 10 * 60000);
  // Ishraaq: Sunrise + 20 min (end of Sunrise Makruh window)
  const ishraaq = new Date(sunrise.getTime() + 20 * 60000);
  // Zawaal: Astronomical solar transit
  const zawaal = rawSolarNoon;
  // Chaasht / Duha: dynamic midpoint between Sunrise and Zawaal (~09:40 AM)
  const chaasht = new Date(sunrise.getTime() + Math.max(0, (zawaal.getTime() - sunrise.getTime()) / 2));
  // Sunset: Astronomical sunset
  const sunset = rawSunset;
  // Iftaar: Maghrib start
  const iftaar = maghrib;
  // Islamic Night: from Astronomical Sunset to tomorrow's Fajr
  const nightDurationMs = tomorrowFajr.getTime() - rawSunset.getTime();
  const islamicMidnight = new Date(rawSunset.getTime() + Math.round(nightDurationMs / 2));
  // Tahajjud: South Asia / Hanafi tradition (Deeniyat & Kashkol) specifies the last 1/6th of the night (03:42 AM)
  const tahajjud = new Date(tomorrowFajr.getTime() - Math.round(nightDurationMs / 6));
  // Classical Sunnah last 1/3rd of the night (01:44 AM)
  const tahajjudLastThird = new Date(tomorrowFajr.getTime() - Math.round(nightDurationMs / 3));

  const sunnahTimes: SunnahFastingTimes = {
    khatmSehri,
    khatmSehriFormatted: formatScheduleTime(khatmSehri, is24h),
    ishraaq,
    ishraaqFormatted: formatScheduleTime(ishraaq, is24h),
    chaasht,
    chaashtFormatted: formatScheduleTime(chaasht, is24h),
    zawaal,
    zawaalFormatted: formatScheduleTime(zawaal, is24h),
    sunset,
    sunsetFormatted: formatScheduleTime(sunset, is24h),
    iftaar,
    iftaarFormatted: formatScheduleTime(iftaar, is24h),
    islamicMidnight,
    islamicMidnightFormatted: formatScheduleTime(islamicMidnight, is24h),
    tahajjud,
    tahajjudFormatted: formatScheduleTime(tahajjud, is24h),
    tahajjudLastThird,
    tahajjudLastThirdFormatted: formatScheduleTime(tahajjudLastThird, is24h),
    tahajjudDescription: `Last 1/6: ${formatScheduleTime(tahajjud, is24h)} • Last 1/3: ${formatScheduleTime(tahajjudLastThird, is24h)}`,
  };

  // 3 Daily Prohibited (Makruh) Windows
  // 1. Sunrise (Tulu'): [Sunrise, Sunrise + 20m]
  const sunriseMakruhEnd = new Date(sunrise.getTime() + 20 * 60000);
  // 2. Zawaal (Istiwa'): Astronomical Solar Noon until Dhuhr start (e.g. 12:21 PM – 12:26 PM)
  const zawalMakruhStart = rawSolarNoon;
  const zawalMakruhEnd = dhuhr;
  // 3. Sunset (Ghurub): [Sunset - 15m, Sunset]
  const sunsetMakruhStart = new Date(sunset.getTime() - 15 * 60000);
  const sunsetMakruhEnd = sunset;

  const makruhWindows: StaticMakruhWindow[] = [
    {
      id: 'sunrise',
      title: 'Sunrise Makruh (طلوع آفتاب)',
      titleUrdu: 'طلوع آفتاب (مکروہ وقت)',
      start: sunrise,
      end: sunriseMakruhEnd,
      startFormatted: formatScheduleTime(sunrise, is24h),
      endFormatted: formatScheduleTime(sunriseMakruhEnd, is24h),
      description: 'Until the sun rises above spear length (~20m). Salah & Tilawat prohibited.',
    },
    {
      id: 'zawaal',
      title: 'Zawaal Makruh (نصف النہار / استواء)',
      titleUrdu: 'زوال کا وقت (مکروہ وقت)',
      start: zawalMakruhStart,
      end: zawalMakruhEnd,
      startFormatted: formatScheduleTime(zawalMakruhStart, is24h),
      endFormatted: formatScheduleTime(zawalMakruhEnd, is24h),
      description: 'Midday zenith when sun is directly overhead. Prohibited until Dhuhr begins.',
    },
    {
      id: 'sunset',
      title: 'Sunset Makruh (غروب آفتاب)',
      titleUrdu: 'غروب آفتاب (مکروہ وقت)',
      start: sunsetMakruhStart,
      end: sunsetMakruhEnd,
      startFormatted: formatScheduleTime(sunsetMakruhStart, is24h),
      endFormatted: formatScheduleTime(sunsetMakruhEnd, is24h),
      description: '15m before sunset as the sun pales. Only today\'s Asr Fard permitted if delayed.',
    },
  ];

  return {
    fardPrayers,
    sunrise,
    sunriseFormatted: formatScheduleTime(sunrise, is24h),
    sunnahTimes,
    makruhWindows,
    activeMadhab,
    calculationMethod: methodName,
    maghribIhtiyatMin: maghribIhtiyat,
  };
}
