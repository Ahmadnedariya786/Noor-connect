/**
 * Enhanced Daily Ayah Widget
 * Features real-time rotation, authentic Amiri Arabic typography,
 * text truncation with Read More / Show Less, and premium dark/emerald aesthetics.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Share2, Copy, Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ayah {
  arabic: string;
  translation: string;
  surah: string;
  surahNumber: number;
  ayahNumber: number;
  reflection?: string;
}

const ayahCollection: Ayah[] = [
  { 
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.", 
    surah: "Al-Fatiha", 
    surahNumber: 1,
    ayahNumber: 1,
    reflection: "Begin every task in Allah's name for blessings and success in this life and the next."
  },
  { 
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", 
    translation: "All praise is due to Allah, Lord of the worlds.", 
    surah: "Al-Fatiha", 
    surahNumber: 1,
    ayahNumber: 2,
    reflection: "Gratitude opens the doors to more blessings and expands the heart with peace."
  },
  { 
    arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", 
    translation: "You alone we worship, and You alone we ask for help.", 
    surah: "Al-Fatiha", 
    surahNumber: 1,
    ayahNumber: 5,
    reflection: "True dependence is only on Allah; freeing oneself from relying on created beings brings dignity."
  },
  { 
    arabic: "وَإِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ ۖ لَّا إِلَٰهَ إِلَّا هُوَ الرَّحْمَٰنُ الرَّحِيمُ", 
    translation: "And your god is one God. There is no deity except Him, the Entirely Merciful, the Especially Merciful.", 
    surah: "Al-Baqarah", 
    surahNumber: 2,
    ayahNumber: 163,
    reflection: "Tawhid is the unshakable foundation of genuine faith and profound spiritual tranquility."
  },
  { 
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ", 
    translation: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep.", 
    surah: "Al-Baqarah", 
    surahNumber: 2,
    ayahNumber: 255,
    reflection: "Allah is eternal, all-powerful, and watches over every heartbeat of creation without weariness."
  },
  { 
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", 
    translation: "Our Lord, give us in this world good and in the Hereafter good, and protect us from the punishment of the Fire.", 
    surah: "Al-Baqarah", 
    surahNumber: 2,
    ayahNumber: 201,
    reflection: "Maintain a healthy balance between righteous worldly aspirations and sincere preparation for the eternal Hereafter."
  },
  { 
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", 
    translation: "Allah does not burden a soul beyond that it can bear.", 
    surah: "Al-Baqarah", 
    surahNumber: 2,
    ayahNumber: 286,
    reflection: "Have firm confidence in Allah's boundless wisdom, compassion, and perfect timing in every test."
  },
  { 
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", 
    translation: "And whoever relies upon Allah - then He is sufficient for him.", 
    surah: "At-Talaq", 
    surahNumber: 65,
    ayahNumber: 3,
    reflection: "Complete trust in Allah dispels fear of tomorrow and brings tranquility to the restless heart."
  },
  { 
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", 
    translation: "Indeed, with hardship comes ease.", 
    surah: "Ash-Sharh", 
    surahNumber: 94,
    ayahNumber: 6,
    reflection: "Every difficulty is accompanied and followed by divine relief and enduring strength."
  },
  { 
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", 
    translation: "Unquestionably, by the remembrance of Allah hearts are assured and find peace.", 
    surah: "Ar-Ra'd", 
    surahNumber: 13,
    ayahNumber: 28,
    reflection: "True contentment and inner calm are found exclusively in the conscious, continuous remembrance of Allah."
  },
  {
    arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ",
    translation: "And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the supplicant when he calls upon Me.",
    surah: "Al-Baqarah",
    surahNumber: 2,
    ayahNumber: 186,
    reflection: "Allah is closer to you than anyone else; never hesitate to pour your heart out in sincere dua."
  },
  {
    arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    translation: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.",
    surah: "Al-Baqarah",
    surahNumber: 2,
    ayahNumber: 152,
    reflection: "When you mention Allah, the Creator of the heavens and the earth mentions you among the assembly of noble angels."
  }
];

const AYAH_STORAGE_KEY = "enhanced-daily-ayah";
const LAST_UPDATE_KEY = "ayah-last-update";
const AYAH_BOOKMARKS_KEY = "daily-ayah-bookmarks";

export function EnhancedDailyAyah() {
  const navigate = useNavigate();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTranslationExpanded, setIsTranslationExpanded] = useState(false);
  const [isReflectionExpanded, setIsReflectionExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { toast } = useToast();

  const getBookmarkId = useCallback((item: Ayah): string => {
    return `${item.surahNumber || item.surah}:${item.ayahNumber}`;
  }, []);

  // Sync bookmark status whenever the active Ayah changes
  useEffect(() => {
    if (!ayah) return;
    try {
      const raw = localStorage.getItem(AYAH_BOOKMARKS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      setIsBookmarked(list.includes(getBookmarkId(ayah)));
    } catch (err) {
      // Gracefully handle localStorage parsing error
      console.warn("Could not read ayah bookmarks:", err);
      setIsBookmarked(false);
    }
  }, [ayah, getBookmarkId]);

  const toggleBookmark = useCallback(() => {
    if (!ayah) return;
    try {
      const raw = localStorage.getItem(AYAH_BOOKMARKS_KEY);
      let list: string[] = raw ? JSON.parse(raw) : [];
      const id = getBookmarkId(ayah);
      let nextState = false;

      if (list.includes(id)) {
        list = list.filter((item) => item !== id);
        nextState = false;
      } else {
        list.push(id);
        nextState = true;
      }

      localStorage.setItem(AYAH_BOOKMARKS_KEY, JSON.stringify(list));
      setIsBookmarked(nextState);
      toast({
        title: nextState ? "Bookmarked!" : "Bookmark removed",
        description: nextState ? `Saved ${ayah.surah} (${ayah.surahNumber}:${ayah.ayahNumber})` : undefined,
      });
    } catch (err) {
      // Gracefully handle storage quota or access issues
      console.warn("Could not save ayah bookmark:", err);
    }
  }, [ayah, getBookmarkId, toast]);

  const getDailyAyah = useCallback(() => {
    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    const storedAyah = localStorage.getItem(AYAH_STORAGE_KEY);

    // If it's a new day or no stored ayah, get daily index
    if (lastUpdate !== today || !storedAyah) {
      const dayOfYear = Math.floor(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const index = dayOfYear % ayahCollection.length;
      const selectedAyah = ayahCollection[index];
      
      localStorage.setItem(AYAH_STORAGE_KEY, JSON.stringify(selectedAyah));
      localStorage.setItem(LAST_UPDATE_KEY, today);
      return selectedAyah;
    }

    try {
      return JSON.parse(storedAyah);
    } catch (err) {
      // Fallback on JSON parse error
      console.warn("Error parsing stored ayah, resetting:", err);
      return ayahCollection[0];
    }
  }, []);

  const loadAyah = useCallback(() => {
    try {
      const selectedAyah = getDailyAyah();
      setAyah((prev) => {
        if (
          prev &&
          prev.surahNumber === selectedAyah.surahNumber &&
          prev.ayahNumber === selectedAyah.ayahNumber
        ) {
          return prev;
        }
        return selectedAyah;
      });
    } catch (error) {
      console.error("Error loading ayah:", error);
      setAyah(ayahCollection[0]); // Fallback
    } finally {
      setLoading(false);
    }
  }, [getDailyAyah]);

  useEffect(() => {
    loadAyah();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAyah();
      }
    };

    const handleRefresh = () => {
      loadAyah();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("widget-refresh", handleRefresh);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("widget-refresh", handleRefresh);
    };
  }, [loadAyah]);

  const refreshAyah = () => {
    setIsAnimating(true);
    setIsTranslationExpanded(false);
    setIsReflectionExpanded(false);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * ayahCollection.length);
      setAyah(ayahCollection[randomIndex]);
      setIsAnimating(false);
    }, 300);
  };

  const shareAyah = async () => {
    if (!ayah) return;
    
    const text = `"${ayah.translation}"\n\n— Quran ${ayah.surah} (${ayah.surahNumber}:${ayah.ayahNumber})\n\n#NoorConnect #Quran`;
    
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied!",
          description: "Ayah copied to clipboard",
        });
      }
    } catch (error) {
      // Gracefully handle share cancellation or permission refusal
      console.warn("Share cancelled or failed:", error);
    }
  };

  const copyAyah = async () => {
    if (!ayah) return;
    
    try {
      const copyContent = `${ayah.arabic}\n\n"${ayah.translation}"\n\n— Quran ${ayah.surah} (${ayah.surahNumber}:${ayah.ayahNumber})`;
      await navigator.clipboard.writeText(copyContent);
      toast({
        title: "Copied!",
        description: "Ayah and translation copied to clipboard",
      });
    } catch (error) {
      console.error("Error copying ayah:", error);
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-card/95 via-card/85 to-emerald-950/20 shadow-xl shadow-black/25">
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted/60 rounded-md w-1/4" />
            <div className="h-8 bg-muted/60 rounded-md w-3/4" />
            <div className="h-6 bg-muted/60 rounded-md w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ayah) return null;

  // Determine if translation or reflection is long enough to warrant truncation (>2 lines on mobile)
  const isTranslationLong = (ayah.translation?.length || 0) > 95;
  const isReflectionLong = (ayah.reflection?.length || 0) > 80;

  return (
    <Card className="relative overflow-hidden rounded-2xl border border-emerald-500/25 hover:border-emerald-500/40 bg-gradient-to-br from-card/95 via-card/90 to-emerald-950/25 shadow-xl shadow-black/25 transition-all duration-300">
      {/* Radiant Top Emerald Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-80" />
      
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl" />

      <CardContent className="p-4 sm:p-6 space-y-4 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-xs shrink-0">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-400">
                  Noble Quran
                </span>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
                  {ayah.surah} • {ayah.ayahNumber}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm sm:text-base leading-snug">
                  Daily Ayah
                </h3>
                <span className="text-muted-foreground/60 text-xs">•</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  Surah {ayah.surah}
                </span>
              </div>
            </div>
          </div>
          
          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-lg bg-emerald-950/20 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 transition-all duration-200 active:scale-95 shadow-xs ${
                isBookmarked ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/20" : "text-emerald-400/80 hover:text-emerald-300"
              }`}
              onClick={toggleBookmark}
              title="Bookmark Ayah"
              aria-label="Bookmark ayah"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-emerald-400 text-emerald-300" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-emerald-950/20 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400/80 hover:text-emerald-300 transition-all duration-200 active:scale-95 shadow-xs"
              onClick={copyAyah}
              title="Copy Ayah"
              aria-label="Copy ayah"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-emerald-950/20 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400/80 hover:text-emerald-300 transition-all duration-200 active:scale-95 shadow-xs"
              onClick={refreshAyah}
              title="Another Ayah"
              aria-label="Show another ayah"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isAnimating ? "animate-spin text-emerald-300" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg bg-emerald-950/20 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400/80 hover:text-emerald-300 transition-all duration-200 active:scale-95 shadow-xs"
              onClick={shareAyah}
              title="Share Ayah"
              aria-label="Share ayah"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Arabic Typography Section - Always shown in full */}
        <div className={`transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <div className="bg-emerald-950/25 rounded-xl p-3.5 sm:p-4 border border-emerald-500/30">
            <p
              className="font-amiri text-2xl sm:text-[26px] leading-[1.8] text-emerald-100/95 dark:text-emerald-100 text-right drop-shadow-sm select-text break-words"
              dir="rtl"
              style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif" }}
            >
              {ayah.arabic}
            </p>
          </div>
        </div>

        {/* Elegant Islamic Divider */}
        <div className="flex items-center gap-3 my-2 select-none">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-emerald-500/10" />
          <span className="text-emerald-400/70 text-xs font-serif">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-emerald-500/30 to-emerald-500/10" />
        </div>

        {/* English Translation Section */}
        <div className={`space-y-2 transition-all duration-300 ${isAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
          <p
            className={`text-[15px] sm:text-base leading-[1.6] text-slate-200 dark:text-[#e5e7eb] font-normal break-words select-text transition-all duration-300 ${
              !isTranslationExpanded && isTranslationLong ? "line-clamp-2" : ""
            }`}
          >
            {ayah.translation}
          </p>

          {/* Read More / Show Less Toggle Button for Translation */}
          {isTranslationLong && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsTranslationExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors py-1 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 active:scale-95 cursor-pointer"
                aria-expanded={isTranslationExpanded}
              >
                <span>{isTranslationExpanded ? "Show Less" : "Read More"}</span>
                {isTranslationExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Reflection (if available) with optional truncation if >2 lines */}
        {ayah.reflection && (
          <div className="p-3 rounded-xl bg-emerald-500/5 border-l-2 border-emerald-500/80 text-xs sm:text-sm text-muted-foreground italic leading-relaxed space-y-1.5">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-400 font-semibold not-italic shrink-0">Reflection:</span>
              <p
                className={`break-words select-text transition-all duration-300 ${
                  !isReflectionExpanded && isReflectionLong ? "line-clamp-2" : ""
                }`}
              >
                {ayah.reflection}
              </p>
            </div>
            {isReflectionLong && (
              <button
                type="button"
                onClick={() => setIsReflectionExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors py-0.5 px-2 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 active:scale-95 cursor-pointer"
                aria-expanded={isReflectionExpanded}
              >
                <span>{isReflectionExpanded ? "Show Less" : "Read More"}</span>
                {isReflectionExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Revelation and Surah Info Pill */}
        <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/35 p-2.5 sm:p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-200/80">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-emerald-400 font-semibold shrink-0">Revelation:</span>
            <span className="text-emerald-100 font-medium truncate">
              {ayah.surah} (Surah {ayah.surahNumber})
            </span>
          </div>
          <div className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/35 shrink-0 self-start sm:self-auto font-medium">
            <span>Ayah {ayah.ayahNumber}</span>
          </div>
        </div>

        {/* Action Buttons & Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-emerald-500/25">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 font-bold px-3 py-1.5 h-8 text-xs inline-flex items-center shadow-md shadow-emerald-950/40 hover:brightness-105 active:scale-95 transition-all duration-200 cursor-pointer"
              onClick={() => navigate(`/quran/surah-${ayah.surahNumber}`)}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-950 stroke-[2.5]" />
              Read Surah
            </button>
            <button
              type="button"
              className="gap-2 rounded-xl bg-emerald-500/[0.14] border border-emerald-500/[0.45] text-emerald-300 hover:bg-emerald-500/25 px-3 py-1.5 h-8 text-xs font-semibold inline-flex items-center active:scale-95 transition-all duration-200 cursor-pointer"
              onClick={() => navigate("/quran")}
            >
              <span>All Surahs</span>
            </button>
          </div>
          
          <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Updated daily at Fajr
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedDailyAyah;
