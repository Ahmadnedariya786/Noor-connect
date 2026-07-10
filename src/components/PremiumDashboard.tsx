import React, { useState, useEffect, memo } from "react";
import { m } from "framer-motion";
import { Bell, MapPin, ChevronRight, Activity, Compass, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import {
  loadDashboardWidgetConfig,
  DASHBOARD_WIDGET_CONFIG_CHANGED_EVENT,
  type DashboardWidgetConfig
} from "@/lib/dashboard-widget-config";
import { globalTimerManager } from "@/lib/timer-manager";

// Widget component imports
import EnhancedDailyAyah from "@/components/EnhancedDailyAyah";
import EnhancedDailyHadith from "@/components/EnhancedDailyHadith";
import QiblaQuickWidget from "@/components/QiblaQuickWidget";
import TasbeehQuickWidget from "@/components/TasbeehQuickWidget";
import RamadanWidget from "@/components/RamadanWidget";
import WeeklySalahChart from "@/components/WeeklySalahChart";
import QuranProgressWidget from "@/components/QuranProgressWidget";
import IslamicEventsWidget from "@/components/IslamicEventsWidget";
import PrayerStatsWidget from "@/components/PrayerStatsWidget";
import QazaTracker from "@/components/QazaTracker";
import DhikrReminder from "@/components/DhikrReminder";
import { QuranRadio } from "@/components/QuranRadio";


interface PrayerTime {
  name: string;
  time: string;
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
  setLoadingAPI: (loading: boolean) => void;
  toast: any;
}

function LiveClock({ animationEnabled, hijriDate, timeFormat }: { animationEnabled: boolean; hijriDate: string; timeFormat: '12' | '24' }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Clock updates every 10 seconds since it only shows HH:MM format
    const timerId = globalTimerManager.addCallback(() => setTime(new Date()), 10000, 'premium-clock');
    return () => globalTimerManager.removeCallback(timerId);
  }, []);

  const timeStr = time.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12',
  });

  const motionProps = (props: any) => animationEnabled ? props : {};

  return (
    <div className="text-center pt-3 pb-4 flex flex-col justify-center items-center gap-1">
      <m.h1
        className="font-black leading-none tracking-tighter text-foreground"
        style={{ fontSize: 'clamp(52px, 18vw, 96px)' }}
        {...motionProps({ 
          initial: { opacity: 0 }, 
          animate: { opacity: 1 }, 
          transition: { duration: 0.4 } 
        })}
      >
        {timeStr}
      </m.h1>
      <m.p
        className="text-sm md:text-base font-semibold tracking-wide text-primary px-4 text-center leading-tight"
        {...motionProps({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 0.15, duration: 0.4 } })}
      >
        {hijriDate}
      </m.p>
    </div>
  );
}

function LiveCountdown({ targetTime }: { targetTime?: Date | null }) {
  const [timeRemaining, setTimeRemaining] = useState("00:00:00");

  useEffect(() => {
    if (!targetTime) {
      setTimeRemaining("00:00:00");
      return;
    }

    const updateDisplay = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const countdownStr = hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;

      setTimeRemaining(countdownStr);
    };

    updateDisplay();
    const timerId = globalTimerManager.addCallback(updateDisplay, 1000, 'premium-countdown');
    return () => globalTimerManager.removeCallback(timerId);
  }, [targetTime]);

  return <span className="text-sm font-black text-emerald-500 font-mono tabular-nums">{timeRemaining}</span>;
}

function PremiumDashboardInner({
  hijriDate,
  nextPrayer,
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
  setLoadingAPI,
  toast,
}: PremiumDashboardProps) {
  const { animationEnabled } = useSettings();
  const { isRamadan, ramadanDay } = useIslamicCalendar();
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>([]);
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>(() => (localStorage.getItem('time-format') as '12' | '24') || '24');

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

  useEffect(() => {
    const handleFormatChange = (e: CustomEvent) => {
      if (e.detail?.format) setTimeFormat(e.detail.format as '12' | '24');
    };
    window.addEventListener('time-format-changed', handleFormatChange as EventListener);
    return () => window.removeEventListener('time-format-changed', handleFormatChange as EventListener);
  }, []);

  const motionProps = (props: any) => animationEnabled ? props : {};

  return (
    <div
      className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300"
    >
      {/* Manual Location Dialog */}
      {showManualLocationDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <m.div
            {...motionProps({ initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 } })}
            className="w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden bg-card border border-border/40 shadow-2xl rounded-[32px] transition-colors"
          >
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-foreground">Set Location</h3>
                <button
                  onClick={() => setShowManualLocationDialog(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-muted text-muted-foreground hover:bg-muted/80"
                >
                  <Grid3X3 className="w-4 h-4 rotate-45" />
                </button>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={async () => {
                    const success = await location.detectLocation();
                    if (success) {
                      toast({ title: "Location Detected", description: `Updated to ${location.locationName}` });
                      setShowManualLocationDialog(false);
                    } else {
                      toast({ title: "Detection Failed", description: "Please enable location permissions", variant: "destructive" });
                    }
                  }}
                  disabled={location.isDetecting}
                  className="w-full h-12 rounded-2xl font-bold text-white gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 border-none hover:opacity-90 transition-opacity"
                >
                  {location.isDetecting ? <Activity className="w-4 h-4 animate-spin" /> : <Compass className="w-4 h-4" />}
                  {location.isDetecting ? "Detecting..." : "Auto-Detect (GPS/IP)"}
                </Button>

                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">or search</span>
                  <div className="flex-1 h-px bg-border" />
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
                      setShowManualLocationDialog(false);
                      toast({ title: "Location Updated", description: `Time adjusted to ${result.timezone}` });
                    } catch (err) {
                      toast({ title: "Selection Failed", description: "Could not sync timezone. Please try again.", variant: "destructive" });
                    } finally {
                      setLoadingAPI(false);
                    }
                  }}
                  isLoading={prayerTimesHook.isLoading}
                />
              </div>
            </div>
          </m.div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 px-5 pb-36 pt-safe-top space-y-6 max-w-lg mx-auto w-full">

        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between pt-4">
          {/* Location pill */}
          <button
            onClick={onLocationClick}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full transition-all active:scale-95 bg-emerald-500/10 border border-emerald-500/20"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
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

        {/* ── Hero Time & Date ── */}
        <LiveClock animationEnabled={animationEnabled} hijriDate={hijriDate} timeFormat={timeFormat} />

        {/* ── Next Prayer Card ── */}
        <m.div
          {...motionProps({ initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2, duration: 0.5 } })}
          className="relative overflow-hidden rounded-[28px] bg-card/40 border border-emerald-500/20 shadow-[inset_2px_0_0_rgba(16,185,129,0.6)] backdrop-blur-md"
        >
          {/* Subtle emerald glow */}
          <div
            className="absolute top-0 left-0 w-32 h-full pointer-events-none bg-gradient-to-r from-emerald-500/10 to-transparent"
          />
          <div className="relative z-10 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1 text-emerald-500/70">
                  Next Prayer
                </p>
                <p className="text-2xl font-black text-foreground">{nextPrayer.name}</p>
              </div>
              <div
                className="px-4 py-2 rounded-2xl text-xl font-black bg-muted/60 text-primary border border-primary/20"
              >
                {nextPrayer.time}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-foreground/45">
                  Time remaining
                </span>
                <LiveCountdown targetTime={nextPrayer.targetTime} />
              </div>

              {/* Progress bar */}
              <div
                className="h-1.5 w-full rounded-full overflow-hidden bg-muted/60"
              >
                <m.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  {...motionProps({ initial: { width: 0 }, animate: { width: `${nextPrayer.progress}%` }, transition: { duration: 1, ease: 'easeOut', delay: 0.4 } })}
                />
              </div>

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
                case 'prayer-times':
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
                        <h2 className="text-lg font-black text-foreground">Prayer Times</h2>
                        <button
                          onClick={onLocationClick}
                          className="text-[10px] font-bold uppercase tracking-widest transition-all text-emerald-500/70 hover:text-emerald-500"
                        >
                          Change City
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {prayers.map((prayer, i) => (
                          <m.div
                            key={prayer.name}
                            {...motionProps({
                              initial: { opacity: 0, scale: 0.92 },
                              animate: { opacity: 1, scale: 1 },
                              transition: { delay: i * 0.05, type: 'spring', stiffness: 220, damping: 20 },
                            })}
                            className={`relative overflow-hidden p-4 rounded-[24px] border ${prayer.isActive ? 'bg-emerald-500/10 border-emerald-500/35 shadow-[0_0_24px_rgba(16,185,129,0.12),inset_0_0_0_1px_rgba(16,185,129,0.1)]' : 'bg-card/40 border-border/40'}`}
                          >
                            {/* Active glow layer */}
                            {prayer.isActive && (
                              <div
                                className="absolute inset-0 pointer-events-none rounded-[24px] bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.08)_0%,transparent_70%)]"
                              />
                            )}

                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  className={`w-8 h-8 flex items-center justify-center rounded-xl ${prayer.isActive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-muted/40 text-muted-foreground'}`}
                                >
                                  {prayer.icon}
                                </div>
                                {prayer.isUpcoming && (
                                  <span
                                    className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500"
                                  >
                                    NEXT
                                  </span>
                                )}
                              </div>

                              <p className={`font-black text-base leading-tight ${prayer.isActive ? 'text-foreground' : 'text-foreground/75'}`}>
                                {prayer.name}
                              </p>
                              <p className={`font-bold text-sm mt-0.5 ${prayer.isActive ? 'text-primary' : 'text-primary/60'}`}>
                                {prayer.time}
                              </p>
                            </div>
                          </m.div>
                        ))}
                      </div>
                    </m.section>
                  );

                case 'salah-tracker':
                  return (
                    <m.div
                      key={widget.id}
                      {...motionProps({
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { duration: 0.4 }
                      })}
                      className="p-5 rounded-[28px] bg-card/40 border border-border/40 backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Daily Salah Tracker</h3>
                        <div className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
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
                              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                                prayer.isCompleted 
                                  ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] scale-110' 
                                  : 'bg-muted/50 text-muted-foreground border border-border/50 group-hover:bg-muted group-hover:scale-105'
                              }`}
                            >
                              {prayer.isCompleted ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              ) : (
                                prayer.icon
                              )}
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${prayer.isCompleted ? 'text-emerald-500' : 'text-muted-foreground'}`}>
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
                      <EnhancedDailyAyah />
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
                      <EnhancedDailyHadith />
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
                      <QiblaQuickWidget />
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
                      <TasbeehQuickWidget />
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
                      <RamadanWidget
                        isRamadan={isRamadan}
                        ramadanDay={ramadanDay}
                        prayerTimesWithEnd={prayerTimesHook?.prayerTimesWithEnd || null}
                        timeFormat={timeFormat}
                      />
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
                      <WeeklySalahChart />
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
                      <QuranProgressWidget />
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
                      <IslamicEventsWidget />
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
                      <PrayerStatsWidget />
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
                      <QazaTracker compact={true} />
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
                      <DhikrReminder />
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
                      <QuranRadio />
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
