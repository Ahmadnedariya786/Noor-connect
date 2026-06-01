import { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import {
  Search, Book, Download, Plus, X, Trash2, CheckCircle, Clock,
  BookOpen, Bookmark, BookmarkCheck, ArrowUpDown, HardDrive,
  TrendingUp, Star, Filter, ChevronRight, BarChart3, LibraryBig,
  Grid3X3, List, Sparkles, MoreHorizontal, Play, Pause, Heart,
  ChevronLeft, BookMarked, FolderHeart, Zap, Eye, Info, Layers,
  FileText, Users, Calendar, Tag, Settings as SettingsIcon, Shuffle, SortAsc
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import {
  getDownloadedBooks, getUserBooks, downloadBook,
  deleteDownloadedBook, deleteUserBook, addUserBook,
  formatFileSize, ensureHttps,
  type DownloadedBook, type UserBook
} from "@/lib/ebooks-storage";
import {
  getProgressPercentage, getRecentlyRead, getReadingStats,
  getLastReadBook, getBookBookmarks, toggleBookBookmark,
  type EbookBookmark, type ReadingProgress
} from "@/lib/reading-progress";
import {
  detectCategory, cleanTitle, CATEGORY_THEMES, type BookCategory,
  generateSubtitle, extractAuthor, getDecorationElements
} from "@/lib/book-themes";
import ebooksData from "@/data/ebooks-library.json";
import PdfViewer from "@/components/PdfViewer";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface LibraryBook {
  title: string;
  file: string;
  url: string;
  size: string;
}

const books = ebooksData as LibraryBook[];
const LOCAL_PREFIX = 'local:';

// --- Enhanced Book Cover Component ---
const EnhancedBookCover = memo(({ 
  title, 
  category, 
  size,
  progress = 0,
  showProgress = true,
  className = "",
  compact = false
}: { 
  title: string; 
  category: BookCategory; 
  size?: string;
  progress?: number;
  showProgress?: boolean;
  className?: string;
  compact?: boolean;
}) => {
  const theme = CATEGORY_THEMES[category];
  const clean = cleanTitle(title);
  const author = extractAuthor(title);
  const subtitle = generateSubtitle(title, category);
  
  if (compact) {
    return (
      <div className={`relative group ${className}`}>
        <div 
          className={`w-full rounded-lg bg-gradient-to-br ${theme.gradient} shadow-md overflow-hidden relative`}
          style={{ aspectRatio: '3/2' }}
        >
          {/* Content */}
          <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
            {/* Top: Icon and category */}
            <div className="flex items-start justify-between">
              <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <span className="text-lg">{theme.icon}</span>
              </div>
              <Badge 
                variant="secondary" 
                className="bg-white/10 backdrop-blur-sm border-0 text-[8px] text-white/90 font-medium px-1.5 py-0.5"
              >
                {category}
              </Badge>
            </div>
            
            {/* Center: Title */}
            <div className="text-center">
              <h3 className="text-[10px] font-semibold leading-tight line-clamp-2 drop-shadow-sm">
                {clean}
              </h3>
              {author && (
                <p className="text-[8px] text-white/70 mt-1">{author}</p>
              )}
            </div>
            
            {/* Bottom: Progress */}
            {showProgress && progress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] text-white/70">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={`relative group ${className}`}>
      <div 
        className={`w-full h-full rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg overflow-hidden relative transform transition-transform duration-300 group-hover:scale-105`}
        style={{ aspectRatio: '2/3' }}
      >
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: theme.pattern, backgroundSize: '40px 40px' }}
        />
        
        {/* Decorative corner */}
        <div 
          className="absolute top-0 left-0 w-20 h-20 opacity-30"
          style={{ backgroundImage: getDecorationElements(theme.decoration).corner, backgroundSize: '100% 100%' }}
        />
        
        {/* Spine effect */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white/20 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between text-white">
          {/* Top: Category and size */}
          <div className="flex items-start justify-between">
            <Badge 
              variant="secondary" 
              className="bg-white/10 backdrop-blur-sm border-0 text-[10px] text-white/90 font-medium px-2 py-1"
            >
              <span className="mr-1">{theme.icon}</span>
              {category}
            </Badge>
            {size && (
              <span className="text-[9px] text-white/60 bg-black/20 px-2 py-1 rounded-full">
                {formatFileSize(parseInt(size))}
              </span>
            )}
          </div>
          
          {/* Center: Icon and title */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
              <span className="text-3xl">{theme.icon}</span>
            </div>
            <h3 className="text-[12px] font-semibold leading-tight line-clamp-3 drop-shadow-sm">
              {clean}
            </h3>
            {author && (
              <p className="text-[10px] text-white/70 mt-2 line-clamp-1">{author}</p>
            )}
          </div>
          
          {/* Bottom: Subtitle and progress */}
          <div className="space-y-2">
            <p className="text-[10px] text-white/60 text-center line-clamp-1">
              {subtitle}
            </p>
            {showProgress && progress > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-white/70">
                  <span>Reading Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  );
});
EnhancedBookCover.displayName = 'EnhancedBookCover';

// --- Enhanced Book Card Component ---
const EnhancedBookCard = memo(({ 
  book, 
  onClick, 
  onDownload, 
  onBookmark, 
  isBookmarked, 
  isDownloaded, 
  downloadProgress,
  onAddToCollection,
  collectionsCount,
  compact = false
}: {
  book: LibraryBook | DownloadedBook | UserBook;
  onClick: () => void;
  onDownload: (e: React.MouseEvent) => void;
  onBookmark: (e: React.MouseEvent) => void;
  isBookmarked: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  onAddToCollection?: () => void;
  collectionsCount?: number;
  compact?: boolean;
}) => {
  const title = 'file' in book ? cleanTitle(book.title) : book.title;
  const category = detectCategory(title);
  const progress = getProgressPercentage(book);
  const theme = CATEGORY_THEMES[category];
  
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative group"
    >
      <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div onClick={onClick} className="relative">
            <EnhancedBookCover
              title={title}
              category={category}
              size={'size' in book ? book.size : undefined}
              progress={progress}
              showProgress={progress > 0}
              compact={compact}
            />
            
            {/* Quick action overlay */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8 w-8 p-0 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onBookmark(e);
                  }}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-primary" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
                
                {onAddToCollection && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCollection();
                    }}
                  >
                    <FolderHeart className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Download progress */}
            {downloadProgress !== undefined && downloadProgress > 0 && downloadProgress < 100 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm p-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Progress value={downloadProgress} className="h-1" />
                  </div>
                  <span className="text-xs text-white">{downloadProgress}%</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Book info */}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                  {title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {theme.icon}
                    {category}
                  </span>
                  {isDownloaded && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Download className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </div>
              </div>
              
              {/* Quick download button */}
              {!isDownloaded && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 rounded-full"
                  onClick={onDownload}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Collections badge */}
            {collectionsCount && collectionsCount > 0 && (
              <div className="mt-2">
                <Badge variant="secondary" className="text-xs">
                  <FolderHeart className="w-3 h-3 mr-1" />
                  {collectionsCount} collection{collectionsCount > 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});
EnhancedBookCard.displayName = 'EnhancedBookCard';

// --- Enhanced Book Shelf Component ---
const EnhancedBookShelf = memo(({ 
  title, 
  books, 
  onBookClick, 
  onDownload, 
  onBookmark, 
  onAddToCollection,
  emptyMessage,
  icon: Icon = Book,
  compact = false
}: {
  title: string;
  books: (LibraryBook | DownloadedBook | UserBook)[];
  onBookClick: (book: LibraryBook | DownloadedBook | UserBook) => void;
  onDownload: (book: LibraryBook | DownloadedBook | UserBook, e: React.MouseEvent) => void;
  onBookmark: (book: LibraryBook | DownloadedBook | UserBook, e: React.MouseEvent) => void;
  onAddToCollection?: (book: LibraryBook | DownloadedBook | UserBook) => void;
  emptyMessage?: string;
  icon?: any;
  compact?: boolean;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);
  
  useEffect(() => {
    checkScroll();
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', checkScroll);
      return () => scrollElement.removeEventListener('scroll', checkScroll);
    }
  }, [checkScroll]);
  
  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = compact ? 200 : 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  if (books.length === 0) {
    if (emptyMessage) {
      return (
        <Card className="border-dashed border-border/50">
          <CardContent className="py-8 text-center">
            <Icon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-2">{emptyMessage}</p>
            <p className="text-xs text-muted-foreground/60">Books will appear here when available</p>
          </CardContent>
        </Card>
      );
    }
    return null;
  }
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-xs text-muted-foreground">{books.length} books</p>
          </div>
        </div>
        
        {/* Scroll buttons */}
        {books.length > (compact ? 4 : 3) && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-full"
              disabled={!canScrollLeft}
              onClick={() => scroll('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 w-8 p-0 rounded-full"
              disabled={!canScrollRight}
              onClick={() => scroll('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      
      {/* Books container */}
      <div 
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {books.map((book, i) => (
          <div 
            key={`${book.url}-${i}`} 
            className={`flex-shrink-0 ${compact ? 'w-40' : 'w-32 sm:w-36'}`}
          >
            <EnhancedBookCard
              book={book}
              onClick={() => onBookClick(book)}
              onDownload={(e) => onDownload(book, e as React.MouseEvent)}
              onBookmark={(e) => onBookmark(book, e as React.MouseEvent)}
              isBookmarked={false} // Will be set by parent
              isDownloaded={false} // Will be set by parent
              downloadProgress={0} // Will be set by parent
              onAddToCollection={onAddToCollection}
              collectionsCount={0} // Will be set by parent
              compact={compact}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
EnhancedBookShelf.displayName = 'EnhancedBookShelf';

// --- Enhanced Search and Filter Component ---
const EnhancedSearchAndFilter = memo(({ 
  searchQuery, 
  setSearchQuery, 
  sortBy, 
  setSortBy, 
  filterBy, 
  setFilterBy,
  categories
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  filterBy: string;
  setFilterBy: (filter: string) => void;
  categories: string[];
}) => {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search books, authors, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 h-11 bg-muted/50 border-0 rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          {searchQuery && (
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 rounded-full"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sort */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <SortAsc className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-0 text-sm focus:outline-none px-2 py-1 rounded"
            >
              <option value="title">Title</option>
              <option value="date">Date Added</option>
              <option value="size">Size</option>
              <option value="progress">Progress</option>
            </select>
          </div>
          
          {/* Category filter */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="bg-transparent border-0 text-sm focus:outline-none px-2 py-1 rounded"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
EnhancedSearchAndFilter.displayName = 'EnhancedSearchAndFilter';

export { EnhancedBookCover, EnhancedBookCard, EnhancedBookShelf, EnhancedSearchAndFilter };
