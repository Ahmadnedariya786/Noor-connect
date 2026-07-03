/**
 * fix-arabic-text-2.cjs
 * 
 * Fetches clean Arabic hadith text from AhmedBaset/hadith-json repo
 * to patch the remaining collections.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PUBLIC_BASE = path.join(__dirname, '..', 'public', 'data', 'hadith-collections');
const SRC_BASE = path.join(__dirname, '..', 'src', 'data', 'hadith-collections');

const REPO_BASE = 'https://raw.githubusercontent.com/AhmedBaset/hadith-json/main/db/by_book';

const MAP = {
  adab: `${REPO_BASE}/other_books/aladab_almufrad.json`,
  ahmad: `${REPO_BASE}/the_9_books/ahmed.json`,
  bulugh: `${REPO_BASE}/other_books/bulugh_almaram.json`,
  darimi: `${REPO_BASE}/the_9_books/darimi.json`,
  mishkat: `${REPO_BASE}/other_books/mishkat_almasabih.json`,
  riyadussalihin: `${REPO_BASE}/other_books/riyad_assalihin.json`,
  shamail: `${REPO_BASE}/other_books/shamail_muhammadiyah.json`
};

function hasGarbledArabic(str) {
  if (!str) return false;
  return /[\u2500-\u257F]/.test(str) || !/[\u0600-\u06FF]/.test(str);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: ${res.statusCode} ${url}`));
        return;
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error(`JSON parse failed`)); }
      });
    }).on('error', reject);
  });
}

async function processCollection(slug, url) {
  const hadithsPath = path.join(PUBLIC_BASE, slug, 'hadiths.json');
  if (!fs.existsSync(hadithsPath)) return;

  const localData = JSON.parse(fs.readFileSync(hadithsPath, 'utf8'));
  const needsPatch = localData.filter(h => hasGarbledArabic(h.arabic));
  
  if (needsPatch.length === 0) {
    console.log(`[OK] ${slug}: already clean`);
    return;
  }

  console.log(`Fetching ${slug} from GitHub...`);
  
  try {
    const remoteData = await fetchJson(url);
    const remoteHadiths = remoteData.hadiths;
    
    // Create a map by idInBook (which matches our hadithNumber mostly)
    const arabicLookup = {};
    for (const rh of remoteHadiths) {
      arabicLookup[String(rh.idInBook)] = rh.arabic;
    }

    let patched = 0;
    const patchedData = localData.map(h => {
      // First try idInBook match
      let cleanArabic = arabicLookup[h.hadithNumber];
      
      // If not found, we can try to find by sequential index if we want
      if (cleanArabic && hasGarbledArabic(h.arabic)) {
        patched++;
        return { ...h, arabic: cleanArabic };
      }
      return h;
    });

    if (patched > 0) {
      const utf8NoBom = { encoding: 'utf8' };
      fs.writeFileSync(hadithsPath, JSON.stringify(patchedData, null, 2), utf8NoBom);
      
      const srcPath = path.join(SRC_BASE, slug, 'hadiths.json');
      if (fs.existsSync(srcPath)) {
        fs.writeFileSync(srcPath, JSON.stringify(patchedData, null, 2), utf8NoBom);
      }
      console.log(`[PATCHED] ${slug}: Fixed ${patched}/${localData.length} hadiths`);
    } else {
      console.log(`[WARNING] ${slug}: Found no matching hadithNumbers to patch`);
    }

  } catch (e) {
    console.log(`[ERROR] ${slug}: ${e.message}`);
  }
}

async function main() {
  for (const [slug, url] of Object.entries(MAP)) {
    await processCollection(slug, url);
  }
}

main().catch(console.error);
