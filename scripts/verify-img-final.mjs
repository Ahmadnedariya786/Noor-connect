import fs from 'node:fs';
import sharp from 'sharp';

const d = 'C:/Users/urooj/Videos/Noor-connect/public/images/reciters';
const expected = [3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,27,28,29,31,33,34,35,36,37,38,39,41,42,43,44,46,48,49,50,51,52,55,56,57,59,60,61,62,64,65,66,67,68,69,71,72,74,77,80,81,83,84,85,86,87,88,89,90,91,93,95,97,98,100,101,102,103,104,106,111,118,120,121,122,139,217,248,265,274,275,287,109038,109074,109075,109077,109078];

async function check() {
  let ok = 0, small = 0, totalSize = 0;
  for (const i of expected) {
    const p = d + '/' + i + '.webp';
    if (!fs.existsSync(p)) continue;
    const m = await sharp(p).metadata();
    const sz = fs.statSync(p).size;
    totalSize += sz;
    if (m.width >= 300 && m.height >= 300) ok++;
    else small++;
  }
  console.log('Good:', ok, 'Small:', small, 'Avg:', Math.round(totalSize / (ok + small)) + 'B');
}
check();