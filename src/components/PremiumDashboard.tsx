import React, { useState, useEffect, memo, lazy, Suspense } from "react";
import { m } from "framer-motion";
import { Bell, MapPin, ChevronRight, Activity, Compass, X, Check } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getPrayerDisplayName } from "@/lib/prayer-utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useLanguage } from "@/contexts/LanguageContext-new";
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
import { hasHomeEntranceCompleted } from "@/lib/home-entrance";
import { PrayerTimesSection } from "@/components/PrayerTimesSection";

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
  suhoorIftaar?: {
    suhoorTime: string;
    suhoorLabel: string;
    iftaarTime: string;
    iftaarLabel: string;
  };
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

function PremiumDashboardInner({
  hijriDate,
  nextPrayer,
  previousPrayer,
  prayers,
  locationLabel,
  suhoorIftaar,
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
  const { t } = useLanguage();
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

  const isFirstMountRef = React.useRef(!hasHomeEntranceCompleted());
  const shouldAnimateEntrance = animationEnabled && tier !== 'low' && tier !== 'minimal' && isFirstMountRef.current;
  const motionProps = (props: any) => shouldAnimateEntrance ? props : {};

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300 relative overflow-x-hidden"
    >
      {/* ── Ambient Top Radial Aura across all 5 themes ── */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[380px] z-0 select-none"
        style={{
          background: 'radial-gradient(circle at 50% 0%, var(--accent-soft) 0%, transparent 65%)',
        }}
        aria-hidden="true"
      />
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

        {/* ── Dynamic Widgets Container ── */}
        <div className="space-y-6">
          {widgets
            .filter(w => w.visible)
            .sort((a, b) => a.order - b.order)
            .map(widget => {
              switch (widget.id) {
                case 'prayer-times': {
                  return (
                    <m.section
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
                      })}
                      className="w-full"
                    >
                      <PrayerTimesSection
                        nextPrayer={nextPrayer}
                        previousPrayer={previousPrayer}
                        prayers={prayers}
                        suhoorIftaar={suhoorIftaar}
                        onLocationClick={onLocationClick}
                        locationLabel={locationLabel}
                      />
                    </m.section>
                  );
                }

                case 'salah-tracker': {
                  const validPrayers = prayers.filter(p => (p.originalName || p.name) !== 'Sunrise');
                  const completedCount = validPrayers.filter(p => p.isCompleted).length;
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
                      })}
                      className="p-5 rounded-[22px] bg-[var(--surface)] border border-[var(--border)] backdrop-blur-md relative overflow-hidden"
                      style={{
                        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
                            {t('dailySalah') || 'Daily Salah'}
                          </h3>
                          <div
                            className="w-6 h-[3px] rounded-full mt-1.5"
                            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
                          />
                        </div>
                        <div
                          className="px-2.5 py-1 rounded-full text-xs font-bold ltr-num"
                          dir="ltr"
                          style={{
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-text)',
                            border: '1px solid var(--border)',
                            direction: 'ltr',
                            unicodeBidi: 'isolate',
                          }}
                        >
                          <span className="ltr-num" dir="ltr">{completedCount} / 5</span>
                        </div>
                      </div>

                      {/* 5-Segment Horizontal Progress Bar */}
                      <div className="grid grid-cols-5 gap-1.5 mb-4">
                        {[0, 1, 2, 3, 4].map((idx) => {
                          const isFilled = idx < completedCount;
                          return (
                            <div
                              key={idx}
                              className="h-1.5 rounded-full overflow-hidden transition-all duration-300"
                              style={{
                                background: isFilled
                                  ? 'linear-gradient(90deg, var(--accent), var(--accent-2))'
                                  : 'var(--surface-2)',
                                border: isFilled ? 'none' : '1px solid var(--border)',
                                boxShadow: isFilled ? '0 0 8px var(--accent-glow)' : 'none',
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* 5 Prayer Vertical Glass Pods */}
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                          gap: '6px',
                        }}
                      >
                        {validPrayers.map((prayer) => {
                          const displayName = getPrayerDisplayName(prayer.originalName || prayer.name, prayer.date || new Date());
                          return (
                            <button
                              key={`tracker-${prayer.name}`}
                              type="button"
                              onClick={() => prayer.onCheckIn?.()}
                              className="flex flex-col items-center justify-between gap-2 rounded-[14px] transition-all duration-300 group relative"
                              style={{
                                minWidth: 0,
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '10px 2px',
                                ...(prayer.isCompleted ? {
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--accent)',
                                  boxShadow: '0 0 14px var(--accent-glow)',
                                } : {
                                  background: 'var(--surface-2)',
                                  border: '1px solid var(--border)',
                                }),
                              }}
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 relative shrink-0"
                                style={prayer.isCompleted
                                  ? { background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 0 10px var(--accent-glow)' }
                                  : { background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
                              >
                                {prayer.isCompleted ? (
                                  <Check className="w-5 h-5 stroke-[2.8]" />
                                ) : (
                                  prayer.icon
                                )}
                                {prayer.isCompleted && (
                                  <span
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                                    style={{
                                      background: 'var(--accent)',
                                      border: '1.5px solid var(--surface-2)',
                                      boxShadow: '0 0 6px var(--accent-glow)',
                                    }}
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3] text-[var(--on-accent)]" />
                                  </span>
                                )}
                              </div>
                              <span
                                className="font-semibold text-center"
                                style={{
                                  fontSize: 'clamp(0.64rem, 2.6vw, 0.70rem)',
                                  fontWeight: 600,
                                  letterSpacing: '-0.01em',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center',
                                  color: prayer.isCompleted ? 'var(--accent-text)' : 'var(--text-secondary)',
                                }}
                              >
                                {displayName}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </m.div>
                  );
                }

                case 'daily-ayah':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
                        initial: { opacity: 0, y: 8 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.2, ease: 'easeOut' }
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
