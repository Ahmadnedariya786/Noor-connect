import { useState, useEffect, useCallback, useMemo, Suspense, lazy, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PremiumDashboard } from "@/components/PremiumDashboard";
import { Moon, Sun, Sunset, Cloud, CloudMoon, Bell, Compass, BookOpen, LayoutGrid, Settings as SettingsIcon, Wallet, Calendar, MapPin, Grid3X3, Building } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppBar } from "@/components/AppBar";
const DailyAyah = lazy(() => import("@/components/EnhancedDailyAyah").then(module => ({ default: module.EnhancedDailyAyah })));
const DailyHadith = lazy(() => import("@/components/EnhancedDailyHadith").then(module => ({ default: module.EnhancedDailyHadith })));
const PrayerTimesList = lazy(() => import("@/components/PrayerTimesList").then(module => ({ default: module.PrayerTimesList })));
const SalahTracker = lazy(() => import("@/components/SalahTracker").then(module => ({ default: module.SalahTracker })));
const QazaTracker = lazy(() => import("@/components/QazaTracker").then(module => ({ default: module.QazaTracker })));
import { LocationSearch } from "@/components/LocationSearch";
import { LayoutManager } from "@/components/LayoutManager";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { shouldShowMenstrualFeatures } from "@/lib/gender-settings";
import { isMenstrualModeActive, getMenstrualModeData, activateMenstrualMode, deactivateMenstrualMode } from "@/lib/menstrual-mode";
import { cn } from "@/lib/utils";
import { EidCelebrationOverlay } from "@/components/EidCelebrationOverlay";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { BatteryOptimizationDialog } from "@/components/BatteryOptimizationDialog";

import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useWidgetSync } from "@/hooks/useWidgetSync";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { getTimeFormat, formatTime } from "@/lib/time-formatter";
import { useLocationState } from "@/lib/location-state";
import { CURRENT_APP_VERSION } from "@/lib/constants";
import { AladhanAPI } from "@/lib/aladhan-api";
import { type PrayerTime } from "@/lib/local-notifications";
import { useToast } from "@/hooks/use-toast";
import { LocationCardSkeleton, LoadingSpinner } from "@/components/LoadingSkeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GeocodingService } from "@/lib/geocoding";
import { PRAYER_ALARM_CONTROL_EVENT, PRAYER_ALARM_TOGGLE_EVENT } from "@/lib/prayer-alarm-events";
import { PageTransition } from "@/components/PageTransition";
import { widgetRefreshManager } from "@/lib/widget-refresh";

const prayerIcons: Record<string, React.ReactNode> = {
  Fajr: <Moon className="w-5 h-5 text-indigo-400" />,
  Dhuhr: <Sun className="w-5 h-5 text-amber-400" />,
  Asr: <Cloud className="w-5 h-5 text-blue-400" />,
  Maghrib: <Sunset className="w-5 h-5 text-orange-400" />,
  Isha: <CloudMoon className="w-5 h-5 text-purple-400" />,
};

// Premium high-fidelity gradient definitions for main features
const featureCards = [
  {
    id: 'quran',
    title: 'Quran',
    description: 'Read & Listen',
    icon: BookOpen,
    gradient: 'from-[#10b981] via-[#059669] to-[#047857]', // Rich emerald
    route: '/quran',
    stats: '114 Surahs'
  },
  {
    id: 'prayer',
    title: 'Prayer',
    description: 'Times & Qibla',
    icon: Building,
    gradient: 'from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]', // Deep blue
    route: '/qibla',
    stats: '5 Daily'
  },
  {
    id: 'services',
    title: 'Services',
    description: 'All Features',
    icon: Grid3X3,
    gradient: 'from-[#f59e0b] via-[#d97706] to-[#b45309]', // Vibrant amber
    route: '/services',
    stats: '15+ Features'
  }
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { t: ti18n } = useI18n();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [prayers, setPrayers] = useState<PrayerTime[]>([]);
  const [loading, setLoading] = useState(true);
  // Use Islamic calendar hook for accurate Hijri dates
  const { hijriDate, isEidAlFitr, isEidAlAdha } = useIslamicCalendar();
  const isEid = isEidAlFitr || isEidAlAdha;
  const [timeFormat, setTimeFormat] = useState<'12' | '24'>('24');
  const [nextPrayerName, setNextPrayerName] = useState<string>("");
  const [nextEventCountdown, setNextEventCountdown] = useState<{ name: string; time: string; countdown: string } | null>(null);
  const [loadingAPI, setLoadingAPI] = useState(false);
  const [timezone, setTimezone] = useState<string>("");
  const [initialLoad, setInitialLoad] = useState(true);
  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Global location state
  const location = useLocationState();

  const [showManualLocationDialog, setShowManualLocationDialog] = useState(false);
  const [menstrualModeData, setMenstrualModeData] = useState(getMenstrualModeData());
  const [showBatteryOptDialog, setShowBatteryOptDialog] = useState(false);


  const prayerTimesHook = usePrayerTimes();
  useWidgetSync(); // Synchronize data with native Android widgets automatically

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


  useEffect(() => {
    const currentFormat = getTimeFormat();
    setTimeFormat(currentFormat);
  }, [setTimeFormat]);

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
        { name: "Dhuhr", time: formatTimeFromAPI(timings.Dhuhr), date: parseTimeToDate(timings.Dhuhr) },
        { name: "Asr", time: formatTimeFromAPI(timings.Asr), date: parseTimeToDate(timings.Asr) },
        { name: "Maghrib", time: formatTimeFromAPI(timings.Maghrib), date: parseTimeToDate(timings.Maghrib) },
        { name: "Isha", time: formatTimeFromAPI(timings.Isha), date: parseTimeToDate(timings.Isha) },
      ];

      setPrayers(prayerList);

      // Get next prayer countdown
      const nextEvent = await AladhanAPI.getNextEventCountdown(location.latitude, location.longitude, 1, false);
      if (nextEvent) {
        setNextPrayerName(nextEvent.name);
        setNextEventCountdown(nextEvent);
        if (nextEvent.targetDate) {
          setTargetTime(nextEvent.targetDate);
        }
      }
    } catch (error) {
      console.error('Failed to load API prayer times:', error);
      // Fallback to offline calculation
      const { calculatePrayerTimes, formatPrayerTime } = await import('@/lib/prayer-calculator');
      const times = calculatePrayerTimes(location.latitude, location.longitude, new Date());

      setPrayers([
        { name: "Fajr", time: formatTimeFromAPI(times.fajr.toTimeString().slice(0, 5)), date: times.fajr },
        { name: "Dhuhr", time: formatTimeFromAPI(times.dhuhr.toTimeString().slice(0, 5)), date: times.dhuhr },
        { name: "Asr", time: formatTimeFromAPI(times.asr.toTimeString().slice(0, 5)), date: times.asr },
        { name: "Maghrib", time: formatTimeFromAPI(times.maghrib.toTimeString().slice(0, 5)), date: times.maghrib },
        { name: "Isha", time: formatTimeFromAPI(times.isha.toTimeString().slice(0, 5)), date: times.isha },
      ]);

      const { getNextPrayer } = await import('@/lib/prayer-calculator');
      const nextPrayer = getNextPrayer(location.latitude, location.longitude);
      if (nextPrayer) {
        setNextPrayerName(nextPrayer.name);
      }
    } finally {
      setLoadingAPI(false);
      setInitialLoad(false);
    }
  }, [location.latitude, location.longitude, location.timeZone, location.locationName, location.setLocation, formatTimeFromAPI, parseTimeToDate, timeFormat]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Add online listener to refresh prayer times as soon as internet is back
    const handleOnline = () => {
      loadPrayerTimes();
      widgetRefreshManager.refreshAll(); // Refresh all widgets when online
    };

    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(timer);
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
    const success = await location.detectLocation();
    if (success) {
      // Show appropriate message based on detection method
      if (location.isIpBased) {
        toast({
          title: ti18n('locationDetected'),
          description: `Location approximated from IP. Enable GPS for accurate results.`,
        });
      } else {
        toast({ title: ti18n('locationDetected'), description: `Updated to ${location.locationName}` });
      }

      // Reload prayer times with new location
      await loadPrayerTimes();
    } else {
      toast({ title: ti18n('locationDetectionFailed'), description: ti18n('pleaseEnableLocationPermissions'), variant: "destructive" });
    }
  };


  // Handle menstrual mode toggle
  const handleMenstrualModeToggle = async () => {
    if (menstrualModeData.isActive) {
      const updated = deactivateMenstrualMode(new Date());
      setMenstrualModeData(updated);
      toast({
        title: ti18n('menstrualModeEnded'),
        description: ti18n('prayerReminderSchedulingResumed'),
      });
    } else {
      const updated = activateMenstrualMode(new Date());
      setMenstrualModeData(updated);

      // Disable the web adhan alarm state immediately while mode is active.
      localStorage.setItem("prayer-alarm-enabled", "false");
      window.dispatchEvent(
        new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: false } })
      );
      window.dispatchEvent(
        new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: "stop" } })
      );

      if (updated.pausePrayerNotifications) {
        try {
          const { localNotifications } = await import("@/lib/local-notifications");
          await localNotifications.clearPrayerNotifications();
        } catch (error) {
          console.error(ti18n('failedToClearPrayerNotifications'), error);
        }
      }

      toast({
        title: ti18n('menstrualModeEnabled'),
        description: ti18n('prayerRemindersPaused'),
      });
    }
  };

  // Listen for menstrual mode updates
  useEffect(() => {
    const handleModeUpdate = () => {
      setMenstrualModeData(getMenstrualModeData());
    };

    window.addEventListener("menstrual-mode-updated", handleModeUpdate);
    return () => {
      window.removeEventListener("menstrual-mode-updated", handleModeUpdate);
    };
  }, []);

  // Initialize prayer times when location changes
  useEffect(() => {
    if (location.latitude && location.longitude) {
      loadPrayerTimes();
    }
  }, [location.latitude, location.longitude, timeFormat, loadPrayerTimes]); // Add loadPrayerTimes to dependencies

  // Listen for time format changes from settings
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'time-format' && e.newValue) {
        setTimeFormat(e.newValue as '12' | '24');
        // Reload prayer times to apply new format
        if (location.latitude && location.longitude) {
          loadPrayerTimes();
        }
      }
    };

    const handleCustomTimeFormatChange = (e: CustomEvent) => {
      if (e.detail?.format) {
        setTimeFormat(e.detail.format as '12' | '24');
        // Reload prayer times to apply new format
        if (location.latitude && location.longitude) {
          loadPrayerTimes();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('time-format-changed', handleCustomTimeFormatChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('time-format-changed', handleCustomTimeFormatChange as EventListener);
    };
  }, [setTimeFormat, location.latitude, location.longitude, loadPrayerTimes]);

  // Clear stale location data on mount to prevent ISTRES issue
  useEffect(() => {
    // Guard against reload loops - only allow one reload per session
    const ISTRES_RELOAD_GUARD = 'istres-reload-guard';
    const hasReloaded = sessionStorage.getItem(ISTRES_RELOAD_GUARD);

    // Helper function to handle ISTRES cleanup and reload
    const cleanupIstresAndReload = (reason: string) => {
      if (hasReloaded) {
        console.warn('ISTRES cleanup skipped - already reloaded this session:', reason);
        // Clear the problematic data without reloading
        localStorage.removeItem('user-location-data');
        localStorage.removeItem('location-storage');
        return;
      }

      sessionStorage.setItem(ISTRES_RELOAD_GUARD, 'true');
      localStorage.removeItem('user-location-data');
      localStorage.removeItem('location-storage');
      console.log('Cleared location data due to ISTRES:', reason);
      window.location.reload();
    };

    // Clear any stale IP-based location that might show wrong city
    const staleKeys = ['user-location-data', 'location-storage'];
    staleKeys.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          // Clear if it contains ISTRES or other problematic location data
          if (parsed.city === 'Istres' || parsed.locationName?.includes('Istres') ||
            parsed.city === 'ISTRES' || parsed.locationName?.includes('ISTRES')) {
            cleanupIstresAndReload('localStorage contains ISTRES');
          }
        }
      } catch (error) {
        console.warn('Failed to check location data:', error);
      }
    });

    // Also force clear any problematic data if location is showing ISTRES
    if (location.locationName?.includes('Istres') || location.locationName?.includes('ISTRES')) {
      cleanupIstresAndReload('location state contains ISTRES');
    }
  }, []);



  // Update countdown every second
  // Optimize countdown: Fetch target time ONCE, then countdown locally
  // Lightweight interval: just updates the string based on targetTime
  useEffect(() => {
    if (!targetTime) return;

    const updateDisplay = () => {
      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        // Timer finished, trigger a re-fetch
        setTargetTime(null);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const countdownStr = hours > 0
        ? `${hours}h ${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`; // Added seconds for liveness

      setNextEventCountdown(prev => prev ? { ...prev, countdown: countdownStr } : null);
    };

    updateDisplay(); // update immediately
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);


  const prayerIcons: Record<string, React.ReactNode> = {
    Fajr: <Moon className="w-5 h-5" />,
    Dhuhr: <Sun className="w-5 h-5" />,
    Asr: <Cloud className="w-5 h-5" />,
    Maghrib: <Sunset className="w-5 h-5" />,
    Isha: <CloudMoon className="w-5 h-5" />,
  };

  const dashboardPrayers = prayers.map(p => {
    const prayerDate = p.date;
    const now = currentTime;
    const isUpcoming = prayerDate && prayerDate > now;
    
    return {
      name: p.name,
      time: p.time,
      icon: prayerIcons[p.name] || <Sun className="w-5 h-5" />,
      isActive: nextPrayerName === p.name,
      isUpcoming: isUpcoming
    };
  });

  const nextPrayerInfo = {
    name: nextPrayerName || "Loading...",
    time: nextEventCountdown?.time || "--:--",
    timeRemaining: nextEventCountdown?.countdown || "00:00:00",
    progress: 70, // This should be calculated based on current time vs start/end of prayer
  };

  return (
    <PageTransition>
      <PremiumDashboard
        currentTime={currentTime}
        hijriDate={hijriDate || ""}
        nextPrayer={nextPrayerInfo}
        prayers={dashboardPrayers}
        locationLabel={locationLabel}
        onServiceClick={(route) => navigate(route)}
        onVerseClick={() => navigate('/quran')}
        onHadithClick={() => navigate('/hadith/collections')}
        onNotificationClick={() => navigate('/notification-history')}
        onLocationClick={() => setShowManualLocationDialog(true)}
        showManualLocationDialog={showManualLocationDialog}
        setShowManualLocationDialog={setShowManualLocationDialog}
        LocationSearch={LocationSearch}
        GeocodingService={GeocodingService}
        AladhanAPI={AladhanAPI}
        location={location}
        prayerTimesHook={prayerTimesHook}
        setLoadingAPI={setLoadingAPI}
        toast={toast}
      />
    </PageTransition>
  );
}
