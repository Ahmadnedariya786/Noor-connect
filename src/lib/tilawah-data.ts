/**
 * Noor Connect — Tilawah Audio Data & Reciter Registry
 *
 * Curated online-first ayah-by-ayah recitation engine with dual CDN endpoints:
 * 1. Primary: cdn.islamic.network/quran/audio/128/{reciterId}/{globalAyahNumber}.mp3
 * 2. Secondary: everyayah.com/data/{everyAyahDir}/{surah3}{ayah3}.mp3
 */

import { quranService } from '@/lib/quran-service';
import { QURAN_RECITERS, DEFAULT_QURAN_RECITER, type AuthenticReciter, type ReciterStyle } from '@/lib/quran-reciters';

export type { AuthenticReciter, ReciterStyle };

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
 * Set of reciters natively hosted on Islamic Network 128kbps CDN
 */
const ISLAMIC_NETWORK_HOSTED_IDS = new Set([
  'ar.alafasy',
  'ar.husary',
  'ar.abdulbasitmurattal',
  'ar.abdurrahmaansudais',
  'ar.mahermuaiqly',
  'ar.saadalghamdi',
  'ar.hudhaify',
  'ar.ahmedajamy',
  'ar.shaatree',
  'ar.aymansowaid',
  'ar.minshawimurattal',
  'ar.abdullahbasfar',
]);

/**
 * Return primary audio URL:
 * If reciter is natively hosted on Islamic Network, use fast CDN;
 * otherwise use EveryAyah directly as primary to prevent any 404 delays!
 */
export function getPrimaryAyahAudioUrl(reciterId: string, surah: number, ayah: number): string {
  const reciter = TILAWAH_RECITERS.find((r) => r.id === reciterId);
  const everyAyahDir = reciter?.everyAyahDir;

  if (ISLAMIC_NETWORK_HOSTED_IDS.has(reciterId)) {
    const globalAyah = getGlobalAyahNumber(surah, ayah);
    return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${globalAyah}.mp3`;
  }

  if (everyAyahDir) {
    const sStr = String(surah).padStart(3, '0');
    const aStr = String(ayah).padStart(3, '0');
    return `https://everyayah.com/data/${everyAyahDir}/${sStr}${aStr}.mp3`;
  }

  const globalAyah = getGlobalAyahNumber(surah, ayah);
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${globalAyah}.mp3`;
}

/**
 * Return secondary audio URL (EveryAyah CDN fallback)
 */
export function getSecondaryAyahAudioUrl(everyAyahDir: string, surah: number, ayah: number): string {
  const sStr = String(surah).padStart(3, '0');
  const aStr = String(ayah).padStart(3, '0');
  return `https://everyayah.com/data/${everyAyahDir}/${sStr}${aStr}.mp3`;
}
