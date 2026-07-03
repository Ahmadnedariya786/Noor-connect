/**
 * fix-arabic-text.js
 * 
 * Fetches clean Arabic hadith text from fawazahmed0 CDN and patches
 * the corrupted arabic field in all hadiths.json files.
 * 
 * Run: node scripts/fix-arabic-text.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PUBLIC_BASE = path.join(__dirname, '..', 'public', 'data', 'hadith-collections');
const SRC_BASE = path.join(__dirname, '..', 'src', 'data', 'hadith-collections');
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

// Map our collection slugs to CDN edition names
const COLLECTION_MAP = {
  malik:          'ara-malik',
  forty:          'ara-nawawi40',    // 40 Hadith Nawawi
  // These are NOT in the CDN - will need different handling:
  // adab, ahmad, bulugh, darimi, hisn, mishkat, riyadussalihin, shamail
};

// Check which ones CDN supports
const CDN_SUPPORTED = ['malik', 'forty'];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 404) {
        reject(new Error(`404: ${url}`));
        return;
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function hasGarbledArabic(str) {
  if (!str) return false;
  // Real Arabic is in U+0600-U+06FF. Garbled text has box-drawing chars (U+2500+)
  return /[\u2500-\u257F]/.test(str) || !/[\u0600-\u06FF]/.test(str);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllBooksForCollection(editionName) {
  // First get book count from info
  const info = await fetchJson(`${CDN_BASE}/${editionName}.min.json`);
  // This returns all hadiths in one shot (the .min.json is smaller)
  return info;
}

async function patchCollection(slug, editionName) {
  const hadithsPath = path.join(PUBLIC_BASE, slug, 'hadiths.json');
  if (!fs.existsSync(hadithsPath)) {
    console.log(`  SKIP: ${slug} - no hadiths.json in public/`);
    return;
  }

  const localData = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
  const needsPatch = localData.filter(h => hasGarbledArabic(h.arabic));
  
  if (needsPatch.length === 0) {
    console.log(`  OK: ${slug} - Arabic text is already clean`);
    return;
  }

  console.log(`  Fetching Arabic for ${slug} (${needsPatch.length} hadiths need patching)...`);

  // Build a lookup: hadithNumber -> clean arabic text
  const arabicLookup = {};
  
  try {
    // Get all books for this collection
    const info = await fetchJson(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/info.json`);
    const collectionInfo = info[editionName.replace('ara-', '')];
    
    if (!collectionInfo) {
      throw new Error(`Collection ${editionName} not found in CDN info`);
    }

    const bookNumbers = Object.keys(collectionInfo.metadata.sections).filter(n => n !== '0');
    
    for (const bookNum of bookNumbers) {
      try {
        const bookData = await fetchJson(`${CDN_BASE}/${editionName}/${bookNum}.json`);
        for (const h of bookData.hadiths) {
          arabicLookup[String(h.hadithnumber)] = h.text;
        }
        process.stdout.write('.');
        await sleep(100); // Rate limit
      } catch (e) {
        // Some book numbers might not exist
      }
    }
    console.log('');
  } catch (e) {
    console.log(`  Failed to fetch CDN data for ${slug}: ${e.message}`);
    return;
  }

  if (Object.keys(arabicLookup).length === 0) {
    console.log(`  ERROR: No Arabic data fetched for ${slug}`);
    return;
  }

  let patched = 0;
  const patchedData = localData.map(h => {
    const cleanArabic = arabicLookup[h.hadithNumber];
    if (cleanArabic && hasGarbledArabic(h.arabic)) {
      patched++;
      return { ...h, arabic: cleanArabic };
    }
    return h;
  });

  if (patched > 0) {
    const utf8NoBom = { encoding: 'utf8' };
    fs.writeFileSync(hadithsPath, JSON.stringify(patchedData, null, 2), utf8NoBom);
    // Also patch src/
    const srcPath = path.join(SRC_BASE, slug, 'hadiths.json');
    if (fs.existsSync(srcPath)) {
      fs.writeFileSync(srcPath, JSON.stringify(patchedData, null, 2), utf8NoBom);
    }
    console.log(`  ✓ Patched ${patched}/${localData.length} hadiths in ${slug}`);
  } else {
    console.log(`  WARNING: Found 0 matches for ${slug}`);
  }
}

async function main() {
  console.log('=== Hadith Arabic Text Fixer ===\n');
  
  // Check which collections in public/ have garbled Arabic
  const dirs = fs.readdirSync(PUBLIC_BASE).filter(d => 
    fs.statSync(path.join(PUBLIC_BASE, d)).isDirectory()
  );

  console.log('Checking all collections for garbled Arabic...\n');
  
  for (const slug of dirs) {
    const hadithsPath = path.join(PUBLIC_BASE, slug, 'hadiths.json');
    if (!fs.existsSync(hadithsPath)) continue;
    
    const data = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
    const garbled = data.filter(h => hasGarbledArabic(h.arabic));
    const hasArabic = data.filter(h => h.arabic && /[\u0600-\u06FF]/.test(h.arabic));
    
    if (garbled.length > 0) {
      console.log(`[CORRUPT] ${slug}: ${garbled.length}/${data.length} hadiths have garbled Arabic`);
    } else if (hasArabic.length > 0) {
      console.log(`[OK]      ${slug}: Clean Arabic (${hasArabic.length} hadiths)`);
    } else {
      console.log(`[NO-AR]   ${slug}: No Arabic field`);
    }
  }

  console.log('\n--- Patching CDN-supported collections ---\n');
  
  for (const [slug, editionName] of Object.entries(COLLECTION_MAP)) {
    console.log(`Processing: ${slug} (${editionName})`);
    await patchCollection(slug, editionName);
    await sleep(500);
  }

  console.log('\n--- Collections requiring manual data ---');
  const needsManual = ['adab', 'ahmad', 'bulugh', 'darimi', 'hisn', 'mishkat', 'riyadussalihin', 'shamail'];
  console.log('The following collections have corrupted Arabic and are not on the CDN:');
  for (const slug of needsManual) {
    const hadithsPath = path.join(PUBLIC_BASE, slug, 'hadiths.json');
    if (!fs.existsSync(hadithsPath)) continue;
    const data = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
    const garbled = data.filter(h => hasGarbledArabic(h.arabic));
    if (garbled.length > 0) {
      console.log(`  - ${slug}: ${garbled.length} hadiths need manual Arabic source`);
    }
  }
  
  console.log('\nDone!');
}

main().catch(console.error);
