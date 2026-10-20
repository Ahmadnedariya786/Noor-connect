/**
 * Mushaf Image Cache Service
 * Uses in-memory Map + <img> preloading to cache Madinah Mushaf page images.
 * Regular <img> tags bypass CORS completely, unlike fetch()/XHR.
 */

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/the-amazing-quran-images/images';
const MAX_CACHED_PAGES = 50;
const PREFETCH_AHEAD = 5;

export type PageCacheStatus = 'cached' | 'loading' | 'none';

/**
 * Preload an image using a native <img> element.
 * Resolves with the URL string on success. Bypasses CORS.
 */
const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.dataset.isPreload = 'true';
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
};

class MushafImageCache {
  private static instance: MushafImageCache;
  /** In-memory cache: page number → CDN URL (already validated as loadable). */
  private cache: Map<number, string> = new Map();
  /** Tracks access order for LRU eviction (most-recently-used at end). */
  private accessOrder: number[] = [];
  /** Pages currently being fetched – avoids duplicate network requests. */
  private inFlight: Map<number, Promise<string>> = new Map();

  static getInstance(): MushafImageCache {
    if (!MushafImageCache.instance) {
      MushafImageCache.instance = new MushafImageCache();
    }
    return MushafImageCache.instance;
  }

  /** Build the CDN URL for a given page number (1-604). */
  getImageUrl(pageNumber: number): string {
    return `${CDN_BASE}/${pageNumber}.png`;
  }

  /** Check whether a page is already in the in-memory cache. */
  async isPageCached(pageNumber: number): Promise<boolean> {
    return this.cache.has(pageNumber);
  }

  /**
   * Get a page image URL, checking cache first then preloading via <img>.
   * Returns the CDN URL string for use in <img src={...} />.
   */
  async getPageImage(
    pageNumber: number,
    _onProgress?: (loaded: number, total: number) => void
  ): Promise<string> {
    if (pageNumber < 1 || pageNumber > 604) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }

    // ── 1. Try in-memory cache ──
    const cached = this.cache.get(pageNumber);
    if (cached) {
      this.touchAccessOrder(pageNumber);
      return cached;
    }

    // ── 2. Preload via <img> (de-duplicate) ──
    let loadPromise = this.inFlight.get(pageNumber);
    if (!loadPromise) {
      const url = this.getImageUrl(pageNumber);
      loadPromise = preloadImage(url);
      this.inFlight.set(pageNumber, loadPromise);
    }

    try {
      const resolvedUrl = await loadPromise;

      // Store in cache
      this.ensureCacheSpace();
      this.cache.set(pageNumber, resolvedUrl);
      this.touchAccessOrder(pageNumber);

      return resolvedUrl;
    } finally {
      this.inFlight.delete(pageNumber);
    }
  }

  /** Move a page to the end of the access list (most-recently-used). */
  private touchAccessOrder(pageNumber: number): void {
    this.accessOrder = this.accessOrder.filter((p) => p !== pageNumber);
    this.accessOrder.push(pageNumber);
  }

  /** Evict oldest pages if we've exceeded MAX_CACHED_PAGES. */
  private ensureCacheSpace(): void {
    while (this.accessOrder.length >= MAX_CACHED_PAGES) {
      const oldest = this.accessOrder.shift();
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
  }

  /**
   * Pre-fetch the next N pages after `currentPage` in the background.
   * Does not block; errors are silently swallowed.
   */
  prefetchPages(currentPage: number): void {
    for (let i = 1; i <= PREFETCH_AHEAD; i++) {
      const target = currentPage + i;
      if (target > 604) break;

      // Only prefetch if not already cached or in-flight
      if (!this.cache.has(target) && !this.inFlight.has(target)) {
        this.getPageImage(target).catch(() => {
          /* silent */
        });
      }
    }
  }

  /** Get the number of currently cached pages. */
  async getCachedCount(): Promise<number> {
    return this.cache.size;
  }

  /** Wipe the entire image cache. */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.accessOrder = [];
  }
}

export const mushafImageCache = MushafImageCache.getInstance();
