// Hadith Data Layer — uses Vite's import.meta.glob for lazy loading
// Data lives in src/data/hadith-collections/<slug>/hadiths.json

// ─── Types ──────────────────────────────────────────────────────────
export interface EnhancedHadith {
  id: string;
  collection: string;
  bookNumber: string;
  bookName: string;
  chapterNumber?: string;
  chapterName?: string;
  hadithNumber: string;
  arabic: string;
  arabicPlain?: string;
  englishTranslation?: string;
  narrator?: string;
  chain?: string;
  grade?: string;
  category: string;
  tags: string[];
  references?: string;
}

export interface HadithCollection {
  name: string;
  title: string;
  author: string;
  death: string;
  description: string;
  totalHadith: number;
  totalBooks: number;
  books: HadithBook[];
  authenticity: string;
  compilerPeriod: string;
  arabicTitle: string;
}

export interface HadithBook {
  number: string;
  name: string;
  arabicName: string;
  hadithCount: number;
  chapters?: HadithChapter[];
  description?: string;
}

export interface HadithChapter {
  number: string;
  name: string;
  arabicName: string;
  hadithCount: number;
}

// ─── Lazy loaders via Vite glob ─────────────────────────────────────
// Public data base (served by Vite from /public)
const PUBLIC_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
const HADITH_DATA_BASE = `${PUBLIC_BASE}/data/hadith-collections`;

import { loadGzippedJson, isGzipSupported } from "@/lib/gzip-loader";

/**
 * Fetch JSON with transparent gzip support.
 * In the APK the data ships as *.json.gz (see clean-dist-data.js) and is
 * decompressed at runtime; on the web the plain *.json files exist, so we
 * fall back to them automatically. Old WebViews skip gzip entirely.
 */
async function fetchPublicJson<T>(url: string): Promise<T | null> {
  if (isGzipSupported()) {
    try {
      return await loadGzippedJson<T>(`${url}.gz`);
    } catch {
      // No .gz variant (web deployment, legacy build) — fall through to plain JSON silently.
    }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.warn('Failed to fetch %s:', url, err);
    return null;
  }
}

// ─── Caches ─────────────────────────────────────────────────────────
const metadataCache = new Map<string, HadithCollection>();
const hadithCache = new Map<string, EnhancedHadith[]>();

// ─── Collection profiles (instant fallback for UI) ──────────────────
const COLLECTION_PROFILES: Record<string, Omit<HadithCollection, "name" | "books">> = {
  bukhari: {
    title: "Sahih al-Bukhari",
    arabicTitle: "صحيح البخاري",
    author: "Imam Muhammad ibn Ismail al-Bukhari",
    death: "256 AH / 870 CE",
    description: "The most authentic collection of Hadith after the Quran.",
    totalHadith: 14769,
    totalBooks: 97,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "194-256 AH",
  },
  muslim: {
    title: "Sahih Muslim",
    arabicTitle: "صحيح مسلم",
    author: "Imam Muslim ibn al-Hajjaj",
    death: "261 AH / 875 CE",
    description: "Second most authentic collection of Hadith.",
    totalHadith: 14966,
    totalBooks: 57,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "204-261 AH",
  },
  tirmidhi: {
    title: "Sunan al-Tirmidhi",
    arabicTitle: "سنن الترمذي",
    author: "Imam Abu Isa al-Tirmidhi",
    death: "279 AH / 892 CE",
    description: "Collection containing authentic, good, and weak hadith with scholarly commentary.",
    totalHadith: 8002,
    totalBooks: 49,
    authenticity: "Hasan (Good)",
    compilerPeriod: "209-279 AH",
  },
  abudawud: {
    title: "Sunan Abu Dawud",
    arabicTitle: "سنن أبي داود",
    author: "Imam Abu Dawud al-Sijistani",
    death: "275 AH / 889 CE",
    description: "One of the six major Hadith collections focusing on Islamic jurisprudence.",
    totalHadith: 10547,
    totalBooks: 1,
    authenticity: "Hasan (Good)",
    compilerPeriod: "202-275 AH",
  },
  nasai: {
    title: "Sunan al-Nasa'i",
    arabicTitle: "سنن النسائي",
    author: "Imam al-Nasa'i",
    death: "303 AH / 915 CE",
    description: "Collection known for detailed chains of narration and strong authenticity standards.",
    totalHadith: 11399,
    totalBooks: 52,
    authenticity: "Hasan (Good)",
    compilerPeriod: "215-303 AH",
  },
  ibnmajah: {
    title: "Sunan Ibn Majah",
    arabicTitle: "سنن ابن ماجه",
    author: "Imam Ibn Majah",
    death: "273 AH / 887 CE",
    description: "One of the six canonical Hadith collections.",
    totalHadith: 8685,
    totalBooks: 1,
    authenticity: "Hasan (Good)",
    compilerPeriod: "209-273 AH",
  },
  malik: {
    title: "Muwatta Malik",
    arabicTitle: "موطأ مالك",
    author: "Imam Malik ibn Anas",
    death: "179 AH / 795 CE",
    description: "Early collection of Hadith and legal rulings compiled in Medina.",
    totalHadith: 3715,
    totalBooks: 1,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "93-179 AH",
  },
  riyadussalihin: {
    title: "Riyad us-Salihin",
    arabicTitle: "رياض الصالحين",
    author: "Imam al-Nawawi",
    death: "676 AH / 1277 CE",
    description: "Collection focusing on spirituality, character, and daily Islamic practice.",
    totalHadith: 1217,
    totalBooks: 19,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "631-676 AH",
  },
  forty: {
    title: "40 Hadith Nawawi",
    arabicTitle: "الأربعون النووية",
    author: "Imam al-Nawawi",
    death: "676 AH / 1277 CE",
    description: "Forty essential hadith covering the foundations of Islam.",
    totalHadith: 122,
    totalBooks: 1,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "631-676 AH",
  },
  adab: {
    title: "Al-Adab al-Mufrad",
    arabicTitle: "الأدب المفرد",
    author: "Imam al-Bukhari",
    death: "256 AH / 870 CE",
    description: "Collection of hadith focusing on Islamic manners, ethics, and character.",
    totalHadith: 1326,
    totalBooks: 57,
    authenticity: "Varied",
    compilerPeriod: "194-256 AH",
  },
  ahmad: {
    title: "Musnad Ahmad",
    arabicTitle: "مسند أحمد",
    author: "Imam Ahmad ibn Hanbal",
    death: "241 AH / 855 CE",
    description: "One of the largest Hadith collections, organized by narrator rather than topic.",
    totalHadith: 1374,
    totalBooks: 8,
    authenticity: "Varied",
    compilerPeriod: "164-241 AH",
  },
  bulugh: {
    title: "Bulugh al-Maram",
    arabicTitle: "بلوغ المرام",
    author: "Imam Ibn Hajar al-Asqalani",
    death: "852 AH / 1449 CE",
    description: "Concise collection of hadith used as evidence in Islamic jurisprudence.",
    totalHadith: 1767,
    totalBooks: 16,
    authenticity: "Varied",
    compilerPeriod: "773-852 AH",
  },
  darimi: {
    title: "Sunan al-Darimi",
    arabicTitle: "سنن الدارمي",
    author: "Imam Abdullah ibn Abd al-Rahman al-Darimi",
    death: "255 AH / 869 CE",
    description: "Early Hadith collection with strong chains of narration.",
    totalHadith: 3406,
    totalBooks: 24,
    authenticity: "Varied",
    compilerPeriod: "181-255 AH",
  },
  hisn: {
    title: "Hisnul Muslim",
    arabicTitle: "حصن المسلم",
    author: "Sa'id bin Ali bin Wahf Al-Qahtani",
    death: "",
    description: "Comprehensive collection of authentic supplications and remembrances from the Quran and Sunnah.",
    totalHadith: 2,
    totalBooks: 2,
    authenticity: "Sahih (Authentic)",
    compilerPeriod: "",
  },
  mishkat: {
    title: "Mishkat al-Masabih",
    arabicTitle: "مشكاة المصابيح",
    author: "Imam al-Khatib al-Tabrizi",
    death: "741 AH",
    description: "Enhanced version of Masabih al-Sunnah, arranging hadith by theme with grade classifications.",
    totalHadith: 5319,
    totalBooks: 29,
    authenticity: "Varied",
    compilerPeriod: "",
  },
  shamail: {
    title: "Shamail Muhammadiyah",
    arabicTitle: "الشمائل المحمدية",
    author: "Imam al-Tirmidhi",
    death: "279 AH / 892 CE",
    description: "Collection describing the physical appearance, character, and habits of Prophet Muhammad.",
    totalHadith: 402,
    totalBooks: 57,
    authenticity: "Hasan (Good)",
    compilerPeriod: "209-279 AH",
  },
};

// ─── Utility ────────────────────────────────────────────────────────
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function normalizeBook(raw: Partial<HadithBook>, index: number): HadithBook {
  return {
    number: String(raw.number ?? index + 1),
    name: raw.name ?? `Book ${index + 1}`,
    arabicName: raw.arabicName ?? "",
    hadithCount: Number(raw.hadithCount ?? 0),
    chapters: raw.chapters,
    description: raw.description,
  };
}

// ─── Find collection slug from glob paths ───────────────────────────
function getAvailableCollectionSlugs(): string[] {
  return Object.keys(COLLECTION_PROFILES).sort();
}

// ─── Public API ─────────────────────────────────────────────────────

/** Get all known collection slugs */
export function getAllCollectionSlugs(): string[] {
  return getAvailableCollectionSlugs();
}

/** Synchronously get a HadithCollection with fallback profile data (no book details) */
export function getCollectionByName(
  name: string
): HadithCollection | undefined {
  if (metadataCache.has(name)) return metadataCache.get(name);
  const profile = COLLECTION_PROFILES[name];
  if (!profile) return undefined;
  return {
    name,
    books: [],
    ...profile,
  };
}

/** Synchronous list: titles + profiles only (for the collections grid) */
export function getAllCollections(): HadithCollection[] {
  // Start with profile-based collections, then add any data-only collections
  const result: HadithCollection[] = [];
  const seen = new Set<string>();

  for (const slug of Object.keys(COLLECTION_PROFILES)) {
    seen.add(slug);
    if (metadataCache.has(slug)) {
      result.push(metadataCache.get(slug)!);
    } else {
      result.push({ name: slug, books: [], ...COLLECTION_PROFILES[slug] });
    }
  }

  // Add any data-present collections not in profiles
  for (const slug of getAvailableCollectionSlugs()) {
    if (seen.has(slug)) continue;
    seen.add(slug);
    if (metadataCache.has(slug)) {
      result.push(metadataCache.get(slug)!);
    }
  }

  return result;
}

/** Async: load full metadata (with book list) for a single collection */
export async function loadCollectionMetadata(
  slug: string
): Promise<HadithCollection | null> {
  if (metadataCache.has(slug)) return metadataCache.get(slug)!;

  const profile = COLLECTION_PROFILES[slug];
  const raw = await fetchPublicJson<Partial<HadithCollection>>(
    `${HADITH_DATA_BASE}/${slug}/metadata.json`
  );

  if (!raw) {
    if (profile) {
      const col: HadithCollection = { name: slug, books: [], ...profile };
      metadataCache.set(slug, col);
      return col;
    }
    return null;
  }

  const books = Array.isArray(raw.books)
    ? raw.books.map((b, i) => normalizeBook(b, i))
    : [];

  const col: HadithCollection = {
    name: raw.name || slug,
    title: raw.title || profile?.title || titleFromSlug(slug),
    author: raw.author || profile?.author || "",
    death: raw.death || profile?.death || "",
    description: raw.description || profile?.description || "Hadith collection",
    totalHadith: Number(
      raw.totalHadith ??
        profile?.totalHadith ??
        books.reduce((s, b) => s + b.hadithCount, 0)
    ),
    totalBooks: Number(raw.totalBooks ?? profile?.totalBooks ?? books.length),
    books,
    authenticity: raw.authenticity || profile?.authenticity || "",
    compilerPeriod: raw.compilerPeriod || profile?.compilerPeriod || "",
    arabicTitle: raw.arabicTitle || profile?.arabicTitle || "",
  };

  metadataCache.set(slug, col);
  return col;
}

/** Async: load ALL hadiths for a collection */
export async function loadCollectionHadiths(
  slug: string
): Promise<EnhancedHadith[]> {
  const cacheKey = `${slug}:all`;
  if (hadithCache.has(cacheKey)) return hadithCache.get(cacheKey)!;

  const data =
    (await fetchPublicJson<EnhancedHadith[]>(
      `${HADITH_DATA_BASE}/${slug}/hadiths.json`
    )) ??
    (await fetchPublicJson<EnhancedHadith[]>(
      `${HADITH_DATA_BASE}/${slug}/book-1.json`
    ));

  const arr = Array.isArray(data) ? data : [];
  hadithCache.set(cacheKey, arr);
  return arr;
}

/** Async: load hadiths for a specific book within a collection */
export async function loadBookHadiths(
  slug: string,
  bookNumber: string
): Promise<EnhancedHadith[]> {
  const cacheKey = `${slug}:book:${bookNumber}`;
  if (hadithCache.has(cacheKey)) return hadithCache.get(cacheKey)!;

  const all = await loadCollectionHadiths(slug);
  const normalizedTarget = String(
    Number.parseInt(bookNumber, 10) || bookNumber
  );
  const filtered = all.filter((h) => {
    const hBook = String(Number.parseInt(String(h.bookNumber), 10) || h.bookNumber);
    return hBook === normalizedTarget;
  });

  hadithCache.set(cacheKey, filtered);
  return filtered;
}

/** Async: get a random daily hadith based on date seed */
export async function getDailyHadith(
  seed: Date | number = new Date()
): Promise<EnhancedHadith | null> {
  // Pick from major collections with English translations
  const preferredSlugs = ["bukhari", "muslim", "tirmidhi", "abudawud", "nasai", "ibnmajah"];

  const dayIndex = typeof seed === "number"
    ? seed
    : Math.floor(Date.UTC(seed.getFullYear(), seed.getMonth(), seed.getDate()) / 86400000);

  for (const slug of preferredSlugs) {
    const all = await loadCollectionHadiths(slug);
    const withTranslation = all.filter(
      (h) => h.englishTranslation && h.englishTranslation.trim().length > 0
    );

    if (withTranslation.length > 0) {
      return withTranslation[dayIndex % withTranslation.length];
    }

    if (all.length > 0) {
      return all[dayIndex % all.length];
    }
  }

  return null;
}

/** Preload all metadata */
export async function preloadAllMetadata(): Promise<
  Record<string, HadithCollection>
> {
  const result: Record<string, HadithCollection> = {};
  const slugs = getAvailableCollectionSlugs();
  const promises = slugs.map(async (slug) => {
    const meta = await loadCollectionMetadata(slug);
    if (meta) result[slug] = meta;
  });
  await Promise.all(promises);
  return result;
}

/** Get collection title (sync) */
export function getCollectionTitle(name: string): string {
  return COLLECTION_PROFILES[name]?.title || titleFromSlug(name);
}

/** Clear all caches */
export function clearHadithCache(): void {
  metadataCache.clear();
  hadithCache.clear();
}

// Backward compat
export const HADITH_COLLECTIONS: Record<string, HadithCollection> = new Proxy(
  {} as Record<string, HadithCollection>,
  {
    get(_target, prop: string) {
      return getCollectionByName(prop);
    },
    ownKeys() {
      return Object.keys(COLLECTION_PROFILES);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (COLLECTION_PROFILES[prop as string]) {
        return { enumerable: true, configurable: true };
      }
      return undefined;
    },
  }
);
