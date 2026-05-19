import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Book, Download, Plus, X, Trash2,
  BookOpen, Bookmark, HardDrive, BookmarkCheck, CheckCircle,
  TrendingUp, Star, Grid3X3, List, Sparkles,
  LibraryBig, Zap
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLazyLoad } from "@/hooks/useLazyLoad";
import {
  getDownloadedBooks, getUserBooks, downloadBook,
  deleteDownloadedBook, addUserBook,
  formatFileSize, ensureHttps,
  type DownloadedBook, type UserBook
} from "@/lib/ebooks-storage";
import {
  getProgressPercentage, getRecentlyRead, getReadingStats,
  getLastReadBook, getBookBookmarks, toggleBookBookmark,
  type EbookBookmark, type ReadingProgress
} from "@/lib/reading-progress";
import {
  detectCategory, cleanTitle, CATEGORY_THEMES, type BookCategory
} from "@/lib/book-themes";
import ebooksData from "@/data/ebooks-library.json";
import PdfViewer from "@/components/PdfViewer";
import { AnimatePresence, motion } from "framer-motion";

// --- Extracted Components & Types ---
import { BookCard } from "@/components/ebooks/BookCard";
import { BookShelf } from "@/components/ebooks/BookShelf";
import { BookDetailModal } from "@/components/ebooks/BookDetailModal";
import { CategoryGridItem } from "@/components/ebooks/CategoryGridItem";
import { ContinueReadingCard } from "@/components/ebooks/ContinueReadingCard";
import { LibraryBook } from "@/types/ebooks";
import { 
  Collection, createCollection, getCollections, 
  saveCollections, addBookToCollection, removeBookFromCollection 
} from "@/lib/book-collections";

const books = ebooksData as LibraryBook[];
const LOCAL_PREFIX = 'local:';

export default function EbooksModern() {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'browse' | 'saved' | 'downloads'>('home');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'a-z' | 'z-a' | 'recent'>('a-z');
  
  // Data state
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBook[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [bookmarks, setBookmarks] = useState<EbookBookmark[]>([]);
  const [recentlyRead, setRecentlyRead] = useState<ReadingProgress[]>([]);
  const [readingStats, setReadingStats] = useState({ totalBooks: 0, completedBooks: 0, inProgress: 0 });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  
  // UI state
  const [viewingBook, setViewingBook] = useState<{ url: string; title: string; localKey?: string } | null>(null);
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [lastReadBookKey, setLastReadBookKey] = useState<string | null>(null);
  const [showCollectionDialog, setShowCollectionDialog] = useState(false);
  const [selectedBookForCollection, setSelectedBookForCollection] = useState<LibraryBook | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedCollectionForView, setSelectedCollectionForView] = useState<Collection | null>(null);
  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [editingCollectionName, setEditingCollectionName] = useState('');
  const [editingCollectionDescription, setEditingCollectionDescription] = useState('');
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Load data
  useEffect(() => {
    const load = async () => {
      const [downloaded, user] = await Promise.all([
        getDownloadedBooks(), 
        getUserBooks()
      ]);
      setDownloadedBooks(downloaded);
      setUserBooks(user);
      setRecentlyRead(getRecentlyRead(5));
      setReadingStats(getReadingStats());
      setBookmarks(getBookBookmarks());
      setLastReadBookKey(getLastReadBook());
      setCollections(getCollections());
    };
    load();
  }, [viewingBook]);
  
  // Derived data
  const bookmarkedSet = useMemo(() => new Set(bookmarks.map(b => b.bookUrl)), [bookmarks]);
  const downloadedSet = useMemo(() => new Set(downloadedBooks.map(b => b.url)), [downloadedBooks]);
  
  // Get new arrivals
  const newArrivals = useMemo(() => {
    return books
      .filter(b => !b.title.toLowerCase().includes('read me first'))
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
  }, []);
  
  // Get trending books
  const trendingBooks = useMemo(() => {
    const popularCategories: BookCategory[] = ['Quran & Tafsir', 'Hadith', 'Fiqh', 'Seerah', 'Dua & Dhikr'];
    return books
      .filter(book => {
        const title = cleanTitle(book.title);
        if (title.toLowerCase().includes('read me first')) {
          return false;
        }
        const category = detectCategory(title);
        return popularCategories.includes(category);
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 12);
  }, []);
  
  // Get recommendations
  const recommendedBooks = useMemo(() => {
    if (recentlyRead.length === 0) {
      return books
        .filter(book => !book.title.toLowerCase().includes('read me first'))
        .sort(() => Math.random() - 0.5)
        .slice(0, 8);
    }
    
    const readCategories = new Set<string>();
    recentlyRead.forEach(item => {
      const book = books.find(b => ensureHttps(b.url) === item.bookUrl);
      if (book) {
        readCategories.add(detectCategory(cleanTitle(book.title)));
      }
    });
    
    return books
      .filter(book => {
        const title = cleanTitle(book.title);
        if (title.toLowerCase().includes('read me first')) {
          return false;
        }
        const category = detectCategory(title);
        return readCategories.has(category);
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, 8);
  }, [recentlyRead]);
  
  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    books
      .filter(b => !b.title.toLowerCase().includes('read me first'))
      .forEach(b => {
        const cat = detectCategory(cleanTitle(b.title));
        counts[cat] = (counts[cat] || 0) + 1;
      });
    return counts;
  }, []);
  
  // Filtered books for browse
  const filteredBooks = useMemo(() => {
    let filtered = books.filter(b => 
      !b.title.toLowerCase().includes('read me first') && 
      !b.title.toLowerCase().includes('table of contents')
    );
    
    if (selectedCategory) {
      filtered = filtered.filter(b => detectCategory(cleanTitle(b.title)) === selectedCategory);
    }
    
    if (debouncedQuery) {
      const query = debouncedQuery.toLowerCase();
      filtered = filtered.filter(b => cleanTitle(b.title).toLowerCase().includes(query));
    }
    
     // Sort
     const sorted = [...filtered];
     switch (sortBy) {
       case 'a-z': {
         sorted.sort((a, b) => cleanTitle(a.title).localeCompare(cleanTitle(b.title)));
         break;
       }
       case 'z-a': {
         sorted.sort((a, b) => cleanTitle(b.title).localeCompare(cleanTitle(a.title)));
         break;
       }
       case 'recent': {
         sorted.sort(() => Math.random() - 0.5);
         break;
       }
     }
    
    return sorted;
  }, [selectedCategory, debouncedQuery, sortBy]);
  
  // Lazy loading for browse grid
  const { visibleItems, hasMore, loadMoreRef } = useLazyLoad(filteredBooks, {
    initialLoadCount: 18,
    batchSize: 24,
    rootMargin: '300px'
  });
  
  // Resolve book by key
  const resolveOpenTargetByKey = useCallback((bookKey: string): (LibraryBook | DownloadedBook | UserBook | null) => {
    if (bookKey.startsWith(LOCAL_PREFIX)) {
      const localKey = bookKey.slice(LOCAL_PREFIX.length);
      return userBooks.find(b => b.localKey === localKey) || downloadedBooks.find(b => b.localKey === localKey) || null;
    }
    const secureKey = ensureHttps(bookKey);
    return books.find(b => ensureHttps(b.url) === secureKey) || downloadedBooks.find(b => ensureHttps(b.url) === secureKey) || null;
  }, [downloadedBooks, userBooks]);
  
  // Last read entry
  const lastReadEntry = useMemo(() => {
    if (!lastReadBookKey) {
      return null;
    }
    const openTarget = resolveOpenTargetByKey(lastReadBookKey);
    if (!openTarget) {
      return null;
    }
    return {
      openTarget,
      bookKey: lastReadBookKey,
      title: "file" in openTarget ? cleanTitle(openTarget.title) : openTarget.title,
      progress: getProgressPercentage(lastReadBookKey),
    };
  }, [lastReadBookKey, resolveOpenTargetByKey]);
  
  // Handlers
  const openBook = (book: LibraryBook | DownloadedBook | UserBook) => {
    if ('url' in book && book.url) {
      const downloaded = downloadedBooks.find(b => b.url === ensureHttps(book.url));
      setViewingBook({ 
        url: ensureHttps(book.url), 
        title: 'file' in book ? cleanTitle(book.title) : book.title, 
        localKey: downloaded?.localKey 
      });
    } else if ('localKey' in book) {
      setViewingBook({ url: '', title: book.title, localKey: book.localKey });
    }
  };
  
  const handleDownload = async (book: LibraryBook, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      setDownloadProgress(prev => ({ ...prev, [book.url]: 0 }));
      const downloaded = await downloadBook(
        { title: cleanTitle(book.title), url: book.url, category: '' },
        (progress) => setDownloadProgress(prev => ({ ...prev, [book.url]: progress }))
      );
      setDownloadedBooks(prev => [...prev, downloaded]);
      setDownloadProgress(prev => { const s = { ...prev }; delete s[book.url]; return s; });
      toast({ title: "Downloaded", description: `${cleanTitle(book.title)} saved for offline reading` });
    } catch {
      setDownloadProgress(prev => { const s = { ...prev }; delete s[book.url]; return s; });
      toast({ title: "Download failed", description: "Try opening in browser instead", variant: "destructive" });
    }
  };
  
  const handleToggleBookmark = (book: LibraryBook, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const bookKey = ensureHttps(book.url);
    const title = cleanTitle(book.title);
    const isNowBookmarked = toggleBookBookmark(bookKey, title);
    setBookmarks(getBookBookmarks());
    toast({
      title: isNowBookmarked ? "Bookmarked" : "Bookmark removed",
      description: `${title} ${isNowBookmarked ? "added to" : "removed from"} bookmarks`,
    });
  };
  
  const handleDelete = async (url: string) => {
    await deleteDownloadedBook(url);
    setDownloadedBooks(prev => prev.filter(b => b.url !== url));
    toast({ title: "Deleted", description: "Book removed from device" });
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid file", description: "Please select a PDF file", variant: "destructive" });
      return;
    }
    try {
      const title = file.name.replace('.pdf', '');
      const userBook = await addUserBook(file, title);
      setUserBooks(prev => [...prev, userBook]);
      toast({ title: "Added", description: `${title} added to your library` });
    } catch {
      toast({ title: "Error", description: "Failed to add book", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const openBookDetail = (book: LibraryBook) => {
    setSelectedBook(book);
    setIsDetailOpen(true);
  };

  // --- Collection Management Handlers ---
  const handleAddToCollection = (book: LibraryBook) => {
    setSelectedBookForCollection(book);
    setShowCollectionDialog(true);
  };

  const handleConfirmAddToCollection = () => {
    if (selectedBookForCollection && selectedCollectionId) {
      addBookToCollection(selectedCollectionId, ensureHttps(selectedBookForCollection.url));
      const updated = getCollections();
      setCollections(updated);
      toast({
        title: "Added to collection",
        description: `${cleanTitle(selectedBookForCollection.title)} added to collection`
      });
    }
    setShowCollectionDialog(false);
    setSelectedBookForCollection(null);
    setSelectedCollectionId(null);
  };

  const handleRemoveFromCollection = (collectionId: string, bookUrl: string) => {
    removeBookFromCollection(collectionId, bookUrl);
    const updated = getCollections();
    setCollections(updated);
    toast({
      title: "Removed from collection",
      description: "Book removed from collection"
    });
  };

  const handleDeleteCollection = (collectionId: string) => {
    const updated = collections.filter(c => c.id !== collectionId);
    setCollections(updated);
    saveCollections(updated);
    toast({
      title: "Collection deleted",
      description: "Collection has been removed"
    });
  };

  const handleViewCollection = (collection: Collection) => {
    setSelectedCollectionForView(collection);
  };

  const getBooksInCollection = (collectionId: string): LibraryBook[] => {
    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return [];
    return collection.books
      .map(bookUrl => books.find(b => ensureHttps(b.url) === bookUrl))
      .filter((book): book is LibraryBook => book !== undefined);
  };

  const isBookInCollection = (collectionId: string, bookUrl: string): boolean => {
    const collection = collections.find(c => c.id === collectionId);
    return collection ? collection.books.includes(bookUrl) : false;
  };

  const getBookCollectionsCount = (bookUrl: string): number => {
    return collections.filter(collection => 
      collection.books.includes(ensureHttps(bookUrl))
    ).length;
  };

  const handleEditCollection = (collection: Collection) => {
    setIsEditingCollection(true);
    setEditingCollectionName(collection.name);
    setEditingCollectionDescription(collection.description);
  };

  const handleSaveCollectionEdit = () => {
    if (!selectedCollectionForView) return;
    
    const updatedCollections = collections.map(collection => 
      collection.id === selectedCollectionForView.id
        ? { ...collection, name: editingCollectionName, description: editingCollectionDescription }
        : collection
    );
    
    setCollections(updatedCollections);
    saveCollections(updatedCollections);
    setSelectedCollectionForView({ ...selectedCollectionForView, name: editingCollectionName, description: editingCollectionDescription });
    setIsEditingCollection(false);
    
    toast({
      title: "Collection updated",
      description: "Collection name and description have been updated"
    });
  };

  const handleCancelCollectionEdit = () => {
    setIsEditingCollection(false);
    setEditingCollectionName('');
    setEditingCollectionDescription('');
  };
  
  // PDF viewer back button
  useEffect(() => {
    if (viewingBook) {
      window.history.pushState({ pdfOpen: true }, '');
      const handlePopState = () => setViewingBook(null);
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [viewingBook]);
  
  // Storage used
  const storageUsed = useMemo(() => {
    const total = downloadedBooks.reduce((sum, b) => sum + b.fileSize, 0) + userBooks.reduce((sum, b) => sum + b.fileSize, 0);
    return formatFileSize(total);
  }, [downloadedBooks, userBooks]);
  
  // If viewing PDF, show viewer
  if (viewingBook) {
    return <PdfViewer url={viewingBook.url} title={viewingBook.title} localKey={viewingBook.localKey} onClose={() => window.history.back()} />;
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <LibraryBig className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Library</h1>
                <p className="text-[10px] text-muted-foreground -mt-0.5">Islamic Literature</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              {activeTab === 'browse' && (
                <div className="flex items-center bg-muted rounded-lg p-0.5">
                  <Button
                    size="sm"
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    className="h-7 w-7 px-0"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    className="h-7 w-7 px-0"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
              
              <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Plus className="w-4 h-4" />
                Upload eBook
              </Button>
              <input type="file" accept=".pdf,application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-10 bg-muted/50 border-0 rounded-xl focus-visible:ring-1"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
          {[
            { id: 'home', label: 'Home', icon: Sparkles },
            { id: 'browse', label: 'Browse', icon: Grid3X3 },
            { id: 'saved', label: 'Saved', icon: Bookmark },
            { id: 'downloads', label: 'Offline', icon: Download },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.id === 'saved' && bookmarks.length > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-primary-foreground/20 text-[9px] flex items-center justify-center">
                  {bookmarks.length}
                </span>
              )}
              {tab.id === 'downloads' && (downloadedBooks.length + userBooks.length) > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-primary-foreground/20 text-[9px] flex items-center justify-center">
                  {downloadedBooks.length + userBooks.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {lastReadEntry && (
                <section>
                  <ContinueReadingCard
                    book={lastReadEntry.openTarget}
                    progress={lastReadEntry.progress}
                    onClick={() => openBook(lastReadEntry.openTarget)}
                  />
                </section>
              )}
              
              {readingStats.totalBooks > 0 && (
                <section className="grid grid-cols-3 gap-3">
                  <Card className="p-3 text-center">
                    <BookOpen className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{readingStats.totalBooks}</p>
                    <p className="text-[10px] text-muted-foreground">Started</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{readingStats.inProgress}</p>
                    <p className="text-[10px] text-muted-foreground">In Progress</p>
                  </Card>
                  <Card className="p-3 text-center">
                    <Star className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                    <p className="text-xl font-bold">{readingStats.completedBooks}</p>
                    <p className="text-[10px] text-muted-foreground">Completed</p>
                  </Card>
                </section>
              )}
              
              <BookShelf
                title="Recommended for You"
                icon={Sparkles}
                books={recommendedBooks}
                onBookClick={openBookDetail}
                onDownload={handleDownload}
                onBookmark={handleToggleBookmark}
                onAddToCollection={handleAddToCollection}
                collections={collections}
                bookmarkedSet={bookmarkedSet}
                downloadedSet={downloadedSet}
                downloadProgress={downloadProgress}
                emptyMessage="Start reading to get personalized recommendations"
              />
              
              <BookShelf
                title="Trending Now"
                icon={TrendingUp}
                books={trendingBooks}
                onBookClick={openBookDetail}
                onDownload={handleDownload}
                onBookmark={handleToggleBookmark}
                onAddToCollection={handleAddToCollection}
                collections={collections}
                bookmarkedSet={bookmarkedSet}
                downloadedSet={downloadedSet}
                downloadProgress={downloadProgress}
              />
              
              <BookShelf
                title="New Arrivals"
                icon={Zap}
                books={newArrivals}
                onBookClick={openBookDetail}
                onDownload={handleDownload}
                onBookmark={handleToggleBookmark}
                onAddToCollection={handleAddToCollection}
                collections={collections}
                bookmarkedSet={bookmarkedSet}
                downloadedSet={downloadedSet}
                downloadProgress={downloadProgress}
              />
              
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <LibraryBig className="w-4 h-4 text-primary" /> Browse by Topic
                  </h3>
                  <button onClick={() => setActiveTab('browse')} className="text-xs text-primary hover:underline">
                    See all
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(categoryCounts) as [BookCategory, number][])
                    .filter(([_, count]) => count > 0)
                    .slice(0, 6)
                    .map(([category, count]) => (
                      <CategoryGridItem
                        key={category}
                        category={category}
                        count={count}
                        onClick={() => {
                          setSelectedCategory(category);
                          setActiveTab('browse');
                        }}
                      />
                    ))}
                </div>
              </section>
            </motion.div>
          )}
          
          {activeTab === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    !selectedCategory ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  All Books
                </button>
                {(Object.entries(categoryCounts) as [BookCategory, number][])
                  .filter(([_, count]) => count > 0)
                  .map(([category]) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {CATEGORY_THEMES[category].icon} {category}
                    </button>
                  ))}
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{filteredBooks.length} books</p>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Sort:</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="text-xs bg-transparent border-0 focus:ring-0 cursor-pointer"
                  >
                    <option value="a-z">A-Z</option>
                    <option value="z-a">Z-A</option>
                    <option value="recent">Recent</option>
                  </select>
                </div>
              </div>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {visibleItems.map((book, i) => (
                    <BookCard
                      key={`${book.url}-${i}`}
                      book={book}
                      onClick={() => openBookDetail(book)}
                      onDownload={(e) => handleDownload(book, e)}
                      onBookmark={(e) => handleToggleBookmark(book, e)}
                      isBookmarked={bookmarkedSet.has(ensureHttps(book.url))}
                      isDownloaded={downloadedSet.has(ensureHttps(book.url))}
                      downloadProgress={downloadProgress[book.url]}
                      onAddToCollection={() => handleAddToCollection(book)}
                      collectionsCount={getBookCollectionsCount(book.url)}
                    />
                  ))}
                  {hasMore && Array.from({ length: 6 }).map((_, i) => (
                    <div key={`skeleton-${i}`} className="space-y-2">
                      <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
                      <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {visibleItems.map((book, i) => {
                    const category = detectCategory(cleanTitle(book.title));
                    const theme = CATEGORY_THEMES[category];
                    const progress = getProgressPercentage(ensureHttps(book.url));
                    return (
                      <Card key={`${book.url}-${i}`} className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => openBookDetail(book)}>
                        <div className={`w-12 h-16 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg shrink-0`}>
                          {theme.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{cleanTitle(book.title)}</h4>
                          <p className="text-xs text-muted-foreground">{category}</p>
                          {progress > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <Progress value={progress} className="h-1 flex-1 max-w-[100px]" />
                              <span className="text-[10px] text-emerald-500">{progress}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => handleToggleBookmark(book, e)} className="p-2 hover:bg-muted rounded-full transition-colors">
                            {bookmarkedSet.has(ensureHttps(book.url)) ? <BookmarkCheck className="w-4 h-4 text-amber-500" /> : <Bookmark className="w-4 h-4 text-muted-foreground" />}
                          </button>
                          {!downloadedSet.has(ensureHttps(book.url)) && (
                            <button onClick={(e) => handleDownload(book, e)} className="p-2 hover:bg-muted rounded-full transition-colors">
                              <Download className="w-4 h-4 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
              {hasMore && <div ref={loadMoreRef} className="h-4" />}
            </motion.div>
          )}
          
          {activeTab === 'saved' && (
            <motion.div
              key="saved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">My Collections</h3>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const newCollection = createCollection('New Collection', 'My custom collection', 'from-purple-500 to-purple-700', '📚');
                    const updated = [...collections, newCollection];
                    setCollections(updated);
                    saveCollections(updated);
                  }}>
                    <Plus className="w-4 h-4 mr-1" /> New
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {collections.map(collection => {
                    const booksInCollection = getBooksInCollection(collection.id);
                    return (
                      <Card key={collection.id} className="p-3 min-w-[140px] cursor-pointer hover:bg-accent/50 transition-colors relative group" onClick={() => handleViewCollection(collection)}>
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${collection.color} flex items-center justify-center text-lg mb-2`}>{collection.icon}</div>
                        <h4 className="font-medium text-sm">{collection.name}</h4>
                        <p className="text-xs text-muted-foreground">{booksInCollection.length} books</p>
                        <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeleteCollection(collection.id); }}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </Card>
                    );
                  })}
                </div>
              </section>
              
              <section>
                <h3 className="text-sm font-semibold mb-3">Bookmarked Books</h3>
                {bookmarks.length === 0 ? (
                  <div className="text-center py-12">
                    <Bookmark className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No bookmarks yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Tap the bookmark icon on any book to save it here</p>
                    <Button variant="outline" className="mt-4" onClick={() => setActiveTab('browse')}>Browse Books</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {bookmarks.map(bookmark => {
                      const book = books.find(b => ensureHttps(b.url) === bookmark.bookUrl);
                      if (!book) return null;
                      return <BookCard key={bookmark.bookUrl} book={book} onClick={() => openBookDetail(book)} onDownload={(e) => handleDownload(book, e)} onBookmark={(e) => handleToggleBookmark(book, e)} isBookmarked={true} isDownloaded={downloadedSet.has(ensureHttps(book.url))} downloadProgress={downloadProgress[book.url]} onAddToCollection={() => handleAddToCollection(book)} collectionsCount={getBookCollectionsCount(book.url)} />;
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}
          
          {activeTab === 'downloads' && (
            <motion.div
              key="downloads"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center"><HardDrive className="w-5 h-5 text-emerald-500" /></div>
                    <div>
                      <p className="font-medium text-sm">Offline Storage</p>
                      <p className="text-xs text-muted-foreground">{storageUsed} used</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium">{downloadedBooks.length + userBooks.length} books</p>
                </div>
              </Card>
              
              {downloadedBooks.length === 0 && userBooks.length === 0 ? (
                <div className="text-center py-12">
                  <Download className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">No books saved offline</p>
                  <p className="text-sm text-muted-foreground mt-1">Download books to read without internet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setActiveTab('browse')}>Browse Library</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {downloadedBooks.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold mb-3">Downloaded</h3>
                      <div className="space-y-2">
                        {downloadedBooks.map(book => {
                          const category = detectCategory(book.title);
                          const theme = CATEGORY_THEMES[category];
                          const progress = getProgressPercentage(book.url);
                          return (
                            <Card key={book.url} className="p-3 flex items-center gap-3">
                              <div className={`w-12 h-16 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-lg shrink-0 cursor-pointer`} onClick={() => openBook(book)}>{theme.icon}</div>
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openBook(book)}>
                                <h4 className="font-medium text-sm truncate">{book.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{formatFileSize(book.fileSize)}</span>
                                  {progress > 0 && <Badge variant="secondary" className="text-[10px]">{progress}% read</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openBook(book)}><BookOpen className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(book.url)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </section>
                  )}
                  {userBooks.length > 0 && (
                    <section>
                      <h3 className="text-sm font-semibold mb-3">Your Uploads</h3>
                      <div className="space-y-2">
                        {userBooks.map(book => (
                          <Card key={book.id} className="p-3 flex items-center gap-3">
                            <div className="w-12 h-16 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0 cursor-pointer" onClick={() => openBook(book)}><Book className="w-6 h-6 text-muted-foreground" /></div>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openBook(book)}>
                              <h4 className="font-medium text-sm truncate">{book.title}</h4>
                              <p className="text-xs text-muted-foreground">{formatFileSize(book.fileSize)}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openBook(book)}><BookOpen className="w-4 h-4" /></Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <BookDetailModal
        book={selectedBook}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onRead={() => selectedBook && openBook(selectedBook)}
        onDownload={() => selectedBook && handleDownload(selectedBook)}
        onBookmark={() => selectedBook && handleToggleBookmark(selectedBook)}
        isBookmarked={selectedBook ? bookmarkedSet.has(ensureHttps(selectedBook.url)) : false}
        isDownloaded={selectedBook ? downloadedSet.has(ensureHttps(selectedBook.url)) : false}
        progress={selectedBook ? getProgressPercentage(ensureHttps(selectedBook.url)) : 0}
      />
      
      {showCollectionDialog && selectedBookForCollection && (
        <Dialog open={showCollectionDialog} onOpenChange={setShowCollectionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <LibraryBig className="w-5 h-5" /> Add to Collection
              </DialogTitle>
              <DialogDescription>Choose a collection for "{cleanTitle(selectedBookForCollection.title)}"</DialogDescription>
            </DialogHeader>
            <div className="mb-4">
              <Button variant="outline" className="w-full gap-2 border-dashed" onClick={() => {
                const newCollection = createCollection(`${cleanTitle(selectedBookForCollection.title)} Collection`, `Collection for ${cleanTitle(selectedBookForCollection.title)}`, 'from-blue-500 to-blue-700', '📚');
                const updated = [...collections, newCollection];
                setCollections(updated);
                saveCollections(updated);
                addBookToCollection(newCollection.id, ensureHttps(selectedBookForCollection.url));
                const finalUpdated = getCollections();
                setCollections(finalUpdated);
                toast({ title: "New collection created", description: `"${cleanTitle(selectedBookForCollection.title)}" added to new collection` });
                setShowCollectionDialog(false);
                setSelectedBookForCollection(null);
                setSelectedCollectionId(null);
              }}>
                <Plus className="w-4 h-4" /> Create New Collection + Add Book
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Or choose existing collection:</p>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {collections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <LibraryBig className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No collections yet</p>
                    <p className="text-xs">Create your first collection above!</p>
                  </div>
                ) : (
                  collections.map(collection => {
                    const isBookInThisCollection = isBookInCollection(collection.id, ensureHttps(selectedBookForCollection.url));
                    return (
                      <button key={collection.id} onClick={() => { if (!isBookInThisCollection) { setSelectedCollectionId(collection.id); handleConfirmAddToCollection(); } else { handleRemoveFromCollection(collection.id, ensureHttps(selectedBookForCollection.url)); setShowCollectionDialog(false); setSelectedBookForCollection(null); setSelectedCollectionId(null); } }} className={`w-full p-3 rounded-lg border transition-all text-left ${isBookInThisCollection ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' : 'border-border/50 hover:bg-accent/50 hover:border-border'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${collection.color} flex items-center justify-center text-sm flex-shrink-0`}>{collection.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2"><p className="font-medium text-sm truncate">{collection.name}</p>{isBookInThisCollection && <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />}</div>
                            <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
                            <div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground">{collection.books.length} books</span>{isBookInThisCollection && <span className="text-xs text-primary font-medium">Already in collection</span>}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setShowCollectionDialog(false); setSelectedBookForCollection(null); setSelectedCollectionId(null); }}>Cancel</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {selectedCollectionForView && (
        <Dialog open={!!selectedCollectionForView} onOpenChange={() => setSelectedCollectionForView(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedCollectionForView.color} flex items-center justify-center text-lg`}>{selectedCollectionForView.icon}</div>
                  <div>
                    {isEditingCollection ? (
                      <div className="space-y-2">
                        <Input value={editingCollectionName} onChange={(e) => setEditingCollectionName(e.target.value)} placeholder="Collection name" className="text-lg font-semibold h-8" />
                        <Input value={editingCollectionDescription} onChange={(e) => setEditingCollectionDescription(e.target.value)} placeholder="Collection description" className="text-sm h-7" />
                      </div>
                    ) : (
                      <>
                        <DialogTitle>{selectedCollectionForView.name}</DialogTitle>
                        <DialogDescription>{selectedCollectionForView.description}</DialogDescription>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isEditingCollection ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={handleSaveCollectionEdit}>Save</Button>
                      <Button size="sm" variant="outline" onClick={handleCancelCollectionEdit}>Cancel</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleEditCollection(selectedCollectionForView)}>Edit</Button>
                  )}
                </div>
              </div>
            </DialogHeader>
            <div className="mt-4">
              {(() => {
                const booksInCollection = getBooksInCollection(selectedCollectionForView.id);
                return booksInCollection.length === 0 ? (
                  <div className="text-center py-12">
                    <LibraryBig className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground font-medium">No books in this collection</p>
                    <p className="text-sm text-muted-foreground mt-1">Add books to this collection to see them here</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto">
                    {booksInCollection.map((book) => (
                      <BookCard key={book.url} book={book} onClick={() => openBookDetail(book)} onDownload={(e) => handleDownload(book, e)} onBookmark={(e) => handleToggleBookmark(book, e)} isBookmarked={bookmarkedSet.has(ensureHttps(book.url))} isDownloaded={downloadedSet.has(ensureHttps(book.url))} downloadProgress={downloadProgress[book.url]} onAddToCollection={() => handleAddToCollection(book)} />
                    ))}
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
