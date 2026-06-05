import React from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { ChevronLeft, Sun, Moon, Monitor, Sparkles, Zap, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { goBackOrFallback } from "@/lib/navigation";

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

  const motionProps = (props: any) => animationEnabled ? props : {};

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans pb-24 pt-safe-top transition-colors duration-300">
      {/* ── Header ── */}
      <div className="flex items-center px-6 py-6 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <button 
          onClick={() => goBackOrFallback(navigate, '/dashboard')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-card hover:bg-card/80 transition-colors border border-border"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground ml-4 tracking-tight uppercase">Settings</h1>
      </div>

      <div className="px-6 py-4 space-y-8 max-w-lg mx-auto w-full">
        {/* ── Theme Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Sun className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">Appearance</h2>
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
                      {...motionProps({ layoutId: 'theme-active' })}
                      className="absolute inset-0 bg-background rounded-2xl border border-border shadow-sm"
                    />
                  )}
                  <Icon className="w-4 h-4 relative z-10" />
                  <span className="text-sm font-bold capitalize relative z-10">{tOption}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs font-medium text-muted-foreground px-4">
            Currently using <span className="text-foreground/70">{effectiveTheme}</span> theme based on preferences.
          </p>
        </section>

        {/* ── Preferences Section ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-widest text-[#D4AF37]">Preferences</h2>
          </div>

          <div className="bg-card border border-border rounded-[28px] overflow-hidden">
            {/* Toggle: Animations */}
            <div className="p-5 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <Zap className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Fluid Animations</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Enable smooth UI transitions</p>
                </div>
              </div>
              <button 
                onClick={toggleAnimation}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${
                  animationEnabled ? 'bg-emerald-500' : 'bg-muted'
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
            <div className="p-5 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <Heart className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Splash Welcome</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Show "Islamic Companion" on launch</p>
                </div>
              </div>
              <button 
                onClick={toggleSplashGreeting}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${
                  splashGreetingEnabled ? 'bg-emerald-500' : 'bg-muted'
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
            <div className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-foreground/70" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-base">Home Greeting</h3>
                  <p className="text-xs font-medium text-muted-foreground mt-0.5">Show daily salam on home screen</p>
                </div>
              </div>
              <button 
                onClick={toggleGreeting}
                className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 ${
                  greetingEnabled ? 'bg-emerald-500' : 'bg-white/10'
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

      </div>
    </div>
  );
};

export default Settings;
