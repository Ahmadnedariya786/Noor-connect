import fs from 'node:fs';
import sharp from 'sharp';

const d = 'C:/Users/urooj/Videos/Noor-connect/public/images/reciters';
const files = fs.readdirSync(d).filter(f => f.endsWith('.webp'));

async function upscale() {
  for (const f of files) {
    const p = d + '/' + f;
    try {
      const buf = fs.readFileSync(p);
      const m = await sharp(buf).metadata();
      if (m.width >= 320 && m.height >= 320) continue;
      let out;
      for (let q = 80; q >= 40; q -= 5) {
        out = await sharp(buf)
          .resize(320, 320, { fit: 'inside', withoutEnlargement: false })
          .webp({ quality: q, effort: 4 })
          .toBuffer();
        if (out.length <= 60 * 1024) break;
      }
      // Write to temp then rename
      const tmp = p + '.tmp';
      fs.writeFileSync(tmp, out);
      fs.renameSync(tmp, p);
      console.log(`Upscaled ${f}: ${m.width}x${m.height} -> ${out.length}B`);
    } catch (e) {
      console.error('Error on', f, e.message);
    }
  }
  console.log('Done');
}
upscale();