// Qisas Data Layer — fetches from public/data/qisas/qisas.json
// Follows the same pattern as hadith-collections and seerah

import type {
  QisasBook,
  ProphetStory,
  ProphetSummary,
  QisasMetadata,
} from "./types";

import { isGzipSupported, loadGzippedJson } from "../../lib/gzip-loader";

// ─── Types ──────────────────────────────────────────────────────────
export type { QisasBook, ProphetStory, ProphetSummary, QisasMetadata };

// ─── Lazy loaders via Vite fetch ─────────────────────────────────────
const PUBLIC_BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

const CANDIDATE_URLS = [
  `${PUBLIC_BASE}/data/qisas/qisas.json`,
  "/data/qisas/qisas.json",
  "data/qisas/qisas.json",
  "./data/qisas/qisas.json",
];

const FALLBACK_METADATA: QisasMetadata = {
  id: "qisas-al-anbiya",
  title: "Stories of the Prophets",
  arabicTitle: "قصص الأنبياء",
  author: "Ibn Kathir",
  arabicAuthor: "إسماعيل بن عمر بن كثير",
  description: "Stories of the Prophets from Adam to Isa (peace be upon them all), compiled from Al-Bidayah wan-Nihayah",
  source: "Al-Bidayah wan-Nihayah",
  totalProphets: 24,
  language: "en",
  category: "prophets",
};

// Rich baseline stories ensuring all 5 eras render even if network or JSON fails
const FALLBACK_PROPHETS: ProphetStory[] = [
  {
    id: "prophet-adam",
    number: 1,
    name: "Prophet Adam (AS)",
    arabicName: "آدم",
    title: "The First Human & Prophet",
    arabicTitle: "أول إنسان ونبي",
    era: "beginning-of-creation",
    quranMentions: ["2:30-39", "7:11-27", "20:115-124"],
    story: "Allah informed the angels that He was placing a vicegerent upon the earth. Adam (AS) was fashioned from clay and given life with knowledge of the names of all things.",
    tags: ["creation", "repentance", "first-prophet"],
  },
  {
    id: "prophet-idris",
    number: 2,
    name: "Prophet Idris (AS)",
    arabicName: "إدريس",
    title: "The First to Write with a Pen",
    arabicTitle: "أول من كتب بالقلم",
    era: "beginning-of-creation",
    quranMentions: ["19:56-57", "21:85-86"],
    story: "Prophet Idris (AS) was renowned for truthfulness, patience, and devotion. Allah raised him to an honorable, lofty station.",
    tags: ["knowledge", "patience", "writing"],
  },
  {
    id: "prophet-nuh",
    number: 3,
    name: "Prophet Nuh (AS)",
    arabicName: "نوح",
    title: "The Grateful Servant & Ark Builder",
    arabicTitle: "العبد الشكور وباني السفينة",
    era: "pre-flood",
    quranMentions: ["7:59-64", "11:25-49", "71:1-28"],
    story: "For 950 years, Prophet Nuh (AS) called his people day and night to monotheism. By divine command, he built the Ark that carried the believers and pairs of all living creatures through the Great Deluge.",
    tags: ["ark", "great-flood", "patience", "gratitude"],
  },
  {
    id: "prophet-hud",
    number: 4,
    name: "Prophet Hud (AS)",
    arabicName: "هود",
    title: "Prophet to the People of 'Ad",
    arabicTitle: "نبي قوم عاد",
    era: "pre-flood",
    quranMentions: ["7:65-72", "11:50-60", "26:123-140"],
    story: "Sent to the mighty civilization of 'Ad with their towering pillars of Iram, calling them away from arrogance to the worship of the One Creator.",
    tags: ["ad", "iram", "monotheism"],
  },
  {
    id: "prophet-saleh",
    number: 5,
    name: "Prophet Saleh (AS)",
    arabicName: "صالح",
    title: "Prophet to Thamud & Sign of the She-Camel",
    arabicTitle: "نبي ثمود وآية الناقة",
    era: "pre-flood",
    quranMentions: ["7:73-79", "11:61-68", "26:141-159"],
    story: "Allah granted the people of Thamud a miraculous she-camel as a clear sign, calling them to justice and piety.",
    tags: ["thamud", "she-camel", "hewn-rocks"],
  },
  {
    id: "prophet-ibrahim",
    number: 6,
    name: "Prophet Ibrahim (AS)",
    arabicName: "إبراهيم",
    title: "Khalilullah — The Intimate Friend of Allah",
    arabicTitle: "خليل الله وإمام الحنفاء",
    era: "patriarchal",
    quranMentions: ["2:124-132", "14:35-41", "37:83-113"],
    story: "The champion of monotheism who rejected idols, survived the raging fire by Allah's cool grace, and built the Ka'bah with his son Ismail (AS).",
    tags: ["khalilullah", "kabah", "sacrifice", "tawheed"],
  },
  {
    id: "prophet-ismail",
    number: 7,
    name: "Prophet Ismail (AS)",
    arabicName: "إسماعيل",
    title: "The Forbearing Son & Patriarch of Makkah",
    arabicTitle: "الذبيح الصابر وجد العرب",
    era: "patriarchal",
    quranMentions: ["2:125-129", "19:54-55", "37:101-107"],
    story: "Renowned for forbearance when tested with sacrifice, co-builder of the Holy Ka'bah, and from whose lineage emerged Prophet Muhammad (ﷺ).",
    tags: ["zamzam", "makkah", "obedience"],
  },
  {
    id: "prophet-musa",
    number: 8,
    name: "Prophet Musa (AS)",
    arabicName: "موسى",
    title: "Kalimullah — The One Spoken to by Allah",
    arabicTitle: "كليم الله ومحرر بني إسرائيل",
    era: "israelite",
    quranMentions: ["20:9-98", "28:3-44", "26:10-68"],
    story: "Confronted the tyrant Pharaoh, parted the Red Sea by Allah's power, and received the Torah on Mount Sinai.",
    tags: ["kalimullah", "red-sea", "pharaoh", "torah"],
  },
  {
    id: "prophet-dawud",
    number: 9,
    name: "Prophet Dawud (AS)",
    arabicName: "داود",
    title: "The Righteous King & Psalmist",
    arabicTitle: "الملك الصالح وصاحب الزبور",
    era: "israelite",
    quranMentions: ["2:251", "21:78-80", "38:17-26"],
    story: "Defeated Jalut (Goliath), was granted the Zabur (Psalms), softened iron with his bare hands, and ruled with exemplary justice.",
    tags: ["zabur", "goliath", "wisdom", "kingdom"],
  },
  {
    id: "prophet-sulaiman",
    number: 10,
    name: "Prophet Sulaiman (AS)",
    arabicName: "سليمان",
    title: "The Wise King who Spoke with Animals",
    arabicTitle: "الملك الحكيم ومن سخر له الريح",
    era: "israelite",
    quranMentions: ["21:81-82", "27:15-44", "34:12-14"],
    story: "Granted unmatched authority over the wind, the jinn, and the speech of birds and beasts, leading people to worship Allah through wisdom and grandeur.",
    tags: ["wisdom", "animals", "queen-of-sheba", "kingdom"],
  },
  {
    id: "prophet-isa",
    number: 11,
    name: "Prophet Isa (AS)",
    arabicName: "عيسى",
    title: "Al-Masih — The Spirit & Word from Allah",
    arabicTitle: "المسيح وكلمة الله وروحه",
    era: "post-israelite",
    quranMentions: ["3:45-59", "4:157-159", "5:110-120"],
    story: "Born miraculously to the Virgin Maryam (AS), spoke in infancy, healed the sick by Allah's leave, was raised safely to the heavens, and will return as a sign of justice.",
    tags: ["al-masih", "maryam", "miracles", "injil"],
  },
  {
    id: "prophet-yahya",
    number: 12,
    name: "Prophet Yahya (AS)",
    arabicName: "يحيى",
    title: "The Pure & Gentle Prophet",
    arabicTitle: "النبي الزاهد الحليم",
    era: "post-israelite",
    quranMentions: ["3:38-41", "19:7-15", "21:89-90"],
    story: "Granted wisdom while still a youth, known for compassion toward all creation and steadfast devotion in truth.",
    tags: ["purity", "compassion", "devotion"],
  },
];

type RawEra = "beginning-of-creation" | "antediluvian" | "pre-flood" | "patriarchal" | "israelite" | "post-israelite";

function normalizeEra(era: string): "beginning-of-creation" | "pre-flood" | "patriarchal" | "israelite" | "post-israelite" {
  if (era === "antediluvian" || era === "pre-flood") return "pre-flood";
  if (era === "beginning-of-creation") return "beginning-of-creation";
  if (era === "patriarchal") return "patriarchal";
  if (era === "israelite") return "israelite";
  return "post-israelite";
}

async function fetchQisasJson<T>(): Promise<T | null> {
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
let qisasBookCache: QisasBook | null = null;
const prophetCache = new Map<string, ProphetStory>();

// ─── Public API ─────────────────────────────────────────────────────

/** Load the complete Qisas book (metadata + all prophet stories) */
export async function loadQisasBook(): Promise<QisasBook> {
  if (qisasBookCache) return qisasBookCache;

  const data = await fetchQisasJson<QisasBook>();
  if (data && data.prophets && data.prophets.length > 0) {
    const normalizedProphets: ProphetStory[] = data.prophets.map((p) => ({
      ...p,
      era: normalizeEra(p.era),
      tags: Array.isArray(p.tags) ? p.tags : ["prophets", p.era],
      quranMentions: Array.isArray(p.quranMentions) ? p.quranMentions : [],
    }));

    const book: QisasBook = {
      metadata: {
        ...data.metadata,
        totalProphets: normalizedProphets.length,
      },
      prophets: normalizedProphets,
    };
    qisasBookCache = book;
    return book;
  }

  // Fallback book
  const fallbackBook: QisasBook = {
    metadata: FALLBACK_METADATA,
    prophets: FALLBACK_PROPHETS,
  };
  qisasBookCache = fallbackBook;
  return fallbackBook;
}

/** Load a single prophet story by ID (with full content) */
export async function loadProphetStory(
  prophetId: string
): Promise<ProphetStory | null> {
  if (prophetCache.has(prophetId)) return prophetCache.get(prophetId)!;

  const book = await loadQisasBook();
  const prophet = book.prophets.find((p) => p.id === prophetId);
  if (!prophet) return null;

  prophetCache.set(prophetId, prophet);
  return prophet;
}

/** Load prophet list without heavy story content (for grid view) */
export async function loadProphetList(): Promise<ProphetSummary[]> {
  const book = await loadQisasBook();
  return book.prophets.map((p) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    arabicName: p.arabicName,
    title: p.title,
    arabicTitle: p.arabicTitle,
    era: p.era,
    quranMentions: p.quranMentions ?? [],
    tags: p.tags ?? [],
  }));
}

/** Load prophets filtered by era */
export async function loadProphetsByEra(
  era: "beginning-of-creation" | "pre-flood" | "patriarchal" | "israelite" | "post-israelite" | "all"
): Promise<ProphetSummary[]> {
  const all = await loadProphetList();
  if (era === "all") return all;
  return all.filter((p) => p.era === era);
}

/** Get Qisas metadata only */
export async function loadQisasMetadata(): Promise<QisasMetadata> {
  const book = await loadQisasBook();
  return book.metadata;
}

/** Clear all Qisas caches */
export function clearQisasCache(): void {
  qisasBookCache = null;
  prophetCache.clear();
}
