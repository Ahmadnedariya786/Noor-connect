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
    subtitle: 'Classic Midnight & Radiant Gold',
    description: 'Pure obsidian background, dark navy surfaces, and luminous gold accents.',
    tokens: {
      '--bg-base': '#080B14',
      '--bg-elev': '#0D1626',
      '--surface': '#14213D',
      '--surface-2': '#1D2D4A',
      '--border': 'rgba(212,175,55,0.22)',
      '--accent': '#D4AF37',
      '--accent-2': '#FFD34D',
      '--accent-text': '#F3E5AB',
      '--on-accent': '#000000',
      '--accent-soft': 'rgba(212,175,55,0.16)',
      '--accent-glow': 'rgba(212,175,55,0.35)',
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
    subtitle: 'Royal Rawdah Malachite & Sunlit Madinah Gold',
    description: 'Deep forest malachite shades, tranquil emerald surfaces, and sunlit Rawdah gold accents.',
    tokens: {
      '--bg-base': '#03130E',
      '--bg-elev': '#072219',
      '--surface': '#0A2B20',
      '--surface-2': '#103B2C',
      '--border': 'rgba(52, 211, 153, 0.26)',
      '--accent': '#10B981',
      '--accent-2': '#EAB308',
      '--accent-text': '#6EE7B7',
      '--on-accent': '#021A11',
      '--accent-soft': 'rgba(16, 185, 129, 0.16)',
      '--accent-glow': 'rgba(16, 185, 129, 0.35)',
      '--card-sheen': 'linear-gradient(135deg, rgba(52, 211, 153, 0.22) 0%, rgba(234, 179, 8, 0.12) 50%, transparent 100%)',
      '--text-primary': '#F0FDF9',
      '--text-secondary': '#A7F3D0',
      '--success': '#34D399',
      '--warning': '#EAB308',
      '--danger': '#EF4444',
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
    subtitle: 'Royal Arabian Oud, Burnished Copper-Gold & Mamluk Amber',
    description: 'Warm espresso and roasted leather tones with radiant parchment gold and burnished copper glow.',
    tokens: {
      '--bg-base': '#110A06',
      '--bg-elev': '#1C110A',
      '--surface': '#25170E',
      '--surface-2': '#332014',
      '--border': 'rgba(245, 158, 11, 0.30)',
      '--accent': '#F59E0B',
      '--accent-2': '#EA580C',
      '--accent-text': '#FCD34D',
      '--on-accent': '#1A0E04',
      '--accent-soft': 'rgba(245, 158, 11, 0.18)',
      '--accent-glow': 'rgba(245, 158, 11, 0.38)',
      '--card-sheen': 'linear-gradient(135deg, rgba(245, 158, 11, 0.24) 0%, rgba(234, 88, 12, 0.14) 50%, transparent 100%)',
      '--text-primary': '#FFFBEB',
      '--text-secondary': '#FDE68A',
      '--success': '#84CC16',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
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
  'oxford-gold': '#000000',
  'madinah-emerald': '#03130E',
  'imperial-violet': '#1F0035',
  'burgundy-velvet': '#0B0B0B',
  'desert-scroll': '#110A06',
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
