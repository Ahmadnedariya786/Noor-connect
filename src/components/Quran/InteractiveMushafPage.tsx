// Noor Connect — Interactive Uthmani Mushaf Page Component
// Features: Jewel Ink, Tajweed Colors, Word-by-Word Jewel Popover, Live Recitation Sync & Audio Auto-Follow

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchMushafPage,
  prefetchNextMushafPage,
  toArabicDigits,
  sanitizeTajweedHtml,
  getPageForSurahAndAyah,
  getMushafLineFormat,
  TAJWEED_RULES,
  type InteractivePageData,
  type InteractiveVerse,
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
import { Volume2, BookOpen, Info, X, Sparkles, Loader2 } from 'lucide-react';
import { MushafSurahPages, type MushafReadingMode } from './MushafSurahPages';

export type InteractiveMushafSurface = 'jewel' | 'parchment' | 'night' | 'classic';

interface InteractiveMushafPageProps {
  pageNumber: number;
  surahNumber: number;
  targetSurahNumber?: number;
  surfaceMode: InteractiveMushafSurface;
  showTajweed: boolean;
  lineFormat?: MushafLineFormat;
  onSubPage7LChange?: (subPage: 1 | 2, totalParts: number) => void;
  onOpenStudySheet: (surah: number, ayah: number) => void;
  onPageTurnRequest?: (newPage: number) => void;
  onPageLoaded?: (data: InteractivePageData) => void;
}

interface MushafLineToken {
  type: 'header' | 'word' | 'medallion';
  header?: SurahHeaderInfo;
  word?: InteractiveWord;
  surahNumber: number;
  verseNumber: number;
  key: string;
  lineNum?: number;
}

function distributeTokensIntoLines(tokens: MushafLineToken[], targetLineCount: number): MushafLineToken[][] {
  if (tokens.length === 0) return [];
  if (targetLineCount <= 1) return [tokens];

  const lines: MushafLineToken[][] = [];
  let currentLine: MushafLineToken[] = [];

  const nonHeaderTokens = tokens.filter((t) => t.type !== 'header');
  const headerTokens = tokens.filter((t) => t.type === 'header');
  const availableVerseLines = Math.max(1, targetLineCount - headerTokens.length);

  const getWeight = (t: MushafLineToken): number => {
    if (t.type === 'header') return 40;
    if (t.type === 'medallion') return 5;
    return (t.word?.text_indopak || t.word?.text_uthmani || '').length + 1;
  };

  const totalWeight = nonHeaderTokens.reduce((sum, t) => sum + getWeight(t), 0);
  const targetWeightPerLine = totalWeight / availableVerseLines;

  let currentWeight = 0;
  for (const token of tokens) {
    if (token.type === 'header') {
      if (currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = [];
        currentWeight = 0;
      }
      lines.push([token]);
      continue;
    }

    const w = getWeight(token);
    if (
      currentLine.length > 0 &&
      currentWeight + w > targetWeightPerLine &&
      lines.length < targetLineCount - 1
    ) {
      lines.push(currentLine);
      currentLine = [token];
      currentWeight = w;
    } else {
      currentLine.push(token);
      currentWeight += w;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  return lines;
}

export function InteractiveMushafPage({
  pageNumber,
  surahNumber,
  targetSurahNumber,
  surfaceMode,
  showTajweed,
  lineFormat,
  onSubPage7LChange,
  onOpenStudySheet,
  onPageTurnRequest,
  onPageLoaded,
}: InteractiveMushafPageProps) {
  const [pageData, setPageData] = useState<InteractivePageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState<MushafLineFormat>(() => lineFormat || getMushafLineFormat());
  const [subPage7L, setSubPage7L] = useState<1 | 2>(1);

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

  useEffect(() => {
    setSubPage7L(1);
  }, [pageNumber]);
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
          onPageTurnRequest?.(targetPage);
        }
      }
    }
  }, [isPlaying, currentSurah, currentAyah, pageData, loading, pageNumber, onPageTurnRequest]);

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
          onPageLoaded?.(data);
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

  // Tilawah auto-flip for 7-Line mode (switches between Part 1 and Part 2)
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
      const all14 = distributeTokensIntoLines(allTokens, 14);
      if (all14.length > 7) {
        const part2Lines = all14.slice(7, 14);
        const inPart2 = part2Lines.some((line) =>
          line.some((t) => t.surahNumber === currentSurah && t.verseNumber === currentAyah)
        );
        if (inPart2 && subPage7L !== 2) {
          setSubPage7L(2);
        }
        const part1Lines = all14.slice(0, 7);
        const inPart1 = part1Lines.some((line) =>
          line.some((t) => t.surahNumber === currentSurah && t.verseNumber === currentAyah)
        );
        if (inPart1 && subPage7L !== 1) {
          setSubPage7L(1);
        }
      }
    }
  }, [isPlaying, currentSurah, currentAyah, activeFormat, pageData]);

  // Compute 7L, 13L, and 15L formatted lines
  const { lines, totalParts7L } = useMemo(() => {
    if (!pageData || pageData.verses.length === 0) {
      return { lines: [] as MushafLineToken[][], totalParts7L: 1 };
    }

    const allTokens: MushafLineToken[] = [];
    pageData.verses.forEach((verse) => {
      if (verse.verse_number === 1) {
        const sHeader = pageData.surah_headers.find(
          (h) => h.surah_number === verse.surah_number && h.at_verse_number === 1
        );
        if (sHeader) {
          allTokens.push({
            type: 'header',
            header: sHeader,
            surahNumber: verse.surah_number,
            verseNumber: 1,
            key: `header-${sHeader.surah_number}`,
            lineNum: 1,
          });
        }
      }

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

    if (activeFormat === 15) {
      const hasLineNumbers = allTokens.some((t) => typeof t.lineNum === 'number' && t.lineNum > 0);
      if (hasLineNumbers) {
        const lineMap: Record<number, MushafLineToken[]> = {};
        for (let i = 1; i <= 15; i++) lineMap[i] = [];

        allTokens.forEach((token) => {
          const lNum = Math.min(15, Math.max(1, token.lineNum || 1));
          lineMap[lNum].push(token);
        });

        const rawLines = Object.keys(lineMap)
          .map(Number)
          .sort((a, b) => a - b)
          .map((k) => lineMap[k])
          .filter((l) => l.length > 0);

        return { lines: rawLines, totalParts7L: 1 };
      }
      return { lines: distributeTokensIntoLines(allTokens, 15), totalParts7L: 1 };
    } else if (activeFormat === 13) {
      return { lines: distributeTokensIntoLines(allTokens, 13), totalParts7L: 1 };
    } else {
      // 7-line mode
      const all14Lines = distributeTokensIntoLines(allTokens, 14);
      const parts = all14Lines.length > 7 ? 2 : 1;
      const visible = subPage7L === 1 ? all14Lines.slice(0, 7) : all14Lines.slice(7, 14);
      return { lines: visible, totalParts7L: parts };
    }
  }, [pageData, activeFormat, subPage7L]);

  useEffect(() => {
    onSubPage7LChange?.(subPage7L, totalParts7L);
  }, [subPage7L, totalParts7L, onSubPage7LChange]);

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
        className="relative rounded-3xl p-4 sm:p-6 transition-colors duration-200"
        style={{
          background: surfaceStyles.background,
          color: surfaceStyles.color,
          border: surfaceStyles.border,
          boxShadow: surfaceStyles.boxShadow,
        }}
      >
        {/* Top Page Header Ribbon: Juz and Page Number */}
        <div
          className="flex items-center justify-between pb-3 mb-4 border-b text-[11px] font-bold tracking-wider"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="opacity-75">JUZ {pageData?.juz_number || Math.ceil(pageNumber / 20)}</span>
          <span className="opacity-75 font-mono">PAGE {pageNumber}</span>
        </div>

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
            className="uthmani-mushaf-lines-container w-full"
            dir="rtl"
            style={{
              fontFamily:
                activeFormat === 13
                  ? "'Amiri', 'Noto Nastaliq Urdu', serif"
                  : "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
              fontSize:
                activeFormat === 7
                  ? 'clamp(1.58rem, 5.8vw, 1.88rem)'
                  : activeFormat === 13
                  ? 'clamp(1.28rem, 4.6vw, 1.48rem)'
                  : 'clamp(1.22rem, 4.2vw, 1.38rem)',
              lineHeight: activeFormat === 7 ? 2.5 : activeFormat === 13 ? 2.25 : 2.15,
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

            {lines.map((lineTokens, lineIdx) => {
              const isOnlyHeader = lineTokens.length === 1 && lineTokens[0].type === 'header';
              return (
                <div
                  key={`mushaf-line-${lineIdx}`}
                  data-mushaf-line={lineIdx + 1}
                  className={`mushaf-line w-full flex items-center ${
                    isOnlyHeader
                      ? 'justify-center'
                      : lineTokens.length < 4
                      ? 'justify-center gap-3 sm:gap-4'
                      : 'justify-between'
                  } my-1 px-1 transition-colors`}
                  dir="rtl"
                  style={{
                    borderBottom: '1px solid rgba(212, 175, 55, 0.08)',
                    minHeight: activeFormat === 7 ? '3.5rem' : activeFormat === 13 ? '2.6rem' : '2.3rem',
                  }}
                >
                  {lineTokens.map((token) => {
                    if (token.type === 'header' && token.header) {
                      const surahHeader = token.header;
                      return (
                        <div
                          key={token.key}
                          data-surah-opening={surahHeader.surah_number}
                          className="w-full my-2.5 p-3 rounded-2xl text-center border relative overflow-hidden not-sr-only"
                          dir="rtl"
                          style={{
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
                            onOpenStudySheet(token.surahNumber, token.verseNumber);
                          }}
                          title={`Study Verse ${token.surahNumber}:${token.verseNumber}`}
                          className="inline-flex items-center justify-center mx-1 my-0.5 px-2 py-0.5 rounded-full border text-xs sm:text-sm font-bold align-middle transition-all hover:scale-115 active:scale-90 shadow-sm shrink-0"
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

                      const displayText =
                        (activeFormat === 13 ? (w.text_indopak || w.text_uthmani) : w.text_uthmani) || '';
                      const wordHtml =
                        showTajweed && w.text_uthmani_tajweed
                          ? sanitizeTajweedHtml(w.text_uthmani_tajweed)
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
                              : 'hover:scale-110 active:scale-95 hover:text-[var(--accent-text)]'
                          }`}
                          style={
                            isWordRecited
                              ? {
                                  background: 'var(--accent)',
                                  color: 'var(--on-accent)',
                                  borderRadius: '6px',
                                  boxShadow: '0 0 10px var(--accent-glow)',
                                  transition: 'background-color 120ms ease',
                                  padding: '0 3px',
                                  margin: '0 -2px',
                                }
                              : isVersePlaying
                              ? {
                                  backgroundColor: 'var(--accent-soft)',
                                  borderRadius: '4px',
                                }
                              : undefined
                          }
                          dangerouslySetInnerHTML={{ __html: wordHtml }}
                        />
                      );
                    }

                    return null;
                  })}
                </div>
              );
            })}
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
              disabled={subPage7L === 1}
              onClick={() => setSubPage7L(1)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                subPage7L === 1
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
              disabled={subPage7L === totalParts7L}
              onClick={() => setSubPage7L(2)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                subPage7L === totalParts7L
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
