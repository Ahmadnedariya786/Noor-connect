
import { memo } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, ChevronRight } from "lucide-react";
import { CATEGORY_THEMES, cleanTitle, detectCategory } from "@/lib/book-themes";
import { BookSource } from "@/types/ebooks";
import { getReadingProgress } from "@/lib/reading-progress";

interface ContinueReadingCardProps {
  book: BookSource;
  progress: number;
  onClick: () => void;
}

export const ContinueReadingCard = memo(({
  book,
  progress,
  onClick
}: ContinueReadingCardProps) => {
  const title = 'file' in book ? cleanTitle(book.title) : book.title;
  const category = detectCategory(title);
  const theme = CATEGORY_THEMES[category];
  const progressData = 'url' in book ? getReadingProgress(book.url) : null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card 
        className="relative overflow-hidden cursor-pointer group"
        onClick={onClick}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-10`} />
        
        <div className="relative p-4 flex items-center gap-4">
          {/* Mini cover */}
          <div className={`w-14 h-20 rounded-lg bg-gradient-to-br ${theme.gradient} shadow-md flex items-center justify-center flex-shrink-0`}>
            <span className="text-xl">{theme.icon}</span>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                <Play className="w-3 h-3 mr-1" /> Continue Reading
              </Badge>
            </div>
            <h3 className="font-semibold text-sm truncate">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{category}</p>
            
            {/* Progress */}
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground font-medium" title={`Page ${progressData?.currentPage ?? '?'} of ${progressData?.totalPages ?? '?'}`}>
                {progressData?.currentPage && progressData?.totalPages
                  ? `${progressData.currentPage}/${progressData.totalPages}`
                  : `${progress}%`}
              </span>
            </div>
          </div>
          
          {/* Arrow */}
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </Card>
    </motion.div>
  );
});

ContinueReadingCard.displayName = 'ContinueReadingCard';
