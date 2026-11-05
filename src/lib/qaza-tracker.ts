import { getMenstrualModeData } from './haidh-tracker';
import { type PrayerName, resolvePrayerTimes, type DailyPrayers } from './salah-tracker';
import { safeSetLocalStorageItem } from './cache-manager';
import { islamicCalendarService } from './islamic-calendar-service';

export type { PrayerName };

export type QazaPrayerName = PrayerName | 'witr';

export const QAZA_DATE_RECORDS_KEY = 'noor_qaza_date_records_v1';
export const QAZA_AUTOSYNC_SLOTS_KEY = 'noor_qaza_autosynced_slots_v1';

export interface DateWiseQazaRecord {
  id: string;
  date: string; // YYYY-MM-DD
  hijriDate?: string;
  prayers: Record<QazaPrayerName, 'pending' | 'completed' | 'none'>;
  note?: string;
}

/**
 * Qaza (Missed Prayer) Tracker
 * Track prayers that need to be made up
 * All data stored locally
 */

const QAZA_STORAGE_KEY = 'qaza-prayers';
const PROCESSED_QAZA_KEY = 'processed-salah-qaza';
const HISTORY_KEY = 'qaza-history';
const GOAL_KEY = 'qaza-daily-goal';

export interface QazaStats {
  total: number;
  byPrayer: Record<QazaPrayerName, number>;
}

// Get all Qaza prayers
export const getQazaPrayers = (): Record<QazaPrayerName, number> => {
  try {
    const data = localStorage.getItem(QAZA_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : {};
    return {
      fajr: Math.max(0, Number(parsed.fajr) || 0),
      dhuhr: Math.max(0, Number(parsed.dhuhr) || 0),
      asr: Math.max(0, Number(parsed.asr) || 0),
      maghrib: Math.max(0, Number(parsed.maghrib) || 0),
      isha: Math.max(0, Number(parsed.isha) || 0),
      witr: Math.max(0, Number(parsed.witr) || 0),
    };
  } catch {
    return {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
      witr: 0,
    };
  }
};

// Save Qaza prayers
const saveQazaPrayers = (prayers: Record<QazaPrayerName, number>): void => {
  safeSetLocalStorageItem(QAZA_STORAGE_KEY, JSON.stringify(prayers));
};

// Add Qaza prayer
export const addQazaPrayer = (prayer: QazaPrayerName, count: number = 1): void => {
  const prayers = getQazaPrayers();
  const validCount = Math.max(0, Number(count) || 0);
  prayers[prayer] = Math.max(0, (Number(prayers[prayer]) || 0) + validCount);
  saveQazaPrayers(prayers);
};

// Remove/complete Qaza prayer (Guaranteed never to go below 0)
export const completeQazaPrayer = (prayer: QazaPrayerName, count: number = 1): void => {
  const prayers = getQazaPrayers();
  const current = Math.max(0, Number(prayers[prayer]) || 0);
  if (current <= 0) return;
  const validCount = Math.max(1, Number(count) || 1);
  prayers[prayer] = Math.max(0, current - validCount);
  saveQazaPrayers(prayers);
};

// Set specific Qaza count
export const setQazaCount = (prayer: QazaPrayerName, count: number): void => {
  const prayers = getQazaPrayers();
  prayers[prayer] = Math.max(0, Number(count) || 0);
  saveQazaPrayers(prayers);
};

// Get Qaza stats
export const getQazaStats = (): QazaStats => {
  const prayers = getQazaPrayers();
  const total = Object.values(prayers).reduce((sum, count) => sum + count, 0);
  return {
    total,
    byPrayer: prayers
  };
};

// Get processed Qaza cache
const getProcessedQaza = (): Set<string> => {
  try {
    const data = localStorage.getItem(PROCESSED_QAZA_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch {
    return new Set();
  }
};

// Save processed Qaza cache
const saveProcessedQaza = (processed: Set<string>): void => {
  safeSetLocalStorageItem(PROCESSED_QAZA_KEY, JSON.stringify(Array.from(processed).slice(-300)));
};

/**
 * Automatically sync missed prayers from Salah Tracker
 * Runs when app state updates or prayer times change
 */
export const syncMissedPrayersToQaza = (
  todayPrayers: Record<string, boolean>,
  prayerTimes: Record<string, { start: Date; end: Date }>
): void => {
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];
  const processed = getProcessedQaza();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const haidhMode = getMenstrualModeData();
  const isPaused = haidhMode.isActive && haidhMode.pauseQazaAutoSync;

  // If Menstrual Mode is active, skip auto-Qaza and mark already-ended prayers as processed
  // so they are not added later when mode is turned off.
  if (isPaused) {
    let processedChanged = false;

    prayers.forEach(prayer => {
      const key = `${todayKey}-${prayer}`;
      const timeInfo = prayerTimes[prayer];
      if (!timeInfo || processed.has(key)) return;

      if (now > timeInfo.end) {
        processed.add(key);
        processedChanged = true;
      }
    });

    if (processedChanged) {
      saveProcessedQaza(processed);
    }

    return;
  }

  let changed = false;

  prayers.forEach(prayer => {
    const key = `${todayKey}-${prayer}`;

    // If already processed, skip
    if (processed.has(key)) return;

    const timeInfo = prayerTimes[prayer];
    if (!timeInfo) return;

    // If prayer end time has passed and status is false
    // We use end time to determine it's truly missed
    if (now > timeInfo.end && todayPrayers[prayer] === false) {
      addQazaPrayer(prayer, 1);
      processed.add(key);
      changed = true;
      console.log(`Auto-added Qaza: ${prayer} for ${todayKey}`);
    }
  });

  if (changed) {
    saveProcessedQaza(processed);
    // Cleanup old keys (keep last 30 days) to prevent storage bloat
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoKey = thirtyDaysAgo.toISOString().split('T')[0];

    Array.from(processed).forEach(k => {
      if (k.substring(0, 10) < thirtyDaysAgoKey) {
        processed.delete(k);
      }
    });
    saveProcessedQaza(processed);

    // Notify UI
    window.dispatchEvent(new CustomEvent('qaza-updated'));
  }
};

// Clear all Qaza
export const clearAllQaza = (): void => {
  saveQazaPrayers({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  });
  localStorage.removeItem(PROCESSED_QAZA_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(GOAL_KEY);
  localStorage.removeItem(QAZA_AUTOSYNC_SLOTS_KEY);
  window.dispatchEvent(new CustomEvent('qaza-updated'));
};

// ─── History & Goal ───────────────────────────────────────────────────────────

export interface QazaHistoryEntry {
  date: string;
  completed: number;
  prayer: PrayerName;
}

export const getQazaHistory = (): QazaHistoryEntry[] => {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveQazaHistory = (history: QazaHistoryEntry[]): void => {
  // Cap history to latest 500 entries to prevent QuotaExceededError
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
  return history
    .filter(h => h.date === today)
    .reduce((sum, h) => sum + h.completed, 0);
};

// ── Date-Wise Qaza Planner & Log ─────────────────────────────

export const ISLAMIC_MONTH_NAMES_EN = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah",
] as const;

export const formatHijriDate = (dateStr: string): string => {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      const gregorian = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      let hijriDay = 1;
      let hijriMonth = 1;
      let hijriYear = 1448;
      let parsed = false;

      try {
        const intl = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        });
        const p = intl.formatToParts(d);
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
        if (hijriDay >= 1 && hijriDay <= 30 && hijriMonth >= 1 && hijriMonth <= 12 && hijriYear >= 1300 && hijriYear <= 1600) {
          parsed = true;
        }
      } catch {
        parsed = false;
      }

      if (!parsed) {
        try {
          const calc = islamicCalendarService.calculateIslamicDate(d);
          hijriDay = parseInt(calc.hijri.day, 10) || 1;
          hijriMonth = calc.hijri.month.number || 1;
          hijriYear = parseInt(calc.hijri.year, 10) || 1448;
        } catch {
          hijriDay = day;
          hijriMonth = 5;
          hijriYear = 1448;
        }
      }

      const mIdx = Math.max(0, Math.min(11, hijriMonth - 1));
      const mName = ISLAMIC_MONTH_NAMES_EN[mIdx];
      const hijri = `${hijriDay} ${mName} ${hijriYear} AH`;
      return `${gregorian} • ${hijri}`;
    }
  } catch {
    // Non-critical fallback
  }
  return dateStr;
};

export const getDateWiseQazaList = (): DateWiseQazaRecord[] => {
  try {
    const raw = localStorage.getItem(QAZA_DATE_RECORDS_KEY);
    if (!raw) return [];
    const list: DateWiseQazaRecord[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];

    let hasMigration = false;
    const migrated = list.map((record) => {
      // Auto-migrate any historical records with broken Hijri date (e.g. "BC" or Gregorian month fallbacks)
      if (
        record.hijriDate &&
        (record.hijriDate.includes('BC') ||
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b.*•.*\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(record.hijriDate) ||
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

const saveDateWiseQazaList = (records: DateWiseQazaRecord[]): void => {
  try {
    // Retain up to 365 days of date-wise logs
    const capped = records.slice(0, 365);
    safeSetLocalStorageItem(QAZA_DATE_RECORDS_KEY, JSON.stringify(capped));
  } catch (err) {
    console.warn('Failed to save date-wise Qaza records:', err);
  }
};

export const toggleDatePrayerQaza = (
  date: string,
  prayer: QazaPrayerName
): void => {
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
    // 'none' -> 'pending' (increments that prayer's total Qaza count by +1)
    record.prayers[prayer] = 'pending';
    addQazaPrayer(prayer, 1);
  } else if (current === 'pending') {
    // 'pending' -> 'completed' (decrements pending Qaza by -1, increments completed-today by +1)
    record.prayers[prayer] = 'completed';
    completeQazaPrayer(prayer, 1);
    addQazaHistoryEntry(prayer as PrayerName);
  } else {
    // 'completed' -> 'none'
    record.prayers[prayer] = 'none';
  }

  saveDateWiseQazaList(records);
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
};

export const markSingleDatePrayerCompleted = (
  date: string,
  prayer: QazaPrayerName
): void => {
  const records = getDateWiseQazaList();
  const record = records.find((r) => r.date === date);
  if (!record) return;

  if (record.prayers[prayer] === 'pending') {
    record.prayers[prayer] = 'completed';
    completeQazaPrayer(prayer, 1);
    addQazaHistoryEntry(prayer as PrayerName);
    saveDateWiseQazaList(records);

    // Bidirectional sync: If this date is today and prayer is one of the 5 daily prayers, sync to salah-tracker
    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (date === todayIso && prayer !== 'witr') {
      try {
        const rawSalah = localStorage.getItem('salah-tracker');
        if (rawSalah) {
          const days = JSON.parse(rawSalah);
          if (days[todayIso] && !days[todayIso][prayer]) {
            days[todayIso][prayer] = true;
            localStorage.setItem('salah-tracker', JSON.stringify(days));
            window.dispatchEvent(new CustomEvent('salah-updated'));
          }
        }
      } catch {
        // Safe fallback
      }
    }

    window.dispatchEvent(new CustomEvent('qaza-updated'));
    window.dispatchEvent(new CustomEvent('qaza-date-updated'));
  }
};

export const deleteDateQazaRecord = (date: string): void => {
  const records = getDateWiseQazaList().filter((r) => r.date !== date);
  saveDateWiseQazaList(records);
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('qaza-date-updated'));
};

// ── Automatic Daily Salah -> Date-Wise Qaza Auto-Sync Engine ──

export const getAutosyncedSlots = (): Set<string> => {
  try {
    const raw = localStorage.getItem(QAZA_AUTOSYNC_SLOTS_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set<string>();
  }
};

export const saveAutosyncedSlots = (slots: Set<string>): void => {
  try {
    // Retain up to 300 entries to prevent storage bloat
    const arr = Array.from(slots).slice(-300);
    safeSetLocalStorageItem(QAZA_AUTOSYNC_SLOTS_KEY, JSON.stringify(arr));
  } catch (err) {
    console.warn('Failed to save autosynced Qaza slots:', err);
  }
};

/**
 * Synchronizes unmarked Daily Salah prayers into Date-Wise Qaza.
 * - Today: past Sunrise for Fajr, past Asr for Dhuhr, past Maghrib for Asr, past Isha for Maghrib.
 * - Past 7 days: uncompleted Fard prayers + Witr (if Isha missed).
 * - Menstrual mode check: pauses and bypasses when active.
 * - Ledger key prevents double-counting or re-adding once marked completed.
 */
export const syncUnmarkedDailySalahToQaza = (
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

    const now = new Date();
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const autosyncedSlots = getAutosyncedSlots();
    const records = getDateWiseQazaList();
    let recordsChanged = false;
    let prayersChanged = false;

    const getOrCreateRecord = (dateStr: string): DateWiseQazaRecord => {
      let rec = records.find((r) => r.date === dateStr);
      if (!rec) {
        rec = {
          id: `qaza_date_${dateStr}`,
          date: dateStr,
          hijriDate: formatHijriDate(dateStr),
          prayers: {
            fajr: 'none',
            dhuhr: 'none',
            asr: 'none',
            maghrib: 'none',
            isha: 'none',
            witr: 'none',
          },
        };
        records.push(rec);
        recordsChanged = true;
      }
      return rec;
    };

    // Load salah-tracker days
    let trackedDays: Record<string, DailyPrayers> = {};
    try {
      const rawSalah = localStorage.getItem('salah-tracker');
      if (rawSalah) trackedDays = JSON.parse(rawSalah);
    } catch {
      trackedDays = {};
    }

    // A. Today's Passed Prayers
    const times = customPrayerTimes || resolvePrayerTimes();
    if (times) {
      const todayRecord = trackedDays[todayIso] || {
        date: todayIso,
        fajr: false,
        dhuhr: false,
        asr: false,
        maghrib: false,
        isha: false,
      };

      const todayChecks: { prayer: PrayerName; isPassed: boolean }[] = [
        { prayer: 'fajr', isPassed: times.fajr ? now > times.fajr.end : false },
        { prayer: 'dhuhr', isPassed: times.dhuhr ? now > times.dhuhr.end : false },
        { prayer: 'asr', isPassed: times.asr ? now > times.asr.end : false },
        { prayer: 'maghrib', isPassed: times.maghrib ? now > times.maghrib.end : false },
        { prayer: 'isha', isPassed: times.isha ? now > times.isha.end : false },
      ];

      for (const { prayer, isPassed } of todayChecks) {
        if (!isPassed) continue;
        const isCompleted = todayRecord[prayer] === true;
        const slotKey = `${todayIso}:${prayer}`;

        if (!isCompleted && !autosyncedSlots.has(slotKey)) {
          const rec = getOrCreateRecord(todayIso);
          if (rec.prayers[prayer] !== 'completed' && rec.prayers[prayer] !== 'pending') {
            rec.prayers[prayer] = 'pending';
            addQazaPrayer(prayer, 1);
            autosyncedSlots.add(slotKey);
            recordsChanged = true;
            prayersChanged = true;
          }
        }
      }
    }

    // B. Past Days (up to 7 days back)
    for (let i = 1; i <= 7; i++) {
      const pastD = new Date();
      pastD.setDate(pastD.getDate() - i);
      const pastIso = `${pastD.getFullYear()}-${String(pastD.getMonth() + 1).padStart(2, '0')}-${String(pastD.getDate()).padStart(2, '0')}`;
      const dayData = trackedDays[pastIso];

      const fardPrayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      let ishaMissed = false;

      for (const p of fardPrayers) {
        const isCompleted = dayData ? dayData[p] === true : false;
        const slotKey = `${pastIso}:${p}`;

        if (p === 'isha' && !isCompleted) {
          ishaMissed = true;
        }

        if (!isCompleted && !autosyncedSlots.has(slotKey)) {
          const rec = getOrCreateRecord(pastIso);
          if (rec.prayers[p] !== 'completed' && rec.prayers[p] !== 'pending') {
            rec.prayers[p] = 'pending';
            addQazaPrayer(p, 1);
            autosyncedSlots.add(slotKey);
            recordsChanged = true;
            prayersChanged = true;
          }
        }
      }

      // If Isha was missed on that past date, also auto-sync Witr
      if (ishaMissed) {
        const witrSlotKey = `${pastIso}:witr`;
        if (!autosyncedSlots.has(witrSlotKey)) {
          const rec = getOrCreateRecord(pastIso);
          if (rec.prayers.witr !== 'completed' && rec.prayers.witr !== 'pending') {
            rec.prayers.witr = 'pending';
            addQazaPrayer('witr', 1);
            autosyncedSlots.add(witrSlotKey);
            recordsChanged = true;
            prayersChanged = true;
          }
        }
      }
    }

    if (recordsChanged || prayersChanged) {
      saveAutosyncedSlots(autosyncedSlots);
      if (recordsChanged) {
        saveDateWiseQazaList(records);
      }
      window.dispatchEvent(new CustomEvent('qaza-updated'));
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    }
  } catch (err) {
    console.warn('Error in syncUnmarkedDailySalahToQaza:', err);
  }
};

/**
 * Bidirectional helper: when a prayer is marked completed in Daily Salah,
 * automatically clear any pending Qaza record for that date.
 */
export const syncPrayerCompletionToQaza = (
  date: string,
  prayer: QazaPrayerName
): void => {
  try {
    const records = getDateWiseQazaList();
    const record = records.find((r) => r.date === date);
    if (!record) return;

    if (record.prayers[prayer] === 'pending') {
      record.prayers[prayer] = 'completed';
      completeQazaPrayer(prayer, 1);
      addQazaHistoryEntry(prayer as PrayerName);
      saveDateWiseQazaList(records);
      window.dispatchEvent(new CustomEvent('qaza-updated'));
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    }
  } catch (err) {
    console.warn('Error syncing prayer completion to Qaza:', err);
  }
};

