/**
 * Mushaf Viewer – Full-screen Madinah Mushaf image reader
 *
 * Features:
 *  • Local mushaf images from assets (604 pages)
 *  • Swipe left/right via touch events (no library)
 *  • Pinch-to-zoom via CSS transforms
 *  • Auto-hide navigation arrows (3 s)
 *  • Surah index sheet (shadcn Sheet)
 *  • Bookmark to localStorage, resume last-read page
 *  • Loading skeleton
 *  • Dark / light theme aware
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Hash,
  Wifi,
  WifiOff,
  Minus,
  Plus,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { getMushafPageUrl } from '@/lib/quran-mushaf-image-cache';
import { SURAH_START_PAGES } from '@/lib/mushaf-service';
import { quranService } from '@/lib/quran-service';

// ─── Constants ────────────────────────────────────────────────
const TOTAL_PAGES = 604;
const LS_LAST_PAGE = 'mushaf-last-read-page';
const LS_BOOKMARKS = 'mushaf-bookmarks';
const NAV_HIDE_DELAY = 3000;
const SWIPE_THRESHOLD = 50;

// ─── Helpers ──────────────────────────────────────────────────
function getSurahForPage(page: number): number {
  const entries = Object.entries(SURAH_START_PAGES)
    .map(([s, p]) => [Number(s), p] as [number, number])
    .sort((a, b) => a[1] - b[1]);
  let surah = 1;
  for (const [s, startPage] of entries) {
    if (page < startPage) return surah;
    surah = s;
  }
  return 114;
}

function getBookmarks(): number[] {
  try {
    return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]');
  } catch {
    return [];
  }
}

function saveBookmarks(pages: number[]) {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(pages));
}

// ─── Component ────────────────────────────────────────────────
export default function MushafViewer() {
  const navigate = useNavigate();
  const { pageNum } = useParams<{ pageNum: string }>();

  // ── State ──
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (pageNum) return Math.min(604, Math.max(1, Number(pageNum) || 1));
    const saved = localStorage.getItem(LS_LAST_PAGE);
    return saved ? Math.min(604, Math.max(1, Number(saved))) : 1;
  });
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(getBookmarks);
  const [showNav, setShowNav] = useState(true);
  const [showJump, setShowJump] = useState(false);
  const [jumpValue, setJumpValue] = useState('');
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });

  // Refs for touch handling
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Pan tracking
  const isPanningRef = useRef(false);
  const lastPanRef = useRef({ x: 0, y: 0 });

  // ── Derived ──
  const surahNumber = getSurahForPage(currentPage);
  const surahInfo = quranService.getSurahInfo(surahNumber);
  const isBookmarked = bookmarks.includes(currentPage);
  const allSurahs = quranService.getAllSurahs();

  // ── Persist last-read ──
  useEffect(() => {
    localStorage.setItem(LS_LAST_PAGE, String(currentPage));
  }, [currentPage]);

  // ── Load image ──
  const loadPage = useCallback(async (page: number) => {
    setLoading(true);
    setImgSrc(null);
    setScale(1);
    setTranslate({ x: 0, y: 0 });

    try {
      const url = getMushafPageUrl(page);
      setImgSrc(url);
      setIsCached(true);
    } catch (e) {
      console.error('Failed to load mushaf page', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  // ── Navigation ──
  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.min(604, Math.max(1, page));
      if (clamped !== currentPage) setCurrentPage(clamped);
    },
    [currentPage]
  );

  const goPrev = useCallback(() => goToPage(currentPage - 1), [currentPage, goToPage]);
  const goNext = useCallback(() => goToPage(currentPage + 1), [currentPage, goToPage]);

  // ── Arrow-key navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(3, s + 0.25));
      else if (e.key === '-') setScale((s) => Math.max(0.5, s - 0.25));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // ── Auto-hide nav ──
  const resetNavTimer = useCallback(() => {
    setShowNav(true);
    if (navTimerRef.current) clearTimeout(navTimerRef.current);
    navTimerRef.current = setTimeout(() => setShowNav(false), NAV_HIDE_DELAY);
  }, []);

  useEffect(() => {
    resetNavTimer();
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, [currentPage, resetNavTimer]);

  // ── Touch: swipe & pinch ──
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      resetNavTimer();
      if (e.touches.length === 2) {
        // Pinch start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStartDistRef.current = Math.hypot(dx, dy);
        pinchStartScaleRef.current = scale;
        return;
      }
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
        if (scale > 1) {
          isPanningRef.current = true;
          lastPanRef.current = { x: t.clientX, y: t.clientY };
        }
      }
    },
    [scale, resetNavTimer]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const newScale = Math.min(3, Math.max(0.5, (dist / pinchStartDistRef.current) * pinchStartScaleRef.current));
        setScale(newScale);
        return;
      }
      if (isPanningRef.current && e.touches.length === 1) {
        const t = e.touches[0];
        const dx = t.clientX - lastPanRef.current.x;
        const dy = t.clientY - lastPanRef.current.y;
        lastPanRef.current = { x: t.clientX, y: t.clientY };
        setTranslate((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
    },
    []
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      pinchStartDistRef.current = null;
      isPanningRef.current = false;

      if (touchStartRef.current && scale <= 1) {
        const endX = e.changedTouches[0]?.clientX ?? touchStartRef.current.x;
        const diffX = endX - touchStartRef.current.x;
        const elapsed = Date.now() - touchStartRef.current.time;

        if (Math.abs(diffX) > SWIPE_THRESHOLD && elapsed < 500) {
          if (diffX > 0) goPrev();
          else goNext();
        }
      }
      touchStartRef.current = null;
    },
    [scale, goPrev, goNext]
  );

  // ── Bookmark ──
  const toggleBookmark = useCallback(() => {
    setBookmarks((prev) => {
      const next = prev.includes(currentPage)
        ? prev.filter((p) => p !== currentPage)
        : [...prev, currentPage];
      saveBookmarks(next);
      return next;
    });
  }, [currentPage]);

  // ── Jump to page ──
  const handleJump = useCallback(() => {
    const p = parseInt(jumpValue, 10);
    if (p >= 1 && p <= 604) {
      goToPage(p);
      setShowJump(false);
      setJumpValue('');
    }
  }, [jumpValue, goToPage]);

  // ── Zoom helpers ──
  const zoomIn = () => setScale((s) => Math.min(3, s + 0.25));
  const zoomOut = () => setScale((s) => Math.max(0.5, s - 0.25));
  const resetZoom = () => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  };

  // ▸▸▸ RENDER ◂◂◂
  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-[#f5f0e8] dark:bg-[#1a1a2e] select-none overflow-hidden"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={resetNavTimer}
    >
      {/* ── Top Bar ─────────────────────────────────────── */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 ${
          showNav ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#1a4a4a]/95 via-[#2c6e6e]/95 to-[#3a5a5a]/95 backdrop-blur-md shadow-lg">
          {/* Back */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white/90 hover:bg-white/10 rounded-xl shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Surah name */}
          <div className="flex-1 min-w-0 text-center">
            {surahInfo && (
              <>
                <p className="text-white font-bold text-sm truncate leading-tight">
                  {surahInfo.englishName}
                </p>
                <p className="text-white/60 text-xs truncate font-arabic leading-tight">
                  {surahInfo.name}
                </p>
              </>
            )}
          </div>

          {/* Cache indicator */}
          <div className="shrink-0 flex items-center gap-1 mr-1">
            {isCached ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-300 font-medium" title="Available offline">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Wifi className="w-3 h-3" />
              </span>
            ) : (
              <WifiOff className="w-3 h-3 text-white/30" />
            )}
          </div>

          {/* Bookmark */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBookmark}
            className={`rounded-xl shrink-0 ${
              isBookmarked
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-400/10'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* ── Image Area ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center overflow-hidden relative">
        {/* Loading skeleton */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            {/* Skeleton pulse */}
            <div className="w-[80%] max-w-sm aspect-[3/4] rounded-2xl bg-amber-200/30 dark:bg-amber-800/20 animate-pulse" />
            <p className="text-xs text-amber-700/70 dark:text-amber-300/60 font-medium">
              Loading…
            </p>
          </div>
        )}

        {/* Page image */}
        {imgSrc && (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={`Mushaf page ${currentPage}`}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-150 will-change-transform"
            style={{
              transform: `scale(${scale}) translate(${translate.x / scale}px, ${translate.y / scale}px)`,
              touchAction: scale > 1 ? 'none' : 'pan-y',
              opacity: loading ? 0 : 1,
            }}
            onLoad={() => setLoading(false)}
            draggable={false}
          />
        )}

        {/* Prev / Next arrow overlays */}
        <button
          onClick={goPrev}
          disabled={currentPage <= 1}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 dark:bg-white/10 backdrop-blur text-white disabled:opacity-0 transition-all duration-300 hover:bg-black/40 ${
            showNav ? 'opacity-70' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={goNext}
          disabled={currentPage >= TOTAL_PAGES}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/20 dark:bg-white/10 backdrop-blur text-white disabled:opacity-0 transition-all duration-300 hover:bg-black/40 ${
            showNav ? 'opacity-70' : 'opacity-0 pointer-events-none'
          }`}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
          showNav ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-2.5 bg-gradient-to-r from-[#1a4a4a]/95 via-[#2c6e6e]/95 to-[#3a5a5a]/95 backdrop-blur-md shadow-lg">
          {/* Surah index sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-xl gap-1.5 text-xs"
              >
                <BookOpen className="w-4 h-4" />
                Surahs
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl bg-[#f5f0e8] dark:bg-[#1a1a2e] border-t-2 border-amber-300 dark:border-amber-800">
              <SheetHeader>
                <SheetTitle className="text-amber-900 dark:text-amber-100 text-lg font-bold">
                  Surah Index
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(75vh-80px)] mt-4 pr-2">
                <div className="space-y-1.5 pb-6">
                  {allSurahs.map((s) => {
                    const startPage = SURAH_START_PAGES[s.number] || 1;
                    const isActive = s.number === surahNumber;
                    return (
                      <button
                        key={s.number}
                        onClick={() => goToPage(startPage)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          isActive
                            ? 'bg-teal-100 dark:bg-teal-900/40 ring-2 ring-teal-400 dark:ring-teal-600'
                            : 'hover:bg-amber-100/60 dark:hover:bg-amber-900/20'
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                            isActive
                              ? 'bg-teal-600 text-white'
                              : 'bg-amber-200/60 dark:bg-amber-800/40 text-amber-800 dark:text-amber-200'
                          }`}
                        >
                          {s.number}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className={`text-sm font-semibold truncate ${isActive ? 'text-teal-800 dark:text-teal-200' : 'text-gray-800 dark:text-gray-200'}`}>
                            {s.englishName}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {s.englishNameTranslation}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-arabic text-amber-800 dark:text-amber-200 leading-tight">
                            {s.name}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">
                            p. {startPage}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Page indicator + jump */}
          <Dialog open={showJump} onOpenChange={setShowJump}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors">
                <Hash className="w-3 h-3 opacity-60" />
                Page {currentPage}
                <span className="opacity-40">of {TOTAL_PAGES}</span>
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xs bg-[#f5f0e8] dark:bg-[#1a1a2e] border-2 border-amber-300 dark:border-amber-700 rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-amber-900 dark:text-amber-100">Jump to Page</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={604}
                  value={jumpValue}
                  onChange={(e) => setJumpValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJump()}
                  className="h-10 border-2 border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-white/10"
                  placeholder="1 – 604"
                  autoFocus
                />
                <Button
                  onClick={handleJump}
                  className="h-10 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold rounded-xl"
                >
                  Go
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8"
            >
              <Minus className="w-3.5 h-3.5" />
            </Button>
            <button
              onClick={resetZoom}
              className="text-[10px] text-white/50 font-mono px-1 min-w-[2.5rem] text-center hover:text-white/80 transition-colors"
            >
              {Math.round(scale * 100)}%
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={zoomIn}
              disabled={scale >= 3}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8"
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
            {scale !== 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={resetZoom}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
