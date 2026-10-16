import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMushafPageUrl } from '@/lib/quran-mushaf-image-cache';
import { mushafService } from '@/lib/mushaf-service';
import { useSettings } from '@/contexts/SettingsContext';

interface MushafSurahPagesProps {
  surahNumber: number;
  onSwipe?: (direction: 'left' | 'right') => void;
  onPageChange?: (currentPage: number, totalPages: number, maxPageViewed: number) => void;
}

function getSurahPageRange(surahNumber: number): { start: number; end: number } {
  const start = mushafService.getPageForSurah(surahNumber);
  const nextStart = surahNumber < 114 ? mushafService.getPageForSurah(surahNumber + 1) : 605;
  return { start, end: Math.max(start, nextStart - 1) };
}

function prefetchSurroundingPages(currentPage: number, start: number, end: number) {
  const toPrefetch = [
    currentPage - 1,
    currentPage + 1,
    currentPage + 2,
  ].filter(p => p >= start && p <= end);

  toPrefetch.forEach(page => {
    const img = new Image();
    img.src = getMushafPageUrl(page);
  });
}

interface PageSlotProps {
  page: number | null;
  isDark: boolean;
}

function PageSlot({ page, isDark }: PageSlotProps) {
  const [loaded, setLoaded] = useState(false);
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (page === null) {
      setSrc('');
      setLoaded(false);
      return;
    }
    const url = getMushafPageUrl(page);
    setLoaded(false);
    setSrc(url);
  }, [page]);

  if (page === null) return null;

  return (
    <div
      className="w-full rounded-2xl overflow-hidden border border-[var(--border)] bg-[var(--surface)]"
    >
      <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ aspectRatio: '212 / 325' }}>
        {!loaded && (
          <div className="absolute inset-0 w-full h-full z-10 bg-[var(--surface)]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,var(--accent-soft),transparent)] animate-[shimmer_1.5s_infinite]" />
          </div>
        )}
        <img
          src={src}
          alt={`Mushaf page ${page}`}
          className="absolute inset-0 w-full h-full object-fill z-20"
          style={{
            touchAction: 'pan-y',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease-out',
          }}
          draggable={false}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      </div>
      <div className="p-3 border-t border-[#C9A84C]/10">
        <div className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/30' : 'text-muted-foreground/70'}`}>
          Page {page}
        </div>
      </div>
    </div>
  );
}

export function MushafSurahPages({ surahNumber, onPageChange }: MushafSurahPagesProps) {
  const { effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  const { start, end } = useMemo(() => getSurahPageRange(surahNumber), [surahNumber]);
  const totalPages = end - start + 1;

  const [localPage, setLocalPage] = useState(0);
  const maxPageViewedRef = useRef(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top and reset page tracker when surah changes
  useEffect(() => {
    setLocalPage(0);
    maxPageViewedRef.current = 0;
    onPageChange?.(1, totalPages, 1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [surahNumber]);

  // Track visible page via scroll position
  const rafRef = useRef(0);
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!scrollContainerRef.current || totalPages === 0) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const pageHeight = scrollHeight / totalPages;
      const newPage = Math.round(scrollTop / pageHeight);
      if (newPage !== localPage && newPage >= 0 && newPage < totalPages) {
        setLocalPage(newPage);
        const pageNum = newPage + 1;
        if (pageNum > maxPageViewedRef.current) {
          maxPageViewedRef.current = pageNum;
        }
        onPageChange?.(pageNum, totalPages, maxPageViewedRef.current);
      }
    });
  }, [totalPages, localPage]);

  const absolutePage = start + localPage;

  // Prefetch surrounding pages when visible page changes
  useEffect(() => {
    const id = setTimeout(() => {
      prefetchSurroundingPages(absolutePage, start, end);
    }, 300);
    return () => clearTimeout(id);
  }, [absolutePage, start, end]);

  // Generate all page numbers for this surah
  const pages = useMemo(() => {
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [start, end]);

  return (
    <div className="w-full">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="w-full overflow-y-auto"
        style={{ overscrollBehavior: 'contain', maxHeight: '100vh' }}
      >
        <div className="space-y-4 pb-32">
          {pages.map((pageNum) => (
            <div
              key={pageNum}
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 212px 325px' }}
            >
              <PageSlot page={pageNum} isDark={isDark} />
            </div>
          ))}
        </div>
      </div>

      {/* Floating page indicator */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center z-20 pointer-events-none">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md pointer-events-auto"
          style={{ background: isDark ? 'rgba(17,17,17,0.85)' : 'rgba(255,255,255,0.85)', border: '1px solid rgba(201,168,76,0.2)' }}
        >
          <span className={`text-xs font-bold px-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
            Page {localPage + 1} of {totalPages}
          </span>
        </div>
      </div>
    </div>
  );
}
