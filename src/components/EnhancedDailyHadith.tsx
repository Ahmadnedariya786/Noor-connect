/**
 * Enhanced Daily Hadith Widget
 * Features real-time updates, authentic Amiri Arabic typography,
 * text truncation with Read More / Show Less, and premium dark/gold aesthetics.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, RefreshCw, Share2, Copy, BookOpen, Bookmark, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDailyHadith as getDailyHadithFromCollections } from "@/lib/hadith";
import type { EnhancedHadith } from "@/data/hadith-collections";
import { getGradeBadgeClass } from "@/lib/hadith-utils";
import { useHadithBookmarks } from "@/hooks/useHadithBookmarks";
import { ManuscriptDivider } from "@/components/ui/ManuscriptDivider";

interface Hadith {
  id: string;
  arabic: string;
  englishTranslation: string;
  narrator: string;
  source: string;
  grade: string;
  category: string;
  reflection?: string;
  _collection?: string;
  _bookNumber?: string;
  _hadithNumber?: string;
}

function formatCollectionName(collection: string): string {
  return collection
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractNarrator(narrator: string | undefined, englishText: string | undefined): string | null {
  const isUnknown = !narrator ||
    narrator.trim().toLowerCase() === "unknown narrator" ||
    narrator.trim().toLowerCase() === "unknown" ||
    narrator.trim().toLowerCase() === "unspecified";

  if (!isUnknown && narrator) {
    return narrator.replace(/^Narrated\s+/i, '').replace(/:$/, '').trim();
  }

  if (!englishText) return null;

  // Check English hadith text for leading narrator patterns
  // Examples: "Narrated 'Aisha:", "Narrated Abu Huraira:", "It was narrated from Ibn 'Umar that:"
  const match1 = englishText.match(/^(?:It was\s+)?narrated\s+(?:by|from)?\s*([^:.]+):/i);
  if (match1 && match1[1]) {
    return match1[1].trim();
  }

  const match2 = englishText.match(/^It was narrated (?:from|that)\s+([^:.]+?)\s+(?:that|said)/i);
  if (match2 && match2[1]) {
    return match2[1].trim();
  }

  return null;
}

function mapEnhancedHadithToWidget(entry: EnhancedHadith): Hadith {
  return {
    id: entry.id,
    arabic: entry.arabic,
    englishTranslation: entry.englishTranslation || "Translation not available.",
    narrator: entry.narrator && entry.narrator.toLowerCase() !== "unknown narrator" && entry.narrator.toLowerCase() !== "unknown"
      ? entry.narrator
      : "",
    source: `${formatCollectionName(entry.collection)} ${entry.bookNumber}:${entry.hadithNumber}`,
    grade: entry.grade && entry.grade.toLowerCase() !== "unspecified" ? entry.grade : "",
    category: entry.category && entry.category.toLowerCase() !== "unspecified" ? entry.category : "Hadith",
    _collection: entry.collection,
    _bookNumber: entry.bookNumber,
    _hadithNumber: entry.hadithNumber,
  };
}

const hadithCollection: Hadith[] = [
  {
    id: "bukhari-1-1",
    arabic: "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
    englishTranslation: "Actions are judged by intentions, and each person will have what they intended.",
    narrator: "Umar ibn al-Khattab (may Allah be pleased with him)",
    source: "Sahih Bukhari 1",
    grade: "Sahih",
    category: "Intentions",
    reflection: "Purify your intentions before every action."
  },
  {
    id: "muslim-1-1",
    arabic: "مَنْ يُرِدِ اللَّهُ بِهِ خَيْرًا يُفَقِّهْهُ فِي الدِّينِ",
    englishTranslation: "Whoever Allah wants good for, He grants them understanding of the religion.",
    narrator: "Mu'awiyah ibn Abi Sufyan (may Allah be pleased with him)",
    source: "Sahih Muslim 1037",
    grade: "Sahih",
    category: "Knowledge",
    reflection: "Seeking religious knowledge is a sign of Allah's favor."
  },
  {
    id: "tirmidhi-1-1",
    arabic: "الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ",
    englishTranslation: "A good word is charity.",
    narrator: "Abu Dharr (may Allah be pleased with him)",
    source: "Jami` at-Tirmidhi 1976",
    grade: "Hasan",
    category: "Good Deeds",
    reflection: "Kind words have the reward of charity."
  },
  {
    id: "abu-dawud-1-1",
    arabic: "سَدِّدُوا وَقَارِبُوا وَأَبْشِرُوا",
    englishTranslation: "Be deliberate and strive for excellence, and be of good cheer.",
    narrator: "Abu Hurairah (may Allah be pleased with him)",
    source: "Sunan Abi Dawud 1090",
    grade: "Sahih",
    category: "Excellence",
    reflection: "Balance between perfection and optimism in worship."
  },
  {
    id: "ibn-majah-1-1",
    arabic: "الْمُؤْمِنُ الَّذِي يُؤْمِنُ النَّاسُ عَلَى أَمْوَالِهِمْ وَأَنْفُسِهِمْ",
    englishTranslation: "The believer is the one from whose tongue and hands the people are safe.",
    narrator: "Abdullah ibn Amr (may Allah be pleased with him)",
    source: "Sunan Ibn Majah 3933",
    grade: "Sahih",
    category: "Character",
    reflection: "True faith reflects in how we treat others."
  },
  {
    id: "nasai-1-1",
    arabic: "الدِّينُ النَّصِيحَةُ",
    englishTranslation: "The religion is sincere advice and goodwill.",
    narrator: "Tamim ad-Dari (may Allah be pleased with him)",
    source: "Sunan an-Nasa'i 4197",
    grade: "Sahih",
    category: "Community",
    reflection: "Sincerity is the essence of religious practice."
  },
  {
    id: "bukhari-2-1",
    arabic: "تَبَسُّمُكَ فِي وَجْهِ أَخِيكَ لَكَ صَدَقَةٌ",
    englishTranslation: "Your smiling in the face of your brother is charity for you.",
    narrator: "Abu Dharr (may Allah be pleased with him)",
    source: "Jami` at-Tirmidhi 1956",
    grade: "Hasan",
    category: "Kindness",
    reflection: "Even the smallest act of kindness carries immense weight."
  }
];

const HADITH_STORAGE_KEY = "enhanced-daily-hadith";
const LAST_UPDATE_KEY = "hadith-last-update";

// In-memory cache for imported hadith collections so we don't re-read on every render
let cachedCollectionsHadith: EnhancedHadith | null = null;

export function EnhancedDailyHadith() {
  const navigate = useNavigate();
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();
  const { isBookmarked, toggleBookmark } = useHadithBookmarks();

  const loadHadith = useCallback(async () => {
    try {
      const today = new Date().toDateString();
      const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
      const storedHadith = localStorage.getItem(HADITH_STORAGE_KEY);

      // Use cached hadith if available without triggering loading state
      if (lastUpdate === today && storedHadith) {
        setHadith(JSON.parse(storedHadith));
        setLoading(false);
        return;
      }

      setLoading(true);

      // Pick from the hardcoded array first (instant, no network fetch)
      const dayOfYear = Math.floor(
        (new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      const index = dayOfYear % hadithCollection.length;
      const selectedHadith = hadithCollection[index];

      setHadith(selectedHadith);
      setLoading(false);

      // Save initial selection to storage
      localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(selectedHadith));
      localStorage.setItem(LAST_UPDATE_KEY, today);

      // After rendering the fast hadith, try to enrich from collections in background
      if (cachedCollectionsHadith) {
        const enriched = mapEnhancedHadithToWidget(cachedCollectionsHadith);
        setHadith(enriched);
        localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(enriched));
      } else {
        // Fetch from hadith collections in background
        getDailyHadithFromCollections(dayOfYear + 1)
          .then((importedHadith) => {
            if (importedHadith) {
              cachedCollectionsHadith = importedHadith;
              const enriched = mapEnhancedHadithToWidget(importedHadith);
              setHadith(enriched);
              localStorage.setItem(HADITH_STORAGE_KEY, JSON.stringify(enriched));
            }
          })
          .catch((err) => {
            console.warn("Could not enrich daily hadith from collections, keeping curated fallback:", err);
          });
      }
    } catch (error) {
      console.error("Error loading daily hadith:", error);
      setHadith(hadithCollection[0]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHadith();

    let idleId: number | null = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const today = new Date().toDateString();
        const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
        if (lastUpdate !== today) {
          if ('requestIdleCallback' in window) {
            idleId = window.requestIdleCallback(() => loadHadith());
          } else {
            loadHadith();
          }
        }
      }
    };

    const handleRefresh = () => {
      loadHadith();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('widget-refresh', handleRefresh);

    return () => {
      if (idleId !== null) {
        window.cancelIdleCallback(idleId);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('widget-refresh', handleRefresh);
    };
  }, [loadHadith]);

  const refreshHadith = async () => {
    setIsAnimating(true);
    setIsExpanded(false);
    try {
      const randomSeed = Math.floor(Math.random() * 100000) + 1;
      const importedHadith = await getDailyHadithFromCollections(randomSeed);
      if (importedHadith) {
        cachedCollectionsHadith = importedHadith;
        setHadith(mapEnhancedHadithToWidget(importedHadith));
      } else {
        const randomIndex = Math.floor(Math.random() * hadithCollection.length);
        setHadith(hadithCollection[randomIndex]);
      }
    } catch {
      // Fallback to random entry from static hadithCollection
      const randomIndex = Math.floor(Math.random() * hadithCollection.length);
      setHadith(hadithCollection[randomIndex]);
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const shareHadith = async () => {
    if (!hadith) return;
    
    const text = `"${hadith.englishTranslation}"\n\n- ${hadith.source}\nNarrated by: ${hadith.narrator}\n\n#NoorConnect #Hadith`;
    
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({
          title: "Copied!",
          description: "Hadith copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const copyHadith = async () => {
    if (!hadith) return;
    
    try {
      const copyContent = `${hadith.arabic}\n\n"${hadith.englishTranslation}"\n\n— ${hadith.source} (${hadith.narrator})`;
      await navigator.clipboard.writeText(copyContent);
      toast({
        title: "Copied!",
        description: "Hadith and translation copied to clipboard",
      });
    } catch (error) {
      console.error('Error copying:', error);
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

  if (!hadith) return null;

  // Determine if text is long enough to warrant truncation
  const isArabicLong = (hadith.arabic?.length || 0) > 160;
  const wordCount = hadith.englishTranslation ? hadith.englishTranslation.trim().split(/\s+/).length : 0;
  const isEnglishLong = (hadith.englishTranslation?.length || 0) > 170 || wordCount > 40;
  const needsTruncation = isArabicLong || isEnglishLong;

  const activeNarrator = extractNarrator(hadith.narrator, hadith.englishTranslation);
  const isGradeValid = Boolean(
    hadith.grade &&
    hadith.grade.toLowerCase() !== "unspecified" &&
    hadith.grade.toLowerCase() !== "null"
  );
  const isCategoryValid = Boolean(
    hadith.category &&
    hadith.category.toLowerCase() !== "unspecified" &&
    hadith.category.toLowerCase() !== "null" &&
    hadith.category.toLowerCase() !== "hadith"
  );

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
      
      {/* Ambient Top-Right Gold Radial Aura */}
      <div
        className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)',
        }}
      />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-36 h-36 bg-[var(--accent)]/5 rounded-full blur-2xl" />

      <CardContent className="p-4 sm:p-[18px] space-y-4 relative z-10">
        {/* Header Section & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] text-[var(--accent-text)] shadow-xs shrink-0">
              <MessageCircle className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--accent)]">
                  Daily Wisdom
                </span>
                {isGradeValid ? (
                  <Badge variant="outline" className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${getGradeBadgeClass(hadith.grade)}`}>
                    {hadith.grade}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0.5 rounded-full font-semibold border border-[var(--border)] text-[var(--accent-text)] bg-[var(--accent-soft)]">
                    {hadith.source || "Sahih Hadith"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[var(--text-primary)] text-sm sm:text-base leading-snug">
                  Daily Hadith
                </h3>
                <span className="text-[var(--text-secondary)]/60 text-xs">•</span>
                <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
                  {isCategoryValid ? hadith.category : (hadith.source || "Prophetic Tradition")}
                </span>
              </div>
            </div>
          </div>
          
          {/* Compact Glass Pill Action Toolbar (34px × 34px rounded hit targets) */}
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--surface-2)]/80 border border-[var(--border)] backdrop-blur-sm shrink-0 self-start sm:self-auto shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              className={`h-[34px] w-[34px] rounded-full transition-all duration-200 active:scale-95 ${
                hadith._collection && isBookmarked(hadith._collection, hadith._hadithNumber!)
                  ? "text-[var(--accent-text)] bg-[var(--accent-soft)] shadow-sm shadow-[var(--accent-glow)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)]"
              }`}
              onClick={() => {
                if (hadith._collection && hadith._hadithNumber) {
                  toggleBookmark({
                    collection: hadith._collection,
                    bookNumber: hadith._bookNumber || hadith._hadithNumber,
                    hadithNumber: hadith._hadithNumber,
                    arabic: hadith.arabic,
                    englishTranslation: hadith.englishTranslation,
                  });
                  toast({
                    title: isBookmarked(hadith._collection, hadith._hadithNumber) ? "Bookmark removed" : "Bookmarked!",
                  });
                }
              }}
              title="Bookmark Hadith"
              aria-label="Bookmark hadith"
            >
              <Bookmark className={`w-4 h-4 ${hadith._collection && isBookmarked(hadith._collection, hadith._hadithNumber!) ? "fill-[var(--accent)] text-[var(--accent)]" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={copyHadith}
              title="Copy Hadith"
              aria-label="Copy hadith"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={refreshHadith}
              title="Another Hadith"
              aria-label="Show another hadith"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${isAnimating ? 'animate-spin text-[var(--accent)]' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-[34px] w-[34px] rounded-full text-[var(--text-secondary)] hover:text-[var(--accent-text)] hover:bg-[var(--surface)] transition-all duration-200 active:scale-95"
              onClick={shareHadith}
              title="Share Hadith"
              aria-label="Share hadith"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Ornamental Recessed Arabic Verse Box */}
        <div className={`transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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
              className={`font-amiri text-xl sm:text-2xl leading-[1.9] text-[var(--text-primary)] text-right drop-shadow-sm select-text break-words px-2 transition-all duration-300 ${
                !isExpanded && isArabicLong ? "line-clamp-3 sm:line-clamp-4" : ""
              }`}
              dir="rtl"
              style={{ fontFamily: "'Amiri', 'Traditional Arabic', 'Scheherazade New', serif" }}
            >
              {hadith.arabic}
            </p>
          </div>
        </div>

        {/* Ornamental Manuscript Divider */}
        <ManuscriptDivider />

        {/* English Translation Section */}
        <div className={`space-y-2 transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
          <p
            className={`text-sm sm:text-[15px] leading-relaxed text-[var(--text-primary)] font-normal break-words select-text transition-all duration-300 ${
              !isExpanded && isEnglishLong ? "line-clamp-3" : ""
            }`}
          >
            "{hadith.englishTranslation}"
          </p>

          {/* Read More / Show Less Toggle Button */}
          {needsTruncation && (
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:text-[var(--accent)] transition-colors py-1 px-2.5 rounded-lg bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 border border-[var(--border)] active:scale-95 cursor-pointer"
                aria-expanded={isExpanded}
              >
                <span>{isExpanded ? "Show Less" : "Read Full Hadith"}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {!isExpanded && (
                <span className="text-[11px] text-[var(--text-secondary)]/80 italic font-mono">
                  {wordCount} words
                </span>
              )}
            </div>
          )}
        </div>

        {/* Reflection (if available) with 3px solid accent left border */}
        {hadith.reflection && (
          <div
            className="p-3 rounded-xl border-l-[3px] border-[var(--accent)] text-xs sm:text-sm text-[var(--text-secondary)] italic leading-relaxed"
            style={{
              background: 'var(--surface-2)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <span className="text-[var(--accent)] font-semibold not-italic mr-1.5">Reflection:</span>
            {hadith.reflection}
          </div>
        )}

        {/* Narrator & Source Strip (Sanitized: hides Unknown narrator completely) */}
        {activeNarrator ? (
          <div className="flex items-center justify-between text-xs px-1 text-[var(--text-secondary)] font-medium">
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-[var(--accent)] font-semibold shrink-0">Narrator:</span>
              <span className="text-[var(--text-primary)] font-medium truncate">{activeNarrator}</span>
            </div>
            <div className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--accent-text)] bg-[var(--accent-soft)] px-2 py-0.5 rounded-md border border-[var(--border)] shrink-0 ml-2">
              <span>{hadith.source}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs px-1 text-[var(--text-secondary)] font-medium">
            <span className="text-[var(--text-primary)] text-[11px] flex items-center gap-1.5 font-medium truncate">
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">{hadith.source}</span>
            </span>
            <span className="flex items-center gap-1.5 shrink-0 ml-2 text-[11px]">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
              Updated daily
            </span>
          </div>
        )}

        {/* 2-Column Action Buttons Row with 0ms SPA Routing */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            type="button"
            className="gap-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)] px-3 py-2 text-xs font-semibold inline-flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer w-full"
            onClick={() => navigate('/hadith/bookmarks')}
          >
            <Bookmark className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Bookmarks</span>
          </button>
          <button
            type="button"
            className="gap-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface)] px-3 py-2 text-xs font-semibold inline-flex items-center justify-center active:scale-95 transition-all duration-200 cursor-pointer w-full"
            onClick={() => navigate('/hadith/collections')}
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>More Hadith</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default EnhancedDailyHadith;
