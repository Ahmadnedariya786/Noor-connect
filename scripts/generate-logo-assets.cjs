const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateAssets() {
  const sourcePath = path.resolve(__dirname, '../branding/noor-logo.png');
  if (!fs.existsSync(sourcePath)) {
    console.error('Source logo not found:', sourcePath);
    process.exit(1);
  }

  console.log('Using source logo:', sourcePath);
  const metadata = await sharp(sourcePath).metadata();
  console.log('Source dimensions:', metadata.width, 'x', metadata.height);

  // 1. Android launcher icons
  const androidDensities = [
    { name: 'mipmap-mdpi', launcherSize: 48, foregroundSize: 108 },
    { name: 'mipmap-hdpi', launcherSize: 72, foregroundSize: 162 },
    { name: 'mipmap-xhdpi', launcherSize: 96, foregroundSize: 216 },
    { name: 'mipmap-xxhdpi', launcherSize: 144, foregroundSize: 324 },
    { name: 'mipmap-xxxhdpi', launcherSize: 192, foregroundSize: 432 },
  ];

  for (const density of androidDensities) {
    const dir = path.resolve(__dirname, `../android/app/src/main/res/${density.name}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png
    await sharp(sourcePath)
      .resize(density.launcherSize, density.launcherSize, { fit: 'contain' })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));

    // ic_launcher_round.png
    // Generate circular cropped or contained
    const circleBuffer = Buffer.from(
      `<svg><circle cx="${density.launcherSize / 2}" cy="${density.launcherSize / 2}" r="${density.launcherSize / 2}" fill="#fff" /></svg>`
    );
    await sharp(sourcePath)
      .resize(density.launcherSize, density.launcherSize, { fit: 'cover' })
      .composite([{ input: circleBuffer, blend: 'dest-in' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png: logo inset to safe zone (approx 70% of canvas) on transparent bg
    const insetSize = Math.round(density.foregroundSize * 0.70);
    const resizedLogo = await sharp(sourcePath)
      .resize(insetSize, insetSize, { fit: 'contain' })
      .toBuffer();

    await sharp({
      create: {
        width: density.foregroundSize,
        height: density.foregroundSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: resizedLogo, gravity: 'center' }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));

    console.log(`Generated Android ${density.name} assets.`);
  }

  // 2. Capacitor native splash: assets/splash.png (2732x2732 centered on solid #150D2E)
  const assetsDir = path.resolve(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const splashLogo = await sharp(sourcePath)
    .resize(900, 900, { fit: 'contain' })
    .toBuffer();

  await sharp({
    create: {
      width: 2732,
      height: 2732,
      channels: 4,
      background: '#150D2E',
    },
  })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(assetsDir, 'splash.png'));
  console.log('Generated assets/splash.png (2732x2732 solid #150D2E)');

  // 3. Web & PWA icons in public/
  const publicDir = path.resolve(__dirname, '../public');
  const pwaSizes = [48, 72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of pwaSizes) {
    await sharp(sourcePath)
      .resize(size, size, { fit: 'contain' })
      .png()
      .toFile(path.join(publicDir, `icon-${size}x${size}.png`));
  }

  // apple-touch-icon.png (180x180)
  await sharp(sourcePath)
    .resize(180, 180, { fit: 'contain' })
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // favicon.png (64x64)
  await sharp(sourcePath)
    .resize(64, 64, { fit: 'contain' })
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));

  // favicon.ico (can be 64x64 png format which modern browsers support)
  await sharp(sourcePath)
    .resize(64, 64, { fit: 'contain' })
    .png()
    .toFile(path.join(publicDir, 'favicon.ico'));

  // logo-mark.png in public
  await sharp(sourcePath)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(publicDir, 'logo-mark.png'));

  // 4. src/assets/noor-logo.png for React components
  const srcAssetsDir = path.resolve(__dirname, '../src/assets');
  if (!fs.existsSync(srcAssetsDir)) fs.mkdirSync(srcAssetsDir, { recursive: true });

  await sharp(sourcePath)
    .resize(512, 512, { fit: 'contain' })
    .png()
    .toFile(path.join(srcAssetsDir, 'noor-logo.png'));

  console.log('All icons generated successfully!');
}

generateAssets().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
