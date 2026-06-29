import { useState, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, BookHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getFavorites, toggleFavorite } from "@/lib/storage";
import { duasData, duaCategories } from "@/data/duas";

interface DuaCardProps {
  dua: typeof duasData[0];
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onShare: (dua: typeof duasData[0]) => void;
}

const DuaCard = memo(function DuaCard({ dua, isFavorite, onToggleFavorite, onShare }: DuaCardProps) {
  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
            {dua.category}
          </span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onToggleFavorite(dua.id)}>
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-destructive text-destructive" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onShare(dua)}>
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-xl font-arabic text-right leading-loose">{dua.arabic}</p>
        <p className="text-sm italic text-primary/80">{dua.transliteration}</p>
        <p className="text-sm text-muted-foreground">{dua.translation}</p>
        {dua.reference && (
          <p className="text-xs text-muted-foreground">{dua.reference}</p>
        )}
      </div>
    </Card>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.dua.id === nextProps.dua.id &&
    prevProps.isFavorite === nextProps.isFavorite
  );
});

const Duas = memo(function Duas() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  const filteredDuas = duasData.filter((dua) => {
    return selectedCategory === "All" || dua.category === selectedCategory;
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
      } catch (error) {
        // Share failed - user likely cancelled
      }
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

        {/* Categories */}
        <ScrollArea className="h-12">
          <div className="flex gap-2 pb-2">
            {duaCategories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="whitespace-nowrap text-xs"
              >
                {cat}
              </Button>
            ))}
          </div>
        </ScrollArea>

        {/* Duas List */}
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-3">
            {filteredDuas.map((dua) => (
              <DuaCard
                key={dua.id}
                dua={dua}
                isFavorite={favorites.includes(dua.id)}
                onToggleFavorite={handleToggleFavorite}
                onShare={shareDua}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
});

export default Duas;
