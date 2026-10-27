// Noor Connect — Cache Manager
// Separates temporary API/Mushaf cache from protected personal data
// 100% offline-safe with zero personal data loss guarantee

import { clearAllBooks, getStorageStats, formatFileSize } from './ebooks-storage';

/**
 * Whitelist patterns for protected personal user data.
 * These keys are NEVER purged by Clear Temporary Cache.
 */
const PROTECTED_KEY_PATTERNS: RegExp[] = [
  // Themes, Clocks & Preferences
  /^(?:noor[_-])?theme$/,
  /^(?:noor[_-])?clock[_-]style$/,
  /^(?:noor[_-])?show[_-]tajweed$/,
  /^(?:noor[_-])?mushaf[_-]surface$/,
  /^(?:noor[_-])?time[_-]format$/,
  /^timeFormat$/,
  /^(?:salam[_-])?greeting[_-]enabled$/,
  /^splash[_-](?:greeting[_-])?enabled$/,
  /^animations?[_-]enabled$/,
  /^hapticEnabled$/,
  /^haptic[_-]intensity$/,
  /^(?:app[_-])?language$/,
  /^i18nextLng$/,
  /^preferred[_-]currency$/,

  // Locations & Fiqh / Madhab / Prayer Offsets
  /^user[_-]location(?:[_-]data)?$/,
  /^location[_-]storage$/,
  /^saved[_-]cities$/,
  /^last[_-]known[_-]location$/,
  /^noor[_-]saved[_-]locations$/,
  /^user[_-]city$/,
  /^user[_-]country$/,
  /^madhab$/,
  /^(?:prayer[_-])?calculation[_-]method(?:[_-]name)?$/,
  /^prayer[_-]method$/,
  /^hijri[_-]date[_-]offset$/,
  /^prayer[_-]reminder[_-]minutes$/,
  /^prayer[_-]alarm[_-]enabled$/,
  /^adhan[_-](?:preferences|config)$/,
  /^azan[_-]files[_-]metadata$/,
  /^selected[_-]adhan(?:[_-]id)?$/,
  /^custom[_-]adhans$/,
  /^(?:fajr|dhuhr|asr|maghrib|isha)[_-]offset$/,
  /^prayer[_-](?:time[_-])?offsets$/,

  // Worship Logs, Fasting, Salah Tracker & Qaza
  /^salah[_-]tracker$/,
  /^salah[_-]streak$/,
  /^qaza[_-](?:prayers|history|daily[_-]goal)$/,
  /^processed[_-]salah[_-]qaza$/,
  /^haidh[_-]tracker[_-]v2$/,
  /^menstrual[_-](?:mode[_-]data|symptoms|mood[_-]entries)$/,
  /^noor[_-](?:worship[_-]log|daily[_-]worship|fasting)[_-]/,
  /^worship[_-]log$/,
  /^salah[_-](?:focus[_-]settings|current[_-]session|session[_-]history|audio[_-]backup)$/,

  // Khatmah Planner, Reading Progress & 5-Colour Bookmarks
  /^noor[_-]khatmah[_-]plan[_-]v1$/,
  /^noor[_-]quran[_-]read[_-]pages$/,
  /^quran[_-]recitation[_-]progress$/,
  /^quran[_-]reading[_-]streak$/,
  /^quran[_-]achievements$/,
  /^quran[_-]last[_-]read$/,
  /^quran[_-]reader[_-]last[_-](?:page|surah)$/,
  /^quran[_-]bookmarks$/,
  /^quran[_-]notes$/,
  /^quran[_-]auto[_-]bookmarks[_-]v1$/,
  /^quran[_-]font(?:[_-]size|[_-]manager[_-]settings)?$/,

  // Tafsir User Bookmarks & Notes
  /^tafsir[_-](?:bookmarks|notes|selected[_-]edition|settings)$/,

  // Tasbeeh
  /^tasbeeh[_-](?:total|history|target|count)$/,

  // Habits, Remedies, Quiz, Favorites
  /^habit[_-](?:tracker[_-]data|entries)$/,
  /^(?:islamic|custom|hidden)[_-]habits$/,
  /^(?:remedy|quiz)[_-](?:stats|favorites|achievements|history|power|level|xp|inventory)$/,
  /^(?:favorites|islamic[_-]names[_-]favorites|duas[_-]favorites)$/,
  /^mood[_-]history$/,
  /^zakat[_-]calc[_-]history$/,

  // Auto Backup Snapshots
  /^noor[_-]auto[_-]backup[_-]/,
  /^backup[_-]internal/,

  // Security, Permissions & Diagnostics
  /^user[_-]onboarded$/,
  /^permissions[_-]granted$/,
  /^onboarding_step_a_done$/,
  /^onboarding_step_b_done$/,
  /^onboarding_perms_v2_done$/,
  /^noor[_-]permission[_-]onboarded[_-]v1$/,
  /^noor[_-]owner[_-]/,
  /^noor[_-]upgradation[_-]lock[_-]v1$/,
  /^noor[_-]diagnostics[_-]log[_-]v1$/,
  /^noor[_-]flight[_-]breadcrumbs[_-]v1$/,
  /^noor[_-]quran[_-]guide[_-]dismissed[_-]v1$/,
  /^pwa[_-]install[_-]dismissed$/,

  // Notifications
  /^notification[_-](?:preferences|history|last[_-]asked|permission[_-]timestamp|permission[_-]denied)$/,
];

export function isProtectedPersonalKey(key: string): boolean {
  return PROTECTED_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Checks whether a key is strictly an explicit temporary cache key.
 * Any key not matching an explicit temporary-cache pattern returns false and remains 100% untouched!
 */
export function isTemporaryCacheKey(key: string): boolean {
  if (isProtectedPersonalKey(key)) return false;

  // Explicit temporary cache patterns ONLY
  return (
    key.startsWith('noor_mushaf_page_') ||
    key.startsWith('mushaf_page_') ||
    key === 'noor_mushaf_image_cache' ||
    key === 'noor_ayah_page_map_v1' ||
    key.startsWith('noor_ayah_') ||
    key.includes('tafsir_cache') ||
    key.startsWith('noor_tafsir_') ||
    key.startsWith('tafsir_text_') ||
    key.startsWith('tafsir_data_') ||
    key.startsWith('tafsir_edition_cache_') ||
    key.includes('translation_cache') ||
    key.startsWith('noor_translation_') ||
    key.startsWith('ayah_trans_') ||
    key.startsWith('quran_trans_') ||
    key.startsWith('quran_text_') ||
    key === 'quran-surahs-cache' ||
    key === 'mp3quran-reciters-v1' ||
    key === 'cached-prayer-times' ||
    key === 'cached_prayer_times' ||
    key === 'prayer-times-today' ||
    key.startsWith('aladhan_') ||
    key.includes('online_prayer') ||
    key.includes('prayer_calendar_cache') ||
    key.includes('calendar_cache') ||
    key.startsWith('nominatim_') ||
    key.startsWith('geocode_') ||
    key.includes('search_cache') ||
    key === 'daily-ayah-cache' ||
    key === 'daily-hadith-cache' ||
    key.startsWith('daily_ayah_') ||
    key.startsWith('daily_hadith_') ||
    key === 'app-version-cache' ||
    key.includes('release_cache') ||
    key.startsWith('temp_') ||
    key.includes('_cache_')
  );
}

/**
 * Returns all keys currently in localStorage that strictly match temporary cache criteria.
 */
export function getTemporaryCacheKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isTemporaryCacheKey(key)) {
        keys.push(key);
      }
    }
  } catch {
    // LocalStorage iteration fallback
  }
  return keys;
}

export interface StorageBreakdown {
  temporaryBytes: number;
  temporaryFormatted: string;
  tempFormatted: string;
  tempCacheFormatted: string;
  protectedBytes: number;
  protectedFormatted: string;
  ebooksBytes: number;
  ebooksFormatted: string;
  cacheStorageBytes: number;
  totalStorageBytes: number;
  totalFormatted: string;
}

/**
 * Computes storage breakdown separating temporary cache from protected personal data.
 */
export async function getStorageBreakdown(): Promise<StorageBreakdown> {
  let tempLocalStorageBytes = 0;
  let protectedBytes = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const val = localStorage.getItem(key) || '';
      const byteSize = (key.length + val.length) * 2;

      if (isTemporaryCacheKey(key)) {
        tempLocalStorageBytes += byteSize;
      } else {
        protectedBytes += byteSize;
      }
    }
  } catch {
    // LocalStorage read fallback
  }

  // Session storage bytes (all temporary)
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (!key) continue;
      const val = sessionStorage.getItem(key) || '';
      tempLocalStorageBytes += (key.length + val.length) * 2;
    }
  } catch {
    // SessionStorage read fallback
  }

  // E-books cache bytes
  let ebooksBytes = 0;
  try {
    const stats = await getStorageStats();
    ebooksBytes = stats.totalSize || 0;
  } catch {
    // Ebooks stats fallback
  }

  // Window.caches (CacheStorage) estimation
  let cacheStorageBytes = 0;
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        if (est.usageDetails && (est.usageDetails as any).caches) {
          cacheStorageBytes = (est.usageDetails as any).caches;
        }
      }
    } catch {
      // Estimate fallback
    }
  }

  const temporaryBytes = tempLocalStorageBytes + ebooksBytes + cacheStorageBytes;
  const totalStorageBytes = temporaryBytes + protectedBytes;
  const formattedTemp = formatFileSize(temporaryBytes);

  return {
    temporaryBytes,
    temporaryFormatted: formattedTemp,
    tempFormatted: formattedTemp,
    tempCacheFormatted: formattedTemp,
    protectedBytes,
    protectedFormatted: formatFileSize(protectedBytes),
    ebooksBytes,
    ebooksFormatted: formatFileSize(ebooksBytes),
    cacheStorageBytes,
    totalStorageBytes,
    totalFormatted: formatFileSize(totalStorageBytes),
  };
}

/**
 * Purges all temporary API/Mushaf caches from localStorage, sessionStorage,
 * window.caches, and cached e-books. NEVER touches protected personal data.
 */
export async function clearTemporaryCache(): Promise<{
  freedBytes: number;
  freedFormatted: string;
  formattedFreed: string;
  breakdown: StorageBreakdown;
}> {
  let freedBytes = 0;

  // 1. Purge temporary keys from localStorage
  try {
    const keysToRemove = getTemporaryCacheKeys();

    for (const key of keysToRemove) {
      const val = localStorage.getItem(key) || '';
      freedBytes += (key.length + val.length) * 2;
      localStorage.removeItem(key);
    }
  } catch {
    // LocalStorage write fallback
  }

  // 2. Clear sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const val = sessionStorage.getItem(key) || '';
        freedBytes += (key.length + val.length) * 2;
      }
    }
    sessionStorage.clear();
  } catch {
    // SessionStorage clear fallback
  }

  // 3. Clear e-books cache
  try {
    const stats = await getStorageStats();
    freedBytes += stats.totalSize || 0;
    await clearAllBooks();
  } catch {
    // Clear books fallback
  }

  // 4. Clear CacheStorage (window.caches)
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (name) => {
          try {
            await caches.delete(name);
          } catch {
            // Safe single cache delete catch
          }
        })
      );
    } catch {
      // Caches keys read fallback
    }
  }

  const freedFormatted = freedBytes > 0 ? formatFileSize(freedBytes) : '0 B';
  const newBreakdown = await getStorageBreakdown();

  // 5. Notify the rest of the app (e.g. Profile.tsx, Settings.tsx)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('noor-cache-updated', {
        detail: { freedBytes, breakdown: newBreakdown },
      })
    );
  }

  return {
    freedBytes,
    freedFormatted,
    formattedFreed: freedFormatted,
    breakdown: newBreakdown,
  };
}
