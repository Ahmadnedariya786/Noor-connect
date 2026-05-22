import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMushafPageUrl, markPageAsLoaded } from '@/lib/quran-mushaf-image-cache';
import { useSettings } from '@/contexts/SettingsContext';

interface MushafSurahPagesProps {
  surahNumber: number;
  onSwipe?: (direction: 'left' | 'right') => void;
}

const SURAH_PAGES: Array<[number, number, number]> = [
  [1, 1, 1], [2, 2, 49], [3, 50, 76], [4, 77, 105], [5, 106, 127],
  [6, 128, 150], [7, 151, 175], [8, 176, 186], [9, 187, 197], [10, 198, 207],
  [11, 208, 220], [12, 221, 229], [13, 230, 232], [14, 233, 237], [15, 238, 241],
  [16, 242, 254], [17, 255, 266], [18, 267, 276], [19, 277, 281], [20, 282, 292],
  [21, 293, 304], [22, 305, 311], [23, 312, 317], [24, 318, 326], [25, 327, 333],
  [26, 334, 349], [27, 350, 358], [28, 359, 369], [29, 370, 375], [30, 376, 378],
  [31, 379, 381], [32, 382, 384], [33, 385, 395], [34, 396, 399], [35, 400, 403],
  [36, 404, 409], [37, 410, 417], [38, 418, 424], [39, 425, 433], [40, 434, 444],
  [41, 445, 451], [42, 452, 457], [43, 458, 466], [44, 467, 470], [45, 471, 474],
  [46, 475, 478], [47, 479, 482], [48, 483, 486], [49, 487, 488], [50, 489, 492],
  [51, 493, 495], [52, 496, 498], [53, 499, 501], [54, 502, 505], [55, 506, 509],
  [56, 510, 513], [57, 514, 517], [58, 518, 521], [59, 522, 525], [60, 526, 527],
  [61, 528, 529], [62, 530, 530], [63, 531, 532], [64, 533, 534], [65, 535, 536],
  [66, 537, 537], [67, 538, 540], [68, 541, 543], [69, 544, 546], [70, 547, 549],
  [71, 550, 551], [72, 552, 553], [73, 554, 555], [74, 556, 557], [75, 558, 559],
  [76, 560, 561], [77, 562, 563], [78, 564, 565], [79, 566, 567], [80, 568, 569],
  [81, 570, 571], [82, 572, 572], [83, 573, 574], [84, 575, 575], [85, 576, 577],
  [86, 578, 578], [87, 579, 579], [88, 580, 580], [89, 581, 581], [90, 582, 582],
  [91, 583, 583], [92, 584, 584], [93, 585, 585], [94, 586, 586], [95, 586, 586],
  [96, 587, 587], [97, 587, 587], [98, 588, 588], [99, 588, 588], [100, 589, 589],
  [101, 589, 589], [102, 590, 590], [103, 590, 590], [104, 590, 590], [105, 591, 591],
  [106, 591, 591], [107, 591, 591], [108, 592, 592], [109, 592, 592], [110, 592, 592],
  [111, 593, 593], [112, 593, 593], [113, 593, 593], [114, 594, 604]
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

  const [loadIndex, setLoadIndex] = useState(999); // Load all pages initially
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
