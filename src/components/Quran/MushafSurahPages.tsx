import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMushafPageUrl, markPageAsLoaded } from '@/lib/quran-mushaf-image-cache';
import { mushafService } from '@/lib/mushaf-service';
import { useSettings } from '@/contexts/SettingsContext';

interface MushafSurahPagesProps {
  surahNumber: number;
  onSwipe?: (direction: 'left' | 'right') => void;
}

type PageStatus = 'loading' | 'loaded' | 'error';

function getSurahPageRange(surahNumber: number): { start: number; end: number } {
  const start = mushafService.getPageForSurah(surahNumber);
  const nextStart = surahNumber < 114 ? mushafService.getPageForSurah(surahNumber + 1) : 605;
  return { start, end: Math.max(start, nextStart - 1) };
}

function usePinchZoom() {
  const [scale, setScale] = useState(1);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    pinchStartDistRef.current = Math.hypot(dx, dy);
    pinchStartScaleRef.current = scale;
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    if (pinchStartDistRef.current === null) return;

    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);

    const next = (dist / pinchStartDistRef.current) * pinchStartScaleRef.current;
    setScale(Math.min(3, Math.max(1, next)));
  }, []);

  const onTouchEnd = useCallback(() => {
    pinchStartDistRef.current = null;
  }, []);

  const reset = useCallback(() => setScale(1), []);

  return { scale, onTouchStart, onTouchMove, onTouchEnd, reset };
}

function MushafPageImage({
  page,
  isDark,
}: {
  page: number;
  isDark: boolean;
}) {
  const [status, setStatus] = useState<PageStatus>('loading');
  const imageUrl = getMushafPageUrl(page);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    markPageAsLoaded(page);
  }, [page]);

  const handleError = useCallback(() => {
    setStatus('error');
  }, []);

  return (
    <div
      className={`w-full rounded-2xl overflow-hidden border ${
        isDark ? 'border-[#C9A84C]/10 bg-[#111111]' : 'border-amber-200/40 bg-white/60'
      } transition-colors duration-300`}
    >
      <div 
        className="relative w-full flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: '212 / 325' }}
      >
        {/* Shimmer skeleton behind/instead of image while loading */}
        {status === 'loading' && (
          <div className={`absolute inset-0 w-full h-full z-10 ${isDark ? 'bg-[#111111]' : 'bg-amber-50/60'}`}>
            <div
              className={`absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(201,168,76,0.15),transparent)] animate-[shimmer_1.5s_infinite]`}
            />
          </div>
        )}
        <img
          src={imageUrl}
          alt={`Mushaf page ${page}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-fill z-20"
          style={{
            touchAction: 'pan-y',
            opacity: status === 'loaded' ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
            willChange: 'opacity'
          }}
          draggable={false}
          onLoad={handleLoad}
          onError={handleError}
        />
        {status === 'error' && (
          <div
            className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-2 ${
              isDark ? 'bg-[#111111] text-white/30' : 'bg-amber-50 text-gray-400'
            }`}
          >
            <span className="text-3xl">📖</span>
            <p className="text-xs font-medium">Page {page} unavailable</p>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[#C9A84C]/10">
        <div
          className={`text-[10px] font-black uppercase tracking-[0.2em] ${
            isDark ? 'text-white/30' : 'text-muted-foreground/70'
          }`}
        >
          Page {page}
        </div>
      </div>
    </div>
  );
}

export function MushafSurahPages({ surahNumber, onSwipe }: MushafSurahPagesProps) {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  const { start, end } = useMemo(() => getSurahPageRange(surahNumber), [surahNumber]);
  
  const allPages = useMemo(() => {
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [start, end]);

  // Progressive rendering state
  const [renderedPages, setRenderedPages] = useState<number[]>([]);

  useEffect(() => {
    // Instantly render first 2 pages so UI is responsive
    setRenderedPages(allPages.slice(0, 2));

    if (allPages.length <= 2) return;

    let timeoutId: number;
    let currentIndex = 2;
    const CHUNK_SIZE = 2; // Mount 2 pages per tick to avoid freezing main thread

    const renderNextChunk = () => {
      const nextEnd = Math.min(currentIndex + CHUNK_SIZE, allPages.length);
      const currentChunk = allPages.slice(0, nextEnd);
      
      setRenderedPages(currentChunk);
      currentIndex = nextEnd;

      if (currentIndex < allPages.length) {
        // Yield to browser for 50ms before mounting next chunk
        timeoutId = window.setTimeout(() => {
          requestAnimationFrame(renderNextChunk);
        }, 50);
      }
    };

    timeoutId = window.setTimeout(() => {
      requestAnimationFrame(renderNextChunk);
    }, 150); // Initial delay to let the page transition animation finish smoothly

    return () => clearTimeout(timeoutId);
  }, [allPages]);

  const { scale, onTouchStart, onTouchMove, onTouchEnd, reset } = usePinchZoom();

  // Swipe gesture handling
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartXRef.current = e.touches[0].clientX;
      }
      onTouchStart(e);
    },
    [onTouchStart]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartXRef.current !== null && onSwipe) {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchStartXRef.current - touchEndX;

        if (Math.abs(diff) > 50) {
          if (diff > 0) {
            onSwipe('left');
          } else {
            onSwipe('right');
          }
        }
      }
      touchStartXRef.current = null;
      onTouchEnd();
    },
    [onSwipe, onTouchEnd]
  );

  // Reset scale when surah changes
  useEffect(() => {
    reset();
  }, [surahNumber, reset]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleTouchEnd}
      className="w-full"
    >
      <div
        className="space-y-4 pb-32"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          touchAction: 'pan-y',
        }}
      >
        {renderedPages.map((p) => (
          <div key={p}>
            <MushafPageImage
              page={p}
              isDark={isDark}
            />
          </div>
        ))}
        
        {/* Loading skeleton for remaining pages */}
        {renderedPages.length < allPages.length && (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin opacity-50" />
          </div>
        )}
      </div>
    </div>
  );
}
