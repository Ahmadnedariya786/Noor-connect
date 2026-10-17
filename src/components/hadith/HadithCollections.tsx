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

export function HadithCollections() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const allCollections = useMemo(() => getAllCollections(), []);
  const [dailyHadith, setDailyHadith] = useState<{ title: string; content: string; arabic: string; subtitle: string; reference: string; reflection: string } | null>(null);

  useEffect(() => {
    getDailyHadithFromCollections().then(h => {
      if (h) {
        setDailyHadith({
          title: "Hadith of the Day",
          content: h.englishTranslation || "",
          arabic: h.arabic || "",
          subtitle: h.collection,
          reference: `#${h.hadithNumber}`,
          reflection: `Narrated by: ${h.narrator || "Unknown"}`,
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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Hadith Collections</h1>
            <p className="text-muted-foreground">
              Explore authentic Hadith from available collections
            </p>
          </div>
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

        {/* Daily Hadith Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-primary/20 mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/60" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2" />
          <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />
          
          <div className="relative z-10 p-4 sm:p-8">
            {dailyHadith ? (
              <>
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <Sparkles className="w-4 h-4 text-primary-foreground/80 shrink-0" />
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                    {dailyHadith.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-7 w-7 rounded-full hover:bg-white/10 shrink-0"
                    onClick={() => {
                      getDailyHadithFromCollections().then(h => {
                        if (h) {
                          setDailyHadith({
                            title: "Hadith of the Day",
                            content: h.englishTranslation || "",
                            arabic: h.arabic || "",
                            subtitle: h.collection,
                            reference: `#${h.hadithNumber}`,
                            reflection: `Narrated by: ${h.narrator || "Unknown"}`,
                          });
                        }
                      });
                    }}
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-primary-foreground/80" />
                  </Button>
                </div>
                
                <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-amber-500/25 mb-4">
                  {dailyHadith.arabic && (
                    <p className="text-white/90 text-xl md:text-2xl font-arabic text-right leading-loose mb-4 break-words" dir="rtl">
                      {dailyHadith.arabic}
                    </p>
                  )}
                  <p className="text-white/90 text-sm sm:text-base font-medium leading-relaxed mb-4 break-words">
                    {dailyHadith.content}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-950/40 text-amber-200 border border-amber-500/30 text-xs shrink-0 font-semibold">
                      {dailyHadith.subtitle}
                    </Badge>
                    <span className="text-white/50 text-xs font-medium">{dailyHadith.reference}</span>
                  </div>
                </div>
                
                <p className="text-white/60 text-sm italic">
                  {dailyHadith.reflection}
                </p>
              </>
            ) : (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
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
