// Noor Connect — Home Screen Widgets Customizer Page
// Live 60fps Preview Card, Surface Styles, Opacity Steppers & Native Android Sync
// 100% offline-first with zero personal data loss guarantee

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutGrid,
  Check,
  Smartphone,
  Sparkles,
  MapPin,
  Sliders,
  Eye,
  Plus,
  Pin,
  BookOpen,
  Scroll,
  TrendingUp,
  CircleDot,
  Info,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { loadStoredLocation } from '@/lib/location-state';
import { getNextPrayer, getFormattedPrayerTimes } from '@/lib/prayer-calculator';
import { WidgetService } from '@/lib/widget-service';
import {
  type WidgetStyleConfig,
  type WidgetSurfaceStyle,
  ACCENT_PRESETS,
  loadWidgetStyleConfig,
  saveWidgetStyleConfig,
  syncWidgetStyleToNative,
  pinWidgetNative,
  getWidgetCustomizerI18n,
} from '@/lib/widget-customizer';
import { getLocalizedPrayerName } from '@/lib/home-prayer-i18n';

export const WidgetSettings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const strings = useMemo(() => getWidgetCustomizerI18n(language), [language]);

  const { prayerTimes, location } = usePrayerTimes();
  const [config, setConfig] = useState<WidgetStyleConfig>(() => loadWidgetStyleConfig());
  const [liveClockTime, setLiveClockTime] = useState<string>('06:05');
  const [syncedRecently, setSyncedRecently] = useState(false);
  const [pinningType, setPinningType] = useState<string | null>(null);

  // Live TextClock simulator for preview
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setLiveClockTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update helper
  const updateConfig = useCallback((patch: Partial<WidgetStyleConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveWidgetStyleConfig(next);
      syncWidgetStyleToNative(next);
      return next;
    });
  }, []);

  // Location resolution: hook -> localStorage -> Chhapi, India
  const activeLocation = useMemo(() => {
    if (location && location.locationName) return location;
    return loadStoredLocation();
  }, [location]);

  const displayCity = useMemo(() => {
    if (activeLocation?.locationName && activeLocation.locationName.trim()) {
      return activeLocation.locationName.trim();
    }
    return 'Chhapi, India';
  }, [activeLocation]);

  const lat = activeLocation?.latitude ?? 24.0167;
  const lon = activeLocation?.longitude ?? 72.3833;

  // Manual Apply & Refresh Button
  const handleApply = async () => {
    saveWidgetStyleConfig(config);
    syncWidgetStyleToNative(config);

    try {
      await WidgetService.updateWidget(lat, lon, displayCity, prayerTimes || undefined);
    } catch (err) {
      console.warn('[WidgetSettings] WidgetService.updateWidget error:', err);
    }

    setSyncedRecently(true);
    setTimeout(() => setSyncedRecently(false), 2200);

    toast({
      title: strings.syncedToastTitle,
      description: strings.syncedToastDesc,
    });
  };

  // 1-Tap Pin Widget Handler
  const handlePinWidget = (widgetType: 'next_prayer' | 'daily_ayah' | 'daily_hadith' | 'quran_progress' | 'tasbeeh') => {
    setPinningType(widgetType);
    try {
      const success = pinWidgetNative(widgetType);
      if (success) {
        toast({
          title: strings.pinSuccessToast,
          description: strings.pinSuccessDesc,
        });
      } else {
        toast({
          title: strings.pinFailedToast,
          description: strings.pinNoteTip,
          variant: 'default',
        });
      }
    } catch (err) {
      console.warn('[WidgetSettings] handlePinWidget error:', err);
      toast({
        title: strings.pinFailedToast,
        description: strings.pinNoteTip,
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setPinningType(null), 1200);
    }
  };

  // Compute Live Preview styles
  const activePreset = ACCENT_PRESETS[config.accentPreset] || ACCENT_PRESETS.ivory;

  const previewSurfaceBg = useMemo(() => {
    const alpha = config.opacity / 100;
    if (config.surfaceStyle === 'oled') {
      return `rgba(0, 0, 0, ${alpha})`;
    }
    if (config.surfaceStyle === 'frosted') {
      return `rgba(18, 24, 38, ${Math.max(0.2, alpha)})`;
    }
    // Match active theme default
    return `rgba(15, 23, 42, ${alpha})`;
  }, [config.surfaceStyle, config.opacity]);

  // Next prayer dynamic info
  const nextPrayerData = useMemo(() => {
    try {
      const next = getNextPrayer(lat, lon);
      if (next) {
        const localizedName = getLocalizedPrayerName(next.name.toLowerCase() as Parameters<typeof getLocalizedPrayerName>[0], language);
        const timeStr = next.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        return {
          name: localizedName,
          rawName: next.name.toLowerCase(),
          timeStr,
          timeUntil: `in ${next.timeUntil}`,
        };
      }
    } catch (err) {
      console.warn('[WidgetSettings] getNextPrayer error:', err);
    }
    return {
      name: getLocalizedPrayerName('fajr', language),
      rawName: 'fajr',
      timeStr: '05:27 AM',
      timeUntil: 'in 2h 15m',
    };
  }, [lat, lon, language]);

  const prayerNameFajr = getLocalizedPrayerName('fajr', language);
  const prayerNameDhuhr = getLocalizedPrayerName('dhuhr', language);
  const prayerNameAsr = getLocalizedPrayerName('asr', language);
  const prayerNameMaghrib = getLocalizedPrayerName('maghrib', language);
  const prayerNameIsha = getLocalizedPrayerName('isha', language);

  const formatTimeStr = (t: string | Date | undefined | null): string => {
    if (!t) return '--:--';
    if (t instanceof Date) {
      return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
    return String(t);
  };

  const prayerStripTimes = useMemo(() => {
    const calcTimes = getFormattedPrayerTimes(lat, lon, new Date(), '12h');
    return [
      { id: 'fajr', name: prayerNameFajr, time: formatTimeStr(prayerTimes?.fajr || calcTimes.fajr), active: nextPrayerData.rawName === 'fajr' },
      { id: 'dhuhr', name: prayerNameDhuhr, time: formatTimeStr(prayerTimes?.dhuhr || calcTimes.dhuhr), active: nextPrayerData.rawName === 'dhuhr' },
      { id: 'asr', name: prayerNameAsr, time: formatTimeStr(prayerTimes?.asr || calcTimes.asr), active: nextPrayerData.rawName === 'asr' },
      { id: 'maghrib', name: prayerNameMaghrib, time: formatTimeStr(prayerTimes?.maghrib || calcTimes.maghrib), active: nextPrayerData.rawName === 'maghrib' },
      { id: 'isha', name: prayerNameIsha, time: formatTimeStr(prayerTimes?.isha || calcTimes.isha), active: nextPrayerData.rawName === 'isha' },
    ];
  }, [lat, lon, prayerTimes, prayerNameFajr, prayerNameDhuhr, prayerNameAsr, prayerNameMaghrib, prayerNameIsha, nextPrayerData.rawName]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-12">
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bg-base)]/85 border-b border-[var(--border)] px-4 pb-3.5 safe-top"
        style={{ paddingTop: 'calc(var(--safe-top) + 0.875rem)' }}
      >
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/profile', { replace: true })}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight truncate">
              {strings.title}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {strings.subtitle}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] flex-shrink-0">
            <LayoutGrid className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-5" style={{ paddingBottom: 'calc(156px + var(--tilawah-dock-space, 0px))' }}>
        {/* ── 1-TAP PIN WIDGET CARD ── */}
        <Card className="p-4 rounded-3xl border border-[var(--accent)]/30 bg-gradient-to-br from-[var(--surface)] via-[var(--surface-2)] to-[var(--surface)] shadow-lg space-y-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent-text)] flex items-center justify-center shadow-sm">
              <Pin className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">
                {strings.pinSectionTitle}
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {strings.pinSectionSub}
              </p>
            </div>
          </div>

          {/* Primary Next Prayer Glowing Pin Button */}
          <Button
            type="button"
            onClick={() => handlePinWidget('next_prayer')}
            disabled={pinningType === 'next_prayer'}
            className="w-full h-12 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-98 border border-[var(--accent)]"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--on-accent)',
              boxShadow: '0 4px 18px var(--accent-glow, rgba(212, 175, 55, 0.28))',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{strings.pinNextPrayer}</span>
          </Button>

          {/* Grid of Other 4 Widgets */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handlePinWidget('daily_ayah')}
              disabled={pinningType === 'daily_ayah'}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span className="truncate">{strings.pinDailyAyah}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('daily_hadith')}
              disabled={pinningType === 'daily_hadith'}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Scroll className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span className="truncate">{strings.pinDailyHadith}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('quran_progress')}
              disabled={pinningType === 'quran_progress'}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span className="truncate">{strings.pinQuranProgress}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('tasbeeh')}
              disabled={pinningType === 'tasbeeh'}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <CircleDot className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span className="truncate">{strings.pinTasbeeh}</span>
            </button>
          </div>

          {/* Clean Tip Note Box */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--surface)]/70 border border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <Info className="w-4 h-4 text-[var(--accent-text)] flex-shrink-0 mt-0.5" />
            <p className="flex-1">{strings.pinNoteTip}</p>
          </div>
        </Card>

        {/* ── LIVE PREVIEW CARD ── */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              {strings.livePreview}
            </Label>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                borderColor: activePreset.borderHex,
                color: activePreset.accentHex,
                background: 'var(--surface-2)',
              }}
            >
              {config.opacity}% • {activePreset.name}
            </span>
          </div>

          <div
            className="relative rounded-3xl p-4 sm:p-5 overflow-hidden transition-all duration-300 border shadow-2xl"
            style={{
              backgroundColor: previewSurfaceBg,
              backdropFilter: config.surfaceStyle === 'frosted' ? 'blur(16px)' : undefined,
              borderColor: activePreset.borderHex,
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, ${config.opacity * 0.0015})`,
            }}
          >
            {/* Top row: Arabic brand mark + Hijri chip + Live Clock */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="font-arabic font-bold text-lg leading-none"
                  style={{ color: activePreset.accentHex }}
                >
                  نور
                </span>
                <span className="opacity-40 text-xs">·</span>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: activePreset.borderHex,
                    color: activePreset.accentHex,
                  }}
                >
                  1448 AH
                </span>
              </div>

              {/* Right: Clock & Countdown */}
              <div className="flex items-center gap-2">
                <div
                  className="text-xl font-bold font-mono tracking-tight tabular-nums"
                  style={{ color: activePreset.accentHex }}
                >
                  {liveClockTime}
                </div>
              </div>
            </div>

            {/* Hero Prayer Section */}
            <div className="flex items-end justify-between gap-3 my-2">
              <div className="min-w-0">
                <div
                  className="text-[9px] font-bold tracking-widest uppercase opacity-75 mb-0.5"
                  style={{ color: activePreset.subHex }}
                >
                  {strings.nextPrayerLabel}
                </div>
                <div
                  className="font-bold tracking-tight transition-all truncate"
                  style={{
                    color: activePreset.textHex,
                    fontSize: `${1.75 * (config.fontScale / 100)}rem`,
                    lineHeight: 1.1,
                  }}
                >
                  {nextPrayerData.name}
                </div>

                {config.showCity && (
                  <div className="flex items-center gap-1.5 mt-2 text-[11px] opacity-85">
                    <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: activePreset.accentHex }} />
                    <span className="truncate" style={{ color: activePreset.textHex }}>
                      {displayCity}
                    </span>
                  </div>
                )}
              </div>

              {/* Countdown badge & target time */}
              <div className="text-right flex-shrink-0">
                <div
                  className="text-lg font-bold font-mono tabular-nums"
                  style={{ color: activePreset.textHex }}
                >
                  {nextPrayerData.timeStr}
                </div>
                {config.showCountdown && (
                  <div
                    className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tabular-nums"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderColor: activePreset.borderHex,
                      color: activePreset.accentHex,
                    }}
                  >
                    {nextPrayerData.timeUntil}
                  </div>
                )}
              </div>
            </div>

            {/* Full 5-Prayer Strip (if enabled) */}
            {config.showFullStrip && (
              <div
                className="mt-3 pt-3 border-t grid grid-cols-5 gap-1 text-center"
                style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
              >
                {prayerStripTimes.map((item) => (
                  <div
                    key={item.id}
                    className={`py-1 rounded-lg transition-colors ${
                      item.active ? 'border shadow-sm' : ''
                    }`}
                    style={{
                      backgroundColor: item.active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      borderColor: item.active ? activePreset.borderHex : 'transparent',
                    }}
                  >
                    <div
                      className="text-[9px] font-bold uppercase truncate"
                      style={{ color: item.active ? activePreset.accentHex : activePreset.subHex }}
                    >
                      {item.name}
                    </div>
                    <div
                      className="text-[10px] font-mono font-semibold tabular-nums mt-0.5"
                      style={{ color: activePreset.textHex }}
                    >
                      {item.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 1. SURFACE STYLE SELECTOR ── */}
        <Card className="p-4 space-y-3 rounded-2xl">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
              {strings.surfaceStyleTitle}
            </Label>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {strings.surfaceStyleSub}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(
              [
                { id: 'theme', label: strings.surfaceTheme },
                { id: 'oled', label: strings.surfaceOled },
                { id: 'frosted', label: strings.surfaceFrosted },
              ] as { id: WidgetSurfaceStyle; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => updateConfig({ surfaceStyle: opt.id })}
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 ${
                  config.surfaceStyle === opt.id
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] ring-2 ring-[var(--accent)]/30'
                    : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* ── 2. OPACITY STEPPER & SLIDER ── */}
        <Card className="p-4 space-y-3 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[var(--accent-text)]" />
                {strings.opacityTitle}
              </Label>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {strings.opacitySub}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateConfig({ opacity: Math.max(0, config.opacity - 5) })}
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all"
                aria-label="Decrease opacity"
              >
                –
              </button>
              <span className="font-mono text-sm font-bold w-12 text-center tabular-nums text-[var(--accent-text)]">
                {config.opacity}%
              </span>
              <button
                type="button"
                onClick={() => updateConfig({ opacity: Math.min(100, config.opacity + 5) })}
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all"
                aria-label="Increase opacity"
              >
                +
              </button>
            </div>
          </div>

          <div className="pt-2">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.opacity}
              onChange={(e) => updateConfig({ opacity: Number(e.target.value) })}
              className="w-full accent-[var(--accent)] cursor-pointer h-2 bg-[var(--surface-2)] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-mono mt-1 px-0.5">
              <span>0% (Clear)</span>
              <span>50%</span>
              <span>100% (Solid)</span>
            </div>
          </div>
        </Card>

        {/* ── 3. COLOR & ACCENT SWATCHES ── */}
        <Card className="p-4 space-y-3 rounded-2xl">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-text)]" />
              {strings.accentTitle}
            </Label>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {strings.accentSub}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
            {(Object.values(ACCENT_PRESETS) as typeof activePreset[]).map((preset) => {
              const isSelected = config.accentPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateConfig({ accentPreset: preset.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 active:scale-95 ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]/30'
                      : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--text-secondary)]/40'
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 shadow-sm"
                    style={{
                      backgroundColor: preset.accentHex,
                      borderColor: 'rgba(255, 255, 255, 0.4)',
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate text-[var(--text-primary)]">
                      {preset.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── 4. LAYOUT & DETAIL TOGGLES ── */}
        <Card className="p-4 space-y-4 rounded-2xl">
          <div>
            <Label className="text-sm font-bold flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--accent-text)]" />
              {strings.layoutTitle}
            </Label>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {strings.layoutSub}
            </p>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
            <div>
              <Label className="text-sm font-bold">{strings.showCity}</Label>
              <p className="text-xs text-[var(--text-secondary)]">{strings.showCitySub}</p>
            </div>
            <Switch
              checked={config.showCity}
              onCheckedChange={(checked) => updateConfig({ showCity: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
            <div>
              <Label className="text-sm font-bold">{strings.showCountdown}</Label>
              <p className="text-xs text-[var(--text-secondary)]">{strings.showCountdownSub}</p>
            </div>
            <Switch
              checked={config.showCountdown}
              onCheckedChange={(checked) => updateConfig({ showCountdown: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
            <div>
              <Label className="text-sm font-bold">{strings.showFullStrip}</Label>
              <p className="text-xs text-[var(--text-secondary)]">{strings.showFullStripSub}</p>
            </div>
            <Switch
              checked={config.showFullStrip}
              onCheckedChange={(checked) => updateConfig({ showFullStrip: checked })}
            />
          </div>

          <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
            <div>
              <Label className="text-sm font-bold">{strings.fontScaleTitle}</Label>
              <p className="text-xs text-[var(--text-secondary)]">{strings.fontScaleSub}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateConfig({ fontScale: Math.max(85, config.fontScale - 5) })}
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all"
                aria-label="Decrease font scale"
              >
                –
              </button>
              <span className="font-mono text-sm font-bold w-12 text-center tabular-nums text-[var(--accent-text)]">
                {config.fontScale}%
              </span>
              <button
                type="button"
                onClick={() => updateConfig({ fontScale: Math.min(120, config.fontScale + 5) })}
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all"
                aria-label="Increase font scale"
              >
                +
              </button>
            </div>
          </div>
        </Card>

        {/* ── APPLY & REFRESH BUTTON ── */}
        <Button
          onClick={handleApply}
          className="w-full h-12 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--on-accent)',
          }}
        >
          {syncedRecently ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          <span>{syncedRecently ? strings.syncedToastTitle : strings.applyButton}</span>
        </Button>

        {/* ── HELPER CARD: HOW TO ADD WIDGETS ON ANDROID ── */}
        <Card className="p-4 space-y-3 rounded-2xl bg-[var(--surface-2)]/60 border-[var(--border)]">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-text)] uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <span>{strings.howToAddTitle}</span>
          </div>
          <ol className="text-xs text-[var(--text-secondary)] space-y-2 list-decimal pl-4 leading-relaxed">
            <li>{strings.howToAddStep1}</li>
            <li>{strings.howToAddStep2}</li>
            <li>{strings.howToAddStep3}</li>
            <li>{strings.howToAddStep4}</li>
          </ol>
        </Card>
      </main>
    </div>
  );
};

export default WidgetSettings;
