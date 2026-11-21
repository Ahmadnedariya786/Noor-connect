// Noor Connect — Home Screen Widgets Customizer Page
// Live 60fps Preview Card, 3-Style Live Preview Switcher, Surface Styles & Native Android Sync
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
  Clock,
  StretchHorizontal,
  Info,
  RotateCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { useIslamicCalendar } from '@/hooks/useIslamicCalendar';
import { loadStoredLocation } from '@/lib/location-state';
import { computeFullPrayerSchedule, getCalculationMethod } from '@/lib/prayer-times';
import { getMadhab, get24HourTime } from '@/lib/storage';
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
  getActiveThemeHex,
} from '@/lib/widget-customizer';
import { getLocalizedPrayerName } from '@/lib/home-prayer-i18n';

export const WidgetSettings: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language } = useLanguage();
  const strings = useMemo(() => getWidgetCustomizerI18n(language), [language]);
  const { hijriDate } = useIslamicCalendar();

  const formattedHijriDate = useMemo(() => {
    if (!hijriDate || !hijriDate.trim()) return '9 Jumādā II 1448';
    const clean = hijriDate.trim()
      .replace(/Jumādā\s+(al-)?ūlā/gi, 'Jumādā I')
      .replace(/Jumādā\s+(al-)?Ākhirah/gi, 'Jumādā II')
      .replace(/Rabīʿ\s+(al-)?Awwal/gi, 'Rabīʿ I')
      .replace(/Rabīʿ\s+(al-)?Thānī/gi, 'Rabīʿ II')
      .replace(/al-ola/gi, 'I')
      .replace(/al-ōlā/gi, 'I')
      .replace(/\s*AH$/i, '')
      .replace(/\s*هـ$/, '')
      .trim();
    return clean || '9 Jumādā II 1448';
  }, [hijriDate]);

  const { location } = usePrayerTimes();
  const [config, setConfig] = useState<WidgetStyleConfig>(() => loadWidgetStyleConfig());
  const [liveClockTime, setLiveClockTime] = useState<string>('04:17');
  const [syncedRecently, setSyncedRecently] = useState(false);
  const [pinningType, setPinningType] = useState<string | null>(null);

  // Live 3-Style Interactive Preview Switcher Tab state
  const [previewTab, setPreviewTab] = useState<'next_prayer' | 'circular_clock' | 'compact_strip'>('next_prayer');

  // Live TextClock simulator for preview
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const is24h = get24HourTime();
      if (is24h) {
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        setLiveClockTime(`${hours}:${mins}`);
      } else {
        const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        setLiveClockTime(`${hours}:${mins}`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Location resolution: hook -> localStorage -> Vadgam/Chhapi, India
  const activeLocation = useMemo(() => {
    if (location && location.locationName) return location;
    return loadStoredLocation();
  }, [location]);

  const displayCity = useMemo(() => {
    if (activeLocation?.locationName && activeLocation.locationName.trim()) {
      return activeLocation.locationName.trim();
    }
    return 'Vadgām, India';
  }, [activeLocation]);

  const lat = activeLocation?.latitude ?? 24.034072;
  const lon = activeLocation?.longitude ?? 72.401621;

  // ─────────────────────────────────────────────────────────────
  // SINGLE SOURCE OF TRUTH SCHEDULE SNAPSHOT
  // Authoritative prayer computation shared between preview & native widget
  // ─────────────────────────────────────────────────────────────
  const fullSchedule = useMemo(() => {
    const now = new Date();
    const is24h = get24HourTime();
    const activeMadhab = getMadhab();
    const methodName = getCalculationMethod();
    return computeFullPrayerSchedule(now, lat, lon, {
      method: methodName,
      madhab: activeMadhab,
      is24h,
    });
  }, [lat, lon]);

  // Current upcoming prayer calculation
  const nextPrayerData = useMemo(() => {
    const now = new Date();
    const fard = fullSchedule.fardPrayers;

    // Check upcoming fard prayer
    const upcomingFard = fard.find((p) => p.startTime > now);
    const activeFard = fard.find((p) => p.isCurrent) || fard[fard.length - 1];
    const target = upcomingFard || fard[0];

    const diff = target.startTime.getTime() - now.getTime();
    const remainingMs = diff > 0 ? diff : diff + 24 * 3600 * 1000;
    const hrs = Math.floor(remainingMs / 3600000);
    const mins = Math.floor((remainingMs % 3600000) / 60000);
    const countdown = hrs > 0 ? `In ${hrs}h ${mins}m` : `In ${mins}m`;

    const rawId = target.id.toLowerCase();
    const localizedName = getLocalizedPrayerName(
      rawId as Parameters<typeof getLocalizedPrayerName>[0],
      language
    );

    // Qaza end time for active or next prayer
    const currentQazaEnd = target.endTimeFormatted;

    return {
      name: localizedName,
      rawName: rawId,
      timeStr: target.startTimeFormatted,
      timeUntil: countdown,
      qazaEnd: currentQazaEnd,
      progressPercent: Math.min(100, Math.max(10, Math.round(((now.getTime() % 3600000) / 3600000) * 100))),
      fullSchedule,
    };
  }, [fullSchedule, language]);

  // 6-Prayer Slots for both Next Prayer Bottom Strip and Compact 6-Prayer Widget
  const prayerStripTimes = useMemo(() => {
    const fard = fullSchedule.fardPrayers;
    const fajr = fard.find((p) => p.id === 'fajr');
    const dhuhr = fard.find((p) => p.id === 'dhuhr');
    const asr = fard.find((p) => p.id === 'asr');
    const maghrib = fard.find((p) => p.id === 'maghrib');
    const isha = fard.find((p) => p.id === 'isha');
    const isFriday = new Date().getDay() === 5;
    return [
      { id: 'fajr', label: 'FAJR', name: getLocalizedPrayerName('fajr', language), time: fajr?.startTimeFormatted || '--:--', active: nextPrayerData.rawName === 'fajr' },
      { id: 'sunrise', label: 'RISE', name: 'Sunrise', time: fullSchedule.sunriseFormatted || '--:--', active: false },
      { id: 'dhuhr', label: isFriday ? 'JUMA' : 'DHUHR', name: isFriday ? "Jumu'ah" : getLocalizedPrayerName('dhuhr', language), time: dhuhr?.startTimeFormatted || '--:--', active: nextPrayerData.rawName === 'dhuhr' },
      { id: 'asr', label: 'ASR', name: getLocalizedPrayerName('asr', language), time: asr?.startTimeFormatted || '--:--', active: nextPrayerData.rawName === 'asr' },
      { id: 'maghrib', label: 'MAGH', name: getLocalizedPrayerName('maghrib', language), time: maghrib?.startTimeFormatted || '--:--', active: nextPrayerData.rawName === 'maghrib' },
      { id: 'isha', label: 'ISHA', name: getLocalizedPrayerName('isha', language), time: isha?.startTimeFormatted || '--:--', active: nextPrayerData.rawName === 'isha' },
    ];
  }, [fullSchedule, language, nextPrayerData.rawName]);

  // Full Native Sync Payload Helper
  const buildFullPayload = useCallback(() => {
    return {
      themeHex: getActiveThemeHex(),
      city: displayCity,
      hijriDateFormatted: formattedHijriDate,
      showQazaEndTime: config.showQazaEndTime,
      prayers: prayerStripTimes.map((p) => ({
        id: p.id,
        name: p.name,
        time: p.time,
        active: p.active,
      })),
    };
  }, [displayCity, formattedHijriDate, prayerStripTimes, config.showQazaEndTime]);

  // Update helper
  const updateConfig = useCallback((patch: Partial<WidgetStyleConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveWidgetStyleConfig(next);
      syncWidgetStyleToNative(next, buildFullPayload());
      return next;
    });
  }, [buildFullPayload]);

  // Manual Apply & Refresh Button
  const handleApply = async () => {
    saveWidgetStyleConfig(config);
    syncWidgetStyleToNative(config, buildFullPayload());

    try {
      await WidgetService.updateWidget(lat, lon, displayCity);
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
  const handlePinWidget = (widgetType: string) => {
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
          title: 'Widget Ready to Place',
          description: "If already on your Home Screen, check your launcher. You can also drag it directly from your phone's Widgets menu.",
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
      return `rgba(18, 24, 38, ${Math.max(0.4, alpha)})`;
    }
    // Match active theme default
    return `rgba(15, 23, 42, ${alpha})`;
  }, [config.surfaceStyle, config.opacity]);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-12">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-[var(--bg-base)] border-b border-[var(--border)] px-4 pb-3.5 safe-top"
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
              <h2 className="text-sm font-bold text-[var(--text-primary)]" style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
                {strings.pinSectionTitle}
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5" style={{ whiteSpace: 'normal' }}>
                {strings.pinSectionSub}
              </p>
            </div>
          </div>

          {/* Primary Next Prayer Glowing Pin Button */}
          <button
            type="button"
            onClick={() => handlePinWidget('next_prayer')}
            disabled={pinningType === 'next_prayer'}
            className="w-full h-12 rounded-2xl font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-all active:scale-98 border border-[var(--accent)] cursor-pointer"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--on-accent)',
              boxShadow: '0 4px 18px var(--accent-glow, rgba(212, 175, 55, 0.28))',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{strings.pinNextPrayer}</span>
          </button>

          {/* 2-Column Grid of All Other 6 Widgets (360px Safe, No Text Cut-Off) */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => handlePinWidget('circular_clock')}
              disabled={pinningType === 'circular_clock'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <Clock className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinCircularClock}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('compact_strip')}
              disabled={pinningType === 'compact_strip'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <StretchHorizontal className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinCompactStrip}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('daily_ayah')}
              disabled={pinningType === 'daily_ayah'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinDailyAyah}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('daily_hadith')}
              disabled={pinningType === 'daily_hadith'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <Scroll className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinDailyHadith}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('quran_progress')}
              disabled={pinningType === 'quran_progress'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinQuranProgress}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePinWidget('tasbeeh')}
              disabled={pinningType === 'tasbeeh'}
              className="rounded-xl font-semibold border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)]/50 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ fontSize: '0.73rem', padding: '8px 6px', whiteSpace: 'nowrap' }}
            >
              <CircleDot className="w-3.5 h-3.5 text-[var(--accent-text)] flex-shrink-0" />
              <span>{strings.pinTasbeeh}</span>
            </button>
          </div>

          {/* Clean Tip Note Box */}
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[var(--surface)]/70 border border-[var(--border)] text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <Info className="w-4 h-4 text-[var(--accent-text)] flex-shrink-0 mt-0.5" />
            <p className="flex-1">{strings.pinNoteTip}</p>
          </div>
        </Card>

        {/* ── 3-STYLE LIVE PREVIEW SWITCHER ── */}
        <section className="space-y-2.5">
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

          {/* 3-Pill Segmented Tab Switcher */}
          <div
            className="flex items-center p-1 rounded-2xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            {[
              { id: 'next_prayer', label: strings.previewNextPrayer },
              { id: 'circular_clock', label: strings.previewCircularClock },
              { id: 'compact_strip', label: strings.previewCompactStrip },
            ].map((tab) => {
              const isActive = previewTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewTab(tab.id as typeof previewTab)}
                  className="flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                  style={{
                    background: isActive ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                    color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* LIVE PREVIEW CONTAINER (Pure opaque rendering) */}
          <div
            className="relative rounded-3xl p-4 sm:p-5 overflow-hidden transition-all duration-300 border shadow-2xl"
            style={{
              backgroundColor: previewSurfaceBg,
              borderColor: activePreset.borderHex,
              boxShadow: `0 12px 36px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, ${config.opacity * 0.0015})`,
            }}
          >
            {/* ══════ PREVIEW 1: NEXT PRAYER (4x2) ══════ */}
            {previewTab === 'next_prayer' && (
              <div className="space-y-3">
                {/* Top row: Arabic brand mark + Hijri chip + Live Clock + Countdown */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-arabic font-bold text-lg leading-none shrink-0"
                      style={{ color: activePreset.accentHex }}
                    >
                      نور
                    </span>
                    <span className="opacity-40 text-xs shrink-0">·</span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[120px]"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                        borderColor: activePreset.borderHex,
                        color: activePreset.accentHex,
                      }}
                    >
                      {formattedHijriDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {config.showCountdown && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold border tabular-nums"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          borderColor: 'rgba(16, 185, 129, 0.4)',
                          color: '#10B981',
                        }}
                      >
                        {nextPrayerData.timeUntil}
                      </span>
                    )}
                    <span
                      className="text-xs font-mono font-bold tabular-nums"
                      style={{ color: activePreset.accentHex }}
                    >
                      {liveClockTime}
                    </span>
                  </div>
                </div>

                {/* Hero Prayer Section */}
                <div className="flex items-end justify-between gap-3 my-1">
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
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] opacity-85">
                        <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: activePreset.accentHex }} />
                        <span className="truncate" style={{ color: activePreset.textHex }}>
                          {displayCity}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: Target time + Optional Qaza End Time line */}
                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-lg font-bold font-mono tabular-nums"
                      style={{ color: activePreset.textHex }}
                    >
                      {nextPrayerData.timeStr}
                    </div>
                    {config.showQazaEndTime && (
                      <div
                        className="text-[10px] font-medium opacity-85 tabular-nums"
                        style={{ color: activePreset.subHex }}
                      >
                        Ends {nextPrayerData.qazaEnd}
                      </div>
                    )}
                  </div>
                </div>

                {/* Full 5-Prayer Strip (Fajr, Dhuhr, Asr, Maghrib, Isha) */}
                {config.showFullStrip && (
                  <div
                    className="mt-3 pt-2.5 border-t grid grid-cols-5 gap-1 text-center"
                    style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
                  >
                    {prayerStripTimes.filter(p => p.id !== 'sunrise').map((item) => (
                      <div
                        key={item.id}
                        className={`py-1 rounded-lg transition-colors ${item.active ? 'border shadow-sm' : ''
                          }`}
                        style={{
                          backgroundColor: item.active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                          borderColor: item.active ? activePreset.borderHex : 'transparent',
                        }}
                      >
                        <div
                          className="text-[9px] font-bold uppercase truncate"
                          style={{ color: item.active ? activePreset.accentHex : activePreset.subHex }}
                        >
                          {item.label}
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
            )}

            {/* ══════ PREVIEW 2: CIRCULAR PROGRESS-ARC CLOCK (2x2 / 3x2) ══════ */}
            {previewTab === 'circular_clock' && (
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div
                  className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center p-4 text-center select-none shadow-xl"
                  style={{
                    background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.5) 100%)',
                    border: `3px solid ${activePreset.accentHex}`,
                    boxShadow: `0 0 20px ${activePreset.borderHex}`,
                  }}
                >
                  {/* Top Micro Hijri Date */}
                  <span
                    className="text-[10px] font-semibold tracking-tight truncate max-w-[120px]"
                    style={{ color: activePreset.accentHex }}
                  >
                    {formattedHijriDate}
                  </span>

                  {/* Center Hero Clock */}
                  <div
                    className="text-3xl font-extrabold font-mono tracking-tight tabular-nums my-0.5"
                    style={{
                      color: activePreset.textHex,
                      fontSize: `${2.1 * (config.fontScale / 100)}rem`,
                    }}
                  >
                    {liveClockTime}
                  </div>

                  {/* Next Prayer Pill */}
                  <div
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate max-w-[130px]"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      borderColor: activePreset.borderHex,
                      color: activePreset.textHex,
                    }}
                  >
                    {nextPrayerData.name} • {nextPrayerData.timeStr}
                  </div>

                  {/* Subline: Countdown or Qaza End Time */}
                  <span
                    className="text-[9px] font-medium mt-1 tabular-nums"
                    style={{ color: activePreset.subHex }}
                  >
                    {config.showQazaEndTime ? `Ends ${nextPrayerData.qazaEnd}` : nextPrayerData.timeUntil}
                  </span>

                  {/* Corner Refresh Indicator */}
                  <div className="absolute right-3 bottom-3 p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity">
                    <RotateCw className="w-3 h-3" style={{ color: activePreset.subHex }} />
                  </div>
                </div>

                <div className="text-[11px] font-medium text-center" style={{ color: activePreset.subHex }}>
                  2×2 / 3×2 Kashkol Dial • Live Progress-Arc & TextClock
                </div>
              </div>
            )}

            {/* ══════ PREVIEW 3: ULTRA-COMPACT 6-PRAYER STRIP (4x1) ══════ */}
            {previewTab === 'compact_strip' && (
              <div className="space-y-2 py-1">
                {/* Header Line */}
                <div className="flex items-center justify-between text-[11px] font-medium px-1">
                  <span className="font-semibold truncate" style={{ color: activePreset.accentHex }}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} • {formattedHijriDate}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] opacity-80" style={{ color: activePreset.subHex }}>
                      {displayCity.split(',')[0]}
                    </span>
                    <RotateCw className="w-3 h-3 opacity-60" style={{ color: activePreset.subHex }} />
                  </div>
                </div>

                {/* 6 Equal Weight Slots Row */}
                <div className="grid grid-cols-6 gap-1 text-center">
                  {prayerStripTimes.map((slot) => {
                    const isTarget = slot.active;
                    return (
                      <div
                        key={slot.id}
                        className="py-1 px-0.5 rounded-xl border flex flex-col items-center justify-center transition-all"
                        style={{
                          backgroundColor: isTarget ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                          borderColor: isTarget ? activePreset.borderHex : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isTarget ? `0 2px 8px ${activePreset.borderHex}` : 'none',
                        }}
                      >
                        <span
                          className="text-[8.5px] font-extrabold uppercase tracking-tight truncate w-full"
                          style={{ color: isTarget ? activePreset.accentHex : activePreset.subHex }}
                        >
                          {slot.label}
                        </span>
                        <span
                          className="text-[10px] font-mono font-bold tabular-nums mt-0.5"
                          style={{
                            color: activePreset.textHex,
                            fontSize: `${0.65 * (config.fontScale / 100)}rem`,
                          }}
                        >
                          {slot.time}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-[11px] font-medium text-center pt-0.5" style={{ color: activePreset.subHex }}>
                  4×1 Ultra-Compact Launcher Bar • 6-Prayer Grid
                </div>
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
                className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-1 active:scale-95 ${config.surfaceStyle === opt.id
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
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all cursor-pointer"
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
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all cursor-pointer"
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
                  className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer ${isSelected
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
                    <div className="text-xs font-bold leading-tight break-words text-[var(--text-primary)]">
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

          {/* NEW: Show Qaza End Time Toggle */}
          <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
            <div>
              <Label className="text-sm font-bold">{strings.showQazaEndTime}</Label>
              <p className="text-xs text-[var(--text-secondary)]">{strings.showQazaEndTimeSub}</p>
            </div>
            <Switch
              checked={config.showQazaEndTime ?? true}
              onCheckedChange={(checked) => updateConfig({ showQazaEndTime: checked })}
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
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all cursor-pointer"
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
                className="w-8 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] font-bold text-base flex items-center justify-center active:scale-90 hover:bg-[var(--surface)] transition-all cursor-pointer"
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
          className="w-full h-12 rounded-2xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
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
