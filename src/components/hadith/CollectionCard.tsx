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
      <CardContent className="p-4 sm:p-6 space-y-4">
        {/* Header with Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="p-2.5 sm:p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors shrink-0">
              <BookIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base sm:text-lg text-foreground group-hover:text-primary transition-colors truncate">
                {collection.title}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground font-arabic truncate" dir="rtl">
                {collection.arabicTitle}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[11px] shrink-0">
            {collection.authenticity}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {collection.description}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <BookIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{collection.totalBooks}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Books</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{collection.totalHadith.toLocaleString()}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Hadith</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{collection.death}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Died</p>
            </div>
          </div>
        </div>

        {/* Author Info */}
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{collection.author}</p>
              <p className="text-[11px] text-muted-foreground truncate">{collection.compilerPeriod}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-primary font-medium">Explore</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
