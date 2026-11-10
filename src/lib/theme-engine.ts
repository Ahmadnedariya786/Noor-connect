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
    name: 'Oxford Gold',
    subtitle: 'Midnight Velvet & Satin Gold',
    description: 'Midnight velvet surfaces with warm satin gold accents and amber starlight sheen.',
    tokens: {
      '--bg-base': '#060911',
      '--bg-elev': '#0A0F1C',
      '--surface': '#0F1729',
      '--surface-2': '#152038',
      '--border': '#283A5E',
      '--accent': '#DCA349',
      '--accent-2': '#B87F28',
      '--accent-text': '#F2C97D',
      '--on-accent': '#060911',
      '--accent-soft': 'rgba(220, 163, 73, 0.16)',
      '--accent-glow': 'rgba(242, 201, 125, 0.28)',
      '--card-sheen': 'linear-gradient(135deg, rgba(220, 163, 73, 0.13) 0%, rgba(184, 127, 40, 0.04) 60%)',
      '--card-sheen-line': 'rgba(242, 201, 125, 0.18)',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#9EB0C9',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'kiswah-noir': {
    id: 'kiswah-noir',
    name: 'Haramain Noir',
    subtitle: 'Obsidian Graphite & Satin Silver',
    description: 'Pure obsidian graphite surfaces with polished satin silver accents and moonlit platinum sheen.',
    tokens: {
      '--bg-base': '#060608',
      '--bg-elev': '#0B0C10',
      '--surface': '#12131A',
      '--surface-2': '#191B24',
      '--border': '#2E3346',
      '--accent': '#A8B3C7',
      '--accent-2': '#7E8B9F',
      '--accent-text': '#DAE2F0',
      '--on-accent': '#060608',
      '--accent-soft': 'rgba(168, 179, 199, 0.16)',
      '--accent-glow': 'rgba(218, 226, 240, 0.28)',
      '--card-sheen': 'linear-gradient(135deg, rgba(218, 226, 240, 0.12) 0%, rgba(126, 139, 159, 0.04) 60%)',
      '--card-sheen-line': 'rgba(218, 226, 240, 0.18)',
      '--text-primary': '#F5F7FA',
      '--text-secondary': '#9AA3B5',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'imperial-violet': {
    id: 'imperial-violet',
    name: 'Imperial Violet',
    subtitle: 'Obsidian Plum & Satin Orchid',
    description: 'Deep obsidian plum surfaces with satin orchid accents and royal violet sheen.',
    tokens: {
      '--bg-base': '#0B0514',
      '--bg-elev': '#11081F',
      '--surface': '#180C2B',
      '--surface-2': '#22123B',
      '--border': '#3D2166',
      '--accent': '#C582F0',
      '--accent-2': '#9333EA',
      '--accent-text': '#E2B6FF',
      '--on-accent': '#0B0514',
      '--accent-soft': 'rgba(184, 101, 230, 0.17)',
      '--accent-glow': 'rgba(226, 182, 255, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(184, 101, 230, 0.14) 0%, rgba(147, 51, 234, 0.04) 60%)',
      '--card-sheen-line': 'rgba(226, 182, 255, 0.18)',
      '--text-primary': '#FAF5FF',
      '--text-secondary': '#C8A8E0',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'burgundy-velvet': {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    subtitle: 'Deep Onyx & Crimson',
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
    subtitle: 'Obsidian Mocha & Terracotta',
    description: 'Obsidian mocha surfaces with warm terracotta copper accents and desert dune sheen.',
    tokens: {
      '--bg-base': '#100806',
      '--bg-elev': '#170C09',
      '--surface': '#21110D',
      '--surface-2': '#2C1812',
      '--border': '#4D2B20',
      '--accent': '#E58A4E',
      '--accent-2': '#C46830',
      '--accent-text': '#F8BF95',
      '--on-accent': '#100806',
      '--accent-soft': 'rgba(229, 138, 78, 0.17)',
      '--accent-glow': 'rgba(248, 191, 149, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(229, 138, 78, 0.14) 0%, rgba(196, 104, 48, 0.04) 60%)',
      '--card-sheen-line': 'rgba(248, 191, 149, 0.18)',
      '--text-primary': '#FFF6F2',
      '--text-secondary': '#D4ADA0',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'istanbul-sapphire': {
    id: 'istanbul-sapphire',
    name: 'Royal Sapphire',
    subtitle: 'Obsidian Sapphire & Periwinkle',
    description: 'Obsidian sapphire surfaces with satin periwinkle accents and deep celestial sheen.',
    tokens: {
      '--bg-base': '#050912',
      '--bg-elev': '#08101E',
      '--surface': '#0C1629',
      '--surface-2': '#12203A',
      '--border': '#233D6B',
      '--accent': '#6A9AF2',
      '--accent-2': '#3B6FD4',
      '--accent-text': '#A8C7FF',
      '--on-accent': '#050912',
      '--accent-soft': 'rgba(91, 141, 239, 0.17)',
      '--accent-glow': 'rgba(168, 199, 255, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(91, 141, 239, 0.14) 0%, rgba(59, 111, 212, 0.04) 60%)',
      '--card-sheen-line': 'rgba(168, 199, 255, 0.18)',
      '--text-primary': '#F2F7FF',
      '--text-secondary': '#9DB4D8',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'madinah-emerald': {
    id: 'madinah-emerald',
    name: 'Madinah Emerald',
    subtitle: 'Obsidian Pine & Satin Jade',
    description: 'Obsidian pine surfaces with soothing satin jade accents and mint sheen.',
    tokens: {
      '--bg-base': '#040D09',
      '--bg-elev': '#071510',
      '--surface': '#0A1F17',
      '--surface-2': '#102B20',
      '--border': '#1E4D3A',
      '--accent': '#45B88C',
      '--accent-2': '#2E946D',
      '--accent-text': '#9AE6C8',
      '--on-accent': '#040D09',
      '--accent-soft': 'rgba(69, 184, 140, 0.17)',
      '--accent-glow': 'rgba(154, 230, 200, 0.28)',
      '--card-sheen': 'linear-gradient(135deg, rgba(69, 184, 140, 0.14) 0%, rgba(46, 148, 109, 0.04) 60%)',
      '--card-sheen-line': 'rgba(154, 230, 200, 0.18)',
      '--text-primary': '#F2FBF7',
      '--text-secondary': '#9AC4B3',
      '--success': '#A3E635',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
};

export const APP_THEMES: AppTheme[] = [
  THEMES['oxford-gold'],
  THEMES['kiswah-noir'],
  THEMES['imperial-violet'],
  THEMES['burgundy-velvet'],
  THEMES['desert-scroll'],
  THEMES['istanbul-sapphire'],
  THEMES['madinah-emerald'],
];

const VALID_THEME_IDS = new Set<ThemeId>(APP_THEMES.map((t) => t.id));

/**
 * Returns the currently persisted theme ID or the default 'oxford-gold'.
 */
export function getTheme(): ThemeId {
  try {
    const val = localStorage.getItem(ALT_THEME_STORAGE_KEY) || localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
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

  // 3. Write all theme CSS custom properties directly onto document root
  (Object.keys(theme.tokens) as Array<keyof ThemeTokens>).forEach((token) => {
    const val = theme.tokens[token];
    if (val !== undefined) {
      root.style.setProperty(token, val);
    }
  });

  if (theme.tokens['--card-sheen-line']) {
    root.style.setProperty('--card-sheen-line', theme.tokens['--card-sheen-line']);
  } else {
    root.style.removeProperty('--card-sheen-line');
  }

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
  'oxford-gold': '#060911',
  'kiswah-noir': '#060608',
  'imperial-violet': '#0B0514',
  'burgundy-velvet': '#0B0B0B',
  'desert-scroll': '#100806',
  'istanbul-sapphire': '#050912',
  'madinah-emerald': '#040D09',
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
