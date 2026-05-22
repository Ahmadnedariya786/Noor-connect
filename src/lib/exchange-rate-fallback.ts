/**
 * Exchange Rate Fallback Service
 * Manages exchange rate caching with online/offline detection
 */

interface ExchangeRateData {
  rate: number;
  lastUpdated: string;
  source: 'api' | 'fallback';
}

interface CachedExchangeRate {
  data: ExchangeRateData;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'exchange-rate-fallback-';
const CACHE_TTL_MINUTES = 30; // Cache for 30 minutes

export class ExchangeRateFallbackService {
  private static debounceTimer: NodeJS.Timeout | null = null;
  private static onlineListenersAttached = false;

  /**
   * Get exchange rate for a currency with fallback
   */
  static async getExchangeRate(currency: string): Promise<ExchangeRateData> {
    try {
      // Check cache first
      const cached = this.getCachedRate(currency);
      if (cached) {
        // If online, try to refresh in background
        if (navigator.onLine) {
          this.refreshRateInBackground(currency);
        }
        return cached;
      }

      // If online, fetch fresh rate
      if (navigator.onLine) {
        return await this.fetchRate(currency);
      }

      // If offline and no cache, use hardcoded fallback
      return this.getHardcodedFallback(currency);
    } catch (error) {
      console.warn('Failed to get exchange rate, using fallback:', error);
      return this.getHardcodedFallback(currency);
    }
  }

  /**
   * Fetch fresh exchange rate from API
   */
  private static async fetchRate(currency: string): Promise<ExchangeRateData> {
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/USD`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates[currency];

      if (!rate) {
        throw new Error(`Currency ${currency} not found in API response`);
      }

      const exchangeRateData: ExchangeRateData = {
        rate,
        lastUpdated: new Date().toISOString(),
        source: 'api'
      };

      // Save to cache
      this.saveToCache(currency, exchangeRateData);

      return exchangeRateData;
    } catch (error) {
      console.warn('Failed to fetch exchange rate from API:', error);
      throw error;
    }
  }

  /**
   * Refresh rate in background (non-blocking)
   */
  private static refreshRateInBackground(currency: string): void {
    // Debounce to prevent excessive API calls
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      try {
        await this.fetchRate(currency);
      } catch (error) {
        console.warn('Background rate refresh failed:', error);
      }
    }, 5000); // Wait 5 seconds after online event
  }

  /**
   * Get cached rate if still valid
   */
  private static getCachedRate(currency: string): ExchangeRateData | null {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cachedData: CachedExchangeRate = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      const maxAge = CACHE_TTL_MINUTES * 60 * 1000;

      if (cacheAge > maxAge) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error reading cached exchange rate:', error);
      return null;
    }
  }

  /**
   * Save rate to cache
   */
  private static saveToCache(currency: string, data: ExchangeRateData): void {
    try {
      const cacheKey = `${CACHE_KEY_PREFIX}${currency}`;
      const cachedData: CachedExchangeRate = {
        data,
        timestamp: Date.now()
      };

      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving exchange rate to cache:', error);
    }
  }

  /**
   * Get hardcoded fallback rate
   */
  private static getHardcodedFallback(currency: string): ExchangeRateData {
    const fallbackRates: Record<string, number> = {
      'PKR': 279.5,
      'AED': 3.67,
      'SAR': 3.75,
      'BDT': 110.0,
      'EGP': 30.9,
      'TRY': 30.2,
      'MYR': 4.73,
      'IDR': 15600,
      'EUR': 0.92,
      'GBP': 0.79,
      'JPY': 149.5,
      'CAD': 1.36,
      'AUD': 1.53,
      'INR': 83.0,
    };

    return {
      rate: fallbackRates[currency] || 1,
      lastUpdated: new Date().toISOString(),
      source: 'fallback'
    };
  }

  /**
   * Clear cached rate for a currency
   */
  static clearCache(currency?: string): void {
    if (currency) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${currency}`);
    } else {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Force refresh rate from API
   */
  static async refreshRate(currency: string): Promise<ExchangeRateData> {
    this.clearCache(currency);
    return await this.fetchRate(currency);
  }

  /**
   * Setup online/offline event listeners
   */
  static setupOnlineListeners(): void {
    if (this.onlineListenersAttached) return;

    const handleOnline = () => {
      console.log('User came online, refreshing exchange rates');
      // Refresh all cached currencies when coming online
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          const currency = key.replace(CACHE_KEY_PREFIX, '');
          this.refreshRateInBackground(currency);
        }
      });
    };

    window.addEventListener('online', handleOnline);
    this.onlineListenersAttached = true;
  }

  /**
   * Get inverse rate (1 currency = X USD)
   */
  static getInverseRate(rate: number): number {
    return 1 / rate;
  }

  /**
   * Format time ago for display
   */
  static formatTimeAgo(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hour${Math.floor(diffMins / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffMins / 1440)} day${Math.floor(diffMins / 1440) > 1 ? 's' : ''} ago`;
  }
}
