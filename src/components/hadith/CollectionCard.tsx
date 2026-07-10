import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookIcon, Users, Calendar } from "lucide-react";
import { HadithCollection } from "@/data/hadith-collections";

interface CollectionCardProps {
  collection: HadithCollection;
  onClick: () => void;
}

export function CollectionCard({ collection, onClick }: CollectionCardProps) {
  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="p-6 space-y-4">
        {/* Header with Icon */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
              <BookIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                {collection.title}
              </h3>
              <p className="text-sm text-muted-foreground font-arabic" dir="rtl">
                {collection.arabicTitle}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {collection.authenticity}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {collection.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <BookIcon className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">{collection.totalBooks}</p>
              <p className="text-xs text-muted-foreground">Books</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">{collection.totalHadith.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Hadith</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">{collection.death}</p>
              <p className="text-xs text-muted-foreground">Died</p>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-foreground">{collection.author}</p>
              <p className="text-xs text-muted-foreground">{collection.compilerPeriod}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-primary font-medium">Explore Collection</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
