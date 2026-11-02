import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  Coins,
  Scale,
  RefreshCw,
  Edit3,
  Share2,
  Bookmark,
  Trash2,
  History,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Wheat,
  Wallet,
  Building2,
  TrendingUp,
  Receipt,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  SUPPORTED_CURRENCIES,
  LiveMetalRates,
  fetchLiveMetalRates,
  getSavedCurrency,
  saveCurrency,
  setPriceOverride,
  clearPriceOverride,
  getPriceOverride,
  formatCurrencyAmount,
  SILVER_NISAB_GRAMS,
  GOLD_NISAB_GRAMS,
  ZAKAT_RATE,
  TOLA_IN_GRAMS,
  GOLD_KARAT_MULTIPLIERS,
  calculateLivestockZakat,
  calculateUshr,
} from "@/lib/zakat-market-api";

export interface ZakatHistoryRecord {
  id: string;
  timestamp: number;
  dateStr: string;
  currency: string;
  totalGross: number;
  totalLiabilities: number;
  netWorth: number;
  nisabType: 'silver' | 'gold';
  nisabThreshold: number;
  isZakatDue: boolean;
  zakatDue: number;
  ushrDue?: number;
  livestockSummary?: string;
  isPaid?: boolean;
  assetsBreakdown?: {
    cashHome: number;
    bankAccounts: number;
    receivables: number;
    goldValue: number;
    silverValue: number;
    investments: number;
    businessStock: number;
    otherAssets: number;
    debts: number;
  };
}

const ZAKAT_HISTORY_KEY = 'noor_zakat_history_v1';
const ZAKAT_SAVED_DRAFT_KEY = 'noor_zakat_draft_v1';

interface ZakatCalculatorProps {
  isEmbedded?: boolean;
}

export default function ZakatCalculator({ isEmbedded = false }: ZakatCalculatorProps) {
  const navigate = useNavigate();

  // Top Tabs: Calculator vs History
  const [activeTab, setActiveTab] = useState<'calculator' | 'history'>('calculator');

  // Currency
  const [activeCurrency, setActiveCurrency] = useState<string>(() => getSavedCurrency());

  // Live Metal Rates State
  const [rates, setRates] = useState<LiveMetalRates | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState<boolean>(true);

  // Nisab Choice: Silver (Recommended) vs Gold
  const [nisabChoice, setNisabChoice] = useState<'silver' | 'gold'>('silver');

  // Modals
  const [showShariahRulesModal, setShowShariahRulesModal] = useState<boolean>(false);
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);

  // Override Form State
  const [overrideGoldGram, setOverrideGoldGram] = useState<string>('');
  const [overrideSilverGram, setOverrideSilverGram] = useState<string>('');

  // Lock body scroll when either modal is open
  useBodyScrollLock(showShariahRulesModal || showOverrideModal);

  // Wealth Inputs
  // 1. Cash & Bank
  const [cashHome, setCashHome] = useState<string>('');
  const [bankAccounts, setBankAccounts] = useState<string>('');
  const [receivables, setReceivables] = useState<string>('');

  // 2. Gold
  const [goldInputMode, setGoldInputMode] = useState<'grams' | 'tolas' | 'value'>('grams');
  const [goldKarat, setGoldKarat] = useState<number>(22);
  const [goldWeightOrValue, setGoldWeightOrValue] = useState<string>('');

  // 3. Silver
  const [silverInputMode, setSilverInputMode] = useState<'grams' | 'tolas' | 'value'>('grams');
  const [silverWeightOrValue, setSilverWeightOrValue] = useState<string>('');

  // 4. Investments & Shares
  const [investments, setInvestments] = useState<string>('');

  // 5. Business Inventory & Goods
  const [businessStock, setBusinessStock] = useState<string>('');

  // 6. Other Zakatable Assets
  const [otherAssets, setOtherAssets] = useState<string>('');

  // 7. Agricultural Produce (Ushr - Expandable)
  const [showUshrSection, setShowUshrSection] = useState<boolean>(false);
  const [harvestValue, setHarvestValue] = useState<string>('');
  const [irrigationType, setIrrigationType] = useState<'rain' | 'artificial' | 'mixed'>('rain');

  // 8. Livestock (An'am - Expandable)
  const [showLivestockSection, setShowLivestockSection] = useState<boolean>(false);
  const [sheepCount, setSheepCount] = useState<string>('');
  const [cattleCount, setCattleCount] = useState<string>('');
  const [camelCount, setCamelCount] = useState<string>('');

  // 9. Liabilities & Immediate Debts
  const [debts, setDebts] = useState<string>('');

  // History Records
  const [historyList, setHistoryList] = useState<ZakatHistoryRecord[]>(() => {
    try {
      const raw = localStorage.getItem(ZAKAT_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Local storage read fallback
    }
    return [];
  });

  // Load Saved Draft on Mount
  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(ZAKAT_SAVED_DRAFT_KEY);
      if (rawDraft) {
        const d = JSON.parse(rawDraft);
        if (d.cashHome) setCashHome(String(d.cashHome));
        if (d.bankAccounts) setBankAccounts(String(d.bankAccounts));
        if (d.receivables) setReceivables(String(d.receivables));
        if (d.goldWeightOrValue) setGoldWeightOrValue(String(d.goldWeightOrValue));
        if (d.goldInputMode) setGoldInputMode(d.goldInputMode);
        if (d.goldKarat) setGoldKarat(Number(d.goldKarat));
        if (d.silverWeightOrValue) setSilverWeightOrValue(String(d.silverWeightOrValue));
        if (d.silverInputMode) setSilverInputMode(d.silverInputMode);
        if (d.investments) setInvestments(String(d.investments));
        if (d.businessStock) setBusinessStock(String(d.businessStock));
        if (d.otherAssets) setOtherAssets(String(d.otherAssets));
        if (d.debts) setDebts(String(d.debts));
        if (d.nisabChoice) setNisabChoice(d.nisabChoice);
      }
    } catch {
      // Storage draft read fallback
    }
  }, []);

  // Fetch Metal Rates
  const loadRates = useCallback(async (curr: string, force = false) => {
    setIsLoadingRates(true);
    try {
      const result = await fetchLiveMetalRates(curr, force);
      setRates(result);
    } catch {
      // Rates engine handles offline fallback internally
    } finally {
      setIsLoadingRates(false);
    }
  }, []);

  useEffect(() => {
    loadRates(activeCurrency, false);
  }, [activeCurrency, loadRates]);

  // Handle Currency Change
  const handleCurrencyChange = (newCurr: string) => {
    setActiveCurrency(newCurr);
    saveCurrency(newCurr);
    loadRates(newCurr, false);
    toast.success(`Currency switched to ${newCurr}`);
  };

  // Safe parse helper
  const parseNum = (val: string): number => {
    const clean = val.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    return isNaN(num) || num < 0 ? 0 : num;
  };

  // Rates computations
  const effectiveGoldPerGram = rates?.goldPerGram || 7850;
  const effectiveSilverPerGram = rates?.silverPerGram || 96;

  // Gold Valuation
  const calculatedGoldValue = useMemo(() => {
    const raw = parseNum(goldWeightOrValue);
    if (raw <= 0) return 0;
    if (goldInputMode === 'value') return raw;

    const karatInfo = GOLD_KARAT_MULTIPLIERS[goldKarat] || GOLD_KARAT_MULTIPLIERS[24];
    const grams = goldInputMode === 'tolas' ? raw * TOLA_IN_GRAMS : raw;
    return Math.round(grams * effectiveGoldPerGram * karatInfo.multiplier);
  }, [goldWeightOrValue, goldInputMode, goldKarat, effectiveGoldPerGram]);

  // Silver Valuation
  const calculatedSilverValue = useMemo(() => {
    const raw = parseNum(silverWeightOrValue);
    if (raw <= 0) return 0;
    if (silverInputMode === 'value') return raw;

    const grams = silverInputMode === 'tolas' ? raw * TOLA_IN_GRAMS : raw;
    return Math.round(grams * effectiveSilverPerGram);
  }, [silverWeightOrValue, silverInputMode, effectiveSilverPerGram]);

  // Subtotals
  const cashTotal = parseNum(cashHome) + parseNum(bankAccounts) + parseNum(receivables);
  const investmentTotal = parseNum(investments);
  const businessTotal = parseNum(businessStock);
  const otherTotal = parseNum(otherAssets);

  // Gross Zakatable Wealth
  const totalGrossWealth = useMemo(() => {
    return cashTotal + calculatedGoldValue + calculatedSilverValue + investmentTotal + businessTotal + otherTotal;
  }, [cashTotal, calculatedGoldValue, calculatedSilverValue, investmentTotal, businessTotal, otherTotal]);

  // Liabilities
  const totalLiabilities = useMemo(() => {
    return parseNum(debts);
  }, [debts]);

  // Net Zakatable Wealth
  const netZakatableWealth = useMemo(() => {
    return Math.max(0, totalGrossWealth - totalLiabilities);
  }, [totalGrossWealth, totalLiabilities]);

  // Nisab Threshold Value
  const silverNisabValue = useMemo(() => {
    return Math.round(SILVER_NISAB_GRAMS * effectiveSilverPerGram);
  }, [effectiveSilverPerGram]);

  const goldNisabValue = useMemo(() => {
    return Math.round(GOLD_NISAB_GRAMS * effectiveGoldPerGram);
  }, [effectiveGoldPerGram]);

  const activeNisabThreshold = nisabChoice === 'silver' ? silverNisabValue : goldNisabValue;

  // Zakat Obligation Check
  const isNisabReached = netZakatableWealth >= activeNisabThreshold && activeNisabThreshold > 0;
  const zakatDue = isNisabReached ? Math.round(netZakatableWealth * ZAKAT_RATE) : 0;
  const percentOfNisab = activeNisabThreshold > 0
    ? Math.min(100, Math.round((netZakatableWealth / activeNisabThreshold) * 100))
    : 0;

  // Agricultural Ushr
  const ushrResult = useMemo(() => {
    const val = parseNum(harvestValue);
    if (val <= 0) return { due: 0, label: '', percentage: '0%' };
    return calculateUshr(val, irrigationType);
  }, [harvestValue, irrigationType]);

  // Livestock Zakat
  const livestockResult = useMemo(() => {
    const sheep = parseInt(sheepCount, 10) || 0;
    const cattle = parseInt(cattleCount, 10) || 0;
    const camels = parseInt(camelCount, 10) || 0;
    if (sheep === 0 && cattle === 0 && camels === 0) return null;
    return calculateLivestockZakat(sheep, cattle, camels);
  }, [sheepCount, cattleCount, camelCount]);

  // Auto-save draft in localStorage
  useEffect(() => {
    const draft = {
      cashHome,
      bankAccounts,
      receivables,
      goldWeightOrValue,
      goldInputMode,
      goldKarat,
      silverWeightOrValue,
      silverInputMode,
      investments,
      businessStock,
      otherAssets,
      debts,
      nisabChoice,
    };
    try {
      localStorage.setItem(ZAKAT_SAVED_DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Local storage draft write fallback
    }
  }, [
    cashHome,
    bankAccounts,
    receivables,
    goldWeightOrValue,
    goldInputMode,
    goldKarat,
    silverWeightOrValue,
    silverInputMode,
    investments,
    businessStock,
    otherAssets,
    debts,
    nisabChoice,
  ]);

  // Open Override Modal
  const handleOpenOverride = () => {
    const existing = getPriceOverride(activeCurrency);
    if (existing) {
      setOverrideGoldGram(String(existing.goldPerGram));
      setOverrideSilverGram(String(existing.silverPerGram));
    } else {
      setOverrideGoldGram(String(rates?.goldPerGram || ''));
      setOverrideSilverGram(String(rates?.silverPerGram || ''));
    }
    setShowOverrideModal(true);
  };

  // Save Override
  const handleSaveOverride = () => {
    const g = parseFloat(overrideGoldGram);
    const s = parseFloat(overrideSilverGram);
    if (isNaN(g) || g <= 0 || isNaN(s) || s <= 0) {
      toast.error('Please enter valid positive numbers for Gold and Silver');
      return;
    }
    setPriceOverride(activeCurrency, { goldPerGram: g, silverPerGram: s });
    setShowOverrideModal(false);
    loadRates(activeCurrency, false);
    toast.success('Custom prices applied successfully');
  };

  // Reset Override
  const handleResetOverride = () => {
    clearPriceOverride(activeCurrency);
    setShowOverrideModal(false);
    loadRates(activeCurrency, true);
    toast.success('Reset to live market rates');
  };

  // Reset Calculator Form
  const handleResetForm = () => {
    setCashHome('');
    setBankAccounts('');
    setReceivables('');
    setGoldWeightOrValue('');
    setSilverWeightOrValue('');
    setInvestments('');
    setBusinessStock('');
    setOtherAssets('');
    setHarvestValue('');
    setSheepCount('');
    setCattleCount('');
    setCamelCount('');
    setDebts('');
    try {
      localStorage.removeItem(ZAKAT_SAVED_DRAFT_KEY);
    } catch {
      // Storage removal fallback
    }
    toast.success('Calculator fields reset to zero');
  };

  // Save to History
  const handleSaveToHistory = () => {
    if (totalGrossWealth <= 0 && (!livestockResult || !livestockResult.isZakatable) && ushrResult.due <= 0) {
      toast.error('Please enter your assets before saving to history');
      return;
    }

    const newRecord: ZakatHistoryRecord = {
      id: `zakat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      dateStr: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      currency: activeCurrency,
      totalGross: totalGrossWealth,
      totalLiabilities,
      netWorth: netZakatableWealth,
      nisabType: nisabChoice,
      nisabThreshold: activeNisabThreshold,
      isZakatDue: isNisabReached,
      zakatDue,
      ushrDue: ushrResult.due > 0 ? ushrResult.due : undefined,
      livestockSummary: livestockResult?.isZakatable ? livestockResult.dueText : undefined,
      isPaid: false,
      assetsBreakdown: {
        cashHome: parseNum(cashHome),
        bankAccounts: parseNum(bankAccounts),
        receivables: parseNum(receivables),
        goldValue: calculatedGoldValue,
        silverValue: calculatedSilverValue,
        investments: parseNum(investments),
        businessStock: parseNum(businessStock),
        otherAssets: parseNum(otherAssets),
        debts: parseNum(debts),
      },
    };

    const updated = [newRecord, ...historyList];
    setHistoryList(updated);
    try {
      localStorage.setItem(ZAKAT_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Storage write fallback
    }
    toast.success('Zakat calculation saved to History!');
  };

  // Toggle Paid status in History
  const handleTogglePaid = (recordId: string) => {
    const updated = historyList.map((r) => {
      if (r.id === recordId) {
        return { ...r, isPaid: !r.isPaid };
      }
      return r;
    });
    setHistoryList(updated);
    try {
      localStorage.setItem(ZAKAT_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Storage write fallback
    }
  };

  // Delete from History
  const handleDeleteHistory = (recordId: string) => {
    const updated = historyList.filter((r) => r.id !== recordId);
    setHistoryList(updated);
    try {
      localStorage.setItem(ZAKAT_HISTORY_KEY, JSON.stringify(updated));
    } catch {
      // Storage write fallback
    }
    toast.success('Record removed from History');
  };

  // Load Record back into Calculator
  const handleLoadRecord = (r: ZakatHistoryRecord) => {
    if (r.currency) {
      setActiveCurrency(r.currency);
      saveCurrency(r.currency);
    }
    if (r.nisabType) setNisabChoice(r.nisabType);
    if (r.assetsBreakdown) {
      setCashHome(r.assetsBreakdown.cashHome ? String(r.assetsBreakdown.cashHome) : '');
      setBankAccounts(r.assetsBreakdown.bankAccounts ? String(r.assetsBreakdown.bankAccounts) : '');
      setReceivables(r.assetsBreakdown.receivables ? String(r.assetsBreakdown.receivables) : '');
      setInvestments(r.assetsBreakdown.investments ? String(r.assetsBreakdown.investments) : '');
      setBusinessStock(r.assetsBreakdown.businessStock ? String(r.assetsBreakdown.businessStock) : '');
      setOtherAssets(r.assetsBreakdown.otherAssets ? String(r.assetsBreakdown.otherAssets) : '');
      setDebts(r.assetsBreakdown.debts ? String(r.assetsBreakdown.debts) : '');
      if (r.assetsBreakdown.goldValue) {
        setGoldInputMode('value');
        setGoldWeightOrValue(String(r.assetsBreakdown.goldValue));
      }
      if (r.assetsBreakdown.silverValue) {
        setSilverInputMode('value');
        setSilverWeightOrValue(String(r.assetsBreakdown.silverValue));
      }
    }
    setActiveTab('calculator');
    toast.success('Calculation loaded into Calculator');
  };

  // Share / Copy Clean Receipt
  const handleShareReceipt = async () => {
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const receiptText = [
      `🕋 NOOR CONNECT — ZAKAT AL-MĀL CALCULATION`,
      `📅 Date: ${dateFormatted}`,
      `💰 Currency: ${activeCurrency}`,
      `---------------------------------`,
      `• Gross Zakatable Assets: ${formatCurrencyAmount(totalGrossWealth, activeCurrency)}`,
      `• Deductible Liabilities: - ${formatCurrencyAmount(totalLiabilities, activeCurrency)}`,
      `• Net Zakatable Wealth: ${formatCurrencyAmount(netZakatableWealth, activeCurrency)}`,
      `• Nisab Threshold (${nisabChoice.toUpperCase()}): ${formatCurrencyAmount(activeNisabThreshold, activeCurrency)}`,
      `• Status: ${isNisabReached ? 'OBLIGATORY (Nisab Reached)' : 'BELOW NISAB (Optional Sadaqah)'}`,
      `---------------------------------`,
      `✨ TOTAL ZAKAT DUE (2.5%): ${formatCurrencyAmount(zakatDue, activeCurrency)}`,
      ...(zakatDue > 0 ? [`💡 Monthly Option: ${formatCurrencyAmount(Math.round(zakatDue / 12), activeCurrency)}/month`] : []),
      ...(ushrResult.due > 0 ? [`🌾 Agricultural Ushr: ${formatCurrencyAmount(ushrResult.due, activeCurrency)} (${ushrResult.label})`] : []),
      ...(livestockResult?.isZakatable ? [`🐑 Livestock Zakat: ${livestockResult.dueText}`] : []),
      `---------------------------------`,
      `Calculated with Noor Connect (100% Offline & Private)`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Zakat Calculation — Noor Connect',
          text: receiptText,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(receiptText);
      toast.success('Zakat summary copied to clipboard!');
    } catch {
      toast.error('Unable to copy summary');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col pb-28">
      {/* ── TOP APP BAR ── */}
      <header className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isEmbedded && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold font-serif text-[var(--text-primary)] truncate flex items-center gap-1.5">
                <span>Zakat Calculator</span>
                <span className="text-[10px] uppercase font-sans font-bold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)]">
                  Shariah 2.5%
                </span>
              </h1>
            </div>
          </div>

          {/* Top Right: Currency selector pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={activeCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--accent-text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Language Bar (English | Urdu | Gujarati | Hindi) */}
        <div className="max-w-xl mx-auto mt-2">
          <ContentLanguageBar compact />
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-xl mx-auto w-full px-4 pt-3.5 space-y-4">
        {/* ── SEGMENTED TOP TABS: Calculator vs History ── */}
        <div className="grid grid-cols-2 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'calculator'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>🧮 Calculator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>🕒 History ({historyList.length})</span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB 1: CALCULATOR                                                   */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calculator' && (
          <div className="space-y-4">
            {/* ── ROYAL HERO BANNER CARD ── */}
            <div
              className="rounded-[22px] p-4 border relative overflow-hidden text-[var(--text-primary)] shadow-sm"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
                backgroundImage: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface)), var(--surface))',
                boxShadow: 'inset 0 1px 0 var(--card-sheen)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                  ♡ ZAKAT AL-MĀL
                </span>
                <span className="text-[10.5px] font-mono font-bold bg-[var(--accent)] text-[var(--on-accent)] px-2.5 py-0.5 rounded-full">
                  2.5% (1/40th)
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)] leading-tight">
                    Purify Your Wealth
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    Calculated strictly according to authentic Islamic Shariah (Hawl & Nisab).
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-arabic font-bold text-3xl sm:text-4xl text-[var(--accent-text)] select-none">
                    الزكاة
                  </span>
                </div>
              </div>

              {/* Quick Button: Simple Shariah Rules */}
              <div className="pt-3 mt-3 border-t border-[var(--border)]/60 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowShariahRulesModal(true)}
                  className="text-xs font-bold text-[var(--accent-text)] hover:underline inline-flex items-center gap-1.5"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>📖 Simple Shariah Rules (Who Must Pay?)</span>
                </button>
              </div>
            </div>

            {/* ── LIVE GOLD & SILVER MARKET RATES CARD (ZERO 0.00/g BUG) ── */}
            <div
              className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[var(--accent-text)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Live Bullion Rates ({activeCurrency})
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                      rates?.isOverridden
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : rates?.source === 'live'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    ● {rates?.isOverridden ? 'Custom Override' : rates?.source === 'live' ? 'Live Market' : 'Offline Baseline'}
                  </span>

                  <button
                    type="button"
                    onClick={() => loadRates(activeCurrency, true)}
                    disabled={isLoadingRates}
                    title="Refresh live metal rates"
                    className="p-1 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRates ? 'animate-spin text-[var(--accent)]' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenOverride}
                    className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent-text)] inline-flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Override</span>
                  </button>
                </div>
              </div>

              {/* Two side-by-side Bullion Rate Boxes */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 24K Gold Rate */}
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                      24K Fine Gold
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                      {rates?.rawDateStr ? rates.rawDateStr.slice(5) : '2026'}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight">
                    {formatCurrencyAmount(effectiveGoldPerGram, activeCurrency)}/g
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                    {formatCurrencyAmount(rates?.goldPerTola || effectiveGoldPerGram * TOLA_IN_GRAMS, activeCurrency)}/tola
                  </div>
                </div>

                {/* 999 Silver Rate */}
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-300">
                      999 Fine Silver
                    </span>
                    <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                      {rates?.rawDateStr ? rates.rawDateStr.slice(5) : '2026'}
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight">
                    {formatCurrencyAmount(effectiveSilverPerGram, activeCurrency)}/g
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                    {formatCurrencyAmount(rates?.silverPerTola || effectiveSilverPerGram * TOLA_IN_GRAMS, activeCurrency)}/tola
                  </div>
                </div>
              </div>
            </div>

            {/* ── NISAB THRESHOLD SELECTOR CARD ── */}
            <div
              className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Select Nisab Threshold Standard
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Silver Nisab (Recommended) */}
                <button
                  type="button"
                  onClick={() => setNisabChoice('silver')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    nisabChoice === 'silver'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold uppercase text-[var(--accent-text)]">
                      Silver Nisab
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--on-accent)]">
                      Recommended
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight">
                    {formatCurrencyAmount(silverNisabValue, activeCurrency)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    612.36g (52.5 Tola)
                  </div>
                </button>

                {/* Gold Nisab */}
                <button
                  type="button"
                  onClick={() => setNisabChoice('gold')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    nisabChoice === 'gold'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold uppercase text-[var(--text-primary)]">
                      Gold Nisab
                    </span>
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight">
                    {formatCurrencyAmount(goldNisabValue, activeCurrency)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                    87.48g (7.5 Tola)
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                * Note: Classical Hanafi scholars and contemporary fiqh councils recommend the <b>Silver Nisab</b> for cash and mixed wealth so more aid reaches the poor and needy.
              </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* 9 WEALTH & LIABILITY SECTIONS                                  */}
            {/* ══════════════════════════════════════════════════════════════ */}

            {/* 1) Cash & Bank Balances */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">1. Cash & Bank Balances</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Cash at home, bank savings, and loans given out</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(cashTotal, activeCurrency)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1">
                    Cash at Home / Hand
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={cashHome}
                    onChange={(e) => setCashHome(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1">
                    Bank Balances (Savings / FD)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={bankAccounts}
                    onChange={(e) => setBankAccounts(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1">
                    Money Lent (Receivables)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={receivables}
                    onChange={(e) => setReceivables(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>

            {/* 2) Gold (Jewelry, Coins & Bars) */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-amber-500">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">2. Gold (Jewelry, Coins & Bars)</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Supports Grams, Tolas & 24K/22K/21K/18K</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(calculatedGoldValue, activeCurrency)}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Mode & Purity Selector Controls */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Unit Mode */}
                  <div className="flex items-center gap-1 bg-[var(--surface-2)] p-0.5 rounded-xl border border-[var(--border)]">
                    {(['grams', 'tolas', 'value'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setGoldInputMode(mode)}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all ${
                          goldInputMode === mode
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mode === 'value' ? 'Direct Value' : mode}
                      </button>
                    ))}
                  </div>

                  {/* Purity Karat */}
                  {goldInputMode !== 'value' && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">Purity:</span>
                      <select
                        value={goldKarat}
                        onChange={(e) => setGoldKarat(Number(e.target.value))}
                        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1 text-xs font-bold text-[var(--accent-text)]"
                      >
                        {Object.entries(GOLD_KARAT_MULTIPLIERS).map(([karat, info]) => (
                          <option key={karat} value={karat}>
                            {info.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Input Field */}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={
                      goldInputMode === 'grams'
                        ? 'Weight in grams (e.g. 50)'
                        : goldInputMode === 'tolas'
                        ? 'Weight in tolas (e.g. 4.5)'
                        : 'Total market value in currency'
                    }
                    value={goldWeightOrValue}
                    onChange={(e) => setGoldWeightOrValue(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Live Value Calculation Preview */}
                {parseNum(goldWeightOrValue) > 0 && (
                  <div className="text-[11px] font-medium text-[var(--accent-text)] bg-[var(--surface-2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                    💡 {goldWeightOrValue} {goldInputMode === 'tolas' ? 'Tola' : goldInputMode === 'grams' ? 'grams' : ''} of {goldKarat}K Gold = <b>{formatCurrencyAmount(calculatedGoldValue, activeCurrency)}</b>
                  </div>
                )}
              </div>
            </div>

            {/* 3) Silver (Utensils, Coins, Bars & Jewelry) */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-slate-400">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">3. Silver (Utensils, Coins & Bars)</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Supports Grams, Tolas & Direct Value</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(calculatedSilverValue, activeCurrency)}
                </span>
              </div>

              <div className="space-y-2.5 pt-1">
                {/* Unit Mode */}
                <div className="flex items-center gap-1 bg-[var(--surface-2)] p-0.5 rounded-xl border border-[var(--border)] w-fit">
                  {(['grams', 'tolas', 'value'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSilverInputMode(mode)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all ${
                        silverInputMode === mode
                          ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'value' ? 'Direct Value' : mode}
                    </button>
                  ))}
                </div>

                {/* Input Field */}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={
                      silverInputMode === 'grams'
                        ? 'Weight in grams (e.g. 500)'
                        : silverInputMode === 'tolas'
                        ? 'Weight in tolas (e.g. 42)'
                        : 'Total silver value in currency'
                    }
                    value={silverWeightOrValue}
                    onChange={(e) => setSilverWeightOrValue(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Live Silver Value Preview */}
                {parseNum(silverWeightOrValue) > 0 && (
                  <div className="text-[11px] font-medium text-[var(--accent-text)] bg-[var(--surface-2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                    💡 {silverWeightOrValue} {silverInputMode === 'tolas' ? 'Tola' : silverInputMode === 'grams' ? 'grams' : ''} of Silver = <b>{formatCurrencyAmount(calculatedSilverValue, activeCurrency)}</b>
                  </div>
                )}
              </div>
            </div>

            {/* 4) Investments, Shares & Crypto */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">4. Investments, Shares & Crypto</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Stocks, mutual funds, ETFs, Sukuk & crypto portfolio</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(investmentTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Market value of shares, mutual funds & crypto"
                  value={investments}
                  onChange={(e) => setInvestments(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* 5) Business Inventory & Trade Goods */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">5. Business Inventory & Goods</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Wholesale stock, finished merchandise & goods for resale</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(businessTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Current sale value of trade inventory"
                  value={businessStock}
                  onChange={(e) => setBusinessStock(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* 6) Other Zakatable Assets */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">6. Other Zakatable Assets</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Rental savings, property for resale & withdrawable PF</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[var(--accent-text)]">
                  {formatCurrencyAmount(otherTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Total value of other zakatable assets"
                  value={otherAssets}
                  onChange={(e) => setOtherAssets(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* 7) Agricultural Produce (Optional Expandable Ushr Card) */}
            <div
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <button
                type="button"
                onClick={() => setShowUshrSection(!showUshrSection)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                    <Wheat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">7. Agricultural Produce (Ushr)</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Due at harvest if ≥ 653kg (5 Wasq), no 1-yr Hawl wait</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ushrResult.due > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-500">
                      {formatCurrencyAmount(ushrResult.due, activeCurrency)}
                    </span>
                  )}
                  {showUshrSection ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
                </div>
              </button>

              {showUshrSection && (
                <div className="p-4 pt-0 space-y-3 border-t border-[var(--border)]/60">
                  <div className="space-y-1.5 pt-3">
                    <label className="text-[10.5px] font-bold uppercase text-[var(--text-secondary)] block">
                      Irrigation Method:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'rain', label: 'Rain / River (10%)' },
                        { id: 'artificial', label: 'Paid / Well (5%)' },
                        { id: 'mixed', label: 'Mixed (7.5%)' },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setIrrigationType(type.id as 'rain' | 'artificial' | 'mixed')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                            irrigationType === type.id
                              ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                              : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                      Harvest Market Value:
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="Total harvest value in currency"
                      value={harvestValue}
                      onChange={(e) => setHarvestValue(e.target.value)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  {ushrResult.due > 0 && (
                    <div className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      🌾 Ushr Due: <b>{formatCurrencyAmount(ushrResult.due, activeCurrency)}</b> ({ushrResult.percentage} of harvest)
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 8) Livestock (Optional Expandable An'am Card) */}
            <div
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <button
                type="button"
                onClick={() => setShowLivestockSection(!showLivestockSection)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">8. Livestock (An'am Shariah Helper)</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Grazing goats/sheep, cattle/buffaloes, and camels held 1 year</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {livestockResult?.isZakatable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                      Zakat Due
                    </span>
                  )}
                  {showLivestockSection ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />}
                </div>
              </button>

              {showLivestockSection && (
                <div className="p-4 pt-0 space-y-3 border-t border-[var(--border)]/60">
                  <div className="grid grid-cols-3 gap-2.5 pt-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                        Goats / Sheep
                      </label>
                      <input
                        type="number"
                        placeholder="Nisab 40+"
                        value={sheepCount}
                        onChange={(e) => setSheepCount(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                        Cattle / Buffaloes
                      </label>
                      <input
                        type="number"
                        placeholder="Nisab 30+"
                        value={cattleCount}
                        onChange={(e) => setCattleCount(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                        Camels
                      </label>
                      <input
                        type="number"
                        placeholder="Nisab 5+"
                        value={camelCount}
                        onChange={(e) => setCamelCount(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-[var(--text-primary)]"
                      />
                    </div>
                  </div>

                  {livestockResult && (
                    <div className="text-xs text-[var(--text-primary)] bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border)] space-y-1">
                      <div className="font-bold text-[var(--accent-text)]">Shariah Verdict:</div>
                      {livestockResult.notes.map((n, i) => (
                        <div key={i} className="text-[11px]">• {n}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 9) Liabilities & Immediate Debts (Deduct) */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-rose-500/30 space-y-3 shadow-xs"
              style={{
                boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                backgroundImage: 'linear-gradient(135deg, color-mix(in srgb, var(--danger) 5%, var(--surface)), var(--surface))',
              }}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-500">9. Liabilities & Immediate Debts</h3>
                    <p className="text-[10.5px] text-[var(--text-secondary)]">Loans due immediately, unpaid utility bills, rent & unpaid wages</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-rose-500">
                  - {formatCurrencyAmount(totalLiabilities, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Total deductible liabilities due immediately"
                  value={debts}
                  onChange={(e) => setDebts(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-rose-500/30 rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* ── STICKY / PROMINENT LIVE ZAKAT SUMMARY & ACTION CARD ── */}
            <div
              className="rounded-[22px] p-4.5 bg-[var(--surface)] border border-[var(--border)] space-y-4 shadow-md"
              style={{
                boxShadow: '0 8px 32px -8px var(--accent-glow), inset 0 1px 0 var(--card-sheen)',
                borderWidth: '1.5px',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[var(--accent)]" />
                  Zakat Al-Māl Calculation Summary
                </span>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-rose-500 hover:underline"
                >
                  ↻ Reset All
                </button>
              </div>

              {/* Itemized Table */}
              <div className="space-y-1.5 text-xs bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
                <div className="flex items-center justify-between text-[var(--text-secondary)]">
                  <span>Gross Zakatable Wealth:</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{formatCurrencyAmount(totalGrossWealth, activeCurrency)}</span>
                </div>
                <div className="flex items-center justify-between text-rose-500">
                  <span>Less Deductible Liabilities:</span>
                  <span className="font-mono font-bold">- {formatCurrencyAmount(totalLiabilities, activeCurrency)}</span>
                </div>
                <div className="border-t border-[var(--border)] pt-1.5 flex items-center justify-between font-bold text-sm">
                  <span>Net Zakatable Wealth:</span>
                  <span className="font-mono text-[var(--accent-text)]">{formatCurrencyAmount(netZakatableWealth, activeCurrency)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
                  <span>Active Nisab Threshold ({nisabChoice.toUpperCase()}):</span>
                  <span className="font-mono">{formatCurrencyAmount(activeNisabThreshold, activeCurrency)}</span>
                </div>
              </div>

              {/* Dynamic Shariah Verdict Badge */}
              <div>
                {isNisabReached ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm">
                        ✓ NISAB REACHED — ZAKAT IS OBLIGATORY (2.5%)
                      </div>
                      <div className="text-[10.5px] text-[var(--text-secondary)] mt-0.5">
                        Your net wealth meets or exceeds the Nisab threshold.
                      </div>
                    </div>
                  </div>
                ) : netZakatableWealth > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5 text-amber-600 dark:text-amber-400">
                    <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>BELOW NISAB — NO ZAKAT OBLIGATORY</span>
                    </div>
                    <div className="text-[10.5px] text-[var(--text-secondary)]">
                      Your net wealth is below the {nisabChoice} threshold. Sadaqah (voluntary charity) remains highly rewarded.
                    </div>
                    {/* Progress Bar towards Nisab */}
                    <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden mt-1 border border-[var(--border)]">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentOfNisab}%` }}
                      />
                    </div>
                    <div className="text-right text-[10px] font-mono text-[var(--text-secondary)]">
                      {percentOfNisab}% of Nisab threshold
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
                    Enter your assets above to check your Nisab status.
                  </div>
                )}
              </div>

              {/* Large Highlighted Zakat Due Box */}
              <div
                className="p-4 rounded-2xl border text-center space-y-1 relative overflow-hidden"
                style={{
                  background: isNisabReached
                    ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 24%, var(--surface-2)), var(--surface-2))'
                    : 'var(--surface-2)',
                  borderColor: isNisabReached ? 'var(--accent)' : 'var(--border)',
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Zakat Al-Māl Due (2.5%)
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--accent-text)]">
                  {formatCurrencyAmount(zakatDue, activeCurrency)}
                </div>
                {zakatDue > 0 && (
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium pt-0.5">
                    💡 Or pay in installments: <b>{formatCurrencyAmount(Math.round(zakatDue / 12), activeCurrency)}/month</b> over 12 lunar months
                  </div>
                )}

                {/* Additional Ushr & Livestock Due Lines if Present */}
                {ushrResult.due > 0 && (
                  <div className="text-xs font-bold text-emerald-500 pt-1 border-t border-[var(--border)]/60 mt-2">
                    🌾 Agricultural Produce Ushr: {formatCurrencyAmount(ushrResult.due, activeCurrency)}
                  </div>
                )}
                {livestockResult?.isZakatable && (
                  <div className="text-xs font-bold text-amber-500 pt-1">
                    🐑 Livestock Zakat: {livestockResult.dueText}
                  </div>
                )}
              </div>

              {/* Action Buttons: Save, Copy/Share, Reset */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveToHistory}
                  className="py-2.5 px-3 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>Save to History</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareReceipt}
                  className="py-2.5 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Share2 className="w-4 h-4 text-[var(--accent-text)]" />
                  <span>Share / Copy</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* TAB 2: HISTORY LIST                                                 */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {historyList.length === 0 ? (
              <div className="text-center py-16 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-3">
                <div className="w-14 h-14 bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl flex items-center justify-center mx-auto text-[var(--accent-text)]">
                  <History className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-[var(--text-primary)]">No Saved Calculations Yet</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  When you calculate your Zakat in the Calculator tab, tap <b>Save to History</b> to keep track of your calculations across lunar years.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold"
                >
                  Go to Calculator
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Saved Calculations ({historyList.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Clear all saved zakat records?')) {
                        setHistoryList([]);
                        localStorage.removeItem(ZAKAT_HISTORY_KEY);
                        toast.success('History cleared');
                      }
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                {historyList.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
                    style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {record.dateStr}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                          {record.currency}
                        </span>
                      </div>

                      {/* Paid Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(record.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all ${
                          record.isPaid
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {record.isPaid ? <Check className="w-3 h-3" /> : null}
                        <span>{record.isPaid ? 'Paid' : 'Mark as Paid'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Net Zakatable Wealth:</span>
                        <span className="font-mono font-bold text-[var(--text-primary)]">
                          {formatCurrencyAmount(record.netWorth, record.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Zakat Due (2.5%):</span>
                        <span className="font-mono font-bold text-[var(--accent-text)]">
                          {formatCurrencyAmount(record.zakatDue, record.currency)}
                        </span>
                      </div>
                    </div>

                    {record.livestockSummary && (
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        🐑 {record.livestockSummary}
                      </div>
                    )}
                    {record.ushrDue && record.ushrDue > 0 && (
                      <div className="text-[11px] text-emerald-500 font-semibold">
                        🌾 Agricultural Ushr: {formatCurrencyAmount(record.ushrDue, record.currency)}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--border)]/60">
                      <button
                        type="button"
                        onClick={() => handleLoadRecord(record)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent-text)] flex items-center gap-1"
                      >
                        <Calculator className="w-3 h-3" />
                        <span>Load</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteHistory(record.id)}
                        className="p-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-500/50"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: SIMPLE SHARIAH RULES EXPLAINER                            */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showShariahRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-[24px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px -15px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                  Simple Shariah Zakat Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShariahRulesModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]">
                <span className="font-bold text-[var(--accent-text)] block mb-1">What is Zakat al-Māl?</span>
                Zakat is the third pillar of Islam. It is a mandatory 2.5% (1/40th) purification due annually on qualifying wealth held for one lunar year (Hawl) above the minimum threshold (Nisab).
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">1. Who Must Pay Zakat?</h4>
                <p>Every adult Muslim who is sane, free, and possesses surplus wealth equal to or greater than the <b>Nisab threshold</b> for a full lunar year (approx. 354 days).</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">2. What is Nisab?</h4>
                <p>Nisab is the minimum qualifying wealth threshold:</p>
                <ul className="list-disc pl-4 space-y-1 pt-1">
                  <li><b>Silver Nisab:</b> 612.36 grams (52.5 Tolas). <i>Recommended by Hanafi scholars and contemporary fiqh councils for cash, savings, and mixed wealth.</i></li>
                  <li><b>Gold Nisab:</b> 87.48 grams (7.5 Tolas).</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">3. What Assets are EXEMPT? (No Zakat Due)</h4>
                <ul className="list-disc pl-4 space-y-1 pt-1">
                  <li>Your personal primary residence (home).</li>
                  <li>Your personal car or transport vehicle.</li>
                  <li>Personal daily clothes, household furniture, and appliances.</li>
                  <li>Tools of trade or machinery used for business operations (not held for sale).</li>
                </ul>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">4. Who Receives Zakat? (Surah At-Tawbah 9:60)</h4>
                <p>Zakat is distributed strictly to the eight eligible categories specified in the Holy Quran: the poor (Fuqara), the needy (Masakin), zakat administrators, those whose hearts are to be reconciled, freeing captives/slaves, those overburdened with debt (Gharimin), in the path of Allah (Fi Sabilillah), and stranded travelers (Ibn al-Sabil).</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] text-right">
              <button
                type="button"
                onClick={() => setShowShariahRulesModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-bold text-xs"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: MANUAL METAL PRICE OVERRIDE                               */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div
            className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-[24px] flex flex-col shadow-2xl overflow-hidden"
            style={{ boxShadow: '0 20px 60px -15px rgba(0,0,0,0.5)' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)]">
                  Override Gold & Silver Rates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3.5 text-xs">
              <p className="text-[var(--text-secondary)]">
                You can manually enter the exact Gold and Silver prices quoted by your local trusted jeweler in <b>{activeCurrency}</b>:
              </p>

              <div>
                <label className="text-[10.5px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                  24K Gold Price per 1 Gram ({activeCurrency})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 7850"
                  value={overrideGoldGram}
                  onChange={(e) => setOverrideGoldGram(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="text-[10.5px] font-bold uppercase text-[var(--text-secondary)] block mb-1">
                  999 Fine Silver Price per 1 Gram ({activeCurrency})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 96"
                  value={overrideSilverGram}
                  onChange={(e) => setOverrideSilverGram(e.target.value)}
                  className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-between">
              <button
                type="button"
                onClick={handleResetOverride}
                className="px-3 py-2 rounded-xl text-xs font-bold text-rose-500 hover:underline"
              >
                Reset to Live Market
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveOverride}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-bold text-xs"
                >
                  Apply Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
