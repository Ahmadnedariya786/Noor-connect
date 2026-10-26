// Noor Connect — Interactive Uthmani Mushaf Page Component
// Features: Jewel Ink, Tajweed Colors, Word-by-Word Jewel Popover, Live Recitation Sync & Audio Auto-Follow

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  fetchMushafPage,
  prefetchNextMushafPage,
  toArabicDigits,
  sanitizeTajweedHtml,
  TAJWEED_RULES,
  type InteractivePageData,
  type InteractiveVerse,
  type InteractiveWord,
} from '@/lib/interactive-mushaf';
import { useTilawah } from '@/contexts/TilawahContext';
import { Volume2, BookOpen, Info, X, Sparkles, Loader2 } from 'lucide-react';
import { MushafSurahPages, type MushafReadingMode } from './MushafSurahPages';

export type InteractiveMushafSurface = 'jewel' | 'parchment' | 'night' | 'classic';

interface InteractiveMushafPageProps {
  pageNumber: number;
  surahNumber: number;
  surfaceMode: InteractiveMushafSurface;
  showTajweed: boolean;
  onOpenStudySheet: (surah: number, ayah: number) => void;
  onPageTurnRequest?: (newPage: number) => void;
  onPageLoaded?: (data: InteractivePageData) => void;
}

export function InteractiveMushafPage({
  pageNumber,
  surahNumber,
  surfaceMode,
  showTajweed,
  onOpenStudySheet,
  onPageTurnRequest,
  onPageLoaded,
}: InteractiveMushafPageProps) {
  const [pageData, setPageData] = useState<InteractivePageData | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Tilawah live recitation sync
  const { currentSurah, currentAyah, isPlaying } = useTilawah();

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

    const fullUrl = audioUrl.startsWith('http')
      ? audioUrl
      : `https://audio.qurancdn.com/${audioUrl}`;

    const audio = new Audio(fullUrl);
    wordAudioRef.current = audio;
    setPlayingWordAudio(true);

    audio.onended = () => setPlayingWordAudio(false);
    audio.onerror = () => setPlayingWordAudio(false);
    audio.play().catch(() => setPlayingWordAudio(false));
  };

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
            className="uthmani-mushaf-flow leading-loose"
            dir="rtl"
            style={{
              fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
              fontSize: 'clamp(1.35rem, 5.2vw, 1.68rem)',
              lineHeight: 2.35,
              textAlign: 'justify',
              textAlignLast: 'center',
            }}
          >
            {pageData.verses.map((verse, index) => {
              const isVersePlaying =
                isPlaying &&
                currentSurah === verse.surah_number &&
                currentAyah === verse.verse_number;

              // Check if Surah Header is needed before this verse
              const surahHeader = pageData.surah_headers.find(
                (h) => h.surah_number === verse.surah_number && h.at_verse_number === verse.verse_number
              );

              return (
                <React.Fragment key={verse.verse_key}>
                  {/* Ornate Surah Header Banner */}
                  {surahHeader && (
                    <div
                      className="my-5 p-3 rounded-2xl text-center border relative overflow-hidden not-sr-only"
                      dir="rtl"
                      style={{
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

                      {/* Bismillah Line */}
                      {surahHeader.show_bismillah && (
                        <div
                          className="mt-3 text-lg sm:text-xl font-bold"
                          style={{ color: surfaceStyles.bismillahColor }}
                        >
                          بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ
                        </div>
                      )}
                    </div>
                  )}

                  {/* Verse Span Container with Tilawah Active Recitation Highlight */}
                  <span
                    ref={isVersePlaying ? activeVerseRef : null}
                    data-ayah-key={`${verse.surah_number}:${verse.verse_number}`}
                    className={`interactive-verse-span rounded-lg px-1 transition-all duration-300 inline ${
                      isVersePlaying
                        ? 'bg-[var(--accent-soft)] ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-transparent shadow-sm'
                        : 'hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    style={{
                      backgroundColor: isVersePlaying ? 'var(--accent-soft)' : undefined,
                    }}
                  >
                    {/* Render Words: Every individual word opens Word-by-Word Popover */}
                    {verse.words.map((w) => {
                      if (w.char_type_name === 'end') {
                        return null;
                      }
                      const wordHtml = showTajweed && w.text_uthmani_tajweed
                        ? sanitizeTajweedHtml(w.text_uthmani_tajweed)
                        : w.text_uthmani;
                      return (
                        <span
                          key={w.id}
                          onClick={(e) =>
                            handleWordClick(e, w, verse.surah_number, verse.verse_number)
                          }
                          className="interactive-quran-word inline-block px-0.5 rounded cursor-pointer transition-transform hover:scale-110 active:scale-95 hover:text-[var(--accent-text)]"
                          dangerouslySetInnerHTML={{ __html: wordHtml + ' ' }}
                        />
                      );
                    })}

                    {/* Clickable Golden Ayah Medallion */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenStudySheet(verse.surah_number, verse.verse_number);
                      }}
                      title={`Study Verse ${verse.verse_key}`}
                      className="inline-flex items-center justify-center mx-1.5 my-0.5 px-2 py-0.5 rounded-full border text-xs sm:text-sm font-bold align-middle transition-all hover:scale-115 active:scale-90 shadow-sm"
                      style={{
                        background: isVersePlaying ? 'var(--accent)' : surfaceStyles.medallionBg,
                        color: isVersePlaying ? 'var(--on-accent)' : surfaceStyles.medallionColor,
                        borderColor: surfaceStyles.medallionBorder,
                      }}
                    >
                      <span>﴿{toArabicDigits(verse.verse_number)}﴾</span>
                    </button>
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Page Footer */}
        <div
          className="mt-6 pt-3 border-t flex items-center justify-between text-[11px] font-bold opacity-70"
          style={{ borderColor: 'var(--border)' }}
        >
          <span>Madinah Mushaf</span>
          <span className="font-mono">Page {pageNumber} / 604</span>
        </div>
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
