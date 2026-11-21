import { getMenstrualModeData } from './haidh-tracker';
import { type PrayerName, resolvePrayerTimes, type DailyPrayers } from './salah-tracker';
import { safeSetLocalStorageItem } from './cache-manager';
import { islamicCalendarService } from './islamic-calendar-service';

export type { PrayerName };

export type QazaPrayerName = PrayerName | 'witr';

export const QAZA_STORAGE_KEY = 'qaza-prayers';
export const QAZA_DATE_RECORDS_KEY = 'noor_qaza_date_records_v1';
export const QAZA_UNDATED_BACKLOG_KEY = 'noor_qaza_undated_backlog_v1';
export const QAZA_AUTOSYNC_SLOTS_KEY = 'noor_qaza_autosynced_slots_v1';
export const QAZA_LAST_ROLLOVER_DATE_KEY = 'noor_qaza_last_rollover_date_v1';
export const QAZA_BACKUP_PRE_ROLLOVER_KEY = 'noor_qaza_backup_pre_rollover_v1';
export const QAZA_ROLLOVER_CLEANUP_KEY = 'noor_qaza_cleanup_premature_v2';

/**
 * Builds local YYYY-MM-DD string from local date parts (never UTC toISOString).
 * Protects Indian timezones (00:00 - 05:30) and all international timezones.
 */
export const getLocalDateIso = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getYesterdayIso = (todayIso: string): string => {
  const [y, m, d] = todayIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return getLocalDateIso(date);
};

export const getNextDayIso = (dateIso: string): string => {
  const [y, m, d] = dateIso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return getLocalDateIso(date);
};

export interface DateWiseQazaRecord {
  id: string;
  date: string; // YYYY-MM-DD
  hijriDate?: string;
  prayers: Record<QazaPrayerName, 'pending' | 'completed' | 'none'>;
  note?: string;
  source?: 'auto' | 'manual';
}

/**
 * Qaza (Missed Prayer) Tracker
 * Track prayers that need to be made up
 * All data stored locally with full offline support
 */

const PROCESSED_QAZA_KEY = 'processed-salah-qaza';
const HISTORY_KEY = 'qaza-history';
const GOAL_KEY = 'qaza-daily-goal';

export interface QazaStats {
  total: number;
  byPrayer: Record<QazaPrayerName, number>;
}

// Module-level in-memory cache for fast instant stats returns without repeated JSON parsing
let memoryCachedQazaStats: QazaStats | null = null;
let memoryCachedDateRecords: DateWiseQazaRecord[] | null = null;

export const invalidateQazaMemoryCache = (): void => {
  memoryCachedQazaStats = null;
  memoryCachedDateRecords = null;
};

if (typeof window !== 'undefined') {
  window.addEventListener('qaza-updated', invalidateQazaMemoryCache);
  window.addEventListener('noor-qaza-updated', invalidateQazaMemoryCache);
  window.addEventListener('qaza-date-updated', invalidateQazaMemoryCache);
  window.addEventListener('storage', (e) => {
    if (e.key === QAZA_STORAGE_KEY || e.key === QAZA_DATE_RECORDS_KEY) {
      invalidateQazaMemoryCache();
    }
  });
}

// ── Single-Source-of-Truth Qaza Store (Dated Pending + Undated Backlog) ──

export interface QazaUndoSnapshot {
  id: string;
  timestamp: number;
  prayer: QazaPrayerName;
  source: 'dated' | 'undated';
  date?: string;
}

let activeUndoSnapshot: QazaUndoSnapshot | null = null;

export const setLastQazaUndo = (snapshot: QazaUndoSnapshot): void => {
  activeUndoSnapshot = snapshot;
};

export const getLastQazaUndo = (): QazaUndoSnapshot | null => {
  if (!activeUndoSnapshot) return null;
  if (Date.now() - activeUndoSnapshot.timestamp > 5000) {
    activeUndoSnapshot = null;
    return null;
  }
  return activeUndoSnapshot;
};

export const clearQazaUndo = (): void => {
  activeUndoSnapshot = null;
};

export const performQazaUndo = (): boolean => {
  if (!activeUndoSnapshot) return false;
  const snapshot = activeUndoSnapshot;
  activeUndoSnapshot = null;

  if (snapshot.source === 'dated' && snapshot.date) {
    const records = getDateWiseQazaListInternal();
    let record = records.find((r) => r.date === snapshot.date);
    if (!record) {
      record = {
        id: `qaza_date_${snapshot.date}`,
        date: snapshot.date,
        hijriDate: formatHijriDate(snapshot.date),
        source: 'manual',
        prayers: {
          fajr: 'none',
          dhuhr: 'none',
          asr: 'none',
          maghrib: 'none',
          isha: 'none',
          witr: 'none',
        },
      };
      records.push(record);
    }
    record.prayers[snapshot.prayer] = 'pending';
    saveDateWiseQazaList(records);
  } else {
    const backlog = getUndatedBacklogInternal();
    backlog[snapshot.prayer] = (backlog[snapshot.prayer] || 0) + 1;
    saveUndatedBacklog(backlog);
  }

  // Decrement today's completed history entry
  try {
    const history = getQazaHistory();
    const today = new Date().toDateString();
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].date === today && history[i].prayer === snapshot.prayer) {
        history.splice(i, 1);
        saveQazaHistory(history);
        break;
      }
    }
  } catch {
    // Non-critical history adjustment
  }

  invalidateQazaMemoryCache();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
  return true;
};

/**
 * Reads date records internally without triggering recursive loops.
 */
const getDateWiseQazaListInternal = (): DateWiseQazaRecord[] => {
  if (memoryCachedDateRecords) return memoryCachedDateRecords;
  try {
    const raw = localStorage.getItem(QAZA_DATE_RECORDS_KEY);
    if (!raw) return [];
    const list: DateWiseQazaRecord[] = JSON.parse(raw);
    memoryCachedDateRecords = Array.isArray(list) ? list : [];
    return memoryCachedDateRecords;
  } catch {
    return [];
  }
};

/**
 * Reads undated backlog from storage, or initializes it by migrating legacy counters
 * without sudden count loss or ghost count duplication.
 */
const getUndatedBacklogInternal = (): Record<QazaPrayerName, number> => {
  const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
  try {
    const raw = localStorage.getItem(QAZA_UNDATED_BACKLOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        fajr: Math.max(0, Number(parsed.fajr) || 0),
        dhuhr: Math.max(0, Number(parsed.dhuhr) || 0),
        asr: Math.max(0, Number(parsed.asr) || 0),
        maghrib: Math.max(0, Number(parsed.maghrib) || 0),
        isha: Math.max(0, Number(parsed.isha) || 0),
        witr: Math.max(0, Number(parsed.witr) || 0),
      };
    }
  } catch {
    // Fall through to initial migration
  }

  // Initial migration from legacy QAZA_STORAGE_KEY:
  // undatedBacklog[p] = Math.max(0, legacyCounter[p] - countInDatedPending(p))
  const dateRecords = getDateWiseQazaListInternal();
  let legacyPrayers: Record<string, number> = {};
  try {
    const legacyRaw = localStorage.getItem(QAZA_STORAGE_KEY);
    if (legacyRaw) legacyPrayers = JSON.parse(legacyRaw);
  } catch {
    legacyPrayers = {};
  }

  const backlog: Record<QazaPrayerName, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  };

  for (const p of prayerNames) {
    const pendingInDates = dateRecords.filter((r) => r.prayers && r.prayers[p] === 'pending').length;
    const legacyCount = Math.max(0, Number(legacyPrayers[p]) || 0);
    backlog[p] = Math.max(0, legacyCount - pendingInDates);
  }

  safeSetLocalStorageItem(QAZA_UNDATED_BACKLOG_KEY, JSON.stringify(backlog));
  return backlog;
};

export const getUndatedBacklog = (): Record<QazaPrayerName, number> => {
  return getUndatedBacklogInternal();
};

export const saveUndatedBacklog = (backlog: Record<QazaPrayerName, number>): void => {
  invalidateQazaMemoryCache();
  safeSetLocalStorageItem(QAZA_UNDATED_BACKLOG_KEY, JSON.stringify(backlog));
};

export const countInDatedPending = (prayer: QazaPrayerName): number => {
  const dateRecords = getDateWiseQazaListInternal();
  return dateRecords.filter((r) => r.prayers && r.prayers[prayer] === 'pending').length;
};

export const getUndatedBacklogTotal = (): number => {
  const backlog = getUndatedBacklogInternal();
  return Object.values(backlog).reduce((sum, n) => sum + (Number(n) || 0), 0);
};

export const getUndatedBacklogSummary = (): string => {
  const backlog = getUndatedBacklogInternal();
  const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
  const labels: Record<QazaPrayerName, string> = {
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    witr: 'Witr',
  };
  const parts: string[] = [];
  for (const p of prayerNames) {
    if (backlog[p] > 0) {
      parts.push(`${labels[p]} ×${backlog[p]}`);
    }
  }
  return parts.join(' • ');
};

/**
 * Single Source of Truth:
 * perPrayerTotal[p] = countInDatedPending(p) + undatedBacklog[p]
 * totalPending = sum(perPrayerTotal)
 */
export const getQazaPrayers = (): Record<QazaPrayerName, number> => {
  const backlog = getUndatedBacklogInternal();
  const dateRecords = getDateWiseQazaListInternal();
  const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
  const result: Record<QazaPrayerName, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  };

  for (const p of prayerNames) {
    const pendingInDates = dateRecords.filter((r) => r.prayers && r.prayers[p] === 'pending').length;
    result[p] = (backlog[p] || 0) + pendingInDates;
  }

  // Atomically mirror to legacy storage key for backward compatibility
  safeSetLocalStorageItem(QAZA_STORAGE_KEY, JSON.stringify(result));
  return result;
};

export const reconcileQazaWithDateRecords = (): Record<QazaPrayerName, number> => {
  return getQazaPrayers();
};

const saveQazaPrayers = (prayers: Record<QazaPrayerName, number>): void => {
  invalidateQazaMemoryCache();
  safeSetLocalStorageItem(QAZA_STORAGE_KEY, JSON.stringify(prayers));
};

/**
 * Add Qaza prayer (adds directly to undated backlog)
 */
export const addQazaPrayer = (prayer: QazaPrayerName, count: number = 1): void => {
  const validCount = Math.max(0, Number(count) || 0);
  if (validCount <= 0) return;

  const backlog = getUndatedBacklogInternal();
  backlog[prayer] = (backlog[prayer] || 0) + validCount;
  saveUndatedBacklog(backlog);

  // Sync derived aggregate
  getQazaPrayers();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

/**
 * Complete Qaza prayer (tile tap -1):
 * 1. Checks oldest dated pending entry for this prayer first (if any exists).
 * 2. If found, marks it completed and pushes undo snapshot.
 * 3. If none exists, decrements undatedBacklog[p] and pushes undo snapshot.
 * 4. Increments history log.
 */
export const completeQazaPrayer = (
  prayer: QazaPrayerName,
  count: number = 1,
  options?: { skipDateReconciliation?: boolean }
): void => {
  const validCount = Math.max(1, Number(count) || 1);
  let remaining = validCount;

  if (!options?.skipDateReconciliation) {
    const records = getDateWiseQazaListInternal();
    const sortedOldest = [...records].sort((a, b) => a.date.localeCompare(b.date));
    let dateModified = false;

    for (const r of sortedOldest) {
      if (remaining <= 0) break;
      if (r.prayers && r.prayers[prayer] === 'pending') {
        r.prayers[prayer] = 'completed';
        remaining--;
        dateModified = true;
        setLastQazaUndo({
          id: `undo_${Date.now()}_${Math.random()}`,
          timestamp: Date.now(),
          prayer,
          source: 'dated',
          date: r.date,
        });
      }
    }

    if (dateModified) {
      saveDateWiseQazaList(records);
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    }
  }

  // If remaining count exists, deduct from undated backlog
  if (remaining > 0) {
    const backlog = getUndatedBacklogInternal();
    const currentBacklog = backlog[prayer] || 0;
    if (currentBacklog > 0) {
      const deducted = Math.min(remaining, currentBacklog);
      backlog[prayer] = Math.max(0, currentBacklog - deducted);
      saveUndatedBacklog(backlog);
      setLastQazaUndo({
        id: `undo_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        prayer,
        source: 'undated',
      });
    }
  }

  addQazaHistoryEntry(prayer as PrayerName);
  getQazaPrayers();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

/**
 * Sets specific total Qaza count by adjusting undatedBacklog:
 * undatedBacklog[p] = Math.max(0, count - countInDatedPending(p))
 */
export const setQazaCount = (prayer: QazaPrayerName, count: number): void => {
  const target = Math.max(0, Number(count) || 0);
  const datedCount = countInDatedPending(prayer);
  const backlog = getUndatedBacklogInternal();
  backlog[prayer] = Math.max(0, target - datedCount);
  saveUndatedBacklog(backlog);

  getQazaPrayers();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

export const getQazaStats = (): QazaStats => {
  if (memoryCachedQazaStats) return memoryCachedQazaStats;
  const prayers = getQazaPrayers();
  const total = Object.values(prayers).reduce((sum, count) => sum + count, 0);
  const stats: QazaStats = {
    total,
    byPrayer: prayers,
  };
  memoryCachedQazaStats = stats;
  return stats;
};

export const clearAllQaza = (): void => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Reset undated backlog
  saveUndatedBacklog({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  });

  // 2. Clear date records completely
  saveDateWiseQazaList([]);
  safeSetLocalStorageItem(QAZA_DATE_RECORDS_KEY, '[]');

  // 3. Reset aggregate cache
  saveQazaPrayers({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  });

  // 4. Clear history and processed flags
  safeSetLocalStorageItem(HISTORY_KEY, '[]');
  localStorage.removeItem(PROCESSED_QAZA_KEY);
  localStorage.removeItem(GOAL_KEY);
  safeSetLocalStorageItem('noor_qaza_corrupt_history_cleaned', 'v1');

  // 5. Set autosync start date to today and seed today + past 7 days into ledger
  safeSetLocalStorageItem('noor_qaza_autosync_start_date', todayIso);
  const slots: string[] = [];
  const allPrayers: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
  for (const p of allPrayers) {
    slots.push(`${todayIso}:${p}`);
  }
  for (let i = 1; i <= 7; i++) {
    const past = new Date();
    past.setDate(past.getDate() - i);
    const pastIso = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')}`;
    for (const p of allPrayers) {
      slots.push(`${pastIso}:${p}`);
    }
  }
  safeSetLocalStorageItem(QAZA_AUTOSYNC_SLOTS_KEY, JSON.stringify(slots));

  // 6. Notify all components immediately
  invalidateQazaMemoryCache();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

export const resetAllQaza = clearAllQaza;

// ─── History & Goal ───────────────────────────────────────────────────────────

export interface QazaHistoryEntry {
  date: string;
  completed: number;
  prayer: PrayerName;
}

export const getQazaHistory = (): QazaHistoryEntry[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveQazaHistory = (history: QazaHistoryEntry[]): void => {
  const capped = history.slice(-500);
  safeSetLocalStorageItem(HISTORY_KEY, JSON.stringify(capped));
};

export const addQazaHistoryEntry = (prayer: PrayerName): void => {
  const history = getQazaHistory();
  history.push({ date: new Date().toDateString(), completed: 1, prayer });
  saveQazaHistory(history);
};

export const getQazaDailyGoal = (): number => {
  try {
    const saved = localStorage.getItem(GOAL_KEY);
    return saved ? parseInt(saved, 10) || 5 : 5;
  } catch {
    return 5;
  }
};

export const setQazaDailyGoal = (goal: number): void => {
  safeSetLocalStorageItem(GOAL_KEY, goal.toString());
};

export const getTodayQazaCompleted = (): number => {
  const history = getQazaHistory();
  const today = new Date().toDateString();
  const todayEntries = history.filter((h) => h.date === today);
  const sum = todayEntries.reduce((total, h) => total + (Number(h.completed) || 1), 0);

  // Auto-heal any legacy corrupted history entries (> 20) caused by background sync bugs
  if (sum > 20 && localStorage.getItem('noor_qaza_corrupt_history_cleaned') !== 'v1') {
    safeSetLocalStorageItem(HISTORY_KEY, '[]');
    safeSetLocalStorageItem('noor_qaza_corrupt_history_cleaned', 'v1');
    return 0;
  }

  return sum;
};

// ── Date-Wise Qaza Planner & Authentic Hijri Formatting ───────

export const ISLAMIC_MONTH_NAMES_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumādā al-Ūlā', 'Jumādā al-Ākhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah",
] as const;

export const ISLAMIC_MONTH_NAMES_AR_UR = [
  'محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی',
  'جمادی الأولى', 'جمادی الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذوالقعدۃ', 'ذوالحجہ',
] as const;

export const toArabicDigits = (num: number | string): string => {
  return String(num).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d, 10)]);
};

export interface DetailedHijriDate {
  gregorian: string;
  gregorianDay: string;
  hijriDay: number;
  hijriMonthEn: string;
  hijriMonthArUr: string;
  hijriYear: number;
  hijriEn: string;
  hijriArUr: string;
  fullHijri: string;
}

export const getDetailedHijriDate = (dateStr: string): DetailedHijriDate => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);

      const gregorian = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const gregorianDay = d.toLocaleDateString('en-US', { weekday: 'long' });

      // Apply regional/stored Hijri offset (-1d for India/Karachi preset default)
      let offset = -1;
      if (typeof localStorage !== 'undefined') {
        const storedOffset = localStorage.getItem('hijri-date-offset');
        if (storedOffset !== null) {
          const parsed = parseInt(storedOffset, 10);
          if (!isNaN(parsed)) offset = parsed;
        }
      }
      const dOffset = new Date(year, month, day);
      if (offset !== 0) {
        dOffset.setDate(dOffset.getDate() + offset);
      }

      let hijriDay = 1;
      let hijriMonth = 5;
      let hijriYear = 1448;
      let parsed = false;

      try {
        const intl = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        });
        const p = intl.formatToParts(dOffset);
        for (const part of p) {
          if (part.type === 'day') hijriDay = parseInt(part.value, 10);
          else if (part.type === 'month') hijriMonth = parseInt(part.value, 10);
          else if (part.type === 'year') {
            const cleanYear = parseInt(part.value.replace(/[^0-9]/g, ''), 10);
            if (!isNaN(cleanYear) && cleanYear >= 1300 && cleanYear <= 1600) {
              hijriYear = cleanYear;
            }
          }
        }
        if (
          hijriDay >= 1 &&
          hijriDay <= 30 &&
          hijriMonth >= 1 &&
          hijriMonth <= 12 &&
          hijriYear >= 1300 &&
          hijriYear <= 1600
        ) {
          parsed = true;
        }
      } catch {
        parsed = false;
      }

      if (!parsed) {
        try {
          const calc = islamicCalendarService.calculateIslamicDate(dOffset);
          hijriDay = parseInt(calc.hijri.day, 10) || 1;
          hijriMonth = calc.hijri.month.number || 5;
          hijriYear = parseInt(calc.hijri.year, 10) || 1448;
        } catch {
          hijriDay = day;
          hijriMonth = 5;
          hijriYear = 1448;
        }
      }

      const mIdx = Math.max(0, Math.min(11, hijriMonth - 1));
      const mNameEn = ISLAMIC_MONTH_NAMES_EN[mIdx];
      const mNameArUr = ISLAMIC_MONTH_NAMES_AR_UR[mIdx];
      const hijriEn = `${hijriDay} ${mNameEn} ${hijriYear} AH`;
      const hijriArUr = `${toArabicDigits(hijriDay)} ${mNameArUr} ${toArabicDigits(hijriYear)} ھ`;
      const fullHijri = `🌙 ${hijriEn} • ${hijriArUr}`;

      return {
        gregorian,
        gregorianDay,
        hijriDay,
        hijriMonthEn: mNameEn,
        hijriMonthArUr: mNameArUr,
        hijriYear,
        hijriEn,
        hijriArUr,
        fullHijri,
      };
    }
  } catch {
    // Non-critical fallback
  }

  return {
    gregorian: dateStr,
    gregorianDay: '',
    hijriDay: 1,
    hijriMonthEn: 'Jumada al-Ula',
    hijriMonthArUr: 'جمادی الاولیٰ',
    hijriYear: 1448,
    hijriEn: `1448 AH`,
    hijriArUr: `۱۴۴۸ ھ`,
    fullHijri: `🌙 1448 AH`,
  };
};

export const formatHijriDate = (dateStr: string): string => {
  const detailed = getDetailedHijriDate(dateStr);
  return `${detailed.gregorian} • ${detailed.hijriEn}`;
};

export const getDateWiseQazaList = (): DateWiseQazaRecord[] => {
  try {
    const raw = localStorage.getItem(QAZA_DATE_RECORDS_KEY);
    if (!raw) return [];
    const list: DateWiseQazaRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    let hasMigration = false;
    const migrated = list.map((record) => {
      if (
        record.hijriDate &&
        (record.hijriDate.includes('BC') ||
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*•.*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(
            record.hijriDate
          ) ||
          record.hijriDate.includes('undefined'))
      ) {
        hasMigration = true;
        return {
          ...record,
          hijriDate: formatHijriDate(record.date),
        };
      }
      return record;
    });

    if (hasMigration) {
      saveDateWiseQazaList(migrated);
    }

    return migrated.sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
};

export const saveDateWiseQazaList = (records: DateWiseQazaRecord[]): void => {
  invalidateQazaMemoryCache();
  try {
    const capped = records.slice(0, 365);
    safeSetLocalStorageItem(QAZA_DATE_RECORDS_KEY, JSON.stringify(capped));
  } catch (err) {
    console.warn('Failed to save date-wise Qaza records:', err);
  }
};

export const addPendingDateQazaPrayer = (date: string, prayer: QazaPrayerName): void => {
  const records = getDateWiseQazaList();
  let record = records.find((r) => r.date === date);

  if (!record) {
    record = {
      id: `qaza_date_${date}`,
      date,
      hijriDate: formatHijriDate(date),
      source: 'manual',
      prayers: {
        fajr: 'none',
        dhuhr: 'none',
        asr: 'none',
        maghrib: 'none',
        isha: 'none',
        witr: 'none',
      },
    };
    records.push(record);
  }

  if (record.prayers[prayer] !== 'pending') {
    record.prayers[prayer] = 'pending';
    record.source = 'manual';
    saveDateWiseQazaList(records);
    window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
  }
};

/**
 * Atomically reconciles and saves draft prayer statuses for a specific date:
 * - Diffs draftStatuses vs prevStatuses from noor_qaza_date_records_v1
 * - Decrements qazaData.prayers[p] if prev === 'pending' and draft !== 'pending'
 * - Increments qazaData.prayers[p] if prev !== 'pending' and draft === 'pending'
 * - Records completed makeup in today's activity log if draft === 'completed'
 * - Updates date record and removes the record if 0 prayers are pending (cleans up pending date pills)
 * - Dispatches qaza-updated events
 */
export const saveDateRecordQaza = (
  date: string,
  draftStatuses: Record<QazaPrayerName, 'pending' | 'completed' | 'none'>
): void => {
  const records = getDateWiseQazaList();
  const existingRecord = records.find((r) => r.date === date);
  const prevStatuses: Record<QazaPrayerName, 'pending' | 'completed' | 'none'> = existingRecord
    ? { ...existingRecord.prayers }
    : { fajr: 'none', dhuhr: 'none', asr: 'none', maghrib: 'none', isha: 'none', witr: 'none' };

  const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];

  for (const p of prayerNames) {
    const prev = prevStatuses[p] || 'none';
    const draft = draftStatuses[p] || 'none';

    if (prev === 'pending' && draft === 'completed') {
      addQazaHistoryEntry(p as PrayerName);
      setLastQazaUndo({
        id: `undo_${Date.now()}_${Math.random()}`,
        timestamp: Date.now(),
        prayer: p,
        source: 'dated',
        date,
      });
    }
  }

  // Update date records list: remove date record if 0 pending
  const hasAnyPending = prayerNames.some((p) => draftStatuses[p] === 'pending');
  let updatedRecords: DateWiseQazaRecord[];

  if (!hasAnyPending) {
    // 0 pending on this date -> remove record so date pill disappears immediately
    updatedRecords = records.filter((r) => r.date !== date);
  } else {
    let rec = records.find((r) => r.date === date);
    if (!rec) {
      rec = {
        id: `qaza_date_${date}`,
        date,
        hijriDate: formatHijriDate(date),
        source: 'manual',
        prayers: { ...draftStatuses },
      };
      records.push(rec);
    } else {
      rec.prayers = { ...draftStatuses };
      rec.source = 'manual';
    }
    updatedRecords = records;
  }

  saveDateWiseQazaList(updatedRecords);
  getQazaPrayers();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

export const toggleDatePrayerQaza = (date: string, prayer: QazaPrayerName): void => {
  const records = getDateWiseQazaList();
  let record = records.find((r) => r.date === date);

  if (!record) {
    record = {
      id: `qaza_date_${date}`,
      date,
      hijriDate: formatHijriDate(date),
      prayers: {
        fajr: 'none',
        dhuhr: 'none',
        asr: 'none',
        maghrib: 'none',
        isha: 'none',
        witr: 'none',
      },
    };
    records.push(record);
  }

  const current = record.prayers[prayer] || 'none';

  if (current === 'none') {
    // 'none' -> 'pending' (increases countInDatedPending by +1)
    record.prayers[prayer] = 'pending';
  } else if (current === 'pending') {
    // 'pending' -> 'completed' (decreases countInDatedPending by -1, increments completed history)
    record.prayers[prayer] = 'completed';
    addQazaHistoryEntry(prayer as PrayerName);
    setLastQazaUndo({
      id: `undo_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      prayer,
      source: 'dated',
      date,
    });
  } else {
    // 'completed' -> 'none'
    record.prayers[prayer] = 'none';
  }

  saveDateWiseQazaList(records);
  getQazaPrayers();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

export const markSingleDatePrayerCompleted = (date: string, prayer: QazaPrayerName): void => {
  const records = getDateWiseQazaList();
  const record = records.find((r) => r.date === date);
  if (!record) return;

  if (record.prayers[prayer] === 'pending') {
    record.prayers[prayer] = 'completed';
    saveDateWiseQazaList(records);

    setLastQazaUndo({
      id: `undo_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      prayer,
      source: 'dated',
      date,
    });

    addQazaHistoryEntry(prayer as PrayerName);

    // Bidirectional sync: If prayer is one of the 5 daily prayers, sync to salah-tracker (Worship Journal & Home)
    if (prayer !== 'witr') {
      try {
        const now = new Date();
        const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const isToday = (date === todayIso);

        const rawSalah = localStorage.getItem('salah-tracker');
        const days = rawSalah ? JSON.parse(rawSalah) : {};
        if (!days[date]) {
          days[date] = {
            date,
            fajr: false,
            dhuhr: false,
            asr: false,
            maghrib: false,
            isha: false,
          };
        }
        days[date][prayer] = true;
        const currentStatuses = days[date].statuses || {};
        days[date].statuses = {
          ...currentStatuses,
          [prayer]: isToday ? 'ontime' : 'makeup',
        };
        localStorage.setItem('salah-tracker', JSON.stringify(days));
        window.dispatchEvent(new CustomEvent('salah-updated'));
      } catch {
        // Safe storage fallback
      }
    }

    window.dispatchEvent(new CustomEvent('qaza-updated'));
    window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
  }
};

export const deleteDateQazaRecord = (date: string): void => {
  const records = getDateWiseQazaList().filter((r) => r.date !== date);
  saveDateWiseQazaList(records);
  reconcileQazaWithDateRecords();
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

// ── Automatic Daily Salah -> Date-Wise Qaza Rollover Engine ──

export interface RolloverOptions {
  records: DateWiseQazaRecord[];
  trackedDays: Record<string, DailyPrayers>;
  todayIso: string;
  currentTime: Date;
  nextDayFajrTime?: Date | null;
  lastRolloverDate?: string | null;
  includeWitr?: boolean;
}

export interface RolloverResult {
  records: DateWiseQazaRecord[];
  newLastRolloverDate: string;
  addedCountByPrayer: Record<QazaPrayerName, number>;
  totalAdded: number;
  processedDates: string[];
}

/**
 * Pure, clock-injected Rollover Engine (Fiqh Timing Guard):
 * - Unticked prayers of day D move to Qaza ONLY after day D has fully ended.
 * - Same-day prayers (dateIso >= todayIso) are NEVER auto-added to Qaza.
 * - Fajr, Dhuhr, Asr, Maghrib of day D roll over once local time passes end of day D (start of D+1).
 * - Isha and Witr of day D roll over ONLY after next day's Fajr has started.
 * - Processes all skipped days from day after lastRolloverDate up to yesterday.
 * - First run with no pointer: initializes pointer to yesterday without backfilling history.
 * - Idempotent: running repeatedly never double counts or overwrites completed/manual records.
 */
export function rolloverUntickedPrayers(options: RolloverOptions): RolloverResult {
  const {
    records: initialRecords,
    trackedDays,
    todayIso,
    currentTime,
    nextDayFajrTime,
    lastRolloverDate,
    includeWitr = true,
  } = options;

  const records = JSON.parse(JSON.stringify(initialRecords)) as DateWiseQazaRecord[];
  const yesterdayIso = getYesterdayIso(todayIso);
  const addedCountByPrayer: Record<QazaPrayerName, number> = {
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  };
  let totalAdded = 0;
  const processedDates: string[] = [];

  // First run with no pointer (fresh install or upgrade): initialize to yesterday, 0 backfill
  if (!lastRolloverDate) {
    return {
      records,
      newLastRolloverDate: yesterdayIso,
      addedCountByPrayer,
      totalAdded: 0,
      processedDates: [],
    };
  }

  // Iterate days from (lastRolloverDate + 1) up to yesterdayIso
  let cursor = getNextDayIso(lastRolloverDate);
  let newLastRollover = lastRolloverDate;

  while (cursor <= yesterdayIso) {
    const isYesterday = (cursor === yesterdayIso);
    processedDates.push(cursor);

    // Daytime prayers (Fajr, Dhuhr, Asr, Maghrib) of day D roll over once D has ended (start of D+1).
    const daytimeEligible = true;

    // Isha and Witr of day D roll over only after the next day's Fajr has started.
    let ishaWitrEligible = false;
    if (!isYesterday) {
      ishaWitrEligible = true;
    } else {
      const fajrCutoff = nextDayFajrTime ? new Date(nextDayFajrTime) : (() => {
        const [ty, tm, td] = todayIso.split('-').map(Number);
        return new Date(ty, tm - 1, td, 5, 0, 0); // 05:00 AM local fallback if prayer times unavailable
      })();

      if (currentTime >= fajrCutoff) {
        ishaWitrEligible = true;
      }
    }

    const dayData = trackedDays[cursor] || {
      date: cursor,
      fajr: false,
      dhuhr: false,
      asr: false,
      maghrib: false,
      isha: false,
    };

    const eligiblePrayers: QazaPrayerName[] = [];
    if (daytimeEligible) {
      eligiblePrayers.push('fajr', 'dhuhr', 'asr', 'maghrib');
    }
    if (ishaWitrEligible) {
      eligiblePrayers.push('isha');
      if (includeWitr) eligiblePrayers.push('witr');
    }

    let rec = records.find((r) => r.date === cursor);
    if (!rec) {
      rec = {
        id: `qaza_date_${cursor}`,
        date: cursor,
        hijriDate: formatHijriDate(cursor),
        source: 'auto',
        prayers: { fajr: 'none', dhuhr: 'none', asr: 'none', maghrib: 'none', isha: 'none', witr: 'none' },
      };
      records.push(rec);
    }

    let ishaMissed = false;
    for (const p of eligiblePrayers) {
      let isCompleted = false;
      if (p === 'witr') {
        isCompleted = !ishaMissed;
      } else {
        isCompleted = dayData[p] === true;
        if (p === 'isha' && !isCompleted) {
          ishaMissed = true;
        }
      }

      if (!isCompleted) {
        // Only set pending if not already pending or completed, and never overwrite manual edits
        if (!rec.prayers[p] || rec.prayers[p] === 'none') {
          rec.prayers[p] = 'pending';
          if (!rec.source) rec.source = 'auto';
          addedCountByPrayer[p]++;
          totalAdded++;
        }
      }
    }

    if (daytimeEligible && ishaWitrEligible) {
      newLastRollover = cursor;
    }

    cursor = getNextDayIso(cursor);
  }

  return {
    records,
    newLastRolloverDate: newLastRollover,
    addedCountByPrayer,
    totalAdded,
    processedDates,
  };
}

/**
 * Data-Safe Cleanup of Premature Same-Day Entries (One-time migration):
 * - Backs up records & qazaData to 'noor_qaza_backup_pre_rollover_v1'
 * - For todayIso and any future date, removes pending entries if source === 'auto'
 *   or legacy entries unticked in today's log matching the old auto-sync pattern
 * - Decrements counts by DELTA only (Math.max(0, count - 1))
 * - Preserves bulk baseline counts and manual entries
 */
export const cleanupPrematureSameDayEntries = (): {
  migrated: boolean;
  backupKey: string;
  removedEntries: { date: string; prayer: QazaPrayerName }[];
  keptEntries: { date: string; prayer: QazaPrayerName; reason: string }[];
  countDeltas: Record<QazaPrayerName, number>;
} => {
  const result = {
    migrated: false,
    backupKey: QAZA_BACKUP_PRE_ROLLOVER_KEY,
    removedEntries: [] as { date: string; prayer: QazaPrayerName }[],
    keptEntries: [] as { date: string; prayer: QazaPrayerName; reason: string }[],
    countDeltas: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, witr: 0 } as Record<QazaPrayerName, number>,
  };

  try {
    if (localStorage.getItem(QAZA_ROLLOVER_CLEANUP_KEY) === 'v1') {
      return result;
    }

    const records = getDateWiseQazaListInternal();
    const prayers = getQazaPrayers();
    let trackedDays: Record<string, DailyPrayers> = {};
    try {
      const rawSalah = localStorage.getItem('salah-tracker');
      if (rawSalah) trackedDays = JSON.parse(rawSalah);
    } catch {
      trackedDays = {};
    }

    // 1. Save data-safe backup before any mutations
    safeSetLocalStorageItem(
      QAZA_BACKUP_PRE_ROLLOVER_KEY,
      JSON.stringify({
        records,
        prayers,
        trackedDays,
        timestamp: new Date().toISOString(),
      })
    );

    const todayIso = getLocalDateIso();
    const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
    let modified = false;

    for (const rec of records) {
      if (rec.date >= todayIso) {
        for (const p of prayerNames) {
          if (rec.prayers && rec.prayers[p] === 'pending') {
            if (rec.source === 'auto') {
              rec.prayers[p] = 'none';
              prayers[p] = Math.max(0, (prayers[p] || 0) - 1);
              result.removedEntries.push({ date: rec.date, prayer: p });
              result.countDeltas[p] = (result.countDeltas[p] || 0) + 1;
              modified = true;
            } else if (rec.source === 'manual') {
              result.keptEntries.push({
                date: rec.date,
                prayer: p,
                reason: "Explicitly created by user in Qaza Planner (source === 'manual')",
              });
            } else {
              // Legacy entry without source field: check if unticked in today's daily log
              const isUnticked = !trackedDays[rec.date]?.[p as PrayerName];
              if (isUnticked) {
                rec.prayers[p] = 'none';
                prayers[p] = Math.max(0, (prayers[p] || 0) - 1);
                result.removedEntries.push({ date: rec.date, prayer: p });
                result.countDeltas[p] = (result.countDeltas[p] || 0) + 1;
                modified = true;
              } else {
                result.keptEntries.push({
                  date: rec.date,
                  prayer: p,
                  reason: 'Ambiguous legacy entry without source; safely preserved',
                });
              }
            }
          }
        }
      }
    }

    // Clean up empty date records
    const cleanedRecords = records.filter((r) => {
      const hasPendingOrCompleted = prayerNames.some(
        (p) => r.prayers && (r.prayers[p] === 'pending' || r.prayers[p] === 'completed')
      );
      return hasPendingOrCompleted || r.source === 'manual';
    });

    if (modified || cleanedRecords.length !== records.length) {
      saveDateWiseQazaList(cleanedRecords);
      saveQazaPrayers(prayers);
      window.dispatchEvent(new CustomEvent('qaza-updated'));
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
      window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
    }

    safeSetLocalStorageItem(QAZA_ROLLOVER_CLEANUP_KEY, 'v1');
    result.migrated = true;
    return result;
  } catch (err) {
    console.warn('Failed to cleanup premature same-day Qaza entries:', err);
    return result;
  }
};

/**
 * Executes the stateful Qaza Rollover in application runtime.
 */
export const executeQazaRollover = (
  customPrayerTimes?: Record<string, { start: Date; end: Date }>
): void => {
  try {
    // 1. Skip if Menstrual / Haidh Mode is active
    if (localStorage.getItem('menstrual-mode-active') === 'true') {
      return;
    }
    const haidh = getMenstrualModeData();
    if (haidh && haidh.isActive && haidh.pauseQazaAutoSync) {
      return;
    }

    // 2. Perform one-time premature cleanup if not yet run
    cleanupPrematureSameDayEntries();

    const now = new Date();
    const todayIso = getLocalDateIso(now);
    const lastRolloverDate = localStorage.getItem(QAZA_LAST_ROLLOVER_DATE_KEY);

    // Load tracked days
    let trackedDays: Record<string, DailyPrayers> = {};
    try {
      const rawSalah = localStorage.getItem('salah-tracker');
      if (rawSalah) trackedDays = JSON.parse(rawSalah);
    } catch {
      trackedDays = {};
    }

    // Read next-day Fajr from prayer times module (read-only)
    const times = customPrayerTimes || resolvePrayerTimes();
    const todayFajrTime = times?.fajr?.start || null;

    const currentRecords = getDateWiseQazaListInternal();
    const rollover = rolloverUntickedPrayers({
      records: currentRecords,
      trackedDays,
      todayIso,
      currentTime: now,
      nextDayFajrTime: todayFajrTime,
      lastRolloverDate,
      includeWitr: true,
    });

    // Update last rollover pointer
    safeSetLocalStorageItem(QAZA_LAST_ROLLOVER_DATE_KEY, rollover.newLastRolloverDate);

    // If new prayers were rolled over, update records and increment general Qaza by delta
    if (rollover.totalAdded > 0) {
      saveDateWiseQazaList(rollover.records);

      const prayers = getQazaPrayers();
      for (const p of (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as QazaPrayerName[])) {
        if (rollover.addedCountByPrayer[p] > 0) {
          prayers[p] = (Number(prayers[p]) || 0) + rollover.addedCountByPrayer[p];
        }
      }
      saveQazaPrayers(prayers);

      window.dispatchEvent(new CustomEvent('qaza-updated'));
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
      window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
    }
  } catch (err) {
    console.warn('Error in executeQazaRollover:', err);
  }
};

/**
 * Initializes listeners for the Qaza Rollover Engine:
 * - App startup execution
 * - App resume via visibilitychange
 * - Light 60-second timer while app remains open
 */
let rolloverListenersRegistered = false;

export const initQazaRolloverListeners = (): void => {
  if (typeof window === 'undefined' || rolloverListenersRegistered) return;
  rolloverListenersRegistered = true;

  // 1. Initial run on startup
  executeQazaRollover();

  // 2. Visibility change listener (app resume)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      executeQazaRollover();
    }
  });

  // 3. Periodic 60-second check for overnight rollover
  setInterval(() => {
    executeQazaRollover();
  }, 60 * 1000);
};

/**
 * Backward-compatible entry points:
 * Calls the safe rollover engine instead of prematurely pushing today's prayers into Qaza.
 */
export const syncUnmarkedDailySalahToQaza = (
  customPrayerTimes?: Record<string, { start: Date; end: Date }>
): void => {
  executeQazaRollover(customPrayerTimes);
};

export const syncMissedPrayersToQaza = (
  _todayPrayers?: Record<string, boolean>,
  prayerTimes?: Record<string, { start: Date; end: Date }>
): void => {
  executeQazaRollover(prayerTimes);
};

/**
 * Ticking on Home/SalahTracker:
 * When a user ticks a previously-unticked prayer on day D (today) or a past day,
 * if that prayer had an auto-generated pending entry in `noor_qaza_date_records_v1`,
 * clear that pending entry. If that auto-generated entry had also incremented
 * `qazaData.prayers[p]`, decrement it by `Math.max(0, count - 1)` (delta-only).
 * - Do not touch records marked `source: 'manual'`.
 * - Emit `window.dispatchEvent(new Event('qaza-updated'))` so the Qaza badge, Qaza page,
 *   and reminder banner update immediately.
 */
export function syncPrayerCompletionToQaza(dateIso: string, prayer: QazaPrayerName): void {
  try {
    const records = getDateWiseQazaList();
    const recIndex = records.findIndex((r) => r.date === dateIso);
    if (recIndex === -1) return;

    const rec = records[recIndex];
    if (rec.prayers && rec.prayers[prayer] === 'pending') {
      // Only clear if source is 'auto' (or unspecified legacy auto). Never clear manual entries!
      if (rec.source === 'manual') {
        return;
      }

      delete rec.prayers[prayer];

      // Decrement aggregate count delta-only
      const prayers = getQazaPrayers();
      const currentCount = Number(prayers[prayer]) || 0;
      prayers[prayer] = Math.max(0, currentCount - 1);
      saveQazaPrayers(prayers);

      // If no pending prayers remain, remove the record
      const remainingPending = Object.values(rec.prayers).some((s) => s === 'pending');
      if (!remainingPending) {
        records.splice(recIndex, 1);
      } else {
        records[recIndex] = rec;
      }
      saveDateWiseQazaList(records);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('qaza-updated'));
        window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
      }
    }
  } catch (err) {
    console.warn('[QAZA_TICK_SYNC_WARN] Failed to sync prayer completion to Qaza:', err);
  }
}
