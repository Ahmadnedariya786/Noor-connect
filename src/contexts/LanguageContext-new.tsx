import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n-new';
import {
  type LanguageCode,
  LANGUAGES,
  SUPPORTED_CODES,
  DEFAULT_LANGUAGE,
  WIDGET_STRING_KEYS,
  isRTL as checkRTL,
} from '@/lib/language-config';
import { isNativePlatform } from '@/lib/capacitor-utils';
import { Preferences } from '@capacitor/preferences';

const PREF_KEY = 'app-language';

import { getAppUIStrings, type AppUIStrings } from '@/lib/i18n-ui';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  isRTL: boolean;
  ui: AppUIStrings;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

// ─── Side-effects applied whenever the language changes ───

function applyLanguageSideEffects(lang: LanguageCode) {
  const config = LANGUAGES[lang] || LANGUAGES.en;
  const rtl = lang === 'ar' || lang === 'ur' || config.dir === 'rtl';
  const dir = rtl ? 'rtl' : 'ltr';

  // 1. Force HTML dir + lang attributes (critical for RTL layouts)
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;

  // 2. Toggle body class for global CSS hooks
  document.body.classList.toggle('rtl', rtl);
  document.body.classList.toggle('ltr', !rtl);

  // 3. Typographic leading — set CSS variables at the root so buttons/headers
  //    don't clip tall glyphs (Nastaliq Urdu, Arabic)
  const root = document.documentElement.style;
  root.setProperty('--lang-line-height', String(config.typography.lineHeight));
  root.setProperty('--lang-font-size-adjust', config.typography.fontSizeAdjust);

  // 4. Apply a local Urdu-friendly font stack via CSS variable
  if (lang === 'ur') {
    root.setProperty('--lang-font-family', "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif");
  } else {
    root.setProperty('--lang-font-family', 'var(--font-sans)');
  }
}

// ─── Persistence: Synchronous localStorage + Capacitor Preferences ───

async function persistLanguage(lang: LanguageCode) {
  try {
    localStorage.setItem(PREF_KEY, lang);
    await Preferences.set({ key: PREF_KEY, value: lang });
  } catch (e) {
    console.warn('Failed to save language to Preferences:', e);
  }
}

async function loadSavedLanguageCode(): Promise<LanguageCode | null> {
  try {
    const localSaved = localStorage.getItem(PREF_KEY);
    if (localSaved && SUPPORTED_CODES.includes(localSaved as LanguageCode)) {
      return localSaved as LanguageCode;
    }
    const { value } = await Preferences.get({ key: PREF_KEY });
    if (value && SUPPORTED_CODES.includes(value as LanguageCode)) {
      return value as LanguageCode;
    }
  } catch {
    // Preferences unavailable — first boot or web browser
  }
  return null;
}

// ─── System-first detection via @capacitor/device ───

async function detectSystemLanguage(): Promise<LanguageCode> {
  if (isNativePlatform()) {
    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getLanguageCode();
      const twoLetter = (info.value || '').slice(0, 2).toLowerCase();
      if (SUPPORTED_CODES.includes(twoLetter as LanguageCode)) {
        return twoLetter as LanguageCode;
      }
    } catch (e) {
      console.warn('Device.getLanguageCode failed:', e);
    }
  } else {
    // Web fallback: navigator.language
    const twoLetter = (navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_CODES.includes(twoLetter as LanguageCode)) {
      return twoLetter as LanguageCode;
    }
  }
  return DEFAULT_LANGUAGE;
}

// ─── "Dumb Widget" bridge: send only the strings the widget needs ───

async function sendWidgetStrings(tFn: (key: string) => string) {
  if (!isNativePlatform()) return;
  try {
    const { registerPlugin, Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('WidgetPlugin')) {
      return;
    }

    const payload: Record<string, string> = {};
    for (const key of WIDGET_STRING_KEYS) {
      payload[key] = tFn(key);
    }

    const WidgetPlugin = registerPlugin<{
      setWidgetStrings: (opts: { strings: string }) => Promise<{ status: string }>;
    }>('WidgetPlugin');
    await WidgetPlugin.setWidgetStrings({ strings: JSON.stringify(payload) });
  } catch (e: any) {
    const msg = String(e?.message || e || '').toLowerCase();
    if (!msg.includes('not implemented') && !msg.includes('unimplemented')) {
      console.warn('Failed to send widget strings:', e);
    }
  }
}

// ─── Provider ────────────────────────────────────────────

export function LanguageProvider({ children }: LanguageProviderProps) {
  const { t } = useTranslation(undefined, { i18n });
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      if (saved && SUPPORTED_CODES.includes(saved as LanguageCode)) {
        return saved as LanguageCode;
      }
    } catch {
      // Fallback to default language if localStorage read fails
    }
    return DEFAULT_LANGUAGE;
  });

  const isLanguageRTL = language === 'ar' || language === 'ur' || checkRTL(language);
  const ui = useMemo(() => getAppUIStrings(language), [language]);

  // ── Load saved language on mount ──
  useEffect(() => {
    const bootstrap = async () => {
      let lang = await loadSavedLanguageCode();

      if (!lang) {
        lang = await detectSystemLanguage();
        await persistLanguage(lang);
      }

      setLanguageState(lang);
      i18n.changeLanguage(lang);
      applyLanguageSideEffects(lang);

      sendWidgetStrings(i18n.t.bind(i18n));
    };

    bootstrap();
  }, [i18n]);

  // ── Apply side effects whenever language changes ──
  useEffect(() => {
    applyLanguageSideEffects(language);
  }, [language]);

  // ── Public setter ──
  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      try {
        localStorage.setItem(PREF_KEY, lang);
      } catch {
        // Safe catch for storage quota or privacy mode write error
      }
      document.documentElement.dir = (lang === 'ar' || lang === 'ur') ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      setLanguageState(lang);
      i18n.changeLanguage(lang);
      applyLanguageSideEffects(lang);
      persistLanguage(lang);

      window.dispatchEvent(new CustomEvent('noor:language-changed', { detail: lang }));

      queueMicrotask(() => {
        sendWidgetStrings(i18n.t.bind(i18n));
      });
    },
    [i18n]
  );

  // Memoize context value to prevent unnecessary re-renders while updating on language change
  const value = useMemo(() => ({
    language,
    setLanguage,
    t,
    isRTL: isLanguageRTL,
    ui,
  }), [language, setLanguage, t, isLanguageRTL, ui]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Re-export for convenience
export type { LanguageCode };
export { LANGUAGES, SUPPORTED_CODES, getAppUIStrings };
