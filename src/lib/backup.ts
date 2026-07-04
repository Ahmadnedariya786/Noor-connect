import { clearAllBooks, getDownloadedBooks, type DownloadedBook } from './ebooks-storage';
const BACKUP_VERSION = '2.0';

/**
 * Known keys used in localStorage to ensure we capture all relevant data
 */
const STORAGE_KEYS = [
  // Core Settings & Preferences
  'theme',
  'madhab',
  'time-format',
  'calculation-method',
  'prayer-method',
  'hijri-date-offset',
  'prayer-reminder-minutes',
  'language',
  'salam-greeting-enabled',
  'user-gender',
  'user-onboarded',
  'permissions-granted',
  'location-storage',
  'selected-reciter',
  'quran-font-size',
  'quran-font',
  'prayer-alarm-enabled',
  'show-extra-prayers',
  'last-hadith',
  'cached-prayer-times',

  // Salah & Qaza (Most critical for user)
  'salah-tracker',
  'salah-streak',
  'qaza-prayers',
  'processed-salah-qaza',
  'menstrual-mode-data',
  'haidh-tracker-v2',

  // Quran Reader & Features
  'quran-bookmarks',
  'quran-notes',
  'quran-recitation-progress',
  'quran-reading-streak',
  'quran-achievements',
  'quran-translation',
  'quran-font-manager-settings',

  // Tasbeeh
  'tasbeeh-total',
  'tasbeeh-history',

  // Remedies & Gamification
  'remedy-stats',
  'remedy-favorites',
  'daily-remedy',
  'remedy-achievements',
  'remedy-power',
  'remedy-level',
  'remedy-xp',

  // Tafsir
  'tafsir-bookmarks',
  'tafsir-history',
  'tafsir-notes',
  'tafsir-selected-edition',
  'tafsir-edition',
  'tafsir-settings',

  // Habit Tracker
  'habit-tracker-data',
  'islamic-habits',
  'habit-entries',
  'custom-habits',
  'hidden-habits',

  // Quiz & Knowledge
  'quiz-stats',
  'enhanced-quiz-stats',
  'quiz-history',
  'quiz-achievements',

  // Favorites & Social
  'favorites',
  'islamic-names-favorites',
  'mood-history',
  'ramadan-activity',
  'duas-favorites',
  'zakat-calc-history',

  // Notifications & System
  'notification-preferences',
  'azan-files-metadata',
  'selected-adhan-id',
  'custom-adhans',
  'notification-history',
  'pwa-install-dismissed',
  'app-version-cache'
];

interface BackupData {
  version: string;
  exportedAt: string;
  storage: Record<string, string | null>;
  downloadedBooks?: DownloadedBook[];
}

// Export all user data
export const exportBackup = async (): Promise<string> => {
  const downloadedBooks = await getDownloadedBooks();
  const storage: Record<string, string | null> = {};

  // Capture all defined keys
  STORAGE_KEYS.forEach(key => {
    storage[key] = localStorage.getItem(key);
  });

  // Also capture any keys that follow common patterns but aren't explicitly listed
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !STORAGE_KEYS.includes(key)) {
      // Include keys that seem relevant to the app's features
      if (key.startsWith('quran-') || key.startsWith('hadith-') || key.startsWith('tafsir-') || key.startsWith('prayer-')) {
        storage[key] = localStorage.getItem(key);
      }
    }
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    storage,
    downloadedBooks,
  };

  return JSON.stringify(backup, null, 2);
};

// Download backup as file
export const downloadBackup = async (): Promise<void> => {
  const backup = await exportBackup();
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `noor-connect-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Import backup from file
export const importBackup = async (file: File): Promise<{ success: boolean; message: string; booksToDownload?: DownloadedBook[] }> => {
  try {
    const text = await file.text();
    const backup: BackupData = JSON.parse(text);

    if (!backup.version) {
      return { success: false, message: 'Invalid backup file format' };
    }

    // Version 1.0 support (Legacy transformation)
    if (backup.version === '1.0' && (backup as any).data) {
      const legacyData = (backup as any).data;
      Object.entries(legacyData).forEach(([key, value]) => {
        if (value !== null && key !== 'downloadedBooks') {
          const storageKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          localStorage.setItem(storageKey, value as string);
        }
      });

      return {
        success: true,
        message: 'Legacy backup restored successfully!',
        booksToDownload: legacyData.downloadedBooks || []
      };
    }

    // Version 2.0+ support (Direct storage mapping)
    if (backup.storage) {
      Object.entries(backup.storage).forEach(([key, value]) => {
        if (value !== null) {
          localStorage.setItem(key, value);
        }
      });

      // Apply theme immediately if present
      if (backup.storage['theme']) {
        document.documentElement.classList.toggle('dark', backup.storage['theme'] === 'dark');
      }

      return {
        success: true,
        message: 'Backup restored successfully!',
        booksToDownload: backup.downloadedBooks || []
      };
    }

    return { success: false, message: 'Incompatible backup version' };
  } catch (error) {
    console.error('Backup import error:', error);
    return { success: false, message: 'Failed to parse backup file' };
  }
};

// Clear all cache (PDFs and localforage)
export const clearCache = async (): Promise<void> => {
  await clearAllBooks();

  // Clear service worker caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
  }
};

// Helper for UI settings
export const getQuranFontSize = (): number => {
  return parseInt(localStorage.getItem('quran-font-size') || '24', 10);
};

export const setQuranFontSize = (size: number): void => {
  localStorage.setItem('quran-font-size', size.toString());
};
