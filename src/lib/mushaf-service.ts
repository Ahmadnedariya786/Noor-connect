// Mushaf Service - Handles loading and caching Mushaf Layout pages
// Data source: https://github.com/zonetecde/mushaf-layout

const MUSHAF_CDN_BASE = "https://raw.githubusercontent.com/zonetecde/mushaf-layout/refs/heads/main/mushaf";
const CACHE_PREFIX = "mushaf-page-";
const CACHE_VERSION = "1.0";
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB limit
const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface MushafWord {
  location: string; // surah:verse:wordIndex (e.g., "2:1:1")
  word: string; // Arabic text with verse number if last word
  qpcV2: string; // QPC2 font glyphs
  qpcV1: string; // QPC1 font glyphs
}

export interface MushafLine {
  line: number;
  type: "surah-header" | "basmala" | "text";
  text?: string;
  surah?: string;
  qpcV2?: string;
  qpcV1?: string;
  verseRange?: string;
  words?: MushafWord[];
}

export interface MushafPage {
  page: number;
  lines: MushafLine[];
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

export const SURAH_START_PAGES: { [key: number]: number } = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267,
  17: 282, 18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342,
  24: 350, 25: 359, 26: 367, 27: 377, 28: 385, 29: 396, 30: 404,
  31: 411, 32: 415, 33: 418, 34: 428, 35: 434, 36: 440, 37: 446,
  38: 453, 39: 458, 40: 467, 41: 477, 42: 483, 43: 489, 44: 496,
  45: 499, 46: 502, 47: 507, 48: 511, 49: 515, 50: 518, 51: 520,
  52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537, 58: 542,
  59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
  66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572,
  73: 574, 74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583,
  80: 585, 81: 586, 82: 587, 83: 587, 84: 589, 85: 590, 86: 591,
  87: 591, 88: 592, 89: 593, 90: 594, 91: 595, 92: 595, 93: 596,
  94: 596, 95: 597, 96: 597, 97: 598, 98: 598, 99: 599, 100: 599,
  101: 600, 102: 600, 103: 601, 104: 601, 105: 601, 106: 602,
  107: 602, 108: 602, 109: 603, 110: 603, 111: 603, 112: 604,
  113: 604, 114: 604
};

class MushafService {
  private static instance: MushafService;
  private memoryCache: Map<number, MushafPage> = new Map();
  private preloadQueue: number[] = [];

  static getInstance(): MushafService {
    if (!MushafService.instance) {
      MushafService.instance = new MushafService();
    }
    return MushafService.instance;
  }

  private getCacheKey(pageNumber: number): string {
    return `${CACHE_PREFIX}${pageNumber}`;
  }

  private getCachedItem<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);

      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Error reading Mushaf cache for ${key}:`, error);
      return null;
    }
  }

  private setCachedItem<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION
      };

      const serialized = JSON.stringify(entry);

      if (this.getCacheSize() + serialized.length > MAX_CACHE_SIZE) {
        this.cleanupCache();
      }

      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error writing Mushaf cache for ${key}:`, error);
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.cleanupCache(true);
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            version: CACHE_VERSION
          };
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          console.error("Failed to cache Mushaf page even after cleanup:", retryError);
        }
      }
    }
  }

  private getCacheSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length;
        }
      }
    }
    return size;
  }

  private cleanupCache(aggressive: boolean = false): void {
    const entries: { key: string; timestamp: number; size: number }[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            entries.push({
              key,
              timestamp: parsed.timestamp || 0,
              size: item.length
            });
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }

    entries.sort((a, b) => a.timestamp - b.timestamp);

    const now = Date.now();
    for (const entry of entries) {
      const item = localStorage.getItem(entry.key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (now - parsed.timestamp > (parsed.ttl || DEFAULT_TTL)) {
            localStorage.removeItem(entry.key);
          }
        } catch {
          localStorage.removeItem(entry.key);
        }
      }
    }

    if (aggressive) {
      const remaining = entries.filter(e => localStorage.getItem(e.key) !== null);
      const toRemove = Math.floor(remaining.length / 2);
      for (let i = 0; i < toRemove && i < remaining.length; i++) {
        localStorage.removeItem(remaining[i].key);
      }
    }
  }

  async getPage(pageNumber: number): Promise<MushafPage | null> {
    if (pageNumber < 1 || pageNumber > 604) {
      console.error(`Invalid page number: ${pageNumber}`);
      return null;
    }

    // Check memory cache first
    if (this.memoryCache.has(pageNumber)) {
      return this.memoryCache.get(pageNumber)!;
    }

    // Check localStorage cache
    const cacheKey = this.getCacheKey(pageNumber);
    const cached = this.getCachedItem<MushafPage>(cacheKey);
    if (cached) {
      this.memoryCache.set(pageNumber, cached);
      return cached;
    }

    // Fetch from CDN
    try {
      const url = `${MUSHAF_CDN_BASE}/page-${pageNumber.toString().padStart(3, '0')}.json`;
      const response = await fetch(url);

      if (!response.ok) {
        console.error(`Failed to fetch Mushaf page ${pageNumber}: ${response.status}`);
        return null;
      }

      const data: MushafPage = await response.json();

      // Cache the data
      this.memoryCache.set(pageNumber, data);
      this.setCachedItem(cacheKey, data);

      return data;
    } catch (error) {
      console.error(`Error loading Mushaf page ${pageNumber}:`, error);
      return null;
    }
  }

  async preloadPages(pageNumbers: number[]): Promise<void> {
    for (const pageNum of pageNumbers) {
      if (pageNum >= 1 && pageNum <= 604 && !this.memoryCache.has(pageNum)) {
        this.preloadQueue.push(pageNum);
      }
    }

    // Process preload queue
    while (this.preloadQueue.length > 0) {
      const pageNum = this.preloadQueue.shift()!;
      try {
        await this.getPage(pageNum);
      } catch (error) {
        console.error(`Error preloading page ${pageNum}:`, error);
      }
    }
  }

  getPageForSurah(surahNumber: number): number {
    return SURAH_START_PAGES[surahNumber] || 1;
  }

  getSurahForPage(pageNumber: number): number | null {
    const surahs = Object.entries(SURAH_START_PAGES);
    let currentSurah = 1;
    
    for (const [surah, startPage] of surahs) {
      if (pageNumber < startPage) {
        return currentSurah;
      }
      currentSurah = parseInt(surah);
    }
    
    return 114;
  }

  getAdjacentPages(pageNumber: number): { prev: number | null; next: number | null } {
    return {
      prev: pageNumber > 1 ? pageNumber - 1 : null,
      next: pageNumber < 604 ? pageNumber + 1 : null
    };
  }

  async preloadAdjacentPages(pageNumber: number): Promise<void> {
    const { prev, next } = this.getAdjacentPages(pageNumber);
    const pagesToPreload: number[] = [];
    
    if (prev) pagesToPreload.push(prev);
    if (next) pagesToPreload.push(next);
    
    // Also preload a few more for smoother navigation
    if (prev && prev > 1) pagesToPreload.push(prev - 1);
    if (next && next < 604) pagesToPreload.push(next + 1);
    
    await this.preloadPages(pagesToPreload);
  }

  clearCache(): void {
    this.memoryCache.clear();
    
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  getCachedPageCount(): number {
    return this.memoryCache.size;
  }
}

export const mushafService = MushafService.getInstance();
