import { Capacitor } from '@capacitor/core';

function getPageUrl(page: number): string {
  if (!page || typeof page !== 'number' || page < 1 || page > 604 || isNaN(page)) {
    return '';
  }
  // Offset by +2 because 001.webp and 002.webp are intro/credits in this dataset.
  // Standard Mushaf page 1 corresponds to 003.webp.
  const offsetPage = page + 2;
  const padded = String(offsetPage).padStart(3, '0');

  // Capacitor automatically serves public folder assets on both web and native
  return `/mushaf/${padded}.webp`;
}

export function getMushafPageUrl(page: number): string {
  return getPageUrl(page);
}

export function getMushafPageCdnFallback(page: number): string {
  if (!page || typeof page !== 'number' || page < 1 || page > 604 || isNaN(page)) {
    return '';
  }
  return `https://cdn.jsdelivr.net/npm/the-amazing-quran-images/images/${page}.png`;
}

/**
 * Prefetch a set of mushaf pages into the browser's image cache.
 * Uses new Image() so the browser decodes the file off-main-thread.
 * Call this AFTER the current page renders (via setTimeout idle).
 */
export function prefetchMushafPages(pages: number[]): void {
  pages.forEach(page => {
    if (page >= 1 && page <= 604) {
      const url = getPageUrl(page);
      if (url) {
        const img = new Image();
        img.dataset.isPreload = 'true';
        img.onerror = () => {
          // Handled prefetch fallback failure
        };
        img.src = url;
      }
    }
  });
}

export function markPageAsLoaded(_page: number): void {
  // No-op — local assets are always available
}

export async function clearQuranMushafImageCache(): Promise<void> {
  // No-op — local assets don't need cache eviction
}

