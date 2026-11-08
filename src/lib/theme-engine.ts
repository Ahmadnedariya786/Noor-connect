/**
 * Noor Connect - Premium Token-Based Theme Engine
 * Powers 5 custom luxury themes driven by CSS custom properties on document root.
 */

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { type ThemeId, type ThemeTokens, type AppTheme } from '@/types/theme';
export type { ThemeId, ThemeTokens, AppTheme } from '@/types/theme';
import { recordBreadcrumb } from './diagnostics-engine';

export const THEME_STORAGE_KEY = 'noor_theme';
export const ALT_THEME_STORAGE_KEY = 'noor-theme';
export const LEGACY_THEME_KEY = 'theme';
export const THEME_CHANGED_EVENT = 'noor-theme-changed';
export const DEFAULT_THEME_ID: ThemeId = 'oxford-gold';

export const THEMES: Record<ThemeId, AppTheme> = {
  'oxford-gold': {
    id: 'oxford-gold',
    name: 'Nordic Slate',
    subtitle: 'Midnight Steel & Silver',
    description: 'Cool metallic slate-navy and brushed titanium silver with luminous platinum ice highlights.',
    tokens: {
      '--bg-base': '#06141B',
      '--bg-elev': '#11212D',
      '--surface': '#1B2C3B',
      '--surface-2': '#253745',
      '--border': '#4A5C6A',
      '--accent': '#9BA8AB',
      '--accent-2': '#4A5C6A',
      '--accent-text': '#CCD0CF',
      '--on-accent': '#06141B',
      '--accent-soft': 'rgba(155, 168, 171, 0.18)',
      '--accent-glow': 'rgba(204, 208, 207, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(204, 208, 207, 0.14) 0%, rgba(37, 55, 69, 0.05) 60%)',
      '--text-primary': '#EEF2F3',
      '--text-secondary': '#9BA8AB',
      '--success': '#38BDF8',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'kiswah-noir': {
    id: 'kiswah-noir',
    name: 'Kaaba Kiswah',
    subtitle: '24K Gold & Black Silk',
    description: 'Sacred black Kiswah silk of the Holy Kaaba embroidered with pure 24-karat gold threads.',
    tokens: {
      '--bg-base': '#040406',
      '--bg-elev': '#0B0B0F',
      '--surface': '#121218',
      '--surface-2': '#1A1A22',
      '--border': '#3D3117',
      '--accent': '#D4AF37',
      '--accent-2': '#E5C158',
      '--accent-text': '#F7DC6F',
      '--on-accent': '#040406',
      '--accent-soft': 'rgba(212, 175, 55, 0.15)',
      '--accent-glow': 'rgba(247, 220, 111, 0.32)',
      '--card-sheen': 'linear-gradient(135deg, rgba(212, 175, 55, 0.14) 0%, rgba(18, 18, 24, 0) 60%)',
      '--text-primary': '#FAF6EE',
      '--text-secondary': '#B5AD9E',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'istanbul-sapphire': {
    id: 'istanbul-sapphire',
    name: 'Iznik Sapphire',
    subtitle: 'Ocean Cyan & Sky Blue',
    description: 'Deep oceanic cyan-sapphire and glacial sky-blue inspired by illuminated Ottoman Iznik ceramics.',
    tokens: {
      '--bg-base': '#05161A',
      '--bg-elev': '#072E33',
      '--surface': '#183B4E',
      '--surface-2': '#294D61',
      '--border': '#0C7075',
      '--accent': '#0F969C',
      '--accent-2': '#6DA5C0',
      '--accent-text': '#6DA5C0',
      '--on-accent': '#05161A',
      '--accent-soft': 'rgba(109, 165, 192, 0.18)',
      '--accent-glow': 'rgba(15, 150, 156, 0.35)',
      '--card-sheen': 'linear-gradient(135deg, rgba(109, 165, 192, 0.16) 0%, rgba(12, 112, 117, 0.06) 60%)',
      '--text-primary': '#F0F8FC',
      '--text-secondary': '#8AB8CE',
      '--success': '#38BDF8',
      '--warning': '#FBBF24',
      '--danger': '#EF4444',
    },
  },
  'imperial-violet': {
    id: 'imperial-violet',
    name: 'Imperial Violet',
    subtitle: 'Cosmic Indigo & Lavender',
    description: 'Cosmic indigo amethyst and luminous electric lavender with majestic violet depth.',
    tokens: {
      '--bg-base': '#0B0720',
      '--bg-elev': '#160D35',
      '--surface': '#25134D',
      '--surface-2': '#331B68',
      '--border': '#6A2FC8',
      '--accent': '#9D71E8',
      '--accent-2': '#6A2FC8',
      '--accent-text': '#D1B8FF',
      '--on-accent': '#0B0720',
      '--accent-soft': 'rgba(157, 113, 232, 0.18)',
      '--accent-glow': 'rgba(209, 184, 255, 0.32)',
      '--card-sheen': 'linear-gradient(135deg, rgba(157, 113, 232, 0.18) 0%, rgba(106, 47, 200, 0.05) 60%)',
      '--text-primary': '#F2E9FF',
      '--text-secondary': '#C4A9F5',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#F87171',
    },
  },
  'burgundy-velvet': {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    subtitle: 'Ruby Wine & Rose Blush',
    description: 'Deep ruby-crimson velvet and luminous silk rose-blush with rich wine depth.',
    tokens: {
      '--bg-base': '#1C0209',
      '--bg-elev': '#360412',
      '--surface': '#52061B',
      '--surface-2': '#6E0A28',
      '--border': '#881144',
      '--accent': '#C24366',
      '--accent-2': '#243A66',
      '--accent-text': '#FF85B3',
      '--on-accent': '#FFE4D8',
      '--accent-soft': 'rgba(194, 67, 102, 0.22)',
      '--accent-glow': 'rgba(255, 105, 180, 0.32)',
      '--card-sheen': 'linear-gradient(135deg, rgba(255, 105, 180, 0.16) 0%, rgba(136, 17, 68, 0.08) 60%)',
      '--text-primary': '#FFE4D8',
      '--text-secondary': '#E6A8B8',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
    },
  },
  'desert-scroll': {
    id: 'desert-scroll',
    name: 'Desert Scroll',
    subtitle: 'Arabian Oud & Copper',
    description: 'Warm roasted oud and dark leather with radiant terracotta copper-bronze accents.',
    tokens: {
      '--bg-base': '#120B07',
      '--bg-elev': '#1C120B',
      '--surface': '#261810',
      '--surface-2': '#332015',
      '--border': '#5C3A24',
      '--accent': '#D97736',
      '--accent-2': '#B55D27',
      '--accent-text': '#F4A261',
      '--on-accent': '#120B07',
      '--accent-soft': 'rgba(217, 119, 54, 0.18)',
      '--accent-glow': 'rgba(244, 162, 97, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(217, 119, 54, 0.15) 0%, rgba(38, 24, 16, 0) 60%)',
      '--text-primary': '#FDF3E7',
      '--text-secondary': '#C8A98E',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
};

export const APP_THEMES: AppTheme[] = [
  THEMES['oxford-gold'],
  THEMES['kiswah-noir'],
  THEMES['istanbul-sapphire'],
  THEMES['imperial-violet'],
  THEMES['burgundy-velvet'],
  THEMES['desert-scroll'],
];

const VALID_THEME_IDS = new Set<ThemeId>(APP_THEMES.map((t) => t.id));

/**
 * Returns the currently persisted theme ID or the default 'oxford-gold'.
 * Includes safe migration from legacy 'madinah-emerald' to flagship 'kiswah-noir'.
 */
export function getTheme(): ThemeId {
  try {
    const val = localStorage.getItem(ALT_THEME_STORAGE_KEY) || localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
    if (val === 'madinah-emerald') {
      try {
        localStorage.setItem(ALT_THEME_STORAGE_KEY, 'kiswah-noir');
        localStorage.setItem(THEME_STORAGE_KEY, 'kiswah-noir');
      } catch {
        // Safe localStorage write fallback
      }
      return 'kiswah-noir';
    }
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

  // 2. Set theme data attribute and class
  root.setAttribute('data-theme', validId);
  APP_THEMES.forEach((t) => {
    if (t.id === validId) {
      root.classList.add(t.id);
    } else {
      root.classList.remove(t.id);
    }
  });

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

  // 5. Synchronize native Android window & WebView background color to eliminate cold-start navy flash
  const bgHex = THEME_BG_HEX_MAP[validId] || '#000000';
  if (typeof window !== 'undefined') {
    try {
      (window as any).AndroidBridge?.setNativeThemeBg?.(bgHex);
    } catch {
      // Safe fallback when AndroidBridge is unavailable
    }
  }
}

export const THEME_BG_HEX_MAP: Record<ThemeId, string> = {
  'oxford-gold': '#06141B',
  'kiswah-noir': '#040406',
  'istanbul-sapphire': '#05161A',
  'imperial-violet': '#0B0720',
  'burgundy-velvet': '#1C0209',
  'desert-scroll': '#120B07',
};

/**
 * Changes active theme, persists to localStorage, cleans legacy theme key, and emits change event.
 */
export function setTheme(newThemeId: ThemeId): void {
  const validId = VALID_THEME_IDS.has(newThemeId) ? newThemeId : DEFAULT_THEME_ID;

  try {
    localStorage.setItem(ALT_THEME_STORAGE_KEY, validId);
    localStorage.setItem(THEME_STORAGE_KEY, validId);
    // Ignore and remove legacy theme mode to avoid conflicting states
    localStorage.removeItem(LEGACY_THEME_KEY);
  } catch {
    // Continue silently on storage write failure
  }

  applyThemeToDOM(validId);
  recordBreadcrumb('THEME_CHANGE', `Theme set to: ${validId}`);

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
