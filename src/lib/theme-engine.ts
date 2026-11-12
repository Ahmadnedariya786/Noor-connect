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

export const SIGNATURE_PATTERNS: Record<ThemeId, string> = {
  'oxford-gold': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect x='16' y='16' width='16' height='16' fill='none' stroke='black' stroke-width='1.2'/%3E%3Crect x='16' y='16' width='16' height='16' fill='none' stroke='black' stroke-width='1.2' transform='rotate(45 24 24)'/%3E%3Ccircle cx='24' cy='24' r='2' fill='black'/%3E%3Crect x='-8' y='-8' width='16' height='16' fill='none' stroke='black' stroke-width='1'/%3E%3Crect x='-8' y='-8' width='16' height='16' fill='none' stroke='black' stroke-width='1' transform='rotate(45 0 0)'/%3E%3Crect x='40' y='-8' width='16' height='16' fill='none' stroke='black' stroke-width='1'/%3E%3Crect x='40' y='-8' width='16' height='16' fill='none' stroke='black' stroke-width='1' transform='rotate(45 48 0)'/%3E%3Crect x='-8' y='40' width='16' height='16' fill='none' stroke='black' stroke-width='1'/%3E%3Crect x='-8' y='40' width='16' height='16' fill='none' stroke='black' stroke-width='1' transform='rotate(45 0 48)'/%3E%3Crect x='40' y='40' width='16' height='16' fill='none' stroke='black' stroke-width='1'/%3E%3Crect x='40' y='40' width='16' height='16' fill='none' stroke='black' stroke-width='1' transform='rotate(45 48 48)'/%3E%3Cpath d='M24 0L27 3 24 6 21 3ZM24 48L27 45 24 42 21 45ZM0 24L3 27 6 24 3 21ZM48 24L45 27 42 24 45 21Z' fill='black'/%3E%3C/svg%3E")`,
  'kiswah-noir': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M18 4L32 18 18 32 4 18Z' fill='none' stroke='black' stroke-width='1.2'/%3E%3Crect x='13' y='13' width='10' height='10' fill='none' stroke='black' stroke-width='0.8'/%3E%3Crect x='13' y='13' width='10' height='10' fill='none' stroke='black' stroke-width='0.8' transform='rotate(45 18 18)'/%3E%3Ccircle cx='18' cy='18' r='1.5' fill='black'/%3E%3Cpath d='M0 8L8 0M36 8L28 0M0 28L8 36M36 28L28 36' stroke='black' stroke-width='1' stroke-dasharray='2 2'/%3E%3C/svg%3E")`,
  'imperial-violet': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect x='17' y='17' width='14' height='14' fill='none' stroke='black' stroke-width='1.2'/%3E%3Crect x='17' y='17' width='14' height='14' fill='none' stroke='black' stroke-width='1.2' transform='rotate(45 24 24)'/%3E%3Ccircle cx='24' cy='24' r='2' fill='black'/%3E%3Cpath d='M6 38c6-14 18-20 32-24-4 8-10 16-22 22z' fill='black' opacity='0.35'/%3E%3Cpath d='M42 10c-6 14-18 20-32 24 4-8 10-16 22-22z' fill='black' opacity='0.35'/%3E%3Ccircle cx='0' cy='0' r='2' fill='black'/%3E%3Ccircle cx='48' cy='0' r='2' fill='black'/%3E%3Ccircle cx='0' cy='48' r='2' fill='black'/%3E%3Ccircle cx='48' cy='48' r='2' fill='black'/%3E%3C/svg%3E")`,
  'burgundy-velvet': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='4' cy='4' r='1.2' fill='black'/%3E%3Ccircle cx='12' cy='12' r='1.6' fill='black'/%3E%3Ccircle cx='20' cy='20' r='1.8' fill='black'/%3E%3Ccircle cx='28' cy='28' r='1.4' fill='black'/%3E%3Ccircle cx='20' cy='4' r='1.3' fill='black'/%3E%3Ccircle cx='28' cy='12' r='1.5' fill='black'/%3E%3Ccircle cx='4' cy='20' r='1.5' fill='black'/%3E%3Ccircle cx='12' cy='28' r='1.3' fill='black'/%3E%3Cpath d='M0 32L32 0' stroke='black' stroke-width='0.8' stroke-dasharray='3 3'/%3E%3C/svg%3E")`,
  'desert-scroll': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='3' cy='7' r='0.9' fill='black'/%3E%3Ccircle cx='15' cy='4' r='1.1' fill='black'/%3E%3Ccircle cx='27' cy='9' r='0.9' fill='black'/%3E%3Ccircle cx='8' cy='19' r='1.2' fill='black'/%3E%3Ccircle cx='22' cy='16' r='0.8' fill='black'/%3E%3Ccircle cx='6' cy='29' r='1' fill='black'/%3E%3Ccircle cx='18' cy='26' r='0.9' fill='black'/%3E%3Ccircle cx='29' cy='27' r='1.1' fill='black'/%3E%3Cpath d='M0 24C8 20, 16 28, 32 8' stroke='black' stroke-width='0.7' fill='none' stroke-dasharray='2 3'/%3E%3C/svg%3E")`,
  'istanbul-sapphire': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Cpath d='M0 18c6-6 12-6 18 0s12 6 18 0M0 9c6-6 12-6 18 0s12 6 18 0M0 27c6-6 12-6 18 0s12 6 18 0' fill='none' stroke='black' stroke-width='1.5'/%3E%3Cpath d='M9 0c0 9 9 9 9 18m9-18c0 9 9 9 9 18' fill='none' stroke='black' stroke-width='0.8'/%3E%3C/svg%3E")`,
  'madinah-emerald': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='48' viewBox='0 0 40 48'%3E%3Cpath d='M0 48C0 28, 10 16, 20 16C30 16, 40 28, 40 48' fill='none' stroke='black' stroke-width='1.3'/%3E%3Cpath d='M-20 24C-20 4, -10 -8, 0 -8C10 -8, 20 4, 20 24' fill='none' stroke='black' stroke-width='1.3'/%3E%3Cpath d='M20 24C20 4, 30 -8, 40 -8C50 -8, 60 4, 60 24' fill='none' stroke='black' stroke-width='1.3'/%3E%3Cpath d='M20 48V32M20 44c-3-2-6-3-8-2m8 2c3-2 6-3 8-2M20 38c-2-2-5-3-7-2m7 2c2-2 5-3 7-2' stroke='black' stroke-width='0.9' fill='none'/%3E%3Cpath d='M0 24V8M0 20c-3-2-6-3-8-2m8 2c3-2 6-3 8-2' stroke='black' stroke-width='0.9' fill='none'/%3E%3Cpath d='M40 24V8M40 20c-3-2-6-3-8-2m8 2c3-2 6-3 8-2' stroke='black' stroke-width='0.9' fill='none'/%3E%3C/svg%3E")`,
};

export const SIGNATURE_MOTIFS: Record<ThemeId, string> = {
  'oxford-gold': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg transform='translate(80,80)'%3E%3Ccircle r='72' fill='none' stroke='black' stroke-width='2'/%3E%3Ccircle r='65' fill='none' stroke='black' stroke-width='1' stroke-dasharray='3 3'/%3E%3Crect x='-38' y='-38' width='76' height='76' fill='none' stroke='black' stroke-width='2.5'/%3E%3Crect x='-38' y='-38' width='76' height='76' fill='none' stroke='black' stroke-width='2.5' transform='rotate(45)'/%3E%3Ccircle r='24' fill='none' stroke='black' stroke-width='1.8'/%3E%3Ccircle r='6' fill='black'/%3E%3Ccircle cx='0' cy='-54' r='2.5' fill='black'/%3E%3Ccircle cx='0' cy='54' r='2.5' fill='black'/%3E%3Ccircle cx='-54' cy='0' r='2.5' fill='black'/%3E%3Ccircle cx='54' cy='0' r='2.5' fill='black'/%3E%3Ccircle cx='-38' cy='-38' r='2.5' fill='black'/%3E%3Ccircle cx='38' cy='-38' r='2.5' fill='black'/%3E%3Ccircle cx='-38' cy='38' r='2.5' fill='black'/%3E%3Ccircle cx='38' cy='38' r='2.5' fill='black'/%3E%3C/g%3E%3C/svg%3E")`,
  'kiswah-noir': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='28' viewBox='0 0 80 28'%3E%3Cline x1='0' y1='2' x2='80' y2='2' stroke='black' stroke-width='1.5'/%3Cline x1='0' y1='26' x2='80' y2='26' stroke='black' stroke-width='1.5'/%3Crect x='25' y='6' width='30' height='16' rx='4' fill='none' stroke='black' stroke-width='1.2'/%3E%3Crect x='35' y='9' width='10' height='10' fill='none' stroke='black' stroke-width='0.8'/%3E%3Crect x='35' y='9' width='10' height='10' fill='none' stroke='black' stroke-width='0.8' transform='rotate(45 40 14)'/%3E%3Ccircle cx='40' cy='14' r='1.5' fill='black'/%3E%3Cpath d='M0 14L8 6 16 14 8 22ZM64 14L72 6 80 14 72 22Z' fill='none' stroke='black' stroke-width='1'/%3E%3C/svg%3E")`,
  'imperial-violet': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Cg transform='translate(75,75)'%3E%3Ccircle r='66' fill='none' stroke='black' stroke-width='1.5' stroke-dasharray='3 3'/%3E%3Crect x='-26' y='-26' width='52' height='52' fill='none' stroke='black' stroke-width='2.2'/%3E%3Crect x='-26' y='-26' width='52' height='52' fill='none' stroke='black' stroke-width='2.2' transform='rotate(45)'/%3E%3Ccircle r='14' fill='none' stroke='black' stroke-width='1.5'/%3E%3Ccircle r='4' fill='black'/%3E%3Cpath d='M-36 45c-20-25-24-55-10-85 18 22 18 52 10 85z' fill='black'/%3E%3Cpath d='M36 45c20-25 24-55 10-85-18 22-18 52-10 85z' fill='black'/%3E%3C/g%3E%3C/svg%3E")`,
  'burgundy-velvet': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Cg transform='translate(75,75)'%3E%3Ccircle r='68' fill='none' stroke='black' stroke-width='1.5'/%3E%3Ccircle r='62' fill='none' stroke='black' stroke-width='1' stroke-dasharray='2 3'/%3E%3Cpath d='M0-40c20 0 35 15 35 35s-15 35-35 35-35-15-35-35c0-10 5-20 12-26' fill='none' stroke='black' stroke-width='2.2'/%3E%3Cpath d='M-15-20c15-10 30-5 35 10s-5 25-20 25-25-10-25-20' fill='none' stroke='black' stroke-width='1.8'/%3E%3Ccircle r='6' fill='black'/%3E%3C/g%3E%3C/svg%3E")`,
  'desert-scroll': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg transform='translate(70,70)'%3E%3Cpath d='M-45 60V0c0-25 20-45 45-45s45 20 45 45v60' fill='none' stroke='black' stroke-width='2.5'/%3E%3Cpath d='M-35 60V5c0-19 16-35 35-35s35 16 35 35v55' fill='none' stroke='black' stroke-width='1.5'/%3E%3Cline x1='-55' y1='60' x2='55' y2='60' stroke='black' stroke-width='3'/%3E%3Cpath d='M0-45l5-12h-10z' fill='black'/%3E%3C/g%3E%3C/svg%3E")`,
  'istanbul-sapphire': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Cg transform='translate(75,75)'%3E%3Cpath d='M-60 30c25-45 60-45 80-20 15 18 10 35-5 35-12 0-18-10-15-20 4-15 25-25 45-10' fill='none' stroke='black' stroke-width='2.5'/%3E%3Cpath d='M-60 10c20-35 50-35 70-15' fill='none' stroke='black' stroke-width='1.5'/%3E%3Ccircle cx='15' cy='5' r='4' fill='black'/%3E%3Ccircle cx='35' cy='15' r='3' fill='black'/%3E%3Ccircle cx='48' cy='30' r='2.5' fill='black'/%3E%3C/g%3E%3C/svg%3E")`,
  'madinah-emerald': `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg transform='translate(80,80)'%3E%3Cpath d='M-28 35C-28 10, -18 -15, 0 -24C18 -15, 28 10, 28 35Z' fill='black'/%3E%3Cline x1='0' y1='-24' x2='0' y2='-34' stroke='black' stroke-width='2'/%3E%3Ccircle cx='0' cy='-36' r='2' fill='black'/%3E%3Crect x='-54' y='-15' width='6' height='50' fill='black'/%3E%3Cpath d='M-55 -15L-51 -28 -47 -15Z' fill='black'/%3E%3Crect x='48' y='-15' width='6' height='50' fill='black'/%3E%3Cpath d='M47 -15L51 -28 55 -15Z' fill='black'/%3E%3Cpath d='M-65 42c22-8 44-8 65-2 21-6 43-6 65 2' fill='none' stroke='black' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
};

export const THEME_SIGNATURES: Record<ThemeId, ThemeSignature> = {
  'oxford-gold': {
    radius: '18px',
    border: '1px solid var(--border)',
    glow: '0 8px 28px -4px rgba(0, 0, 0, 0.45), 0 0 24px var(--accent-glow), inset 0 0 0 1px var(--accent-soft)',
    pattern: SIGNATURE_PATTERNS['oxford-gold'],
    motif: SIGNATURE_MOTIFS['oxford-gold'],
    headingFamily: "Georgia, 'Times New Roman', serif",
    headingTracking: 'normal',
    headingTransform: 'none',
    headingStyle: 'normal',
  },
  'kiswah-noir': {
    radius: '12px',
    border: '1px solid var(--border)',
    glow: '0 4px 16px rgba(0, 0, 0, 0.6)',
    pattern: SIGNATURE_PATTERNS['kiswah-noir'],
    motif: SIGNATURE_MOTIFS['kiswah-noir'],
    headingFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    headingTracking: '0.14em',
    headingTransform: 'uppercase',
    headingStyle: 'normal',
  },
  'imperial-violet': {
    radius: '22px',
    border: '1px solid var(--border)',
    glow: '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 12px 2px var(--accent-glow), inset 0 1px 0 rgba(226, 182, 255, 0.35), inset 0 -1px 0 rgba(11, 5, 20, 0.6)',
    pattern: SIGNATURE_PATTERNS['imperial-violet'],
    motif: SIGNATURE_MOTIFS['imperial-violet'],
    headingFamily: "Georgia, 'Times New Roman', serif",
    headingTracking: 'normal',
    headingTransform: 'none',
    headingStyle: 'italic',
  },
  'burgundy-velvet': {
    radius: '24px',
    border: '1px solid var(--border)',
    glow: '0 6px 24px rgba(0, 0, 0, 0.45), 0 0 20px var(--accent-glow), inset 0 2px 4px rgba(0, 0, 0, 0.3)',
    pattern: SIGNATURE_PATTERNS['burgundy-velvet'],
    motif: SIGNATURE_MOTIFS['burgundy-velvet'],
    headingFamily: "Georgia, 'Times New Roman', serif",
    headingTracking: 'normal',
    headingTransform: 'none',
    headingStyle: 'normal',
  },
  'desert-scroll': {
    radius: '28px 28px 18px 18px',
    border: '1px solid var(--border)',
    glow: '0 4px 18px -2px rgba(0, 0, 0, 0.5), 0 0 10px 1px var(--accent-glow)',
    pattern: SIGNATURE_PATTERNS['desert-scroll'],
    motif: SIGNATURE_MOTIFS['desert-scroll'],
    headingFamily: "Georgia, 'Times New Roman', serif",
    headingTracking: '0.01em',
    headingTransform: 'none',
    headingStyle: 'normal',
  },
  'istanbul-sapphire': {
    radius: '20px',
    border: '1px solid var(--border)',
    glow: '0 8px 32px -4px rgba(0, 0, 0, 0.5), 0 0 28px 2px var(--accent-glow), inset 0 1px 0 rgba(168, 199, 255, 0.35)',
    pattern: SIGNATURE_PATTERNS['istanbul-sapphire'],
    motif: SIGNATURE_MOTIFS['istanbul-sapphire'],
    headingFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    headingTracking: '0.02em',
    headingTransform: 'none',
    headingStyle: 'normal',
  },
  'madinah-emerald': {
    radius: '26px',
    border: '1.5px solid var(--border)',
    glow: '0 6px 26px -4px rgba(0, 0, 0, 0.45), 0 0 20px var(--accent-glow)',
    pattern: SIGNATURE_PATTERNS['madinah-emerald'],
    motif: SIGNATURE_MOTIFS['madinah-emerald'],
    headingFamily: "Georgia, 'Times New Roman', serif",
    headingTracking: '0.01em',
    headingTransform: 'none',
    headingStyle: 'normal',
  },
};

export const THEMES: Record<ThemeId, AppTheme> = {
  'oxford-gold': {
    id: 'oxford-gold',
    name: 'Oxford Gold',
    subtitle: 'Sovereign Navy & 24K Gold',
    description: 'Prestigious midnight scholarly navy surfaces bathed in radiant 24K celestial gold lattice.',
    signature: THEME_SIGNATURES['oxford-gold'],
    tokens: {
      '--bg-base': '#050914',
      '--bg-elev': '#091124',
      '--surface': '#0F1B36',
      '--surface-2': '#16274C',
      '--border': 'rgba(245,184,46,0.30)',
      '--accent': '#F5B82E',
      '--accent-2': '#D97706',
      '--accent-text': '#FDE047',
      '--on-accent': '#050914',
      '--accent-soft': 'rgba(245,184,46,0.16)',
      '--accent-glow': 'rgba(245,184,46,0.34)',
      '--card-sheen': 'linear-gradient(135deg, rgba(245,184,46,0.15) 0%, rgba(56,189,248,0.05) 60%)',
      '--card-sheen-line': 'rgba(253,224,71,0.25)',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#98B4D8',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-radius': THEME_SIGNATURES['oxford-gold'].radius,
      '--sig-border': THEME_SIGNATURES['oxford-gold'].border,
      '--sig-glow': THEME_SIGNATURES['oxford-gold'].glow,
      '--sig-pattern': THEME_SIGNATURES['oxford-gold'].pattern,
      '--sig-motif': THEME_SIGNATURES['oxford-gold'].motif,
      '--sig-head-family': THEME_SIGNATURES['oxford-gold'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['oxford-gold'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['oxford-gold'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['oxford-gold'].headingStyle,
    },
  },
  'kiswah-noir': {
    id: 'kiswah-noir',
    name: 'Haramain Noir',
    subtitle: 'OLED Black, Platinum & Rose-Gold',
    description: 'Ultra-deep #000000 OLED black surfaces framed by brushed platinum-silver and warm rose-champagne accents.',
    signature: THEME_SIGNATURES['kiswah-noir'],
    tokens: {
      '--bg-base': '#000000',
      '--bg-elev': '#08080B',
      '--surface': '#101015',
      '--surface-2': '#181820',
      '--border': 'rgba(226, 232, 240, 0.26)',
      '--accent': '#E5A572',
      '--accent-2': '#C27A44',
      '--accent-text': '#F7CBA4',
      '--on-accent': '#050507',
      '--accent-soft': 'rgba(229, 165, 114, 0.16)',
      '--accent-glow': 'rgba(229, 165, 114, 0.34)',
      '--card-sheen': 'linear-gradient(135deg, rgba(229, 165, 114, 0.15) 0%, rgba(226, 232, 240, 0.05) 60%)',
      '--card-sheen-line': 'rgba(247, 203, 164, 0.25)',
      '--text-primary': '#F8FAFC',
      '--text-secondary': '#A1A8B8',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-thread': '#E5A572',
      '--sig-radius': THEME_SIGNATURES['kiswah-noir'].radius,
      '--sig-border': THEME_SIGNATURES['kiswah-noir'].border,
      '--sig-glow': THEME_SIGNATURES['kiswah-noir'].glow,
      '--sig-pattern': THEME_SIGNATURES['kiswah-noir'].pattern,
      '--sig-motif': THEME_SIGNATURES['kiswah-noir'].motif,
      '--sig-head-family': THEME_SIGNATURES['kiswah-noir'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['kiswah-noir'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['kiswah-noir'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['kiswah-noir'].headingStyle,
    },
  },
  'imperial-violet': {
    id: 'imperial-violet',
    name: 'Imperial Violet',
    subtitle: 'Amethyst Velvet & Electric Orchid',
    description: 'Opulent Ottoman palace amethyst velvet surfaces illuminated by electric orchid and rose-champagne accents.',
    signature: THEME_SIGNATURES['imperial-violet'],
    tokens: {
      '--bg-base': '#090414',
      '--bg-elev': '#110824',
      '--surface': '#180C32',
      '--surface-2': '#231246',
      '--border': 'rgba(192,132,252,0.32)',
      '--accent': '#D946EF',
      '--accent-2': '#9333EA',
      '--accent-text': '#F5D0FE',
      '--on-accent': '#090414',
      '--accent-soft': 'rgba(217,70,239,0.17)',
      '--accent-glow': 'rgba(217,70,239,0.34)',
      '--card-sheen': 'linear-gradient(135deg, rgba(217,70,239,0.16) 0%, rgba(147,51,234,0.06) 60%)',
      '--card-sheen-line': 'rgba(245,208,254,0.24)',
      '--text-primary': '#FAF5FF',
      '--text-secondary': '#C8B2F0',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-radius': THEME_SIGNATURES['imperial-violet'].radius,
      '--sig-border': THEME_SIGNATURES['imperial-violet'].border,
      '--sig-glow': THEME_SIGNATURES['imperial-violet'].glow,
      '--sig-pattern': THEME_SIGNATURES['imperial-violet'].pattern,
      '--sig-motif': THEME_SIGNATURES['imperial-violet'].motif,
      '--sig-head-family': THEME_SIGNATURES['imperial-violet'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['imperial-violet'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['imperial-violet'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['imperial-violet'].headingStyle,
    },
  },
  'burgundy-velvet': {
    id: 'burgundy-velvet',
    name: 'Burgundy Velvet',
    subtitle: 'Deep Onyx & Satin Crimson',
    description: 'Deep onyx and dark wine surfaces with passionate ruby-coral highlights.',
    signature: THEME_SIGNATURES['burgundy-velvet'],
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
      '--card-sheen-line': 'rgba(244, 162, 176, 0.24)',
      '--text-primary': '#F5F2ED',
      '--text-secondary': '#C9BEB9',
      '--success': '#8FD6A8',
      '--warning': '#E8C07A',
      '--danger': '#E07A7A',
      '--sig-radius': THEME_SIGNATURES['burgundy-velvet'].radius,
      '--sig-border': THEME_SIGNATURES['burgundy-velvet'].border,
      '--sig-glow': THEME_SIGNATURES['burgundy-velvet'].glow,
      '--sig-pattern': THEME_SIGNATURES['burgundy-velvet'].pattern,
      '--sig-motif': THEME_SIGNATURES['burgundy-velvet'].motif,
      '--sig-head-family': THEME_SIGNATURES['burgundy-velvet'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['burgundy-velvet'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['burgundy-velvet'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['burgundy-velvet'].headingStyle,
    },
  },
  'desert-scroll': {
    id: 'desert-scroll',
    name: 'Desert Scroll',
    subtitle: 'Arabian Oud & Burnished Copper',
    description: 'Aged manuscript vellum textures layered with burnished Arabian copper and rich Mamluk amber glow.',
    signature: THEME_SIGNATURES['desert-scroll'],
    tokens: {
      '--bg-base': '#100804',
      '--bg-elev': '#190D07',
      '--surface': '#24140B',
      '--surface-2': '#321C10',
      '--border': 'rgba(234,123,51,0.32)',
      '--accent': '#EA7B33',
      '--accent-2': '#C25116',
      '--accent-text': '#FCD385',
      '--on-accent': '#100804',
      '--accent-soft': 'rgba(234,123,51,0.17)',
      '--accent-glow': 'rgba(234,123,51,0.34)',
      '--card-sheen': 'linear-gradient(135deg, rgba(234,123,51,0.15) 0%, rgba(194,81,22,0.05) 60%)',
      '--card-sheen-line': 'rgba(252,211,133,0.24)',
      '--text-primary': '#FDF4E7',
      '--text-secondary': '#D4B292',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-radius': THEME_SIGNATURES['desert-scroll'].radius,
      '--sig-border': THEME_SIGNATURES['desert-scroll'].border,
      '--sig-glow': THEME_SIGNATURES['desert-scroll'].glow,
      '--sig-pattern': THEME_SIGNATURES['desert-scroll'].pattern,
      '--sig-motif': THEME_SIGNATURES['desert-scroll'].motif,
      '--sig-head-family': THEME_SIGNATURES['desert-scroll'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['desert-scroll'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['desert-scroll'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['desert-scroll'].headingStyle,
    },
  },
  'istanbul-sapphire': {
    id: 'istanbul-sapphire',
    name: 'Royal Sapphire',
    subtitle: 'Abyssal Sapphire & Ice-Cyan',
    description: 'Abyssal Bosphorus waters paired with crystalline ice-cyan highlights and Iznik ceramic waves.',
    signature: THEME_SIGNATURES['istanbul-sapphire'],
    tokens: {
      '--bg-base': '#030B16',
      '--bg-elev': '#061426',
      '--surface': '#0A203B',
      '--surface-2': '#102E52',
      '--border': 'rgba(56,189,248,0.32)',
      '--accent': '#22D3EE',
      '--accent-2': '#0284C7',
      '--accent-text': '#7DD3FC',
      '--on-accent': '#031524',
      '--accent-soft': 'rgba(34,211,238,0.17)',
      '--accent-glow': 'rgba(56,189,248,0.36)',
      '--card-sheen': 'linear-gradient(135deg, rgba(56,189,248,0.16) 0%, rgba(2,132,199,0.05) 60%)',
      '--card-sheen-line': 'rgba(125,211,252,0.26)',
      '--text-primary': '#F0F9FF',
      '--text-secondary': '#94C2E8',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-radius': THEME_SIGNATURES['istanbul-sapphire'].radius,
      '--sig-border': THEME_SIGNATURES['istanbul-sapphire'].border,
      '--sig-glow': THEME_SIGNATURES['istanbul-sapphire'].glow,
      '--sig-pattern': THEME_SIGNATURES['istanbul-sapphire'].pattern,
      '--sig-motif': THEME_SIGNATURES['istanbul-sapphire'].motif,
      '--sig-head-family': THEME_SIGNATURES['istanbul-sapphire'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['istanbul-sapphire'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['istanbul-sapphire'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['istanbul-sapphire'].headingStyle,
    },
  },
  'madinah-emerald': {
    id: 'madinah-emerald',
    name: 'Madinah Emerald',
    subtitle: 'Rawdah Emerald & Cream-Gold',
    description: 'Sacred Rawdah emerald surfaces adorned with chandelier cream-gold accents and palm-frond ogive lattices.',
    signature: THEME_SIGNATURES['madinah-emerald'],
    tokens: {
      '--bg-base': '#04120C',
      '--bg-elev': '#071C14',
      '--surface': '#0B281D',
      '--surface-2': '#113829',
      '--border': 'rgba(52,211,153,0.30)',
      '--accent': '#E8C988',
      '--accent-2': '#C89F56',
      '--accent-text': '#F7E2B8',
      '--on-accent': '#04140E',
      '--accent-soft': 'rgba(52,211,153,0.16)',
      '--accent-glow': 'rgba(232,201,136,0.32)',
      '--card-sheen': 'linear-gradient(135deg, rgba(232,201,136,0.14) 0%, rgba(16,185,129,0.06) 60%)',
      '--card-sheen-line': 'rgba(247,226,184,0.24)',
      '--text-primary': '#F4FBF7',
      '--text-secondary': '#9ED1B8',
      '--success': '#34D399',
      '--warning': '#FBBF24',
      '--danger': '#FB7185',
      '--sig-radius': THEME_SIGNATURES['madinah-emerald'].radius,
      '--sig-border': THEME_SIGNATURES['madinah-emerald'].border,
      '--sig-glow': THEME_SIGNATURES['madinah-emerald'].glow,
      '--sig-pattern': THEME_SIGNATURES['madinah-emerald'].pattern,
      '--sig-motif': THEME_SIGNATURES['madinah-emerald'].motif,
      '--sig-head-family': THEME_SIGNATURES['madinah-emerald'].headingFamily,
      '--sig-head-tracking': THEME_SIGNATURES['madinah-emerald'].headingTracking,
      '--sig-head-transform': THEME_SIGNATURES['madinah-emerald'].headingTransform,
      '--sig-head-style': THEME_SIGNATURES['madinah-emerald'].headingStyle,
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
  'oxford-gold': '#050914',
  'kiswah-noir': '#000000',
  'imperial-violet': '#0B0414',
  'burgundy-velvet': '#0B0B0B',
  'desert-scroll': '#100703',
  'istanbul-sapphire': '#030814',
  'madinah-emerald': '#030C07',
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


