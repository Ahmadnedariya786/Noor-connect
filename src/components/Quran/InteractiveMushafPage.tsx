// Noor Connect — Interactive Uthmani Mushaf Page Component
// Features: Jewel Ink, Tajweed Colors, Word-by-Word Jewel Popover, Live Recitation Sync & Audio Auto-Follow

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  type InteractivePageData,
  type InteractiveWord,
  type SurahHeaderInfo,
  type MushafLineFormat,
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

export type InteractiveMushafSurface = 'jewel' | 'parchment' | 'night' | 'classic';

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
  | { type: 'ayah-line'; tokens: MushafLineToken[]; key: string; lineIndex: number };

export interface MushafLineToken {
  type: 'word' | 'medallion';
  word?: InteractiveWord;
  surahNumber: number;
  verseNumber: number;
  key: string;
  lineNum?: number;
}

export function getStrippedArabicCharLength(text: string): number {
  if (!text) return 0;
  return text.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').length;
}

export function build7LineFormatTokens(tokens: MushafLineToken[]): MushafLineToken[][] {
  const lines: MushafLineToken[][] = [];
  let currentLine: MushafLineToken[] = [];
  let currentWeight = 0;

  for (const token of tokens) {
    if (token.type === 'medallion') {
      // Verse medallions must always stay attached to the preceding verse word on the same line
      if (currentLine.length > 0) {
        currentLine.push(token);
        currentWeight += 3;
      } else if (lines.length > 0) {
        lines[lines.length - 1].push(token);
      } else {
        currentLine.push(token);
        currentWeight += 3;
      }
      continue;
    }

    const tokenText = token.word?.text_uthmani || token.word?.text_indopak || '';
    const tokenWeight = getStrippedArabicCharLength(tokenText) || 4;

    // Strict 20–24 stripped char budget (~4 to 5 words per line) for 360px mobile fit without ugly wrapping/gaps
    if (currentLine.length >= 2 && currentWeight + tokenWeight > 22) {
      lines.push(currentLine);
      currentLine = [token];
      currentWeight = tokenWeight;
    } else {
      currentLine.push(token);
      currentWeight += tokenWeight;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

export function getTokenWeight(t: MushafLineToken): number {
  if (t.type === 'medallion') return 3;
  const txt = t.word?.text_indopak || t.word?.text_uthmani || '';
  return Math.max(2, getStrippedArabicCharLength(txt) + 1);
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
        const lineWeight = prefix[i] - prefix[j];
        const diff = lineWeight - targetPerLine;
        const cost = dp[k - 1][j] + diff * diff;
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

export function InteractiveMushafPage({
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

  useEffect(() => {
    if (typeof subPage7LProp === 'number' && subPage7LProp > 0 && subPage7LProp !== subPage7L) {
      setSubPage7L(subPage7LProp);
    }
  }, [subPage7LProp]);

  useEffect(() => {
    if (lineFormat) {
      setActiveFormat(lineFormat);
    }
  }, [lineFormat]);

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.format) {
        setActiveFormat(e.detail.format);
      }
    };
    window.addEventListener('noor-mushaf-format-changed' as any, handler);
    return () => window.removeEventListener('noor-mushaf-format-changed' as any, handler);
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

    // Step 1: Collect all pure ayah tokens (NO headers inside lines)
    const allTokens: MushafLineToken[] = [];
    pageData.verses.forEach((verse) => {
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
    const assembleBlocksWithHeaders = (lines: MushafLineToken[][]): MushafPageBlock[] => {
      const resultBlocks: MushafPageBlock[] = [];
      const handledHeaders = new Set<number>();

      lines.forEach((lineTokens, lineIdx) => {
        pageData.surah_headers.forEach((sHeader) => {
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
          key: `line-${lineIdx}`,
        });
      });

      // Edge case: if header was not placed because Ayah 1 wasn't found in tokens, prepend it
      pageData.surah_headers.forEach((sHeader) => {
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

    if (activeFormat === 15) {
      const hasLineNumbers = allTokens.some((t) => typeof t.lineNum === 'number' && t.lineNum > 0);
      if (hasLineNumbers) {
        const lineMap: Record<number, MushafLineToken[]> = {};
        allTokens.forEach((token) => {
          const lNum = Math.min(15, Math.max(1, token.lineNum || 1));
          if (!lineMap[lNum]) lineMap[lNum] = [];
          lineMap[lNum].push(token);
        });

        const rawLines = Object.keys(lineMap)
          .map(Number)
          .sort((a, b) => a - b)
          .map((k) => lineMap[k])
          .filter((l) => l.length > 0);

        return { blocks: assembleBlocksWithHeaders(rawLines), totalParts7L: 1 };
      }

      // If no canonical line numbers, distribute evenly into 15 (minus headers space) lines
      const headerCount = pageData.surah_headers.length;
      const targetLines = Math.max(1, 15 - headerCount * 2);
      const lines = partitionTokensBalancedK(allTokens, targetLines);
      return { blocks: assembleBlocksWithHeaders(lines), totalParts7L: 1 };
    } else if (activeFormat === 13) {
      // 13-line mode:
      const nonHeaderTokenCount = allTokens.length;
      const isShortMushafPage = nonHeaderTokenCount > 0 && nonHeaderTokenCount < 85;

      if (isShortMushafPage) {
        const hasLineNumbers = allTokens.some((t) => typeof t.lineNum === 'number' && t.lineNum > 0);
        if (hasLineNumbers) {
          const lineMap: Record<number, MushafLineToken[]> = {};
          allTokens.forEach((token) => {
            const lNum = Math.min(15, Math.max(1, token.lineNum || 1));
            if (!lineMap[lNum]) lineMap[lNum] = [];
            lineMap[lNum].push(token);
          });
          const rawLines = Object.keys(lineMap)
            .map(Number)
            .sort((a, b) => a - b)
            .map((k) => lineMap[k])
            .filter((l) => l.length > 0);
          return { blocks: assembleBlocksWithHeaders(rawLines), totalParts7L: 1 };
        }
      }

      // Available lines accounting for headers
      const headerCount = pageData.surah_headers.length;
      const availableVerseLines = Math.max(1, 13 - headerCount * 2);

      // If page spans multiple surahs, partition each surah segment proportionally
      const surahIds = Array.from(new Set(allTokens.map((t) => t.surahNumber)));
      if (surahIds.length > 1) {
        const segments = surahIds.map((sid) => allTokens.filter((t) => t.surahNumber === sid));
        const segWeights = segments.map((seg) =>
          seg.reduce((sum, t) => sum + getTokenWeight(t), 0)
        );
        const totalWeight = segWeights.reduce((a, b) => a + b, 0);
        let allocatedSum = 0;
        const allocatedK = segWeights.map((w) => {
          const k = Math.max(1, Math.round(availableVerseLines * (w / totalWeight)));
          allocatedSum += k;
          return k;
        });
        let diff = availableVerseLines - allocatedSum;
        while (diff !== 0) {
          if (diff > 0) {
            let maxIdx = 0;
            for (let i = 1; i < segWeights.length; i++) {
              if (segWeights[i] > segWeights[maxIdx]) maxIdx = i;
            }
            allocatedK[maxIdx]++;
            diff--;
          } else {
            let maxIdx = -1;
            for (let i = 0; i < allocatedK.length; i++) {
              if (allocatedK[i] > 1 && (maxIdx === -1 || allocatedK[i] > allocatedK[maxIdx])) {
                maxIdx = i;
              }
            }
            if (maxIdx >= 0) {
              allocatedK[maxIdx]--;
              diff++;
            } else {
              break;
            }
          }
        }
        const finalLines: MushafLineToken[][] = [];
        segments.forEach((seg, idx) => {
          const partLines = partitionTokensBalancedK(seg, allocatedK[idx] || 1);
          finalLines.push(...partLines);
        });
        return { blocks: assembleBlocksWithHeaders(finalLines), totalParts7L: 1 };
      }

      const lines = partitionTokensBalancedK(allTokens, availableVerseLines);
      return { blocks: assembleBlocksWithHeaders(lines), totalParts7L: 1 };
    } else {
      // 7-line mode: Strict 20-24 stripped char budget per line, paginated into ~7 lines per view
      const all7Lines = build7LineFormatTokens(allTokens);

      // Chunk all7Lines into sub-pages of ~7 lines each
      const subPages: MushafLineToken[][][] = [];
      for (let i = 0; i < all7Lines.length; i += 7) {
        subPages.push(all7Lines.slice(i, i + 7));
      }

      // If the final sub-page has only 1 line with <= 2 words (or just a medallion),
      // merge that trailing line into the previous sub-page so the reader never flips to an orphan sub-page (e.g. Page 106 Part 5/5)
      if (subPages.length > 1) {
        const lastPartLines = subPages[subPages.length - 1];
        if (lastPartLines.length === 1) {
          const singleLine = lastPartLines[0];
          const wordCount = singleLine.filter(t => t.type !== 'medallion' && t.type !== 'header').length;
          if (wordCount <= 2) {
            subPages[subPages.length - 2].push(singleLine);
            subPages.pop();
          }
        }
      }

      const parts = Math.max(1, subPages.length);
      const activePart = Math.min(parts, Math.max(1, subPage7L));
      const visibleLines = subPages[activePart - 1] || [];

      const blocksFor7L: MushafPageBlock[] = [];
      const handledHeaders = new Set<number>();

      visibleLines.forEach((lineTokens, lineIdx) => {
        pageData.surah_headers.forEach((sHeader) => {
          if (!handledHeaders.has(sHeader.surah_number)) {
            const hasAyah1 = lineTokens.some(
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
          tokens: lineTokens,
          lineIndex: lineIdx,
          key: `line-7l-${lineIdx}`,
        });
      });

      if (activePart === 1) {
        pageData.surah_headers.forEach((sHeader) => {
          if (!handledHeaders.has(sHeader.surah_number)) {
            blocksFor7L.unshift({
              type: 'surah-banner',
              header: sHeader,
              key: `banner-${sHeader.surah_number}`,
            });
            handledHeaders.add(sHeader.surah_number);
          }
        });
      }

      return { blocks: blocksFor7L, totalParts7L: parts };
    }
  }, [pageData, activeFormat, subPage7L]);

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

  // Surface styles
  const surfaceStyles = {
    jewel: {
      background: 'var(--surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
      bismillahColor: 'var(--accent-text)',
      headerBg: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)',
      headerBorder: 'var(--border)',
      medallionBg: 'var(--accent-soft)',
      medallionColor: 'var(--accent-text)',
      medallionBorder: 'var(--accent)',
    },
    parchment: {
      background: '#FBF6E9',
      color: '#1A1612',
      border: '1.5px solid rgba(190, 160, 95, 0.45)',
      boxShadow: '0 8px 26px rgba(0, 0, 0, 0.18)',
      bismillahColor: '#7C4A03',
      headerBg: '#F3EAD3',
      headerBorder: '#D8C7A3',
      medallionBg: 'rgba(190, 160, 95, 0.18)',
      medallionColor: '#7C4A03',
      medallionBorder: '#C9A84C',
    },
    night: {
      background: '#050507',
      color: '#E5E7EB',
      border: '1px solid #1F2937',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.85)',
      bismillahColor: '#E5E7EB',
      headerBg: '#0F1219',
      headerBorder: '#1F2937',
      medallionBg: 'rgba(255, 255, 255, 0.08)',
      medallionColor: '#F3F4F6',
      medallionBorder: '#374151',
    },
  }[surfaceMode] || {
    background: 'var(--surface)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
    bismillahColor: 'var(--accent-text)',
    headerBg: 'var(--surface-2)',
    headerBorder: 'var(--border)',
    medallionBg: 'var(--accent-soft)',
    medallionColor: 'var(--accent-text)',
    medallionBorder: 'var(--accent)',
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-6 select-none" onClick={() => setSelectedWord(null)}>
      {/* Page Container Canvas */}
      <div
        className="relative rounded-3xl transition-colors duration-200"
        style={{
          background: surfaceStyles.background,
          color: surfaceStyles.color,
          border: surfaceStyles.border,
          boxShadow: surfaceStyles.boxShadow,
          width: '100%',
          maxWidth: '100%',
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: '12px 10px',
        }}
      >
        {/* Top Page Header Ribbon: Juz and Page Number */}
        <div
          className="flex items-center justify-between pb-3 mb-3 border-b text-[11px] font-bold tracking-wider"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="opacity-75">JUZ {pageData?.juz_number || Math.ceil(pageNumber / 20)}</span>
          <span className="opacity-75 font-mono">PAGE {pageNumber}</span>
        </div>

        {/* Sleek Tajweed Color Legend Bar */}
        {showTajweed && (
          <div
            className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 mb-3 rounded-xl border text-[10px] sm:text-[11px] font-medium overflow-x-auto no-scrollbar"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2 shrink-0">
              {TAJWEED_RULES.map((rule) => (
                <div key={rule.name} className="flex items-center gap-1 shrink-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: rule.color }}
                  />
                  <span className="opacity-80 text-[10px]">{rule.name}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLegend(true);
              }}
              title="Tajweed Rules Guide"
              className="text-[var(--accent-text)] hover:underline shrink-0 font-bold ml-1 text-[10px] flex items-center gap-0.5"
            >
              <Sparkles className="w-3 h-3" />
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
            className="uthmani-mushaf-lines-container w-full max-w-full overflow-hidden box-border"
            dir="rtl"
            style={{
              fontFamily: "'Amiri Quran', 'Scheherazade New', 'Amiri', 'Traditional Arabic', serif",
              fontSize:
                activeFormat === 7
                  ? 'clamp(1.28rem, 5.2vw, 1.46rem)'
                  : activeFormat === 13
                  ? 'clamp(0.92rem, 3.9vw, 1.08rem)'
                  : 'clamp(0.85rem, 3.6vw, 1.00rem)',
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
                  className="text-xs font-arabic text-[var(--accent-text)] opacity-70 text-right mb-2 px-1 not-sr-only select-none"
                  dir="rtl"
                >
                  سُورَةُ {sInfo?.name || ''} ({toArabicDigits(minAyah)}–{toArabicDigits(maxAyah)})
                </div>
              );
            })()}

            {(() => {
              const nonHeaderTokenCount = pageData.verses.reduce(
                (acc, v) => acc + v.words.filter((w) => w.char_type_name === 'word').length,
                0
              );
              const isShortMushafPage = nonHeaderTokenCount > 0 && nonHeaderTokenCount < 85;

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
                        background: surfaceStyles.headerBg,
                        borderColor: surfaceStyles.headerBorder,
                        boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                      }}
                    >
                      <div className="flex items-center justify-between px-3 text-[11px] font-bold opacity-75">
                        <span>{surahHeader.revelation_type}</span>
                        <span>{surahHeader.ayah_count} Verses</span>
                      </div>
                      <h2
                        className="text-xl sm:text-2xl font-bold my-1 text-[var(--accent-text)] font-arabic tracking-wide"
                        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
                      >
                        سُورَةُ {surahHeader.name_arabic}
                      </h2>
                      <p className="text-xs font-semibold opacity-75">{surahHeader.name_english}</p>

                      {surahHeader.show_bismillah && (
                        <div
                          className="mt-2 text-lg sm:text-xl font-bold"
                          style={{ color: surfaceStyles.bismillahColor }}
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

                // Calculate stripped char budget for this line
                const lineCharCount = lineTokens.reduce((sum, t) => {
                  if (t.type === 'medallion') return sum + 4;
                  const txt = t.word?.text_indopak || t.word?.text_uthmani || '';
                  return sum + getStrippedArabicCharLength(txt);
                }, 0);

                // Dynamic font adjustment on dense lines to guarantee zero border overflow
                let lineDenseFontSize: string | undefined;
                if (activeFormat === 7) {
                  lineDenseFontSize = 'clamp(1.18rem, 4.6vw, 1.34rem)';
                } else if (activeFormat === 13 && lineCharCount > 38) {
                  lineDenseFontSize = '0.86rem';
                } else if (activeFormat === 15 && lineCharCount > 42) {
                  lineDenseFontSize = '0.80rem';
                }

                return (
                  <div
                    key={block.key}
                    data-mushaf-line={lineIdx + 1}
                    className="mushaf-line w-full max-w-full overflow-hidden my-0.5 px-0.5 transition-colors"
                    dir="rtl"
                    style={{
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      alignItems: 'center',
                      justifyContent: activeFormat === 7 || isShortMushafPage || lineTokens.length < 4
                        ? 'center'
                        : 'space-between',
                      gap: activeFormat === 7 ? '10px' : (isShortMushafPage || lineTokens.length < 4 ? '10px' : '4px'),
                      width: '100%',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.08)',
                      padding: activeFormat === 7 ? '6px 4px' : '4px 2px',
                      minHeight: activeFormat === 7 ? '3.2rem' : activeFormat === 13 ? '2.4rem' : '2.1rem',
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
                            className="inline-flex items-center justify-center mx-1 my-0.5 px-1.5 py-0.5 rounded-full border text-xs sm:text-sm font-bold align-middle transition-all hover:scale-110 active:scale-90 shadow-sm shrink-0 whitespace-nowrap select-none"
                            style={{
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
                            className={`interactive-quran-word inline-block px-0.5 rounded cursor-pointer transition-all duration-100 ${
                              isWordRecited
                                ? 'scale-105 z-10 [&_*]:!text-[var(--on-accent)]'
                                : 'hover:scale-105 active:scale-95 hover:text-[var(--accent-text)]'
                            }`}
                            style={{
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                              lineHeight: activeFormat === 7 ? 2.0 : 1.85,
                              flexShrink: 0,
                              minWidth: 0,
                              letterSpacing: 'normal',
                              wordSpacing: 'normal',
                              margin: '0',
                              verticalAlign: 'baseline',
                              ...(lineDenseFontSize ? { fontSize: lineDenseFontSize } : {}),
                              ...(isWordRecited
                                ? {
                                    background: 'var(--accent)',
                                    color: 'var(--on-accent)',
                                    borderRadius: '6px',
                                    boxShadow: '0 0 10px var(--accent-glow)',
                                    transition: 'background-color 120ms ease',
                                    padding: '0 3px',
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
                );
              });
            })()}
          </div>
        )}

        {/* Page Footer */}
        <div
          className="mt-6 pt-3 border-t flex items-center justify-between text-[11px] font-bold opacity-70"
          style={{ borderColor: 'var(--border)' }}
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
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border)] text-xs">
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
                  : 'bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] hover:border-[var(--accent)] active:scale-95'
              }`}
            >
              ← Prev 7 Lines
            </button>
            <span className="font-bold text-[var(--accent-text)] text-xs px-2.5 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
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
                  : 'bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] hover:border-[var(--accent)] active:scale-95'
              }`}
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
