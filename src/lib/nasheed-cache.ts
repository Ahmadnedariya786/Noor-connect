const NASHEED_CACHE = 'noor-connect-nasheed-v1';

export const nasheedCache = {
  async isCached(url: string): Promise<boolean> {
    try {
      const cache = await caches.open(NASHEED_CACHE);
      const match = await cache.match(url);
      return !!match;
    } catch {
      return false;
    }
  },

  async getCachedUrls(): Promise<string[]> {
    try {
      const cache = await caches.open(NASHEED_CACHE);
      const keys = await cache.keys();
      return keys.map(req => req.url);
    } catch {
      return [];
    }
  },

  async deleteCached(url: string): Promise<boolean> {
    try {
      const cache = await caches.open(NASHEED_CACHE);
      return cache.delete(url);
    } catch {
      return false;
    }
  },

  async getCacheInfo(): Promise<{ count: number; urls: string[] }> {
    try {
      const cache = await caches.open(NASHEED_CACHE);
      const keys = await cache.keys();
      const urls = keys.map(req => req.url);
      return { count: urls.length, urls };
    } catch {
      return { count: 0, urls: [] };
    }
  },

  async clearAll(): Promise<void> {
    try {
      await caches.delete(NASHEED_CACHE);
    } catch {
      // ignore
    }
  },

  async preload(url: string): Promise<void> {
    try {
      const cache = await caches.open(NASHEED_CACHE);
      const cached = await cache.match(url);
      if (!cached) {
        await fetch(url, { mode: 'no-cors' });
      }
    } catch {
      // already cached or network unavailable
    }
  },
};
