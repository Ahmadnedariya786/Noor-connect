/**
 * widget-service.ts
 *
 * Thin compatibility shim that preserves the old `WidgetService.updateWidget`
 * API but routes everything through the new `WidgetBridge` plugin.
 *
 * Old code calls:
 *   WidgetService.updateWidget(lat, lon, locationName?, prayerTimes?)
 *   WidgetService.startAutoUpdate(lat, lon, locationName?)
 *
 * Under the hood this now:
 *   1. Builds a PrayerPayload from the prayer times
 *   2. Builds a DailyContentPayload from localStorage caches
 *   3. Pushes both to the native widgets via WidgetBridge
 */

import {
  syncPrayerData,
  syncDailyContent,
} from './widgetBridge';
import { calculatePrayerTimes, formatPrayerTime, getCalculationMethod } from './prayer-calculator';
import { getMadhab } from './storage';
import { isNativePlatform } from './capacitor-utils';
import type {
  PrayerPayload,
  PrayerEntry,
  DailyContentPayload,
  AyahContent,
  HadithContent,
} from './widget-types';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function getHijriDateString(): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return fmt.format(new Date());
  } catch {
    return '';
  }
}

function getGregorianDateString(): string {
  try {
    return new Date().toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function getCurrentTimeString(): string {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getCurrentLocale(): string {
  try {
    const stored = localStorage.getItem('app-language') || localStorage.getItem('i18nextLng');
    if (stored) return stored.split('-')[0];
  } catch {}
  return typeof navigator !== 'undefined'
    ? (navigator.language || 'en').split('-')[0]
    : 'en';
}

/**
 * Check if DST (Daylight Saving Time) is currently in effect for the given location
 */
function isDSTInEffect(date: Date, latitude: number, longitude: number): boolean {
  try {
    // Simple DST detection using timezone offset
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    const dstOffset = Math.min(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    
    // If current offset is different from standard offset, DST is in effect
    const currentOffset = date.getTimezoneOffset();
    return currentOffset !== stdOffset;
  } catch {
    return false;
  }
}

/**
 * Get DST offset in hours for the given location and date
 */
function getDSTOffset(date: Date, latitude: number, longitude: number): number {
  if (!isDSTInEffect(date, latitude, longitude)) {
    return 0;
  }
  
  try {
    // Most regions with DST use +1 hour offset
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);
    const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    const currentOffset = date.getTimezoneOffset();
    
    // DST offset is the difference in hours (negative because timezoneOffset is in minutes)
    return (stdOffset - currentOffset) / 60;
  } catch {
    return 1; // Default to 1 hour if detection fails
  }
}

function buildPrayerPayload(
  prayerTimes: any,
  locationLabel: string,
  latitude?: number,
  longitude?: number,
): PrayerPayload | null {
  if (!prayerTimes) return null;
  const now = Date.now();
  const currentDate = new Date(now);

  // Apply DST adjustment if location coordinates are provided
  let dstOffset = 0;
  if (latitude !== undefined && longitude !== undefined) {
    dstOffset = getDSTOffset(currentDate, latitude, longitude);
  }

  const entries: PrayerEntry[] = [
    { name: 'Fajr',    time: prayerTimes.fajr?.getTime()    ?? 0, formattedTime: formatPrayerTime(prayerTimes.fajr)    ?? '--:--' },
    { name: 'Sunrise', time: prayerTimes.sunrise?.getTime() ?? 0, formattedTime: formatPrayerTime(prayerTimes.sunrise) ?? '--:--' },
    { name: 'Dhuhr',   time: prayerTimes.dhuhr?.getTime()   ?? 0, formattedTime: formatPrayerTime(prayerTimes.dhuhr)   ?? '--:--' },
    { name: 'Asr',     time: prayerTimes.asr?.getTime()     ?? 0, formattedTime: formatPrayerTime(prayerTimes.asr)     ?? '--:--' },
    { name: 'Maghrib', time: prayerTimes.maghrib?.getTime() ?? 0, formattedTime: formatPrayerTime(prayerTimes.maghrib) ?? '--:--' },
    { name: 'Isha',    time: prayerTimes.isha?.getTime()    ?? 0, formattedTime: formatPrayerTime(prayerTimes.isha)    ?? '--:--' },
  ].filter(e => e.time > 0);

  // Apply DST offset to prayer times if needed
  if (dstOffset !== 0) {
    const dstOffsetMs = dstOffset * 60 * 60 * 1000; // Convert hours to milliseconds
    entries.forEach(entry => {
      entry.time += dstOffsetMs;
      // Update formatted time to reflect DST adjustment
      const adjustedDate = new Date(entry.time);
      entry.formattedTime = adjustedDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    });
  }

  if (entries.length === 0) return null;

  // Find the next upcoming prayer. If all of today's prayers are in the past
  // (e.g. after Isha), wrap to the first prayer of tomorrow and roll its time
  // forward by 24h so the native widget's countdown shows a future target.
  let nextPrayerIndex = 0;
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].time > now) {
      nextPrayerIndex = i;
      break;
    }
  }
  // Loop completed without finding a future prayer -> all passed for today.
  if (entries.length > 0 && entries[nextPrayerIndex].time <= now) {
    nextPrayerIndex = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      entry.time += oneDayMs;
    }
  }

  const madhab = (() => {
    try {
      const m = getMadhab?.();
      if (m === 'shafi') return 'SHAFI';
      if (m === 'hanafi') return 'HANAFI';
    } catch {}
    return 'HANAFI';
  })();

  let calculationMethod: string;
  try {
    calculationMethod = getCalculationMethod?.() ?? 'MuslimWorldLeague';
  } catch {
    calculationMethod = 'MuslimWorldLeague';
  }

  return {
    prayers: entries,
    nextPrayerIndex,
    hijriDate: getHijriDateString(),
    gregorianDate: getGregorianDateString(),
    locationLabel,
    madhab: madhab as 'HANAFI' | 'SHAFI',
    calculationMethod,
    currentTime24h: getCurrentTimeString(),
    lastUpdated: now,
    dstOffset: dstOffset, // Include DST offset in payload
  };
}

function getStoredQuranVerse(): AyahContent | null {
  try {
    const raw = localStorage.getItem('daily-ayah-cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const arabic = parsed.arabic || parsed.text_arabic || parsed.textArabic || '';
    const translation = parsed.translation || parsed.englishTranslation || '';
    const transliteration = parsed.translit || parsed.transliteration || '';
    const reference = parsed.reference || parsed.ref || '';
    const surahNumber = parsed.surahNumber || parsed.surah_number || 1;
    const ayahNumber = parsed.ayahNumber || parsed.ayah_number || 1;
    if (!arabic && !translation) return null;
    return { arabic, translation, transliteration, reference, surahNumber, ayahNumber, lastUpdated: parsed.lastUpdated || Date.now() };
  } catch {
    return null;
  }
}

function getStoredHadith(): HadithContent | null {
  try {
    const raw = localStorage.getItem('daily-hadith-cache');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      arabic:      parsed.arabic ?? '',
      translation: parsed.englishTranslation || parsed.translation || '',
      narrator:    parsed.narrator ?? '',
      source:      parsed.source ?? '',
      grade:       parsed.grade || 'Sahih',
      collection:  parsed.collection ?? 'bukhari',
      bookNumber:  Number(parsed.bookNumber ?? 0),
      hadithNumber: Number(parsed.hadithNumber ?? 0),
      lastUpdated: parsed.lastUpdated || Date.now(),
    };
  } catch {
    return null;
  }
}

function buildDailyContentPayload(): DailyContentPayload | null {
  const ayah = getStoredQuranVerse();
  if (!ayah) return null;
  const hadith = getStoredHadith() ?? {
    arabic: '',
    translation: '',
    narrator: '',
    source: '',
    grade: 'Sahih',
    collection: 'bukhari',
    bookNumber: 0,
    hadithNumber: 0,
    lastUpdated: Date.now(),
  };
  return { ayah, hadith, locale: getCurrentLocale(), lastUpdated: Date.now() };
}

// ─────────────────────────────────────────────────────────
// Public service class
// ─────────────────────────────────────────────────────────

export class WidgetService {
  /**
   * Full widget update — pushes prayer + daily content to all native widgets.
   * No-op on web.
   */
  static async updateWidget(
    latitude: number,
    longitude: number,
    locationName?: string,
    prayerTimes?: any,
  ): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const times = prayerTimes || calculatePrayerTimes(latitude, longitude, new Date());

      const locationLabel = locationName || 'Unknown location';

      // 1. Push prayer data with DST handling
      const prayerPayload = buildPrayerPayload(times, locationLabel, latitude, longitude);
      if (prayerPayload) {
        await syncPrayerData(prayerPayload);
      }

      // 2. Push daily content (ayah + hadith)
      const dailyPayload = buildDailyContentPayload();
      if (dailyPayload) {
        await syncDailyContent(dailyPayload);
      }
    } catch (err) {
      console.warn('[WidgetService] updateWidget failed:', err);
      // Handle storage quota errors
      if (err instanceof Error && err.message.includes('quota')) {
        console.warn('[WidgetService] Storage quota exceeded, attempting cleanup');
        try {
          const allKeys = Object.keys(localStorage);
          const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
          allKeys.forEach(k => {
            try {
              const item = localStorage.getItem(k);
              if (item) {
                const parsed = JSON.parse(item);
                if (parsed.timestamp && parsed.timestamp < thirtyDaysAgo) {
                  localStorage.removeItem(k);
                }
              }
            } catch {
              localStorage.removeItem(k);
            }
          });
        } catch (cleanupError) {
          console.error('[WidgetService] Cleanup failed:', cleanupError);
        }
      }
    }
  }

  /**
   * Start the 30-minute auto-update timer.
   * Returns the interval ID for cleanup.
   */
  static startAutoUpdate(
    latitude: number,
    longitude: number,
    locationName?: string,
  ): ReturnType<typeof setInterval> {
    WidgetService.updateWidget(latitude, longitude, locationName).catch(() => {});
    return setInterval(
      () => WidgetService.updateWidget(latitude, longitude, locationName).catch(() => {}),
      30 * 60 * 1000,
    );
  }
}
