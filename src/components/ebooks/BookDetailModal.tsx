
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, BookmarkCheck, Bookmark, 
  HardDrive, BookOpen, Download, CheckCircle 
} from "lucide-react";
import { 
  CATEGORY_THEMES, cleanTitle, detectCategory, 
  extractAuthor, generateSubtitle, getDecorationElements 
} from "@/lib/book-themes";
import { formatFileSize, ensureHttps } from "@/lib/ebooks-storage";
import { getReadingProgress } from "@/lib/reading-progress";
import { LibraryBook } from "@/types/ebooks";

interface BookDetailModalProps {
  book: LibraryBook | null;
  isOpen: boolean;
  onClose: () => void;
  onRead: () => void;
  onDownload: () => void;
  onBookmark: () => void;
  isBookmarked: boolean;
  isDownloaded: boolean;
  progress: number;
}

export const BookDetailModal = ({
  book,
  isOpen,
  onClose,
  onRead,
  onDownload,
  onBookmark,
  isBookmarked,
  isDownloaded,
  progress
}: BookDetailModalProps) => {
  if (!book) return null;
  
  const category = detectCategory(cleanTitle(book.title));
  const theme = CATEGORY_THEMES[category];
  const clean = cleanTitle(book.title);
  const progressData = getReadingProgress(ensureHttps(book.url));
  const author = extractAuthor(book.title);
  const subtitle = generateSubtitle(book.title, category);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Hero section */}
        <div className={`relative h-48 bg-gradient-to-br ${theme.gradient}`}>
          {/* Pattern */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: theme.pattern, backgroundSize: '40px 40px' }}
          />
          
          {/* Back button */}
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {/* Bookmark button */}
          <button 
            onClick={onBookmark}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors"
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-amber-400" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>
          
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <span className="text-4xl">{theme.icon}</span>
            </div>
          </div>
          
          {/* Category badge */}
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
              {category}
            </Badge>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-5">
          <DialogHeader className="text-left mb-4">
            <DialogTitle className="text-lg leading-tight">{clean}</DialogTitle>
            {author && (
              <p className="text-sm text-muted-foreground mt-1">by {author}</p>
            )}
          </DialogHeader>
          
          <DialogDescription className="text-sm mb-4">
            {subtitle}
          </DialogDescription>
          
          {/* Stats */}
          <div className="flex items-center gap-4 mb-5 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <HardDrive className="w-4 h-4" />
              <span>{formatFileSize(parseInt(book.size))}</span>
            </div>
            {progress > 0 && (
              <div className="flex items-center gap-1.5 text-[var(--accent)]">
                <BookOpen className="w-4 h-4" />
                <span>{progress}% read</span>
              </div>
            )}
            {isDownloaded && (
              <div className="flex items-center gap-1.5 text-[var(--success)]">
                <CheckCircle className="w-4 h-4" />
                <span>Downloaded</span>
              </div>
            )}
          </div>
          
          {/* Progress bar if started */}
          {progress > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Reading progress</span>
                <span className="font-medium" title={`Page ${progressData?.currentPage ?? '?'} of ${progressData?.totalPages ?? '?'}`}>
                  {progressData?.currentPage && progressData?.totalPages
                    ? `${progressData.currentPage}/${progressData.totalPages}`
                    : `${progress}%`}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button 
              className="flex-1 h-11"
              onClick={onRead}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {progress > 0 ? 'Continue Reading' : 'Start Reading'}
            </Button>
            {!isDownloaded && (
              <Button 
                variant="outline" 
                className="h-11 px-4"
                onClick={onDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
