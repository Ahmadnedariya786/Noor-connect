
import { memo } from "react";
import { 
  BookOpen, Download, CheckCircle, 
  BookmarkCheck, Bookmark, LibraryBig 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BookCover } from "./BookCover";
import { cleanTitle, detectCategory } from "@/lib/book-themes";
import { ensureHttps } from "@/lib/ebooks-storage";
import { getProgressPercentage, getReadingProgress } from "@/lib/reading-progress";
import { LibraryBook } from "@/types/ebooks";

interface BookCardProps {
  book: LibraryBook;
  onClick: () => void;
  onDownload?: (e: React.MouseEvent) => void;
  onBookmark?: (e: React.MouseEvent) => void;
  isBookmarked?: boolean;
  isDownloaded?: boolean;
  downloadProgress?: number;
  showActions?: boolean;
  onAddToCollection?: () => void;
  collectionsCount?: number;
}

export const BookCard = memo(({
  book,
  onClick,
  onDownload,
  onBookmark,
  isBookmarked,
  isDownloaded,
  downloadProgress,
  showActions = true,
  onAddToCollection,
  collectionsCount = 0
}: BookCardProps) => {
  const category = detectCategory(cleanTitle(book.title));
  const bookUrl = ensureHttps(book.url);
  const readProgress = getProgressPercentage(bookUrl);
  const readProgressData = getReadingProgress(bookUrl);
  const clean = cleanTitle(book.title);
  
  return (
    <motion.div 
      className="group cursor-pointer"
      onClick={onClick}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <BookCover 
          title={book.title} 
          category={category} 
          size={book.size}
          progress={readProgress}
        />
        
        {/* Hover actions overlay */}
        {showActions && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex flex-col items-center justify-center gap-2 p-3">
            <Button size="sm" variant="secondary" className="w-full text-xs">
              <BookOpen className="w-3 h-3 mr-1.5" /> Read
            </Button>
            {!isDownloaded && downloadProgress === undefined && (
              <Button 
                size="sm" 
                className="w-full text-xs"
                onClick={onDownload}
              >
                <Download className="w-3 h-3 mr-1.5" /> Download
              </Button>
            )}
          </div>
        )}
        
        {/* Download progress overlay */}
        {downloadProgress !== undefined && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <div className="text-lg font-bold">{downloadProgress}%</div>
              <div className="w-20 h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 rounded-full transition-all"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Downloaded badge */}
        {isDownloaded && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <CheckCircle className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        )}
        
        {/* Bookmark button */}
        {onBookmark && (
          <button 
            className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onBookmark}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 text-white/70" />
            )}
          </button>
        )}
        
        {/* Collection indicator */}
        {collectionsCount > 0 && (
          <div className="absolute top-2 right-2">
            <div className="w-6 h-6 rounded-full bg-purple-500/90 backdrop-blur-sm flex items-center justify-center shadow-lg" title={`In ${collectionsCount} collection(s)`}>
              <LibraryBig className="w-3 h-3 text-white" />
            </div>
          </div>
        )}
        
        {/* Collection button */}
        {onAddToCollection && (
          <button 
            className="absolute top-2 left-10 w-7 h-7 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/50 hover:scale-110"
            onClick={onAddToCollection}
            title="Add to collection"
          >
            <LibraryBig className="w-3.5 h-3.5 text-white/70" />
          </button>
        )}
      </div>
      
      {/* Title below cover */}
      <div className="mt-2 px-0.5">
        <h4 className="text-xs font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">
          {clean}
        </h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">{category}</span>
          {readProgress > 0 && (
            <span className="text-[10px] text-emerald-500 font-medium" title={`Page ${readProgressData?.currentPage ?? '?'} of ${readProgressData?.totalPages ?? '?'}`}>
              {readProgressData?.currentPage && readProgressData?.totalPages
                ? `${readProgressData.currentPage}/${readProgressData.totalPages}`
                : `${readProgress}%`}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

BookCard.displayName = 'BookCard';
