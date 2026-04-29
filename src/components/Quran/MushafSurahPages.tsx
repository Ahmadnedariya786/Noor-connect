import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMushafPageUrl, markPageAsLoaded } from '@/lib/quran-mushaf-image-cache';
import { useSettings } from '@/contexts/SettingsContext';

interface MushafSurahPagesProps {
  surahNumber: number;
  onSwipe?: (direction: 'left' | 'right') => void;
}

const SURAH_PAGES: Array<[number, number, number]> = [
  [1, 1, 1], [2, 2, 49], [3, 50, 76], [4, 77, 106], [5, 107, 127],
  [6, 128, 150], [7, 151, 176], [8, 177, 186], [9, 187, 207], [10, 208, 221],
  [11, 222, 235], [12, 236, 248], [13, 249, 255], [14, 256, 261], [15, 262, 267],
  [16, 268, 281], [17, 282, 293], [18, 294, 304], [19, 305, 312], [20, 313, 321],
  [21, 322, 331], [22, 332, 341], [23, 342, 349], [24, 350, 359], [25, 360, 366],
  [26, 367, 376], [27, 377, 385], [28, 386, 396], [29, 397, 404], [30, 405, 411],
  [31, 412, 415], [32, 416, 418], [33, 419, 428], [34, 429, 434], [35, 435, 440],
  [36, 441, 445], [37, 446, 452], [38, 453, 457], [39, 458, 466], [40, 467, 476],
  [41, 477, 482], [42, 483, 489], [43, 490, 495], [44, 496, 498], [45, 499, 502],
  [46, 503, 506], [47, 507, 510], [48, 511, 514], [49, 515, 517], [50, 518, 520],
  [51, 521, 523], [52, 524, 526], [53, 527, 529], [54, 530, 531], [55, 532, 534],
  [56, 535, 537], [57, 538, 541], [58, 542, 545], [59, 546, 549], [60, 550, 551],
  [61, 552, 553], [62, 554, 555], [63, 556, 557], [64, 558, 559], [65, 560, 561],
  [66, 562, 563], [67, 564, 566], [68, 567, 568], [69, 569, 571], [70, 572, 573],
  [71, 574, 575], [72, 576, 577], [73, 578, 579], [74, 580, 581], [75, 582, 583],
  [76, 584, 585], [77, 586, 587], [78, 588, 589], [79, 590, 591], [80, 592, 593],
  [81, 594, 595], [82, 596, 596], [83, 597, 599], [84, 600, 600], [85, 601, 601],
  [86, 602, 602], [87, 602, 602], [88, 603, 603], [89, 603, 604], [90, 604, 604],
  [91, 604, 604], [92, 604, 604], [93, 604, 604], [94, 604, 604], [95, 604, 604],
  [96, 604, 604], [97, 604, 604], [98, 604, 604], [99, 604, 604], [100, 604, 604],
  [101, 604, 604], [102, 604, 604], [103, 604, 604], [104, 604, 604], [105, 604, 604],
  [106, 604, 604], [107, 604, 604], [108, 604, 604], [109, 604, 604], [110, 604, 604],
  [111, 604, 604], [112, 604, 604], [113, 604, 604], [114, 604, 604]
];

type PageStatus = 'idle' | 'loading' | 'loaded';

function getSurahPageRange(surahNumber: number): { start: number; end: number } {
  const entry = SURAH_PAGES.find(([s]) => s === surahNumber);
  if (!entry) return { start: 1, end: 1 };
  return { start: entry[1], end: entry[2] };
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

function PageSkeleton({ isDark }: { isDark: boolean }) {
  return (
    <div className={`w-full rounded-2xl overflow-hidden border ${isDark ? 'border-[#C9A84C]/10 bg-[#111111]' : 'border-amber-200/40 bg-white/60'}`}>
      <div className="w-full aspect-[3/4] relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-r ${isDark ? 'from-[#111111] via-[#1a1a1a] to-[#111111]' : 'from-amber-50 via-amber-100 to-amber-50'}`} />
        <div className={`absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(201,168,76,0.1),transparent)] animate-[shimmer_2s_infinite]`} />
      </div>
      <div className="p-3">
        <div className={`h-3 w-20 rounded ${isDark ? 'bg-[#C9A84C]/20' : 'bg-amber-200'}`} />
      </div>
    </div>
  );
}

function MushafPageImage({ page, shouldStartLoading, isDark }: { page: number; shouldStartLoading: boolean; isDark: boolean }) {
  const [status, setStatus] = useState<PageStatus>('idle');
  const imageUrl = getMushafPageUrl(page);

  const handleLoad = useCallback(() => {
    setStatus('loaded');
    markPageAsLoaded(page);
  }, [page]);

  useEffect(() => {
    if (!shouldStartLoading) return;
    setStatus('loading');
  }, [shouldStartLoading]);

  if (!shouldStartLoading || status === 'idle') {
    return <PageSkeleton isDark={isDark} />;
  }

  return (
    <div className={`w-full rounded-2xl overflow-hidden border ${isDark ? 'border-[#C9A84C]/10 bg-[#111111]' : 'border-amber-200/40 bg-white/60'} animate-in fade-in duration-500`}>
      <div className="relative w-full">
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className={`w-full aspect-[3/4] ${isDark ? 'bg-[#111111]' : 'bg-amber-50/60'}`} />
          </div>
        )}
        <img
          src={imageUrl}
          alt={`Mushaf page ${page}`}
          className="w-full h-auto block"
          style={{ touchAction: 'pan-y' }}
          draggable={false}
          onLoad={handleLoad}
        />
      </div>
      <div className="p-3">
        <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/30' : 'text-muted-foreground/70'}`}>Page {page}</div>
      </div>
    </div>
  );
}

export function MushafSurahPages({ surahNumber, onSwipe }: MushafSurahPagesProps) {
  const { theme } = useSettings();
  const isDark = theme === 'dark';

  const { start, end } = useMemo(() => getSurahPageRange(surahNumber), [surahNumber]);
  const pages = useMemo(() => {
    const arr: number[] = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  }, [start, end]);

  const { scale, onTouchStart, onTouchMove, onTouchEnd, reset } = usePinchZoom();

  const [loadIndex, setLoadIndex] = useState(0);
  const sentryRef = useRef<HTMLDivElement | null>(null);

  // Swipe gesture handling
  const touchStartXRef = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
    }
    onTouchStart(e);
  }, [onTouchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
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
  }, [onSwipe, onTouchEnd]);

  useEffect(() => {
    setLoadIndex(0);
    reset();
  }, [surahNumber, reset]);

  useEffect(() => {
    if (!sentryRef.current) return;

    const el = sentryRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setLoadIndex((i) => Math.min(pages.length - 1, i + 1));
        }
      },
      { root: null, rootMargin: '900px 0px', threshold: 0.01 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pages.length]);

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
          touchAction: 'pan-y'
        }}
      >
        {pages.map((p, idx) => (
          <div key={p}>
            <MushafPageImage page={p} shouldStartLoading={idx <= loadIndex} isDark={isDark} />
          </div>
        ))}
        <div ref={sentryRef} />
      </div>
    </div>
  );
}
