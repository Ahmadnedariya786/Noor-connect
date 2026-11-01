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
  FileText,
  Trash2,
  ExternalLink,
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

type MainTab = "surahs" | "juz" | "pages" | "saved";
type SurahSubFilter = "all" | "meccan" | "medinan";
type SavedSubTab = "all" | "bookmarks" | "notes" | "folders";

interface QuranReflectionNote {
  id: string;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  noteText: string;
  category: 'tafsir' | 'tadabbur' | 'dua' | 'action';
  folder?: string;
  updatedAt: number;
}

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
  const [isSortAscending, setIsSortAscending] = useState(true);
  const [savedSubTab, setSavedSubTab] = useState<SavedSubTab>("all");
  const [pageRangeFilter, setPageRangeFilter] = useState<string>("all");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [expandedJuzMap, setExpandedJuzMap] = useState<Record<number, boolean>>({});

  // User Reflection Notes from localStorage
  const [userNotes, setUserNotes] = useState<QuranReflectionNote[]>(() => {
    try {
      const raw = localStorage.getItem('noor_quran_notes_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      return [];
    }
    return [];
  });

  useEffect(() => {
    const syncNotes = () => {
      try {
        const raw = localStorage.getItem('noor_quran_notes_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setUserNotes(parsed);
        }
      } catch {
        // Safe catch
      }
    };
    window.addEventListener('focus', syncNotes);
    window.addEventListener('noor-quran-notes-updated', syncNotes);
    return () => {
      window.removeEventListener('focus', syncNotes);
      window.removeEventListener('noor-quran-notes-updated', syncNotes);
    };
  }, []);

  const handleDeleteNote = (id: string) => {
    const updated = userNotes.filter((n) => n.id !== id);
    setUserNotes(updated);
    try {
      localStorage.setItem('noor_quran_notes_v1', JSON.stringify(updated));
    } catch {
      // Safe catch
    }
    toast.success("Note removed from library");
  };

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
    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ format?: MushafLineFormat }>;
      if (custom?.detail?.format) {
        setLineFormatState(custom.detail.format);
      }
    };
    window.addEventListener('noor-mushaf-format-changed', handler);
    return () => window.removeEventListener('noor-mushaf-format-changed', handler);
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
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Return empty list on parse error
      return [];
    }
    return [];
  });

  const { isPlaying, currentSurah, currentAyah, openPlayer, playAyah } = useTilawah();
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
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) setBookmarkedSurahs(parsed);
          return;
        }
      } catch {
        // Fallback to localStorage
      }
      try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setBookmarkedSurahs(parsed);
        }
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
          (s) => s.revelationType === "Medinan" || (s as { revelationType?: string }).revelationType === "Madinah"
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

    return isSortAscending ? surahs : [...surahs].reverse();
  }, [allSurahs, activeMainTab, surahSubFilter, bookmarkedSurahs, searchQuery, isSortAscending]);

  // Filter Juz
  const filteredJuzList = useMemo(() => {
    let list = JUZ_LIST;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = JUZ_LIST.filter(
        (j) =>
          j.number.toString() === q ||
          j.nameEnglish.toLowerCase().includes(q) ||
          j.nameArabic.includes(q) ||
          j.startSurahName.toLowerCase().includes(q)
      );
    }
    return isSortAscending ? list : [...list].reverse();
  }, [searchQuery, isSortAscending]);

  // 604 Madinah Pages Metadata
  const allPages = useMemo(() => {
    const pages = [];
    for (let p = 1; p <= 604; p++) {
      let surahNum = 1;
      for (let s = 1; s <= 114; s++) {
        if (SURAH_START_PAGES[s] <= p) {
          surahNum = s;
        } else {
          break;
        }
      }
      const sInfo = quranService.getSurahInfo(surahNum);
      const juz = JUZ_LIST.find((j) => p >= j.startPage && p <= j.endPage)?.number || 1;
      pages.push({
        page: p,
        surahNumber: surahNum,
        surahName: sInfo?.englishName || `Surah ${surahNum}`,
        surahArabicName: sInfo?.name || '',
        juzNumber: juz,
      });
    }
    return pages;
  }, []);

  const filteredPagesList = useMemo(() => {
    let pages = allPages;
    if (pageRangeFilter !== "all") {
      const [start, end] = pageRangeFilter.split("-").map(Number);
      pages = pages.filter((p) => p.page >= start && p.page <= end);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      pages = pages.filter(
        (p) =>
          p.page.toString() === q ||
          p.surahName.toLowerCase().includes(q) ||
          p.surahArabicName.includes(q) ||
          `juz ${p.juzNumber}`.includes(q) ||
          p.juzNumber.toString() === q
      );
    }
    return isSortAscending ? pages : [...pages].reverse();
  }, [allPages, pageRangeFilter, searchQuery, isSortAscending]);

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
              padding: "10px 12px",
              background: "linear-gradient(145deg, rgba(16, 85, 60, 0.22), var(--surface))",
              border: "1px solid var(--border)",
              boxShadow: "inset 0 1px 0 var(--card-sheen)",
            }}
          >
            <div className="min-w-0 flex-1">
              <h1 className="text-[1.04rem] font-extrabold text-[var(--text-primary)] tracking-wide leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                Al-Quran Al-Kareem
              </h1>
              <p className="text-[var(--text-secondary)] text-[0.68rem] font-medium leading-tight mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                {uiStrings.subtitleStats}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowGuideModal(true)}
                title="Quran Features Guide"
                className="px-2 py-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] font-bold text-[0.70rem] flex items-center gap-1 hover:border-[var(--accent)] transition-all shadow-sm active:scale-95 shrink-0"
              >
                <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">{uiStrings.guideBtn}</span>
              </button>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--accent-text)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                }}
              >
                <BookOpen className="w-3.5 h-3.5" />
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
                      <span className="text-[0.65rem] uppercase font-bold text-[var(--text-secondary)] tracking-[0.04em] whitespace-nowrap block">
                        TODAY'S GOAL • {portionInfo.portionPages}P
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
                  <div className="flex items-center gap-1.5 w-full" style={{ minWidth: 0 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAdvancePage}
                      style={{ flex: 1, minWidth: 0, padding: '8px 6px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      className="h-8 rounded-[10px] font-bold bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)] inline-flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      <span>1 Page</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCompleteTodayPortion}
                      style={{ flex: 1.35, minWidth: 0, padding: '8px 10px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      className="h-8 rounded-[10px] font-bold bg-[var(--surface-2)] border-[var(--border)] text-emerald-400 inline-flex items-center justify-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Done Today</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResetKhatmah}
                      style={{ flex: 0.85, minWidth: 0, padding: '8px 6px', fontSize: '0.72rem', whiteSpace: 'nowrap' }}
                      className="h-8 rounded-[10px] font-semibold text-[var(--text-secondary)] hover:text-rose-400 inline-flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3 shrink-0" />
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
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5" style={{ minWidth: 0 }}>
                    {[
                      { days: 7, label: "7 Days", sub: "~86 p/d" },
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

              {/* Spiritual Hasanat & Arabic Letters Counter */}
              <div
                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between gap-2 shadow-xs"
                style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] truncate">
                      Spiritual Hasanat Counter (حسنة ×10)
                    </div>
                    <div className="text-[11px] font-semibold text-[var(--text-primary)] truncate">
                      ~{((khatmahPlan?.currentPage || lastRead?.page || 1) * 562).toLocaleString()} Letters Read (حروف)
                    </div>
                  </div>
                </div>
                <Badge
                  className="font-mono font-bold text-[10px] px-2 py-0.5 rounded-full shrink-0 border"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-text)",
                    borderColor: "var(--accent)",
                  }}
                >
                  +{(((khatmahPlan?.currentPage || lastRead?.page || 1) * 5620)).toLocaleString()} Hasanat
                </Badge>
              </div>
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

          {/* MAIN TABS: SURAHS | JUZ (1-30) | PAGES (1-604) | SAVED + SORT ⇅ */}
          <div className="w-full flex items-center gap-1.5" style={{ minWidth: 0 }}>
            <div className="grid grid-cols-4 gap-1 flex-1" style={{ minWidth: 0 }}>
              {[
                { key: "surahs" as MainTab, label: uiStrings.surahsTab || "Surahs" },
                { key: "juz" as MainTab, label: uiStrings.juzTab || "Juz" },
                { key: "pages" as MainTab, label: uiStrings.pagesTab || "Pages" },
                { key: "saved" as MainTab, label: uiStrings.savedTab || "★ Saved" },
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
                    className={`w-full py-2 px-1 text-center rounded-[12px] transition-all select-none ${
                      isActive
                        ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_4px_18px_var(--accent-glow)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-2)]"
                    }`}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSortAscending((prev) => !prev);
                toast.info(isSortAscending ? "Sorted Descending (114→1 / 604→1)" : "Sorted Ascending (1→114 / 1→604)");
              }}
              title={isSortAscending ? "Sort: Ascending (tap to invert)" : "Sort: Descending (tap to invert)"}
              className="h-9 px-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--border)] text-[var(--accent-text)] font-bold text-xs shrink-0 flex items-center gap-1 hover:border-[var(--accent)] active:scale-95 transition-all shadow-sm"
            >
              <span className="text-sm font-bold">⇅</span>
              <span className="text-[10px] uppercase font-bold tracking-tight hidden sm:inline">
                {isSortAscending ? "Asc" : "Desc"}
              </span>
            </button>
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

        {/* TAB 1: SURAHS */}
        {activeMainTab === "surahs" && (
          <div className="max-w-2xl mx-auto px-4" ref={listRef}>
            {filteredSurahs.length > 0 ? (
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

        {/* TAB 2: JUZ (1-30) LIST WITH DIRECT SURAH CHIPS */}
        {activeMainTab === "juz" && (
          <div className="max-w-2xl mx-auto px-4 space-y-2.5">
            {filteredJuzList.map((juz) => {
              const surahsInThisJuz = allSurahs.filter((s) => {
                const sp = SURAH_START_PAGES[s.number] || 1;
                return sp >= juz.startPage && sp <= juz.endPage;
              });
              const displaySurahs = surahsInThisJuz.length > 0 ? surahsInThisJuz : [allSurahs.find(s => s.number === juz.startSurahNumber)!].filter(Boolean);

              return (
                <div
                  key={juz.number}
                  className="w-full rounded-[18px] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/40 transition-colors p-3.5 space-y-2 shadow-xs"
                  style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
                >
                  <button
                    type="button"
                    onClick={() => handleJuzClick(juz)}
                    className="w-full text-left outline-none flex items-center justify-between gap-3 active:scale-[0.99] transition-transform group"
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
                        <span>Read Juz</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </button>

                  {/* Expandable Surah Jump Chips */}
                  <div className="pt-1.5 border-t border-[var(--border)]/50 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)]">Surahs:</span>
                    {(expandedJuzMap[juz.number] ? displaySurahs : displaySurahs.slice(0, 6)).map((s) => (
                      <button
                        key={s.number}
                        type="button"
                        onClick={() => handleSurahClick(s.number)}
                        className="px-2 py-0.5 rounded-lg text-[9.5px] font-semibold bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent-text)] text-[var(--text-primary)] transition-all active:scale-95"
                      >
                        #{s.number} {s.englishName}
                        {expandedJuzMap[juz.number] && s.numberOfAyahs ? ` (1:${s.numberOfAyahs})` : ''}
                      </button>
                    ))}
                    {displaySurahs.length > 6 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedJuzMap((prev) => ({ ...prev, [juz.number]: !prev[juz.number] }))
                        }
                        className="text-[9.5px] font-bold text-[var(--accent-text)] hover:underline px-1 py-0.5"
                      >
                        {expandedJuzMap[juz.number] ? 'Show less ▴' : `+${displaySurahs.length - 6} more ▾`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: PAGES (1-604) MADINAH MUSHAF CATALOG */}
        {activeMainTab === "pages" && (
          <div className="max-w-2xl mx-auto px-4 space-y-3">
            {/* Quick Page Range Scroller */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: "all", label: "All 1-604" },
                { id: "1-100", label: "p. 1–100" },
                { id: "101-200", label: "p. 101–200" },
                { id: "201-300", label: "p. 201–300" },
                { id: "301-400", label: "p. 301–400" },
                { id: "401-500", label: "p. 401–500" },
                { id: "501-604", label: "p. 501–604" },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setPageRangeFilter(r.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    pageRangeFilter === r.id
                      ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-xs"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* List of Pages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredPagesList.slice(0, 80).map((pg) => (
                <button
                  key={pg.page}
                  type="button"
                  onClick={() => {
                    if ("vibrate" in navigator) navigator.vibrate(15);
                    navigate(`/quran/${pg.surahNumber}?page=${pg.page}`, { replace: true });
                  }}
                  className="w-full text-left p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all flex items-center justify-between gap-2.5 active:scale-[0.98] shadow-xs group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] group-hover:border-[var(--accent)] flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] uppercase font-bold text-[var(--text-secondary)] leading-none">P.</span>
                      <span className="text-xs font-bold text-[var(--accent-text)] font-mono leading-tight">{pg.page}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-[var(--accent-text)]">
                        {pg.surahName}
                      </h4>
                      <p className="text-[10.5px] text-[var(--text-secondary)] truncate">
                        Juz {pg.juzNumber} • Surah #{pg.surahNumber}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-arabic font-bold text-sm text-[var(--accent-text)] block">
                      {pg.surahArabicName}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] group-hover:underline">
                      Open →
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {filteredPagesList.length > 80 && (
              <p className="text-center text-xs text-[var(--text-secondary)] py-2">
                Showing 80 of {filteredPagesList.length} pages. Use the range tabs above or the # Jump button to quickly reach any page!
              </p>
            )}
          </div>
        )}

        {/* TAB 4: SAVED PERSONAL LIBRARY (BOOKMARKS, NOTES & REFLECTIONS, FOLDERS) */}
        {activeMainTab === "saved" && (
          <div className="max-w-2xl mx-auto px-4 space-y-3" ref={listRef}>
            {/* 4 Library Sub-Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-[var(--surface)] border border-[var(--border)] shadow-xs">
              {[
                { id: "all" as SavedSubTab, label: "All" },
                { id: "bookmarks" as SavedSubTab, label: `Marks (${placedColorBookmarks.length})` },
                { id: "notes" as SavedSubTab, label: `Notes (${userNotes.length})` },
                { id: "folders" as SavedSubTab, label: "Folders" },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSavedSubTab(st.id)}
                  className={`py-1.5 px-0.5 rounded-lg text-[10.5px] font-bold text-center transition-all truncate ${
                    savedSubTab === st.id
                      ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Sub-Tab: 5-COLOUR BOOKMARKS (or in ALL) */}
            {(savedSubTab === "all" || savedSubTab === "bookmarks") && placedColorBookmarks.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      5-Colour Smart Bookmarks ({placedColorBookmarks.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Auto-moves with reading</span>
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

            {/* Sub-Tab: NOTES & REFLECTIONS (or in ALL) */}
            {(savedSubTab === "all" || savedSubTab === "notes") && userNotes.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[var(--accent)]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Notes & Reflections ({userNotes.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)]">Personal Tadabbur Library</span>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {userNotes.map((note) => {
                    const isUrdu = /[\u0600-\u06FF]/.test(note.noteText);
                    return (
                      <div
                        key={note.id}
                        className="p-3.5 rounded-2xl border space-y-2 transition-all hover:border-[var(--accent)]/50"
                        style={{
                          backgroundColor: "var(--surface)",
                          borderColor: "var(--border)",
                          boxShadow: "inset 0 1px 0 var(--card-sheen)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-[var(--text-primary)]">
                              {note.surahName} {note.surahNumber}:{note.ayahNumber}
                            </span>
                            <Badge
                              className="text-[9px] font-bold px-1.5 py-0 capitalize"
                              style={{
                                background:
                                  note.category === "tadabbur"
                                    ? "var(--accent-soft)"
                                    : note.category === "dua"
                                    ? "rgba(16, 185, 129, 0.15)"
                                    : note.category === "action"
                                    ? "rgba(245, 158, 11, 0.15)"
                                    : "var(--surface-2)",
                                color:
                                  note.category === "tadabbur"
                                    ? "var(--accent-text)"
                                    : note.category === "dua"
                                    ? "#10B981"
                                    : note.category === "action"
                                    ? "#F59E0B"
                                    : "var(--text-secondary)",
                              }}
                            >
                              {note.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                const startPage = SURAH_START_PAGES[note.surahNumber] || 1;
                                navigate(`/quran/${note.surahNumber}?page=${startPage}&ayah=${note.ayahNumber}`, { replace: true });
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-semibold bg-[var(--surface-2)] hover:border-[var(--accent)] text-[var(--accent-text)] border border-[var(--border)] flex items-center gap-1 transition-all"
                            >
                              <span>Read</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNote(note.id)}
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Delete note"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p
                          className={`text-xs text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap ${
                            isUrdu ? "font-['Jameel_Noori_Nastaleeq',_var(--font-urdu)] text-sm" : ""
                          }`}
                          dir={isUrdu ? "rtl" : "ltr"}
                        >
                          {note.noteText}
                        </p>
                        <div className="text-[10px] text-[var(--text-secondary)] text-right">
                          {new Date(note.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-Tab: FOLDERS */}
            {savedSubTab === "folders" && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "tadabbur", label: "Tadabbur (Reflection)", icon: "🌱", count: userNotes.filter((n) => n.category === "tadabbur").length },
                    { id: "dua", label: "Quranic Duas", icon: "🤲", count: userNotes.filter((n) => n.category === "dua").length },
                    { id: "action", label: "Action Items", icon: "⚡", count: userNotes.filter((n) => n.category === "action").length },
                    { id: "tafsir", label: "Tafsir Notes", icon: "📖", count: userNotes.filter((n) => n.category === "tafsir").length },
                  ].map((folder) => {
                    const isSelected = selectedFolder === folder.id;
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => setSelectedFolder(isSelected ? null : folder.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? "bg-[var(--accent-soft)] border-[var(--accent)]"
                            : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xl">{folder.icon}</span>
                          <Badge className="bg-[var(--surface-2)] text-[var(--accent-text)] text-[10px] font-bold">
                            {folder.count}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{folder.label}</h4>
                        <span className="text-[10px] text-[var(--text-secondary)]">Tap to view</span>
                      </button>
                    );
                  })}
                </div>

                {selectedFolder && (
                  <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)] px-1">
                      Folder: {selectedFolder.toUpperCase()} ({userNotes.filter((n) => n.category === selectedFolder).length})
                    </h4>
                    {userNotes
                      .filter((n) => n.category === selectedFolder)
                      .map((note) => (
                        <div
                          key={note.id}
                          className="p-3 rounded-xl border bg-[var(--surface)] border-[var(--border)] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-[var(--text-primary)]">
                              {note.surahName} {note.surahNumber}:{note.ayahNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const startPage = SURAH_START_PAGES[note.surahNumber] || 1;
                                navigate(`/quran/${note.surahNumber}?page=${startPage}&ayah=${note.ayahNumber}`, { replace: true });
                              }}
                              className="text-xs text-[var(--accent-text)] font-semibold flex items-center gap-1"
                            >
                              Open Ayah →
                            </button>
                          </div>
                          <p className="text-xs text-[var(--text-primary)] leading-relaxed">{note.noteText}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Starred Surahs (In ALL or BOOKMARKS) */}
            {(savedSubTab === "all" || savedSubTab === "bookmarks") && filteredSurahs.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-1.5 px-1 mb-1">
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

            {/* Empty State when Saved Library is empty */}
            {placedColorBookmarks.length === 0 && userNotes.length === 0 && filteredSurahs.length === 0 && (
              <div className="text-center py-12 px-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] max-w-md mx-auto my-6 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] flex items-center justify-center mx-auto mb-3 text-[var(--accent-text)]">
                  <Star className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mb-1">Your Quran Library is Empty</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs mx-auto">
                  Use the <span className="text-[var(--accent-text)] font-bold">5 Jewel Bookmarks</span> or tap <span className="text-[var(--accent-text)] font-bold">Study & Tafsir ﴿١﴾</span> on any ayah to write reflections and save them here!
                </p>
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
