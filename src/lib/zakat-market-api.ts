/**
 * Noor Connect — Ultra-Smart Shariah Zakat & Nisab Market Rates Engine
 * 100% Offline-First with Live Bullion Fetching & Zero ₹0.00/g Bug Guarantee
 */

export const TROY_OUNCE_IN_GRAMS = 31.1034768;
export const TOLA_IN_GRAMS = 11.6638038;

export const SILVER_NISAB_GRAMS = 612.36; // 52.5 Tola
export const GOLD_NISAB_GRAMS = 87.48;   // 7.5 Tola
export const ZAKAT_RATE = 0.025;         // 2.5% (1/40th)
export const USHR_HARVEST_THRESHOLD_KG = 653; // 5 Wasq (approx 653 kg)

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  baselineGoldPerGram: number;
  baselineSilverPerGram: number;
}

export const SUPPORTED_CURRENCIES: CurrencyConfig[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', baselineGoldPerGram: 7850, baselineSilverPerGram: 96 },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', baselineGoldPerGram: 88.50, baselineSilverPerGram: 1.08 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', flag: '🇸🇦', baselineGoldPerGram: 332, baselineSilverPerGram: 4.05 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', baselineGoldPerGram: 325, baselineSilverPerGram: 3.96 },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', flag: '🇵🇰', baselineGoldPerGram: 24600, baselineSilverPerGram: 300 },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', flag: '🇧🇩', baselineGoldPerGram: 10500, baselineSilverPerGram: 128 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', baselineGoldPerGram: 68.50, baselineSilverPerGram: 0.84 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', baselineGoldPerGram: 82.00, baselineSilverPerGram: 1.00 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', baselineGoldPerGram: 395, baselineSilverPerGram: 4.80 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', baselineGoldPerGram: 1420000, baselineSilverPerGram: 17300 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', baselineGoldPerGram: 3050, baselineSilverPerGram: 37.20 },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', flag: '🇨🇦', baselineGoldPerGram: 120.50, baselineSilverPerGram: 1.47 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', baselineGoldPerGram: 134.00, baselineSilverPerGram: 1.64 },
];

export const GOLD_KARAT_MULTIPLIERS: Record<number, { label: string; multiplier: number }> = {
  24: { label: '24K (99.9% Pure)', multiplier: 1.0 },
  22: { label: '22K (91.6% Standard)', multiplier: 22 / 24 },
  21: { label: '21K (87.5% Arab)', multiplier: 21 / 24 },
  18: { label: '18K (75.0% Jewelry)', multiplier: 18 / 24 },
};

export interface LiveMetalRates {
  currency: string;
  goldPerGram: number;
  goldPerTola: number;
  silverPerGram: number;
  silverPerTola: number;
  timestamp: number;
  source: 'live' | 'override' | 'cached' | 'baseline';
  isOverridden: boolean;
  rawDateStr?: string;
}

export interface PriceOverride {
  goldPerGram: number;
  silverPerGram: number;
  updatedAt: number;
}

const STORAGE_RATES_KEY = 'noor_zakat_metal_rates_v1';
const STORAGE_OVERRIDES_KEY = 'noor_zakat_price_overrides_v1';
const STORAGE_CURRENCY_KEY = 'noor_zakat_currency';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache

export function getCurrencyConfig(code: string): CurrencyConfig {
  const normalized = (code || 'INR').toUpperCase();
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === normalized);
  return found || SUPPORTED_CURRENCIES[0];
}

export function getSavedCurrency(): string {
  try {
    const saved = localStorage.getItem(STORAGE_CURRENCY_KEY) || localStorage.getItem('preferred-currency');
    if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved.toUpperCase())) {
      return saved.toUpperCase();
    }
  } catch {
    // Local storage access fallback
  }
  return 'INR';
}

export function saveCurrency(currency: string): void {
  try {
    const upper = currency.toUpperCase();
    localStorage.setItem(STORAGE_CURRENCY_KEY, upper);
    localStorage.setItem('preferred-currency', upper);
    window.dispatchEvent(new CustomEvent('noor-currency-updated', { detail: { currency: upper } }));
  } catch {
    // Local storage access fallback
  }
}

export function getPriceOverride(currency: string): PriceOverride | null {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[currency.toUpperCase()] || null;
  } catch {
    return null;
  }
}

export function setPriceOverride(currency: string, override: { goldPerGram: number; silverPerGram: number }): void {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
    const existing = raw ? JSON.parse(raw) : {};
    existing[currency.toUpperCase()] = {
      goldPerGram: Math.max(0, override.goldPerGram),
      silverPerGram: Math.max(0, override.silverPerGram),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage write issues
  }
}

export function clearPriceOverride(currency: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_OVERRIDES_KEY);
    if (!raw) return null;
    const existing = JSON.parse(raw);
    delete existing[currency.toUpperCase()];
    localStorage.setItem(STORAGE_OVERRIDES_KEY, JSON.stringify(existing));
  } catch {
    // Ignore storage write issues
  }
}

/**
 * Fetch live metal rates for a currency with zero ₹0.00/g guarantee:
 * 1. Checks user price overrides first.
 * 2. Checks local cached live rates if fresh.
 * 3. Fetches from global jsDelivr CDN API (or Cloudflare Pages backup).
 * 4. Falls back to baseline 2026 rates if completely offline on first launch.
 */
export async function fetchLiveMetalRates(currencyCode?: string, forceRefresh = false): Promise<LiveMetalRates> {
  const code = (currencyCode || getSavedCurrency()).toUpperCase();
  const cfg = getCurrencyConfig(code);
  const curKey = code.toLowerCase();

  // 1. Check for manual override
  const override = getPriceOverride(code);
  if (override && override.goldPerGram > 0 && override.silverPerGram > 0) {
    return {
      currency: code,
      goldPerGram: override.goldPerGram,
      goldPerTola: Math.round(override.goldPerGram * TOLA_IN_GRAMS * 100) / 100,
      silverPerGram: override.silverPerGram,
      silverPerTola: Math.round(override.silverPerGram * TOLA_IN_GRAMS * 100) / 100,
      timestamp: override.updatedAt,
      source: 'override',
      isOverridden: true,
    };
  }

  // 2. Check localStorage cache if not forced
  if (!forceRefresh) {
    try {
      const rawCache = localStorage.getItem(STORAGE_RATES_KEY);
      if (rawCache) {
        const cache = JSON.parse(rawCache);
        const item = cache[code];
        if (item && Date.now() - item.timestamp < CACHE_TTL_MS && item.goldPerGram > 0 && item.silverPerGram > 0) {
          return {
            ...item,
            currency: code,
            source: 'cached',
            isOverridden: false,
          };
        }
      }
    } catch {
      // Ignore cache read failures
    }
  }

  // 3. Multi-source live bullion fetch
  const fetchEndpoints = async (base: string) => {
    const [goldRes, silverRes] = await Promise.all([
      fetch(`${base}/xau.json`, { cache: 'no-store' }),
      fetch(`${base}/xag.json`, { cache: 'no-store' }),
    ]);
    if (!goldRes.ok || !silverRes.ok) {
      throw new Error(`HTTP error: gold=${goldRes.status}, silver=${silverRes.status}`);
    }
    const [goldData, silverData] = await Promise.all([goldRes.json(), silverRes.json()]);
    return { goldData, silverData };
  };

  try {
    let result: {
      goldData: { date?: string; xau?: Record<string, number> };
      silverData: { date?: string; xag?: Record<string, number> };
    } | null = null;
    try {
      result = await fetchEndpoints('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies');
    } catch {
      result = await fetchEndpoints('https://latest.currency-api.pages.dev/v1/currencies');
    }

    if (result && result.goldData?.xau && result.silverData?.xag) {
      const rawGoldOunce = result.goldData.xau[curKey];
      const rawSilverOunce = result.silverData.xag[curKey];

      if (rawGoldOunce > 0 && rawSilverOunce > 0) {
        const goldPerGram = Math.round((rawGoldOunce / TROY_OUNCE_IN_GRAMS) * 100) / 100;
        const silverPerGram = Math.round((rawSilverOunce / TROY_OUNCE_IN_GRAMS) * 100) / 100;
        const goldPerTola = Math.round(goldPerGram * TOLA_IN_GRAMS * 100) / 100;
        const silverPerTola = Math.round(silverPerGram * TOLA_IN_GRAMS * 100) / 100;

        const liveRate: LiveMetalRates = {
          currency: code,
          goldPerGram,
          goldPerTola,
          silverPerGram,
          silverPerTola,
          timestamp: Date.now(),
          source: 'live',
          isOverridden: false,
          rawDateStr: result.goldData.date || new Date().toISOString().split('T')[0],
        };

        // Cache result in localStorage
        try {
          const rawCache = localStorage.getItem(STORAGE_RATES_KEY);
          const cache = rawCache ? JSON.parse(rawCache) : {};
          cache[code] = liveRate;
          localStorage.setItem(STORAGE_RATES_KEY, JSON.stringify(cache));
        } catch {
          // Ignore cache write issues
        }

        return liveRate;
      }
    }
  } catch (err) {
    console.warn(`[ZakatMarketAPI] Live bullion rate fetch failed for ${code}, falling back:`, err);
  }

  // 4. Try stale cache before baseline
  try {
    const rawCache = localStorage.getItem(STORAGE_RATES_KEY);
    if (rawCache) {
      const cache = JSON.parse(rawCache);
      const item = cache[code];
      if (item && item.goldPerGram > 0 && item.silverPerGram > 0) {
        return {
          ...item,
          currency: code,
          source: 'cached',
          isOverridden: false,
        };
      }
    }
  } catch {
    // Ignore cache read failures
  }

  // 5. Hardcoded accurate 2026 baseline — guarantees zero 0.00/g bug!
  const gGram = cfg.baselineGoldPerGram;
  const sGram = cfg.baselineSilverPerGram;
  return {
    currency: code,
    goldPerGram: gGram,
    goldPerTola: Math.round(gGram * TOLA_IN_GRAMS * 100) / 100,
    silverPerGram: sGram,
    silverPerTola: Math.round(sGram * TOLA_IN_GRAMS * 100) / 100,
    timestamp: Date.now(),
    source: 'baseline',
    isOverridden: false,
  };
}

/**
 * Format currency with locale and symbol
 */
export function formatCurrencyAmount(amount: number, currencyCode: string): string {
  const cfg = getCurrencyConfig(currencyCode);
  const rounded = Math.round(Math.max(0, amount));
  try {
    return `${cfg.symbol}${rounded.toLocaleString('en-IN')}`;
  } catch {
    return `${cfg.symbol}${rounded.toFixed(0)}`;
  }
}

/**
 * Authentic Islamic Livestock (An'am) Zakat Rules
 */
export interface LivestockResult {
  dueText: string;
  isZakatable: boolean;
  notes: string[];
}

export function calculateLivestockZakat(sheepCount: number, cattleCount: number, camelCount: number): LivestockResult {
  const notes: string[] = [];
  let isZakatable = false;

  // Sheep & Goats (Ghanam)
  if (sheepCount >= 40) {
    isZakatable = true;
    if (sheepCount <= 120) {
      notes.push(`Sheep/Goats (${sheepCount}): 1 sheep or goat`);
    } else if (sheepCount <= 200) {
      notes.push(`Sheep/Goats (${sheepCount}): 2 sheep or goats`);
    } else if (sheepCount <= 399) {
      notes.push(`Sheep/Goats (${sheepCount}): 3 sheep or goats`);
    } else {
      const hundreds = Math.floor(sheepCount / 100);
      notes.push(`Sheep/Goats (${sheepCount}): ${hundreds} sheep or goats (1 per 100)`);
    }
  } else if (sheepCount > 0) {
    notes.push(`Sheep/Goats (${sheepCount}): Below Nisab (minimum 40 required)`);
  }

  // Cattle & Buffaloes (Baqar)
  if (cattleCount >= 30) {
    isZakatable = true;
    if (cattleCount <= 39) {
      notes.push(`Cattle (${cattleCount}): 1 Tabi' (one-year-old male or female calf)`);
    } else if (cattleCount <= 59) {
      notes.push(`Cattle (${cattleCount}): 1 Musinnah (two-year-old female cow)`);
    } else {
      // 30s and 40s rule
      const tabis = Math.floor(cattleCount / 30);
      notes.push(`Cattle (${cattleCount}): ${tabis} Tabi' (or combination of 1 Musinnah per 40 / 1 Tabi per 30)`);
    }
  } else if (cattleCount > 0) {
    notes.push(`Cattle (${cattleCount}): Below Nisab (minimum 30 required)`);
  }

  // Camels (Ibil)
  if (camelCount >= 5) {
    isZakatable = true;
    if (camelCount <= 9) notes.push(`Camels (${camelCount}): 1 sheep or goat`);
    else if (camelCount <= 14) notes.push(`Camels (${camelCount}): 2 sheep or goats`);
    else if (camelCount <= 19) notes.push(`Camels (${camelCount}): 3 sheep or goats`);
    else if (camelCount <= 24) notes.push(`Camels (${camelCount}): 4 sheep or goats`);
    else if (camelCount <= 35) notes.push(`Camels (${camelCount}): 1 Bint Makhad (one-year female camel)`);
    else notes.push(`Camels (${camelCount}): Due according to camel brackets`);
  } else if (camelCount > 0) {
    notes.push(`Camels (${camelCount}): Below Nisab (minimum 5 required)`);
  }

  return {
    isZakatable,
    dueText: notes.length > 0 ? notes.join(' • ') : 'No livestock zakat due',
    notes,
  };
}

/**
 * Authentic Islamic Agricultural Ushr Calculator
 */
export function calculateUshr(
  harvestValue: number,
  irrigationType: 'rain' | 'artificial' | 'mixed'
): { rate: number; due: number; label: string; percentage: string } {
  let rate = 0.10; // 10%
  let label = 'Natural Rain/River (10% Ushr)';
  let percentage = '10%';

  if (irrigationType === 'artificial') {
    rate = 0.05; // 5%
    label = 'Paid/Artificial Irrigation (5% Nisf Ushr)';
    percentage = '5%';
  } else if (irrigationType === 'mixed') {
    rate = 0.075; // 7.5%
    label = 'Mixed Irrigation (7.5%)';
    percentage = '7.5%';
  }

  const due = Math.round(Math.max(0, harvestValue) * rate);
  return { rate, due, label, percentage };
}
