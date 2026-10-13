import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { ChevronLeft, Sun, Moon, Monitor, Sparkles, Zap, Heart, BookOpen, Moon as MoonIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { goBackOrFallback } from "@/lib/navigation";
import { getMadhab, setMadhab, isBeforeSleepEnabled, setBeforeSleepEnabled, getBedtimeHour, setBedtimeHour, getBedtimeMinute, setBedtimeMinute, type MadhabType } from '@/lib/storage';
import { scheduleBedtimeNotification, cancelBedtimeNotification } from '@/lib/bedtime-notifications';

const Settings = () => {
  const { 
    animationEnabled, 
    toggleAnimation, 
    greetingEnabled, 
    toggleGreeting, 
    splashGreetingEnabled,
    toggleSplashGreeting,
    theme, 
    setTheme, 
    effectiveTheme 
  } = useSettings();
  const { t } = useLanguage();
  const navigate = useNavigate();
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
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans pb-4 transition-colors duration-300">
      {/* ── Header ── */}
      <div className="flex items-center px-6 pb-6 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 safe-top" style={{ paddingTop: 'calc(var(--safe-top) + 1.5rem)' }}>
        <button 
          onClick={() => goBackOrFallback(navigate, '/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card hover:bg-card/80 transition-colors border border-border"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-2xl font-bold font-serif italic text-foreground ml-4 tracking-tight">Settings</h1>
      </div>

      <div className="px-6 py-4 space-y-8 max-w-lg mx-auto w-full">
        {/* ── Theme Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Appearance</h2>
          </div>
          
          <div className="bg-card border border-border rounded-[28px] p-2 flex gap-2 relative">
            {['light', 'system', 'dark'].map((tOption) => {
              const isActive = theme === tOption;
              const Icon = tOption === 'light' ? Sun : tOption === 'dark' ? Moon : Monitor;
              return (
                <button
                  key={tOption}
                  onClick={() => setTheme(tOption as any)}
                  className={`flex-1 relative h-12 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 ${
                    isActive ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      {...motionProps({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } })}
                      className="absolute inset-0 bg-background rounded-2xl border border-border shadow-sm"
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="text-sm font-bold capitalize relative z-10">{tOption}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 mt-2">
            Currently using <span className="text-[#C9860A]">{effectiveTheme}</span> theme based on preferences.
          </p>
        </section>

        {/* ── Preferences Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Preferences</h2>
          </div>

          <div className="bg-card border border-border rounded-[28px] overflow-hidden">
            {/* Toggle: Animations */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/40 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-foreground/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground font-serif italic text-base sm:text-lg truncate">Fluid Animations</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5 truncate">Enable smooth UI transitions</p>
                </div>
              </div>
              <button 
                onClick={toggleAnimation}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  animationEnabled ? 'bg-[#C9860A]' : 'bg-muted'
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
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-border/40 gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 text-foreground/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground font-serif italic text-base sm:text-lg truncate">Splash Welcome</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5 truncate">Show "Islamic Companion" on launch</p>
                </div>
              </div>
              <button 
                onClick={toggleSplashGreeting}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  splashGreetingEnabled ? 'bg-[#C9860A]' : 'bg-muted'
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
            <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-foreground/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground font-serif italic text-base sm:text-lg truncate">Home Greeting</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5 truncate">Show daily salam on home screen</p>
                </div>
              </div>
              <button 
                onClick={toggleGreeting}
                className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 shrink-0 ${
                  greetingEnabled ? 'bg-[#C9860A]' : 'bg-muted'
                }`}
              >
                <motion.div 
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: greetingEnabled ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Prayer / Fiqh Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Prayer Times</h2>
          </div>

          <div className="bg-card border border-border rounded-[28px] p-2 flex gap-2 relative">
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
                    isActive ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      {...motionProps({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } })}
                      className="absolute inset-0 bg-background rounded-2xl border border-border shadow-sm"
                    />
                  )}
                  <span className="text-sm font-bold relative z-10">{short}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-4 mt-2">
            Determines Asr calculation. Currently using <span className="text-[#C9860A]">{madhab === 'hanafi' ? 'Hanafi' : 'Maliki, Shafi, Hanbali'}</span> school.
          </p>
        </section>

        {/* ── Bedtime Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Bedtime</h2>
          </div>

          <div className="bg-card border border-border rounded-[28px] overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <MoonIcon className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground font-serif italic text-lg">Bedtime Reminder</h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5">Get a gentle notification at bedtime</p>
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
                  bedtimeEnabled ? 'bg-[#C9860A]' : 'bg-muted'
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
                  <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-foreground/70" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground font-serif italic text-lg">Time</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-0.5">When to remind you</p>
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
                    className="bg-muted border border-border rounded-xl px-2 py-1.5 text-sm font-bold text-foreground"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground font-bold text-sm">:</span>
                  <select
                    value={bedtimeMinute}
                    onChange={(e) => {
                      const m = parseInt(e.target.value, 10);
                      setBedtimeMinuteState(m);
                      setBedtimeMinute(m);
                      if (bedtimeEnabled) scheduleBedtimeNotification();
                    }}
                    className="bg-muted border border-border rounded-xl px-2 py-1.5 text-sm font-bold text-foreground"
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
    </div>
  );
};

export default Settings;
