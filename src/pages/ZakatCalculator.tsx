import { useMemo, useState, useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator, DollarSign, Info, Coins, Banknote, Building, Car, RefreshCw, AlertCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutManager } from "@/components/LayoutManager";
import { MetalPricesService, MetalPrices } from "@/lib/metalPrices";
import { ZakatNisabService } from "@/lib/zakatNisab";
import { METAL_PRICE_CONSTANTS } from "@/lib/constants";
import { ExchangeRateFallbackService } from "@/lib/exchange-rate-fallback";

interface ZakatAssets {
  cash: number;
  bankBalance: number;
  gold: number;
  silver: number;
  stocks: number;
  businessAssets: number;
  receivables: number;
  otherAssets: number;
}

interface GoldCalculator {
  amount: number;
  karat: number;
  unit: 'grams' | 'tolas' | 'ounces';
}

interface SilverCalculator {
  amount: number;
  purity: number;
  unit: 'grams' | 'tolas' | 'ounces';
}

interface ZakatLiabilities {
  debts: number;
  loans: number;
  bills: number;
}

const ZAKAT_STORAGE_KEY = 'zakat-calculator-data';
const ZAKAT_RATE = 0.025; // 2.5%

// Gold karat options with purity percentages
const GOLD_KARAT_OPTIONS = [
  { value: 24, label: '24K (Pure Gold)', purity: 1.0 },
  { value: 22, label: '22K', purity: 0.916 },
  { value: 21, label: '21K', purity: 0.875 },
  { value: 20, label: '20K', purity: 0.833 },
  { value: 18, label: '18K', purity: 0.75 },
  { value: 16, label: '16K', purity: 0.667 },
  { value: 14, label: '14K', purity: 0.583 },
  { value: 12, label: '12K', purity: 0.5 },
  { value: 10, label: '10K', purity: 0.417 },
  { value: 9, label: '9K', purity: 0.375 },
  { value: 8, label: '8K', purity: 0.333 },
];

// Silver purity options
const SILVER_PURITY_OPTIONS = [
  { value: 999, label: '999 (Fine Silver)', purity: 0.999 },
  { value: 958, label: '958 (Britannia)', purity: 0.958 },
  { value: 925, label: '925 (Sterling)', purity: 0.925 },
  { value: 900, label: '900 (Coin Silver)', purity: 0.900 },
  { value: 835, label: '835 (Continental)', purity: 0.835 },
  { value: 800, label: '800 (Standard)', purity: 0.800 },
];

// Unit conversion factors to grams
const UNIT_CONVERSIONS = {
  grams: 1,
  tolas: 11.6638, // 1 tola = 11.6638 grams
  ounces: 31.1035, // 1 troy ounce = 31.1035 grams
};

const FALLBACK_CURRENCIES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD",
  "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CUP", "CVE", "CZK",
  "DJF", "DKK", "DOP", "DZD",
  "EGP", "ERN", "ETB", "EUR",
  "FJD", "FKP",
  "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD",
  "HKD", "HNL", "HRK", "HTG", "HUF",
  "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY",
  "KES", "KGS", "KHR", "KMF", "KRW", "KWD", "KYD", "KZT",
  "LAK", "LBP", "LKR", "LRD", "LSL", "LYD",
  "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN",
  "NAD", "NGN", "NIO", "NOK", "NPR", "NZD",
  "OMR",
  "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG",
  "QAR",
  "RON", "RSD", "RUB", "RWF",
  "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP", "STN", "SYP", "SZL",
  "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS",
  "UAH", "UGX", "USD", "UYU", "UZS",
  "VES", "VND", "VUV",
  "WST",
  "XAF", "XCD", "XOF", "XPF",
  "YER",
  "ZAR", "ZMW", "ZWL"
];

export default function ZakatCalculator() {
  const [assets, setAssets] = useState<ZakatAssets>({
    cash: 0,
    bankBalance: 0,
    gold: 0,
    silver: 0,
    stocks: 0,
    businessAssets: 0,
    receivables: 0,
    otherAssets: 0,
  });

  const [liabilities, setLiabilities] = useState<ZakatLiabilities>({
    debts: 0,
    loans: 0,
    bills: 0,
  });

  const [metalPrices, setMetalPrices] = useState<MetalPrices | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [currency, setCurrency] = useState(() => localStorage.getItem('preferred-currency') || 'USD');
  const [nisabStandard, setNisabStandard] = useState<'classical' | 'common'>('classical');
  const [exchangeRateData, setExchangeRateData] = useState<{ rate: number; lastUpdated: string; source: string } | null>(null);
  const [goldCalculator, setGoldCalculator] = useState<GoldCalculator>({
    amount: 0,
    karat: 24,
    unit: 'grams'
  });

  const [silverCalculator, setSilverCalculator] = useState<SilverCalculator>({
    amount: 0,
    purity: 925,
    unit: 'grams'
  });

  // Load metal prices on component mount
  useEffect(() => {
    loadMetalPrices();
    loadExchangeRate();
    // Setup online listeners
    ExchangeRateFallbackService.setupOnlineListeners();
  }, []);

  const loadExchangeRate = async () => {
    if (currency === 'USD') {
      setExchangeRateData({ rate: 1, lastUpdated: new Date().toISOString(), source: 'api' });
      return;
    }

    try {
      const rateData = await ExchangeRateFallbackService.getExchangeRate(currency);
      setExchangeRateData({
        rate: rateData.rate,
        lastUpdated: rateData.lastUpdated,
        source: rateData.source
      });
    } catch (error) {
      console.error('Failed to load exchange rate:', error);
    }
  };

  const loadMetalPrices = async () => {
    try {
      setIsLoadingPrices(true);
      setPriceError(null);
      const prices = await MetalPricesService.getPrices(currency, nisabStandard);
      setMetalPrices(prices);
    } catch (error) {
      console.error('Failed to load metal prices:', error);
      setPriceError('Failed to load current metal prices');
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const refreshPrices = async () => {
    try {
      setIsLoadingPrices(true);
      setPriceError(null);
      const prices = await MetalPricesService.refreshPrices(currency, nisabStandard);
      setMetalPrices(prices);
    } catch (error) {
      console.error('Failed to refresh metal prices:', error);
      setPriceError('Failed to refresh metal prices');
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Clear cache and reload when currency or nisabStandard changes to ensure fresh rates
  useEffect(() => {
    // Clear any existing cache for the new currency and standard
    MetalPricesService.clearCache(currency);
    ZakatNisabService.clearCache(currency);
    loadMetalPrices();
    loadExchangeRate();
  }, [currency, nisabStandard]);

  const currencyOptions = useMemo(() => {
    try {
      const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      const list = typeof anyIntl.supportedValuesOf === "function" ? anyIntl.supportedValuesOf("currency") : FALLBACK_CURRENCIES;
      return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    } catch {
      return FALLBACK_CURRENCIES;
    }
  }, []);

  const currencySymbol = useMemo(() => {
    try {
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).formatToParts(0);
      return parts.find((p) => p.type === "currency")?.value || currency;
    } catch {
      return currency;
    }
  }, [currency]);

  const formatMoney = useMemo(() => {
    return (amount: number) => {
      const safe = Number.isFinite(amount) ? amount : 0;
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          currencyDisplay: "symbol",
        }).format(safe);
      } catch {
        return `${currency} ${safe.toFixed(2)}`;
      }
    };
  }, [currency]);

  useEffect(() => {
    const saved = localStorage.getItem(ZAKAT_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.assets) setAssets(data.assets);
        if (data.liabilities) setLiabilities(data.liabilities);
        if (data.currency) setCurrency(data.currency);
        if (data.nisabStandard) setNisabStandard(data.nisabStandard);
        if (data.goldCalculator) setGoldCalculator(data.goldCalculator);
        if (data.silverCalculator) setSilverCalculator(data.silverCalculator);
      } catch (e) {
        console.error('Failed to parse saved zakat data');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(ZAKAT_STORAGE_KEY, JSON.stringify({
      assets,
      liabilities,
      currency,
      nisabStandard,
      goldCalculator,
      silverCalculator,
    }));
  }, [assets, liabilities, currency, nisabStandard, goldCalculator, silverCalculator]);

  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Use metal prices from API or fallback with proper currency conversion
  const goldPrice = metalPrices?.goldPricePerGram ||
    (METAL_PRICE_CONSTANTS.FALLBACK_GOLD_PRICE_PER_GRAM * (metalPrices?.exchangeRate || 1));
  const silverPrice = metalPrices?.silverPricePerGram ||
    (METAL_PRICE_CONSTANTS.FALLBACK_SILVER_PRICE_PER_GRAM * (metalPrices?.exchangeRate || 1));

  // Use nisab data from Islamic API when available, otherwise calculate from metal prices
  const nisabGold = metalPrices?.nisabData?.data?.nisab_thresholds?.gold?.nisab_amount ||
    (METAL_PRICE_CONSTANTS.NISAB_GOLD_GRAMS * goldPrice);
  const nisabSilver = metalPrices?.nisabData?.data?.nisab_thresholds?.silver?.nisab_amount ||
    (METAL_PRICE_CONSTANTS.NISAB_SILVER_GRAMS * silverPrice);
  const nisab = Math.min(nisabGold, nisabSilver);
  const isZakatDue = netWorth >= nisab;
  const zakatAmount = isZakatDue ? netWorth * ZAKAT_RATE : 0;

  const updateAsset = (key: keyof ZakatAssets, value: string) => {
    const num = parseFloat(value) || 0;
    setAssets(prev => ({ ...prev, [key]: num }));
  };

  const updateLiability = (key: keyof ZakatLiabilities, value: string) => {
    const num = parseFloat(value) || 0;
    setLiabilities(prev => ({ ...prev, [key]: num }));
  };

  // Calculate gold value based on amount, karat, and current prices
  const calculateGoldValue = useMemo(() => {
    if (!goldCalculator.amount || !goldPrice) return 0;

    const karatOption = GOLD_KARAT_OPTIONS.find(k => k.value === goldCalculator.karat);
    const purity = karatOption?.purity || 1.0;

    // Convert to grams
    const amountInGrams = goldCalculator.amount * UNIT_CONVERSIONS[goldCalculator.unit];

    // Calculate value based on pure gold content
    const pureGoldGrams = amountInGrams * purity;
    const value = pureGoldGrams * goldPrice;

    return value;
  }, [goldCalculator, goldPrice]);

  // Calculate silver value based on amount, purity, and current prices
  const calculateSilverValue = useMemo(() => {
    if (!silverCalculator.amount || !silverPrice) return 0;

    const purityOption = SILVER_PURITY_OPTIONS.find(p => p.value === silverCalculator.purity);
    const purity = purityOption?.purity || 0.925;

    // Convert to grams
    const amountInGrams = silverCalculator.amount * UNIT_CONVERSIONS[silverCalculator.unit];

    // Calculate value based on pure silver content
    const pureSilverGrams = amountInGrams * purity;
    const value = pureSilverGrams * silverPrice;

    return value;
  }, [silverCalculator, silverPrice]);

  // Update gold asset when calculator value changes
  useEffect(() => {
    const calculatedValue = calculateGoldValue;
    setAssets(prev => ({ ...prev, gold: calculatedValue }));
  }, [calculateGoldValue]);

  // Update silver asset when calculator value changes
  useEffect(() => {
    const calculatedValue = calculateSilverValue;
    setAssets(prev => ({ ...prev, silver: calculatedValue }));
  }, [calculateSilverValue]);

  const updateGoldCalculator = (field: keyof GoldCalculator, value: string | number) => {
    setGoldCalculator(prev => ({ ...prev, [field]: value }));
  };

  const updateSilverCalculator = (field: keyof SilverCalculator, value: string | number) => {
    setSilverCalculator(prev => ({ ...prev, [field]: value }));
  };

  const resetCalculator = () => {
    setAssets({
      cash: 0,
      bankBalance: 0,
      gold: 0,
      silver: 0,
      stocks: 0,
      businessAssets: 0,
      receivables: 0,
      otherAssets: 0,
    });
    setLiabilities({ debts: 0, loans: 0, bills: 0 });
    setGoldCalculator({
      amount: 0,
      karat: 24,
      unit: 'grams'
    });
    setSilverCalculator({
      amount: 0,
      purity: 925,
      unit: 'grams'
    });
    setNisabStandard('classical'); // Reset to default
  };

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title="Zakat Calculator" showBack />

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Info Card */}
          <Card className="relative overflow-hidden border-[#C9860A]/20 bg-card shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9860A]/10 rounded-full blur-2xl pointer-events-none" />
            <CardContent className="p-5 relative z-10">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">About Zakat</p>
                  <p className="text-xs text-muted-foreground">
                    Zakat is 2.5% of your total wealth that exceeds the Nisab threshold for one lunar year.
                    Current Nisab ({nisabStandard}): Gold {formatMoney(nisabGold)} | Silver {formatMoney(nisabSilver)}
                  </p>
                  {metalPrices?.nisabData && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ Using Islamic API data ({metalPrices.nisabData.calculation_standard} standard)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Currency */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5 text-[#C9860A]" />
                Currency & Standard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Select currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Display: {currencySymbol} ({currency})
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Nisab Calculation Standard</Label>
                <Select value={nisabStandard} onValueChange={(value: 'classical' | 'common') => setNisabStandard(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classical">
                      Classical (Gold: 87.48g, Silver: 612.36g)
                    </SelectItem>
                    <SelectItem value="common">
                      Common (Gold: 85g, Silver: 595g)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {nisabStandard === 'classical' 
                    ? 'Traditional calculation standard with precise weights'
                    : 'Simplified calculation standard with rounded weights'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Metal Prices */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-muted-foreground">
                <Coins className="w-3.5 h-3.5 text-[#C9860A]" />
                Metal Prices (per gram)
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshPrices}
                  disabled={isLoadingPrices}
                  className="ms-auto h-6 w-6 p-0"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoadingPrices ? 'animate-spin' : ''}`} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {priceError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-destructive">{priceError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Gold Price ({currency})</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={goldPrice ? goldPrice.toFixed(2) : ''}
                      readOnly
                      className="bg-muted"
                    />
                    {metalPrices?.source === 'api' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Live price" />
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Silver Price ({currency})</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={silverPrice ? silverPrice.toFixed(2) : ''}
                      readOnly
                      className="bg-muted"
                    />
                    {metalPrices?.source === 'api' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title="Live price" />
                    )}
                  </div>
                </div>
              </div>

              {metalPrices && (
                <div className="text-xs text-muted-foreground space-y-1">
                  {currency !== 'USD' && exchangeRateData && (
                    <div className="flex justify-between items-center bg-primary/5 p-2 rounded-md">
                      <span className="font-medium">Exchange Rate:</span>
                      <div className="text-right">
                        <span className="font-bold text-primary">
                          1 {currency} = {ExchangeRateFallbackService.getInverseRate(exchangeRateData.rate).toFixed(6)} USD
                        </span>
                        <div className="flex items-center gap-1.5 justify-end mt-0.5">
                          {exchangeRateData.source === 'api' ? (
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          ) : (
                            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {ExchangeRateFallbackService.formatTimeAgo(exchangeRateData.lastUpdated)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Price Source:</span>
                    <span className={`capitalize ${metalPrices.source === 'fallback' ? 'text-orange-500 font-medium' : 'text-green-500'}`}>
                      {metalPrices.source === 'api' ? 'Live Market' : 'Market Fallback'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Updated:</span>
                    <span>{new Date(metalPrices.lastUpdated).toLocaleTimeString()}</span>
                  </div>
                  {metalPrices.goldToSilverRatio && (
                    <div className="flex justify-between">
                      <span>Gold/Silver Ratio:</span>
                      <span>{metalPrices.goldToSilverRatio.toFixed(1)}:1</span>
                    </div>
                  )}
                  {metalPrices.nisabData && (
                    <>
                      <div className="flex justify-between">
                        <span>Nisab Standard:</span>
                        <span className="text-green-600 capitalize">{metalPrices.nisabData.calculation_standard}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nisab Updated:</span>
                        <span>{new Date(metalPrices.nisabData.updated_at).toLocaleTimeString()}</span>
                      </div>
                    </>
                  )}
                  {currency !== 'USD' && (
                    <div className="flex justify-between">
                      <span>Exchange Rate (USD/{currency}):</span>
                      <span className={!metalPrices.exchangeRate || metalPrices.exchangeRate === 1 ? 'text-orange-500' : ''}>
                        {metalPrices.exchangeRate?.toFixed(4) || '1.0000 (Local)'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Disclaimer */}
              <div className="text-xs text-muted-foreground italic border-t pt-2">
                Prices are based on global spot rates; local market premiums may apply.
              </div>
            </CardContent>
          </Card>

          {/* Assets */}
          <Accordion type="single" collapsible defaultValue="assets" className="bg-card border border-border/40 rounded-xl shadow-sm px-4">
            <AccordionItem value="assets" className="border-none">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.2em] font-bold hover:no-underline py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="w-4 h-4 text-[#C9860A]" />
                  Assets <span className="font-serif italic text-sm tracking-normal text-foreground ml-2">{formatMoney(totalAssets)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Cash on Hand</Label>
                    <Input
                      type="number"
                      value={assets.cash || ''}
                      onChange={(e) => updateAsset('cash', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Bank Balance</Label>
                    <Input
                      type="number"
                      value={assets.bankBalance || ''}
                      onChange={(e) => updateAsset('bankBalance', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Gold Calculator</Label>
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                      {/* Amount and Unit Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Amount</Label>
                          <Input
                            type="number"
                            value={goldCalculator.amount || ''}
                            onChange={(e) => updateGoldCalculator('amount', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <Select value={goldCalculator.unit} onValueChange={(value) => updateGoldCalculator('unit', value as 'grams' | 'tolas' | 'ounces')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grams">Grams</SelectItem>
                              <SelectItem value="tolas">Tolas</SelectItem>
                              <SelectItem value="ounces">Ounces</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Karat Selection */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Gold Karat</Label>
                        <Select value={goldCalculator.karat.toString()} onValueChange={(value) => updateGoldCalculator('karat', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GOLD_KARAT_OPTIONS.map((karat) => (
                              <SelectItem key={karat.value} value={karat.value.toString()}>
                                {karat.label} ({Math.round(karat.purity * 100)}% pure)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Calculation Details */}
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Pure Gold Content:</span>
                            <span>
                              {(goldCalculator.amount * UNIT_CONVERSIONS[goldCalculator.unit] *
                                GOLD_KARAT_OPTIONS.find(k => k.value === goldCalculator.karat)?.purity || 0).toFixed(2)} grams
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Current Gold Price:</span>
                            <span>{goldPrice.toFixed(2)} {currency}/gram</span>
                          </div>
                        </div>
                      </div>

                      {/* Calculated Value */}
                      <div className="bg-[#C9860A]/5 border border-[#C9860A]/20 p-3 rounded-lg mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9860A]">Total Gold Value</span>
                          <span className="text-lg font-bold text-foreground font-serif italic">
                            {formatMoney(calculateGoldValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Silver Calculator</Label>
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                      {/* Amount and Unit Row */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground">Amount</Label>
                          <Input
                            type="number"
                            value={silverCalculator.amount || ''}
                            onChange={(e) => updateSilverCalculator('amount', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Unit</Label>
                          <Select value={silverCalculator.unit} onValueChange={(value) => updateSilverCalculator('unit', value as 'grams' | 'tolas' | 'ounces')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="grams">Grams</SelectItem>
                              <SelectItem value="tolas">Tolas</SelectItem>
                              <SelectItem value="ounces">Ounces</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Purity Selection */}
                      <div>
                        <Label className="text-xs text-muted-foreground">Silver Purity</Label>
                        <Select value={silverCalculator.purity.toString()} onValueChange={(value) => updateSilverCalculator('purity', parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SILVER_PURITY_OPTIONS.map((purity) => (
                              <SelectItem key={purity.value} value={purity.value.toString()}>
                                {purity.label} ({Math.round(purity.purity * 1000)/10}% pure)
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Calculation Details */}
                      <div className="space-y-1 pt-2 border-t">
                        <div className="text-xs text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Pure Silver Content:</span>
                            <span>
                              {(silverCalculator.amount * UNIT_CONVERSIONS[silverCalculator.unit] *
                                SILVER_PURITY_OPTIONS.find(p => p.value === silverCalculator.purity)?.purity || 0).toFixed(2)} grams
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Current Silver Price:</span>
                            <span>{silverPrice.toFixed(2)} {currency}/gram</span>
                          </div>
                        </div>
                      </div>

                      {/* Calculated Value */}
                      <div className="bg-[#C9860A]/5 border border-[#C9860A]/20 p-3 rounded-lg mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold uppercase tracking-wider text-[#C9860A]">Total Silver Value</span>
                          <span className="text-lg font-bold text-foreground font-serif italic">
                            {formatMoney(calculateSilverValue)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Stocks & Investments</Label>
                    <Input
                      type="number"
                      value={assets.stocks || ''}
                      onChange={(e) => updateAsset('stocks', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Business Assets</Label>
                    <Input
                      type="number"
                      value={assets.businessAssets || ''}
                      onChange={(e) => updateAsset('businessAssets', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Money Owed to You</Label>
                    <Input
                      type="number"
                      value={assets.receivables || ''}
                      onChange={(e) => updateAsset('receivables', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Other Assets</Label>
                    <Input
                      type="number"
                      value={assets.otherAssets || ''}
                      onChange={(e) => updateAsset('otherAssets', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Liabilities */}
          <Accordion type="single" collapsible className="bg-card border border-border/40 rounded-xl shadow-sm px-4">
            <AccordionItem value="liabilities" className="border-none">
              <AccordionTrigger className="text-[10px] uppercase tracking-[0.2em] font-bold hover:no-underline py-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building className="w-4 h-4 text-destructive" />
                  Liabilities <span className="font-serif italic text-sm tracking-normal text-destructive ml-2">{formatMoney(totalLiabilities)}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <div>
                    <Label className="text-xs">Personal Debts</Label>
                    <Input
                      type="number"
                      value={liabilities.debts || ''}
                      onChange={(e) => updateLiability('debts', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Loans</Label>
                    <Input
                      type="number"
                      value={liabilities.loans || ''}
                      onChange={(e) => updateLiability('loans', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Due Bills & Payments</Label>
                    <Input
                      type="number"
                      value={liabilities.bills || ''}
                      onChange={(e) => updateLiability('bills', e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Results */}
          <Card className={`relative overflow-hidden border-2 shadow-xl ${isZakatDue ? 'border-[#C9860A]/40 bg-[#1A1A1A] text-white' : 'border-border/40'}`}>
            {isZakatDue && <div className="absolute inset-0 bg-gradient-to-br from-[#C9860A]/10 to-transparent pointer-events-none" />}
            <CardHeader className="pb-3 border-b border-white/5 relative z-10">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-[#C9860A]">
                <Calculator className="w-3.5 h-3.5" />
                Zakat Calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Assets:</span>
                  <span className="font-medium">{formatMoney(totalAssets)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Liabilities:</span>
                  <span className="font-medium text-destructive">- {formatMoney(totalLiabilities)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Net Worth:</span>
                  <span className="font-bold">{formatMoney(netWorth)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nisab Threshold:</span>
                  <span className="font-medium">{formatMoney(nisab)}</span>
                </div>
              </div>

              <div className={`p-6 rounded-xl border relative overflow-hidden ${isZakatDue ? 'bg-black/20 border-[#C9860A]/20' : 'bg-muted/30 border-transparent'}`}>
                {isZakatDue && <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#C9860A]/20 rounded-full blur-3xl pointer-events-none" />}
                <div className="text-center relative z-10">
                  {isZakatDue ? (
                    <>
                      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#C9860A] mb-2">Your Zakat Due (2.5%)</p>
                      <p className="text-4xl font-bold text-white font-serif italic tracking-tight">{formatMoney(zakatAmount)}</p>
                      <p className="text-xs text-white/50 mt-3 font-medium">
                        May Allah accept your Zakat and bless your wealth
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold">Zakat Not Due</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Your net worth is below the Nisab threshold
                      </p>
                    </>
                  )}
                </div>
              </div>

              <Button variant="outline" onClick={resetCalculator} className="w-full">
                Reset Calculator
              </Button>
            </CardContent>
          </Card>

          {/* Zakat Info */}
          <Card className="border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
              <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground">Who Can Receive Zakat?</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• The poor (Al-Fuqara)</li>
                <li>• The needy (Al-Masakin)</li>
                <li>• Zakat administrators (Al-Amilina Alayha)</li>
                <li>• Those whose hearts are to be reconciled (Al-Mu'allafah Qulubuhum)</li>
                <li>• Those in bondage (Fir-Riqab)</li>
                <li>• Those in debt (Al-Gharimun)</li>
                <li>• In the cause of Allah (Fi Sabilillah)</li>
                <li>• The wayfarer (Ibn As-Sabil)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutManager>
  );
}
