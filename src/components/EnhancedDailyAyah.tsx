/**
 * Enhanced Daily Ayah Widget
 * Features real-time updates, beautiful animations, and daily rotation
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, RefreshCw, Share2, Volume2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Ayah {
  arabic: string;
  translation: string;
  surah: string;
  ayahNumber: number;
  reflection?: string;
}

const ayahCollection: Ayah[] = [
  { 
    arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", 
    translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful", 
    surah: "Al-Fatiha", 
    ayahNumber: 1,
    reflection: "Begin every task in Allah's name for blessings and success."
  },
  { 
    arabic: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ", 
    translation: "All praise is due to Allah, Lord of the worlds", 
    surah: "Al-Fatiha", 
    ayahNumber: 2,
    reflection: "Gratitude opens the doors to more blessings."
  },
  { 
    arabic: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ", 
    translation: "You alone we worship, and You alone we ask for help", 
    surah: "Al-Fatiha", 
    ayahNumber: 5,
    reflection: "True dependence is only on Allah."
  },
  { 
    arabic: "وَإِلَٰهُكُمْ إِلَٰهٌ وَاحِدٌ ۖ لَّا إِلَٰهَ إِلَّا هُوَ الرَّحْمَٰنُ الرَّحِيمُ", 
    translation: "And your god is one God. There is no deity except Him, the Entirely Merciful, the Especially Merciful.", 
    surah: "Al-Baqarah", 
    ayahNumber: 163,
    reflection: "Tawhid is the foundation of faith."
  },
  { 
    arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ", 
    translation: "Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence.", 
    surah: "Al-Baqarah", 
    ayahNumber: 255,
    reflection: "Allah is eternal and sustains all creation."
  },
  { 
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", 
    translation: "Our Lord, give us in this world good and in the Hereafter good, and protect us from the punishment of the Fire.", 
    surah: "Al-Baqarah", 
    ayahNumber: 201,
    reflection: "Balance between worldly and spiritual life."
  },
  { 
    arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", 
    translation: "Allah does not burden a soul beyond that it can bear.", 
    surah: "Al-Baqarah", 
    ayahNumber: 286,
    reflection: "Trust in Allah's wisdom and mercy."
  },
  { 
    arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", 
    translation: "And whoever relies upon Allah - then He is sufficient for him.", 
    surah: "At-Talaq", 
    ayahNumber: 3,
    reflection: "Complete trust in Allah brings peace."
  },
  { 
    arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", 
    translation: "Indeed, with hardship comes ease.", 
    surah: "Ash-Sharh", 
    ayahNumber: 6,
    reflection: "Every difficulty is followed by relief."
  },
  { 
    arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", 
    translation: "Unquestionably, by the remembrance of Allah hearts are assured.", 
    surah: "Ar-Ra'd", 
    ayahNumber: 28,
    reflection: "Peace is found in Allah's remembrance."
  }
];

const AYAH_STORAGE_KEY = "enhanced-daily-ayah";
const LAST_UPDATE_KEY = "ayah-last-update";

export function EnhancedDailyAyah() {
  const navigate = useNavigate();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const { toast } = useToast();

  const getDailyAyah = useCallback(() => {
    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    const storedAyah = localStorage.getItem(AYAH_STORAGE_KEY);

    // If it's a new day or no stored ayah, get new one
    if (lastUpdate !== today || !storedAyah) {
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const index = dayOfYear % ayahCollection.length;
      const selectedAyah = ayahCollection[index];
      
      localStorage.setItem(AYAH_STORAGE_KEY, JSON.stringify(selectedAyah));
      localStorage.setItem(LAST_UPDATE_KEY, today);
      return selectedAyah;
    }

    return JSON.parse(storedAyah);
  }, []);

  const loadAyah = useCallback(() => {
    try {
      const selectedAyah = getDailyAyah();
      setAyah(prev => {
        if (prev && prev.surahNumber === selectedAyah.surahNumber && prev.ayahNumber === selectedAyah.ayahNumber) {
          return prev;
        }
        return selectedAyah;
      });
    } catch (error) {
      console.error('Error loading ayah:', error);
      setAyah(ayahCollection[0]); // Fallback
    } finally {
      setLoading(false);
    }
  }, [getDailyAyah]);

  useEffect(() => {
    loadAyah();

    // Listen for app visibility changes to refresh if needed
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadAyah();
      }
    };

    // Listen for custom refresh events
    const handleRefresh = () => {
      loadAyah();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('widget-refresh', handleRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('widget-refresh', handleRefresh);
    };
  }, [loadAyah]);

  const refreshAyah = () => {
    setIsAnimating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * ayahCollection.length);
      setAyah(ayahCollection[randomIndex]);
      setIsAnimating(false);
    }, 300);
  };

  const shareAyah = async () => {
    if (!ayah) return;
    
    const text = `"${ayah.translation}"\n\n- Quran ${ayah.surah}:${ayah.ayahNumber}\n\n#NoorConnect`;
    
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
      console.error('Error sharing:', error);
    }
  };

  const copyAyah = async () => {
    if (!ayah) return;
    
    try {
      await navigator.clipboard.writeText(ayah.translation);
      toast({
        title: "Copied!",
        description: "Ayah translation copied",
      });
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ayah) return null;

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent transition-all duration-500 hover:shadow-lg hover:shadow-primary/10">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
      
      <CardContent className="p-4 sm:p-6 space-y-4 relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-primary/20 shadow-sm shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <h3 className="font-semibold text-primary text-sm sm:text-base leading-snug">Daily Ayah</h3>
              <p className="text-xs text-muted-foreground truncate">
                {ayah.surah} : {ayah.ayahNumber}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0 self-start sm:self-auto flex-wrap">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={copyAyah}
              aria-label="Copy ayah"
            >
              <Copy className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={refreshAyah}
              aria-label="Show another ayah"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground transition-transform ${isAnimating ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-primary/10 transition-colors"
              onClick={shareAyah}
              aria-label="Share ayah"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Arabic Text */}
        <div className={`text-right space-y-2 transition-all duration-500 ${isAnimating ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'}`}>
          <p className="text-xl sm:text-2xl font-arabic leading-relaxed text-primary drop-shadow-sm break-words" dir="rtl">
            {ayah.arabic}
          </p>
        </div>

        {/* Translation */}
        <div className={`space-y-2 transition-all duration-500 delay-100 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
          <p className="text-sm sm:text-base leading-relaxed text-foreground font-medium break-words">
            {ayah.translation}
          </p>
        </div>

        {/* Reflection */}
        {ayah.reflection && (
          <div className={`p-3 rounded-xl bg-primary/5 border border-primary/10 transition-all duration-500 delay-200 ${isAnimating ? 'opacity-0 transform translate-y-2' : 'opacity-100 transform translate-y-0'}`}>
            <p className="text-xs sm:text-sm text-muted-foreground italic leading-relaxed break-words">
              💭 {ayah.reflection}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-primary/10">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl border-primary/30 hover:bg-primary/10 h-8 text-xs font-medium self-start sm:self-auto"
            onClick={() => navigate('/quran')}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read Quran
          </Button>
          
          <div className="text-[11px] text-muted-foreground self-start sm:self-auto font-medium">
            Updated daily at Fajr
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedDailyAyah;
