const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const assetsDir = path.join(__dirname, '..', 'src', 'assets');
const publicDir = path.join(__dirname, '..', 'public');
const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// ============================================================================
// 1. STANDALONE SYMBOL SVG (Single Source of Truth: src/assets/logo-mark.svg)
// ============================================================================
const logoMarkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient (Deep Indigo / Near-Black) -->
    <radialGradient id="bgGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#181335"/>
      <stop offset="60%" stop-color="#0E0B1E"/>
      <stop offset="100%" stop-color="#080612"/>
    </radialGradient>

    <!-- Warm Gold Gradient (#F5C542 -> #E8A317) -->
    <linearGradient id="noorGold" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="25%" stop-color="#F5C542"/>
      <stop offset="70%" stop-color="#E8A317"/>
      <stop offset="100%" stop-color="#C9860A"/>
    </linearGradient>

    <!-- Star Luminous Radial Glow -->
    <radialGradient id="starAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F5C542" stop-opacity="0.45"/>
      <stop offset="50%" stop-color="#E8A317" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#E8A317" stop-opacity="0"/>
    </radialGradient>

    <!-- Filter for soft outer glow on star only -->
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Container: Deep Indigo Rounded Square (#0E0B1E) -->
  <rect width="512" height="512" rx="112" fill="url(#bgGlow)"/>
  <rect width="510" height="510" x="1" y="1" rx="111" fill="none" stroke="#F5C542" stroke-opacity="0.12" stroke-width="2"/>

  <!-- Star Soft Aura Glow -->
  <circle cx="256" cy="134" r="48" fill="url(#starAura)"/>

  <!-- ========================================== -->
  <!-- 1. RUB-EL-HIZB 8-POINTED ISLAMIC STAR     -->
  <!-- ========================================== -->
  <g filter="url(#softGlow)">
    <!-- Square 1 (Straight) -->
    <rect x="230" y="108" width="52" height="52" rx="3.5" fill="url(#noorGold)"/>
    <!-- Square 2 (Rotated 45 degrees) -->
    <rect x="230" y="108" width="52" height="52" rx="3.5" transform="rotate(45 256 134)" fill="url(#noorGold)"/>
    <!-- Center Geometric Negative-Space Aperture -->
    <circle cx="256" cy="134" r="7.5" fill="#0E0B1E"/>
  </g>

  <!-- ========================================== -->
  <!-- 2. OPEN BOOK PAGES / SOFT LIGHT RAYS       -->
  <!-- ========================================== -->
  <!-- Left Page / Ray -->
  <path d="M 248 196
           C 236 206 198 222 170 228
           C 156 231 150 241 154 251
           C 172 291 216 316 246 323
           C 250 324 252 321 252 317
           C 246 280 246 228 248 196 Z"
        fill="url(#noorGold)"/>

  <!-- Left Page Internal Facet Line (Negative Space Slit) -->
  <path d="M 238 232 C 218 245 194 256 172 256"
        fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

  <!-- Right Page / Ray (Mirror) -->
  <path d="M 264 196
           C 276 206 314 222 342 228
           C 356 231 362 241 358 251
           C 340 291 296 316 266 323
           C 262 324 260 321 260 317
           C 266 280 266 228 264 196 Z"
        fill="url(#noorGold)"/>

  <!-- Right Page Internal Facet Line (Negative Space Slit) -->
  <path d="M 274 232 C 294 245 318 256 340 256"
        fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

  <!-- Central Light Ray / Mihrab Negative Space Peak -->
  <polygon points="256,180 251,195 261,195" fill="url(#noorGold)"/>

  <!-- ========================================== -->
  <!-- 3. STYLIZED CRESCENT MOON (CRADLING BASE) -->
  <!-- ========================================== -->
  <path d="M 126 222
           C 126 322 186 398 256 398
           C 326 398 386 322 386 222
           C 368 296 320 354 256 354
           C 192 354 144 296 126 222 Z"
        fill="url(#noorGold)"/>
</svg>`;

// ============================================================================
// 2. TRANSPARENT SYMBOL ONLY (for adaptive foregrounds / transparent contexts)
// ============================================================================
const logoSymbolOnlySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="noorGold" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="25%" stop-color="#F5C542"/>
      <stop offset="70%" stop-color="#E8A317"/>
      <stop offset="100%" stop-color="#C9860A"/>
    </linearGradient>
    <radialGradient id="starAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F5C542" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#E8A317" stop-opacity="0"/>
    </radialGradient>
    <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="4.5" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <circle cx="256" cy="134" r="48" fill="url(#starAura)"/>

  <!-- Rub-el-Hizb 8-Pointed Star -->
  <g filter="url(#softGlow)">
    <rect x="230" y="108" width="52" height="52" rx="3.5" fill="url(#noorGold)"/>
    <rect x="230" y="108" width="52" height="52" rx="3.5" transform="rotate(45 256 134)" fill="url(#noorGold)"/>
    <circle cx="256" cy="134" r="7.5" fill="#0E0B1E"/>
  </g>

  <!-- Left Page / Ray -->
  <path d="M 248 196
           C 236 206 198 222 170 228
           C 156 231 150 241 154 251
           C 172 291 216 316 246 323
           C 250 324 252 321 252 317
           C 246 280 246 228 248 196 Z"
        fill="url(#noorGold)"/>
  <path d="M 238 232 C 218 245 194 256 172 256"
        fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

  <!-- Right Page / Ray -->
  <path d="M 264 196
           C 276 206 314 222 342 228
           C 356 231 362 241 358 251
           C 340 291 296 316 266 323
           C 262 324 260 321 260 317
           C 266 280 266 228 264 196 Z"
        fill="url(#noorGold)"/>
  <path d="M 274 232 C 294 245 318 256 340 256"
        fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

  <polygon points="256,180 251,195 261,195" fill="url(#noorGold)"/>

  <!-- Crescent Moon -->
  <path d="M 126 222
           C 126 322 186 398 256 398
           C 326 398 386 322 386 222
           C 368 296 320 354 256 354
           C 192 354 144 296 126 222 Z"
        fill="url(#noorGold)"/>
</svg>`;

// ============================================================================
// 3. HORIZONTAL LOCKUP SVG (Symbol + Wordmark "NOOR CONNECT" for Splash / Header)
// ============================================================================
const logoFullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 160" width="640" height="160">
  <defs>
    <radialGradient id="markGlow" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#181335"/>
      <stop offset="60%" stop-color="#0E0B1E"/>
      <stop offset="100%" stop-color="#080612"/>
    </radialGradient>
    <linearGradient id="textGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="35%" stop-color="#F5C542"/>
      <stop offset="70%" stop-color="#E8A317"/>
      <stop offset="100%" stop-color="#D48F0E"/>
    </linearGradient>
    <linearGradient id="subGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E2B85A"/>
      <stop offset="100%" stop-color="#C58F28"/>
    </linearGradient>
    <filter id="markSoftGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Left: The Symbol in a 128x128 Container -->
  <g transform="translate(16, 16) scale(0.25)">
    <!-- Container -->
    <rect width="512" height="512" rx="112" fill="url(#markGlow)"/>
    <rect width="510" height="510" x="1" y="1" rx="111" fill="none" stroke="#F5C542" stroke-opacity="0.18" stroke-width="2"/>

    <!-- Star -->
    <g filter="url(#markSoftGlow)">
      <rect x="230" y="108" width="52" height="52" rx="3.5" fill="url(#textGold)"/>
      <rect x="230" y="108" width="52" height="52" rx="3.5" transform="rotate(45 256 134)" fill="url(#textGold)"/>
      <circle cx="256" cy="134" r="7.5" fill="#0E0B1E"/>
    </g>

    <!-- Pages / Rays -->
    <path d="M 248 196 C 236 206 198 222 170 228 C 156 231 150 241 154 251 C 172 291 216 316 246 323 C 250 324 252 321 252 317 C 246 280 246 228 248 196 Z" fill="url(#textGold)"/>
    <path d="M 238 232 C 218 245 194 256 172 256" fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

    <path d="M 264 196 C 276 206 314 222 342 228 C 356 231 362 241 358 251 C 340 291 296 316 266 323 C 262 324 260 321 260 317 C 266 280 266 228 264 196 Z" fill="url(#textGold)"/>
    <path d="M 274 232 C 294 245 318 256 340 256" fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>
    <polygon points="256,180 251,195 261,195" fill="url(#textGold)"/>

    <!-- Crescent -->
    <path d="M 126 222 C 126 322 186 398 256 398 C 326 398 386 322 386 222 C 368 296 320 354 256 354 C 192 354 144 296 126 222 Z" fill="url(#textGold)"/>
  </g>

  <!-- Right: Clean Geometric Sans Wordmark -->
  <g transform="translate(172, 0)">
    <!-- Primary Title: NOOR CONNECT -->
    <text x="0" y="86"
          fill="url(#textGold)"
          font-family="system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif"
          font-size="44"
          font-weight="800"
          letter-spacing="5">NOOR CONNECT</text>

    <!-- Subtitle: ISLAMIC COMPANION -->
    <text x="3" y="122"
          fill="url(#subGold)"
          fill-opacity="0.9"
          font-family="system-ui, -apple-system, 'Montserrat', 'Poppins', 'Segoe UI', sans-serif"
          font-size="14"
          font-weight="600"
          letter-spacing="8">ISLAMIC COMPANION</text>
  </g>
</svg>`;

// ============================================================================
// 4. ADAPTIVE ICON FOREGROUND SVG (108dp canvas, symbol in 72dp safe zone)
// ============================================================================
const adaptiveForegroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108">
  <defs>
    <linearGradient id="noorGold" x1="15%" y1="10%" x2="85%" y2="90%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="25%" stop-color="#F5C542"/>
      <stop offset="70%" stop-color="#E8A317"/>
      <stop offset="100%" stop-color="#C9860A"/>
    </linearGradient>
    <radialGradient id="starAura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F5C542" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#E8A317" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Center symbol scaled to ~62dp inside 108dp canvas (plenty of margin inside 72dp safe zone) -->
  <g transform="translate(54, 54) scale(0.128) translate(-256, -256)">
    <circle cx="256" cy="134" r="48" fill="url(#starAura)"/>

    <!-- Star -->
    <rect x="230" y="108" width="52" height="52" rx="3.5" fill="url(#noorGold)"/>
    <rect x="230" y="108" width="52" height="52" rx="3.5" transform="rotate(45 256 134)" fill="url(#noorGold)"/>
    <circle cx="256" cy="134" r="7.5" fill="#0E0B1E"/>

    <!-- Left Page -->
    <path d="M 248 196 C 236 206 198 222 170 228 C 156 231 150 241 154 251 C 172 291 216 316 246 323 C 250 324 252 321 252 317 C 246 280 246 228 248 196 Z" fill="url(#noorGold)"/>
    <path d="M 238 232 C 218 245 194 256 172 256" fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>

    <!-- Right Page -->
    <path d="M 264 196 C 276 206 314 222 342 228 C 356 231 362 241 358 251 C 340 291 296 316 266 323 C 262 324 260 321 260 317 C 266 280 266 228 264 196 Z" fill="url(#noorGold)"/>
    <path d="M 274 232 C 294 245 318 256 340 256" fill="none" stroke="#0E0B1E" stroke-width="6" stroke-linecap="round"/>
    <polygon points="256,180 251,195 261,195" fill="url(#noorGold)"/>

    <!-- Crescent -->
    <path d="M 126 222 C 126 322 186 398 256 398 C 326 398 386 322 386 222 C 368 296 320 354 256 354 C 192 354 144 296 126 222 Z" fill="url(#noorGold)"/>
  </g>
</svg>`;

// ============================================================================
// 5. CIRCULAR ICON SVG for ic_launcher_round
// ============================================================================
const logoRoundSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <clipPath id="circleClip">
      <circle cx="256" cy="256" r="256"/>
    </clipPath>
  </defs>
  <g clip-path="url(#circleClip)">
    ${logoMarkSvg.replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>
</svg>`;

async function main() {
  console.log('--- GENERATING NOOR CONNECT BRAND ASSETS ---');

  // Save SVGs to src/assets/
  fs.writeFileSync(path.join(assetsDir, 'logo-mark.svg'), logoMarkSvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-symbol-only.svg'), logoSymbolOnlySvg);
  fs.writeFileSync(path.join(assetsDir, 'logo-full.svg'), logoFullSvg);

  // Save favicon.svg and brand SVGs to public/
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), logoMarkSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-mark.svg'), logoMarkSvg);
  fs.writeFileSync(path.join(publicDir, 'logo-full.svg'), logoFullSvg);
  console.log('✓ Vector SVGs saved:');
  console.log('  - src/assets/logo-mark.svg (Single Source of Truth Symbol)');
  console.log('  - src/assets/logo-symbol-only.svg (Symbol Without Background)');
  console.log('  - src/assets/logo-full.svg (Horizontal Lockup with Wordmark)');
  console.log('  - public/favicon.svg (Vector Browser Favicon)');
  console.log('  - public/logo-mark.svg & public/logo-full.svg');

  const markBuffer = Buffer.from(logoMarkSvg);
  const roundBuffer = Buffer.from(logoRoundSvg);
  const adaptiveFgBuffer = Buffer.from(adaptiveForegroundSvg);

  // 1. Web & PWA icons in public/
  const pwaSizes = [
    { name: 'favicon.png', size: 64 },
    { name: 'icon-48x48.png', size: 48 },
    { name: 'icon-72x72.png', size: 72 },
    { name: 'icon-96x96.png', size: 96 },
    { name: 'icon-128x128.png', size: 128 },
    { name: 'icon-144x144.png', size: 144 },
    { name: 'icon-152x152.png', size: 152 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-384x384.png', size: 384 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
  ];

  console.log('\n✓ Rasterizing Web & PWA icons in public/...');
  for (const { name, size } of pwaSizes) {
    const dest = path.join(publicDir, name);
    await sharp(markBuffer)
      .resize(size, size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(dest);
    console.log(`  - public/${name} (${size}x${size})`);
  }

  // Favicon ICO
  const faviconIcoBuffer = await sharp(markBuffer).resize(48, 48).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), faviconIcoBuffer);
  console.log('  - public/favicon.ico (48x48)');

  // 2. Android mipmap densities and dimensions
  const androidDensities = [
    { folder: 'mipmap-mdpi', launcherSize: 48, fgSize: 108 },
    { folder: 'mipmap-hdpi', launcherSize: 72, fgSize: 162 },
    { folder: 'mipmap-xhdpi', launcherSize: 96, fgSize: 216 },
    { folder: 'mipmap-xxhdpi', launcherSize: 144, fgSize: 324 },
    { folder: 'mipmap-xxxhdpi', launcherSize: 192, fgSize: 432 }
  ];

  console.log('\n✓ Rasterizing Android launcher icons in android/app/src/main/res/...');
  for (const { folder, launcherSize, fgSize } of androidDensities) {
    const targetDir = path.join(resDir, folder);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    await sharp(markBuffer)
      .resize(launcherSize, launcherSize)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(roundBuffer)
      .resize(launcherSize, launcherSize)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    await sharp(adaptiveFgBuffer)
      .resize(fgSize, fgSize)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`  - ${folder}: ic_launcher (${launcherSize}px), ic_launcher_round (${launcherSize}px), ic_launcher_foreground (${fgSize}px)`);
  }

  // 3. Update android/app/src/main/res/values/ic_launcher_background.xml
  const bgXmlPath = path.join(resDir, 'values', 'ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#0E0B1E</color>
</resources>
`;
  fs.writeFileSync(bgXmlPath, bgXmlContent);
  console.log('✓ Updated ic_launcher_background.xml to #0E0B1E');

  // 4. Update Android native splash screens in drawable folders
  const splashTargets = [
    { dir: 'drawable', w: 512, h: 512, iconSize: 256 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480, iconSize: 160 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800, iconSize: 220 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280, iconSize: 300 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600, iconSize: 400 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920, iconSize: 512 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320, iconSize: 160 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480, iconSize: 220 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720, iconSize: 300 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960, iconSize: 400 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280, iconSize: 480 }
  ];

  console.log('\n✓ Updating Android native splash screens in drawable-*/splash.png...');
  for (const { dir, w, h, iconSize } of splashTargets) {
    const targetFolder = path.join(resDir, dir);
    if (!fs.existsSync(targetFolder)) continue;

    const resizedIcon = await sharp(markBuffer).resize(iconSize, iconSize).png().toBuffer();
    const left = Math.round((w - iconSize) / 2);
    const top = Math.round((h - iconSize) / 2);

    await sharp({
      create: {
        width: w,
        height: h,
        channels: 4,
        background: { r: 14, g: 11, b: 30, alpha: 1 } // #0E0B1E
      }
    })
    .composite([{ input: resizedIcon, left, top }])
    .png({ quality: 95 })
    .toFile(path.join(targetFolder, 'splash.png'));

    console.log(`  - ${dir}/splash.png (${w}x${h})`);
  }

  console.log('\n✓ ALL ASSETS SUCCESSFULLY GENERATED AND WRITTEN!');
}

main().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
