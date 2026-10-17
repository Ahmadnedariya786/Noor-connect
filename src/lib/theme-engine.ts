/**
 * Noor Connect - Premium Token-Based Theme Engine
 * Powers 5 custom luxury themes driven by CSS custom properties on document root.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { type ThemeId, type ThemeTokens, type AppTheme } from '@/types/theme';

export const THEME_STORAGE_KEY = 'noor_theme';
export const LEGACY_THEME_KEY = 'theme';
export const THEME_CHANGED_EVENT = 'noor-theme-changed';
export const DEFAULT_THEME_ID: ThemeId = 'oxford-gold';

export const THEMES: Record<ThemeId, AppTheme> = {
  'oxford-gold': {
    id: 'oxford-gold',
    name: 'Oxford Gold',
    subtitle: 'Classic Midnight & Radiant Gold',
    description: 'Pure obsidian background, dark navy surfaces, and luminous gold accents.',
    tokens: {
      '--bg-base': '#000000',
      '--bg-elev': '#0D1626',
      '--surface': '#14213D',
      '--surface-2': '#1D2D4A',
      '--border': 'rgba(252,163,17,0.22)',
      '--accent': '#FCA311',
      '--accent-2': '#FFD34D',
      '--accent-text': '#FFB84D',
      '--on-accent': '#000000',
      '--accent-soft': 'rgba(252,163,17,0.16)',
      '--accent-glow': 'rgba(252,163,17,0.35)',
      '--card-sheen': 'rgba(255,211,77,0.05)',
      '--text-primary': '#FFFFFF',
      '--text-secondary': '#B9C2D0',
      '--success': '#6FD69A',
      '--warning': '#FCA311',
      '--danger': '#E07A7A',
    },
  },
  'madinah-emerald': {
    id: 'madinah-emerald',
    name: 'Madinah Emerald',
    subtitle: 'Prophetic Serenity & Lush Green',
    description: 'Deep forest shades, tranquil emerald surfaces, and soft sage accents.',
    tokens: {
      '--bg-base': '#051F20',
      '--bg-elev': '#0B2B26',
      '--surface': '#163832',
      '--surface-2': '#235347',
      '--border': 'rgba(142,182,155,0.22)',
      '--accent': '#8EB69B',
      '--accent-2': '#3E7A5E',
      '--accent-text': '#A8CCB4',
      '--on-accent': '#051F20',
      '--accent-soft': 'rgba(142,182,155,0.16)',
      '--accent-glow': 'rgba(142,182,155,0.35)',
      '--card-sheen': 'rgba(142,182,155,0.05)',
      '--text-primary': '#DAF1DE',
      '--text-secondary': '#9FC4AE',
      '--success': '#7FD6A4',
      '--warning': '#E8C07A',
      '--danger': '#E08A8A',
    },
  },
  'imperial-violet': {
    id: 'imperial-violet',
    name: 'Imperial Violet',
    subtitle: 'Royal Plum & Warm Antique Brass',
    description: 'Rich royal purple base with jewel-toned surfaces and golden yellow trims.',
    tokens: {
      '--bg-base': '#1F0035',
      '--bg-elev': '#2A0047',
      '--surface': '#390040',
      '--surface-2': '#4A0055',
      '--border': 'rgba(199,148,14,0.25)',
      '--accent': '#C7940E',
      '--accent-2': '#E5B83C',
      '--accent-text': '#DDB04A',
      '--on-accent': '#1F0035',
      '--accent-soft': 'rgba(199,148,14,0.16)',
      '--accent-glow': 'rgba(199,148,14,0.35)',
      '--card-sheen': 'rgba(229,184,60,0.05)',
      '--text-primary': '#F7F0E3',
      '--text-secondary': '#C9B8D8',
      '--success': '#8FD6A8',
      '--warning': '#E8C07A',
      '--danger': '#E08A9A',
    },
  },
  'burgundy-velvet': {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    subtitle: 'Crimson Richness & Warm Linen',
    description: 'Deep onyx and dark wine surfaces with passionate ruby-coral highlights.',
    tokens: {
      '--bg-base': '#0B0B0B',
      '--bg-elev': '#180C0E',
      '--surface': '#241012',
      '--surface-2': '#3A1418',
      '--border': 'rgba(139,13,26,0.35)',
      '--accent': '#C24552',
      '--accent-2': '#E0707E',
      '--accent-text': '#D9666F',
      '--on-accent': '#F5F2ED',
      '--accent-soft': 'rgba(139,13,26,0.22)',
      '--accent-glow': 'rgba(194,69,82,0.35)',
      '--card-sheen': 'rgba(224,112,126,0.05)',
      '--text-primary': '#F5F2ED',
      '--text-secondary': '#C9BEB9',
      '--success': '#8FD6A8',
      '--warning': '#E8C07A',
      '--danger': '#E07A7A',
    },
  },
  'desert-scroll': {
    id: 'desert-scroll',
    name: 'Desert Scroll',
    subtitle: 'Antique Parchment & Golden Sand',
    description: 'Warm espresso and roasted leather tones with radiant parchment gold glow.',
    tokens: {
      '--bg-base': '#1B0F08',
      '--bg-elev': '#2A1A0C',
      '--surface': '#3A2412',
      '--surface-2': '#583714',
      '--border': 'rgba(255,235,151,0.22)',
      '--accent': '#FFEB97',
      '--accent-2': '#E3C26A',
      '--accent-text': '#FFEB97',
      '--on-accent': '#1B0F08',
      '--accent-soft': 'rgba(255,235,151,0.14)',
      '--accent-glow': 'rgba(255,235,151,0.30)',
      '--card-sheen': 'rgba(255,235,151,0.05)',
      '--text-primary': '#F7EFD8',
      '--text-secondary': '#CBB98F',
      '--success': '#A8D69A',
      '--warning': '#FFEB97',
      '--danger': '#E09A8A',
    },
  },
};

export const APP_THEMES: AppTheme[] = [
  THEMES['oxford-gold'],
  THEMES['madinah-emerald'],
  THEMES['imperial-violet'],
  THEMES['burgundy-velvet'],
  THEMES['desert-scroll'],
];

const VALID_THEME_IDS = new Set<ThemeId>(APP_THEMES.map((t) => t.id));

/**
 * Returns the currently persisted theme ID or the default 'oxford-gold'.
 */
export function getTheme(): ThemeId {
  try {
    const val = localStorage.getItem(THEME_STORAGE_KEY);
    if (val && VALID_THEME_IDS.has(val as ThemeId)) {
      return val as ThemeId;
    }
  } catch {
    // Return fallback on localStorage read error
  }
  return DEFAULT_THEME_ID;
}

/**
 * Applies all 15 theme tokens and DOM attributes immediately.
 * Keeps 'dark' permanently active on <html> so Tailwind dark: variants always work.
 * Forces native status bar to LightContent unconditionally.
 */
export function applyThemeToDOM(themeId: ThemeId): void {
  if (typeof document === 'undefined') return;

  const validId = VALID_THEME_IDS.has(themeId) ? themeId : DEFAULT_THEME_ID;
  const theme = THEMES[validId] || THEMES[DEFAULT_THEME_ID];
  const root = document.documentElement;

  // 1. Maintain permanent dark class on root for Tailwind dark: variants
  if (!root.classList.contains('dark')) {
    root.classList.add('dark');
  }

  // 2. Set theme data attribute
  root.setAttribute('data-theme', validId);

  // 3. Write all 15 CSS custom properties directly onto document root
  (Object.keys(theme.tokens) as Array<keyof ThemeTokens>).forEach((token) => {
    root.style.setProperty(token, theme.tokens[token]);
  });

  // 4. Force status bar to LightContent (Style.Dark) unconditionally since all 5 themes are dark-based
  if (Capacitor.isNativePlatform()) {
    try {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {
        // Safe fallback on unsupported platforms
      });
    } catch {
      // Safe fallback when native status bar is unavailable
    }
  }
}

/**
 * Changes active theme, persists to localStorage, cleans legacy theme key, and emits change event.
 */
export function setTheme(newThemeId: ThemeId): void {
  const validId = VALID_THEME_IDS.has(newThemeId) ? newThemeId : DEFAULT_THEME_ID;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, validId);
    // Ignore and remove legacy theme mode to avoid conflicting states
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // Continue silently on storage write failure
  }

  applyThemeToDOM(validId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGED_EVENT, { detail: validId }));
  }
}

/**
 * Early bootstrap step executed BEFORE React mounts to guarantee zero theme flash.
 */
export function initThemeEngine(): ThemeId {
  const activeThemeId = getTheme();
  applyThemeToDOM(activeThemeId);
  return activeThemeId;
}

/**
 * React hook to consume and update the active full-app theme.
 */
export function useAppTheme(): {
  currentTheme: ThemeId;
  theme: AppTheme;
  setTheme: (themeId: ThemeId) => void;
  themes: AppTheme[];
} {
  const [themeId, setThemeId] = useState<ThemeId>(getTheme);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ThemeId>;
      if (custom.detail && VALID_THEME_IDS.has(custom.detail)) {
        setThemeId(custom.detail);
      } else {
        setThemeId(getTheme());
      }
    };

    window.addEventListener(THEME_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateTheme = useCallback((nextId: ThemeId) => {
    setTheme(nextId);
    setThemeId(nextId);
  }, []);

  return {
    currentTheme: themeId,
    theme: THEMES[themeId] || THEMES[DEFAULT_THEME_ID],
    setTheme: updateTheme,
    themes: APP_THEMES,
  };
}
