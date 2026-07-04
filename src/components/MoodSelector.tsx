import { useState } from "react";
import { moods, type Mood, type MoodContent } from "@/data/mood-data";
import { Card } from "./ui/card";
import { Play, Copy, Check, Sparkles, BookOpen, Quote, Heart, Target, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGlobalQuran } from "@/lib/global-quran";
import { useToast } from "@/hooks/use-toast";
import { pickNonRepeatingIndex } from "@/lib/non-repeating-picker";
import { remedyGamification } from "@/lib/remedy-gamification";
import { cn } from "@/lib/utils";

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

export function MoodSelector() {
  const navigate = useNavigate();
  const initialMood = moods[0] ?? null;
  const [selectedMood, setSelectedMood] = useState<Mood | null>(initialMood);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>(() => {
    if (!initialMood) return {};
    return { [initialMood.id]: pickMoodIndex(initialMood) };
  });
  const [copied, setCopied] = useState(false);
  const { playSurah, reciter } = useGlobalQuran();
  const { toast } = useToast();

  const currentIndex = selectedMood ? activeIndexes[selectedMood.id] ?? 0 : 0;
  const currentItem = selectedMood ? selectedMood.content[currentIndex] ?? selectedMood.content[0] : null;

  const dailyRemedy = remedyGamification.getDailyRemedy();
  const stats = remedyGamification.getStats();
  const favorites = remedyGamification.getFavorites();
  const remedyId = selectedMood ? `${selectedMood.id}-${currentIndex}` : "";
  const isFavorite = currentItem && selectedMood ? remedyGamification.isFavorite(remedyId) : false;

  const handleMoodClick = (mood: Mood) => {
    setSelectedMood(mood);
    setActiveIndexes((prev) => {
      if (typeof prev[mood.id] === "number") return prev;
      return { ...prev, [mood.id]: pickMoodIndex(mood) };
    });
  };

  const handleAnotherRemedy = () => {
    if (!selectedMood) return;
    const nextIndex = pickMoodIndex(selectedMood, [currentIndex]);
    setActiveIndexes((prev) => ({ ...prev, [selectedMood.id]: nextIndex }));
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
      toast({ title: "Remedy copied" });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is not available on this device.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = () => {
    if (!currentItem || !selectedMood) return;
    if (isFavorite) {
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'surah': return <BookOpen className="h-3 w-3" />;
      case 'ayah': return <Quote className="h-3 w-3" />;
      case 'dua': return <Heart className="h-3 w-3" />;
      case 'hadith': return <Sparkles className="h-3 w-3" />;
      case 'dhikr': return <Target className="h-3 w-3" />;
      default: return <Quote className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-base font-bold tracking-tight text-foreground">Quick Remedy</h3>
        </div>
        <div className="flex items-center gap-2">
          {stats.totalRemediesViewed > 0 && (
            <span className="text-[11px] text-muted-foreground font-semibold tabular-nums">{stats.totalRemediesViewed} viewed</span>
          )}
          <button onClick={() => navigate("/remedy-favorites")} className="relative rounded-full p-1.5 hover:bg-muted transition-colors">
            <Heart className="h-4 w-4 text-muted-foreground" />
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-rose-500 text-[7px] font-bold text-white flex items-center justify-center">
                {favorites.length > 9 ? "9+" : favorites.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {dailyRemedy && !dailyRemedy.completed && (
        <div className="bg-gradient-to-r from-primary/[0.1] to-primary/[0.05] border border-primary/15 rounded-xl px-3 py-2 flex items-center gap-3">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <p className="text-xs text-foreground/80 flex-1 truncate">
            <span className="font-semibold">Today:</span> {dailyRemedy.content}
          </p>
          <button
            onClick={() => {
              remedyGamification.completeDailyRemedy();
              toast({ title: "Daily remedy done! +25 XP" });
            }}
            className="shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition-colors"
          >
            <Check className="w-3 h-3 text-primary" />
          </button>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isActive = selectedMood?.id === mood.id;
          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => handleMoodClick(mood)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/60 bg-background/70 text-foreground hover:border-primary/30 hover:bg-primary/5"
              )}
            >
              <Icon className={cn("h-4 w-4", mood.color)} />
              <span>{mood.label}</span>
            </button>
          );
        })}
      </div>

      {selectedMood && currentItem ? (
        <Card className="space-y-3 border-border/60 bg-background/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn("rounded-xl bg-gradient-to-br p-2", selectedMood.gradient)}>
                <selectedMood.icon className={cn("h-5 w-5", selectedMood.color)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedMood.label} remedy</p>
                <p className="text-xs text-muted-foreground">{currentItem.reference}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                {getTypeIcon(currentItem.type)}
                {currentItem.type}
              </div>
              <button
                onClick={handleToggleFavorite}
                className={cn("rounded-full p-1.5 transition-colors", isFavorite ? "text-rose-500" : "text-muted-foreground hover:text-rose-500")}
              >
                <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
              </button>
            </div>
          </div>

          {currentItem.arabic && (
            <p className="rounded-xl bg-muted/40 p-3 text-right font-arabic text-2xl leading-[1.9] text-foreground" dir="rtl">
              {currentItem.arabic}
            </p>
          )}

          <p className="rounded-xl border border-border/40 bg-card/70 p-3 text-sm leading-relaxed text-foreground/90">
            {currentItem.text}
          </p>

          <div className="flex flex-wrap gap-2">
            {currentItem.type === "surah" && currentItem.surahNumber && (
              <button onClick={handlePlaySurah} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold transition-colors">
                <Play className="h-3 w-3" /> Play
              </button>
            )}
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-border/60 bg-card hover:bg-muted text-[11px] font-bold text-foreground transition-colors">
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={handleAnotherRemedy} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold transition-colors ml-auto">
              Next <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          Select a mood to get a Quran-based remedy.
        </Card>
      )}
    </div>
  );
}