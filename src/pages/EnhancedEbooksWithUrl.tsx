import { useState, useEffect, lazy, Suspense } from "react";
import { Book, Download, Plus, X, Search, LibraryBig, Share2, Link, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  getDownloadedBooks, getUserBooks, downloadBook,
  deleteDownloadedBook, addUserBook,
  formatFileSize, ensureHttps,
  type DownloadedBook, type UserBook
} from "@/lib/ebooks-storage";
import {
  getProgressPercentage, getRecentlyRead,
  getLastReadBook, getBookBookmarks, toggleBookBookmark,
  type EbookBookmark
} from "@/lib/reading-progress";
import {
  detectCategory, cleanTitle, CATEGORY_THEMES, type BookCategory
} from "@/lib/book-themes";
import ebooksData from "@/data/ebooks-library.json";
import { useEbookUrlParser, useEbookSharing } from "@/hooks/useEbookUrl";
import { storeEbookMapping } from "@/components/EnhancedNativePdfViewer";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/LoadingSkeleton";

// Lazy load PDF viewer to reduce bundle size
const EnhancedNativePdfViewer = lazy(() => import('@/components/EnhancedNativePdfViewer').then(module => ({ default: module.default })));

// --- Types ---
interface LibraryBook {
  title: string;
  file: string;
  url: string;
  size: string;
}

const books = ebooksData as LibraryBook[];

// --- Enhanced Ebook Page with URL Support ---
export default function EnhancedEbooksWithUrlPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingBook, setViewingBook] = useState<LibraryBook | DownloadedBook | UserBook | null>(null);
  const [downloadedBooks, setDownloadedBooks] = useState<DownloadedBook[]>([]);
  const [userBooks, setUserBooks] = useState<UserBook[]>([]);
  const [bookmarks, setBookmarks] = useState<EbookBookmark[]>([]);
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse URL for direct ebook access
  const ebookUrlState = useEbookUrlParser();

  // Load data
  useEffect(() => {
    setDownloadedBooks(getDownloadedBooks());
    setUserBooks(getUserBooks());
    setBookmarks(getBookBookmarks());
  }, []);

  // Auto-open ebook from URL
  useEffect(() => {
    if (ebookUrlState.url && ebookUrlState.title && !viewingBook) {
      // Find the book in our library
      const allBooks = [...books, ...downloadedBooks, ...userBooks];
      const foundBook = allBooks.find(book => 
        book.url === ebookUrlState.url || 
        book.title === ebookUrlState.title
      );

      if (foundBook) {
        setViewingBook(foundBook);
        toast({
          title: "Opening shared ebook",
          description: `"${ebookUrlState.title}" - Enjoy your reading!`
        });
      } else {
        // If not found in library, try to open it directly
        setViewingBook({
          title: ebookUrlState.title,
          url: ebookUrlState.url,
          file: '',
          size: '0'
        });
      }
    }
  }, [ebookUrlState, viewingBook, toast]);

  // --- Event Handlers ---
  const handleBookClick = useCallback((book: LibraryBook | DownloadedBook | UserBook) => {
    setViewingBook(book);
  }, []);

  const handleDownload = useCallback(async (book: LibraryBook | DownloadedBook | UserBook, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadBook(book.url, book.title);
      setDownloadedBooks(getDownloadedBooks());
      toast({
        title: "Download started",
        description: `${book.title} is being downloaded`
      });
    } catch (error) {
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

  // --- Enhanced Book Card with Sharing ---
  const EnhancedBookCard = ({ book }: { book: LibraryBook | DownloadedBook | UserBook }) => {
    const title = 'file' in book ? cleanTitle(book.title) : book.title;
    const category = detectCategory(title);
    const progress = getProgressPercentage(book);
    const theme = CATEGORY_THEMES[category];
    const { shareEbook, copyDirectLink, isSharing } = useEbookSharing(book.url, title);
    
    const isBookmarked = bookmarks.some(b => b.bookUrl === book.url);
    const isDownloaded = downloadedBooks.some(b => b.url === book.url) || userBooks.some(b => b.url === book.url);

    return (
      <motion.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        className="relative group"
      >
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            <div onClick={() => handleBookClick(book)} className="relative">
              {/* Book Cover */}
              <div 
                className={`w-full h-48 rounded-t-lg bg-gradient-to-br ${theme.gradient} shadow-lg overflow-hidden relative`}
              >
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-white">
                  <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-3">
                    <span className="text-2xl">{theme.icon}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-center line-clamp-2 drop-shadow-sm">
                    {title}
                  </h3>
                </div>
                
                {/* Progress bar */}
                {progress > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                    <div 
                      className="h-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Quick actions overlay */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full border shadow-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBookmark(book, e as React.MouseEvent);
                    }}
                  >
                    {isBookmarked ? (
                      <span className="text-primary">📖</span>
                    ) : (
                      <span>🔖</span>
                    )}
                  </Button>
                  
                  {/* Share Button */}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full border shadow-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const result = await shareEbook();
                      if (result.success) {
                        toast({
                          title: "Shared!",
                          description: result.message
                        });
                      }
                    }}
                    disabled={isSharing}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                  
                  {/* Copy Link Button */}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 rounded-full border shadow-sm"
                    style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                    onClick={async (e) => {
                      e.stopPropagation();
                      const result = await copyDirectLink();
                      if (result.success) {
                        toast({
                          title: "Link copied!",
                          description: result.message
                        });
                      }
                    }}
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Book info */}
            <div className="p-4">
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
                      <span className="flex items-center gap-1 text-[var(--success)]">
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
                    onClick={(e) => handleDownload(book, e as React.MouseEvent)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  // --- Filter books ---
  const filteredBooks = useMemo(() => {
    const allBooks = [...books, ...downloadedBooks, ...userBooks];
    return allBooks.filter(book => {
      const title = 'file' in book ? cleanTitle(book.title) : book.title;
      return searchQuery === "" || 
        title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detectCategory(title).toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [books, downloadedBooks, userBooks, searchQuery]);

  // --- If viewing PDF, show viewer ---
  if (viewingBook) {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-background z-[100] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <EnhancedNativePdfViewer
          url={viewingBook.url}
          title={viewingBook.title}
          localKey={('localKey' in viewingBook) ? viewingBook.localKey : undefined}
          onClose={() => {
            setViewingBook(null);
            // Clear URL parameters when closing
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </Suspense>
    );
  }

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="px-4 py-4 space-y-4">
          {/* Title and Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <LibraryBig className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Islamic Library</h1>
                <p className="text-xs text-muted-foreground">Share & Read Islamic Literature</p>
              </div>
            </div>
            
            <Button size="sm" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <Plus className="w-4 h-4" />
              Upload PDF
            </Button>
            <input type="file" accept=".pdf,application/pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          </div>
          
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
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 max-w-7xl mx-auto">
        {/* Sharing Instructions */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Share2 className="w-5 h-5" />
              Share Books with Direct Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Now you can share ebooks with others! Each book gets a unique direct link that opens the ebook immediately.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">1️⃣</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Open any book</p>
                  <p className="text-xs text-muted-foreground">Click on a book to open it</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">2️⃣</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Click Share button</p>
                  <p className="text-xs text-muted-foreground">Use the share icon in the top-right</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm">3️⃣</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Share the link</p>
                  <p className="text-xs text-muted-foreground">Anyone can open the book directly</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Books Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Books</h2>
            <Badge variant="secondary">{filteredBooks.length} books</Badge>
          </div>
          
          {filteredBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredBooks.map((book, i) => (
                <EnhancedBookCard key={`${book.url}-${i}`} book={book} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="py-12 text-center">
                <Book className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No books found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery ? "Try adjusting your search" : "Upload your first PDF to get started"}
                </p>
                {!searchQuery && (
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
    </div>
  );
}
