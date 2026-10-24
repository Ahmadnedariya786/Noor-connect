/**
 * Lightweight Standalone QR Code SVG Generator
 * Generates valid QR Code SVG vectors with zero external dependencies
 * Standard Version 3 / 4 Byte-mode QR encoder with Level L / M Error Correction
 */

export function generateQRCodeSVG(
  text: string,
  size = 120,
  fgColor = 'currentColor',
  bgColor = 'transparent'
): string {
  const matrix = createQRMatrix(text);
  const n = matrix.length;
  const cellSize = size / n;

  let rects = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r][c]) {
        const x = (c * cellSize).toFixed(2);
        const y = (r * cellSize).toFixed(2);
        const w = (cellSize + 0.05).toFixed(2);
        const h = (cellSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fgColor}"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="background:${bgColor}">${rects}</svg>`;
}

/**
 * Minimal QR matrix generator for standard URL/text payload
 */
function createQRMatrix(text: string): boolean[][] {
  // Determine version needed (Ver 3 = 29x29, Ver 4 = 33x33)
  const len = text.length;
  const version = len > 32 ? 4 : 3;
  const size = 17 + 4 * version;

  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // 1. Finder patterns (top-left, top-right, bottom-left)
  const placeFinder = (row: number, col: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = row + r;
        const tc = col + c;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size) {
          isFunction[tr][tc] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            matrix[tr][tc] = r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
          } else {
            matrix[tr][tc] = false;
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    isFunction[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    isFunction[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // 3. Alignment pattern for Ver 3 & 4
  const alignPos = version === 3 ? 22 : 26;
  const placeAlign = (row: number, col: number) => {
    for (let r = -2; r <= 2; r++) {
      for (let c = -2; c <= 2; c++) {
        const tr = row + r;
        const tc = col + c;
        if (!isFunction[tr][tc]) {
          isFunction[tr][tc] = true;
          matrix[tr][tc] = Math.max(Math.abs(r), Math.abs(c)) !== 1;
        }
      }
    }
  };
  placeAlign(alignPos, alignPos);

  // 4. Reserve format information areas
  for (let i = 0; i < 9; i++) {
    if (i < size) {
      isFunction[8][i] = true;
      isFunction[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunction[8][size - 1 - i] = true;
    isFunction[size - 1 - i][8] = true;
  }
  isFunction[size - 8][8] = true;
  matrix[size - 8][8] = true; // Dark module

  // 5. Data encoding (Byte mode: mode 0100 + length + bytes + terminator)
  const bitstream: number[] = [0, 1, 0, 0]; // 8-bit byte mode
  const charCountBits = 8;
  for (let i = charCountBits - 1; i >= 0; i--) {
    bitstream.push((len >> i) & 1);
  }
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) {
      bitstream.push((code >> b) & 1);
    }
  }

  // Terminator
  while (bitstream.length % 8 !== 0) bitstream.push(0);

  // Total capacity in bits for Ver 3/4
  const totalCodewords = version === 3 ? 70 : 100;
  const dataCodewords = version === 3 ? 44 : 64; // Level M
  const maxDataBits = dataCodewords * 8;

  while (bitstream.length < maxDataBits && bitstream.length < maxDataBits - 4) {
    bitstream.push(0);
  }

  // Pad bytes 0xEC, 0x11
  const padBytes = [0xEC, 0x11];
  let padIdx = 0;
  while (bitstream.length < maxDataBits) {
    const p = padBytes[padIdx % 2];
    for (let b = 7; b >= 0; b--) {
      bitstream.push((p >> b) & 1);
    }
    padIdx++;
  }

  // Convert bits to data bytes
  const dataBytes: number[] = [];
  for (let i = 0; i < maxDataBits; i += 8) {
    let val = 0;
    for (let b = 0; b < 8; b++) {
      val = (val << 1) | bitstream[i + b];
    }
    dataBytes.push(val);
  }

  // Reed Solomon error correction
  const ecCodewords = totalCodewords - dataCodewords;
  const ecBytes = calculateReedSolomon(dataBytes, ecCodewords);
  const allCodewords = [...dataBytes, ...ecBytes];

  // Convert all codewords to bits
  const finalBits: number[] = [];
  for (const byte of allCodewords) {
    for (let b = 7; b >= 0; b--) {
      finalBits.push((byte >> b) & 1);
    }
  }

  // 6. Place data bits into matrix in zigzag 2-column paths
  let bitIndex = 0;
  let upwards = true;

  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right--; // Skip vertical timing column

    const rows = upwards
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);

    for (const r of rows) {
      for (const c of [right, right - 1]) {
        if (!isFunction[r][c]) {
          const bit = bitIndex < finalBits.length ? finalBits[bitIndex++] : 0;
          // Apply standard mask pattern 0: (row + col) % 2 === 0
          const mask = (r + c) % 2 === 0;
          matrix[r][c] = (bit === 1) !== mask;
        }
      }
    }
    upwards = !upwards;
  }

  // 7. Format Information (Mask 0, Level M = 00, format bits: 101010000010010)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  for (let i = 0; i < 6; i++) matrix[8][i] = formatBits[i] === 1;
  matrix[8][7] = formatBits[6] === 1;
  matrix[8][8] = formatBits[7] === 1;
  matrix[7][8] = formatBits[8] === 1;
  for (let i = 9; i < 15; i++) matrix[14 - i][8] = formatBits[i] === 1;

  for (let i = 0; i < 8; i++) matrix[size - 1 - i][8] = formatBits[i] === 1;
  for (let i = 8; i < 15; i++) matrix[8][size - 15 + i] = formatBits[i] === 1;

  return matrix;
}

/**
 * GF(256) Reed-Solomon computation for QR Code Error Correction
 */
function calculateReedSolomon(data: number[], ecCount: number): number[] {
  // Precompute exp & log tables for GF(256) with primitive polynomial 0x11D
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let val = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = val;
    exp[i + 255] = val;
    log[val] = i;
    val = (val << 1) ^ (val & 0x80 ? 0x11D : 0);
  }

  // Generator polynomial
  let gen = [1];
  for (let i = 0; i < ecCount; i++) {
    const nextGen = new Array(gen.length + 1).fill(0);
    for (let j = 0; j < gen.length; j++) {
      nextGen[j] ^= gen[j];
      const factor = exp[(log[gen[j]] + i) % 255];
      nextGen[j + 1] ^= factor;
    }
    gen = nextGen;
  }

  // Remainder polynomial
  const result = new Array(ecCount).fill(0);
  for (const byte of data) {
    const factor = byte ^ result[0];
    result.shift();
    result.push(0);
    if (factor !== 0) {
      const logFactor = log[factor];
      for (let i = 0; i < ecCount; i++) {
        result[i] ^= exp[(logFactor + log[gen[i + 1]]) % 255];
      }
    }
  }

  return result;
}
