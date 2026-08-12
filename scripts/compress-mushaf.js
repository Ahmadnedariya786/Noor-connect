/**
 * compress-mushaf.js
 * Re-compresses all 606 Mushaf WebP pages using sharp at quality=75.
 * Mushaf pages are scanned documents — high detail text, but q=75 retains
 * full Arabic glyph legibility while cutting ~35-40% file size.
 *
 * Run: node scripts/compress-mushaf.js
 * Safe to re-run — skips files already at/below the target size.
 */
import sharp from 'sharp';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mushafDir = join(__dirname, '../public/mushaf');

const QUALITY = 68;       // WebP lossy quality (0-100). 68 = optimal for Arabic scanned text.
const WIDTH = 810;        // Target width — mushaf pages are displayed at ~330 CSS px (≤990 physical px)
const HEIGHT = 1145;      // Target height (810 × 1527/1080 ≈ 1145, aspect preserved)
const BATCH = 12;         // Parallel files per batch
const MAX_RETRIES = 5;    // Windows AV can briefly lock files — retry with backoff

async function compressFile(file) {
  const fullPath = join(mushafDir, file);
  const before = statSync(fullPath).size;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const { readFile, writeFile, rename } = await import('fs/promises');
      const input = await readFile(fullPath);

      const buf = await sharp(input)
        .resize(WIDTH, HEIGHT, { fit: 'fill' })
        .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
        .toBuffer();

      // Only write if we actually saved bytes — write to temp + rename (atomic)
      if (buf.length < before) {
        const tmpPath = fullPath + '.tmp';
        await writeFile(tmpPath, buf);
        await rename(tmpPath, fullPath);
        return { file, before, after: buf.length, saved: before - buf.length };
      }
      return { file, before, after: before, saved: 0 };
    } catch (err) {
      const isLock = /unknown error|EBUSY|EPERM|EACCES/.test(err.message || '');
      if (attempt < MAX_RETRIES && isLock) {
        await new Promise(r => setTimeout(r, 500 * attempt));
        continue;
      }
      console.error(`  ✗ Error on ${file}:`, err.message);
      return { file, before, after: before, saved: 0, error: true };
    }
  }
  return { file, before, after: before, saved: 0, error: true };
}

async function run() {
  const files = readdirSync(mushafDir)
    .filter(f => f.endsWith('.webp'))
    .sort();

  const totalBefore = files.reduce((sum, f) => sum + statSync(join(mushafDir, f)).size, 0);
  console.log(`\nFound ${files.length} WebP files  (${(totalBefore / 1024 / 1024).toFixed(1)} MB total)`);
  console.log(`Downscaling to ${WIDTH}x${HEIGHT} at WebP quality=${QUALITY}  (batch size=${BATCH})…\n`);

  let totalSaved = 0;
  let processed = 0;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(compressFile));
    results.forEach(r => {
      totalSaved += r.saved;
      processed++;
    });

    const pct = ((processed / files.length) * 100).toFixed(0);
    const savedMB = (totalSaved / 1024 / 1024).toFixed(1);
    process.stdout.write(`\r  ${pct}% done — saved ${savedMB} MB so far…`);
  }

  const totalAfterMB = ((totalBefore - totalSaved) / 1024 / 1024).toFixed(1);
  const savedMB = (totalSaved / 1024 / 1024).toFixed(1);
  const pct = ((totalSaved / totalBefore) * 100).toFixed(1);

  console.log(`\n\n✅ Compression complete!`);
  console.log(`   Before : ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   After  : ${totalAfterMB} MB`);
  console.log(`   Saved  : ${savedMB} MB  (${pct}% reduction)`);
}

run().catch(err => { console.error(err); process.exit(1); });
