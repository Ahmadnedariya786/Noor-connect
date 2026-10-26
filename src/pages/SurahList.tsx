import { useState, useMemo, useEffect, memo, useRef, startTransition } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Sparkles,
  History,
  ArrowRight,
  Star,
  BookOpen,
  Calendar,
  Plus,
  RotateCcw,
  CheckCircle2,
  Bookmark,
  Hash,
  Moon,
  Headphones,
  Zap,
} from "lucide-react";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { PageTransition } from "@/components/PageTransition";
import { useSettings } from "@/contexts/SettingsContext";
import { useTilawah } from "@/contexts/TilawahContext";
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
import { Preferences } from "@capacitor/preferences";
import { CSSOnlyTransition } from "@/components/AdaptiveMotion";
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

const BOOKMARKS_KEY = "quran-bookmarks";

interface SurahCardProps {
  surah: SurahInfo;
  index: number;
  isDark: boolean;
  isBookmarked: boolean;
  onClick: (number: number) => void;
}

const SurahCard = memo(
  function SurahCard({ surah, isBookmarked, onClick }: SurahCardProps) {
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
                  {surah.revelationType.toUpperCase()}
                </span>
                <span className="text-[var(--text-secondary)] text-[0.72rem] font-semibold whitespace-nowrap shrink-0">
                  • {surah.numberOfAyahs}&nbsp;AYAHS
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

// Often Read Sunnah Surahs strip definition
const SUNNAH_SURAHS = [
  { number: 18, name: "Al-Kahf", arabic: "الكهف", badge: "friday" },
  { number: 67, name: "Al-Mulk", arabic: "الملك", badge: "night" },
  { number: 36, name: "Ya-Sin", arabic: "يس", badge: null },
  { number: 55, name: "Ar-Rahman", arabic: "الرحمن", badge: null },
  { number: 56, name: "Al-Waqi'ah", arabic: "الواقعة", badge: null },
];

type MainTab = "surahs" | "juz" | "saved";
type SurahSubFilter = "all" | "meccan" | "medinan";

export default function SurahList() {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === "dark";
  const navigate = useNavigate();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("surahs");
  const [surahSubFilter, setSurahSubFilter] = useState<SurahSubFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Khatmah Planner State
  const [khatmahPlan, setKhatmahPlan] = useState<KhatmahPlan | null>(() => getKhatmahPlan());
  const [customDays, setCustomDays] = useState("30");
  const [showCustomModal, setShowCustomModal] = useState(false);

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
  } | null>(null);

  const [bookmarkedSurahs, setBookmarkedSurahs] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      // Return empty list on parse error
      return [];
    }
  });

  const { isPlaying, currentSurah, currentAyah, reciter, openPlayer } = useTilawah();
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

  // Time & day awareness for Sunnah badges
  const isFridayToday = useMemo(() => new Date().getDay() === 5, []);
  const isNightTime = useMemo(() => {
    const h = new Date().getHours();
    return h >= 18 || h <= 4;
  }, []);

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
    startTransition(() => {
      navigate(`/quran/surah-${surahNumber}`, { replace: true });
    });
  };

  const handleJuzClick = (juz: JuzItem) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const url = prepareReaderRouteForPage(juz.startPage);
    startTransition(() => {
      navigate(url, { replace: true });
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
        const url = prepareReaderRouteForPage(found.startPage);
        setShowJumpModal(false);
        navigate(url, { replace: true });
      }
    } else if (jumpCategory === "surah") {
      const surahNum = Math.min(114, Math.max(1, val));
      setShowJumpModal(false);
      navigate(`/quran/surah-${surahNum}`, { replace: true });
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

        {/* Illuminated Semantic Header */}
        <div className="max-w-2xl mx-auto px-4 pt-3 pb-2 safe-top">
          <div
            className="relative overflow-hidden p-5 sm:p-6 mb-3"
            style={{
              background: "linear-gradient(145deg, rgba(16, 85, 60, 0.28), var(--surface))",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 1px 0 var(--card-sheen)",
              borderRadius: "22px",
            }}
          >
            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="font-arabic text-sm sm:text-base text-[var(--accent-text)] font-semibold mb-1 drop-shadow-sm select-none">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ • ٱلْقُرْآنُ ٱلْكَرِيمُ
              </p>
              <h1 className="text-2xl sm:text-3xl font-arabic font-bold text-[var(--text-primary)] tracking-wide">
                Al-Quran Al-Kareem
              </h1>
              <p className="text-[var(--text-secondary)] text-xs font-medium max-w-[280px] leading-relaxed mt-1">
                Read, listen, and contemplate the divine revelation
              </p>

              {/* Recessed Metric Pods */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-sm mt-3.5">
                {[
                  { label: "SURAHS", value: "114" },
                  { label: "AYAHS", value: "6,236" },
                  { label: "JUZ", value: "30" },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[14px] p-2 sm:p-2.5 text-center shadow-inner"
                  >
                    <p className="text-[var(--accent-text)] text-base font-black tracking-tight leading-none">
                      {stat.value}
                    </p>
                    <p className="text-[var(--text-secondary)] text-[9px] uppercase font-bold tracking-wider mt-1 truncate">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 🎧 TILAWAH AUDIO PLAYER ENTRY BANNER */}
        <div className="max-w-2xl mx-auto px-4 mb-3.5">
          <div
            onClick={openPlayer}
            role="button"
            tabIndex={0}
            className="p-3.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] group shadow-md"
            style={{
              background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)",
              border: "1.5px solid var(--accent)",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 var(--card-sheen)",
            }}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                  color: "var(--on-accent)",
                }}
              >
                <Headphones className="w-5 h-5 fill-current" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors truncate">
                    🎧 Tilawah Player & Sleep Timer
                  </h3>
                  {isPlaying && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                  {isPlaying
                    ? `Now Playing: Surah ${currentSurah}:${currentAyah} • ${reciter.shortName}`
                    : "6 Reciters • Ayah-by-Ayah • Gapless Audio • Sleep Timer"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm flex items-center gap-1.5 transition-colors"
                style={{
                  backgroundColor: isPlaying ? "var(--accent)" : "var(--surface-2)",
                  color: isPlaying ? "var(--on-accent)" : "var(--accent-text)",
                  borderColor: "var(--accent)",
                }}
              >
                {isPlaying ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>Active</span>
                  </>
                ) : (
                  <>
                    <span>Listen</span>
                    <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* SMART PACED KHATMAH PLANNER CARD (604 Mushaf Pages) */}
        <div className="max-w-2xl mx-auto px-4 mb-3.5">
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
                    Smart Khatmah Planner
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
                  Page {khatmahPlan?.currentPage} / 604 ({portionInfo.percent}%)
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
                    <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                      Today's Portion ({portionInfo.portionPages} Pages)
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
                    <Plus className="w-3 h-3 mr-1 shrink-0" />
                    <span>+1 Page</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCompleteTodayPortion}
                    style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0 4px' }}
                    className="h-8 rounded-xl font-bold bg-[var(--surface-2)] border-[var(--border)] text-emerald-400"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400 shrink-0" />
                    <span>✓ Done Today</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetKhatmah}
                    style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', padding: '0 4px' }}
                    className="h-8 rounded-xl font-bold text-[var(--text-secondary)] hover:text-rose-400"
                  >
                    <RotateCcw className="w-3 h-3 mr-1 shrink-0" />
                    <span>↺ Reset</span>
                  </Button>
                </div>
              </div>
            ) : (
              /* No Active Plan: Preset Chooser */
              <div className="space-y-2.5">
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Start a paced Quran Khatmah tailored to your target duration:
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

        {/* OFTEN READ SUNNAH SURAHS STRIP */}
        <div className="max-w-2xl mx-auto px-4 mb-3.5">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Often Read Sunnah Surahs
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            {SUNNAH_SURAHS.map((surah) => {
              const isKahfFriday = surah.badge === "friday" && isFridayToday;
              const isMulkNight = surah.badge === "night" && isNightTime;

              return (
                <button
                  key={surah.number}
                  type="button"
                  onClick={() => handleSurahClick(surah.number)}
                  className={`px-3 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all active:scale-[0.97] ${
                    isKahfFriday
                      ? "bg-gradient-to-r from-emerald-950/80 to-[var(--surface)] border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                      : isMulkNight
                      ? "bg-gradient-to-r from-indigo-950/80 to-[var(--surface)] border-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                      : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]"
                  }`}
                  style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] truncate">{surah.name}</span>
                      {isKahfFriday && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          ✦ Jumu'ah
                        </span>
                      )}
                      {isMulkNight && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          🌙 Night
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--accent-text)] font-arabic">{surah.arabic} • #{surah.number}</span>
                  </div>
                </button>
              );
            })}
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
                placeholder={
                  activeMainTab === "juz"
                    ? "Search Juz name or number..."
                    : "Search Surah name or number..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
              <span>Jump</span>
            </Button>
          </div>

          {/* MAIN TABS: SURAHS | JUZ (1-30) | SAVED */}
          <div className="w-full grid grid-cols-3 gap-1.5" style={{ minWidth: 0 }}>
            {[
              { key: "surahs" as MainTab, label: "Surahs" },
              { key: "juz" as MainTab, label: "Juz (1-30)" },
              { key: "saved" as MainTab, label: "★ Saved" },
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

          {/* SURAH SUB-FILTERS (All, Meccan, Medinan) when on Surahs tab */}
          {activeMainTab === "surahs" && (
            <div className="flex items-center gap-1.5 pt-1">
              {[
                { key: "all" as SurahSubFilter, label: "All" },
                { key: "meccan" as SurahSubFilter, label: "Meccan" },
                { key: "medinan" as SurahSubFilter, label: "Medinan" },
              ].map((sub) => {
                const isSubActive = surahSubFilter === sub.key;
                return (
                  <button
                    key={sub.key}
                    type="button"
                    onClick={() => setSurahSubFilter(sub.key)}
                    className={`py-1 px-3 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      isSubActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--accent)]"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* CONTINUE READING LUXURY CARD */}
        {lastRead && (
          <div className="max-w-2xl mx-auto px-4 mb-3.5">
            <div
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(15);
                startTransition(() => {
                  navigate(`/quran/surah-${lastRead.number}`, { replace: true });
                });
              }}
              className="w-full flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-[18px] border border-[var(--accent)] cursor-pointer active:scale-[0.98] transition-transform duration-150"
              style={{
                background: "linear-gradient(135deg, var(--surface), var(--surface-2))",
                boxShadow: "0 4px 18px var(--accent-glow)",
              }}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent-text)]">
                  <History className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-bold text-[var(--accent-text)] uppercase tracking-wider mb-0.5">
                    CONTINUE READING
                  </p>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                    Surah {lastReadInfo?.englishName || lastRead.name}
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Surah #{lastRead.number}{lastRead.page ? ` • Page ${lastRead.page}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0 text-right">
                <span className="font-arabic font-bold text-base sm:text-lg text-[var(--accent-text)] leading-tight select-none">
                  {lastReadInfo?.name || lastRead.arabicName || ""}
                </span>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-tight shadow-sm select-none"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "var(--on-accent)",
                  }}
                >
                  <span>Resume</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* VERSE OF THE DAY CARD (On Surahs Tab) */}
        {activeMainTab === "surahs" && (
          <div className="max-w-2xl mx-auto px-4 mb-3.5">
            <CSSOnlyTransition hoverScale={0.99} tapScale={0.98} duration={150}>
              <div
                className="relative overflow-hidden rounded-[20px] bg-[var(--surface)] border border-[var(--border)] shadow-md cursor-pointer active:scale-[0.98] transition-transform p-4 sm:p-5"
                onClick={() => {
                  if ("vibrate" in navigator) navigator.vibrate(15);
                  startTransition(() => {
                    if (dailySurahNumber) {
                      navigate(`/quran/surah-${dailySurahNumber}`, { replace: true });
                    }
                  });
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                    {dailyAyah?.title || "Verse of the Day"}
                  </span>
                </div>

                <div
                  className="bg-[var(--surface-2)] rounded-xl p-3 sm:p-3.5 border border-[var(--border)] mb-2 shadow-sm"
                  style={{ borderLeft: "3px solid var(--accent)" }}
                >
                  <p className="text-[var(--text-primary)] text-xs sm:text-sm font-medium leading-relaxed mb-2">
                    "{dailyAyah?.content || "Loading..."}"
                  </p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] text-[10px] font-semibold px-2 py-0.5">
                      {tokenizedReference}
                    </Badge>
                    {dailySurahNumber ? (
                      <span className="text-xs font-semibold text-[var(--accent-text)] inline-flex items-center gap-1">
                        <span>Read in Surah</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    ) : null}
                  </div>
                </div>

                {dailyAyah?.reflection && (
                  <p className="text-[var(--text-secondary)] text-[11px] italic leading-relaxed">
                    {dailyAyah.reflection}
                  </p>
                )}
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
                                onClick={() => navigate(`/quran/surah-${bm.surah}`)}
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
                {filteredSurahs.map((surah, index) => (
                  <div key={surah.number} style={{ contentVisibility: "auto", containIntrinsicSize: "88px" }}>
                    <SurahCard
                      surah={surah}
                      index={index}
                      isDark={isDark}
                      isBookmarked={bookmarkedSurahs.includes(surah.number)}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4 shadow-2xl"
              style={{ boxShadow: "0 12px 36px rgba(0,0,0,0.4)" }}
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
      </div>
    </PageTransition>
  );
}
