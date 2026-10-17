import React, { useState, useEffect } from 'react';
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
  Heart,
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

interface SettingsRow {
  id: string;
  title: string;
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
  badge?: string;
  rows: SettingsRow[];
}

const GROUPS: SettingsGroup[] = [
  {
    id: 'appearance',
    title: 'Appearance & Personalization',
    badge: 'Display',
    rows: [
      {
        id: 'appearance',
        title: 'Theme & Appearance',
        subtitle: 'Dark mode, custom themes & animation controls',
        icon: Palette,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        route: '/settings/appearance',
        asyncKey: 'theme',
      },
      {
        id: 'clock-style',
        title: 'Clock Style',
        subtitle: 'Choose home dashboard clock appearance',
        icon: Clock,
        gradient: 'from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        route: '/settings/clock-style',
        asyncKey: 'clockStyle',
      },
      {
        id: 'haptics',
        title: 'Haptic Feedback',
        subtitle: 'Tactile vibrations & button feel',
        icon: Vibrate,
        gradient: 'from-purple-500/10 via-purple-500/5 to-transparent border-purple-500/20',
        iconColor: 'text-purple-600 dark:text-purple-400',
        route: '/settings/haptics',
        asyncKey: 'haptic',
      },
      {
        id: 'personal',
        title: 'Personal Information',
        subtitle: 'Gender preferences, language & currency',
        icon: User,
        gradient: 'from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20',
        iconColor: 'text-blue-600 dark:text-blue-400',
        route: '/settings/personal',
      },
    ],
  },
  {
    id: 'prayer',
    title: 'Prayer & Adhan',
    badge: 'Spiritual',
    rows: [
      {
        id: 'prayer',
        title: 'Prayer Calculation',
        subtitle: 'Calculation method, Madhab & Hijri offset',
        icon: Clock,
        gradient: 'from-teal-500/10 via-teal-500/5 to-transparent border-teal-500/20',
        iconColor: 'text-teal-600 dark:text-teal-400',
        route: '/settings/prayer',
        asyncKey: 'prayer',
      },
      {
        id: 'notifications',
        title: 'Prayer Notifications',
        subtitle: 'Adhan reminders, daily alerts & scheduling',
        icon: Bell,
        gradient: 'from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent border-[var(--border)]',
        iconColor: 'text-[var(--accent)]',
        route: '/settings/notifications',
        asyncKey: 'notifications',
      },
      {
        id: 'adhan',
        title: 'Adhan Sounds & Reciters',
        subtitle: 'Adhan audio selection & custom uploads',
        icon: Volume2,
        gradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/20',
        iconColor: 'text-cyan-600 dark:text-cyan-400',
        route: '/settings/adhan',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data & Storage',
    badge: 'System',
    rows: [
      {
        id: 'backup',
        title: 'Backup & Restore',
        subtitle: 'Cloud sync, export & local snapshots',
        icon: Database,
        gradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent border-indigo-500/20',
        iconColor: 'text-indigo-600 dark:text-indigo-400',
        route: '/settings/backup',
      },
      {
        id: 'storage',
        title: 'Storage & Cache',
        subtitle: 'Clear cache, offline Quran & download stats',
        icon: HardDrive,
        gradient: 'from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20',
        iconColor: 'text-rose-600 dark:text-rose-400',
        route: '/settings/storage',
        asyncKey: 'storage',
      },
      {
        id: 'privacy',
        title: 'Privacy & Security',
        subtitle: 'Local data isolation, zero tracking & permissions',
        icon: ShieldCheck,
        gradient: 'from-[var(--accent)]/10 via-[var(--accent)]/5 to-transparent border-[var(--border)]',
        iconColor: 'text-[var(--accent)]',
        route: '/settings/privacy',
      },
    ],
  },
  {
    id: 'about',
    title: 'About & Community',
    badge: 'Noor',
    rows: [
      {
        id: 'about',
        title: 'About Noor Connect',
        subtitle: 'App version, release notes & credits',
        icon: Info,
        gradient: 'from-orange-500/10 via-orange-500/5 to-transparent border-orange-500/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        route: '/settings/about',
      },
      {
        id: 'support',
        title: 'Support & Donate',
        subtitle: 'Sponsor development & crypto donations',
        icon: Heart,
        gradient: 'from-pink-500/10 via-pink-500/5 to-transparent border-pink-500/20',
        iconColor: 'text-pink-600 dark:text-pink-400',
        route: '/settings/support',
      },
      {
        id: 'contact',
        title: 'Contact & Feedback',
        subtitle: 'Report issues or suggest features',
        icon: Mail,
        gradient: 'from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20',
        iconColor: 'text-violet-600 dark:text-violet-400',
        route: '/settings/contact',
      },
    ],
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
  const [asyncValues, setAsyncValues] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const timer = setTimeout(async () => {
      const results: Record<string, string | null> = {};

      try {
        const rawTheme = (localStorage.getItem('noor_theme') || 'oxford-gold') as ThemeId;
        const currentThemeDef = THEMES[rawTheme] || THEMES['oxford-gold'];
        results['theme'] = currentThemeDef.name;
      } catch {
        // Fallback for theme storage error
        results['theme'] = 'Oxford Gold';
      }

      try {
        const rawClock = localStorage.getItem('noor_clock_style') || 'digital-bold';
        const found = CLOCK_STYLES.find(s => s.id === rawClock);
        results['clockStyle'] = found ? found.name : 'Digital Bold';
      } catch {
        // Fallback for clock style storage error
        results['clockStyle'] = 'Digital Bold';
      }

      try {
        const hapticStatus = localStorage.getItem('hapticEnabled');
        results['haptic'] = hapticStatus === 'false' ? 'Off' : 'On';
      } catch {
        results['haptic'] = null;
      }

      try {
        const calcMethod = localStorage.getItem('prayer_calculation_method') || localStorage.getItem('calculation_method');
        results['prayer'] = getCalcMethodDisplay(calcMethod);
      } catch {
        results['prayer'] = null;
      }

      try {
        if (typeof LocalNotifications !== 'undefined' && LocalNotifications.getPending) {
          const pending = await LocalNotifications.getPending();
          results['notifications'] = pending?.notifications?.length !== undefined
            ? String(pending.notifications.length)
            : '0';
        } else {
          results['notifications'] = '0';
        }
      } catch {
        results['notifications'] = null;
      }

      try {
        if (typeof Filesystem !== 'undefined' && Filesystem.stat) {
          const stat = await Filesystem.stat({
            path: 'cache',
            directory: Directory.Cache,
          });
          results['storage'] = formatBytes(stat.size || 0);
        } else {
          results['storage'] = '—';
        }
      } catch {
        results['storage'] = '—';
      }

      setAsyncValues(results);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-4">
      {/* Sticky Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bg-base)]/85 border-b border-[var(--border)] px-4 pb-3.5 safe-top transition-all" style={{ paddingTop: 'calc(var(--safe-top) + 0.875rem)' }}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] active:scale-95 transition-all"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] leading-none flex items-center gap-2">
                Settings
                <Sparkles className="w-4 h-4 text-[var(--accent)] animate-pulse" />
              </h1>
              <p className="text-[11px] font-medium tracking-wide text-[var(--text-secondary)] mt-0.5">
                Noor Connect • Mobile Control Hub
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
        <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] p-4 text-[var(--text-primary)] shadow-md border border-[var(--border)]">
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] backdrop-blur-sm">
                <CheckCircle2 className="w-3 h-3 text-[var(--accent)]" />
                Performance Optimized
              </div>
              <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                Islamic Mobile Experience
              </h2>
              <p className="text-xs text-[var(--text-secondary)] max-w-[240px]">
                Configure prayer alerts, themes, and notifications with zero lag.
              </p>
            </div>

            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] backdrop-blur-md items-center justify-center text-[var(--accent)]">
              <ShieldCheck className="w-6 h-6 text-[var(--accent)]" />
            </div>
          </div>

          {/* Background Decorative Element */}
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-[var(--accent-soft)] rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Group Cards */}
        {GROUPS.map((group) => (
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
                    onClick={() => navigate(row.route)}
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
                        <div className="text-[11px] font-normal text-[var(--text-secondary)] mt-0.5 truncate">
                          {row.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ms-2">
                      {hasAsyncKey && (
                        val === undefined ? (
                          <div className="w-8 h-4 bg-[var(--surface-2)] rounded-full animate-pulse" />
                        ) : val !== null ? (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]">
                            {val}
                          </span>
                        ) : null
                      )}
                      <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] opacity-50 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Privacy & Version Footer */}
        <div className="pt-4 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent-text)] text-xs font-medium border border-[var(--border)]">
            <Lock className="w-3 h-3" />
            100% Private • Local Data Security
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
