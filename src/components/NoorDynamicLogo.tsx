import React, { useState, useEffect, useId, useMemo } from 'react';

/**
 * NOOR CONNECT — 5-EDITION LIVING ISLAMIC EMBLEM ENGINE (<NoorDynamicLogo />)
 * 
 * Displays an extraordinary, luxury 3D-metallic Islamic emblem that dynamically
 * rotates through 5 Masterpiece Sacred Editions on every app launch, while also
 * supporting manual switching, size scaling ('sm' | 'md' | 'lg' | 'xl' | number),
 * and zero-jank hardware-accelerated animations.
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
}

export interface LogoEditionMeta {
  id: NoorLogoEditionId;
  name: string;
  shortName: string;
  shortLabel: string;
  fullTitle: string;
  subtitle: string;
  arabicName: string;
}

export const NOOR_LOGO_EDITIONS: readonly LogoEditionMeta[] = [
  {
    id: 0,
    name: 'Al-Miftah Royal Mihrab & Blooming Mushaf',
    shortName: 'Royal Mihrab & Mushaf',
    shortLabel: 'Royal\nMihrab',
    fullTitle: 'Royal Mihrab & Mushaf',
    subtitle: 'Blooming Quran & Luminous Mihrab Dome',
    arabicName: 'المحراب الملكي والمصحف الشريف',
  },
  {
    id: 1,
    name: 'Celestial Rub el Hizb Mandala & Sacred Fanous',
    shortName: 'Celestial Mandala & Fanous',
    shortLabel: 'Celestial\nFanous',
    fullTitle: 'Celestial Mandala & Fanous',
    subtitle: 'Arabesque Mandala & Radiating Lantern',
    arabicName: 'المندالة النورانية والفانوس المبارك',
  },
  {
    id: 2,
    name: 'Haramain Sanctuary Crest & Minarets',
    shortName: 'Haramain Crest & Minarets',
    shortLabel: 'Haramain\nCrest',
    fullTitle: 'Haramain Crest & Minarets',
    subtitle: 'Illuminated Dome & Twin Ottoman Minarets',
    arabicName: 'صرح الحرمين الشريفين والمآذن العالية',
  },
  {
    id: 3,
    name: 'Noor Al-Quran 3D Flame Medallion',
    shortName: 'Noor Calligraphic Flame',
    shortLabel: 'Noor\nFlame',
    fullTitle: 'Noor Calligraphic Flame',
    subtitle: 'Sculpted Thuluth Calligraphy & Sacred Flame',
    arabicName: 'شعلة القرآن والخط الثلثي المجسم',
  },
  {
    id: 4,
    name: 'Mamluk Royal Starburst & Qibla Sanctuary',
    shortName: 'Mamluk Starburst & Sanctuary',
    shortLabel: 'Mamluk\nStar',
    fullTitle: 'Mamluk Starburst & Sanctuary',
    subtitle: '16-Point Rub el Hizb & Celestial Kaaba Compass',
    arabicName: 'النجمة المملوكية ومحراب القبلة',
  },
] as const;

export const SELECTED_LOGO_KEY = 'noor_selected_logo_edition';
const STORAGE_LAUNCH_KEY = 'noor_logo_launch_edition_v1';
const STORAGE_MANUAL_KEY = 'noor_logo_manual_edition';
export const LOGO_EDITION_CHANGE_EVENT = 'noor-logo-edition-change';
export const LOGO_EDITION_CHANGED_EVENT = 'noor-logo-edition-changed';

/**
 * Returns the user-selected logo edition (0..4) locked globally as the single source of truth.
 * Defaults to 0 (Royal Mihrab & Mushaf) if unset.
 */
export function getSelectedLogoEdition(): NoorLogoEditionId {
  if (typeof window === 'undefined') return 0;
  try {
    const val = localStorage.getItem(SELECTED_LOGO_KEY);
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

/**
 * Compatibility alias returning the user-selected logo edition.
 */
export function getActiveLogoEdition(): NoorLogoEditionId {
  return getSelectedLogoEdition();
}

/**
 * Returns a self-contained, high-resolution SVG string for any of the 5 Sacred Editions.
 * Used for offscreen HTML5 canvas rendering (e.g. Zakat PDF Generator) and standalone vector exports.
 */
export function getLogoEditionStaticSvgString(edition: NoorLogoEditionId = 0, size = 200): string {
  const safeId = (Math.max(0, Math.min(4, Math.floor(edition))) || 0) as NoorLogoEditionId;
  const pfx = `noor-static-logo-${safeId}`;

  const defs = `<defs>` +
    `<linearGradient id="${pfx}-gold-primary" x1="0%" y1="0%" x2="100%" y2="100%">` +
      `<stop offset="0%" stop-color="#FFFDF0"/>` +
      `<stop offset="20%" stop-color="#FDE08A"/>` +
      `<stop offset="50%" stop-color="#D4AF37"/>` +
      `<stop offset="80%" stop-color="#B8860B"/>` +
      `<stop offset="100%" stop-color="#6B4E08"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-gold-radiant" x1="0%" y1="100%" x2="100%" y2="0%">` +
      `<stop offset="0%" stop-color="#9A6F1A"/>` +
      `<stop offset="30%" stop-color="#F5D061"/>` +
      `<stop offset="70%" stop-color="#FFF8D6"/>` +
      `<stop offset="100%" stop-color="#D4AF37"/>` +
    `</linearGradient>` +
    `<linearGradient id="${pfx}-jewel-velvet" x1="0%" y1="0%" x2="0%" y2="100%">` +
      `<stop offset="0%" stop-color="#0B2B1E"/>` +
      `<stop offset="45%" stop-color="#064E3B"/>` +
      `<stop offset="100%" stop-color="#021C13"/>` +
    `</linearGradient>` +
    `<radialGradient id="${pfx}-gold-aura" cx="50%" cy="50%" r="50%">` +
      `<stop offset="0%" stop-color="#FDE08A" stop-opacity="0.8"/>` +
      `<stop offset="40%" stop-color="#D4AF37" stop-opacity="0.4"/>` +
      `<stop offset="80%" stop-color="#B8860B" stop-opacity="0.1"/>` +
      `<stop offset="100%" stop-color="#6B4E08" stop-opacity="0"/>` +
    `</radialGradient>` +
  `</defs>`;

  let body = '';
  switch (safeId) {
    case 0:
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="2.5 4" fill="none" opacity="0.6"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="10" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6" fill="none" opacity="0.85"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="10" transform="rotate(45 100 100)" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6" fill="none" opacity="0.85"/>` +
        `<circle cx="100" cy="8" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="192" cy="100" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="100" cy="192" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="8" cy="100" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="165" cy="35" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="165" cy="165" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="35" cy="165" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="35" cy="35" r="2.8" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="1.2"/>` +
        `<circle cx="100" cy="100" r="66" fill="url(#${pfx}-gold-aura)" opacity="0.45"/>` +
        `<g>` +
          `<path d="M 100 162 C 84 158 54 152 44 136 C 36 122 46 102 64 98 C 76 96 88 108 96 126 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<path d="M 96 156 C 80 150 56 142 50 130 C 46 120 54 108 66 106 C 76 104 86 114 94 128 Z" fill="url(#${pfx}-jewel-velvet)" opacity="0.85"/>` +
          `<path d="M 52 130 Q 74 132 94 142" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.8"/>` +
          `<path d="M 60 118 Q 80 124 94 134" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.8"/>` +
          `<path d="M 100 162 C 116 158 146 152 156 136 C 164 122 154 102 136 98 C 124 96 112 108 104 126 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<path d="M 104 156 C 120 150 144 142 150 130 C 154 120 146 108 134 106 C 124 104 114 114 106 128 Z" fill="url(#${pfx}-jewel-velvet)" opacity="0.85"/>` +
          `<path d="M 148 130 Q 126 132 106 142" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.8"/>` +
          `<path d="M 140 118 Q 120 124 106 134" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.8"/>` +
          `<polygon points="90,162 110,162 105,176 95,176" fill="url(#${pfx}-gold-radiant)" stroke="#FFFDF0" stroke-width="0.8"/>` +
          `<circle cx="100" cy="168" r="2.5" fill="#FFFDF0"/>` +
          `<path d="M 76 144 L 76 102 C 76 80 88 64 100 52 C 112 64 124 80 124 102 L 124 144 Z" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2"/>` +
          `<path d="M 82 142 L 82 104 C 82 92 88 84 94 76 C 96 80 100 82 100 82 C 100 82 104 80 106 76 C 112 84 118 92 118 104 L 118 142 Z" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" stroke-dasharray="1.5 2" opacity="0.9"/>` +
          `<path d="M 72 102 C 72 74 86 52 100 40 C 114 52 128 74 128 102 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1.4"/>` +
          `<line x1="100" y1="40" x2="100" y2="102" stroke="url(#${pfx}-jewel-velvet)" stroke-width="1.2"/>` +
          `<path d="M 86 98 Q 94 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75"/>` +
          `<path d="M 114 98 Q 106 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75"/>` +
          `<path d="M 98 24 C 95 24 92 26.5 92 30 C 92 33.5 95 36 98.5 36 C 96.5 35 95.5 33 95.5 30 C 95.5 27 97 25 99 24.2 C 98.6 24.1 98.3 24 98 24 Z" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="0.8"/>` +
          `<polygon points="104,27 105.2,29.5 108,29.8 106,31.7 106.5,34.5 104,33.1 101.5,34.5 102,31.7 100,29.8 102.8,29.5" fill="#FFFDF0"/>` +
          `<line x1="100" y1="36" x2="100" y2="40" stroke="url(#${pfx}-gold-primary)" stroke-width="2" stroke-linecap="round"/>` +
          `<path d="M 87 118 C 87 132 93 138 100 138 C 107 138 113 132 113 118" fill="none" stroke="#FFFDF0" stroke-width="3.2" stroke-linecap="round"/>` +
          `<polygon points="100,105 103.5,109 100,113 96.5,109" fill="#FFFDF0" stroke="url(#${pfx}-gold-primary)" stroke-width="0.8"/>` +
          `<path d="M 104 116 C 102 113 105 110 108 110 C 111 110 113 112 112 115 C 111 118 107 122 108 126" fill="none" stroke="#FFFDF0" stroke-width="2.2" stroke-linecap="round"/>` +
          `<path d="M 112 120 C 113 125 116 128 118 129" fill="none" stroke="#FFFDF0" stroke-width="2.4" stroke-linecap="round"/>` +
        `</g>` +
      `</g>`;
      break;

    case 1: {
      const rosettePetals = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(
        (a) => `<g transform="rotate(${a} 100 100)"><path d="M 100 10 C 94 24 94 36 100 44 C 106 36 106 24 100 10 Z" fill="url(#${pfx}-gold-primary)" opacity="0.75"/><circle cx="100" cy="8" r="2" fill="#FFFDF0"/></g>`
      ).join('');

      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" fill="none" opacity="0.6"/>` +
        rosettePetals +
        `<g opacity="0.65">` +
          `<line x1="100" y1="105" x2="60" y2="70" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
          `<line x1="100" y1="105" x2="140" y2="70" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
          `<line x1="100" y1="105" x2="50" y2="105" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
          `<line x1="100" y1="105" x2="150" y2="105" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
          `<line x1="100" y1="105" x2="68" y2="140" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
          `<line x1="100" y1="105" x2="132" y2="140" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.5" stroke-dasharray="3 3"/>` +
        `</g>` +
        `<g>` +
          `<circle cx="100" cy="36" r="6" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2" fill="none"/>` +
          `<line x1="100" y1="42" x2="100" y2="50" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
          `<polygon points="90,56 110,56 104,50 96,50" fill="url(#${pfx}-gold-primary)"/>` +
          `<path d="M 82 72 L 118 72 L 110 56 L 90 56 Z" fill="url(#${pfx}-gold-radiant)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<polygon points="82,72 118,72 110,126 90,126" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
          `<line x1="96" y1="72" x2="96" y2="126" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" opacity="0.8"/>` +
          `<line x1="104" y1="72" x2="104" y2="126" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" opacity="0.8"/>` +
          `<ellipse cx="100" cy="100" rx="14" ry="18" fill="url(#${pfx}-gold-aura)"/>` +
          `<path d="M 100 86 C 96 94 94 100 96 105 C 98 109 102 109 104 105 C 106 100 104 94 100 86 Z" fill="#FFFDF0"/>` +
          `<path d="M 88 126 L 112 126 L 116 138 L 84 138 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<circle cx="90" cy="141" r="2" fill="url(#${pfx}-gold-primary)"/>` +
          `<circle cx="100" cy="141" r="2.5" fill="#FFFDF0"/>` +
          `<circle cx="110" cy="141" r="2" fill="url(#${pfx}-gold-primary)"/>` +
          `<path d="M 100 156 Q 74 146 54 158 Q 76 168 100 162 Q 124 168 146 158 Q 126 146 100 156 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<line x1="100" y1="156" x2="100" y2="162" stroke="url(#${pfx}-jewel-velvet)" stroke-width="1.5"/>` +
        `</g>` +
      `</g>`;
      break;
    }

    case 2:
      body = `<g>` +
        `<path d="M 100 14 C 54 14 16 52 16 98 C 16 144 54 182 100 182 C 146 182 184 144 184 98 C 184 76 175 56 161 41 C 172 58 172 84 161 106 C 145 138 106 150 74 134 C 42 118 30 79 46 47 C 58 24 82 14 100 14 Z" fill="url(#${pfx}-gold-primary)" opacity="0.88"/>` +
        `<g>` +
          `<rect x="74" y="104" width="52" height="18" rx="2" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
          `<path d="M 80 118 L 80 110 Q 84 107 88 110 L 88 118 Z" fill="url(#${pfx}-jewel-velvet)"/>` +
          `<path d="M 88 118 L 88 110 Q 92 107 96 110 L 96 118 Z" fill="url(#${pfx}-jewel-velvet)"/>` +
          `<path d="M 96 118 L 96 110 Q 100 107 104 110 L 104 118 Z" fill="url(#${pfx}-jewel-velvet)"/>` +
          `<path d="M 104 118 L 104 110 Q 108 107 112 110 L 112 118 Z" fill="url(#${pfx}-jewel-velvet)"/>` +
          `<path d="M 112 118 L 112 110 Q 116 107 120 110 L 120 118 Z" fill="url(#${pfx}-jewel-velvet)"/>` +
          `<path d="M 72 104 C 72 70 85 48 100 44 C 115 48 128 70 128 104 Z" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.4"/>` +
          `<line x1="100" y1="44" x2="100" y2="104" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.8"/>` +
          `<path d="M 85 98 Q 92 68 100 45" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" fill="none" opacity="0.8"/>` +
          `<path d="M 115 98 Q 108 68 100 45" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.2" fill="none" opacity="0.8"/>` +
          `<line x1="100" y1="34" x2="100" y2="44" stroke="url(#${pfx}-gold-primary)" stroke-width="2"/>` +
          `<path d="M 98 28 C 96 28 94 30 94 32.5 C 94 35 96.5 37 99 37 C 97.5 36 96.5 34.5 96.5 32.5 C 96.5 30.5 97.5 29 99.5 28.2 Z" fill="#FFFDF0"/>` +
          `<rect x="52" y="60" width="10" height="74" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="0.8"/>` +
          `<rect x="50" y="56" width="14" height="4" fill="#FFFDF0"/>` +
          `<polygon points="57,36 63,56 51,56" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
          `<line x1="57" y1="30" x2="57" y2="36" stroke="url(#${pfx}-gold-primary)" stroke-width="1.5"/>` +
          `<circle cx="57" cy="29" r="1.5" fill="#FFFDF0"/>` +
          `<rect x="49" y="86" width="16" height="5" rx="1" fill="url(#${pfx}-gold-radiant)" stroke="#FFFDF0" stroke-width="0.6"/>` +
          `<rect x="138" y="60" width="10" height="74" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="0.8"/>` +
          `<rect x="136" y="56" width="14" height="4" fill="#FFFDF0"/>` +
          `<polygon points="143,36 149,56 137,56" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="1"/>` +
          `<line x1="143" y1="30" x2="143" y2="36" stroke="url(#${pfx}-gold-primary)" stroke-width="1.5"/>` +
          `<circle cx="143" cy="29" r="1.5" fill="#FFFDF0"/>` +
          `<rect x="135" y="86" width="16" height="5" rx="1" fill="url(#${pfx}-gold-radiant)" stroke="#FFFDF0" stroke-width="0.6"/>` +
          `<rect x="42" y="134" width="116" height="18" rx="4" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6"/>` +
          `<text x="100" y="147" fill="#FFFDF0" font-size="13" font-weight="bold" font-family="serif" text-anchor="middle" letter-spacing="2">نُـوْر</text>` +
        `</g>` +
      `</g>`;
      break;

    case 3: {
      const diamonds = [0, 45, 90, 135, 180, 225, 270, 315].map(
        (ang) => `<polygon points="100,7 103,10 100,13 97,10" transform="rotate(${ang} 100 100)" fill="#FFFDF0"/>`
      ).join('');

      body = `<g>` +
        `<circle cx="100" cy="100" r="90" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6" fill="none" opacity="0.75"/>` +
        `<circle cx="100" cy="100" r="82" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" stroke-dasharray="3 4" fill="none" opacity="0.6"/>` +
        diamonds +
        `<g>` +
          `<path d="M 60 162 C 80 152 96 154 100 156 C 104 154 120 152 140 162 L 132 170 C 114 162 104 164 100 166 C 96 164 86 162 68 170 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1.2"/>` +
          `<path d="M 100 32 C 125 58 138 92 134 124 C 130 150 115 158 100 158 C 85 158 70 150 66 124 C 62 92 75 58 100 32 Z" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2"/>` +
          `<path d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108" fill="none" stroke="url(#${pfx}-gold-radiant)" stroke-width="5" stroke-linecap="round"/>` +
          `<path d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108" fill="none" stroke="#FFFDF0" stroke-width="2.2" stroke-linecap="round"/>` +
          `<polygon points="100,82 105,89 100,96 95,89" fill="#FFFDF0"/>` +
          `<circle cx="106" cy="118" r="7" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1.2"/>` +
          `<path d="M 111 122 C 114 130 120 134 125 135" fill="none" stroke="#FFFDF0" stroke-width="3" stroke-linecap="round"/>` +
          `<path d="M 88 124 C 84 134 78 140 70 142" fill="none" stroke="url(#${pfx}-gold-primary)" stroke-width="3.4" stroke-linecap="round"/>` +
          `<path d="M 98 22 C 95 22 92 24.5 92 28 C 92 31.5 95 34 98.5 34 C 96.5 33 95.5 31 95.5 28 C 95.5 25 97 23 99 22.2 Z" fill="#FFFDF0"/>` +
        `</g>` +
      `</g>`;
      break;
    }

    case 4:
      body = `<g>` +
        `<circle cx="100" cy="100" r="92" stroke="url(#${pfx}-gold-radiant)" stroke-width="1.4" fill="none" opacity="0.65"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="8" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6" fill="none" opacity="0.8"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(45 100 100)" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6" fill="none" opacity="0.8"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(22.5 100 100)" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.6"/>` +
        `<rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(67.5 100 100)" stroke="url(#${pfx}-gold-radiant)" stroke-width="1" fill="none" opacity="0.6"/>` +
        `<g>` +
          `<path d="M 68 152 L 68 96 C 68 68 84 52 100 42 C 116 52 132 68 132 96 L 132 152 Z" fill="url(#${pfx}-jewel-velvet)" stroke="url(#${pfx}-gold-primary)" stroke-width="2.2"/>` +
          `<rect x="80" y="98" width="40" height="42" rx="2" fill="#0A0F1D" stroke="url(#${pfx}-gold-primary)" stroke-width="1.6"/>` +
          `<rect x="80" y="106" width="40" height="6" fill="url(#${pfx}-gold-radiant)"/>` +
          `<rect x="104" y="116" width="10" height="24" rx="1" fill="url(#${pfx}-gold-radiant)" stroke="#FFFDF0" stroke-width="0.8"/>` +
          `<line x1="100" y1="42" x2="100" y2="28" stroke="#FFFDF0" stroke-width="2" stroke-linecap="round"/>` +
          `<polygon points="100,24 103,30 100,28 97,30" fill="#FFFDF0"/>` +
          `<path d="M 98 16 C 95 16 92 18.5 92 22 C 92 25.5 95 28 98.5 28 C 96.5 27 95.5 25 95.5 22 C 95.5 19 97 17 99 16.2 Z" fill="#FFFDF0"/>` +
          `<path d="M 60 162 Q 80 152 100 158 Q 120 152 140 162 Q 100 172 60 162 Z" fill="url(#${pfx}-gold-primary)" stroke="#FFFDF0" stroke-width="1"/>` +
        `</g>` +
      `</g>`;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200" fill="none">${defs}${body}</svg>`;
}

/**
 * Sets and locks the user's chosen logo edition across the entire app,
 * dispatches change events to all reactive subscribers, updates the favicon,
 * and notifies the native Android bridge to switch the Android launcher icon.
 */
export function setSelectedLogoEdition(edition: NoorLogoEditionId): void {
  if (typeof window === 'undefined') return;
  try {
    const clamped = (Math.max(0, Math.min(4, Math.floor(edition))) || 0) as NoorLogoEditionId;
    localStorage.setItem(SELECTED_LOGO_KEY, String(clamped));
    // Keep legacy storage keys in sync for backward compatibility
    localStorage.setItem(STORAGE_LAUNCH_KEY, String(clamped));
    localStorage.setItem(STORAGE_MANUAL_KEY, String(clamped));

    // Dispatch both event variants so all listeners update synchronously
    window.dispatchEvent(new CustomEvent(LOGO_EDITION_CHANGE_EVENT, { detail: { edition: clamped } }));
    window.dispatchEvent(new CustomEvent(LOGO_EDITION_CHANGED_EVENT, { detail: clamped }));

    // Dynamically update web favicon
    try {
      const favIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
      favIcons.forEach((el) => {
        try {
          const url = new URL(el.href, window.location.origin);
          url.searchParams.set('v', `ed${clamped}_${Date.now()}`);
          el.href = url.toString();
        } catch {
          // Ignore invalid URL parsing
        }
      });
    } catch {
      // Safe fallback for favicon update
    }

    // Call native Android bridge to switch Home Screen launcher icon
    try {
      type BridgeType = {
        AndroidBridge?: {
          setLauncherIconEdition?: (editionIndex: number) => void;
        };
      };
      (window as unknown as BridgeType).AndroidBridge?.setLauncherIconEdition?.(clamped);
    } catch (err) {
      console.warn('Native AndroidBridge.setLauncherIconEdition error:', err);
    }
  } catch (err) {
    console.warn('setSelectedLogoEdition failed:', err);
  }
}

/**
 * Cycles to the next logo edition, saves it as the locked choice, and broadcasts updates.
 */
export function cycleLogoEdition(): NoorLogoEditionId {
  if (typeof window === 'undefined') return 0;
  try {
    const cur = getSelectedLogoEdition();
    const next = ((cur + 1) % NOOR_LOGO_EDITIONS.length) as NoorLogoEditionId;
    setSelectedLogoEdition(next);
    return next;
  } catch {
    return 0;
  }
}

const SIZE_MAP: Record<NoorLogoSize, number> = {
  sm: 36,
  md: 64,
  lg: 88,
  xl: 120,
};

// ─── SVG VECTOR GRAPHICS FOR THE 5 SACRED EDITIONS ───

// Shared SVG Definitions (Gradients & Filters)
const SvgDefs: React.FC<{ prefix: string }> = ({ prefix }) => (
  <defs>
    {/* 24K Burnished Gold Primary Gradient */}
    <linearGradient id={`${prefix}-gold-primary`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFFDF0" />
      <stop offset="20%" stopColor="#FDE08A" />
      <stop offset="50%" stopColor="#D4AF37" />
      <stop offset="80%" stopColor="#B8860B" />
      <stop offset="100%" stopColor="#6B4E08" />
    </linearGradient>

    {/* Radiant Warm Gold Shimmer Gradient */}
    <linearGradient id={`${prefix}-gold-radiant`} x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#9A6F1A" />
      <stop offset="30%" stopColor="#F5D061" />
      <stop offset="70%" stopColor="#FFF8D6" />
      <stop offset="100%" stopColor="#D4AF37" />
    </linearGradient>

    {/* Deep Emerald Velvet / Inner Jewel Gradient */}
    <linearGradient id={`${prefix}-jewel-velvet`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#0B2B1E" />
      <stop offset="45%" stopColor="#064E3B" />
      <stop offset="100%" stopColor="#021C13" />
    </linearGradient>

    {/* Royal Obsidian / Theme Surface Gradient */}
    <linearGradient id={`${prefix}-surface-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="var(--surface-2, #1D2D4A)" />
      <stop offset="60%" stopColor="var(--surface, #14213D)" />
      <stop offset="100%" stopColor="var(--bg-base, #080B14)" />
    </linearGradient>

    {/* Soft Golden Aura Glow */}
    <radialGradient id={`${prefix}-gold-aura`} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor="#FDE08A" stopOpacity="0.8" />
      <stop offset="40%" stopColor="#D4AF37" stopOpacity="0.4" />
      <stop offset="80%" stopColor="#B8860B" stopOpacity="0.1" />
      <stop offset="100%" stopColor="#6B4E08" stopOpacity="0" />
    </radialGradient>

    {/* Metallic Drop Shadows */}
    <filter id={`${prefix}-glow`} x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#D4AF37" floodOpacity="0.55" />
    </filter>

    <filter id={`${prefix}-deep-shadow`} x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.65" />
      <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#D4AF37" floodOpacity="0.35" />
    </filter>
  </defs>
);

/**
 * EDITION 0: Al-Miftah Royal Mihrab & Blooming Mushaf (Flagship Masterpiece)
 */
const Edition0Vector: React.FC<{ prefix: string; animated: boolean }> = ({ prefix, animated }) => (
  <g>
    {/* Outer Frame: Slowly Counter-Rotating Rub el Hizb (۞) Golden Filigree Ring */}
    <g
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorSpinSlow 28s linear infinite reverse' : undefined,
      }}
    >
      {/* Outer Dotted Halo Ring */}
      <circle
        cx="100"
        cy="100"
        r="92"
        stroke={`url(#${prefix}-gold-radiant)`}
        strokeWidth="1.2"
        strokeDasharray="2.5 4"
        fill="none"
        opacity="0.6"
      />
      {/* Square 1 */}
      <rect
        x="36"
        y="36"
        width="128"
        height="128"
        rx="10"
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="1.6"
        fill="none"
        opacity="0.85"
      />
      {/* Square 2 (Rotated 45 degrees) */}
      <rect
        x="36"
        y="36"
        width="128"
        height="128"
        rx="10"
        transform="rotate(45 100 100)"
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="1.6"
        fill="none"
        opacity="0.85"
      />
      {/* 8 Golden Starlight Nodes at Vertices */}
      {[
        [100, 8], [192, 100], [100, 192], [8, 100],
        [165, 35], [165, 165], [35, 165], [35, 35],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="2.8"
          fill="#FFFDF0"
          stroke={`url(#${prefix}-gold-primary)`}
          strokeWidth="1.2"
          filter={`url(#${prefix}-glow)`}
        />
      ))}
    </g>

    {/* Inner Ambient Glow Disk */}
    <circle
      cx="100"
      cy="100"
      r="66"
      fill={`url(#${prefix}-gold-aura)`}
      opacity="0.45"
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorPulseAura 3.6s ease-in-out infinite' : undefined,
      }}
    />

    {/* Centerpiece Container with Subtle Breathing Animation */}
    <g
      filter={`url(#${prefix}-deep-shadow)`}
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorGentleFloat 4s ease-in-out infinite' : undefined,
      }}
    >
      {/* Symmetrical Blooming Golden Open Quran Leaves (Rehal / Lotus Mushaf Base) */}
      {/* Left Blooming Leaf */}
      <path
        d="M 100 162 C 84 158 54 152 44 136 C 36 122 46 102 64 98 C 76 96 88 108 96 126 Z"
        fill={`url(#${prefix}-gold-primary)`}
        stroke="#FFFDF0"
        strokeWidth="1"
      />
      <path
        d="M 96 156 C 80 150 56 142 50 130 C 46 120 54 108 66 106 C 76 104 86 114 94 128 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        opacity="0.85"
      />
      {/* Left Leaf Fine Page Veins */}
      <path d="M 52 130 Q 74 132 94 142" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.8" />
      <path d="M 60 118 Q 80 124 94 134" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.8" />

      {/* Right Blooming Leaf (Symmetrical) */}
      <path
        d="M 100 162 C 116 158 146 152 156 136 C 164 122 154 102 136 98 C 124 96 112 108 104 126 Z"
        fill={`url(#${prefix}-gold-primary)`}
        stroke="#FFFDF0"
        strokeWidth="1"
      />
      <path
        d="M 104 156 C 120 150 144 142 150 130 C 154 120 146 108 134 106 C 124 104 114 114 106 128 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        opacity="0.85"
      />
      {/* Right Leaf Fine Page Veins */}
      <path d="M 148 130 Q 126 132 106 142" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.8" />
      <path d="M 140 118 Q 120 124 106 134" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.8" />

      {/* Central Rehal Pedestal / Jewel Plinth */}
      <polygon points="90,162 110,162 105,176 95,176" fill={`url(#${prefix}-gold-radiant)`} stroke="#FFFDF0" strokeWidth="0.8" />
      <circle cx="100" cy="168" r="2.5" fill="#FFFDF0" />

      {/* Royal Mihrab Arch & Pointed Dome (Rising from the center) */}
      {/* Mihrab Arch Backdrop */}
      <path
        d="M 76 144 L 76 102 C 76 80 88 64 100 52 C 112 64 124 80 124 102 L 124 144 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="2.2"
      />

      {/* Inner Decorative Cusped Arch Foil */}
      <path
        d="M 82 142 L 82 104 C 82 92 88 84 94 76 C 96 80 100 82 100 82 C 100 82 104 80 106 76 C 112 84 118 92 118 104 L 118 142 Z"
        fill="none"
        stroke={`url(#${prefix}-gold-radiant)`}
        strokeWidth="1.2"
        strokeDasharray="1.5 2"
        opacity="0.9"
      />

      {/* Sculpted Mihrab Pointed Dome Roof */}
      <path
        d="M 72 102 C 72 74 86 52 100 40 C 114 52 128 74 128 102 Z"
        fill={`url(#${prefix}-gold-primary)`}
        stroke="#FFFDF0"
        strokeWidth="1.4"
      />
      {/* Dome Ribbing Details */}
      <line x1="100" y1="40" x2="100" y2="102" stroke={`url(#${prefix}-jewel-velvet)`} strokeWidth="1.2" />
      <path d="M 86 98 Q 94 66 100 42" stroke="#FFFDF0" strokeWidth="0.8" fill="none" opacity="0.75" />
      <path d="M 114 98 Q 106 66 100 42" stroke="#FFFDF0" strokeWidth="0.8" fill="none" opacity="0.75" />

      {/* Crown Finial: Crescent Moon & Golden Star */}
      <g filter={`url(#${prefix}-glow)`}>
        {/* Crescent Moon */}
        <path
          d="M 98 24 C 95 24 92 26.5 92 30 C 92 33.5 95 36 98.5 36 C 96.5 35 95.5 33 95.5 30 C 95.5 27 97 25 99 24.2 C 98.6 24.1 98.3 24 98 24 Z"
          fill="#FFFDF0"
          stroke={`url(#${prefix}-gold-primary)`}
          strokeWidth="0.8"
        />
        {/* Apex Star */}
        <polygon
          points="104,27 105.2,29.5 108,29.8 106,31.7 106.5,34.5 104,33.1 101.5,34.5 102,31.7 100,29.8 102.8,29.5"
          fill="#FFFDF0"
        />
        {/* Finial Spire Base */}
        <line x1="100" y1="36" x2="100" y2="40" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Luminous Sculpted Arabic Calligraphy: نُور (Noor) */}
      <g filter={`url(#${prefix}-glow)`}>
        {/* Letter 'ن' (Main protective crescent vessel) */}
        <path
          d="M 87 118 C 87 132 93 138 100 138 C 107 138 113 132 113 118"
          fill="none"
          stroke="#FFFDF0"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Radiant Diamond Dot of the Nun */}
        <polygon
          points="100,105 103.5,109 100,113 96.5,109"
          fill="#FFFDF0"
          stroke={`url(#${prefix}-gold-primary)`}
          strokeWidth="0.8"
        />
        {/* Letter 'و' (Graceful loop and flourish) */}
        <path
          d="M 104 116 C 102 113 105 110 108 110 C 111 110 113 112 112 115 C 111 118 107 122 108 126"
          fill="none"
          stroke="#FFFDF0"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Letter 'ر' (Slender downward sweep) */}
        <path
          d="M 112 120 C 113 125 116 128 118 129"
          fill="none"
          stroke="#FFFDF0"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </g>
  </g>
);

/**
 * EDITION 1: Celestial Rub el Hizb Mandala & Sacred Fanous (Lantern)
 */
const Edition1Vector: React.FC<{ prefix: string; animated: boolean }> = ({ prefix, animated }) => (
  <g>
    {/* 16-Petal Arabesque Geometric Rosette Mandala Ring */}
    <g
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorSpinSlow 32s linear infinite' : undefined,
      }}
    >
      <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" fill="none" opacity="0.6" />
      {[0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map((angle, i) => (
        <g key={i} transform={`rotate(${angle} 100 100)`}>
          <path d="M 100 10 C 94 24 94 36 100 44 C 106 36 106 24 100 10 Z" fill={`url(#${prefix}-gold-primary)`} opacity="0.75" />
          <circle cx="100" cy="8" r="2" fill="#FFFDF0" />
        </g>
      ))}
    </g>

    {/* Radiant Amber-Gold Light Rays */}
    <g opacity="0.65" style={{ transformOrigin: '100px 105px', animation: animated ? 'noorPulseAura 4s ease-in-out infinite' : undefined }}>
      <line x1="100" y1="105" x2="60" y2="70" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="100" y1="105" x2="140" y2="70" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="100" y1="105" x2="50" y2="105" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="100" y1="105" x2="150" y2="105" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="100" y1="105" x2="68" y2="140" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="100" y1="105" x2="132" y2="140" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.5" strokeDasharray="3 3" />
    </g>

    {/* Sacred Mamluk Fanous (Lantern) Centerpiece */}
    <g filter={`url(#${prefix}-deep-shadow)`}>
      {/* Top Hanging Ring */}
      <circle cx="100" cy="36" r="6" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2.2" fill="none" />
      <line x1="100" y1="42" x2="100" y2="50" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />

      {/* Lantern Tiered Canopy Crown */}
      <polygon points="90,56 110,56 104,50 96,50" fill={`url(#${prefix}-gold-primary)`} />
      <path d="M 82 72 L 118 72 L 110 56 L 90 56 Z" fill={`url(#${prefix}-gold-radiant)`} stroke="#FFFDF0" strokeWidth="1" />

      {/* Main Glass Chamber (Faceted Emerald & Gold) */}
      <polygon points="82,72 118,72 110,126 90,126" fill={`url(#${prefix}-jewel-velvet)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />
      {/* Glass Pane Divider Struts */}
      <line x1="96" y1="72" x2="96" y2="126" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" opacity="0.8" />
      <line x1="104" y1="72" x2="104" y2="126" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" opacity="0.8" />

      {/* Inner Glowing Candle / Lantern Flame & Noor */}
      <ellipse cx="100" cy="100" rx="14" ry="18" fill={`url(#${prefix}-gold-aura)`} />
      <path d="M 100 86 C 96 94 94 100 96 105 C 98 109 102 109 104 105 C 106 100 104 94 100 86 Z" fill="#FFFDF0" filter={`url(#${prefix}-glow)`} />

      {/* Lantern Pedestal & Scalloped Feet */}
      <path d="M 88 126 L 112 126 L 116 138 L 84 138 Z" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="1" />
      <circle cx="90" cy="141" r="2" fill={`url(#${prefix}-gold-primary)`} />
      <circle cx="100" cy="141" r="2.5" fill="#FFFDF0" />
      <circle cx="110" cy="141" r="2" fill={`url(#${prefix}-gold-primary)`} />

      {/* Open Quran Cradle Beneath */}
      <path d="M 100 156 Q 74 146 54 158 Q 76 168 100 162 Q 124 168 146 158 Q 126 146 100 156 Z" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="1" />
      <line x1="100" y1="156" x2="100" y2="162" stroke={`url(#${prefix}-jewel-velvet)`} strokeWidth="1.5" />
    </g>
  </g>
);

/**
 * EDITION 2: Haramain Sanctuary Crest (Twin Minarets & Illuminated Dome)
 */
const Edition2Vector: React.FC<{ prefix: string; animated: boolean }> = ({ prefix, animated }) => (
  <g>
    {/* Embracing Golden Royal Crescent Crest */}
    <g
      filter={`url(#${prefix}-glow)`}
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorPulseAura 4s ease-in-out infinite' : undefined,
      }}
    >
      <path
        d="M 100 14 C 54 14 16 52 16 98 C 16 144 54 182 100 182 C 146 182 184 144 184 98 C 184 76 175 56 161 41 C 172 58 172 84 161 106 C 145 138 106 150 74 134 C 42 118 30 79 46 47 C 58 24 82 14 100 14 Z"
        fill={`url(#${prefix}-gold-primary)`}
        opacity="0.88"
      />
    </g>

    {/* Grand Central Ribbed Sanctuary Dome */}
    <g filter={`url(#${prefix}-deep-shadow)`}>
      {/* Dome Base Drum with Clerestory Arches */}
      <rect x="74" y="104" width="52" height="18" rx="2" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="1" />
      {[80, 88, 96, 104, 112].map((x, i) => (
        <path key={i} d={`M ${x} 118 L ${x} 110 Q ${x + 4} 107 ${x + 8} 110 L ${x + 8} 118 Z`} fill={`url(#${prefix}-jewel-velvet)`} />
      ))}

      {/* Main Ribbed Dome */}
      <path
        d="M 72 104 C 72 70 85 48 100 44 C 115 48 128 70 128 104 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="2.4"
      />
      {/* Ribs */}
      <line x1="100" y1="44" x2="100" y2="104" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.8" />
      <path d="M 85 98 Q 92 68 100 45" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" fill="none" opacity="0.8" />
      <path d="M 115 98 Q 108 68 100 45" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.2" fill="none" opacity="0.8" />

      {/* Crescent Spire on Dome */}
      <line x1="100" y1="34" x2="100" y2="44" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="2" />
      <path d="M 98 28 C 96 28 94 30 94 32.5 C 94 35 96.5 37 99 37 C 97.5 36 96.5 34.5 96.5 32.5 C 96.5 30.5 97.5 29 99.5 28.2 Z" fill="#FFFDF0" />

      {/* Left Slender Minaret */}
      <g>
        <rect x="52" y="60" width="10" height="74" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="0.8" />
        <rect x="50" y="56" width="14" height="4" fill="#FFFDF0" />
        <polygon points="57,36 63,56 51,56" fill={`url(#${prefix}-jewel-velvet)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
        <line x1="57" y1="30" x2="57" y2="36" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.5" />
        <circle cx="57" cy="29" r="1.5" fill="#FFFDF0" />
        {/* Balcony */}
        <rect x="49" y="86" width="16" height="5" rx="1" fill={`url(#${prefix}-gold-radiant)`} stroke="#FFFDF0" strokeWidth="0.6" />
      </g>

      {/* Right Slender Minaret (Symmetrical) */}
      <g>
        <rect x="138" y="60" width="10" height="74" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="0.8" />
        <rect x="136" y="56" width="14" height="4" fill="#FFFDF0" />
        <polygon points="143,36 149,56 137,56" fill={`url(#${prefix}-jewel-velvet)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1" />
        <line x1="143" y1="30" x2="143" y2="36" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.5" />
        <circle cx="143" cy="29" r="1.5" fill="#FFFDF0" />
        {/* Balcony */}
        <rect x="135" y="86" width="16" height="5" rx="1" fill={`url(#${prefix}-gold-radiant)`} stroke="#FFFDF0" strokeWidth="0.6" />
      </g>

      {/* Base Plinth with Arabic Noor */}
      <rect x="42" y="134" width="116" height="18" rx="4" fill={`url(#${prefix}-jewel-velvet)`} stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.6" />
      <text x="100" y="147" fill="#FFFDF0" fontSize="13" fontWeight="bold" fontFamily="serif" textAnchor="middle" letterSpacing="2">نُـوْر</text>
    </g>
  </g>
);

/**
 * EDITION 3: Noor Al-Quran 3D Flame Medallion
 */
const Edition3Vector: React.FC<{ prefix: string; animated: boolean }> = ({ prefix, animated }) => (
  <g>
    {/* Concentric Golden Orbit Rings */}
    <g
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorSpinSlow 24s linear infinite' : undefined,
      }}
    >
      <circle cx="100" cy="100" r="90" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.6" fill="none" opacity="0.75" />
      <circle cx="100" cy="100" r="82" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" strokeDasharray="3 4" fill="none" opacity="0.6" />
      {/* 8 Cardinal Diamonds */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((ang, i) => (
        <polygon
          key={i}
          points="100,7 103,10 100,13 97,10"
          transform={`rotate(${ang} 100 100)`}
          fill="#FFFDF0"
          filter={`url(#${prefix}-glow)`}
        />
      ))}
    </g>

    {/* Sculpted 3D Thuluth Calligraphic Flame of Noor */}
    <g filter={`url(#${prefix}-deep-shadow)`}>
      {/* Golden Open Quran Stand Base */}
      <path
        d="M 60 162 C 80 152 96 154 100 156 C 104 154 120 152 140 162 L 132 170 C 114 162 104 164 100 166 C 96 164 86 162 68 170 Z"
        fill={`url(#${prefix}-gold-primary)`}
        stroke="#FFFDF0"
        strokeWidth="1.2"
      />

      {/* Flame Backdrop Aura */}
      <path
        d="M 100 32 C 125 58 138 92 134 124 C 130 150 115 158 100 158 C 85 158 70 150 66 124 C 62 92 75 58 100 32 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="2.2"
      />

      {/* Monumental Sculpted 3D Calligraphy: نُور (Flame Form) */}
      {/* The Nun 'ن' sweeping vessel */}
      <path
        d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108"
        fill="none"
        stroke={`url(#${prefix}-gold-radiant)`}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108"
        fill="none"
        stroke="#FFFDF0"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Floating Star Diamond Nuqta */}
      <polygon points="100,82 105,89 100,96 95,89" fill="#FFFDF0" filter={`url(#${prefix}-glow)`} />

      {/* The Waw 'و' loop */}
      <circle cx="106" cy="118" r="7" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="1.2" />
      <path d="M 111 122 C 114 130 120 134 125 135" fill="none" stroke="#FFFDF0" strokeWidth="3" strokeLinecap="round" />

      {/* The Ra 'ر' dynamic flourish */}
      <path d="M 88 124 C 84 134 78 140 70 142" fill="none" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="3.4" strokeLinecap="round" />

      {/* Crescent Apex Moon */}
      <path
        d="M 98 22 C 95 22 92 24.5 92 28 C 92 31.5 95 34 98.5 34 C 96.5 33 95.5 31 95.5 28 C 95.5 25 97 23 99 22.2 Z"
        fill="#FFFDF0"
        filter={`url(#${prefix}-glow)`}
      />
    </g>
  </g>
);

/**
 * EDITION 4: Mamluk Royal Starburst & Kaaba/Qibla Sanctuary
 */
const Edition4Vector: React.FC<{ prefix: string; animated: boolean }> = ({ prefix, animated }) => (
  <g>
    {/* 16-Point Interlocking Mamluk Starburst Frame */}
    <g
      style={{
        transformOrigin: '100px 100px',
        animation: animated ? 'noorSpinSlow 36s linear infinite' : undefined,
      }}
    >
      <circle cx="100" cy="100" r="92" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1.4" fill="none" opacity="0.65" />
      {/* Octagram 1 */}
      <rect x="36" y="36" width="128" height="128" rx="8" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.6" fill="none" opacity="0.8" />
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(45 100 100)" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.6" fill="none" opacity="0.8" />
      {/* Octagram 2 (Rotated 22.5 deg) */}
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(22.5 100 100)" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.6" />
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(67.5 100 100)" stroke={`url(#${prefix}-gold-radiant)`} strokeWidth="1" fill="none" opacity="0.6" />
    </g>

    {/* Centerpiece: Holy Kaaba Sanctuary & Qibla Compass Star */}
    <g filter={`url(#${prefix}-deep-shadow)`}>
      {/* Sanctuary Arch */}
      <path
        d="M 68 152 L 68 96 C 68 68 84 52 100 42 C 116 52 132 68 132 96 L 132 152 Z"
        fill={`url(#${prefix}-jewel-velvet)`}
        stroke={`url(#${prefix}-gold-primary)`}
        strokeWidth="2.2"
      />

      {/* The Holy Kaaba Cubic Silhouette */}
      <rect x="80" y="98" width="40" height="42" rx="2" fill="#0A0F1D" stroke={`url(#${prefix}-gold-primary)`} strokeWidth="1.6" />
      {/* Golden Kiswah Band (حزام الكعبة) */}
      <rect x="80" y="106" width="40" height="6" fill={`url(#${prefix}-gold-radiant)`} />
      {/* Bab al-Kaaba (Golden Door) */}
      <rect x="104" y="116" width="10" height="24" rx="1" fill={`url(#${prefix}-gold-radiant)`} stroke="#FFFDF0" strokeWidth="0.8" />

      {/* Radiant Celestial Compass Rose Rays */}
      <line x1="100" y1="42" x2="100" y2="28" stroke="#FFFDF0" strokeWidth="2" strokeLinecap="round" filter={`url(#${prefix}-glow)`} />
      <polygon points="100,24 103,30 100,28 97,30" fill="#FFFDF0" />

      {/* Golden Crescent At Apex */}
      <path
        d="M 98 16 C 95 16 92 18.5 92 22 C 92 25.5 95 28 98.5 28 C 96.5 27 95.5 25 95.5 22 C 95.5 19 97 17 99 16.2 Z"
        fill="#FFFDF0"
        filter={`url(#${prefix}-glow)`}
      />

      {/* Base Quran Leaves */}
      <path d="M 60 162 Q 80 152 100 158 Q 120 152 140 162 Q 100 172 60 162 Z" fill={`url(#${prefix}-gold-primary)`} stroke="#FFFDF0" strokeWidth="1" />
    </g>
  </g>
);

// ─── MAIN LIVING LOGO COMPONENT ───

export const NoorDynamicLogo: React.FC<NoorDynamicLogoProps> = ({
  size = 'md',
  customSize,
  edition,
  animated = true,
  className = '',
  showBadge = false,
  onClick,
}) => {
  const reactId = useId().replace(/:/g, '');
  const prefix = `noor-logo-${reactId}`;

  // Listen to live edition changes (e.g. from Settings "Switch Style" or visual picker)
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
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(LOGO_EDITION_CHANGE_EVENT, handler);
      window.removeEventListener(LOGO_EDITION_CHANGED_EVENT, handler);
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
      aria-label={`Noor Connect Logo — ${currentMeta.name}`}
    >
      {/* Component-scoped CSS Keyframes */}
      <style>{`
        @keyframes noorSpinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes noorPulseAura {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 0.65; transform: scale(1.04); }
        }
        @keyframes noorGentleFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
      `}</style>

      {/* SVG Container */}
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible pointer-events-none drop-shadow-md"
      >
        <SvgDefs prefix={prefix} />
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
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(LOGO_EDITION_CHANGE_EVENT, handleUpdate);
      window.removeEventListener(LOGO_EDITION_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const handlePick = (edition: NoorLogoEditionId) => {
    setSelected(edition);
    setSelectedLogoEdition(edition);
    if (onSelect) {
      onSelect(edition);
    }
  };

  return (
    <div className={`space-y-2 select-none w-full ${className}`}>
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
        {NOOR_LOGO_EDITIONS.map((ed) => {
          const isCurrent = selected === ed.id;
          return (
            <button
              key={ed.id}
              type="button"
              onClick={() => handlePick(ed.id)}
              className={`group relative flex flex-col items-center justify-between rounded-xl border transition-all duration-200 select-none min-w-0 overflow-hidden ${
                isCurrent
                  ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/40 bg-[var(--accent-soft)] shadow-md scale-[1.02]'
                  : 'border-[var(--border)] hover:border-[var(--accent)]/40 bg-[var(--surface-2)]/60 hover:bg-[var(--surface-2)] opacity-85 hover:opacity-100'
              }`}
              style={{
                minWidth: 0,
                maxWidth: '100%',
                overflow: 'hidden',
                padding: '4px 2px',
                boxSizing: 'border-box',
              }}
              title={`${ed.name} (Tap to set as App & Launcher Icon)`}
              aria-label={`Select ${ed.name}`}
            >
              {/* Active Checkmark Badge */}
              {isCurrent && (
                <div
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow"
                  style={{ background: 'var(--accent)', color: 'var(--on-accent, #000)' }}
                >
                  <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div
                className="flex items-center justify-center pointer-events-none shrink-0"
                style={{ width: '30px', height: '30px', maxWidth: '100%', overflow: 'hidden', margin: '0 auto' }}
              >
                <NoorDynamicLogo edition={ed.id} customSize={26} animated={false} />
              </div>

              <span
                style={{
                  color: isCurrent ? 'var(--accent-text)' : 'var(--text-secondary)',
                  fontSize: '0.52rem',
                  minWidth: 0,
                  maxWidth: '100%',
                  lineHeight: 1.15,
                  fontWeight: 700,
                  display: 'block',
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  width: '100%',
                  boxSizing: 'border-box',
                  paddingInline: '1px',
                }}
              >
                {ed.shortLabel ? ed.shortLabel.replace('\n', ' ') : ed.shortName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default NoorDynamicLogo;
