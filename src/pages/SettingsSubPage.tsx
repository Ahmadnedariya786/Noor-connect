import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Heart,
  Mail,
  Globe,
  DollarSign,
  Trash2,
  Copy,
  ExternalLink,
  MessageCircle,
  Briefcase,
  AlertTriangle,
  X,
  Check,
  Activity,
  Download,
  RefreshCw,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { rerunPermissionOnboarding } from '@/lib/onboarding-permissions';
import { getLastCrashes, clearCrashes, type CrashEntry } from '@/lib/crash-logger';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  formatReleaseDate,
  formatDateTime,
  formatCommit,
  formatUpdateError,
  type UpdateCheckResult,
} from '@/lib/update-checker';
import { BUILD_TIME, BUILD_COMMIT } from '@/buildInfo';
import noorLogo from '@/assets/noor-logo.png';
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
import { clearCache } from '@/lib/backup';
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

const SECTION_TITLES: Record<string, { title: string; subtitle: string; icon: any }> = {
  appearance: { title: 'Theme & Appearance', subtitle: 'Display, animations & splash settings', icon: Palette },
  'app-theme': { title: 'App Theme', subtitle: 'Choose your full-app color theme', icon: Palette },
  'clock-style': { title: 'Clock Style', subtitle: 'Select home screen clock design', icon: Clock },
  haptics: { title: 'Haptic Feedback', subtitle: 'Vibration & tactile feedback settings', icon: Vibrate },
  personal: { title: 'Personal Information', subtitle: 'Gender, language & preferred currency', icon: User },
  prayer: { title: 'Prayer Calculation', subtitle: 'Calculation method, Madhab & Hijri offset', icon: Clock },
  notifications: { title: 'Prayer Notifications', subtitle: 'Reminders, daily notifications & alerts', icon: Bell },
  adhan: { title: 'Adhan & Sounds', subtitle: 'Adhan audio selection & custom uploads', icon: Volume2 },
  backup: { title: 'Backup & Restore', subtitle: 'Cloud backup, sync & export settings', icon: Database },
  storage: { title: 'Storage & Cache', subtitle: 'Clear cache, offline Quran & download stats', icon: HardDrive },
  privacy: { title: 'Privacy & Security', subtitle: 'Data usage, local storage & permissions', icon: ShieldCheck },
  about: { title: 'About Noor Connect', subtitle: 'App version, changelog & developer', icon: Info },
  support: { title: 'Support & Donate', subtitle: 'Sponsor development & crypto donations', icon: Heart },
  contact: { title: 'Contact & Hire Developer', subtitle: 'WhatsApp, portfolio & email contacts', icon: Mail },
};

const BITCOIN_ADDRESS = 'bc1q43nelc0skgng752wesq5ez4qzhgl09cksmlddx';
const SOLANA_ADDRESS = '3Aw78BrsdtBeZNpTQvAP6kjtUpGqDBqhr8dATzEZgp8V';
const BNB_ADDRESS = '0xb170A4621662c5f870E4186a81dA7645B132cb09';

const SettingsSubPage: React.FC = () => {
  const { sectionId = 'appearance' } = useParams<{ sectionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
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
  const { currentTheme } = useAppTheme();

  const [madhab, setMadhabState] = useState<MadhabType>('shafi');
  const [storageStats, setStorageStats] = useState({ totalBooks: 0, totalSize: 0 });
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
  });

  const { isEnabled: isAlarmEnabled, testAdhan, enableAlarm, disableAlarm } = usePrayerAlarm();

  useEffect(() => {
    setMadhabState(getMadhab());
    setGenderSettingsState(getGenderSettings());
    setNotificationPrefs(notificationManager.getPreferences());

    const savedOffset = localStorage.getItem('hijri-date-offset');
    if (savedOffset) setHijriOffset(savedOffset);

    getStorageStats().then(setStorageStats);

    downloadManager.listDownloaded()
      .then((items) => {
        const reciterIds = new Set(items.map((it) => it.reciterId));
        setQuranDownloads({
          count: items.length,
          size: items.reduce((acc, it) => acc + it.size, 0),
          reciters: reciterIds.size,
        });
      })
      .catch(() => {});
  }, []);

  const meta = SECTION_TITLES[sectionId] || { title: 'Settings', subtitle: 'Noor Connect Preferences', icon: Palette };
  const IconComponent = meta.icon;

  const [crashLogs, setCrashLogs] = useState<CrashEntry[]>([]);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    if (sectionId === 'about') {
      setCrashLogs(getLastCrashes());
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
    }
  }, [sectionId]);

  const handleManualCheckUpdate = async () => {
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

  const handleCopyDiagnostics = () => {
    try {
      const payload = {
        build: {
          commit: BUILD_COMMIT,
          commitShort: BUILD_COMMIT !== 'unknown' ? BUILD_COMMIT.slice(0, 7) : 'dev',
          builtAt: BUILD_TIME,
          appVersion: CURRENT_APP_VERSION,
        },
        crashes: crashLogs.length > 0 ? crashLogs : 'No crashes recorded',
      };
      const text = JSON.stringify(payload, null, 2);
      navigator.clipboard?.writeText(text);
      setCopiedDiagnostics(true);
      toast({
        title: 'Copied to clipboard',
        description: 'Diagnostics & build info copied for troubleshooting.',
      });
      setTimeout(() => setCopiedDiagnostics(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Could not access clipboard.',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = (name: string, address: string) => {
    navigator.clipboard?.writeText(address);
    toast({ title: `${name} address copied to clipboard` });
  };

  const handleClearCache = async () => {
    await clearCache();
    setStorageStats({ totalBooks: 0, totalSize: 0 });
    toast({ title: 'Cache cleared successfully' });
    setShowClearCacheDialog(false);
  };

  const handleClearQuranDownloads = async () => {
    try {
      await downloadManager.clearAll();
      setQuranDownloads({ count: 0, size: 0 });
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
            onClick={() => navigate('/profile')}
            className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
            aria-label="Go back to Profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[var(--text-primary)] leading-tight">
              {meta.title}
            </h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {meta.subtitle}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
            <IconComponent className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-md mx-auto px-4 pt-5 space-y-5">
        {/* APPEARANCE SECTION */}
        {sectionId === 'appearance' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-4 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </Label>
              <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
                <SelectTrigger className="w-full h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                  <SelectItem value="ur">اردو (Urdu)</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                  <SelectItem value="ru">Русский (Russian)</SelectItem>
                  <SelectItem value="fr">Français (French)</SelectItem>
                </SelectContent>
              </Select>
            </Card>

            <Card className="p-4 space-y-4 rounded-2xl">
              <div
                className="flex items-center justify-between py-1 cursor-pointer group"
                onClick={() => navigate('/settings/app-theme')}
                role="button"
                tabIndex={0}
              >
                <div>
                  <Label className="text-sm font-bold cursor-pointer group-hover:text-[var(--accent-text)] transition-colors">App Theme</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Choose your full-app color theme</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                    {currentTheme.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">Fluid Animations</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Enable smooth UI transitions</p>
                </div>
                <Switch checked={animationEnabled} onCheckedChange={setAnimationEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">Salam Greeting</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Show daily salam on home screen</p>
                </div>
                <Switch checked={greetingEnabled} onCheckedChange={setGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">Splash Welcome</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Show "Islamic Companion" on launch</p>
                </div>
                <Switch checked={splashGreetingEnabled} onCheckedChange={setSplashGreetingEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">Splash Screen</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Enable app startup animation</p>
                </div>
                <Switch checked={splashEnabled} onCheckedChange={setSplashEnabled} />
              </div>

              <div className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3">
                <div>
                  <Label className="text-sm font-bold">24-Hour Time Format</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Use 24-hour clock (17:30) instead of 12-hour AM/PM</p>
                </div>
                <Switch
                  checked={timeFormat === '24h'}
                  onCheckedChange={(checked) => setTimeFormat(checked ? '24h' : '12h')}
                />
              </div>

              <div
                className="flex items-center justify-between py-1 border-t border-[var(--border)] pt-3 cursor-pointer group"
                onClick={() => navigate('/settings/clock-style')}
                role="button"
                tabIndex={0}
              >
                <div>
                  <Label className="text-sm font-bold cursor-pointer group-hover:text-[var(--accent-text)] transition-colors">Clock Style</Label>
                  <p className="text-xs text-[var(--text-secondary)]">Choose home screen clock appearance</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                    {currentClockStyleName}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
                </div>
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
            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Gender Preference
              </Label>
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

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Preferred Currency
              </Label>
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
            <Card className="p-4 space-y-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">24-Hour Time Format</Label>
                  <p className="text-xs text-slate-400">Display prayer times in 24-hour format (e.g. 17:30)</p>
                </div>
                <Switch
                  checked={timeFormat === '24h'}
                  onCheckedChange={(checked) => setTimeFormat(checked ? '24h' : '12h')}
                />
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Calculation Method</Label>
              <PrayerMethodSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Madhab (Asr School of Jurisprudence)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  variant={madhab === 'shafi' ? 'default' : 'outline'}
                  className="w-full rounded-xl text-xs sm:text-sm min-h-10 h-auto py-2.5 px-3 break-words whitespace-normal text-center"
                  onClick={() => {
                    setMadhabState('shafi');
                    setMadhab('shafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                    } catch {
                      // silent fallback - intentional, see stability hardening notes
                    }
                    toast({ title: 'Madhab set to Shafi / Maliki / Hanbali' });
                  }}
                >
                  Shafi / Maliki / Hanbali
                </Button>
                <Button
                  variant={madhab === 'hanafi' ? 'default' : 'outline'}
                  className="w-full rounded-xl text-xs sm:text-sm min-h-10 h-auto py-2.5 px-3 break-words whitespace-normal text-center"
                  onClick={() => {
                    setMadhabState('hanafi');
                    setMadhab('hanafi');
                    try {
                      localStorage.removeItem('cached_prayer_times');
                    } catch {
                      // silent fallback - intentional, see stability hardening notes
                    }
                    toast({ title: 'Madhab set to Hanafi' });
                  }}
                >
                  Hanafi
                </Button>
              </div>
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Hijri Date Offset</Label>
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
          <Card className="p-4 space-y-3 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
            <div className="flex items-center justify-between pb-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Friday Surah Al-Kahf Reminders</Label>
                <p className="text-xs text-slate-400">Weekly reminder on Friday mornings</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.fridayKahfReminders}
                onCheckedChange={(c) => handleNotificationToggle('fridayKahfReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Ramadan & Eid Reminders</Label>
                <p className="text-xs text-slate-400">Countdown & event notifications</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.ramadanCountdowns}
                onCheckedChange={(c) => handleNotificationToggle('ramadanCountdowns', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Dhikr & Quran Verses</Label>
                <p className="text-xs text-slate-400">Daily spiritual verse pushes</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.quranicVerses}
                onCheckedChange={(c) => handleNotificationToggle('quranicVerses', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Tahajjud & Night Prayer</Label>
                <p className="text-xs text-slate-400">Pre-Fajr reminders during last third of night</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.tahajjudReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('tahajjudReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Salat al-Duha Reminders</Label>
                <p className="text-xs text-slate-400">Mid-morning Duha prayer alerts</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.duhaReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('duhaReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Sunnah Fasting Alerts</Label>
                <p className="text-xs text-slate-400">Monday & Thursday Sunnah fasting reminders</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.fastingDaysReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('fastingDaysReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Daily Quran Tilawat Goal</Label>
                <p className="text-xs text-slate-400">Evening recitation reminder</p>
              </div>
              <Switch
                className="shrink-0"
                checked={notificationPrefs.quranTrackerReminders ?? true}
                onCheckedChange={(c) => handleNotificationToggle('quranTrackerReminders', c)}
              />
            </div>

            <div className="flex items-center justify-between py-3 gap-3">
              <div className="min-w-0 flex-1">
                <Label className="text-sm font-bold">Bedtime Sunnah Azkar</Label>
                <p className="text-xs text-slate-400">Nightly Ayatul Kursi & protection dua alerts</p>
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
        )}

        {/* ADHAN SECTION */}
        {sectionId === 'adhan' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-bold">Prayer Alarm</Label>
                  <p className="text-xs text-slate-400">Play full Adhan sound at prayer times</p>
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

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Adhan Reciter Selection</Label>
              <AdhanSelector />
            </Card>

            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Custom Adhan Sound</Label>
              <CustomAdhanUpload />
            </Card>
          </div>
        )}

        {/* BACKUP SECTION */}
        {sectionId === 'backup' && <AutoBackupCard />}

        {/* STORAGE SECTION */}
        {sectionId === 'storage' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Storage Usage</Label>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold">
                <span className="text-[var(--text-primary)]">Offline Quran Audio</span>
                <span className="text-[var(--accent)] text-xs sm:text-sm font-medium">
                  {quranDownloads.reciters} reciter{quranDownloads.reciters !== 1 ? "s" : ""} • {quranDownloads.count} surah{quranDownloads.count !== 1 ? "s" : ""} • {formatFileSize(quranDownloads.size)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold">
                <span className="text-[var(--text-primary)]">Downloaded E-books</span>
                <span className="text-[var(--accent)] text-xs sm:text-sm font-medium">{formatFileSize(storageStats.totalSize)}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold border-t border-[var(--border)] pt-2">
                <span className="text-[var(--text-primary)]">Books Cached</span>
                <span className="text-xs sm:text-sm text-[var(--text-secondary)] font-medium">{storageStats.totalBooks} files</span>
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
              <AlertDialogContent className="rounded-2xl">
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
                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearCache} className="rounded-xl bg-destructive text-white">
                    Clear Cache
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* DELETE DOWNLOADED SURAHS DIALOG */}
            <AlertDialog open={showClearQuranDialog} onOpenChange={setShowClearQuranDialog}>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Delete Downloaded Surahs?
                  </AlertDialogTitle>
<AlertDialogDescription asChild>
                    <div className="space-y-3">
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
            <Card className="p-4 space-y-2 rounded-2xl bg-emerald-500/5 border-emerald-500/20">
              <Label className="text-xs font-bold uppercase tracking-wider text-emerald-600">Privacy First Guarantee</Label>
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
              <div className="w-16 h-16 rounded-2xl mx-auto overflow-hidden shadow-md flex items-center justify-center p-1 bg-[#150D2E] border border-[var(--border)]">
                <img src={noorLogo} alt="Noor Connect Logo" className="w-full h-full object-contain rounded-xl" />
              </div>
              <h2 className="text-lg font-bold">Noor Connect</h2>
              <p className="text-xs text-slate-400">Version {CURRENT_APP_VERSION}</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto pt-2">
                Built end-to-end: 6 languages, 5 native widgets, 400+ licensed nasheeds. Built for the sake of Allah.
              </p>
            </Card>

            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onClick={() => setShowChangelog(true)}
            >
              View Release Changelog
            </Button>

            {/* Software Updates / Nightly Build */}
            <Card className="p-4 space-y-3 rounded-2xl border border-border">
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
                    <span className="flex items-center gap-1 text-emerald-500 font-semibold text-[11px]">
                      <Check className="w-3.5 h-3.5 shrink-0" />
                      Up to date
                    </span>
                  )}
                </div>
              </div>

              {/* Download update button when update is available */}
              {updateResult?.hasUpdate && updateResult.release && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 gap-3">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                      <p className="text-xs font-bold text-amber-500 dark:text-amber-400 truncate">
                        Nightly Build ({formatReleaseDate(updateResult.release.publishedAt)})
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      New updates available for download
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl font-semibold text-xs h-8 px-3 shrink-0"
                    style={{
                      background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                      color: "var(--on-accent)",
                    }}
                    onClick={() => downloadAndInstallUpdate(updateResult.release?.apkUrl)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Download update
                  </Button>
                </div>
              )}
            </Card>

            {/* Diagnostics Black Box */}
            <Card className="p-4 space-y-3 rounded-2xl border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Diagnostics
                  </Label>
                </div>
                {crashLogs.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                    onClick={handleCopyDiagnostics}
                  >
                    {copiedDiagnostics ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedDiagnostics ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </div>

              {/* Installed Build Identity */}
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground/80">Commit:</span>
                  <span className="font-bold text-amber-500 dark:text-amber-400">
                    {BUILD_COMMIT !== 'unknown' ? BUILD_COMMIT.slice(0, 7) : 'dev'}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Built: {new Date(BUILD_TIME).toLocaleDateString()} {new Date(BUILD_TIME).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {crashLogs.length === 0 ? (
                <div className="flex items-center gap-2 py-3 px-3.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>No crashes recorded</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {crashLogs.map((entry, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-muted/60 border border-border text-left space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span className="font-mono">{new Date(entry.time).toLocaleTimeString()} · {new Date(entry.time).toLocaleDateString()}</span>
                          <span className="font-semibold text-foreground/80 truncate max-w-[160px]">
                            {entry.type ? `[${entry.type}]` : entry.route}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-red-500 dark:text-red-400 break-words">
                          {entry.message}
                        </p>
                        {entry.commit && (
                          <p className="text-[10px] font-mono text-muted-foreground/75">
                            Commit: {entry.commit.length > 7 ? entry.commit.slice(0, 7) : entry.commit}
                          </p>
                        )}
                        {entry.stack && (
                          <pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-hidden max-h-24 bg-background/50 p-1.5 rounded">
                            {entry.stack}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-lg"
                      onClick={handleCopyDiagnostics}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Copy to Clipboard
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-red-500 rounded-lg"
                      onClick={() => {
                        clearCrashes();
                        setCrashLogs([]);
                        toast({ title: 'Diagnostics cleared' });
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-8 text-xs rounded-xl border-amber-500/30 hover:border-amber-500/60 hover:bg-amber-500/10 text-amber-500 dark:text-amber-400 font-medium flex items-center justify-center gap-1.5"
                  onClick={async () => {
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
                  }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Re-run permission onboarding
                </Button>
              </div>
            </Card>

            {showChangelog && <Changelog onClose={() => setShowChangelog(false)} />}
          </div>
        )}

        {/* SUPPORT SECTION */}
        {sectionId === 'support' && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3 rounded-2xl">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Support Noor Connect Development</Label>
              <p className="text-xs text-slate-500 leading-relaxed">
                100% of donations go to development — no fees, no middlemen. Supports BTC, SOL & BNB. Tap to copy the address, then paste it in your wallet.
              </p>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Bitcoin (BTC)</span>
                    <p className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{BITCOIN_ADDRESS}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy('Bitcoin', BITCOIN_ADDRESS)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Solana (SOL)</span>
                    <p className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{SOLANA_ADDRESS}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy('Solana', SOLANA_ADDRESS)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border" style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}>
                  <div>
                    <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>BNB Chain</span>
                    <p className="text-[10px] truncate max-w-[200px]" style={{ color: "var(--text-secondary)" }}>{BNB_ADDRESS}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleCopy('BNB', BNB_ADDRESS)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* CONTACT SECTION — Developer Info */}
        {sectionId === 'contact' && (
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border-emerald-500/20 rounded-2xl overflow-hidden space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Briefcase className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Love this app? I built it.</h3>
                  <p className="text-xs text-slate-400">One developer. Zero trackers. Built for the sake of Allah.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                I also build production software, websites, and security audits for businesses and startups. If you need a developer who delivers quality work, let's talk.
              </p>

              <div className="space-y-2.5 pt-2">
                <Button
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all rounded-xl"
                  onClick={() => window.open('https://wa.me/923352706540', '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  <span className="font-medium">Let's Talk on WhatsApp</span>
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 justify-center bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] transition-all rounded-xl border border-[var(--border)]"
                  onClick={() => window.open('https://ubaid-ur-rehmanportfolio.vercel.app/', '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-[var(--accent)]" />
                  <span className="font-medium">View my work</span>
                </Button>

                <button
                  className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                  onClick={() => window.location.href = 'mailto:arifubaid0345@gmail.com'}
                >
                  <Mail className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>
                    <span className="font-semibold text-[var(--text-primary)]">Gmail</span> — arifubaid0345@gmail.com
                  </span>
                </button>

                <button
                  className="w-full min-h-11 flex items-center gap-2.5 text-left text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                  onClick={() => window.location.href = 'mailto:ubaid0345@proton.me'}
                >
                  <Mail className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>
                    Other email: <span className="font-semibold text-[var(--text-primary)]">Proton</span> — ubaid0345@proton.me
                  </span>
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default SettingsSubPage;
