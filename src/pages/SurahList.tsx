import { useState, useMemo, useEffect, memo, useRef, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Sparkles,
  ArrowRight,
  Star,
  BookOpen,
  Calendar,
  Plus,
  RotateCcw,
  CheckCircle2,
  Bookmark,
  Hash,
  Headphones,
  HelpCircle,
} from "lucide-react";
import { QuranGuideModal } from "@/components/Quran/QuranGuideModal";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { SURAH_START_PAGES } from "@/lib/mushaf-service";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/contexts/SettingsContext";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { getQuranUIStrings } from "@/lib/quran-guide-i18n";
import { useTilawah } from "@/contexts/TilawahContext";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { getActivePrayerWindow, getOrderedSunnahSurahs } from "@/lib/sunnah-spotlight";
import {
  BOOKMARK_COLORS,
  getColorBookmarks,
  removeColorBookmark,
  COLOR_BOOKMARKS_CHANGED_EVENT,
  type ColorBookmark,
  type BookmarkColorId,
} from "@/lib/quran-bookmarks";
import { getDailyAyah } from "@/lib/daily-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  getMushafLineFormat,
  setMushafLineFormat,
  type MushafLineFormat,
} from "@/lib/interactive-mushaf";
import { Preferences } from "@capacitor/preferences";
import { CSSOnlyTransition } from "@/components/AdaptiveMotion";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  getKhatmahPlan,
  startKhatmah,
  advanceKhatmahPage,
  completeTodayKhatmahPortion,
  resetKhatmahPlan,
  getKhatmahPortion,
  prepareReaderRouteForPage,
  type KhatmahPlan,
} from "@/lib/khatmah-planner";
import { JUZ_LIST, type JuzItem } from "@/data/juz-data";

import { REVELATION_TYPE_I18N } from "@/lib/home-prayer-i18n";

const BOOKMARKS_KEY = "quran-bookmarks";

interface SurahCardProps {
  surah: SurahInfo;
  index: number;
  isDark: boolean;
  isBookmarked: boolean;
  ayahsLabel?: string;
  onClick: (number: number) => void;
}

const SurahCard = memo(
  function SurahCard({ surah, isBookmarked, ayahsLabel, onClick }: SurahCardProps) {
    const { language } = useLanguage();
    const revPack = REVELATION_TYPE_I18N[language] || REVELATION_TYPE_I18N.en;
    const isMeccan = (surah.revelationType || '').toLowerCase().includes('mecc');
    const revLabel = isMeccan ? revPack.meccan : revPack.medinan;

    return (
      <button
        onClick={() => onClick(surah.number)}
        className="w-full text-left outline-none active:scale-[0.98] transition-transform duration-150 group"
      >
        <div
          className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[18px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors"
          style={{
            boxShadow: "inset 0 1px 0 var(--card-sheen)",
          }}
        >
          {/* Left Side: 8-Point Rub el Hizb Star Emblem + Details Stack */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-[42px] h-[42px] flex items-center justify-center shrink-0">
              <svg width="42" height="42" viewBox="0 0 42 42" className="w-[42px] h-[42px] absolute inset-0">
                <rect x="8" y="8" width="26" height="26" rx="3.5" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
                <rect x="8" y="8" width="26" height="26" rx="3.5" transform="rotate(45 21 21)" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
              </svg>
              <span className="relative z-10 font-bold text-[var(--accent-text)] text-[0.82rem] leading-none select-none">
                {surah.number}
              </span>
            </div>

            {/* Surah Details Stack */}
            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="font-bold text-base text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors leading-tight truncate">
                {surah.englishName}
              </h3>
              <p className="text-[0.78rem] text-[var(--text-secondary)] font-medium leading-snug truncate">
                {surah.englishNameTranslation}
              </p>
              <div className="flex items-center gap-1.5 pt-0.5 flex-nowrap">
                <span
                  className="uppercase font-bold tracking-wider rounded-[6px] shrink-0 whitespace-nowrap"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-text)",
                    fontSize: "0.65rem",
                    padding: "2px 7px",
                  }}
                >
                  {revLabel}
                </span>
                <span className="text-[var(--text-secondary)] text-[0.72rem] font-semibold whitespace-nowrap shrink-0">
                  • {surah.numberOfAyahs}&nbsp;{ayahsLabel || 'AYAHS'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Side: Dedicated Arabic Calligraphy Column */}
          <div className="shrink-0 text-right flex flex-col items-end justify-center pl-2">
            <div className="flex items-center gap-1.5 justify-end">
              {isBookmarked && (
                <span className="text-[var(--accent-text)] text-xs select-none drop-shadow-sm" title="Saved">
                  ★
                </span>
              )}
              <span className="font-arabic font-bold text-[1.35rem] text-[var(--accent-text)] leading-none select-none">
                {surah.name}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  },
  (prevProps, nextProps) =>
    prevProps.surah.number === nextProps.surah.number &&
    prevProps.surah.name === nextProps.surah.name &&
    prevProps.surah.englishName === nextProps.surah.englishName &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.isBookmarked === nextProps.isBookmarked
);

type MainTab = "surahs" | "juz" | "saved";
type SurahSubFilter = "all" | "meccan" | "medinan";

export default function SurahList() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === "dark";
  const { language } = useLanguage();
  const isRTL = language === 'ar' || language === 'ur';
  const uiStrings = useMemo(() => getQuranUIStrings(language), [language]);
  const navigate = useNavigate();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("surahs");
  const [surahSubFilter, setSurahSubFilter] = useState<SurahSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Khatmah Planner State
  const [khatmahPlan, setKhatmahPlan] = useState<KhatmahPlan | null>(() => getKhatmahPlan());
  const [isKhatmahExpanded, setIsKhatmahExpanded] = useState(false);
  const [customDays, setCustomDays] = useState("30");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // 3-Type Quran Line Format: 7L | 13L | 15L
  const [lineFormat, setLineFormatState] = useState<MushafLineFormat>(() => getMushafLineFormat());

  const handleSelectLineFormat = (fmt: MushafLineFormat) => {
    setLineFormatState(fmt);
    setMushafLineFormat(fmt);
    toast.success(`Quran Format: ${fmt}-Line Mushaf`, {
      description:
        fmt === 7
          ? 'Large Print (7 Lines per view)'
          : fmt === 13
          ? 'Classic Indo-Pak (13 Lines per page)'
          : 'Standard Madinah (15 Lines per page)',
    });
  };

  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.format) {
        setLineFormatState(e.detail.format);
      }
    };
    window.addEventListener('noor-mushaf-format-changed' as any, handler);
    return () => window.removeEventListener('noor-mushaf-format-changed' as any, handler);
  }, []);

  // Quran Feature Guide & Welcome Banner State
  const [showGuideModal, setShowGuideModal] = useState(false);
  useBodyScrollLock(showGuideModal);
  useBodyScrollLock(showCustomModal);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState<boolean>(() => {
    try {
      return localStorage.getItem('noor_quran_guide_dismissed_v1') !== 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleDismissed = () => {
      setShowWelcomeBanner(false);
    };
    window.addEventListener('noorconnect:quran-guide-dismissed', handleDismissed);
    return () => window.removeEventListener('noorconnect:quran-guide-dismissed', handleDismissed);
  }, []);

  // # Jump Modal State
  const [showJumpModal, setShowJumpModal] = useState(false);
  const [jumpCategory, setJumpCategory] = useState<"page" | "juz" | "surah">("page");
  const [jumpInput, setJumpInput] = useState("");

  const [lastRead, setLastRead] = useState<{
    number: number;
    name: string;
    englishName?: string;
    arabicName?: string;
    page?: number;
    totalPages?: number;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('quran-last-read');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      // Return empty list on parse error
      return [];
    }
  });

  const { isPlaying, currentSurah, currentAyah, reciter, openPlayer, playAyah } = useTilawah();
  const { prayerTimes } = usePrayerTimes();
  const [colorBookmarks, setColorBookmarks] = useState<Record<BookmarkColorId, ColorBookmark | null>>(() =>
    getColorBookmarks()
  );

  useEffect(() => {
    const handleColorChange = (e: Event) => {
      const custom = e as CustomEvent<Record<BookmarkColorId, ColorBookmark | null>>;
      if (custom.detail) {
        setColorBookmarks(custom.detail);
      } else {
        setColorBookmarks(getColorBookmarks());
      }
    };
    window.addEventListener(COLOR_BOOKMARKS_CHANGED_EVENT, handleColorChange);
    window.addEventListener("focus", () => setColorBookmarks(getColorBookmarks()));
    return () => {
      window.removeEventListener(COLOR_BOOKMARKS_CHANGED_EVENT, handleColorChange);
    };
  }, []);

  const placedColorBookmarks = useMemo(() => {
    return BOOKMARK_COLORS.map((c) => colorBookmarks[c.id]).filter(
      (b): b is ColorBookmark => b !== null
    );
  }, [colorBookmarks]);

  const listRef = useRef<HTMLDivElement>(null);

  const dailyAyah = useMemo(() => getDailyAyah(), []);
  const allSurahs = useMemo(() => quranService.getAllSurahs(), []);

  // Time & day awareness for Sunnah badges and 5-Waqt Spotlight
  const isFridayToday = useMemo(() => new Date().getDay() === 5, []);
  const activePrayerWindow = useMemo(() => {
    return getActivePrayerWindow(new Date(), prayerTimes);
  }, [prayerTimes]);

  const { orderedList: sunnahList, featuredSurah, virtue: spotlightVirtue } = useMemo(() => {
    return getOrderedSunnahSurahs(activePrayerWindow, isFridayToday, language);
  }, [activePrayerWindow, isFridayToday, language]);

  const tokenizedReference = useMemo(() => {
    const raw = dailyAyah?.reference || dailyAyah?.subtitle || "Al-Baqarah 2:45";
    if (!raw.includes("•")) {
      const match = raw.match(/^(.*?)\s*(\d+:\d+|\d+)$/);
      if (match) {
        return `${match[1].trim()} • ${match[2].trim()}`;
      }
    }
    return raw;
  }, [dailyAyah]);

  const dailySurahNumber = useMemo(() => {
    const raw = dailyAyah?.reference || dailyAyah?.subtitle || "";
    const match = raw.match(/(\d+):/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num >= 1 && num <= 114) return num;
    }
    const lower = raw.toLowerCase();
    if (lower.includes("baqarah")) return 2;
    if (lower.includes("imran")) return 3;
    if (lower.includes("tawbah")) return 9;
    if (lower.includes("ra'd") || lower.includes("rad")) return 13;
    return null;
  }, [dailyAyah]);

  // Load last read & bookmarks & khatmah reactive listener
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quran-last-read");
      if (saved) setLastRead(JSON.parse(saved));
    } catch {
      // Ignore parse error
    }

    const syncKhatmah = () => {
      setKhatmahPlan(getKhatmahPlan());
    };

    const syncBookmarks = async () => {
      try {
        const { value } = await Preferences.get({ key: BOOKMARKS_KEY });
        if (value) {
          setBookmarkedSurahs(JSON.parse(value));
          return;
        }
      } catch {
        // Fallback to localStorage
      }
      try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        if (raw) setBookmarkedSurahs(JSON.parse(raw));
      } catch {
        // Keep current state
      }
    };

    syncBookmarks();

    const handleBookmarksChanged = (e: Event) => {
      const custom = e as CustomEvent<number[]>;
      if (custom.detail) {
        setBookmarkedSurahs(custom.detail);
      } else {
        syncBookmarks();
      }
    };

    window.addEventListener("noorconnect:quran-bookmarks-changed", handleBookmarksChanged);
    window.addEventListener("noorconnect:quran-progress-changed", syncKhatmah);
    window.addEventListener("focus", syncBookmarks);

    return () => {
      window.removeEventListener("noorconnect:quran-bookmarks-changed", handleBookmarksChanged);
      window.removeEventListener("noorconnect:quran-progress-changed", syncKhatmah);
      window.removeEventListener("focus", syncBookmarks);
    };
  }, []);

  const lastReadInfo = useMemo(() => {
    if (!lastRead) return null;
    return quranService.getSurahInfo(lastRead.number);
  }, [lastRead]);

  // Filter Surahs
  const filteredSurahs = useMemo(() => {
    let surahs = allSurahs;

    if (activeMainTab === "saved") {
      surahs = surahs.filter((s) => bookmarkedSurahs.includes(s.number));
    } else {
      if (surahSubFilter === "meccan") {
        surahs = surahs.filter((s) => s.revelationType === "Meccan");
      } else if (surahSubFilter === "medinan") {
        surahs = surahs.filter(
          (s) => s.revelationType === "Medinan" || (s as any).revelationType === "Madinah"
        );
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      surahs = surahs.filter(
        (s) =>
          s.englishName.toLowerCase().includes(query) ||
          s.name.includes(query) ||
          s.englishNameTranslation.toLowerCase().includes(query) ||
          s.number.toString() === query
      );
    }

    return surahs;
  }, [allSurahs, activeMainTab, surahSubFilter, bookmarkedSurahs, searchQuery]);

  // Filter Juz
  const filteredJuzList = useMemo(() => {
    if (!searchQuery.trim()) return JUZ_LIST;
    const q = searchQuery.trim().toLowerCase();
    return JUZ_LIST.filter(
      (j) =>
        j.number.toString() === q ||
        j.nameEnglish.toLowerCase().includes(q) ||
        j.nameArabic.includes(q) ||
        j.startSurahName.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSurahClick = (surahNumber: number) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const startPage = SURAH_START_PAGES[surahNumber] || 1;
    startTransition(() => {
      navigate(`/quran/${surahNumber}?page=${startPage}`, { replace: true });
    });
  };

  const handleJuzClick = (juz: JuzItem) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const startSurah = juz.startSurahNumber;
    startTransition(() => {
      navigate(`/quran/${startSurah}?page=${juz.startPage}`, { replace: true });
    });
  };

  // Khatmah actions
  const handleStartPreset = (days: number) => {
    if ("vibrate" in navigator) navigator.vibrate(20);
    const p = startKhatmah(days, 0);
    setKhatmahPlan(p);
  };

  const handleCustomStart = () => {
    const days = parseInt(customDays, 10);
    if (!isNaN(days) && days >= 7 && days <= 365) {
      if ("vibrate" in navigator) navigator.vibrate(20);
      const p = startKhatmah(days, 0);
      setKhatmahPlan(p);
      setShowCustomModal(false);
    }
  };

  const handleAdvancePage = () => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const p = advanceKhatmahPage(1);
    setKhatmahPlan(p);
  };

  const handleCompleteTodayPortion = () => {
    if ("vibrate" in navigator) navigator.vibrate(25);
    const p = completeTodayKhatmahPortion();
    setKhatmahPlan(p);
  };

  const handleResetKhatmah = () => {
    if ("vibrate" in navigator) navigator.vibrate(20);
    resetKhatmahPlan();
    setKhatmahPlan(null);
  };

  const handleOpenPortion = (portionStartPage: number) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const url = prepareReaderRouteForPage(portionStartPage);
    startTransition(() => {
      navigate(url, { replace: true });
    });
  };

  // Jump Action
  const handleJumpGo = () => {
    const val = parseInt(jumpInput, 10);
    if (isNaN(val) || val <= 0) return;

    if ("vibrate" in navigator) navigator.vibrate(15);

    if (jumpCategory === "page") {
      const page = Math.min(604, Math.max(1, val));
      const url = prepareReaderRouteForPage(page);
      setShowJumpModal(false);
      navigate(url, { replace: true });
    } else if (jumpCategory === "juz") {
      const juzNum = Math.min(30, Math.max(1, val));
      const found = JUZ_LIST.find((j) => j.number === juzNum);
      if (found) {
        setShowJumpModal(false);
        navigate(`/quran/${found.startSurahNumber}?page=${found.startPage}`, { replace: true });
      }
    } else if (jumpCategory === "surah") {
      const surahNum = Math.min(114, Math.max(1, val));
      const startPage = SURAH_START_PAGES[surahNum] || 1;
      setShowJumpModal(false);
      navigate(`/quran/${surahNum}?page=${startPage}`, { replace: true });
    }
  };

  const portionInfo = useMemo(() => {
    if (!khatmahPlan || khatmahPlan.status === "completed") return null;
    return getKhatmahPortion(khatmahPlan);
  }, [khatmahPlan]);

  return (
    <PageTransition>
      <div className="min-h-screen relative overflow-hidden bg-[var(--bg-base)] pb-32">
        {/* Subtle geometric pattern backdrop */}
        <div className="absolute top-0 left-0 right-0 h-48 opacity-[0.03] bg-[radial-gradient(circle_at_2px_2px,_var(--accent)_1px,_transparent_0)] bg-[length:32px_32px] pointer-events-none" />

        {/* Compact Illuminated Header (Mihrab-Inspired with Safe-Area Clearance) */}
        <div className="max-w-2xl mx-auto px-4 pb-1 safe-top" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
          {/* Dedicated Top Bismillah Medallion Banner (Zero Overlap with Android Status Bar) */}
          <div
            className="flex items-center justify-center mx-auto mb-2.5 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--accent-text)] shadow-sm max-w-fit"
            style={{
              boxShadow: "inset 0 1px 0 var(--card-sheen)",
            }}
          >
            <p className="font-arabic text-[1.22rem] leading-[1.8] font-bold text-center select-none text-[var(--accent-text)]">
              بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
            </p>
          </div>

          {/* Title & Action Row (Zero Overlap, Clean Single-Line Title & Subtitle) */}
          <div
            className="relative overflow-hidden mb-2 rounded-2xl flex items-center justify-between gap-2"
            style={{
              padding: "11px 14px",
              background: "linear-gradient(145deg, rgba(16, 85, 60, 0.22), var(--surface))",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 1px 0 var(--card-sheen)",
            }}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.18rem] font-bold text-[var(--text-primary)] tracking-wide leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                Al-Quran Al-Kareem
              </h1>
              <p className="text-[var(--text-secondary)] text-[0.72rem] font-medium leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {uiStrings.subtitleStats}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                title="Quran Features Guide"
                className="px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] font-bold text-xs flex items-center gap-1.5 hover:border-[var(--accent)] transition-all shadow-sm active:scale-95 shrink-0"
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{uiStrings.guideBtn}</span>
              </button>
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--accent-text)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
              >
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Dismissible First-Visit Welcome Strip */}
        {showWelcomeBanner && (
          <div className="max-w-2xl mx-auto px-4 mb-2">
            <div
              className="p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200"
              style={{
                background: "linear-gradient(135deg, rgba(212, 175, 55, 0.12), var(--surface))",
                borderColor: "var(--accent)",
              }}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="text-base leading-none">✨</span>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                    {uiStrings.welcomeBannerTitle}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-1">
                    {uiStrings.welcomeBannerDesc}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--accent)] text-[var(--on-accent)] shrink-0 hover:opacity-90 active:scale-95 transition-all"
                >
                  {uiStrings.seeHow}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.setItem('noor_quran_guide_dismissed_v1', 'true');
                    } catch {
                      // Safe catch
                    }
                    setShowWelcomeBanner(false);
                  }}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                  title="Dismiss banner"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Slim 1-Line Continue Reading Banner */}
        {lastRead && (
          <div className="max-w-2xl mx-auto px-4 mb-2">
            <div
              onClick={() => {
                if (lastRead.page) {
                  const url = prepareReaderRouteForPage(lastRead.page);
                  navigate(url, { replace: true });
                } else {
                  handleSurahClick(lastRead.number);
                }
              }}
              role="button"
              tabIndex={0}
              className="px-3.5 py-2 rounded-xl flex items-center justify-between gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group border"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                boxShadow: "inset 0 1px 0 var(--card-sheen)",
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse shrink-0" />
                <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {uiStrings.continueReading}{" "}
                  {isRTL ? (
                    <bdi>{lastReadInfo?.name || lastRead.arabicName || lastReadInfo?.englishName || lastRead.englishName || `سورة #${lastRead.number}`}</bdi>
                  ) : (
                    <bdi>{lastReadInfo?.englishName || lastRead.englishName || `Surah #${lastRead.number}`}</bdi>
                  )}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                  • {uiStrings.page} <span dir="ltr" className="inline-block tabular-nums">{lastRead.page || 1}</span>
                </span>
              </div>
              <span className="text-xs font-bold text-[var(--accent-text)] group-hover:underline flex items-center gap-1 shrink-0">
                {uiStrings.resume.replace(/[→←\s]+$/, '')} {isRTL ? '←' : '→'}
              </span>
            </div>
          </div>
        )}

        {/* 2-COLUMN SIDE-BY-SIDE ACTION TILES (Khatmah + Tilawah) */}
        <div className="max-w-2xl mx-auto px-4 mb-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Left Tile: Khatmah */}
            <div
              onClick={() => setIsKhatmahExpanded(!isKhatmahExpanded)}
              role="button"
              tabIndex={0}
              className="p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
              style={{
                background: "var(--surface)",
                borderColor: isKhatmahExpanded ? "var(--accent)" : "var(--border)",
                boxShadow: isKhatmahExpanded ? "0 0 12px var(--accent-soft)" : "inset 0 1px 0 var(--card-sheen)",
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="p-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] shrink-0">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]" style={{ whiteSpace: 'nowrap' }}>
                    {uiStrings.khatmah} {isKhatmahExpanded ? "▲" : "▾"}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {portionInfo && khatmahPlan
                  ? `${uiStrings.page} ${khatmahPlan.currentPage}/604`
                  : uiStrings.startPlan}
              </p>
            </div>

            {/* Right Tile: Tilawah */}
            <div
              onClick={openPlayer}
              role="button"
              tabIndex={0}
              className="p-3 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-sm"
              style={{
                background: "var(--surface)",
                borderColor: isPlaying ? "var(--accent)" : "var(--border)",
                boxShadow: isPlaying ? "0 0 12px var(--accent-soft)" : "inset 0 1px 0 var(--card-sheen)",
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="p-1 rounded-lg shrink-0"
                    style={{
                      background: isPlaying ? "var(--accent)" : "var(--accent-soft)",
                      color: isPlaying ? "var(--on-accent)" : "var(--accent)",
                    }}
                  >
                    <Headphones className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {uiStrings.tilawah}
                  </span>
                </div>
                {isPlaying && (
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {isPlaying
                  ? `Playing ${currentSurah}:${currentAyah}`
                  : uiStrings.tilawahSub}
              </p>
            </div>
          </div>
        </div>

        {/* 3-TYPE QURAN MUSHAF FORMAT SELECTOR CARD (7-LINE, 13-LINE & 15-LINE) */}
        <div className="max-w-2xl mx-auto px-4 mb-3">
          <div
            className="p-3 sm:p-3.5 rounded-2xl border transition-all shadow-sm"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "inset 0 1px 0 var(--card-sheen)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-xs font-bold text-[var(--accent-text)] flex items-center gap-1.5 ${
                  language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""
                }`}
              >
                <span>{uiStrings.mushafFormatHeader}</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                {lineFormat}L ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* 7-Line Card */}
              <button
                type="button"
                onClick={() => handleSelectLineFormat(7)}
                className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                  lineFormat === 7
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs scale-[1.02]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    lineFormat === 7 ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format7Lines}
                </span>
                <span
                  className={`text-[9.5px] sm:text-[10.5px] font-medium leading-tight ${
                    lineFormat === 7 ? 'text-[var(--accent-text)] opacity-90' : 'text-[var(--text-secondary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format7LinesSub}
                </span>
              </button>

              {/* 13-Line Card */}
              <button
                type="button"
                onClick={() => handleSelectLineFormat(13)}
                className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                  lineFormat === 13
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs scale-[1.02]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    lineFormat === 13 ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format13Lines}
                </span>
                <span
                  className={`text-[9.5px] sm:text-[10.5px] font-medium leading-tight ${
                    lineFormat === 13 ? 'text-[var(--accent-text)] opacity-90' : 'text-[var(--text-secondary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format13LinesSub}
                </span>
              </button>

              {/* 15-Line Card */}
              <button
                type="button"
                onClick={() => handleSelectLineFormat(15)}
                className={`p-2 sm:p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 active:scale-95 ${
                  lineFormat === 15
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-xs scale-[1.02]'
                    : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50'
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold ${
                    lineFormat === 15 ? 'text-[var(--accent-text)]' : 'text-[var(--text-primary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format15Lines}
                </span>
                <span
                  className={`text-[9.5px] sm:text-[10.5px] font-medium leading-tight ${
                    lineFormat === 15 ? 'text-[var(--accent-text)] opacity-90' : 'text-[var(--text-secondary)]'
                  } ${language === 'ur' ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)]" : ""}`}
                >
                  {uiStrings.format15LinesSub}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* EXPANDABLE SMART PACED KHATMAH PLANNER CARD */}
        {isKhatmahExpanded && (
          <div className="max-w-2xl mx-auto px-4 mb-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <Card
              className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3"
              style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 var(--card-sheen)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)]">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      SMART KHATMAH
                    </h3>
                    <span className="text-[10px] text-[var(--text-secondary)]">604 Mushaf Pages</span>
                  </div>
                </div>

                {portionInfo ? (
                  <Badge
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                    style={{
                      background: "var(--accent-soft)",
                      color: "var(--accent-text)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {khatmahPlan?.currentPage || 0} / 604 ({portionInfo.percent}%)
                  </Badge>
                ) : (
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)]">No active plan</span>
                )}
              </div>

              {/* Active Plan View */}
              {portionInfo && khatmahPlan ? (
                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-medium">
                      <span className="text-[var(--text-secondary)]">
                        {portionInfo.daysRemaining} {portionInfo.daysRemaining === 1 ? "day" : "days"} left
                      </span>
                      <span className="text-[var(--accent-text)] font-mono font-bold">
                        {portionInfo.pagesPerDay} {portionInfo.pagesPerDay === 1 ? "page" : "pages"}/day
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(2, portionInfo.percent)}%`,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        }}
                      />
                    </div>
                  </div>

                  {/* Today's Calculated Portion Box */}
                  <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] tracking-wider block">
                        TODAY'S PORTION • {portionInfo.portionPages} PAGES
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate block">
                        Pages {portionInfo.startPage}–{portionInfo.endPage}
                      </span>
                      <span className="text-[10px] text-[var(--accent-text)] truncate block">
                        Starts in Surah {portionInfo.startSurahName}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleOpenPortion(portionInfo.startPage)}
                      className="h-8 px-3 rounded-xl text-xs font-bold shrink-0"
                      style={{
                        background: "var(--accent)",
                        color: "var(--on-accent)",
                      }}
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      Read Now
                    </Button>
                  </div>

                  {/* Quick Pacing Action Grid */}
                  <div className="grid grid-cols-3 gap-1.5" style={{ minWidth: 0 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAdvancePage}
                      style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0 4px' }}
                      className="h-8 rounded-xl font-bold bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)]"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span>1 Page</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCompleteTodayPortion}
                      style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0 4px' }}
                      className="h-8 rounded-xl font-bold bg-[var(--surface-2)] border-[var(--border)] text-emerald-400"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-400 shrink-0" />
                      <span>Done Today</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetKhatmah}
                      style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0 4px' }}
                      className="h-8 rounded-xl font-bold text-[var(--text-secondary)] hover:text-rose-400"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1 shrink-0" />
                      <span>Reset</span>
                    </Button>
                  </div>
                </div>
              ) : (
                /* No Active Plan: Preset Chooser */
                <div className="space-y-2.5">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Choose a goal — Noor Connect calculates your daily pages and automatically adjusts if you read extra or miss a day.
                  </p>
                  <div className="grid grid-cols-4 gap-1.5" style={{ minWidth: 0 }}>
                    {[
                      { days: 30, label: "30 Days", sub: "~20 p/d" },
                      { days: 60, label: "60 Days", sub: "~10 p/d" },
                      { days: 90, label: "90 Days", sub: "~7 p/d" },
                    ].map((p) => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => handleStartPreset(p.days)}
                        className="p-2 rounded-xl text-center bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition-all active:scale-[0.98]"
                      >
                        <span className="block text-xs font-bold text-[var(--text-primary)] leading-tight">{p.label}</span>
                        <span className="block text-[9px] text-[var(--accent-text)] font-mono">{p.sub}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setShowCustomModal(true)}
                      className="p-2 rounded-xl text-center bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] transition-all active:scale-[0.98]"
                    >
                      <span className="block text-xs font-bold text-[var(--text-primary)] leading-tight">Custom</span>
                      <span className="block text-[9px] text-[var(--text-secondary)] font-mono">7-365 d</span>
                    </button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* 5-WAQT SUNNAH SURAH SPIRITUAL SPOTLIGHT STRIP */}
        <div className="max-w-2xl mx-auto px-4 mb-2">
          <div className="flex items-center justify-between mb-1.5 px-0.5 whitespace-nowrap gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap shrink-0">
              {uiStrings.oftenRead || 'SUNNAH SURAHS'}
            </span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--accent-text)] whitespace-nowrap shrink-0">
              ✦ {spotlightVirtue.prayerLabel} SUNNAH
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {sunnahList.map((surah, index) => {
              const isFeatured = index === 0;

              return (
                <button
                  key={surah.number}
                  type="button"
                  onClick={() => handleSurahClick(surah.number)}
                  className="px-3 py-2 rounded-xl border flex flex-col justify-between shrink-0 transition-all active:scale-[0.97] min-w-[136px]"
                  style={{
                    background: isFeatured ? "var(--surface-2)" : "var(--surface)",
                    backgroundImage: isFeatured
                      ? "linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--surface-2)), var(--surface))"
                      : undefined,
                    borderColor: isFeatured ? "var(--accent)" : "var(--border)",
                    boxShadow: isFeatured
                      ? "0 6px 20px -4px var(--accent-glow), inset 0 1px 0 var(--card-sheen)"
                      : "inset 0 1px 0 var(--card-sheen)",
                    borderWidth: isFeatured ? "1.5px" : "1px",
                  }}
                >
                  <div className="flex items-center justify-between gap-1 w-full mb-1">
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">{surah.name}</span>
                    {isFeatured ? (
                      <span
                        className="font-bold text-[0.65rem] rounded-full px-2 py-0.5 truncate shrink-0"
                        style={{
                          background: "var(--accent)",
                          color: "var(--on-accent)",
                        }}
                      >
                        {surah.badgeLabel}
                      </span>
                    ) : surah.isSpecialFriday ? (
                      <span
                        className="font-bold text-[9px] rounded-full px-1.5 py-0.2 border truncate shrink-0"
                        style={{
                          background: "var(--accent-soft)",
                          color: "var(--accent-text)",
                          borderColor: "var(--accent)",
                        }}
                      >
                        {surah.badgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div dir="ltr" className="flex items-center justify-between gap-1 w-full text-[11px]">
                    <span dir="ltr" className="tabular-nums text-[0.70rem] text-[var(--text-secondary)]">
                      #{surah.number} • {surah.readTime}
                    </span>
                    <span dir="rtl" className="font-arabic text-[0.92rem] text-[var(--accent-text)]">
                      {surah.arabicName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* FAZILAT SPOTLIGHT INVITATION CARD */}
        <div className="max-w-2xl mx-auto px-4 mb-3.5">
          <div
            className="p-3 rounded-[16px] border flex items-center justify-between gap-3 shadow-sm transition-all"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              borderLeft: "3.5px solid var(--accent)",
              boxShadow: "0 4px 16px -4px var(--accent-soft), inset 0 1px 0 var(--card-sheen)",
            }}
          >
            {/* Left: Micro-label + Fazilat Hook */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[var(--accent-text)]">
                  {spotlightVirtue.recommendedHeader}
                </span>
              </div>
              <p className="text-[0.74rem] leading-[1.35] text-[var(--text-secondary)]">
                {spotlightVirtue.fazilatText}
              </p>
            </div>

            {/* Right: Quick Actions (Read -> and 🎧 Tilawah) */}
            <div className="shrink-0 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleSurahClick(featuredSurah.number)}
                className="px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                style={{
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                }}
              >
                <span>{spotlightVirtue.readAction}</span>
                <span className="rtl:rotate-180">→</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await playAyah(featuredSurah.number, 1);
                    openPlayer();
                  } catch (e) {
                    console.warn("Failed to start tilawah for featured surah", e);
                  }
                }}
                className="w-8 h-8 rounded-xl border flex items-center justify-center transition-all active:scale-95 hover:border-[var(--accent)] text-[var(--accent-text)] bg-[var(--surface-2)]"
                style={{ borderColor: "var(--border)" }}
                title={`Play Tilawah: ${featuredSurah.name}`}
                aria-label={`Play Tilawah: ${featuredSurah.name}`}
              >
                <Headphones className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SEARCH INPUT & COMPACT # JUMP PILL */}
        <div className="max-w-2xl mx-auto px-4 space-y-2.5 mb-3.5">
          <div className="flex items-center gap-2">
            {/* Glass Pill Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]/60 pointer-events-none" />
              <input
                type="text"
                placeholder={uiStrings.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '0.78rem' }}
                className="w-full border border-[var(--border)] rounded-[14px] py-2.5 pl-11 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] transition-colors bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 shadow-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Compact # Jump Pill */}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setJumpInput("");
                setShowJumpModal(true);
              }}
              className="h-10 px-3 rounded-[14px] bg-[var(--surface)] border-[var(--border)] text-[var(--accent-text)] font-bold text-xs shrink-0 flex items-center gap-1 hover:border-[var(--accent)]"
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{uiStrings.jump}</span>
            </Button>
          </div>

          {/* MAIN TABS: SURAHS | JUZ (1-30) | SAVED */}
          <div className="w-full grid grid-cols-3 gap-1.5" style={{ minWidth: 0 }}>
            {[
              { key: "surahs" as MainTab, label: uiStrings.surahsTab },
              { key: "juz" as MainTab, label: uiStrings.juzTab },
              { key: "saved" as MainTab, label: uiStrings.savedTab },
            ].map((tab) => {
              const isActive = activeMainTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveMainTab(tab.key);
                    setSearchQuery("");
                  }}
                  className={`w-full py-2 px-1 text-center rounded-[12px] text-[11px] font-bold uppercase tracking-wider transition-all truncate select-none ${
                    isActive
                      ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_4px_18px_var(--accent-glow)]"
                      : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* VERSE OF THE DAY CARD (On Surahs Tab) */}
        {activeMainTab === "surahs" && (
          <div className="max-w-2xl mx-auto px-4 mb-3">
            <CSSOnlyTransition hoverScale={0.99} tapScale={0.98} duration={150}>
              <div
                className="relative overflow-hidden rounded-[16px] bg-[var(--surface)] border border-[var(--border)] shadow-sm cursor-pointer active:scale-[0.98] transition-transform p-3"
                style={{ borderLeft: "3.5px solid var(--accent)" }}
                onClick={() => {
                  if ("vibrate" in navigator) navigator.vibrate(15);
                  startTransition(() => {
                    if (dailySurahNumber) {
                      const startPage = SURAH_START_PAGES[dailySurahNumber] || 1;
                      navigate(`/quran/${dailySurahNumber}?page=${startPage}`, { replace: true });
                    }
                  });
                }}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    <span className="text-[10.5px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">
                      {uiStrings.verseOfTheDay}
                    </span>
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] text-[9.5px] font-semibold px-1.5 py-0">
                      {tokenizedReference}
                    </Badge>
                  </div>
                  {dailySurahNumber ? (
                    <span className="text-[11px] font-semibold text-[var(--accent-text)] inline-flex items-center gap-1 shrink-0">
                      <span>{uiStrings.readInSurah}</span>
                      <ArrowRight className="w-3 h-3 rtl:rotate-180" />
                    </span>
                  ) : null}
                </div>

                <p className="text-[var(--text-primary)] text-xs font-medium leading-relaxed line-clamp-2">
                  "{dailyAyah?.content || "Loading..."}"
                </p>
              </div>
            </CSSOnlyTransition>
          </div>
        )}

        {/* TAB CONTENT: JUZ (1-30) LIST */}
        {activeMainTab === "juz" && (
          <div className="max-w-2xl mx-auto px-4 space-y-2">
            {filteredJuzList.map((juz) => (
              <button
                key={juz.number}
                type="button"
                onClick={() => handleJuzClick(juz)}
                className="w-full text-left outline-none active:scale-[0.98] transition-transform duration-150 group"
              >
                <div
                  className="w-full flex items-center justify-between gap-3 p-3.5 rounded-[18px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors"
                  style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
                >
                  {/* Left: 8-Point Star with Juz Number */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-[40px] h-[40px] flex items-center justify-center shrink-0">
                      <svg width="40" height="40" viewBox="0 0 42 42" className="w-[40px] h-[40px] absolute inset-0">
                        <rect x="8" y="8" width="26" height="26" rx="3.5" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
                        <rect x="8" y="8" width="26" height="26" rx="3.5" transform="rotate(45 21 21)" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.2" />
                      </svg>
                      <span className="relative z-10 font-bold text-[var(--accent-text)] text-[0.82rem] leading-none select-none">
                        {juz.number}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors leading-tight truncate">
                        Juz {juz.number} • {juz.nameEnglish}
                      </h3>
                      <p className="text-[0.76rem] text-[var(--text-secondary)] font-medium leading-snug truncate">
                        Starts: {juz.startSurahName} {juz.startSurahNumber}:{juz.startAyah}
                      </p>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <span
                          className="font-mono text-[9px] font-bold rounded px-1.5 py-0.5 border"
                          style={{
                            background: "var(--accent-soft)",
                            color: "var(--accent-text)",
                            borderColor: "var(--border)",
                          }}
                        >
                          Pages {juz.startPage}–{juz.endPage}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Arabic Calligraphy */}
                  <div className="shrink-0 text-right flex flex-col items-end justify-center pl-2">
                    <span className="font-arabic font-bold text-lg text-[var(--accent-text)] leading-none select-none">
                      {juz.nameArabic}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                      <span>Read</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* TAB CONTENT: SURAHS OR SAVED LIST */}
        {activeMainTab !== "juz" && (
          <div className="max-w-2xl mx-auto px-4" ref={listRef}>
            {activeMainTab === "saved" ? (
              <div className="space-y-4">
                {/* 5-Colour Smart Bookmarks Section */}
                {placedColorBookmarks.length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-[var(--accent)]" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                          5-Colour Smart Bookmarks ({placedColorBookmarks.length})
                        </h3>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)]">With Moves As You Read</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {placedColorBookmarks.map((bm) => {
                        const colDef = BOOKMARK_COLORS.find((c) => c.id === bm.colorId);
                        return (
                          <div
                            key={bm.colorId}
                            className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all hover:border-[var(--accent)]/50"
                            style={{
                              backgroundColor: "var(--surface)",
                              borderColor: "var(--border)",
                              boxShadow: "inset 0 1px 0 var(--card-sheen)",
                            }}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Color Dot Ribbon */}
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                                style={{
                                  backgroundColor: colDef?.bgHex || "var(--accent-soft)",
                                  border: `1.5px solid ${colDef?.hex || "var(--accent)"}`,
                                }}
                              >
                                <div
                                  className="w-4 h-4 rounded-full shadow-sm"
                                  style={{ backgroundColor: colDef?.hex }}
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-[var(--text-primary)] truncate">
                                    {bm.surahName} {bm.surah}:{bm.ayah}
                                  </h4>
                                  {bm.autoMove && (
                                    <Badge className="text-[9px] font-bold px-1.5 py-0 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                      ⚡ Auto-moving
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                                  Mushaf Page {bm.page} • {colDef?.name} Bookmark
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <Button
                                size="sm"
                                onClick={() => navigate(`/quran/${bm.surah}?page=${bm.page}`, { replace: true })}
                                className="h-8 rounded-xl text-xs font-bold gap-1 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] border-none"
                              >
                                <span>Resume</span>
                                <ArrowRight className="w-3 h-3" />
                              </Button>
                              <button
                                type="button"
                                onClick={() => removeColorBookmark(bm.colorId)}
                                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                title="Remove bookmark"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Starred Surahs Section */}
                {filteredSurahs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-1 mb-1">
                      <Star className="w-4 h-4 text-[var(--accent)]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                        Starred Surahs ({filteredSurahs.length})
                      </h3>
                    </div>
                    <div className="flex flex-col gap-2">
                      {filteredSurahs.map((surah, index) => (
                        <div key={surah.number} style={{ contentVisibility: "auto", containIntrinsicSize: "88px" }}>
                          <SurahCard
                            surah={surah}
                            index={index}
                            isDark={isDark}
                            isBookmarked={bookmarkedSurahs.includes(surah.number)}
                            ayahsLabel={uiStrings.ayahs}
                            onClick={handleSurahClick}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State when both are empty */}
                {placedColorBookmarks.length === 0 && filteredSurahs.length === 0 && (
                  <div className="text-center py-12 px-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] max-w-md mx-auto my-6 shadow-sm">
                    <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] flex items-center justify-center mx-auto mb-3 text-[var(--accent-text)]">
                      <Star className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">No Saved Items Yet</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                      Use the <span className="text-[var(--accent-text)] font-bold">5 Jewel-Toned Bookmarks</span> inside the reader or tap the <span className="text-[var(--accent-text)] font-bold">★ Star</span> icon to save surahs and ayahs here.
                    </p>
                  </div>
                )}
              </div>
            ) : filteredSurahs.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {uiStrings.surahsTab} ({filteredSurahs.length})
                  </span>
                  <div className="flex items-center gap-1">
                    {[
                      { key: "all" as SurahSubFilter, label: uiStrings.all },
                      { key: "meccan" as SurahSubFilter, label: uiStrings.meccan },
                      { key: "medinan" as SurahSubFilter, label: uiStrings.medinan },
                    ].map((sub) => {
                      const isSubActive = surahSubFilter === sub.key;
                      return (
                        <button
                          key={sub.key}
                          type="button"
                          onClick={() => setSurahSubFilter(sub.key)}
                          className={`py-0.5 px-2 rounded-full text-[9.5px] font-bold uppercase tracking-wider transition-all border ${
                            isSubActive
                              ? "bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)]"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {filteredSurahs.map((surah, index) => (
                  <div key={surah.number} style={{ contentVisibility: "auto", containIntrinsicSize: "88px" }}>
                    <SurahCard
                      surah={surah}
                      index={index}
                      isDark={isDark}
                      isBookmarked={bookmarkedSurahs.includes(surah.number)}
                      ayahsLabel={uiStrings.ayahs}
                      onClick={handleSurahClick}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Search className="w-6 h-6 text-[var(--text-secondary)]" />
                </div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">No surahs found</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Try a different name or number</p>
              </div>
            )}
          </div>
        )}

        {/* # JUMP MODAL */}
        {showJumpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-2xl"
              style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.4)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Jump to Quran</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowJumpModal(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Jump Category Selector */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { key: "page" as const, label: "Page (1-604)" },
                  { key: "juz" as const, label: "Juz (1-30)" },
                  { key: "surah" as const, label: "Surah (1-114)" },
                ].map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      setJumpCategory(c.key);
                      setJumpInput("");
                    }}
                    className={`py-1.5 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                      jumpCategory === c.key
                        ? "bg-[var(--accent)] text-[var(--on-accent)]"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[var(--text-secondary)] block">
                  Enter {jumpCategory === "page" ? "Page Number (1–604)" : jumpCategory === "juz" ? "Juz Number (1–30)" : "Surah Number (1–114)"}:
                </label>
                <input
                  type="number"
                  min={1}
                  max={jumpCategory === "page" ? 604 : jumpCategory === "juz" ? 30 : 114}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={jumpCategory === "page" ? "e.g. 250" : jumpCategory === "juz" ? "e.g. 15" : "e.g. 18"}
                  className="w-full border border-[var(--border)] rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJumpGo();
                  }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJumpModal(false)}
                  className="flex-1 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleJumpGo}
                  disabled={!jumpInput.trim()}
                  className="flex-1 rounded-xl text-xs font-bold"
                  style={{
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                  }}
                >
                  Go to {jumpCategory}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM KHATMAH DAYS MODAL */}
        {showCustomModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-2xl sheet-scroll-contain"
              style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.4)", overscrollBehavior: 'contain' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">Custom Khatmah Plan</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--text-secondary)] block">
                  In how many days would you like to finish the 604 pages of the Holy Quran?
                </label>
                <input
                  type="number"
                  min={7}
                  max={365}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full border border-[var(--border)] rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[var(--accent)] bg-[var(--surface-2)] text-[var(--text-primary)]"
                  autoFocus
                />
                {parseInt(customDays, 10) >= 7 && (
                  <p className="text-[10px] text-[var(--accent-text)] font-mono">
                    ≈ {Math.ceil(604 / Math.max(1, parseInt(customDays, 10)))} pages per day
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomModal(false)}
                  className="flex-1 rounded-xl text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCustomStart}
                  className="flex-1 rounded-xl text-xs font-bold"
                  style={{
                    background: "var(--accent)",
                    color: "var(--on-accent)",
                  }}
                >
                  Start Plan
                </Button>
              </div>
            </div>
          </div>
        )}
        {/* QURAN FEATURES ONBOARDING GUIDE MODAL */}
        <QuranGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />
      </div>
    </PageTransition>
  );
}
