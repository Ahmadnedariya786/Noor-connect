import { Capacitor } from '@capacitor/core';

function getPageUrl(page: number): string {
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

/**
 * Prefetch a set of mushaf pages into the browser's image cache.
 * Uses new Image() so the browser decodes the file off-main-thread.
 * Call this AFTER the current page renders (via setTimeout idle).
 */
export function prefetchMushafPages(pages: number[]): void {
  pages.forEach(page => {
    if (page >= 1 && page <= 604) {
      const img = new Image();
      img.src = getPageUrl(page);
    }
  });
}

export function markPageAsLoaded(_page: number): void {
  // No-op — local assets are always available
}

export async function clearQuranMushafImageCache(): Promise<void> {
  // No-op — local assets don't need cache eviction
}

