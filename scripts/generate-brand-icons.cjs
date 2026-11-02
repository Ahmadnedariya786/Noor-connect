/**
 * NOOR CONNECT — BRAND IDENTITY & ANDROID LAUNCHER ICON GENERATOR
 * 
 * Generates the Master 3D Royal Gold & Emerald "Blooming Mushaf + Mihrab Dome + Rub el Hizb + نُور Calligraphy"
 * Emblem across all Android density buckets (mdpi to xxxhdpi) and Web/PWA icon resolutions.
 * Powered by sharp (Node.js). Zero runtime dependencies.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// ─── 1. MASTER ICON VECTOR SVG TEMPLATES (1024x1024) ───

function getMasterSvg({ transparent = false, rounded = false, circle = false } = {}) {
  const bgMarkup = transparent
    ? ''
    : circle
    ? `<circle cx="512" cy="512" r="510" fill="url(#masterBg)" stroke="url(#goldRim)" stroke-width="8" />`
    : rounded
    ? `<rect x="6" y="6" width="1012" height="1012" rx="224" fill="url(#masterBg)" stroke="url(#goldRim)" stroke-width="8" />`
    : `<rect width="1024" height="1024" fill="url(#masterBg)" />`;

  return `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
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
  </defs>

  ${bgMarkup}

  <!-- Center Artwork Scaled to 1024x1024 Coordinate Space -->
  <g transform="translate(512 512) scale(4.4) translate(-100 -100)">
    <!-- Outer Counter-Rotating Rub el Hizb (۞) Golden Filigree Ring -->
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
      <path
        d="M 100 162 C 84 158 54 152 44 136 C 36 122 46 102 64 98 C 76 96 88 108 96 126 Z"
        fill="url(#goldPrimary)"
        stroke="#FFFDF0"
        stroke-width="1"
      />
      <path
        d="M 96 156 C 80 150 56 142 50 130 C 46 120 54 108 66 106 C 76 104 86 114 94 128 Z"
        fill="url(#jewelVelvet)"
        opacity="0.88"
      />
      <!-- Page Veins -->
      <path d="M 52 130 Q 74 132 94 142" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />
      <path d="M 60 118 Q 80 124 94 134" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />

      <!-- Right Blooming Mushaf Petal / Page -->
      <path
        d="M 100 162 C 116 158 146 152 156 136 C 164 122 154 102 136 98 C 124 96 112 108 104 126 Z"
        fill="url(#goldPrimary)"
        stroke="#FFFDF0"
        stroke-width="1"
      />
      <path
        d="M 104 156 C 120 150 144 142 150 130 C 154 120 146 108 134 106 C 124 104 114 114 106 128 Z"
        fill="url(#jewelVelvet)"
        opacity="0.88"
      />
      <!-- Page Veins -->
      <path d="M 148 130 Q 126 132 106 142" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />
      <path d="M 140 118 Q 120 124 106 134" stroke="url(#goldRadiant)" stroke-width="1" fill="none" opacity="0.8" />

      <!-- Rehal Pedestal / Plinth -->
      <polygon points="90,162 110,162 105,176 95,176" fill="url(#goldRadiant)" stroke="#FFFDF0" stroke-width="0.8" />
      <circle cx="100" cy="168" r="2.8" fill="#FFFDF0" />

      <!-- Royal Mihrab Arch Backdrop -->
      <path
        d="M 76 144 L 76 102 C 76 80 88 64 100 52 C 112 64 124 80 124 102 L 124 144 Z"
        fill="url(#jewelVelvet)"
        stroke="url(#goldPrimary)"
        stroke-width="2.2"
      />

      <!-- Decorative Inner Cusped Foil -->
      <path
        d="M 82 142 L 82 104 C 82 92 88 84 94 76 C 96 80 100 82 100 82 C 100 82 104 80 106 76 C 112 84 118 92 118 104 L 118 142 Z"
        fill="none"
        stroke="url(#goldRadiant)"
        stroke-width="1.2"
        stroke-dasharray="1.5 2"
        opacity="0.9"
      />

      <!-- Sculpted Pointed Mihrab Dome -->
      <path
        d="M 72 102 C 72 74 86 52 100 40 C 114 52 128 74 128 102 Z"
        fill="url(#goldPrimary)"
        stroke="#FFFDF0"
        stroke-width="1.4"
      />
      <!-- Dome Ribs -->
      <line x1="100" y1="40" x2="100" y2="102" stroke="url(#jewelVelvet)" stroke-width="1.2" />
      <path d="M 86 98 Q 94 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75" />
      <path d="M 114 98 Q 106 66 100 42" stroke="#FFFDF0" stroke-width="0.8" fill="none" opacity="0.75" />

      <!-- Crescent Moon & Star Finial -->
      <g filter="url(#goldGlow)">
        <path
          d="M 98 24 C 95 24 92 26.5 92 30 C 92 33.5 95 36 98.5 36 C 96.5 35 95.5 33 95.5 30 C 95.5 27 97 25 99 24.2 C 98.6 24.1 98.3 24 98 24 Z"
          fill="#FFFDF0"
          stroke="url(#goldPrimary)"
          stroke-width="0.8"
        />
        <polygon
          points="104,27 105.2,29.5 108,29.8 106,31.7 106.5,34.5 104,33.1 101.5,34.5 102,31.7 100,29.8 102.8,29.5"
          fill="#FFFDF0"
        />
        <line x1="100" y1="36" x2="100" y2="40" stroke="url(#goldPrimary)" stroke-width="2" stroke-linecap="round" />
      </g>

      <!-- Sculpted Arabic Calligraphy: نُور (Noor) -->
      <g filter="url(#goldGlow)">
        <!-- Letter 'ن' (Main protective crescent vessel) -->
        <path
          d="M 87 118 C 87 132 93 138 100 138 C 107 138 113 132 113 118"
          fill="none"
          stroke="#FFFDF0"
          stroke-width="3.4"
          stroke-linecap="round"
        />
        <!-- Radiant Diamond Dot of the Nun -->
        <polygon points="100,105 103.5,109 100,113 96.5,109" fill="#FFFDF0" stroke="url(#goldPrimary)" stroke-width="0.8" />
        <!-- Letter 'و' -->
        <circle cx="106" cy="116" r="3.2" fill="#FFFDF0" />
        <path d="M 109 119 C 111 123 113 126 114 127" fill="none" stroke="#FFFDF0" stroke-width="2.2" stroke-linecap="round" />
        <!-- Letter 'ر' -->
        <path d="M 112 120 C 113 125 116 128 118 129" fill="none" stroke="#FFFDF0" stroke-width="2.6" stroke-linecap="round" />
      </g>
    </g>
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
  console.log('🕌 Generating Master 3D Royal Gold & Emerald Brand Icons for Noor Connect v2.2.1...');

  const masterSquareSvg = Buffer.from(getMasterSvg({ rounded: true }));
  const masterCircleSvg = Buffer.from(getMasterSvg({ circle: true }));
  const masterTransparentSvg = Buffer.from(getMasterSvg({ transparent: true }));

  // Directories
  const rootDir = path.resolve(__dirname, '..');
  const publicDir = path.join(rootDir, 'public');
  const publicIconsDir = path.join(publicDir, 'icons');
  const brandingDir = path.join(rootDir, 'branding');
  const assetsDir = path.join(rootDir, 'assets');
  const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

  [publicIconsDir, brandingDir, assetsDir].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  // ─── 1. WEB & PWA ASSETS ───
  console.log('\n📦 Generating Web & PWA Icons in public/ and public/icons/...');

  // Favicon SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), masterCircleSvg);
  console.log('   ✓ public/favicon.svg');

  // Master 512 & Branding
  await sharp(masterSquareSvg).resize(512, 512).png().toFile(path.join(brandingDir, 'app-icon-512.png'));
  await sharp(masterSquareSvg).resize(512, 512).png().toFile(path.join(brandingDir, 'noor-logo.png'));
  await sharp(masterSquareSvg).resize(512, 512).png().toFile(path.join(publicDir, 'logo-mark.png'));
  console.log('   ✓ branding/app-icon-512.png & noor-logo.png');

  // PWA sizes
  const pwaSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];
  for (const s of pwaSizes) {
    const buf = await sharp(masterSquareSvg).resize(s, s).png().toBuffer();
    fs.writeFileSync(path.join(publicDir, `icon-${s}x${s}.png`), buf);
    fs.writeFileSync(path.join(publicIconsDir, `icon-${s}x${s}.png`), buf);
  }
  console.log(`   ✓ All ${pwaSizes.length} PWA sizes in public/ and public/icons/`);

  // apple-touch-icon.png (180x180)
  const appleBuf = await sharp(masterSquareSvg).resize(180, 180).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleBuf);
  console.log('   ✓ public/apple-touch-icon.png (180x180)');

  // favicon.png (48x48) & favicon.ico
  const favBuf48 = await sharp(masterCircleSvg).resize(48, 48).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), favBuf48);
  const icoBuf = createIcoFromPng(favBuf48);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);
  console.log('   ✓ public/favicon.png & public/favicon.ico');

  // Native Splash Asset: assets/splash.png (2732x2732 solid #051611)
  const splashLogo = await sharp(masterSquareSvg).resize(1000, 1000).toBuffer();
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

  // ─── 2. ANDROID NATIVE ADAPTIVE & LAUNCHER ICONS ───
  console.log('\n🤖 Generating Android Native mipmap-* Icons...');

  const densities = [
    { name: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { name: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { name: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { name: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(resDir, d.name);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // 1. ic_launcher.png (Square / Squircle)
    await sharp(masterSquareSvg)
      .resize(d.launcher, d.launcher)
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // 2. ic_launcher_round.png (Circular)
    await sharp(masterCircleSvg)
      .resize(d.launcher, d.launcher)
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // 3. ic_launcher_foreground.png (Centered within 70% safe zone on transparent background)
    const insetSize = Math.round(d.foreground * 0.70);
    const emblemBuffer = await sharp(masterTransparentSvg)
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
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`   ✓ ${d.name}: ic_launcher (${d.launcher}px), ic_launcher_round (${d.launcher}px), ic_launcher_foreground (${d.foreground}px)`);
  }

  console.log('\n🎉 ALL ROYAL BRAND & ANDROID ICONS GENERATED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Icon generation failed:', err);
  process.exit(1);
});
