import { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy, type MouseEvent, memo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Sunset, Cloud, CloudMoon, Bell, Compass, LayoutGrid, Settings as SettingsIcon, Wallet, Calendar, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppBar } from "@/components/AppBar";
const DailyAyah = lazy(() => import("@/components/EnhancedDailyAyah").then(module => ({ default: module.EnhancedDailyAyah })));
const DailyHadith = lazy(() => import("@/components/EnhancedDailyHadith").then(module => ({ default: module.EnhancedDailyHadith })));
import { PremiumDashboard } from "@/components/PremiumDashboard";
import { LocationSearch } from "@/components/LocationSearch";
import { LayoutManager } from "@/components/LayoutManager";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { shouldShowMenstrualFeatures } from "@/lib/gender-settings";
import { cn } from "@/lib/utils";
import { EidCelebrationOverlay } from "@/components/EidCelebrationOverlay";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { getTodayPrayers, togglePrayer, resolvePrayerTimes, checkStreakReset, type PrayerName, type DailyPrayers } from "@/lib/salah-tracker";
import { syncMissedPrayersToQaza } from "@/lib/qaza-tracker";
import { BatteryOptimizationDialog } from "@/components/BatteryOptimizationDialog";
import { FeatureCards } from "@/components/DashboardFeatureCards";

import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useSettings } from "@/contexts/SettingsContext";
import { formatTime } from "@/utils/formatTime";
import { useLocationState } from "@/lib/location-state";
import { CURRENT_APP_VERSION } from "@/lib/constants";
import { AladhanAPI } from "@/lib/aladhan-api";
import { type PrayerTime } from "@/lib/local-notifications";
import { useToast } from "@/hooks/use-toast";
import { LocationCardSkeleton, LoadingSpinner } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GeocodingService } from "@/lib/geocoding";
import { PageTransition } from "@/components/PageTransition";
import { widgetRefreshManager } from "@/lib/widget-refresh";
import { getPrayerDisplayName, isMatchingPrayer } from "@/lib/prayer-utils";

import { hasHomeEntranceCompleted, markHomeEntranceCompleted } from "@/lib/home-entrance";

// Persistent module-level cache so prayer times remain mounted across route transitions and clock style switches
let cachedDashboardPrayers: PrayerTime[] = [];
let cachedNextPrayerName: string = "";
let cachedNextPrayerTime: string = "";
let cachedTargetTime: Date | null = null;

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { t: ti18n } = useI18n();
  const { timeFormat, animationEnabled } = useSettings();
  const isFirstMount = !hasHomeEntranceCompleted();

  useEffect(() => {
    markHomeEntranceCompleted();
  }, []);
  const [minuteTick, setMinuteTick] = useState(0);
  const [greeting, setGreeting] = useState("");
  const [prayers, setPrayers] = useState<PrayerTime[]>(() => cachedDashboardPrayers);
  const [loading, setLoading] = useState(() => cachedDashboardPrayers.length === 0);
  // Use Islamic calendar hook for accurate Hijri dates
  const { hijriDate, isEidAlFitr, isEidAlAdha } = useIslamicCalendar();
  const isEid = isEidAlFitr || isEidAlAdha;
  const [nextPrayerName, setNextPrayerName] = useState<string>(() => cachedNextPrayerName);
  const [nextPrayerTime, setNextPrayerTime] = useState<string>(() => cachedNextPrayerTime);
  const [loadingAPI, setLoadingAPI] = useState(false);
  const [timezone, setTimezone] = useState<string>("");
  const [initialLoad, setInitialLoad] = useState(() => cachedDashboardPrayers.length === 0);
  const [targetTime, setTargetTime] = useState<Date | null>(() => cachedTargetTime);
  const [suhoorIftaar, setSuhoorIftaar] = useState<{
    suhoorTime: string;
    suhoorLabel: string;
    iftaarTime: string;
    iftaarLabel: string;
  } | undefined>(undefined);
  const { toast } = useToast();

  // Memoized prayer icons
  const prayerIcons = useMemo((): Record<string, React.ReactNode> => ({
    Fajr: <Moon className="w-5 h-5 text-indigo-400" />,
    Sunrise: <Sun className="w-5 h-5 text-amber-300" />,
    Dhuhr: <Sun className="w-5 h-5 text-amber-400" />,
    Asr: <Cloud className="w-5 h-5 text-blue-400" />,
    Maghrib: <Sunset className="w-5 h-5 text-orange-400" />,
    Isha: <CloudMoon className="w-5 h-5 text-purple-400" />,
  }), []);

  // Global location state
  const location = useLocationState();

  const [showManualLocationDialog, setShowManualLocationDialog] = useState(false);
  const [showBatteryOptDialog, setShowBatteryOptDialog] = useState(false);
  const [todayPrayers, setTodayPrayers] = useState<DailyPrayers | null>(null);

  // Initialize and listen for prayer tracking updates
  useEffect(() => {
    setTodayPrayers(getTodayPrayers());
    
    const handleSalahUpdated = () => {
      setTodayPrayers(getTodayPrayers());
    };
    
    window.addEventListener('salah-updated', handleSalahUpdated);
    return () => window.removeEventListener('salah-updated', handleSalahUpdated);
  }, []);

  // Bridge: sync missed prayers to qaza when prayer times are available
  useEffect(() => {
    if (todayPrayers && prayers.length > 0) {
      const resolvedTimes = resolvePrayerTimes();
      if (resolvedTimes) {
        const syncData = {
          fajr: todayPrayers.fajr,
          dhuhr: todayPrayers.dhuhr,
          asr: todayPrayers.asr,
          maghrib: todayPrayers.maghrib,
          isha: todayPrayers.isha,
        };
        syncMissedPrayersToQaza(syncData, resolvedTimes);
      }
    }
  }, [todayPrayers, prayers]);

  // Reset streak check when app comes to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkStreakReset();
        setTodayPrayers(getTodayPrayers());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);


  const prayerTimesHook = usePrayerTimes();
  // Note: useWidgetSync is registered globally in App.tsx (AppShell) — a
  // second registration here would double-fire widget bridge pushes.

  const prayerLocation = prayerTimesHook.location;

  // Priority: GPS location > VPN/API location
  // If GPS location is set, use it regardless of whether it's default
  const locationLabel = useMemo(() => {
    // If GPS location has coordinates, use it (even if default Karachi)
    if (location.latitude && location.longitude) {
      return location.locationName;
    }

    // Otherwise, use VPN/API location if available
    if (prayerLocation?.city && prayerLocation?.country) {
      return `${prayerLocation.city}, ${prayerLocation.country}`;
    }

    // Fallback to default location
    return location.locationName;
  }, [location, prayerLocation]);

  // Similar priority for timezone
  const timezoneLabel = useMemo(() => {
    // If GPS location is set, use it (even if default Karachi)
    if (location.latitude && location.longitude && location.timeZone) {
      return location.timeZone;
    }

    // Otherwise, use VPN/API location if available
    if (prayerLocation?.timeZone) {
      return prayerLocation.timeZone;
    }

    // Fallback to default location timezone
    return location.timeZone;
  }, [location, prayerLocation]);


  // Helper function to format time from API using global formatter
  const formatTimeFromAPI = useCallback((timeStr: string): string => {
    return formatTime(timeStr, timeFormat);
  }, [timeFormat]);

  // Helper function to parse time string to Date (handles "HH:MM (TZ)" from Aladhan API)
  const parseTimeToDate = useCallback((timeStr: string): Date => {
    const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const date = new Date();
    if (isNaN(hours) || isNaN(minutes)) return date;
    date.setHours(hours, minutes, 0, 0);
    return date;
  }, []);

  // Load prayer times using global location
  const loadPrayerTimes = useCallback(async () => {
    if (!location.latitude || !location.longitude) return;
    setLoadingAPI(true);

    try {
      // Check if we have cached data for this specific location
      const hasValidCache = AladhanAPI.isCachedDataValid(location.latitude, location.longitude);

      if (!hasValidCache) {
        // Fetch fresh data for current month
        await AladhanAPI.fetchMonthlyCalendar(
          location.latitude,
          location.longitude,
          undefined,
          undefined,
          1 // Pakistan/Karachi method
        );
      }

      // Get today's prayer times and metadata (including timezone)
      const { timings, timezone: fetchedTimezone } = await AladhanAPI.getTodaysPrayerTimes(location.latitude, location.longitude, 1);

      // Update global location state with the fetched timezone if it's different or not set
      if (fetchedTimezone && fetchedTimezone !== location.timeZone) {
        location.setLocation(location.latitude, location.longitude, location.locationName, fetchedTimezone);
      }

      // Prayer times are loaded, Hijri date comes from useIslamicCalendar hook

      const prayerList: PrayerTime[] = [
        { name: "Fajr", time: formatTimeFromAPI(timings.Fajr), date: parseTimeToDate(timings.Fajr) },
        { name: "Sunrise", time: formatTimeFromAPI(timings.Sunrise), date: parseTimeToDate(timings.Sunrise) },
        { name: "Dhuhr", time: formatTimeFromAPI(timings.Dhuhr), date: parseTimeToDate(timings.Dhuhr) },
        { name: "Asr", time: formatTimeFromAPI(timings.Asr), date: parseTimeToDate(timings.Asr) },
        { name: "Maghrib", time: formatTimeFromAPI(timings.Maghrib), date: parseTimeToDate(timings.Maghrib) },
        { name: "Isha", time: formatTimeFromAPI(timings.Isha), date: parseTimeToDate(timings.Isha) },
      ];

      cachedDashboardPrayers = prayerList;
      setPrayers(prayerList);

      // Suhoor & Iftaar times derived strictly from calculation output per Guard 1
      const sTime = timings.Imsak ? formatTimeFromAPI(timings.Imsak) : formatTimeFromAPI(timings.Fajr);
      const sLabel = "Suhoor";
      const iTime = formatTimeFromAPI(timings.Maghrib);
      setSuhoorIftaar({
        suhoorTime: sTime,
        suhoorLabel: sLabel,
        iftaarTime: iTime,
        iftaarLabel: "Iftaar",
      });

      // Get next prayer countdown
      const nextEvent = await AladhanAPI.getNextEventCountdown(location.latitude, location.longitude, 1, false);
      if (nextEvent) {
        const displayName = getPrayerDisplayName(nextEvent.name, nextEvent.targetDate);
        cachedNextPrayerName = displayName;
        setNextPrayerName(displayName);
        const formattedTime = nextEvent.targetDate
          ? formatTime(nextEvent.targetDate, timeFormat)
          : (nextEvent.time ? formatTimeFromAPI(nextEvent.time) : "--:--");
        cachedNextPrayerTime = formattedTime;
        setNextPrayerTime(formattedTime);
        if (nextEvent.targetDate) {
          cachedTargetTime = nextEvent.targetDate;
          setTargetTime(nextEvent.targetDate);
        }
      }
    } catch (error) {
      console.error('Failed to load API prayer times:', error);
      // Fallback to offline calculation
      const { calculatePrayerTimes } = await import('@/lib/prayer-calculator');
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());

      const fallbackPrayers: PrayerTime[] = [
        { name: "Fajr", time: formatTimeFromAPI(times.fajr.toTimeString().slice(0, 5)), date: times.fajr },
        { name: "Sunrise", time: formatTimeFromAPI(times.sunrise.toTimeString().slice(0, 5)), date: times.sunrise },
        { name: "Dhuhr", time: formatTimeFromAPI(times.dhuhr.toTimeString().slice(0, 5)), date: times.dhuhr },
        { name: "Asr", time: formatTimeFromAPI(times.asr.toTimeString().slice(0, 5)), date: times.asr },
        { name: "Maghrib", time: formatTimeFromAPI(times.maghrib.toTimeString().slice(0, 5)), date: times.maghrib },
        { name: "Isha", time: formatTimeFromAPI(times.isha.toTimeString().slice(0, 5)), date: times.isha },
      ];
      cachedDashboardPrayers = fallbackPrayers;
      setPrayers(fallbackPrayers);

      // Offline Suhoor & Iftaar per Guard 1
      setSuhoorIftaar({
        suhoorTime: formatTimeFromAPI(times.fajr.toTimeString().slice(0, 5)),
        suhoorLabel: "Suhoor",
        iftaarTime: formatTimeFromAPI(times.maghrib.toTimeString().slice(0, 5)),
        iftaarLabel: "Iftaar",
      });

      const { getNextPrayer } = await import('@/lib/prayer-calculator');
      const nextPrayer = getNextPrayer(location.latitude, location.longitude);
      if (nextPrayer) {
        const displayName = getPrayerDisplayName(nextPrayer.name, nextPrayer.time);
        cachedNextPrayerName = displayName;
        setNextPrayerName(displayName);
        const formattedTime = formatTimeFromAPI(nextPrayer.time.toTimeString().slice(0, 5));
        cachedNextPrayerTime = formattedTime;
        setNextPrayerTime(formattedTime);
        cachedTargetTime = nextPrayer.time;
        setTargetTime(nextPrayer.time);
      }
    } finally {
      setLoadingAPI(false);
      setInitialLoad(false);
    }
  }, [location.latitude, location.longitude, location.timeZone, location.locationName, location.setLocation, formatTimeFromAPI, parseTimeToDate, timeFormat]);

  useEffect(() => {
    // Add online listener to refresh prayer times as soon as internet is back
    const handleOnline = () => {
      loadPrayerTimes();
      widgetRefreshManager.refreshAll(); // Refresh all widgets when online
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [loadPrayerTimes]);

  // Update greeting (special for Eid)
  useEffect(() => {
    if (isEidAlFitr) setGreeting("Eid al-Fitr Mubarak");
    else if (isEidAlAdha) setGreeting("Eid al-Adha Mubarak");
    else setGreeting("As-salamu alaykum");
  }, [isEidAlFitr, isEidAlAdha]);

  // Handle location detection
  const handleDetectLocation = async () => {
    const matchedCity = await location.detectLocation();
    if (matchedCity) {
      // Show appropriate message based on detection method
      if (location.isIpBased) {
        toast({
          title: ti18n('locationDetected'),
          description: `Location approximated from IP (${matchedCity.city}). Enable GPS for accurate results.`,
        });
      } else {
        toast({ title: ti18n('locationDetected'), description: `Updated to ${matchedCity.city}, ${matchedCity.country}` });
      }

      // Reload prayer times with new location
      await loadPrayerTimes();
    } else {
      toast({ title: ti18n('locationDetectionFailed'), description: ti18n('pleaseEnableLocationPermissions'), variant: "destructive" });
    }
  };


// Initialize prayer times when location or time format changes
   useEffect(() => {
     if (location.latitude && location.longitude) {
       loadPrayerTimes();
     }
   }, [location.latitude, location.longitude, loadPrayerTimes]);

  // Clear stale location data on mount to prevent ISTRES issue
  useEffect(() => {
    // Helper function to handle ISTRES cleanup without hard reload
    const cleanupIstres = (reason: string) => {
      localStorage.removeItem('user-location-data');
      localStorage.removeItem('location-storage');
      console.log('Cleared location data due to ISTRES:', reason);
      if (location.locationName?.includes('Istres') || location.locationName?.includes('ISTRES')) {
        location.resetToDefault();
      }
    };

    // Clear any stale IP-based location that might show wrong city
    const staleKeys = ['user-location-data', 'location-storage'];
    staleKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.city === 'Istres' || parsed.locationName?.includes('Istres') ||
            parsed.city === 'ISTRES' || parsed.locationName?.includes('ISTRES')) {
            cleanupIstres('localStorage contains ISTRES');
          }
        }
      } catch (error) {
        console.warn('Failed to check location data:', error);
      }
    });

    if (location.locationName?.includes('Istres') || location.locationName?.includes('ISTRES')) {
      cleanupIstres('location state contains ISTRES');
    }
  }, []);


  // Stable minute tick ref for nextPrayerInfo to avoid depending on currentTime directly
  const minuteTickRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      minuteTickRef.current = (minuteTickRef.current + 1) % 60;
      setMinuteTick(t => t + 1);
    }, 60000);
    return () => clearInterval(id);
  }, []);

const handleCheckIn = useCallback((pKey: PrayerName) => {
    const resolvedTimes = resolvePrayerTimes();
    const result = togglePrayer(pKey, resolvedTimes || undefined);
    toast({
      title: result.success ? "Check-in Updated" : "Cannot Check-in",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  }, [toast, resolvePrayerTimes]);  const dashboardPrayers = useMemo(() => {
    void minuteTick;
    const now = new Date();
    return prayers.map(p => {
      const prayerDate = p.date;
      const isUpcoming = prayerDate && prayerDate > now;
      const lower = p.name.toLowerCase();
      const isObligatory = lower !== 'sunrise';
      const pKey = lower as PrayerName;
      const isCompleted = isObligatory && todayPrayers ? !!todayPrayers[pKey] : false;

      // Consistent Jummah on Fridays via shared display-name helper
      const displayName = getPrayerDisplayName(p.name, prayerDate || now);

      return {
        name: displayName,
        originalName: p.name,
        time: p.time,
        date: p.date,
        icon: prayerIcons[p.name] || <Sun className="w-5 h-5" />,
        isActive: isMatchingPrayer(nextPrayerName, p.name) || isMatchingPrayer(nextPrayerName, displayName),
        isUpcoming: isUpcoming,
        isCompleted,
        onCheckIn: isObligatory ? () => handleCheckIn(pKey) : undefined,
      };
    });
  }, [prayers, minuteTick, todayPrayers, nextPrayerName, handleCheckIn, prayerIcons]);

  const previousPrayerInfo = useMemo(() => {
    if (prayers.length === 0) return { name: '', time: '--:--' };
    const nextIdx = prayers.findIndex(p =>
      isMatchingPrayer(p.name, nextPrayerName) ||
      isMatchingPrayer(p.originalName, nextPrayerName)
    );
    if (nextIdx > 0) {
      const p = prayers[nextIdx - 1];
      return {
        name: getPrayerDisplayName(p.name, p.date),
        time: p.time,
        date: p.date,
      };
    }
    if (nextIdx === 0 && prayers.length > 0) {
      const p = prayers[prayers.length - 1];
      return {
        name: getPrayerDisplayName(p.name, p.date),
        time: p.time,
        date: p.date,
      };
    }
    return { name: '', time: '--:--' };
  }, [prayers, nextPrayerName]);

  const nextPrayerInfo = useMemo(() => {
    const nextIdx = prayers.findIndex(p =>
      isMatchingPrayer(p.name, nextPrayerName) ||
      isMatchingPrayer(p.originalName, nextPrayerName)
    );
    const prevPrayer = nextIdx > 0 ? prayers[nextIdx - 1] : (nextIdx === 0 && prayers.length > 0 ? prayers[prayers.length - 1] : null);
    const prevDate = prevPrayer?.date;
    const resolvedDisplayName = nextPrayerName ? getPrayerDisplayName(nextPrayerName, targetTime) : "Loading...";
    const matchingPrayer = nextIdx !== -1 ? prayers[nextIdx] : null;
    const resolvedTime = matchingPrayer?.time || (targetTime ? formatTime(targetTime, timeFormat) : (nextPrayerTime || "--:--"));

    if (!prevDate || !targetTime) return {
      name: resolvedDisplayName,
      time: resolvedTime,
      targetTime: targetTime,
      progress: 0,
    };
    const start = prevDate.getTime();
    const end = targetTime.getTime();
    // Use minuteTickRef to trigger recalculation without depending on currentTime directly
    void minuteTickRef.current;
    const now = Date.now();
    if (end <= start) return {
      name: resolvedDisplayName,
      time: resolvedTime,
      targetTime: targetTime,
      progress: 0,
    };
    const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
    return {
      name: resolvedDisplayName,
      time: resolvedTime,
      targetTime: targetTime,
      progress,
    };
  }, [prayers, nextPrayerName, nextPrayerTime, targetTime, timeFormat]);

  // Stable callbacks for PremiumDashboard props
  const onServiceClick = useCallback((route: string) => navigate(route, { replace: true }), [navigate]);
  const onVerseClick = useCallback(() => navigate('/quran', { replace: true }), [navigate]);
  const onHadithClick = useCallback(() => navigate('/hadith/collections', { replace: true }), [navigate]);
  const onNotificationClick = useCallback(() => navigate('/notification-history', { replace: true }), [navigate]);
  const onLocationClick = useCallback(() => setShowManualLocationDialog(true), [setShowManualLocationDialog]);

return (
    <PageTransition skipTransition={!isFirstMount || !animationEnabled}>
      <PremiumDashboard
        hijriDate={hijriDate || ""}
        nextPrayer={nextPrayerInfo}
        previousPrayer={previousPrayerInfo}
        prayers={dashboardPrayers}
        locationLabel={locationLabel}
        onServiceClick={onServiceClick}
        onVerseClick={onVerseClick}
        onHadithClick={onHadithClick}
        onNotificationClick={onNotificationClick}
        onLocationClick={onLocationClick}
        showManualLocationDialog={showManualLocationDialog}
        setShowManualLocationDialog={setShowManualLocationDialog}
        LocationSearch={LocationSearch}
        GeocodingService={GeocodingService}
        AladhanAPI={AladhanAPI}
        location={location}
        prayerTimesHook={prayerTimesHook}
        loadingAPI={loadingAPI}
        setLoadingAPI={setLoadingAPI}
        toast={toast}
        suhoorIftaar={suhoorIftaar}
      />
    </PageTransition>
  );
}
