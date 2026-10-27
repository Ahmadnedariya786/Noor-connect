import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight,
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
  ArrowLeft,
  Settings as SettingsIcon,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { CURRENT_APP_VERSION } from '@/lib/constants';
import { CLOCK_STYLES } from '@/types/clock';
import { THEMES } from '@/lib/theme-engine';
import type { ThemeId } from '@/types/theme';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { getStorageBreakdown } from '@/lib/cache-manager';

interface SettingsRow {
  id: string;
  title: string;
  titleKey?: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  iconColor: string;
  route: string;
  asyncKey?: string;
}

interface SettingsGroup {
  id: string;
  title: string;
  titleKey?: string;
  badge?: string;
  rows: SettingsRow[];
}

function getSettingsGroups(ui: any): SettingsGroup[] {
  return [
    {
      id: 'appearance',
      title: ui.appearanceGroup,
      badge: ui.badgeDisplay,
      rows: [
        {
          id: 'appearance',
          title: ui.themeAndAppearance,
          subtitle: ui.themeAndAppearanceSub,
          icon: Palette,
          gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
          iconColor: 'text-amber-600 dark:text-amber-400',
          route: '/settings/appearance',
          asyncKey: 'theme',
        },
        {
          id: 'clock-style',
          title: ui.clockStyle,
          subtitle: ui.clockStyleSub,
          icon: Clock,
          gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
          iconColor: 'text-amber-600 dark:text-amber-400',
          route: '/settings/clock-style',
          asyncKey: 'clockStyle',
        },
        {
          id: 'haptics',
          title: ui.hapticFeedback,
          subtitle: ui.hapticFeedbackSub,
          icon: Vibrate,
          gradient: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20',
          iconColor: 'text-purple-600 dark:text-purple-400',
          route: '/settings/haptics',
          asyncKey: 'haptic',
        },
        {
          id: 'personal',
          title: ui.personalInformation,
          subtitle: ui.personalInformationSub,
          icon: User,
          gradient: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20',
          iconColor: 'text-blue-600 dark:text-blue-400',
          route: '/settings/personal',
        },
      ],
    },
    {
      id: 'prayer',
      title: ui.prayerGroup,
      badge: ui.badgeSpiritual,
      rows: [
        {
          id: 'prayer',
          title: ui.prayerCalculation,
          subtitle: ui.prayerCalculationSub,
          icon: Clock,
          gradient: 'from-teal-500/10 via-teal-500/5 to-transparent border-teal-500/20',
          iconColor: 'text-teal-600 dark:text-teal-400',
          route: '/settings/prayer',
          asyncKey: 'prayer',
        },
        {
          id: 'notifications',
          title: ui.prayerNotifications,
          subtitle: ui.prayerNotificationsSub,
          icon: Bell,
          gradient: 'from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent border-[var(--border)]',
          iconColor: 'text-[var(--accent)]',
          route: '/settings/notifications',
          asyncKey: 'notifications',
        },
        {
          id: 'adhan',
          title: ui.adhanAndSounds,
          subtitle: ui.adhanAndSoundsSub,
          icon: Volume2,
          gradient: 'from-cyan-500/10 via-cyan-500/20 to-transparent border-cyan-500/20',
          iconColor: 'text-cyan-600 dark:text-cyan-400',
          route: '/settings/adhan',
        },
      ],
    },
    {
      id: 'data',
      title: ui.dataGroup,
      badge: ui.badgeSystem,
      rows: [
        {
          id: 'backup',
          title: ui.backupAndRestore,
          subtitle: ui.backupAndRestoreSub,
          icon: Database,
          gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20',
          iconColor: 'text-indigo-600 dark:text-indigo-400',
          route: '/settings/backup',
        },
        {
          id: 'storage',
          title: ui.storageAndCache,
          subtitle: ui.storageAndCacheSub,
          icon: HardDrive,
          gradient: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20',
          iconColor: 'text-rose-600 dark:text-rose-400',
          route: '/settings/storage',
          asyncKey: 'storage',
        },
        {
          id: 'privacy',
          title: ui.privacyAndSecurity,
          subtitle: ui.privacyAndSecuritySub,
          icon: ShieldCheck,
          gradient: 'from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent border-[var(--border)]',
          iconColor: 'text-[var(--accent)]',
          route: '/settings/privacy',
        },
      ],
    },
    {
      id: 'about',
      title: ui.trustGroup,
      badge: ui.badgeNoor,
      rows: [
        {
          id: 'about',
          title: ui.aboutNoorConnect,
          subtitle: ui.aboutNoorConnectSub,
          icon: Info,
          gradient: 'from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20',
          iconColor: 'text-orange-600 dark:text-orange-400',
          route: '/settings/about',
        },
        {
          id: 'contact',
          title: ui.contactAndFeedback,
          subtitle: ui.contactAndFeedbackSub,
          icon: Mail,
          gradient: 'from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20',
          iconColor: 'text-violet-600 dark:text-violet-400',
          route: '/settings/contact',
        },
      ],
    },
  ];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getLocalStorageSize(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        total += (key.length + val.length) * 2;
      }
    }
    return total > 0 ? total : 395 * 1024;
  } catch {
    // Handled localStorage size calculation fallback
    return 395 * 1024;
  }
}

function getCalcMethodDisplay(val: string | null): string | null {
  if (!val) return null;
  const mapping: Record<string, string> = {
    MWL: 'MWL',
    MuslimWorldLeague: 'MWL',
    ISNA: 'ISNA',
    NorthAmerica: 'ISNA',
    Egyptian: 'Egypt',
    Makkah: 'Umm al-Qura',
    UmmAlQura: 'Umm al-Qura',
    Karachi: 'Karachi',
    Tehran: 'Tehran',
    Jafari: 'Jafari',
    Singapore: 'Singapore',
    France: 'France',
    Turkey: 'Turkey',
    Russia: 'Russia',
    Moonsighting: 'Moonsighting',
    Custom: 'Custom',
  };
  if (mapping[val]) return mapping[val];
  return val.length > 6 ? val.substring(0, 6) + '…' : val;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { t, ui, isRTL } = useLanguage();
  const groups = useMemo(() => getSettingsGroups(ui), [ui]);
  const [asyncValues, setAsyncValues] = useState<Record<string, string | null>>(() => {
    const initial: Record<string, string | null> = {};
    try {
      const rawTheme = (localStorage.getItem('noor_theme') || 'oxford-gold') as ThemeId;
      const currentThemeDef = THEMES[rawTheme] || THEMES['oxford-gold'];
      initial['theme'] = currentThemeDef?.name || 'Oxford Gold';
    } catch {
      initial['theme'] = 'Oxford Gold';
    }

    try {
      const rawClock = localStorage.getItem('noor_clock_style') || 'prayer-arc';
      const found = CLOCK_STYLES.find(s => s.id === rawClock);
      initial['clockStyle'] = found ? found.name : 'Prayer Arc';
    } catch {
      initial['clockStyle'] = 'Prayer Arc';
    }

    try {
      const hapticStatus = localStorage.getItem('hapticEnabled');
      initial['haptic'] = hapticStatus === 'false' ? 'Off' : 'On';
    } catch {
      initial['haptic'] = 'On';
    }

    try {
      const calcMethod = localStorage.getItem('prayer_calculation_method') || localStorage.getItem('calculation_method');
      initial['prayer'] = getCalcMethodDisplay(calcMethod);
    } catch {
      initial['prayer'] = null;
    }

    try {
      initial['storage'] = formatBytes(getLocalStorageSize());
    } catch {
      initial['storage'] = '390.4 KB';
    }

    return initial;
  });

  useEffect(() => {
    let isMounted = true;

    const fetchLiveSystemData = async () => {
      const updates: Record<string, string | null> = {};

      try {
        const rawTheme = (localStorage.getItem('noor_theme') || 'oxford-gold') as ThemeId;
        const currentThemeDef = THEMES[rawTheme] || THEMES['oxford-gold'];
        updates['theme'] = currentThemeDef?.name || 'Oxford Gold';
      } catch {
        updates['theme'] = 'Oxford Gold';
      }

      try {
        const rawClock = localStorage.getItem('noor_clock_style') || 'prayer-arc';
        const found = CLOCK_STYLES.find(s => s.id === rawClock);
        updates['clockStyle'] = found ? found.name : 'Prayer Arc';
      } catch {
        updates['clockStyle'] = 'Prayer Arc';
      }

      try {
        const hapticStatus = localStorage.getItem('hapticEnabled');
        updates['haptic'] = hapticStatus === 'false' ? 'Off' : 'On';
      } catch {
        updates['haptic'] = null;
      }

      try {
        const calcMethod = localStorage.getItem('prayer_calculation_method') || localStorage.getItem('calculation_method');
        updates['prayer'] = getCalcMethodDisplay(calcMethod);
      } catch {
        updates['prayer'] = null;
      }

      try {
        if (typeof LocalNotifications !== 'undefined' && LocalNotifications.getPending) {
          const pending = await LocalNotifications.getPending();
          updates['notifications'] = pending?.notifications?.length !== undefined
            ? String(pending.notifications.length)
            : '0';
        } else {
          updates['notifications'] = '0';
        }
      } catch {
        updates['notifications'] = '0';
      }

      try {
        const breakdown = await getStorageBreakdown();
        updates['storage'] = breakdown.tempFormatted;
      } catch {
        updates['storage'] = '0 B';
      }

      if (isMounted) {
        setAsyncValues((prev) => ({ ...prev, ...updates }));
      }
    };

    fetchLiveSystemData();

    const handleCacheUpdated = async () => {
      try {
        const breakdown = await getStorageBreakdown();
        if (isMounted) {
          setAsyncValues((prev) => ({ ...prev, storage: breakdown.tempFormatted }));
        }
      } catch {
        // Handled cache update event
      }
    };
    window.addEventListener('noor-cache-updated', handleCacheUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener('noor-cache-updated', handleCacheUpdated);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-4">
      {/* Sticky Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bg-base)]/85 border-b border-[var(--border)] px-4 pb-3.5 safe-top transition-all" style={{ paddingTop: 'calc(var(--safe-top) + 0.875rem)' }}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/', { replace: true })}
              className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 rtl:rotate-180" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] leading-none flex items-center gap-2">
                {ui.settings}
                <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mt-0.5">
                {ui.settingsSubtitle}
              </p>
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shadow-sm">
            <SettingsIcon className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">

        {/* Settings Hero Card */}
        <div 
          className="relative overflow-hidden rounded-2xl p-4 text-[var(--text-primary)] shadow-md border"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            backgroundImage: 'radial-gradient(circle at 90% 10%, var(--accent-soft) 0%, transparent 65%)',
          }}
        >
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-sm"
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-text)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                  {ui.performanceOptimized}
                </div>
                <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {ui.islamicMobileExp}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] max-w-[260px] leading-relaxed">
                  {ui.heroDesc}
                </p>
              </div>

              <div 
                className="w-11 h-11 rounded-2xl border backdrop-blur-md flex items-center justify-center shrink-0 shadow-sm"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  color: 'var(--accent-text)',
                }}
              >
                <ShieldCheck className="w-5 h-5 text-[var(--accent)]" />
              </div>
            </div>

            {/* 3-Pill Live Status Strip */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border)]">
              <div 
                className="py-1.5 px-1 rounded-xl border flex flex-col items-center justify-center text-center min-w-0"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">{ui.podTheme}</span>
                <span
                  className="font-bold text-[var(--accent-text)]"
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    lineHeight: 1.2,
                    padding: '8px 6px',
                    textAlign: 'center',
                    wordBreak: 'break-word',
                  }}
                >
                  {asyncValues['theme'] || 'Imperial Violet'}
                </span>
              </div>
              <div 
                className="py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center text-center min-w-0"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">{ui.podClock}</span>
                <span className="text-[11px] font-bold text-[var(--accent-text)] truncate w-full">
                  {asyncValues['clockStyle'] || 'Prayer Arc'}
                </span>
              </div>
              <div 
                className="py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center text-center min-w-0"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
              >
                <span className="text-[9px] uppercase tracking-wider font-semibold text-[var(--text-secondary)]">{ui.podPersonalData}</span>
                <span className="text-[11px] font-bold text-[var(--accent-text)] truncate w-full">
                  {ui.podLocal}
                </span>
              </div>
            </div>
          </div>

          {/* Background Decorative Element */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--accent-soft)] rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Group Cards */}
        {groups.map((group) => {
          return (
            <section key={group.id} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {group.title}
                </h2>
                {group.badge && (
                  <span className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {group.badge}
                  </span>
                )}
              </div>

              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden divide-y divide-[var(--border)]">
                {group.rows.map((row) => {
                  const IconComponent = row.icon;
                  const hasAsyncKey = !!row.asyncKey;
                  const val = hasAsyncKey ? asyncValues[row.asyncKey!] : undefined;

                  return (
                    <div
                      key={row.id}
                      onClick={() => navigate(row.route, { replace: true })}
                      className="group flex items-center justify-between px-4 py-3.5 hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] transition-all duration-150 cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${row.gradient} border flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover:scale-105`}>
                          <IconComponent className={`w-5 h-5 ${row.iconColor}`} />
                        </div>

                        <div className="min-w-0 flex-1 pe-2">
                          <div className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-text)] transition-colors leading-tight">
                            {row.title}
                          </div>
                          <div
                            className="font-normal text-[var(--text-secondary)] mt-0.5 truncate bidi-plaintext"
                            style={{ fontSize: '0.70rem', unicodeBidi: 'plaintext' }}
                          >
                            {row.subtitle}
                          </div>
                        </div>
                      </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                      {hasAsyncKey && (
                        val === undefined ? (
                          <div className="w-8 h-4 bg-[var(--surface-2)] rounded-full animate-pulse" />
                        ) : val !== null ? (
                          <span
                            className="rounded-full font-semibold bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0"
                            style={{ fontSize: '0.68rem', padding: '3px 8px' }}
                            dir="ltr"
                          >
                            <span style={{ unicodeBidi: 'isolate' }}>{val}</span>
                          </span>
                        ) : null
                      )}
                      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] opacity-50 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all rtl:rotate-180" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

        {/* Privacy & Version Footer */}
        <div className="pt-4 text-center space-y-2">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] text-xs font-medium border border-[var(--border)]"
          >
            <Lock className="w-3 h-3" />
            {ui.privacyNotice}
          </div>

          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Noor Connect v{CURRENT_APP_VERSION}
          </p>
        </div>

      </main>
    </div>
  );
};

export default Profile;
