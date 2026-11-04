import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, VolumeX, Sparkles } from 'lucide-react';
import { NoorDynamicLogo, getSelectedLogoEdition } from '@/components/NoorDynamicLogo';
import {
  PRAYER_ALARM_CONTROL_EVENT,
  PRAYER_ALARM_STATE_EVENT,
  type PrayerAlarmStateDetail,
} from '@/lib/prayer-alarm-events';
import { togglePrayer } from '@/lib/salah-tracker';
import hapticService from '@/lib/haptic-service';
import {
  getPrayerHadithLang,
  setPrayerHadithLang,
  getPrayerHadith,
  PRAYER_HADITH_LANG_OPTIONS,
  PRAYER_HADITH_LANG_EVENT,
  type PrayerHadithLang,
} from '@/lib/prayer-hadith-i18n';
import { toast } from 'sonner';

export const PRAYER_BANNER_ALERT_EVENT = 'noor-in-app-prayer-alert';

export interface PrayerAlertDetail {
  prayerName: string;
  prayerTime12h?: string;
}

const PRAYER_DETAILS: Record<
  string,
  { arabic: string; rakah: string; default12h: string }
> = {
  Fajr: {
    arabic: 'الفَجْر',
    rakah: '2 Sunnah • 2 Fardh (4 Rak\'ah)',
    default12h: '05:15 AM',
  },
  Sunrise: {
    arabic: 'الشُّرُوق',
    rakah: 'Duha / Ishraq Sunnah',
    default12h: '06:30 AM',
  },
  Dhuhr: {
    arabic: 'الظُّهْر',
    rakah: '4 Sunnah • 4 Fardh • 2 Sunnah • 2 Nafl (12 Rak\'ah)',
    default12h: '12:30 PM',
  },
  Asr: {
    arabic: 'العَصْر',
    rakah: '4 Sunnah • 4 Fardh (8 Rak\'ah)',
    default12h: '03:45 PM',
  },
  Maghrib: {
    arabic: 'المَغْرِب',
    rakah: '3 Fardh • 2 Sunnah • 2 Nafl (7 Rak\'ah)',
    default12h: '06:15 PM',
  },
  Isha: {
    arabic: 'العِشَاء',
    rakah: '4 Sunnah • 4 Fardh • 2 Sunnah • 2 Nafl • 3 Witr (17 Rak\'ah)',
    default12h: '07:45 PM',
  },
};

export function triggerInAppPrayerAlert(prayerName: string, time12h?: string) {
  if (typeof window === 'undefined') return;
  const normalized = (prayerName || 'Fajr').trim();
  const detail: PrayerAlertDetail = {
    prayerName: normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase(),
    prayerTime12h: time12h || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  };
  window.dispatchEvent(new CustomEvent(PRAYER_BANNER_ALERT_EVENT, { detail }));
}

export const PrayerReminderBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [prayerName, setPrayerName] = useState('Fajr');
  const [prayerTime12h, setPrayerTime12h] = useState('05:15 AM');
  const [isPlayingAdhan, setIsPlayingAdhan] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState(() => getSelectedLogoEdition());
  const [hadithLang, setHadithLang] = useState<PrayerHadithLang>(() => getPrayerHadithLang());

  useEffect(() => {
    // 1. Listen for in-app prayer alert dispatch
    const handleAlert = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerAlertDetail>;
      if (customEvent.detail?.prayerName) {
        const raw = customEvent.detail.prayerName.trim();
        const pName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        setPrayerName(pName);
        setPrayerTime12h(
          customEvent.detail.prayerTime12h ||
            PRAYER_DETAILS[pName]?.default12h ||
            new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        );
        setSelectedLogo(getSelectedLogoEdition());
        setHadithLang(getPrayerHadithLang());
        setIsVisible(true);
        void hapticService.trigger('success');
      }
    };

    // 2. Listen for background Adhan audio playback
    const handleAdhanState = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerAlarmStateDetail>;
      if (customEvent.detail) {
        setIsPlayingAdhan(customEvent.detail.isPlaying);
        if (customEvent.detail.isPlaying && customEvent.detail.prayerName) {
          const raw = customEvent.detail.prayerName.trim();
          const pName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
          setPrayerName(pName);
          setPrayerTime12h(
            PRAYER_DETAILS[pName]?.default12h ||
              new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          );
          setSelectedLogo(getSelectedLogoEdition());
          setHadithLang(getPrayerHadithLang());
          setIsVisible(true);
        }
      }
    };

    // 3. Listen for Hadith translation language preference changes
    const handleHadithLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang: PrayerHadithLang }>;
      if (customEvent.detail?.lang) {
        setHadithLang(customEvent.detail.lang);
      }
    };

    window.addEventListener(PRAYER_BANNER_ALERT_EVENT, handleAlert);
    window.addEventListener(PRAYER_ALARM_STATE_EVENT, handleAdhanState);
    window.addEventListener(PRAYER_HADITH_LANG_EVENT, handleHadithLangChange);

    return () => {
      window.removeEventListener(PRAYER_BANNER_ALERT_EVENT, handleAlert);
      window.removeEventListener(PRAYER_ALARM_STATE_EVENT, handleAdhanState);
      window.removeEventListener(PRAYER_HADITH_LANG_EVENT, handleHadithLangChange);
    };
  }, []);

  const handleHadithLangSwitch = useCallback((lang: PrayerHadithLang) => {
    void hapticService.trigger('light');
    setHadithLang(lang);
    setPrayerHadithLang(lang);
  }, []);

  const handleDismiss = useCallback(() => {
    void hapticService.trigger('light');
    setIsVisible(false);
  }, []);

  const handleStopAdhan = useCallback(() => {
    void hapticService.trigger('medium');
    window.dispatchEvent(
      new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: 'stop' } })
    );
    setIsPlayingAdhan(false);
    setIsVisible(false);
  }, []);

  const handleMarkPrayed = useCallback(() => {
    void hapticService.trigger('success');
    const pKey = prayerName.toLowerCase() as 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    if (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(pKey)) {
      try {
        togglePrayer(pKey);
      } catch (e) {
        console.warn('Error toggling prayer from banner:', e);
      }
    }

    if (isPlayingAdhan) {
      window.dispatchEvent(
        new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: 'stop' } })
      );
      setIsPlayingAdhan(false);
    }

    setIsVisible(false);
    toast.success(`${prayerName} prayer recorded!`, {
      description: 'May Allah accept your prayer and grant you barakah.',
    });
  }, [prayerName, isPlayingAdhan]);

  if (!isVisible) return null;

  const details = PRAYER_DETAILS[prayerName] || {
    arabic: 'الصَّلَاة',
    rakah: 'Obligatory Prayer',
    default12h: prayerTime12h,
  };
  const hadithData = getPrayerHadith(prayerName, hadithLang);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed left-0 right-0 z-50 px-3 sm:px-4 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-300"
      style={{
        top: 'max(env(safe-area-inset-top, 0px) + 10px, 14px)',
      }}
    >
      <div
        className="max-w-md mx-auto pointer-events-auto rounded-2xl p-3.5 sm:p-4 border backdrop-blur-xl relative overflow-hidden transition-all duration-300"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--accent)',
          boxShadow: '0 16px 36px -8px rgba(0, 0, 0, 0.5), 0 0 24px var(--accent-glow)',
        }}
      >
        {/* Specular Top Sheen Highlight */}
        <div
          className="absolute inset-x-0 top-0 h-[1.5px] pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)',
            opacity: 0.8,
          }}
        />

        {/* ── HEADER ROW: Logo, Calligraphy, Time & Dismiss ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* User Selected Dynamic Logo Flank */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center p-1 border shrink-0"
              style={{
                background: 'var(--accent-soft)',
                borderColor: 'var(--accent)',
              }}
            >
              <NoorDynamicLogo edition={selectedLogo} size="sm" animated={false} />
            </div>

            {/* Title & 12h Time */}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className="font-serif font-extrabold text-sm sm:text-base leading-tight"
                  style={{ color: 'var(--accent-text)' }}
                >
                  {prayerName} Prayer
                </span>
                <span
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide border"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {prayerTime12h}
                </span>
              </div>

              {/* Calligraphic Arabic Badge */}
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className="font-arabic font-bold text-sm leading-none"
                  style={{ color: 'var(--accent)' }}
                >
                  {details.arabic}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate">
                  {details.rakah}
                </span>
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss Prayer Banner"
            className="w-7 h-7 rounded-lg flex items-center justify-center border text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all shrink-0"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── HADITH QUOTE WITH INLINE LANGUAGE SWITCHER ── */}
        <div
          className="mt-2.5 pt-2 border-t px-2.5 py-2 rounded-xl text-xs space-y-1.5"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-2)',
          }}
        >
          {/* Top Bar: Arabic Matn (Left) + 3-Pill Language Switcher (Right) */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="font-arabic font-bold text-xs leading-none shrink-0"
              style={{ color: 'var(--accent)' }}
            >
              {hadithData.arabic}
            </span>

            {/* Compact 3-Pill Switcher [ اردو | EN | ગુજ ] */}
            <div
              className="flex items-center p-0.5 rounded-lg border shrink-0"
              style={{
                background: 'var(--surface)',
                borderColor: 'var(--border)',
              }}
            >
              {PRAYER_HADITH_LANG_OPTIONS.map((opt) => {
                const isActive = hadithLang === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleHadithLangSwitch(opt.id)}
                    aria-label={`Switch Hadith translation to ${opt.label}`}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--on-accent, #000)] shadow-xs scale-[1.02]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                    style={{
                      fontFamily: opt.id === 'ur' ? 'var(--font-urdu), serif' : undefined,
                    }}
                  >
                    {opt.pillLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Localized Hadith Translation Text */}
          <p
            style={{
              fontFamily: hadithLang === 'ur' ? 'var(--font-urdu), serif' : undefined,
              direction: hadithLang === 'ur' ? 'rtl' : 'ltr',
              textAlign: hadithLang === 'ur' ? 'right' : 'left',
              fontSize: hadithLang === 'ur' ? '0.96rem' : '0.84rem',
              lineHeight: hadithLang === 'ur' ? 2.05 : hadithLang === 'gu' ? 1.65 : 1.55,
              fontStyle: hadithLang === 'en' ? 'italic' : 'normal',
              color: 'var(--text-primary)',
            }}
          >
            {hadithData.translation}
          </p>
        </div>

        {/* ── ACTION BUTTONS: Mark Prayed & Stop Adhan ── */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkPrayed}
            className="flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            style={{
              background: 'var(--accent)',
              color: 'var(--on-accent, #000)',
            }}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Mark Prayed</span>
          </button>

          {isPlayingAdhan ? (
            <button
              type="button"
              onClick={handleStopAdhan}
              className="py-1.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 border active:scale-95 transition-all cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--danger, #EF4444)',
                color: 'var(--danger, #EF4444)',
              }}
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Stop Adhan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDismiss}
              className="py-1.5 px-3 rounded-xl font-semibold text-xs border text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
              }}
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrayerReminderBanner;
