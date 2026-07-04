import { useState, useEffect } from "react";
import { moods, type Mood, type MoodContent } from "@/data/mood-data";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Play, Copy, Check, Sparkles, BookOpen, Quote, Heart, Target, ArrowRight } from "lucide-react";
import { useGlobalQuran } from "@/lib/global-quran";
import { useToast } from "@/hooks/use-toast";
import { pickNonRepeatingIndex } from "@/lib/non-repeating-picker";
import { remedyGamification } from "@/lib/remedy-gamification";

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

export function EnhancedMoodSelector() {
  const initialMood = moods[0] ?? null;
  const [selectedMood, setSelectedMood] = useState<Mood | null>(initialMood);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>(() => {
    if (!initialMood) return {};
    return { [initialMood.id]: pickMoodIndex(initialMood) };
  });
  const [copied, setCopied] = useState(false);

  const { playSurah, reciter } = useGlobalQuran();
  const { toast } = useToast();

  useEffect(() => {
    setSelectedMood(initialMood);
  }, []);

  const currentIndex = selectedMood ? activeIndexes[selectedMood.id] ?? 0 : 0;
  const currentItem = selectedMood ? selectedMood.content[currentIndex] ?? selectedMood.content[0] : null;
  const remedyId = currentItem ? `${selectedMood?.id}-${currentIndex}` : '';

  const handleMoodClick = (mood: Mood) => {
    setSelectedMood(mood);
    setActiveIndexes((prev) => {
      if (typeof prev[mood.id] === "number") return prev;
      return { ...prev, [mood.id]: pickMoodIndex(mood) };
    });
  };

  const handleNext = () => {
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
      toast({
        title: "Reciter loading",
        description: "Please wait for the Quran player to initialize.",
        variant: "destructive",
      });
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'surah': return 'bg-blue-500';
      case 'ayah': return 'bg-green-500';
      case 'dua': return 'bg-purple-500';
      case 'hadith': return 'bg-orange-500';
      case 'dhikr': return 'bg-teal-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 p-3">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">What's on your mind?</h2>
          <p className="text-sm text-muted-foreground">Pick a feeling to receive guidance</p>
        </div>
      </div>

      {/* Mood Selection */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {moods.map((mood) => {
          const Icon = mood.icon;
          const isActive = selectedMood?.id === mood.id;

          return (
            <button
              key={mood.id}
              type="button"
              onClick={() => handleMoodClick(mood)}
              className={`flex-shrink-0 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-300 ${
                isActive
                  ? "border-primary/50 bg-primary/10 text-primary shadow-lg shadow-primary/20 scale-105"
                  : "border-border/60 bg-card/70 text-foreground hover:border-primary/30 hover:bg-primary/5 hover:shadow-md"
              }`}
              aria-label={`Show remedies for ${mood.label}`}
            >
              <div className={`rounded-xl p-2 transition-colors duration-300 ${
                isActive ? selectedMood.gradient : 'bg-muted/50'
              }`}>
                <Icon className={`h-5 w-5 transition-colors duration-300 ${
                  isActive ? selectedMood.color : 'text-muted-foreground'
                }`} />
              </div>
              <div className="text-left">
                <span className="block">{mood.label}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Remedy Display */}
      {selectedMood && currentItem ? (
        <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-6 shadow-sm overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className={`rounded-2xl p-3 transition-all duration-300 ${selectedMood.gradient} shadow-lg`}>
                <selectedMood.icon className={`h-6 w-6 ${selectedMood.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">{selectedMood.label} remedy</p>
                <p className="text-sm text-muted-foreground">{currentItem.reference}</p>
                {selectedMood.description && (
                  <p className="text-sm text-primary mt-1 font-medium">{selectedMood.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${getTypeColor(currentItem.type)} flex items-center gap-1`}>
                {getTypeIcon(currentItem.type)}
                {currentItem.type}
              </div>
              {currentItem.category && (
                <Badge variant="outline" className="text-xs px-2 py-1">
                  {currentItem.category}
                </Badge>
              )}
            </div>
          </div>

          {currentItem.arabic && (
            <div className="rounded-2xl bg-gradient-to-r from-muted/60 to-muted/30 p-4 mb-4">
              <p className="text-right font-arabic text-2xl leading-[1.9] text-foreground" dir="rtl">
                {currentItem.arabic}
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-border/40 bg-card/70 p-4 mb-6">
            <p className="text-base leading-relaxed text-foreground/90">
              {currentItem.text}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {currentItem.type === "surah" && currentItem.surahNumber && (
              <Button size="sm" className="rounded-full px-4 py-2 h-auto bg-green-600 hover:bg-green-700" onClick={handlePlaySurah}>
                <Play className="me-2 h-4 w-4" />
                Play Surah
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-full px-4 py-2 h-auto border-border/60 hover:bg-blue-50 hover:border-blue-200" onClick={handleCopy}>
              {copied ? <Check className="me-2 h-4 w-4 text-green-600" /> : <Copy className="me-2 h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" className="rounded-full px-4 py-2 h-auto bg-primary hover:bg-primary/90 ml-auto" onClick={handleNext}>
              <ArrowRight className="me-2 h-4 w-4" />
              Next
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-border/60 bg-muted/20 p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="rounded-full bg-muted/50 p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Select a mood to get started</h3>
            <p className="text-sm text-muted-foreground">
              Choose how you're feeling and receive personalized Islamic remedies from the Quran and Sunnah.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
