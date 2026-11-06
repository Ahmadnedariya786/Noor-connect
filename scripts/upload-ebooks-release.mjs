#!/usr/bin/env node
/**
 * Noor Connect — Automated E-Books Release Publisher
 * Uploads large PDF files (Tafseer Anwar-ul-Bayan Vol 1–5) to GitHub Releases CDN (tag: ebooks-library-v1)
 *
 * Usage:
 *   npm run ebooks:publish
 *   node scripts/upload-ebooks-release.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const RELEASE_TAG = 'ebooks-library-v1';
const RELEASE_TITLE = 'Noor Connect E-Books Library CDN v1.0.0';
const RELEASE_NOTES = `### Noor Connect E-Books Library CDN
Automated release hosting high-speed direct PDF downloads for:
- Tafseer Anwar-ul-Bayan Volume 1 (Surah Al-Fatiha to Al-Ma'idah)
- Tafseer Anwar-ul-Bayan Volume 2 (Surah Al-An'am to Ibrahim)
- Tafseer Anwar-ul-Bayan Volume 3 (Surah Al-Hijr to Al-Ankabut)
- Tafseer Anwar-ul-Bayan Volume 4 (Surah Ar-Rum to Al-Hadid)
- Tafseer Anwar-ul-Bayan Volume 5 (Surah Al-Mujadilah to An-Nas)

These assets power the in-app offline download engine in Noor Connect without inflating the APK bundle size.`;

const TARGET_FILES = [
  'AnwarulBayan-Volume1.pdf',
  'AnwarulBayan-Volume2.pdf',
  'AnwarulBayan-Volume3.pdf',
  'AnwarulBayan-Volume4.pdf',
  'AnwarulBayan-Volume5.pdf',
];

console.log('════════════════════════════════════════════════════════════════');
console.log('🌙 Noor Connect — E-Books Cloud Release Manager');
console.log(`Tag: ${RELEASE_TAG}`);
console.log('════════════════════════════════════════════════════════════════\n');

// 1. Check if gh CLI is available
let hasGhCli = false;
try {
  execSync('gh --version', { stdio: 'ignore' });
  hasGhCli = true;
} catch {
  hasGhCli = false;
}

if (!hasGhCli) {
  console.warn('⚠️ GitHub CLI (`gh`) is not installed or not in PATH.');
  console.log('To publish assets to GitHub Releases automatically:');
  console.log('1. Install GitHub CLI: https://cli.github.com/ or `winget install GitHub.cli`');
  console.log('2. Authenticate: `gh auth login`');
  console.log(`3. Run this script again or manually execute:`);
  console.log(`   gh release create ${RELEASE_TAG} ${TARGET_FILES.join(' ')} --title "${RELEASE_TITLE}" --notes "${RELEASE_NOTES}"\n`);
  process.exit(0);
}

// 2. Scan for local PDF files
const searchDirs = ['.', './ebooks', './pdfs', './downloads'];
const foundFiles = [];

for (const filename of TARGET_FILES) {
  let foundPath = null;
  for (const dir of searchDirs) {
    const candidate = path.join(dir, filename);
    if (fs.existsSync(candidate)) {
      foundPath = candidate;
      break;
    }
  }
  if (foundPath) {
    foundFiles.push(foundPath);
    console.log(`✓ Found local PDF: ${foundPath} (${(fs.statSync(foundPath).size / (1024 * 1024)).toFixed(1)} MB)`);
  } else {
    console.log(`- Not found locally: ${filename}`);
  }
}

if (foundFiles.length === 0) {
  console.log('\n💡 No PDF files matching AnwarulBayan-Volume{1..5}.pdf found in current directory.');
  console.log('Place your Anwar-ul-Bayan PDF files in the repository root or `./ebooks` directory named:');
  TARGET_FILES.forEach((f) => console.log(`   - ${f}`));
  console.log('\nThen run `npm run ebooks:publish` to upload them to the CDN release.\n');
  process.exit(0);
}

// 3. Create or update release
console.log(`\n🚀 Uploading ${foundFiles.length} file(s) to GitHub release ${RELEASE_TAG}...`);
try {
  // Check if release exists
  let releaseExists = false;
  try {
    execSync(`gh release view ${RELEASE_TAG}`, { stdio: 'ignore' });
    releaseExists = true;
  } catch {
    releaseExists = false;
  }

  if (releaseExists) {
    console.log(`Release ${RELEASE_TAG} already exists. Uploading assets with clobber...`);
    execSync(`gh release upload ${RELEASE_TAG} ${foundFiles.map((f) => `"${f}"`).join(' ')} --clobber`, {
      stdio: 'inherit',
    });
  } else {
    console.log(`Creating new release ${RELEASE_TAG}...`);
    execSync(
      `gh release create ${RELEASE_TAG} ${foundFiles.map((f) => `"${f}"`).join(' ')} --title "${RELEASE_TITLE}" --notes "${RELEASE_NOTES}"`,
      { stdio: 'inherit' }
    );
  }
  console.log('\n✅ Successfully published e-book assets to GitHub Releases CDN!');
} catch (err) {
  console.error('\n❌ Release upload failed:', err.message);
  process.exit(1);
}
