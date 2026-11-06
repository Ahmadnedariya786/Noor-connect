/**
 * Nafl (Mustahabb / Sunnah) Prayer Time Calculator
 * Noor Connect — Privacy-First Islamic Companion
 *
 * Calculates the exact Start and End Time windows for the three highly rewarded Nafl prayers:
 *  1. Ishraq (صلاة الإشراق):
 *     - Start: Sunrise + 15 min (immediately when Tulu' Makruh window ends)
 *     - End: Sunrise + 45 min
 *     - Rak'aat & Virtue: "2–4 Rak'at Nafl • Reward of complete Hajj & Umrah (Tirmidhi 586)"
 *
 *  2. Chasht / Duha (صلاة الضحى / چاشت):
 *     - Start: Sunrise + 45 min
 *     - End: Dhuhr - 10 min (until Zawal / Istiwa Makruh window begins)
 *     - Rak'aat & Virtue: "2–12 Rak'at Nafl • Charity for all 360 joints of the body (Muslim 720)"
 *
 *  3. Awwabin (صلاة الأوابين / اوابین):
 *     - Start: Maghrib + 15 min (after Maghrib Fard & 2 Sunnah)
 *     - End: Isha start time
 *     - Rak'aat & Virtue: "6–20 Rak'at Nafl • Reward of 12 years of worship (Tirmidhi 435)"
 */

import { parseTimeToSeconds, formatSecondsToTime, formatCountdownRemaining } from './makruh-times';

export type NaflPrayerId = 'ishraq' | 'chasht' | 'awwabin';

export interface NaflPrayerInfo {
  id: NaflPrayerId;
  name: string;
  arabicName: string;
  urduName: string;
  displayTitle: string;
  rakaat: string;
  virtue: string;
  hadithRef: string;
  icon: string;
  start: Date;
  end: Date;
  startSecondsOfDay: number;
  endSecondsOfDay: number;
  startFormatted: string;
  endFormatted: string;
  windowFormatted: string;
  isActiveNow: boolean;
  remainingSeconds: number;
  remainingFormatted: string;
}

export interface NaflState {
  hasActiveNafl: boolean;
  activeNafl: NaflPrayerInfo | null;
  prayers: NaflPrayerInfo[];
}

export type NaflPrayerInput =
  | { Sunrise?: string | Date; Dhuhr?: string | Date; Maghrib?: string | Date; Isha?: string | Date; [key: string]: unknown }
  | Array<{ name?: string; originalName?: string; time?: string; date?: Date }>;

function createDateFromSeconds(baseDate: Date, seconds: number): Date {
  const normSec = ((seconds % 86400) + 86400) % 86400;
  const d = new Date(baseDate.getTime());
  const hours = Math.floor(normSec / 3600);
  const minutes = Math.floor((normSec % 3600) / 60);
  const secs = normSec % 60;
  d.setHours(hours, minutes, secs, 0);
  return d;
}

function formatNaflRemaining(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return '0m 00s';
  const hrs = Math.floor(remainingSeconds / 3600);
  const mins = Math.floor((remainingSeconds % 3600) / 60);
  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return formatCountdownRemaining(remainingSeconds);
}

/**
 * Calculates start, end, and active status for Ishraq, Chasht (Duha), and Awwabin nafl prayers.
 */
export function evaluateNaflPrayers(
  prayerInput: NaflPrayerInput,
  nowDate: Date = new Date(),
  timeFormat: '12h' | '24h' = '12h'
): NaflState {
  let sunriseVal: string | Date | undefined;
  let dhuhrVal: string | Date | undefined;
  let maghribVal: string | Date | undefined;
  let ishaVal: string | Date | undefined;

  if (Array.isArray(prayerInput)) {
    for (const item of prayerInput) {
      const lower = (item.originalName || item.name || '').toLowerCase();
      if (lower === 'sunrise') sunriseVal = item.date || item.time;
      if (lower === 'dhuhr' || lower === 'jummah') dhuhrVal = item.date || item.time;
      if (lower === 'maghrib') maghribVal = item.date || item.time;
      if (lower === 'isha') ishaVal = item.date || item.time;
    }
  } else if (prayerInput && typeof prayerInput === 'object') {
    sunriseVal = prayerInput.Sunrise || (prayerInput as Record<string, unknown>).sunrise as string | Date;
    dhuhrVal = prayerInput.Dhuhr || (prayerInput as Record<string, unknown>).dhuhr as string | Date;
    maghribVal = prayerInput.Maghrib || (prayerInput as Record<string, unknown>).maghrib as string | Date;
    ishaVal = prayerInput.Isha || (prayerInput as Record<string, unknown>).isha as string | Date;
  }

  const sunriseSec = parseTimeToSeconds(sunriseVal);
  const dhuhrSec = parseTimeToSeconds(dhuhrVal);
  const maghribSec = parseTimeToSeconds(maghribVal);
  const ishaSec = parseTimeToSeconds(ishaVal);

  const nowSec = nowDate.getHours() * 3600 + nowDate.getMinutes() * 60 + nowDate.getSeconds();
  const prayers: NaflPrayerInfo[] = [];

  // 1. Ishraq (صلاة الإشراق): [Sunrise + 15 min, Sunrise + 45 min)
  if (sunriseSec !== null) {
    const startSec = sunriseSec + 15 * 60;
    const endSec = sunriseSec + 45 * 60;
    const isActive = nowSec >= startSec && nowSec < endSec;
    const remaining = isActive ? endSec - nowSec : 0;
    const startFmt = formatSecondsToTime(startSec, timeFormat);
    const endFmt = formatSecondsToTime(endSec, timeFormat);

    prayers.push({
      id: 'ishraq',
      name: 'Ishraq',
      arabicName: 'صلاة الإشراق',
      urduName: 'نماز اشراق',
      displayTitle: 'Ishraq • الإشراق',
      rakaat: "2–4 Rak'at",
      virtue: "2–4 Rak'at Nafl • Reward of complete Hajj & Umrah (Tirmidhi 586)",
      hadithRef: 'Tirmidhi 586',
      icon: '☀️',
      start: createDateFromSeconds(nowDate, startSec),
      end: createDateFromSeconds(nowDate, endSec),
      startSecondsOfDay: startSec,
      endSecondsOfDay: endSec,
      startFormatted: startFmt,
      endFormatted: endFmt,
      windowFormatted: `${startFmt} – ${endFmt}`,
      isActiveNow: isActive,
      remainingSeconds: remaining,
      remainingFormatted: formatNaflRemaining(remaining),
    });
  }

  // 2. Chasht / Duha (صلاة الضحى / چاشت): [Sunrise + 45 min, Dhuhr - 10 min)
  if (sunriseSec !== null && dhuhrSec !== null) {
    const startSec = sunriseSec + 45 * 60;
    const endSec = dhuhrSec - 10 * 60;
    const isActive = nowSec >= startSec && nowSec < endSec;
    const remaining = isActive ? endSec - nowSec : 0;
    const startFmt = formatSecondsToTime(startSec, timeFormat);
    const endFmt = formatSecondsToTime(endSec, timeFormat);

    prayers.push({
      id: 'chasht',
      name: 'Chasht (Duha)',
      arabicName: 'صلاة الضحى',
      urduName: 'نماز چاشت',
      displayTitle: 'Chasht (Duha) • الضحى',
      rakaat: "2–12 Rak'at",
      virtue: "2–12 Rak'at Nafl • Charity for all 360 joints of the body (Muslim 720)",
      hadithRef: 'Muslim 720',
      icon: '🌤️',
      start: createDateFromSeconds(nowDate, startSec),
      end: createDateFromSeconds(nowDate, endSec),
      startSecondsOfDay: startSec,
      endSecondsOfDay: endSec,
      startFormatted: startFmt,
      endFormatted: endFmt,
      windowFormatted: `${startFmt} – ${endFmt}`,
      isActiveNow: isActive,
      remainingSeconds: remaining,
      remainingFormatted: formatNaflRemaining(remaining),
    });
  }

  // 3. Awwabin (صلاة الأوابين / اوابین): [Maghrib + 15 min, Isha)
  if (maghribSec !== null && ishaSec !== null) {
    const startSec = maghribSec + 15 * 60;
    const endSec = ishaSec;
    const isActive = nowSec >= startSec && nowSec < endSec;
    const remaining = isActive ? endSec - nowSec : 0;
    const startFmt = formatSecondsToTime(startSec, timeFormat);
    const endFmt = formatSecondsToTime(endSec, timeFormat);

    prayers.push({
      id: 'awwabin',
      name: 'Awwabin',
      arabicName: 'صلاة الأوابين',
      urduName: 'نماز اوابین',
      displayTitle: 'Awwabin • الأوابين',
      rakaat: "6–20 Rak'at",
      virtue: "6–20 Rak'at Nafl • Reward of 12 years of worship (Tirmidhi 435)",
      hadithRef: 'Tirmidhi 435',
      icon: '🌙',
      start: createDateFromSeconds(nowDate, startSec),
      end: createDateFromSeconds(nowDate, endSec),
      startSecondsOfDay: startSec,
      endSecondsOfDay: endSec,
      startFormatted: startFmt,
      endFormatted: endFmt,
      windowFormatted: `${startFmt} – ${endFmt}`,
      isActiveNow: isActive,
      remainingSeconds: remaining,
      remainingFormatted: formatNaflRemaining(remaining),
    });
  }

  const activeNafl = prayers.find((p) => p.isActiveNow) || null;

  return {
    hasActiveNafl: Boolean(activeNafl),
    activeNafl,
    prayers,
  };
}
