/**
 * Siraj — Tilawah Audio Data & Reciter Registry
 *
 * Curated online-first ayah-by-ayah recitation engine with dual CDN endpoints:
 * 1. Primary: cdn.islamic.network/quran/audio/128/{reciterId}/{globalAyahNumber}.mp3
 * 2. Secondary: everyayah.com/data/{everyAyahDir}/{surah3}{ayah3}.mp3
 */

import { quranService } from '@/lib/quran-service';
import {
  QURAN_RECITERS,
  DEFAULT_QURAN_RECITER,
  getReciterById,
  type AuthenticReciter,
  type ReciterStyle,
} from '@/lib/quran-reciters';

export type { AuthenticReciter, ReciterStyle };
export { getReciterById };

export interface TilawahReciter {
  id: string; // Reciter ID (e.g. 'ar.alafasy')
  name: string;
  arabicName: string;
  shortName: string;
  everyAyahDir: string;
  bitrate: string;
  style: string;
  country?: string;
  note?: string;
}

export const TILAWAH_RECITERS: TilawahReciter[] = QURAN_RECITERS;

export const DEFAULT_TILAWAH_RECITER: TilawahReciter = DEFAULT_QURAN_RECITER;

/**
 * 1-indexed cumulative ayah offset cache:
 * Surah 1 starts at global ayah 1, Surah 2 starts at global ayah 8, etc.
 */
const CUMULATIVE_AYAH_OFFSETS: number[] = (() => {
  const offsets: number[] = [0]; // index 0 unused
  let total = 0;
  for (let s = 1; s <= 114; s++) {
    offsets[s] = total;
    const info = quranService.getSurahInfo(s);
    total += info ? info.numberOfAyahs : 0;
  }
  return offsets;
})();

/**
 * Convert Surah and Ayah numbers to global 1..6236 ayah index
 */
export function getGlobalAyahNumber(surah: number, ayah: number): number {
  const safeSurah = Math.max(1, Math.min(114, surah));
  const base = CUMULATIVE_AYAH_OFFSETS[safeSurah] || 0;
  return base + Math.max(1, ayah);
}

/**
 * Convert global 1..6236 ayah number back to { surah, ayah }
 */
export function getSurahAndAyahFromGlobal(globalAyah: number): { surah: number; ayah: number } {
  const safeGlobal = Math.max(1, Math.min(6236, globalAyah));
  for (let s = 1; s <= 114; s++) {
    const nextBase = s === 114 ? 6237 : CUMULATIVE_AYAH_OFFSETS[s + 1];
    if (safeGlobal < nextBase) {
      const ayah = safeGlobal - CUMULATIVE_AYAH_OFFSETS[s];
      return { surah: s, ayah };
    }
  }
  return { surah: 114, ayah: 6 };
}

/**
 * Set of reciters verified and natively hosted on Islamic Network 128kbps CDN
 * (Excludes reciters returning 403 on Islamic Network such as Ghamdi, Sudais, Basit)
 */
const ISLAMIC_NETWORK_HOSTED_IDS = new Set([
  'ar.alafasy',
  'ar.husary',
  'ar.mahermuaiqly',
  'ar.hudhaify',
  'ar.ahmedajamy',
  'ar.shaatree',
]);

/**
 * Return primary audio URL:
 * EveryAyah CDN is the primary authentic source for verse recitation with BunnyCDN CORS headers.
 */
export function getPrimaryAyahAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const reciter = getReciterById(reciterId);
  const everyAyahDir = reciter.everyAyahDir;
  const sStr = String(surah).padStart(3, '0');
  const aStr = String(ayah).padStart(3, '0');

  if (everyAyahDir) {
    return `https://everyayah.com/data/${everyAyahDir}/${sStr}${aStr}.mp3`;
  }

  const effectiveId = reciter.id;
  if (ISLAMIC_NETWORK_HOSTED_IDS.has(effectiveId)) {
    const globalAyah = getGlobalAyahNumber(surah, ayah);
    return `https://cdn.islamic.network/quran/audio/128/${effectiveId}/${globalAyah}.mp3`;
  }

  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return `https://cdn.islamic.network/quran/audio/128/${effectiveId}/${globalAyah}.mp3`;
}

/**
 * Return secondary audio URL (EveryAyah mirror or Islamic Network CDN)
 * Safely accepts either an everyAyahDir or reciterId.
 */
export function getSecondaryAyahAudioUrl(everyAyahDirOrReciterId: string, surah: number, ayah: number): string {
  const reciter = getReciterById(everyAyahDirOrReciterId);
  const dir = reciter?.everyAyahDir || everyAyahDirOrReciterId;
  const sStr = String(surah).padStart(3, '0');
  const aStr = String(ayah).padStart(3, '0');

  if (reciter && ISLAMIC_NETWORK_HOSTED_IDS.has(reciter.id)) {
    const globalAyah = getGlobalAyahNumber(surah, ayah);
    return `https://cdn.islamic.network/quran/audio/128/${reciter.id}/${globalAyah}.mp3`;
  }

  return `https://www.everyayah.com/data/${dir}/${sStr}${aStr}.mp3`;
}

/**
 * Multi-Tier CDN Candidate URLs Chain:
 * 1. EveryAyah Primary CDN
 * 2. EveryAyah Mirror CDN
 * 3. Islamic Network CDN (if verified)
 * 4. Reliable Emergency Fallback (Mishary Alafasy)
 */
export function getCandidateAudioUrls(reciterId: string, surah: number, ayah: number): string[] {
  const reciter = getReciterById(reciterId);
  const sStr = String(surah).padStart(3, '0');
  const aStr = String(ayah).padStart(3, '0');
  const globalAyah = getGlobalAyahNumber(surah, ayah);
  const urls: string[] = [];

  const dir = reciter.everyAyahDir;
  if (dir) {
    urls.push(`https://everyayah.com/data/${dir}/${sStr}${aStr}.mp3`);
    urls.push(`https://www.everyayah.com/data/${dir}/${sStr}${aStr}.mp3`);
  }

  if (ISLAMIC_NETWORK_HOSTED_IDS.has(reciter.id)) {
    urls.push(`https://cdn.islamic.network/quran/audio/128/${reciter.id}/${globalAyah}.mp3`);
  }

  // Emergency reciter fallback (Alafasy)
  if (reciter.id !== 'ar.alafasy') {
    urls.push(`https://everyayah.com/data/Alafasy_128kbps/${sStr}${aStr}.mp3`);
    urls.push(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${globalAyah}.mp3`);
  }

  return urls;
}
