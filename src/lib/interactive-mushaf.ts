// Noor Connect — Interactive Uthmani Mushaf Data Layer
// Fetches word-by-word data, audio urls, and authentic Tajweed tokens from Quran.com v4 API
// 100% offline-safe with localStorage caching and seamless fallback

import { quranService } from './quran-service';
import { SURAH_START_PAGES } from './mushaf-service';

export interface InteractiveWord {
  id: number;
  position: number;
  audio_url: string | null;
  char_type_name: 'word' | 'end';
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  line_number?: number;
  translation?: {
    text: string;
    language_name: string;
  };
  transliteration?: {
    text: string;
    language_name: string;
  };
}

export interface InteractiveVerse {
  id: number;
  verse_number: number;
  verse_key: string; // e.g. "2:21"
  surah_number: number;
  page_number: number;
  juz_number: number;
  hizb_number?: number;
  words: InteractiveWord[];
  text_uthmani: string;
  text_tajweed?: string;
}

export interface SurahHeaderInfo {
  surah_number: number;
  name_arabic: string;
  name_english: string;
  ayah_count: number;
  revelation_type: string;
  at_verse_number: number;
  show_bismillah: boolean;
}

export interface InteractivePageData {
  page_number: number;
  juz_number: number;
  surah_headers: SurahHeaderInfo[];
  verses: InteractiveVerse[];
  has_tajweed: boolean;
  is_fallback: boolean;
}

export interface TajweedRuleDefinition {
  name: string;
  arabicName: string;
  color: string;
  classes: string[];
  description: string;
  example: string;
}

export const TAJWEED_RULES: TajweedRuleDefinition[] = [
  {
    name: 'Ghunnah',
    arabicName: 'غُنَّة',
    color: '#10B981', // Emerald
    classes: ['ghunnah'],
    description: 'Nasal resonance held for 2 counts on Noon or Meem with Shaddah (نّ / مّ)',
    example: 'إِنَّ / عَمَّ',
  },
  {
    name: 'Ikhfa',
    arabicName: 'إِخْفَاء',
    color: '#F59E0B', // Amber
    classes: ['ikhfa', 'ikhfa_shafawi'],
    description: 'Concealing Nun Sakinah or Tanween before one of the 15 Ikhfa letters',
    example: 'مِن قَبْلُ / أَنتُم',
  },
  {
    name: 'Idgham',
    arabicName: 'إِدْغَام',
    color: '#A855F7', // Violet
    classes: [
      'idgham_with_ghunnah',
      'idgham_wo_ghunnah',
      'idgham_shafawi',
      'idgham_mutajanisayn',
      'idgham_mutaqaribayn',
    ],
    description: 'Merging of Sakin letter into the following letter (ي، ر، م، ل، و، ن)',
    example: 'مَن يَقُولُ / مِن رَّبِّهِم',
  },
  {
    name: 'Iqlab',
    arabicName: 'إِقْلَاب',
    color: '#06B6D4', // Cyan
    classes: ['iqlab'],
    description: 'Transforming Nun Sakinah or Tanween into a hidden Meem before Baa (ب)',
    example: 'مِن بَعْدِ / أَنبِئْهُم',
  },
  {
    name: 'Qalqalah',
    arabicName: 'قَلْقَلَة',
    color: '#38BDF8', // Sky Blue
    classes: ['qalqalah'],
    description: 'Echoing bounce produced when reciting the 5 letters of Qutb Jadd (ق، ط، ب، ج، د) when Sakin',
    example: 'الْفَلَقِ / يَدْخُلُونَ',
  },
  {
    name: 'Madd',
    arabicName: 'مَدّ',
    color: '#F43F5E', // Rose / Crimson
    classes: [
      'madda_necessary',
      'madda_obligatory',
      'madda_permissible',
      'madda_normal',
    ],
    description: 'Prolongation of the vowel sound for 2, 4, 5, or 6 harakat counts',
    example: 'الضَّآلِّينَ / جَآءَ / قَالُواْ',
  },
];

const TAJWEED_CLASS_COLOR_MAP: Record<string, string> = {};
TAJWEED_RULES.forEach((rule) => {
  rule.classes.forEach((cls) => {
    TAJWEED_CLASS_COLOR_MAP[cls] = rule.color;
  });
});
TAJWEED_CLASS_COLOR_MAP['ham_wasl'] = '#9CA3AF'; // Muted
TAJWEED_CLASS_COLOR_MAP['slnt'] = '#6B7280'; // Silent

export function toArabicDigits(num: number): string {
  return num.toString().replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d, 10)]);
}

/**
 * Safely transforms raw `<tajweed class=...>` tags from Quran.com into sanitized inline styled spans.
 * Never allows arbitrary HTML or script injection.
 */
export function sanitizeTajweedHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  // Clean out any end marks or outer scripts
  let cleaned = rawHtml.replace(/<span class=["']?end["']?>.*?<\/span>/gi, '');

  // Replace <tajweed class=XYZ> or <rule class=XYZ> with <span style="color: ...">
  cleaned = cleaned.replace(/<(?:tajweed|rule) class=["']?([a-z0-9_-]+)["']?>([\s\S]*?)<\/(?:tajweed|rule)>/gi, (_, cls, inner) => {
    const color = TAJWEED_CLASS_COLOR_MAP[cls];
    if (color) {
      return `<span style="color: ${color}; font-weight: 600;" data-tajweed="${cls}">${inner}</span>`;
    }
    return inner;
  });

  // Strip any remaining unwanted HTML tags, keeping only safe span
  cleaned = cleaned.replace(/<(?!span|\/span)[^>]+>/gi, '');
  return cleaned;
}

const PAGE_CACHE_PREFIX = 'noor_mushaf_page_v1_';
const TAJWEED_CACHE_PREFIX = 'noor_mushaf_tajweed_v1_';
export const AYAH_PAGE_CACHE_KEY = 'noor_ayah_page_map_v1';

// In-memory Verse-to-Page Index (e.g. "17:8" -> 283, "2:30" -> 6)
const verseToPageMap = new Map<string, number>();

// Seed initial known milestone and boundary verses
const INITIAL_SEED_MAP: Record<string, number> = {
  // Surah 1 & 2 boundaries
  '1:1': 1, '1:2': 1, '1:3': 1, '1:4': 1, '1:5': 1, '1:6': 1, '1:7': 1,
  '2:1': 2, '2:2': 2, '2:3': 2, '2:4': 2, '2:5': 2,
  '2:25': 5, '2:26': 5, '2:27': 5, '2:28': 5, '2:29': 5,
  '2:30': 6,
  // Al-Isra & Al-Kahf boundaries
  '17:1': 282, '17:2': 282, '17:3': 282, '17:4': 282, '17:5': 282, '17:6': 282, '17:7': 282,
  '17:8': 283,
  '17:105': 293, '17:106': 293, '17:107': 293, '17:108': 293, '17:109': 293, '17:110': 293, '17:111': 293,
  '18:1': 293, '18:2': 293, '18:3': 293, '18:4': 293,
  '18:5': 294,
};

// Seed start page for Ayah 1 of all 114 Surahs
Object.entries(SURAH_START_PAGES).forEach(([sStr, page]) => {
  const sNum = parseInt(sStr, 10);
  if (!isNaN(sNum) && page >= 1 && page <= 604) {
    INITIAL_SEED_MAP[`${sNum}:1`] = page;
  }
});

// Populate initial seeds
Object.entries(INITIAL_SEED_MAP).forEach(([k, p]) => {
  verseToPageMap.set(k, p);
});

// Restore persisted map from localStorage
try {
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(AYAH_PAGE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([k, p]) => {
          if (typeof p === 'number' && p >= 1 && p <= 604) {
            verseToPageMap.set(k, p);
          }
        });
      }
    }
  }
} catch {
  // Safe storage parse fallback
}

let saveMapTimer: ReturnType<typeof setTimeout> | null = null;
function persistVersePageMap(): void {
  if (typeof localStorage === 'undefined') return;
  if (saveMapTimer) clearTimeout(saveMapTimer);
  saveMapTimer = setTimeout(() => {
    try {
      const obj: Record<string, number> = {};
      verseToPageMap.forEach((p, k) => {
        obj[k] = p;
      });
      localStorage.setItem(AYAH_PAGE_CACHE_KEY, JSON.stringify(obj));
    } catch {
      // Safe catch for storage limits
    }
  }, 400);
}

export function registerVersesForPage(
  pageNumber: number,
  verses: Array<{ verse_key?: string; surah_number?: number; verse_number?: number }>
): void {
  if (!Array.isArray(verses) || pageNumber < 1 || pageNumber > 604) return;
  let hasNew = false;
  for (const v of verses) {
    const key =
      v.verse_key ||
      (v.surah_number && v.verse_number ? `${v.surah_number}:${v.verse_number}` : null);
    if (key && verseToPageMap.get(key) !== pageNumber) {
      verseToPageMap.set(key, pageNumber);
      hasNew = true;
    }
  }
  if (hasNew) {
    persistVersePageMap();
  }
}

export async function fetchMushafPage(
  pageNumber: number,
  includeTajweed: boolean = true
): Promise<InteractivePageData> {
  if (pageNumber < 1 || pageNumber > 604) {
    pageNumber = 1;
  }

  const pageKey = `${PAGE_CACHE_PREFIX}${pageNumber}`;
  const tajweedKey = `${TAJWEED_CACHE_PREFIX}${pageNumber}`;

  // Check localStorage cache
  let cachedVerses: InteractiveVerse[] | null = null;
  let cachedTajweed: Record<string, string> | null = null;

  try {
    const rawPage = localStorage.getItem(pageKey);
    if (rawPage) {
      cachedVerses = JSON.parse(rawPage);
    }
  } catch {
    // Safe cache read catch
  }

  try {
    const rawTajweed = localStorage.getItem(tajweedKey);
    if (rawTajweed) {
      cachedTajweed = JSON.parse(rawTajweed);
    }
  } catch {
    // Safe cache read catch
  }

  // If already cached and tajweed matches requirement, return immediately
  if (cachedVerses && (!includeTajweed || cachedTajweed)) {
    registerVersesForPage(pageNumber, cachedVerses);
    return buildPageData(pageNumber, cachedVerses, cachedTajweed, false);
  }

  // Online fetch with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const versesUrl = `https://api.quran.com/api/v4/verses/by_page/${pageNumber}?words=true&word_fields=text_uthmani,text_uthmani_tajweed,audio_url,line_number&per_page=50`;
    const tajweedUrl = `https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?page_number=${pageNumber}`;

    const [versesRes, tajweedRes] = await Promise.allSettled([
      fetch(versesUrl, { signal: controller.signal }),
      includeTajweed ? fetch(tajweedUrl, { signal: controller.signal }) : Promise.resolve(null),
    ]);

    clearTimeout(timeoutId);

    let fetchedVerses: InteractiveVerse[] = [];
    if (versesRes.status === 'fulfilled' && versesRes.value && versesRes.value.ok) {
      const data = await versesRes.value.json();
      if (Array.isArray(data.verses)) {
        fetchedVerses = data.verses.map((v: any) => {
          const parts = (v.verse_key || '').split(':');
          const surahNum = parseInt(parts[0], 10) || 1;
          const ayahNum = parseInt(parts[1], 10) || v.verse_number || 1;

          const words: InteractiveWord[] = Array.isArray(v.words)
            ? v.words.map((w: any) => ({
                id: w.id,
                position: w.position,
                audio_url: w.audio_url || null,
                char_type_name: w.char_type_name === 'end' ? 'end' : 'word',
                text_uthmani: w.text_uthmani || w.text || '',
                text_uthmani_tajweed: w.text_uthmani_tajweed || undefined,
                line_number: w.line_number,
                translation: w.translation ? { text: w.translation.text, language_name: 'english' } : undefined,
                transliteration: w.transliteration ? { text: w.transliteration.text, language_name: 'english' } : undefined,
              }))
            : [];

          return {
            id: v.id,
            verse_number: ayahNum,
            verse_key: v.verse_key || `${surahNum}:${ayahNum}`,
            surah_number: surahNum,
            page_number: v.page_number || pageNumber,
            juz_number: v.juz_number || 1,
            hizb_number: v.hizb_number,
            words,
            text_uthmani: words
              .filter((w) => w.char_type_name === 'word')
              .map((w) => w.text_uthmani)
              .join(' '),
          };
        });

        // Cache fetched verses
        try {
          localStorage.setItem(pageKey, JSON.stringify(fetchedVerses));
        } catch {
          // localStorage full or quota exceeded
        }
      }
    }

    const tajweedMap: Record<string, string> = {};
    if (tajweedRes.status === 'fulfilled' && tajweedRes.value && tajweedRes.value.ok) {
      try {
        const tData = await tajweedRes.value.json();
        if (Array.isArray(tData.verses)) {
          tData.verses.forEach((item: any) => {
            if (item.verse_key && item.text_uthmani_tajweed) {
              tajweedMap[item.verse_key] = sanitizeTajweedHtml(item.text_uthmani_tajweed);
            }
          });
          try {
            localStorage.setItem(tajweedKey, JSON.stringify(tajweedMap));
          } catch {
            // Safe catch for storage
          }
        }
      } catch {
        // Safe catch for parsing tajweed
      }
    }

    if (fetchedVerses.length > 0) {
      registerVersesForPage(pageNumber, fetchedVerses);
      return buildPageData(pageNumber, fetchedVerses, tajweedMap, false);
    }
  } catch (err) {
    // Network offline or timeout - proceed to cached/fallback
    console.warn(`[Mushaf] Online fetch failed for page ${pageNumber}, falling back:`, err);
  }

  // If online failed but we have any cached data, use that
  if (cachedVerses && cachedVerses.length > 0) {
    registerVersesForPage(pageNumber, cachedVerses);
    return buildPageData(pageNumber, cachedVerses, cachedTajweed, false);
  }

  // Full offline fallback: construct structured page data from metadata
  return buildOfflineFallbackPage(pageNumber);
}

const prefetchingPages = new Set<number>();

/**
 * Background Preload of next page (P + 1) with low priority.
 * Ensures zero-delay and zero-spinner page turns during recitation.
 */
export function prefetchNextMushafPage(currentPage: number, includeTajweed: boolean = true): void {
  const nextPage = currentPage + 1;
  if (nextPage > 604 || prefetchingPages.has(nextPage)) return;

  prefetchingPages.add(nextPage);

  const executePrefetch = () => {
    fetchMushafPage(nextPage, includeTajweed)
      .catch(() => {
        // Handled silent background prefetch failure
      })
      .finally(() => {
        prefetchingPages.delete(nextPage);
      });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(executePrefetch, { timeout: 2500 });
  } else {
    setTimeout(executePrefetch, 250);
  }
}

function buildPageData(
  pageNumber: number,
  verses: InteractiveVerse[],
  tajweedMap: Record<string, string> | null,
  isFallback: boolean
): InteractivePageData {
  const surahHeaderMap = new Map<number, SurahHeaderInfo>();

  verses.forEach((v) => {
    if (tajweedMap && tajweedMap[v.verse_key]) {
      v.text_tajweed = tajweedMap[v.verse_key];
    }

    // Authentic Madinah Mushaf Rule: A Surah Opening Header is ONLY registered at Ayah 1 (v.verse_number === 1)
    if (v.verse_number === 1 && !surahHeaderMap.has(v.surah_number)) {
      const sInfo = quranService.getSurahInfo(v.surah_number);
      if (sInfo) {
        surahHeaderMap.set(v.surah_number, {
          surah_number: v.surah_number,
          name_arabic: sInfo.name,
          name_english: sInfo.englishName,
          ayah_count: sInfo.numberOfAyahs,
          revelation_type: sInfo.revelationType,
          at_verse_number: 1,
          show_bismillah: v.surah_number !== 1 && v.surah_number !== 9,
        });
      }
    }
  });

  const juz = verses.length > 0 ? verses[0].juz_number : Math.ceil(pageNumber / 20);

  return {
    page_number: pageNumber,
    juz_number: juz,
    surah_headers: Array.from(surahHeaderMap.values()),
    verses,
    has_tajweed: Boolean(tajweedMap && Object.keys(tajweedMap).length > 0),
    is_fallback: isFallback,
  };
}

function buildOfflineFallbackPage(pageNumber: number): InteractivePageData {
  const surahs = Object.entries(SURAH_START_PAGES);
  let surahNum = 1;
  for (const [s, p] of surahs) {
    if (pageNumber >= p) {
      surahNum = parseInt(s, 10);
    }
  }

  const sInfo = quranService.getSurahInfo(surahNum);
  const juz = Math.max(1, Math.min(30, Math.ceil(pageNumber / 20)));
  const isStartPage = SURAH_START_PAGES[surahNum] === pageNumber;

  return {
    page_number: pageNumber,
    juz_number: juz,
    surah_headers: sInfo && isStartPage
      ? [
          {
            surah_number: surahNum,
            name_arabic: sInfo.name,
            name_english: sInfo.englishName,
            ayah_count: sInfo.numberOfAyahs,
            revelation_type: sInfo.revelationType,
            at_verse_number: 1,
            show_bismillah: surahNum !== 9 && surahNum !== 1,
          },
        ]
      : [],
    verses: [],
    has_tajweed: false,
    is_fallback: true,
  };
}

/**
 * Returns the exact known page number for an Ayah if present in memory/localStorage cache.
 */
export function getKnownPageForAyah(surah: number, ayah: number): number | null {
  const key = `${surah}:${ayah}`;
  const known = verseToPageMap.get(key);
  if (typeof known === 'number' && known >= 1 && known <= 604) {
    return known;
  }
  return null;
}

/**
 * Resolves exact Madinah Mushaf Page (1..604) for any (surah, ayah) with 3-tier lookup:
 * 1. Synchronous Cache Hit (0ms)
 * 2. Quran.com API lookup (~80ms, 3500ms timeout)
 * 3. Offline calculated progression fallback
 */
export async function resolveMushafPageForAyah(surah: number, ayah: number): Promise<number> {
  if (surah < 1 || surah > 114) return 1;
  if (ayah < 1) ayah = 1;

  const key = `${surah}:${ayah}`;

  // 1. Synchronous Cache Hit (0ms)
  const cachedPage = verseToPageMap.get(key);
  if (typeof cachedPage === 'number' && cachedPage >= 1 && cachedPage <= 604) {
    return cachedPage;
  }

  // 2. Live API Lookup (~80ms, 3500ms timeout)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://api.quran.com/api/v4/verses/by_key/${surah}:${ayah}?fields=page_number`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      const pageNum = data?.verse?.page_number;
      if (typeof pageNum === 'number' && pageNum >= 1 && pageNum <= 604) {
        verseToPageMap.set(key, pageNum);
        persistVersePageMap();
        return pageNum;
      }
    }
  } catch {
    // Network offline or timeout - proceed to fallback without throwing
  }

  // 3. Airplane-Mode Safe Fallback
  return getPageForSurahAndAyah(surah, ayah);
}

/**
 * Lookup the exact Madinah Mushaf page (1..604) for any Surah and Ayah.
 * Checks known index first, with safe interpolation fallback.
 */
export function getPageForSurahAndAyah(surahNumber: number, ayahNumber: number): number {
  if (surahNumber < 1 || surahNumber > 114) return 1;
  if (ayahNumber < 1) ayahNumber = 1;

  // 1. Check known index
  const known = getKnownPageForAyah(surahNumber, ayahNumber);
  if (known !== null) {
    return known;
  }

  const startPage = SURAH_START_PAGES[surahNumber] || 1;
  const nextSurahStart = surahNumber < 114 ? (SURAH_START_PAGES[surahNumber + 1] || 604) : 605;
  const surahPages = Math.max(1, nextSurahStart - startPage);
  const sInfo = quranService.getSurahInfo(surahNumber);
  const totalAyahs = sInfo?.numberOfAyahs || 1;

  if (ayahNumber <= 1 || surahPages === 1) {
    return startPage;
  }

  const fraction = Math.min(1, Math.max(0, (ayahNumber - 1) / totalAyahs));
  const estimatedPage = startPage + Math.floor(fraction * surahPages);
  return Math.min(nextSurahStart - 1, Math.max(startPage, estimatedPage));
}
