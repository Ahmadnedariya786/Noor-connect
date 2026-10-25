/**
 * Unified Worship, Sunnah & Fasting Journal Storage & Sync Module
 * Single Source of Truth: Reuses 'salah-tracker', 'qaza-prayers', and 'salah-streak'
 * Provides 100% bidirectional sync with Home Dashboard and native widgets.
 */

import { type PrayerName } from './salah-tracker';
import { getQazaPrayers, addQazaPrayer, completeQazaPrayer, addQazaHistoryEntry, getQazaStats } from './qaza-tracker';
import { OnlinePrayerAPI, onlinePrayerApi, type LiveDaySchedule } from './online-prayer-api';
import { getPrayerMinuteOffsets, applyOffsetsToTimings } from './prayer-offsets';
import { calculatePrayerTimes } from './prayer-calculator';

export type { PrayerName };

export type PrayerStatus = 'ontime' | 'late' | 'missed' | 'makeup' | 'none';
export type FastCategory = 'sunnah' | 'ramadan' | 'qaza' | 'nafl';

export interface SunnahRawatibState {
  fajr: number;    // 0 or 2
  dhuhr: number;   // 0, 2, 4, 6
  asr: number;     // 0
  maghrib: number; // 0 or 2
  isha: number;    // 0 or 2
}

export interface DayWorshipLog {
  date: string; // YYYY-MM-DD
  // Fard boolean sync with Home Dashboard and legacy salah-tracker
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
  // Granular prayer statuses
  statuses: Record<PrayerName, PrayerStatus>;
  // Sunnah Rawatib counts
  sunnah: SunnahRawatibState;
  // Night Worship
  witr: boolean;
  qiyam: number; // rak'ats in steps of 2
  // Fasting
  fasted: boolean;
  fastType?: FastCategory;
}

export interface WorshipKPIs {
  onTimeStreak: number;
  sunnahKeptPercent: number;
  fastedDaysThisMonth: number;
  qazaOwedTotal: number;
}

export interface HeatmapDayCell {
  date: string; // YYYY-MM-DD
  dateObj: Date;
  dayOfWeek: number; // 0 (Mon) to 6 (Sun)
  completedCount: number; // 0 to 5
  fasted: boolean;
  isToday: boolean;
  monthName?: string;
}

const SALAH_STORAGE_KEY = 'salah-tracker';
const SALAH_STREAK_KEY = 'salah-streak';

export const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Read raw all-days record from localStorage ('salah-tracker')
 */
export const getRawWorshipDays = (): Record<string, any> => {
  try {
    const raw = localStorage.getItem(SALAH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // Return empty dictionary on storage parse failure
    return {};
  }
};

/**
 * Save raw all-days record to localStorage ('salah-tracker')
 * Dispatches 'salah-updated' for instant UI sync with Home Dashboard.
 */
export const saveRawWorshipDays = (days: Record<string, any>): void => {
  try {
    localStorage.setItem(SALAH_STORAGE_KEY, JSON.stringify(days));
  } catch {
    // Storage quota fallback
  }
  window.dispatchEvent(new CustomEvent('salah-updated'));
};

/**
 * Normalize and read DayWorshipLog for any given date string (YYYY-MM-DD)
 */
export const getDayWorshipLog = (dateKey: string): DayWorshipLog => {
  const days = getRawWorshipDays();
  const raw = days[dateKey] || {};

  const fFajr = Boolean(raw.fajr);
  const fDhuhr = Boolean(raw.dhuhr);
  const fAsr = Boolean(raw.asr);
  const fMaghrib = Boolean(raw.maghrib);
  const fIsha = Boolean(raw.isha);

  const rawStatuses = raw.statuses || {};

  // Bidirectional resolution: if boolean is true but status is none/missing, default to 'ontime'
  const statuses: Record<PrayerName, PrayerStatus> = {
    fajr: rawStatuses.fajr || (fFajr ? 'ontime' : 'none'),
    dhuhr: rawStatuses.dhuhr || (fDhuhr ? 'ontime' : 'none'),
    asr: rawStatuses.asr || (fAsr ? 'ontime' : 'none'),
    maghrib: rawStatuses.maghrib || (fMaghrib ? 'ontime' : 'none'),
    isha: rawStatuses.isha || (fIsha ? 'ontime' : 'none'),
  };

  const rawSunnah = raw.sunnah || {};
  const sunnah: SunnahRawatibState = {
    fajr: typeof rawSunnah.fajr === 'number' ? rawSunnah.fajr : 0,
    dhuhr: typeof rawSunnah.dhuhr === 'number' ? rawSunnah.dhuhr : 0,
    asr: typeof rawSunnah.asr === 'number' ? rawSunnah.asr : 0,
    maghrib: typeof rawSunnah.maghrib === 'number' ? rawSunnah.maghrib : 0,
    isha: typeof rawSunnah.isha === 'number' ? rawSunnah.isha : 0,
  };

  return {
    date: dateKey,
    fajr: fFajr,
    dhuhr: fDhuhr,
    asr: fAsr,
    maghrib: fMaghrib,
    isha: fIsha,
    statuses,
    sunnah,
    witr: Boolean(raw.witr),
    qiyam: typeof raw.qiyam === 'number' ? raw.qiyam : 0,
    fasted: Boolean(raw.fasted),
    fastType: raw.fastType || (raw.fasted ? 'sunnah' : undefined),
  };
};

/**
 * Update prayer status for a specific prayer on a specific date.
 * Handles Qaza +1 / -1 transition rules cleanly without double counting.
 */
export const updatePrayerStatus = (
  dateKey: string,
  prayer: PrayerName,
  newStatus: PrayerStatus
): DayWorshipLog => {
  const days = getRawWorshipDays();
  const current = getDayWorshipLog(dateKey);
  const prevStatus = current.statuses[prayer] || 'none';

  // Toggle back to unlogged if user taps the currently active status
  const resolvedStatus: PrayerStatus = (prevStatus === newStatus) ? 'none' : newStatus;

  // Qaza Transitions
  if (resolvedStatus === 'missed' && prevStatus !== 'missed') {
    // User marks Missed -> increment Qaza pending (+1)
    addQazaPrayer(prayer, 1);
  } else if (prevStatus === 'missed' && resolvedStatus !== 'missed') {
    // User changed mind from Missed -> decrement pending Qaza (-1, floor 0)
    completeQazaPrayer(prayer, 1);
  }

  if (resolvedStatus === 'makeup' && prevStatus !== 'makeup') {
    // User completed a makeup prayer -> decrement pending Qaza (-1, floor 0) & log history
    completeQazaPrayer(prayer, 1);
    addQazaHistoryEntry(prayer);
  }

  // Determine boolean completed state for Home Dashboard
  const isCompleted = (resolvedStatus === 'ontime' || resolvedStatus === 'late' || resolvedStatus === 'makeup');

  const updatedLog: DayWorshipLog = {
    ...current,
    [prayer]: isCompleted,
    statuses: {
      ...current.statuses,
      [prayer]: resolvedStatus,
    },
  };

  days[dateKey] = {
    ...days[dateKey],
    date: dateKey,
    fajr: updatedLog.fajr,
    dhuhr: updatedLog.dhuhr,
    asr: updatedLog.asr,
    maghrib: updatedLog.maghrib,
    isha: updatedLog.isha,
    statuses: updatedLog.statuses,
    sunnah: updatedLog.sunnah,
    witr: updatedLog.witr,
    qiyam: updatedLog.qiyam,
    fasted: updatedLog.fasted,
    fastType: updatedLog.fastType,
  };

  saveRawWorshipDays(days);
  return updatedLog;
};

/**
 * Cycle Sunnah Rawatib count for a prayer:
 * Fajr: 0 -> 2 -> 0
 * Dhuhr: 0 -> 2 -> 4 -> 6 -> 0
 * Maghrib: 0 -> 2 -> 0
 * Isha: 0 -> 2 -> 0
 */
export const cycleSunnahRawatib = (dateKey: string, prayer: PrayerName): DayWorshipLog => {
  const days = getRawWorshipDays();
  const current = getDayWorshipLog(dateKey);
  const currentCount = current.sunnah[prayer] || 0;

  let nextCount = 0;
  if (prayer === 'fajr' || prayer === 'maghrib' || prayer === 'isha') {
    nextCount = currentCount === 0 ? 2 : 0;
  } else if (prayer === 'dhuhr') {
    if (currentCount === 0) nextCount = 2;
    else if (currentCount === 2) nextCount = 4;
    else if (currentCount === 4) nextCount = 6;
    else nextCount = 0;
  }

  const updatedSunnah = {
    ...current.sunnah,
    [prayer]: nextCount,
  };

  const updatedLog: DayWorshipLog = {
    ...current,
    sunnah: updatedSunnah,
  };

  days[dateKey] = {
    ...days[dateKey],
    ...updatedLog,
  };

  saveRawWorshipDays(days);
  return updatedLog;
};

/**
 * Toggle Night Worship (Witr / Qiyam)
 */
export const updateNightWorship = (
  dateKey: string,
  updates: { witr?: boolean; qiyamDelta?: number }
): DayWorshipLog => {
  const days = getRawWorshipDays();
  const current = getDayWorshipLog(dateKey);

  let newWitr = current.witr;
  if (typeof updates.witr === 'boolean') {
    newWitr = updates.witr;
  }

  let newQiyam = current.qiyam;
  if (typeof updates.qiyamDelta === 'number') {
    newQiyam = Math.max(0, newQiyam + updates.qiyamDelta);
  }

  const updatedLog: DayWorshipLog = {
    ...current,
    witr: newWitr,
    qiyam: newQiyam,
  };

  days[dateKey] = {
    ...days[dateKey],
    ...updatedLog,
  };

  saveRawWorshipDays(days);
  return updatedLog;
};

/**
 * Toggle Fasting Status & Category
 */
export const toggleFastingStatus = (
  dateKey: string,
  category: FastCategory = 'sunnah'
): DayWorshipLog => {
  const days = getRawWorshipDays();
  const current = getDayWorshipLog(dateKey);

  const newFasted = !current.fasted;
  const updatedLog: DayWorshipLog = {
    ...current,
    fasted: newFasted,
    fastType: newFasted ? category : undefined,
  };

  days[dateKey] = {
    ...days[dateKey],
    ...updatedLog,
  };

  saveRawWorshipDays(days);
  return updatedLog;
};

/**
 * Auto-detect recommended fasts for any Gregorian/Hijri date
 */
export const getRecommendedFast = (
  date: Date,
  hijriDay?: number,
  hijriMonth?: number
): { isRecommended: boolean; label: string; defaultCategory: FastCategory } => {
  const dayOfWeek = date.getDay(); // 0 = Sun, 1 = Mon, ..., 4 = Thu

  // Ramadan (Month 9)
  if (hijriMonth === 9) {
    return { isRecommended: true, label: 'Ramadan Obligatory Fast', defaultCategory: 'ramadan' };
  }

  // Day of Arafah (9 Dhul Hijjah - Month 12)
  if (hijriMonth === 12 && hijriDay === 9) {
    return { isRecommended: true, label: 'Day of Arafah Sunnah Fast', defaultCategory: 'sunnah' };
  }

  // Ashura & Tasu'a (9, 10 Muharram - Month 1)
  if (hijriMonth === 1 && (hijriDay === 9 || hijriDay === 10)) {
    return {
      isRecommended: true,
      label: hijriDay === 10 ? 'Ashura Sunnah Fast (10th Muharram)' : "Tasu'a Sunnah Fast (9th Muharram)",
      defaultCategory: 'sunnah',
    };
  }

  // Ayyam al-Beed (13, 14, 15 Hijri)
  if (hijriDay === 13 || hijriDay === 14 || hijriDay === 15) {
    return { isRecommended: true, label: `Ayyam al-Beed (${hijriDay}th Hijri) Sunnah Fast`, defaultCategory: 'sunnah' };
  }

  // Shawwal 6 Fasts (Month 10, days 2..30)
  if (hijriMonth === 10 && hijriDay && hijriDay > 1) {
    return { isRecommended: true, label: 'Shawwal 6 Sunnah Fast', defaultCategory: 'sunnah' };
  }

  // Monday & Thursday Weekly Sunnah Fasts
  if (dayOfWeek === 1) {
    return { isRecommended: true, label: 'Monday Sunnah Fast', defaultCategory: 'sunnah' };
  }
  if (dayOfWeek === 4) {
    return { isRecommended: true, label: 'Thursday Sunnah Fast', defaultCategory: 'sunnah' };
  }

  return { isRecommended: false, label: 'Voluntary (Nafl) Fast', defaultCategory: 'nafl' };
};

/**
 * Top 4 Worship KPIs
 */
export const getWorshipKPIs = (): WorshipKPIs => {
  const days = getRawWorshipDays();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. On-time streak
  let onTimeStreak = 0;
  const streakCursor = new Date(now);
  while (true) {
    const key = formatDateKey(streakCursor);
    const day = days[key];
    if (!day) break;

    const fComplete = (day.statuses?.fajr === 'ontime' || day.fajr);
    const dComplete = (day.statuses?.dhuhr === 'ontime' || day.dhuhr);
    const aComplete = (day.statuses?.asr === 'ontime' || day.asr);
    const mComplete = (day.statuses?.maghrib === 'ontime' || day.maghrib);
    const iComplete = (day.statuses?.isha === 'ontime' || day.isha);

    if (fComplete && dComplete && aComplete && mComplete && iComplete) {
      onTimeStreak++;
      streakCursor.setDate(streakCursor.getDate() - 1);
    } else {
      break;
    }
  }

  // 2. Sunnah Rawatib Kept % This Month (12 per day = 2 Fajr + 6 Dhuhr + 2 Maghrib + 2 Isha)
  let totalSunnahKept = 0;
  let daysInMonthCount = now.getDate(); // elapsed days in month

  for (let d = 1; d <= daysInMonthCount; d++) {
    const checkDate = new Date(currentYear, currentMonth, d);
    const key = formatDateKey(checkDate);
    const log = days[key];
    if (log && log.sunnah) {
      totalSunnahKept += (log.sunnah.fajr || 0) + (log.sunnah.dhuhr || 0) + (log.sunnah.maghrib || 0) + (log.sunnah.isha || 0);
    }
  }

  const maxPossibleSunnah = daysInMonthCount * 12;
  const sunnahKeptPercent = maxPossibleSunnah > 0 ? Math.min(100, Math.round((totalSunnahKept / maxPossibleSunnah) * 100)) : 0;

  // 3. Fasted Days This Month
  let fastedDaysThisMonth = 0;
  for (let d = 1; d <= 31; d++) {
    const checkDate = new Date(currentYear, currentMonth, d);
    if (checkDate.getMonth() !== currentMonth) break;
    const key = formatDateKey(checkDate);
    if (days[key]?.fasted) {
      fastedDaysThisMonth++;
    }
  }

  // 4. Qaza Owed Total
  const qStats = getQazaStats();
  const qazaOwedTotal = qStats.total;

  return {
    onTimeStreak,
    sunnahKeptPercent,
    fastedDaysThisMonth,
    qazaOwedTotal,
  };
};

/**
 * 3-Month Consistency Heatmap Matrix
 * 13 weeks x 7 days = 91 days ending on the end of current week
 */
export const get3MonthHeatmapData = (): HeatmapDayCell[] => {
  const days = getRawWorshipDays();
  const today = new Date();
  const todayKey = formatDateKey(today);

  // Align to end of current week (Sunday)
  // JS getDay(): 0 is Sun, 1 is Mon, 6 is Sat
  const dayOfWeek = today.getDay(); // 0..6
  const daysToSunday = (7 - dayOfWeek) % 7;
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + daysToSunday);

  const totalCells = 91; // 13 weeks * 7 days
  const cells: HeatmapDayCell[] = [];

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let i = totalCells - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(endDate.getDate() - i);
    const key = formatDateKey(d);
    const log = days[key];

    let completed = 0;
    if (log) {
      if (log.fajr) completed++;
      if (log.dhuhr) completed++;
      if (log.asr) completed++;
      if (log.maghrib) completed++;
      if (log.isha) completed++;
    }

    // Convert JS day (0=Sun, 1=Mon...6=Sat) to Mon=0..Sun=6
    const mappedDay = (d.getDay() + 6) % 7;

    const cell: HeatmapDayCell = {
      date: key,
      dateObj: d,
      dayOfWeek: mappedDay,
      completedCount: completed,
      fasted: Boolean(log?.fasted),
      isToday: key === todayKey,
      monthName: d.getDate() === 1 ? monthNames[d.getMonth()] : undefined,
    };

    cells.push(cell);
  }

  return cells;
};

/**
 * Resolve online-first prayer times with offline fallback for any selected date
 */
export const getPrayerTimesForDate = async (
  date: Date,
  lat: number,
  lon: number
): Promise<{ schedule: LiveDaySchedule; isOfflineTimes: boolean }> => {
  try {
    const schedule = await onlinePrayerApi.getDaySchedule(date, lat, lon);
    return {
      schedule,
      isOfflineTimes: !schedule.isOnlineSource,
    };
  } catch (error) {
    // Fallback silently to offline-computed astronomical times with active offsets
    const offsets = getPrayerMinuteOffsets();
    const offlineCalc = calculatePrayerTimes(lat, lon, date);
    const formatTime = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

    const rawTimings = {
      Fajr: formatTime(offlineCalc.fajr),
      Sunrise: formatTime(offlineCalc.sunrise),
      Dhuhr: formatTime(offlineCalc.dhuhr),
      Asr: formatTime(offlineCalc.asr),
      Maghrib: formatTime(offlineCalc.maghrib),
      Isha: formatTime(offlineCalc.isha),
      Imsak: formatTime(offlineCalc.fajr),
      Midnight: '00:00',
      Firstthird: '21:30',
      Lastthird: '02:30',
    };

    const adjustedTimings = applyOffsetsToTimings(rawTimings, offsets);

    const fallbackSchedule: LiveDaySchedule = {
      date: {
        readable: date.toLocaleDateString(),
        timestamp: String(Math.floor(date.getTime() / 1000)),
        gregorian: {
          date: formatDateKey(date),
          format: 'DD-MM-YYYY',
          day: String(date.getDate()),
          weekday: { en: date.toLocaleDateString('en-US', { weekday: 'long' }) },
          month: { number: date.getMonth() + 1, en: date.toLocaleDateString('en-US', { month: 'long' }) },
          year: String(date.getFullYear()),
          designation: { abbreviated: 'AD', expanded: 'Anno Domini' },
        },
        hijri: {
          date: '01-01-1448',
          format: 'DD-MM-YYYY',
          day: '1',
          weekday: { en: date.toLocaleDateString('en-US', { weekday: 'long' }), ar: '' },
          month: { number: 1, en: 'Muharram', ar: '' },
          year: '1448',
          designation: { abbreviated: 'AH', expanded: 'Anno Hegirae' },
          holidays: [],
        },
      },
      timings: adjustedTimings,
      meta: {
        latitude: lat,
        longitude: lon,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        method: { id: 2, name: 'Local Calculation' },
        school: 'Standard',
      },
      isOnlineSource: false,
    };

    return {
      schedule: fallbackSchedule,
      isOfflineTimes: true,
    };
  }
};
