// Noor Connect — Interactive Uthmani Mushaf Page Component
// Features: Jewel Ink, Tajweed Colors, Word-by-Word Jewel Popover, Live Recitation Sync & Audio Auto-Follow

import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import {
  fetchMushafPage,
  prefetchNextMushafPage,
  toArabicDigits,
  sanitizeTajweedHtml,
  cleanQuranicGlyphs,
  applyTajweedToWord,
  getPageForSurahAndAyah,
  getMushafLineFormat,
  TAJWEED_RULES,
  getStrippedArabicCharLength,
  packSurahTokensWithBudget,
  type InteractivePageData,
  type InteractiveWord,
  type SurahHeaderInfo,
  type MushafLineFormat,
  type MushafLineToken,
} from '@/lib/interactive-mushaf';
import { quranService } from '@/lib/quran-service';
import { useTilawah } from '@/contexts/TilawahContext';
import {
  getWordTimingsForVerse,
  getActiveWordPosition,
  type WordSegment,
} from '@/lib/word-timings';
import { Volume2, BookOpen, X, Sparkles, Loader2 } from 'lucide-react';
import { MushafSurahPages, type MushafReadingMode } from './MushafSurahPages';

export type InteractiveMushafSurface = 'jewel' | 'parchment' | 'paper' | 'night' | 'classic';

interface InteractiveMushafPageProps {
  pageNumber: number;
  surahNumber: number;
  targetSurahNumber?: number;
  surfaceMode: InteractiveMushafSurface;
  showTajweed: boolean;
  lineFormat?: MushafLineFormat;
  subPage7L?: number;
  onSubPage7LChange?: (subPage: number, totalParts: number) => void;
  onOpenStudySheet: (surah: number, ayah: number) => void;
  onPageTurnRequest?: (newPage: number) => void;
  onPageLoaded?: (data: InteractivePageData) => void;
}

export type MushafPageBlock =
  | { type: 'surah-banner'; header: SurahHeaderInfo; key: string }
  | {
      type: 'ayah-line';
      tokens: MushafLineToken[];
      key: string;
      lineIndex: number;
      isLastLineOfSurahSegment?: boolean;
    };

export type { MushafLineToken };
export { getStrippedArabicCharLength };

/**
 * Uniform readable recitation font sizing across all lines on the page.
 * Completely eliminates tiny shrunken lines (9px) and large overflowing lines (19px).
 */
export function getUniformMushafFontSize(lineFormat: MushafLineFormat): string {
  if (lineFormat === 7) return 'clamp(1.16rem, 4.9vw, 1.32rem)';
  if (lineFormat === 13) return 'clamp(1.08rem, 4.6vw, 1.22rem)';
  return 'clamp(1.02rem, 4.35vw, 1.16rem)';
}

export function getLineFontSize(_baseCharCount: number, lineFormat: MushafLineFormat): string {
  return getUniformMushafFontSize(lineFormat);
}

export function build7LineFormatTokens(tokens: MushafLineToken[]): MushafLineToken[][] {
  if (tokens.length === 0) return [];
  const surahIds = Array.from(new Set(tokens.map((t) => t.surahNumber)));
  const allLines: MushafLineToken[][] = [];
  surahIds.forEach((sid) => {
    const segTokens = tokens.filter((t) => t.surahNumber === sid);
    const segLines = packSurahTokensWithBudget(segTokens, 7);
    allLines.push(...segLines);
  });
  return allLines;
}

export function getTokenWeight(t: MushafLineToken): number {
  if (t.type === 'medallion') return 3;
  const txt = t.word?.text_indopak || t.word?.text_uthmani || '';
  return Math.max(1, getStrippedArabicCharLength(txt));
}

/**
 * Mathematically balanced K-partition algorithm via dynamic programming.
 * Minimizes variance of line weights, guaranteeing that line K has the exact same
 * proportional weight and word count as earlier lines, eliminating last-line crushing.
 */
export function partitionTokensBalancedK(tokens: MushafLineToken[], K: number): MushafLineToken[][] {
  const N = tokens.length;
  if (N === 0) return [];
  if (K <= 1 || N <= K) {
    if (N <= K) {
      return tokens.map((t) => [t]);
    }
    return [tokens];
  }

  const weights: number[] = new Array(N);
  const prefix: number[] = new Array(N + 1);
  prefix[0] = 0;
  for (let i = 0; i < N; i++) {
    weights[i] = getTokenWeight(tokens[i]);
    prefix[i + 1] = prefix[i] + weights[i];
  }

  const totalWeight = prefix[N];
  const targetPerLine = totalWeight / K;

  // dp[k][i] = min cost to partition first i tokens into k lines
  // split[k][i] = split point j where line k is tokens[j...i-1]
  const dp: number[][] = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(Infinity));
  const split: number[][] = Array.from({ length: K + 1 }, () => new Array(N + 1).fill(0));

  // Base case: 1 line for first i tokens
  for (let i = 1; i <= N; i++) {
    const w = prefix[i];
    const diff = w - targetPerLine;
    dp[1][i] = diff * diff;
    split[1][i] = 0;
  }

  // Fill DP for k = 2 ... K
  for (let k = 2; k <= K; k++) {
    for (let i = k; i <= N; i++) {
      for (let j = k - 1; j < i; j++) {
        // High penalty to prevent an ayah medallion from starting a new line
        const penalty = tokens[j].type === 'medallion' ? 50000 : 0;
        const lineWeight = prefix[i] - prefix[j];
        const diff = lineWeight - targetPerLine;
        const cost = dp[k - 1][j] + diff * diff + penalty;
        if (cost < dp[k][i]) {
          dp[k][i] = cost;
          split[k][i] = j;
        }
      }
    }
  }

  // Reconstruct lines from split table
  const lines: MushafLineToken[][] = new Array(K);
  let curEnd = N;
  for (let k = K; k >= 1; k--) {
    const curStart = split[k][curEnd];
    lines[k - 1] = tokens.slice(curStart, curEnd);
    curEnd = curStart;
  }

  return lines;
}

export function distributeTokensWithHeaders(
  tokens: MushafLineToken[],
  targetLineCount: number
): MushafLineToken[][] {
  if (tokens.length === 0) return [];

  // Bug B: Short Pages (< 85 words, e.g. Page 1 Al-Fatiha, Page 2 Al-Baqarah 1-5)
  // Do NOT force into 13 sparse lines! Render natural 7-8 centered lines based on canonical line_number.
  const nonHeaderTokens = tokens.filter((t) => t.type !== 'header');
  const isShortPage = nonHeaderTokens.length > 0 && nonHeaderTokens.length < 85;

  if (isShortPage) {
    const hasCanonicalLines = nonHeaderTokens.some(
      (t) => typeof t.lineNum === 'number' && t.lineNum > 0
    );

    if (hasCanonicalLines) {
      const lineMap: Record<number, MushafLineToken[]> = {};
      const headerTokens: MushafLineToken[] = [];

      tokens.forEach((t) => {
        if (t.type === 'header') {
          headerTokens.push(t);
        } else {
          const lNum = Math.min(15, Math.max(1, t.lineNum || 1));
          if (!lineMap[lNum]) lineMap[lNum] = [];
          lineMap[lNum].push(t);
        }
      });

      const groupedLines = Object.keys(lineMap)
        .map(Number)
        .sort((a, b) => a - b)
        .map((k) => lineMap[k])
        .filter((l) => l.length > 0);

      const result: MushafLineToken[][] = [];
      if (headerTokens.length > 0) {
        headerTokens.forEach((h) => result.push([h]));
      }
      return result.concat(groupedLines);
    }
  }

  // Normal pages (>= 85 tokens): Split by headers into chunks
  type TokenChunk =
    | { type: 'header'; token: MushafLineToken }
    | { type: 'verses'; tokens: MushafLineToken[] };

  const chunks: TokenChunk[] = [];
  let currentVerseChunk: MushafLineToken[] = [];

  for (const token of tokens) {
    if (token.type === 'header') {
      if (currentVerseChunk.length > 0) {
        chunks.push({ type: 'verses', tokens: currentVerseChunk });
        currentVerseChunk = [];
      }
      chunks.push({ type: 'header', token });
    } else {
      currentVerseChunk.push(token);
    }
  }
  if (currentVerseChunk.length > 0) {
    chunks.push({ type: 'verses', tokens: currentVerseChunk });
  }

  const headerCount = chunks.filter((c) => c.type === 'header').length;
  // A Surah opening header occupies ~2 lines of vertical space in standard Mushaf layout
  const availableVerseLines = Math.max(1, targetLineCount - headerCount * 2);

  const verseChunks = chunks.filter(
    (c): c is { type: 'verses'; tokens: MushafLineToken[] } => c.type === 'verses'
  );
  if (verseChunks.length === 0) {
    return chunks.map((c) => ('token' in c ? [c.token] : c.tokens));
  }

  // Calculate weights of verse chunks
  const chunkWeights = verseChunks.map((vc) =>
    vc.tokens.reduce((sum, t) => sum + getTokenWeight(t), 0)
  );
  const totalVerseWeight = chunkWeights.reduce((a, b) => a + b, 0);

  // Proportional line allocation per chunk
  const allocatedLines: number[] = [];
  let allocatedSum = 0;
  for (let i = 0; i < verseChunks.length; i++) {
    if (totalVerseWeight === 0) {
      allocatedLines.push(1);
    } else {
      const share = Math.max(1, Math.round(availableVerseLines * (chunkWeights[i] / totalVerseWeight)));
      allocatedLines.push(share);
    }
    allocatedSum += allocatedLines[i];
  }

  // Adjust allocation to strictly equal availableVerseLines
  let diff = availableVerseLines - allocatedSum;
  while (diff !== 0) {
    if (diff > 0) {
      let maxIdx = 0;
      for (let i = 1; i < chunkWeights.length; i++) {
        if (chunkWeights[i] > chunkWeights[maxIdx]) maxIdx = i;
      }
      allocatedLines[maxIdx]++;
      diff--;
    } else {
      let maxIdx = -1;
      for (let i = 0; i < allocatedLines.length; i++) {
        if (allocatedLines[i] > 1 && (maxIdx === -1 || allocatedLines[i] > allocatedLines[maxIdx])) {
          maxIdx = i;
        }
      }
      if (maxIdx >= 0) {
        allocatedLines[maxIdx]--;
        diff++;
      } else {
        break;
      }
    }
  }

  // Partition each verse chunk using optimal DP and assemble final lines
  const finalLines: MushafLineToken[][] = [];
  let verseChunkIdx = 0;
  for (const chunk of chunks) {
    if (chunk.type === 'header') {
      finalLines.push([chunk.token]);
    } else {
      const kForChunk = allocatedLines[verseChunkIdx] || 1;
      const partitioned = partitionTokensBalancedK(chunk.tokens, kForChunk);
      finalLines.push(...partitioned);
      verseChunkIdx++;
    }
  }

  return finalLines;
}

function InteractiveMushafPageComponent({
  pageNumber,
  surahNumber,
  targetSurahNumber,
  surfaceMode,
  showTajweed,
  lineFormat,
  subPage7L: subPage7LProp,
  onSubPage7LChange,
  onOpenStudySheet,
  onPageTurnRequest,
  onPageLoaded,
}: InteractiveMushafPageProps) {
  const [pageData, setPageData] = useState<InteractivePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState<MushafLineFormat>(() => lineFormat || getMushafLineFormat());
  const [subPage7L, setSubPage7L] = useState<number>(() => subPage7LProp || 1);

  // Stable callback refs to eliminate infinite render loop cascades
  const onSubPage7LChangeRef = useRef(onSubPage7LChange);
  useEffect(() => {
    onSubPage7LChangeRef.current = onSubPage7LChange;
  }, [onSubPage7LChange]);

  const onOpenStudySheetRef = useRef(onOpenStudySheet);
  useEffect(() => {
    onOpenStudySheetRef.current = onOpenStudySheet;
  }, [onOpenStudySheet]);

  const onPageTurnRequestRef = useRef(onPageTurnRequest);
  useEffect(() => {
    onPageTurnRequestRef.current = onPageTurnRequest;
  }, [onPageTurnRequest]);

  const onPageLoadedRef = useRef(onPageLoaded);
  useEffect(() => {
    onPageLoadedRef.current = onPageLoaded;
  }, [onPageLoaded]);

  const lastReported7LRef = useRef<{ subPage: number; totalParts: number }>({ subPage: 0, totalParts: 0 });
  const mushafLinesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof subPage7LProp === 'number' && subPage7LProp > 0) {
      setSubPage7L((prev) => (prev !== subPage7LProp ? subPage7LProp : prev));
    }
  }, [subPage7LProp]);

  useEffect(() => {
    if (lineFormat) {
      setActiveFormat(lineFormat);
    }
  }, [lineFormat]);

  useEffect(() => {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ format?: MushafLineFormat }>;
      if (customEvent.detail?.format) {
        setActiveFormat(customEvent.detail.format);
      }
    };
    window.addEventListener('noor-mushaf-format-changed', handler);
    return () => window.removeEventListener('noor-mushaf-format-changed', handler);
  }, []);

  // Reset 7L subpage ONLY on page change or line-format change
  useEffect(() => {
    setSubPage7L(1);
    lastReported7LRef.current = { subPage: 1, totalParts: 0 };
  }, [pageNumber, activeFormat]);
  const [selectedWord, setSelectedWord] = useState<{
    word: InteractiveWord;
    surahNumber: number;
    verseNumber: number;
    rect: DOMRect | null;
  } | null>(null);
  const [playingWordAudio, setPlayingWordAudio] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeVerseRef = useRef<HTMLSpanElement | null>(null);
  const wasTilawahPlayingRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Tilawah live recitation sync
  const {
    currentSurah,
    currentAyah,
    isPlaying,
    playbackTimeMs,
    duration,
    reciter,
    pause: pauseTilawah,
    resume: resumeTilawah,
  } = useTilawah();

  const [verseSegments, setVerseSegments] = useState<WordSegment[] | null>(null);
  const [activeWordPos, setActiveWordPos] = useState<number | null>(null);

  // Fetch word-by-word timestamp segments for active recited Ayah
  useEffect(() => {
    let isMounted = true;
    if (isPlaying && currentSurah > 0 && currentAyah > 0) {
      getWordTimingsForVerse(reciter.id, currentSurah, currentAyah)
        .then((segs) => {
          if (isMounted) {
            setVerseSegments(segs);
          }
        })
        .catch(() => {
          if (isMounted) setVerseSegments(null);
        });
    } else {
      setVerseSegments(null);
      setActiveWordPos(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isPlaying, currentSurah, currentAyah, reciter.id]);

  // Compute live active recited word at 16–33ms resolution
  useEffect(() => {
    if (!isPlaying || currentSurah <= 0 || currentAyah <= 0 || !pageData) {
      setActiveWordPos(null);
      return;
    }

    const activeVerse = pageData.verses.find(
      (v) => v.surah_number === currentSurah && v.verse_number === currentAyah
    );

    if (!activeVerse) {
      setActiveWordPos(null);
      return;
    }

    const pos = getActiveWordPosition(
      verseSegments,
      playbackTimeMs,
      Math.round(duration * 1000),
      activeVerse.words
    );
    setActiveWordPos(pos);
  }, [isPlaying, currentSurah, currentAyah, playbackTimeMs, duration, verseSegments, pageData]);

  // Auto Page Turn: when Tilawah advances past the verses on this page, turn page automatically
  useEffect(() => {
    if (isPlaying && currentSurah > 0 && currentAyah > 0 && pageData && !loading) {
      const isAyahOnPage = pageData.verses.some(
        (v) => v.surah_number === currentSurah && v.verse_number === currentAyah
      );
      if (!isAyahOnPage) {
        const targetPage = getPageForSurahAndAyah(currentSurah, currentAyah);
        if (targetPage !== pageNumber) {
          onPageTurnRequestRef.current?.(targetPage);
        }
      }
    }
  }, [isPlaying, currentSurah, currentAyah, pageData, loading, pageNumber]);

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) {
        clearTimeout(resumeTimerRef.current);
      }
      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
      }
    };
  }, []);

  // Load interactive page data & prefetch next page
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchMushafPage(pageNumber, showTajweed)
      .then((data) => {
        if (isMounted) {
          setPageData(data);
          setLoading(false);
          onPageLoadedRef.current?.(data);
          // Zero-delay preload: silently prefetch next page in background
          prefetchNextMushafPage(pageNumber, showTajweed);
        }
      })
      .catch((err) => {
        console.warn(`[InteractiveMushaf] Fallback triggered for page ${pageNumber}:`, err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [pageNumber, showTajweed]);

  // Scroll active recited verse into view smoothly with double-RAF DOM guarantee
  useEffect(() => {
    if (isPlaying && currentSurah > 0 && currentAyah > 0) {
      const activeKey = `${currentSurah}:${currentAyah}`;
      const frameId = requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el =
            activeVerseRef.current ||
            document.querySelector<HTMLElement>(`[data-ayah-key="${activeKey}"]`);
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        });
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [currentSurah, currentAyah, isPlaying, pageData]);

  // Auto-scroll directly to the selected Surah's opening banner on shared pages (e.g. Al-Kahf on Page 293)
  useEffect(() => {
    if (!loading && pageData && targetSurahNumber && targetSurahNumber > 0) {
      const firstVerse = pageData.verses[0];
      if (firstVerse && firstVerse.surah_number !== targetSurahNumber) {
        const frameId = requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const bannerEl = document.querySelector<HTMLElement>(
              `[data-surah-opening="${targetSurahNumber}"]`
            );
            if (bannerEl) {
              bannerEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
        return () => cancelAnimationFrame(frameId);
      }
    }
  }, [loading, pageData, targetSurahNumber]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (wordAudioRef.current) {
        wordAudioRef.current.pause();
        wordAudioRef.current = null;
      }
    };
  }, []);

  const handleWordClick = (
    e: React.MouseEvent,
    word: InteractiveWord,
    vSurah: number,
    vAyah: number
  ) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setSelectedWord({
      word,
      surahNumber: vSurah,
      verseNumber: vAyah,
      rect,
    });
  };

  const handlePlayWordAudio = (audioUrl: string | null) => {
    if (!audioUrl) return;
    if (wordAudioRef.current) {
      wordAudioRef.current.pause();
    }
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    if (isPlaying) {
      wasTilawahPlayingRef.current = true;
      pauseTilawah();
    }

    const fullUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `https://audio.qurancdn.com/${audioUrl}`;

    const audio = new Audio(fullUrl);
    wordAudioRef.current = audio;
    setPlayingWordAudio(true);

    const onAudioDone = () => {
      setPlayingWordAudio(false);
      if (wasTilawahPlayingRef.current) {
        wasTilawahPlayingRef.current = false;
        resumeTimerRef.current = setTimeout(() => {
          resumeTilawah();
          resumeTimerRef.current = null;
        }, 250);
      }
    };

    audio.onended = onAudioDone;
    audio.onerror = onAudioDone;
    audio.play().catch(() => onAudioDone());
  };

  // Tilawah auto-flip for 7-Line mode (switches between Part 1, Part 2, etc.)
  useEffect(() => {
    if (isPlaying && currentSurah > 0 && currentAyah > 0 && activeFormat === 7 && pageData) {
      const allTokens: MushafLineToken[] = [];
      pageData.verses.forEach((verse) => {
        verse.words.forEach((w) => {
          if (w.char_type_name !== 'end') {
            allTokens.push({
              type: 'word',
              word: w,
              surahNumber: verse.surah_number,
              verseNumber: verse.verse_number,
              key: `w-${w.id}`,
            });
          }
        });
      });
      const all7Lines = build7LineFormatTokens(allTokens);
      const parts = Math.max(1, Math.ceil(all7Lines.length / 7));
      for (let p = 1; p <= parts; p++) {
        const pLines = all7Lines.slice((p - 1) * 7, p * 7);
        const inThisPart = pLines.some((line) =>
          line.some((t) => t.surahNumber === currentSurah && t.verseNumber === currentAyah)
        );
        if (inThisPart && subPage7L !== p) {
          setSubPage7L(p);
          onSubPage7LChangeRef.current?.(p, parts);
          break;
        }
      }
    }
  }, [isPlaying, currentSurah, currentAyah, activeFormat, pageData, subPage7L]);

  // Compute 7L, 13L, and 15L formatted blocks (Surah Opening Banners + Ayah Lines)
  const { blocks, totalParts7L } = useMemo(() => {
    if (!pageData || pageData.verses.length === 0) {
      return { blocks: [] as MushafPageBlock[], totalParts7L: 1 };
    }

    let versesToProcess = pageData.verses;
    let headersToProcess = pageData.surah_headers;

    // Target-Surah Filtering on Starting Page in 7L Mode:
    // When user navigates to a specific Surah (targetSurahNumber) and this page contains Ayah 1 of that Surah,
    // 7L mode begins Part 1 directly at chapter_id === targetSurahNumber with its banner,
    // omitting the trailing end-verses of the previous Surah on that shared page.
    if (
      activeFormat === 7 &&
      targetSurahNumber &&
      targetSurahNumber > 0 &&
      pageData.verses.some(
        (v) => v.surah_number === targetSurahNumber && v.verse_number === 1
      )
    ) {
      versesToProcess = pageData.verses.filter((v) => v.surah_number === targetSurahNumber);
      headersToProcess = pageData.surah_headers.filter(
        (h) => h.surah_number === targetSurahNumber
      );
    }

    // Step 1: Collect all pure ayah tokens (NO headers inside lines)
    const allTokens: MushafLineToken[] = [];
    versesToProcess.forEach((verse) => {
      verse.words.forEach((w) => {
        if (w.char_type_name !== 'end') {
          allTokens.push({
            type: 'word',
            word: w,
            surahNumber: verse.surah_number,
            verseNumber: verse.verse_number,
            key: `word-${verse.surah_number}-${verse.verse_number}-${w.position}-${w.id}`,
            lineNum: w.line_number,
          });
        }
      });

      allTokens.push({
        type: 'medallion',
        surahNumber: verse.surah_number,
        verseNumber: verse.verse_number,
        key: `medallion-${verse.surah_number}-${verse.verse_number}`,
        lineNum: verse.words[verse.words.length - 1]?.line_number,
      });
    });

    // Helper: inserts Surah banner block immediately before the line where Ayah 1 begins
    const assembleBlocksWithHeaders = (
      lines: Array<{ tokens: MushafLineToken[]; isLastLine: boolean }>
    ): MushafPageBlock[] => {
      const resultBlocks: MushafPageBlock[] = [];
      const handledHeaders = new Set<number>();

      lines.forEach(({ tokens: lineTokens, isLastLine }, lineIdx) => {
        headersToProcess.forEach((sHeader) => {
          if (!handledHeaders.has(sHeader.surah_number)) {
            const hasAyah1 = lineTokens.some(
              (t) => t.surahNumber === sHeader.surah_number && t.verseNumber === 1
            );
            if (hasAyah1) {
              resultBlocks.push({
                type: 'surah-banner',
                header: sHeader,
                key: `banner-${sHeader.surah_number}`,
              });
              handledHeaders.add(sHeader.surah_number);
            }
          }
        });

        resultBlocks.push({
          type: 'ayah-line',
          tokens: lineTokens,
          lineIndex: lineIdx,
          isLastLineOfSurahSegment: isLastLine,
          key: `line-${lineIdx}`,
        });
      });

      // Safety check: ensure any unhandled headers are included at the start of the blocks
      headersToProcess.forEach((sHeader) => {
        if (!handledHeaders.has(sHeader.surah_number)) {
          resultBlocks.unshift({
            type: 'surah-banner',
            header: sHeader,
            key: `banner-${sHeader.surah_number}`,
          });
          handledHeaders.add(sHeader.surah_number);
        }
      });

      return resultBlocks;
    };

    if (activeFormat === 15 || activeFormat === 13) {
      // Pack tokens by Surah segment using Knuth-Plass minimum-raggedness line balancing
      const surahIds: number[] = [];
      allTokens.forEach((t) => {
        if (!surahIds.includes(t.surahNumber)) {
          surahIds.push(t.surahNumber);
        }
      });

      const packedLines: Array<{ tokens: MushafLineToken[]; isLastLine: boolean }> = [];
      surahIds.forEach((sid) => {
        const segTokens = allTokens.filter((t) => t.surahNumber === sid);
        const segLines = packSurahTokensWithBudget(segTokens, activeFormat);
        segLines.forEach((line, idx) => {
          packedLines.push({
            tokens: line,
            isLastLine: idx === segLines.length - 1,
          });
        });
      });

      return { blocks: assembleBlocksWithHeaders(packedLines), totalParts7L: 1 };
    } else {
      // 7-line mode: Dynamic-programming balanced lines with MAX_UNITS = 28, paginated into ~7 lines per view
      const surahIds: number[] = [];
      allTokens.forEach((t) => {
        if (!surahIds.includes(t.surahNumber)) {
          surahIds.push(t.surahNumber);
        }
      });

      const all7Lines: Array<{ tokens: MushafLineToken[]; isLastLine: boolean }> = [];
      surahIds.forEach((sid) => {
        const segTokens = allTokens.filter((t) => t.surahNumber === sid);
        const segLines = packSurahTokensWithBudget(segTokens, 7);
        segLines.forEach((line, idx) => {
          all7Lines.push({
            tokens: line,
            isLastLine: idx === segLines.length - 1,
          });
        });
      });

      // Chunk all7Lines into sub-pages of ~7 lines each
      const subPages: Array<Array<{ tokens: MushafLineToken[]; isLastLine: boolean }>> = [];
      for (let i = 0; i < all7Lines.length; i += 7) {
        subPages.push(all7Lines.slice(i, i + 7));
      }

      // If the final sub-page has only 1 line with <= 2 words (or just a medallion),
      // merge that trailing line into the previous sub-page so the reader never flips to an orphan sub-page
      if (subPages.length > 1) {
        const lastPartLines = subPages[subPages.length - 1];
        if (lastPartLines.length === 1) {
          const singleLineObj = lastPartLines[0];
          const wordCount = singleLineObj.tokens.filter(t => t.type !== 'medallion' && t.type !== 'header').length;
          if (wordCount <= 2) {
            subPages[subPages.length - 2].push(singleLineObj);
            subPages.pop();
          }
        }
      }

      const parts = Math.max(1, subPages.length);
      const activePart = Math.min(parts, Math.max(1, subPage7L));
      const visibleLines = subPages[activePart - 1] || [];

      const blocksFor7L: MushafPageBlock[] = [];
      const handledHeaders = new Set<number>();

      visibleLines.forEach((lineObj, lineIdx) => {
        headersToProcess.forEach((sHeader) => {
          if (!handledHeaders.has(sHeader.surah_number)) {
            const hasAyah1 = lineObj.tokens.some(
              (t) => t.surahNumber === sHeader.surah_number && t.verseNumber === 1
            );
            if (hasAyah1) {
              blocksFor7L.push({
                type: 'surah-banner',
                header: sHeader,
                key: `banner-${sHeader.surah_number}`,
              });
              handledHeaders.add(sHeader.surah_number);
            }
          }
        });

        blocksFor7L.push({
          type: 'ayah-line',
          tokens: lineObj.tokens,
          lineIndex: lineIdx,
          isLastLineOfSurahSegment: lineObj.isLastLine,
          key: `line-7l-${lineIdx}`,
        });
      });

      return { blocks: blocksFor7L, totalParts7L: parts };
    }
  }, [pageData, activeFormat, subPage7L, targetSurahNumber]);

  useEffect(() => {
    if (
      lastReported7LRef.current.subPage !== subPage7L ||
      lastReported7LRef.current.totalParts !== totalParts7L
    ) {
      lastReported7LRef.current = { subPage: subPage7L, totalParts: totalParts7L };
      onSubPage7LChangeRef.current?.(subPage7L, totalParts7L);
    }
  }, [subPage7L, totalParts7L]);

  useEffect(() => {
    if (totalParts7L > 0 && subPage7L > totalParts7L) {
      setSubPage7L(totalParts7L);
    }
  }, [subPage7L, totalParts7L]);

  // Multi-Stage Width Measurement & Live DOM Gentle Fit Pass (fitMushafLinesToContainer)
  // Ensures 100% UNIFORM readable font size and 0px clipping on all 604 pages in 15L, 13L, and 7L
  useLayoutEffect(() => {
    const container = mushafLinesContainerRef.current;
    if (!container) return;

    const fitMushafLinesToContainer = () => {
      const lineRows = container.querySelectorAll<HTMLElement>('[data-mushaf-line]');
      if (!lineRows || lineRows.length === 0) return;

      lineRows.forEach((lineRow) => {
        const inner = lineRow.querySelector<HTMLElement>('[data-mushaf-line-inner]');
        if (!inner) return;

        const isCenteredLine = inner.getAttribute('data-short-line') === 'true';

        // 1. Reset inner element to unscaled natural baseline
        inner.style.transform = 'none';
        inner.style.width = 'max-content';
        inner.style.maxWidth = 'none';
        inner.style.flexShrink = '0';
        inner.style.gap = isCenteredLine ? '4px' : '2px';

        // 2. Measure actual available width inside row (6px padding on each side = 12px)
        const availWidth = Math.max(160, lineRow.clientWidth - 12);
        const naturalWidth = inner.scrollWidth;

        // 3. Gentle safety fit without ever shrinking font below readable baseline
        if (naturalWidth > availWidth) {
          // First tighten token gap to 1px
          inner.style.gap = '1px';
          const tightenedWidth = inner.scrollWidth;

          if (tightenedWidth > availWidth) {
            const scale = (availWidth - 2) / tightenedWidth;
            inner.style.transformOrigin = isCenteredLine ? 'center center' : 'right center';
            inner.style.transform = `scaleX(${Math.max(0.86, scale).toFixed(4)})`;
            inner.style.width = 'max-content';
          } else {
            inner.style.transform = 'none';
            if (isCenteredLine) {
              inner.style.width = 'max-content';
              inner.style.justifyContent = 'center';
            } else {
              inner.style.width = `${availWidth}px`;
              inner.style.justifyContent = 'space-between';
            }
          }
        } else {
          inner.style.transform = 'none';
          if (isCenteredLine) {
            inner.style.width = 'max-content';
            inner.style.justifyContent = 'center';
          } else {
            inner.style.width = `${availWidth}px`;
            inner.style.justifyContent = 'space-between';
          }
        }
      });
    };

    // Stage 1: Immediate layout pass
    fitMushafLinesToContainer();

    // Stage 2: Next frame pass
    const rAFId = requestAnimationFrame(() => {
      fitMushafLinesToContainer();
    });

    // Stage 3: Multi-interval passes for late asynchronous font shaping on mobile WebViews
    const t1 = setTimeout(() => fitMushafLinesToContainer(), 50);
    const t2 = setTimeout(() => fitMushafLinesToContainer(), 150);
    const t3 = setTimeout(() => fitMushafLinesToContainer(), 350);

    // Stage 4: Re-check when web fonts complete loading
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          fitMushafLinesToContainer();
        })
        .catch(() => {});
    }

    // Stage 5: ResizeObserver for dynamic orientation changes
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        fitMushafLinesToContainer();
      });
      ro.observe(container);
    }

    const handleResize = () => fitMushafLinesToContainer();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(rAFId);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [pageData, activeFormat, showTajweed, surfaceMode, subPage7L, blocks, pageNumber]);

  // If Classic Scan mode is selected, or if fallback failed to load verses, render classic scan
  if (surfaceMode === 'classic' || (pageData?.is_fallback && pageData.verses.length === 0)) {
    const classicMode: MushafReadingMode =
      surfaceMode === 'night' ? 'night' : surfaceMode === 'parchment' ? 'parchment' : 'classic';
    return (
      <MushafSurahPages
        surahNumber={surahNumber}
        pageNumber={pageNumber}
        mushafMode={classicMode}
      />
    );
  }

  const readingMode: 'paper' | 'jewel' | 'night' | 'classic' =
    surfaceMode === 'paper' || surfaceMode === 'parchment' ? 'paper' : surfaceMode;

  // Surface styles
  const surfaceStyles = {
    jewel: {
      background: 'var(--surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
      bismillahColor: 'var(--accent-text, #FDE68A)',
      headerBg: 'var(--surface-2)',
      headerBorder: 'var(--border)',
      medallionBg: 'var(--accent-soft)',
      medallionColor: 'var(--accent-text)',
      medallionBorder: 'var(--border)',
    },
    paper: {
      background: '#FBF6E9',
      color: '#1E1208',
      border: '1.5px solid rgba(190, 160, 95, 0.45)',
      boxShadow: '0 8px 26px rgba(0, 0, 0, 0.18)',
      bismillahColor: '#2C1808',
      headerBg: '#EFE0C2',
      headerBorder: '#B89352',
      medallionBg: 'rgba(184, 151, 88, 0.18)',
      medallionColor: '#3D260E',
      medallionBorder: 'rgba(146, 108, 45, 0.45)',
    },
    parchment: {
      background: '#FBF6E9',
      color: '#1E1208',
      border: '1.5px solid rgba(190, 160, 95, 0.45)',
      boxShadow: '0 8px 26px rgba(0, 0, 0, 0.18)',
      bismillahColor: '#2C1808',
      headerBg: '#EFE0C2',
      headerBorder: '#B89352',
      medallionBg: 'rgba(184, 151, 88, 0.18)',
      medallionColor: '#3D260E',
      medallionBorder: 'rgba(146, 108, 45, 0.45)',
    },
    night: {
      background: '#05080F',
      color: '#F8FAFC',
      border: '1px solid #1F2937',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85)',
      bismillahColor: '#F5D061',
      headerBg: '#0D131F',
      headerBorder: 'rgba(245, 208, 97, 0.35)',
      medallionBg: 'rgba(245, 208, 97, 0.12)',
      medallionColor: '#F5D061',
      medallionBorder: 'rgba(245, 208, 97, 0.38)',
    },
  }[surfaceMode] || {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
    bismillahColor: 'var(--accent-text, #FDE68A)',
    headerBg: 'var(--surface-2)',
    headerBorder: 'var(--border)',
    medallionBg: 'var(--accent-soft)',
    medallionColor: 'var(--accent-text)',
    medallionBorder: 'var(--border)',
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-6 select-none" onClick={() => setSelectedWord(null)}>
      {/* Page Container Canvas */}
      <div
        className="relative rounded-3xl transition-colors duration-200 px-2 sm:px-5 py-3 sm:py-4"
        style={{
          background: surfaceStyles.background,
          color: surfaceStyles.color,
          border: surfaceStyles.border,
          boxShadow: surfaceStyles.boxShadow,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          paddingLeft: '8px',
          paddingRight: '8px',
          paddingTop: '12px',
          paddingBottom: '12px',
        }}
      >
        {/* Top Page Header Ribbon: Juz and Page Number */}
        <div
          className="flex items-center justify-between text-[11px] font-bold tracking-wider mb-3 transition-colors"
          style={
            readingMode === 'paper'
              ? {
                  background: '#EAD9B8',
                  color: '#3D260E',
                  borderBottom: '1px solid #C9AD79',
                  padding: '6px 12px',
                  borderRadius: '12px',
                }
              : {
                  borderColor: 'var(--border)',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: '12px',
                }
          }
        >
          <span className={readingMode === 'paper' ? 'opacity-90' : 'opacity-75'}>
            JUZ {pageData?.juz_number || Math.ceil(pageNumber / 20)}
          </span>
          <span className={`font-mono ${readingMode === 'paper' ? 'opacity-90' : 'opacity-75'}`}>
            PAGE {pageNumber}
          </span>
        </div>

        {/* Sleek Tajweed Color Legend Bar */}
        {showTajweed && (
          <div
            className="mb-3 border transition-colors select-none"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px 8px',
              padding: '6px 10px',
              borderRadius: '12px',
              width: '100%',
              boxSizing: 'border-box',
              overflow: 'visible',
              background: readingMode === 'paper' ? 'rgba(44, 30, 17, 0.07)' : 'var(--surface-2)',
              borderColor: readingMode === 'paper' ? 'rgba(44, 30, 17, 0.18)' : 'var(--border)',
            }}
          >
            {TAJWEED_RULES.map((rule) => (
              <div
                key={rule.name}
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: rule.color }}
                />
                <span
                  style={{
                    color: readingMode === 'paper' ? '#2C1E11' : undefined,
                    opacity: readingMode === 'paper' ? 1 : 0.85,
                  }}
                >
                  {rule.name}
                </span>
              </div>
            ))}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLegend(true);
              }}
              title="Tajweed Rules Guide"
              className="transition-colors hover:opacity-85 active:scale-95"
              style={{
                fontSize: '0.66rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                padding: '2px 8px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: readingMode === 'paper' ? 'rgba(44, 30, 17, 0.12)' : 'var(--accent-soft, rgba(212, 175, 55, 0.15))',
                color: readingMode === 'paper' ? '#2C1E11' : 'var(--accent-text)',
              }}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Guide</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[var(--accent)]" />
            <p className="text-xs font-bold opacity-75">Loading Uthmani Mushaf Page {pageNumber}...</p>
          </div>
        )}

        {/* Render Interactive Mushaf Page Content */}
        {!loading && pageData && (
          <div
            ref={mushafLinesContainerRef}
            className="uthmani-mushaf-lines-container w-full max-w-full overflow-hidden box-border"
            dir="rtl"
            style={{
              fontFamily: "'Amiri Quran', 'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
              lineHeight: activeFormat === 7 ? 2.15 : activeFormat === 13 ? 2.25 : 2.15,
              width: '100%',
              maxWidth: '100%',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {/* Understated Muted Indicator for Preceding Continuation Verses if page starts mid-Surah */}
            {(() => {
              const firstV = pageData.verses[0];
              if (!firstV || firstV.verse_number <= 1) return null;
              const contSurah = firstV.surah_number;
              const contVerses = pageData.verses.filter((v) => v.surah_number === contSurah);
              const minAyah = contVerses[0]?.verse_number || firstV.verse_number;
              const maxAyah = contVerses[contVerses.length - 1]?.verse_number || firstV.verse_number;
              const sInfo = quranService.getSurahInfo(contSurah);
              return (
                <div
                  className="text-xs font-arabic text-right mb-2 px-1 not-sr-only select-none"
                  style={{
                    color: readingMode === 'paper' ? '#4A3219' : 'var(--accent-text)',
                    opacity: readingMode === 'paper' ? 0.95 : 0.7,
                  }}
                  dir="rtl"
                >
                  سُورَةُ {sInfo?.name || ''} ({toArabicDigits(minAyah)}–{toArabicDigits(maxAyah)})
                </div>
              );
            })()}

            {(() => {
              return blocks.map((block) => {
                if (block.type === 'surah-banner') {
                  const surahHeader = block.header;
                  return (
                    <div
                      key={block.key}
                      data-surah-opening={surahHeader.surah_number}
                      className="w-full my-2.5 p-3 rounded-2xl text-center border relative overflow-hidden not-sr-only"
                      dir="rtl"
                      style={{
                        width: '100%',
                        display: 'block',
                        scrollMarginTop: '116px',
                        background: readingMode === 'paper' ? '#EFE0C2' : readingMode === 'night' ? '#0D131F' : 'var(--surface-2)',
                        borderColor: readingMode === 'paper' ? '#B89352' : readingMode === 'night' ? 'rgba(245, 208, 97, 0.35)' : 'var(--border)',
                        borderWidth: readingMode === 'paper' ? '1.5px' : '1px',
                        borderStyle: 'solid',
                        boxShadow: readingMode === 'paper' ? 'none' : 'inset 0 1px 0 var(--card-sheen)',
                      }}
                    >
                      <div
                        className="flex items-center justify-between px-3 text-[11px] font-bold"
                        style={{
                          color: readingMode === 'paper' ? '#4A3219' : readingMode === 'night' ? '#CBD5E1' : 'var(--text-secondary)',
                          opacity: readingMode === 'paper' ? 0.95 : 0.85,
                        }}
                      >
                        <span>{surahHeader.revelation_type}</span>
                        <span>{surahHeader.ayah_count} Verses</span>
                      </div>
                      <h2
                        className="text-xl sm:text-2xl font-bold my-1 font-arabic tracking-wide"
                        style={{
                          color: readingMode === 'paper' ? '#2C1808' : readingMode === 'night' ? '#F5D061' : 'var(--accent-text, #FDE68A)',
                          textShadow: readingMode === 'paper' ? 'none' : '0 0 12px var(--accent-glow, rgba(245, 208, 97, 0.3))',
                        }}
                      >
                        سُورَةُ {surahHeader.name_arabic}
                      </h2>
                      <p
                        className="text-xs font-semibold"
                        style={{
                          color: readingMode === 'paper' ? '#4A3219' : readingMode === 'night' ? '#CBD5E1' : 'var(--text-secondary)',
                          opacity: readingMode === 'paper' ? 0.95 : 0.85,
                        }}
                      >
                        {surahHeader.name_english}
                      </p>

                      {surahHeader.show_bismillah && (
                        <div
                          className="mt-2 text-lg sm:text-xl font-bold font-arabic"
                          style={{
                            color: readingMode === 'paper' ? '#2C1808' : readingMode === 'night' ? '#F5D061' : 'var(--accent-text, #FDE68A)',
                            textShadow: readingMode === 'paper' ? 'none' : '0 0 12px var(--accent-glow, rgba(245, 208, 97, 0.3))',
                          }}
                        >
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  );
                }

                // Ayah Line
                const lineTokens = block.tokens;
                const lineIdx = block.lineIndex;
                const isLastLineOfSurahSegment = Boolean(block.isLastLineOfSurahSegment);

                // Calculate stripped char budget for this line (+4 per medallion)
                const baseCharCount = lineTokens.reduce((sum, t) => {
                  if (t.type === 'medallion') return sum + 4;
                  const rawText =
                    (activeFormat === 13 ? (t.word?.text_indopak || t.word?.text_uthmani) : t.word?.text_uthmani) || '';
                  return sum + getStrippedArabicCharLength(rawText);
                }, 0);

                const uniformFontSize = getUniformMushafFontSize(activeFormat);

                // NEVER center a line in the middle of a Surah!
                // Set isShortCenteredLine = true ONLY when:
                // 1. pageNumber === 1 or (pageNumber === 2 && lineIdx < 4), OR
                // 2. The line is the very last line of a Surah segment AND baseCharCount < 22!
                const isShortCenteredLine =
                  pageNumber === 1 ||
                  (pageNumber === 2 && lineIdx < 4) ||
                  (isLastLineOfSurahSegment && baseCharCount < 22);

                return (
                  <div
                    key={block.key}
                    data-mushaf-line={lineIdx + 1}
                    className="mushaf-line-row w-full max-w-full my-0.5 transition-colors"
                    dir="rtl"
                    style={{
                      width: '100%',
                      overflow: 'hidden',
                      display: 'flex',
                      justifyContent: isShortCenteredLine ? 'center' : 'flex-start',
                      alignItems: 'center',
                      direction: 'rtl',
                      boxSizing: 'border-box',
                      paddingLeft: '6px',
                      paddingRight: '6px',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.08)',
                      minHeight: activeFormat === 7 ? '3.2rem' : activeFormat === 13 ? '2.4rem' : '2.1rem',
                      color: readingMode === 'paper' ? '#1E1208' : readingMode === 'night' ? '#F8FAFC' : 'var(--text-primary)',
                      fontSize: uniformFontSize,
                    }}
                  >
                    <div
                      data-mushaf-line-inner={lineIdx + 1}
                      data-short-line={isShortCenteredLine ? 'true' : 'false'}
                      style={{
                        display: 'inline-flex',
                        flexWrap: 'nowrap',
                        alignItems: 'center',
                        justifyContent: isShortCenteredLine ? 'center' : 'space-between',
                        direction: 'rtl',
                        gap: isShortCenteredLine ? '4px' : '2px',
                        whiteSpace: 'nowrap',
                        width: 'max-content',
                        maxWidth: 'none',
                        flexShrink: 0,
                        fontSize: uniformFontSize,
                        transformOrigin: isShortCenteredLine ? 'center center' : 'right center',
                      }}
                    >
                      {lineTokens.map((token) => {
                        if (token.type === 'medallion') {
                          const isVersePlaying =
                            isPlaying &&
                            currentSurah === token.surahNumber &&
                            currentAyah === token.verseNumber;

                          return (
                            <button
                              key={token.key}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenStudySheetRef.current?.(token.surahNumber, token.verseNumber);
                              }}
                              title={`Study Verse ${token.surahNumber}:${token.verseNumber}`}
                              className="inline-flex items-center justify-center border font-bold align-middle transition-all hover:scale-105 active:scale-95 shadow-sm shrink-0 whitespace-nowrap select-none"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.72em',
                                lineHeight: 1,
                                padding: '0 2px',
                                margin: '0 1px',
                                borderRadius: '9999px',
                                flexShrink: 0,
                                whiteSpace: 'nowrap',
                                background: isVersePlaying ? 'var(--accent)' : surfaceStyles.medallionBg,
                                color: isVersePlaying ? 'var(--on-accent)' : surfaceStyles.medallionColor,
                                borderColor: surfaceStyles.medallionBorder,
                              }}
                            >
                              <span>﴿{toArabicDigits(token.verseNumber)}﴾</span>
                            </button>
                          );
                        }

                        if (token.type === 'word' && token.word) {
                          const w = token.word;
                          const isVersePlaying =
                            isPlaying &&
                            currentSurah === token.surahNumber &&
                            currentAyah === token.verseNumber;
                          const isWordRecited = isVersePlaying && activeWordPos === w.position;

                          const rawText =
                            (activeFormat === 13 ? (w.text_indopak || w.text_uthmani) : w.text_uthmani) || '';
                          const displayText = cleanQuranicGlyphs(rawText);
                          const wordHtml = showTajweed
                            ? (w.text_uthmani_tajweed
                                ? cleanQuranicGlyphs(sanitizeTajweedHtml(w.text_uthmani_tajweed))
                                : applyTajweedToWord(displayText))
                            : displayText;

                          return (
                            <span
                              key={token.key}
                              ref={isVersePlaying ? activeVerseRef : null}
                              data-ayah-key={`${token.surahNumber}:${token.verseNumber}`}
                              onClick={(e) =>
                                handleWordClick(e, w, token.surahNumber, token.verseNumber)
                              }
                              className={`interactive-quran-word inline-block rounded cursor-pointer transition-all duration-100 ${
                                isWordRecited
                                  ? 'scale-105 z-10 [&_*]:!text-[var(--on-accent)]'
                                  : 'hover:scale-105 active:scale-95 hover:text-[var(--accent-text)]'
                              }`}
                              style={{
                                whiteSpace: 'nowrap',
                                display: 'inline-block',
                                fontSize: 'inherit',
                                lineHeight: 1.85,
                                paddingLeft: '1px',
                                paddingRight: '1px',
                                paddingTop: '0px',
                                paddingBottom: '0px',
                                margin: 0,
                                flexShrink: 0,
                                minWidth: 0,
                                letterSpacing: 'normal',
                                wordSpacing: 'normal',
                                verticalAlign: 'baseline',
                                color: isWordRecited
                                  ? 'var(--on-accent)'
                                  : isVersePlaying
                                  ? (readingMode === 'night' ? '#F5D061' : 'var(--accent-text)')
                                  : (readingMode === 'paper' ? '#1E1208' : readingMode === 'night' ? '#F8FAFC' : 'var(--text-primary)'),
                                ...(isWordRecited
                                  ? {
                                      background: 'var(--accent)',
                                      color: 'var(--on-accent)',
                                      borderRadius: '6px',
                                      boxShadow: '0 0 10px var(--accent-glow)',
                                      transition: 'background-color 120ms ease',
                                    }
                                  : isVersePlaying
                                  ? {
                                      backgroundColor: 'var(--accent-soft)',
                                      borderRadius: '4px',
                                    }
                                  : undefined),
                              }}
                              dangerouslySetInnerHTML={{ __html: wordHtml }}
                            />
                          );
                        }

                        return null;
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Page Footer */}
        <div
          className="mt-6 pt-3 flex items-center justify-between text-[11px] font-bold transition-colors"
          style={
            readingMode === 'paper'
              ? {
                  borderTop: '1px solid #C9AD79',
                  background: '#EAD9B8',
                  color: '#2C1808',
                  padding: '8px 12px',
                  borderRadius: '12px',
                }
              : {
                  borderTop: '1px solid var(--border)',
                  color: 'inherit',
                  opacity: 0.7,
                }
          }
        >
          <span>
            {activeFormat === 7
              ? '7-Line Large Print Mushaf'
              : activeFormat === 13
              ? '13-Line Indo-Pak Mushaf'
              : '15-Line Madinah Mushaf'}
          </span>
          <span className="font-mono">
            {activeFormat === 7 && totalParts7L > 1 ? `Page ${pageNumber} (Part ${subPage7L}/${totalParts7L}) • ` : ''}Page {pageNumber} / 604
          </span>
        </div>

        {/* 7-Line Subpage Switcher */}
        {activeFormat === 7 && totalParts7L > 1 && (
          <div
            className="flex items-center justify-between mt-4 pt-3 text-xs transition-colors"
            style={{
              borderTop: readingMode === 'paper' ? '1px solid #C9AD79' : '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              disabled={subPage7L <= 1}
              onClick={() => {
                const next = Math.max(1, subPage7L - 1);
                setSubPage7L(next);
                onSubPage7LChangeRef.current?.(next, totalParts7L);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                subPage7L <= 1
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : 'active:scale-95'
              }`}
              style={
                readingMode === 'paper'
                  ? {
                      background: '#EAD9B8',
                      color: '#2C1808',
                      borderColor: '#B89352',
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--accent-text)',
                      borderColor: 'var(--border)',
                    }
              }
            >
              ← Prev 7 Lines
            </button>
            <span
              className="font-bold text-xs px-2.5 py-1 rounded-full border shadow-sm"
              style={
                readingMode === 'paper'
                  ? {
                      background: '#854D0E',
                      color: '#FFFBEB',
                      borderColor: '#854D0E',
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--accent-text)',
                      borderColor: 'var(--border)',
                    }
              }
            >
              Part {subPage7L} of {totalParts7L} • 7-Line Large Print
            </span>
            <button
              type="button"
              disabled={subPage7L >= totalParts7L}
              onClick={() => {
                const next = Math.min(totalParts7L, subPage7L + 1);
                setSubPage7L(next);
                onSubPage7LChangeRef.current?.(next, totalParts7L);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                subPage7L >= totalParts7L
                  ? 'opacity-40 cursor-not-allowed border-transparent'
                  : 'active:scale-95'
              }`}
              style={
                readingMode === 'paper'
                  ? {
                      background: '#EAD9B8',
                      color: '#2C1808',
                      borderColor: '#B89352',
                    }
                  : {
                      background: 'var(--surface-2)',
                      color: 'var(--accent-text)',
                      borderColor: 'var(--border)',
                    }
              }
            >
              Next 7 Lines →
            </button>
          </div>
        )}
      </div>

      {/* FLOATING WORD-BY-WORD JEWEL POPOVER */}
      {selectedWord && selectedWord.rect && (
        <div
          className="fixed z-[9990] animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: Math.max(12, Math.min(window.innerHeight - 200, selectedWord.rect.top - 120)),
            left: Math.max(16, Math.min(window.innerWidth - 280, selectedWord.rect.left - 100)),
            width: '270px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--accent)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.45), inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider">
                Word-by-Word Study
              </span>
              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vocalized Arabic Word */}
            <div
              className="text-center font-arabic text-2xl font-bold text-[var(--text-primary)] my-1"
              dir="rtl"
            >
              {selectedWord.word.text_uthmani}
            </div>

            {/* Transliteration */}
            {selectedWord.word.transliteration?.text && (
              <p className="text-center text-xs font-semibold text-[var(--accent-text)] italic mb-1">
                {selectedWord.word.transliteration.text}
              </p>
            )}

            {/* English Word Meaning */}
            <p className="text-center text-xs font-bold text-[var(--text-primary)] mb-3">
              "{selectedWord.word.translation?.text || 'Meaning loading...'}"
            </p>

            {/* Action Buttons: 1-Tap Hear Word Audio + Tafsir & Hifz */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                disabled={!selectedWord.word.audio_url || playingWordAudio}
                onClick={() => handlePlayWordAudio(selectedWord.word.audio_url)}
                className="w-full py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <Volume2 className={`w-3.5 h-3.5 ${playingWordAudio ? 'animate-pulse text-[var(--accent)]' : ''}`} />
                <span>{playingWordAudio ? 'Playing...' : 'Hear Word'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const s = selectedWord.surahNumber;
                  const a = selectedWord.verseNumber;
                  setSelectedWord(null);
                  onOpenStudySheet(s, a);
                }}
                className="w-full py-1.5 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all active:scale-95"
                style={{
                  background: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  color: 'var(--on-accent)',
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📚 Tafsir & Hifz ({selectedWord.surahNumber}:{selectedWord.verseNumber})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAJWEED RULES LEGEND MODAL */}
      {showLegend && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => setShowLegend(false)}
        >
          <div
            className="w-full max-w-md p-5 rounded-3xl border shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 var(--card-sheen)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Tajweed Rules Guide</h3>
                  <span className="text-[10px] text-[var(--text-secondary)]">Authentic Recitation Colors</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLegend(false)}
                className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {TAJWEED_RULES.map((rule) => (
                <div
                  key={rule.name}
                  className="p-2.5 rounded-xl border flex items-start gap-3"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-full mt-1 shrink-0 shadow-sm"
                    style={{ background: rule.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold" style={{ color: rule.color }}>
                        {rule.name}
                      </span>
                      <span className="font-arabic font-bold text-xs" style={{ color: rule.color }}>
                        {rule.arabicName}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-1">
                      {rule.description}
                    </p>
                    <div className="text-[11px] font-arabic font-bold text-[var(--text-primary)]" dir="rtl">
                      مثال: {rule.example}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="w-full py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-98"
              style={{
                background: 'var(--accent)',
                borderColor: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export const InteractiveMushafPage = React.memo(InteractiveMushafPageComponent);
