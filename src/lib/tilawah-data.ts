/**
 * Noor Connect — Tilawah Audio Data & Reciter Registry
 *
 * Curated online-first ayah-by-ayah recitation engine with dual CDN endpoints:
 * 1. Primary: cdn.islamic.network/quran/audio/128/{reciterId}/{globalAyahNumber}.mp3
 * 2. Secondary: everyayah.com/data/{everyAyahDir}/{surah3}{ayah3}.mp3
 */

import { quranService } from '@/lib/quran-service';

export interface TilawahReciter {
  id: string; // Islamic Network ID (e.g. 'ar.alafasy')
  name: string;
  arabicName: string;
  shortName: string;
  everyAyahDir: string;
  bitrate: string;
  style: string;
}

export const TILAWAH_RECITERS: TilawahReciter[] = [
  {
    id: 'ar.husary',
    name: 'Mahmoud Khalil Al-Husary',
    arabicName: 'محمود خليل الحصري',
    shortName: 'Al-Husary',
    everyAyahDir: 'Husary_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal (Classical Tajweed Standard)',
  },
  {
    id: 'ar.alafasy',
    name: 'Mishary Rashid Alafasy',
    arabicName: 'مشاري بن راشد العفاسي',
    shortName: 'Alafasy',
    everyAyahDir: 'Alafasy_128kbps',
    bitrate: '128 kbps',
    style: 'Murattal (Melodious & Clear)',
  },
  {
    id: 'ar.abdulbasitmurattal',
    name: 'Abdul Basit (Murattal)',
    arabicName: 'عبد الباسط عبد الصمد',
    shortName: 'Abdul Basit',
    everyAyahDir: 'Abdul_Basit_Murattal_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal (Reverent & Powerful)',
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'Abdurrahman As-Sudais',
    arabicName: 'عبد الرحمن السديس',
    shortName: 'As-Sudais',
    everyAyahDir: 'Abdurrahmaan_As-Sudais_192kbps',
    bitrate: '192 kbps',
    style: 'Murattal (Imam of Masjid al-Haram)',
  },
  {
    id: 'ar.mahermuaiqly',
    name: 'Maher Al-Muaiqly',
    arabicName: 'ماهر المعيقلي',
    shortName: 'Al-Muaiqly',
    everyAyahDir: 'MaherAlMuaiqly128kbps',
    bitrate: '128 kbps',
    style: 'Murattal (Imam of Masjid al-Haram)',
  },
  {
    id: 'ar.saadalghamdi',
    name: 'Saad Al-Ghamdi',
    arabicName: 'سعد الغامدي',
    shortName: 'Al-Ghamdi',
    everyAyahDir: 'Ghamadi_40kbps',
    bitrate: '128 kbps',
    style: 'Murattal (Calm & Reflective)',
  },
];

export const DEFAULT_TILAWAH_RECITER = TILAWAH_RECITERS[1]; // Mishary Alafasy

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
 * Return primary audio URL (Islamic Network 128kbps CDN)
 */
export function getPrimaryAyahAudioUrl(reciterId: string, surah: number, ayah: number): string {
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
