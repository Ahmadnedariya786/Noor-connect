/**
 * fix-all-mojibake.cjs
 * 
 * Reverses CP850 Mojibake across all JSON files in the hadith-collections.
 * This fixes garbled English translations, grades, and book/chapter names.
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_BASE = path.join(__dirname, '..', 'public', 'data', 'hadith-collections');
const SRC_BASE = path.join(__dirname, '..', 'src', 'data', 'hadith-collections');

// The exact CP850 codepage table
const cp850 = 
  '\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0B\f\r\x0E\x0F' +
  '\x10\x11\x12\x13\x14\x15\x16\x17\x18\x19\x1A\x1B\x1C\x1D\x1E\x1F' +
  ' !"#$%&\'()*+,-./0123456789:;<=>?' +
  '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_' +
  '`abcdefghijklmnopqrstuvwxyz{|}~\x7F' +
  'ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒ' +
  'áíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐' +
  '└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀' +
  'ÓßÔÒõÕµþÞÚÛÙýÝ¯´\xAD±‗¾¶§÷¸°¨·¹³²■\xA0';

const charToByte = {};
for (let i = 0; i < 256; i++) {
  charToByte[cp850[i]] = i;
}
charToByte['\u00A0'] = 255; 

// Detect if a string is suffering from this specific mojibake
// Ô (U+00D4) = 212, ─ (U+2500)
function hasMojibake(str) {
  if (!str) return false;
  // Box drawings, Ô, Ï, etc.
  return /[\u2500-\u257F]/.test(str) || /\u00cf/.test(str) || /\u00d4/.test(str);
}

// Reverse the Mojibake back to correct UTF-8
function fixMojibake(str) {
  if (!str) return str;
  let bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    let b = charToByte[c];
    if (b === undefined) {
      // If a character isn't in CP850, it means it wasn't garbled (like standard ASCII)
      b = c.charCodeAt(0);
    }
    bytes.push(b);
  }
  return Buffer.from(bytes).toString('utf8');
}

// Recursively clean an object's strings
function cleanObject(obj) {
  let changed = false;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (cleanObject(obj[i])) changed = true;
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'string') {
        if (hasMojibake(v)) {
          obj[k] = fixMojibake(v);
          changed = true;
        }
      } else if (typeof v === 'object') {
        if (cleanObject(v)) changed = true;
      }
    }
  }
  return changed;
}

function processDirectory(baseDir) {
  if (!fs.existsSync(baseDir)) return;
  const dirs = fs.readdirSync(baseDir).filter(d => fs.statSync(path.join(baseDir, d)).isDirectory());
  
  for (const slug of dirs) {
    // Process hadiths.json
    const hPath = path.join(baseDir, slug, 'hadiths.json');
    if (fs.existsSync(hPath)) {
      const data = JSON.parse(fs.readFileSync(hPath, 'utf8'));
      if (cleanObject(data)) {
        fs.writeFileSync(hPath, JSON.stringify(data, null, 2), { encoding: 'utf8' });
        console.log(`[FIXED] ${baseDir}/${slug}/hadiths.json`);
      }
    }

    // Process metadata.json
    const mPath = path.join(baseDir, slug, 'metadata.json');
    if (fs.existsSync(mPath)) {
      const data = JSON.parse(fs.readFileSync(mPath, 'utf8'));
      if (cleanObject(data)) {
        fs.writeFileSync(mPath, JSON.stringify(data, null, 2), { encoding: 'utf8' });
        console.log(`[FIXED] ${baseDir}/${slug}/metadata.json`);
      }
    }
  }
}

console.log('=== Universal Mojibake Repair ===\n');
processDirectory(PUBLIC_BASE);
processDirectory(SRC_BASE);
console.log('\nAll done!');
