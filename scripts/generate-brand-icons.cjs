/**
 * NOOR CONNECT — BRAND IDENTITY & DYNAMIC ANDROID LAUNCHER ICON GENERATOR
 * 
 * Generates high-definition icons for ALL 5 Sacred Emblem Editions:
 * - Edition 0: Al-Miftah Royal Mihrab & Blooming Mushaf
 * - Edition 1: Celestial Rub el Hizb Mandala & Sacred Fanous
 * - Edition 2: Haramain Sanctuary Crest & Minarets
 * - Edition 3: Noor Al-Quran 3D Flame Medallion
 * - Edition 4: Mamluk Royal Starburst & Qibla Sanctuary
 * 
 * Generates across all Android density buckets (mdpi to xxxhdpi),
 * adaptive foregrounds, mipmap-anydpi-v26 XMLs, and Web/PWA assets.
 * Powered by sharp (Node.js). Zero runtime dependencies.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─── SHARED SVG DEFS ───
const SHARED_DEFS = `
    <!-- Deep Obsidian-Emerald Rich Background Gradient -->
    <radialGradient id="masterBg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="#0E4230" />
      <stop offset="35%" stop-color="#072A1E" />
      <stop offset="70%" stop-color="#051611" />
      <stop offset="100%" stop-color="#020B08" />
    </radialGradient>

    <!-- 24K Burnished Gold Primary Gradient -->
    <linearGradient id="goldPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF0" />
      <stop offset="18%" stop-color="#FDE08A" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="82%" stop-color="#B8860B" />
      <stop offset="100%" stop-color="#6B4E08" />
    </linearGradient>

    <!-- Radiant Warm Gold Shimmer Gradient -->
    <linearGradient id="goldRadiant" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9A6F1A" />
      <stop offset="30%" stop-color="#F5D061" />
      <stop offset="70%" stop-color="#FFF8D6" />
      <stop offset="100%" stop-color="#D4AF37" />
    </linearGradient>

    <!-- Outer Gold Rim Gradient -->
    <linearGradient id="goldRim" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFDF0" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#D4AF37" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#9A6F1A" stop-opacity="0.9" />
    </linearGradient>

    <!-- Deep Emerald Velvet Inner Gradient -->
    <linearGradient id="jewelVelvet" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0B2B1E" />
      <stop offset="45%" stop-color="#064E3B" />
      <stop offset="100%" stop-color="#021C13" />
    </linearGradient>

    <!-- Golden Aura Glow -->
    <radialGradient id="goldAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE08A" stop-opacity="0.75" />
      <stop offset="45%" stop-color="#D4AF37" stop-opacity="0.35" />
      <stop offset="85%" stop-color="#B8860B" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#6B4E08" stop-opacity="0" />
    </radialGradient>

    <!-- Drop Shadows -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#D4AF37" flood-opacity="0.55" />
    </filter>

    <filter id="deepShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="16" stdDeviation="22" flood-color="#000000" flood-opacity="0.75" />
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#D4AF37" flood-opacity="0.4" />
    </filter>
`;

// ─── 1. EDITION 0: AL-MIFTAH ROYAL MIHRAB & BLOOMING MUSHAF ───
function getEdition0Artwork() {
  return `
    <g>
      <!-- Outer Dotted Halo Ring -->
      <circle cx="100" cy="100" r="92" stroke="url(#goldRadiant)" stroke-width="1.2" stroke-dasharray="2.5 4" fill="none" opacity="0.6" />
      <!-- Square 1 -->
      <rect x="36" y="36" width="128" height="128" rx="10" stroke="url(#goldPrimary)" stroke-width="1.8" fill="none" opacity="0.88" />
      <!-- Square 2 (Rotated 45 degrees) -->
      <rect x="36" y="36" width="128" height="128" rx="10" transform="rotate(45 100 100)" stroke="url(#goldPrimary)" stroke-width="1.8" fill="none" opacity="0.88" />
      <!-- 8 Golden Starlight Nodes at Vertices -->
      <circle cx="100" cy="8" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="192" cy="100" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="100" cy="192" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="8" cy="100" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="165" cy="35" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="165" cy="165" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="35" cy="165" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
      <circle cx="35" cy="35" r="3.2" fill="#FFFDF0" filter="url(#goldGlow)" />
    </g>

    <!-- Ambient Golden Glow Disk -->
    <circle cx="100" cy="100" r="66" fill="url(#goldAura)" opacity="0.5" />

    <!-- Centerpiece Container with Deep Shadow -->
    <g filter="url(#deepShadow)">
      <!-- Left Blooming Mushaf Petal / Page -->
      <path d="M 100 162 C 84 158 54 152 44 136 C 36 122 46 102 64 98 C 76 96 88 108 96 126 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
      <path d="M 96 156 C 80 150 56 142 50 130 C 46 120 54 108 66 106 C 76 104 86 114 94 128 Z" fill="url(#jewelVelvet)" opacity="0.88" />
      <path d="M 52 130 Q 74 132 94 142" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />
      <path d="M 60 118 Q 80 124 94 134" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />

      <!-- Right Blooming Mushaf Petal / Page -->
      <path d="M 100 162 C 116 158 146 152 156 136 C 164 122 154 102 136 98 C 124 96 112 108 104 126 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
      <path d="M 104 156 C 120 150 144 142 150 130 C 154 120 146 108 134 106 C 124 104 114 114 106 128 Z" fill="url(#jewelVelvet)" opacity="0.88" />
      <path d="M 148 130 Q 126 132 106 142" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />
      <path d="M 140 118 Q 120 124 106 134" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />

      <!-- Rehal Pedestal / Plinth -->
      <polygon points="90,162 110,162 105,176 95,176" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="0.8" />
      <circle cx="100" cy="168" r="2.8" fill="#FFFDF0" />

      <!-- Royal Mihrab Arch Backdrop -->
      <path d="M 76 144 L 76 102 C 76 80 88 64 100 52 C 112 64 124 80 124 102 L 124 144 Z" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="2.2" />
      <path d="M 82 142 L 82 104 C 82 92 88 84 94 76 C 96 80 100 82 100 82 C 100 82 104 80 106 76 C 112 84 118 92 118 104 L 118 142 Z" fill="none" stroke="url(#goldRadiant)" stroke-width="1.2" stroke-dasharray="1.5 2" opacity="0.9" />

      <!-- Sculpted Pointed Mihrab Dome -->
      <path d="M 72 102 C 72 74 86 52 100 40 C 114 52 128 74 128 102 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1.4" />
      <line x1="100" y1="40" x2="100" y2="102" stroke="url(#jewelVelvet)" stroke-width="1.2" />
      <path d="M 86 98 Q 94 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75" />
      <path d="M 114 98 Q 106 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75" />

      <!-- Crescent Moon & Star Finial -->
      <g filter="url(#goldGlow)">
        <path d="M 98 24 C 95 24 92 26.5 92 30 C 92 33.5 95 36 98.5 36 C 96.5 35 95.5 33 95.5 30 C 95.5 27 97 25 99 24.2 C 98.6 24.1 98.3 24 98 24 Z" fill="#FFFDF0" stroke="url(#goldPrimary)" stroke-width="0.8" />
        <polygon points="104,27 105.2,29.5 108,29.8 106,31.7 106.5,34.5 104,33.1 101.5,34.5 102,31.7 100,29.8 102.8,29.5" fill="#FFFDF0" />
        <line x1="100" y1="36" x2="100" y2="40" stroke="url(#goldPrimary)" stroke-width="2" stroke-linecap="round" />
      </g>

      <!-- Sculpted Arabic Calligraphy: نُور (Noor) -->
      <g filter="url(#goldGlow)">
        <path d="M 87 118 C 87 132 93 138 100 138 C 107 138 113 132 113 118" fill="none" stroke="#FFFDF0" stroke-width="3.4" stroke-linecap="round" />
        <polygon points="100,105 103.5,109 100,113 96.5,109" fill="#FFFDF0" stroke="url(#goldPrimary)" stroke-width="0.8" />
        <circle cx="106" cy="116" r="3.2" fill="#FFFDF0" />
        <path d="M 109 119 C 111 123 113 126 114 127" fill="none" stroke="#FFFDF0" stroke-width="2.2" stroke-linecap="round" />
        <path d="M 112 120 C 113 125 116 128 118 129" fill="none" stroke="#FFFDF0" stroke-width="2.6" stroke-linecap="round" />
      </g>
    </g>
  `;
}

// ─── 2. EDITION 1: CELESTIAL RUB EL HIZB MANDALA & SACRED FANOUS ───
function getEdition1Artwork() {
  const petals = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5].map(angle => `
    <g transform="rotate(${angle} 100 100)">
      <path d="M 100 10 C 94 24 94 36 100 44 C 106 36 106 24 100 10 Z" fill="url(#goldPrimary)" opacity="0.8" />
      <circle cx="100" cy="8" r="2.2" fill="#FFFDF0" />
    </g>
  `).join('');

  return `
    <g>
      <circle cx="100" cy="100" r="92" stroke="url(#goldRadiant)" stroke-width="1.2" fill="none" opacity="0.6" />
      ${petals}
    </g>

    <!-- Radiant Light Rays -->
    <g opacity="0.65">
      <line x1="100" y1="105" x2="60" y2="70" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
      <line x1="100" y1="105" x2="140" y2="70" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
      <line x1="100" y1="105" x2="50" y2="105" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
      <line x1="100" y1="105" x2="150" y2="105" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
      <line x1="100" y1="105" x2="68" y2="140" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
      <line x1="100" y1="105" x2="132" y2="140" stroke="url(#goldRadiant)" stroke-width="1.5" stroke-dasharray="3 3" />
    </g>

    <!-- Sacred Mamluk Fanous (Lantern) Centerpiece -->
    <g filter="url(#deepShadow)">
      <circle cx="100" cy="36" r="6" stroke="url(#goldPrimary)" stroke-width="2.2" fill="none" />
      <line x1="100" y1="42" x2="100" y2="50" stroke="url(#goldPrimary)" stroke-width="2" />
      <polygon points="90,56 110,56 104,50 96,50" fill="url(#goldPrimary)" />
      <path d="M 82 72 L 118 72 L 110 56 L 90 56 Z" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="1" />

      <!-- Main Glass Chamber -->
      <polygon points="82,72 118,72 110,126 90,126" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="2" />
      <line x1="96" y1="72" x2="96" y2="126" stroke="url(#goldRadiant)" stroke-width="1" opacity="0.8" />
      <line x1="104" y1="72" x2="104" y2="126" stroke="url(#goldRadiant)" stroke-width="1" opacity="0.8" />

      <!-- Inner Glowing Candle / Lantern Flame & Noor -->
      <ellipse cx="100" cy="100" rx="14" ry="18" fill="url(#goldAura)" />
      <path d="M 100 86 C 96 94 94 100 96 105 C 98 109 102 109 104 105 C 106 100 104 94 100 86 Z" fill="#FFFDF0" filter="url(#goldGlow)" />

      <!-- Lantern Pedestal & Scalloped Feet -->
      <path d="M 88 126 L 112 126 L 116 138 L 84 138 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
      <circle cx="90" cy="141" r="2" fill="url(#goldPrimary)" />
      <circle cx="100" cy="141" r="2.5" fill="#FFFDF0" />
      <circle cx="110" cy="141" r="2" fill="url(#goldPrimary)" />

      <!-- Open Quran Cradle Beneath -->
      <path d="M 100 156 Q 74 146 54 158 Q 76 168 100 162 Q 124 168 146 158 Q 126 146 100 156 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
      <line x1="100" y1="156" x2="100" y2="162" stroke="url(#jewelVelvet)" stroke-width="1.5" />
    </g>
  `;
}

// ─── 3. EDITION 2: HARAMAIN SANCTUARY CREST & MINARETS ───
function getEdition2Artwork() {
  const drumArches = [80, 88, 96, 104, 112].map(x => `
    <path d="M ${x} 118 L ${x} 110 Q ${x + 4} 107 ${x + 8} 110 L ${x + 8} 118 Z" fill="url(#jewelVelvet)" />
  `).join('');

  return `
    <!-- Embracing Golden Royal Crescent Crest -->
    <g filter="url(#goldGlow)">
      <path
        d="M 100 14 C 54 14 16 52 16 98 C 16 144 54 182 100 182 C 146 182 184 144 184 98 C 184 76 175 56 161 41 C 172 58 172 84 161 106 C 145 138 106 150 74 134 C 42 118 30 79 46 47 C 58 24 82 14 100 14 Z"
        fill="url(#goldPrimary)"
        opacity="0.9"
      />
    </g>

    <!-- Grand Central Ribbed Sanctuary Dome -->
    <g filter="url(#deepShadow)">
      <rect x="74" y="104" width="52" height="18" rx="2" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
      ${drumArches}

      <!-- Main Ribbed Dome -->
      <path d="M 72 104 C 72 70 85 48 100 44 C 115 48 128 70 128 104 Z" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="2.4" />
      <line x1="100" y1="44" x2="100" y2="104" stroke="url(#goldRadiant)" stroke-width="1.8" />
      <path d="M 85 98 Q 92 68 100 45" stroke="url(#goldRadiant)" stroke-width="1.2" fill="none" opacity="0.8" />
      <path d="M 115 98 Q 108 68 100 45" stroke="url(#goldRadiant)" stroke-width="1.2" fill="none" opacity="0.8" />

      <!-- Crescent Spire on Dome -->
      <line x1="100" y1="34" x2="100" y2="44" stroke="url(#goldPrimary)" stroke-width="2" />
      <path d="M 98 28 C 96 28 94 30 94 32.5 C 94 35 96.5 37 99 37 C 97.5 36 96.5 34.5 96.5 32.5 C 96.5 30.5 97.5 29 99.5 28.2 Z" fill="#FFFDF0" />

      <!-- Left Slender Minaret -->
      <g>
        <rect x="52" y="60" width="10" height="74" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="0.8" />
        <rect x="50" y="56" width="14" height="4" fill="#FFFDF0" />
        <polygon points="57,36 63,56 51,56" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="1" />
        <line x1="57" y1="30" x2="57" y2="36" stroke="url(#goldPrimary)" stroke-width="1.5" />
        <circle cx="57" cy="29" r="1.5" fill="#FFFDF0" />
        <rect x="49" y="86" width="16" height="5" rx="1" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="0.6" />
      </g>

      <!-- Right Slender Minaret -->
      <g>
        <rect x="138" y="60" width="10" height="74" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="0.8" />
        <rect x="136" y="56" width="14" height="4" fill="#FFFDF0" />
        <polygon points="143,36 149,56 137,56" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="1" />
        <line x1="143" y1="30" x2="143" y2="36" stroke="url(#goldPrimary)" stroke-width="1.5" />
        <circle cx="143" cy="29" r="1.5" fill="#FFFDF0" />
        <rect x="135" y="86" width="16" height="5" rx="1" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="0.6" />
      </g>

      <!-- Base Plinth with Arabic Noor -->
      <rect x="42" y="134" width="116" height="18" rx="4" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="1.6" />
      <text x="100" y="147" fill="#FFFDF0" font-size="13" font-weight="bold" font-family="serif" text-anchor="middle" letter-spacing="2">نُـوْر</text>
    </g>
  `;
}

// ─── 4. EDITION 3: NOOR AL-QURAN 3D FLAME MEDALLION ───
function getEdition3Artwork() {
  const diamonds = [0, 45, 90, 135, 180, 225, 270, 315].map(ang => `
    <polygon points="100,7 103,10 100,13 97,10" transform="rotate(${ang} 100 100)" fill="#FFFDF0" filter="url(#goldGlow)" />
  `).join('');

  return `
    <g>
      <circle cx="100" cy="100" r="90" stroke="url(#goldPrimary)" stroke-width="1.6" fill="none" opacity="0.75" />
      <circle cx="100" cy="100" r="82" stroke="url(#goldRadiant)" stroke-width="1" stroke-dasharray="3 4" fill="none" opacity="0.6" />
      ${diamonds}
    </g>

    <!-- Sculpted 3D Thuluth Calligraphic Flame of Noor -->
    <g filter="url(#deepShadow)">
      <path
        d="M 60 162 C 80 152 96 154 100 156 C 104 154 120 152 140 162 L 132 170 C 114 162 104 164 100 166 C 96 164 86 162 68 170 Z"
        fill="url(#goldPrimary)"
        stroke="#FFFDF0"
        stroke-width="1.2"
      />
      <!-- Flame Backdrop Aura -->
      <path
        d="M 100 32 C 125 58 138 92 134 124 C 130 150 115 158 100 158 C 85 158 70 150 66 124 C 62 92 75 58 100 32 Z"
        fill="url(#jewelVelvet)"
        stroke="url(#goldPrimary)"
        stroke-width="2.2"
      />
      <!-- Nun Sweeping Vessel -->
      <path d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108" fill="none" stroke="url(#goldRadiant)" stroke-width="5" stroke-linecap="round" />
      <path d="M 76 108 C 76 138 90 148 100 148 C 110 148 124 138 124 108" fill="none" stroke="#FFFDF0" stroke-width="2.2" stroke-linecap="round" />
      <polygon points="100,82 105,89 100,96 95,89" fill="#FFFDF0" filter="url(#goldGlow)" />
      <!-- Waw loop -->
      <circle cx="106" cy="118" r="7" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1.2" />
      <path d="M 111 122 C 114 130 120 134 125 135" fill="none" stroke="#FFFDF0" stroke-width="3" stroke-linecap="round" />
      <!-- Ra flourish -->
      <path d="M 88 124 C 84 134 78 140 70 142" fill="none" stroke="url(#goldPrimary)" stroke-width="3.4" stroke-linecap="round" />
      <!-- Crescent Apex Moon -->
      <path d="M 98 22 C 95 22 92 24.5 92 28 C 92 31.5 95 34 98.5 34 C 96.5 33 95.5 31 95.5 28 C 95.5 25 97 23 99 22.2 Z" fill="#FFFDF0" filter="url(#goldGlow)" />
    </g>
  `;
}

// ─── 5. EDITION 4: MAMLUK ROYAL STARBURST & QIBLA SANCTUARY ───
function getEdition4Artwork() {
  return `
    <g>
      <circle cx="100" cy="100" r="92" stroke="url(#goldRadiant)" stroke-width="1.4" fill="none" opacity="0.65" />
      <rect x="36" y="36" width="128" height="128" rx="8" stroke="url(#goldPrimary)" stroke-width="1.6" fill="none" opacity="0.8" />
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(45 100 100)" stroke="url(#goldPrimary)" stroke-width="1.6" fill="none" opacity="0.8" />
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(22.5 100 100)" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.6" />
      <rect x="36" y="36" width="128" height="128" rx="8" transform="rotate(67.5 100 100)" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.6" />
    </g>

    <!-- Centerpiece: Holy Kaaba Sanctuary & Qibla Compass Star -->
    <g filter="url(#deepShadow)">
      <path d="M 68 152 L 68 96 C 68 68 84 52 100 42 C 116 52 132 68 132 96 L 132 152 Z" fill="url(#jewelVelvet)" stroke="url(#goldPrimary)" stroke-width="2.2" />
      <rect x="80" y="98" width="40" height="42" rx="2" fill="#0A0F1D" stroke="url(#goldPrimary)" stroke-width="1.6" />
      <rect x="80" y="106" width="40" height="6" fill="url(#goldRadiant)" />
      <rect x="104" y="116" width="10" height="24" rx="1" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="0.8" />
      <!-- Radiant Celestial Compass Rose Rays -->
      <line x1="100" y1="42" x2="100" y2="28" stroke="#FFFDF0" stroke-width="2" stroke-linecap="round" filter="url(#goldGlow)" />
      <polygon points="100,24 103,30 100,28 97,30" fill="#FFFDF0" />
      <path d="M 98 16 C 95 16 92 18.5 92 22 C 92 25.5 95 28 98.5 28 C 96.5 27 95.5 25 95.5 22 C 95.5 19 97 17 99 16.2 Z" fill="#FFFDF0" filter="url(#goldGlow)" />
      <path d="M 60 162 Q 80 152 100 158 Q 120 152 140 162 Q 100 172 60 162 Z" fill="url(#goldPrimary)" stroke="#FFFDF0" stroke-width="1" />
    </g>
  `;
}

// ─── MASTER SVG BUILDER FOR ANY EDITION ───
function getSvgForEdition(editionIndex, { transparent = false, rounded = false, circle = false } = {}) {
  const bgMarkup = transparent
    ? ''
    : circle
    ? `<circle cx="512" cy="512" r="510" fill="url(#masterBg)" stroke="url(#goldRim)" stroke-width="8" />`
    : rounded
    ? `<rect x="6" y="6" width="1012" height="1012" rx="224" fill="url(#masterBg)" stroke="url(#goldRim)" stroke-width="8" />`
    : `<rect width="1024" height="1024" fill="url(#masterBg)" />`;

  let innerArtwork = '';
  switch (editionIndex) {
    case 0:
      innerArtwork = getEdition0Artwork();
      break;
    case 1:
      innerArtwork = getEdition1Artwork();
      break;
    case 2:
      innerArtwork = getEdition2Artwork();
      break;
    case 3:
      innerArtwork = getEdition3Artwork();
      break;
    case 4:
      innerArtwork = getEdition4Artwork();
      break;
    default:
      innerArtwork = getEdition0Artwork();
  }

  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    ${SHARED_DEFS}
  </defs>

  ${bgMarkup}

  <!-- Center Artwork Scaled to 1024x1024 Coordinate Space -->
  <g transform="translate(512 512) scale(4.4) translate(-100 -100)">
    ${innerArtwork}
  </g>
</svg>
`;
}

// Minimal Windows ICO creator from PNG buffer
function createIcoFromPng(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Type 1 = ICO
  header.writeUInt16LE(1, 4); // Count 1 image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(48, 0); // Width 48
  entry.writeUInt8(48, 1); // Height 48
  entry.writeUInt8(0, 2);  // Palette count
  entry.writeUInt8(0, 3);  // Reserved
  entry.writeUInt16LE(1, 4); // Color planes
  entry.writeUInt16LE(32, 6); // Bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // Size of PNG data
  entry.writeUInt32LE(22, 12); // Offset (6 + 16)

  return Buffer.concat([header, entry, pngBuffer]);
}

async function main() {
  console.log('🕌 Generating Master 3D Royal Gold & Emerald Brand Icons for ALL 5 EDITIONS...');

  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const publicIconsDir = path.join(publicDir, 'icons');
  const brandingDir = path.join(rootDir, 'branding');
  const assetsDir = path.join(rootDir, 'assets');
  const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');
  const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
  const drawableDir = path.join(resDir, 'drawable');

  [publicIconsDir, brandingDir, assetsDir, anydpiDir, drawableDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // ─── 1. WEB & PWA ASSETS (Edition 0 Flagship) ───
  console.log('\n📦 Generating Web & PWA Icons in public/ and public/icons/...');

  const ed0SquareSvg = Buffer.from(getSvgForEdition(0, { rounded: true }));
  const ed0CircleSvg = Buffer.from(getSvgForEdition(0, { circle: true }));

  // Favicon SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), ed0CircleSvg);
  console.log('   ✓ public/favicon.svg');

  // Master 512 & Branding
  await sharp(ed0SquareSvg).resize(512, 512).png().toFile(path.join(brandingDir, 'app-icon-512.png'));
  await sharp(ed0SquareSvg).resize(512, 512).png().toFile(path.join(brandingDir, 'noor-logo.png'));
  await sharp(ed0SquareSvg).resize(512, 512).png().toFile(path.join(publicDir, 'logo-mark.png'));
  console.log('   ✓ branding/app-icon-512.png & noor-logo.png');

  // PWA sizes
  const pwaSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];
  for (const s of pwaSizes) {
    const buf = await sharp(ed0SquareSvg).resize(s, s).png().toBuffer();
    fs.writeFileSync(path.join(publicDir, `icon-${s}x${s}.png`), buf);
    fs.writeFileSync(path.join(publicIconsDir, `icon-${s}x${s}.png`), buf);
  }
  console.log(`   ✓ All ${pwaSizes.length} PWA sizes in public/ and public/icons/`);

  // apple-touch-icon.png (180x180)
  const appleBuf = await sharp(ed0SquareSvg).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleBuf);
  console.log('   ✓ public/apple-touch-icon.png (180x180)');

  // favicon.png (48x48) & favicon.ico
  const favBuf48 = await sharp(ed0CircleSvg).resize(48, 48).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favBuf48);
  const icoBuf = createIcoFromPng(favBuf48);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  console.log('   ✓ public/favicon.png & public/favicon.ico');

  // Native Splash Asset: assets/splash.png (2732x2732 solid #051611)
  const splashLogo = await sharp(ed0SquareSvg).resize(1000, 1000).toBuffer();
  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#051611',
    },
  })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('   ✓ assets/splash.png (2732x2732 Royal Obsidian-Emerald)');

  // ─── 2. ANDROID NATIVE ADAPTIVE & LAUNCHER ICONS FOR ALL 5 EDITIONS ───
  console.log('\n🤖 Generating Android Native mipmap-* Icons for ALL 5 EDITIONS...');

  const densities = [
    { name: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { name: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { name: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { name: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ];

  for (let ed = 0; ed <= 4; ed++) {
    console.log(`\n   --- Generating Edition ${ed} Assets ---`);
    const squareSvg = Buffer.from(getSvgForEdition(ed, { rounded: true }));
    const circleSvg = Buffer.from(getSvgForEdition(ed, { circle: true }));
    const transSvg = Buffer.from(getSvgForEdition(ed, { transparent: true }));

    for (const d of densities) {
      const dir = path.join(resDir, d.name);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      // 1. ic_launcher_ed{ed}.png
      await sharp(squareSvg)
        .resize(d.launcher, d.launcher)
        .png()
        .toFile(path.join(dir, `ic_launcher_ed${ed}.png`));

      // 2. ic_launcher_ed{ed}_round.png
      await sharp(circleSvg)
        .resize(d.launcher, d.launcher)
        .png()
        .toFile(path.join(dir, `ic_launcher_ed${ed}_round.png`));

      // 3. ic_launcher_ed{ed}_foreground.png (Safe 70% inner zone)
      const insetSize = Math.round(d.foreground * 0.70);
      const emblemBuffer = await sharp(transSvg)
        .resize(insetSize, insetSize)
        .toBuffer();

      await sharp({
        create: {
          width: d.foreground,
          height: d.foreground,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite([{ input: emblemBuffer, gravity: 'center' }])
        .png()
        .toFile(path.join(dir, `ic_launcher_ed${ed}_foreground.png`));

      // If Edition 0, also write default base names
      if (ed === 0) {
        await sharp(squareSvg)
          .resize(d.launcher, d.launcher)
          .png()
          .toFile(path.join(dir, 'ic_launcher.png'));

        await sharp(circleSvg)
          .resize(d.launcher, d.launcher)
          .png()
          .toFile(path.join(dir, 'ic_launcher_round.png'));

        await sharp({
          create: {
            width: d.foreground,
            height: d.foreground,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([{ input: emblemBuffer, gravity: 'center' }])
          .png()
          .toFile(path.join(dir, 'ic_launcher_foreground.png'));
      }
    }

    // Write mipmap-anydpi-v26 XMLs for Edition {ed}
    const edXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_ed${ed}_foreground"/>
</adaptive-icon>
`;
    fs.writeFileSync(path.join(anydpiDir, `ic_launcher_ed${ed}.xml`), edXml);
    fs.writeFileSync(path.join(anydpiDir, `ic_launcher_ed${ed}_round.xml`), edXml);

    // Also write drawable foreground bitmap XML for maximum compatibility
    const drawableXml = `<?xml version="1.0" encoding="utf-8"?>
<bitmap xmlns:android="http://schemas.android.com/apk/res/android"
    android:src="@mipmap/ic_launcher_ed${ed}_foreground" />
`;
    fs.writeFileSync(path.join(drawableDir, `ic_launcher_ed${ed}_foreground.xml`), drawableXml);

    console.log(`   ✓ Edition ${ed}: Generated across all 5 densities + anydpi-v26 + drawable`);
  }

  console.log('\n🎉 ALL 5 ROYAL LOGO EDITIONS & ANDROID LAUNCHER ICONS GENERATED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
