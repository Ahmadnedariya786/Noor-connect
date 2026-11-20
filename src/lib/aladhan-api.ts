/**
 * Aladhan API Integration for Dynamic Prayer Times
 * Fetches monthly calendar data with localStorage persistence
 */
import { getMadhab } from './storage';
import { calculatePrayerTimes, getCalculationMethod } from './prayer-calculator';
import { getPrayerMinuteOffsets, applyOffsetsToTimings } from './prayer-offsets';

export function sanitizeHijriDiacritics(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
    .replace(/al-ola/gi, 'al-ūlā')
    .replace(/al-ōlā/gi, 'al-ūlā')
    .replace(/ō/g, 'ū');
}

export interface AladhanPrayerTime {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Imsak: string; // For Ramadan Suhoor
  Midnight: string;
  Firstthird: string;
  Lastthird: string;
}

export interface AladhanDayData {
  date: {
    readable: string;
    timestamp: string;
    gregorian: {
      date: string;
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
    };
    hijri: {
      date: string;
      format: string;
      day: string;
      weekday: {
        en: string;
        ar: string;
      };
      month: {
        number: number;
        en: string;
        ar: string;
      };
      year: string;
      designation: {
        abbreviated: string;
        expanded: string;
      };
      holidays: string[];
    };
  };
  timings: AladhanPrayerTime;
  meta: {
    latitude: number;
    longitude: number;
    timezone: string;
    method: {
      id: number;
      name: string;
      params: {
        Fajr: number;
        Isha: number;
      };
    };
    latitudeAdjustmentMethod: string;
    midnightMode: string;
    school: string;
  };
}

export interface AladhanMonthlyData {
  month: number;
  year: number;
  latitude: number;
  longitude: number;
  method: number;
  school?: number; // 0 for Shafi, 1 for Hanafi
  data: AladhanDayData[];
  lastUpdated: string;
}

const STORAGE_KEY = 'aladhan-monthly-data';
const API_BASE = 'https://api.aladhan.com/v1';

export const ALADHAN_METHODS: Record<string, number> = {
  MuslimWorldLeague: 3,
  Egyptian: 5,
  Karachi: 1,
  UmmAlQura: 4,
  Dubai: 16,
  MoonsightingCommittee: 15,
  NorthAmerica: 2,
  Kuwait: 9,
  Qatar: 10,
  Singapore: 11,
  Turkey: 13,
  Tehran: 7
};

export class AladhanAPI {
  /**
   * Resolve method ID for AlAdhan API matching user's calculation method
   */
  static getResolvedMethodId(): number {
    try {
      const selectedMethodName = getCalculationMethod();
      const map: Record<string, number> = {
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
        Turkey: 12,
        Dubai: 16,
      };
      if (selectedMethodName && map[selectedMethodName]) {
        return map[selectedMethodName];
      }
    } catch {
      // Fallback
    }
    return 1; // Default Karachi / South Asia
  }

  /**
   * Resolve school ID for AlAdhan API (0 = Shafi'i/Standard, 1 = Hanafi)
   */
  static getResolvedSchool(): number {
    try {
      const madhab = getMadhab();
      return madhab === 'hanafi' ? 1 : 0;
    } catch {
      return 1; // Default Hanafi for South Asia
    }
  }
  /**
   * Generate monthly prayer calendar offline using local calculation engine
   */
  static generateLocalMonthlyCalendar(
    latitude: number,
    longitude: number,
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1,
    method: number = 1,
    school?: number
  ): AladhanMonthlyData {
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysData: AladhanDayData[] = [];
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const formatTime = (d: Date) => {
      if (!(d instanceof Date) || isNaN(d.getTime())) return '00:00';
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    for (let day = 1; day <= daysInMonth; day++) {
      const targetDate = new Date(year, month - 1, day, 12, 0, 0);
      const times = calculatePrayerTimes(latitude, longitude, targetDate);

      const dString = `${pad(day)} ${targetDate.toLocaleString('en-US', { month: 'short' })} ${year}`;
      const weekdayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

      let hijriDay = '1';
      let hijriMonthNumber = 1;
      let hijriYear = '1447';

      try {
        const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric'
        });
        const parts = hijriFmt.formatToParts(targetDate);
        hijriDay = parts.find(p => p.type === 'day')?.value || String(day);
        hijriMonthNumber = parseInt(parts.find(p => p.type === 'month')?.value || '1', 10);
        hijriYear = parts.find(p => p.type === 'year')?.value || '1447';
      } catch {
        // Fallback to approximate values if Intl format fails
      }

      const HIJRI_MONTH_NAMES = [
        'Muharram', 'Safar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Thānī',
        'Jumādā al-ūlā', 'Jumādā al-ākhirah', 'Rajab', 'Shaʿbān',
        'Ramaḍān', 'Shawwāl', 'Dhū al-Qaʿdah', 'Dhū al-Ḥijjah'
      ];
      const hijriMonthEn = HIJRI_MONTH_NAMES[(hijriMonthNumber - 1) % 12] || 'Ramaḍān';

      daysData.push({
        date: {
          readable: dString,
          timestamp: Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000).toString(),
          gregorian: {
            date: `${pad(day)}-${pad(month)}-${year}`,
            format: 'DD-MM-YYYY',
            day: pad(day),
            weekday: { en: weekdayName },
            month: { number: month, en: targetDate.toLocaleString('en-US', { month: 'long' }) },
            year: String(year),
            designation: { abbreviated: 'AD', expanded: 'Anno Domini' }
          },
          hijri: {
            date: `${hijriDay}-${hijriMonthNumber}-${hijriYear}`,
            format: 'DD-MM-YYYY',
            day: hijriDay,
            weekday: { en: weekdayName, ar: '' },
            month: { number: hijriMonthNumber, en: hijriMonthEn, ar: '' },
            year: hijriYear,
            designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
            holidays: []
          }
        },
        timings: {
          Fajr: formatTime(times.fajr),
          Sunrise: formatTime(times.sunrise),
          Dhuhr: formatTime(times.dhuhr),
          Asr: formatTime(times.asr),
          Maghrib: formatTime(times.maghrib),
          Isha: formatTime(times.isha),
          Imsak: formatTime(times.fajr),
          Midnight: '00:00',
          Firstthird: '00:00',
          Lastthird: '00:00'
        },
        meta: {
          latitude,
          longitude,
          timezone,
          method: {
            id: method,
            name: 'Local Calculation Engine',
            params: { Fajr: 18, Isha: 18 }
          },
          latitudeAdjustmentMethod: 'ANGLE_BASED',
          midnightMode: 'STANDARD',
          school: school === 1 ? 'HANAFI' : 'STANDARD'
        }
      });
    }

    const monthlyData: AladhanMonthlyData = {
      month,
      year,
      latitude,
      longitude,
      method,
      school,
      data: daysData,
      lastUpdated: new Date().toISOString()
    };

    // Save generated local data so subsequent sync reads hit cache
    this.saveMonthlyData(monthlyData);
    return monthlyData;
  }

  /**
   * Fetch monthly prayer calendar from Aladhan API with offline local fallback
   */
  static async fetchMonthlyCalendar(
    latitude: number,
    longitude: number,
    year: number = new Date().getFullYear(),
    month: number = new Date().getMonth() + 1,
    method: number = 1, // Pakistan/Karachi (1), ISNA (2)
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<AladhanMonthlyData> {
    const resolvedSchool = school !== undefined ? school : this.getResolvedSchool();
    const url = `${API_BASE}/calendar/${year}/${month}?latitude=${latitude}&longitude=${longitude}&method=${method}&school=${resolvedSchool}`;

    const controller = new AbortController();

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`API Error: ${result.status}`);
      }

      if (!result.data || !Array.isArray(result.data)) {
        throw new Error('API response missing or invalid data array');
      }

      result.data.forEach((d: AladhanDayData) => {
        if (d?.date?.hijri?.month?.en) {
          d.date.hijri.month.en = d.date.hijri.month.en
            .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
            .replace(/al-ola/gi, 'al-ūlā')
            .replace(/al-ōlā/gi, 'al-ūlā')
            .replace(/ō/g, 'ū');
        }
      });

      const monthlyData: AladhanMonthlyData = {
        month,
        year,
        latitude,
        longitude,
        method,
        school: resolvedSchool,
        data: result.data,
        lastUpdated: new Date().toISOString()
      };

      // Save to localStorage
      this.saveMonthlyData(monthlyData);

      return monthlyData;
    } catch {
      // API fetch failed (offline, timeout, or unreachable) - fall back to stored cache or local calculation engine
      const stored = this.getStoredMonthlyData();
      if (stored && stored.month === month && stored.year === year && stored.school === resolvedSchool) {
        return stored;
      }
      return this.generateLocalMonthlyCalendar(latitude, longitude, year, month, method, resolvedSchool);
    }
  }

  /**
   * Get prayer times for a specific date from cached data
   */
  static getPrayerTimesForDate(date: Date, latitude?: number, longitude?: number, school?: number): AladhanDayData | null {
    const monthlyData = this.getStoredMonthlyData();
    if (!monthlyData) return null;

    // Verify school matches active preference
    const expectedSchool = school !== undefined ? school : this.getResolvedSchool();
    if (monthlyData.school === undefined || monthlyData.school !== expectedSchool) {
      return null;
    }

    // Verify it's the correct location if coordinates provided
    if (latitude !== undefined && longitude !== undefined) {
      const latDiff = Math.abs(monthlyData.latitude - latitude);
      const lngDiff = Math.abs(monthlyData.longitude - longitude);
      if (latDiff > 0.1 || lngDiff > 0.1) return null; // Cache for different location
    }

    const targetDate = new Date(date);
    const isSameMonth = targetDate.getFullYear() === monthlyData.year &&
      targetDate.getMonth() + 1 === monthlyData.month;

    if (!isSameMonth) return null;

    // Use timestamp for reliable comparison
    const targetTimestamp = Math.floor(targetDate.getTime() / 1000);
    const dayData = monthlyData.data.find(day => {
      const dayDate = new Date(parseInt(day.date.timestamp) * 1000);
      return dayDate.toDateString() === targetDate.toDateString();
    });

    return dayData || null;
  }

  /**
   * Get today's prayer times by city
   */
  static async getTodaysPrayerTimesByCity(
    city: string,
    country: string,
    method: number = 1,
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<AladhanPrayerTime> {
    let url = `${API_BASE}/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
    if (school !== undefined) {
      url += `&school=${school}`;
    }

    try {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.code !== 200) {
        throw new Error(`API Error: ${result.status}`);
      }

      return result.data.timings;
    } catch (error) {
      // API fetch failed for city timings, wrap with helpful context
      throw new Error(`Failed to fetch prayer times for ${city}: ${error instanceof Error ? error.message : 'Network error'}`);
    }
  }

  /**
   * Get today's prayer times with fallback to offline calculation
   */
  static async getTodaysPrayerTimes(
    latitude: number,
    longitude: number,
    method?: number,
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<{ timings: AladhanPrayerTime, timezone: string }> {
    const resolvedMethod = method ?? this.getResolvedMethodId();
    const resolvedSchool = school ?? this.getResolvedSchool();
    const hasValidCache = this.isCachedDataValid(latitude, longitude, resolvedSchool, resolvedMethod);

    if (hasValidCache) {
      // Use cached data only, no API call needed
      const cachedDay = this.getPrayerTimesForDate(new Date(), latitude, longitude, resolvedSchool);
      if (cachedDay && cachedDay.timings) {
        return {
          timings: cachedDay.timings,
          timezone: cachedDay.meta?.timezone || 'UTC'
        };
      }
    }

    // Need to fetch - no valid cache available
    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    if (isOnline) {
      try {
        // Fetch fresh data for the month to keep cache updated
        const monthlyData = await this.fetchMonthlyCalendar(latitude, longitude, undefined, undefined, resolvedMethod, resolvedSchool);
        const today = monthlyData.data.find(day => {
          const dayDate = new Date(parseInt(day.date.timestamp) * 1000);
          return dayDate.toDateString() === new Date().toDateString();
        }) || monthlyData.data[0];

        if (today?.timings) {
          return {
            timings: today.timings,
            timezone: today.meta?.timezone || 'UTC'
          };
        }
      } catch (error) {
        console.warn('API fetch failed while online, falling back to cache:', error);
      }
    }

    // Fallback to cache (for offline or failed API fetch)
    const cachedDay = this.getPrayerTimesForDate(new Date(), latitude, longitude, resolvedSchool);
    if (cachedDay && cachedDay.timings) {
      return {
        timings: cachedDay.timings,
        timezone: cachedDay.meta?.timezone || 'UTC'
      };
    }

    // Fallback to offline calculation
    try {
      const { calculatePrayerTimes } = await import('./prayer-calculator');
      const { findNearestOfflineCity } = await import('@/data/cities');
      const nearest = findNearestOfflineCity(latitude, longitude);
      const isSouthAsia = (latitude >= 6 && latitude <= 38 && longitude >= 68 && longitude <= 98);
      const calcMethod = (nearest?.calculationMethod || (isSouthAsia ? 'Karachi' : (resolvedMethod === 1 ? 'Karachi' : undefined))) as any;
      const targetMadhab = resolvedSchool === 1 ? 'hanafi' : 'shafi';
      const times = calculatePrayerTimes(latitude, longitude, new Date(), calcMethod, targetMadhab);
      const timezone = nearest?.timezone || (isSouthAsia ? 'Asia/Kolkata' : Intl.DateTimeFormat().resolvedOptions().timeZone);

      return {
        timings: {
          Fajr: times.fajr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Sunrise: times.sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Dhuhr: times.dhuhr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Asr: times.asr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Maghrib: times.maghrib.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Isha: times.isha.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Imsak: times.fajr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          Midnight: '00:00',
          Firstthird: '00:00',
          Lastthird: '00:00'
        },
        timezone: timezone
      };
    } catch (error) {
      console.error('Offline calculation failed:', error);
      throw new Error('Failed to get prayer times from API, cache, or offline calculation');
    }
  }

  /**
   * Check if cached data is still valid (same month, year, school, and method)
   */
  static isCachedDataValid(latitude?: number, longitude?: number, school?: number, method?: number): boolean {
    const monthlyData = this.getStoredMonthlyData();
    if (!monthlyData) return false;

    const now = new Date();
    const isSameDate = monthlyData.year === now.getFullYear() &&
      monthlyData.month === now.getMonth() + 1;

    if (!isSameDate) return false;

    // Strict school validation: must match expected school (0 Shafi, 1 Hanafi)
    const expectedSchool = school !== undefined ? school : this.getResolvedSchool();
    if (monthlyData.school === undefined || monthlyData.school !== expectedSchool) {
      return false;
    }

    // Method validation: must match expected method
    const expectedMethod = method !== undefined ? method : this.getResolvedMethodId();
    if (monthlyData.method !== undefined && monthlyData.method !== expectedMethod) {
      return false;
    }

    // If coordinates provided, check if they match (with tolerance)
    if (latitude !== undefined && longitude !== undefined) {
      const latDiff = Math.abs(monthlyData.latitude - latitude);
      const lngDiff = Math.abs(monthlyData.longitude - longitude);
      if (latDiff >= 0.1 || lngDiff >= 0.1) return false;
    }

    return true;
  }

  /**
   * Get stored monthly data from localStorage
   */
  static getStoredMonthlyData(): AladhanMonthlyData | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Save monthly data to localStorage
   */
  static saveMonthlyData(data: AladhanMonthlyData): void {
    try {
      // Non-sensitive public astronomical prayer times monthly calculation cache (not user credentials)
      // codeql[js/clear-text-storage-of-sensitive-information] "Non-sensitive public monthly prayer times calculation cache, not user credentials"
      // codeql[js/sensitive-data-in-storage] "Non-sensitive public monthly prayer times calculation cache, not user credentials"
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save monthly data:', error);
    }
  }

  /**
   * Clear cached data
   */
  static clearCachedData(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get Ramadan-specific times (Suhoor/Iftar) for today
   */
  static async getRamadanTimes(
    latitude: number,
    longitude: number,
    method: number = 1,
    school?: number // 0 for Shafi, 1 for Hanafi
  ): Promise<{ suhoor: string; iftar: string } | null> {
    try {
      const { timings } = await this.getTodaysPrayerTimes(latitude, longitude, method);

      return {
        suhoor: timings.Imsak || timings.Fajr,
        iftar: timings.Maghrib
      };
    } catch {
      return null;
    }
  }

  /**
   * Get countdown to next prayer or Ramadan time
   */
  static async getNextEventCountdown(
    latitude: number,
    longitude: number,
    method?: number,
    isRamadan: boolean = false,
    school?: number
  ): Promise<{ name: string; time: string; countdown: string; targetDate?: Date } | null> {
    try {
      const resolvedMethod = method ?? this.getResolvedMethodId();
      const resolvedSchool = school ?? this.getResolvedSchool();
      const { timings: rawTimings } = await this.getTodaysPrayerTimes(latitude, longitude, resolvedMethod, resolvedSchool);
      const offsets = getPrayerMinuteOffsets();
      const timings = applyOffsetsToTimings(rawTimings, offsets);
      const now = new Date();

      // Convert prayer times to Date objects
      const prayerTimes = [
        { name: 'Fajr', time: this.parseTime(timings.Fajr) },
        { name: 'Sunrise', time: this.parseTime(timings.Sunrise) },
        { name: 'Dhuhr', time: this.parseTime(timings.Dhuhr) },
        { name: 'Asr', time: this.parseTime(timings.Asr) },
        { name: 'Maghrib', time: this.parseTime(timings.Maghrib) },
        { name: 'Isha', time: this.parseTime(timings.Isha) }
      ];

      // Add Ramadan times if applicable
      if (isRamadan) {
        prayerTimes.unshift(
          { name: 'Suhoor Ends', time: this.parseTime(timings.Imsak || timings.Fajr) },
          { name: 'Iftar', time: this.parseTime(timings.Maghrib) }
        );
      }

      // Find next event
      for (const prayer of prayerTimes) {
        if (prayer.time > now) {
          const diff = prayer.time.getTime() - now.getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

          return {
            name: prayer.name,
            time: prayer.time.toTimeString().slice(0, 5),
            countdown: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
            targetDate: prayer.time // Return the Date object directly
          };
        }
      }

      // If all events passed, get tomorrow's first prayer
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const { timings: rawTomorrowTimings } = await this.getTodaysPrayerTimes(latitude, longitude, method);
      const tomorrowTimings = applyOffsetsToTimings(rawTomorrowTimings, offsets);
      const firstPrayerTime = this.parseTime(tomorrowTimings.Fajr);
      // Adjust date to tomorrow
      firstPrayerTime.setDate(tomorrow.getDate());
      firstPrayerTime.setMonth(tomorrow.getMonth());
      firstPrayerTime.setFullYear(tomorrow.getFullYear());

      const diff = firstPrayerTime.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      return {
        name: 'Fajr (Tomorrow)',
        time: firstPrayerTime.toTimeString().slice(0, 5),
        countdown: `${hours}h ${minutes}m`,
        targetDate: firstPrayerTime
      };
    } catch {
      // Silently return null on error to let caller fall back to offline calculation
      return null;
    }
  }

  /**
   * Parse time string (HH:MM or "HH:MM (TZ)") to Date object for today
   */
  private static parseTime(timeStr: string): Date {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) {
      throw new Error(`parseTime: invalid time string "${timeStr}"`);
    }
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
