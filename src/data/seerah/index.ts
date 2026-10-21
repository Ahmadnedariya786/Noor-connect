// Seerah Data Layer — fetches from public/data/seerah/sirah.json
// Follows the same pattern as hadith-collections

import type {
  SeerahBook,
  SeerahChapter,
  SeerahChapterSummary,
  SeerahMetadata,
} from "./types";

import { isGzipSupported, loadGzippedJson } from "../../lib/gzip-loader";

// ─── Types ──────────────────────────────────────────────────────────
export type { SeerahBook, SeerahChapter, SeerahChapterSummary, SeerahMetadata };

// ─── Lazy loaders via Vite fetch ─────────────────────────────────────
const PUBLIC_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const CANDIDATE_URLS = [
  `${PUBLIC_BASE}/data/seerah/sirah.json`,
  "/data/seerah/sirah.json",
  "data/seerah/sirah.json",
  "./data/seerah/sirah.json",
];

// Fallback metadata & baseline chapters to ensure 0-data never occurs
const FALLBACK_METADATA: SeerahMetadata = {
  id: "sirah-sealed-nectar",
  title: "Ar-Raheeq Al-Makhtum (The Sealed Nectar)",
  arabicTitle: "الرحيق المختوم",
  author: "Safiur Rahman Mubarakpuri",
  arabicAuthor: "صفي الرحمن المباركفوري",
  description: "A comprehensive biography of Prophet Muhammad (peace be upon him), honored with first prize by the Muslim World League.",
  source: "Darussalam Publications",
  totalChapters: 17,
  language: "en",
  category: "seerah",
};

const FALLBACK_CHAPTERS: SeerahChapter[] = [
  {
    id: "sirah-1",
    number: 1,
    title: "Location and Nature of Arab Tribes",
    arabicTitle: "موقع وطبيعة القبائل العربية",
    period: "pre-prophethood",
    content: "The Arabian Peninsula had maintained great historical importance. Arab kinfolks were divided into Perishing Arabs, Pure Arabs (Qahtan), and Arabized Arabs ('Adnan). The sanctuary of Makkah was blessed through Prophet Ibrahim and Ismail (peace be upon them).",
    tags: ["geography", "tribes", "pre-islamic", "arabia"],
  },
  {
    id: "sirah-2",
    number: 2,
    title: "Muhammad's Birth and Forty Years prior to Prophethood",
    arabicTitle: "مولد النبي وأربعون عاماً قبل النبوة",
    period: "pre-prophethood",
    content: "Prophet Muhammad (ﷺ) was born in Makkah in the Year of the Elephant. He was known as Al-Amin (the Trustworthy) and Al-Sadiq (the Truthful), participating in the rebuilding of the Ka'bah and the Pact of Al-Fudul.",
    tags: ["birth", "youth", "al-amin", "makkah"],
  },
  {
    id: "sirah-3",
    number: 3,
    title: "The Second Phase Open Preaching",
    arabicTitle: "الدعوة جهاراً والمرحلة الثانية",
    period: "makkan",
    content: "When Allah commanded the Prophet (ﷺ) to proclaim the message openly, he ascended Mount Safa and invited the clans of Quraish to Tawheed and righteous living.",
    tags: ["dawah", "mount-safa", "quraish", "makkan-period"],
  },
  {
    id: "sirah-4",
    number: 4,
    title: "Factors Inspiring Patience and Perseverance",
    arabicTitle: "عوامل الصبر والثبات",
    period: "makkan",
    content: "The early Muslims showed steadfast perseverance in the face of intense boycott and persecution, anchored in unwavering faith in Allah and hope for the hereafter.",
    tags: ["patience", "persecution", "steadfastness", "sahabah"],
  },
  {
    id: "sirah-5",
    number: 5,
    title: "The Third Phase Calling unto Islam beyond Makkah",
    arabicTitle: "الدعوة خارج مكة",
    period: "makkan",
    content: "The Prophet (ﷺ) journeyed to Ta'if to invite its leaders to Islam, faced hardship, and supplicated with profound humility. Soon after, the miraculous night journey of Al-Isra' wal-Mi'raj took place.",
    tags: ["taif", "isra-miraj", "tribes", "migration-prep"],
  },
  {
    id: "sirah-6",
    number: 6,
    title: "In An-Nadwah House — The Parliament of Quraish",
    arabicTitle: "في دار الندوة وبرلمان قريش",
    period: "makkan",
    content: "Quraish convened in Dar an-Nadwah plotting to extinguish the light of Islam, but Allah protected His Messenger and enabled the historic Hijrah to Madinah.",
    tags: ["dar-an-nadwah", "quraish-plot", "hijrah", "migration"],
  },
  {
    id: "sirah-7",
    number: 7,
    title: "A New Society Being Built in Madinah",
    arabicTitle: "بناء مجتمع جديد في المدينة",
    period: "madinan",
    content: "Upon arriving in Yathrib (Madinah), the Prophet (ﷺ) built the Prophet's Mosque, established the brotherhood (Mu'akhah) between Muhajirun and Ansar, and drafted the Constitution of Madinah.",
    tags: ["madinah", "masjid-an-nabawi", "brotherhood", "constitution"],
  },
  {
    id: "sirah-8",
    number: 8,
    title: "The Battle of Badr",
    arabicTitle: "غزوة بدر الكبرى",
    period: "madinan",
    content: "The decisive day of criterion (Yawm al-Furqan) on the 17th of Ramadan in the 2nd year of Hijrah, where faith triumphed with divine angels sent to aid the believers.",
    tags: ["battle-of-badr", "victory", "ramadan", "angels"],
  },
  {
    id: "sirah-9",
    number: 9,
    title: "Military Activities between Badr and Uhud",
    arabicTitle: "الأحداث العسكرية بين بدر وأحد",
    period: "madinan",
    content: "Key missions secured the frontiers of Madinah against aggressive coalitions and established peace across regional trade routes.",
    tags: ["security", "madinah-defense", "expeditions"],
  },
  {
    id: "sirah-10",
    number: 10,
    title: "The Battle of Uhud",
    arabicTitle: "غزوة أحد",
    period: "madinan",
    content: "A momentous trial in Shawwal 3 AH testing discipline and obedience, highlighting the bravery of the Prophet (ﷺ) and the martyrdom of Hamzah (RA).",
    tags: ["battle-of-uhud", "discipline", "hamzah", "sacrifice"],
  },
  {
    id: "sirah-11",
    number: 11,
    title: "Missions between Uhud and the Confederates",
    arabicTitle: "السرايا والغزوات بين أحد والخندق",
    period: "madinan",
    content: "Subsequent expeditions demonstrated resilience and re-established spiritual and moral leadership across the region.",
    tags: ["expeditions", "leadership", "steadfastness"],
  },
  {
    id: "sirah-12",
    number: 12,
    title: "Al-Ahzab — The Battle of the Trench",
    arabicTitle: "غزوة الأحزاب والخندق",
    period: "madinan",
    content: "Besieged by 10,000 confederates, the believers dug a defensive trench around Madinah on Salman Al-Farsi's advice, enduring severe trial before Allah sent a storm that scattered the enemy forces.",
    tags: ["al-ahzab", "battle-of-the-trench", "salman-al-farsi", "divine-aid"],
  },
  {
    id: "sirah-13",
    number: 13,
    title: "The Treaty of Hudaybiyyah",
    arabicTitle: "صلح الحديبية ومرحلة جديدة",
    period: "madinan",
    content: "The peaceful pact of Hudaybiyyah in 6 AH, termed by Allah as a 'clear triumph' (Fathan Mubeena), enabling unprecedented growth of Islam through peaceful dialogue.",
    tags: ["hudaybiyyah", "peace-treaty", "pledge-of-ridwan", "triumph"],
  },
  {
    id: "sirah-14",
    number: 14,
    title: "Letters to World Rulers & Conquest of Khaybar",
    arabicTitle: "رسائل الملوك وفتح خيبر",
    period: "madinan",
    content: "The Prophet (ﷺ) dispatched emissaries with letters to the emperors of Rome, Persia, Abyssinia, and Egypt, calling them to the message of Islam.",
    tags: ["letters", "emperors", "khaybar", "international-dawah"],
  },
  {
    id: "sirah-15",
    number: 15,
    title: "The Conquest of Makkah",
    arabicTitle: "فتح مكة العظيم",
    period: "madinan",
    content: "In Ramadan 8 AH, the Prophet (ﷺ) entered Makkah in triumphant humility, cleansed the Ka'bah of all 360 idols, and proclaimed universal forgiveness: 'Go, for you are free.'",
    tags: ["fath-makkah", "cleansing-kabah", "forgiveness", "triumph"],
  },
  {
    id: "sirah-16",
    number: 16,
    title: "The Farewell Pilgrimage (Hajjat al-Wada')",
    arabicTitle: "حجة الوداع وخطبة الوداع",
    period: "madinan",
    content: "In 10 AH, over 100,000 companions performed pilgrimage with the Prophet (ﷺ). He delivered the Farewell Sermon atop Mount Arafat, declaring universal human equality and the completion of faith.",
    tags: ["hajjat-al-wada", "farewell-sermon", "equality", "arafat"],
  },
  {
    id: "sirah-17",
    number: 17,
    title: "The Journey to Allah, the Sublime",
    arabicTitle: "الرفيق الأعلى والوفاة الشريفة",
    period: "final-days",
    content: "In Rabi' al-Awwal 11 AH, the Messenger of Allah (ﷺ) chose 'Ar-Rafiq Al-A'la' (the Highest Companion in Paradise), leaving behind the Quran and the Sunnah as guidance for all mankind.",
    tags: ["final-days", "ar-rafiq-al-ala", "legacy", "sunnah"],
  },
];

async function fetchSeerahJson<T>(): Promise<T | null> {
  for (const url of CANDIDATE_URLS) {
    if (isGzipSupported()) {
      try {
        const gzData = await loadGzippedJson<T>(url + ".gz");
        if (gzData) return gzData;
      } catch {
        // Fall through to plain JSON
      }
    }
    try {
      const res = await fetch(url);
      if (res.ok) {
        return (await res.json()) as T;
      }
    } catch {
      // Continue to next candidate URL
    }
  }
  return null;
}

// ─── Caches ─────────────────────────────────────────────────────────
let seerahBookCache: SeerahBook | null = null;
const chapterCache = new Map<string, SeerahChapter>();

// ─── Public API ─────────────────────────────────────────────────────

/** Load the complete Seerah book (metadata + all chapters) */
export async function loadSeerahBook(): Promise<SeerahBook> {
  if (seerahBookCache) return seerahBookCache;

  const data = await fetchSeerahJson<SeerahBook>();
  if (data && data.chapters && data.chapters.length > 0) {
    // Normalize chapters
    const normalizedChapters: SeerahChapter[] = data.chapters.map((c) => ({
      ...c,
      tags: Array.isArray(c.tags) ? c.tags : ["seerah", c.period],
    }));

    const book: SeerahBook = {
      metadata: {
        ...data.metadata,
        totalChapters: normalizedChapters.length,
      },
      chapters: normalizedChapters,
    };
    seerahBookCache = book;
    return book;
  }

  // Graceful fallback: never leave the user with 0 chapters
  const fallbackBook: SeerahBook = {
    metadata: FALLBACK_METADATA,
    chapters: FALLBACK_CHAPTERS,
  };
  seerahBookCache = fallbackBook;
  return fallbackBook;
}

/** Load a single chapter by ID (with full content) */
export async function loadSeerahChapter(
  chapterId: string
): Promise<SeerahChapter | null> {
  if (chapterCache.has(chapterId)) return chapterCache.get(chapterId)!;

  const book = await loadSeerahBook();
  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;

  chapterCache.set(chapterId, chapter);
  return chapter;
}

/** Load chapter list without heavy content (for grid view) */
export async function loadSeerahChapterList(): Promise<SeerahChapterSummary[]> {
  const book = await loadSeerahBook();
  return book.chapters.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    arabicTitle: c.arabicTitle,
    period: c.period,
    tags: c.tags ?? [],
  }));
}

/** Load chapters filtered by period */
export async function loadSeerahChaptersByPeriod(
  period: "pre-prophethood" | "makkan" | "madinan" | "final-days" | "all"
): Promise<SeerahChapterSummary[]> {
  const all = await loadSeerahChapterList();
  if (period === "all") return all;
  return all.filter((c) => c.period === period);
}

/** Get Seerah metadata only */
export async function loadSeerahMetadata(): Promise<SeerahMetadata> {
  const book = await loadSeerahBook();
  return book.metadata;
}

/** Clear all Seerah caches */
export function clearSeerahCache(): void {
  seerahBookCache = null;
  chapterCache.clear();
}
