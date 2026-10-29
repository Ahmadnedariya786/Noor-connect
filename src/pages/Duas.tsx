import { useState, useEffect, memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, BookHeart, Search, Volume2, Plus, Minus, Star, Sparkles, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { duasData, duaCategories, type Dua } from "@/data/duas";
import { ManuscriptDivider } from "@/components/ui/ManuscriptDivider";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

const FONT_LEVELS = [
  { arabic: "1.35rem", translation: "0.82rem" },
  { arabic: "1.52rem", translation: "0.88rem" },
  { arabic: "1.70rem", translation: "0.95rem" },
  { arabic: "1.88rem", translation: "1.02rem" },
  { arabic: "2.05rem", translation: "1.10rem" },
];

function getTargetCount(dua: Dua): number {
  if (dua.repeatCount && dua.repeatCount > 0) return dua.repeatCount;
  const lower = `${dua.translation} ${dua.transliteration} ${dua.reference || ""}`.toLowerCase();
  if (lower.includes("100 times") || lower.includes("hundred times") || lower.includes("100x")) return 100;
  if (lower.includes("33 times") || lower.includes("thirty-three times") || lower.includes("33x")) return 33;
  if (lower.includes("7 times") || lower.includes("seven times") || lower.includes("7x")) return 7;
  if (lower.includes("3 times") || lower.includes("three times") || lower.includes("3x")) return 3;
  if (dua.id.includes("subhanallah") || dua.id.includes("tasbih")) return 33;
  if (dua.id.includes("istighfar")) return 3;
  return 1;
}

interface DuaCardProps {
  dua: Dua;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShare: (dua: Dua) => void;
  isDuaOfDay?: boolean;
  fontLevel: number;
}

const DuaCard = memo(function DuaCard({
  dua,
  isFavorite,
  onToggleFavorite,
  onShare,
  isDuaOfDay,
  fontLevel,
}: DuaCardProps) {
  const [counter, setCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPronunciation, setShowPronunciation] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);

  const { contentLang, isRtl } = useContentLanguage();
  const [translatedTranslation, setTranslatedTranslation] = useState(dua.translation);

  useEffect(() => {
    if (contentLang === 'en') {
      setTranslatedTranslation(dua.translation);
      return;
    }
    let isMounted = true;
    translateIslamicText(dua.translation, contentLang).then(t => {
      if (isMounted) setTranslatedTranslation(t);
    });
    return () => { isMounted = false; };
  }, [dua.translation, contentLang]);

  const targetCount = useMemo(() => getTargetCount(dua), [dua]);
  const isComplete = counter >= targetCount;
  const synth = useMemo(() => typeof window !== "undefined" ? window.speechSynthesis : null, []);

  const playAudio = (text: string) => {
    if (!synth) return;
    if (synth.speaking) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ar";
    utterance.rate = 0.8;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    synth.speak(utterance);
  };

  const handleTap = useCallback(() => {
    setCounter((prev) => {
      const next = Math.min(targetCount, prev + 1);
      if ("vibrate" in navigator) {
        if (next >= targetCount) {
          navigator.vibrate([15, 50, 15]);
        } else {
          navigator.vibrate(8);
        }
      }
      return next;
    });
  }, [targetCount]);

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCounter(0);
    if ("vibrate" in navigator) {
      navigator.vibrate(12);
    }
  }, []);

  const currentFont = FONT_LEVELS[fontLevel] || FONT_LEVELS[2];

  return (
    <div className="active:scale-[0.99] transition-transform duration-100">
      <Card
        className={`p-5 relative overflow-hidden rounded-2xl border transition-all ${
          isComplete ? "shadow-md ring-1 ring-[var(--accent)]" : "shadow-sm"
        }`}
        style={{
          background: isDuaOfDay ? "var(--surface-2)" : "var(--surface)",
          borderColor: isComplete ? "var(--accent)" : "var(--border)",
        }}
      >
        <div className="space-y-3.5">
          {/* Header Row: Category + Repeat Badge + Actions */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isDuaOfDay && <Star className="w-3.5 h-3.5 text-[var(--accent)] fill-[var(--accent)]" />}
              <span
                className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--accent)",
                  color: "var(--accent-text)",
                }}
              >
                {dua.category}
              </span>
              <span
                className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-full border"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                ×{targetCount}
              </span>
            </div>

            {/* Quick Actions (Audio, Favorite, Share) */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                onClick={() => playAudio(dua.arabic)}
                aria-label="Listen to audio pronunciation"
              >
                <Volume2 className={`w-4 h-4 ${isPlaying ? "text-[var(--accent)] animate-pulse" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[var(--text-secondary)] hover:text-red-500 hover:bg-[var(--surface-2)]"
                onClick={() => onToggleFavorite(dua.id)}
                aria-label="Save to favorites"
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                onClick={() => onShare(dua)}
                aria-label="Share supplication"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Arabic Calligraphy Text */}
          <p
            className="font-arabic font-bold text-right tracking-wide select-text"
            dir="rtl"
            style={{
              fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
              fontSize: currentFont.arabic,
              lineHeight: 2.25,
              wordSpacing: "2px",
              color: "var(--text-primary)",
              paddingTop: "4px",
              paddingBottom: "4px",
            }}
          >
            {dua.arabic}
          </p>

          {/* Collapsible Layer Toggles: [ ▸ Pronunciation ] [ ▸ Translation ] */}
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowPronunciation((prev) => !prev)}
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all active:scale-95"
              style={{
                background: showPronunciation ? "var(--accent-soft)" : "var(--surface-2)",
                borderColor: showPronunciation ? "var(--accent)" : "var(--border)",
                color: showPronunciation ? "var(--accent-text)" : "var(--text-secondary)",
              }}
            >
              {showPronunciation ? "▾ Pronunciation" : "▸ Pronunciation"}
            </button>
            <button
              type="button"
              onClick={() => setShowTranslation((prev) => !prev)}
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all active:scale-95"
              style={{
                background: showTranslation ? "var(--accent-soft)" : "var(--surface-2)",
                borderColor: showTranslation ? "var(--accent)" : "var(--border)",
                color: showTranslation ? "var(--accent-text)" : "var(--text-secondary)",
              }}
            >
              {showTranslation ? "▾ Translation" : "▸ Translation"}
            </button>
          </div>

          {/* Transliteration */}
          {showPronunciation && (
            <p
              className="font-serif italic leading-relaxed pt-1"
              style={{
                fontSize: currentFont.translation,
                color: "var(--accent-text)",
              }}
            >
              {dua.transliteration}
            </p>
          )}

          {/* Translation */}
          {showTranslation && (
            <p
              className={`leading-relaxed font-medium ${contentLang === 'ur' ? 'font-urdu text-right text-base leading-[2.35]' : isRtl ? 'font-arabic text-right text-base leading-loose' : ''}`}
              dir={isRtl ? 'rtl' : 'ltr'}
              style={{
                fontSize: currentFont.translation,
                color: "var(--text-primary)",
                opacity: 0.95,
              }}
            >
              {translatedTranslation || dua.translation}
            </p>
          )}

          {/* Footer: Tactile Inline Tap Counter + Authentic Source Reference */}
          <div
            className="flex items-center justify-between pt-3 border-t mt-1 gap-2"
            style={{ borderColor: "var(--border)" }}
          >
            {/* Tactile Repetition Tap Counter */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleTap}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all active:scale-95 shadow-sm"
                style={{
                  background: isComplete ? "var(--accent)" : "var(--surface-2)",
                  borderColor: isComplete ? "var(--accent)" : "var(--border)",
                  color: isComplete ? "var(--on-accent)" : "var(--text-primary)",
                }}
                aria-label={`Tap counter ${counter} of ${targetCount}`}
              >
                <span className="font-mono text-xs">{counter} / {targetCount}</span>
                {isComplete ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <span className="text-[10px] text-[var(--accent-text)] font-semibold">+ Tap</span>
                )}
              </button>

              {counter > 0 && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                  title="Reset counter"
                  aria-label="Reset counter"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Authentic Source Reference */}
            <div
              className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] text-right truncate max-w-[170px]"
              title={dua.reference || "Authentic Supplication"}
            >
              {dua.reference || "Hisn al-Muslim"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.dua.id === nextProps.dua.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isDuaOfDay === nextProps.isDuaOfDay &&
    prevProps.fontLevel === nextProps.fontLevel
  );
});

const Duas = memo(function Duas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [fontLevel, setFontLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("duas_font_level");
      return saved ? Math.max(0, Math.min(4, parseInt(saved, 10))) : 2;
    } catch {
      return 2;
    }
  });

  const handleFontChange = (newLevel: number) => {
    const clamped = Math.max(0, Math.min(4, newLevel));
    setFontLevel(clamped);
    try {
      localStorage.setItem("duas_font_level", clamped.toString());
    } catch {
      // Storage fallback
    }
  };

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const duaOfDay = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return duasData[dayOfYear % duasData.length];
  }, []);

  const filteredDuas = useMemo(() => {
    return duasData.filter((dua) => {
      if (selectedCategory !== "All" && dua.category !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          dua.translation.toLowerCase().includes(q) ||
          dua.transliteration.toLowerCase().includes(q) ||
          dua.arabic.includes(q) ||
          (dua.reference && dua.reference.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  const handleToggleFavorite = (duaId: string) => {
    const isFavorite = toggleFavorite(duaId);
    setFavorites(getFavorites());
    toast({
      title: isFavorite ? "Added to favorites" : "Removed from favorites",
    });
  };

  const shareDua = async (dua: Dua) => {
    const shareText = `"${dua.arabic}"\n\n${dua.transliteration}\n\nTranslation: ${dua.translation}\n— Source: ${dua.reference || "Hisn al-Muslim"}\nShared via Noor Connect`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `Dua - ${dua.category}`, text: shareText });
      } catch {
        // Share dismiss guard
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header with Row 1 (Back + Title + Font Sizer) and Row 2 (Full-Width Language Bar) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-[var(--text-primary)] font-serif italic tracking-tight truncate">
                  Duas
                </h1>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mt-0.5 truncate">
                  {duasData.length} Supplications
                </p>
              </div>
            </div>

            {/* Compact [ - ] A [ + ] Font Sizer */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full border shadow-sm shrink-0"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
              title="Adjust Arabic & translation font size"
            >
              <button
                type="button"
                disabled={fontLevel <= 0}
                onClick={() => handleFontChange(fontLevel - 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs disabled:opacity-30 active:scale-95 text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                aria-label="Decrease supplication font size"
              >
                -
              </button>
              <span className="text-xs font-bold px-1 text-[var(--accent-text)]">A</span>
              <button
                type="button"
                disabled={fontLevel >= 4}
                onClick={() => handleFontChange(fontLevel + 1)}
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs disabled:opacity-30 active:scale-95 text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                aria-label="Increase supplication font size"
              >
                +
              </button>
            </div>
          </div>

          <ContentLanguageBar fullWidth />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
          <Input
            placeholder="Search duas, keywords, or references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-xl border shadow-sm focus-visible:ring-[var(--accent)]"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Categories */}
        <ScrollArea className="h-11">
          <div className="flex gap-2 pb-2">
            {duaCategories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className="whitespace-nowrap text-xs px-3.5 py-1.5 rounded-full font-bold shadow-sm transition-all border active:scale-95"
                  style={{
                    background: isSelected ? "var(--accent)" : "var(--surface)",
                    borderColor: isSelected ? "var(--accent)" : "var(--border)",
                    color: isSelected ? "var(--on-accent)" : "var(--text-secondary)",
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Results count & Filter toggle */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {filteredDuas.length} {filteredDuas.length === 1 ? "dua" : "duas"}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {favorites.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-[var(--text-secondary)] hover:text-red-500"
              onClick={() => setSelectedCategory("All")}
            >
              <Heart className="w-3 h-3 fill-red-500 text-red-500" />
              <span>{favorites.length} saved</span>
            </Button>
          )}
        </div>

        {/* Dua of the Day */}
        {selectedCategory === "All" && !searchQuery && (
          <DuaCard
            dua={duaOfDay}
            isFavorite={favorites.includes(duaOfDay.id)}
            onToggleFavorite={handleToggleFavorite}
            onShare={shareDua}
            isDuaOfDay
            fontLevel={fontLevel}
          />
        )}

        {/* Duas List */}
        <div className="space-y-4 pb-24">
          {filteredDuas.length === 0 ? (
            <Card
              className="p-8 text-center rounded-2xl border shadow-sm"
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
              }}
            >
              <BookHeart className="w-12 h-12 mx-auto text-[var(--text-secondary)] opacity-40 mb-3" />
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
                No supplications found
              </p>
              <Button
                variant="outline"
                size="sm"
                className="font-bold rounded-xl"
                style={{
                  background: "var(--surface-2)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Clear filters
              </Button>
            </Card>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredDuas.map((dua) => (
                <div key={dua.id} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 260px" }}>
                  <DuaCard
                    dua={dua}
                    isFavorite={favorites.includes(dua.id)}
                    onToggleFavorite={handleToggleFavorite}
                    onShare={shareDua}
                    fontLevel={fontLevel}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default Duas;
