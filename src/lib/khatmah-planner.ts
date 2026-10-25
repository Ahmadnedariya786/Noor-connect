/**
 * Smart Paced Khatmah Planner Module (604 Mushaf Pages)
 * Single Source of Truth for Khatmah plans and syncs with Home QURAN PROGRESS.
 */

import { mushafService } from './mushaf-service';
import { quranService } from './quran-service';
import { quranFeaturesService } from './quran-features';

export interface KhatmahPlan {
  id: string;
  startDate: string;      // ISO string
  targetDays: number;     // 30, 60, 90, or custom 7-365
  startPage: number;      // 1
  currentPage: number;    // 0 to 604 (number of pages read)
  completedKhatmahs: number;
  lastUpdated: string;
  status: 'active' | 'completed';
}

export interface KhatmahPortionInfo {
  pagesPerDay: number;
  daysRemaining: number;
  startPage: number;
  endPage: number;
  portionPages: number;
  startSurahName: string;
  startSurahArabic: string;
  startSurahNumber: number;
  percent: number;
}

const KHATMAH_STORAGE_KEY = 'noor-khatmah-plan';
const QURAN_PROGRESS_KEY = 'quran-reading-progress';

/**
 * Load current Khatmah plan from localStorage
 */
export const getKhatmahPlan = (): KhatmahPlan | null => {
  try {
    const raw = localStorage.getItem(KHATMAH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as KhatmahPlan;
  } catch {
    // Return null on storage parse error
    return null;
  }
};

/**
 * Save Khatmah plan and sync with Home Dashboard and widgets
 */
export const saveKhatmahPlan = (plan: KhatmahPlan): void => {
  try {
    localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(plan));

    // Sync with Home QURAN PROGRESS storage key
    const totalPages = 604;
    const pagesRead = Math.min(totalPages, Math.max(0, plan.currentPage));
    const percent = Math.round((pagesRead / totalPages) * 100);

    const surahNum = mushafService.getSurahForPage(Math.max(1, pagesRead)) || 1;
    const surahInfo = quranService.getSurahInfo(surahNum);

    const progressPayload = {
      currentSurah: surahNum,
      currentAyah: 1,
      currentJuz: Math.min(30, Math.ceil(pagesRead / 20) || 1),
      totalPagesRead: pagesRead,
      totalPercent: percent,
      dailyStreak: 1,
      lastReadTimestamp: Date.now(),
      lastReadLabel: surahInfo?.englishName || `Page ${pagesRead}`,
      goalPercent: percent,
      completedKhatmahs: plan.completedKhatmahs,
      lastUpdated: Date.now(),
    };

    localStorage.setItem(QURAN_PROGRESS_KEY, JSON.stringify(progressPayload));

    // Also update recitation progress in quranFeaturesService for overall progress sync
    quranFeaturesService.updateRecitationProgress(
      surahNum,
      surahInfo?.englishName || 'Al-Baqarah',
      surahInfo?.numberOfAyahs || 286,
      Math.round((pagesRead / totalPages) * (surahInfo?.numberOfAyahs || 286)),
      1,
      pagesRead,
      totalPages
    ).catch(() => {
      // Safe catch for features service sync
    });

    // Dispatch custom events for instant reactive UI updates
    window.dispatchEvent(new CustomEvent('noorconnect:quran-progress-changed'));
    window.dispatchEvent(new CustomEvent('widget-refresh'));
  } catch {
    // Storage write fallback
  }
};

/**
 * Start or reconfigure a Khatmah plan
 */
export const startKhatmah = (targetDays: number, startPage = 0): KhatmahPlan => {
  const existing = getKhatmahPlan();
  const completedCount = existing?.completedKhatmahs || 0;

  const newPlan: KhatmahPlan = {
    id: `khatmah-${Date.now()}`,
    startDate: new Date().toISOString(),
    targetDays: Math.min(365, Math.max(7, targetDays)),
    startPage: 1,
    currentPage: Math.min(604, Math.max(0, startPage)),
    completedKhatmahs: completedCount,
    lastUpdated: new Date().toISOString(),
    status: 'active',
  };

  saveKhatmahPlan(newPlan);
  return newPlan;
};

/**
 * Increment pages read by delta (+1 by default)
 */
export const advanceKhatmahPage = (delta = 1): KhatmahPlan => {
  const current = getKhatmahPlan() || startKhatmah(30, 0);
  const newPage = Math.min(604, current.currentPage + delta);
  const isCompleted = newPage >= 604;

  const updatedPlan: KhatmahPlan = {
    ...current,
    currentPage: newPage,
    completedKhatmahs: isCompleted ? current.completedKhatmahs + 1 : current.completedKhatmahs,
    status: isCompleted ? 'completed' : 'active',
    lastUpdated: new Date().toISOString(),
  };

  saveKhatmahPlan(updatedPlan);
  return updatedPlan;
};

/**
 * Complete today's calculated portion in 1 tap
 */
export const completeTodayKhatmahPortion = (): KhatmahPlan => {
  const current = getKhatmahPlan() || startKhatmah(30, 0);
  const portion = getKhatmahPortion(current);
  const newPage = Math.min(604, portion.endPage);
  const isCompleted = newPage >= 604;

  const updatedPlan: KhatmahPlan = {
    ...current,
    currentPage: newPage,
    completedKhatmahs: isCompleted ? current.completedKhatmahs + 1 : current.completedKhatmahs,
    status: isCompleted ? 'completed' : 'active',
    lastUpdated: new Date().toISOString(),
  };

  saveKhatmahPlan(updatedPlan);
  return updatedPlan;
};

/**
 * Reset / Cancel active Khatmah plan
 */
export const resetKhatmahPlan = (): void => {
  try {
    const existing = getKhatmahPlan();
    if (existing) {
      // Preserve completed Khatmahs count when resetting plan
      const preserved: KhatmahPlan = {
        ...existing,
        currentPage: 0,
        status: 'completed',
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(KHATMAH_STORAGE_KEY, JSON.stringify(preserved));
    } else {
      localStorage.removeItem(KHATMAH_STORAGE_KEY);
    }
    window.dispatchEvent(new CustomEvent('noorconnect:quran-progress-changed'));
  } catch {
    // Storage fallback
  }
};

/**
 * Calculate dynamic re-pacing portion information for today
 */
export const getKhatmahPortion = (plan: KhatmahPlan): KhatmahPortionInfo => {
  const totalPages = 604;
  const remainingPages = Math.max(0, totalPages - plan.currentPage);

  const startMs = new Date(plan.startDate).getTime();
  const nowMs = Date.now();
  const elapsedDays = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(1, plan.targetDays - elapsedDays);

  const pagesPerDay = remainingPages > 0
    ? Math.min(remainingPages, Math.max(1, Math.ceil(remainingPages / daysRemaining)))
    : 0;

  const startPage = Math.min(totalPages, plan.currentPage + 1);
  const endPage = Math.min(totalPages, plan.currentPage + pagesPerDay);
  const portionPages = remainingPages > 0 ? (endPage - startPage + 1) : 0;

  const startSurahNumber = mushafService.getSurahForPage(startPage) || 1;
  const surahInfo = quranService.getSurahInfo(startSurahNumber);

  const percent = Math.min(100, Math.round((plan.currentPage / totalPages) * 100));

  return {
    pagesPerDay,
    daysRemaining,
    startPage,
    endPage,
    portionPages,
    startSurahName: surahInfo?.englishName || 'Al-Fatihah',
    startSurahArabic: surahInfo?.name || 'الفاتحة',
    startSurahNumber,
    percent,
  };
};

/**
 * Prepares navigation URL and updates reader last-read state so the reader
 * opens exactly at the requested page and surah.
 */
export const prepareReaderRouteForPage = (targetPage: number): string => {
  const pageNum = Math.min(604, Math.max(1, targetPage));
  const surahNum = mushafService.getSurahForPage(pageNum) || 1;
  const surahInfo = quranService.getSurahInfo(surahNum);
  const surahStartPage = mushafService.getPageForSurah(surahNum);
  const pageInSurah = Math.max(1, pageNum - surahStartPage + 1);

  // Store into quran-last-read so reader immediately opens on the exact page
  try {
    const lastReadData = {
      number: surahNum,
      name: surahInfo?.name || 'Al-Fatihah',
      englishName: surahInfo?.englishName || 'Al-Fatihah',
      arabicName: surahInfo?.name || 'الفاتحة',
      page: pageInSurah,
      totalPages: 10,
    };
    localStorage.setItem('quran-last-read', JSON.stringify(lastReadData));
  } catch {
    // Storage fallback
  }

  return `/quran/surah-${surahNum}`;
};
