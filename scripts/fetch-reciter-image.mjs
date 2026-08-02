// Helper: fetch a reciter photo from the web and produce a compressed
// 320x320 WebP (<=60KB) thumbnail at public/images/reciters/{id}.webp
//
// Usage:
//   node scripts/fetch-reciter-image.mjs <id> <nameAr> <nameEn> [directImageUrl]
//
//   - If [directImageUrl] is given, it is used directly.
//   - Otherwise tries Wikipedia (Arabic then English) page-summary thumbnail.
//   - Exits 0 on success, 1 if no image could be fetched or compressing failed.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [, , idArg, nameAr, nameEn, directUrl] = process.argv;

if (!idArg) {
  console.error('usage: node scripts/fetch-reciter-image.mjs <id> <nameAr> <nameEn> [directImageUrl]');
  process.exit(1);
}

const id = Number(idArg);
const OUT_DIR = path.resolve('public/images/reciters');
const OUT_PATH = path.join(OUT_DIR, `${id}.webp`);
const UA = 'NoorConnectRadio/1.0 (android app; +https://noor-connect.app)';

function clean(s = '') {
  return s.replace(/[\r\n]/g, ' ').trim().replace(/^[-—–\s]+/, '').replace(/^إذاعة\s+/i, '').replace(/^أذاعة\s+/i, '').trim();
}

async function httpBuffer(url, tries = 2) {
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'image/*,*/*;q=0.8' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) throw new Error('empty body');
      return buf;
    } finally {
      clearTimeout(t);
    }
  }
  throw new Error('failed after retries');
}

async function wikiThumbnail(title) {
  if (!title) return null;
  const enc = encodeURIComponent(clean(title).replace(/\s+/g, '_'));
  for (const wiki of ['ar', 'en']) {
    const url = `https://${wiki}.wikipedia.org/api/rest_v1/page/summary/${enc}`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (!res.ok) continue;
      const j = await res.json();
      const orig = j?.thumbnail?.source;
      if (!orig) continue;
      // Prefer a larger thumbnail, but fall back to the original size if 640 fails.
      const big = orig.replace(/\/(\d+)px-/, '/640px-');
      if (big !== orig) {
        try {
          const probe = await fetch(big, { method: 'HEAD', headers: { 'User-Agent': UA } });
          if (probe.ok) return big;
        } catch { /* fall through */ }
      }
      return orig;
    } catch {
      /* try next */
    }
  }
  return null;
}

async function compressToWebp(buf) {
  // Fit inside 320x320, keep aspect, output WebP. Start q80, drop until <=60KB.
  let quality = 80;
  while (true) {
    const out = await sharp(buf)
      .rotate()
      .resize(320, 320, { fit: 'inside', withoutEnlargement: false })
      .webp({ quality, effort: 4 })
      .toBuffer();
    if (out.length <= 60 * 1024 || quality <= 40) {
      return out;
    }
    quality -= 5;
  }
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let source = null;
  if (directUrl && directUrl.trim()) {
    source = directUrl.trim();
  } else {
    source = (await wikiThumbnail(nameAr)) || (await wikiThumbnail(nameEn));
  }

  if (!source) {
    console.error(`NO_IMAGE ${id}\t${nameAr}\t${nameEn}`);
    process.exit(1);
  }

  const buf = await httpBuffer(source);
  const out = await compressToWebp(buf);
  fs.writeFileSync(OUT_PATH, out);
  console.log(`OK ${id}\t${nameAr}\t(${out.length} bytes)`);
  process.exit(0);
}

main().catch((e) => {
  console.error(`ERROR ${id}\t${nameAr}\t${nameEn}\t${e.message}`);
  process.exit(1);
});
