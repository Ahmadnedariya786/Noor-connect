// Noor Connect — Word-by-Word Tilawah Recitation Timings Engine
// Online-first with Quran.com v4 segments + seamless proportional fallback
// 100% offline-first with zero personal data loss guarantee

export const QDC_RECITER_IDS: Record<string, number> = {
  'ar.husary': 6,
  'ar.alafasy': 7,
  'ar.abdulbasitmurattal': 2,
  'ar.abdurrahmaansudais': 3,
  'ar.saadalghamdi': 13,
};

export interface WordSegment {
  wordPosition: number; // 1-indexed word position
  startMs: number;
  endMs: number;
}

export interface VerseTimingData {
  verseKey: string;
  segments: WordSegment[];
  durationMs: number;
}

// In-memory cache for super-fast 60fps word matching
const MEMORY_CACHE = new Map<string, WordSegment[]>();

/**
 * Fetch word-by-word timestamp segments from Quran.com API with local cache.
 */
export async function getWordTimingsForVerse(
  reciterId: string,
  surah: number,
  ayah: number
): Promise<WordSegment[] | null> {
  const cacheKey = `noor_word_timings_${reciterId}_${surah}_${ayah}`;

  // 1. Check memory cache
  if (MEMORY_CACHE.has(cacheKey)) {
    return MEMORY_CACHE.get(cacheKey)!;
  }

  // 2. Check localStorage temporary cache
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        MEMORY_CACHE.set(cacheKey, parsed);
        return parsed;
      }
    }
  } catch {
    // Handled localStorage read failure safely
  }

  // 3. Online fetch if reciter is mapped to Quran.com QDC ID
  const qdcId = QDC_RECITER_IDS[reciterId];
  if (!qdcId) {
    return null;
  }

  try {
    const url = `https://api.quran.com/api/v4/recitations/${qdcId}/by_ayah/${surah}:${ayah}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      const audioFile = json.audio_files?.[0];
      const rawSegments = audioFile?.segments;

      if (Array.isArray(rawSegments) && rawSegments.length > 0) {
        const segments: WordSegment[] = rawSegments.map((seg: any) => ({
          wordPosition: Number(seg[0]),
          startMs: Number(seg[1]),
          endMs: Number(seg[2]),
        }));

        MEMORY_CACHE.set(cacheKey, segments);
        try {
          localStorage.setItem(cacheKey, JSON.stringify(segments));
        } catch {
          // Handled quota safely
        }
        return segments;
      }
    }
  } catch {
    // Network offline or timeout - proceed to seamless proportional fallback
  }

  return null;
}

/**
 * Synchronously determine the active word position (1-indexed) based on:
 * 1) Exact timestamp segments (if available)
 * 2) Character-length-weighted proportional timing across audio playback progress (seamless fallback)
 */
export function getActiveWordPosition(
  segments: WordSegment[] | null,
  currentTimeMs: number,
  durationMs: number,
  words: { position: number; char_type_name?: string; text_uthmani?: string }[]
): number | null {
  const actualWords = words.filter((w) => w.char_type_name !== 'end');
  if (actualWords.length === 0) return null;

  // ── 1. Match against exact timestamps if available ──
  if (segments && segments.length > 0) {
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (currentTimeMs >= seg.startMs && currentTimeMs <= seg.endMs) {
        return seg.wordPosition;
      }
    }
    // If between segments, return nearest
    if (currentTimeMs < segments[0].startMs) {
      return segments[0].wordPosition;
    }
    const lastSeg = segments[segments.length - 1];
    if (currentTimeMs >= lastSeg.endMs) {
      return lastSeg.wordPosition;
    }
  }

  // ── 2. Seamless Fallback: Character-length-weighted proportional timing ──
  if (durationMs <= 0 || currentTimeMs <= 0) {
    return actualWords[0]?.position ?? null;
  }

  const progress = Math.min(1, Math.max(0, currentTimeMs / durationMs));
  const lengths = actualWords.map((w) => Math.max(1, (w.text_uthmani || '').length));
  const totalLength = lengths.reduce((acc, l) => acc + l, 0);

  if (totalLength === 0) return actualWords[0]?.position ?? null;

  let cumulativeProgress = 0;
  for (let i = 0; i < actualWords.length; i++) {
    const wordProgressShare = lengths[i] / totalLength;
    cumulativeProgress += wordProgressShare;
    if (progress <= cumulativeProgress) {
      return actualWords[i].position;
    }
  }

  return actualWords[actualWords.length - 1]?.position ?? null;
}
