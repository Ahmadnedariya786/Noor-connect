/**
 * resize-icons.js
 * Generates correctly-sized PWA icons from the master 1024x1024 PNG.
 * Requires jimp (already in devDependencies).
 */
import { Jimp } from 'jimp';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../public');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function run() {
  console.log('Reading master icon (1024x1024)…');
  const master = await Jimp.read(path.join(publicDir, 'icon-512x512.png'));

  for (const size of sizes) {
    const out = path.join(publicDir, `icon-${size}x${size}.png`);
    const resized = master.clone().resize({ w: size, h: size });
    await resized.write(out);
    const { size: bytes } = (await import('fs')).statSync(out);
    console.log(`✓ icon-${size}x${size}.png  →  ${(bytes / 1024).toFixed(1)} KB`);
  }

  console.log('\nDone. All icons properly sized.');
}

run().catch(err => { console.error(err); process.exit(1); });
