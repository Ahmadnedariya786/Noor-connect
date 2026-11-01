import { useMemo, useState, useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  DollarSign,
  Info,
  Banknote,
  Building,
  RefreshCw,
  AlertCircle,
  Bookmark,
  Share2,
  Trash2,
  History,
  Sparkles,
  Edit3,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutManager } from "@/components/LayoutManager";
import { MetalPricesService, MetalPrices } from "@/lib/metalPrices";
import { ZakatNisabService } from "@/lib/zakatNisab";
import { METAL_PRICE_CONSTANTS } from "@/lib/constants";
import { ExchangeRateFallbackService } from "@/lib/exchange-rate-fallback";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { toast } from "sonner";

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

export interface ZakatHistoryRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  currency: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  nisabType: 'silver' | 'gold';
  nisabThreshold: number;
  isZakatDue: boolean;
  zakatDue: number;
}

const ZAKAT_STORAGE_KEY = 'zakat-calculator-data';
const ZAKAT_HISTORY_KEY = 'noor_zakat_history_v1';
const ZAKAT_RATE = 0.025; // 2.5%

const PROMINENT_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'SAR', 'AED', 'PKR', 'BDT', 'CAD', 'AUD'];

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
  const { t } = useLanguage();

  // Top Tabs: Calculator vs History
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');

  // History List
  const [historyList, setHistoryList] = useState<ZakatHistoryRecord[]>(() => {
    try {
      const raw = localStorage.getItem(ZAKAT_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      return [];
    }
    return [];
  });

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
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('preferred-currency') || 'INR';
    } catch {
      return 'INR';
    }
  });

  // Nisab Standard Choice: Silver (612.36g) vs Gold (87.48g)
  const [nisabChoice, setNisabChoice] = useState<'silver' | 'gold'>('silver');

  // Price Override Toggle & Custom Inputs
  const [isPriceOverrideEnabled, setIsPriceOverrideEnabled] = useState(false);
  const [customGoldPrice, setCustomGoldPrice] = useState<string>('');
  const [customSilverPrice, setCustomSilverPrice] = useState<string>('');

  const [goldCalculator, setGoldCalculator] = useState<GoldCalculator>({
    amount: 0,
    karat: 24,
    unit: 'grams',
  });

  const [silverCalculator, setSilverCalculator] = useState<SilverCalculator>({
    amount: 0,
    purity: 925,
    unit: 'grams',
  });

  const handleCurrencyChange = (newCurr: string) => {
    setCurrency(newCurr);
    try {
      localStorage.setItem('preferred-currency', newCurr);
    } catch {
      // Safe catch
    }
  };

  const loadMetalPrices = async () => {
    try {
      setIsLoadingPrices(true);
      setPriceError(null);
      const prices = await MetalPricesService.getPrices(currency, 'classical');
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
      const prices = await MetalPricesService.refreshPrices(currency, 'classical');
      setMetalPrices(prices);
      toast.success('Live metal prices updated');
    } catch (error) {
      console.error('Failed to refresh metal prices:', error);
      setPriceError('Failed to refresh metal prices');
    } finally {
      setIsLoadingPrices(false);
    }
  };

  // Load prices on mount & currency change
  useEffect(() => {
    MetalPricesService.clearCache(currency);
    ZakatNisabService.clearCache(currency);
    loadMetalPrices();
    ExchangeRateFallbackService.setupOnlineListeners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  const currencyOptions = useMemo(() => {
    try {
      const anyIntl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
      const list = typeof anyIntl.supportedValuesOf === "function" ? anyIntl.supportedValuesOf("currency") : FALLBACK_CURRENCIES;
      return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    } catch {
      return FALLBACK_CURRENCIES;
    }
  }, []);

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

  // Load saved inputs
  useEffect(() => {
    const saved = localStorage.getItem(ZAKAT_STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data && typeof data === 'object') {
          if (data.assets && typeof data.assets === 'object') setAssets(data.assets);
          if (data.liabilities && typeof data.liabilities === 'object') setLiabilities(data.liabilities);
          if (data.currency && typeof data.currency === 'string') setCurrency(data.currency);
          if (data.nisabChoice === 'silver' || data.nisabChoice === 'gold') setNisabChoice(data.nisabChoice);
          if (data.goldCalculator && typeof data.goldCalculator === 'object') setGoldCalculator(data.goldCalculator);
          if (data.silverCalculator && typeof data.silverCalculator === 'object') setSilverCalculator(data.silverCalculator);
        }
      } catch (e) {
        console.error('Failed to parse saved zakat data', e);
      }
    }
  }, []);

  // Save current inputs
  useEffect(() => {
    try {
      localStorage.setItem(
        ZAKAT_STORAGE_KEY,
        JSON.stringify({
          assets,
          liabilities,
          currency,
          nisabChoice,
          goldCalculator,
          silverCalculator,
        })
      );
    } catch {
      // Safe catch
    }
  }, [assets, liabilities, currency, nisabChoice, goldCalculator, silverCalculator]);

  // Effective per-gram prices (with override support)
  const effectiveGoldPrice = useMemo(() => {
    if (isPriceOverrideEnabled && customGoldPrice && !isNaN(parseFloat(customGoldPrice))) {
      return parseFloat(customGoldPrice);
    }
    return (
      metalPrices?.goldPricePerGram ||
      METAL_PRICE_CONSTANTS.FALLBACK_GOLD_PRICE_PER_GRAM * (metalPrices?.exchangeRate || 1)
    );
  }, [isPriceOverrideEnabled, customGoldPrice, metalPrices]);

  const effectiveSilverPrice = useMemo(() => {
    if (isPriceOverrideEnabled && customSilverPrice && !isNaN(parseFloat(customSilverPrice))) {
      return parseFloat(customSilverPrice);
    }
    return (
      metalPrices?.silverPricePerGram ||
      METAL_PRICE_CONSTANTS.FALLBACK_SILVER_PRICE_PER_GRAM * (metalPrices?.exchangeRate || 1)
    );
  }, [isPriceOverrideEnabled, customSilverPrice, metalPrices]);

  // Nisab threshold calculations (612.36g silver vs 87.48g gold)
  const silverNisabValue = 612.36 * effectiveSilverPrice;
  const goldNisabValue = 87.48 * effectiveGoldPrice;
  const activeNisabThreshold = nisabChoice === 'silver' ? silverNisabValue : goldNisabValue;

  const totalAssets = Object.values(assets).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(liabilities).reduce((a, b) => a + b, 0);
  const netWorth = Math.max(0, totalAssets - totalLiabilities);

  const isZakatDue = netWorth >= activeNisabThreshold;
  const zakatAmount = isZakatDue ? netWorth * ZAKAT_RATE : 0;

  const updateAsset = (key: keyof ZakatAssets, value: string) => {
    const num = parseFloat(value) || 0;
    setAssets((prev) => ({ ...prev, [key]: num }));
  };

  const updateLiability = (key: keyof ZakatLiabilities, value: string) => {
    const num = parseFloat(value) || 0;
    setLiabilities((prev) => ({ ...prev, [key]: num }));
  };

  // Calculate gold value
  const calculateGoldValue = useMemo(() => {
    if (!goldCalculator.amount || !effectiveGoldPrice) return 0;
    const karatOption = GOLD_KARAT_OPTIONS.find((k) => k.value === goldCalculator.karat);
    const purity = karatOption?.purity || 1.0;
    const amountInGrams = goldCalculator.amount * UNIT_CONVERSIONS[goldCalculator.unit];
    return amountInGrams * purity * effectiveGoldPrice;
  }, [goldCalculator, effectiveGoldPrice]);

  // Calculate silver value
  const calculateSilverValue = useMemo(() => {
    if (!silverCalculator.amount || !effectiveSilverPrice) return 0;
    const purityOption = SILVER_PURITY_OPTIONS.find((p) => p.value === silverCalculator.purity);
    const purity = purityOption?.purity || 0.925;
    const amountInGrams = silverCalculator.amount * UNIT_CONVERSIONS[silverCalculator.unit];
    return amountInGrams * purity * effectiveSilverPrice;
  }, [silverCalculator, effectiveSilverPrice]);

  // Keep assets gold & silver synced when calculator fields change
  useEffect(() => {
    setAssets((prev) => ({ ...prev, gold: calculateGoldValue }));
  }, [calculateGoldValue]);

  useEffect(() => {
    setAssets((prev) => ({ ...prev, silver: calculateSilverValue }));
  }, [calculateSilverValue]);

  const updateGoldCalculator = (field: keyof GoldCalculator, value: string | number) => {
    setGoldCalculator((prev) => ({ ...prev, [field]: value }));
  };

  const updateSilverCalculator = (field: keyof SilverCalculator, value: string | number) => {
    setSilverCalculator((prev) => ({ ...prev, [field]: value }));
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
    setGoldCalculator({ amount: 0, karat: 24, unit: 'grams' });
    setSilverCalculator({ amount: 0, purity: 925, unit: 'grams' });
    setIsPriceOverrideEnabled(false);
    setCustomGoldPrice('');
    setCustomSilverPrice('');
    toast.success('Calculator inputs reset');
  };

  const handleSaveToHistory = () => {
    const newRecord: ZakatHistoryRecord = {
      id: `zakat_${Date.now()}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      currency,
      totalAssets,
      totalLiabilities,
      netWorth,
      nisabType: nisabChoice,
      nisabThreshold: activeNisabThreshold,
      isZakatDue,
      zakatDue: zakatAmount,
    };
    const updated = [newRecord, ...historyList];
    setHistoryList(updated);
    try {
      localStorage.setItem(ZAKAT_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Safe catch
    }
    toast.success('Zakat calculation saved to history!');
  };

  const handleDeleteHistory = (id: string) => {
    const updated = historyList.filter((h) => h.id !== id);
    setHistoryList(updated);
    try {
      localStorage.setItem(ZAKAT_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Safe catch
    }
    toast.success('Record removed');
  };

  const handleClearAllHistory = () => {
    setHistoryList([]);
    try {
      localStorage.removeItem(ZAKAT_HISTORY_KEY);
    } catch {
      // Safe catch
    }
    toast.success('Zakat history cleared');
  };

  const handleShareSummary = async () => {
    const summaryText = `NOOR CONNECT — ZAKAT CALCULATION SUMMARY
Date: ${new Date().toLocaleDateString()}
Currency: ${currency}

TOTAL ASSETS: ${formatMoney(totalAssets)}
• Cash & Bank: ${formatMoney(assets.cash + assets.bankBalance)}
• Gold Value: ${formatMoney(assets.gold)}
• Silver Value: ${formatMoney(assets.silver)}
• Stocks & Investments: ${formatMoney(assets.stocks)}
• Business Inventory: ${formatMoney(assets.businessAssets)}
• Receivables Owed to You: ${formatMoney(assets.receivables)}
• Other Assets: ${formatMoney(assets.otherAssets)}

TOTAL DEDUCTIBLE LIABILITIES: ${formatMoney(totalLiabilities)}
NET ZAKATABLE WEALTH: ${formatMoney(netWorth)}

NISAB THRESHOLD (${nisabChoice.toUpperCase()}): ${formatMoney(activeNisabThreshold)}
ZAKAT STATUS: ${isZakatDue ? `PAYABLE (2.5%) = ${formatMoney(zakatAmount)}` : 'BELOW NISAB THRESHOLD (No Zakat Due)'}

Calculated using Noor Connect (com.noorconnect.ummah)`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Zakat Calculation Summary', text: summaryText });
      } catch {
        // Handled dismiss
      }
    } else {
      navigator.clipboard.writeText(summaryText);
      toast.success('Calculation summary copied to clipboard');
    }
  };

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background pb-32">
        <AppBar title={t("zakatCalculator") || "Zakat Calculator"} showBack />

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Top 2 Tabs: Calculator & History */}
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('calculator')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'calculator'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'history'
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({historyList.length})</span>
            </button>
          </div>

          {activeTab === 'history' ? (
            /* HISTORY TAB VIEW */
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Saved Calculations ({historyList.length})
                  </h3>
                  <span className="text-[10px] text-[var(--text-secondary)]">Protected in local device storage</span>
                </div>
                {historyList.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllHistory}
                    className="h-7 text-xs text-rose-400 hover:text-rose-500 hover:bg-rose-500/10"
                  >
                    Clear All
                  </Button>
                )}
              </div>

              {historyList.length === 0 ? (
                <div className="text-center py-12 px-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)] flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">No Saved History Yet</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                    Calculate your Zakat and tap <span className="text-[var(--accent-text)] font-semibold">"Save to History"</span> to preserve itemized records across years.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {historyList.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-xs"
                      style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-[var(--text-primary)]">{rec.dateStr}</span>
                          <span className="text-[10px] text-[var(--text-secondary)] block">
                            Currency: {rec.currency} • Nisab: {rec.nisabType.toUpperCase()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistory(rec.id)}
                          className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-[var(--surface-2)] text-xs">
                        <div>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Net Wealth</span>
                          <span className="font-bold text-[var(--text-primary)]">{rec.currency} {rec.netWorth.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--text-secondary)] block">Zakat Due (2.5%)</span>
                          <span className="font-bold text-[var(--accent-text)]">{rec.currency} {rec.zakatDue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* CALCULATOR TAB VIEW */
            <>
              {/* About Zakat Card */}
              <Card className="relative overflow-hidden border-[var(--accent)]/30 bg-[var(--surface)] shadow-sm">
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[var(--accent)] mt-0.5 shrink-0" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)]">Spiritual Principle of Zakat</p>
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        Zakat is 2.5% of your total net surplus wealth held for one full lunar year (Hawl) above the Nisab threshold.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Currency Selector (10 Prominent Pills + Full Dropdown) */}
              <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                <CardHeader className="py-2.5 px-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <CardTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <DollarSign className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    Currency Selection
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 space-y-2.5">
                  {/* 10 Prominent Quick Select Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {PROMINENT_CURRENCIES.map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleCurrencyChange(code)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border shrink-0 ${
                          currency === code
                            ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-xs"
                            : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {code}
                      </button>
                    ))}
                  </div>

                  {/* Full Dropdown Selector */}
                  <div className="pt-1">
                    <Select value={currency} onValueChange={handleCurrencyChange}>
                      <SelectTrigger className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]">
                        <SelectValue placeholder="More currencies..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currencyOptions.map((code) => (
                          <SelectItem key={code} value={code} className="text-xs">
                            {code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Live Gold & Silver Rates + Override Toggle */}
              <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                <CardHeader className="py-2.5 px-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                      Live Metal Rates (per gram)
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsPriceOverrideEnabled((prev) => !prev)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          isPriceOverrideEnabled
                            ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]"
                            : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Override Rates</span>
                      </button>
                      <button
                        type="button"
                        onClick={refreshPrices}
                        disabled={isLoadingPrices}
                        className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        title="Refresh metal rates"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPrices ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3.5 space-y-3">
                  {priceError && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-xl text-xs text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{priceError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    {/* Gold Rate */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[var(--text-secondary)]">Gold / gram ({currency})</Label>
                      {isPriceOverrideEnabled ? (
                        <Input
                          type="number"
                          placeholder={effectiveGoldPrice.toFixed(2)}
                          value={customGoldPrice}
                          onChange={(e) => setCustomGoldPrice(e.target.value)}
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      ) : (
                        <div className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between text-xs font-bold font-mono">
                          <span>{effectiveGoldPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-400 font-semibold">LIVE</span>
                        </div>
                      )}
                    </div>

                    {/* Silver Rate */}
                    <div className="space-y-1">
                      <Label className="text-[11px] text-[var(--text-secondary)]">Silver / gram ({currency})</Label>
                      {isPriceOverrideEnabled ? (
                        <Input
                          type="number"
                          placeholder={effectiveSilverPrice.toFixed(2)}
                          value={customSilverPrice}
                          onChange={(e) => setCustomSilverPrice(e.target.value)}
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      ) : (
                        <div className="h-9 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between text-xs font-bold font-mono">
                          <span>{effectiveSilverPrice.toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-400 font-semibold">LIVE</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2-Card Interactive Nisab Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-1">
                  Select Nisab Benchmark
                </Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Silver Nisab Card */}
                  <button
                    type="button"
                    onClick={() => setNisabChoice('silver')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-[0.98] ${
                      nisabChoice === 'silver'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-md'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                        Silver Nisab
                      </span>
                      <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                        Recommended
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-mono">
                      {formatMoney(silverNisabValue)}
                    </div>
                    <div className="text-[9.5px] text-[var(--text-secondary)] mt-0.5">
                      612.36g (52.5 Tolas)
                    </div>
                  </button>

                  {/* Gold Nisab Card */}
                  <button
                    type="button"
                    onClick={() => setNisabChoice('gold')}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden active:scale-[0.98] ${
                      nisabChoice === 'gold'
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-md'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                        Gold Nisab
                      </span>
                    </div>
                    <div className="text-sm sm:text-base font-bold text-[var(--text-primary)] font-mono">
                      {formatMoney(goldNisabValue)}
                    </div>
                    <div className="text-[9.5px] text-[var(--text-secondary)] mt-0.5">
                      87.48g (7.5 Tolas)
                    </div>
                  </button>
                </div>
              </div>

              {/* 8 Itemized Wealth Categories */}
              <Accordion type="single" collapsible defaultValue="assets" className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm px-4">
                <AccordionItem value="assets" className="border-none">
                  <AccordionTrigger className="text-xs uppercase tracking-wider font-bold hover:no-underline py-3.5">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Banknote className="w-4 h-4 text-[var(--accent-text)]" />
                      <span>Itemized Wealth Assets</span>
                      <span className="font-mono font-bold text-xs text-[var(--text-primary)] ml-1">
                        {formatMoney(totalAssets)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3.5 pt-2">
                      {/* 1. Cash in Hand */}
                      <div>
                        <Label className="text-xs">1. Cash in Hand & Digital Wallets</Label>
                        <Input
                          type="number"
                          value={assets.cash || ''}
                          onChange={(e) => updateAsset('cash', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>

                      {/* 2. Bank Balances */}
                      <div>
                        <Label className="text-xs">2. Bank Savings & Current Accounts</Label>
                        <Input
                          type="number"
                          value={assets.bankBalance || ''}
                          onChange={(e) => updateAsset('bankBalance', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>

                      {/* 3. Gold Calculator */}
                      <div className="space-y-2 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                        <Label className="text-xs font-bold text-[var(--accent-text)]">3. Gold & Gold Jewelry</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Weight</Label>
                            <Input
                              type="number"
                              value={goldCalculator.amount || ''}
                              onChange={(e) => updateGoldCalculator('amount', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              step="0.01"
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Unit</Label>
                            <Select value={goldCalculator.unit} onValueChange={(v) => updateGoldCalculator('unit', v as 'grams' | 'tolas' | 'ounces')}>
                              <SelectTrigger className="h-8 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="grams">Grams</SelectItem>
                                <SelectItem value="tolas">Tolas</SelectItem>
                                <SelectItem value="ounces">Ounces</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Karat</Label>
                            <Select value={goldCalculator.karat.toString()} onValueChange={(v) => updateGoldCalculator('karat', parseInt(v))}>
                              <SelectTrigger className="h-8 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GOLD_KARAT_OPTIONS.map((k) => (
                                  <SelectItem key={k.value} value={k.value.toString()}>
                                    {k.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-secondary)]">Gold Value:</span>
                          <span className="font-bold text-[var(--text-primary)] font-mono">{formatMoney(calculateGoldValue)}</span>
                        </div>
                      </div>

                      {/* 4. Silver Calculator */}
                      <div className="space-y-2 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
                        <Label className="text-xs font-bold text-[var(--accent-text)]">4. Silver & Silverware</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Weight</Label>
                            <Input
                              type="number"
                              value={silverCalculator.amount || ''}
                              onChange={(e) => updateSilverCalculator('amount', parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              step="0.01"
                              className="h-8 rounded-lg text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Unit</Label>
                            <Select value={silverCalculator.unit} onValueChange={(v) => updateSilverCalculator('unit', v as 'grams' | 'tolas' | 'ounces')}>
                              <SelectTrigger className="h-8 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="grams">Grams</SelectItem>
                                <SelectItem value="tolas">Tolas</SelectItem>
                                <SelectItem value="ounces">Ounces</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-[10px] text-[var(--text-secondary)]">Purity</Label>
                            <Select value={silverCalculator.purity.toString()} onValueChange={(v) => updateSilverCalculator('purity', parseInt(v))}>
                              <SelectTrigger className="h-8 rounded-lg text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SILVER_PURITY_OPTIONS.map((p) => (
                                  <SelectItem key={p.value} value={p.value.toString()}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-[var(--border)]">
                          <span className="text-[10px] text-[var(--text-secondary)]">Silver Value:</span>
                          <span className="font-bold text-[var(--text-primary)] font-mono">{formatMoney(calculateSilverValue)}</span>
                        </div>
                      </div>

                      {/* 5. Stocks & Shares */}
                      <div>
                        <Label className="text-xs">5. Stocks, Mutual Funds & Liquid Investments</Label>
                        <Input
                          type="number"
                          value={assets.stocks || ''}
                          onChange={(e) => updateAsset('stocks', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>

                      {/* 6. Business Merchandise */}
                      <div>
                        <Label className="text-xs">6. Business Trade Goods & Inventory</Label>
                        <Input
                          type="number"
                          value={assets.businessAssets || ''}
                          onChange={(e) => updateAsset('businessAssets', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>

                      {/* 7. Receivables */}
                      <div>
                        <Label className="text-xs">7. Money Lent Out / Good Receivables</Label>
                        <Input
                          type="number"
                          value={assets.receivables || ''}
                          onChange={(e) => updateAsset('receivables', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>

                      {/* 8. Other Assets */}
                      <div>
                        <Label className="text-xs">8. Real Estate for Resale / Other Surplus Wealth</Label>
                        <Input
                          type="number"
                          value={assets.otherAssets || ''}
                          onChange={(e) => updateAsset('otherAssets', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Deductible Liabilities Accordion */}
              <Accordion type="single" collapsible className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-sm px-4">
                <AccordionItem value="liabilities" className="border-none">
                  <AccordionTrigger className="text-xs uppercase tracking-wider font-bold hover:no-underline py-3.5">
                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                      <Building className="w-4 h-4 text-destructive" />
                      <span>Deductible Liabilities</span>
                      <span className="font-mono font-bold text-xs text-destructive ml-1">
                        -{formatMoney(totalLiabilities)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      <div>
                        <Label className="text-xs">Immediate Personal Debts Due</Label>
                        <Input
                          type="number"
                          value={liabilities.debts || ''}
                          onChange={(e) => updateLiability('debts', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Current Loan Installments</Label>
                        <Input
                          type="number"
                          value={liabilities.loans || ''}
                          onChange={(e) => updateLiability('loans', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Due Commercial / Utility Bills</Label>
                        <Input
                          type="number"
                          value={liabilities.bills || ''}
                          onChange={(e) => updateLiability('bills', e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl text-xs bg-[var(--surface-2)] border-[var(--border)]"
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Zakat Calculation Results Card */}
              <Card
                className={`relative overflow-hidden border-2 shadow-lg ${
                  isZakatDue
                    ? "border-emerald-500/50 bg-[var(--surface)] text-[var(--text-primary)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)]"
                }`}
                style={{ boxShadow: isZakatDue ? "0 8px 32px -8px rgba(16, 185, 129, 0.25)" : undefined }}
              >
                <CardHeader className="py-3 px-4 border-b border-[var(--border)]/50">
                  <CardTitle className="text-xs uppercase tracking-wider font-bold flex items-center gap-1.5 text-[var(--accent-text)]">
                    <Calculator className="w-3.5 h-3.5" />
                    Zakat Calculation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Total Zakatable Assets:</span>
                      <span className="font-bold">{formatMoney(totalAssets)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">Total Deductible Liabilities:</span>
                      <span className="font-bold text-destructive">-{formatMoney(totalLiabilities)}</span>
                    </div>
                    <div className="border-t border-[var(--border)]/50 pt-1.5 flex justify-between">
                      <span className="font-bold text-[var(--text-primary)]">Net Zakatable Wealth:</span>
                      <span className="font-bold text-base font-mono">{formatMoney(netWorth)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)]">Nisab Threshold ({nisabChoice.toUpperCase()}):</span>
                      <span className="font-mono text-[var(--accent-text)]">{formatMoney(activeNisabThreshold)}</span>
                    </div>
                  </div>

                  {/* Big Banner */}
                  <div
                    className={`p-4 rounded-xl border text-center ${
                      isZakatDue
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {isZakatDue ? (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          Zakat is Payable (واجب) • 2.5%
                        </span>
                        <span className="text-3xl font-extrabold font-mono text-[var(--text-primary)] block">
                          {formatMoney(zakatAmount)}
                        </span>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                          "Take from their wealth a charity by which you purify them..." (Quran 9:103)
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-[var(--text-primary)] block">Below Nisab Threshold</span>
                        <p className="text-[11px] text-[var(--text-secondary)]">
                          Your net wealth does not exceed the {nisabChoice} Nisab. No Zakat is due at this time.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions: Save to History, Share Summary, Reset */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={handleSaveToHistory}
                      className="flex-1 h-9 rounded-xl text-xs font-bold gap-1 shadow-sm"
                      style={{
                        background: "var(--accent)",
                        color: "var(--on-accent)",
                      }}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>Save to History</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareSummary}
                      className="h-9 px-3 rounded-xl text-xs font-bold gap-1 border-[var(--border)]"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetCalculator}
                      className="h-9 px-2.5 rounded-xl text-xs text-[var(--text-secondary)] hover:text-rose-400"
                    >
                      Reset
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 8 Categories of Zakat Recipients (Asnaaf) */}
              <Card className="border-[var(--border)] bg-[var(--surface)] shadow-sm overflow-hidden">
                <CardHeader className="py-2.5 px-4 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <CardTitle className="text-xs uppercase tracking-wider font-bold text-[var(--text-secondary)]">
                    Who is Eligible to Receive Zakat? (Quran 9:60)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5">
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1 leading-relaxed">
                    <li>1. <strong className="text-[var(--text-primary)]">The Poor (Al-Fuqara):</strong> Those with zero or minimal means.</li>
                    <li>2. <strong className="text-[var(--text-primary)]">The Needy (Al-Masakin):</strong> Those whose income falls short of basic living costs.</li>
                    <li>3. <strong className="text-[var(--text-primary)]">Zakat Administrators:</strong> Those who collect and distribute Zakat.</li>
                    <li>4. <strong className="text-[var(--text-primary)]">Reconciling Hearts:</strong> New Muslims and those near to Islam.</li>
                    <li>5. <strong className="text-[var(--text-primary)]">Freeing Captives:</strong> To liberate those in bondage or wrongful detention.</li>
                    <li>6. <strong className="text-[var(--text-primary)]">Debtors (Al-Gharimun):</strong> Those unable to repay legitimate debts.</li>
                    <li>7. <strong className="text-[var(--text-primary)]">In the Path of Allah:</strong> For righteous community and educational causes.</li>
                    <li>8. <strong className="text-[var(--text-primary)]">The Wayfarer:</strong> Travelers stranded without financial means.</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </LayoutManager>
  );
}
