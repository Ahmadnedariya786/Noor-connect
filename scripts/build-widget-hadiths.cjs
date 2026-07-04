#!/usr/bin/env node
/**
 * scripts/build-widget-hadiths.js
 *
 * Aggregates the 16 hadith collection JSON files from
 *   public/data/hadith-collections/<collection>/hadiths.json
 * into a single flat JSON array at
 *   android/app/src/main/assets/widget_hadiths.json
 *
 * The output array contains objects matching the HadithContent Kotlin data
 * class shape. This file is consumed by HadithBundle.kt as a fallback when
 * the user has not yet opened the app.
 *
 * Run this script from the project root.
 *
 * Selection strategy at runtime: DAY_OF_YEAR % hadiths.length.
 * To keep the bundle reasonable in size, we cap at 5 hadiths per collection
 * (80 total). Enough for daily rotation diversity without bloating the APK.
 */

const fs = require('fs');
const path = require('path');

const COLLECTIONS_DIR = path.resolve(__dirname, '..', 'public', 'data', 'hadith-collections');
const OUTPUT_PATH = path.resolve(__dirname, '..', 'android', 'app', 'src', 'main', 'assets', 'widget_hadiths.json');

const PER_COLLECTION_CAP = 5;

function formatCollectionTitle(name) {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function pickHadiths(arr, cap) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  // Evenly sample across the collection
  if (arr.length <= cap) return arr;
  const step = Math.floor(arr.length / cap);
  const out = [];
  for (let i = 0; i < cap; i++) out.push(arr[i * step]);
  return out;
}

function mapHadith(raw, collectionName, collectionTitle) {
  const source = `${collectionTitle} ${raw.bookNumber ?? ''}:${raw.hadithNumber ?? ''}`.trim();
  return {
    arabic:       raw.arabic || '',
    translation:  raw.englishTranslation || raw.translation || '',
    narrator:     raw.narrator || '',
    source,
    grade:        raw.grade || (collectionName === 'bukhari' || collectionName === 'muslim' ? 'Sahih' : ''),
    collection:   collectionName,
    bookNumber:   Number(raw.bookNumber ?? 0),
    hadithNumber: Number(raw.hadithNumber ?? 0),
  };
}

function main() {
  if (!fs.existsSync(COLLECTIONS_DIR)) {
    console.error(`[build-widget-hadiths] Collections dir not found: ${COLLECTIONS_DIR}`);
    process.exit(1);
  }

  const collections = fs.readdirSync(COLLECTIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => name !== 'metadata.json');

  console.log(`[build-widget-hadiths] Found ${collections.length} collections: ${collections.join(', ')}`);

  const all = [];
  let skipped = 0;

  for (const collection of collections) {
    const hadithsPath = path.join(COLLECTIONS_DIR, collection, 'hadiths.json');
    if (!fs.existsSync(hadithsPath)) {
      console.warn(`[build-widget-hadiths] Skipping ${collection}: no hadiths.json`);
      skipped++;
      continue;
    }
    let arr;
    try {
      arr = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
    } catch (e) {
      console.warn(`[build-widget-hadiths] Skipping ${collection}: invalid JSON — ${e.message}`);
      skipped++;
      continue;
    }
    const title = formatCollectionTitle(collection);
    const picked = pickHadiths(arr, PER_COLLECTION_CAP);
    for (const h of picked) {
      const mapped = mapHadith(h, collection, title);
      if (mapped.arabic || mapped.translation) all.push(mapped);
    }
    console.log(`[build-widget-hadiths] ${collection}: picked ${picked.length} of ${arr.length}`);
  }

  // Ensure output dir exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(all, null, 0), 'utf8');

  const sizeKB = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
  console.log(`[build-widget-hadiths] Wrote ${all.length} hadiths (${sizeKB} KB) to ${OUTPUT_PATH}`);
  console.log(`[build-widget-hadiths] Skipped ${skipped} collection(s)`);
}

main();
