import { useMemo, useRef, useState, useEffect, lazy, Suspense } from "react";
import { ArrowLeft, Share2, Loader2, RefreshCw, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { saveReadingProgress, getReadingProgress } from "@/lib/reading-progress";
import { getPdfBlobUrl } from "@/lib/ebooks-storage";

// Lazy load NativePdfViewer to reduce bundle size
const NativePdfViewer = lazy(() => import('@/components/NativePdfViewer').then(module => ({ default: module.default })));

interface PdfViewerProps {
  url: string;
  title: string;
  localKey?: string;
  onClose: () => void;
}

const EBOOK_LAST_READ_KEY = "ebook-last-read";
const EBOOK_LAST_READ_META_KEY = "ebook-last-read-meta";
const EBOOK_SCROLL_PREFIX = "ebook-scroll:";

export default function PdfViewer({ url, title, localKey, onClose }: PdfViewerProps) {
  const [useNativeViewer, setUseNativeViewer] = useState(true);
  const progressKey = useMemo(() => {
    if (url) return url;
    if (localKey) return `local:${localKey}`;
    return title;
  }, [url, localKey, title]);

  useEffect(() => {
    try {
      const existingProgress = getReadingProgress(progressKey);
      saveReadingProgress(
        progressKey,
        existingProgress?.currentPage ?? 1,
        existingProgress?.totalPages ?? 1
      );

      // Keep compatibility with reading-progress.ts which expects a string here
      localStorage.setItem(EBOOK_LAST_READ_KEY, progressKey);

      // Store additional metadata separately
      localStorage.setItem(
        EBOOK_LAST_READ_META_KEY,
        JSON.stringify({
          url,
          title,
          localKey,
          progressKey,
          updatedAt: Date.now()
        })
      );
    } catch {
      // ignore
    }
  }, [url, title, localKey, progressKey]);

  const handleShare = async () => {
    if (navigator.share && url) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled
      }
    }
  };

  const openInBrowser = () => {
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Use native PDF viewer
  if (useNativeViewer) {
    return (
      <Suspense fallback={<div className="fixed inset-0 bg-background z-[100] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
        <NativePdfViewer url={url} title={title} localKey={localKey} progressKey={progressKey} onClose={onClose} />
      </Suspense>
    );

  }

  // Fallback to old implementation (if needed)
  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col">
      <header className="flex items-center gap-2 px-3 py-2 bg-card border-b border-border shrink-0 safe-area-top">
        <Button size="icon" variant="ghost" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 font-medium text-sm truncate">{title}</h1>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setUseNativeViewer(true)}
            className="h-8 w-8"
            title="Use Native Viewer"
          >
            <BookOpen className="w-4 h-4" />
          </Button>
          {url && (
            <Button size="icon" variant="ghost" onClick={handleShare}>
              <Share2 className="w-5 h-5" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium mb-2">PDF Viewer</p>
          <p className="text-sm text-muted-foreground mb-4">
            Click below to open this PDF with the native viewer.
          </p>
          <Button onClick={() => setUseNativeViewer(true)}>
            <BookOpen className="w-4 h-4 mr-2" />
            Open PDF Viewer
          </Button>
        </div>
      </div>
    </div>
  );
}
