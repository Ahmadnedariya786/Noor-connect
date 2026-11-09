import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Star,
  BookOpen,
  Play,
  Pause,
  Sliders,
  X,
  HelpCircle,
  Copy,
  Share2,
  Sparkles,
  ScrollText,
  Moon,
  Image as ImageIcon,
  LayoutGrid,
} from 'lucide-react';
import { toast } from 'sonner';
import { PlaybackOptionsDrawer } from '@/components/Quran/PlaybackOptionsDrawer';
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
  getMushafLineFormat,
  setMushafLineFormat,
  type MushafLineFormat,
  type InteractivePageData,
} from '@/lib/interactive-mushaf';
import { SURAH_START_PAGES, mushafService } from '@/lib/mushaf-service';
import { PageTransition } from '@/components/PageTransition';
import { Preferences } from '@capacitor/preferences';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { getQuranUIStrings } from '@/lib/quran-guide-i18n';
import { useTilawah } from '@/contexts/TilawahContext';
import { quranFeaturesService } from '@/lib/quran-features';
import { AyahStudySheet } from '@/components/Quran/AyahStudySheet';
import { updateAutoMovingBookmarks } from '@/lib/quran-bookmarks';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const LS_LAST_SURAH = 'quran-reader-last-surah';
const LS_LAST_PAGE = 'quran-reader-last-page';
const BOOKMARKS_KEY = 'quran-bookmarks';

export default function QuranReader() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';
  const { language } = useLanguage();
  const uiStrings = useMemo(() => getQuranUIStrings(language), [language]);

  const { surahName, id } = useParams<{ surahName?: string; id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Tilawah global player
  const { isPlaying, currentSurah, currentAyah, playAyah, togglePlay } = useTilawah();
  const [currentPageData, setCurrentPageData] = useState<InteractivePageData | null>(null);
  const pageDataRef = useRef<InteractivePageData | null>(null);
  const lastObservedVerseRef = useRef<string | null>(null);

  const routeSurahId = useMemo(() => {
    const raw = id ?? surahName ?? '1';
    return Math.min(114, Math.max(1, parseInt(String(raw).replace(/\D+/g, ''), 10) || 1));
  }, [id, surahName]);

  const [surahNum, setSurahNum] = useState<number>(routeSurahId);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Auto-follow: default true unless playing a DIFFERENT surah in background
  const [autoFollow, setAutoFollow] = useState<boolean>(() => {
    if (!isPlaying) return true;
    return currentSurah === routeSurahId;
  });

  // Global Madinah Mushaf Page (1..604)
  // Priority: 1. Valid ?page= query param; 2. Canonical SURAH_START_PAGES for routeSurahId
  // NEVER let stale LS_LAST_PAGE hijack direct Surah navigation!
  const [mushafPageNumber, setMushafPageNumber] = useState<number>(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const p = parseInt(pageParam, 10);
      if (!isNaN(p) && p >= 1 && p <= 604) return p;
    }
    return SURAH_START_PAGES[routeSurahId] || 1;
  });

  // Ayah Study & Hifz Sheet state
  const [showStudySheet, setShowStudySheet] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [studyInitialAyah, setStudyInitialAyah] = useState(1);
  const [studySurah, setStudySurah] = useState(routeSurahId);

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
  const [showAudioDrawer, setShowAudioDrawer] = useState(false);
  const [readerViewMode, setReaderViewMode] = useState<'mushaf' | 'card'>('mushaf');
  const [cardArabicFontSize, setCardArabicFontSize] = useState<number>(28);
  const [cardTranslations, setCardTranslations] = useState<Record<number, string>>({});
  const [isCardTranslationLoading, setIsCardTranslationLoading] = useState(false);

  useEffect(() => {
    if (readerViewMode !== 'card') return;
    let cancelled = false;

    const loadCardTranslations = async () => {
      setIsCardTranslationLoading(true);
      const targetLang = language === 'ur' ? 'ur.jalandhry' : language === 'hi' ? 'hi.hindi' : 'en.sahih';
      const cacheKey = `noor_card_page_${mushafPageNumber}_${targetLang}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object' && !cancelled) {
            setCardTranslations(parsed);
            setIsCardTranslationLoading(false);
          }
          return;
        }
      } catch {
        // Safe catch
      }

      try {
        const res = await fetch(`https://api.alquran.cloud/v1/page/${mushafPageNumber}/${targetLang}`, {
          signal: AbortSignal.timeout(4500),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.ayahs && Array.isArray(json.data.ayahs)) {
            const map: Record<number, string> = {};
            json.data.ayahs.forEach((a: { numberInSurah: number; text: string }) => {
              map[a.numberInSurah] = a.text;
            });
            if (!cancelled) {
              setCardTranslations(map);
              try {
                localStorage.setItem(cacheKey, JSON.stringify(map));
              } catch {
                // Safe catch
              }
            }
          }
        }
      } catch (e) {
        console.warn('Card translations load failed', e);
      } finally {
        if (!cancelled) setIsCardTranslationLoading(false);
      }
    };

    loadCardTranslations();
    return () => {
      cancelled = true;
    };
  }, [readerViewMode, mushafPageNumber, language]);
  const [tempPageInput, setTempPageInput] = useState(mushafPageNumber);
  useBodyScrollLock(showPageSlider);

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

  // 3-Type Quran Line Format: 7L | 13L | 15L
  const [lineFormat, setLineFormatState] = useState<MushafLineFormat>(() => getMushafLineFormat());
  const [subPage7L, setSubPage7L] = useState<number>(1);
  const [totalParts7L, setTotalParts7L] = useState<number>(1);

  const handleFormatChange = (fmt: MushafLineFormat) => {
    setLineFormatState(fmt);
    setMushafLineFormat(fmt);
    setSubPage7L(1);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ format?: MushafLineFormat }>;
      if (custom?.detail?.format) {
        setLineFormatState(custom.detail.format);
        setSubPage7L(1);
      }
    };
    window.addEventListener('noor-mushaf-format-changed', handler);
    return () => window.removeEventListener('noor-mushaf-format-changed', handler);
  }, []);

  const loadBookmark = useCallback(async () => {
    try {
      const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
      const bookmarks = value ? JSON.parse(value) : [];
      setIsBookmarked(Array.isArray(bookmarks) && bookmarks.includes(surahNum));
    } catch {
      try {
        const bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
        setIsBookmarked(Array.isArray(bookmarks) && bookmarks.includes(surahNum));
      } catch {
        setIsBookmarked(false);
      }
    }
  }, [surahNum]);

  // Sync with route param and query searchParams (?page=)
  useEffect(() => {
    const pageParam = searchParams.get('page');
    let targetPage = SURAH_START_PAGES[routeSurahId] || 1;
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage >= 1 && parsedPage <= 604) {
        targetPage = parsedPage;
      }
    }

    if (targetPage !== mushafPageNumber) {
      setMushafPageNumber(targetPage);
    }
    if (routeSurahId !== surahNum) {
      setSurahNum(routeSurahId);
    }

    // If navigated to a DIFFERENT surah while audio is playing in background,
    // turn off autoFollow so the reader is not yanked back to the playing surah!
    if (isPlaying && currentSurah > 0 && currentSurah !== routeSurahId) {
      setAutoFollow(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeSurahId, searchParams]);

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
  }, [surahNum, surahOnPage, currentSurahInfo, mushafPageNumber, loadBookmark]);

  const goToMushafPage = useCallback((
    targetPage: number,
    options?: { source?: 'user' | 'audio'; targetSubPage?: number }
  ) => {
    if (targetPage < 1 || targetPage > 604) return;
    const isUserAction = options?.source === 'user';

    if (isUserAction && isPlaying) {
      // User manually browsed/peeked at another page while recitation is playing
      setAutoFollow(false);
    }

    if (typeof options?.targetSubPage === 'number') {
      setSubPage7L(options.targetSubPage);
    }

    setMushafPageNumber(targetPage);

    // Identify which Surah this target page belongs to
    const targetSurah = mushafService.getSurahForPage(targetPage) || 1;
    setSurahNum(targetSurah);

    // Synchronize URL in lockstep with replace: true only if changed
    const currentParam = searchParams.get('page');
    if (currentParam !== String(targetPage) || routeSurahId !== targetSurah) {
      navigate(`/quran/${targetSurah}?page=${targetPage}`, { replace: true });
    }

    // Auto-moving bookmarks update
    updateAutoMovingBookmarks(
      targetSurah,
      quranService.getSurahInfo(targetSurah)?.englishName || `Surah ${targetSurah}`,
      1,
      targetPage,
      quranService.getSurahInfo(targetSurah)?.name
    );
  }, [isPlaying, navigate, routeSurahId, searchParams]);

  const handleSubPage7LChange = useCallback((sp: number, tp: number) => {
    setSubPage7L((prevSp) => (prevSp === sp ? prevSp : sp));
    setTotalParts7L((prevTp) => (prevTp === tp ? prevTp : tp));
  }, []);

  const handlePageLoaded = useCallback((data: InteractivePageData) => {
    pageDataRef.current = data;
    setCurrentPageData((prev) => (prev?.page_number === data.page_number ? prev : data));
  }, []);

  const handlePageTurnRequest = useCallback((p: number) => {
    goToMushafPage(p, { source: 'user' });
  }, [goToMushafPage]);

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
  }, [isPlaying, currentSurah, currentAyah, autoFollow, mushafPageNumber, currentPageData, goToMushafPage]);

  const toggleBookmark = async () => {
    try {
      let bookmarks: number[] = [];
      try {
        const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
        bookmarks = value ? JSON.parse(value) : [];
      } catch {
        bookmarks = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
      }
      if (!Array.isArray(bookmarks)) bookmarks = [];

      if (bookmarks.includes(surahNum)) {
        bookmarks = bookmarks.filter((b: number) => b !== surahNum);
      } else {
        bookmarks.push(surahNum);
      }

      await Preferences.set({ key: BOOKMARKS_KEY, value: JSON.stringify(bookmarks) });
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      setIsBookmarked(bookmarks.includes(surahNum));
      window.dispatchEvent(
        new CustomEvent('noorconnect:quran-bookmarks-changed', { detail: bookmarks })
      );
    } catch (err) {
      console.warn('Failed to toggle bookmark:', err);
    }
  };

  const handleFooterPlayToggle = () => {
    const loadedVerses = currentPageData?.verses || pageDataRef.current?.verses || [];

    const getOptimalStartVerse = (): { surah: number; ayah: number } => {
      // Priority 1: If routeSurahId has Ayah 1 on this page, start directly at routeSurahId:1
      const hasRouteAyah1 = loadedVerses.some(
        (v) => v.surah_number === routeSurahId && v.verse_number === 1
      );
      if (hasRouteAyah1) {
        return { surah: routeSurahId, ayah: 1 };
      }

      // Priority 2: First verse of routeSurahId on this page
      const firstMatching = loadedVerses.find((v) => v.surah_number === routeSurahId);
      if (firstMatching) {
        return { surah: firstMatching.surah_number, ayah: firstMatching.verse_number };
      }

      // Priority 3: First verse on the page
      const firstVerse = loadedVerses[0];
      return {
        surah: firstVerse?.surah_number || surahOnPage,
        ayah: firstVerse?.verse_number || 1,
      };
    };

    if (isPlaying) {
      // If playing on the current page, toggle pause
      const isPlayingOnThisPage = loadedVerses.some(
        (v) => v.surah_number === currentSurah && v.verse_number === currentAyah
      );

      if (isPlayingOnThisPage) {
        togglePlay();
      } else {
        // Playing on a different page: switch to optimal start verse of this viewed page and keep autoFollow on
        const target = getOptimalStartVerse();
        setAutoFollow(true);
        playAyah(target.surah, target.ayah);
      }
    } else {
      // Stopped or paused: play optimal start verse on this viewed page with autoFollow enabled
      const target = getOptimalStartVerse();
      setAutoFollow(true);
      playAyah(target.surah, target.ayah);
    }
  };

  const handlePrevPage = () => {
    if (readerViewMode !== 'card' && lineFormat === 7 && subPage7L > 1) {
      setSubPage7L((prev) => prev - 1);
      if (typeof window !== 'undefined' && window.scrollY > 80) {
        window.scrollTo(0, 0);
      }
      return;
    }
    if (mushafPageNumber > 1) {
      const targetSub = lineFormat === 7 ? -1 : 1;
      setSubPage7L(targetSub);
      goToMushafPage(mushafPageNumber - 1, { source: 'user', targetSubPage: targetSub });
      if (typeof window !== 'undefined' && window.scrollY > 80) {
        window.scrollTo(0, 0);
      }
    }
  };

  const handleNextPage = () => {
    if (readerViewMode !== 'card' && lineFormat === 7 && subPage7L > 0 && subPage7L < totalParts7L) {
      setSubPage7L((prev) => prev + 1);
      if (typeof window !== 'undefined' && window.scrollY > 80) {
        window.scrollTo(0, 0);
      }
      return;
    }
    if (mushafPageNumber < 604) {
      setSubPage7L(1);
      goToMushafPage(mushafPageNumber + 1, { source: 'user', targetSubPage: 1 });
      if (typeof window !== 'undefined' && window.scrollY > 80) {
        window.scrollTo(0, 0);
      }
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
  const safeSubPage7L = subPage7L <= 0 ? totalParts7L : Math.min(subPage7L, totalParts7L);

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
        <div
          className="sticky top-0 z-30 backdrop-blur-md border-b safe-top bg-[var(--surface)]/95 border-[var(--border)] shadow-sm"
          style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}
        >
          <div
            className="max-w-2xl mx-auto"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              padding: '8px 10px',
            }}
          >
            {/* Left: Sleek 36x36 circular Back button freeing +46px for center title */}
            <button
              type="button"
              onClick={() => navigate('/quran', { replace: true })}
              title={uiStrings.quranBack || 'Back to Quran'}
              aria-label={uiStrings.quranBack || 'Back to Quran'}
              className="rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-[var(--accent-text)] hover:border-[var(--accent)] transition-all shrink-0 select-none shadow-sm active:scale-95 flex items-center justify-center"
              style={{ width: '36px', height: '36px' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            {/* Center: Surah Name + Page & Juz (Zero truncation guarantee) */}
            <div
              className="cursor-pointer select-none text-center"
              style={{ flex: 1, minWidth: 0, overflow: 'hidden', padding: '0 4px' }}
              onClick={() => navigate('/quran', { replace: true })}
              title="Return to Quran index"
            >
              <div className="truncate font-bold text-[0.84rem] leading-tight text-[var(--text-primary)]">
                {currentSurahInfo?.englishName || `Surah ${surahOnPage}`}
              </div>
              <div className="truncate text-[0.68rem] leading-tight text-[var(--text-secondary)]">
                Page {mushafPageNumber} • Juz {currentJuz}
              </div>
            </div>

            {/* Right: Guide, Study & Hifz, Tilawah Audio + Star Bookmark */}
            <div
              className="shrink-0"
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              {/* Guide Button: 36x36 circular button */}
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                title="Quran Features Guide"
                aria-label="Quran Guide"
                className="hover:border-[var(--accent)] transition-all shadow-sm active:scale-95 select-none"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-text)',
                }}
              >
                <HelpCircle style={{ width: '17px', height: '17px' }} />
              </button>

              {/* Study Button: 36x36 circular button matching Guide, Sliders & Star */}
              <button
                type="button"
                onClick={() => handleOpenStudySheet(surahOnPage, 1)}
                title={uiStrings.studyBtn || 'Study & Hifz Memorization'}
                aria-label={uiStrings.studyBtn || 'Study & Hifz Memorization'}
                className="hover:border-[var(--accent)] transition-all shadow-sm active:scale-95 select-none"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                <BookOpen style={{ width: '17px', height: '17px' }} />
              </button>

              {/* Audio Drawer & Tilawah Options Button */}
              <button
                type="button"
                onClick={() => setShowAudioDrawer(true)}
                title="Tilawah Audio Player & Repeat Controls"
                aria-label="Audio Controls"
                className="hover:border-[var(--accent)] transition-all shadow-sm active:scale-95 select-none"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-text)',
                }}
              >
                <Sliders style={{ width: '16px', height: '16px' }} />
              </button>

              {/* Star Bookmark Button: 36x36 circle matching Guide button */}
              <button
                type="button"
                onClick={() => {
                  toggleBookmark();
                  handleOpenStudySheet(surahOnPage, 1);
                }}
                title={isBookmarked ? 'Remove Star / Manage Bookmarks' : 'Bookmark Surah & Ayah'}
                aria-label={isBookmarked ? 'Bookmarked' : 'Add bookmark'}
                className="transition-all select-none shadow-sm active:scale-95"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isBookmarked ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${isBookmarked ? 'var(--accent)' : 'var(--border)'}`,
                  color: isBookmarked ? 'var(--accent-text)' : 'var(--text-secondary)',
                }}
              >
                <Star
                  className={`w-4 h-4 ${
                    isBookmarked ? 'fill-[var(--accent)] text-[var(--accent)]' : ''
                  }`}
                />
              </button>
            </div>
          </div>

          {/* View Mode Bar & Surface Controls */}
          <div className="border-t border-[var(--border)]/60 bg-[var(--surface)] px-3 py-1.5">
            <div className="flex items-center justify-between max-w-md mx-auto gap-2">
              {/* View Switcher: Mushaf vs Cards */}
              <div className="flex items-center rounded-xl p-0.5 border border-[var(--border)] bg-[var(--surface-2)] shrink-0">
                <button
                  type="button"
                  onClick={() => setReaderViewMode('mushaf')}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    readerViewMode === 'mushaf'
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Mushaf</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReaderViewMode('card')}
                  className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold transition-all ${
                    readerViewMode === 'card'
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {readerViewMode === 'mushaf' ? (
                /* 4 Surface modes */
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                  {[
                    { mode: 'jewel' as const, icon: Sparkles, label: uiStrings.jewel },
                    { mode: 'parchment' as const, icon: ScrollText, label: uiStrings.paper },
                    { mode: 'night' as const, icon: Moon, label: uiStrings.night },
                    { mode: 'classic' as const, icon: ImageIcon, label: uiStrings.scan },
                  ].map((item) => {
                    const IconComp = item.icon;
                    const isActive = surfaceMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => handleSurfaceChange(item.mode)}
                        className={`flex items-center justify-center gap-1.5 py-1 px-2 rounded-xl text-xs font-bold transition-all select-none ${
                          isActive
                            ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                        }`}
                        title={item.label}
                      >
                        <IconComp className="w-3.5 h-3.5 shrink-0" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Card Font Size Stepper */
                <div
                  className="flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] shrink-0"
                  style={{ padding: '3px 7px', fontSize: '0.70rem', gap: '4px' }}
                >
                  <button
                    type="button"
                    onClick={() => setCardArabicFontSize((s) => Math.max(20, s - 2))}
                    className="px-1 font-bold hover:text-[var(--accent-text)] text-[var(--text-primary)] active:scale-95 transition-transform"
                    title="Smaller Arabic font"
                  >
                    A-
                  </button>
                  <span className="font-mono font-bold text-[var(--accent-text)] border-x border-[var(--border)] px-1.5 leading-none">
                    {cardArabicFontSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => setCardArabicFontSize((s) => Math.min(44, s + 2))}
                    className="px-1 font-bold hover:text-[var(--accent-text)] text-[var(--text-primary)] active:scale-95 transition-transform"
                    title="Larger Arabic font"
                  >
                    A+
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sub-header Bar: Tajweed Colors Toggle, 7L/13L/15L Line Format, Auto-Page / Sync Audio Pill, & Guidance */}
          <div className="border-t border-[var(--border)]/40 bg-[var(--surface)] px-3 py-1 flex items-center justify-between text-xs max-w-md mx-auto gap-2">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleTajweed}
                className={`flex items-center gap-1 rounded-full font-bold border transition-all shrink-0 ${
                  showTajweed
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                    : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] opacity-70'
                }`}
                style={{ fontSize: '0.72rem', padding: '3px 7px' }}
              >
                <span>🎨 {uiStrings.tajweed}</span>
              </button>

              {/* 3-Pill Switcher: [ 7L | 13L | 15L ] */}
              <div
                className="flex items-center rounded-full p-0.5 border border-[var(--border)] bg-[var(--surface-2)] shrink-0"
                style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))' }}
              >
                {([7, 13, 15] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => handleFormatChange(fmt)}
                    title={
                      fmt === 7
                        ? '7-Line Large Print'
                        : fmt === 13
                        ? '13-Line Indo-Pak Classic'
                        : '15-Line Madinah Standard'
                    }
                    className={`rounded-full font-bold transition-all ${
                      lineFormat === fmt
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-xs scale-105'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{ fontSize: '0.70rem', padding: '2px 6px' }}
                  >
                    {fmt}L
                  </button>
                ))}
              </div>
            </div>

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

            {/* Static hint: concise 👆 Word • ﴿١﴾ Study to never clip on 360px screens */}
            {!isPlaying && (
              <div
                style={{
                  fontSize: '0.68rem',
                  whiteSpace: 'nowrap',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  flexShrink: 0,
                  textAlign: 'right',
                }}
              >
                <span>
                  👆 Word •{' '}
                  <span dir="rtl" className="inline-block font-arabic text-[var(--accent-text)] mx-0.5">
                    ﴿١﴾
                  </span>{' '}
                  Study
                </span>
              </div>
            )}
          </div>
        </div>

        {/* INTERACTIVE MUSHAF PAGE CANVAS OR AYAH CARDS VIEW */}
        <div className="max-w-2xl mx-auto px-1.5 sm:px-4 py-4">
          {readerViewMode === 'mushaf' ? (
            <InteractiveMushafPage
              pageNumber={mushafPageNumber}
              surahNumber={surahNum}
              targetSurahNumber={routeSurahId}
              surfaceMode={surfaceMode}
              showTajweed={showTajweed}
              lineFormat={lineFormat}
              subPage7L={subPage7L}
              onSubPage7LChange={handleSubPage7LChange}
              onStep7Line={(direction) => (direction === 'prev' ? handlePrevPage() : handleNextPage())}
              onOpenStudySheet={handleOpenStudySheet}
              onPageTurnRequest={handlePageTurnRequest}
              onPageLoaded={handlePageLoaded}
            />
          ) : (
            <div className="space-y-3 pb-24">
              {currentPageData && currentPageData.verses.length > 0 ? (
                currentPageData.verses.map((v) => {
                  const isThisPlaying = isPlaying && currentSurah === v.surah_number && currentAyah === v.verse_number;
                  const transText = cardTranslations[v.verse_number];
                  const isUrdu = language === 'ur';

                  return (
                    <div
                      key={v.verse_key}
                      id={`card-ayah-${v.verse_key}`}
                      className="p-4 rounded-2xl border transition-all duration-200 space-y-3"
                      style={{
                        background: 'var(--surface)',
                        borderColor: isThisPlaying ? 'var(--accent)' : 'var(--border)',
                        boxShadow: isThisPlaying
                          ? '0 0 18px var(--accent-glow), inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))'
                          : 'inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))',
                      }}
                    >
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)]/40 pb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-7 h-7 rounded-full border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center font-bold text-xs text-[var(--accent-text)] font-mono shrink-0"
                            style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))' }}
                          >
                            {v.verse_number}
                          </span>
                          <span className="font-bold text-xs text-[var(--text-primary)] truncate">
                            {currentSurahInfo?.englishName || `Surah ${v.surah_number}`} • {v.verse_key}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Play / Pause Ayah */}
                          <button
                            type="button"
                            onClick={() => {
                              if (isThisPlaying) {
                                togglePlay();
                              } else {
                                playAyah(v.surah_number, v.verse_number);
                              }
                            }}
                            className="p-1.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-2)] text-[var(--accent-text)] transition-all active:scale-95"
                            title={isThisPlaying ? 'Pause Audio' : 'Play this Ayah'}
                          >
                            {isThisPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>

                          {/* Study & Tafsir */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudySheet(v.surah_number, v.verse_number)}
                            className="p-1.5 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] bg-[var(--surface-2)] text-[var(--accent-text)] transition-all active:scale-95"
                            title="Study & Tafsir for this Ayah"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>

                          {/* Copy Ayah */}
                          <button
                            type="button"
                            onClick={() => {
                              const textToCopy = `${v.text_uthmani}\n\n${transText || ''}\n(Quran ${v.verse_key})`;
                              navigator.clipboard.writeText(textToCopy);
                              toast.success(`Ayah ${v.verse_key} copied`);
                            }}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                            title="Copy Arabic & Translation"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Share Ayah */}
                          <button
                            type="button"
                            onClick={async () => {
                              const shareText = `"${v.text_uthmani}"\n\n${transText || ''}\n— Surah ${currentSurahInfo?.englishName || v.surah_number} (${v.verse_key})\nShared via Noor Connect`;
                              if (navigator.share) {
                                try {
                                  await navigator.share({ title: `Ayah ${v.verse_key}`, text: shareText });
                                } catch {
                                  // Handled dismiss
                                }
                              } else {
                                navigator.clipboard.writeText(shareText);
                                toast.success('Ayah copied for sharing');
                              }
                            }}
                            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                            title="Share Ayah"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Arabic Text with Ornate Medallion */}
                      <div
                        dir="rtl"
                        className="font-arabic text-right leading-[2.2] select-text text-[var(--accent-text)]"
                        style={{ fontSize: `${cardArabicFontSize}px` }}
                      >
                        {v.text_uthmani}{' '}
                        <span className="inline-block text-[var(--accent)] mx-1 select-none font-bold">
                          ﴿{v.verse_number}﴾
                        </span>
                      </div>

                      {/* Translation */}
                      <div
                        dir={isUrdu ? 'rtl' : 'ltr'}
                        className={`text-xs text-[var(--text-primary)] leading-relaxed select-text pt-1.5 border-t border-[var(--border)]/30 ${
                          isUrdu ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)] text-sm leading-[2.1]" : ''
                        }`}
                      >
                        {transText ? (
                          transText
                        ) : isCardTranslationLoading ? (
                          <span className="text-[var(--text-secondary)] italic">Loading translation...</span>
                        ) : (
                          <span className="text-[var(--text-secondary)] italic">
                            {v.words.map((w) => w.translation?.text).filter(Boolean).join(' ') || 'Translation unavailable offline'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-4">
                  <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">
                    Loading Page {mushafPageNumber} Cards...
                  </p>
                </div>
              )}
            </div>
          )}
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
              disabled={readerViewMode !== 'card' && lineFormat === 7 ? (mushafPageNumber <= 1 && safeSubPage7L <= 1) : mushafPageNumber <= 1}
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
              <span>{uiStrings.prev}</span>
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
                {readerViewMode !== 'card' && lineFormat === 7 && totalParts7L > 1
                  ? `P.${mushafPageNumber} (Part ${safeSubPage7L}/${totalParts7L})`
                  : `${uiStrings.page} ${mushafPageNumber} / 604`}
              </div>
              <div
                style={{
                  fontSize: '0.63rem',
                  color: 'var(--text-secondary)',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {uiStrings.juz} {currentJuz} • {uiStrings.jump} ▴
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
              disabled={readerViewMode !== 'card' && lineFormat === 7 ? (mushafPageNumber >= 604 && safeSubPage7L >= totalParts7L) : mushafPageNumber >= 604}
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
              <span>{uiStrings.next}</span>
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
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
          >
            <div
              className="w-full max-w-sm p-5 rounded-3xl border shadow-2xl space-y-4 animate-in slide-in-from-bottom duration-200 sheet-scroll-contain"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                boxShadow: '0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))',
                overscrollBehavior: 'contain',
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

        {/* Tilawah Audio Player & Paced Repeat Options Drawer */}
        <PlaybackOptionsDrawer
          isOpen={showAudioDrawer}
          onClose={() => setShowAudioDrawer(false)}
          activeSurahId={
            isPlaying && currentPageData?.verses.some((v) => v.surah_number === currentSurah)
              ? currentSurah
              : routeSurahId || surahNum
          }
          activeAyahNumber={isPlaying && currentAyah > 0 ? currentAyah : 1}
        />

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
