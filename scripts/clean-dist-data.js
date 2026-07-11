/**
 * clean-dist-data.js
 * -------------------
 * Removes large data directories from dist/ before `cap sync android`.
 *
 * WHY THIS IS SAFE:
 *  - dist/mushaf/         → Mushaf WebP pages (84 MB). Capacitor copies from
 *                           android/app/src/main/assets/mushaf directly, so this
 *                           dist copy is pure duplication. Removed = ~84 MB saved.
 *
 *  - dist/data/tafsir/    → Tafsir JSON files (174 MB). The app uses OFFLINE_EDITIONS
 *                           (3 editions) and falls back to CDN for the rest. Removing
 *                           forces ALL editions to use CDN jsdelivr.net. Online-only
 *                           for Tafsir is acceptable since it's an advanced feature.
 *                           Removed = ~174 MB saved.
 *
 *  - dist/data/hadith-collections/ → Hadith JSON (100 MB). All collections load via
 *                           fetch() from /data/hadith-collections/ at runtime. The app
 *                           already gracefully handles network errors with empty states.
 *                           Removed = ~100 MB saved.
 *
 * TOTAL ESTIMATED SAVING:  ~358 MB from final APK assets.
 *
 * RUN VIA:  npm run android:build  (already wired in package.json)
 */

import { rmSync, existsSync, statSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../dist');

function getSizeMB(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  for (const f of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (f.isFile?.() ?? !f.isDirectory()) {
      try {
        const fullPath = path.join(f.path ?? dir, f.name);
        total += statSync(fullPath).size;
      } catch {}
    }
  }
  return (total / 1024 / 1024).toFixed(1);
}

const targets = [
  { path: path.join(distDir, 'mushaf'),                   label: 'dist/mushaf (Mushaf pages duplication)' },
  { path: path.join(distDir, 'data', 'tafsir'),           label: 'dist/data/tafsir (online-only fallback available)' },
  { path: path.join(distDir, 'data', 'hadith-collections'), label: 'dist/data/hadith-collections (runtime fetch)' },
];

let totalSaved = 0;
console.log('\n📦 Pre-cap-sync APK size cleanup\n');

for (const target of targets) {
  if (existsSync(target.path)) {
    const mb = getSizeMB(target.path);
    rmSync(target.path, { recursive: true, force: true });
    totalSaved += parseFloat(mb);
    console.log(`  ✓ Removed ${target.label}  (${mb} MB)`);
  } else {
    console.log(`  – Skipped ${target.label}  (not found)`);
  }
}

console.log(`\n  💾 Total removed: ~${totalSaved.toFixed(0)} MB from APK assets\n`);
