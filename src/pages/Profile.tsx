import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { goBackOrFallback } from "@/lib/navigation";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { Moon, Sun, Trash2, HardDrive, Calculator, Volume2, Bell, BellOff, Calendar, Heart, BookOpen, Mail, HandHeart, MessageCircle, Globe, User, UserCircle, UserX, ShieldCheck, ShieldOff, Smartphone, AlertTriangle, RefreshCw, Headphones, Settings as SettingsIcon, Clock, Package, Vibrate, ArrowLeft, DollarSign, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getMadhab, setMadhab, getTimeFormat, setTimeFormat as saveTimeFormat, isIslamicSleepReminderEnabled, setIslamicSleepReminderEnabled, getIslamicSleepOffset, setIslamicSleepOffset, type MadhabType } from "@/lib/storage";
import { AdhanSelector } from "@/components/AdhanSelector";
import { CustomAdhanUpload } from "@/components/CustomAdhanUpload";
import { getCalculationMethod, setCalculationMethod, type CalculationMethodName } from "@/lib/prayer-calculator";
import { AladhanAPI } from "@/lib/aladhan-api";
import { getStorageStats, clearAllBooks, formatFileSize } from "@/lib/ebooks-storage";
import { clearCache, getQuranFontSize, setQuranFontSize } from "@/lib/backup";
import { notificationManager, type NotificationPreferences } from "@/lib/notification-manager";
import { localNotifications } from "@/lib/local-notifications";
import { PrayerMethodSelector } from "@/components/PrayerMethodSelector";
import { quranFontManager, type QuranFont } from "@/lib/quran-font-manager";
import { unifiedNotifications } from "@/lib/unified-notifications";
import { getGenderSettings, setGender, type Gender } from "@/lib/gender-settings";
import { usePrayerAlarm } from "@/hooks/usePrayerAlarm";
import PermissionManager from "@/components/PermissionManager";
import { Changelog } from "@/components/Changelog";
import { HapticSettings } from "@/components/HapticSettings";
import { CURRENT_APP_VERSION } from "@/lib/constants";
import { hasUnseenChangelog } from "@/lib/changelog";
import { useSettings } from "@/contexts/SettingsContext";
import { scheduleIslamicSleepReminder, cancelIslamicSleepReminder, getNextIslamicSleepReminderTime } from "@/lib/islamic-sleep-reminder";
import { AutoBackupCard } from "@/components/AutoBackupCard";

// Changelog badge component
const ChangelogBadge = () => {
  const [hasUnread, setHasUnread] = useState(false);
  
  useEffect(() => {
    setHasUnread(hasUnseenChangelog());
  }, []);
  
  if (!hasUnread) return null;
  
  return (
    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse border-2 border-background" />
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t } = useLanguage();
  const { t: ti18n } = useI18n();
  const {
    theme,
    setTheme,
    animationEnabled,
    setAnimationEnabled,
    greetingEnabled,
    setGreetingEnabled,
    splashGreetingEnabled,
    setSplashGreetingEnabled,
    splashEnabled,
    setSplashEnabled,
  } = useSettings();

  const [madhab, setMadhabState] = useState<MadhabType>("shafi");
  const [timeFormat, setTimeFormatState] = useState<"12" | "24">("24");
  const [calculationMethod, setCalculationMethodState] = useState<CalculationMethodName>("MuslimWorldLeague");
  const [quranFontSize, setQuranFontSizeState] = useState(24);
  const [quranFont, setQuranFontState] = useState<QuranFont>("uthmani");
  const [storageStats, setStorageStats] = useState({ totalBooks: 0, totalSize: 0 });
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    ramadanCountdowns: true,
    eidGreetings: true,
    fridayKahfReminders: true,
    dailyHadithNotifications: false,
    morningReminders: false,
    eveningReminders: false,
    quranicVerses: true,
    dhikrReminders: true,
    islamicKnowledge: true,
    motivationalMessages: true,
    maxDailyNotifications: 5,
  });
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [notifPermStatus, setNotifPermStatus] = useState<'loading' | 'granted' | 'denied' | 'default'>('loading');
  const [isCapacitorApp] = useState(() => !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
  const [requestingPerm, setRequestingPerm] = useState(false);
  const [genderSettings, setGenderSettingsState] = useState(getGenderSettings());
  const [preferredCurrency, setPreferredCurrency] = useState(() => localStorage.getItem('preferred-currency') || 'USD');
  
  const [showChangelog, setShowChangelog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);

  useEffect(() => {
    if (showChangelog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showChangelog]);

  // Prayer alarm state
  const {
    isEnabled: isAlarmEnabled,
    isPlaying: isAlarmPlaying,
    currentPrayer,
    enableAlarm,
    disableAlarm,
    stopAdhan,
    testAdhan,
  } = usePrayerAlarm();

  const [reminderMinutes, setReminderMinutes] = useState('0');
  const [hijriOffset, setHijriOffset] = useState('0');
  // Prayer notification states
  const [prayerNotificationsEnabled, setPrayerNotificationsEnabled] = useState(false);
  const [prayerNotificationsLoading, setPrayerNotificationsLoading] = useState(true);
  const [scheduledPrayerCount, setScheduledPrayerCount] = useState(0);
  const [islamicSleepEnabled, setIslamicSleepEnabled] = useState(false);
  const [nextSleepReminderTime, setNextSleepReminderTime] = useState<string | null>(null);
  const [sleepContentPreview, setSleepContentPreview] = useState('');
  const [sleepOffset, setSleepOffset] = useState(30);

  const refreshPermissionStatus = useCallback(async () => {
    const status = await unifiedNotifications.getPermissionStatus();
    setNotifPermStatus(status as 'granted' | 'denied' | 'default');
    setNotificationsSupported(status === 'granted');
  }, []);

  useEffect(() => {
    // ────────────────────────────────────────────────────────────────────
    // 3-Phase Staged Mount — prevents the 2.4s "Davey" UI-thread block
    // that Logcat was measuring on Settings (Profile) open.
    //
    // The previous implementation ran ~22 sequential synchronous
    // operations (sync storage reads, JSON.parse, CSS DOM mutation,
    // Capacitor native bridge calls, IndexedDB queries, window event
    // listener attachment) ALL inside one synchronous tick, right
    // inside React's commit phase.  That plus the singleton
    // constructors' eager work = 92 skipped frames.
    //
    // Phasing spreads work so the first paint is fast, native bridge
    // calls happen AFTER the transition animation (shared-element
    // layoutId in BottomNav) completes, and heavy IndexedDB reads
    // don't block any user-visible work.
    //
    // NOTE: We deliberately use setTimeout(0) for PHASE 1 instead of
    // requestAnimationFrame.  RAF callbacks fire inside the *next
    // vsync window, so any slow synchronous work there still delays the
    // first paint frame.  setTimeout(0) fires as soon as the current
    // React commit + browser layout + paint complete — AFTER the user can
    // already see the skeleton.  This avoids the 18ms of 9× JSON.parse
    // calls from stealing a frame budget.
    // ────────────────────────────────────────────────────────────────────

    // PHASE 1 — as soon as the current task queue drains (≈0ms, AFTER first paint).
    // Reads persisted settings and writes them into local component state.
    // setState calls batch together into a single re-render.
    let phase1Timer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      setMadhabState(getMadhab());
      setTimeFormatState(getTimeFormat());
      setCalculationMethodState(getCalculationMethod());
      setQuranFontSizeState(getQuranFontSize());
      setQuranFontState(quranFontManager.getCurrentFont());
      setGenderSettingsState(getGenderSettings());
      const sleepEnabled = isIslamicSleepReminderEnabled();
      setIslamicSleepEnabled(sleepEnabled);
      setSleepOffset(getIslamicSleepOffset());
      if (sleepEnabled) {
        const previews = [
          'Recite Ayatul Kursi before sleeping.',
          'Recite Surah Al-Ikhlas, Al-Falaq, An-Nas (3x).',
          'Sleep on your right side facing the Qibla.',
        ];
        setSleepContentPreview(previews[new Date().getDate() % previews.length]);
      }
      phase1Timer = null;
    }, 0);

    // PHASE 2 — +200ms.  Settings/UI values that don't block paint.
    //           By now the Framer Motion page transition has finished.
    let t1: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      quranFontManager.initialize();
      setNotificationPrefs(notificationManager.getPreferences());

      const saved = localStorage.getItem('prayer-reminder-minutes');
      if (saved) setReminderMinutes(saved);

      const savedHijriOffset = localStorage.getItem('hijri-date-offset');
      if (savedHijriOffset) setHijriOffset(savedHijriOffset);
      t1 = null;
    }, 200);

    // PHASE 3 — Fire during next browser IDLE period (NOT a wall-clock timeout).
    // requestIdleCallback runs when the main thread has capacity (after paint,
    // after event queue is drained).  Falls back to setTimeout(..., 200) on
    // Safari/Capacitor WebViews that lack the API — still faster than 1000ms on
    // flagship, bounded to 200ms worst case via `timeout` option.
    let idleId: number | null = null;
    let fallbackT3: ReturnType<typeof setTimeout> | null = null;
    const phase3 = () => {
      refreshPermissionStatus();
      checkPrayerNotificationStatus();
      getStorageStats().then(setStorageStats);
    };
    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      idleId = ric(phase3, { timeout: 500 });
    } else {
      // Capacitor WebView / Safari fallback — run after current event loop drains
      fallbackT3 = setTimeout(phase3, 200);
    }

    // Event listeners — attach synchronously (cheap), just registering.
    const handleGenderSettingsUpdate = () => {
      setGenderSettingsState(getGenderSettings());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshPermissionStatus();
        checkPrayerNotificationStatus();
      }
    };

    window.addEventListener('gender-settings-updated', handleGenderSettingsUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', refreshPermissionStatus);

    return () => {
      if (phase1Timer !== null) clearTimeout(phase1Timer);
      if (t1 !== null) clearTimeout(t1);
      if (idleId !== null && typeof (window as any).cancelIdleCallback === 'function') {
        (window as any).cancelIdleCallback(idleId);
      }
      if (fallbackT3 !== null) clearTimeout(fallbackT3);
      window.removeEventListener('gender-settings-updated', handleGenderSettingsUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', refreshPermissionStatus);
    };
  }, []);

  useEffect(() => {
    if (islamicSleepEnabled) {
      scheduleIslamicSleepReminder();
    } else {
      cancelIslamicSleepReminder();
    }

    const updateNextTime = () => {
      const next = getNextIslamicSleepReminderTime();
      if (next) {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = next.toDateString() === tomorrow.toDateString();
        const prefix = isTomorrow ? 'Tomorrow' : 'Today';
        const hours = next.getHours().toString().padStart(2, '0');
        const minutes = next.getMinutes().toString().padStart(2, '0');
        setNextSleepReminderTime(`${prefix} at ${hours}:${minutes}`);
      } else {
        setNextSleepReminderTime(null);
      }
    };

    updateNextTime();
    const interval = setInterval(updateNextTime, 60000);

    const handlePrayerUpdate = () => {
      if (islamicSleepEnabled) {
        cancelIslamicSleepReminder();
        scheduleIslamicSleepReminder();
      }
      updateNextTime();
    };

    window.addEventListener('prayer-method-changed', handlePrayerUpdate);
    window.addEventListener('madhab-changed', handlePrayerUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('prayer-method-changed', handlePrayerUpdate);
      window.removeEventListener('madhab-changed', handlePrayerUpdate);
    };
  }, [islamicSleepEnabled]);

  // Listen for prayer method changes to reload prayer times
  useEffect(() => {
    const handleMethodChange = () => {
      // Trigger prayer time reload when method changes
      // This will be handled by any component that listens for this event
    };

    window.addEventListener('prayer-method-changed', handleMethodChange);
    return () => {
      window.removeEventListener('prayer-method-changed', handleMethodChange);
    };
  }, []);

  const handleSalamGreetingToggle = (checked: boolean) => {
    setGreetingEnabled(checked);
    toast({ title: ti18n(checked ? 'salamGreetingEnabled' : 'salamGreetingDisabled') });
  };

  const handleAnimationToggle = (checked: boolean) => {
    setAnimationEnabled(checked);
    toast({ title: checked ? 'Animations enabled' : 'Animations disabled' });
  };

  const handleSplashGreetingToggle = (checked: boolean) => {
    setSplashGreetingEnabled(checked);
    toast({ title: checked ? 'Splash text enabled' : 'Splash text hidden' });
  };

  const handleSplashToggle = (checked: boolean) => {
    setSplashEnabled(checked);
    toast({ title: checked ? 'Splash screen enabled' : 'Splash screen disabled' });
  };

  const handleNotificationToggle = async (key: keyof NotificationPreferences, checked: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: checked };
    setNotificationPrefs(newPrefs);
    notificationManager.updatePreferences({ [key]: checked });

    // Request permission if enabling notifications
    if (checked && !notificationsSupported) {
      const granted = await notificationManager.requestPermission();
      setNotificationsSupported(granted);
      if (!granted) {
        toast({
          title: ti18n('notificationPermissionDenied'),
          description: ti18n('pleaseEnableNotificationsInBrowser'),
          variant: "destructive"
        });
        return;
      }
    }

    toast({
      title: `${t(key)} ${checked ? 'Enabled' : 'Disabled'}`
    });
  };

  const requestNotificationPermission = async () => {
    setRequestingPerm(true);
    try {
      const granted = await unifiedNotifications.requestPermission();
      await refreshPermissionStatus();
      await checkPrayerNotificationStatus();
      if (granted) {
        toast({ title: ti18n('notificationsEnabled'), description: ti18n('youllReceivePrayerReminders') });
      } else {
        toast({
          title: "Permission denied",
          description: isCapacitorApp
            ? "Go to Android Settings → Apps → Noor Connect → Notifications and turn them on."
            : "Click the lock icon in your browser address bar and allow Notifications.",
          variant: "destructive"
        });
      }
    } finally {
      setRequestingPerm(false);
    }
  };

  const handleTestNotification = async () => {
    const result = await unifiedNotifications.testNotification();
    if (result.success) {
      toast({ title: "Test notification sent" });
    } else {
      toast({
        title: "Failed to send notification",
        description: result.error || "Please check your device notification settings.",
        variant: "destructive",
      });
    }
  };

  const checkPrayerNotificationStatus = async () => {
    try {
      const hasPermission = await localNotifications.areNotificationsEnabled();
      const enabledByPreference = localNotifications.arePrayerNotificationsEnabled();
      setPrayerNotificationsEnabled(hasPermission && enabledByPreference);

      if (hasPermission && enabledByPreference) {
        const scheduled = await localNotifications.getScheduledPrayerNotifications();
        setScheduledPrayerCount(scheduled.length);
      } else {
        setScheduledPrayerCount(0);
      }
    } catch (error) {
      console.error('Failed to check prayer notification status:', error);
    } finally {
      setPrayerNotificationsLoading(false);
    }
  };

  const handlePrayerNotificationToggle = async (enabled: boolean) => {
    setPrayerNotificationsLoading(true);
    try {
      if (enabled) {
        const hasPermission = await localNotifications.initialize();
        if (!hasPermission) {
          await localNotifications.setPrayerNotificationsEnabled(false);
          setPrayerNotificationsEnabled(false);
          setScheduledPrayerCount(0);
          toast({
            title: "Permission Denied",
            description: "Please enable notifications in your device settings",
            variant: "destructive",
          });
          return;
        }
      }

      await localNotifications.setPrayerNotificationsEnabled(enabled);
      await checkPrayerNotificationStatus();

      toast({
        title: enabled ? "Prayer Notifications Enabled" : "Prayer Notifications Disabled",
        description: enabled
          ? "Prayer reminders will be scheduled automatically"
          : "Prayer reminders have been cancelled",
      });
    } catch (error) {
      console.error("Failed to update prayer notification settings:", error);
      toast({
        title: "Update Failed",
        description: "Could not update prayer notification settings.",
        variant: "destructive",
      });
      await checkPrayerNotificationStatus();
    }
  };

  const handleRefreshPrayerNotifications = async () => {
    setPrayerNotificationsLoading(true);
    await checkPrayerNotificationStatus();
  };

  const handleClearPrayerNotifications = async () => {
    await localNotifications.clearPrayerNotifications();
    setScheduledPrayerCount(0);
    toast({
      title: "Prayer Notifications Cleared",
      description: "All scheduled prayer reminders have been cancelled",
    });
  };

  const toggleTheme = (checked: boolean) => setTheme(checked ? "dark" : "light");

  const handleMadhabChange = (value: MadhabType) => {
    setMadhabState(value);
    setMadhab(value);
    const madhabNames = {
      shafi: "Maliki, Shafi, Hanbali",
      hanafi: "Hanafi"
    } as const;
    toast({ title: `${t('madhab')}: ${madhabNames[value]}` });
    // Trigger prayer time recalculation
    window.dispatchEvent(new CustomEvent('madhab-changed', { detail: { madhab: value } }));
  };

  const handleTimeFormatChange = (value: "12" | "24") => {
    setTimeFormatState(value);
    saveTimeFormat(value);
    toast({ title: `${t('timeFormat')}: ${value}-Hour` });
  };

  const handleIslamicSleepToggle = (checked: boolean) => {
    setIslamicSleepEnabled(checked);
    setIslamicSleepReminderEnabled(checked);
    if (checked) {
      const content = [
        'Recite Ayatul Kursi before sleeping.',
        'Recite Surah Al-Ikhlas, Al-Falaq, An-Nas (3x).',
        'Sleep on your right side facing the Qibla.',
      ];
      setSleepContentPreview(content[new Date().getDate() % content.length]);
      scheduleIslamicSleepReminder();
      toast({ title: 'Islamic Sleep Reminder enabled' });
    } else {
      cancelIslamicSleepReminder();
      setNextSleepReminderTime(null);
      setSleepContentPreview('');
      toast({ title: 'Islamic Sleep Reminder disabled' });
    }
  };

  const handleSleepOffsetChange = (value: string) => {
    const minutes = parseInt(value, 10);
    setSleepOffset(minutes);
    setIslamicSleepOffset(minutes);
    if (islamicSleepEnabled) {
      cancelIslamicSleepReminder();
      scheduleIslamicSleepReminder();
      const next = getNextIslamicSleepReminderTime();
      if (next) {
        setNextSleepReminderTime(next.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }));
      }
      toast({ title: `Sleep reminder set to ${minutes} min after Isha` });
    }
  };

  const handleClearCache = async () => {
    await clearCache();
    setStorageStats({ totalBooks: 0, totalSize: 0 });
    toast({ title: "Cache cleared" });
    setShowClearCacheDialog(false);
  };

  const handleClearBooks = async () => {
    if (confirm("Delete all downloaded e-books?")) {
      await clearAllBooks();
      const stats = await getStorageStats();
      setStorageStats(stats);
      toast({ title: "E-books deleted" });
    }
  };

  const handleGenderChange = (newGender: Gender) => {
    const updated = setGender(newGender);
    setGenderSettingsState(updated);

    toast({
      title: t('genderUpdated'),
      description: newGender === "female"
        ? t('menstrualModeAvailable')
        : t('preferencesUpdated'),
    });
  };

  const handlePreferredCurrencyChange = (currency: string) => {
    setPreferredCurrency(currency);
    localStorage.setItem('preferred-currency', currency);
    toast({ title: 'Preferred currency updated' });
  };

  const handleReminderChange = (value: string) => {
    setReminderMinutes(value);
    localStorage.setItem('prayer-reminder-minutes', value);
  };


  const handleHijriOffsetChange = (value: string) => {
    setHijriOffset(value);
    localStorage.setItem('hijri-date-offset', value);
    AladhanAPI.clearCachedData();
    window.dispatchEvent(new Event('hijri-date-offset-changed'));
    const days = parseInt(value, 10);
    const sign = days > 0 ? '+' : '';
    toast({ title: `Hijri Date Offset Updated`, description: `Offset Is Now ${sign}${days} Day${Math.abs(days) !== 1 ? 's' : ''}` });
  };



  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-36 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-foreground tracking-tight">{t('settings')}</h1>
            <p className="text-sm font-bold text-primary/80 uppercase tracking-[0.2em]">{t('appTitle')}</p>
          </div>
          <div className="w-14 h-14 rounded-[20px] bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <SettingsIcon className="w-7 h-7 text-primary animate-spin-slow" />
          </div>
        </div>

        <div className="grid gap-6">
          {/* Appearance Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              {t('appearance')}
            </h3>
            <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] divide-y divide-border/40">
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                    <Globe className="w-3.5 h-3.5" />
                    {t('language')}
                  </Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "en" | "ar" | "ur" | "bn" | "ru")}>
                    <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30 border-none ring-0 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40 shadow-xl">
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية (Arabic)</SelectItem>
                      <SelectItem value="ur">اردو (Urdu)</SelectItem>
                      <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                      <SelectItem value="ru">Русский (Russian)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-orange-500/10 text-orange-500'}`}>
                      {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                    </div>
                    <div>
                      <Label className="text-sm font-bold">{t('darkMode')}</Label>
                      <p className="text-xs text-muted-foreground font-medium">App Theme</p>
                    </div>
                  </div>
                  <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${animationEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'}`}>
                      <Vibrate className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold">Animations</Label>
                      <p className="text-xs text-muted-foreground font-medium">Turn off motion-heavy effects</p>
                    </div>
                  </div>
                  <Switch checked={animationEnabled} onCheckedChange={handleAnimationToggle} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${greetingEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold">Salam Greeting</Label>
                      <p className="text-xs text-muted-foreground font-medium">Play once after launch</p>
                    </div>
                  </div>
                  <Switch checked={greetingEnabled} onCheckedChange={handleSalamGreetingToggle} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${splashGreetingEnabled ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold">Splash Text</Label>
                      <p className="text-xs text-muted-foreground font-medium">Show the launch subtitle</p>
                    </div>
                  </div>
                  <Switch checked={splashGreetingEnabled} onCheckedChange={handleSplashGreetingToggle} className="data-[state=checked]:bg-primary" />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${splashEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold">Splash Screen</Label>
                      <p className="text-xs text-muted-foreground font-medium">Show launch animation</p>
                    </div>
                  </div>
                  <Switch checked={splashEnabled} onCheckedChange={handleSplashToggle} className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            </Card>
          </div>



          {/* Personal Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              {t('personalInformation')}
            </h3>
            <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <User className="w-3.5 h-3.5" />
                  {t('gender')}
                </Label>
                <Select value={genderSettings.gender} onValueChange={(v: Gender) => handleGenderChange(v)}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30 border-none ring-0 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-xl">
                    <SelectItem value="male">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <span className="font-bold">{t('man')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="female">
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-rose-500" />
                        <span className="font-bold">{t('woman')}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="prefer-not-to-say">
                      <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-muted-foreground" />
                        <span className="font-bold">{t('preferNotToSay')}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {genderSettings.gender === "female"
                      ? t('menstrualModeAvailable')
                      : t('thisHelpsPersonalizeExperience')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Currency Settings Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              Currency Settings
            </h3>
            <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5">
              <div className="space-y-3">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <DollarSign className="w-3.5 h-3.5" />
                  Preferred Currency
                </Label>
                <Select value={preferredCurrency} onValueChange={handlePreferredCurrencyChange}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-muted/30 border-none ring-0 focus:ring-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40 shadow-xl">
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="PKR">PKR - Pakistani Rupee</SelectItem>
                    <SelectItem value="SAR">SAR - Saudi Riyal</SelectItem>
                    <SelectItem value="AED">AED - UAE Dirham</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                    <SelectItem value="BDT">BDT - Bangladeshi Taka</SelectItem>
                    <SelectItem value="TRY">TRY - Turkish Lira</SelectItem>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                    <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-start gap-2 pt-1">
                  <Globe className="w-3.5 h-3.5 text-primary mt-0.5" />
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    Used for Zakat calculator and exchange rate calculations
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Haptic Settings Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              Haptic Feedback
            </h3>
            <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5">
              <HapticSettings />
            </Card>
          </div>

          {/* Prayer Calculation Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              {t('prayerSettings')}
            </h3>
            <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5 space-y-5">
              <PrayerMethodSelector />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest ps-1">{t('madhab')}</Label>
                  <Select value={madhab} onValueChange={(v) => handleMadhabChange(v as MadhabType)}>
                    <SelectTrigger className="rounded-xl bg-muted/30 border-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg">
                      <SelectItem value="shafi">{t('madhabShafi')}</SelectItem>
                      <SelectItem value="hanafi">{t('madhabHanafi')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest ps-1">{t('timeFormat')}</Label>
                  <Select value={timeFormat} onValueChange={(v) => handleTimeFormatChange(v as "12" | "24")}>
                    <SelectTrigger className="rounded-xl bg-muted/30 border-none h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg">
                      <SelectItem value="12">12H Format</SelectItem>
                      <SelectItem value="24">24H Format</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 space-y-3">
                <Label className="text-xs font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('hijriAdjustment')}
                </Label>
                <Select value={hijriOffset} onValueChange={handleHijriOffsetChange}>
                  <SelectTrigger className="w-full h-11 rounded-xl bg-muted/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg">
                    <SelectItem value="-2">-2 {t('days')}</SelectItem>
                    <SelectItem value="-1">-1 {t('day')}</SelectItem>
                    <SelectItem value="0">0 {t('days')} ({t('manual')})</SelectItem>
                    <SelectItem value="1">+1 {t('day')}</SelectItem>
                    <SelectItem value="2">+2 {t('days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </div>
        </div>

        {/* Islamic Sleep Reminder */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
            Islamic Sleep Reminder
          </h3>
          <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <Label className="text-sm font-bold">Sleep Reminder</Label>
                   <p className="text-xs text-muted-foreground font-medium">
                     Reminds you of Islamic adhkar before sleep
                   </p>
                </div>
              </div>
              <Switch
                checked={islamicSleepEnabled}
                onCheckedChange={handleIslamicSleepToggle}
              />
            </div>

            {islamicSleepEnabled && (
              <div className="space-y-3 pt-4 border-t border-border/40">
                {nextSleepReminderTime && (
                  <div className="flex items-center gap-2 p-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                    <div className="p-1.5 rounded-lg bg-indigo-500/10">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Next reminder: {nextSleepReminderTime}</p>
                      <p className="text-xs text-muted-foreground">Based on Isha prayer time</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-muted-foreground">Remind me after Isha</p>
                  <Select value={sleepOffset.toString()} onValueChange={handleSleepOffsetChange}>
                    <SelectTrigger className="w-20 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 min</SelectItem>
                      <SelectItem value="30">30 min</SelectItem>
                      <SelectItem value="45">45 min</SelectItem>
                      <SelectItem value="60">60 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sleepContentPreview && (
                  <div className="p-3 bg-muted/30 rounded-2xl">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tonight's Reminder</p>
                    <p className="text-xs text-foreground/80 leading-relaxed">{sleepContentPreview}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Adhan & Prayer Notifications */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
            {t('prayerNotifications')}
          </h3>
          <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px] p-5 space-y-6">
            <AdhanSelector />

            <div className="pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">{t('prayerAlarmAdhan')}</Label>
                     <p className="text-xs text-muted-foreground font-medium">{t('prayerAlarmDescription')}</p>
                    <p className="text-xs text-muted-foreground font-medium">{t('prayerAlarmNote')}</p>
                  </div>
                </div>
                <Switch
                  checked={isAlarmEnabled}
                  onCheckedChange={(checked) => checked ? enableAlarm() : disableAlarm()}
                />
              </div>

              {isAlarmPlaying && (
                <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 animate-pulse mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg">
                      <Headphones className="h-4 w-4 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{currentPrayer} {t('time')}!</p>
                      <p className="text-xs uppercase font-bold text-muted-foreground/70">{t('adhanIsPlaying')}</p>
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={stopAdhan} className="rounded-xl font-bold">
                    {t('stop')}
                  </Button>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" size="sm" onClick={testAdhan} disabled={isAlarmPlaying} className="flex-1 h-11 rounded-xl font-bold gap-2">
                  <Volume2 className="w-4 h-4" />
                  {t('testAdhan')}
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">{t('prePrayerReminder')}</Label>
                    <p className="text-xs text-muted-foreground font-medium">{t('prePrayerReminderDescription')}</p>
                  </div>
                </div>
                <Select value={reminderMinutes} onValueChange={handleReminderChange}>
                  <SelectTrigger className="w-24 h-10 rounded-xl bg-muted/30 border-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-lg">
                    <SelectItem value="0">{t('off')}</SelectItem>
                    <SelectItem value="5">5 {t('min')}</SelectItem>
                    <SelectItem value="10">10 {t('min')}</SelectItem>
                    <SelectItem value="15">15 {t('min')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </div>

        {/* Custom Adhan Upload */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
            {t('customAdhan')}
          </h3>
          <CustomAdhanUpload />
        </div>




        {/* Auto Backup */}
        <div className="space-y-3">
          <AutoBackupCard />
        </div>


        {/* Storage & Backup */}
        <Card className="p-4 space-y-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <HardDrive className="w-4 h-4" /> {t('storageBackup')}
          </h3>

          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('downloadedBooks')}</span>
              <span className="font-medium">{storageStats.totalBooks}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">{t('storageUsed')}</span>
              <span className="font-medium">{formatFileSize(storageStats.totalSize)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={handleClearBooks} className="text-destructive">
              <Trash2 className="w-4 h-4 me-2" />
              {t('clearBooks')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowClearCacheDialog(true)} className="text-destructive">
              <Trash2 className="w-4 h-4 me-2" />
              {t('clearCache')}
            </Button>
          </div>
        </Card>

        {/* ── Notification Permission Banner ───────────────────────────── */}
        {notifPermStatus !== 'granted' && notifPermStatus !== 'loading' && (
          <Card className="p-0 overflow-hidden border-2 border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/5">
            <div className="flex items-center gap-3 px-4 pt-4 pb-2">
              {isCapacitorApp ? (
                <Smartphone className="w-5 h-5 text-amber-500 shrink-0" />
              ) : (
                <Globe className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">
                  {isCapacitorApp ? t('appNotifications') : t('browserNotifications')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {notifPermStatus === 'denied'
                    ? isCapacitorApp
                      ? t('permissionWasDeniedApp')
                      : t('permissionWasDeniedBrowser')
                    : isCapacitorApp
                      ? t('allowAppNotificationsDescription')
                      : t('allowBrowserNotificationsDescription')}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notifPermStatus === 'denied' ? 'bg-red-500/20' : 'bg-amber-500/20'
                }`}>
                {notifPermStatus === 'denied'
                  ? <ShieldOff className="w-4 h-4 text-red-500" />
                  : <AlertTriangle className="w-4 h-4 text-amber-500" />}
              </div>
            </div>

            {/* What you'll get */}
            <div className="mx-4 mb-3 p-2.5 rounded-lg bg-background/60 border border-border/50">
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">{t('youWillReceive')}</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { emoji: '🕌', label: t('prayerTimesFajrIsha') },
                  { emoji: '🌙', label: t('ramadanEidReminders') },
                  { emoji: '📖', label: t('fridayKahfAlert') },
                  { emoji: '✨', label: t('dailyHadithReminders') },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-1.5 text-xs text-foreground">
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-4 pb-4 flex gap-2">
              {notifPermStatus === 'denied' ? (
                isCapacitorApp ? (
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    size="sm"
                    onClick={async () => {
                      try {
                        // @capacitor/app v6 removed openSettings().  Use Android
                        // intent API via the same plugin's bridge fallback — or
                        // on newer Capacitor installs, the method is still
                        // available on some WebView implementations through the
                        // native bridge.  Try both paths, fall back to toast.
                        const { App } = await import('@capacitor/app');
                        const appAny = App as unknown as { openSettings?: () => Promise<void> };
                        if (typeof appAny.openSettings === 'function') {
                          await appAny.openSettings();
                        } else {
                          throw new Error('openSettings unavailable in @capacitor/app v6');
                        }
                      } catch {
                        toast({
                          title: t('openAndroidSettings'),
                          description: t('openAndroidSettingsDescription'),
                        });
                      }
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 ms-2" />
                    {t('openSettingsGuide')}
                  </Button>
                ) : (
                  <Button
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                    size="sm"
                    onClick={() => {
                      toast({
                        title: t('unblockInBrowser'),
                        description: t('unblockInBrowserDescription'),
                      });
                    }}
                  >
                    <ShieldCheck className="w-4 h-4 ms-2" />
                    {t('howToUnblock')}
                  </Button>
                )
              ) : (
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  size="sm"
                  onClick={requestNotificationPermission}
                  disabled={requestingPerm}
                >
                  {requestingPerm ? (
                    <RefreshCw className="w-4 h-4 ms-2 animate-spin" />
                  ) : (
                    <Bell className="w-4 h-4 ms-2" />
                  )}
                  {isCapacitorApp ? t('allowAppNotifications') : t('allowBrowserNotifications')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshPermissionStatus}
                className="shrink-0"
                title="Refresh permission status"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* Permission Management */}
        <PermissionManager className="mt-4" />

        {/* Notification Preferences */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            {t('notificationPreferences')}
          </h3>

          {!notificationsSupported ? (
            <div className="space-y-3 text-center py-3">
              <div className="w-10 h-10 bg-muted/50 rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                <BellOff className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground">
                {t('grantNotificationPermissionAbove')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('prayerNotifications')}</Label>
                  <p className="text-xs text-muted-foreground">{t('receiveRemindersDailyPrayerTimes')}</p>
                </div>
                <Switch
                  checked={prayerNotificationsEnabled}
                  onCheckedChange={handlePrayerNotificationToggle}
                  disabled={prayerNotificationsLoading}
                />
              </div>

              {prayerNotificationsEnabled && scheduledPrayerCount > 0 && (
                <div className="flex items-center justify-between bg-background/50 p-2 rounded-md border border-border/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium">{scheduledPrayerCount} {t('upcoming')}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefreshPrayerNotifications}>
                      <Calculator className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={handleClearPrayerNotifications}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t border-border/50 my-2 pt-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">{t('islamicEvents')}</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">{t('ramadanCountdown')}</Label>
                    </div>
                    <Switch
                      checked={notificationPrefs.ramadanCountdowns}
                      onCheckedChange={(v) => handleNotificationToggle('ramadanCountdowns', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">{t('eidGreetings')}</Label>
                    </div>
                    <Switch
                      checked={notificationPrefs.eidGreetings}
                      onCheckedChange={(v) => handleNotificationToggle('eidGreetings', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">{t('fridayKahfReminder')}</Label>
                    </div>
                    <Switch
                      checked={notificationPrefs.fridayKahfReminders}
                      onCheckedChange={(v) => handleNotificationToggle('fridayKahfReminders', v)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-border/50 my-2 pt-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">{t('dailyReminders')}</Label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('dailyHadith')}</Label>
                    <Switch
                      checked={notificationPrefs.dailyHadithNotifications}
                      onCheckedChange={(v) => handleNotificationToggle('dailyHadithNotifications', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('morningReminders')}</Label>
                    <Switch
                      checked={notificationPrefs.morningReminders}
                      onCheckedChange={(v) => handleNotificationToggle('morningReminders', v)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t('eveningReminders')}</Label>
                    <Switch
                      checked={notificationPrefs.eveningReminders}
                      onCheckedChange={(v) => handleNotificationToggle('eveningReminders', v)}
                    />
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={handleTestNotification}
              >
                {t('testNotification')}
              </Button>
            </div>
          )}
        </Card>


        {/* Notification History */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" />
              {t('notificationHistory')}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/notification-history')}
            >
              {t('viewAll')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('notificationHistoryDesc')}
          </p>
        </Card>

        {/* About */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold text-sm mb-2">{t('about')}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('aboutDescription')}
          </p>
          <p className="text-xs text-center text-muted-foreground mt-3">
            {t('fossMadeWithLove')}
          </p>
        </Card>

        {/* Contact & Support */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold text-sm mb-3">{t('contactSupport')}</h3>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => window.location.href = 'mailto:ubaid0345@proton.me'}
            >
              <Mail className="w-4 h-4 ms-2" />
              {t('contactDeveloper')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                toast({
                  title: "JazakAllah Khair!",
                  description: "Your duas are the best support. May Allah accept them and reward you abundantly.",
                });
              }}
            >
              <HandHeart className="w-4 h-4 ms-2" />
              {t('makeDua')}
            </Button>
          </div>
        </Card>

        {/* Source Code & Support */}
        <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <Globe className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground">Open Source & Support</h3>
              <p className="text-xs text-muted-foreground">Join the community or get help</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant="outline"
              className="w-full h-12 justify-start bg-background hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30 transition-all"
              onClick={() => window.open('https://gitlab.com/theredhacker0345/Noor-connect', '_blank')}
            >
              <Globe className="w-4 h-4 mr-3 text-emerald-600" />
              <span className="font-medium">View Source on GitLab</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-12 justify-start bg-background hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-500/30 transition-all"
              onClick={() => window.open('https://wa.me/923352706540', '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-3 text-emerald-600" />
              <span className="font-medium">Issues & Feedback (WhatsApp)</span>
            </Button>
            
            <div className="mt-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">License Attribution</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Audio Nasheeds in this application are non-commercially licensed from <a href="https://nocopyrightnasheeds.com" target="_blank" className="font-bold text-emerald-600 hover:underline">NoCopyrightNasheeds</a> under the NCN Community License Agreement.
              </p>
            </div>
          </div>
        </Card>



        {/* Changelog Section */}
        <Card className="overflow-hidden border-border/40 shadow-sm rounded-[24px]">
          <div className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/20">
                    <Package className="w-6 h-6 text-amber-600" />
                  </div>
                  <ChangelogBadge />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-foreground">What's New</h3>
                  <p className="text-xs text-muted-foreground">
                    See what's changed in this version
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChangelog(true)}
                className="h-10 rounded-xl hover:bg-amber-500/10 transition-all duration-200"
              >
                <span className="text-xs font-medium">View Changelog</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Version Info */}
        <div className="flex justify-center pt-4 pb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-muted-foreground/40">
            {t('version')} {CURRENT_APP_VERSION}
          </p>
        </div>
      </div>



      {/* Changelog Dialog */}
      {showChangelog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Changelog onClose={() => setShowChangelog(false)} />
        </div>
      )}

      {/* Clear Cache Warning Dialog */}
      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Clear Cache?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>This will remove temporary files and downloaded content to free up space.</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Will be removed:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span>Downloaded e-book PDFs</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                      <span>Offline cached assets (re-downloads on next visit)</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Your data is safe:</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Prayer records, bookmarks, qaza tracker</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Settings, preferences, habit tracker</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Auto backup snapshot</span>
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearCache}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Cache
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default Profile;
