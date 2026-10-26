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
} from 'lucide-react';
import { quranService } from '@/lib/quran-service';
import {
  InteractiveMushafPage,
  type InteractiveMushafSurface,
} from '@/components/Quran/InteractiveMushafPage';
import {
  getPageForSurahAndAyah,
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
  const lastAudioKeyRef = useRef<string | null>(null);

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

  // LIVE AUDIO AUTO-PAGE SYNC: Turn page ONLY when recitation transitions from one ayah to the next
  useEffect(() => {
    if (isPlaying && currentSurah > 0 && currentAyah > 0) {
      const currentKey = `${currentSurah}:${currentAyah}`;
      if (lastAudioKeyRef.current !== null && lastAudioKeyRef.current !== currentKey) {
        const audioPage = getPageForSurahAndAyah(currentSurah, currentAyah);
        if (audioPage !== mushafPageNumber) {
          setMushafPageNumber(audioPage);
          const targetSurah = mushafService.getSurahForPage(audioPage) || currentSurah;
          if (targetSurah !== surahNum) {
            setSurahNum(targetSurah);
            navigate(`/quran/surah-${targetSurah}?page=${audioPage}`, { replace: true });
          }
        }
      }
      lastAudioKeyRef.current = currentKey;
    } else {
      lastAudioKeyRef.current = null;
    }
  }, [isPlaying, currentSurah, currentAyah, mushafPageNumber, surahNum]);

  const loadBookmark = async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      const bookmarks = value ? JSON.parse(value) : [];
      setIsBookmarked(bookmarks.includes(surahNum));
    } catch {
      try {
        const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        setIsBookmarked(bookmarks.includes(surahNum));
      } catch {
        setIsBookmarked(false);
      }
    }
  };

  const toggleBookmark = async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      let bookmarks = value ? JSON.parse(value) : [];

      if (bookmarks.includes(surahNum)) {
        bookmarks = bookmarks.filter((b: number) => b !== surahNum);
      } else {
        bookmarks.push(surahNum);
      }

      await Preferences.set({ key: BOOKMARKS_KEY, value: JSON.stringify(bookmarks) });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      setIsBookmarked(bookmarks.includes(surahNum));
      window.dispatchEvent(new CustomEvent('noorconnect:quran-bookmarks-changed', { detail: bookmarks }));
    } catch {
      try {
        let bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        if (bookmarks.includes(surahNum)) {
          bookmarks = bookmarks.filter((b: number) => b !== surahNum);
        } else {
          bookmarks.push(surahNum);
        }
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
        setIsBookmarked(bookmarks.includes(surahNum));
        window.dispatchEvent(new CustomEvent('noorconnect:quran-bookmarks-changed', { detail: bookmarks }));
      } catch {
        setIsBookmarked(!isBookmarked);
      }
    }
  };

  const goToPage = (targetPage: number) => {
    if (targetPage < 1 || targetPage > 604) return;
    setMushafPageNumber(targetPage);

    // Identify which Surah this target page belongs to
    const targetSurah = mushafService.getSurahForPage(targetPage) || 1;
    if (targetSurah !== surahNum) {
      setSurahNum(targetSurah);
      navigate(`/quran/surah-${targetSurah}`, { replace: true });
    }

    // Auto-moving bookmarks update
    updateAutoMovingBookmarks(
      targetSurah,
      quranService.getSurahInfo(targetSurah)?.englishName || `Surah ${targetSurah}`,
      1,
      targetPage,
      quranService.getSurahInfo(targetSurah)?.name
    );
  };

  const handlePrevPage = () => {
    if (mushafPageNumber > 1) {
      goToPage(mushafPageNumber - 1);
    }
  };

  const handleNextPage = () => {
    if (mushafPageNumber < 604) {
      goToPage(mushafPageNumber + 1);
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

  return (
    <PageTransition>
      <div
        className="min-h-screen relative overflow-hidden bg-[var(--bg-base)]"
        style={{ paddingBottom: 'calc(96px + var(--tilawah-dock-space, 0px))' }}
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

            {/* Right: Study & Hifz + Star Bookmark */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenStudySheet(surahOnPage, 1)}
                title="Study & Hifz Memorization"
                className="rounded-lg font-bold border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent-text)] hover:border-[var(--accent)] transition-colors select-none flex items-center gap-1 shadow-sm"
                style={{ padding: '5px 8px', fontSize: '0.72rem' }}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Study</span>
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

          {/* Sub-header Bar: Tajweed Colors Toggle & Guidance */}
          <div className="border-t border-[var(--border)]/40 bg-[var(--surface)] px-3 py-1 flex items-center justify-between text-xs max-w-md mx-auto">
            <button
              type="button"
              onClick={toggleTajweed}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                showTajweed
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] opacity-70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>🎨 Tajweed</span>
            </button>
            <div className="text-[11px] font-semibold text-[var(--text-secondary)] flex items-center gap-1">
              <Info className="w-3 h-3 text-[var(--accent)]" />
              <span>Tap words to study</span>
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
            onPageTurnRequest={goToPage}
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
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
            {/* ‹ Prev Page */}
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={mushafPageNumber <= 1}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ChevronLeft className="w-4 h-4 text-[var(--accent-text)]" />
              <span>Prev</span>
            </button>

            {/* Center: Interactive Page Slider Launcher */}
            <button
              type="button"
              onClick={() => {
                setTempPageInput(mushafPageNumber);
                setShowPageSlider(true);
              }}
              className="flex-1 py-1 px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all hover:border-[var(--accent)] active:scale-98"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                minWidth: 0,
              }}
            >
              <Sliders className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <div className="text-center min-w-0" style={{ whiteSpace: 'nowrap' }}>
                <div
                  style={{
                    fontSize: '0.78rem',
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
                    fontSize: '0.66rem',
                    color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}
                >
                  Juz {currentJuz} • Jump ▴
                </div>
              </div>
            </button>

            {/* Tilawah Play / Pause for this Surah */}
            <button
              type="button"
              onClick={() => {
                if (isPlaying) {
                  togglePlay();
                } else {
                  playAyah(surahNum, 1);
                }
              }}
              className="p-2.5 rounded-xl border flex items-center justify-center transition-all active:scale-95 shadow-sm"
              style={{
                background: isPlaying ? 'var(--accent)' : 'var(--surface-2)',
                borderColor: 'var(--accent)',
                color: isPlaying ? 'var(--on-accent)' : 'var(--accent)',
              }}
              title={isPlaying ? 'Pause Tilawah' : 'Play Tilawah'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Next Page › */}
            <button
              type="button"
              onClick={handleNextPage}
              disabled={mushafPageNumber >= 604}
              className="px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4 text-[var(--accent-text)]" />
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
                    goToPage(tempPageInput);
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
      </div>
    </PageTransition>
  );
}
