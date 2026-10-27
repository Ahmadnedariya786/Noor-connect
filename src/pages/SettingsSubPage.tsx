import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { getAppearanceUIStrings } from '@/lib/quran-guide-i18n';
import {
  ArrowLeft,
  Palette,
  Vibrate,
  User,
  Clock,
  Bell,
  Volume2,
  Database,
  HardDrive,
  ShieldCheck,
  Info,
  Mail,
  Globe,
  DollarSign,
  Trash2,
  Copy,
  ExternalLink,
  AlertTriangle,
  X,
  Check,
  Activity,
  Download,
  RefreshCw,
  RotateCcw,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Sparkles,
  Shield,
  Moon,
  Sun,
  Sunrise,
  Calendar,
  Bookmark,
  BookOpen,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { rerunPermissionOnboarding } from '@/lib/onboarding-permissions';
import {
  getDiagnosticEntries,
  getRecentBreadcrumbs,
  clearDiagnostics,
  runDeepSystemHealthScan,
  generateAiDiagnosticReport,
  subscribeDiagnostics,
  recordBreadcrumb,
  type DiagnosticEvent,
  type FlightBreadcrumb,
  type DeepHealthScanReport,
} from '@/lib/diagnostics-engine';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  triggerPendingInstall,
  openExternalBrowserFallback,
  cancelApkDownload,
  formatDownloadSpeed,
  formatReleaseDate,
  formatDateTime,
  formatCommit,
  formatUpdateError,
  type UpdateCheckResult,
  type ApkDownloadProgressDetail,
} from '@/lib/update-checker';
import { BUILD_TIME, BUILD_COMMIT } from '@/buildInfo';
import { NoorLogoCrest } from '@/components/NoorLogoCrest';
import { OwnerSecurityModal } from '@/components/OwnerSecurityModal';
import { OwnerSecurityVaultCard } from '@/components/OwnerSecurityVaultCard';
import { isOwnerSessionUnlocked, isUpgradationLockEnabled, subscribeOwnerSecurity, lockOwnerSession } from '@/lib/owner-security';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { ClockStylePicker } from '@/components/clocks/ClockStylePicker';
import { useClockStyle } from '@/lib/clock-style';
import { CLOCK_STYLES } from '@/types/clock';
import { ThemePicker, useAppTheme } from '@/components/themes';

import { getMadhab, setMadhab, type MadhabType } from '@/lib/storage';
import { AladhanAPI } from '@/lib/aladhan-api';
import { getStorageStats, clearAllBooks, formatFileSize } from '@/lib/ebooks-storage';
import { downloadManager } from '@/lib/download-manager';
import { getStorageBreakdown, clearTemporaryCache, type StorageBreakdown } from '@/lib/cache-manager';
import { notificationManager, type NotificationPreferences } from '@/lib/notification-manager';
import { unifiedNotifications } from '@/lib/unified-notifications';
import { getGenderSettings, setGender, type Gender } from '@/lib/gender-settings';
import { usePrayerAlarm } from '@/hooks/usePrayerAlarm';
import { CURRENT_APP_VERSION } from '@/lib/constants';

import { HapticSettings } from '@/components/HapticSettings';
import { AdhanSelector } from '@/components/AdhanSelector';
import { CustomAdhanUpload } from '@/components/CustomAdhanUpload';
import { PrayerMethodSelector } from '@/components/PrayerMethodSelector';
import PermissionManager from '@/components/PermissionManager';
import { Changelog } from '@/components/Changelog';
import { AutoBackupCard } from '@/components/AutoBackupCard';

const SECTION_TITLES: Record<string, { title: string; subtitle: string; icon: any; titleKey?: string }> = {
  appearance: { title: 'Theme & Appearance', subtitle: 'Display, animations & splash settings', icon: Palette, titleKey: 'themeAndAppearance' },
  'app-theme': { title: 'App Theme', subtitle: 'Choose your full-app color theme', icon: Palette, titleKey: 'appTheme' },
  'clock-style': { title: 'Clock Style', subtitle: 'Select home screen clock design', icon: Clock, titleKey: 'clockStyle' },
  haptics: { title: 'Haptic Feedback', subtitle: 'Vibration & tactile feedback settings', icon: Vibrate, titleKey: 'hapticFeedback' },
  personal: { title: 'Personal Information', subtitle: 'Gender, language & preferred currency', icon: User, titleKey: 'personalInformation' },
  prayer: { title: 'Prayer Calculation', subtitle: 'Calculation method, Madhab & Hijri offset', icon: Clock, titleKey: 'prayerCalculation' },
  notifications: { title: 'Prayer Notifications', subtitle: 'Reminders, daily notifications & alerts', icon: Bell, titleKey: 'prayerNotifications' },
  adhan: { title: 'Adhan & Sounds', subtitle: 'Adhan audio selection & custom uploads', icon: Volume2, titleKey: 'adhanAndSounds' },
  backup: { title: 'Backup & Restore', subtitle: 'Cloud backup, sync & export settings', icon: Database, titleKey: 'backupAndRestore' },
  storage: { title: 'Storage & Cache', subtitle: 'Manage temporary cache & protected local data', icon: HardDrive, titleKey: 'storageAndCache' },
  privacy: { title: 'Privacy & Security', subtitle: 'Data usage, local storage & permissions', icon: ShieldCheck, titleKey: 'privacyAndSecurity' },
  about: { title: 'About Noor Connect', subtitle: 'App version, release notes & updates', icon: Info, titleKey: 'aboutNoorConnect' },
  contact: { title: 'Contact & Feedback', subtitle: "We'd love to hear from you", icon: Mail, titleKey: 'contactAndFeedback' },
};

const SUPPORT_EMAIL = 'overstay-cobbler41@bravealias.com';
const MAILTO_FEEDBACK_URL = `mailto:${SUPPORT_EMAIL}?subject=Noor%20Connect%20Feedback`;

const SettingsSubPage: React.FC = () => {
  const { sectionId = 'appearance' } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage, t, ui, isRTL } = useLanguage();
  const appearanceStrings = useMemo(() => getAppearanceUIStrings(language), [language]);
  const {
    animationEnabled,
    setAnimationEnabled,
    greetingEnabled,
    setGreetingEnabled,
    splashGreetingEnabled,
    setSplashGreetingEnabled,
    splashEnabled,
    setSplashEnabled,
    timeFormat,
    setTimeFormat,
  } = useSettings();

  const { clockStyle } = useClockStyle();
  const currentClockStyleName = CLOCK_STYLES.find(s => s.id === clockStyle)?.name || 'Digital Bold';
  const { currentTheme, theme } = useAppTheme();
  const currentThemeName = theme?.name || 'Oxford Gold';

  const [madhab, setMadhabState] = useState<MadhabType>('shafi');
  const [storageStats, setStorageStats] = useState({ totalBooks: 0, totalSize: 0 });
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown | null>(null);
  const [quranDownloads, setQuranDownloads] = useState({ count: 0, size: 0, reciters: 0 });
  const [genderSettings, setGenderSettingsState] = useState(getGenderSettings());
  const [preferredCurrency, setPreferredCurrency] = useState(() => localStorage.getItem('preferred-currency') || 'USD');
  const [hijriOffset, setHijriOffset] = useState('0');
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [showClearQuranDialog, setShowClearQuranDialog] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);

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
    tahajjudReminders: true,
    duhaReminders: true,
    fastingDaysReminders: true,
    quranTrackerReminders: true,
    bedtimeDuaReminders: true,
  });

  const { isEnabled: isAlarmEnabled, testAdhan, enableAlarm, disableAlarm } = usePrayerAlarm();

  useEffect(() => {
    if (sectionId === 'support' || sectionId === 'donate') {
      navigate('/settings/about', { replace: true });
    }
  }, [sectionId, navigate]);

  useEffect(() => {
    setMadhabState(getMadhab());
    setGenderSettingsState(getGenderSettings());
    setNotificationPrefs(notificationManager.getPreferences());

    const savedOffset = localStorage.getItem('hijri-date-offset');
    if (savedOffset) setHijriOffset(savedOffset);

    getStorageStats().then(setStorageStats);
    getStorageBreakdown().then(setStorageBreakdown).catch(() => {});

    const handleCacheUpdated = () => {
      getStorageBreakdown().then(setStorageBreakdown).catch(() => {});
      getStorageStats().then(setStorageStats).catch(() => {});
    };
    window.addEventListener('noor-cache-updated', handleCacheUpdated);

    downloadManager.listDownloaded()
      .then((items) => {
        const reciterIds = new Set(items.map((it) => it.reciterId));
        setQuranDownloads({
          count: items.length,
          size: items.reduce((acc, it) => acc + it.size, 0),
          reciters: reciterIds.size,
        });
      })
      .catch(() => {
        // Handled initial downloaded list error
      });

    return () => {
      window.removeEventListener('noor-cache-updated', handleCacheUpdated);
    };
  }, []);

  const activeRemindersCount = [
    notificationPrefs.fridayKahfReminders,
    notificationPrefs.ramadanCountdowns,
    notificationPrefs.quranicVerses,
    notificationPrefs.tahajjudReminders ?? true,
    notificationPrefs.duhaReminders ?? true,
    notificationPrefs.fastingDaysReminders ?? true,
    notificationPrefs.quranTrackerReminders ?? true,
    notificationPrefs.bedtimeDuaReminders ?? true,
  ].filter(Boolean).length;

  const handleToggleAllReminders = () => {
    const shouldEnable = activeRemindersCount < 8;
    const updated: NotificationPreferences = {
      ...notificationPrefs,
      fridayKahfReminders: shouldEnable,
      ramadanCountdowns: shouldEnable,
      quranicVerses: shouldEnable,
      tahajjudReminders: shouldEnable,
      duhaReminders: shouldEnable,
      fastingDaysReminders: shouldEnable,
      quranTrackerReminders: shouldEnable,
      bedtimeDuaReminders: shouldEnable,
    };
    setNotificationPrefs(updated);
    notificationManager.updatePreferences(updated);
    toast({
      title: shouldEnable ? 'All Reminders Enabled' : 'All Reminders Disabled',
      description: shouldEnable ? 'All 8 spiritual notifications active' : 'Spiritual notifications silenced',
    });
  };

  const meta = useMemo(() => {
    const icon = SECTION_TITLES[sectionId]?.icon || Palette;
    if (sectionId === 'appearance') {
      return {
        title: ui.appearanceSubpageTitle,
        subtitle: ui.appearanceSubpageSubtitle,
        icon,
      };
    }
    if (sectionId === 'clock-style') {
      return {
        title: ui.clockStyle,
        subtitle: ui.clockStyleSub,
        icon,
      };
    }
    if (sectionId === 'haptics') {
      return {
        title: ui.hapticFeedback,
        subtitle: ui.hapticFeedbackSub,
        icon,
      };
    }
    if (sectionId === 'personal') {
      return {
        title: ui.personalInformation,
        subtitle: ui.personalInformationSub,
        icon,
      };
    }
    if (sectionId === 'prayer') {
      return {
        title: ui.prayerCalculation,
        subtitle: ui.prayerCalculationSub,
        icon,
      };
    }
    if (sectionId === 'notifications') {
      return {
        title: ui.prayerNotifications,
        subtitle: ui.prayerNotificationsSub,
        icon,
      };
    }
    if (sectionId === 'adhan') {
      return {
        title: ui.adhanAndSounds,
        subtitle: ui.adhanAndSoundsSub,
        icon,
      };
    }
    if (sectionId === 'backup') {
      return {
        title: ui.backupAndRestore,
        subtitle: ui.backupAndRestoreSub,
        icon,
      };
    }
    if (sectionId === 'storage') {
      return {
        title: ui.storageAndCache,
        subtitle: ui.storageAndCacheSub,
        icon,
      };
    }
    if (sectionId === 'privacy') {
      return {
        title: ui.privacyAndSecurity,
        subtitle: ui.privacyAndSecuritySub,
        icon,
      };
    }
    if (sectionId === 'about') {
      return {
        title: ui.aboutNoorConnect,
        subtitle: ui.aboutNoorConnectSub,
        icon,
      };
    }
    if (sectionId === 'contact') {
      return {
        title: ui.contactAndFeedback,
        subtitle: ui.contactAndFeedbackSub,
        icon,
      };
    }
    const sectionConfig = SECTION_TITLES[sectionId];
    return {
      title: sectionConfig?.title || ui.settings,
      subtitle: sectionConfig?.subtitle || ui.settingsSubtitle,
      icon,
    };
  }, [sectionId, ui]);
  const IconComponent = meta.icon;

  const [diagnosticEvents, setDiagnosticEvents] = useState<DiagnosticEvent[]>([]);
  const [flightBreadcrumbs, setFlightBreadcrumbs] = useState<FlightBreadcrumb[]>([]);
  const [healthScanReport, setHealthScanReport] = useState<DeepHealthScanReport | null>(null);
  const [isScanningHealth, setIsScanningHealth] = useState(false);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState<string | null>(null);

  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);
  const [isEventsExpanded, setIsEventsExpanded] = useState(false);
  const [isBreadcrumbsExpanded, setIsBreadcrumbsExpanded] = useState(false);
  const [expandedCheckId, setExpandedCheckId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [apkDownloadProgress, setApkDownloadProgress] = useState<ApkDownloadProgressDetail | null>(null);

  // Owner Security Authorization Lock state
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [securityActionTitle, setSecurityActionTitle] = useState('Owner Security Key Required');
  const [securityActionDesc, setSecurityActionDesc] = useState(
    'Protected customization & upgradation action. Enter your private Owner Master Key to proceed.'
  );
  const pendingSecurityActionRef = useRef<(() => void) | null>(null);

  // Stealth Owner Security Vault state (revealed via 5-tap on Version 2.2.1 when unlocked)
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(() => isOwnerSessionUnlocked());
  const versionTapTimesRef = useRef<number[]>([]);

  const handleVersionTap = () => {
    const now = Date.now();
    const recentTaps = versionTapTimesRef.current.filter((t) => now - t <= 3000);
    recentTaps.push(now);
    versionTapTimesRef.current = recentTaps;

    if (recentTaps.length >= 5) {
      versionTapTimesRef.current = [];
      if (isOwnerSessionUnlocked()) {
        setIsOwnerUnlocked(true);
        toast({
          title: '🔓 Owner Vault Unlocked',
          description: 'Owner administrative session is active.',
        });
      } else {
        // True Stealth: ONLY reveal vault card upon successful Master Key verification!
        executeWithSecurity(
          () => {
            setIsOwnerUnlocked(true);
          },
          'Unlock Owner Security Vault',
          'Enter your private Owner Master Key to unlock administrative settings.'
        );
      }
    }
  };

  const executeWithSecurity = (
    action: () => void,
    title?: string,
    desc?: string,
    requiresUpgradeLock = false
  ) => {
    // If action is only gated by upgradation lock and owner disabled it, allow immediately
    if (requiresUpgradeLock && !isUpgradationLockEnabled()) {
      action();
      return;
    }

    // If session is already unlocked for 15 minutes, proceed immediately
    if (isOwnerUnlocked || isOwnerSessionUnlocked()) {
      action();
      return;
    }

    pendingSecurityActionRef.current = action;
    setSecurityActionTitle(title || 'Owner Security Key Required');
    setSecurityActionDesc(
      desc || 'Protected customization & upgradation action. Enter your private Owner Master Key to proceed.'
    );
    setSecurityModalOpen(true);
  };

  useEffect(() => {
    // Reset stealth vault visibility and lock session on navigating away from about section
    if (sectionId !== 'about') {
      lockOwnerSession();
      setIsOwnerUnlocked(false);
    }
    versionTapTimesRef.current = [];
  }, [sectionId]);

  useEffect(() => {
    // Auto-sync vault if session locks or expires
    const syncUnlocked = () => {
      setIsOwnerUnlocked(isOwnerSessionUnlocked());
    };
    syncUnlocked();
    const unsub = subscribeOwnerSecurity(syncUnlocked);
    return unsub;
  }, []);

  useEffect(() => {
    const handleApkProgress = (e: CustomEvent<ApkDownloadProgressDetail>) => {
      if (e.detail) {
        setApkDownloadProgress(e.detail);
      }
    };
    window.addEventListener('apkDownloadProgress', handleApkProgress as EventListener);

    if (sectionId === 'about') {
      const refreshData = () => {
        setDiagnosticEvents(getDiagnosticEntries());
        setFlightBreadcrumbs(getRecentBreadcrumbs());
      };
      refreshData();
      const unsubscribe = subscribeDiagnostics(refreshData);

      checkNightlyUpdate(false)
        .then(setUpdateResult)
        .catch((err) => {
          // Handled initial background update check error
          const msg = formatUpdateError(err);
          setUpdateResult({
            hasUpdate: false,
            status: 'Check failed',
            statusReason: msg,
            installedCommit: BUILD_COMMIT,
            installedBuildTime: BUILD_TIME,
            currentBuildTime: BUILD_TIME,
            currentBuildCommit: BUILD_COMMIT,
            remoteCommit: undefined,
            latestApkUploadedAt: undefined,
            release: null,
            lastChecked: Date.now(),
            fromCache: false,
            error: msg,
          });
        });

      return () => {
        unsubscribe();
        window.removeEventListener('apkDownloadProgress', handleApkProgress as EventListener);
      };
    }

    return () => {
      window.removeEventListener('apkDownloadProgress', handleApkProgress as EventListener);
    };
  }, [sectionId]);

  const handleManualCheckUpdate = async () => {
    recordBreadcrumb('UPDATE_CHECK', 'Manual check triggered in Settings > About');
    setIsCheckingUpdate(true);
    try {
      try {
        localStorage.removeItem('noor_nightly_update_cache');
        localStorage.removeItem('noor_update_last_checked');
        localStorage.removeItem('noor_last_update_check');
      } catch (storageErr) {
        // Handled storage cleanup fallback before manual update check
        console.warn('Could not clear update cache before manual check:', storageErr);
      }
      const res = await checkNightlyUpdate(true);
      setUpdateResult(res);
      if (res.hasUpdate) {
        toast({
          title: 'Nightly Update Available',
          description: `Released ${formatReleaseDate(res.release?.publishedAt)}. Tap download to install.`,
        });
      } else if (res.status === 'Check failed' || res.error) {
        toast({
          title: 'Check Failed',
          description: res.statusReason || res.error || 'Network error - check internet',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Up to Date',
          description: 'You are running the latest build.',
        });
      }
    } catch (manualErr: any) {
      // Handled manual check error fallback
      const errorMsg = formatUpdateError(manualErr);
      setUpdateResult({
        hasUpdate: false,
        status: 'Check failed',
        statusReason: errorMsg,
        installedCommit: BUILD_COMMIT,
        installedBuildTime: BUILD_TIME,
        currentBuildTime: BUILD_TIME,
        currentBuildCommit: BUILD_COMMIT,
        remoteCommit: undefined,
        latestApkUploadedAt: undefined,
        release: null,
        lastChecked: Date.now(),
        fromCache: false,
        error: errorMsg,
      });
      toast({
        title: 'Check Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleRunHealthScan = async () => {
    setIsScanningHealth(true);
    try {
      const report = await runDeepSystemHealthScan();
      setHealthScanReport(report);
      setIsChecklistExpanded(true);
      toast({
        title: 'Health Scan Complete',
        description: `${report.passedCount}/${report.totalChecks} Subsystems Passed (${report.warnCount} warnings, ${report.failCount} failed).`,
      });
    } catch (err) {
      toast({
        title: 'Health Scan Failed',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setIsScanningHealth(false);
    }
  };

  const handleCopyAiReport = async () => {
    try {
      const reportMarkdown = await generateAiDiagnosticReport(healthScanReport);
      await navigator.clipboard?.writeText(reportMarkdown);
      setCopiedDiagnostics(true);
      toast({
        title: 'Report Copied!',
        description: 'Full diagnostic report copied! Paste it to AI.',
      });
      setTimeout(() => setCopiedDiagnostics(false), 2500);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not access clipboard to copy diagnostic report.',
        variant: 'destructive',
      });
    }
  };

  const handleTestErrorCapture = () => {
    try {
      console.error('[DIAGNOSTIC_TEST] Controlled verification error captured by diagnostics engine');
      recordBreadcrumb('TEST', 'User triggered test error capture');
      toast({
        title: 'Test Error Logged',
        description: 'Captured 1 test event in diagnostics buffer.',
      });
      setIsEventsExpanded(true);
    } catch (err) {
      toast({
        title: 'Test Error Failed',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  const handleClearDiagnostics = () => {
    clearDiagnostics();
    setDiagnosticEvents([]);
    setFlightBreadcrumbs([]);
    setHealthScanReport(null);
    toast({
      title: 'Diagnostics Cleared',
      description: 'Error log buffer and flight breadcrumbs have been reset.',
    });
  };

  const handleCopySingleEvent = (ev: DiagnosticEvent) => {
    try {
      const text = JSON.stringify(ev, null, 2);
      navigator.clipboard?.writeText(text);
      setCopiedEventId(ev.id);
      toast({
        title: 'Error Copied',
        description: 'Individual error details copied to clipboard.',
      });
      setTimeout(() => setCopiedEventId(null), 2000);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy error to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast({ title: 'Email copied!' });
    } catch {
      // Clipboard write fallback
      toast({ title: 'Could not copy email', variant: 'destructive' });
    }
  };

  const handleClearCache = async () => {
    const res = await clearTemporaryCache();
    const updated = await getStorageBreakdown();
    setStorageBreakdown(updated);
    setStorageStats({ totalBooks: 0, totalSize: 0 });
    const description =
      res.freedBytes > 0
        ? `Cleared ${res.freedFormatted} of temporary cache. Personal data is safe.`
        : 'Temporary cache is already clean (0 B). Personal data is safe.';
    toast({
      title: 'Temporary Cache Cleared',
      description,
    });
    setShowClearCacheDialog(false);
  };

  const handleClearQuranDownloads = async () => {
    try {
      await downloadManager.clearAll();
      setQuranDownloads({ count: 0, size: 0, reciters: 0 });
      toast({ title: 'Offline surahs deleted', description: 'All downloaded Quran audio has been removed from this device.' });
    } catch {
      toast({ title: 'Could not delete downloads', variant: 'destructive' });
    }
    setShowClearQuranDialog(false);
  };

  const handleClearBooks = async () => {
    await clearAllBooks();
    const stats = await getStorageStats();
    setStorageStats(stats);
    toast({ title: 'E-books deleted' });
  };

  const handleNotificationToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    const updated = { ...notificationPrefs, [key]: checked };
    setNotificationPrefs(updated);
    notificationManager.updatePreferences({ [key]: checked });
    toast({ title: `Notification ${checked ? 'enabled' : 'disabled'}` });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bg-base)]/85 border-b border-[var(--border)] px-4 pb-3.5 safe-top" style={{ paddingTop: 'calc(var(--safe-top) + 0.875rem)' }}>
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/profile', { replace: true })}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
            aria-label="Go back to Profile"
          >
            <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
              {meta.title}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)] bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>
              {meta.subtitle}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
            <IconComponent className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-5 pb-40" style={{ paddingBottom: '148px' }}>
        {/* APPEARANCE SECTION */}
        {sectionId === 'appearance' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-4 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {appearanceStrings.language}
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                  <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                  <SelectItem value="ru">Русский (Russian)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-4 rounded-2xl" style={{ paddingBottom: '18px', overflow: 'visible', maxHeight: 'none' }}>
              <div
                className="flex items-center justify-between py-1 cursor-pointer group"
                onClick={() => navigate('/settings/app-theme', { replace: true })}
                role="button"
                tabIndex={0}
              >
                <div>
                  <Label className="text-sm font-bold cursor-pointer group-hover:text-[var(--accent-text)] transition-colors">{appearanceStrings.appThemeTitle}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">{appearanceStrings.appThemeSubtitle}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                    {currentThemeName}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] rtl:rotate-180 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">{appearanceStrings.fluidAnimationsTitle}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">{appearanceStrings.fluidAnimationsSubtitle}</p>
                </div>
                <Switch checked={animationEnabled} onCheckedChange={setAnimationEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">{appearanceStrings.salamGreetingTitle}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">{appearanceStrings.salamGreetingSubtitle}</p>
                </div>
                <Switch checked={greetingEnabled} onCheckedChange={setGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">{appearanceStrings.splashWelcomeTitle}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">{appearanceStrings.splashWelcomeSubtitle}</p>
                </div>
                <Switch checked={splashGreetingEnabled} onCheckedChange={setSplashGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">{appearanceStrings.splashScreenTitle}</Label>
                  <p className="text-xs text-[var(--text-secondary)]">{appearanceStrings.splashScreenSubtitle}</p>
                </div>
                <Switch checked={splashEnabled} onCheckedChange={setSplashEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>{appearanceStrings.timeFormat24Title}</Label>
                  <p className="text-xs text-[var(--text-secondary)] bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>{appearanceStrings.timeFormat24Subtitle}</p>
                </div>
                <Switch
                  checked={timeFormat === '24h'}
                  onCheckedChange={(checked) => setTimeFormat(checked ? '24h' : '12h')}
                />
              </div>
            </Card>
          </div>
        )}

        {/* APP THEME SECTION */}
        {sectionId === 'app-theme' && (
          <div className="space-y-4">
            <ThemePicker />
          </div>
        )}

        {/* CLOCK STYLE SECTION */}
        {sectionId === 'clock-style' && (
          <div className="space-y-4">
            <ClockStylePicker />
          </div>
        )}

        {/* HAPTICS SECTION */}
        {sectionId === 'haptics' && <HapticSettings />}

        {/* PERSONAL SECTION */}
        {sectionId === 'personal' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                  <User className="w-4 h-4 text-[var(--accent)]" />
                  Gender Preference
                </Label>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Customizes habit tracking, privacy, and optional menstrual pause mode.
                </p>
              </div>
              <Select value={genderSettings.gender} onValueChange={(v: Gender) => setGenderSettingsState(setGender(v))}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="male">Man</SelectItem>
                  <SelectItem value="female">Woman (Includes Menstrual Mode)</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[var(--accent)]" />
                  Preferred Currency
                </Label>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Used for Zakat nisab estimation, gold/silver valuation, and charity logging.
                </p>
              </div>
              <Select
                value={preferredCurrency}
                onValueChange={(curr) => {
                  setPreferredCurrency(curr);
                  localStorage.setItem('preferred-currency', curr);
                  toast({ title: 'Preferred currency updated' });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="PKR">PKR - Pakistani Rupee (Rs)</SelectItem>
                  <SelectItem value="SAR">SAR - Saudi Riyal (SR)</SelectItem>
                  <SelectItem value="AED">AED - UAE Dirham (AED)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (€)</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound (£)</SelectItem>
                  <SelectItem value="INR">INR - Indian Rupee (₹)</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>
        )}

        {/* PRAYER SECTION */}
        {sectionId === 'prayer' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>24-Hour Time Format</Label>
                  <p className="text-xs text-[var(--text-secondary)] bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>Display prayer times in 24-hour format (e.g. 17:30)</p>
                </div>
                <Switch
                  checked={timeFormat === '24h'}
                  onCheckedChange={(checked) => setTimeFormat(checked ? '24h' : '12h')}
                />
              </div>
            </Card>

            <PrayerMethodSelector />

            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Madhab (Asr School of Jurisprudence)
                </Label>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  {madhab === 'shafi' ? 'Standard' : 'Hanafi'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMadhabState('shafi');
                    setMadhab('shafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                    } catch {
                      // Handled cache purge fallback
                    }
                    toast({ title: 'Madhab set to Shafi / Maliki / Hanbali' });
                  }}
                  className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center"
                  style={{
                    background: madhab === 'shafi' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                    color: madhab === 'shafi' ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: madhab === 'shafi' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  <span>Shafi / Maliki / Hanbali</span>
                  <span className="text-[10px] font-normal opacity-80">Shadow length = 1×</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMadhabState('hanafi');
                    setMadhab('hanafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                    } catch {
                      // Handled cache purge fallback
                    }
                    toast({ title: 'Madhab set to Hanafi' });
                  }}
                  className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center"
                  style={{
                    background: madhab === 'hanafi' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                    color: madhab === 'hanafi' ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: madhab === 'hanafi' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                  }}
                >
                  <span>Hanafi</span>
                  <span className="text-[10px] font-normal opacity-80">Shadow length = 2×</span>
                </button>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Hijri Date Offset</Label>
              <Select
                value={hijriOffset}
                onValueChange={(val) => {
                  setHijriOffset(val);
                  localStorage.setItem('hijri-date-offset', val);
                  AladhanAPI.clearCachedData();
                  window.dispatchEvent(new Event('hijri-date-offset-changed'));
                  toast({ title: 'Hijri offset updated' });
                }}
              >
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="-2">-2 Days</SelectItem>
                  <SelectItem value="-1">-1 Day</SelectItem>
                  <SelectItem value="0">0 Days (Standard)</SelectItem>
                  <SelectItem value="1">+1 Day</SelectItem>
                  <SelectItem value="2">+2 Days</SelectItem>
                </SelectContent>
              </Select>
            </Card>
          </div>
        )}

        {/* NOTIFICATIONS SECTION */}
        {sectionId === 'notifications' && (
          <div className="space-y-4">
            {/* Top Summary Banner */}
            <div
              className="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-sm"
              style={{
                background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--accent)',
                    color: 'var(--accent-text)',
                  }}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">
                    {activeRemindersCount} of 8 Reminders Active
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] truncate">
                    Spiritual reminders & daily Sunnah alerts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleAllReminders}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all active:scale-95 border"
                style={{
                  background: activeRemindersCount > 0 ? 'var(--accent-soft)' : 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--accent-text)',
                }}
              >
                {activeRemindersCount === 8 ? 'Disable All' : 'Enable All'}
              </button>
            </div>

            <Card className="p-4 space-y-3 rounded-2xl divide-y divide-[var(--border)]" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              {/* Friday Kahf */}
              <div className="flex items-center justify-between pb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Friday Surah Al-Kahf Reminders</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Weekly reminder on Friday mornings</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.fridayKahfReminders}
                  onCheckedChange={(c) => handleNotificationToggle('fridayKahfReminders', c)}
                />
              </div>

              {/* Ramadan & Eid */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Ramadan & Eid Reminders</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Countdown & event notifications</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.ramadanCountdowns}
                  onCheckedChange={(c) => handleNotificationToggle('ramadanCountdowns', c)}
                />
              </div>

              {/* Dhikr & Quran */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Dhikr & Quran Verses</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Daily spiritual verse pushes</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.quranicVerses}
                  onCheckedChange={(c) => handleNotificationToggle('quranicVerses', c)}
                />
              </div>

              {/* Tahajjud */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Sunrise className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Tahajjud & Night Prayer</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Pre-Fajr reminders during last third of night</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.tahajjudReminders ?? true}
                  onCheckedChange={(c) => handleNotificationToggle('tahajjudReminders', c)}
                />
              </div>

              {/* Salat al-Duha */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Sun className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Salat al-Duha Reminders</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Mid-morning Duha prayer alerts</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.duhaReminders ?? true}
                  onCheckedChange={(c) => handleNotificationToggle('duhaReminders', c)}
                />
              </div>

              {/* Sunnah Fasting */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Sunnah Fasting Alerts</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Monday & Thursday Sunnah fasting reminders</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.fastingDaysReminders ?? true}
                  onCheckedChange={(c) => handleNotificationToggle('fastingDaysReminders', c)}
                />
              </div>

              {/* Daily Quran Tilawat */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Daily Quran Tilawat Goal</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Evening recitation reminder</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.quranTrackerReminders ?? true}
                  onCheckedChange={(c) => handleNotificationToggle('quranTrackerReminders', c)}
                />
              </div>

              {/* Bedtime Azkar */}
              <div className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Label className="text-sm font-bold">Bedtime Sunnah Azkar</Label>
                    <p className="text-xs text-[var(--text-secondary)]">Nightly Ayatul Kursi & protection dua alerts</p>
                  </div>
                </div>
                <Switch
                  className="shrink-0"
                  checked={notificationPrefs.bedtimeDuaReminders ?? true}
                  onCheckedChange={(c) => handleNotificationToggle('bedtimeDuaReminders', c)}
                />
              </div>

              <div className="pt-3">
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  onClick={async () => {
                    const res = await unifiedNotifications.testNotification();
                    toast({ title: res.success ? 'Test notification sent' : 'Notification failed' });
                  }}
                >
                  Send Test Notification
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ADHAN SECTION */}
        {sectionId === 'adhan' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">Prayer Alarm</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Play full Adhan sound at prayer times</p>
                </div>
                <Switch
                  checked={isAlarmEnabled}
                  onCheckedChange={(c) => (c ? enableAlarm() : disableAlarm())}
                />
              </div>
              <Button variant="outline" className="w-full rounded-xl gap-2 mt-2" onClick={testAdhan}>
                <Volume2 className="w-4 h-4" />
                Test Adhan Sound
              </Button>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Adhan Reciter Selection</Label>
              <AdhanSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Custom Adhan Sound</Label>
              <CustomAdhanUpload />
            </Card>
          </div>
        )}

        {/* BACKUP SECTION */}
        {sectionId === 'backup' && <AutoBackupCard />}

        {/* STORAGE SECTION */}
        {sectionId === 'storage' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Storage Usage</Label>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold">
                <span className="text-[var(--text-primary)]">Temporary Mushaf, Tafsir & API Cache</span>
                <span className="text-[var(--accent)] text-xs sm:text-sm font-bold">
                  {storageBreakdown ? `${storageBreakdown.temporaryFormatted || storageBreakdown.tempFormatted || '0 B'} • Safe to clear anytime` : '0 B • Safe to clear anytime'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-primary)]">Personal Settings & Worship Logs (Protected)</span>
                <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">
                  {storageBreakdown ? `${storageBreakdown.protectedFormatted} • Never deleted by cache clear` : 'Protected'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-primary)]">Offline Quran Audio</span>
                <span className="text-[var(--accent)] text-xs sm:text-sm font-medium">
                  {quranDownloads.reciters} reciter{quranDownloads.reciters !== 1 ? "s" : ""} • {quranDownloads.count} surah{quranDownloads.count !== 1 ? "s" : ""} • {formatFileSize(quranDownloads.size)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-primary)]">Downloaded E-books</span>
                <span className="text-[var(--accent)] text-xs sm:text-sm font-medium">{formatFileSize(storageStats.totalSize)} ({storageStats.totalBooks} files)</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Button
                variant="destructive"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearCacheDialog(true)}
              >
                <Trash2 className="w-4 h-4" />
                Clear Temporary Cache
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={() => setShowClearQuranDialog(true)}
                disabled={quranDownloads.count === 0}
              >
                Delete Downloaded Surahs
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl gap-2"
                onClick={handleClearBooks}
              >
                Delete Downloaded E-books
              </Button>
            </Card>

            <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
              <AlertDialogContent
                className="rounded-2xl max-w-[92vw] sm:max-w-lg"
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--accent)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Clear Temporary Cache?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
                      <p>This will remove temporary API, Mushaf page, and Tafsir cache files to free up space.</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Will be removed:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>Temporary Mushaf pages & Tafsir cache</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>Cached live prayer times & translation texts</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <X className="w-3.5 h-3.5 text-destructive shrink-0" />
                            <span>Downloaded e-book PDFs</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Your personal data is 100% safe:</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                            <span>Prayer records, 5-colour bookmarks, qaza tracker</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                            <span>Settings, preferences, worship & fasting journals</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="w-3.5 h-3.5 text-[var(--success)] shrink-0" />
                            <span>Auto backup snapshots & security vault</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache} className="rounded-xl bg-destructive text-white">
                    Clear Temporary Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* DELETE DOWNLOADED SURAHS DIALOG */}
            <AlertDialog open={showClearQuranDialog} onOpenChange={setShowClearQuranDialog}>
              <AlertDialogContent
                className="rounded-2xl max-w-[92vw] sm:max-w-lg"
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--accent)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Delete Downloaded Surahs?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
                      <p>
                        This removes all offline Quran recitations from {quranDownloads.reciters} reciter{quranDownloads.reciters !== 1 ? "s" : ""}
                        ({quranDownloads.count} surah{quranDownloads.count !== 1 ? "s" : ""}, {formatFileSize(quranDownloads.size)}).
                      </p>
                      <p>Streaming will still work online. You can re-download any surah anytime from the Quran Audio page.</p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearQuranDownloads} className="rounded-xl bg-destructive text-white">
                    Delete Surahs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* PRIVACY SECTION */}
        {sectionId === 'privacy' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-2 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border)]">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)]">Privacy First Guarantee</Label>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Noor Connect stores all your prayer history, bookmarks, and settings locally on your device. We do not track or sell user data.
              </p>
            </Card>

            <PermissionManager />
          </div>
        )}

        {/* ABOUT SECTION */}
        {sectionId === 'about' && (
          <div className="space-y-4">
            <Card className="p-5 text-center space-y-2 rounded-2xl">
              <NoorLogoCrest size="md" animated={animationEnabled} className="mx-auto my-1" />
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Noor Connect</h2>
              <p
                className="text-xs select-none cursor-pointer active:opacity-60 transition-opacity inline-block"
                style={{ color: 'var(--text-secondary)' }}
                onClick={handleVersionTap}
                role="button"
                tabIndex={0}
                aria-label={`Version ${CURRENT_APP_VERSION}`}
              >
                Version {CURRENT_APP_VERSION}
              </p>
              <div className="pt-2 space-y-1 max-w-xs mx-auto">
                <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Crafted with love for the Ummah — Noor Connect Team
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Personal data stays on your device; prayer times & location sync live with full offline fallback.
                </p>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => setShowChangelog(true)}
            >
              View Release Changelog
            </Button>

            {/* Software Updates / Nightly Build */}
            <Card
              className="p-4 space-y-3 rounded-2xl border border-border w-full max-w-full box-border overflow-hidden"
              style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 text-amber-500 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Software Updates
                  </Label>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={handleManualCheckUpdate}
                  disabled={isCheckingUpdate}
                >
                  {isCheckingUpdate ? 'Checking...' : 'Check now'}
                </Button>
              </div>

              {/* Always-visible build metadata lines for instant self-verifying diagnosis */}
              <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 text-xs">
                {/* Line 1: Installed */}
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-semibold text-foreground/80 shrink-0">Installed:</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {formatCommit(updateResult?.installedCommit || BUILD_COMMIT)} · {formatDateTime(updateResult?.installedBuildTime || BUILD_TIME)}
                  </span>
                </div>

                {/* Line 2: Latest */}
                <div className="flex items-baseline gap-1.5 truncate">
                  <span className="font-semibold text-foreground/80 shrink-0">Latest:</span>
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {formatCommit(updateResult?.remoteCommit || updateResult?.release?.commitSha || 'unknown')} · {formatDateTime(updateResult?.latestApkUploadedAt || updateResult?.release?.latestAssetUploadedAt || updateResult?.release?.publishedAt || 'unknown')}
                  </span>
                </div>

                {/* Line 3: Status */}
                <div className="flex items-center gap-1.5 pt-0.5 min-w-0">
                  <span className="font-semibold text-foreground/80 shrink-0">Status:</span>
                  {isCheckingUpdate ? (
                    <span className="text-amber-500 font-semibold text-[11px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      Checking for updates...
                    </span>
                  ) : updateResult?.status === 'Update available' || updateResult?.hasUpdate ? (
                    <span className="flex items-center gap-1 text-amber-500 font-semibold text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      Update available
                    </span>
                  ) : updateResult?.status === 'Check failed' || updateResult?.error ? (
                    <span className="flex items-center gap-1 text-rose-500 font-semibold text-[11px] truncate">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      Check failed: {updateResult?.statusReason || updateResult?.error || 'Network error - check internet'}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[var(--success)] font-semibold text-[11px]">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      Up to date
                    </span>
                  )}
                </div>
              </div>

              {/* Download update button or live progress bar when update is available */}
              {updateResult?.hasUpdate && updateResult.release && (
                <div className="flex flex-col p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 gap-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        <p className="text-xs font-bold text-amber-500 dark:text-amber-400 truncate">
                          {apkDownloadProgress?.status === 'downloading'
                            ? `Downloading... ${apkDownloadProgress.percent >= 0 ? apkDownloadProgress.percent + '%' : ''}`
                            : apkDownloadProgress?.status === 'installing' || apkDownloadProgress?.status === 'completed'
                            ? '✓ Downloaded! Launching Installer...'
                            : apkDownloadProgress?.status === 'cancelled'
                            ? 'Download cancelled'
                            : apkDownloadProgress?.status === 'error'
                            ? 'Download Failed'
                            : `Nightly Build (${formatReleaseDate(updateResult.release.publishedAt)})`}
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {apkDownloadProgress?.status === 'downloading'
                          ? `${apkDownloadProgress.downloadedMB.toFixed(1)} / ${apkDownloadProgress.totalMB > 0 ? apkDownloadProgress.totalMB.toFixed(1) + ' MB' : '...'}${formatDownloadSpeed(apkDownloadProgress.speedMBps)}`
                          : apkDownloadProgress?.status === 'cancelled'
                          ? 'Tap to restart download'
                          : apkDownloadProgress?.status === 'error'
                          ? (apkDownloadProgress.message || 'Tap to retry')
                          : 'New updates available for download'}
                      </p>
                    </div>

                    {apkDownloadProgress?.status === 'installing' || apkDownloadProgress?.status === 'completed' ? (
                      <Button
                        size="sm"
                        className="rounded-xl font-semibold text-xs h-8 px-3 shrink-0"
                        style={{
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                        }}
                        onClick={() => triggerPendingInstall()}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Install Now
                      </Button>
                    ) : apkDownloadProgress?.status === 'downloading' ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <div
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                          style={{
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-text)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {apkDownloadProgress.percent >= 0 ? `${apkDownloadProgress.percent}%` : '...'}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            cancelApkDownload();
                            setApkDownloadProgress({
                              percent: 0,
                              downloadedMB: 0,
                              totalMB: 0,
                              speedMBps: 0,
                              status: 'cancelled',
                              message: 'Download cancelled',
                            });
                          }}
                          aria-label="Cancel download"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : apkDownloadProgress?.status === 'error' || apkDownloadProgress?.status === 'cancelled' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl font-semibold text-xs h-8 px-3 shrink-0"
                        onClick={() => downloadAndInstallUpdate(updateResult.release?.apkUrl)}
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />
                        Retry
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="rounded-xl font-semibold text-xs h-8 px-3 shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                          color: 'var(--on-accent)',
                        }}
                        onClick={() => downloadAndInstallUpdate(updateResult.release?.apkUrl)}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        Download update
                      </Button>
                    )}
                  </div>

                  {/* Live glowing progress bar */}
                  {apkDownloadProgress?.status === 'downloading' && (
                    <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden relative">
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${Math.max(5, Math.min(100, apkDownloadProgress.percent >= 0 ? apkDownloadProgress.percent : 15))}%`,
                          background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                          boxShadow: '0 0 10px var(--accent-glow)',
                        }}
                      />
                    </div>
                  )}

                  {/* Secondary Browser Fallback Link */}
                  {(apkDownloadProgress?.status === 'downloading' ||
                    apkDownloadProgress?.status === 'installing' ||
                    apkDownloadProgress?.status === 'completed' ||
                    apkDownloadProgress?.status === 'cancelled' ||
                    apkDownloadProgress?.status === 'error') && (
                    <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground/80">
                      <span>Stuck or dismissed?</span>
                      <button
                        type="button"
                        onClick={() => {
                          cancelApkDownload();
                          openExternalBrowserFallback(updateResult.release?.apkUrl);
                        }}
                        className="inline-flex items-center gap-1 text-[var(--accent-text)] hover:underline font-medium"
                      >
                        <span>Download via Browser</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* OWNER SECURITY VAULT & DEEP X-RAY DIAGNOSTICS (Stealth 5-Tap Mode: Both Appear & Lock Together) */}
            {isOwnerUnlocked && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Diagnostics Black Box & Flight Recorder */}
                <Card
                  className="p-4 space-y-3.5 rounded-2xl border border-border bg-card w-full max-w-full box-border overflow-hidden"
                  style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
                >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                      Deep X-Ray Diagnostics
                    </Label>
                    <span className="text-[10px] text-muted-foreground/80">
                      6-layer diagnostic engine & flight recorder
                    </span>
                  </div>
                </div>
                <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/25">
                  Active
                </div>
              </div>

              {/* Installed Build & Environment Identity (No-collision pills with gap-2) */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono w-full max-w-full box-border">
                {/* Pill 1: Commit */}
                <div className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px]">Commit:</span>
                  <span className="font-bold text-amber-500 dark:text-amber-400">
                    {BUILD_COMMIT !== 'unknown' ? BUILD_COMMIT.slice(0, 7) : 'dev'}
                  </span>
                </div>

                {/* Pill 2: Built */}
                <div className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px]">Built:</span>
                  <span className="font-semibold text-foreground/80 text-[10px]">
                    {new Date(BUILD_TIME).toLocaleDateString()} {new Date(BUILD_TIME).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Pill 3: Platform & Viewport */}
                <div className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/60 flex items-center gap-1.5">
                  <span className="text-muted-foreground text-[10px]">Device:</span>
                  <span className="font-semibold text-foreground/80 text-[10px]">
                    {Capacitor.isNativePlatform() ? 'Android' : 'Web'} • {typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : '360×800'}
                  </span>
                </div>
              </div>

              {/* Live Health Summary Counters */}
              {(() => {
                const errorCount = diagnosticEvents.filter(
                  (e) => e.category === 'REACT_CRASH' || e.category === 'RUNTIME_ERROR' || e.category === 'CONSOLE_ERROR'
                ).length;
                const warningCount = diagnosticEvents.filter(
                  (e) => e.category === 'CONSOLE_WARN' || e.category === 'PROMISE_REJECTION'
                ).length;

                return (
                  <div className="grid grid-cols-3 gap-2 w-full max-w-full box-border">
                    {/* Crashes & Errors */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center flex flex-col justify-center items-center">
                      <div className={`text-base font-bold font-mono ${errorCount > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                        {errorCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {errorCount === 1 ? 'Error' : 'Errors'}
                      </div>
                    </div>

                    {/* Warnings */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center flex flex-col justify-center items-center">
                      <div className={`text-base font-bold font-mono ${warningCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>
                        {warningCount}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        {warningCount === 1 ? 'Warning' : 'Warnings'}
                      </div>
                    </div>

                    {/* 8-Point Health Checks */}
                    <div className="p-2.5 rounded-xl bg-muted/30 border border-border/50 text-center flex flex-col justify-center items-center">
                      <div className={`text-base font-bold font-mono ${
                        healthScanReport
                          ? healthScanReport.failCount > 0
                            ? 'text-[var(--danger)]'
                            : healthScanReport.warnCount > 0
                            ? 'text-[var(--warning)]'
                            : 'text-[var(--success)]'
                          : 'text-amber-500'
                      }`}>
                        {healthScanReport ? `${healthScanReport.passedCount}/${healthScanReport.totalChecks}` : '8 Ready'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Health Scan
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Button 1: Run Deep Health Scan (Primary Accent Gradient) */}
                <Button
                  size="sm"
                  className="w-full h-9 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)",
                    color: "var(--on-accent, #000000)",
                  }}
                  onClick={handleRunHealthScan}
                  disabled={isScanningHealth}
                >
                  {isScanningHealth ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Scanning 8 Subsystems...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Deep Health Scan</span>
                    </>
                  )}
                </Button>

                {/* Button 2: Copy Full AI Diagnostic Report (Secondary Glass Pill) */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 rounded-xl border-border/80 bg-muted/20 hover:bg-muted/40 text-xs font-medium flex items-center justify-center gap-1.5"
                  onClick={handleCopyAiReport}
                >
                  {copiedDiagnostics ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                      <span className="text-[var(--success)] font-semibold">Diagnostic Report Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Copy Full AI Diagnostic Report</span>
                    </>
                  )}
                </Button>

                {/* 2×2 Diagnostics Action Grid (No horizontal overflow) */}
                <div
                  className="grid grid-cols-2 gap-2 w-full max-w-full box-border mt-2"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: '8px',
                    width: '100%',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    marginTop: '8px',
                  }}
                >
                  {/* Button 1: Test Capture */}
                  <button
                    type="button"
                    className="w-full min-w-0 box-border inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[0.76rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors hover:opacity-90 active:scale-[0.98]"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={() => {
                      if (isOwnerUnlocked || isOwnerSessionUnlocked()) {
                        handleTestErrorCapture();
                      } else {
                        executeWithSecurity(
                          handleTestErrorCapture,
                          'Test Diagnostic Capture',
                          'Triggering diagnostic test errors requires owner authorization.'
                        );
                      }
                    }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Test Capture</span>
                  </button>

                  {/* Button 2: Logs */}
                  <button
                    type="button"
                    className="w-full min-w-0 box-border inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[0.76rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={() => setIsEventsExpanded(!isEventsExpanded)}
                    disabled={diagnosticEvents.length === 0}
                  >
                    <Terminal className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{isEventsExpanded ? 'Hide Logs' : `Logs (${diagnosticEvents.length})`}</span>
                  </button>

                  {/* Button 3: Trail */}
                  <button
                    type="button"
                    className="w-full min-w-0 box-border inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[0.76rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={() => setIsBreadcrumbsExpanded(!isBreadcrumbsExpanded)}
                    disabled={flightBreadcrumbs.length === 0}
                  >
                    <Activity className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <span className="truncate">{isBreadcrumbsExpanded ? 'Hide Trail' : `Trail (${flightBreadcrumbs.length})`}</span>
                  </button>

                  {/* Button 4: Clear */}
                  <button
                    type="button"
                    className="w-full min-w-0 box-border inline-flex items-center justify-center gap-1.5 rounded-[10px] text-[0.76rem] font-semibold whitespace-nowrap overflow-hidden text-ellipsis transition-colors hover:opacity-90 active:scale-[0.98]"
                    style={{
                      width: '100%',
                      minWidth: 0,
                      boxSizing: 'border-box',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 10px',
                      borderRadius: '10px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    onClick={() => {
                      if (isOwnerUnlocked || isOwnerSessionUnlocked()) {
                        handleClearDiagnostics();
                      } else {
                        executeWithSecurity(
                          handleClearDiagnostics,
                          'Clear Diagnostic Logs',
                          'Wiping diagnostic flight recorder data requires owner authorization.'
                        );
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="truncate">Clear</span>
                  </button>
                </div>
              </div>

              {/* Zero Crashes / Errors Empty State Banner */}
              {diagnosticEvents.length === 0 && (
                <div className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-xs font-medium border border-[var(--success)]/20">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>0 crashes or errors recorded in buffer</span>
                </div>
              )}

              {/* 8-Point Health Scan Expandable Checklist */}
              {healthScanReport && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between p-2 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/60 text-left transition-colors"
                    onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
                  >
                    <div className="flex items-center gap-2">
                      <Shield className={`w-3.5 h-3.5 ${
                        healthScanReport.overallStatus === 'PASS'
                          ? 'text-[var(--success)]'
                          : healthScanReport.overallStatus === 'WARN'
                          ? 'text-[var(--warning)]'
                          : 'text-[var(--danger)]'
                      }`} />
                      <span className="text-xs font-semibold text-foreground">
                        8 Subsystem Checks ({healthScanReport.passedCount}/{healthScanReport.totalChecks} Passed)
                      </span>
                    </div>
                    {isChecklistExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>

                  {isChecklistExpanded && (
                    <div className="space-y-1.5 pl-0.5 pr-0.5">
                      {healthScanReport.checks.map((chk, i) => {
                        const isExpanded = expandedCheckId === chk.id;
                        return (
                          <div
                            key={chk.id}
                            className="p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-1.5 text-left"
                          >
                            <div
                              className="flex items-center justify-between cursor-pointer"
                              onClick={() => setExpandedCheckId(isExpanded ? null : chk.id)}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[11px] font-mono text-muted-foreground shrink-0">{i + 1}.</span>
                                <span className="text-xs font-medium text-foreground truncate">{chk.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    chk.status === 'PASS'
                                      ? 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30'
                                      : chk.status === 'WARN'
                                      ? 'bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/30'
                                      : 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30'
                                  }`}
                                >
                                  {chk.status === 'PASS' ? '✓ PASS' : chk.status === 'WARN' ? '⚠ WARN' : '✕ FAIL'}
                                </span>
                                {isExpanded ? (
                                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              {chk.summary}
                            </p>
                            {isExpanded && chk.details && (
                              <pre
                                className="text-[10px] font-mono p-2 rounded-lg bg-background/80 border border-border/40 text-muted-foreground overflow-x-auto whitespace-pre-wrap max-h-36 max-w-full"
                                style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}
                              >
                                {chk.details}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Captured Diagnostic Events Inspector */}
              {isEventsExpanded && diagnosticEvents.length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Recorded Events ({diagnosticEvents.length})
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Tap message for details</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {diagnosticEvents.map((entry) => {
                      const isExpanded = expandedEventId === entry.id;
                      const isCopied = copiedEventId === entry.id;
                      const badgeColor =
                        entry.category === 'REACT_CRASH'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : entry.category === 'RUNTIME_ERROR'
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : entry.category === 'PROMISE_REJECTION'
                          ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                          : entry.category === 'CONSOLE_ERROR'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                      return (
                        <div
                          key={entry.id}
                          className="p-2.5 rounded-xl bg-muted/60 border border-border text-left space-y-1.5 w-full max-w-full box-border overflow-hidden"
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}
                        >
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[9px] border ${badgeColor}`}>
                                {entry.category.replace('_', ' ')}
                              </span>
                              <span className="font-mono">
                                {new Date(entry.time).toLocaleTimeString()}
                              </span>
                            </div>
                            <span className="font-semibold text-foreground/80 truncate max-w-[120px]">
                              {entry.route}
                            </span>
                          </div>

                          <p
                            className="text-xs font-semibold text-foreground/90 break-words cursor-pointer hover:text-amber-400 transition-colors"
                            onClick={() => setExpandedEventId(isExpanded ? null : entry.id)}
                          >
                            {entry.message}
                          </p>

                          {entry.filename && (
                            <p className="text-[10px] font-mono text-muted-foreground truncate">
                              {entry.filename}{entry.lineno !== undefined ? `:${entry.lineno}:${entry.colno}` : ''}
                            </p>
                          )}

                          {isExpanded && (
                            <div className="space-y-1.5 pt-1">
                              {entry.componentStack && (
                                <div>
                                  <span className="text-[9px] font-mono text-muted-foreground">React Component Stack:</span>
                                  <pre
                                    className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-24 bg-background/80 p-1.5 rounded border border-border/40 max-w-full"
                                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}
                                  >
                                    {entry.componentStack}
                                  </pre>
                                </div>
                              )}
                              {entry.stack && (
                                <div>
                                  <span className="text-[9px] font-mono text-muted-foreground">Stack Trace:</span>
                                  <pre
                                    className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto max-h-28 bg-background/80 p-1.5 rounded border border-border/40 max-w-full"
                                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}
                                  >
                                    {entry.stack}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[10px]">
                            <span className="text-muted-foreground/80 font-mono text-[9px]">
                              {entry.commit ? `Commit: ${entry.commit.slice(0, 7)}` : ''}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                              onClick={() => handleCopySingleEvent(entry)}
                            >
                              {isCopied ? <Check className="w-2.5 h-2.5 mr-1 text-[var(--success)]" /> : <Copy className="w-2.5 h-2.5 mr-1" />}
                              {isCopied ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Flight Recorder Breadcrumbs Inspector */}
              {isBreadcrumbsExpanded && flightBreadcrumbs.length > 0 && (
                <div className="pt-2 border-t border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Flight Recorder Trail ({flightBreadcrumbs.length})
                    </Label>
                    <span className="text-[10px] text-muted-foreground">Last 35 actions</span>
                  </div>
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {flightBreadcrumbs.map((crumb) => (
                      <div
                        key={crumb.id}
                        className="px-2 py-1.5 rounded-lg bg-muted/30 border border-border/40 flex items-start gap-2 text-[10px] w-full max-w-full box-border overflow-hidden"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', maxWidth: '100%' }}
                      >
                        <span className="font-mono text-muted-foreground shrink-0 text-[9px] pt-0.5">
                          {new Date(crumb.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="px-1.5 py-0.5 rounded font-mono font-bold text-[9px] bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">
                          {crumb.type}
                        </span>
                        <span
                          className="text-muted-foreground break-words flex-1 min-w-0"
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                        >
                          {crumb.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keep Re-run permission onboarding Button Intact */}
              <div className="pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs rounded-xl border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-500 dark:text-amber-400 font-medium flex items-center justify-center gap-1.5"
                  onClick={async () => {
                    const rerunAction = async () => {
                      if (!Capacitor.isNativePlatform()) {
                        toast({
                          title: 'Native Only',
                          description: 'Permission onboarding flow is only available on Android native app.',
                        });
                        return;
                      }
                      try {
                        toast({
                          title: 'Resetting Onboarding',
                          description: 'Clearing flags and restarting permission sequence...',
                        });
                        await rerunPermissionOnboarding();
                      } catch (err) {
                        // Handled manual permission onboarding rerun error
                        console.warn('Failed to rerun permission onboarding:', err);
                      }
                    };

                    if (isOwnerUnlocked || isOwnerSessionUnlocked()) {
                      await rerunAction();
                    } else {
                      executeWithSecurity(
                        rerunAction,
                        'Reset Permission Sequence',
                        'Resetting system permission state requires owner authorization.'
                      );
                    }
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-run permission onboarding
                </Button>
              </div>
            </Card>

            {/* Cryptographic Owner Authorization Vault Card */}
            <OwnerSecurityVaultCard
              onRequireUnlock={(title, desc) =>
                executeWithSecurity(
                  () => {},
                  title || 'Unlock Owner Vault',
                  desc || 'Enter your private Owner Master Key to unlock administrative settings.'
                )
              }
              onLockVault={() => {
                lockOwnerSession();
                setIsOwnerUnlocked(false);
              }}
            />
              </div>
            )}

            {showChangelog &&
              createPortal(
                <div
                  className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
                  style={{ position: 'fixed', inset: 0, zIndex: 9996 }}
                  onClick={() => setShowChangelog(false)}
                >
                  <div
                    className="w-full max-w-2xl max-h-[85vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Changelog onClose={() => setShowChangelog(false)} />
                  </div>
                </div>,
                document.body
              )}
          </div>
        )}

        {/* CONTACT SECTION — Clean, single-purpose email contact */}
        {sectionId === 'contact' && (
          <div className="space-y-4">
            <Card
              className="p-5 space-y-4 rounded-2xl border"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--border)',
                    color: 'var(--accent-text)',
                  }}
                >
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-xs uppercase tracking-wider font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Support & Feedback Email
                  </p>
                  <p
                    className="font-semibold select-all mt-0.5"
                    style={{
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      wordBreak: 'break-all',
                      whiteSpace: 'normal',
                    }}
                  >
                    {SUPPORT_EMAIL}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <Button
                  className="w-full h-11 shadow-sm font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)',
                    color: 'var(--on-accent, #000000)',
                  }}
                  onClick={() => {
                    window.location.href = MAILTO_FEEDBACK_URL;
                  }}
                >
                  <Mail className="w-4 h-4" />
                  <span>Send Email</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border transition-all active:scale-[0.98]"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onClick={handleCopyEmail}
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Email</span>
                </Button>
              </div>
            </Card>

            <p
              className="text-xs text-center px-2 leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              For bugs, suggestions, or feature requests — we read every message.
            </p>
          </div>
        )}
      </main>

      {/* Owner Security Modal for Protected Actions */}
      <OwnerSecurityModal
        isOpen={securityModalOpen}
        onClose={() => {
          setSecurityModalOpen(false);
          pendingSecurityActionRef.current = null;
        }}
        onSuccess={() => {
          setIsOwnerUnlocked(true);
          const action = pendingSecurityActionRef.current;
          pendingSecurityActionRef.current = null;
          if (action) {
            action();
          }
        }}
        actionTitle={securityActionTitle}
        actionDescription={securityActionDesc}
      />
    </div>
  );
};

export default SettingsSubPage;
