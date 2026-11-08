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
    subtitle: 'Midnight Navy & Royal Gold',
    description: 'Deep obsidian-navy base with radiant 24K royal gold accents and celestial azure highlights.',
    tokens: {
      '--bg-base': '#060A12',
      '--bg-elev': '#0B111E',
      '--surface': '#111A2E',
      '--surface-2': '#17233D',
      '--border': '#263859',
      '--accent': '#E5A93C',
      '--accent-2': '#38BDF8',
      '--accent-text': '#F5C451',
      '--on-accent': '#060A12',
      '--accent-soft': 'rgba(229, 169, 60, 0.16)',
      '--accent-glow': 'rgba(245, 196, 81, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(229, 169, 60, 0.12) 0%, rgba(17, 26, 46, 0) 60%)',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#94A3B8',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'kiswah-noir': {
    id: 'kiswah-noir',
    name: 'Makkah Silk',
    subtitle: 'Velvet Black & Champagne',
    description: 'Pure charcoal-obsidian silk paired with soft brushed rose-champagne accents and warm bronze-pearl borders.',
    tokens: {
      '--bg-base': '#070709',
      '--bg-elev': '#0E0E12',
      '--surface': '#15151B',
      '--surface-2': '#1D1D25',
      '--border': '#3A3227',
      '--accent': '#D6B485',
      '--accent-2': '#C29B61',
      '--accent-text': '#EFE0C6',
      '--on-accent': '#070709',
      '--accent-soft': 'rgba(214, 180, 133, 0.16)',
      '--accent-glow': 'rgba(239, 224, 198, 0.28)',
      '--card-sheen': 'linear-gradient(135deg, rgba(214, 180, 133, 0.13) 0%, rgba(21, 21, 27, 0) 60%);',
      '--text-primary': '#FAF7F2',
      '--text-secondary': '#B5ACA0',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'istanbul-sapphire': {
    id: 'istanbul-sapphire',
    name: 'Royal Sapphire',
    subtitle: 'Ocean Teal & Copper Gold',
    description: 'Deep Bosphorus sapphire-teal velvet paired with warm champagne copper-gold and celestial turquoise highlights.',
    tokens: {
      '--bg-base': '#041018',
      '--bg-elev': '#081824',
      '--surface': '#0D2333',
      '--surface-2': '#133044',
      '--border': '#1E4966',
      '--accent': '#E6A15C',
      '--accent-2': '#38BDF8',
      '--accent-text': '#F7C482',
      '--on-accent': '#041018',
      '--accent-soft': 'rgba(230, 161, 92, 0.17)',
      '--accent-glow': 'rgba(247, 196, 130, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(230, 161, 92, 0.13) 0%, rgba(56, 189, 248, 0.06) 60%);',
      '--text-primary': '#F0F9FF',
      '--text-secondary': '#93B8CC',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'imperial-violet': {
    id: 'imperial-violet',
    name: 'Imperial Violet',
    subtitle: 'Royal Plum & Warm Brass',
    description: 'Deep velvet plum base paired with warm antique brass and radiant gold accents with amethyst highlights.',
    tokens: {
      '--bg-base': '#0C0617',
      '--bg-elev': '#130A24',
      '--surface': '#1B0F32',
      '--surface-2': '#241542',
      '--border': '#3B2366',
      '--accent': '#E2B049',
      '--accent-2': '#A855F7',
      '--accent-text': '#F5CA6E',
      '--on-accent': '#0C0617',
      '--accent-soft': 'rgba(226, 176, 73, 0.16)',
      '--accent-glow': 'rgba(245, 202, 110, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(226, 176, 73, 0.13) 0%, rgba(168, 85, 247, 0.06) 60%);',
      '--text-primary': '#FAF5FF',
      '--text-secondary': '#C4B5FD',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'burgundy-velvet': {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    subtitle: 'Dark Wine & Rose Gold',
    description: 'Ultra-deep onyx-wine velvet paired with warm rose-gold, coral-ruby accents, and silk typography.',
    tokens: {
      '--bg-base': '#110508',
      '--bg-elev': '#18070C',
      '--surface': '#210B12',
      '--surface-2': '#2C1019',
      '--border': '#4D1C2B',
      '--accent': '#E05A6D',
      '--accent-2': '#E6A57E',
      '--accent-text': '#F4A2B0',
      '--on-accent': '#110508',
      '--accent-soft': 'rgba(224, 90, 109, 0.18)',
      '--accent-glow': 'rgba(244, 162, 176, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(224, 90, 109, 0.14) 0%, rgba(230, 165, 126, 0.05) 60%);',
      '--text-primary': '#FFF5F5',
      '--text-secondary': '#D4A5B0',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--danger': '#EF4444',
    },
  },
  'desert-scroll': {
    id: 'desert-scroll',
    name: 'Desert Scroll',
    subtitle: 'Arabian Oud & Amber',
    description: 'Warm roasted oud and roasted leather base with burnished copper-amber and radiant Mamluk gold.',
    tokens: {
      '--bg-base': '#110B07',
      '--bg-elev': '#1A110B',
      '--surface': '#24170F',
      '--surface-2': '#301F14',
      '--border': '#543722',
      '--accent': '#E08A3C',
      '--accent-2': '#D97736',
      '--accent-text': '#F5B062',
      '--on-accent': '#110B07',
      '--accent-soft': 'rgba(224, 138, 60, 0.17)',
      '--accent-glow': 'rgba(245, 176, 98, 0.30)',
      '--card-sheen': 'linear-gradient(135deg, rgba(224, 138, 60, 0.14) 0%, rgba(36, 23, 15, 0) 60%);',
      '--text-primary': '#FDF4E7',
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
  'oxford-gold': '#060A12',
  'kiswah-noir': '#070709',
  'istanbul-sapphire': '#041018',
  'imperial-violet': '#0C0617',
  'burgundy-velvet': '#110508',
  'desert-scroll': '#110B07',
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
