/**
 * Zakat Nisab Service
 * Fetches Zakat Nisab values from Islamic API with caching and fallback logic
 */

import { METAL_PRICE_CONSTANTS } from './constants';
import { ExchangeRateFallbackService } from './exchange-rate-fallback';

export interface ZakatNisabData {
  gold: {
    weight: number;
    unit_price: number;
    nisab_amount: number;
  };
  silver: {
    weight: number;
    unit_price: number;
    nisab_amount: number;
  };
}

export interface ZakatNisabResponse {
  code: number;
  status: 'success' | 'error';
  calculation_standard: 'classical' | 'common';
  currency: string;
  weight_unit: 'gram' | 'oz';
  updated_at: string;
  data: {
    nisab_thresholds: ZakatNisabData;
    zakat_rate: string;
    notes: string;
  };
  message?: string; // For error responses
}

interface CachedNisab {
  data: ZakatNisabResponse;
  timestamp: number;
}

export class ZakatNisabService {
  private static hasConfiguredApiKey(): boolean {
    const apiKey = METAL_PRICE_CONSTANTS.ISLAMIC_API_KEY;
    return Boolean(apiKey && apiKey.length > 0);
  }

  /**
   * Get current Zakat Nisab values with caching
   */
  static async getNisab(
    currency: string = 'USD',
    standard: 'classical' | 'common' = 'classical',
    unit: 'g' | 'oz' = 'g'
  ): Promise<ZakatNisabResponse> {
    try {
      // Check cache first
      const cached = this.getCachedNisab(currency, standard, unit);
      if (cached) {
        return cached;
      }

      if (!this.hasConfiguredApiKey()) {
        return this.getFallbackNisab(currency, standard, unit);
      }

      // Try to fetch from Islamic API
      const apiData = await this.fetchFromIslamicAPI(currency, standard, unit);
      this.saveToCache(apiData, currency, standard, unit);
      return apiData;
    } catch (error) {
      console.warn('Failed to fetch Zakat Nisab from Islamic API, using fallback:', error);
      return this.getFallbackNisab(currency, standard, unit);
    }
  }

  /**
   * Fetch Nisab data from Islamic API
   */
  private static async fetchFromIslamicAPI(
    currency: string,
    standard: 'classical' | 'common',
    unit: 'g' | 'oz'
  ): Promise<ZakatNisabResponse> {
    const apiKey: string = METAL_PRICE_CONSTANTS.ISLAMIC_API_KEY;
    
    // Skip API call if no API key is configured
    if (!this.hasConfiguredApiKey()) {
      throw new Error('Islamic API key not configured');
    }

    const url = new URL(METAL_PRICE_CONSTANTS.ZAKAT_NISAB_API);
    url.searchParams.append('standard', standard);
    url.searchParams.append('currency', currency.toLowerCase());
    url.searchParams.append('unit', unit);
    url.searchParams.append('api_key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data: ZakatNisabResponse = await response.json();

    if (data.status === 'error') {
      throw new Error(data.message || 'Unknown API error');
    }

    if (data.code !== 200) {
      throw new Error(`API returned code ${data.code}`);
    }

    return data;
  }

  /**
   * Get fallback Nisab values when API fails
   */
  private static async getFallbackNisab(
    currency: string,
    standard: 'classical' | 'common',
    unit: 'g' | 'oz'
  ): Promise<ZakatNisabResponse> {
    // Use standard weights based on calculation standard
    const goldWeight = standard === 'classical' ? 87.48 : 85;
    const silverWeight = standard === 'classical' ? 612.36 : 595;

    // Convert to ounces if needed
    const goldWeightOunces = unit === 'oz' ? goldWeight / METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE : goldWeight;
    const silverWeightOunces = unit === 'oz' ? silverWeight / METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE : silverWeight;

    // Use fallback prices (per gram)
    const goldPricePerGram = METAL_PRICE_CONSTANTS.FALLBACK_GOLD_PRICE_PER_GRAM;
    const silverPricePerGram = METAL_PRICE_CONSTANTS.FALLBACK_SILVER_PRICE_PER_GRAM;

    // Convert to per ounce if needed
    const goldPricePerUnit = unit === 'oz' ? goldPricePerGram * METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE : goldPricePerGram;
    const silverPricePerUnit = unit === 'oz' ? silverPricePerGram * METAL_PRICE_CONSTANTS.GRAMS_PER_TROY_OUNCE : silverPricePerGram;

    // Get exchange rate for currency conversion
    const exchangeRate = await this.getExchangeRate(currency);
    const goldPricePerUnitLocal = goldPricePerUnit * exchangeRate;
    const silverPricePerUnitLocal = silverPricePerUnit * exchangeRate;

    const goldNisabAmount = goldWeight * goldPricePerUnitLocal;
    const silverNisabAmount = silverWeight * silverPricePerUnitLocal;

    return {
      code: 200,
      status: 'success',
      calculation_standard: standard,
      currency: currency.toLowerCase(),
      weight_unit: unit === 'oz' ? 'oz' : 'gram',
      updated_at: new Date().toISOString(),
      data: {
        nisab_thresholds: {
          gold: {
            weight: unit === 'oz' ? goldWeightOunces : goldWeight,
            unit_price: goldPricePerUnitLocal,
            nisab_amount: goldNisabAmount
          },
          silver: {
            weight: unit === 'oz' ? silverWeightOunces : silverWeight,
            unit_price: silverPricePerUnitLocal,
            nisab_amount: silverNisabAmount
          }
        },
        zakat_rate: '2.5%',
        notes: 'Nisab values are calculated using fallback market prices'
      }
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
          return rate;
        }

        throw new Error(`Currency ${currency} not supported by er-api`);
      } catch (error) {
        console.warn(`Failed to get exchange rate for ${currency}, using fallback:`, error);
        // Comprehensive fallback rates for common Islamic-world currencies
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
        return fallbackRates[currency] || 1;
      }
    }
  }

  /**
   * Get cached Nisab data if still valid
   */
  static getCachedNisab(
    currency: string = 'USD',
    standard: 'classical' | 'common' = 'classical',
    unit: 'g' | 'oz' = 'g'
  ): ZakatNisabResponse | null {
    try {
      const cacheKey = `zakat-nisab-${currency}-${standard}-${unit}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;

      const cachedData: CachedNisab = JSON.parse(cached);
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;
      const maxAge = METAL_PRICE_CONSTANTS.CACHE_TTL_MINUTES * 60 * 1000;

      if (cacheAge > maxAge) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }

      return cachedData.data;
    } catch (error) {
      console.error('Error reading cached nisab data:', error);
      sessionStorage.removeItem(`zakat-nisab-${currency}-${standard}-${unit}`);
      return null;
    }
  }

  /**
   * Save Nisab data to cache
   */
  private static saveToCache(
    data: ZakatNisabResponse,
    currency: string = 'USD',
    standard: 'classical' | 'common' = 'classical',
    unit: 'g' | 'oz' = 'g'
  ): void {
    try {
      const cacheKey = `zakat-nisab-${currency}-${standard}-${unit}`;
      const cachedData: CachedNisab = {
        data,
        timestamp: Date.now()
      };

      sessionStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.error('Error saving nisab data to cache:', error);
    }
  }

  /**
   * Clear cached Nisab data
   */
  static clearCache(currency?: string): void {
    if (currency) {
      // Clear all variations for the specified currency
      ['classical', 'common'].forEach(standard => {
        ['g', 'oz'].forEach(unit => {
          sessionStorage.removeItem(`zakat-nisab-${currency}-${standard}-${unit}`);
        });
      });
    } else {
      // Clear all nisab caches
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('zakat-nisab-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }

  /**
   * Force refresh Nisab data from API
   */
  static async refreshNisab(
    currency: string = 'USD',
    standard: 'classical' | 'common' = 'classical',
    unit: 'g' | 'oz' = 'g'
  ): Promise<ZakatNisabResponse> {
    this.clearCache(currency);
    return this.getNisab(currency, standard, unit);
  }
}
