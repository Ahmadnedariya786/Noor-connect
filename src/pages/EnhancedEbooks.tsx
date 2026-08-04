import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Book, Download, Plus, X, Trash2, CheckCircle, Clock,
  BookOpen, Bookmark, BookmarkCheck, ArrowUpDown, HardDrive,
  TrendingUp, Star, Filter, ChevronRight, BarChart3, LibraryBig,
  Grid3X3, List, Sparkles, MoreHorizontal, Play, Pause, Heart,
  ChevronLeft, BookMarked, FolderHeart, Zap, Eye, Info, Layers,
  FileText, Users, Calendar, Tag, Settings as SettingsIcon, Shuffle, SortAsc,
  Home, BookOpenText, DownloadCloud, BookmarkPlus, History
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
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
  generateSubtitle, extractAuthor
} from "@/lib/book-themes";
import ebooksData from "@/data/ebooks-library.json";
import PdfViewer from "@/components/PdfViewer";
import { motion, AnimatePresence } from "framer-motion";
import { 
  EnhancedBookCard, 
  EnhancedBookShelf, 
  EnhancedSearchAndFilter 
} from "@/components/EnhancedEbooksComponents";

// --- Types ---
interface LibraryBook {
  title: string;
  file: string;
  url: string;
  size: string;
}

const books = ebooksData as LibraryBook[];

// --- Main Enhanced Ebooks Page ---
export default function EnhancedEbooksPage() {
  const { t } = useLanguage();
  // --- State Management ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [filterBy, setFilterBy] = useState("all");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [viewingBook, setViewingBook] = useState<LibraryBook | DownloadedBook | UserBook | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [selectedBookForCollection, setSelectedBookForCollection] = useState<LibraryBook | DownloadedBook | UserBook | null>(null);
  
  // Data states
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBook[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [bookmarks, setBookmarks] = useState<EbookBookmark[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Data Loading ---
  useEffect(() => {
    setDownloadedBooks(getDownloadedBooks());
    setUserBooks(getUserBooks());
    setBookmarks(getBookBookmarks());
    setCollections(getCollections());
  }, []);

  // --- Computed Values ---
  const allBooks = useMemo(() => {
    const available = [...books, ...downloadedBooks, ...userBooks];
    const filtered = available.filter(book => {
      const title = 'file' in book ? cleanTitle(book.title) : book.title;
      const category = detectCategory(title);
      const matchesSearch = searchQuery === "" || 
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        extractAuthor(title)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterBy === "all" || category === filterBy;
      
      return matchesSearch && matchesFilter;
    });

     // Sort books
     return filtered.sort((a, b) => {
       const titleA = 'file' in a ? cleanTitle(a.title) : a.title;
       const titleB = 'file' in b ? cleanTitle(b.title) : b.title;
       
       switch (sortBy) {
         case "title": {
           return titleA.localeCompare(titleB);
         }
         case "date": {
           return 0; // Would need date tracking
         }
         case "size": {
           const sizeA = parseInt('size' in a ? a.size || '0' : '0');
           const sizeB = parseInt('size' in b ? b.size || '0' : '0');
           return sizeB - sizeA;
         }
         case "progress": {
           const progressA = getProgressPercentage(a);
           const progressB = getProgressPercentage(b);
           return progressB - progressA;
         }
         default: {
           return 0;
         }
       }
     });
  }, [books, downloadedBooks, userBooks, searchQuery, sortBy, filterBy]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allBooks.forEach(book => {
      const title = 'file' in book ? cleanTitle(book.title) : book.title;
      cats.add(detectCategory(title));
    });
    return Array.from(cats);
  }, [allBooks]);

  const recentlyRead = useMemo(() => getRecentlyRead(), [downloadedBooks, userBooks]);
  const lastReadBook = useMemo(() => getLastReadBook(), [downloadedBooks, userBooks]);
  const readingStats = useMemo(() => getReadingStats(), [downloadedBooks, userBooks]);

  // --- Event Handlers ---
  const handleBookClick = useCallback((book: LibraryBook | DownloadedBook | UserBook) => {
    setViewingBook(book);
  }, []);

  const handleDownload = useCallback(async (book: LibraryBook | DownloadedBook | UserBook, e: React.MouseEvent) => {
    e.stopPropagation();
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    try {
      setDownloadProgress(prev => ({ ...prev, [book.url]: 0 }));
      
      progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[book.url] || 0;
          if (current >= 95) {
            if (progressInterval) clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [book.url]: Math.min(current + 10, 95) };
        });
      }, 200);

      await downloadBook(book.url, book.title);
      
      if (progressInterval) clearInterval(progressInterval);
      setDownloadProgress(prev => ({ ...prev, [book.url]: 100 }));
      
      setTimeout(() => {
        setDownloadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[book.url];
          return newProgress;
        });
        setDownloadedBooks(getDownloadedBooks());
      }, 500);

      toast({
        title: "Download started",
        description: `${book.title} is being downloaded`
      });
    } catch (error) {
      if (progressInterval) clearInterval(progressInterval);
      toast({
        title: "Download failed",
        description: "Could not download the book",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleBookmark = useCallback((book: LibraryBook | DownloadedBook | UserBook, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookBookmark(book.url);
    setBookmarks(getBookBookmarks());
    
    const isBookmarked = bookmarks.some(b => b.bookUrl === book.url);
    toast({
      title: isBookmarked ? "Bookmark removed" : "Bookmarked",
      description: `${book.title} ${isBookmarked ? 'removed from' : 'added to'} bookmarks`
    });
  }, [bookmarks, toast]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      addUserBook(file);
      setUserBooks(getUserBooks());
      toast({
        title: "Book uploaded",
        description: `${file.name} has been added to your library`
      });
    }
  }, [toast]);

  // --- Collections Functions ---
  const getCollections = () => {
    const stored = localStorage.getItem('book-collections');
    return stored ? JSON.parse(stored) : [
      { id: '1', name: 'Ramadan Reading', description: 'Books for Ramadan', books: [], color: 'from-emerald-500 to-emerald-700', icon: '🌙' },
      { id: '2', name: 'Favorites', description: 'My favorite books', books: [], color: 'from-rose-500 to-rose-700', icon: '❤️' }
    ];
  };

  const saveCollections = (collections: any[]) => {
    localStorage.setItem('book-collections', JSON.stringify(collections));
  };

  const handleAddToCollection = useCallback((book: LibraryBook | DownloadedBook | UserBook) => {
    setSelectedBookForCollection(book);
    setShowCollectionDialog(true);
  }, []);

  // --- PDF Viewer Back Navigation ---
  useEffect(() => {
    if (viewingBook) {
      window.history.pushState({ pdfOpen: true }, '');
      const handlePopState = () => setViewingBook(null);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [viewingBook]);

  // --- Storage Stats ---
  const storageUsed = useMemo(() => {
    const total = downloadedBooks.reduce((sum, b) => sum + b.fileSize, 0) + userBooks.reduce((sum, b) => sum + b.fileSize, 0);
    return formatFileSize(total);
  }, [downloadedBooks, userBooks]);

  // --- If viewing PDF, show viewer ---
  if (viewingBook) {
    return <PdfViewer url={viewingBook.url} title={viewingBook.title} localKey={viewingBook.localKey} onClose={() => window.history.back()} />;
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-4 space-y-4">
          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <LibraryBig className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Islamic Library</h1>
                <p className="text-xs text-muted-foreground">Your collection of Islamic literature</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  className="h-8 w-8 px-0"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  className="h-8 w-8 px-0"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Upload Button */}
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Plus className="w-4 h-4" />
                Upload PDF
              </Button>
              <input type="file" accept=".pdf,application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
          
          {/* Search and Filters */}
          <EnhancedSearchAndFilter
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterBy={filterBy}
            setFilterBy={setFilterBy}
            categories={categories}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-7xl mx-auto space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Book className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allBooks.length}</p>
                  <p className="text-xs text-muted-foreground">Total Books</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{downloadedBooks.length + userBooks.length}</p>
                  <p className="text-xs text-muted-foreground">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{bookmarks.length}</p>
                  <p className="text-xs text-muted-foreground">Bookmarked</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-lg font-bold">{storageUsed}</p>
                  <p className="text-xs text-muted-foreground">Storage Used</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Reading */}
        {lastReadBook && (
          <EnhancedBookShelf
            title={t("continueReading") || "Continue Reading"}
            books={[lastReadBook]}
            onBookClick={handleBookClick}
            onDownload={handleDownload}
            onBookmark={handleBookmark}
            onAddToCollection={handleAddToCollection}
            icon={BookOpenText}
            compact={true}
          />
        )}

        {/* Recently Read */}
        {recentlyRead.length > 0 && (
          <EnhancedBookShelf
            title={t("recentlyRead") || "Recently Read"}
            books={recentlyRead.slice(0, 5)}
            onBookClick={handleBookClick}
            onDownload={handleDownload}
            onBookmark={handleBookmark}
            onAddToCollection={handleAddToCollection}
            icon={History}
            compact={true}
          />
        )}

        {/* All Books */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Books</h2>
            <Badge variant="secondary">{allBooks.length} books</Badge>
          </div>
          
          {allBooks.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4" 
              : "space-y-2"
            }>
              {allBooks.map((book, i) => (
                <EnhancedBookCard
                  key={`${book.url}-${i}`}
                  book={book}
                  onClick={() => handleBookClick(book)}
                  onDownload={handleDownload}
                  onBookmark={handleBookmark}
                  isBookmarked={bookmarks.some(b => b.bookUrl === book.url)}
                  isDownloaded={downloadedBooks.some(b => b.url === book.url) || userBooks.some(b => b.url === book.url)}
                  downloadProgress={downloadProgress[book.url]}
                  onAddToCollection={handleAddToCollection}
                  collectionsCount={collections.filter(c => c.books.includes(book.url)).length}
                  compact={viewMode === 'list'}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Book className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No books found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || filterBy !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Upload your first PDF to get started"
                  }
                </p>
                {!searchQuery && filterBy === "all" && (
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload PDF
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Collection Dialog */}
      <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
            <DialogDescription>
              Choose a collection to add "{selectedBookForCollection?.title}" to
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {collections.map(collection => (
              <Button
                key={collection.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  // Add to collection logic here
                  setShowCollectionDialog(false);
                }}
              >
                <span className="mr-2">{collection.icon}</span>
                {collection.name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
