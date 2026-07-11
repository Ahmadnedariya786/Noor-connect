import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Clock, Moon, Sun, Cloud, Sunset, Sunrise, CloudMoon, AlertTriangle, Loader2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationSearch } from "@/components/LocationSearch";
import { TimeDisplay } from "@/components/TimeDisplay";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useLanguage } from "@/contexts/LanguageContext-new";
import type { LocationData, PrayerTimesWithEnd } from "@/hooks/usePrayerTimes";
import { useCountdown } from "@/hooks/use-countdown";
import { getTimeFormat, formatPrayerTime } from "@/lib/time-formatter";
import {
  getCurrentPrayer,
  getNextPrayer as getNextPrayerWithEnd,
  isPrayerEndingSoon,
  formatTime,
  type PrayerWithEndTime
} from "@/lib/prayer-end-times";

const prayerIcons: Record<string, React.ReactNode> = {
  Fajr: <Moon className="w-6 h-6" />,
  Sunrise: <Sunrise className="w-6 h-6" />,
  Dhuhr: <Sun className="w-6 h-6" />,
  Asr: <Cloud className="w-6 h-6" />,
  Maghrib: <Sunset className="w-6 h-6" />,
  Isha: <CloudMoon className="w-6 h-6" />,
};

export interface PrayerCountdownProps {
  timings?: PrayerTimesWithEnd | null;
  location?: LocationData | null;
  isLoading?: boolean;
  error?: string | null;
  needsManualLocation?: boolean;
  refresh?: () => Promise<void>;
  setManualLocation?: (city: string, country: string) => Promise<void>;
  timeZone?: string;
}

const PrayerCountdownComponent = function PrayerCountdown(props: PrayerCountdownProps) {
  const { t } = useLanguage();
  const prayerTimesHook = usePrayerTimes();
  const prayerTimesWithEnd = props.timings ?? prayerTimesHook.prayerTimesWithEnd;
  const location = props.location ?? prayerTimesHook.location;
  const isLoading = props.isLoading ?? prayerTimesHook.isLoading;
  const error = props.error ?? prayerTimesHook.error;
  const needsManualLocation = props.needsManualLocation ?? prayerTimesHook.needsManualLocation;
  const refresh = props.refresh ?? prayerTimesHook.refresh;
  const setManualLocation = props.setManualLocation ?? prayerTimesHook.setManualLocation;

  // Update current time for progress bar
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get current time format preference
  const timeFormat = getTimeFormat();

  // Convert to PrayerWithEndTime format for compatibility - ALWAYS call this
  const prayersWithEndTimes: PrayerWithEndTime[] = prayerTimesWithEnd ? [
    {
      name: 'Fajr',
      time: formatPrayerTime(prayerTimesWithEnd.fajr.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.fajr.start,
      endTime: prayerTimesWithEnd.fajr.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.fajr.end, timeFormat, props.timeZone)
    },
    {
      name: 'Sunrise',
      time: formatPrayerTime(prayerTimesWithEnd.sunrise.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.sunrise.start,
      endTime: prayerTimesWithEnd.sunrise.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.sunrise.end, timeFormat, props.timeZone)
    },
    {
      name: 'Dhuhr',
      time: formatPrayerTime(prayerTimesWithEnd.dhuhr.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.dhuhr.start,
      endTime: prayerTimesWithEnd.dhuhr.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.dhuhr.end, timeFormat, props.timeZone)
    },
    {
      name: 'Asr',
      time: formatPrayerTime(prayerTimesWithEnd.asr.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.asr.start,
      endTime: prayerTimesWithEnd.asr.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.asr.end, timeFormat, props.timeZone)
    },
    {
      name: 'Maghrib',
      time: formatPrayerTime(prayerTimesWithEnd.maghrib.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.maghrib.start,
      endTime: prayerTimesWithEnd.maghrib.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.maghrib.end, timeFormat, props.timeZone)
    },
    {
      name: 'Isha',
      time: formatPrayerTime(prayerTimesWithEnd.isha.start, timeFormat, props.timeZone),
      datetime: prayerTimesWithEnd.isha.start,
      endTime: prayerTimesWithEnd.isha.end,
      endTimeFormatted: formatPrayerTime(prayerTimesWithEnd.isha.end, timeFormat, props.timeZone)
    }
  ] : [];

  const currentPrayer = getCurrentPrayer(prayersWithEndTimes);
  const nextPrayer = prayersWithEndTimes.find(p =>
    p.datetime > new Date() && p !== currentPrayer && p.name !== 'Sunrise'
  );

  // ALWAYS call useCountdown hooks with default values - NEVER conditional
  const currentPrayerCountdown = useCountdown(currentPrayer?.endTime || new Date());
  const nextPrayerCountdown = useCountdown(nextPrayer?.datetime || new Date());

  // Memoize card styling to prevent recalculation every second - MUST be before early returns
  const getCardStyle = useMemo(() => {
    return {
      boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3)',
      border: '3px solid rgb(59, 130, 246)'
    };
  }, [currentPrayer, nextPrayer]);

  // Keep all hooks above conditional returns to preserve hook order.
  const currentProgress = useMemo(() => {
    if (!currentPrayer) return 0;
    const startTime = currentPrayer.datetime.getTime();
    const endTime = currentPrayer.endTime.getTime();
    const total = endTime - startTime;
    const elapsed = currentTime.getTime() - startTime;
    return Math.min(Math.max((elapsed / total) * 100, 0), 100);
  }, [currentPrayer, currentTime]);

  // Show manual location search when needed
  if (needsManualLocation) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Prayer Times</h2>
          {location && (
            <div className="text-xs text-muted-foreground">
              📍 {location.city && location.country ? `${location.city}, ${location.country}` : `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
              <span className="ml-2 px-2 py-1 bg-muted rounded">
                {location.source === 'geolocation' ? '🛰️ GPS' : location.source === 'default' ? '🏛️ Default' : '🔍 Manual'}
              </span>
            </div>
          )}
        </div>
        <LocationSearch
          onLocationSelect={setManualLocation}
          isLoading={isLoading}
        />
      </div>
    );
  }

  // Enhanced loading skeleton to prevent CLS with fixed height
  if (isLoading) {
    return (
      <div className="h-40"> {/* Fixed height container to prevent CLS */}
        <Card className="overflow-hidden border-primary/20 h-full">
          <div className="p-4 h-full">
            <div className="flex items-center justify-between h-full">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-24 bg-muted rounded mb-2 animate-pulse" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="h-6 w-20 bg-muted rounded mb-1 animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading prayer times...</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Error state with fixed height to prevent CLS
  if (error) {
    return (
      <div className="h-40"> {/* Fixed height container to prevent CLS */}
        <Card className="border-red-200 bg-red-50 h-full">
          <div className="p-4 h-full">
            <div className="flex items-center gap-3 text-red-600 h-full">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">Failed to load prayer times</p>
                <p className="text-sm">{error}</p>
                {location && (
                  <p className="text-xs mt-1">
                    📍 {location.city && location.country ? `${location.city}, ${location.country}` : `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={refresh}
                    className="text-sm underline hover:no-underline"
                  >
                    Try again
                  </button>
                  <button
                    onClick={() => setManualLocation("Mecca", "Saudi Arabia")}
                    className="text-sm underline hover:no-underline"
                  >
                    Use Mecca
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentPrayer && !nextPrayer) {
    return null;
  }

  // Show current prayer countdown if available, otherwise show next prayer
  const displayPrayer = currentPrayer || nextPrayer;
  const isCurrentPrayer = !!currentPrayer;
  const targetTime = isCurrentPrayer ? (currentPrayer?.endTime || new Date()) : (nextPrayer?.datetime || new Date());
  const isEndingSoon = currentPrayer && isPrayerEndingSoon(currentPrayer);

  if (!displayPrayer) return null;

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-primary/20 shadow-2xl transition-all duration-500 hover:shadow-primary/10 group bg-card">
      {/* Dynamic Background Gradient */}
      <div className={`absolute inset-0 transition-colors duration-1000 ${
        isEndingSoon 
          ? 'bg-gradient-to-br from-orange-500/10 via-background to-background' 
          : 'bg-gradient-to-br from-primary/10 via-background to-background'
      }`}></div>
      
      {/* Animated Shine Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000">
        <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[2000ms] bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
      </div>

      <div className="relative p-6 sm:p-8 space-y-6">
        {/* Header: Status & Icon */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
              isEndingSoon 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 rotate-3' 
                : 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 group-hover:scale-110'
            }`}>
              {isEndingSoon ? (
                <AlertTriangle className="w-7 h-7 animate-pulse" />
              ) : (
                prayerIcons[displayPrayer.name] || <Clock className="w-7 h-7" />
              )}
              {/* Pulsing Status Indicator */}
              <div className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isEndingSoon ? 'bg-orange-400' : 'bg-green-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-4 w-4 border-2 border-card ${isEndingSoon ? 'bg-orange-500' : 'bg-green-500'}`}></span>
              </div>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                {isCurrentPrayer ? t('nowPraying') : t('upcoming')}
              </p>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                {t(displayPrayer.name.toLowerCase() as any)}
              </h2>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className={`text-4xl sm:text-5xl font-mono font-black tracking-tighter tabular-nums ${isEndingSoon ? 'text-orange-500' : 'text-primary'}`}>
              <TimeDisplay targetTime={targetTime} className="" />
            </div>
            <p className="text-xs font-bold text-muted-foreground/80 uppercase tracking-widest">
              {isCurrentPrayer ? t('endsAt') : t('startsAt')} {isCurrentPrayer ? displayPrayer.endTimeFormatted : formatPrayerTime(nextPrayer?.datetime || new Date(), timeFormat, props.timeZone)}
            </p>
          </div>
        </div>

        {/* Enhanced Progress Visualization */}
        {isCurrentPrayer && (
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                {t('prayerProgress')}
              </span>
              <span className={`text-xs font-black font-mono ${isEndingSoon ? 'text-orange-500' : 'text-primary'}`}>
                {Math.round(currentProgress)}%
              </span>
            </div>
            <div className="relative h-3 w-full bg-muted/30 rounded-full overflow-hidden border border-border/5">
              <div
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
                  isEndingSoon ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-primary/80 to-primary'
                }`}
                style={{ width: `${currentProgress}%` }}
              >
                {/* Progress Glow */}
                <div className="absolute top-0 right-0 h-full w-8 bg-white/20 blur-md animate-pulse"></div>
              </div>
            </div>
            <div className="flex justify-between text-xs font-bold text-muted-foreground/40 uppercase tracking-[0.1em]">
              <span>{formatPrayerTime(displayPrayer.datetime, timeFormat, props.timeZone)}</span>
              <span>{displayPrayer.endTimeFormatted}</span>
            </div>
          </div>
        )}

        {/* Dynamic Footer with Extra Info */}
        <div className="pt-2 flex items-center justify-between border-t border-border/40">
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3" />
              {location?.city || 'Detecting...'}
            </div>
            {!isCurrentPrayer && currentPrayer && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                {currentPrayer.name} ended
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
             <div className="px-3 py-1 rounded-full bg-accent/30 text-accent-foreground text-xs font-black uppercase tracking-tighter">
                {timeFormat}H Format
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PrayerCountdownComponent;
