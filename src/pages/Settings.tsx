import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { ChevronLeft, ChevronRight, Sparkles, Zap, Heart, Clock, Moon as MoonIcon, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { goBackOrFallback } from "@/lib/navigation";
import { getMadhab, setMadhab, isBeforeSleepEnabled, setBeforeSleepEnabled, getBedtimeHour, setBedtimeHour, getBedtimeMinute, setBedtimeMinute, type MadhabType } from '@/lib/storage';
import { scheduleBedtimeNotification, cancelBedtimeNotification } from '@/lib/bedtime-notifications';
import { useClockStyle } from '@/lib/clock-style';
import { CLOCK_STYLES } from '@/types/clock';
import { ClockStyleModal } from '@/components/clocks/ClockStyleModal';
import { useAppTheme } from '@/components/themes';

const Settings = () => {
  const { 
    animationEnabled, 
    toggleAnimation, 
    greetingEnabled, 
    toggleGreeting, 
    splashGreetingEnabled,
    toggleSplashGreeting,
    timeFormat,
    toggleTimeFormat,
  } = useSettings();
  const { currentTheme, theme } = useAppTheme();
  const navigate = useNavigate();
  const { clockStyle } = useClockStyle();
  const [showClockModal, setShowClockModal] = useState(false);
  const currentClockStyleName = CLOCK_STYLES.find(s => s.id === clockStyle)?.name || 'Digital Bold';
  const [madhab, setMadhabState] = useState<MadhabType>(() => getMadhab());
  const [bedtimeEnabled, setBedtimeEnabledState] = useState<boolean>(() => isBeforeSleepEnabled());
  const [bedtimeHour, setBedtimeHourState] = useState<number>(() => getBedtimeHour());
  const [bedtimeMinute, setBedtimeMinuteState] = useState<number>(() => getBedtimeMinute());

  const handleMadhabChange = (value: MadhabType) => {
    setMadhab(value);
    setMadhabState(value);
    // Clear cached prayer times so the new fiqh is fetched on next render
    try {
      localStorage.removeItem('cached_prayer_times');
    } catch {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    // Defer the bedtime (re)scheduling until after the Settings page finishes
    // painting.  scheduleBedtimeNotification() does 4 sync localStorage reads
    // + JSON.parse + a setTimeout; running it eagerly during mount added
    // measurable jank to the Settings navigation transition.
    let t: ReturnType<typeof setTimeout> | null = null;
    if (bedtimeEnabled) {
      t = setTimeout(() => scheduleBedtimeNotification(), 500);
    } else {
      cancelBedtimeNotification();
    }
    return () => { if (t !== null) clearTimeout(t); };
  }, [bedtimeEnabled, bedtimeHour, bedtimeMinute]);

  const motionProps = (props: any) => animationEnabled ? props : {};

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] font-sans pb-4 transition-colors duration-300">
      {/* ── Header ── */}
      <div className="flex items-center px-6 pb-6 sticky top-0 z-10 bg-[var(--bg-base)]/80 backdrop-blur-xl border-b border-[var(--border)] safe-top" style={{ paddingTop: 'calc(var(--safe-top) + 1.5rem)' }}>
        <button 
          onClick={() => goBackOrFallback(navigate, '/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors border border-[var(--border)]"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <h1 className="text-2xl font-bold font-serif italic text-[var(--text-primary)] ml-4 tracking-tight">Settings</h1>
      </div>

      <div className="px-6 py-4 space-y-8 max-w-lg mx-auto w-full">
        {/* ── Theme Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Appearance</h2>
          </div>
          
          <div 
            onClick={() => navigate('/settings/app-theme', { replace: true })}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-[var(--accent)]/40 transition-all"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-[var(--accent-text)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate">App Theme</h3>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate">Choose full-app color theme</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 ml-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)] whitespace-nowrap inline-flex items-center">
                {theme?.name || 'Oxford Gold'}
              </span>
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
            </div>
          </div>
        </section>

        {/* ── Preferences Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Preferences</h2>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] overflow-hidden">
            {/* Toggle: Animations */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border)] gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate">Fluid Animations</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate">Enable smooth UI transitions</p>
                </div>
              </div>
              <button 
                onClick={toggleAnimation}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  animationEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: animationEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Toggle: Splash Greeting */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border)] gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate">Splash Welcome</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate">Show "Islamic Companion" on launch</p>
                </div>
              </div>
              <button 
                onClick={toggleSplashGreeting}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  splashGreetingEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: splashGreetingEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Toggle: App Greeting (Salam) */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border)] gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate">Home Greeting</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate">Show daily salam on home screen</p>
                </div>
              </div>
              <button 
                onClick={toggleGreeting}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  greetingEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: greetingEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Toggle: 24-Hour Time Format */}
            <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>24-Hour Time Format</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>Use 24-hour clock (17:30) instead of 12-hour (5:30 PM)</p>
                </div>
              </div>
              <button 
                onClick={toggleTimeFormat}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  timeFormat === '24h' ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: timeFormat === '24h' ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Row: Clock Style Picker */}
            <div
              onClick={() => setShowClockModal(true)}
              className="p-4 sm:p-5 flex items-center justify-between border-t border-[var(--border)] gap-3 cursor-pointer group hover:bg-[var(--surface-2)] transition-colors"
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-base sm:text-lg truncate group-hover:text-[var(--accent-text)] transition-colors">Clock Style</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5 truncate">Choose home screen clock design</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                  {currentClockStyleName}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Prayer / Fiqh Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Prayer Times</h2>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] p-2 flex gap-2 relative">
            {([
              { id: 'shafi',  label: 'Maliki, Shafi, Hanbali', short: 'Shafi' },
              { id: 'hanafi', label: 'Hanafi', short: 'Hanafi' },
            ] as { id: MadhabType; label: string; short: string }[]).map(({ id, label, short }) => {
              const isActive = madhab === id;
              return (
                <button
                  key={id}
                  onClick={() => handleMadhabChange(id)}
                  aria-pressed={isActive}
                  title={label}
                  className={`flex-1 relative h-12 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      {...motionProps({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } })}
                      className="absolute inset-0 bg-[var(--surface-2)] rounded-2xl border border-[var(--border)] shadow-sm"
                    />
                  )}
                  <span className="text-sm font-bold relative z-10">{short}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 mt-2">
            Determines Asr calculation. Currently using <span className="text-[var(--accent-text)]">{madhab === 'hanafi' ? 'Hanafi' : 'Maliki, Shafi, Hanbali'}</span> school.
          </p>
        </section>

        {/* ── Bedtime Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Bedtime</h2>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[28px] overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                  <MoonIcon className="w-5 h-5 text-[var(--accent-text)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-lg">Bedtime Reminder</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5">Get a gentle notification at bedtime</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const next = !bedtimeEnabled;
                  setBedtimeEnabledState(next);
                  setBeforeSleepEnabled(next);
                  if (next) scheduleBedtimeNotification();
                  else cancelBedtimeNotification();
                }}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 ${
                  bedtimeEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'
                }`}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: bedtimeEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {bedtimeEnabled && (
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[var(--accent-text)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[var(--text-primary)] font-serif italic text-lg">Time</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mt-0.5">When to remind you</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <select
                    value={bedtimeHour}
                    onChange={(e) => {
                      const h = parseInt(e.target.value, 10);
                      setBedtimeHourState(h);
                      setBedtimeHour(h);
                      if (bedtimeEnabled) scheduleBedtimeNotification();
                    }}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-sm font-bold text-[var(--text-primary)]"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-[var(--text-secondary)] font-bold text-sm">:</span>
                  <select
                    value={bedtimeMinute}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setBedtimeMinuteState(m);
                      setBedtimeMinute(m);
                      if (bedtimeEnabled) scheduleBedtimeNotification();
                    }}
                    className="bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-2 py-1.5 text-sm font-bold text-[var(--text-primary)]"
                  >
                    {Array.from({ length: 60 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </section>

      </div>

      {/* Clock Style Picker Modal */}
      <ClockStyleModal
        open={showClockModal}
        onClose={() => setShowClockModal(false)}
      />
    </div>
  );
};

export default Settings;
