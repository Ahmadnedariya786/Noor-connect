import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCw, Loader2, ExternalLink, Scroll, Share2, Link, BookmarkPlus } from 'lucide-react';
import { getPdfBlobUrl } from '@/lib/ebooks-storage';
import { getReadingProgress, saveReadingProgress } from '@/lib/reading-progress';
import PdfAudioPlayer from '@/components/PdfAudioPlayer';
import { useToast } from '@/hooks/use-toast';

// Lazy load pdfjs-dist to reduce bundle size
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

let pdfjsLib: any = null;
let workerConfigured = false;

async function getPdfjsLib() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    if (!workerConfigured) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      workerConfigured = true;
    }
  }
  return pdfjsLib;
}

interface NativePdfViewerProps {
  url: string;
  title: string;
  localKey?: string;
  progressKey?: string;
  onClose: () => void;
}

type ViewerMode = 'loading' | 'pdfjs' | 'iframe' | 'error';

// --- URL Persistence & Sharing ---
const useEbookUrl = (url: string, title: string) => {
  const { toast } = useToast();
  
  // Update URL when opening ebook
  const updateUrl = () => {
    const bookId = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const newUrl = `${window.location.pathname}?book=${bookId}&title=${encodeURIComponent(title)}`;
    window.history.replaceState({ bookUrl: url, bookTitle: title }, '', newUrl);
  };
  
  // Share ebook URL
  const shareEbook = async () => {
    const bookId = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const shareUrl = `${window.location.origin}${window.location.pathname}?book=${bookId}&title=${encodeURIComponent(title)}`;
    
    const shareText = `Check out this Islamic book: "${title}"`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        toast({
          title: "Link copied!",
          description: "Share this link with others to open this ebook directly."
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast({
        title: "Share failed",
        description: "Could not share the ebook link.",
        variant: "destructive"
      });
    }
  };
  
  // Copy direct link
  const copyDirectLink = async () => {
    const bookId = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
    const directUrl = `${window.location.origin}${window.location.pathname}?book=${bookId}&title=${encodeURIComponent(title)}`;
    
    try {
      await navigator.clipboard.writeText(directUrl);
      toast({
        title: "Direct link copied!",
        description: "Anyone with this link can open this ebook directly."
      });
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };
  
  return { updateUrl, shareEbook, copyDirectLink };
};

// --- Enhanced Header with Sharing ---
const EnhancedPdfHeader = ({ 
  title, 
  onClose, 
  onShare, 
  onCopyLink, 
  showAudioPlayer, 
  setShowAudioPlayer, 
  isVertical, 
  toggleLayout, 
  downloadPdf 
}: {
  title: string;
  onClose: () => void;
  onShare: () => void;
  onCopyLink: () => void;
  showAudioPlayer: boolean;
  setShowAudioPlayer: (show: boolean) => void;
  isVertical: boolean;
  toggleLayout: () => void;
  downloadPdf: () => void;
}) => {
  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
      <Button size="icon" variant="ghost" onClick={onClose}>
        <ArrowLeft className="w-5 h-5" />
      </Button>
      <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
      
      <div className="flex items-center gap-1">
        {/* Share Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onShare}
          title="Share ebook"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        
        {/* Copy Link Button */}
        <Button
          size="icon"
          variant="ghost"
          onClick={onCopyLink}
          title="Copy direct link"
        >
          <Link className="w-4 h-4" />
        </Button>
        
        {/* Layout Toggle */}
        <Button
          size="icon"
          variant={isVertical ? "secondary" : "ghost"}
          onClick={toggleLayout}
          title={isVertical ? "Switch to Page View" : "Switch to Vertical Scroll"}
        >
          <Scroll className="w-4 h-4" />
        </Button>
        
        {/* Download Button */}
        <Button size="icon" variant="ghost" onClick={downloadPdf}>
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};

// --- Ebook URL Parser ---
const parseEbookUrl = (): { url?: string; title?: string } | null => {
  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('book');
  const bookTitle = params.get('title');
  
  if (!bookId) return null;
  
  // Try to decode the book ID to get the original URL
  // This would need a mapping or decoding logic
  // For now, we'll use a simple approach with localStorage mapping
  
  const storedBook = localStorage.getItem(`ebook-${bookId}`);
  if (storedBook) {
    return JSON.parse(storedBook);
  }
  
  return null;
};

// --- Store Ebook Mapping ---
const storeEbookMapping = (url: string, title: string): string => {
  const bookId = btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
  localStorage.setItem(`ebook-${bookId}`, JSON.stringify({ url, title }));
  return bookId;
};

// Sub-component for rendering individual pages in vertical mode
function PdfPage({ pdf, pageNumber, scale }: { pdf: any; pageNumber: number; scale: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const renderTaskRef = useRef<any>(null);

  const getOptimalScale = (baseScale: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    return baseScale / dpr;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { rootMargin: '100% 0px' } // Preload nicely
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || !pdf || !canvasRef.current) return;

    let mounted = true;

    const render = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (!mounted) return;

        const viewport = page.getViewport({ scale: getOptimalScale(scale) });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        // Cancel any previous render task
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        renderTaskRef.current = page.render({
          canvasContext: context,
          viewport: viewport
        });

        await renderTaskRef.current.promise;
      } catch (error) {
        console.error(`Failed to render page ${pageNumber}:`, error);
      }
    };

    render();

    return () => {
      mounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [inView, pdf, pageNumber, scale]);

  return (
    <div ref={containerRef} className="pdf-page-container mb-4">
      <canvas
        ref={canvasRef}
        className="border border-border shadow-lg bg-white mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

// Main NativePdfViewer Component
export default function NativePdfViewer({ url, title, localKey, progressKey, onClose }: NativePdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<any>(null);
  const [viewerMode, setViewerMode] = useState<ViewerMode>('loading');
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isVertical, setIsVertical] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedPdfSource, setResolvedPdfSource] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [visibleWindow, setVisibleWindow] = useState({ start: 1, end: 20 });
  const { toast } = useToast();

  // URL persistence and sharing
  const { updateUrl, shareEbook, copyDirectLink } = useEbookUrl(url, title);

  // Update URL when component mounts
  useEffect(() => {
    updateUrl();
    storeEbookMapping(url, title);
    return () => {
      if (pdfDocumentRef.current) {
        try { pdfDocumentRef.current.destroy(); } catch {}
      }
    };
  }, [url, title]);

  // Windowed rendering for vertical mode
  useEffect(() => {
    if (!isVertical || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const handleScroll = () => {
      if (!container) return;
      const pageHeight = (container.scrollHeight || 1) / Math.max(totalPages, 1);
      const scrollTop = container.scrollTop;
      const viewHeight = container.clientHeight;
      const buffer = 5;
      const start = Math.max(1, Math.floor(scrollTop / pageHeight) - buffer + 1);
      const end = Math.min(totalPages, Math.ceil((scrollTop + viewHeight) / pageHeight) + buffer);
      setVisibleWindow({ start, end });
    };
    handleScroll();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isVertical, totalPages]);

  const effectiveProgressKey = progressKey || localKey || url;
  const initialProgress = getReadingProgress(effectiveProgressKey);
      const initialPage = typeof initialProgress === 'number' ? initialProgress : 1;

  // Load PDF
  const loadPdf = async () => {
    try {
      setViewerMode('loading');
      setError(null);

      // Try to get blob URL first for local files
      const blobUrl = await getPdfBlobUrl(url);
      const pdfSource = blobUrl || url;
      setResolvedPdfSource(pdfSource);

      // Lazy load pdfjs-dist
      const lib = await getPdfjsLib();
      const loadingTask = lib.getDocument(pdfSource);
      const pdf = await loadingTask.promise;

      setPdfDocument(pdf);
      pdfDocumentRef.current = pdf;
      setTotalPages(pdf.numPages);
      setCurrentPage(initialPage);
      setViewerMode('pdfjs');

      // Save initial reading progress
      saveReadingProgress(effectiveProgressKey, initialPage, pdf.numPages);
    } catch (err: any) {
      console.error('Failed to load PDF with pdf.js:', err);

      // Check if it's a CORS error
      const isCorsError = err?.message?.includes('Failed to fetch') ||
        err?.name === 'UnknownErrorException' ||
        err?.message?.includes('CORS');

      if (isCorsError) {
        console.log('CORS error detected, switching to iframe viewer');
        // Fall back to iframe-based viewer for CORS-restricted PDFs
        setViewerMode('iframe');
      } else {
        setError(`Unable to load PDF: ${err?.message || 'Unknown error'}`);
        setViewerMode('error');
      }
    }
  };

  useEffect(() => {
    loadPdf();
  }, []);

  const getOptimalScale = (baseScale: number) => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    return baseScale / dpr;
  };

  const renderPage = async (pdf: any, pageNum: number, scaleValue: number) => {
    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = page.getViewport({ scale: getOptimalScale(scaleValue) });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.error('Failed to render page:', err);
      setError('Failed to render PDF page.');
    }
  };

  const changePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || !pdfDocument) return;

    setCurrentPage(newPage);
    if (!isVertical) {
      renderPage(pdfDocument, newPage, scale);
    }
    // Save reading progress
    saveReadingProgress(effectiveProgressKey, newPage, totalPages);
  };

  const zoomIn = () => {
    const newScale = Math.min(scale + 0.25, 3.0);
    setScale(newScale);
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, newScale);
    }
  };

  const zoomOut = () => {
    const newScale = Math.max(scale - 0.25, 0.5);
    setScale(newScale);
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, newScale);
    }
  };

  const rotate = () => {
    // For simplicity, we'll just reload the page/layout
    if (pdfDocument && !isVertical) {
      renderPage(pdfDocument, currentPage, scale);
    }
  };

  const downloadPdf = () => {
    const source = resolvedPdfSource || url;
    if (source) {
      window.open(source, '_blank');
    }
  };

  const toggleLayout = () => {
    setIsVertical(!isVertical);
    // If switching back to single page, re-render current page
    if (isVertical && pdfDocument) {
      // We need to wait for layout change then render, but effect might handle or we can just trigger it
      setTimeout(() => renderPage(pdfDocument, currentPage, scale), 50);
    }
  };

  // Loading state
  if (viewerMode === 'loading') {
    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        <EnhancedPdfHeader
          title={title}
          onClose={onClose}
          onShare={shareEbook}
          onCopyLink={copyDirectLink}
          showAudioPlayer={showAudioPlayer}
          setShowAudioPlayer={setShowAudioPlayer}
          isVertical={isVertical}
          toggleLayout={toggleLayout}
          downloadPdf={downloadPdf}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading PDF...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (viewerMode === 'error') {
    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        <EnhancedPdfHeader
          title={title}
          onClose={onClose}
          onShare={shareEbook}
          onCopyLink={copyDirectLink}
          showAudioPlayer={showAudioPlayer}
          setShowAudioPlayer={setShowAudioPlayer}
          isVertical={isVertical}
          toggleLayout={toggleLayout}
          downloadPdf={downloadPdf}
        />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <p className="text-destructive mb-2 text-sm">{error}</p>
            <p className="text-xs text-muted-foreground mb-4">
              Some PDF sources may be restricted by browser CORS policies.
              You can try opening the PDF directly in your browser.
            </p>
            <div className="flex gap-2 flex-col sm:flex-row justify-center">
              <Button variant="outline" onClick={loadPdf}>
                Retry
              </Button>
              <Button variant="default" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Browser
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to handle archive.org URLs and other external links
  const getBetterViewerUrl = (pdfUrl: string): string => {
    if (pdfUrl.includes('archive.org')) {
      const downloadMatch = pdfUrl.match(/archive\.org\/download\/([^/]+)/);
      if (downloadMatch?.[1]) {
        return `https://archive.org/details/${downloadMatch[1]}`;
      }
      if (pdfUrl.includes('archive.org/details/')) {
        return pdfUrl;
      }
    }
    return pdfUrl;
  };

  // External viewer mode (fallback for CORS-restricted PDFs)
  if (viewerMode === 'iframe') {
    const viewerUrl = getBetterViewerUrl(url);

    return (
      <div className="fixed inset-0 bg-background z-[1000] flex flex-col">
        {/* Header */}
        <EnhancedPdfHeader
          title={title}
          onClose={onClose}
          onShare={shareEbook}
          onCopyLink={copyDirectLink}
          showAudioPlayer={showAudioPlayer}
          setShowAudioPlayer={setShowAudioPlayer}
          isVertical={isVertical}
          toggleLayout={toggleLayout}
          downloadPdf={downloadPdf}
        />

        {/* Content - Embedded online reader */}
        <div className="flex-1 bg-muted/20">
          <iframe
            src={viewerUrl}
            title={title}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        </div>

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          If the PDF does not load here, use the external open button in the header.
        </div>
      </div>
    );
  }

  // PDF.js canvas viewer mode (for PDFs without CORS issues)
  return (
    <div className="fixed inset-0 bg-background z-[1000] flex flex-col animate-in fade-in slide-in-from-bottom-5 duration-300">
      {/* Enhanced Header with Sharing */}
      <EnhancedPdfHeader
        title={title}
        onClose={onClose}
        onShare={shareEbook}
        onCopyLink={copyDirectLink}
        showAudioPlayer={showAudioPlayer}
        setShowAudioPlayer={setShowAudioPlayer}
        isVertical={isVertical}
        toggleLayout={toggleLayout}
        downloadPdf={downloadPdf}
      />

      {/* PDF Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          {!isVertical && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => changePage(currentPage - 1)}
                disabled={currentPage <= 1}
              >
                Previous
              </Button>
              <span className="text-sm font-medium px-2">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => changePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </>
          )}
          {isVertical && (
            <span className="text-sm font-medium px-2">
              {totalPages} Pages
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={zoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium px-2">
            {Math.round(scale * 100)}%
          </span>
          <Button size="sm" variant="outline" onClick={zoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          {!isVertical && (
            <Button size="sm" variant="outline" onClick={rotate}>
              <RotateCw className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* PDF Content Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto bg-muted/30 p-4">
        <div className="flex justify-center flex-col items-center">
          {isVertical ? (
            // Vertical Scroll Mode: Windowed rendering of visible pages + buffer
            Array.from({ length: totalPages }, (_, i) => {
              const pageNum = i + 1;
              if (pageNum < visibleWindow.start || pageNum > visibleWindow.end) {
                return <div key={pageNum} className="flex justify-center my-4 min-h-[400px] items-center text-muted-foreground/30">...</div>;
              }
              return (
                <PdfPage
                  key={pageNum}
                  pdf={pdfDocument}
                  pageNumber={pageNum}
                  scale={scale}
                />
              );
            })
          ) : (
            // Single Page Mode: Render simplified single canvas
            <canvas
              ref={canvasRef}
              className="border border-border shadow-lg bg-white"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
        </div>
      </div>

      {/* Audio Player */}
      {showAudioPlayer && viewerMode === 'pdfjs' && totalPages > 0 && (
        <PdfAudioPlayer
          pdfSource={resolvedPdfSource || url}
          cacheKey={effectiveProgressKey}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => {
            setCurrentPage(page);
            if (!isVertical && pdfDocument) {
              renderPage(pdfDocument, page, scale);
            }
          }}
          onClose={() => setShowAudioPlayer(false)}
        />
      )}
    </div>
  );
}

// Export helper functions for use in other components
export { parseEbookUrl, storeEbookMapping };
