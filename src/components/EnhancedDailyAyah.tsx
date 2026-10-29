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
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

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
  const { t, ui } = useLanguage();
  const [ayah, setAyah] = useState<Ayah | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTranslationExpanded, setIsTranslationExpanded] = useState(false);
  const [isReflectionExpanded, setIsReflectionExpanded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const { contentLang, isRtl } = useContentLanguage();
  const [translatedText, setTranslatedText] = useState(ayah?.translation || '');
  const [translatedReflection, setTranslatedReflection] = useState(ayah?.reflection || '');

  useEffect(() => {
    if (!ayah) return;
    if (contentLang === 'en') {
      setTranslatedText(ayah.translation);
      setTranslatedReflection(ayah.reflection || '');
      return;
    }

    let isMounted = true;
    Promise.all([
      translateIslamicText(ayah.translation, contentLang),
      ayah.reflection ? translateIslamicText(ayah.reflection, contentLang) : Promise.resolve(''),
    ]).then(([tText, tRefl]) => {
      if (isMounted) {
        setTranslatedText(tText);
        setTranslatedReflection(tRefl);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [ayah, contentLang]);
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
      localStorage.setItem('daily-ayah-cache', JSON.stringify(selectedAyah));
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
      <Card className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-xl shadow-black/25">
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
    <Card
      className="relative overflow-hidden rounded-[22px] border border-[var(--border)] transition-all duration-300"
      style={{
        background: 'linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 var(--card-sheen)',
      }}
    >
      {/* Radiant Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />
      
      {/* Ambient Top-Right Emerald/Gold Radial Aura */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, var(--accent-soft) 50%, transparent 75%)',
        }}
      />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--accent)]/5 rounded-full blur-2xl" />

      <CardContent className="p-4 sm:p-[18px] space-y-4 relative z-10">
        {/* Header Section & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent-text)] shadow-xs shrink-0">
              <BookOpen className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                minWidth: 0,
                flex: 1,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)]">
                  {ui.nobleQuran}
                </span>
                <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-semibold border border-[var(--border)] text-[var(--accent-text)] bg-[var(--accent-soft)]">
                  {ayah.surah} • {ayah.ayahNumber}
                </Badge>
              </div>
              <h3
                style={{
                  fontSize: '1.08rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  color: 'var(--text-primary)',
                  lineHeight: 1.25,
                }}
              >
                {ui.dailyAyah}
              </h3>
              <span
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                Surah {ayah.surah} • Ayah {ayah.ayahNumber}
              </span>
            </div>
          </div>
          
          {/* Compact Glass Pill Action Toolbar (34px × 34px rounded hit targets) */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--surface-2)]/80 border border-[var(--border)] backdrop-blur-sm shrink-0 self-start sm:self-auto shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className={`h-[34px] w-[34px] rounded-full transition-all duration-200 active:scale-95 ${
                isBookmarked
                  ? "text-[var(--accent-text)] bg-[var(--accent-soft)] shadow-sm shadow-[var(--accent-glow)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)]"
              }`}
              onClick={toggleBookmark}
              title="Bookmark Ayah"
              aria-label="Bookmark ayah"
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={copyAyah}
              title="Copy Ayah"
              aria-label="Copy ayah"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={refreshAyah}
              title="Another Ayah"
              aria-label="Show another ayah"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isAnimating ? "animate-spin text-[var(--accent)]" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={shareAyah}
              title="Share Ayah"
              aria-label="Share ayah"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ornamental Recessed Arabic Verse Box */}
        <div className={`transition-all duration-300 ${isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}>
          <div
            className="relative rounded-2xl p-4 sm:p-5 border border-[var(--border)] overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--bg-base) 65%, transparent)',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            {/* Corner Ornamental Accents */}
            <span className="absolute top-2 left-2 text-[10px] text-[var(--accent)]/40 select-none font-serif">✦</span>
            <span className="absolute top-2 right-2 text-[10px] text-[var(--accent)]/40 select-none font-serif">✦</span>
            <span className="absolute bottom-2 left-2 text-[10px] text-[var(--accent)]/40 select-none font-serif">✦</span>
            <span className="absolute bottom-2 right-2 text-[10px] text-[var(--accent)]/40 select-none font-serif">✦</span>

            <p
              className="font-amiri text-[var(--text-primary)] text-right drop-shadow-sm select-text break-words px-2"
              dir="rtl"
              style={{
                fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif",
                lineHeight: 2.25,
                fontSize: 'clamp(1.22rem, 4.5vw, 1.42rem)',
                wordSpacing: '2px',
                paddingTop: '8px',
                paddingBottom: '8px',
              }}
            >
              {ayah.arabic}
            </p>
          </div>
        </div>

        {/* Elegant Islamic Divider */}
        <div className="flex items-center gap-3 my-2 select-none">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/30 to-[var(--accent)]/10" />
          <span className="text-[var(--accent)] text-xs font-serif">✦</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-[var(--accent)]/30 to-[var(--accent)]/10" />
        </div>

        {/* 4-Language Content Switcher Bar */}
        <div className="flex items-center justify-between pb-1 pt-0.5">
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            {contentLang === 'ur' ? 'ترجمہ' : contentLang === 'gu' ? 'અનુવાદ' : contentLang === 'hi' ? 'अनुवाद' : 'Translation'}
          </span>
          <ContentLanguageBar compact />
        </div>

        {/* Translation Section */}
        <div className={`space-y-2 transition-all duration-300 ${isAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
          <p
            dir={isRtl ? "rtl" : "ltr"}
            className={`text-sm sm:text-[15px] leading-relaxed text-[var(--text-primary)] font-normal break-words select-text transition-all duration-300 bidi-plaintext ${
              contentLang === 'ur' ? "font-urdu text-right leading-[2.35] text-base" : isRtl ? "font-arabic text-right leading-[2.1]" : ""
            } ${!isTranslationExpanded && isTranslationLong ? "line-clamp-2" : ""}`}
            style={{ unicodeBidi: 'plaintext' }}
          >
            "{translatedText || ayah.translation}"
          </p>

          {/* Read More / Show Less Toggle Button */}
          {isTranslationLong && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsTranslationExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors py-1 px-2.5 rounded-lg bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 border border-[var(--border)] active:scale-95 cursor-pointer"
                aria-expanded={isTranslationExpanded}
              >
                <span>{isTranslationExpanded ? ui.showLess : ui.readMore}</span>
                {isTranslationExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* Reflection (with 3px solid accent border and soft glass background) */}
        {(translatedReflection || ayah.reflection) && (
          <div
            dir={isRtl ? "rtl" : "ltr"}
            className={`p-3 rounded-xl border-l-[3px] border-[var(--accent)] text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed space-y-1.5 bidi-plaintext ${
              contentLang === 'ur' ? "font-urdu text-right leading-[2.35] text-base" : isRtl ? "font-arabic text-right leading-[2.05]" : ""
            }`}
            style={{
              background: 'var(--surface-2)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
              unicodeBidi: 'plaintext',
              textAlign: isRtl ? 'right' : 'start',
            }}
          >
            <div className={`flex items-start gap-1.5 ${isRtl ? "flex-row-reverse justify-end" : ""}`}>
              <span className={`text-[var(--accent)] font-semibold not-italic shrink-0 inline-block ${contentLang === 'ur' ? 'font-urdu' : ''}`} dir={isRtl ? "rtl" : "ltr"} style={{ unicodeBidi: 'isolate' }}>
                {contentLang === 'ur' ? 'تدبر و غور:' : contentLang === 'gu' ? 'ચિંતન:' : contentLang === 'hi' ? 'चिंतन:' : 'Reflection:'}
              </span>
              <p
                className={`break-words select-text transition-all duration-300 bidi-plaintext ${
                  !isReflectionExpanded && isReflectionLong ? "line-clamp-2" : ""
                }`}
                style={{ unicodeBidi: 'plaintext' }}
              >
                {translatedReflection || ayah.reflection}
              </p>
            </div>
            {isReflectionLong && (
              <button
                type="button"
                onClick={() => setIsReflectionExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors py-0.5 px-2 rounded bg-[var(--accent-soft)] border border-[var(--border)] active:scale-95 cursor-pointer"
                aria-expanded={isReflectionExpanded}
              >
                <span>{isReflectionExpanded ? ui.showLess : ui.readMore}</span>
                {isReflectionExpanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Single Sleek Metadata Chip Row */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] px-1 font-medium">
          <span className="truncate">
            {contentLang === 'ur' ? `سورۃ ${ayah.surah} • آیت ${ayah.ayahNumber}` : contentLang === 'gu' ? `સૂરહ ${ayah.surah} • આયત ${ayah.ayahNumber}` : contentLang === 'hi' ? `सूरह ${ayah.surah} • आयत ${ayah.ayahNumber}` : `Surah ${ayah.surah} • Verse ${ayah.ayahNumber}`}
          </span>
          <span className="flex items-center gap-1.5 shrink-0 ml-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
            Updated daily at Fajr
          </span>
        </div>

        {/* 2-Column Action Buttons Row with 0ms SPA Routing */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            className="gap-2 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] font-bold px-3 py-2 text-xs inline-flex items-center justify-center shadow-md shadow-black/20 hover:brightness-105 active:scale-95 transition-all duration-200 cursor-pointer w-full"
            onClick={() => navigate(`/quran/surah-${ayah.surahNumber}`)}
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--on-accent)] stroke-[2.5]" />
            <span>{ui.readSurah}</span>
          </button>
          <button
            type="button"
            className="gap-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)] px-3 py-2 text-xs font-semibold inline-flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer w-full"
            onClick={() => navigate("/quran")}
          >
            <span>{ui.allSurahs}</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedDailyAyah;
