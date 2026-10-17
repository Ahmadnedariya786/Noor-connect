import React, { useState, useEffect, memo, lazy, Suspense } from "react";
import { m } from "framer-motion";
import { Bell, MapPin, ChevronRight, Activity, Compass, X, Check } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPrayerDisplayName } from "@/lib/prayer-utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import {
  loadDashboardWidgetConfig,
  DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT,
  type DashboardWidgetConfig
} from "@/lib/dashboard-widget-config";
import { globalTimerManager } from "@/lib/timer-manager";
import { useAnimationTier } from "@/hooks/useAnimationTier";
import { UpdateBanner } from "@/components/UpdateBanner";
import { ClockHero } from "@/components/clocks/ClockHero";

// Lazy load widget components to reduce initial bundle size
const EnhancedDailyAyah = lazy(() => import("@/components/EnhancedDailyAyah"));
const EnhancedDailyHadith = lazy(() => import("@/components/EnhancedDailyHadith"));
const QiblaQuickWidget = lazy(() => import("@/components/QiblaQuickWidget"));
const TasbeehQuickWidget = lazy(() => import("@/components/TasbeehQuickWidget"));
const RamadanWidget = lazy(() => import("@/components/RamadanWidget"));
const WeeklySalahChart = lazy(() => import("@/components/WeeklySalahChart"));
const QuranProgressWidget = lazy(() => import("@/components/QuranProgressWidget"));
const IslamicEventsWidget = lazy(() => import("@/components/IslamicEventsWidget"));
const PrayerStatsWidget = lazy(() => import("@/components/PrayerStatsWidget"));
const QazaTracker = lazy(() => import("@/components/QazaTracker"));
const DhikrReminder = lazy(() => import("@/components/DhikrReminder"));
const QuranRadio = lazy(() => import("@/components/QuranRadio").then(m => ({ default: m.QuranRadio })));
const MoodSelector = lazy(() => import("@/components/MoodSelector").then(m => ({ default: m.MoodSelector })));

const WidgetFallback = () => <div className="h-40 w-full rounded-2xl bg-card/40 animate-pulse border border-border/40 backdrop-blur-sm" />;


interface PrayerTime {
  name: string;
  originalName?: string;
  time: string;
  date?: Date;
  icon: React.ReactNode;
  isActive?: boolean;
  isUpcoming?: boolean;
  isCompleted?: boolean;
  onCheckIn?: () => void;
}

interface PremiumDashboardProps {
  hijriDate: string;
  nextPrayer: {
    name: string;
    time: string;
    targetTime?: Date | null;
    progress: number;
  };
  previousPrayer?: {
    name: string;
    time: string;
    date?: Date;
  } | null;
  prayers: PrayerTime[];
  locationLabel: string;
  onServiceClick?: (route: string) => void;
  onVerseClick?: () => void;
  onHadithClick?: () => void;
  onNotificationClick?: () => void;
  onLocationClick?: () => void;
  showManualLocationDialog: boolean;
  setShowManualLocationDialog: (show: boolean) => void;
  LocationSearch: any;
  GeocodingService: any;
  AladhanAPI: any;
  location: any;
  prayerTimesHook: any;
  loadingAPI?: boolean;
  setLoadingAPI: (loading: boolean) => void;
  toast: any;
}

function NextPrayerCountdownChip({ targetTime }: { targetTime?: Date | null }) {
  const [countdownStr, setCountdownStr] = useState<string>('');

  useEffect(() => {
    if (!targetTime) {
      setCountdownStr('');
      return;
    }

    const update = () => {
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) {
        setCountdownStr('due now');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setCountdownStr(h > 0 ? `in ${h}h ${m}m` : `in ${m}m`);
    };

    update();
    const timerId = setInterval(update, 10000);
    return () => clearInterval(timerId);
  }, [targetTime]);

  if (!countdownStr) return null;

  return (
    <span
      className="text-[10px] font-bold tracking-tight px-1.5 py-0.5 rounded-full"
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent-text)',
        border: '1px solid var(--accent)',
        boxShadow: '0 2px 8px var(--accent-glow)',
      }}
    >
      {countdownStr}
    </span>
  );
}

function LiveCountdown({ targetTime }: { targetTime?: Date | null }) {
  const formatRemaining = React.useCallback((target?: Date | null): string => {
    if (!target) return "--:--:--";
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return "00:00:00";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return hours > 0
      ? `${hours}h ${minutes}m ${seconds}s`
      : `${minutes}m ${seconds}s`;
  }, []);

  const [timeRemaining, setTimeRemaining] = useState<string>(() => formatRemaining(targetTime));

  useEffect(() => {
    if (!targetTime) {
      setTimeRemaining("--:--:--");
      return;
    }

    const updateDisplay = () => {
      const formatted = formatRemaining(targetTime);
      setTimeRemaining(prev => (prev === formatted ? prev : formatted));
    };

    updateDisplay();
    const timerId = globalTimerManager.addCallback(updateDisplay, 1000, 'premium-countdown');
    return () => globalTimerManager.removeCallback(timerId);
  }, [targetTime, formatRemaining]);

  return (
    <span
      key="countdown-value-node"
      className="text-sm sm:text-base font-black font-mono tabular-nums inline-block select-none tracking-wider"
      style={{
        background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        filter: 'drop-shadow(0 0 8px var(--accent-glow))',
      }}
    >
      {timeRemaining}
    </span>
  );
}

function PremiumDashboardInner({
  hijriDate,
  nextPrayer,
  previousPrayer,
  prayers,
  locationLabel,
  onNotificationClick,
  onLocationClick,
  showManualLocationDialog,
  setShowManualLocationDialog,
  LocationSearch,
  GeocodingService,
  AladhanAPI,
  location,
  prayerTimesHook,
  loadingAPI = false,
  setLoadingAPI,
  toast,
}: PremiumDashboardProps) {
  const { animationEnabled, timeFormat } = useSettings();
  const { tier } = useAnimationTier();
  const { isRamadan, ramadanDay } = useIslamicCalendar();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);

  useEffect(() => {
    // Load config on mount
    setWidgets(loadDashboardWidgetConfig());

    // Listen to changes (e.g. from WidgetCustomizer)
    const handleWidgetConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ widgets: DashboardWidgetConfig[] }>;
      if (customEvent.detail?.widgets) {
        setWidgets(customEvent.detail.widgets);
      } else {
        setWidgets(loadDashboardWidgetConfig());
      }
    };

    window.addEventListener(DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT, handleWidgetConfigChange);
    return () => {
      window.removeEventListener(DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT, handleWidgetConfigChange);
    };
  }, []);

  // Show ramadan widget only during Ramadan
  useEffect(() => {
    setWidgets(prevWidgets => {
      const ramadanWidget = prevWidgets.find(w => w.id === 'ramadan');
      if (ramadanWidget) {
        return prevWidgets.map(w => 
          w.id === 'ramadan' ? { ...w, visible: isRamadan } : w
        );
      }
      return prevWidgets;
    });
  }, [isRamadan]);

  const handleCloseModal = React.useCallback(() => {
    setLoadingAPI(false);
    if (typeof location?.cancelDetecting === 'function') {
      location.cancelDetecting();
    }
    setShowManualLocationDialog(false);
  }, [location, setLoadingAPI, setShowManualLocationDialog]);

  // Lock background scroll strictly while modal is open, with guaranteed cleanup
  useEffect(() => {
    if (!showManualLocationDialog) return;

    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      // Guaranteed restoration on modal close or unmount
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [showManualLocationDialog]);

  // Intercept Android hardware back button and Escape key to close modal
  useEffect(() => {
    if (!showManualLocationDialog) return;

    let backButtonHandle: { remove: () => void } | null = null;
    let isSubscribed = true;

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('backButton', () => {
        if (isSubscribed) {
          handleCloseModal();
        }
      }).then(handle => {
        if (isSubscribed) {
          backButtonHandle = handle;
        } else {
          handle.remove();
        }
      }).catch(() => {
        // silent fallback for back button listener
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isSubscribed = false;
      if (backButtonHandle) {
        try {
          backButtonHandle.remove();
        } catch {
          // silent fallback on listener cleanup
        }
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showManualLocationDialog, handleCloseModal]);

  const motionProps = (props: any) => (animationEnabled && tier !== 'low' && tier !== 'minimal') ? props : {};

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
    >
      {/* Manual Location Dialog */}
      {showManualLocationDialog && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 select-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <m.div
            {...motionProps({ initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } })}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl rounded-[32px] transition-colors"
          >
            <div
              className="p-6 overflow-y-auto overscroll-contain"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-[var(--text-primary)]">Set Location</h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Close location dialog"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] active:scale-95"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={async () => {
                    try {
                      setLoadingAPI(true);
                      const matchedCity = await location.detectLocation();
                      if (matchedCity) {
                        AladhanAPI.clearCachedData();
                        let timezone = matchedCity.timezone;
                        try {
                          const result = await AladhanAPI.getTodaysPrayerTimes(matchedCity.lat, matchedCity.lon, 1);
                          if (result?.timezone) {
                            timezone = result.timezone;
                          }
                        } catch {
                          // Offline fallback is fine
                        }
                        location.setLocation(matchedCity.lat, matchedCity.lon, `${matchedCity.city}, ${matchedCity.country}`, timezone);
                        await prayerTimesHook.setManualLocation(matchedCity.city, matchedCity.country);
                        handleCloseModal();
                        toast({ title: "Location Updated", description: `Time adjusted to ${timezone}` });
                      } else {
                        toast({
                          title: "Detection Failed",
                          description: "Could not detect GPS location. Please check permissions or select your city manually.",
                          variant: "destructive"
                        });
                      }
                    } catch (err: any) {
                      toast({
                        title: "Detection Failed",
                        description: err?.message || "Please enable location permissions or select your city manually.",
                        variant: "destructive"
                      });
                    } finally {
                      setLoadingAPI(false);
                    }
                  }}
                  disabled={location.isDetecting || loadingAPI}
                  className="w-full h-12 rounded-2xl font-bold text-[var(--on-accent)] gap-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] border-none hover:opacity-90 transition-opacity"
                >
                  {location.isDetecting || loadingAPI ? <Activity className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                  {location.isDetecting || loadingAPI ? "Detecting..." : "Auto-Detect (GPS/IP)"}
                </Button>

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">or search</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                <LocationSearch
                  onLocationSelect={async (city: string, country: string) => {
                    try {
                      setLoadingAPI(true);
                      AladhanAPI.clearCachedData();
                      const coords = await GeocodingService.getCityCoordinates(city, country);
                      const result = await AladhanAPI.getTodaysPrayerTimes(coords.latitude, coords.longitude, 1);
                      location.setLocation(coords.latitude, coords.longitude, `${city}, ${country}`, result.timezone);
                      await prayerTimesHook.setManualLocation(city, country);
                      handleCloseModal();
                      toast({ title: "Location Updated", description: `Time adjusted to ${result.timezone}` });
                    } catch (err) {
                      toast({ title: "Selection Failed", description: "Could not sync timezone. Please try again.", variant: "destructive" });
                    } finally {
                      setLoadingAPI(false);
                    }
                  }}
                  isLoading={prayerTimesHook.isLoading}
                />

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  className="w-full mt-2 h-11 rounded-2xl font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] bg-[var(--surface-2)]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </m.div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pb-36 safe-top space-y-6 max-w-lg mx-auto w-full">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between pt-4">
          {/* Location pill */}
          <button
            onClick={onLocationClick}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full transition-all active:scale-95 border"
            style={{ background: 'var(--accent-soft)', borderColor: 'var(--border)' }}
          >
            <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent-text)' }} />
            <span className="text-xs font-semibold max-w-[130px] truncate text-foreground/85">
              {locationLabel}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          </button>

          {/* Notification bell */}
          <button
            onClick={onNotificationClick}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 bg-muted/60 border border-border"
          >
            <Bell className="w-4 h-4 text-foreground/60" />
          </button>
        </div>

        {/* ── Update Available Banner ── */}
        <UpdateBanner />

        {/* ── Hero Time & Date / Clock Styles ── */}
        <ClockHero
          hijriDate={hijriDate}
          timeFormat={timeFormat}
          nextPrayer={nextPrayer}
          previousPrayer={previousPrayer}
        />

        {/* ── Next Prayer Card ── */}
        <m.div
          key="next-prayer-card"
          {...motionProps({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2, duration: 0.5 } })}
          className="relative overflow-hidden rounded-[24px]"
          style={{
            background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
            border: '1px solid var(--accent-glow)',
            boxShadow: '0 0 0 1px var(--accent-glow), 0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 var(--card-sheen)',
          }}
        >
          {/* Corner radial accent glow at 10 percent */}
          <div
            className="absolute top-0 right-0 w-48 h-48 pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(circle at 100% 0%, var(--accent) 0%, transparent 70%)',
              opacity: 0.10,
            }}
          />

          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent-text)' }}>
                Next Prayer
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                {locationLabel}
              </p>
            </div>
            <div className="flex items-end justify-between mb-4">
              <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', fontFamily: 'inherit', fontStyle: 'italic' }}>
                {getPrayerDisplayName(nextPrayer.name, nextPrayer.targetTime)}
              </p>
              <div className="text-right" key="next-prayer-countdown-container">
                <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-secondary)' }}>In</p>
                <LiveCountdown key="next-prayer-live-countdown" targetTime={nextPrayer.targetTime} />
              </div>
            </div>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-xs tracking-wide" style={{ color: 'var(--text-secondary)' }}>at {nextPrayer.time}</span>
            </div>
            {/* Progress bar as accent gradient with a glowing round thumb at the progress end */}
            <div className="relative h-1.5 w-full rounded-full overflow-visible" style={{ background: 'var(--accent-soft)' }}>
              <m.div
                className="relative h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)' }}
                {...motionProps({ initial: { width: 0 }, animate: { width: `${Math.min(100, Math.max(0, nextPrayer.progress > 1 ? nextPrayer.progress : nextPrayer.progress * 100))}%` }, transition: { duration: 1, ease: 'easeOut', delay: 0.4 } })}
              >
                <span
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 rounded-full"
                  style={{
                    background: 'var(--accent-2)',
                    boxShadow: '0 0 8px var(--accent-glow), 0 0 2px #fff',
                    border: '1.5px solid var(--surface)',
                  }}
                />
              </m.div>
            </div>
          </div>
        </m.div>

        {/* ── Dynamic Widgets Container ── */}
        <div className="space-y-6">
          {widgets
            .filter(w => w.visible)
            .sort((a, b) => a.order - b.order)
            .map(widget => {
              switch (widget.id) {
                case 'prayer-times': {
                  const nextIdx = prayers.findIndex(p => p.isActive);
                  const activeIdx = nextIdx !== -1 ? nextIdx : prayers.findIndex(p => p.name === nextPrayer.name || p.originalName === nextPrayer.name);
                  const totalPrayers = prayers.length;
                  const mostRecentPastIdx = activeIdx !== -1 && totalPrayers > 0
                    ? (activeIdx - 1 + totalPrayers) % totalPrayers
                    : -1;

                  return (
                    <m.section
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                      className="w-full"
                    >
                      <div className="flex items-center justify-between px-1 mb-4">
                        <div>
                          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Prayer Times</h2>
                          <div
                            className="w-6 h-[3px] rounded-full mt-1.5"
                            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                          />
                        </div>
                        <button
                          onClick={onLocationClick}
                          className="text-xs font-semibold uppercase tracking-widest transition-all text-muted-foreground hover:text-foreground"
                        >
                          Change City
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {prayers.map((prayer, i) => {
                          const isNext = activeIdx !== -1 && i === activeIdx;
                          const isMostRecentPast = !isNext && mostRecentPastIdx !== -1 && i === mostRecentPastIdx;
                          const isOlderPast = !isNext && !isMostRecentPast && (
                            activeIdx === 0
                              ? (i >= 1 && i < totalPrayers - 1)
                              : (activeIdx > 0 && i < activeIdx)
                          );

                          // Respect 12h / 24h format
                          const is12 = (timeFormat as string) === '12' || timeFormat === '12h';
                          const displayTime = prayer.date instanceof Date && !isNaN(prayer.date.getTime())
                            ? prayer.date.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: is12,
                              })
                            : prayer.time;

                          return (
                            <m.div
                              key={prayer.name}
                              {...motionProps({
                                initial: { opacity: 0, scale: 0.92 },
                                animate: { opacity: 1, scale: 1 },
                                transition: { delay: i * 0.05, type: 'spring', stiffness: 220, damping: 20 },
                              })}
                              className={cn(
                                "group relative overflow-hidden p-4 rounded-2xl transition-all duration-200 select-none",
                                "border hover:shadow-md active:scale-[0.98]",
                                isNext ? "ring-1 shadow-lg" : "border-border/70"
                              )}
                              style={{
                                borderColor: isNext ? 'var(--accent)' : 'var(--border)',
                                boxShadow: isNext ? '0 4px 22px var(--accent-glow), 0 0 12px var(--accent-glow)' : undefined,
                                background: isNext
                                  ? 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)'
                                  : 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)',
                              }}
                            >
                              <div className="relative z-10 flex flex-col justify-between h-full">
                                <div className="flex items-center justify-between mb-3">
                                  {/* Existing Icon & Color */}
                                  <div
                                    className="w-8 h-8 flex items-center justify-center rounded-xl"
                                    style={isNext
                                      ? { background: 'var(--accent-soft)', color: 'var(--accent-text)' }
                                      : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                                  >
                                    {prayer.icon}
                                  </div>

                                  {/* NEXT Badge + Live Countdown Chip */}
                                  {isNext && (
                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                      <span
                                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                        style={{
                                          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                          color: 'var(--on-accent)',
                                          border: '1px solid var(--accent)',
                                          boxShadow: '0 2px 10px var(--accent-glow)',
                                        }}
                                      >
                                        NEXT
                                      </span>
                                      <NextPrayerCountdownChip targetTime={nextPrayer.targetTime} />
                                    </div>
                                  )}
                                </div>

                                <div>
                                  {/* Prayer Name + Checkmark for Most Recent Past */}
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-sm leading-tight text-foreground truncate">
                                      {getPrayerDisplayName(prayer.name, prayer.date)}
                                    </p>
                                    {isMostRecentPast && (
                                      <Check className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0 stroke-[2.5]" />
                                    )}
                                  </div>

                                  {/* Prayer Time */}
                                  <p
                                    className={cn(
                                      "text-sm mt-0.5 font-semibold transition-colors tabular-nums",
                                      isOlderPast && "text-muted-foreground/45",
                                      !isNext && !isOlderPast && "text-foreground/85"
                                    )}
                                    style={isNext ? { color: 'var(--accent-text)', fontWeight: 'bold' } : undefined}
                                  >
                                    {displayTime}
                                  </p>
                                </div>
                              </div>

                              {/* Most Recent Past Prayer: Thin Progress Bar at Card Bottom */}
                              {isMostRecentPast && (
                                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/[0.08] overflow-hidden rounded-b-2xl">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(100, Math.max(0, nextPrayer.progress > 1 ? nextPrayer.progress : nextPrayer.progress * 100))}%`,
                                      background: 'linear-gradient(90deg, var(--accent), var(--accent-text))',
                                    }}
                                  />
                                </div>
                              )}
                            </m.div>
                          );
                        })}
                      </div>
                    </m.section>
                  );
                }

                case 'salah-tracker':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                      className="p-5 rounded-[28px] bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">Daily Salah</h3>
                          <div
                            className="w-6 h-[3px] rounded-full mt-1.5"
                            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                          />
                        </div>
                        <div
                          className="px-2 py-1 rounded-full text-xs font-bold"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--border)' }}
                        >
                          {prayers.filter(p => p.isCompleted).length} / 5
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {prayers.map((prayer) => (
                          <button
                            key={`tracker-${prayer.name}`}
                            onClick={() => prayer.onCheckIn?.()}
                            className="flex flex-col items-center gap-2 group"
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300"
                              style={prayer.isCompleted
                                ? { background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 0 14px var(--accent-glow)', transform: 'scale(1.1)' }
                                : { background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                            >
                              {prayer.isCompleted ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                prayer.icon
                              )}
                            </div>
                            <span className="text-xs font-semibold" style={{ color: prayer.isCompleted ? 'var(--accent-text)' : 'var(--text-secondary)' }}>
                              {prayer.name.slice(0, 3)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </m.div>
                  );

                case 'daily-ayah':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><EnhancedDailyAyah /></Suspense>
                    </m.div>
                  );

                case 'daily-hadith':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><EnhancedDailyHadith /></Suspense>
                    </m.div>
                  );

                case 'qibla-quick':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><QiblaQuickWidget /></Suspense>
                    </m.div>
                  );

                case 'tasbeeh-quick':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><TasbeehQuickWidget /></Suspense>
                    </m.div>
                  );

                case 'ramadan':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}>
                        <RamadanWidget
                          isRamadan={isRamadan}
                          ramadanDay={ramadanDay}
                          prayerTimesWithEnd={prayerTimesHook?.prayerTimesWithEnd || null}
                          timeFormat={timeFormat}
                        />
                      </Suspense>
                    </m.div>
                  );

                case 'weekly-chart':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><WeeklySalahChart /></Suspense>
                    </m.div>
                  );

                case 'quran-progress':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><QuranProgressWidget /></Suspense>
                    </m.div>
                  );

                case 'islamic-events':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><IslamicEventsWidget /></Suspense>
                    </m.div>
                  );

                case 'prayer-stats':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><PrayerStatsWidget /></Suspense>
                    </m.div>
                  );

                case 'qaza-tracker':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><QazaTracker compact={true} /></Suspense>
                    </m.div>
                  );

                case 'dhikr-reminder':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><DhikrReminder /></Suspense>
                    </m.div>
                  );

                case 'quran-radio':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><QuranRadio /></Suspense>
                    </m.div>
                  );

                case 'remedy':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                    >
                      <Suspense fallback={<WidgetFallback />}><MoodSelector /></Suspense>
                    </m.div>
                  );

                default:
                  return null;
              }
            })}
        </div>
      </div>
    </div>
  );
}

export const PremiumDashboard = memo(PremiumDashboardInner);
export default PremiumDashboard;
