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
const SEERAH_DATA_URL = `${PUBLIC_BASE}/data/seerah/sirah.json`;

async function fetchSeerahJson<T>(url: string): Promise<T | null> {
  if (isGzipSupported()) {
    try {
      return await loadGzippedJson<T>(url + ".gz");
    } catch {
      // Fall through to plain JSON
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
let seerahBookCache: SeerahBook | null = null;
const chapterCache = new Map<string, SeerahChapter>();

// ─── Public API ─────────────────────────────────────────────────────

/** Load the complete Seerah book (metadata + all chapters) */
export async function loadSeerahBook(): Promise<SeerahBook | null> {
  if (seerahBookCache) return seerahBookCache;

  const data = await fetchSeerahJson<SeerahBook>(SEERAH_DATA_URL);
  if (!data) return null;

  seerahBookCache = data;
  return data;
}

/** Load a single chapter by ID (with full content) */
export async function loadSeerahChapter(
  chapterId: string
): Promise<SeerahChapter | null> {
  if (chapterCache.has(chapterId)) return chapterCache.get(chapterId)!;

  const book = await loadSeerahBook();
  if (!book) return null;

  const chapter = book.chapters.find((c) => c.id === chapterId);
  if (!chapter) return null;

  chapterCache.set(chapterId, chapter);
  return chapter;
}

/** Load chapter list without content (for grid view) */
export async function loadSeerahChapterList(): Promise<
  SeerahChapterSummary[]
> {
  const book = await loadSeerahBook();
  if (!book) return [];

  return book.chapters.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    arabicTitle: c.arabicTitle,
    period: c.period,
    tags: c.tags,
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
export async function loadSeerahMetadata(): Promise<SeerahMetadata | null> {
  const book = await loadSeerahBook();
  return book?.metadata ?? null;
}

/** Clear all Seerah caches */
export function clearSeerahCache(): void {
  seerahBookCache = null;
  chapterCache.clear();
}
