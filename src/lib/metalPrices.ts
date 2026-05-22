/**
 * Metal Prices Service
 * Fetches Gold and Silver prices from free APIs with fallback logic and caching
 */

import { METAL_PRICE_CONSTANTS } from './constants';
import { ZakatNisabResponse, ZakatNisabService } from './zakatNisab';
import { ExchangeRateFallbackService } from './exchange-rate-fallback';

export interface MetalPrices {
  goldPricePerGram: number;
  silverPricePerGram: number;
  goldNisab: number;
  silverNisab: number;
  lastUpdated: string;
  source: 'api' | 'fallback';
  goldToSilverRatio?: number;
  currency?: string;
  exchangeRate?: number;
  nisabData?: ZakatNisabResponse; // New field for Islamic API data
}

interface CachedPrices {
  data: MetalPrices;
  timestamp: number;
}

interface CSVRow {
  date: string;
  price: number;
  currency?: string;
  silver_oz_per_gold_oz?: number;
}

export class MetalPricesService {
  /**
   * Get current metal prices with caching and fallback logic
   */
  static async getPrices(
    currency: string = 'USD',
    nisabStandard: 'classical' | 'common' = 'classical'
  ): Promise<MetalPrices> {
    try {
      // Check cache first
      const cached = this.getCachedPrices(currency, nisabStandard);
      if (cached) {
        return cached;
      }

      // Try to fetch from APIs in parallel
      const [metalPrices, nisabData] = await Promise.allSettled([
        this.fetchMetalPricesFromAPI(currency),
        ZakatNisabService.getNisab(currency, nisabStandard, 'g')
      ]);

      const prices = metalPrices.status === 'fulfilled' ? metalPrices.value : null;
      const nisab = nisabData.status === 'fulfilled' ? nisabData.value : null;

      // If we have metal prices, use them; otherwise use fallback
      const finalPrices = prices || await this.getFallbackPrices(currency);

      // If we have nisab data from Islamic API, update the nisab values
      if (nisab && nisab.status === 'success') {
        finalPrices.goldNisab = nisab.data.nisab_thresholds.gold.nisab_amount;
        finalPrices.silverNisab = nisab.data.nisab_thresholds.silver.nisab_amount;
        finalPrices.nisabData = nisab;
        
        // Update source if we have Islamic API data
        if (finalPrices.source === 'fallback' && nisab) {
          finalPrices.source = 'api'; // We have some API data now
        }
      }

      this.saveToCache(finalPrices, currency, nisabStandard);
      return finalPrices;
    } catch (error) {
      console.warn('Failed to fetch metal prices from API, using fallback:', error);
      return this.getFallbackPrices(currency);
    }
  }

  /**
   * Fetch prices from freegoldapi.com CSV endpoints
   */
  private static async fetchMetalPricesFromAPI(currency: string = 'USD'): Promise<MetalPrices> {
    // Fetch both gold prices and ratio data
    const [goldResponse, ratioResponse] = await Promise.all([
      fetch(METAL_PRICE_CONSTANTS.GOLD_PRICE_API),
      fetch(METAL_PRICE_CONSTANTS.GOLD_SILVER_RATIO_API)
    ]);

    if (!goldResponse.ok || !ratioResponse.ok) {
      throw new Error(`HTTP error: gold=${goldResponse.status}, ratio=${ratioResponse.status}`);
    }

    const goldCSV = await goldResponse.text();
    const ratioCSV = await ratioResponse.text();

    // Parse CSV data
    const goldData = this.parseGoldCSV(goldCSV);
    const ratioData = this.parseRatioCSV(ratioCSV);

    if (!goldData.length) {
      throw new Error('No gold price data found');
    }

    // Get most recent data
    const latestGold = goldData[goldData.length - 1];
    const latestRatio = ratioData.length > 0 ? ratioData[ratioData.length - 1] : null;

    // Calculate prices in USD
    const goldPricePerOunce = latestGold.price;
    const goldToSilverRatio = latestRatio?.silver_oz_per_gold_oz || METAL_PRICE_CONSTANTS.DEFAULT_GOLD_TO_SILVER_RATIO;
    const silverPricePerOunce = goldPricePerOunce / goldToSilverRatio;

    // Convert to per gram
    const goldPricePerGramUSD = goldPricePerOunce / METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE;
    const silverPricePerGramUSD = silverPricePerOunce / METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE;

    // Get exchange rate and convert to target currency
    const exchangeRate = await this.getExchangeRate(currency);
    const goldPricePerGram = goldPricePerGramUSD * exchangeRate;
    const silverPricePerGram = silverPricePerGramUSD * exchangeRate;

    // Calculate Nisab thresholds
    const goldNisab = METAL_PRICE_CONSTANTS.NISAB_GOLD_GRAMS * goldPricePerGram;
    const silverNisab = METAL_PRICE_CONSTANTS.NISAB_SILVER_GRAMS * silverPricePerGram;

    return {
      goldPricePerGram,
      silverPricePerGram,
      goldNisab,
      silverNisab,
      lastUpdated: new Date().toISOString(),
      source: 'api',
      goldToSilverRatio,
      currency,
      exchangeRate
    };
  }

  /**
   * Parse gold price CSV data
   */
  private static parseGoldCSV(csv: string): CSVRow[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const data: CSVRow[] = [];

    // Skip header and parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [date, price, source] = line.split(',').map(s => s.trim());

      if (date && price && !isNaN(parseFloat(price))) {
        data.push({
          date,
          price: parseFloat(price)
        });
      }
    }

    return data;
  }

  /**
   * Parse gold-to-silver ratio CSV data
   */
  private static parseRatioCSV(csv: string): CSVRow[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const data: CSVRow[] = [];

    // Skip header and parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [date, price, currency, ratio] = line.split(',').map(s => s.trim());

      if (date && price && ratio && !isNaN(parseFloat(ratio))) {
        data.push({
          date,
          price: parseFloat(price),
          currency,
          silver_oz_per_gold_oz: parseFloat(ratio)
        });
      }
    }

    return data;
  }

  /**
   * Get fallback prices when API fails
   */
  private static async getFallbackPrices(currency: string = 'USD'): Promise<MetalPrices> {
    const goldPricePerGramUSD = METAL_PRICE_CONSTANTS.FALLBACK_GOLD_PRICE_PER_GRAM;
    const silverPricePerGramUSD = METAL_PRICE_CONSTANTS.FALLBACK_SILVER_PRICE_PER_GRAM;

    // Get exchange rate and convert to target currency
    const exchangeRate = await this.getExchangeRate(currency);
    const goldPricePerGram = goldPricePerGramUSD * exchangeRate;
    const silverPricePerGram = silverPricePerGramUSD * exchangeRate;

    return {
      goldPricePerGram,
      silverPricePerGram,
      goldNisab: METAL_PRICE_CONSTANTS.NISAB_GOLD_GRAMS * goldPricePerGram,
      silverNisab: METAL_PRICE_CONSTANTS.NISAB_SILVER_GRAMS * silverPricePerGram,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
      goldToSilverRatio: METAL_PRICE_CONSTANTS.DEFAULT_GOLD_TO_SILVER_RATIO,
      currency,
      exchangeRate
    };
  }

  /**
   * Get exchange rate from USD to target currency
   */
  private static async getExchangeRate(currency: string): Promise<number> {
    if (currency === 'USD') return 1;

    try {
      // Use the exchange rate fallback service
      const rateData = await ExchangeRateFallbackService.getExchangeRate(currency);
      return rateData.rate;
    } catch (error) {
      console.warn(`Failed to get exchange rate for ${currency} from fallback service:`, error);
      // Fallback to original implementation
      try {
        const response = await fetch(`https://open.er-api.com/v6/latest/USD`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const rate = data.rates[currency];

        if (rate) {
          console.log(`Exchange rate USD/${currency}: ${rate}`);

          // Sanity check for PKR (Feb 2026 expected range 270-300)
          if (currency === 'PKR' && (rate < 200 || rate > 400)) {
            console.warn(`PKR rate ${rate} seems suspicious, using fallback`);
            return 279.5;
          }

          return rate;
        }

        throw new Error(`Currency ${currency} not supported by er-api`);
      } catch (error) {
        console.warn(`Failed to get exchange rate for ${currency}, using fallback:`, error);
        // Comprehensive fallback rates for common Islamic-world currencies
        const fallbackRates: Record<string, number> = {
          'PKR': 279.5,  // Pakistan Rupee
          'AED': 3.67,   // UAE Dirham
          'SAR': 3.75,   // Saudi Riyal
          'BDT': 110.0,  // Bangladesh Taka
          'EGP': 30.9,   // Egypt Pound
          'TRY': 30.2,   // Turkish Lira
          'MYR': 4.73,   // Malaysian Ringgit
          'IDR': 15600,  // Indonesian Rupiah
          'EUR': 0.92,
          'GBP': 0.79,
          'JPY': 149.5,
          'CAD': 1.36,
          'AUD': 1.53,
          'INR': 83.0,
        };
        return fallbackRates[currency] || 1;
      }
    }
  }
  /**
   * Get cached prices if still valid
   */
  static getCachedPrices(
    currency: string = 'USD',
    nisabStandard: 'classical' | 'common' = 'classical'
  ): MetalPrices | null {
    try {
      const cacheKey = `${METAL_PRICE_CONSTANTS.CACHE_KEY}-${currency}-${nisabStandard}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;

      const cachedData: CachedPrices = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      const maxAge = METAL_PRICE_CONSTANTS.CACHE_TTL_MINUTES * 60 * 1000;

      if (cacheAge > maxAge) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error reading cached prices:', error);
      sessionStorage.removeItem(`${METAL_PRICE_CONSTANTS.CACHE_KEY}-${currency}-${nisabStandard}`);
      return null;
    }
  }

  /**
   * Save prices to cache
   */
  private static saveToCache(
    prices: MetalPrices,
    currency: string = 'USD',
    nisabStandard: 'classical' | 'common' = 'classical'
  ): void {
    try {
      const cacheKey = `${METAL_PRICE_CONSTANTS.CACHE_KEY}-${currency}-${nisabStandard}`;
      const cachedData: CachedPrices = {
        data: prices,
        timestamp: Date.now()
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving prices to cache:', error);
    }
  }

  /**
   * Clear cached prices
   */
  static clearCache(currency?: string): void {
    if (currency) {
      sessionStorage.removeItem(`${METAL_PRICE_CONSTANTS.CACHE_KEY}-${currency}`);
    } else {
      // Clear all currency-specific caches
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(METAL_PRICE_CONSTANTS.CACHE_KEY)) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Force refresh prices from API
   */
  static async refreshPrices(
    currency: string = 'USD',
    nisabStandard: 'classical' | 'common' = 'classical'
  ): Promise<MetalPrices> {
    this.clearCache(currency);
    ZakatNisabService.clearCache(currency);
    return this.getPrices(currency, nisabStandard);
  }
}
