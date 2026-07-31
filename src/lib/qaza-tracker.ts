import { getMenstrualModeData } from './menstrual-mode';
import { getMenstrualModeData as getHaidhModeData } from './haidh-tracker';
import { type PrayerName } from './salah-tracker';

export type { PrayerName };

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
  byPrayer: Record<PrayerName, number>;
}

// Get all Qaza prayers
export const getQazaPrayers = (): Record<PrayerName, number> => {
  try {
    const data = localStorage.getItem(QAZA_STORAGE_KEY);
    return data ? JSON.parse(data) : {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0
    };
  } catch {
    return {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0
    };
  }
};

// Save Qaza prayers
const saveQazaPrayers = (prayers: Record<PrayerName, number>): void => {
  localStorage.setItem(QAZA_STORAGE_KEY, JSON.stringify(prayers));
};

// Add Qaza prayer
export const addQazaPrayer = (prayer: PrayerName, count: number = 1): void => {
  const prayers = getQazaPrayers();
  prayers[prayer] = Math.max(0, (prayers[prayer] || 0) + count);
  saveQazaPrayers(prayers);
};

// Remove/complete Qaza prayer
export const completeQazaPrayer = (prayer: PrayerName, count: number = 1): void => {
  const prayers = getQazaPrayers();
  prayers[prayer] = Math.max(0, (prayers[prayer] || 0) - count);
  saveQazaPrayers(prayers);
};

// Set specific Qaza count
export const setQazaCount = (prayer: PrayerName, count: number): void => {
  const prayers = getQazaPrayers();
  prayers[prayer] = Math.max(0, count);
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
  localStorage.setItem(PROCESSED_QAZA_KEY, JSON.stringify(Array.from(processed)));
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
  const oldMenstrualMode = getMenstrualModeData();
  const haidhMode = getHaidhModeData();
  const isPaused = (oldMenstrualMode.isActive && oldMenstrualMode.pauseQazaAutoSync) ||
                   (haidhMode.isActive && haidhMode.pauseQazaAutoSync);

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
    isha: 0
  });
  localStorage.removeItem(PROCESSED_QAZA_KEY);
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(GOAL_KEY);
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
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
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
  localStorage.setItem(GOAL_KEY, goal.toString());
};

export const getTodayQazaCompleted = (): number => {
  const history = getQazaHistory();
  const today = new Date().toDateString();
  return history
    .filter(h => h.date === today)
    .reduce((sum, h) => sum + h.completed, 0);
};
