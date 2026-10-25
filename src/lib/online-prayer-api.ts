/**
 * Online-First Live Prayer & Hijri API Provider
 * Connects directly to AlAdhan live endpoints:
 *   - https://api.aladhan.com/v1/timings/{DD-MM-YYYY}
 *   - https://api.aladhan.com/v1/calendar/{YYYY}/{MM}
 * Features lightweight localStorage caching, live refresh action,
 * and graceful fallback to offline astronomical engine.
 */

import { calculatePrayerTimes, type PrayerTimesResult } from './prayer-calculator';
import { prayerMethods } from './prayer-methods';
import { getMadhab } from './storage';
import { getPrayerMinuteOffsets, applyOffsetsToTimings } from './prayer-offsets';

export interface LivePrayerTiming {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string;
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface LiveHijriDate {
  date: string; // e.g. "13-05-1448"
  format: string;
  day: string; // e.g. "13"
  weekday: {
    en: string;
    ar: string;
  };
  month: {
    number: number;
    en: string;
    ar: string;
  };
  year: string; // e.g. "1448"
  designation: {
    abbreviated: string;
    expanded: string;
  };
  holidays: string[];
}

export interface LiveGregorianDate {
  date: string; // e.g. "24-10-2026"
  format: string;
  day: string;
  weekday: {
    en: string;
  };
  month: {
    number: number;
    en: string;
  };
  year: string;
  designation: {
    abbreviated: string;
    expanded: string;
  };
}

export interface LiveDaySchedule {
  date: {
    readable: string;
    timestamp: string;
    gregorian: LiveGregorianDate;
    hijri: LiveHijriDate;
  };
  timings: LivePrayerTiming;
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
    };
    school: string;
  };
  isOnlineSource?: boolean;
}

export interface LiveMonthlyCalendar {
  month: number;
  year: number;
  latitude: number;
  longitude: number;
  method: number;
  school: number;
  adjustment: number;
  days: LiveDaySchedule[];
  lastUpdated: string;
  isOnlineSource: boolean;
}

export const ALADHAN_METHOD_MAP: Record<string, number> = {
  Karachi: 1,
  NorthAmerica: 2,
  MuslimWorldLeague: 3,
  UmmAlQura: 4,
  Egyptian: 5,
  Tehran: 7,
  Gulf: 8,
  Kuwait: 9,
  Qatar: 10,
  Singapore: 11,
  Turkey: 13,
  MoonsightingCommittee: 15,
  Dubai: 16,
};

const CACHE_PREFIX = 'noor_live_calendar_';
const TIMINGS_CACHE_PREFIX = 'noor_live_timings_';
export const PRAYER_DATA_REFRESHED_EVENT = 'online-prayer-data-refreshed';

export function normalizeHijriName(name: string): string {
  if (!name) return '';
  return name
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
    .replace(/al-ola/gi, 'al-ūlā')
    .replace(/al-ōlā/gi, 'al-ūlā')
    .replace(/ō/g, 'ū');
}

function getCacheKey(lat: number, lng: number, year: number, month: number, method: number, school: number, adjustment: number): string {
  return `${CACHE_PREFIX}${lat.toFixed(2)}_${lng.toFixed(2)}_${year}_${month}_m${method}_s${school}_adj${adjustment}`;
}

export class OnlinePrayerAPI {
  /**
   * Resolve user calculation method ID for AlAdhan API
   */
  static getResolvedMethodId(): number {
    try {
      const selected = prayerMethods.getSelectedMethod();
      if (selected && selected.calculationMethod && ALADHAN_METHOD_MAP[selected.calculationMethod]) {
        return ALADHAN_METHOD_MAP[selected.calculationMethod];
      }
      if (selected && typeof selected.id === 'number') {
        return selected.id;
      }
    } catch (e) {
      // Default to MWL (3)
    }
    return 3;
  }

  /**
   * Resolve user Madhab school parameter (0 = Shafi/Standard, 1 = Hanafi)
   */
  static getResolvedSchool(): number {
    try {
      const madhab = getMadhab();
      return madhab === 'hanafi' ? 1 : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Resolve user Hijri day adjustment offset (-2 to +2)
   */
  static getResolvedHijriAdjustment(): number {
    try {
      const stored = localStorage.getItem('hijri-date-offset');
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= -2 && val <= 2) {
          return val;
        }
      }
    } catch {
      // Return 0 if not set
    }
    return 0;
  }

  /**
   * Format Date to AlAdhan date path: DD-MM-YYYY
   */
  static formatAladhanDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }

  /**
   * Fetch live daily prayer timings from https://api.aladhan.com/v1/timings/{DD-MM-YYYY}
   */
  static async fetchLiveDayTimings(
    date: Date,
    latitude: number,
    longitude: number,
    forceRefresh = false
  ): Promise<LiveDaySchedule> {
    const formattedDate = this.formatAladhanDate(date);
    const method = this.getResolvedMethodId();
    const school = this.getResolvedSchool();
    const adjustment = this.getResolvedHijriAdjustment();
    const cacheKey = `${TIMINGS_CACHE_PREFIX}${latitude.toFixed(2)}_${longitude.toFixed(2)}_${formattedDate}_m${method}_s${school}_adj${adjustment}`;

    // Check memory/local storage cache if not forced refresh
    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as LiveDaySchedule;
          // Apply active minute offsets
          const offsets = getPrayerMinuteOffsets();
          parsed.timings = applyOffsetsToTimings(parsed.timings, offsets);
          return parsed;
        }
      } catch (cacheErr) {
        // Fall through to live network fetch
      }
    }

    // Attempt live network fetch if online
    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const url = `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}&adjustment=${adjustment}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (body?.data?.timings && body?.data?.date) {
            const rawTimings = body.data.timings;
            // Clean up timing strings (strip " (EST)" or extra timezone tags if present)
            const cleanTimings: LivePrayerTiming = {
              Fajr: (rawTimings.Fajr || '05:00').split(' ')[0],
              Sunrise: (rawTimings.Sunrise || '06:30').split(' ')[0],
              Dhuhr: (rawTimings.Dhuhr || '12:30').split(' ')[0],
              Asr: (rawTimings.Asr || '15:45').split(' ')[0],
              Maghrib: (rawTimings.Maghrib || '18:15').split(' ')[0],
              Isha: (rawTimings.Isha || '19:45').split(' ')[0],
              Imsak: (rawTimings.Imsak || rawTimings.Fajr || '04:50').split(' ')[0],
              Midnight: (rawTimings.Midnight || '00:00').split(' ')[0],
              Firstthird: (rawTimings.Firstthird || '21:30').split(' ')[0],
              Lastthird: (rawTimings.Lastthird || '02:30').split(' ')[0],
            };

            if (body.data.date.hijri?.month?.en) {
              body.data.date.hijri.month.en = normalizeHijriName(body.data.date.hijri.month.en);
            }

            const schedule: LiveDaySchedule = {
              date: body.data.date,
              timings: cleanTimings,
              meta: body.data.meta || {
                latitude,
                longitude,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                method: { id: method, name: 'AlAdhan Live' },
                school: school === 1 ? 'Hanafi' : 'Standard',
              },
              isOnlineSource: true,
            };

            // Cache raw live data (without offsets, offsets are dynamically applied on retrieval)
            try {
              localStorage.setItem(cacheKey, JSON.stringify(schedule));
            } catch {
              // Ignore cache write quota errors safely
            }

            const offsets = getPrayerMinuteOffsets();
            schedule.timings = applyOffsetsToTimings(schedule.timings, offsets);
            return schedule;
          }
        }
      } catch (netErr) {
        // Network drop or timeout, proceed to monthly cache or local mathematical calculation
      }
    }

    // Check if we have monthly calendar cached for this day
    const monthlyCalendar = this.getCachedMonthlyCalendar(date.getFullYear(), date.getMonth() + 1, latitude, longitude);
    if (monthlyCalendar) {
      const match = monthlyCalendar.days.find(d => {
        const dNum = parseInt(d.date.gregorian.day, 10);
        return dNum === date.getDate();
      });
      if (match) {
        const offsets = getPrayerMinuteOffsets();
        return {
          ...match,
          timings: applyOffsetsToTimings(match.timings, offsets),
        };
      }
    }

    // Fall back to local calculation
    return this.generateLocalDaySchedule(date, latitude, longitude);
  }

  /**
   * Fetch full monthly calendar from https://api.aladhan.com/v1/calendar/{YYYY}/{MM}
   */
  static async fetchMonthlyCalendar(
    year: number,
    month: number,
    latitude: number,
    longitude: number,
    forceRefresh = false
  ): Promise<LiveMonthlyCalendar> {
    const method = this.getResolvedMethodId();
    const school = this.getResolvedSchool();
    const adjustment = this.getResolvedHijriAdjustment();
    const cacheKey = getCacheKey(latitude, longitude, year, month, method, school, adjustment);

    if (!forceRefresh) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as LiveMonthlyCalendar;
          return parsed;
        }
      } catch {
        // Fall through to live network fetch
      }
    }

    if (typeof navigator === 'undefined' || navigator.onLine !== false) {
      try {
        const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${school}&adjustment=${adjustment}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 7500);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body?.data) && body.data.length > 0) {
            const days: LiveDaySchedule[] = body.data.map((item: any) => {
              const raw = item.timings || {};
              const cleanTimings: LivePrayerTiming = {
                Fajr: (raw.Fajr || '05:00').split(' ')[0],
                Sunrise: (raw.Sunrise || '06:30').split(' ')[0],
                Dhuhr: (raw.Dhuhr || '12:30').split(' ')[0],
                Asr: (raw.Asr || '15:45').split(' ')[0],
                Maghrib: (raw.Maghrib || '18:15').split(' ')[0],
                Isha: (raw.Isha || '19:45').split(' ')[0],
                Imsak: (raw.Imsak || raw.Fajr || '04:50').split(' ')[0],
                Midnight: (raw.Midnight || '00:00').split(' ')[0],
                Firstthird: (raw.Firstthird || '21:30').split(' ')[0],
                Lastthird: (raw.Lastthird || '02:30').split(' ')[0],
              };

              if (item.date?.hijri?.month?.en) {
                item.date.hijri.month.en = normalizeHijriName(item.date.hijri.month.en);
              }

              return {
                date: item.date,
                timings: cleanTimings,
                meta: item.meta || {
                  latitude,
                  longitude,
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
                  method: { id: method, name: 'AlAdhan Live' },
                  school: school === 1 ? 'Hanafi' : 'Standard',
                },
                isOnlineSource: true,
              };
            });

            const calendar: LiveMonthlyCalendar = {
              month,
              year,
              latitude,
              longitude,
              method,
              school,
              adjustment,
              days,
              lastUpdated: new Date().toISOString(),
              isOnlineSource: true,
            };

            try {
              localStorage.setItem(cacheKey, JSON.stringify(calendar));
            } catch {
              // Ignore cache write quota errors safely
            }

            return calendar;
          }
        }
      } catch (netErr) {
        // Fall through to cached or local math
      }
    }

    // If fetch failed, check cache
    const existingCache = this.getCachedMonthlyCalendar(year, month, latitude, longitude);
    if (existingCache) {
      return existingCache;
    }

    // Otherwise generate local offline astronomical calendar
    return this.generateLocalMonthlyCalendar(year, month, latitude, longitude, method, school, adjustment);
  }

  /**
   * Retrieve cached monthly calendar for a given month and location
   */
  static getCachedMonthlyCalendar(year: number, month: number, lat: number, lng: number): LiveMonthlyCalendar | null {
    try {
      const method = this.getResolvedMethodId();
      const school = this.getResolvedSchool();
      const adjustment = this.getResolvedHijriAdjustment();
      const cacheKey = getCacheKey(lat, lng, year, month, method, school, adjustment);
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // return null on error
    }
    return null;
  }

  /**
   * Action to refresh live data across cache and trigger UI update
   */
  static async refreshLiveData(latitude: number, longitude: number, year = new Date().getFullYear(), month = new Date().getMonth() + 1): Promise<void> {
    // Clear existing cache for current month
    const method = this.getResolvedMethodId();
    const school = this.getResolvedSchool();
    const adjustment = this.getResolvedHijriAdjustment();
    const cacheKey = getCacheKey(latitude, longitude, year, month, method, school, adjustment);
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // Ignore cache removal errors safely
    }

    // Refetch fresh monthly and today timings
    await Promise.allSettled([
      this.fetchMonthlyCalendar(year, month, latitude, longitude, true),
      this.fetchLiveDayTimings(new Date(), latitude, longitude, true),
    ]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PRAYER_DATA_REFRESHED_EVENT, { detail: { latitude, longitude, year, month } }));
    }
  }

  /**
   * Generate clean fallback day schedule using local mathematical calculation
   */
  static generateLocalDaySchedule(date: Date, latitude: number, longitude: number): LiveDaySchedule {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const times: PrayerTimesResult = calculatePrayerTimes(latitude, longitude, date);

    const formatT = (d?: Date) => {
      if (!d || isNaN(d.getTime())) return '00:00';
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const dNum = date.getDate();
    const mNum = date.getMonth() + 1;
    const yNum = date.getFullYear();

    // Calculate approximate Hijri date
    let hijriDay = dNum.toString();
    let hijriMonthNum = 5;
    let hijriYear = '1448';
    try {
      const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
      const parts = hijriFmt.formatToParts(date);
      hijriDay = parts.find(p => p.type === 'day')?.value || String(dNum);
      hijriMonthNum = parseInt(parts.find(p => p.type === 'month')?.value || '5', 10);
      hijriYear = parts.find(p => p.type === 'year')?.value || '1448';
    } catch {
      // Ignore Intl format fallback safely
    }

    const HIJRI_MONTHS = [
      'Muharram', 'Safar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Thānī',
      'Jumādā al-ūlā', 'Jumādā al-ākhirah', 'Rajab', 'Shaʿbān',
      'Ramaḍān', 'Shawwāl', 'Dhū al-Qaʿdah', 'Dhū al-Ḥijjah'
    ];
    const hijriMonthEn = HIJRI_MONTHS[(hijriMonthNum - 1) % 12] || 'Jumādā al-ūlā';

    const baseTimings: LivePrayerTiming = {
      Fajr: formatT(times.fajr),
      Sunrise: formatT(times.sunrise),
      Dhuhr: formatT(times.dhuhr),
      Asr: formatT(times.asr),
      Maghrib: formatT(times.maghrib),
      Isha: formatT(times.isha),
      Imsak: formatT(times.fajr),
      Midnight: '00:00',
      Firstthird: '21:30',
      Lastthird: '02:30',
    };

    const offsets = getPrayerMinuteOffsets();
    const adjustedTimings = applyOffsetsToTimings(baseTimings, offsets);

    return {
      date: {
        readable: `${pad(dNum)} ${date.toLocaleString('en-US', { month: 'short' })} ${yNum}`,
        timestamp: Math.floor(date.getTime() / 1000).toString(),
        gregorian: {
          date: `${pad(dNum)}-${pad(mNum)}-${yNum}`,
          format: 'DD-MM-YYYY',
          day: pad(dNum),
          weekday: { en: date.toLocaleDateString('en-US', { weekday: 'long' }) },
          month: { number: mNum, en: date.toLocaleString('en-US', { month: 'long' }) },
          year: String(yNum),
          designation: { abbreviated: 'AD', expanded: 'Anno Domini' }
        },
        hijri: {
          date: `${hijriDay}-${hijriMonthNum}-${hijriYear}`,
          format: 'DD-MM-YYYY',
          day: hijriDay,
          weekday: { en: date.toLocaleDateString('en-US', { weekday: 'long' }), ar: '' },
          month: { number: hijriMonthNum, en: hijriMonthEn, ar: '' },
          year: hijriYear,
          designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
          holidays: []
        }
      },
      timings: adjustedTimings,
      meta: {
        latitude,
        longitude,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        method: { id: this.getResolvedMethodId(), name: 'Local Calculation' },
        school: this.getResolvedSchool() === 1 ? 'Hanafi' : 'Standard'
      },
      isOnlineSource: false
    };
  }

  /**
   * Generate local offline monthly calendar
   */
  static generateLocalMonthlyCalendar(
    year: number,
    month: number,
    latitude: number,
    longitude: number,
    method: number,
    school: number,
    adjustment: number
  ): LiveMonthlyCalendar {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days: LiveDaySchedule[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month - 1, day, 12, 0, 0);
      days.push(this.generateLocalDaySchedule(d, latitude, longitude));
    }

    return {
      month,
      year,
      latitude,
      longitude,
      method,
      school,
      adjustment,
      days,
      lastUpdated: new Date().toISOString(),
      isOnlineSource: false
    };
  }
}
