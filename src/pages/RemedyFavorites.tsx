import { useState, useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, BookOpen, Quote, Play, Copy, Check, Trash2, Search, Filter } from "lucide-react";
import { useGlobalQuran } from "@/lib/global-quran";
import { useToast } from "@/hooks/use-toast";
import { remedyGamification, type FavoriteRemedy } from "@/lib/remedy-gamification";
import { moods, type Mood } from "@/data/mood-data";
import { useLanguage } from "@/contexts/LanguageContext-new";

export default function RemedyFavorites() {
  const { t } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteRemedy[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const { playSurah, reciter } = useGlobalQuran();
  const { toast } = useToast();

  useEffect(() => {
    setFavorites(remedyGamification.getFavorites());
  }, []);

  const filteredFavorites = favorites.filter(favorite => {
    const matchesSearch = favorite.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         favorite.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "all" || favorite.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getMoodInfo = (moodId: string): Mood | undefined => {
    return moods.find(m => m.id === moodId);
  };

  const handlePlaySurah = (favorite: FavoriteRemedy) => {
    // Extract surah number from reference if available
    const surahMatch = favorite.reference.match(/Surah (\d+)/);
    if (surahMatch && reciter) {
      const surahNumber = parseInt(surahMatch[1]);
      playSurah(surahNumber, favorite.reference, reciter);
      toast({
        title: "Playing Surah",
        description: `Now playing ${favorite.reference}.`,
      });
    } else if (!reciter) {
      toast({
        title: "Reciter loading",
        description: "Please wait for the Quran player to initialize.",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async (favorite: FavoriteRemedy) => {
    const text = `${favorite.arabic ? `${favorite.arabic}\n\n` : ""}${favorite.content}\n${favorite.reference}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(favorite.id);
      setTimeout(() => setCopied(null), 1800);
      toast({ title: "Remedy copied" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard is not available on this device.",
        variant: "destructive",
      });
    }
  };

  const handleRemove = (favoriteId: string) => {
    remedyGamification.removeFromFavorites(favoriteId);
    setFavorites(remedyGamification.getFavorites());
    toast({ title: "Removed from favorites" });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'surah': return <BookOpen className="h-3 w-3" />;
      case 'ayah': return <Quote className="h-3 w-3" />;
      case 'dua': return <Heart className="h-3 w-3" />;
      case 'hadith': return <Search className="h-3 w-3" />;
      case 'dhikr': return <Filter className="h-3 w-3" />;
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

  const uniqueTypes = Array.from(new Set(favorites.map(f => f.type)));

  if (favorites.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background pb-32">
          <AppBar title={t("favoriteRemedies") || "Favorite Remedies"} showBack={true} />
          
          <div className="px-5 pt-4">
            <Card className="border-dashed border-border/60 bg-background/60 p-8 text-center">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No favorites yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start saving your favorite Islamic remedies to build your personal collection.
              </p>
              <Button onClick={() => window.history.back()}>
                Browse Remedies
              </Button>
            </Card>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-32">
        <AppBar title={t("favoriteRemedies") || "Favorite Remedies"} showBack={true} />
        
        <div className="px-5 pt-4 space-y-4">
          {/* Search and Filter */}
          <Card className="p-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search favorites..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border/60 rounded-lg bg-background/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  className="rounded-full"
                >
                  All ({favorites.length})
                </Button>
                {uniqueTypes.map(type => (
                  <Button
                    key={type}
                    size="sm"
                    variant={filterType === type ? "default" : "outline"}
                    onClick={() => setFilterType(type)}
                    className="rounded-full capitalize"
                  >
                    {type} ({favorites.filter(f => f.type === type).length})
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {/* Favorites List */}
          <div className="space-y-3">
            {filteredFavorites.map((favorite) => {
              const moodInfo = getMoodInfo(favorite.moodId);
              const Icon = moodInfo?.icon;
              
              return (
                <Card key={favorite.id} className="border-border/60 bg-background/80 p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {Icon && moodInfo && (
                          <div className={`rounded-lg bg-gradient-to-br p-2 ${moodInfo.gradient}`}>
                            <Icon className={`h-4 w-4 ${moodInfo.color}`} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {moodInfo?.label} Remedy
                          </p>
                          <p className="text-xs text-muted-foreground">{favorite.reference}</p>
                          <p className="text-xs text-primary">
                            Added {new Date(favorite.addedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`rounded-full px-2 py-1 text-xs font-bold uppercase tracking-wider text-white ${getTypeColor(favorite.type)}`}>
                          {getTypeIcon(favorite.type)}
                          <span className="ml-1">{favorite.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    {favorite.arabic && (
                      <p className="rounded-xl bg-muted/40 p-3 text-right font-arabic text-xl leading-[1.9] text-foreground" dir="rtl">
                        {favorite.arabic}
                      </p>
                    )}

                    <p className="rounded-xl border border-border/40 bg-card/70 p-3 text-sm leading-relaxed text-foreground/90">
                      {favorite.content}
                    </p>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {favorite.type === "surah" && (
                        <Button size="sm" className="rounded-full" onClick={() => handlePlaySurah(favorite)}>
                          <Play className="me-2 h-4 w-4" />
                          Play Surah
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" className="rounded-full" onClick={() => handleCopy(favorite)}>
                        {copied === favorite.id ? <Check className="me-2 h-4 w-4" /> : <Copy className="me-2 h-4 w-4" />}
                        {copied === favorite.id ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full text-red-500" onClick={() => handleRemove(favorite.id)}>
                        <Trash2 className="me-2 h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredFavorites.length === 0 && searchTerm && (
            <Card className="border-dashed border-border/60 bg-background/60 p-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No results found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your search or filter criteria.
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
