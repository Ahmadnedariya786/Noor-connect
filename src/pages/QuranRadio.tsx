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
  "from-[#C9860A] to-[#713f12]", "from-amber-700 to-[#3f5136]", "from-lime-700 to-emerald-900",
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
    <div className="min-h-screen bg-background pb-32">
      {/* ── Functional sticky bar ── */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b safe-top">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight">Quran Radio</h1>
              <p className="text-xs text-muted-foreground">Live Quran recitation 24/7</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/radio-stats")} className="rounded-full">
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="mt-2.5 relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reciter or station…"
              className="ps-9 pe-9 h-10 rounded-full"
              aria-label="Search reciter or station"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute end-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category chips */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1.5 -mx-4 px-4" role="tablist" aria-label="Station categories">
            <Chip active={activeCategory === "all"} onClick={() => setActiveCategory("all")}>All</Chip>
            {categories.map((cat) => (
              <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
                {CATEGORY_LABELS[cat]}
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
            {/* ── Hero banner ── */}
            <section className="relative overflow-hidden rounded-3xl bg-[#1A1A1A] border border-[#C9860A]/30 mb-6 shadow-lg">
              {/* Full-cover sheen — static gradient, no filters */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#C9860A]/10 to-transparent pointer-events-none" aria-hidden="true" />

<div className="relative z-10 flex items-center justify-between gap-4 p-5 md:p-7">
                 <div className="min-w-0">
                   <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#C9860A]/20 border border-[#C9860A]/40">
                     <span className={`w-1.5 h-1.5 rounded-full bg-red-400 ${heroPlaying ? "animate-pulse motion-reduce:animate-none" : ""}`} />
                     Live
                   </span>
                   <h2 className="mt-2.5 text-2xl md:text-3xl font-extrabold tracking-tight leading-tight text-white">
                     Listen to the Quran,
                     <br />
                     <span className="text-[#C9860A]">anytime.</span>
                   </h2>
                   <p className="mt-1.5 text-sm text-white/70" lang="ar" dir="rtl">
                     بث مباشر على مدار الساعة
                   </p>
                 </div>

                 <button
                   onClick={handleHeroPlay}
                   aria-label={heroPlaying ? "Pause radio" : "Start listening"}
                   className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-[#C9860A] text-white flex items-center justify-center shadow-xl transition-transform duration-150 active:scale-95 motion-safe:hover:scale-105"
                 >
                  {heroPlaying
                    ? <Pause className="w-7 h-7 md:w-8 md:h-8 fill-current" aria-hidden="true" />
                    : <Play className="w-7 h-7 md:w-8 md:h-8 fill-current ms-1" aria-hidden="true" />}
                </button>
              </div>
            </section>

            {/* ── Now playing strip ── */}
            {globalRadio.currentStation && (
              <section className="mb-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5">
                <span className="shrink-0 w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Equalizer playing={globalRadio.isPlaying} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    {globalRadio.isPlaying ? "Now Playing" : "Paused"}
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

            {/* ── Featured carousel ── */}
            <SectionHeader icon={Star} title="Featured Reciters" count={featuredStations.length} />
            <div
              className="-mx-4 px-4 pb-2 flex gap-3 overflow-x-auto"
              style={{ scrollSnapType: "x mandatory" }}
              role="list"
              aria-label="Featured reciters"
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

            {/* ── Pinned rows ── */}
            {pinnedStations.length > 0 && (
              <>
                <SectionHeader icon={Pin} title="Pinned" count={pinnedStations.length} />
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
            <SectionHeader icon={Radio} title="All Stations" count={filtered.length} />
            {filtered.length === 0 ? (
              <EmptyState
                hasFilters={!!search || activeCategory !== "all"}
                onClear={() => { setSearch(""); setActiveCategory("all"); }}
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
    className={`shrink-0 min-h-[38px] px-4 rounded-full text-xs font-semibold transition-colors ${
      active
        ? "bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] shadow-[0_4px_18px_var(--accent-glow)]"
        : "bg-muted text-muted-foreground hover:bg-primary/10"
    }`}
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
  const showPhoto = station.category === "reciter" && !!station.img && !imageError;

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
        <span className="text-2xl font-bold text-white/95">{initialsOf(station.name, station.nameEn)}</span>
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
    adhkar: "from-lime-700 to-emerald-900",
    fatwa: "from-stone-500 to-stone-800",
    biography: "from-[#C9860A] to-[#14532d]",
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

const EmptyState = ({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) => (
  <div className="text-center py-14 rounded-3xl border border-dashed border-border">
    <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
      <Radio className="w-6 h-6 text-muted-foreground/70" aria-hidden="true" />
    </div>
    <p className="text-lg font-semibold text-foreground">No stations found</p>
    <p className="text-sm text-muted-foreground mt-1">Try a different search or category.</p>
    {hasFilters && (
      <Button variant="outline" size="sm" className="mt-4 rounded-full" onClick={onClear}>
        Clear filters
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
