import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, X, Play, Pause, Sparkles, Mic, Star, Headphones,
  ListMusic, SearchX, Download, CheckCircle2, Loader2, Heart,
} from "lucide-react";
import { useGlobalQuran } from "@/lib/global-quran";
import { useReciters } from "@/hooks/useReciters";
import { quranService, type SurahInfo } from "@/lib/quran-service";
import { downloadManager } from "@/lib/download-manager";
import { useToast } from "@/hooks/use-toast";

const GOLD = "#C9860A";
const RECITER_STORAGE_KEY = "mp3quran-selected-reciter";
const FAV_RECITERS_KEY = "quran-audio-fav-reciters";

/* ── Equalizer — GPU-only opacity pulses ─────────────────────── */

const Equalizer = ({ className = "" }: { className?: string }) => (
  <span className={`flex items-end gap-[3px] h-3.5 ${className}`} aria-hidden="true">
    {[0, 150, 300, 450].map((d) => (
      <span
        key={d}
        className="w-[3px] rounded-full bg-current animate-pulse motion-reduce:animate-none"
        style={{ animationDelay: `${d}ms` }}
      />
    ))}
  </span>
);

/* ── Reciter avatar helpers ──────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "from-[#C9860A] to-[#8B5E0A]",
  "from-amber-600 to-orange-800",
  "from-[#E8A020] to-[#B8780A]",
  "from-stone-500 to-stone-800",
  "from-[#a16207] to-[#713f12]",
  "from-amber-700 to-amber-950",
];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const initialsOf = (name: string): string => {
  const parts = name.replace(/\s*\([^)]*\)\s*/g, " ").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();
};

interface ReciterAvatarProps {
  id: string;
  name: string;
  active: boolean;
  fav: boolean;
  onSelect: (id: string) => void;
  onToggleFav: (id: string) => void;
}

const ReciterAvatar = memo<ReciterAvatarProps>(({ id, name, active, fav, onSelect, onToggleFav }) => {
  const gradient = AVATAR_GRADIENTS[hashString(id) % AVATAR_GRADIENTS.length];
  const displayName = name.replace(/\s*\([^)]*\)\s*/g, " ").trim();

  const handleToggleFav = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFav(id);
    },
    [id, onToggleFav]
  );

  return (
    <div className="shrink-0 w-[72px] flex flex-col items-center gap-1.5 group">
      <div className="relative">
        <button
          onClick={() => onSelect(id)}
          aria-pressed={active}
          aria-label={`Select reciter ${displayName}`}
          className="block rounded-full outline-none group-focus-visible:ring-2 focus-visible:ring-[#C9860A]"
        >
          <span
            className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md transition-transform duration-200 motion-safe:group-active:scale-95 ${
              active ? "ring-2 ring-[#C9860A] ring-offset-2 ring-offset-background" : ""
            }`}
            aria-hidden="true"
          >
            <span className="text-base font-bold text-white/95 tracking-wide">{initialsOf(name)}</span>
          </span>
        </button>
        <button
          onClick={handleToggleFav}
          aria-pressed={fav}
          aria-label={fav ? `Remove ${displayName} from favourites` : `Add ${displayName} to favourites`}
          title={fav ? "Remove from favourites" : "Add to favourites"}
          className={`absolute -top-1 -end-1 w-6 h-6 rounded-full flex items-center justify-center border shadow-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#C9860A] ${
            fav
              ? "bg-[#C9860A] border-[#C9860A] text-white"
              : "bg-card border-border text-muted-foreground hover:text-[#C9860A] hover:border-[#C9860A]/40"
          }`}
        >
          <Heart className={`w-3 h-3 ${fav ? "fill-current" : ""}`} />
        </button>
      </div>
      <span
        className={`w-full text-center text-[11px] leading-tight line-clamp-2 ${
          active ? "text-[#C9860A] font-bold" : "text-muted-foreground font-medium"
        }`}
      >
        {displayName}
      </span>
    </div>
  );
});

/* ── Surah row ───────────────────────────────────────────────── */

interface SurahRowProps {
  surah: SurahInfo;
  index: number;
  isCurrent: boolean;
  isPlaying: boolean;
  available: boolean;
  downloaded: boolean;
  downloading: boolean;
  downloadProgress: number;
  onPlay: (surah: SurahInfo) => void;
  onDownload: (surah: SurahInfo) => void;
}

const SurahRow = memo<SurahRowProps>(({ surah, index, isCurrent, isPlaying, available, downloaded, downloading, downloadProgress, onPlay, onDownload }) => {
  const handleClick = useCallback(() => {
    if (available) onPlay(surah);
  }, [available, onPlay, surah]);

  const handleDownloadClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (available && !downloaded && !downloading) onDownload(surah);
    },
    [available, downloaded, downloading, onDownload, surah]
  );

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both w-full flex items-center gap-2 p-3 pe-3.5 rounded-2xl border shadow-sm transition-colors duration-150 ${
        isCurrent
          ? "border-[#C9860A]/50 bg-[#C9860A]/5"
          : "border-border bg-card hover:bg-muted/20"
      } ${!available ? "opacity-40" : ""}`}
      style={{ animationDelay: `${Math.min(index * 15, 240)}ms` }}
    >
      <button
        onClick={handleClick}
        disabled={!available}
        aria-label={`${isCurrent && isPlaying ? "Pause" : "Play"} ${surah.englishName}`}
        className="flex-1 min-w-0 flex items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#C9860A] rounded-2xl disabled:cursor-not-allowed"
      >
        {/* Number plate */}
        <div className="relative w-9 h-9 flex items-center justify-center shrink-0">
          <div className={`absolute inset-0 rotate-45 rounded-lg transition-colors duration-300 ${isCurrent ? "bg-[#C9860A]/25" : "bg-[#C9860A]/10"}`} />
          <span className="relative z-10 font-bold text-[11px] tracking-tighter text-[#C9860A]">{surah.number}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{surah.englishName}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate mt-0.5">
            {surah.revelationType} • {surah.numberOfAyahs} Ayahs
          </p>
        </div>

        <p className="font-arabic text-2xl text-[#C9860A] leading-none shrink-0 drop-shadow-sm">{surah.name}</p>
      </button>

      {/* Download */}
      <button
        onClick={handleDownloadClick}
        disabled={!available || downloading || downloaded}
        aria-label={downloaded ? `${surah.englishName} saved offline` : `Download ${surah.englishName} for offline listening`}
        title={downloaded ? "Saved offline" : "Download for offline"}
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#C9860A] ${
          downloaded
            ? "text-[#C9860A]"
            : "text-muted-foreground hover:text-[#C9860A] hover:bg-muted disabled:hover:bg-transparent disabled:cursor-default"
        }`}
      >
        {downloading ? (
          downloadProgress >= 0 ? (
            <span
              className="w-7 h-7 rounded-full grid place-items-center transition-none"
              style={{ background: `conic-gradient(${GOLD} ${downloadProgress}%, rgba(201,134,10,0.15) ${downloadProgress}%)` }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(downloadProgress)}
              aria-label={`Downloading ${surah.englishName}, ${Math.round(downloadProgress)} percent`}
            >
              <span className="w-5 h-5 rounded-full bg-card grid place-items-center text-[8px] font-bold text-[#C9860A] tabular-nums">
                {Math.round(downloadProgress)}
              </span>
            </span>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
          )
        ) : downloaded ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>

      {/* Play badge */}
      <span
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center border transition-colors duration-150 ${
          isCurrent
            ? "bg-[#C9860A] border-[#C9860A] text-white"
            : "bg-muted border-transparent text-foreground"
        }`}
        aria-hidden="true"
        onClick={() => available && onPlay(surah)}
      >
        {isCurrent && isPlaying ? (
          <Equalizer className="text-white scale-90" />
        ) : (
          <Play className={`w-4 h-4 fill-current ${isCurrent ? "" : "ms-0.5"}`} />
        )}
      </span>
    </div>
  );
});

/* ── Skeletons ───────────────────────────────────────────────── */

const RecitersSkeleton = () => (
  <div className="flex gap-4 overflow-hidden pb-2" aria-hidden="true">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="shrink-0 w-[72px] flex flex-col items-center gap-1.5">
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
        <div className="h-3 w-14 rounded bg-muted animate-pulse motion-reduce:animate-none" />
      </div>
    ))}
  </div>
);

/* ── Page ────────────────────────────────────────────────────── */

export default function QuranAudio() {
  const { reciters, isLoading: recitersLoading, error: recitersError } = useReciters();
  const globalQuran = useGlobalQuran();
  const { reciter, surahNumber, isPlaying, progress, duration, updateState, playSurah, pause, resume } = globalQuran;
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [reciterSearch, setReciterSearch] = useState("");
  const [favReciters, setFavReciters] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(FAV_RECITERS_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  });
  const [downloadedNums, setDownloadedNums] = useState<Set<number>>(() => new Set());
  const [downloadingNums, setDownloadingNums] = useState<Set<number>>(() => new Set());
  // surah number → percent (−1 = indeterminate)
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});

  const surahs = useMemo(() => quranService.getAllSurahs(), []);
  const reciterId = reciter?.id ?? null;

  // Default reciter: saved → Mishary → first (mirrors GlobalQuranPlayer)
  useEffect(() => {
    if (!reciters.length || reciter) return;
    const savedId = localStorage.getItem(RECITER_STORAGE_KEY);
    const saved = savedId ? reciters.find((r) => r.id === savedId) : null;
    const def = saved || reciters.find((r) => r.name.includes("Mishary")) || reciters[0];
    if (def) updateState({ reciter: def });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when reciters/reciter resolve
  }, [reciters, reciter]);

  // Load offline downloads for the selected reciter
  useEffect(() => {
    if (!reciterId) return;
    let cancelled = false;
    downloadManager
      .listDownloaded()
      .then((items) => {
        if (cancelled) return;
        setDownloadedNums(new Set(items.filter((it) => it.reciterId === reciterId).map((it) => it.surahNumber)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [reciterId]);

  const handleDownloadSurah = useCallback(
    async (surah: SurahInfo) => {
      if (!reciter || downloadingNums.has(surah.number) || downloadedNums.has(surah.number)) return;
      setDownloadingNums((prev) => new Set(prev).add(surah.number));
      try {
        const base = reciter.server.endsWith("/") ? reciter.server : `${reciter.server}/`;
        const res = await fetch(`${base}${String(surah.number).padStart(3, "0")}.mp3`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        let blob: Blob;
        const totalHeader = res.headers.get("content-length");
        const total = totalHeader ? parseInt(totalHeader, 10) : NaN;

        if (res.body && !isNaN(total) && total > 0) {
          // Stream with progress
          const reader = res.body.getReader();
          const chunks: BlobPart[] = [];
          let received = 0;
          let lastPct = -1;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              received += value.length;
              const pct = Math.min(99, Math.floor((received / total) * 100));
              if (pct !== lastPct) {
                lastPct = pct;
                setProgressMap((prev) => ({ ...prev, [surah.number]: pct }));
              }
            }
          }
          blob = new Blob(chunks);
        } else {
          // No content-length → indeterminate spinner
          setProgressMap((prev) => ({ ...prev, [surah.number]: -1 }));
          blob = await res.blob();
        }

        await downloadManager.saveSurah(reciter.id, surah.number, blob);
        setDownloadedNums((prev) => new Set(prev).add(surah.number));
        toast({
          title: "Saved for offline listening",
          description: `${surah.englishName} • ${(blob.size / (1024 * 1024)).toFixed(1)} MB`,
        });
      } catch {
        toast({
          title: "Download failed",
          description: "Check your connection and try again.",
          variant: "destructive",
        });
      } finally {
        setDownloadingNums((prev) => {
          const next = new Set(prev);
          next.delete(surah.number);
          return next;
        });
        setProgressMap((prev) => {
          const next = { ...prev };
          delete next[surah.number];
          return next;
        });
      }
    },
    [reciter, downloadingNums, downloadedNums, toast]
  );

  const handleToggleFavReciter = useCallback((id: string) => {
    setFavReciters((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem(FAV_RECITERS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const filteredSurahs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return surahs;
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.englishNameTranslation.toLowerCase().includes(q) ||
        s.name.includes(search.trim()) ||
        String(s.number) === q
    );
  }, [search, surahs]);

  const handleSelectReciter = useCallback(
    (id: string) => {
      const next = reciters.find((r) => r.id === id);
      if (!next) return;
      updateState({ reciter: next });
      try { localStorage.setItem(RECITER_STORAGE_KEY, id); } catch { /* ignore */ }
    },
    [reciters, updateState]
  );

  const handlePlaySurah = useCallback(
    (surah: SurahInfo) => {
      if (!reciter) return;
      if (globalQuran.surahNumber === surah.number && globalQuran.reciter?.id === reciter.id) {
        if (isPlaying) pause();
        else resume();
        return;
      }
      playSurah(surah.number, surah.englishName, reciter);
    },
    [reciter, isPlaying, pause, resume, playSurah, globalQuran.surahNumber, globalQuran.reciter?.id]
  );

  const heroPlay = useCallback(() => {
    if (surahNumber) {
      if (isPlaying) pause();
      else resume();
      return;
    }
    const first = surahs[0];
    if (first && reciter) playSurah(first.number, first.englishName, reciter);
  }, [surahNumber, isPlaying, pause, resume, surahs, reciter, playSurah]);

  const currentSurah = useMemo(
    () => (surahNumber ? surahs.find((s) => s.number === surahNumber) : null),
    [surahNumber, surahs]
  );
  const currentReciterName = reciter?.name.replace(/\s*\([^)]*\)\s*/g, " ").trim() || "";
  const progressPct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  const isRowCurrent = useCallback(
    (n: number) => surahNumber === n,
    [surahNumber]
  );
  const isRowAvailable = useCallback(
    (n: number) => !reciter || reciter.surahList.length === 0 || reciter.surahList.includes(n),
    [reciter]
  );
  const isRowDownloaded = useCallback((n: number) => downloadedNums.has(n), [downloadedNums]);
  const isRowDownloading = useCallback((n: number) => downloadingNums.has(n), [downloadingNums]);
  const progressMapRef = useRef(progressMap);
    progressMapRef.current = progressMap;
  const getRowProgress = useCallback((n: number) => progressMapRef.current[n] ?? -1, []);

  // Filter & sort reciters: favorites first, then search
  const visibleReciters = useMemo(() => {
    const q = reciterSearch.trim().toLowerCase();
    const base = q ? reciters.filter((r) => r.name.toLowerCase().includes(q)) : reciters;
    const favRank = new Map(favReciters.map((id, i) => [id, i]));
    return [...base].sort((a, b) => {
      const ra = favRank.has(a.id) ? 0 : 1;
      const rb = favRank.has(b.id) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      if (ra === 0) return (favRank.get(a.id) ?? 0) - (favRank.get(b.id) ?? 0);
      return 0;
    });
  }, [reciters, reciterSearch, favReciters]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-32">
        <AppBar title="Quran Audio" showBack />

        <div className="max-w-lg mx-auto px-5 py-4 space-y-6">
          {/* ── Dark hero card ── */}
          <section className="relative overflow-hidden rounded-[24px] bg-[#1A1A1A] border border-white/10 shadow-xl">
            <div className="absolute top-0 end-0 w-64 h-64 bg-[#C9860A]/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 start-0 w-48 h-48 bg-[#C9860A]/5 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative z-10 p-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#C9860A]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#C9860A]">Premium Audio</span>
              </div>

              <h1 className="text-3xl font-bold text-white tracking-tight">Divine Recitations</h1>

              <div className="flex items-center gap-4 mt-3 text-white/50">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Mic className="w-3.5 h-3.5 text-[#C9860A]" />
                  {recitersLoading ? "—" : `${reciters.length}`} Reciters
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <ListMusic className="w-3.5 h-3.5 text-[#C9860A]" />
                  114 Surahs
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  <Headphones className="w-3.5 h-3.5 text-[#C9860A]" />
                  HD Audio
                </span>
              </div>

              {/* Now Playing / Start listening */}
              {currentSurah ? (
                <div className="mt-5 rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <button
                      onClick={heroPlay}
                      aria-label={isPlaying ? "Pause" : "Resume"}
                      className="shrink-0 w-11 h-11 rounded-xl bg-[#C9860A] text-white flex items-center justify-center shadow-md transition-transform duration-150 active:scale-95"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ms-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{currentSurah.englishName}</p>
                      <p className="text-[11px] text-[#E8A020] font-semibold uppercase tracking-wider truncate mt-0.5">
                        {isPlaying ? "Now Playing" : "Paused"}{currentReciterName ? ` • ${currentReciterName}` : ""}
                      </p>
                    </div>
                    <Equalizer className={`text-[#C9860A] shrink-0 ${isPlaying ? "" : "opacity-40 [&>span]:!animate-none"}`} />
                  </div>
                  <div className="h-1 bg-white/10">
                    <div className="h-full bg-gradient-to-r from-[#C9860A] to-[#E8A020]" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={heroPlay}
                  disabled={!reciter}
                  className="mt-5 w-full h-12 rounded-xl bg-[#C9860A] hover:bg-[#B8780A] text-white font-bold text-sm tracking-wide shadow-lg"
                >
                  <Play className="w-4 h-4 fill-current me-2 ms-0.5" />
                  Start Listening
                </Button>
              )}
            </div>
          </section>

          {/* ── Search ── */}
          <div className="sticky top-[4.5rem] z-30 bg-background/90 backdrop-blur-xl py-2 -mx-5 px-5">
            <div className="relative group">
              <Search className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#C9860A] transition-colors pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search surah by name or number…"
                aria-label="Search surah by name or number"
                className="ps-11 pe-10 h-11 bg-card border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:border-[#C9860A]/50 focus:ring-1 focus:ring-[#C9860A]/50 transition-all shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* ── Reciters carousel ── */}
          <section aria-label="Reciters">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-[#C9860A]" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground">Reciters</h2>
              {favReciters.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#C9860A]/10 text-[11px] font-semibold text-[#C9860A] flex items-center gap-1">
                  <Heart className="w-3 h-3 fill-current" aria-hidden="true" />
                  {favReciters.length}
                </span>
              )}
              {!recitersLoading && reciters.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                  {reciters.length}
                </span>
              )}
            </div>

            <div className="relative mb-3">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={reciterSearch}
                onChange={(e) => setReciterSearch(e.target.value)}
                placeholder="Search reciters…"
                aria-label="Search reciters"
                className="ps-9 pe-9 h-10 rounded-xl bg-card"
              />
              {reciterSearch && (
                <button
                  onClick={() => setReciterSearch("")}
                  aria-label="Clear search"
                  className="absolute end-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {recitersLoading ? (
              <RecitersSkeleton />
            ) : recitersError ? (
              <p className="text-sm text-muted-foreground py-4">{recitersError}. Check your connection and reopen this page.</p>
            ) : visibleReciters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No reciters match your search.</p>
            ) : (
              <div className="-mx-5 px-5 pb-1 flex gap-4 overflow-x-auto" role="listbox" aria-label="Choose a reciter">
                {visibleReciters.map((r) => (
                  <ReciterAvatar
                    key={r.id}
                    id={r.id}
                    name={r.name}
                    active={reciter?.id === r.id}
                    fav={favReciters.includes(r.id)}
                    onSelect={handleSelectReciter}
                    onToggleFav={handleToggleFavReciter}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Surah list ── */}
          <section aria-label="Surahs">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-[#C9860A]" aria-hidden="true" />
              <h2 className="text-base font-bold text-foreground">All Surahs</h2>
              <span className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {filteredSurahs.length}
              </span>
            </div>

            {filteredSurahs.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border border-dashed border-border">
                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                  <SearchX className="w-6 h-6 text-muted-foreground/70" aria-hidden="true" />
                </div>
                <p className="font-semibold text-foreground">No surahs found</p>
                <p className="text-sm text-muted-foreground mt-1">Try a different name or number.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredSurahs.map((surah, i) => (
                  <SurahRow
                    key={surah.number}
                    surah={surah}
                    index={i}
                    isCurrent={isRowCurrent(surah.number)}
                    isPlaying={isPlaying}
                    available={isRowAvailable(surah.number)}
                    downloaded={isRowDownloaded(surah.number)}
                    downloading={isRowDownloading(surah.number)}
                    downloadProgress={getRowProgress(surah.number)}
                    onPlay={handlePlaySurah}
                    onDownload={handleDownloadSurah}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
