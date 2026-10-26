/**
 * Noor Connect — Interactive Ayah Study, Multi-Tafsir & Hifz Memorization Sheet
 *
 * Full-featured bottom sheet for /quran/:id featuring:
 * 1. Vocalized Arabic with line-height 2.25, font scaling, audio play/repeat
 * 2. 5-Colour Smart Bookmarks with "Moves as you read" auto-advancing
 * 3. Tab 1: Translation (Sahih, Pickthall, Urdu, Hindi)
 * 4. Tab 2: Authentic Tafsir (Ibn Kathir, Ma'arif al-Qur'an, Al-Muyassar, Urdu)
 * 5. Tab 3: Hifz Memorization Engine (Ayah repeats, range loops, learner pause factor, blur memory test)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTilawah } from '@/contexts/TilawahContext';
import {
  BOOKMARK_COLORS,
  getColorBookmarks,
  toggleColorBookmark,
  setBookmarkAutoMove,
  ColorBookmark,
  BookmarkColorId,
  COLOR_BOOKMARKS_CHANGED_EVENT,
} from '@/lib/quran-bookmarks';
import { quranService } from '@/lib/quran-service';
import { useToast } from '@/hooks/use-toast';
import {
  X,
  Play,
  Repeat,
  Share2,
  Bookmark,
  Eye,
  EyeOff,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AyahStudySheetProps {
  isOpen: boolean;
  onClose: () => void;
  surahNumber: number;
  initialAyah?: number;
  currentPage?: number;
}

type StudyTab = 'translation' | 'tafsir' | 'hifz';

interface TranslationEdition {
  id: string;
  name: string;
  lang: string;
}

const TRANSLATION_EDITIONS: TranslationEdition[] = [
  { id: 'en.sahih', name: 'Sahih International', lang: 'English' },
  { id: 'en.pickthall', name: 'Pickthall', lang: 'English' },
  { id: 'ur.jalandhry', name: 'Fateh Muhammad Jalandhry', lang: 'Urdu' },
  { id: 'hi.hindi', name: 'Suhel Farooq Khan & Shafi', lang: 'Hindi' },
];

interface TafsirEdition {
  slug: string;
  name: string;
  author: string;
  lang: string;
}

const TAFSIR_EDITIONS: TafsirEdition[] = [
  {
    slug: 'en-tafisr-ibn-kathir',
    name: 'Tafsir Ibn Kathir',
    author: 'Ibn Kathir (English)',
    lang: 'English',
  },
  {
    slug: 'en-tafsir-maarif-ul-quran',
    name: "Ma'arif al-Qur'an",
    author: 'Mufti Muhammad Shafi (English)',
    lang: 'English',
  },
  {
    slug: 'ar-tafsir-muyassar',
    name: 'Al-Tafsir Al-Muyassar',
    author: 'King Fahd Complex (Arabic)',
    lang: 'Arabic',
  },
  {
    slug: 'ur-tafsir-ibn-kathir',
    name: 'Tafsir Ibn Kathir',
    author: 'Ibn Kathir (Urdu)',
    lang: 'Urdu',
  },
];

const TAFSIR_CACHE_KEY = 'noor_tafsir_cache_lru';

export const AyahStudySheet: React.FC<AyahStudySheetProps> = ({
  isOpen,
  onClose,
  surahNumber,
  initialAyah = 1,
  currentPage = 1,
}) => {
  const { toast } = useToast();
  const { playAyah, startHifzLoop, stopHifzLoop, hifzConfig } = useTilawah();

  const [activeAyah, setActiveAyah] = useState<number>(initialAyah);
  const [activeTab, setActiveTab] = useState<StudyTab>('translation');
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // -2 to +6

  // Arabic & Translation state
  const [arabicText, setArabicText] = useState<string>('');
  const [selectedEdition, setSelectedEdition] = useState<string>('en.sahih');
  const [translationsMap, setTranslationsMap] = useState<Record<string, string>>({});
  const [isTranslationLoading, setIsTranslationLoading] = useState<boolean>(false);

  // Tafsir state
  const [selectedTafsirSlug, setSelectedTafsirSlug] = useState<string>('en-tafisr-ibn-kathir');
  const [tafsirText, setTafsirText] = useState<string>('');
  const [isTafsirLoading, setIsTafsirLoading] = useState<boolean>(false);

  // 5-Colour Bookmarks state
  const [colorBookmarks, setColorBookmarks] = useState<Record<BookmarkColorId, ColorBookmark | null>>(
    () => getColorBookmarks()
  );

  // Hifz local state
  const [hifzRepeats, setHifzRepeats] = useState<number>(3);
  const [hifzRangeEnd, setHifzRangeEnd] = useState<number>(initialAyah + 3);
  const [hifzRangeLoops, setHifzRangeLoops] = useState<number | 'infinite'>(1);
  const [hifzPause, setHifzPause] = useState<number>(0.5);
  const [hideMode, setHideMode] = useState<'none' | 'arabic' | 'translation'>('none');
  const [isRevealed, setIsRevealed] = useState<boolean>(false);

  const surahInfo = useMemo(() => quranService.getSurahInfo(surahNumber), [surahNumber]);
  const totalAyahs = surahInfo ? surahInfo.numberOfAyahs : 7;

  // Sync initial ayah when props change
  useEffect(() => {
    setActiveAyah(initialAyah);
    setHifzRangeEnd(Math.min(totalAyahs, initialAyah + 3));
  }, [initialAyah, totalAyahs]);

  // Listen to external color bookmarks changes
  useEffect(() => {
    const handleBookmarkChange = (e: Event) => {
      const custom = e as CustomEvent<Record<BookmarkColorId, ColorBookmark | null>>;
      if (custom.detail) {
        setColorBookmarks(custom.detail);
      } else {
        setColorBookmarks(getColorBookmarks());
      }
    };
    window.addEventListener(COLOR_BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
    return () => window.removeEventListener(COLOR_BOOKMARKS_CHANGED_EVENT, handleBookmarkChange);
  }, []);

  // Fetch Ayah Text & Multi-Editions
  useEffect(() => {
    let cancelled = false;
    const fetchAyahTranslations = async () => {
      setIsTranslationLoading(true);
      const cacheKey = `noor_study_trans_${surahNumber}_${activeAyah}`;

      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) {
            setArabicText(parsed.arabic);
            setTranslationsMap(parsed.translations);
            setIsTranslationLoading(false);
          }
          return;
        }
      } catch {
        // Safe cache check
      }

      try {
        const url = `https://api.alquran.cloud/v1/ayah/${surahNumber}:${activeAyah}/editions/quran-uthmani,en.sahih,en.pickthall,ur.jalandhry,hi.hindi`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data)) {
            let ar = '';
            const trans: Record<string, string> = {};
            json.data.forEach((item: any) => {
              if (item.edition.identifier === 'quran-uthmani') {
                ar = item.text;
              } else {
                trans[item.edition.identifier] = item.text;
              }
            });

            if (!cancelled) {
              setArabicText(ar);
              setTranslationsMap(trans);
              setIsTranslationLoading(false);
            }

            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ arabic: ar, translations: trans })
              );
            } catch {
              // Ignore cache write
            }
            return;
          }
        }
      } catch {
        // Handled offline fallback
      }

      if (!cancelled) {
        setIsTranslationLoading(false);
        if (!arabicText) {
          setArabicText(`${surahInfo?.name || 'القرآن'} — آية ${activeAyah}`);
        }
      }
    };

    fetchAyahTranslations();
    return () => {
      cancelled = true;
    };
  }, [surahNumber, activeAyah, surahInfo]);

  // Fetch Tafsir on Demand with LRU Cache
  useEffect(() => {
    if (activeTab !== 'tafsir') return;

    let cancelled = false;
    const fetchTafsir = async () => {
      setIsTafsirLoading(true);
      const cacheSubKey = `${selectedTafsirSlug}_${surahNumber}_${activeAyah}`;

      // Check LRU cache in localStorage
      try {
        const rawCache = localStorage.getItem(TAFSIR_CACHE_KEY);
        if (rawCache) {
          const lru = JSON.parse(rawCache);
          if (lru[cacheSubKey]) {
            if (!cancelled) {
              setTafsirText(lru[cacheSubKey]);
              setIsTafsirLoading(false);
            }
            return;
          }
        }
      } catch {
        // Safe cache check
      }

      try {
        const cdnUrl = `https://cdn.jsdelivr.net/gh/spa5k/tafsir_api@main/tafsir/${selectedTafsirSlug}/${surahNumber}/${activeAyah}.json`;
        const res = await fetch(cdnUrl, { signal: AbortSignal.timeout(4500) });
        if (res.ok) {
          const data = await res.json();
          const text = data.text || data.tafsir || 'Tafsir commentary not available for this ayah.';
          if (!cancelled) {
            setTafsirText(text);
            setIsTafsirLoading(false);
          }

          // Save to LRU cache (cap ~50 entries)
          try {
            const rawCache = localStorage.getItem(TAFSIR_CACHE_KEY);
            const lru = rawCache ? JSON.parse(rawCache) : {};
            lru[cacheSubKey] = text;
            const keys = Object.keys(lru);
            if (keys.length > 50) {
              delete lru[keys[0]]; // remove oldest entry
            }
            localStorage.setItem(TAFSIR_CACHE_KEY, JSON.stringify(lru));
          } catch {
            // Ignore cache write
          }
          return;
        }
      } catch {
        // Offline / network failure
      }

      if (!cancelled) {
        setIsTafsirLoading(false);
        setTafsirText(
          'Tafsir requires internet connection to fetch authentic commentary. Please reconnect to read offline.'
        );
      }
    };

    fetchTafsir();
    return () => {
      cancelled = true;
    };
  }, [activeTab, selectedTafsirSlug, surahNumber, activeAyah]);

  // Handle Play From Here
  const handlePlayFromHere = () => {
    playAyah(surahNumber, activeAyah);
    toast({
      title: 'Tilawah Started',
      description: `Playing ${surahInfo?.englishName} Ayah ${activeAyah}.`,
    });
  };

  // Handle Repeat This Ayah
  const handleRepeatThisAyah = () => {
    startHifzLoop({
      rangeStart: activeAyah,
      rangeEnd: activeAyah,
      repeatCount: 5,
      rangeLoops: 'infinite',
      pauseFactor: 0.5,
    });
    toast({
      title: 'Ayah Loop Started',
      description: `Looping Ayah ${activeAyah} (5× repeats per pass).`,
    });
  };

  // Handle Share Ayah
  const handleShareAyah = async () => {
    const textToShare = `Quran ${surahInfo?.englishName || 'Surah'} [${surahNumber}:${activeAyah}]\n\n${arabicText}\n\n"${
      translationsMap[selectedEdition] || ''
    }"\n\n— Read on Noor Connect`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Ayah ${surahNumber}:${activeAyah}`,
          text: textToShare,
        });
        toast({ title: 'Ayah Shared' });
        return;
      } catch {
        // User cancelled share
      }
    }

    try {
      await navigator.clipboard.writeText(textToShare);
      toast({ title: 'Copied to Clipboard', description: 'Ayah text and translation copied.' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  // Handle 5-Colour Bookmark toggle
  const handleToggleColor = (colorId: BookmarkColorId) => {
    const placed = toggleColorBookmark(colorId, {
      surah: surahNumber,
      surahName: surahInfo?.englishName || `Surah ${surahNumber}`,
      surahArabic: surahInfo?.name,
      ayah: activeAyah,
      page: currentPage,
      autoMove: true,
    });
    setColorBookmarks(getColorBookmarks());

    const cDef = BOOKMARK_COLORS.find((c) => c.id === colorId);
    toast({
      title: placed ? `${cDef?.name} Bookmark Placed ★` : `${cDef?.name} Bookmark Removed`,
      description: placed
        ? `Marked ${surahInfo?.englishName} ${surahNumber}:${activeAyah} (Moves as you read enabled).`
        : `Removed bookmark from ${surahInfo?.englishName} ${surahNumber}:${activeAyah}.`,
    });
  };

  // Find active bookmark on this ayah
  const activeBookmarkOnAyah = useMemo(() => {
    return (Object.keys(colorBookmarks) as BookmarkColorId[]).find((cid) => {
      const bm = colorBookmarks[cid];
      return bm && bm.surah === surahNumber && bm.ayah === activeAyah;
    });
  }, [colorBookmarks, surahNumber, activeAyah]);

  // Handle Hifz Start
  const handleStartHifz = () => {
    startHifzLoop({
      rangeStart: activeAyah,
      rangeEnd: Math.min(totalAyahs, Math.max(activeAyah, hifzRangeEnd)),
      repeatCount: hifzRepeats,
      rangeLoops: hifzRangeLoops,
      pauseFactor: hifzPause,
      hideMode,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ayah Study & Hifz"
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-[32px] flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elev)',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Top Header & Ayah Navigation Bar */}
        <div className="pt-3 px-5 pb-2.5 flex items-center justify-between border-b border-[var(--border)] shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />

          {/* Ayah Stepper Chip [ ‹ Ayah X:Y › ] */}
          <div
            className="flex items-center gap-1 rounded-full px-2 py-1"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              disabled={activeAyah <= 1}
              onClick={() => {
                setActiveAyah((prev) => Math.max(1, prev - 1));
                setIsRevealed(false);
              }}
              className="p-1 rounded-full disabled:opacity-30 hover:bg-[var(--surface)] text-[var(--accent-text)]"
              aria-label="Previous Ayah"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span
              className="text-xs font-bold px-1.5 whitespace-nowrap"
              style={{ color: 'var(--text-primary)' }}
            >
              Ayah {surahNumber}:{activeAyah}
            </span>
            <button
              type="button"
              disabled={activeAyah >= totalAyahs}
              onClick={() => {
                setActiveAyah((prev) => Math.min(totalAyahs, prev + 1));
                setIsRevealed(false);
              }}
              className="p-1 rounded-full disabled:opacity-30 hover:bg-[var(--surface)] text-[var(--accent-text)]"
              aria-label="Next Ayah"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Controls: Font Scaling & Dismiss */}
          <div className="flex items-center gap-1.5">
            <div
              className="flex items-center gap-1 rounded-lg px-1.5 py-0.5 border"
              style={{
                backgroundColor: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <button
                type="button"
                onClick={() => setFontSizeOffset((p) => Math.max(-2, p - 1))}
                className="text-xs font-bold px-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Decrease Font Size"
              >
                A-
              </button>
              <span className="text-[10px] text-[var(--accent-text)] font-mono font-bold">
                {fontSizeOffset > 0 ? `+${fontSizeOffset}` : fontSizeOffset}
              </span>
              <button
                type="button"
                onClick={() => setFontSizeOffset((p) => Math.min(6, p + 1))}
                className="text-xs font-bold px-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                title="Increase Font Size"
              >
                A+
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close Study Sheet"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {/* Vocalized Uthmani Arabic Card */}
          <div
            className="p-4 rounded-2xl relative overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
            }}
          >
            {/* Memory Test Blur Mask */}
            <div
              style={{
                filter:
                  hideMode === 'arabic' && !isRevealed ? 'blur(7px)' : 'none',
                transition: 'filter 0.25s ease',
              }}
            >
              <p
                dir="rtl"
                className="font-arabic font-bold text-right leading-[2.25]"
                style={{
                  fontSize: `${1.45 + fontSizeOffset * 0.12}rem`,
                  color: 'var(--text-primary)',
                  fontFamily: "'Amiri', 'Traditional Arabic', serif",
                }}
              >
                {arabicText || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
              </p>
            </div>

            {/* Tap to Peek Toggle (when hidden) */}
            {hideMode === 'arabic' && (
              <button
                type="button"
                onClick={() => setIsRevealed(!isRevealed)}
                className="mt-2 text-xs font-bold inline-flex items-center gap-1.5 px-3 py-1 rounded-full border"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  borderColor: 'var(--accent)',
                }}
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Hide Again</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tap to Peek</span>
                  </>
                )}
              </button>
            )}

            {/* Quick Action Bar under Arabic: Play, Repeat, Share */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  onClick={handlePlayFromHere}
                  className="h-8 rounded-xl text-xs font-bold gap-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] border-none"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Play</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRepeatThisAyah}
                  className="h-8 rounded-xl text-xs font-bold gap-1 border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)]"
                >
                  <Repeat className="w-3 h-3" />
                  <span>Repeat</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShareAyah}
                className="h-8 rounded-xl text-xs font-bold gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </Button>
            </div>
          </div>

          {/* 5-Colour Smart Bookmarks Row */}
          <div
            className="p-3 rounded-2xl space-y-2"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between px-1">
              <span
                className="text-[11px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                ★ 5-Colour Bookmarks
              </span>
              {activeBookmarkOnAyah && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    Moves as you read
                  </span>
                  <input
                    type="checkbox"
                    checked={colorBookmarks[activeBookmarkOnAyah]?.autoMove ?? true}
                    onChange={(e) =>
                      setBookmarkAutoMove(activeBookmarkOnAyah, e.target.checked)
                    }
                    className="w-3.5 h-3.5 accent-[var(--accent)] rounded cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* 5 Jewel-Toned Buttons */}
            <div className="grid grid-cols-5 gap-1.5">
              {BOOKMARK_COLORS.map((col) => {
                const bm = colorBookmarks[col.id];
                const isPlacedHere =
                  bm && bm.surah === surahNumber && bm.ayah === activeAyah;
                const isPlacedElsewhere =
                  bm && (bm.surah !== surahNumber || bm.ayah !== activeAyah);

                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleToggleColor(col.id)}
                    className="flex flex-col items-center justify-center p-2 rounded-xl transition-all relative group"
                    style={{
                      backgroundColor: isPlacedHere ? col.bgHex : 'var(--surface-2)',
                      border: isPlacedHere
                        ? `1.5px solid ${col.hex}`
                        : '1px solid var(--border)',
                    }}
                    title={`${col.name} Bookmark ${
                      isPlacedHere
                        ? '(Active here)'
                        : isPlacedElsewhere
                        ? `(At Surah ${bm.surah}:${bm.ayah})`
                        : '(Empty)'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full shadow-sm mb-1"
                      style={{ backgroundColor: col.hex }}
                    />
                    <span
                      className="text-[10px] font-bold truncate max-w-full"
                      style={{ color: isPlacedHere ? col.textColor : 'var(--text-primary)' }}
                    >
                      {col.name}
                    </span>

                    {/* Badge if placed elsewhere */}
                    {isPlacedElsewhere && !isPlacedHere && (
                      <span className="text-[8px] text-[var(--text-secondary)] font-mono leading-none mt-0.5 truncate">
                        {bm.surah}:{bm.ayah}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Tab Switcher: Translation | Tafsir | Hifz */}
          <div
            className="flex items-center p-1 rounded-xl gap-1"
            style={{
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
            }}
          >
            {(
              [
                { id: 'translation', label: '📖 Translation' },
                { id: 'tafsir', label: '📜 Tafsir' },
                { id: 'hifz', label: '🎯 Hifz Engine' },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all text-center"
                  style={{
                    backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px var(--accent-glow)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: TRANSLATION */}
          {activeTab === 'translation' && (
            <div className="space-y-3">
              {/* Edition Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {TRANSLATION_EDITIONS.map((ed) => {
                  const isSelected = selectedEdition === ed.id;
                  return (
                    <button
                      key={ed.id}
                      type="button"
                      onClick={() => setSelectedEdition(ed.id)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--surface)',
                        color: isSelected ? 'var(--on-accent)' : 'var(--text-secondary)',
                        border: isSelected
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border)',
                      }}
                    >
                      {ed.name}
                    </button>
                  );
                })}
              </div>

              {/* Translation Text Card */}
              <div
                className="p-4 rounded-2xl min-h-[100px]"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                }}
              >
                {isTranslationLoading ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span>Loading authentic translation...</span>
                  </div>
                ) : (
                  <p
                    className="text-sm leading-relaxed"
                    style={{
                      color: 'var(--text-primary)',
                      filter:
                        hideMode === 'translation' && !isRevealed ? 'blur(7px)' : 'none',
                      transition: 'filter 0.25s ease',
                    }}
                  >
                    {translationsMap[selectedEdition] ||
                      'Loading verified translation for this edition...'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TAFSIR */}
          {activeTab === 'tafsir' && (
            <div className="space-y-3">
              {/* Tafsir Edition Selector */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {TAFSIR_EDITIONS.map((taf) => {
                  const isSelected = selectedTafsirSlug === taf.slug;
                  return (
                    <button
                      key={taf.slug}
                      type="button"
                      onClick={() => setSelectedTafsirSlug(taf.slug)}
                      className="px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--surface)',
                        color: isSelected ? 'var(--on-accent)' : 'var(--text-secondary)',
                        border: isSelected
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border)',
                      }}
                    >
                      {taf.name}
                    </button>
                  );
                })}
              </div>

              {/* Tafsir Commentary Content */}
              <div
                className="p-4 rounded-2xl max-h-[280px] overflow-y-auto leading-relaxed text-xs sm:text-sm space-y-2"
                style={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {isTafsirLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                    <span>Loading authentic Tafsir commentary...</span>
                  </div>
                ) : (
                  <div
                    className="whitespace-pre-wrap leading-relaxed"
                    style={{
                      direction: selectedTafsirSlug.startsWith('ar') || selectedTafsirSlug.startsWith('ur') ? 'rtl' : 'ltr',
                      fontFamily: selectedTafsirSlug.startsWith('ar') ? "'Amiri', serif" : 'inherit',
                    }}
                  >
                    {tafsirText}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: HIFZ MEMORIZATION ENGINE */}
          {activeTab === 'hifz' && (
            <div
              className="p-4 rounded-2xl space-y-4"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1.5px solid var(--accent)',
              }}
            >
              {/* Repeats Per Ayah */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span style={{ color: 'var(--text-primary)' }}>Repeat Each Ayah</span>
                  <span style={{ color: 'var(--accent-text)' }}>{hifzRepeats}× Times</span>
                </div>
                <div className="flex items-center justify-between gap-1.5">
                  {[1, 2, 3, 5, 10].map((rep) => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => setHifzRepeats(rep)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={{
                        backgroundColor:
                          hifzRepeats === rep ? 'var(--accent)' : 'var(--surface-2)',
                        color:
                          hifzRepeats === rep ? 'var(--on-accent)' : 'var(--text-primary)',
                        border:
                          hifzRepeats === rep
                            ? '1px solid var(--accent)'
                            : '1px solid var(--border)',
                      }}
                    >
                      {rep}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Ayah Range & Range Loops */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                    To Ayah (End of Range)
                  </label>
                  <input
                    type="number"
                    min={activeAyah}
                    max={totalAyahs}
                    value={hifzRangeEnd}
                    onChange={(e) => setHifzRangeEnd(parseInt(e.target.value, 10) || activeAyah)}
                    className="w-full h-9 rounded-xl px-2.5 text-xs font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">
                    Loop Whole Range
                  </label>
                  <select
                    value={hifzRangeLoops}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHifzRangeLoops(v === 'infinite' ? 'infinite' : parseInt(v, 10));
                    }}
                    className="w-full h-9 rounded-xl px-2.5 text-xs font-bold bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value={1}>1 Loop</option>
                    <option value={3}>3 Loops</option>
                    <option value={5}>5 Loops</option>
                    <option value="infinite">∞ Infinite</option>
                  </select>
                </div>
              </div>

              {/* Pause Factor Between Repeats (for recitation aloud) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                  Pause Between Repeats (Time to Recite Aloud)
                </span>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'None', val: 0 },
                    { label: '0.5× Ayah Time', val: 0.5 },
                    { label: '1.0× Ayah Time', val: 1 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setHifzPause(p.val)}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={{
                        backgroundColor:
                          hifzPause === p.val ? 'var(--accent)' : 'var(--surface-2)',
                        color:
                          hifzPause === p.val ? 'var(--on-accent)' : 'var(--text-primary)',
                        border:
                          hifzPause === p.val
                            ? '1px solid var(--accent)'
                            : '1px solid var(--border)',
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Memory Test: Hide Modes */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">
                  Memory Test (Blind Recall)
                </span>
                <div className="flex items-center gap-1.5">
                  {(
                    [
                      { id: 'none', label: 'None' },
                      { id: 'arabic', label: 'Hide Arabic' },
                      { id: 'translation', label: 'Hide Translation' },
                    ] as const
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setHideMode(m.id);
                        setIsRevealed(false);
                      }}
                      className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all text-center"
                      style={{
                        backgroundColor:
                          hideMode === m.id ? 'var(--accent)' : 'var(--surface-2)',
                        color:
                          hideMode === m.id ? 'var(--on-accent)' : 'var(--text-primary)',
                        border:
                          hideMode === m.id
                            ? '1px solid var(--accent)'
                            : '1px solid var(--border)',
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start / Stop Hifz Loop CTA Button */}
              <div className="pt-2">
                {hifzConfig.isActive ? (
                  <Button
                    onClick={stopHifzLoop}
                    className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Stop Active Hifz Loop</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleStartHifz}
                    className="w-full h-11 rounded-xl text-xs font-bold gap-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-lg shadow-[var(--accent-glow)]"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Hifz Loop (Ayah {activeAyah}–{hifzRangeEnd})</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
