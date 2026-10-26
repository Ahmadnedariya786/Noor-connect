import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Star,
  BookOpen,
  Sparkles,
  Play,
  Pause,
  Sliders,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import { QuranGuideModal } from '@/components/Quran/QuranGuideModal';
import { quranService } from '@/lib/quran-service';
import {
  InteractiveMushafPage,
  type InteractiveMushafSurface,
} from '@/components/Quran/InteractiveMushafPage';
import {
  getPageForSurahAndAyah,
  resolveMushafPageForAyah,
  getKnownPageForAyah,
  type InteractivePageData,
} from '@/lib/interactive-mushaf';
import { SURAH_START_PAGES, mushafService } from '@/lib/mushaf-service';
import { PageTransition } from '@/components/PageTransition';
import { Preferences } from '@capacitor/preferences';
import { useSettings } from '@/contexts/SettingsContext';
import { useTilawah } from '@/contexts/TilawahContext';
import { quranFeaturesService } from '@/lib/quran-features';
import { AyahStudySheet } from '@/components/Quran/AyahStudySheet';
import { updateAutoMovingBookmarks } from '@/lib/quran-bookmarks';

const LS_LAST_SURAH = 'quran-reader-last-surah';
const LS_LAST_PAGE = 'quran-reader-last-page';
const BOOKMARKS_KEY = 'quran-bookmarks';

export default function QuranReader() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme !== 'desert-scroll';

  const { surahName } = useParams<{ surahName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tilawah global player
  const { isPlaying, currentSurah, currentAyah, playAyah, togglePlay } = useTilawah();
  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [currentPageData, setCurrentPageData] = useState<InteractivePageData | null>(null);
  const pageDataRef = useRef<InteractivePageData | null>(null);
  const lastObservedVerseRef = useRef<string | null>(null);

  const initialSurah = (() => {
    if (surahName) {
      const m = surahName.match(/surah-(\d+)/);
      if (m) return parseInt(m[1], 10);
    }
    const saved = localStorage.getItem(LS_LAST_SURAH);
    return saved ? parseInt(saved, 10) : 1;
  })();

  const [surahNum, setSurahNum] = useState(initialSurah);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Global Madinah Mushaf Page (1..604)
  const [mushafPageNumber, setMushafPageNumber] = useState<number>(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (p >= 1 && p <= 604) return p;
    }
    const savedPage = localStorage.getItem(LS_LAST_PAGE);
    if (savedPage) {
      const p = parseInt(savedPage, 10);
      if (p >= 1 && p <= 604) return p;
    }
    return SURAH_START_PAGES[initialSurah] || 1;
  });

  // Ayah Study & Hifz Sheet state
  const [showStudySheet, setShowStudySheet] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [studyInitialAyah, setStudyInitialAyah] = useState(1);
  const [studySurah, setStudySurah] = useState(initialSurah);

  // Tajweed toggle
  const [showTajweed, setShowTajweed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('noor_show_tajweed');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Page slider dialog
  const [showPageSlider, setShowPageSlider] = useState(false);
  const [tempPageInput, setTempPageInput] = useState(mushafPageNumber);

  // 4 Reading Surface Modes: jewel (default on dark), parchment, night, classic
  const [surfaceMode, setSurfaceMode] = useState<InteractiveMushafSurface>(() => {
    try {
      const saved = localStorage.getItem('noor_mushaf_surface') as InteractiveMushafSurface;
      if (saved === 'jewel' || saved === 'parchment' || saved === 'night' || saved === 'classic') {
        return saved;
      }
    } catch {
      // Safe fallback
    }
    return isDark ? 'jewel' : 'parchment';
  });

  const handleSurfaceChange = (mode: InteractiveMushafSurface) => {
    setSurfaceMode(mode);
    try {
      localStorage.setItem('noor_mushaf_surface', mode);
    } catch {
      // Ignore storage write error
    }
  };

  const toggleTajweed = () => {
    setShowTajweed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('noor_show_tajweed', String(next));
      } catch {
        // Safe catch
      }
      return next;
    });
  };

  // Sync with route param and query searchParams (?page=)
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= 604 && parsedPage !== mushafPageNumber) {
        setMushafPageNumber(parsedPage);
        const derivedSurah = mushafService.getSurahForPage(parsedPage);
        if (derivedSurah && derivedSurah !== surahNum) {
          setSurahNum(derivedSurah);
        }
      }
    } else if (surahName) {
      const m = surahName.match(/surah-(\d+)/);
      if (m) {
        const parsed = parseInt(m[1], 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 114 && parsed !== surahNum) {
          setSurahNum(parsed);
          const startP = SURAH_START_PAGES[parsed] || 1;
          setMushafPageNumber(startP);
        }
      }
    }
  }, [surahName, searchParams]);

  const surahInfo = quranService.getSurahInfo(surahNum);
  // Dynamic header metadata derived from actual Surah on mushafPageNumber
  const surahOnPage = mushafService.getSurahForPage(mushafPageNumber) || surahNum;
  const currentSurahInfo = quranService.getSurahInfo(surahOnPage) || surahInfo;

  // Save last read position & update streaks
  useEffect(() => {
    localStorage.setItem(LS_LAST_SURAH, String(surahNum));
    localStorage.setItem(LS_LAST_PAGE, String(mushafPageNumber));

    if (currentSurahInfo) {
      const lastReadData = {
        number: surahOnPage,
        name: currentSurahInfo.englishName,
        englishName: currentSurahInfo.englishName,
        arabicName: currentSurahInfo.name,
        page: mushafPageNumber,
        totalPages: 604,
      };
      localStorage.setItem('quran-last-read', JSON.stringify(lastReadData));
    }
    loadBookmark();

    const syncId = setTimeout(() => {
      if (!currentSurahInfo) return;
      quranFeaturesService.updateReadingStreak().catch((e) => {
        console.warn('Streak update warning', e);
      });
      quranFeaturesService
        .updateRecitationProgress(
          surahOnPage,
          currentSurahInfo.englishName,
          currentSurahInfo.numberOfAyahs,
          1,
          1,
          mushafPageNumber,
          604
        )
        .then(() => quranFeaturesService.checkAndUnlockAchievements())
        .then(() => {
          window.dispatchEvent(new CustomEvent('noorconnect:quran-progress-changed'));
        })
        .catch((e) => {
          console.warn('Progress update warning', e);
        });
    }, 1000);

    return () => clearTimeout(syncId);
  }, [surahNum, surahOnPage, currentSurahInfo, mushafPageNumber]);

  const goToMushafPage = (
    targetPage: number,
    options?: { source?: 'user' | 'audio' }
  ) => {
    if (targetPage < 1 || targetPage > 604) return;
    const isUserAction = options?.source === 'user';

    if (isUserAction && isPlaying) {
      // User manually browsed/peeked at another page while recitation is playing
      setAutoFollow(false);
    }

    setMushafPageNumber(targetPage);

    // Identify which Surah this target page belongs to
    const targetSurah = mushafService.getSurahForPage(targetPage) || 1;
    setSurahNum(targetSurah);

    // Synchronize URL in lockstep with replace: true
    navigate(`/quran/surah-${targetSurah}?page=${targetPage}`, { replace: true });

    // Auto-moving bookmarks update
    updateAutoMovingBookmarks(
      targetSurah,
      quranService.getSurahInfo(targetSurah)?.englishName || `Surah ${targetSurah}`,
      1,
      targetPage,
      quranService.getSurahInfo(targetSurah)?.name
    );
  };

  // LIVE AUDIO AUTO-PAGE ADVANCE ENGINE
  useEffect(() => {
    if (!isPlaying || !autoFollow || currentSurah <= 0 || currentAyah <= 0) {
      if (!isPlaying) {
        lastObservedVerseRef.current = null;
      }
      return;
    }

    const currentKey = `${currentSurah}:${currentAyah}`;

    // Helper to advance page cleanly
    const advanceToPage = (targetPage: number) => {
      if (targetPage >= 1 && targetPage <= 604 && targetPage !== mushafPageNumber) {
        goToMushafPage(targetPage, { source: 'audio' });
      }
    };

    // 1. Check if current verse is on the currently loaded page
    const loadedVerses = currentPageData?.verses || pageDataRef.current?.verses || [];
    const isCurrentVerseOnThisPage = loadedVerses.some(
      (v) => v.surah_number === currentSurah && v.verse_number === currentAyah
    );

    if (isCurrentVerseOnThisPage) {
      // Same page: verse is rendered on this page. Within-page auto-scroll handles it!
      lastObservedVerseRef.current = currentKey;
      return;
    }

    // 2. The verse is NOT on the currently displayed page.
    // Check if the previous verse was the last verse on the current page:
    const lastVerseOnCurrentPage =
      loadedVerses.length > 0 ? loadedVerses[loadedVerses.length - 1] : null;
    const wasLastVerseOnCurrentPage =
      lastVerseOnCurrentPage &&
      lastObservedVerseRef.current ===
        `${lastVerseOnCurrentPage.surah_number}:${lastVerseOnCurrentPage.verse_number}`;

    if (wasLastVerseOnCurrentPage && mushafPageNumber < 604) {
      // Immediate next page transition!
      const nextPage = mushafPageNumber + 1;
      advanceToPage(nextPage);
      lastObservedVerseRef.current = currentKey;
      return;
    }

    // 3. Otherwise, resolve exact page for this verse (via synchronous map or API lookup)
    const knownPage = getKnownPageForAyah(currentSurah, currentAyah);
    if (typeof knownPage === 'number' && knownPage >= 1 && knownPage <= 604) {
      advanceToPage(knownPage);
      lastObservedVerseRef.current = currentKey;
      return;
    }

    // Async fallback resolution
    let isCancelled = false;
    resolveMushafPageForAyah(currentSurah, currentAyah).then((resolvedPage) => {
      if (!isCancelled && resolvedPage >= 1 && resolvedPage <= 604) {
        advanceToPage(resolvedPage);
      }
    });

    lastObservedVerseRef.current = currentKey;
    return () => {
      isCancelled = true;
    };
  }, [isPlaying, currentSurah, currentAyah, autoFollow, mushafPageNumber, currentPageData]);

  const handleFooterPlayToggle = () => {
    if (isPlaying) {
      // If playing on the current page, toggle pause
      const loadedVerses = currentPageData?.verses || pageDataRef.current?.verses || [];
      const isPlayingOnThisPage = loadedVerses.some(
        (v) => v.surah_number === currentSurah && v.verse_number === currentAyah
      );

      if (isPlayingOnThisPage) {
        togglePlay();
      } else {
        // Playing on a different page: switch to first verse of this viewed page and keep autoFollow on
        const firstVerse = loadedVerses[0];
        const targetS = firstVerse?.surah_number || surahOnPage;
        const targetA = firstVerse?.verse_number || 1;
        setAutoFollow(true);
        playAyah(targetS, targetA);
      }
    } else {
      // Stopped or paused: play first verse on this viewed page with autoFollow enabled
      const loadedVerses = currentPageData?.verses || pageDataRef.current?.verses || [];
      const firstVerse = loadedVerses[0];
      const targetS = firstVerse?.surah_number || surahOnPage;
      const targetA = firstVerse?.verse_number || 1;
      setAutoFollow(true);
      playAyah(targetS, targetA);
    }
  };

  const handlePrevPage = () => {
    if (mushafPageNumber > 1) {
      goToMushafPage(mushafPageNumber - 1, { source: 'user' });
    }
  };

  const handleNextPage = () => {
    if (mushafPageNumber < 604) {
      goToMushafPage(mushafPageNumber + 1, { source: 'user' });
    }
  };

  const handleOpenStudySheet = (sNum?: number, aNum?: number) => {
    const s = sNum || surahNum;
    const a = aNum || 1;
    setStudySurah(s);
    setStudyInitialAyah(a);
    setShowStudySheet(true);
  };

  const currentJuz = Math.max(1, Math.min(30, Math.ceil(mushafPageNumber / 20)));
  const isTilawahActive = currentSurah !== null && currentAyah !== null;

  return (
    <PageTransition>
      <div
        className="min-h-screen relative overflow-hidden bg-[var(--bg-base)]"
        style={{
          paddingBottom: isTilawahActive
            ? 'calc(165px + env(safe-area-inset-bottom, 0px))'
            : 'calc(96px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* TOP READER CONTROL BAR */}
        <div className="sticky top-0 z-30 backdrop-blur-md border-b safe-top bg-[var(--surface)]/95 border-[var(--border)] shadow-sm">
          <div className="max-w-2xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
            {/* Left: Back button returning to /quran via { replace: true } */}
            <button
              type="button"
              onClick={() => navigate('/quran', { replace: true })}
              className="flex items-center gap-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors shrink-0 select-none"
              style={{ padding: '5px 8px', fontSize: '0.72rem' }}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              <span>Quran</span>
            </button>

            {/* Center: Arabic Surah Title + English Surah Name + Subtitle (Derived from Surah on currentPage) */}
            <div
              className="cursor-pointer select-none"
              style={{ flex: 1, minWidth: 0, textAlign: 'center', padding: '0 4px' }}
              onClick={() => navigate('/quran', { replace: true })}
              title="Return to Quran index"
            >
              <h1 className="font-arabic font-bold text-base sm:text-lg text-[var(--accent-text)] leading-tight truncate">
                {currentSurahInfo?.name}
              </h1>
              <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                {currentSurahInfo?.englishName} • #{surahOnPage}
              </p>
              <p
                className="text-[var(--text-secondary)] font-medium"
                style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', lineHeight: 1.2 }}
              >
                Page {mushafPageNumber} / 604 • Juz {currentJuz}
              </p>
            </div>

            {/* Right: Guide, Study & Hifz + Star Bookmark */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                title="Quran Features Guide"
                className="rounded-lg font-bold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors select-none flex items-center gap-1 shadow-sm"
                style={{ padding: '5px 7px', fontSize: '0.72rem' }}
              >
                <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span className="hidden xs:inline">? Guide</span>
                <span className="xs:hidden">?</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenStudySheet(surahOnPage, 1)}
                title="Study & Hifz Memorization"
                className="rounded-lg font-bold border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent-text)] hover:border-[var(--accent)] transition-colors select-none flex items-center gap-1 shadow-sm"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>📚 Study</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleBookmark();
                  handleOpenStudySheet(surahOnPage, 1);
                }}
                title={isBookmarked ? 'Remove Star / Manage Bookmarks' : 'Bookmark Surah & Ayah'}
                className={`rounded-lg border transition-all select-none ${
                  isBookmarked
                    ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                }`}
                style={{ padding: '5px 7px' }}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    isBookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* 4-Mode Surface Bar - Equal 4-Column Segmented Row */}
          <div className="border-t border-[var(--border)]/60 bg-[var(--surface)] px-3 py-1.5">
            <div
              className="grid max-w-md mx-auto"
              style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}
            >
              {[
                { mode: 'jewel' as const, icon: '✦', label: 'Jewel' },
                { mode: 'parchment' as const, icon: '📜', label: 'Paper' },
                { mode: 'night' as const, icon: '🌙', label: 'Night' },
                { mode: 'classic' as const, icon: '🖼', label: 'Scan' },
              ].map((item) => {
                const isActive = surfaceMode === item.mode;
                return (
                  <button
                    key={item.mode}
                    type="button"
                    onClick={() => handleSurfaceChange(item.mode)}
                    className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-xl text-xs font-bold transition-all select-none ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span className="text-[11px] leading-none">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-header Bar: Tajweed Colors Toggle, Auto-Page / Sync Audio Pill, & Guidance */}
          <div className="border-t border-[var(--border)]/40 bg-[var(--surface)] px-3 py-1 flex items-center justify-between text-xs max-w-md mx-auto gap-2">
            <button
              type="button"
              onClick={toggleTajweed}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all shrink-0 ${
                showTajweed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] opacity-70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>🎨 Tajweed</span>
            </button>

            {/* LIVE TILAWAH AUTO-FOLLOW / SYNC AUDIO CHIP */}
            {isPlaying && (
              <div className="shrink-0">
                {autoFollow ? (
                  <button
                    type="button"
                    onClick={() => setAutoFollow(false)}
                    title="Automatic Mushaf page turn is active. Tap to pause auto-flip."
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all animate-pulse"
                    style={{
                      background: 'var(--accent-soft)',
                      color: 'var(--accent-text)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    <span>🔄 Auto-Page ON</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setAutoFollow(true);
                      const audioPage = getPageForSurahAndAyah(currentSurah, currentAyah);
                      goToMushafPage(audioPage, { source: 'audio' });
                    }}
                    title="Tap to snap back to the reciting page and re-enable auto-page turn"
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shadow-sm"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    <span>📍 Sync Audio</span>
                  </button>
                )}
              </div>
            )}

            <div
              style={{
                fontSize: '0.68rem',
                whiteSpace: 'nowrap',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                paddingLeft: '4px',
                textAlign: 'right',
                flex: 1,
              }}
            >
              <span>Tap word: Meaning • Tap ﴿١﴾: Tafsir</span>
            </div>
          </div>
        </div>

        {/* INTERACTIVE MUSHAF PAGE CANVAS */}
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
          <InteractiveMushafPage
            pageNumber={mushafPageNumber}
            surahNumber={surahNum}
            surfaceMode={surfaceMode}
            showTajweed={showTajweed}
            onOpenStudySheet={handleOpenStudySheet}
            onPageTurnRequest={(p) => goToMushafPage(p, { source: 'user' })}
            onPageLoaded={(data) => {
              pageDataRef.current = data;
              setCurrentPageData(data);
            }}
          />
        </div>

        {/* IMMERSIVE DISTRACTION-FREE MUSHAF FOOTER BAR (Hides main BottomNav) */}
        <div
          className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t shadow-lg safe-bottom"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.35)',
            paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="max-w-2xl mx-auto px-2 py-1.5 flex items-center justify-between gap-1.5">
            {/* ‹ Prev Page */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={mushafPageNumber <= 1}
              className="rounded-xl font-bold border flex items-center justify-center gap-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                padding: '0 10px',
                height: '42px',
                fontSize: '0.76rem',
                flexShrink: 0,
              }}
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              <span>Prev</span>
            </button>

            {/* Center: Interactive Page Slider Launcher */}
            <button
              type="button"
              onClick={() => {
                setTempPageInput(mushafPageNumber);
                setShowPageSlider(true);
              }}
              className="rounded-xl border flex flex-col items-center justify-center transition-all hover:border-[var(--accent)] active:scale-98"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                flex: 1,
                minWidth: 0,
                padding: '4px 6px',
                height: '42px',
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                Page {mushafPageNumber} / 604
              </div>
              <div
                style={{
                  fontSize: '0.63rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                Juz {currentJuz} • Jump ▴
              </div>
            </button>

            {/* Tilawah Play / Pause for this Page */}
            <button
              type="button"
              onClick={handleFooterPlayToggle}
              className="rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm"
              style={{
                background: isPlaying ? 'var(--accent)' : 'var(--surface-2)',
                borderColor: 'var(--accent)',
                color: isPlaying ? 'var(--on-accent)' : 'var(--accent)',
                width: '42px',
                height: '42px',
                flexShrink: 0,
              }}
              title={isPlaying ? 'Pause Tilawah' : 'Play Tilawah from this page'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Next Page › */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={mushafPageNumber >= 604}
              className="rounded-xl font-bold border flex items-center justify-center gap-0.5 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                padding: '0 10px',
                height: '42px',
                fontSize: '0.76rem',
                flexShrink: 0,
              }}
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--accent-text)]" />
            </button>
          </div>
        </div>

        {/* QUICK PAGE SCRUBBER / JUMP MODAL */}
        {showPageSlider && (
          <div
            className="fixed inset-0 z-[9996] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowPageSlider(false)}
          >
            <div
              className="w-full max-w-sm p-5 rounded-3xl border shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 var(--card-sheen)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Jump to Mushaf Page
                </span>
                <button
                  type="button"
                  onClick={() => setShowPageSlider(false)}
                  className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center py-2">
                <span className="text-3xl font-bold font-mono text-[var(--accent-text)]">
                  Page {tempPageInput}
                </span>
                <span className="block text-xs text-[var(--text-secondary)] mt-1">
                  Juz {Math.max(1, Math.min(30, Math.ceil(tempPageInput / 20)))} • 604 Pages Total
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min="1"
                max="604"
                value={tempPageInput}
                onChange={(e) => setTempPageInput(parseInt(e.target.value, 10))}
                className="w-full h-2 rounded-lg cursor-pointer"
                style={{ accentColor: 'var(--accent)' }}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPageSlider(false)}
                  className="py-2.5 rounded-xl text-xs font-bold border bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    goToMushafPage(tempPageInput, { source: 'user' });
                    setShowPageSlider(false);
                  }}
                  className="py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-98"
                  style={{
                    background: 'var(--accent)',
                    borderColor: 'var(--accent)',
                    color: 'var(--on-accent)',
                  }}
                >
                  Go to Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Ayah Study, Multi-Tafsir & Hifz Sheet (Portaled to document.body) */}
        <AyahStudySheet
          isOpen={showStudySheet}
          onClose={() => setShowStudySheet(false)}
          surahNumber={studySurah}
          initialAyah={studyInitialAyah}
          currentPage={mushafPageNumber}
        />

        {/* Quran Features Onboarding & Quick-Start Guide */}
        <QuranGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />
      </div>
    </PageTransition>
  );
}
