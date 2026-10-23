import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMushafPageUrl, getMushafPageCdnFallback } from '@/lib/quran-mushaf-image-cache';
import { mushafService } from '@/lib/mushaf-service';
import { useSettings } from '@/contexts/SettingsContext';

export type MushafReadingMode = 'parchment' | 'night' | 'classic';

interface MushafSurahPagesProps {
  surahNumber: number;
  mushafMode?: MushafReadingMode;
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
    const url = getMushafPageUrl(page);
    if (url) {
      const img = new Image();
      img.dataset.isPreload = 'true';
      img.onerror = () => {
        // Handled prefetch fallback failure
      };
      img.src = url;
    }
  });
}

interface PageSlotProps {
  page: number | null;
  pageInSurah: number;
  totalPages: number;
  isDark: boolean;
  isNearActive: boolean;
  mushafMode: MushafReadingMode;
}

function PageSlot({ page, pageInSurah, totalPages, isNearActive, mushafMode }: PageSlotProps) {
  const [loaded, setLoaded] = useState(false);
  const [hasBeenActive, setHasBeenActive] = useState(isNearActive);

  useEffect(() => {
    if (isNearActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isNearActive, hasBeenActive]);

  const shouldRenderImg = Boolean(page && (isNearActive || hasBeenActive));
  const primaryUrl = useMemo(() => (page ? getMushafPageUrl(page) : ''), [page]);

  if (page === null) return null;

  // Eye-comfort CSS filters
  const imageFilter =
    mushafMode === 'parchment'
      ? 'sepia(0.22) brightness(0.95) contrast(1.02)'
      : mushafMode === 'night'
      ? 'invert(1) hue-rotate(180deg) sepia(0.18) brightness(1.18) contrast(1.42)'
      : 'contrast(1.45) brightness(0.95)';

  const containerBorder =
    mushafMode === 'parchment'
      ? '1.5px solid rgba(201, 168, 76, 0.45)'
      : mushafMode === 'night'
      ? '1px solid var(--accent)'
      : '1.5px solid rgba(0, 0, 0, 0.12)';

  const pageBackdrop =
    mushafMode === 'parchment'
      ? '#fcf8ef'
      : mushafMode === 'night'
      ? '#0B101B'
      : '#FAF8F2';

  return (
    <div
      className="w-full rounded-[18px] p-2 mb-4 transition-all duration-200"
      style={{
        background: pageBackdrop,
        border: containerBorder,
        boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
      }}
    >
      {/* Jewel-Framed Mushaf Page Canvas */}
      <div
        className="relative w-full flex items-center justify-center overflow-hidden rounded-[12px]"
        style={{
          aspectRatio: '212 / 325',
          background: mushafMode === 'night' ? '#0B101B' : mushafMode === 'parchment' ? '#fbf6ec' : '#FAF8F2',
          border: mushafMode === 'night' ? '1px solid var(--accent)' : 'none',
        }}
      >
        {!loaded && (
          <div className="absolute inset-0 w-full h-full z-10 bg-[var(--surface-2)]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,var(--accent-soft),transparent)] animate-[shimmer_1.5s_infinite]" />
          </div>
        )}
        {shouldRenderImg && primaryUrl ? (
          <img
            src={primaryUrl}
            data-has-fallback="true"
            alt={`Mushaf page ${page}`}
            className="absolute inset-0 w-full h-full object-fill z-20"
            style={{
              touchAction: 'pan-y',
              opacity: loaded ? 1 : 0,
              filter: imageFilter,
              mixBlendMode: mushafMode === 'classic' ? 'multiply' : 'normal',
              transition: 'opacity 0.3s ease-out, filter 0.2s ease',
            }}
            draggable={false}
            loading={isNearActive ? 'eager' : 'lazy'}
            onLoad={() => setLoaded(true)}
            onError={(e) => {
              const current = e.currentTarget;
              if (!current.dataset.fallbackApplied) {
                current.dataset.fallbackApplied = 'true';
                const fallback = getMushafPageCdnFallback(page);
                if (fallback) {
                  current.src = fallback;
                  return;
                }
              }
              current.dataset.fallbackFailed = 'true';
              setLoaded(false);
            }}
          />
        ) : null}
      </div>

      {/* Luxury Header/Footer Ribbon */}
      <div className="mt-2 flex items-center justify-between px-3.5 py-2 bg-[var(--surface-2)] rounded-[10px] border border-[var(--border)] select-none">
        <span className="text-xs font-bold text-[var(--accent-text)] tracking-wider">
          PAGE {page}
        </span>
        <span className="text-xs font-medium text-[var(--text-secondary)]">
          Page {pageInSurah} of {totalPages}
        </span>
      </div>
    </div>
  );
}

export function MushafSurahPages({
  surahNumber,
  mushafMode = 'parchment',
  onPageChange,
}: MushafSurahPagesProps) {
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
      const { scrollTop, scrollHeight } = scrollContainerRef.current;
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
  }, [totalPages, localPage, onPageChange]);

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
          {pages.map((pageNum, idx) => (
            <div
              key={pageNum}
              style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 212px 325px' }}
            >
              <PageSlot
                page={pageNum}
                pageInSurah={idx + 1}
                totalPages={totalPages}
                isDark={isDark}
                isNearActive={Math.abs(idx - localPage) <= 1}
                mushafMode={mushafMode}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Luxury Floating Page Ribbon */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-center z-20 pointer-events-none">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md pointer-events-auto shadow-xl"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--accent)',
            boxShadow: '0 4px 20px var(--accent-glow)',
          }}
        >
          <span className="text-xs font-bold text-[var(--accent-text)] px-1">
            Page {localPage + 1} of {totalPages}
          </span>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
            • Mushaf p. {absolutePage}
          </span>
        </div>
      </div>
    </div>
  );
}
