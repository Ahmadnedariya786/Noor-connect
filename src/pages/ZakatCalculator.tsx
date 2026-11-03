import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  Coins,
  Scale,
  RefreshCw,
  Edit3,
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
  RotateCcw,
  FileText,
  Loader2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { useContentLanguage } from "@/lib/content-translator";
import { getZakatUIStrings } from "@/lib/zakat-i18n";
import { shareZakatPdfReport, ZakatPdfData } from "@/lib/zakat-pdf-generator";
import { getSelectedLogoEdition } from "@/components/NoorDynamicLogo";
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

  // Multi-Language Content Engine
  const { contentLang } = useContentLanguage();
  const ui = useMemo(() => getZakatUIStrings(contentLang), [contentLang]);
  const isUrdu = contentLang === 'ur';

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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

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

  // Generate & Share 1-Page A4 Zakat Report PDF
  const handleSharePdfReport = async () => {
    if (isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdfData: ZakatPdfData = {
        lang: contentLang,
        currency: activeCurrency,
        edition: getSelectedLogoEdition(),
        goldPerGram: effectiveGoldPerGram,
        silverPerGram: effectiveSilverPerGram,
        goldPerTola: rates?.goldPerTola || effectiveGoldPerGram * TOLA_IN_GRAMS,
        silverPerTola: rates?.silverPerTola || effectiveSilverPerGram * TOLA_IN_GRAMS,
        nisabChoice,
        activeNisabThreshold,
        isNisabReached,
        cashTotal,
        goldTotal: calculatedGoldValue,
        silverTotal: calculatedSilverValue,
        investmentsTotal: investmentTotal,
        businessTotal,
        otherTotal,
        ushrDue: ushrResult.due,
        ushrPercentage: ushrResult.percentage,
        livestockZakatable: livestockResult?.isZakatable || false,
        livestockDueText: livestockResult?.dueText,
        totalLiabilities,
        totalGrossWealth,
        netZakatableWealth,
        zakatDue,
      };

      const dateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const summaryText = [
        `🕋 NOOR CONNECT — ZAKAT AL-MĀL ASSESSMENT REPORT`,
        `📅 Date: ${dateFormatted}`,
        `💰 Currency: ${activeCurrency}`,
        `---------------------------------`,
        `• Gross Zakatable Assets: ${formatCurrencyAmount(totalGrossWealth, activeCurrency)}`,
        `• Deductible Liabilities: -${formatCurrencyAmount(totalLiabilities, activeCurrency)}`,
        `• Net Zakatable Wealth: ${formatCurrencyAmount(netZakatableWealth, activeCurrency)}`,
        `• Nisab Threshold (${nisabChoice.toUpperCase()}): ${formatCurrencyAmount(activeNisabThreshold, activeCurrency)}`,
        `• Status: ${isNisabReached ? 'OBLIGATORY (Nisab Reached)' : 'BELOW NISAB (Optional Sadaqah)'}`,
        `---------------------------------`,
        `✨ TOTAL ZAKAT DUE (2.5%): ${formatCurrencyAmount(zakatDue, activeCurrency)}`,
        ...(zakatDue > 0 ? [`💡 Monthly Option: ${formatCurrencyAmount(Math.round(zakatDue / 12), activeCurrency)}/month`] : []),
        ...(ushrResult.due > 0 ? [`🌾 Agricultural Produce Ushr: ${formatCurrencyAmount(ushrResult.due, activeCurrency)} (${ushrResult.label})`] : []),
        ...(livestockResult?.isZakatable ? [`🐑 Livestock Zakat: ${livestockResult.dueText}`] : []),
        `---------------------------------`,
        `Calculated locally with Noor Connect (100% Offline & Private)`,
      ].join('\n');

      const result = await shareZakatPdfReport(pdfData, summaryText);
      if (result.method === 'download-fallback') {
        toast.success('Zakat PDF report downloaded successfully!');
      } else {
        toast.success('Zakat PDF report opened in Share Sheet!');
      }
    } catch (err) {
      console.error('[ZakatCalculator] Failed to generate/share PDF:', err);
      toast.error('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy Clean Text Receipt to Clipboard
  const handleCopyTextReceipt = async () => {
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const receiptText = [
      `🕋 NOOR CONNECT — ZAKAT AL-MĀL CALCULATION`,
      `📅 Date: ${dateFormatted}`,
      `💰 Currency: ${activeCurrency}`,
      `---------------------------------`,
      `• Gross Zakatable Assets: ${formatCurrencyAmount(totalGrossWealth, activeCurrency)}`,
      `• Deductible Liabilities: -${formatCurrencyAmount(totalLiabilities, activeCurrency)}`,
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

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(receiptText);
        toast.success('✓ Zakat summary copied to clipboard!');
        return;
      }
    } catch {
      // Fallback to legacy execCommand
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = receiptText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success('✓ Zakat summary copied to clipboard!');
    } catch {
      toast.error('Unable to copy summary to clipboard.');
    }
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col pb-28"
      style={{
        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
      }}
    >
      {/* ── TOP APP BAR (WITH STATUS-BAR & CAMERA SAFE-AREA CLEARANCE) ── */}
      <header
        className="sticky top-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--border)] px-4 pb-3"
        style={{
          paddingTop: isEmbedded ? '12px' : 'max(calc(env(safe-area-inset-top, 0px) + 16px), 46px)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {!isEmbedded && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Back"
                className="w-9 h-9 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1
              className="font-extrabold font-serif text-[var(--text-primary)] whitespace-nowrap min-w-0"
              style={{
                fontSize: 'clamp(0.98rem, 4.3vw, 1.12rem)',
                fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                overflow: 'visible',
              }}
            >
              {ui.title}
            </h1>
          </div>

          {/* Top Right: Compact Currency selector pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={activeCurrency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-xs font-bold text-[var(--accent-text)] focus:outline-none focus:border-[var(--accent)] cursor-pointer shrink-0 whitespace-nowrap"
              style={{ padding: '6px 10px', fontSize: '0.76rem' }}
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

      {/* ── MAIN CONTENT CONTAINER (RTL IN URDU) ── */}
      <main className="max-w-xl mx-auto w-full px-4 pt-3.5 space-y-4" dir={isUrdu ? 'rtl' : 'ltr'}>
        {/* ── SEGMENTED TOP TABS: Calculator vs History (NO DUPLICATE EMOJIS) ── */}
        <div className="grid grid-cols-2 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab('calculator')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Calculator className="w-4 h-4 shrink-0" />
            <span>{ui.tabCalculator}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-[var(--accent)] text-[var(--on-accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            <span>{ui.tabHistory} ({historyList.length})</span>
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
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                  {ui.heroBadge}
                </span>
                <span className="text-[10.5px] font-mono font-bold bg-[var(--accent)] text-[var(--on-accent)] px-2.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                  {ui.heroPill}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-primary)] leading-tight">
                    {ui.heroTitle}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {ui.heroSub}
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
                  <span>{ui.rulesBtn}</span>
                </button>
              </div>
            </div>

            {/* ── LIVE GOLD & SILVER MARKET RATES CARD (NO TEXT COLLISION) ── */}
            <div
              className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Coins className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] whitespace-nowrap truncate">
                    {ui.liveRatesTitle} ({activeCurrency})
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      rates?.isOverridden
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : rates?.source === 'live'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]'
                    }`}
                  >
                    ● {rates?.isOverridden ? 'Override' : rates?.source === 'live' ? 'Live' : 'Baseline'}
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
                    className="px-2 py-1 rounded-lg text-[10.5px] font-bold bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--accent-text)] inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>{ui.overrideBtn}</span>
                  </button>
                </div>
              </div>

              {/* Two side-by-side Bullion Rate Boxes (Clean Single-Line Headers) */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* 24K Gold Rate */}
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="w-full">
                    <span
                      className="text-amber-600 dark:text-amber-400 block whitespace-nowrap"
                      style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.04em" }}
                    >
                      {ui.fineGold24k}
                    </span>
                  </div>
                  <div
                    className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(effectiveGoldPerGram, activeCurrency)}/g
                  </div>
                  <div
                    className="text-[10px] text-[var(--text-secondary)] font-mono whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(rates?.goldPerTola || effectiveGoldPerGram * TOLA_IN_GRAMS, activeCurrency)}/tola
                  </div>
                </div>

                {/* 999 Silver Rate */}
                <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                  <div className="w-full">
                    <span
                      className="text-slate-500 dark:text-slate-300 block whitespace-nowrap"
                      style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.04em" }}
                    >
                      {ui.fineSilver999}
                    </span>
                  </div>
                  <div
                    className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] font-mono leading-tight whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(effectiveSilverPerGram, activeCurrency)}/g
                  </div>
                  <div
                    className="text-[10px] text-[var(--text-secondary)] font-mono whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(rates?.silverPerTola || effectiveSilverPerGram * TOLA_IN_GRAMS, activeCurrency)}/tola
                  </div>
                </div>
              </div>
            </div>

            {/* ── NISAB THRESHOLD SELECTOR CARD (NON-WRAPPING LAYOUT) ── */}
            <div
              className="rounded-2xl p-3.5 bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5 whitespace-nowrap">
                  <Scale className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  {ui.nisabSectionTitle}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Silver Nisab (Recommended) */}
                <button
                  type="button"
                  onClick={() => setNisabChoice('silver')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    nisabChoice === 'silver'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="w-full mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent)] text-[var(--on-accent)] inline-block whitespace-nowrap">
                      {ui.recommended}
                    </span>
                  </div>
                  <div
                    className="text-[var(--accent-text)] uppercase whitespace-nowrap block mb-0.5"
                    style={{ fontSize: "0.76rem", fontWeight: 800 }}
                  >
                    {ui.silverNisab}
                  </div>
                  <div
                    className="text-[var(--text-primary)] font-mono leading-tight whitespace-nowrap"
                    style={{
                      fontSize: "clamp(0.95rem, 4.2vw, 1.12rem)",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrencyAmount(silverNisabValue, activeCurrency)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
                    612.36g (52.5 Tola)
                  </div>
                </button>

                {/* Gold Nisab */}
                <button
                  type="button"
                  onClick={() => setNisabChoice('gold')}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    nisabChoice === 'gold'
                      ? 'bg-[var(--accent-soft)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface-2)] border-[var(--border)] hover:border-[var(--accent)]/50'
                  }`}
                >
                  <div className="w-full mb-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] inline-block whitespace-nowrap">
                      {ui.std75tola}
                    </span>
                  </div>
                  <div
                    className="text-[var(--text-primary)] uppercase whitespace-nowrap block mb-0.5"
                    style={{ fontSize: "0.76rem", fontWeight: 800 }}
                  >
                    {ui.goldNisab}
                  </div>
                  <div
                    className="text-[var(--text-primary)] font-mono leading-tight whitespace-nowrap"
                    style={{
                      fontSize: "clamp(0.95rem, 4.2vw, 1.12rem)",
                      fontWeight: 800,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatCurrencyAmount(goldNisabValue, activeCurrency)}
                  </div>
                  <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 whitespace-nowrap">
                    87.48g (7.5 Tola)
                  </div>
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                {ui.nisabNote}
              </p>
            </div>

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* 9 WEALTH & LIABILITY SECTIONS (SINGLE-LINE SUBTOTALS)          */}
            {/* ══════════════════════════════════════════════════════════════ */}

            {/* 1) Cash & Bank Balances */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.cashTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.cashSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCurrencyAmount(cashTotal, activeCurrency)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1 truncate">
                    {ui.cashHome}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={ui.amountPlaceholder}
                    value={cashHome}
                    onChange={(e) => setCashHome(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1 truncate">
                    {ui.bankAccounts}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={ui.amountPlaceholder}
                    value={bankAccounts}
                    onChange={(e) => setBankAccounts(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] font-bold text-[var(--text-secondary)] uppercase block mb-1 truncate">
                    {ui.receivables}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={ui.amountPlaceholder}
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
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-amber-500 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.goldTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.goldSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
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
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all whitespace-nowrap ${
                          goldInputMode === mode
                            ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {mode === 'grams' ? ui.unitGrams : mode === 'tolas' ? ui.unitTolas : ui.unitValue}
                      </button>
                    ))}
                  </div>

                  {/* Purity Karat */}
                  {goldInputMode !== 'value' && (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] whitespace-nowrap">{ui.purityLabel}</span>
                      <select
                        value={goldKarat}
                        onChange={(e) => setGoldKarat(Number(e.target.value))}
                        className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1 text-xs font-bold text-[var(--accent-text)] cursor-pointer"
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

                {/* Input Field with Concise Placeholder */}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={
                      goldInputMode === 'grams'
                        ? ui.weightGramsPlaceholder
                        : goldInputMode === 'tolas'
                        ? ui.weightTolasPlaceholder
                        : ui.amountPlaceholder
                    }
                    value={goldWeightOrValue}
                    onChange={(e) => setGoldWeightOrValue(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Live Value Calculation Preview */}
                {parseNum(goldWeightOrValue) > 0 && (
                  <div className="text-[11px] font-medium text-[var(--accent-text)] bg-[var(--surface-2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                    💡 {goldWeightOrValue} {goldInputMode === 'tolas' ? 'Tola' : goldInputMode === 'grams' ? 'g' : ''} ({goldKarat}K) = <b>{formatCurrencyAmount(calculatedGoldValue, activeCurrency)}</b>
                  </div>
                )}
              </div>
            </div>

            {/* 3) Silver (Utensils, Coins & Bars) */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-slate-400 shrink-0">
                    <Coins className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.silverTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.silverSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
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
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold capitalize transition-all whitespace-nowrap ${
                        silverInputMode === mode
                          ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {mode === 'grams' ? ui.unitGrams : mode === 'tolas' ? ui.unitTolas : ui.unitValue}
                    </button>
                  ))}
                </div>

                {/* Input Field with Concise Placeholder */}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={
                      silverInputMode === 'grams'
                        ? ui.weightGramsPlaceholder
                        : silverInputMode === 'tolas'
                        ? ui.weightTolasPlaceholder
                        : ui.amountPlaceholder
                    }
                    value={silverWeightOrValue}
                    onChange={(e) => setSilverWeightOrValue(e.target.value)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>

                {/* Live Silver Value Preview */}
                {parseNum(silverWeightOrValue) > 0 && (
                  <div className="text-[11px] font-medium text-[var(--accent-text)] bg-[var(--surface-2)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
                    💡 {silverWeightOrValue} {silverInputMode === 'tolas' ? 'Tola' : silverInputMode === 'grams' ? 'g' : ''} = <b>{formatCurrencyAmount(calculatedSilverValue, activeCurrency)}</b>
                  </div>
                )}
              </div>
            </div>

            {/* 4) Investments, Shares & Crypto */}
            <div
              className="rounded-2xl p-4 bg-[var(--surface)] border border-[var(--border)] space-y-3 shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.investmentsTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.investmentsSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCurrencyAmount(investmentTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={ui.amountPlaceholder}
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
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.businessTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.businessSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCurrencyAmount(businessTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={ui.amountPlaceholder}
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
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shrink-0">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.otherTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.otherSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-[var(--accent-text)] shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatCurrencyAmount(otherTotal, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={ui.amountPlaceholder}
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
                className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Wheat className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.ushrTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.ushrSub}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ushrResult.due > 0 && (
                    <span
                      className="font-mono text-emerald-500"
                      style={{
                        whiteSpace: "nowrap",
                        padding: "3px 8px",
                        borderRadius: "8px",
                        background: "var(--surface-2)",
                        fontSize: "0.78rem",
                        fontWeight: 800,
                      }}
                    >
                      {formatCurrencyAmount(ushrResult.due, activeCurrency)}
                    </span>
                  )}
                  {showUshrSection ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />}
                </div>
              </button>

              {showUshrSection && (
                <div className="p-4 pt-0 space-y-3 border-t border-[var(--border)]/60">
                  <div className="space-y-1.5 pt-3">
                    <label className="text-[10.5px] font-bold uppercase text-[var(--text-secondary)] block">
                      {ui.ushrTitle}:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'rain', label: ui.rainIrrigation },
                        { id: 'artificial', label: ui.paidIrrigation },
                        { id: 'mixed', label: ui.mixedIrrigation },
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setIrrigationType(type.id as 'rain' | 'artificial' | 'mixed')}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
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
                      {ui.harvestPlaceholder}:
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder={ui.amountPlaceholder}
                      value={harvestValue}
                      onChange={(e) => setHarvestValue(e.target.value)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-sm font-bold font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>

                  {ushrResult.due > 0 && (
                    <div className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                      🌾 Ushr Due: <b>{formatCurrencyAmount(ushrResult.due, activeCurrency)}</b> ({ushrResult.percentage})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 8) Livestock (Optional Expandable An'am Card - Horizontally Aligned) */}
            <div
              className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] overflow-hidden shadow-xs"
              style={{ boxShadow: 'inset 0 1px 0 var(--card-sheen)' }}
            >
              <button
                type="button"
                onClick={() => setShowLivestockSection(!showLivestockSection)}
                className="w-full p-4 flex items-center justify-between gap-2 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-[var(--text-primary)]"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.livestockTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.livestockSub}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {livestockResult?.isZakatable && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 whitespace-nowrap">
                      Zakat Due
                    </span>
                  )}
                  {showLivestockSection ? <ChevronUp className="w-4 h-4 text-[var(--text-secondary)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />}
                </div>
              </button>

              {showLivestockSection && (
                <div className="p-4 pt-0 space-y-3 border-t border-[var(--border)]/60">
                  {/* Clean 3-Column Grid on Same Horizontal Baseline */}
                  <div className="grid grid-cols-3 gap-2.5 pt-3">
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <label
                        className="text-[var(--text-secondary)] uppercase block mb-1 truncate"
                        style={{ fontSize: "0.62rem", fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {ui.goatsLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="40+"
                        value={sheepCount}
                        onChange={(e) => setSheepCount(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <label
                        className="text-[var(--text-secondary)] uppercase block mb-1 truncate"
                        style={{ fontSize: "0.62rem", fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {ui.cattleLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="30+"
                        value={cattleCount}
                        onChange={(e) => setCattleCount(e.target.value)}
                        className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-bold font-mono text-[var(--text-primary)]"
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <label
                        className="text-[var(--text-secondary)] uppercase block mb-1 truncate"
                        style={{ fontSize: "0.62rem", fontWeight: 800, whiteSpace: "nowrap" }}
                      >
                        {ui.camelsLabel}
                      </label>
                      <input
                        type="number"
                        placeholder="5+"
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
              <div className="flex items-center justify-between gap-2.5 border-b border-[var(--border)]/60 pb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3
                      className="text-sm font-bold text-rose-500"
                      style={{
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                        lineHeight: isUrdu ? 1.6 : 1.3,
                        overflow: 'visible',
                      }}
                    >
                      {ui.debtsTitle}
                    </h3>
                    <p
                      className="text-[10.5px] text-[var(--text-secondary)]"
                      style={{
                        whiteSpace: 'normal',
                        overflow: 'visible',
                        lineHeight: isUrdu ? 1.95 : 1.45,
                        paddingBlock: '2px',
                        fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      }}
                    >
                      {ui.debtsSub}
                    </p>
                  </div>
                </div>
                <span
                  className="font-mono text-rose-500 shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "3px 8px",
                    borderRadius: "8px",
                    background: "var(--surface-2)",
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  -{formatCurrencyAmount(totalLiabilities, activeCurrency)}
                </span>
              </div>

              <div>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder={ui.debtsPlaceholder}
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
              <div className="flex items-center justify-between gap-2.5">
                <div
                  className="flex items-center gap-1.5 min-w-0"
                  style={{ flex: 1, minWidth: 0, lineHeight: isUrdu ? 1.85 : 1.5 }}
                >
                  <Receipt className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span
                    className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]"
                    style={{
                      fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                      overflow: 'visible',
                      whiteSpace: 'normal',
                    }}
                  >
                    {ui.summaryTitle}
                  </span>
                </div>
                {/* Reset button: Single icon, single line */}
                <button
                  type="button"
                  onClick={handleResetForm}
                  style={{
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "4px 10px",
                    borderRadius: "8px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    background: "var(--surface-2)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                  }}
                  className="hover:text-[var(--text-primary)] active:scale-95 transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>{ui.resetBtn}</span>
                </button>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2 text-xs bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)]">
                <div
                  className="flex items-center justify-between gap-2 text-[var(--text-secondary)]"
                  style={{ lineHeight: isUrdu ? 1.85 : 1.5, overflow: 'visible' }}
                >
                  <span style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined, overflow: 'visible' }}>
                    {ui.grossWealth}
                  </span>
                  <span
                    className="font-mono font-bold text-[var(--text-primary)] shrink-0 whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(totalGrossWealth, activeCurrency)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 text-rose-500"
                  style={{ lineHeight: isUrdu ? 1.85 : 1.5, overflow: 'visible' }}
                >
                  <span style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined, overflow: 'visible' }}>
                    {ui.lessLiabilities}
                  </span>
                  <span
                    className="font-mono font-bold shrink-0 whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    -{formatCurrencyAmount(totalLiabilities, activeCurrency)}
                  </span>
                </div>
                <div
                  className="border-t border-[var(--border)] pt-1.5 flex items-center justify-between gap-2 font-bold text-sm"
                  style={{ lineHeight: isUrdu ? 1.85 : 1.5, overflow: 'visible' }}
                >
                  <span style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined, overflow: 'visible' }}>
                    {ui.netWealth}
                  </span>
                  <span
                    className="font-mono text-[var(--accent-text)] shrink-0 whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(netZakatableWealth, activeCurrency)}
                  </span>
                </div>
                <div
                  className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)] pt-0.5"
                  style={{ lineHeight: isUrdu ? 1.85 : 1.5, overflow: 'visible' }}
                >
                  <span style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined, overflow: 'visible' }}>
                    {ui.activeNisabLabel} ({nisabChoice.toUpperCase()}):
                  </span>
                  <span
                    className="font-mono shrink-0 whitespace-nowrap"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrencyAmount(activeNisabThreshold, activeCurrency)}
                  </span>
                </div>
              </div>

              {/* Dynamic Shariah Verdict Badge */}
              <div>
                {isNisabReached ? (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm">
                        {ui.nisabReached}
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
                      <span>{ui.belowNisab}</span>
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
                    <div className="text-right text-[10px] font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      {percentOfNisab}% of Nisab threshold
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center text-xs text-[var(--text-secondary)]">
                    {ui.enterAssetsHint}
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
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] whitespace-nowrap">
                  {ui.zakatDueTitle}
                </div>
                <div
                  className="text-2xl sm:text-3xl font-black font-mono text-[var(--accent-text)] whitespace-nowrap"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatCurrencyAmount(zakatDue, activeCurrency)}
                </div>
                {zakatDue > 0 && (
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium pt-0.5 whitespace-nowrap">
                    💡 {ui.monthlyOpt} <b className="font-mono">{formatCurrencyAmount(Math.round(zakatDue / 12), activeCurrency)}/month</b>
                  </div>
                )}

                {/* Additional Ushr & Livestock Due Lines if Present */}
                {ushrResult.due > 0 && (
                  <div className="text-xs font-bold text-emerald-500 pt-1 border-t border-[var(--border)]/60 mt-2 whitespace-nowrap">
                    🌾 Agricultural Produce Ushr: {formatCurrencyAmount(ushrResult.due, activeCurrency)}
                  </div>
                )}
                {livestockResult?.isZakatable && (
                  <div className="text-xs font-bold text-amber-500 pt-1 whitespace-nowrap">
                    🐑 Livestock Zakat: {livestockResult.dueText}
                  </div>
                )}
              </div>

              {/* Action Buttons: 1-Tap PDF Share/Download, Save to History & Copy Text */}
              <div className="space-y-2 pt-1">
                {/* Primary Full-Width Gold/Accent Button: Share / Download PDF Report */}
                <button
                  type="button"
                  onClick={handleSharePdfReport}
                  disabled={isGeneratingPdf}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98 transition-all disabled:opacity-60 whitespace-nowrap"
                  style={{
                    boxShadow: '0 4px 14px -2px var(--accent-glow)',
                    fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
                  }}
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>{ui.generatingPdf}</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>{ui.sharePdfBtn}</span>
                    </>
                  )}
                </button>

                {/* Secondary 2-Button Row: Save to History & Copy Text */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleSaveToHistory}
                    className="py-2.5 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
                    style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined }}
                  >
                    <Bookmark className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                    <span>{ui.saveHistoryBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyTextReceipt}
                    className="py-2.5 px-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text-primary)] font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
                    style={{ fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined }}
                  >
                    <Copy className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
                    <span>{ui.copyTextBtn}</span>
                  </button>
                </div>
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
                <h3 className="font-bold text-base text-[var(--text-primary)]">{ui.noHistoryTitle}</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  {ui.noHistorySub}
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('calculator')}
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold"
                >
                  {ui.goToCalc}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    {ui.savedCalculations} ({historyList.length})
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
                    {ui.clearAll}
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
                        <span>{record.isPaid ? ui.paidBadge : ui.markPaidBtn}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border)]">
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Net Zakatable Wealth:</span>
                        <span className="font-mono font-bold text-[var(--text-primary)] whitespace-nowrap">
                          {formatCurrencyAmount(record.netWorth, record.currency)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase block">Zakat Due (2.5%):</span>
                        <span className="font-mono font-bold text-[var(--accent-text)] whitespace-nowrap">
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
                        <span>{ui.loadBtn}</span>
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
            style={{
              boxShadow: '0 20px 60px -15px rgba(0,0,0,0.5)',
              fontFamily: isUrdu ? 'var(--font-urdu), serif' : undefined,
            }}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                  {ui.rulesModalTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowShariahRulesModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
              <div className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]">
                <span className="font-bold text-[var(--accent-text)] block mb-1">{ui.rulesWhatIsZakat}</span>
                {ui.rulesWhatIsZakatDesc}
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">{ui.rulesWhoMustPay}</h4>
                <p>{ui.rulesWhoMustPayDesc}</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">{ui.rulesNisab}</h4>
                <p>{ui.rulesNisabDesc}</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">{ui.rulesExempt}</h4>
                <p>{ui.rulesExemptDesc}</p>
              </div>

              <div className="space-y-1">
                <h4 className="font-bold text-[var(--text-primary)] text-sm">{ui.rulesRecipients}</h4>
                <p>{ui.rulesRecipientsDesc}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[var(--border)] bg-[var(--surface-2)] text-right">
              <button
                type="button"
                onClick={() => setShowShariahRulesModal(false)}
                className="px-4 py-2 rounded-xl bg-[var(--accent)] text-[var(--on-accent)] font-bold text-xs"
              >
                {ui.closeBtn}
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
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
                  Override Gold & Silver Rates
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
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
