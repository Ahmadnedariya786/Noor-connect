import React, { useState, useEffect, useId, useMemo, memo, useCallback } from 'react';

/**
 * SIRAJ — 5-EDITION LIVING ISLAMIC EMBLEM ENGINE (<NoorDynamicLogo /> / <BrandLogo />)
 * 
 * Displays an extraordinary, luxury geometric Islamic emblem that dynamically
 * adapts to all 8 Royal Themes via CSS variables, supports 5 handcrafted
 * Masterpiece Sacred Editions, and enforces ZERO backdrop-filter and ZERO SVG drop-shadow.
 */

export type NoorLogoSize = 'sm' | 'md' | 'lg' | 'xl';
export type NoorLogoEditionId = 0 | 1 | 2 | 3 | 4;

export interface NoorDynamicLogoProps {
  size?: NoorLogoSize;
  customSize?: number;
  edition?: NoorLogoEditionId;
  animated?: boolean;
  className?: string;
  showBadge?: boolean;
  onClick?: () => void;
  noFilters?: boolean;
}

export interface LogoEditionMeta {
  id: NoorLogoEditionId;
  name: string;
  shortName: string;
  shortLabel: string;
  cardTitle: string;
  fullTitle: string;
  subtitle: string;
  arabicName: string;
}

export const NOOR_LOGO_EDITIONS: readonly LogoEditionMeta[] = [
  {
    id: 0,
    name: 'Luminous Sanctuary Arch',
    shortName: 'Sanctuary Arch',
    shortLabel: 'Sanctuary\nArch',
    cardTitle: 'Sanctuary Arch',
    fullTitle: 'Luminous Sanctuary Arch (Flagship)',
    subtitle: 'Pointed Islamic Arch, Glowing Dome & Radiant Crescent',
    arabicName: 'محراب النور والشهاب المبارك',
  },
  {
    id: 1,
    name: 'Kaaba Orbit',
    shortName: 'Kaaba Orbit',
    shortLabel: 'Kaaba\nOrbit',
    cardTitle: 'Kaaba Orbit',
    fullTitle: 'Kaaba Orbit & Celestial Tawaf',
    subtitle: 'Minimal Isometric Kaaba & 3 Tawaf Light Orbs',
    arabicName: 'طواف الكعبة الشريفة المداري',
  },
  {
    id: 2,
    name: 'Prayer Niche Arch',
    shortName: 'Prayer Niche',
    shortLabel: 'Prayer\nNiche',
    cardTitle: 'Prayer Niche',
    fullTitle: 'Prayer Niche Arch & Crescent',
    subtitle: 'Layered Dual-Arch Silhouette & Geometric Fringe Accent',
    arabicName: 'مشكاة المحراب والهلال الذهبي',
  },
  {
    id: 3,
    name: 'Dawn Horizon',
    shortName: 'Dawn Horizon',
    shortLabel: 'Dawn\nHorizon',
    cardTitle: 'Dawn Horizon',
    fullTitle: 'Dawn Horizon & Rising Dome',
    subtitle: 'Spherical Fajr Dome Rising Over Geometric Reflection Lines',
    arabicName: 'أفق الفجر والقبة المشرقة',
  },
  {
    id: 4,
    name: 'Siraj Star Emblem',
    shortName: 'Siraj Star',
    shortLabel: 'Siraj\nStar',
    cardTitle: 'Siraj Star',
    fullTitle: 'Siraj Star Emblem & Rub el Hizb',
    subtitle: 'Luminous Central Lamp Mark in 8-Point Geometric Star',
    arabicName: 'نجمة السراج والمصباح المنير',
  },
] as const;

export const SELECTED_LOGO_KEY = 'siraj_selected_logo_edition';
const LEGACY_SELECTED_LOGO_KEY = 'noor_selected_logo_edition';
const STORAGE_LAUNCH_KEY = 'siraj_logo_launch_edition_v1';
const STORAGE_MANUAL_KEY = 'siraj_logo_manual_edition';
export const LOGO_EDITION_CHANGE_EVENT = 'siraj-logo-edition-change';
export const LOGO_EDITION_CHANGED_EVENT = 'siraj-logo-edition-changed';

export function getSelectedLogoEdition(): NoorLogoEditionId {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(SELECTED_LOGO_KEY) || localStorage.getItem(LEGACY_SELECTED_LOGO_KEY);
    if (val !== null) {
      const idx = parseInt(val, 10);
      if (!isNaN(idx) && idx >= 0 && idx <= 4) {
        return idx as NoorLogoEditionId;
      }
    }
    const manual = localStorage.getItem(STORAGE_MANUAL_KEY);
    if (manual !== null) {
      const idx = parseInt(manual, 10);
      if (!isNaN(idx) && idx >= 0 && idx <= 4) {
        return idx as NoorLogoEditionId;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

export function getActiveLogoEdition(): NoorLogoEditionId {
  return getSelectedLogoEdition();
}

export function setSelectedLogoEdition(edition: NoorLogoEditionId): void {
  if (typeof window === 'undefined') return;
  try {
    const safeId = (Math.max(0, Math.min(4, Math.floor(edition))) || 0) as NoorLogoEditionId;
    localStorage.setItem(SELECTED_LOGO_KEY, String(safeId));
    localStorage.setItem(LEGACY_SELECTED_LOGO_KEY, String(safeId));
    localStorage.setItem(STORAGE_MANUAL_KEY, String(safeId));
    localStorage.setItem(STORAGE_LAUNCH_KEY, String(safeId));
    window.dispatchEvent(new CustomEvent(LOGO_EDITION_CHANGE_EVENT, { detail: { edition: safeId } }));
    window.dispatchEvent(new CustomEvent(LOGO_EDITION_CHANGED_EVENT, { detail: safeId }));
    window.dispatchEvent(new CustomEvent('noor-logo-edition-change', { detail: { edition: safeId } }));
    window.dispatchEvent(new CustomEvent('noor-logo-edition-changed', { detail: safeId }));
  } catch (e) {
    console.warn('Failed to persist logo edition:', e);
  }
}

export function cycleLogoEdition(): NoorLogoEditionId {
  const current = getSelectedLogoEdition();
  const next = ((current + 1) % 5) as NoorLogoEditionId;
  setSelectedLogoEdition(next);
  return next;
}

const SIZE_MAP: Record<NoorLogoSize, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 104,
};

/**
 * Returns a self-contained, high-resolution SVG string for any of the 5 Siraj Editions.
 * Used for offscreen HTML5 canvas rendering and standalone exports.
 */
export function getLogoEditionStaticSvgString(edition: NoorLogoEditionId = 0, size = 200): string {
  const safeId = (Math.max(0, Math.min(4, Math.floor(edition))) || 0) as NoorLogoEditionId;
  const pfx = `siraj-static-logo-${safeId}`;

  const defs = `<defs>` +
    `<linearGradient id="${pfx}-gold-primary" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="#FFFDF0"/>` +
      `<stop offset="25%" stop-color="#FDE08A"/>` +
      `<stop offset="60%" stop-color="#D4AF37"/>` +
      `<stop offset="100%" stop-color="#8C6614"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-gold-radiant" x1="0%" y1="100%" x2="100%" y2="0%">` +
      `<stop offset="0%" stop-color="#8C6614"/>` +
      `<stop offset="40%" stop-color="#F5D061"/>` +
      `<stop offset="80%" stop-color="#FFF8D6"/>` +
      `<stop offset="100%" stop-color="#D4AF37"/>` +
    `</linearGradient>` +
    `<radialGradient id="${pfx}-aura" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="#FDE08A" stop-opacity="0.75"/>` +
      `<stop offset="50%" stop-color="#D4AF37" stop-opacity="0.3"/>` +
      `<stop offset="100%" stop-color="#0B132B" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<linearGradient id="${pfx}-glass" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#D4AF37" stop-opacity="0.2"/>` +
      `<stop offset="100%" stop-color="#050B18" stop-opacity="0.88"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-kaaba-top" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="#2D3748"/>` +
      `<stop offset="100%" stop-color="#1A202C"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-kaaba-left" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#1A202C"/>` +
      `<stop offset="100%" stop-color="#0B0F19"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-kaaba-right" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#111827"/>` +
      `<stop offset="100%" stop-color="#030712"/>` +
    `</linearGradient>` +
  `</defs>`;

  let body = '';
  switch (safeId) {
    case 0:
      // Edition 1 — Luminous Sanctuary Arch (Default & Flagship Icon)
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.4" stroke-dasharray="3 4" fill="none" opacity="0.6"/>` +
        `<circle cx="100" cy="108" r="72" fill="url(#${pfx}-aura)" opacity="0.6"/>` +
        `<path d="M 64 125 C 64 80 136 80 136 125 Z" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2" opacity="0.75"/>` +
        `<path d="M 52 165 L 52 110 C 52 75 100 42 100 42 C 100 42 148 75 148 110 L 148 165 Z" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.6"/>` +
        `<path d="M 62 165 L 62 115 C 62 85 100 58 100 58 C 100 58 138 85 138 115 L 138 165" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.85"/>` +
        `<path d="M 108 85 C 92 85 80 98 80 114 C 80 130 93 143 109 143 C 117 143 124 139 129 133 C 118 138 102 133 97 121 C 92 109 98 94 109 89 C 108.7 86 108.3 85 108 85 Z" fill="url(#${pfx}-gold-primary)"/>` +
        `<polygon points="116,98 118,103 123,104 119,107 120,112 116,109 112,112 113,107 109,104 114,103" fill="#FFFDF0"/>` +
        `<line x1="44" y1="165" x2="156" y2="165" stroke="url(#${pfx}-gold-primary)" stroke-width="2.6" stroke-linecap="round"/>` +
        `<line x1="56" y1="171" x2="144" y2="171" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.6" stroke-linecap="round" opacity="0.7"/>` +
        `<circle cx="100" cy="38" r="3.5" fill="url(#${pfx}-gold-primary)"/>` +
        `<circle cx="100" cy="38" r="1.5" fill="#FFFDF0"/>` +
      `</g>`;
      break;

    case 1:
      // Edition 2 — Kaaba Orbit
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 4" fill="none" opacity="0.5"/>` +
        `<circle cx="100" cy="100" r="75" fill="url(#${pfx}-aura)" opacity="0.65"/>` +
        `<g transform="rotate(-15 100 110)">` +
          `<ellipse cx="100" cy="110" rx="82" ry="34" fill="none" stroke="url(#${pfx}-gold-primary)" stroke-width="2" stroke-dasharray="6 4" opacity="0.85"/>` +
          `<ellipse cx="100" cy="110" rx="66" ry="28" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" stroke-dasharray="2 3" opacity="0.5"/>` +
        `</g>` +
        `<g>` +
          `<polygon points="100,68 130,83 100,98 70,83" fill="url(#${pfx}-kaaba-top)" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
          `<polygon points="70,83 100,98 100,138 70,123" fill="url(#${pfx}-kaaba-left)" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
          `<polygon points="100,98 130,83 130,123 100,138" fill="url(#${pfx}-kaaba-right)" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
          `<polygon points="70,91 100,106 100,111 70,96" fill="url(#${pfx}-gold-primary)"/>` +
          `<polygon points="100,106 130,91 130,96 100,111" fill="url(#${pfx}-gold-primary)"/>` +
          `<polygon points="112,104 122,99 122,119 112,124" fill="url(#${pfx}-gold-radiant)" stroke="url(#${pfx}-gold-primary)" stroke-width="0.8"/>` +
        `</g>` +
        `<circle cx="34" cy="120" r="5" fill="url(#${pfx}-gold-primary)"/><circle cx="34" cy="120" r="2" fill="#FFFDF0"/>` +
        `<circle cx="166" cy="96" r="4.5" fill="url(#${pfx}-gold-primary)"/><circle cx="166" cy="96" r="1.8" fill="#FFFDF0"/>` +
        `<circle cx="118" cy="144" r="4" fill="url(#${pfx}-gold-primary)"/><circle cx="118" cy="144" r="1.5" fill="#FFFDF0"/>` +
      `</g>`;
      break;

    case 2:
      // Edition 3 — Prayer Niche Arch
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 4" fill="none" opacity="0.5"/>` +
        `<ellipse cx="100" cy="100" rx="70" ry="70" fill="url(#${pfx}-aura)" opacity="0.6"/>` +
        `<path d="M 44 168 L 44 100 C 44 60 100 32 100 32 C 100 32 156 60 156 100 L 156 168 Z" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2"/>` +
        `<path d="M 60 168 L 60 108 C 60 76 100 52 100 52 C 100 52 140 76 140 108 L 140 168 Z" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.8"/>` +
        `<path d="M 60 108 L 68 108 L 68 116 L 76 116" fill="none" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<path d="M 140 108 L 132 108 L 132 116 L 124 116" fill="none" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<path d="M 104 88 C 92 88 84 98 84 110 C 84 122 92 132 104 132 C 110 132 116 129 119 124 C 111 127 99 123 96 114 C 92 104 97 93 105 89 C 104.7 88.5 104.3 88 104 88 Z" fill="url(#${pfx}-gold-primary)"/>` +
        `<polygon points="112,98 113.5,102 117,103 114,105 115,109 112,106.5 109,109 110,105 107,103 110.5,102" fill="#FFFDF0"/>` +
        `<line x1="36" y1="168" x2="164" y2="168" stroke="url(#${pfx}-gold-primary)" stroke-width="3" stroke-linecap="round"/>` +
        `<line x1="50" y1="174" x2="150" y2="174" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-linecap="round" opacity="0.75"/>` +
      `</g>`;
      break;

    case 3:
      // Edition 4 — Dawn Horizon
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 4" fill="none" opacity="0.5"/>` +
        `<circle cx="100" cy="115" r="70" fill="url(#${pfx}-aura)" opacity="0.75"/>` +
        `<path d="M 40 120 C 40 70 160 70 160 120 Z" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2"/>` +
        `<path d="M 60 120 C 60 85 100 70 100 70 C 100 70 140 85 140 120" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.4" opacity="0.7"/>` +
        `<line x1="100" y1="70" x2="100" y2="52" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
        `<path d="M 103 44 C 98 44 94 48 94 53 C 94 57 97 60 102 61 C 98 59 96 56 96 53 C 96 50 98 47 103 46 Z" fill="url(#${pfx}-gold-primary)"/>` +
        `<polygon points="107,50 108,52 110,52.5 108.5,54 109,56 107,55 105,56 105.5,54 104,52.5 106,52" fill="#FFFDF0"/>` +
        `<circle cx="100" cy="120" r="14" fill="url(#${pfx}-gold-radiant)" opacity="0.5"/>` +
        `<line x1="28" y1="120" x2="172" y2="120" stroke="url(#${pfx}-gold-primary)" stroke-width="2.8" stroke-linecap="round"/>` +
        `<line x1="42" y1="130" x2="158" y2="130" stroke="url(#${pfx}-gold-radiant)" stroke-width="2" stroke-linecap="round" opacity="0.85"/>` +
        `<line x1="56" y1="140" x2="144" y2="140" stroke="url(#${pfx}-gold-primary)" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>` +
        `<line x1="72" y1="150" x2="128" y2="150" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>` +
        `<line x1="86" y1="160" x2="114" y2="160" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2" stroke-linecap="round" opacity="0.4"/>` +
      `</g>`;
      break;

    case 4:
      // Edition 5 — Siraj Star Emblem
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 4" fill="none" opacity="0.5"/>` +
        `<circle cx="100" cy="100" r="75" fill="url(#${pfx}-aura)" opacity="0.6"/>` +
        `<rect x="42" y="42" width="116" height="116" rx="8" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
        `<rect x="42" y="42" width="116" height="116" rx="8" transform="rotate(45 100 100)" fill="url(#${pfx}-glass)" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
        `<rect x="54" y="54" width="92" height="92" rx="4" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.8"/>` +
        `<rect x="54" y="54" width="92" height="92" rx="4" transform="rotate(45 100 100)" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="3 3" opacity="0.8"/>` +
        `<circle cx="100" cy="18" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="182" cy="100" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="100" cy="182" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="18" cy="100" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="158" cy="42" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="158" cy="158" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="42" cy="158" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="42" cy="42" r="3" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
        `<circle cx="100" cy="100" r="26" fill="url(#${pfx}-gold-radiant)" opacity="0.25"/>` +
        `<circle cx="100" cy="77" r="4" fill="none" stroke="url(#${pfx}-gold-primary)" stroke-width="1.5"/>` +
        `<line x1="100" y1="81" x2="100" y2="86" stroke="url(#${pfx}-gold-primary)" stroke-width="1.5"/>` +
        `<path d="M 88 92 L 112 92 L 106 86 L 94 86 Z" fill="url(#${pfx}-gold-primary)"/>` +
        `<polygon points="86,94 114,94 108,118 92,118" fill="url(#${pfx}-gold-radiant)" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<polygon points="90,118 110,118 106,124 94,124" fill="url(#${pfx}-gold-primary)"/>` +
        `<path d="M 100 98 C 96 104 96 108 100 112 C 104 108 104 104 100 98 Z" fill="#FFFDF0"/>` +
      `</g>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}" fill="none">` +
    defs +
    body +
  `</svg>`;
}

// ─── SVG DEFS COMPONENT ───

const SvgDefs: React.FC<{ prefix: string; noFilters?: boolean }> = memo(({ prefix }) => (
  <defs>
    {/* Theme-Adaptive Living Gradients via CSS Variables */}
    <linearGradient id={`${prefix}-gold-primary`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="var(--accent-primary, #FFFDF0)" />
      <stop offset="25%" stopColor="var(--accent, #FDE08A)" />
      <stop offset="60%" stopColor="var(--accent, #D4AF37)" />
      <stop offset="100%" stopColor="var(--accent-secondary, #8C6614)" />
    </linearGradient>

    <linearGradient id={`${prefix}-gold-radiant`} x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="var(--accent-secondary, #8C6614)" />
      <stop offset="40%" stopColor="var(--accent, #F5D061)" />
      <stop offset="80%" stopColor="var(--accent-primary, #FFF8D6)" />
      <stop offset="100%" stopColor="var(--accent, #D4AF37)" />
    </linearGradient>

    <radialGradient id={`${prefix}-aura`} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="var(--accent-glow, rgba(212,175,55,0.4))" stopOpacity="0.8" />
      <stop offset="50%" stopColor="var(--accent-soft, rgba(212,175,55,0.15))" stopOpacity="0.3" />
      <stop offset="100%" stopColor="var(--surface, #0B132B)" stopOpacity="0" />
    </radialGradient>

    <linearGradient id={`${prefix}-glass`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="var(--accent-soft, rgba(212,175,55,0.18))" stopOpacity="0.5" />
      <stop offset="100%" stopColor="var(--surface, #050B18)" stopOpacity="0.88" />
    </linearGradient>

    <linearGradient id={`${prefix}-kaaba-top`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#2D3748" />
      <stop offset="100%" stopColor="#1A202C" />
    </linearGradient>

    <linearGradient id={`${prefix}-kaaba-left`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#1A202C" />
      <stop offset="100%" stopColor="#0B0F19" />
    </linearGradient>

    <linearGradient id={`${prefix}-kaaba-right`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#111827" />
      <stop offset="100%" stopColor="#030712" />
    </linearGradient>
  </defs>
));
SvgDefs.displayName = 'SvgDefs';

// ─── 5 LIVING LOGO VECTOR IMPLEMENTATIONS ───

// Edition 0 — Luminous Sanctuary Arch (Flagship)
const Edition0Vector: React.FC<{ prefix: string; animated: boolean }> = memo(({ prefix, animated }) => (
  <g className={animated ? 'animate-[noorGentleFloat_6s_ease-in-out_infinite]' : ''}>
    <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.4" strokeDasharray="3 4" fill="none" opacity="0.6" />
    <circle cx="100" cy="108" r="72" fill={`url(#${prefix}-aura)`} opacity="0.6" />
    <path d="M 64 125 C 64 80 136 80 136 125 Z" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.2" opacity="0.75" />
    <path d="M 52 165 L 52 110 C 52 75 100 42 100 42 C 100 42 148 75 148 110 L 148 165 Z" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.6" />
    <path d="M 62 165 L 62 115 C 62 85 100 58 100 58 C 100 58 138 85 138 115 L 138 165" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="2 3" opacity="0.85" />
    <path d="M 108 85 C 92 85 80 98 80 114 C 80 130 93 143 109 143 C 117 143 124 139 129 133 C 118 138 102 133 97 121 C 92 109 98 94 109 89 C 108.7 86 108.3 85 108 85 Z" fill={`url(#${prefix}-gold-primary)`} />
    <polygon points="116,98 118,103 123,104 119,107 120,112 116,109 112,112 113,107 109,104 114,103" fill="#FFFDF0" />
    <line x1="44" y1="165" x2="156" y2="165" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.6" strokeLinecap="round" />
    <line x1="56" y1="171" x2="144" y2="171" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
    <circle cx="100" cy="38" r="3.5" fill={`url(#${prefix}-gold-primary)`} />
    <circle cx="100" cy="38" r="1.5" fill="#FFFDF0" />
  </g>
));
Edition0Vector.displayName = 'Edition0Vector';

// Edition 1 — Kaaba Orbit
const Edition1Vector: React.FC<{ prefix: string; animated: boolean }> = memo(({ prefix, animated }) => (
  <g className={animated ? 'animate-[noorGentleFloat_6s_ease-in-out_infinite]' : ''}>
    <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.5" />
    <circle cx="100" cy="100" r="75" fill={`url(#${prefix}-aura)`} opacity="0.65" />
    <g transform="rotate(-15 100 110)">
      <ellipse cx="100" cy="110" rx="82" ry="34" fill="none" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" strokeDasharray="6 4" opacity="0.85" />
      <ellipse cx="100" cy="110" rx="66" ry="28" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
    </g>
    <g>
      <polygon points="100,68 130,83 100,98 70,83" fill={`url(#${prefix}-kaaba-top)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
      <polygon points="70,83 100,98 100,138 70,123" fill={`url(#${prefix}-kaaba-left)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
      <polygon points="100,98 130,83 130,123 100,138" fill={`url(#${prefix}-kaaba-right)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
      <polygon points="70,91 100,106 100,111 70,96" fill={`url(#${prefix}-gold-primary)`} />
      <polygon points="100,106 130,91 130,96 100,111" fill={`url(#${prefix}-gold-primary)`} />
      <polygon points="112,104 122,99 122,119 112,124" fill={`url(#${prefix}-gold-radiant)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="0.8" />
    </g>
    <circle cx="34" cy="120" r="5" fill={`url(#${prefix}-gold-primary)`} /><circle cx="34" cy="120" r="2" fill="#FFFDF0" />
    <circle cx="166" cy="96" r="4.5" fill={`url(#${prefix}-gold-primary)`} /><circle cx="166" cy="96" r="1.8" fill="#FFFDF0" />
    <circle cx="118" cy="144" r="4" fill={`url(#${prefix}-gold-primary)`} /><circle cx="118" cy="144" r="1.5" fill="#FFFDF0" />
  </g>
));
Edition1Vector.displayName = 'Edition1Vector';

// Edition 2 — Prayer Niche Arch
const Edition2Vector: React.FC<{ prefix: string; animated: boolean }> = memo(({ prefix, animated }) => (
  <g className={animated ? 'animate-[noorGentleFloat_6s_ease-in-out_infinite]' : ''}>
    <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.5" />
    <ellipse cx="100" cy="100" rx="70" ry="70" fill={`url(#${prefix}-aura)`} opacity="0.6" />
    <path d="M 44 168 L 44 100 C 44 60 100 32 100 32 C 100 32 156 60 156 100 L 156 168 Z" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.2" />
    <path d="M 60 168 L 60 108 C 60 76 100 52 100 52 C 100 52 140 76 140 108 L 140 168 Z" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.8" />
    <path d="M 60 108 L 68 108 L 68 116 L 76 116" fill="none" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.2" />
    <path d="M 140 108 L 132 108 L 132 116 L 124 116" fill="none" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.2" />
    <path d="M 104 88 C 92 88 84 98 84 110 C 84 122 92 132 104 132 C 110 132 116 129 119 124 C 111 127 99 123 96 114 C 92 104 97 93 105 89 C 104.7 88.5 104.3 88 104 88 Z" fill={`url(#${prefix}-gold-primary)`} />
    <polygon points="112,98 113.5,102 117,103 114,105 115,109 112,106.5 109,109 110,105 107,103 110.5,102" fill="#FFFDF0" />
    <line x1="36" y1="168" x2="164" y2="168" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="3" strokeLinecap="round" />
    <line x1="50" y1="174" x2="150" y2="174" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
  </g>
));
Edition2Vector.displayName = 'Edition2Vector';

// Edition 3 — Dawn Horizon
const Edition3Vector: React.FC<{ prefix: string; animated: boolean }> = memo(({ prefix, animated }) => (
  <g className={animated ? 'animate-[noorGentleFloat_6s_ease-in-out_infinite]' : ''}>
    <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.5" />
    <circle cx="100" cy="115" r="70" fill={`url(#${prefix}-aura)`} opacity="0.75" />
    <path d="M 40 120 C 40 70 160 70 160 120 Z" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.2" />
    <path d="M 60 120 C 60 85 100 70 100 70 C 100 70 140 85 140 120" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.4" opacity="0.7" />
    <line x1="100" y1="70" x2="100" y2="52" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />
    <path d="M 103 44 C 98 44 94 48 94 53 C 94 57 97 60 102 61 C 98 59 96 56 96 53 C 96 50 98 47 103 46 Z" fill={`url(#${prefix}-gold-primary)`} />
    <polygon points="107,50 108,52 110,52.5 108.5,54 109,56 107,55 105,56 105.5,54 104,52.5 106,52" fill="#FFFDF0" />
    <circle cx="100" cy="120" r="14" fill={`url(#${prefix}-gold-radiant)`} opacity="0.5" />
    <line x1="28" y1="120" x2="172" y2="120" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.8" strokeLinecap="round" />
    <line x1="42" y1="130" x2="158" y2="130" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
    <line x1="56" y1="140" x2="144" y2="140" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
    <line x1="72" y1="150" x2="128" y2="150" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
    <line x1="86" y1="160" x2="114" y2="160" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
  </g>
));
Edition3Vector.displayName = 'Edition3Vector';

// Edition 4 — Siraj Star Emblem
const Edition4Vector: React.FC<{ prefix: string; animated: boolean }> = memo(({ prefix, animated }) => (
  <g className={animated ? 'animate-[noorGentleFloat_6s_ease-in-out_infinite]' : ''}>
    <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 4" fill="none" opacity="0.5" />
    <circle cx="100" cy="100" r="75" fill={`url(#${prefix}-aura)`} opacity="0.6" />
    <rect x="42" y="42" width="116" height="116" rx="8" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />
    <rect x="42" y="42" width="116" height="116" rx="8" transform="rotate(45 100 100)" fill={`url(#${prefix}-glass)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />
    <rect x="54" y="54" width="92" height="92" rx="4" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
    <rect x="54" y="54" width="92" height="92" rx="4" transform="rotate(45 100 100)" fill="none" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" strokeDasharray="3 3" opacity="0.8" />
    <circle cx="100" cy="18" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="182" cy="100" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="100" cy="182" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="18" cy="100" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="158" cy="42" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="158" cy="158" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="42" cy="158" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="42" cy="42" r="3" fill="#FFFDF0" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
    <circle cx="100" cy="100" r="26" fill={`url(#${prefix}-gold-radiant)`} opacity="0.25" />
    <circle cx="100" cy="77" r="4" fill="none" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.5" />
    <line x1="100" y1="81" x2="100" y2="86" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.5" />
    <path d="M 88 92 L 112 92 L 106 86 L 94 86 Z" fill={`url(#${prefix}-gold-primary)`} />
    <polygon points="86,94 114,94 108,118 92,118" fill={`url(#${prefix}-gold-radiant)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.2" />
    <polygon points="90,118 110,118 106,124 94,124" fill={`url(#${prefix}-gold-primary)`} />
    <path d="M 100 98 C 96 104 96 108 100 112 C 104 108 104 104 100 98 Z" fill="#FFFDF0" />
  </g>
));
Edition4Vector.displayName = 'Edition4Vector';

// ─── MAIN LIVING LOGO COMPONENT ───

export const NoorDynamicLogo: React.FC<NoorDynamicLogoProps> = ({
  size = 'md',
  customSize,
  edition,
  animated = true,
  className = '',
  showBadge = false,
  onClick,
  noFilters = false,
}) => {
  const reactId = useId().replace(/:/g, '');
  const prefix = `siraj-logo-${reactId}`;

  const [activeEdition, setActiveEdition] = useState<NoorLogoEditionId>(() => {
    if (edition !== undefined) return edition;
    return getSelectedLogoEdition();
  });

  useEffect(() => {
    if (edition !== undefined) {
      setActiveEdition(edition);
      return;
    }

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ edition?: number } | number>;
      if (customEvent.detail !== undefined) {
        if (typeof customEvent.detail === 'number') {
          setActiveEdition(customEvent.detail as NoorLogoEditionId);
          return;
        }
        if (typeof customEvent.detail === 'object' && typeof customEvent.detail.edition === 'number') {
          setActiveEdition(customEvent.detail.edition as NoorLogoEditionId);
          return;
        }
      }
      setActiveEdition(getSelectedLogoEdition());
    };

    window.addEventListener(LOGO_EDITION_CHANGE_EVENT, handler);
    window.addEventListener(LOGO_EDITION_CHANGED_EVENT, handler);
    window.addEventListener('noor-logo-edition-change', handler);
    window.addEventListener('noor-logo-edition-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(LOGO_EDITION_CHANGE_EVENT, handler);
      window.removeEventListener(LOGO_EDITION_CHANGED_EVENT, handler);
      window.removeEventListener('noor-logo-edition-change', handler);
      window.removeEventListener('noor-logo-edition-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, [edition]);

  const dimension = customSize ?? SIZE_MAP[size] ?? 64;
  const currentMeta = NOOR_LOGO_EDITIONS[activeEdition] || NOOR_LOGO_EDITIONS[0];

  const renderedVector = useMemo(() => {
    switch (activeEdition) {
      case 0:
        return <Edition0Vector prefix={prefix} animated={animated} />;
      case 1:
        return <Edition1Vector prefix={prefix} animated={animated} />;
      case 2:
        return <Edition2Vector prefix={prefix} animated={animated} />;
      case 3:
        return <Edition3Vector prefix={prefix} animated={animated} />;
      case 4:
        return <Edition4Vector prefix={prefix} animated={animated} />;
      default:
        return <Edition0Vector prefix={prefix} animated={animated} />;
    }
  }, [activeEdition, prefix, animated]);

  return (
    <div
      className={`inline-flex flex-col items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`Siraj Logo — ${currentMeta.name}`}
    >
      <style>{`
        @keyframes noorGentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>

      {/* SVG Container — ZERO SVG drop-shadow, ZERO backdrop-filter */}
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible pointer-events-none"
      >
        <SvgDefs prefix={prefix} noFilters={noFilters} />
        {renderedVector}
      </svg>

      {/* Optional Edition Badge Indicator */}
      {showBadge && (
        <div
          className="mt-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase border"
          style={{
            background: 'var(--accent-soft, rgba(212,175,55,0.12))',
            borderColor: 'var(--border, rgba(212,175,55,0.3))',
            color: 'var(--accent-text, #F3E5AB)',
          }}
        >
          ✦ {currentMeta.shortName} ✦
        </div>
      )}
    </div>
  );
};

// ─── 5-LOGO VISUAL SELECTOR GRID COMPONENT ───

export interface NoorLogoVisualPickerProps {
  className?: string;
  onSelect?: (edition: NoorLogoEditionId) => void;
}

interface LogoEditionCardProps {
  editionId: NoorLogoEditionId;
  isActive: boolean;
  onSelect: (editionId: NoorLogoEditionId) => void;
}

export const LogoEditionCard = memo<LogoEditionCardProps>(({
  editionId,
  isActive,
  onSelect,
}) => {
  const ed = NOOR_LOGO_EDITIONS[editionId];

  const handleClick = () => {
    onSelect(editionId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group relative flex flex-col items-center justify-between rounded-xl border select-none min-w-0 cursor-pointer ${
        isActive
          ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] opacity-85 hover:opacity-100'
      }`}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 74px',
        padding: '10px 6px',
        minWidth: 0,
        maxWidth: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.25)' : 'none',
      }}
      title={`${ed.name} (Tap to set as App & Launcher Icon)`}
      aria-label={`Select ${ed.name}`}
    >
      {isActive && (
        <div
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center shadow-sm z-10"
          style={{ background: 'var(--accent)', color: 'var(--on-accent, #000)' }}
        >
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div
        className="flex items-center justify-center pointer-events-none shrink-0 my-0.5 mx-auto"
        style={{ width: '38px', height: '38px', maxWidth: '100%', overflow: 'hidden' }}
      >
        <NoorDynamicLogo edition={editionId} customSize={36} animated={false} noFilters={true} />
      </div>

      <span
        style={{
          fontSize: '0.68rem',
          lineHeight: 1.25,
          fontWeight: 700,
          textAlign: 'center',
          display: 'block',
          width: '100%',
          whiteSpace: 'normal',
          wordBreak: 'keep-all',
          color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
        }}
      >
        {ed.cardTitle || ed.shortLabel?.replace('\n', ' ') || ed.shortName}
      </span>
    </button>
  );
});

LogoEditionCard.displayName = 'LogoEditionCard';

export const NoorLogoVisualPicker: React.FC<NoorLogoVisualPickerProps> = ({
  className = '',
  onSelect,
}) => {
  const [selected, setSelected] = useState<NoorLogoEditionId>(() => getSelectedLogoEdition());

  useEffect(() => {
    const handleUpdate = () => {
      setSelected(getSelectedLogoEdition());
    };
    window.addEventListener(LOGO_EDITION_CHANGE_EVENT, handleUpdate);
    window.addEventListener(LOGO_EDITION_CHANGED_EVENT, handleUpdate);
    window.addEventListener('noor-logo-edition-change', handleUpdate);
    window.addEventListener('noor-logo-edition-changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(LOGO_EDITION_CHANGE_EVENT, handleUpdate);
      window.removeEventListener(LOGO_EDITION_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('noor-logo-edition-change', handleUpdate);
      window.removeEventListener('noor-logo-edition-changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handlePick = useCallback((edition: NoorLogoEditionId) => {
    setSelected(edition);
    setSelectedLogoEdition(edition);
    if (onSelect) {
      onSelect(edition);
    }
  }, [onSelect]);

  return (
    <div className={`space-y-2 select-none w-full ${className}`}>
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {NOOR_LOGO_EDITIONS.map((ed) => (
          <LogoEditionCard
            key={ed.id}
            editionId={ed.id}
            isActive={selected === ed.id}
            onSelect={handlePick}
          />
        ))}
      </div>
    </div>
  );
};

export default NoorDynamicLogo;
