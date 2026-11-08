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
 * All data stored locally with full offline support
 */

const QAZA_STORAGE_KEY = 'qaza-prayers';
const PROCESSED_QAZA_KEY = 'processed-salah-qaza';
const HISTORY_KEY = 'qaza-history';
const GOAL_KEY = 'qaza-daily-goal';

export interface QazaStats {
  total: number;
  byPrayer: Record<QazaPrayerName, number>;
}

// ── Two-Way Reconciliation Helper ────────────────────────────

/**
 * Reads date records internally without triggering recursive loops.
 */
const getDateWiseQazaListInternal = (): DateWiseQazaRecord[] => {
  try {
    const raw = localStorage.getItem(QAZA_DATE_RECORDS_KEY);
    if (!raw) return [];
    const list: DateWiseQazaRecord[] = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

/**
 * Reconciles the general Qaza counter with active pending date records.
 * If a date has Asr, Maghrib, Isha, Witr pending, qazaData.prayers is
 * guaranteed to have at least those counts so tiles never display '0 / done'
 * while date-wise prayers are pending.
 */
export const reconcileQazaWithDateRecords = (): Record<QazaPrayerName, number> => {
  let prayers: Record<QazaPrayerName, number>;
  try {
    const data = localStorage.getItem(QAZA_STORAGE_KEY);
    const parsed = data ? JSON.parse(data) : {};
    prayers = {
      fajr: Math.max(0, Number(parsed.fajr) || 0),
      dhuhr: Math.max(0, Number(parsed.dhuhr) || 0),
      asr: Math.max(0, Number(parsed.asr) || 0),
      maghrib: Math.max(0, Number(parsed.maghrib) || 0),
      isha: Math.max(0, Number(parsed.isha) || 0),
      witr: Math.max(0, Number(parsed.witr) || 0),
    };
  } catch {
    prayers = {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0,
      witr: 0,
    };
  }

  // Count pending prayers across all active date records
  const dateRecords = getDateWiseQazaListInternal();
  const prayerNames: QazaPrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'];
  let modified = false;

  for (const p of prayerNames) {
    const pendingInDates = dateRecords.filter((r) => r.prayers && r.prayers[p] === 'pending').length;
    if (prayers[p] < pendingInDates) {
      prayers[p] = pendingInDates;
      modified = true;
    }
  }

  if (modified) {
    saveQazaPrayers(prayers);
  }

  return prayers;
};

// Get all Qaza prayers (reconciled with date-wise records)
export const getQazaPrayers = (): Record<QazaPrayerName, number> => {
  return reconcileQazaWithDateRecords();
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
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

// Remove/complete Qaza prayer
// Also marks the oldest pending date record for this prayer as completed
export const completeQazaPrayer = (
  prayer: QazaPrayerName,
  count: number = 1,
  options?: { skipDateReconciliation?: boolean }
): void => {
  const prayers = getQazaPrayers();
  const current = Math.max(0, Number(prayers[prayer]) || 0);
  if (current <= 0) return;
  const validCount = Math.max(1, Number(count) || 1);
  prayers[prayer] = Math.max(0, current - validCount);
  saveQazaPrayers(prayers);

  // Reconcile with oldest pending date record
  if (!options?.skipDateReconciliation) {
    const records = getDateWiseQazaListInternal();
    const sortedOldest = [...records].sort((a, b) => a.date.localeCompare(b.date));
    let remainingToMark = validCount;
    let dateModified = false;

    for (const r of sortedOldest) {
      if (remainingToMark <= 0) break;
      if (r.prayers && r.prayers[prayer] === 'pending') {
        r.prayers[prayer] = 'completed';
        remainingToMark--;
        dateModified = true;
      }
    }

    if (dateModified) {
      saveDateWiseQazaList(records);
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    }
  }

  addQazaHistoryEntry(prayer as PrayerName);
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

// Set specific Qaza count
export const setQazaCount = (prayer: QazaPrayerName, count: number): void => {
  const prayers = getQazaPrayers();
  prayers[prayer] = Math.max(0, Number(count) || 0);
  saveQazaPrayers(prayers);
  window.dispatchEvent(new CustomEvent('qaza-updated'));
  window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
};

// Get Qaza stats
export const getQazaStats = (): QazaStats => {
  const prayers = reconcileQazaWithDateRecords();
  const total = Object.values(prayers).reduce((sum, count) => sum + count, 0);
  return {
    total,
    byPrayer: prayers,
  };
};

// Clear all Qaza and reset all date-wise logs
export const clearAllQaza = (): void => {
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 1. Reset all prayer counts to 0
  saveQazaPrayers({
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

  // 3. Clear history and processed flags
  safeSetLocalStorageItem(HISTORY_KEY, '[]');
  localStorage.removeItem(PROCESSED_QAZA_KEY);
  localStorage.removeItem(GOAL_KEY);
  safeSetLocalStorageItem('noor_qaza_corrupt_history_cleaned', 'v1');

  // 4. Set autosync start date to today and seed today + past 7 days into ledger
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

  // 5. Notify all components immediately
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
          const calc = islamicCalendarService.calculateIslamicDate(d);
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
    saveDateWiseQazaList(records);
    window.dispatchEvent(new CustomEvent('qaza-date-updated'));
    window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
  }
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
    // 'none' -> 'pending' (increments that prayer's total Qaza count by +1)
    record.prayers[prayer] = 'pending';
    addQazaPrayer(prayer, 1);
  } else if (current === 'pending') {
    // 'pending' -> 'completed' (decrements pending Qaza by -1, increments completed-today by +1)
    record.prayers[prayer] = 'completed';
    completeQazaPrayer(prayer, 1, { skipDateReconciliation: true });
  } else {
    // 'completed' -> 'none'
    record.prayers[prayer] = 'none';
  }

  saveDateWiseQazaList(records);
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
    completeQazaPrayer(prayer, 1, { skipDateReconciliation: true });

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
    const syncStartDate = localStorage.getItem('noor_qaza_autosync_start_date');

    for (let i = 1; i <= 7; i++) {
      const pastD = new Date();
      pastD.setDate(pastD.getDate() - i);
      const pastIso = `${pastD.getFullYear()}-${String(pastD.getMonth() + 1).padStart(2, '0')}-${String(pastD.getDate()).padStart(2, '0')}`;

      // If user reset Qaza and set a start date, skip dates before that reset date
      if (syncStartDate && pastIso < syncStartDate) {
        continue;
      }

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
      window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
    }
  } catch (err) {
    console.warn('Error in syncUnmarkedDailySalahToQaza:', err);
  }
};

/**
 * Bidirectional helper: when a prayer is marked completed in Daily Salah,
 * automatically clear any pending Qaza record for that date without recording extra history entries.
 */
export const syncPrayerCompletionToQaza = (date: string, prayer: QazaPrayerName): void => {
  try {
    const records = getDateWiseQazaList();
    const record = records.find((r) => r.date === date);
    if (!record) return;

    if (record.prayers[prayer] === 'pending') {
      record.prayers[prayer] = 'completed';
      const prayers = getQazaPrayers();
      prayers[prayer] = Math.max(0, (prayers[prayer] || 0) - 1);
      saveQazaPrayers(prayers);
      saveDateWiseQazaList(records);
      window.dispatchEvent(new CustomEvent('qaza-updated'));
      window.dispatchEvent(new CustomEvent('qaza-date-updated'));
      window.dispatchEvent(new CustomEvent('noor-qaza-updated'));
    }
  } catch (err) {
    console.warn('Error syncing prayer completion to Qaza:', err);
  }
};

/**
 * Legacy compatibility alias for syncUnmarkedDailySalahToQaza
 */
export const syncMissedPrayersToQaza = (
  _todayPrayers?: Record<string, boolean>,
  prayerTimes?: Record<string, { start: Date; end: Date }>
): void => {
  syncUnmarkedDailySalahToQaza(prayerTimes);
};
