/**
 * Local Storage Utility - All data stays on device
 * FOSS & Privacy-focused storage solution
 */

const STORAGE_KEYS = {
  THEME: 'theme',
  MADHAB: 'madhab',
  TIME_FORMAT: 'time-format',
  TASBEEH_TOTAL: 'tasbeeh-total',
  TASBEEH_HISTORY: 'tasbeeh-history',
  FAVORITES: 'favorites',
  BOOKMARKS: 'bookmarks',
  PRAYER_SETTINGS: 'prayer-settings',
  PRAYER_ALARM_ENABLED: 'prayer-alarm-enabled',
  PRAYER_REMINDER_MINUTES: 'prayer-reminder-minutes',
  SELECTED_ADHAN: 'selected-adhan-id',
  CACHED_PRAYER_TIMES: 'cached-prayer-times',
  LAST_HADITH: 'last-hadith',
  SHOW_EXTRA_PRAYERS: 'show-extra-prayers',
} as const;

// ... (skipping some exports for brevity)

export const getShowExtraPrayers = (): boolean => {
  const stored = localStorage.getItem(STORAGE_KEYS.SHOW_EXTRA_PRAYERS);
  return stored === null ? true : stored === 'true'; // Default to true (show all prayers 24/7)
};

export const setShowExtraPrayers = (show: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.SHOW_EXTRA_PRAYERS, show ? 'true' : 'false');
  window.dispatchEvent(new Event('storage'));
};

// Generic storage helpers
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage error:', error);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key);
  },
};

// Theme
export const getTheme = (): 'dark' | 'light' => {
  return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'light';
};

export const setTheme = (theme: 'dark' | 'light'): void => {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
  document.documentElement.classList.toggle('dark', theme === 'dark');
};

// Madhab / Fiqh — simplified to the 2 options used by the app.
// (Asr calculation only differs between Hanafi and Shafi; Maliki & Hanbali
//  follow Shafi, so we expose just the two meaningful choices.)
export type MadhabType = 'shafi' | 'hanafi';

const VALID_MADHABS: MadhabType[] = ['shafi', 'hanafi'];

export const getMadhab = (): MadhabType => {
  const stored = localStorage.getItem(STORAGE_KEYS.MADHAB) as MadhabType | null;
  // Normalize legacy values (maliki/hanbali → shafi) so old installs migrate cleanly.
  return stored && VALID_MADHABS.includes(stored) ? stored : 'shafi';
};

export const setMadhab = (madhab: MadhabType): void => {
  localStorage.setItem(STORAGE_KEYS.MADHAB, madhab);
};

// Time Format
export const getTimeFormat = (): '12' | '24' => {
  return (localStorage.getItem(STORAGE_KEYS.TIME_FORMAT) as '12' | '24') || '24';
};

export const setTimeFormat = (format: '12' | '24'): void => {
  localStorage.setItem(STORAGE_KEYS.TIME_FORMAT, format);
  // Dispatch custom event for immediate UI updates
  window.dispatchEvent(new CustomEvent('time-format-changed', { detail: { format } }));
};

// Tasbeeh
interface TasbeehEntry {
  date: string;
  count: number;
  label: string;
}

export const getTasbeehTotal = (): number => {
  return parseInt(localStorage.getItem(STORAGE_KEYS.TASBEEH_TOTAL) || '0', 10);
};

export const setTasbeehTotal = (total: number): void => {
  localStorage.setItem(STORAGE_KEYS.TASBEEH_TOTAL, total.toString());
  window.dispatchEvent(new CustomEvent('tasbeeh-updated'));
};

export const getTasbeehHistory = (): TasbeehEntry[] => {
  return storage.get(STORAGE_KEYS.TASBEEH_HISTORY, []);
};

export const addTasbeehEntry = (label: string): void => {
  const history = getTasbeehHistory();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const existingIndex = history.findIndex(h => h.date === today && h.label === label);

  if (existingIndex >= 0) {
    history[existingIndex].count += 1;
  } else {
    history.unshift({ date: today, count: 1, label });
  }

  // Keep only last 30 days
  storage.set(STORAGE_KEYS.TASBEEH_HISTORY, history.slice(0, 100));
  setTasbeehTotal(getTasbeehTotal() + 1);
};

// Favorites (for duas)
export const getFavorites = (): string[] => {
  return storage.get(STORAGE_KEYS.FAVORITES, []);
};

export const toggleFavorite = (id: string): boolean => {
  const favorites = getFavorites();
  const index = favorites.indexOf(id);

  if (index >= 0) {
    favorites.splice(index, 1);
    storage.set(STORAGE_KEYS.FAVORITES, favorites);
    return false;
  } else {
    favorites.push(id);
    storage.set(STORAGE_KEYS.FAVORITES, favorites);
    return true;
  }
};

// Bookmarks (for Quran)
interface Bookmark {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
}

export const getBookmarks = (): Bookmark[] => {
  return storage.get(STORAGE_KEYS.BOOKMARKS, []);
};

export const toggleBookmark = (surahNumber: number, ayahNumber: number, surahName: string): boolean => {
  const bookmarks = getBookmarks();
  const index = bookmarks.findIndex(b => b.surahNumber === surahNumber && b.ayahNumber === ayahNumber);

  if (index >= 0) {
    bookmarks.splice(index, 1);
    storage.set(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return false;
  } else {
    bookmarks.push({ surahNumber, ayahNumber, surahName });
    storage.set(STORAGE_KEYS.BOOKMARKS, bookmarks);
    return true;
  }
};

export const getBookmarksForSurah = (surahNumber: number): Set<number> => {
  const bookmarks = getBookmarks();
  return new Set(bookmarks.filter(b => b.surahNumber === surahNumber).map(b => b.ayahNumber));
};

// Prayer Settings
interface PrayerSettings {
  latitude?: number;
  longitude?: number;
  locationName?: string;
}

export const getPrayerSettings = (): PrayerSettings => {
  return storage.get(STORAGE_KEYS.PRAYER_SETTINGS, {});
};

export const setPrayerSettings = (settings: PrayerSettings): void => {
  storage.set(STORAGE_KEYS.PRAYER_SETTINGS, settings);
};

// Prayer Alarm
export const isPrayerAlarmEnabled = (): boolean => {
  return localStorage.getItem(STORAGE_KEYS.PRAYER_ALARM_ENABLED) === 'true';
};

export const setPrayerAlarmEnabled = (enabled: boolean): void => {
  localStorage.setItem(STORAGE_KEYS.PRAYER_ALARM_ENABLED, enabled ? 'true' : 'false');
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.PRAYER_ALARM_ENABLED,
    newValue: enabled ? 'true' : 'false',
  }));
};

export const getReminderMinutes = (): number => {
  return parseInt(localStorage.getItem(STORAGE_KEYS.PRAYER_REMINDER_MINUTES) || '0', 10);
};

export const setReminderMinutes = (minutes: number): void => {
  localStorage.setItem(STORAGE_KEYS.PRAYER_REMINDER_MINUTES, minutes.toString());
};

// Adhan
export const getSelectedAdhanId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SELECTED_ADHAN) || 'adhan-makkah';
};

export const setSelectedAdhanId = (id: string): void => {
  localStorage.setItem(STORAGE_KEYS.SELECTED_ADHAN, id);
};

// Hadith cache
interface CachedHadith {
  date: string;
  hadith: string;
  book: string;
  number: string;
}

export const getCachedHadith = (): CachedHadith | null => {
  return storage.get(STORAGE_KEYS.LAST_HADITH, null);
};

export const setCachedHadith = (hadith: CachedHadith): void => {
  storage.set(STORAGE_KEYS.LAST_HADITH, hadith);
};
