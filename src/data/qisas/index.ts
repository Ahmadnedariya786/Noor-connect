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
const QISAS_DATA_URL = `${PUBLIC_BASE}/data/qisas/qisas.json`;

async function fetchQisasJson<T>(url: string): Promise<T | null> {
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
let qisasBookCache: QisasBook | null = null;
const prophetCache = new Map<string, ProphetStory>();

// ─── Public API ─────────────────────────────────────────────────────

/** Load the complete Qisas book (metadata + all prophet stories) */
export async function loadQisasBook(): Promise<QisasBook | null> {
  if (qisasBookCache) return qisasBookCache;

  const data = await fetchQisasJson<QisasBook>(QISAS_DATA_URL);
  if (!data) return null;

  qisasBookCache = data;
  return data;
}

/** Load a single prophet story by ID (with full content) */
export async function loadProphetStory(
  prophetId: string
): Promise<ProphetStory | null> {
  if (prophetCache.has(prophetId)) return prophetCache.get(prophetId)!;

  const book = await loadQisasBook();
  if (!book) return null;

  const prophet = book.prophets.find((p) => p.id === prophetId);
  if (!prophet) return null;

  prophetCache.set(prophetId, prophet);
  return prophet;
}

/** Load prophet list without story content (for grid view) */
export async function loadProphetList(): Promise<ProphetSummary[]> {
  const book = await loadQisasBook();
  if (!book) return [];

  return book.prophets.map((p) => ({
    id: p.id,
    number: p.number,
    name: p.name,
    arabicName: p.arabicName,
    title: p.title,
    arabicTitle: p.arabicTitle,
    era: p.era,
    quranMentions: p.quranMentions,
    tags: p.tags,
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
export async function loadQisasMetadata(): Promise<QisasMetadata | null> {
  const book = await loadQisasBook();
  return book?.metadata ?? null;
}

/** Clear all Qisas caches */
export function clearQisasCache(): void {
  qisasBookCache = null;
  prophetCache.clear();
}
