import { memo, useCallback, useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Radio, Play, Pause, BarChart3, Search, X,
  Pin, PinOff, Landmark, Moon, BookOpen, BookMarked, Headphones,
  Globe, Sparkles, Scale, Star, type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { radioStations, type RadioStation } from "@/data/radio-stations";
import { extraRadioStations, type RadioCategory } from "@/data/radio-stations-extra";
import { useGlobalRadio } from "@/lib/global-radio";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useContentLanguage } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

// A unified station view: base stations + extra API stations.
interface StationView {
  id: number;
  name: string;   // Arabic display name
  nameEn: string; // English subtitle
  url: string;
  img: string;
  category: RadioCategory;
}

const PINNED_KEY = "pinned-radio-stations";

const toView = (s: RadioStation | { id: number; nameAr: string; nameEn: string; url: string; img: string; category: RadioCategory }): StationView => {
  const base = "nameAr" in s;
  return {
    id: s.id,
    name: base ? (s as { nameAr: string }).nameAr : s.name,
    nameEn: base ? (s as { nameEn: string }).nameEn : "",
    url: s.url,
    img: s.img,
    category: base ? (s as { category: RadioCategory }).category : "reciter",
  };
};

const allStations: StationView[] = [
  ...radioStations.map(toView),
  ...extraRadioStations.map(toView),
];

const FEATURED_SLUGS = new Set([
  "mishary_alafasi", "shaik_abu_bakr_al_shatri", "maher",
  "saad_alghamdi", "abdulrahman_alsudaes",
]);

const featuredStations = allStations.filter((s) =>
  FEATURED_SLUGS.has(s.url.split("/").filter(Boolean).pop() ?? "")
);

const CATEGORY_LABELS: Record<RadioCategory, string> = {
  reciter: "Reciters",
  translation: "Translations",
  tafsir: "Tafsir",
  hadith: "Hadith",
  surah: "Surahs",
  adhkar: "Adhkar",
  stories: "Stories",
  mosque: "Main / Mix",
  fatwa: "Fatwa",
};

interface RadioI18n {
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  tabAll: string;
  categories: Record<RadioCategory, string>;
  heroLive: string;
  heroLine1: string;
  heroLine2: string;
  heroSub: string;
  nowPlaying: string;
  paused: string;
  featuredReciters: string;
  pinned: string;
  allStations: string;
  noStations: string;
  noStationsSub: string;
  clearFilters: string;
}

const RADIO_I18N: Record<string, RadioI18n> = {
  en: {
    title: "Quran Radio",
    subtitle: "Live Quran recitation 24/7",
    searchPlaceholder: "Search reciter or station…",
    tabAll: "All",
    categories: {
      reciter: "Reciters",
      translation: "Translations",
      tafsir: "Tafsir",
      hadith: "Hadith",
      surah: "Surahs",
      adhkar: "Adhkar",
      stories: "Stories",
      mosque: "Main / Mix",
      fatwa: "Fatwa",
    },
    heroLive: "Live",
    heroLine1: "Listen to the Quran,",
    heroLine2: "anytime.",
    heroSub: "Live Quran recitation 24/7 around the globe",
    nowPlaying: "Now Playing",
    paused: "Paused",
    featuredReciters: "Featured Reciters",
    pinned: "Pinned",
    allStations: "All Stations",
    noStations: "No stations found",
    noStationsSub: "Try a different search or category.",
    clearFilters: "Clear filters",
  },
  ar: {
    title: "إذاعة القرآن",
    subtitle: "تلاوات قرآنية مباشرة على مدار الساعة",
    searchPlaceholder: "ابحث عن قارئ أو إذاعة...",
    tabAll: "الكل",
    categories: {
      reciter: "القراء",
      translation: "الترجمات",
      tafsir: "التفسير",
      hadith: "الحديث",
      surah: "السور",
      adhkar: "الأذكار",
      stories: "القصص",
      mosque: "إذاعات منوعة",
      fatwa: "الفتاوى",
    },
    heroLive: "مباشر",
    heroLine1: "استمع إلى القرآن الكريم",
    heroLine2: "في أي وقت",
    heroSub: "بث مباشر على مدار الساعة",
    nowPlaying: "قيد التشغيل",
    paused: "متوقف مؤقتاً",
    featuredReciters: "قراء مختارون",
    pinned: "المثبتة",
    allStations: "جميع الإذاعات",
    noStations: "لم يتم العثور على إذاعات",
    noStationsSub: "جرب بحثاً مختلفاً أو فئة أخرى.",
    clearFilters: "مسح التصفية",
  },
  ur: {
    title: "قرآن ریڈیو",
    subtitle: "24/7 براہ راست قرآن کی تلاوت",
    searchPlaceholder: "قاری یا اسٹیشن تلاش کریں...",
    tabAll: "سب",
    categories: {
      reciter: "قراء",
      translation: "ترجمے",
      tafsir: "تفسیر",
      hadith: "حدیث",
      surah: "سورتیں",
      adhkar: "اذکار",
      stories: "قصے",
      mosque: "مرکزی و متفرق",
      fatwa: "فتاویٰ",
    },
    heroLive: "لائیو",
    heroLine1: "قرآن پاک سنیں",
    heroLine2: "کسی بھی وقت",
    heroSub: "24/7 براہ راست نشریات",
    nowPlaying: "اب چل رہا ہے",
    paused: "روک دیا گیا",
    featuredReciters: "نمایاں قراء",
    pinned: "پن شدہ",
    allStations: "تمام اسٹیشنز",
    noStations: "کوئی اسٹیشن نہیں ملا",
    noStationsSub: "مختلف تلاش یا زمرہ منتخب کریں۔",
    clearFilters: "فلٹرز صاف کریں",
  },
  gu: {
    title: "કુરાન રેડિયો",
    subtitle: "24/7 લાઈવ કુરાન પઠન",
    searchPlaceholder: "વાચક અથવા સ્ટેશન શોધો...",
    tabAll: "બધા",
    categories: {
      reciter: "વાચકો",
      translation: "અનુવાદો",
      tafsir: "તફસીર",
      hadith: "હદીસ",
      surah: "સૂરાઓ",
      adhkar: "અઝકાર",
      stories: "વાર્તાઓ",
      mosque: "મુખ્ય / મિશ્ર",
      fatwa: "ફતવા",
    },
    heroLive: "લાઈવ",
    heroLine1: "કુરાન મજીદ સાંભળો,",
    heroLine2: "કોઈપણ સમયે.",
    heroSub: "24/7 વિશ્વભરમાં લાઈવ પઠન",
    nowPlaying: "હવે વાગી રહ્યું છે",
    paused: "રોકેલું છે",
    featuredReciters: "વિશેષ વાચકો",
    pinned: "પિન કરેલા",
    allStations: "બધા સ્ટેશનો",
    noStations: "કોઈ સ્ટેશન મળ્યું નથી",
    noStationsSub: "બીજી શોધ અથવા શ્રેણી અજમાવો.",
    clearFilters: "ફિલ્ટર્સ સાફ કરો",
  },
  hi: {
    title: "क़ुरआन रेडियो",
    subtitle: "24/7 लाइव क़ुरआन पाठ",
    searchPlaceholder: "क़ारी या स्टेशन खोजें...",
    tabAll: "सभी",
    categories: {
      reciter: "क़ारी",
      translation: "अनुवाद",
      tafsir: "तफ़सीर",
      hadith: "हदीस",
      surah: "सूरा",
      adhkar: "अज़कार",
      stories: "क़िस्से",
      mosque: "मुख्य / मिश्रित",
      fatwa: "फ़तवा",
    },
    heroLive: "लाइव",
    heroLine1: "क़ुरआन पाक सुनें,",
    heroLine2: "किसी भी समय।",
    heroSub: "24/7 दुनिया भर में लाइव क़ुरआन पाठ",
    nowPlaying: "अब बज रहा है",
    paused: "रोका गया",
    featuredReciters: "प्रमुख क़ारी",
    pinned: "पिन किए गए",
    allStations: "सभी स्टेशन",
    noStations: "कोई स्टेशन नहीं मिला",
    noStationsSub: "कोई अन्य खोज या श्रेणी आज़माएं।",
    clearFilters: "फ़िल्टर साफ़ करें",
  },
  bn: {
    title: "কোরআন রেডিও",
    subtitle: "২৪/৭ লাইভ কোরআন তেলাওয়াত",
    searchPlaceholder: "তেলাওয়াতকারী বা স্টেশন খুঁজুন...",
    tabAll: "সব",
    categories: {
      reciter: "ক্বারীগণ",
      translation: "অনুবাদ",
      tafsir: "তাফসীর",
      hadith: "হাদিস",
      surah: "সূরাসমূহ",
      adhkar: "আযকার",
      stories: "কাহিনী",
      mosque: "প্রধান / মিশ্র",
      fatwa: "ফতোয়া",
    },
    heroLive: "লাইভ",
    heroLine1: "পবিত্র কোরআন শুনুন,",
    heroLine2: "যেকোনো সময়।",
    heroSub: "সারাবিশ্বে ২৪/৭ লাইভ কোরআন তেলাওয়াত",
    nowPlaying: "এখন চলছে",
    paused: "বিরতি",
    featuredReciters: "নির্বাচিত ক্বারীগণ",
    pinned: "পিন করা",
    allStations: "সকল স্টেশন",
    noStations: "কোনো স্টেশন পাওয়া যায়নি",
    noStationsSub: "অন্য কোনো অনুসন্ধান বা বিভাগ চেষ্টা করুন।",
    clearFilters: "ফিল্টার সাফ করুন",
  },
  ru: {
    title: "Коран Радио",
    subtitle: "Прямой эфир чтения Корана 24/7",
    searchPlaceholder: "Поиск чтеца или радиостанции…",
    tabAll: "Все",
    categories: {
      reciter: "Чтецы",
      translation: "Переводы",
      tafsir: "Тафсир",
      hadith: "Хадисы",
      surah: "Суры",
      adhkar: "Азкары",
      stories: "Истории",
      mosque: "Главное / Микс",
      fatwa: "Фетвы",
    },
    heroLive: "В эфире",
    heroLine1: "Слушайте Священный Коран,",
    heroLine2: "в любое время.",
    heroSub: "Круглосуточный прямой эфир по всему миру",
    nowPlaying: "Сейчас играет",
    paused: "Приостановлено",
    featuredReciters: "Избранные чтецы",
    pinned: "Закреплённые",
    allStations: "Все радиостанции",
    noStations: "Станции не найдены",
    noStationsSub: "Попробуйте другой поиск или категорию.",
    clearFilters: "Сбросить фильтры",
  },
  fr: {
    title: "Radio Coran",
    subtitle: "Récitations du Coran en direct 24/7",
    searchPlaceholder: "Rechercher un récitateur ou une station…",
    tabAll: "Tout",
    categories: {
      reciter: "Récitateurs",
      translation: "Traductions",
      tafsir: "Tafsir",
      hadith: "Hadith",
      surah: "Sourates",
      adhkar: "Adhkar",
      stories: "Histoires",
      mosque: "Général / Mix",
      fatwa: "Fatwas",
    },
    heroLive: "En direct",
    heroLine1: "Écoutez le Saint Coran,",
    heroLine2: "à tout moment.",
    heroSub: "Récitation du Coran 24h/24 dans le monde entier",
    nowPlaying: "En cours de lecture",
    paused: "En pause",
    featuredReciters: "Récitateurs en vedette",
    pinned: "Épinglés",
    allStations: "Toutes les stations",
    noStations: "Aucune station trouvée",
    noStationsSub: "Essayez une autre recherche ou catégorie.",
    clearFilters: "Effacer les filtres",
  },
};

const loadPinned = (): Set<string> => {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
};

/* ── Shared micro-components ─────────────────────────────────── */

/** Staggered opacity-pulse bars (GPU-only). Static + dimmed when paused. */
const Equalizer = ({ playing, className = "" }: { playing: boolean; className?: string }) => (
  <span className={`flex items-end gap-[3px] h-3.5 ${className}`} aria-hidden="true">
    {[0, 150, 300, 450].map((d) => (
      <span
        key={d}
        className={`w-[3px] rounded-full bg-current ${playing ? "animate-pulse motion-reduce:animate-none" : "opacity-40"}`}
        style={{ height: playing ? undefined : "45%", animationDelay: `${d}ms` }}
      />
    ))}
  </span>
);

const initialsOf = (name: string, nameEn: string): string => {
  const en = nameEn.trim();
  if (en) {
    const parts = en.split(/\s+/).filter(Boolean).slice(0, 2);
    const letters = parts.map((p) => p[0]).join("");
    if (letters) return letters.toUpperCase();
  }
  const cleaned = name.replace(/إذاعة|أذاعة|راديو|إسلامي/gi, "").trim();
  return cleaned ? Array.from(cleaned).slice(0, 2).join(" ") : "?";
};

const avatarPalette = [
  "from-[#C9860A] to-[#8B5E0A]", "from-amber-600 to-orange-800", "from-[#E8A020] to-[#B8780A]",
  "from-[#C9860A] to-[#713f12]", "from-amber-700 to-[#3f5136]", "from-amber-800 to-stone-900",
  "from-stone-600 to-stone-900", "from-[#a16207] to-[#713f12]",
];

const avatarGradient = (url: string): string => {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (h * 31 + url.charCodeAt(i)) >>> 0;
  return avatarGradientSafe(h % avatarPalette.length);
};

// Kept separate so palette edits never produce an out-of-range index.
function avatarGradientSafe(i: number): string {
  return avatarPalette[i] ?? avatarPalette[0];
}

/* ── Page ────────────────────────────────────────────────────── */

const QuranRadio = () => {
  const navigate = useNavigate();
  const { contentLang, isRtl } = useContentLanguage();
  const strings = useMemo(() => {
    return RADIO_I18N[contentLang] || RADIO_I18N.en;
  }, [contentLang]);

  const globalRadio = useGlobalRadio();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<RadioCategory | "all">("all");
  const [pinned, setPinned] = useState<Set<string>>(loadPinned);

  // Optimistic tap feedback: cleared once playback begins (or timeout).
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  useEffect(() => {
    if (pendingUrl && globalRadio.isPlaying && globalRadio.currentStation?.url === pendingUrl) {
      setPendingUrl(null);
    }
  }, [globalRadio.isPlaying, globalRadio.currentStation?.url, pendingUrl]);

  const markPending = useCallback((url: string) => {
    setPendingUrl(url);
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => setPendingUrl(null), 6000);
  }, []);

  const togglePin = useCallback((station: StationView) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(station.url)) next.delete(station.url);
      else next.add(station.url);
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStations.filter((s) => {
      const matchesCat = activeCategory === "all" || s.category === activeCategory;
      if (!matchesCat) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q)
      );
    });
  }, [search, activeCategory]);

  const pinnedStations = useMemo(
    () => allStations.filter((s) => pinned.has(s.url)),
    [pinned]
  );
  const categories = useMemo(
    () => Object.keys(CATEGORY_LABELS) as RadioCategory[],
    []
  );

  const handleStationSelect = useCallback((station: StationView) => {
    if (globalRadio.currentStation?.url === station.url) {
      if (globalRadio.isPlaying) {
        globalRadio.pauseRadio();
      } else {
        markPending(station.url);
        globalRadio.playRadio({ id: station.id, name: station.name, url: station.url });
      }
      return;
    }
    markPending(station.url);
    globalRadio.playRadio({ id: station.id, name: station.name, url: station.url });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable lib actions only
  }, [globalRadio.currentStation?.url, globalRadio.isPlaying, globalRadio.playRadio, globalRadio.pauseRadio]);

  /** Hero button: pause if playing, resume last station, or start the top featured one. */
  const handleHeroPlay = useCallback(() => {
    if (globalRadio.isPlaying && globalRadio.currentStation) {
      globalRadio.pauseRadio();
      return;
    }
    const target =
      globalRadio.currentStation ??
      (featuredStations[0]
        ? { id: featuredStations[0].id, name: featuredStations[0].name, url: featuredStations[0].url }
        : null);
    if (target) {
      markPending(target.url);
      globalRadio.playRadio(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable lib actions only
  }, [globalRadio.isPlaying, globalRadio.currentStation, globalRadio.playRadio, markPending]);

  const isCurrentStation = useCallback(
    (station: StationView) => globalRadio.currentStation?.url === station.url,
    [globalRadio.currentStation?.url]
  );

  const heroPlaying = globalRadio.isPlaying;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-base)", paddingBottom: "calc(180px + env(safe-area-inset-bottom, 0px))" }}>
      {/* ── Functional sticky bar ── */}
      <div
        className="sticky top-0 z-40 backdrop-blur-md border-b safe-top"
        style={{
          background: "var(--bg-base)",
          borderColor: "var(--border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="rounded-full"
              style={{ color: "var(--text-primary)" }}
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-lg font-bold leading-tight ${contentLang === 'ur' ? 'font-urdu' : ''}`} style={{ color: "var(--text-primary)" }}>
                {strings.title}
              </h1>
              <p className={`text-xs ${contentLang === 'ur' ? 'font-urdu text-[13px]' : ''}`} style={{ color: "var(--text-secondary)" }}>
                {strings.subtitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/radio-stats")}
              className="rounded-full"
              style={{ color: "var(--text-primary)" }}
            >
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>

          {/* 4-Language Selector Bar */}
          <ContentLanguageBar fullWidth className="mt-2.5" />

          {/* Search */}
          <div className="mt-2.5 relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-secondary)" }}
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={strings.searchPlaceholder}
              className={`ps-9 pe-9 h-10 rounded-full border transition-all ${contentLang === 'ur' ? 'font-urdu text-sm' : ''}`}
              style={{
                background: "var(--bg-elev)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
              aria-label={strings.searchPlaceholder}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{ color: "var(--text-secondary)" }}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1.5 -mx-4 px-4" role="tablist" aria-label="Station categories">
            <Chip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>
              <span className={contentLang === 'ur' ? 'font-urdu' : ''}>{strings.tabAll}</span>
            </Chip>
            {categories.map((cat) => (
              <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
                <span className={contentLang === 'ur' ? 'font-urdu' : ''}>{strings.categories[cat] || CATEGORY_LABELS[cat]}</span>
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-5 pb-6">
        {isLoading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* ── Hero banner & Featured carousel: strictly hidden when activeCategory !== 'all' or active search ── */}
            {activeCategory === "all" && !search && (
              <>
                {/* ── Hero banner ── */}
                <section
                  className="relative overflow-hidden rounded-3xl border mb-6 shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)",
                    borderColor: "var(--border)",
                    boxShadow: "inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)",
                  }}
                >
                  <div
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-[var(--accent)]/10 to-transparent pointer-events-none"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 flex items-center justify-between gap-4 p-5 md:p-7">
                    <div className="min-w-0">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                        style={{
                          background: "var(--accent-soft)",
                          borderColor: "var(--border)",
                          color: "var(--accent)",
                        }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full bg-red-400 ${heroPlaying ? "animate-pulse motion-reduce:animate-none" : ""}`} />
                        <span className={contentLang === 'ur' ? 'font-urdu text-xs' : ''}>{strings.heroLive}</span>
                      </span>
                      <h2
                        className={`mt-2.5 text-2xl md:text-3xl font-extrabold tracking-tight leading-tight ${contentLang === 'ur' ? 'font-urdu' : ''}`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span>{strings.heroLine1}</span>
                        <br />
                        <span style={{ color: "var(--accent)" }}>{strings.heroLine2}</span>
                      </h2>
                      <p
                        className={`mt-1.5 text-sm ${contentLang === 'ur' ? 'font-urdu text-[13px]' : ''}`}
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {strings.heroSub}
                      </p>
                    </div>

                    <button
                      onClick={handleHeroPlay}
                      aria-label={heroPlaying ? "Pause radio" : "Start listening"}
                      className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center shadow-xl transition-transform duration-150 active:scale-95 motion-safe:hover:scale-105"
                      style={{
                        background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                        color: "var(--on-accent)",
                        boxShadow: "0 8px 24px var(--accent-glow)",
                      }}
                    >
                      {heroPlaying
                        ? <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" aria-hidden="true" />
                        : <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ms-1" aria-hidden="true" />}
                    </button>
                  </div>
                </section>

                {/* ── Featured carousel ── */}
                <SectionHeader icon={Star} title={strings.featuredReciters} count={featuredStations.length} />
                <div
                  className="-mx-4 px-4 pb-4 flex gap-3 overflow-x-auto"
                  style={{ scrollSnapType: "x mandatory" }}
                  role="list"
                  aria-label={strings.featuredReciters}
                >
                  {featuredStations.map((station) => (
                    <FeaturedTile
                      key={station.url}
                      station={station}
                      isPlaying={isCurrentStation(station) && globalRadio.isPlaying}
                      isPending={isCurrentStation(station) ? !globalRadio.isPlaying && pendingUrl === station.url : pendingUrl === station.url}
                      onSelect={handleStationSelect}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── Now playing strip ── */}
            {globalRadio.currentStation && (
              <section className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5">
                <span className="shrink-0 w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Equalizer playing={globalRadio.isPlaying} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-widest text-primary ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
                    {globalRadio.isPlaying ? strings.nowPlaying : strings.paused}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate" lang="ar">
                    {globalRadio.currentStation.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full shrink-0"
                  onClick={handleHeroPlay}
                  aria-label={globalRadio.isPlaying ? "Pause" : "Play"}
                >
                  {globalRadio.isPlaying
                    ? <Pause className="w-5 h-5" />
                    : <Play className="w-5 h-5 ms-0.5" />}
                </Button>
              </section>
            )}

            {/* ── Pinned rows ── */}
            {pinnedStations.length > 0 && (
              <>
                <SectionHeader icon={Pin} title={strings.pinned} count={pinnedStations.length} />
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {pinnedStations.map((station) => (
                    <PinnedRow
                      key={station.url}
                      station={station}
                      isPlaying={isCurrentStation(station) && globalRadio.isPlaying}
                      isPending={isCurrentStation(station) ? !globalRadio.isPlaying && pendingUrl === station.url : pendingUrl === station.url}
                      onSelect={handleStationSelect}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </>
            )}

            {/* ── All stations ── */}
            <SectionHeader icon={Radio} title={strings.allStations} count={filtered.length} />
            {filtered.length === 0 ? (
              <EmptyState
                hasFilters={!!search || activeCategory !== "all"}
                onClear={() => { setSearch(""); setActiveCategory("all"); }}
                title={strings.noStations}
                sub={strings.noStationsSub}
                clear={strings.clearFilters}
              />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" role="list" aria-label="All stations">
                {filtered.map((station) => (
                  <StationTile
                    key={station.url}
                    station={station}
                    isPlaying={isCurrentStation(station) && globalRadio.isPlaying}
                    isPending={isCurrentStation(station) ? !globalRadio.isPlaying && pendingUrl === station.url : pendingUrl === station.url}
                    onSelect={handleStationSelect}
                    onTogglePin={togglePin}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Building blocks ─────────────────────────────────────────── */

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    role="tab"
    aria-selected={active}
    style={
      active
        ? {
            background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
            color: "var(--on-accent)",
            boxShadow: "0 4px 18px var(--accent-glow)",
            borderColor: "transparent",
          }
        : {
            background: "var(--surface-2)",
            color: "var(--text-secondary)",
            borderColor: "var(--border)",
          }
    }
    className="shrink-0 min-h-[38px] px-4 rounded-full text-xs font-semibold transition-all border"
  >
    {children}
  </button>
);

const SectionHeader = ({ icon: Icon, title, count }: { icon: LucideIcon; title: string; count?: number }) => (
  <div className="flex items-center gap-2.5 mt-8 mb-3 first:mt-0">
    <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
    </span>
    <h2 className="text-base md:text-lg font-bold text-foreground">{title}</h2>
    {typeof count === "number" && (
      <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
        {count}
      </span>
    )}
  </div>
);

/* ── Artwork resolution (shared by tiles & rows) ─────────────── */

const StationArtwork: React.FC<{ station: StationView; className?: string }> = ({ station }) => {
  const [imageError, setImageError] = useState(false);
  const showPhoto = !imageError && !!station.img;

  if (showPhoto) {
    return (
      <img
        src={station.img}
        alt=""
        loading="lazy"
        className="w-full h-full object-cover"
        onError={() => setImageError(true)}
      />
    );
  }
  if (station.category === "reciter") {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${avatarGradient(station.url)} flex items-center justify-center`}>
        <span className="text-xl font-bold text-white/80">{initialsOf(station.name, station.nameEn)}</span>
      </div>
    );
  }
  return <CategoryArt category={station.category} id={station.id} />;
};

/* Themed icon per category (non-reciter stations).
   Palette kept inside the app family: gold/amber + warm slate. */
const CategoryArt: React.FC<{ category: RadioCategory; id: number }> = ({ category, id }) => {
  const styles: Record<string, string> = {
    mosque: "from-[#C9860A] to-[#8B5E0A]",
    eid: "from-[#E8A020] to-[#B8780A]",
    ruqyah: "from-amber-600 to-orange-800",
    tafsir: "from-[#C9860A] to-[#713f12]",
    hadith: "from-[#8a6d1f] to-[#6b500f]",
    translation: "from-amber-600 to-[#713f12]",
    surah: "from-[#E8A020] to-[#713f12]",
    stories: "from-[#a16207] to-[#713f12]",
    adhkar: "from-amber-700 to-stone-900",
    fatwa: "from-stone-500 to-stone-800",
    biography: "from-[#C9860A] to-stone-900",
  };
  const iconMap: Record<string, React.ReactNode> = {
    mosque: <Landmark className="w-9 h-9 text-white/90" />,
    eid: <Moon className="w-9 h-9 text-white/90" />,
    ruqyah: <BookOpen className="w-9 h-9 text-white/90" />,
    tafsir: <BookMarked className="w-9 h-9 text-white/90" />,
    hadith: <Headphones className="w-9 h-9 text-white/90" />,
    translation: <Globe className="w-9 h-9 text-white/90" />,
    stories: <Sparkles className="w-9 h-9 text-white/90" />,
    fatwa: <Scale className="w-9 h-9 text-white/90" />,
    adhkar: <Sparkles className="w-9 h-9 text-white/90" />,
  };

  if (category === "surah") {
    const surahNum = id === 115 ? "٢" : id === 109060 ? "٦٧" : "۩";
    return (
      <div className={`w-full h-full bg-gradient-to-br ${styles.surah} flex items-center justify-center`}>
        <span className="text-4xl font-bold text-[#e7c66b] leading-none" style={{ fontFamily: "serif" }}>
          {surahNum}
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-gradient-to-br ${styles[category] || styles.mosque} flex items-center justify-center`}>
      {iconMap[category] || <Radio className="w-9 h-9 text-white/90" />}
    </div>
  );
};

/* ── Featured carousel tile ──────────────────────────────────── */

interface TileProps {
  station: StationView;
  isPlaying: boolean;
  isPending: boolean;
  onSelect: (s: StationView) => void;
}

const FeaturedTile = memo<TileProps>(({ station, isPlaying, isPending, onSelect }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(station);
    }
  }, [onSelect, station]);

  return (
    <button
      onClick={() => onSelect(station)}
      onKeyDown={handleKeyDown}
      role="listitem"
      aria-label={`${isPlaying ? "Pause" : "Play"} ${station.nameEn || station.name}`}
      style={{ scrollSnapAlign: "start" }}
      className={`relative shrink-0 w-44 h-44 md:w-52 md:h-52 rounded-3xl overflow-hidden text-start shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 ${
        isPlaying ? "ring-2 ring-primary shadow-lg" : ""
      }`}
    >
      <StationArtwork station={station} />
      {/* Static scrim so overlaid text always reads (no filters) */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" aria-hidden="true" />

      {isPlaying ? (
        <span className="absolute top-2.5 end-2.5 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
          <Equalizer playing className="h-2.5 [&>span]:w-[2px]" />
          Live
        </span>
      ) : isPending ? (
        <span className="absolute top-2.5 end-2.5 w-7 h-7 rounded-full bg-black/60 border border-[var(--accent)]/30 flex items-center justify-center" aria-hidden="true">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin motion-reduce:animate-none" />
        </span>
      ) : null}

      {/* Play affordance — always visible */}
      <span
        className={`absolute bottom-2.5 end-2.5 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border transition-opacity duration-200 ${
          isPlaying
            ? "bg-primary text-primary-foreground border-primary/60 opacity-100"
            : "bg-black/55 border-[#C9860A]/35 text-white opacity-85"
        }`}
        aria-hidden="true"
      >
        {isPending ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ms-0.5" />
        )}
      </span>

      <span className="absolute bottom-0 inset-x-0 p-3 pe-12 pointer-events-none">
        <span className="block text-sm font-bold text-white leading-snug line-clamp-2" lang="ar">
          {station.name}
        </span>
        {station.nameEn && (
          <span className="block text-[11px] text-white/70 line-clamp-1 mt-0.5">{station.nameEn}</span>
        )}
      </span>
    </button>
  );
});

/* ── Pinned compact row ──────────────────────────────────────── */

interface PinnedRowProps extends TileProps {
  onTogglePin: (s: StationView) => void;
}

const PinnedRow = memo<PinnedRowProps>(({ station, isPlaying, isPending, onSelect, onTogglePin }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(station);
    }
  }, [onSelect, station]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${isPlaying ? "Pause" : "Play"} ${station.nameEn || station.name}`}
      onClick={() => onSelect(station)}
      onKeyDown={handleKeyDown}
      className={`flex items-center gap-3 rounded-2xl border bg-card p-2 pe-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary transition-colors duration-150 hover:bg-muted/60 ${
        isPlaying ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
        <StationArtwork station={station} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate" lang="ar">{station.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{station.nameEn || "Islamic Radio"}</p>
      </div>

      <span
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${
          isPlaying ? "bg-primary text-primary-foreground border-primary/60" : "bg-muted border-transparent text-foreground"
        }`}
        aria-hidden="true"
      >
        {isPending ? (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
        ) : isPlaying ? (
          <Pause className="w-3.5 h-3.5 fill-current" />
        ) : (
          <Play className="w-3.5 h-3.5 fill-current ms-0.5" />
        )}
      </span>

      <button
        onClick={(e) => { e.stopPropagation(); onTogglePin(station); }}
        aria-label="Unpin station"
        className="relative shrink-0 w-8 h-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
      >
        <span className="absolute -inset-1" aria-hidden="true" />
        <PinOff className="w-4 h-4" />
      </button>
    </div>
  );
});

/* ── All-stations grid tile ──────────────────────────────────── */

interface GridTileProps extends TileProps {
  onTogglePin: (s: StationView) => void;
}

const StationTile = memo<GridTileProps>(({ station, isPlaying, isPending, onSelect, onTogglePin }) => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(station);
    }
  }, [onSelect, station]);

  return (
    <button
      onClick={() => onSelect(station)}
      onKeyDown={handleKeyDown}
      role="listitem"
      aria-label={`${isPlaying ? "Pause" : "Play"} ${station.nameEn || station.name}`}
      className={`group relative aspect-square rounded-3xl overflow-hidden text-start shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-[transform,box-shadow] duration-200 motion-safe:hover:-translate-y-1 ${
        isPlaying ? "ring-2 ring-primary shadow-lg" : ""
      }`}
    >
      <StationArtwork station={station} />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" aria-hidden="true" />

      {/* Pin — 36px visual, ~44px hit area */}
      <span
        onClick={(e) => { e.stopPropagation(); onTogglePin(station); }}
        role="button"
        tabIndex={-1}
        aria-label={isPlaying ? undefined : "Pin station"}
        className="absolute top-2 start-2 z-10 w-9 h-9 rounded-full bg-black/45 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity"
      >
        <Pin className={`w-4 h-4 ${isPlaying ? "text-primary fill-primary" : "text-white"}`} />
      </span>

      {isPlaying ? (
        <span className="absolute top-2 end-2 flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wide">
          <Equalizer playing className="[&>span]:w-[2px]" />
        </span>
      ) : isPending ? (
        <span className="absolute top-2 end-2" aria-hidden="true">
          <span className="block w-4 h-4 rounded-full border-2 border-amber-400 border-t-transparent animate-spin motion-reduce:animate-none" />
        </span>
      ) : null}

      {/* Play affordance — always visible */}
      <span
        className={`absolute bottom-2 end-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg border transition-opacity duration-200 ${
          isPlaying
            ? "bg-primary text-primary-foreground border-primary/60"
            : "bg-black/55 border-[#C9860A]/35 text-white opacity-85 group-hover:opacity-100"
        }`}
        aria-hidden="true"
      >
        {isPending ? (
          <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ms-0.5" />
        )}
      </span>

      <span className="absolute bottom-0 inset-x-0 p-2.5 pe-12 pointer-events-none">
        <span className="block text-sm font-bold text-white leading-snug line-clamp-2" lang="ar">
          {station.name}
        </span>
        <span className="block text-[11px] text-white/65 line-clamp-1 mt-0.5">
          {station.nameEn || "Islamic Radio"}
        </span>
      </span>
    </button>
  );
});

/* ── Empty state ─────────────────────────────────────────────── */

const EmptyState = ({
  hasFilters,
  onClear,
  title = "No stations found",
  sub = "Try a different search or category.",
  clear = "Clear filters",
}: {
  hasFilters: boolean;
  onClear: () => void;
  title?: string;
  sub?: string;
  clear?: string;
}) => (
  <div className="text-center py-14 rounded-3xl border border-dashed border-border">
    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
      <Radio className="w-6 h-6 text-muted-foreground/70" aria-hidden="true" />
    </div>
    <p className="text-lg font-semibold text-foreground">{title}</p>
    <p className="text-sm text-muted-foreground mt-1">{sub}</p>
    {hasFilters && (
      <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={onClear}>
        {clear}
      </Button>
    )}
  </div>
);

/* ── Skeleton matching the new layout ────────────────────────── */

const PageSkeleton = () => (
  <div className="animate-pulse motion-reduce:animate-none" aria-hidden="true">
    <div className="h-36 md:h-44 rounded-3xl bg-muted mb-6" />
    <div className="h-8 w-40 bg-muted rounded-lg mb-3" />
    <div className="flex gap-3 overflow-hidden mb-8">
      {[0, 1, 2].map((i) => (
        <div key={i} className="shrink-0 w-44 h-44 md:w-52 md:h-52 rounded-3xl bg-muted" />
      ))}
    </div>
    <div className="h-8 w-32 bg-muted rounded-lg mb-3" />
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="aspect-square rounded-3xl bg-muted" />
      ))}
    </div>
  </div>
);

export default QuranRadio;
