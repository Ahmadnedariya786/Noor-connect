import { useState, useMemo } from "react";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";
import { Heart, Sparkles, BookOpen, Quote, Target, Play, Copy, Check, X, ArrowRight, Search, HeartHandshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { moods, type Mood, type MoodContent } from "@/data/mood-data";
import { useGlobalQuran } from "@/lib/global-quran";
import { useToast } from "@/hooks/use-toast";
import { pickNonRepeatingIndex } from "@/lib/non-repeating-picker";
import { remedyGamification } from "@/lib/remedy-gamification";
import { useLanguage } from "@/contexts/LanguageContext-new";

const storageKeyForMood = (moodId: string) => `dashboard-mood-remedy-${moodId}`;

const pickMoodIndex = (mood: Mood, exclude: number[] = []) =>
  pickNonRepeatingIndex({
    storageKey: storageKeyForMood(mood.id),
    length: mood.content.length,
    maxRecent: 3,
    exclude,
  });

const toCopyText = (item: MoodContent) =>
  `${item.arabic ? `${item.arabic}\n\n` : ""}${item.text}\n${item.reference}`;

const TYPE_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  surah: { bg: "bg-blue-500", icon: <BookOpen className="h-3 w-3" /> },
  ayah: { bg: "bg-green-500", icon: <Quote className="h-3 w-3" /> },
  dua: { bg: "bg-purple-500", icon: <Heart className="h-3 w-3" /> },
  hadith: { bg: "bg-orange-500", icon: <Sparkles className="h-3 w-3" /> },
  dhikr: { bg: "bg-teal-500", icon: <Target className="h-3 w-3" /> },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};

const moodCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } },
};

const viewerTextVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function IslamicRemedies() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"prompt" | "viewing">("prompt");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { playSurah, reciter } = useGlobalQuran();
  const { toast } = useToast();

  const dailyRemedy = useMemo(() => remedyGamification.getDailyRemedy(), [phase]);
  const favorites = useMemo(() => remedyGamification.getFavorites(), [phase]);

  const currentIndex = selectedMood ? activeIndexes[selectedMood.id] ?? 0 : 0;
  const currentItem = selectedMood ? selectedMood.content[currentIndex] ?? selectedMood.content[0] : null;
  const remedyId = selectedMood ? `${selectedMood.id}-${currentIndex}` : "";
  const isFav = currentItem && selectedMood ? remedyGamification.isFavorite(remedyId) : false;

  const getTypeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES.ayah;

  const filteredMoods = useMemo(() => {
    if (!searchQuery && typeFilter === "all") return moods;
    return moods.filter(m => {
      const matchesSearch = !searchQuery ||
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.some(c => c.text.toLowerCase().includes(searchQuery.toLowerCase()) || c.reference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || m.content.some(c => c.type === typeFilter);
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter]);

  const handleMoodClick = (mood: Mood) => {
    setSelectedMood(mood);
    setActiveIndexes(prev => {
      if (typeof prev[mood.id] === "number") return prev;
      return { ...prev, [mood.id]: pickMoodIndex(mood) };
    });
    setPhase("viewing");
  };

  const handleNext = () => {
    if (!selectedMood) return;
    const nextIndex = pickMoodIndex(selectedMood, [currentIndex]);
    setActiveIndexes(prev => ({ ...prev, [selectedMood.id]: nextIndex }));
    if (currentItem) {
      remedyGamification.updateStats(selectedMood.id, currentItem.type);
    }
  };

  const handlePlaySurah = () => {
    if (!selectedMood || !currentItem?.surahNumber) return;
    if (!reciter) {
      toast({ title: "Reciter loading", description: "Please wait for the Quran player to initialize.", variant: "destructive" });
      return;
    }
    playSurah(currentItem.surahNumber, currentItem.reference, reciter);
    toast({ title: "Playing Surah", description: `Now playing ${currentItem.reference}.` });
  };

  const handleCopy = async () => {
    if (!currentItem) return;
    try {
      await navigator.clipboard.writeText(toCopyText(currentItem));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is not available on this device.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = () => {
    if (!currentItem || !selectedMood) return;
    if (isFav) {
      remedyGamification.removeFromFavorites(remedyId);
      toast({ title: "Removed from favorites" });
    } else {
      remedyGamification.addToFavorites({
        id: remedyId,
        moodId: selectedMood.id,
        text: currentItem.text,
        arabic: currentItem.arabic,
        reference: currentItem.reference,
        type: currentItem.type,
      });
      toast({ title: "Saved to favorites" });
    }
  };

  const handleCloseViewer = () => {
    setPhase("prompt");
    setSelectedMood(null);
  };

  if (phase === "viewing" && selectedMood && currentItem) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-background via-primary/[0.03] to-primary/[0.08] flex flex-col">
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-5 py-6 space-y-6">
            <div className="flex items-center gap-3">
              <button onClick={handleCloseViewer} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0 shadow-md", selectedMood.gradient)}>
                <selectedMood.icon className={cn("w-5 h-5", selectedMood.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{selectedMood.label}</p>
                <p className="text-xs text-muted-foreground truncate">{currentItem.reference}</p>
              </div>
              <button onClick={handleToggleFavorite} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0", isFav ? "bg-rose-500/15 text-rose-500" : "bg-muted text-muted-foreground hover:text-rose-500")}>
                <Heart className={cn("w-5 h-5", isFav && "fill-current")} />
              </button>
            </div>

            <m.div
              key={currentIndex}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 flex flex-col justify-center space-y-6"
            >
              {currentItem.arabic && (
                <m.div variants={viewerTextVariants} className="rounded-3xl bg-gradient-to-br from-primary/[0.06] via-muted/40 to-transparent p-6 border border-primary/10 shadow-lg shadow-primary/[0.03]">
                  <p className="text-right font-arabic text-3xl md:text-4xl leading-[2.2] text-foreground" dir="rtl">
                    {currentItem.arabic}
                  </p>
                </m.div>
              )}

              <m.div variants={viewerTextVariants} className="bg-card border border-border/60 rounded-3xl p-5 space-y-4 shadow-sm">
                <p className="text-base leading-relaxed text-foreground/90">
                  {currentItem.text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1", getTypeStyle(currentItem.type).bg)}>
                    {getTypeStyle(currentItem.type).icon}
                    {currentItem.type}
                  </div>
                  {currentItem.category && (
                    <Badge variant="outline" className="text-xs px-2">{currentItem.category}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{currentItem.reference}</span>
                </div>
              </m.div>
            </m.div>

            <m.div variants={viewerTextVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-3 pt-2">
              {currentItem.type === "surah" && currentItem.surahNumber && (
                <button onClick={handlePlaySurah} className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors shadow-lg shadow-green-600/20">
                  <Play className="w-3.5 h-3.5" /> Play Surah
                </button>
              )}
              <button onClick={handleCopy} className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={handleNext} className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors shadow-lg shadow-primary/20 ml-auto">
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </m.div>

            <m.div variants={viewerTextVariants} initial="hidden" animate="visible" className="text-center">
              <button onClick={handleCloseViewer} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                Choose a different mood
              </button>
            </m.div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-32">
        <AppBar
          title={t("islamicWellness") || "Islamic Wellness"}
          showBack={true}
          action={
            <button onClick={() => navigate("/remedy-favorites")} className="relative">
              <Heart className="w-5 h-5 text-foreground/80" />
              {favorites.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-xs font-bold text-white flex items-center justify-center">
                  {favorites.length > 9 ? "9+" : favorites.length}
                </span>
              )}
            </button>
          }
        />

        <div className="px-5 pt-4 space-y-5">
          {dailyRemedy && !dailyRemedy.completed && (
            <div className="bg-gradient-to-r from-primary/[0.12] to-primary/[0.06] border border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm shadow-primary/5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">Today's Remedy</p>
                <p className="text-sm font-medium text-foreground truncate">{dailyRemedy.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dailyRemedy.reference}</p>
              </div>
              <button
                onClick={() => {
                  remedyGamification.completeDailyRemedy();
                  toast({ title: "Daily remedy complete! +25 XP" });
                }}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center hover:bg-primary/25 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Check className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}

          <div className="space-y-5">
            <div className="text-center py-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-3 border border-primary/10 shadow-inner">
                <HeartHandshake className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">How are you feeling?</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Select your mood to receive guidance from the Quran and Sunnah.</p>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {["all", "surah", "ayah", "dua", "hadith", "dhikr"].map(t => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                      typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
                    )}
                  >
                    {t === "all" ? `All (${moods.length})` : t}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search moods or remedies..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-2xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <m.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {filteredMoods.map(mood => {
                const Icon = mood.icon;
                return (
                  <m.button
                    key={mood.id}
                    variants={moodCardVariants}
                    onClick={() => handleMoodClick(mood)}
                    className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:ring-2 hover:ring-primary/10 transition-all duration-300"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
                      mood.gradient
                    )}>
                      <Icon className={cn("w-7 h-7", mood.color)} />
                    </div>
                    <span className="text-xs font-bold text-foreground text-center leading-tight">{mood.label}</span>
                  </m.button>
                );
              })}
            </m.div>

            {filteredMoods.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No moods match your search. Try a different term.
              </div>
            )}

            <div className="flex gap-3 justify-center pt-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/remedy-favorites")} className="rounded-full text-xs gap-2">
                <Heart className="w-3.5 h-3.5" /> Saved ({favorites.length})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}