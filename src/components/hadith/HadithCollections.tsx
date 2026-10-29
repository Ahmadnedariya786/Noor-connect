import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BookOpen, Sparkles, RefreshCw, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CollectionCard } from "./CollectionCard";
import { getAllCollections, HadithCollection } from "@/data/hadith-collections";
import { getDailyHadith as getDailyHadithFromCollections } from "@/lib/hadith";
import { motion } from "framer-motion";
import { goBackOrFallback } from "@/lib/navigation";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

function extractNarrator(englishText: string, fallback?: string): string {
  if (fallback && fallback !== "Unknown" && fallback.trim()) return fallback.trim();
  if (!englishText) return fallback && fallback !== "Unknown" ? fallback : "Prophetic Companion";
  const match = englishText.match(/^(?:Narrated\s+(?:by\s+)?|It was narrated from\s+|It was narrated that\s+)([^:\n.]{3,45})(?::|\.|\s*-\s*)/i);
  if (match && match[1]) {
    const clean = match[1].replace(/^(that\s+|from\s+)/i, "").trim();
    if (clean.length > 2 && clean.length < 45) {
      return clean;
    }
  }
  return fallback && fallback !== "Unknown" ? fallback : "Prophetic Companion";
}

export function HadithCollections() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const allCollections = useMemo(() => getAllCollections(), []);
  const [dailyHadith, setDailyHadith] = useState<{ title: string; content: string; arabic: string; subtitle: string; reference: string; reflection: string } | null>(null);

  const { contentLang, isRtl } = useContentLanguage();
  const [translatedDailyContent, setTranslatedDailyContent] = useState("");
  const [translatedDailyNarrator, setTranslatedDailyNarrator] = useState("");

  useEffect(() => {
    if (!dailyHadith) return;
    if (contentLang === 'en') {
      setTranslatedDailyContent(dailyHadith.content);
      setTranslatedDailyNarrator(dailyHadith.reflection);
      return;
    }
    let isMounted = true;
    Promise.all([
      translateIslamicText(dailyHadith.content, contentLang),
      translateIslamicText(dailyHadith.reflection, contentLang),
    ]).then(([tContent, tReflection]) => {
      if (isMounted) {
        setTranslatedDailyContent(tContent);
        setTranslatedDailyNarrator(tReflection);
      }
    });
    return () => { isMounted = false; };
  }, [dailyHadith, contentLang]);

  useEffect(() => {
    getDailyHadithFromCollections().then(h => {
      if (h) {
        const narrator = extractNarrator(h.englishTranslation || "", h.narrator);
        setDailyHadith({
          title: "Hadith of the Day",
          content: h.englishTranslation || "",
          arabic: h.arabic || "",
          subtitle: h.collection,
          reference: `#${h.hadithNumber}`,
          reflection: `Narrator: ${narrator}`,
        });
      }
    });
  }, []);

  const filteredCollections = useMemo(() => {
    if (!searchTerm) return allCollections;
    
    const term = searchTerm.toLowerCase();
    return allCollections.filter(collection =>
      collection.title.toLowerCase().includes(term) ||
      collection.author.toLowerCase().includes(term) ||
      collection.description.toLowerCase().includes(term)
    );
  }, [allCollections, searchTerm]);

  const handleCollectionClick = (collection: HadithCollection) => {
    // Navigate to collection books first.
    navigate(`/hadith/collections/${collection.name}`);
  };

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goBackOrFallback(navigate, '/hadith')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">Hadith Collections</h1>
            <p className="text-muted-foreground text-sm truncate">
              Explore authentic Hadith from available collections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ContentLanguageBar compact />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/hadith/bookmarks")}
              className="rounded-xl"
              title="View bookmarked hadith"
            >
              <Bookmark className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Daily Hadith Card - Refined Dark Jewel Manuscript */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[28px] border border-primary/25 bg-[var(--surface)] text-foreground shadow-xl mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-[30px] pointer-events-none" />
          
          <div className="relative z-10 p-5 sm:p-7">
            {dailyHadith ? (
              <>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <div className="p-1.5 rounded-lg bg-primary/15 text-primary">
                    <Sparkles className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                    {dailyHadith.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-foreground shrink-0"
                    onClick={() => {
                      getDailyHadithFromCollections().then(h => {
                        if (h) {
                          const narrator = extractNarrator(h.englishTranslation || "", h.narrator);
                          setDailyHadith({
                            title: "Hadith of the Day",
                            content: h.englishTranslation || "",
                            arabic: h.arabic || "",
                            subtitle: h.collection,
                            reference: `#${h.hadithNumber}`,
                            reflection: `Narrator: ${narrator}`,
                          });
                        }
                      });
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
                
                <div className="bg-background/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-primary/20 mb-3 space-y-3">
                  {dailyHadith.arabic && (
                    <p className="text-foreground text-xl md:text-2xl font-arabic text-right leading-loose break-words" dir="rtl">
                      {!isExpanded && dailyHadith.arabic.length > 200
                        ? `${dailyHadith.arabic.slice(0, 200)}...`
                        : dailyHadith.arabic}
                    </p>
                  )}
                  <p
                    className={`text-foreground/90 text-sm sm:text-base font-normal leading-relaxed break-words ${isRtl ? 'font-arabic text-right text-lg' : ''}`}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {!isExpanded && (translatedDailyContent || dailyHadith.content).length > 240
                      ? `${(translatedDailyContent || dailyHadith.content).slice(0, 240)}...`
                      : (translatedDailyContent || dailyHadith.content)}
                  </p>
                  {((translatedDailyContent || dailyHadith.content).length > 240 || (dailyHadith.arabic && dailyHadith.arabic.length > 200)) && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs font-semibold text-primary hover:underline focus:outline-none transition-colors"
                    >
                      {isExpanded ? "Show Less" : "Read More"}
                    </button>
                  )}
                  <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs shrink-0 font-medium">
                      {dailyHadith.subtitle}
                    </Badge>
                    <span className="text-muted-foreground text-xs font-medium">{dailyHadith.reference}</span>
                  </div>
                </div>
                
                <p
                  className={`text-muted-foreground text-xs sm:text-sm font-medium italic ${isRtl ? 'font-arabic text-right' : ''}`}
                  dir={isRtl ? 'rtl' : 'ltr'}
                  style={{ unicodeBidi: 'isolate' }}
                >
                  {translatedDailyNarrator || dailyHadith.reflection}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search collections..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <CollectionCard
              key={collection.name}
              collection={collection}
              onClick={() => handleCollectionClick(collection)}
            />
          ))}
        </div>

        {/* No Results */}
        {filteredCollections.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Collections Found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms to find what you're looking for.
              </p>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <Card className="mt-8 border-border/50">
          <CardContent className="p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">
              Collection Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{allCollections.length}</p>
                <p className="text-sm text-muted-foreground">Collections</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {allCollections.reduce((sum, c) => sum + c.totalBooks, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Books</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {allCollections.reduce((sum, c) => sum + c.totalHadith, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Hadith</p>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  Authentic Sources
                </Badge>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
