import { useState, useEffect, memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, BookHeart, Search, Volume2, Plus, Minus, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { duasData, duaCategories } from "@/data/duas";
import { motion, AnimatePresence } from "framer-motion";

interface DuaCardProps {
  dua: typeof duasData[0];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShare: (dua: typeof duasData[0]) => void;
  isDuaOfDay?: boolean;
}

const DuaCard = memo(function DuaCard({ dua, isFavorite, onToggleFavorite, onShare, isDuaOfDay }: DuaCardProps) {
  const [playCounter, setPlayCounter] = useState(false);
  const [counter, setCounter] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const synth = useMemo(() => typeof window !== 'undefined' ? window.speechSynthesis : null, []);

  const playAudio = (text: string) => {
    if (!synth) return;
    if (synth.speaking) {
      synth.cancel();
      setIsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar';
    utterance.rate = 0.8;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    setIsPlaying(true);
    synth.speak(utterance);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`p-4 relative overflow-hidden ${isDuaOfDay ? 'ring-2 ring-primary/30 bg-gradient-to-br from-primary/5 to-transparent' : ''}`}>
        {isDuaOfDay && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground text-[9px] gap-1">
              <Sparkles className="w-3 h-3" />
              Dua of the Day
            </Badge>
          </div>
        )}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              {isDuaOfDay && <Star className="w-3 h-3 text-primary fill-primary" />}
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
                {dua.category}
              </span>
              {dua.repeatCount && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  <Plus className="w-2.5 h-2.5" />
                  {dua.repeatCount}x
                </Badge>
              )}
            </div>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => playAudio(dua.arabic)}>
                <Volume2 className={`w-4 h-4 ${isPlaying ? 'text-primary' : ''}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFavorite(dua.id)}>
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onShare(dua)}>
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-xl font-arabic text-right leading-loose tracking-wide">{dua.arabic}</p>
          <p className="text-sm italic text-primary/80 leading-relaxed">{dua.transliteration}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{dua.translation}</p>
          {dua.reference && (
            <p className="text-xs text-muted-foreground/60 font-medium">{dua.reference}</p>
          )}
          {dua.repeatCount && (
            <div className="pt-2 border-t border-border/30">
              {playCounter ? (
                <div className="flex items-center gap-3">
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setCounter(c => Math.max(0, c - 1)); }}>
                    <Minus className="w-3 h-3 mr-1" />1
                  </Button>
                  <div className="flex-1 text-center">
                    <p className="text-2xl font-bold text-primary font-mono">{counter}</p>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wider">/ {dua.repeatCount}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => { setCounter(c => Math.min(dua.repeatCount!, c + 1)); }}>
                    <Plus className="w-3 h-3 mr-1" />1
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setPlayCounter(true)}>
                  <Plus className="w-3 h-3 mr-1" />
                  Track Repetition ({dua.repeatCount}x)
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.dua.id === nextProps.dua.id &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isDuaOfDay === nextProps.isDuaOfDay
  );
});

const Duas = memo(function Duas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const duaOfDay = useMemo(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    return duasData[dayOfYear % duasData.length];
  }, []);

  const filteredDuas = duasData.filter((dua) => {
    if (selectedCategory !== "All" && dua.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        dua.translation.toLowerCase().includes(q) ||
        dua.transliteration.toLowerCase().includes(q) ||
        dua.arabic.includes(q) ||
        (dua.reference && dua.reference.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleToggleFavorite = (duaId: string) => {
    const isFavorite = toggleFavorite(duaId);
    setFavorites(getFavorites());
    toast({
      title: isFavorite ? "Added to favorites" : "Removed from favorites",
    });
  };

  const shareDua = async (dua: typeof duasData[0]) => {
    const shareText = `"${dua.arabic}"\n\n${dua.transliteration}\n\nTranslation: ${dua.translation}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: `Dua - ${dua.category}`, text: shareText });
      } catch (error) {}
    } else {
      navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Duas</h1>
            <p className="text-xs text-muted-foreground">{duasData.length} Supplications</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <BookHeart className="w-5 h-5 text-primary-foreground" />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search duas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 rounded-2xl bg-card border-border/40"
          />
        </div>

        {/* Dua of the Day */}
        {selectedCategory === "All" && !searchQuery && (
          <DuaCard
            dua={duaOfDay}
            isFavorite={favorites.includes(duaOfDay.id)}
            onToggleFavorite={handleToggleFavorite}
            onShare={shareDua}
            isDuaOfDay
          />
        )}

        {/* Categories */}
        <ScrollArea className="h-11">
          <div className="flex gap-2 pb-2">
            {duaCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="whitespace-nowrap text-xs rounded-full"
              >
                {cat}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {filteredDuas.length} {filteredDuas.length === 1 ? 'dua' : 'duas'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
          {favorites.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelectedCategory("All")}>
              <Heart className="w-3 h-3 fill-destructive text-destructive" />
              {favorites.length}
            </Button>
          )}
        </div>

        {/* Duas List */}
        <div className="space-y-3 pb-20">
          {filteredDuas.length === 0 ? (
            <Card className="p-8 text-center">
              <BookHeart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No duas found</p>
              <Button variant="link" size="sm" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                Clear filters
              </Button>
            </Card>
          ) : (
            <AnimatePresence>
              {filteredDuas.map((dua) => (
                <DuaCard
                  key={dua.id}
                  dua={dua}
                  isFavorite={favorites.includes(dua.id)}
                  onToggleFavorite={handleToggleFavorite}
                  onShare={shareDua}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
});

export default Duas;
