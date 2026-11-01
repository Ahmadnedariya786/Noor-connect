/**
 * Noor Connect — In-App Offline Quran Audio Caching Engine
 *
 * 100% in-app audio storage using CacheStorage + IndexedDB.
 * Never redirects the user to external Chrome browser or opens target="_blank" tabs.
 */

import { downloadManager } from './download-manager';

export const OFFLINE_AUDIO_CACHE_NAME = 'noor-offline-quran-audio-v1';
export const OFFLINE_AYAHS_STORAGE_KEY = 'noor_downloaded_ayahs_v1';
export const OFFLINE_SURAHS_STORAGE_KEY = 'noor_downloaded_surahs_v1';

export interface DownloadedSurahMeta {
  surahNumber: number;
  reciterId: string;
  totalAyahs: number;
  totalBytes: number;
  downloadedAt: number;
}

/**
 * Returns the primary EveryAyah CDN audio URL for a given ayah
 */
export function getAyahAudioUrl(subfolder: string, surah: number, ayah: number): string {
  const sStr = String(surah).padStart(3, '0');
  const aStr = String(ayah).padStart(3, '0');
  return `https://everyayah.com/data/${subfolder}/${sStr}${aStr}.mp3`;
}

/**
 * Returns the secondary full-surah stream URL from MP3Quran
 */
export function getFullSurahStreamUrl(surah: number): string {
  const sStr = String(surah).padStart(3, '0');
  return `https://server8.mp3quran.net/afs/${sStr}.mp3`;
}

/**
 * Checks if an ayah's audio is already stored in CacheStorage
 */
export async function isAyahAudioCached(
  subfolder: string,
  surah: number,
  ayah: number
): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) return false;
  try {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
    const url = getAyahAudioUrl(subfolder, surah, ayah);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Checks if a full Surah is marked as downloaded offline
 */
export async function isSurahAudioCached(
  reciterId: string,
  surah: number
): Promise<boolean> {
  try {
    const raw = localStorage.getItem(OFFLINE_SURAHS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed[surah]) {
        return true;
      }
    }
  } catch {
    // Safe storage parse fallback
  }

  try {
    return await downloadManager.isSurahDownloaded(reciterId, surah);
  } catch {
    return false;
  }
}

/**
 * Fetches an individual Ayah MP3 and caches it in CacheStorage (100% in-app)
 */
export async function cacheAyahAudio(
  subfolder: string,
  surah: number,
  ayah: number,
  reciterId = 'alafasy'
): Promise<{ size: number; url: string }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('CacheStorage not supported on this device');
  }

  const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
  const primaryUrl = getAyahAudioUrl(subfolder, surah, ayah);
  const secondaryUrl = `https://audio.qurancdn.com/Alafasy/mp3/${String(surah).padStart(3, '0')}${String(ayah).padStart(3, '0')}.mp3`;

  let response: Response | null = null;
  let targetUrl = primaryUrl;

  try {
    response = await fetch(primaryUrl, { mode: 'cors' });
  } catch {
    // Fallback to secondary CDN
    try {
      response = await fetch(secondaryUrl, { mode: 'cors' });
      targetUrl = secondaryUrl;
    } catch {
      throw new Error('Network offline or audio server unreachable');
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Audio download failed: HTTP ${response?.status || 'network'}`);
  }

  // Clone response so we can store it in cache and calculate size
  const clone = response.clone();
  await cache.put(targetUrl, response);
  if (targetUrl !== primaryUrl) {
    // Also cache under primaryUrl key for deterministic hits
    await cache.put(primaryUrl, clone.clone());
  }

  const blob = await clone.blob();
  const size = blob.size;

  // Record in localStorage
  try {
    const raw = localStorage.getItem(OFFLINE_AYAHS_STORAGE_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[`${surah}:${ayah}`] = {
      surah,
      ayah,
      reciterId,
      size,
      cachedAt: Date.now(),
    };
    localStorage.setItem(OFFLINE_AYAHS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Safe storage fallback
  }

  return { size, url: primaryUrl };
}

/**
 * Downloads and caches all Ayahs for a Surah sequentially with progress notifications
 */
export async function cacheSurahAudio(
  subfolder: string,
  surah: number,
  totalAyahs: number,
  reciterId: string,
  onProgress?: (completed: number, total: number, percent: number) => void,
  signal?: AbortSignal
): Promise<{ totalDownloaded: number; totalBytes: number }> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    throw new Error('CacheStorage not supported on this device');
  }

  let totalBytes = 0;
  let completed = 0;

  for (let a = 1; a <= totalAyahs; a++) {
    if (signal?.aborted) {
      throw new DOMException('Download aborted by user', 'AbortError');
    }

    try {
      const alreadyCached = await isAyahAudioCached(subfolder, surah, a);
      if (!alreadyCached) {
        const { size } = await cacheAyahAudio(subfolder, surah, a, reciterId);
        totalBytes += size;
      }
    } catch (e) {
      console.warn(`Failed to cache ayah ${surah}:${a}`, e);
    }

    completed++;
    const percent = Math.round((completed / totalAyahs) * 100);
    onProgress?.(completed, totalAyahs, percent);
  }

  // Attempt to fetch & store full-surah MP3 stream in downloadManager for Settings > Storage
  try {
    const streamUrl = getFullSurahStreamUrl(surah);
    const res = await fetch(streamUrl, { mode: 'cors', signal });
    if (res.ok) {
      const surahBlob = await res.blob();
      await downloadManager.saveSurah(reciterId, surah, surahBlob);
      totalBytes += surahBlob.size;
    }
  } catch (e) {
    // Fallback: full surah stream not strictly mandatory if individual ayahs are cached
    console.debug('Full surah stream storage fallback:', e);
  }

  // Record Surah meta in localStorage
  try {
    const raw = localStorage.getItem(OFFLINE_SURAHS_STORAGE_KEY);
    const map: Record<string, DownloadedSurahMeta> = raw ? JSON.parse(raw) : {};
    map[String(surah)] = {
      surahNumber: surah,
      reciterId,
      totalAyahs,
      totalBytes,
      downloadedAt: Date.now(),
    };
    localStorage.setItem(OFFLINE_SURAHS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage fallback
  }

  return { totalDownloaded: completed, totalBytes };
}

/**
 * Resolves an audio URL for seamless playback: returns Blob URL if cached in CacheStorage,
 * or original online stream URL if not yet downloaded.
 */
export async function resolveAudioPlaybackUrl(onlineUrl: string): Promise<string> {
  if (typeof window === 'undefined' || !('caches' in window)) return onlineUrl;

  try {
    const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
    const match = await cache.match(onlineUrl);
    if (match) {
      const blob = await match.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // Fallback directly to online URL
  }

  return onlineUrl;
}
