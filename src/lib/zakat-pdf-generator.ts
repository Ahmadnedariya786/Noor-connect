/**
 * NOOR CONNECT — Zakat Al-Māl Assessment Certificate PDF Generator
 * 
 * Spec-Compliant Single-Page A4 PDF (%PDF-1.4) Generator:
 * - High-DPI Offscreen HTML5 Canvas (1240 × 1754 px at 150 DPI)
 * - Multi-Script Support: English, Urdu (Nastaliq), Gujarati, Hindi & Arabic Calligraphy
 * - Pure-JS Embedded JPEG (DCTDecode) with Byte-Offset xref table & %%EOF trailer
 * - Zero external npm dependencies
 * - Native AndroidBridge shareBase64Pdf & Web Share Level 2 Integration
 */

import type { ContentLang } from './content-translator';
import { formatCurrencyAmount } from './zakat-market-api';
import { getZakatUIStrings } from './zakat-i18n';
import { islamicCalendarService } from './islamic-calendar-service';
import {
  getSelectedLogoEdition,
  getLogoEditionStaticSvgString,
  type NoorLogoEditionId,
} from '@/components/NoorDynamicLogo';

export interface ZakatPdfData {
  lang: ContentLang;
  currency: string;
  edition?: NoorLogoEditionId;
  // Rates
  goldPerGram: number;
  silverPerGram: number;
  goldPerTola: number;
  silverPerTola: number;
  nisabChoice: 'silver' | 'gold';
  activeNisabThreshold: number;
  isNisabReached: boolean;
  // Category Values
  cashTotal: number;
  goldTotal: number;
  silverTotal: number;
  investmentsTotal: number;
  businessTotal: number;
  otherTotal: number;
  ushrDue: number;
  ushrPercentage?: string;
  livestockZakatable: boolean;
  livestockDueText?: string;
  totalLiabilities: number;
  // Overalls
  totalGrossWealth: number;
  netZakatableWealth: number;
  zakatDue: number;
}

/**
 * Converts a data URL to a raw Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const commaIdx = dataUrl.indexOf(',');
  const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
  const binaryStr = typeof atob === 'function' ? atob(base64) : '';
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts a Blob to a Base64 string
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      try {
        const dataUrl = reader.result as string;
        const commaIdx = dataUrl.indexOf(',');
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read blob as Base64'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Wraps raw JPEG bytes into a 100% spec-compliant %PDF-1.4 single-page A4 PDF binary.
 * A4 Standard Dimensions in PDF points (72 DPI): 595.28 × 841.89 pt
 */
function jpegBytesToA4PdfBlob(
  jpegBytes: Uint8Array,
  imagePixelWidth: number,
  imagePixelHeight: number
): Blob {
  const a4Width = 595.28;
  const a4Height = 841.89;

  const encoder = new TextEncoder();

  // %PDF-1.4 binary header (with 4 binary comment bytes >= 128 as per spec §3.4.1)
  const headerBytes = new Uint8Array([
    0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, // %PDF-1.4\n
    0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,                    // %\xE2\xE3\xCF\xD3\n
  ]);

  // Object 1: Catalog
  const obj1Str = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  const obj2Str = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  const obj3Str = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${a4Width} ${a4Height}] /Resources << /XObject << /Im1 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>\nendobj\n`;

  // Object 4: Image XObject (with DCTDecode raw JPEG stream)
  const obj4HeadStr = `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imagePixelWidth} /Height ${imagePixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  const obj4TailStr = '\nendstream\nendobj\n';

  // Object 5: Contents (scales image to cover full A4 page: q 595.28 0 0 841.89 0 0 cm /Im1 Do Q)
  const contentStream = `q\n${a4Width} 0 0 ${a4Height} 0 0 cm\n/Im1 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  const obj5Str = `5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

  // Compute exact byte offsets for xref table
  let currentOffset = headerBytes.length;

  const offset1 = currentOffset;
  const obj1Bytes = encoder.encode(obj1Str);
  currentOffset += obj1Bytes.length;

  const offset2 = currentOffset;
  const obj2Bytes = encoder.encode(obj2Str);
  currentOffset += obj2Bytes.length;

  const offset3 = currentOffset;
  const obj3Bytes = encoder.encode(obj3Str);
  currentOffset += obj3Bytes.length;

  const offset4 = currentOffset;
  const obj4HeadBytes = encoder.encode(obj4HeadStr);
  const obj4TailBytes = encoder.encode(obj4TailStr);
  currentOffset += obj4HeadBytes.length + jpegBytes.length + obj4TailBytes.length;

  const offset5 = currentOffset;
  const obj5Bytes = encoder.encode(obj5Str);
  currentOffset += obj5Bytes.length;

  const xrefOffset = currentOffset;
  const formatOffset = (off: number) => off.toString().padStart(10, '0') + ' 00000 n \n';

  const xrefStr =
    'xref\n' +
    '0 6\n' +
    '0000000000 65535 f \n' +
    formatOffset(offset1) +
    formatOffset(offset2) +
    formatOffset(offset3) +
    formatOffset(offset4) +
    formatOffset(offset5) +
    'trailer\n' +
    '<< /Size 6 /Root 1 0 R >>\n' +
    'startxref\n' +
    xrefOffset.toString() +
    '\n%%EOF\n';

  const xrefBytes = encoder.encode(xrefStr);

  const totalLength = currentOffset + xrefBytes.length;
  const pdfBuffer = new Uint8Array(totalLength);

  let pos = 0;
  pdfBuffer.set(headerBytes, pos); pos += headerBytes.length;
  pdfBuffer.set(obj1Bytes, pos); pos += obj1Bytes.length;
  pdfBuffer.set(obj2Bytes, pos); pos += obj2Bytes.length;
  pdfBuffer.set(obj3Bytes, pos); pos += obj3Bytes.length;
  pdfBuffer.set(obj4HeadBytes, pos); pos += obj4HeadBytes.length;
  pdfBuffer.set(jpegBytes, pos); pos += jpegBytes.length;
  pdfBuffer.set(obj4TailBytes, pos); pos += obj4TailBytes.length;
  pdfBuffer.set(obj5Bytes, pos); pos += obj5Bytes.length;
  pdfBuffer.set(xrefBytes, pos);

  return new Blob([pdfBuffer], { type: 'application/pdf' });
}

/**
 * Draws a rounded rectangle path on canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Draws the Royal Noor Living Emblem (Rub el Hizb + Blooming Quran + Mihrab Dome + Crescent)
 */
function drawRoyalNoorEmblem(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer Rub el Hizb octagram (two rotated squares)
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.4;
  const sq = radius * 0.72;
  ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);

  ctx.save();
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
  ctx.restore();

  // Dotted outer halo circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
  ctx.setLineDash([2, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Base Blooming Quran Leaves
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.moveTo(0, radius * 0.55);
  ctx.bezierCurveTo(-radius * 0.45, radius * 0.45, -radius * 0.55, radius * 0.2, -radius * 0.35, radius * 0.05);
  ctx.bezierCurveTo(-radius * 0.15, radius * 0.2, -radius * 0.05, radius * 0.4, 0, radius * 0.55);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, radius * 0.55);
  ctx.bezierCurveTo(radius * 0.45, radius * 0.45, radius * 0.55, radius * 0.2, radius * 0.35, radius * 0.05);
  ctx.bezierCurveTo(radius * 0.15, radius * 0.2, radius * 0.05, radius * 0.4, 0, radius * 0.55);
  ctx.fill();

  // Center Mihrab Arch & Dome
  ctx.fillStyle = '#064E3B';
  ctx.strokeStyle = '#FDE68A';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.25, radius * 0.45);
  ctx.lineTo(-radius * 0.25, -radius * 0.15);
  ctx.quadraticCurveTo(-radius * 0.25, -radius * 0.55, 0, -radius * 0.65);
  ctx.quadraticCurveTo(radius * 0.25, -radius * 0.55, radius * 0.25, -radius * 0.15);
  ctx.lineTo(radius * 0.25, radius * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crescent Moon at Apex
  ctx.fillStyle = '#FFFDF0';
  ctx.beginPath();
  ctx.arc(0, -radius * 0.72, radius * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#064E3B';
  ctx.beginPath();
  ctx.arc(radius * 0.04, -radius * 0.74, radius * 0.10, 0, Math.PI * 2);
  ctx.fill();

  // Arabic Calligraphy 'نُور' in center
  ctx.fillStyle = '#FFFDF0';
  ctx.font = `bold ${Math.round(radius * 0.32)}px "Amiri", "Traditional Arabic", serif, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('نُور', 0, radius * 0.05);

  ctx.restore();
}

/**
 * Draws the subtle Rub el Hizb geometric mandala watermark in the center of the parchment page
 */
function drawWatermarkMandala(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 142, 62, 0.045)';
  ctx.lineWidth = 1.4;

  // Concentric circles
  const radii = [r, r * 0.85, r * 0.70, r * 0.50, r * 0.35, r * 0.20];
  radii.forEach((radius) => {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Multiple rotated squares for 8-pointed & 16-pointed mandala
  ctx.translate(cx, cy);
  const sqSizes = [r * 0.72, r * 0.52, r * 0.35];
  sqSizes.forEach((sq) => {
    for (let rot = 0; rot < 4; rot++) {
      ctx.save();
      ctx.rotate((rot * Math.PI) / 8);
      ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
      ctx.restore();
    }
  });

  // 16 Radial lines
  for (let i = 0; i < 16; i++) {
    ctx.save();
    ctx.rotate((i * Math.PI) / 8);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.2);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws an authentic 8-pointed Islamic corner rosette (۞)
 */
function drawCornerRosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = '#C59B27';
  ctx.fillStyle = '#FAF2DF';
  ctx.lineWidth = 1.3;

  const half = size / 2;
  // Square 1
  ctx.fillRect(-half, -half, size, size);
  ctx.strokeRect(-half, -half, size, size);

  // Square 2 rotated 45 deg
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-half, -half, size, size);
  ctx.strokeRect(-half, -half, size, size);

  // Center gold dot
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#C59B27';
  ctx.fill();

  ctx.restore();
}

/**
 * Draws a numbered 8-pointed octagonal badge (28px × 28px) on table rows
 */
function drawOctagonalRowBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  numStr: string,
  isLiability: boolean
) {
  ctx.save();
  ctx.translate(cx, cy);

  const radius = size / 2;
  const cut = radius * 0.42;

  // 8-sided polygon path
  ctx.beginPath();
  ctx.moveTo(-radius + cut, -radius);
  ctx.lineTo(radius - cut, -radius);
  ctx.lineTo(radius, -radius + cut);
  ctx.lineTo(radius, radius - cut);
  ctx.lineTo(radius - cut, radius);
  ctx.lineTo(-radius + cut, radius);
  ctx.lineTo(-radius, radius - cut);
  ctx.lineTo(-radius, -radius + cut);
  ctx.closePath();

  ctx.fillStyle = isLiability ? '#BE123C' : '#083326';
  ctx.fill();

  ctx.strokeStyle = isLiability ? '#F43F5E' : '#D4AF37';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Inner decorative ring
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, 0, Math.PI * 2);
  ctx.strokeStyle = isLiability ? 'rgba(255,255,255,0.35)' : 'rgba(212,175,55,0.45)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Numeral text
  ctx.fillStyle = isLiability ? '#FFFFFF' : '#F5D061';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numStr, 0, 1);

  ctx.restore();
}

/**
 * Draws the official Circular/Octagonal Golden Islamic Seal Stamp rotated -8deg
 */
function drawShariahSealStamp(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((-8 * Math.PI) / 180); // Authentically tilted -8 degrees

  // Outer circular seal border
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Inner dotted concentric ring
  ctx.beginPath();
  ctx.arc(0, 0, radius - 5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(245, 208, 97, 0.65)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Inner solid ring
  ctx.beginPath();
  ctx.arc(0, 0, radius - 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Background subtle gold tint
  ctx.beginPath();
  ctx.arc(0, 0, radius - 13, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(245, 208, 97, 0.08)';
  ctx.fill();

  // 8-pointed star in center
  const sq = (radius - 14) * 0.45;
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-sq, -sq, sq * 2, sq * 2);
  ctx.restore();

  // Seal Calligraphy & Typography
  ctx.fillStyle = '#F5D061';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Arabic Top Seal Text
  ctx.font = 'bold 15px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.fillText('شَرِيعَة • مُعْتَمَد', 0, -radius * 0.38);

  // English Center
  ctx.font = 'bold 11.5px system-ui, sans-serif';
  ctx.fillText('SHARIAH COMPLIANT', 0, -radius * 0.08);

  // 2.5% Rate & Hawl
  ctx.font = 'bold 14px monospace, system-ui, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('2.5% AL-MĀL', 0, radius * 0.22);

  // Year Bottom
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillStyle = '#E2C15A';
  ctx.fillText('★ 1448 AH • 2026 ★', 0, radius * 0.50);

  ctx.restore();
}

/**
 * Canonical Islamic (Hijri) Month Names across the 4 supported languages.
 * Eliminates the Android WebView bug where Intl falls back to Gregorian names like "May 23, 1448 BC AH".
 */
export const ISLAMIC_MONTH_NAMES: Record<ContentLang, readonly string[]> = {
  en: [
    'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
    'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
    'Ramadan', 'Shawwal', "Dhu al-Qi'dah", "Dhu al-Hijjah",
  ],
  ur: [
    'محرم', 'صفر', 'ربیع الاول', 'ربیع الثانی',
    'جمادی الاول', 'جمادی الثانی', 'رجب', 'شعبان',
    'رمضان', 'شوال', 'ذوالقعدہ', 'ذوالحجہ',
  ],
  gu: [
    'મોહર્રમ', 'સફર', 'રબીઉલ અવ્વલ', 'રબીઉલ આખિર',
    'જુમાદિલ અવ્વલ', 'જુમાદિલ આખિર', 'રજબ', 'શાબાન',
    'રમઝાન', 'શવ્વાલ', 'ઝુલ્કદ', 'ઝુલહિજ્જ',
  ],
  hi: [
    'मुहर्रम', 'सफ़र', 'रबी उल-अव्वल', 'रबी उल-आखिर',
    'जुमादा अल-ऊला', 'जुमादा अल-आखिरा', 'रजब', 'शाबान',
    'रमज़ान', 'शव्वाल', 'ज़ुल-क़ादा', 'ज़ुल-हिज्जा',
  ],
};

/**
 * Returns an authentic, correctly formatted Hijri date (e.g. "22 Jumada al-Ula 1448 AH").
 * Safe against all Android WebView Intl quirks.
 */
export function getAuthenticHijriDate(date: Date = new Date(), lang: ContentLang = 'en'): string {
  let day = 1;
  let month = 1; // 1-based (1..12)
  let year = 1448;
  let parsedFromIntl = false;

  try {
    const intl = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    const parts = intl.formatToParts(date);
    for (const part of parts) {
      if (part.type === 'day') day = parseInt(part.value, 10);
      else if (part.type === 'month') month = parseInt(part.value, 10);
      else if (part.type === 'year') {
        const cleanYear = parseInt(part.value.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(cleanYear) && cleanYear >= 1300 && cleanYear <= 1600) {
          year = cleanYear;
        }
      }
    }
    if (day >= 1 && day <= 30 && month >= 1 && month <= 12 && year >= 1300 && year <= 1600) {
      parsedFromIntl = true;
    }
  } catch {
    parsedFromIntl = false;
  }

  // Pure-TS offline astronomical fallback if Intl is broken or returns anomalous values
  if (!parsedFromIntl) {
    try {
      const calc = islamicCalendarService.calculateIslamicDate(date);
      day = parseInt(calc.hijri.day, 10) || 1;
      month = calc.hijri.month.number || 1;
      year = parseInt(calc.hijri.year, 10) || 1448;
    } catch {
      day = 22;
      month = 5;
      year = 1448;
    }
  }

  const monthIdx = Math.max(0, Math.min(11, month - 1));
  const monthName = ISLAMIC_MONTH_NAMES[lang]?.[monthIdx] || ISLAMIC_MONTH_NAMES.en[monthIdx];
  const ahSuffix = lang === 'ur' ? 'ھ' : 'AH';

  return `${day} ${monthName} ${year} ${ahSuffix}`;
}

const logoImageCache = new Map<number, HTMLImageElement>();

/**
 * Loads a static SVG logo edition into an HTMLImageElement for canvas rendering.
 */
export async function getLogoEditionImage(edition: NoorLogoEditionId): Promise<HTMLImageElement | null> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null;
  const cached = logoImageCache.get(edition);
  if (cached && cached.complete && cached.naturalWidth > 0) return cached;

  return new Promise((resolve) => {
    try {
      const svgStr = getLogoEditionStaticSvgString(edition, 200);
      const img = new Image();
      img.onload = () => {
        logoImageCache.set(edition, img);
        resolve(img);
      };
      img.onerror = (err) => {
        console.warn('[ZakatPdfGenerator] Failed to load SVG logo as image:', err);
        resolve(null);
      };
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Returns a robust font string with proper font stack for Urdu, Gujarati, Hindi, and English.
 */
function getPdfFont(lang: ContentLang, sizePx: number, isBold = false, isMono = false): string {
  const weight = isBold ? 'bold ' : '';
  if (isMono) {
    return `${weight}${sizePx}px monospace, system-ui, sans-serif`;
  }
  if (lang === 'ur') {
    return `${weight}${sizePx + 1}px "Jameel Noori Nastaliq", "Noto Nastaliq Urdu", "Amiri", "Traditional Arabic", serif, system-ui, sans-serif`;
  }
  if (lang === 'gu') {
    return `${weight}${sizePx}px "Noto Sans Gujarati", "Shruti", system-ui, -apple-system, sans-serif`;
  }
  if (lang === 'hi') {
    return `${weight}${sizePx}px "Noto Sans Devanagari", "Mangal", system-ui, -apple-system, sans-serif`;
  }
  return `${weight}${sizePx}px system-ui, -apple-system, sans-serif`;
}

interface ZakatPdfStrings {
  brandingSub: string;
  itemizedBreakdown: string;
  amountHeader: string;
  shariahAssessmentVerdict: string;
  statusMet: string;
  statusBelow: string;
  zakatDueBadge: string;
  belowNisabBadge: string;
  currencyLabel: string;
  shariahStandardLabel: string;
  monthlyInstallmentSuffix: string;
  silverChoiceLabel: string;
  goldChoiceLabel: string;
  silverStdVal: string;
  goldStdVal: string;
  silverStdSub: string;
  goldStdSub: string;
  ushrDuePrefix: string;
  livestockPrefix: string;
  ayahArabic: string;
  ayahTranslation: string;
  securityNote1: string;
  securityNote2: string;
}

const PDF_STRINGS: Record<ContentLang, ZakatPdfStrings> = {
  en: {
    brandingSub: 'NOOR CONNECT — ISLAMIC COMPANION',
    itemizedBreakdown: 'ITEMIZED WEALTH & LIABILITIES BREAKDOWN',
    amountHeader: 'AMOUNT',
    shariahAssessmentVerdict: 'SHARIAH ASSESSMENT & ZAKAT AL-MĀL VERDICT',
    statusMet: 'Status: Met ✓',
    statusBelow: 'Status: Below',
    zakatDueBadge: 'Zakat Due',
    belowNisabBadge: 'Below Nisab',
    currencyLabel: 'Currency',
    shariahStandardLabel: 'Authentic Islamic Shariah (Hawl & Nisab)',
    monthlyInstallmentSuffix: '(12 equal monthly installments)',
    silverChoiceLabel: 'SILVER',
    goldChoiceLabel: 'GOLD',
    silverStdVal: 'Silver 612.36g',
    goldStdVal: 'Gold 87.48g',
    silverStdSub: '52.5 Tola Std',
    goldStdSub: '7.5 Tola Std',
    ushrDuePrefix: '🌾 Ushr Due:',
    livestockPrefix: '🐑 Livestock:',
    ayahArabic: '« خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا »',
    ayahTranslation: '“Take from their wealth a charity by which you purify them and cause them increase.” (Surah At-Tawbah 9:103)',
    securityNote1: 'Calculated locally on your device according to authentic Islamic Shariah (Hawl & Nisab) • Noor Connect',
    securityNote2: 'Personal data never leaves your device • 100% Private, Secure & Offline-First',
  },
  ur: {
    brandingSub: 'نور کنیکٹ — اسلامی رفیق',
    itemizedBreakdown: 'قابلِ زکوٰۃ مال اور واجبات کی تفصیل',
    amountHeader: 'رقم',
    shariahAssessmentVerdict: 'شرعی جائزہ اور زکوٰۃ المال کا حتمی فیصلہ',
    statusMet: 'صورتحال: نصاب مکمل ✓',
    statusBelow: 'صورتحال: نصاب سے کم',
    zakatDueBadge: 'زکوٰۃ واجب',
    belowNisabBadge: 'نصاب سے کم',
    currencyLabel: 'کرنسی',
    shariahStandardLabel: 'مستند اسلامی شریعت (حول و نصاب)',
    monthlyInstallmentSuffix: '(12 برابر ماہانہ اقساط)',
    silverChoiceLabel: 'چاندی',
    goldChoiceLabel: 'سونا',
    silverStdVal: 'چاندی 612.36 گرام',
    goldStdVal: 'سونا 87.48 گرام',
    silverStdSub: '52.5 تولہ معیار',
    goldStdSub: '7.5 تولہ معیار',
    ushrDuePrefix: '🌾 واجب الادا عشر:',
    livestockPrefix: '🐑 مویشی:',
    ayahArabic: '« خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا »',
    ayahTranslation: '”ان کے اموال میں سے صدقہ لیجیے جس کے ذریعے آپ انہیں پاک اور بابرکت بنائیں گے۔“ (سورہ التوبہ 9:103)',
    securityNote1: 'آپ کے آلے پر مستند اسلامی شریعت (حول اور نصاب) کے مطابق حساب کیا گیا • نور کنیکٹ',
    securityNote2: 'ذاتی معلومات کبھی آپ کے آلے سے باہر نہیں جاتی • 100٪ نجی، محفوظ اور آف لائن',
  },
  gu: {
    brandingSub: 'નૂર કનેક્ટ — ઇસ્લામી સાથી',
    itemizedBreakdown: 'સંપત્તિ અને દેવાની વિગતવાર ગણતરી',
    amountHeader: 'રકમ',
    shariahAssessmentVerdict: 'શરઈ મૂલ્યાંકન અને ઝકાત અલ-માલ સારાંશ',
    statusMet: 'સ્થિતિ: પૂર્ણ ✓',
    statusBelow: 'સ્થિતિ: ઓછું',
    zakatDueBadge: 'ઝકાત વાજિબ',
    belowNisabBadge: 'નિસાબથી ઓછું',
    currencyLabel: 'ચલણ',
    shariahStandardLabel: 'પ્રમાણભૂત ઇસ્લામી શરીઅત (હૌલ અને નિસાબ)',
    monthlyInstallmentSuffix: '(12 સમાન માસિક હપ્તા)',
    silverChoiceLabel: 'ચાંદી',
    goldChoiceLabel: 'સોનું',
    silverStdVal: 'ચાંદી 612.36 ગ્રામ',
    goldStdVal: 'સોનું 87.48 ગ્રામ',
    silverStdSub: '52.5 તોલા માનક',
    goldStdSub: '7.5 તોલા માનક',
    ushrDuePrefix: '🌾 વાજિબ ઉશ્ર:',
    livestockPrefix: '🐑 પશુધન:',
    ayahArabic: '« خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَતુઝَકِّيهِم بِهَا »',
    ayahTranslation: '“તેમના ધનમાંથી સદકો લો જેના દ્વારા તમે તેમને પવિત્ર અને બરકતવાળા બનાવો.” (સૂરહ અત-તૌબા 9:103)',
    securityNote1: 'પ્રમાણભૂત ઇસ્લામી શરીઅત (હૌલ અને નિસાબ) મુજબ આપના ડિવાઇસ પર ગણતરી કરેલ • નૂર કનેક્ટ',
    securityNote2: 'વ્યક્તિગત માહિતી ક્યારેય આપના ડિવાઇસ બહાર જતી નથી • 100% ખાનગી, સુરક્ષિત અને ઑફલાઇન',
  },
  hi: {
    brandingSub: 'नूर कनेक्ट — इस्लामी साथी',
    itemizedBreakdown: 'संपत्ति और देयताओं का विस्तृत विवरण',
    amountHeader: 'राशि',
    shariahAssessmentVerdict: 'शरई मूल्यांकन और ज़कात अल-माल सारांश',
    statusMet: 'स्थिति: पूर्ण ✓',
    statusBelow: 'स्थिति: कम',
    zakatDueBadge: 'ज़कात देय',
    belowNisabBadge: 'निसाब से कम',
    currencyLabel: 'मुद्रा',
    shariahStandardLabel: 'प्रमाणिक इस्लामी शरीअत (हौल और निसाब)',
    monthlyInstallmentSuffix: '(12 समान मासिक किश्तें)',
    silverChoiceLabel: 'चांदी',
    goldChoiceLabel: 'सोना',
    silverStdVal: 'चांदी 612.36 ग्राम',
    goldStdVal: 'सोना 87.48 ग्राम',
    silverStdSub: '52.5 तोला मानक',
    goldStdSub: '7.5 तोला मानक',
    ushrDuePrefix: '🌾 देय उश्र:',
    livestockPrefix: '🐑 पशुधन:',
    ayahArabic: '« خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا »',
    ayahTranslation: '“उनके धनों में से सदक़ा लीजिए जिसके द्वारा आप उन्हें पवित्र और बरकत वाला बनाएं।” (सूरह अत-तौबा 9:103)',
    securityNote1: 'प्रामाणिक इस्लामी शरीअत (हौल और निसाब) के अनुसार आपके डिवाइस पर गणना की गई • नूर कनेक्ट',
    securityNote2: 'व्यक्तिगत डेटा कभी भी आपके डिवाइस से बाहर नहीं जाता • 100% निजी, सुरक्षित और ऑफ़लाइन',
  },
};

/**
 * Generates the 1-Page A4 Zakat Report PDF Blob via High-DPI Offscreen Canvas
 */
export async function generateZakatReportPdf(data: ZakatPdfData): Promise<Blob> {
  const width = 1240;
  const height = 1754;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context for Zakat PDF generation');
  }

  const ui = getZakatUIStrings(data.lang);
  const pdfUi = PDF_STRINGS[data.lang] || PDF_STRINGS.en;

  // Retrieve active selected logo edition (0..4) and load as image
  const activeEdition: NoorLogoEditionId = data.edition !== undefined ? data.edition : getSelectedLogoEdition();
  const logoImg = await getLogoEditionImage(activeEdition);

  // 1. Royal Warm Parchment 3-Stop Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#FDFBF7');
  bgGrad.addColorStop(0.5, '#F7F1E3');
  bgGrad.addColorStop(1, '#EFE6D2');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Center 8-Pointed Rub el Hizb Geometric Mandala Watermark
  drawWatermarkMandala(ctx, 620, 880, 340);

  // 3. Double Ornate Border Frame with 8-Pointed Islamic Corner Rosettes
  // Outer Deep Emerald/Gold Border (margin = 28px)
  ctx.strokeStyle = '#0B3B2D';
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Inner 24K Burnished Gold Border (margin = 38px)
  ctx.strokeStyle = '#C59B27';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(38, 38, width - 76, height - 76);

  // 4 Corner Rosettes (۞)
  drawCornerRosette(ctx, 38, 38, 20);
  drawCornerRosette(ctx, width - 38, 38, 20);
  drawCornerRosette(ctx, 38, height - 38, 20);
  drawCornerRosette(ctx, width - 38, height - 38, 20);

  // 4. Redesigned Royal Header Banner (Zero Logo/Metadata Overlap!)
  const headerX = 56;
  const headerY = 56;
  const headerW = 1128; // width - 112
  const headerH = 216;

  // 3-Stop Luxury Emerald Gradient Fill
  const headerGrad = ctx.createLinearGradient(headerX, headerY, headerX, headerY + headerH);
  headerGrad.addColorStop(0, '#041E16');
  headerGrad.addColorStop(0.5, '#093829');
  headerGrad.addColorStop(1, '#05261C');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, headerX, headerY, headerW, headerH, 22);
  ctx.fill();

  // Burnished Gold Header Border (2px)
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  roundRect(ctx, headerX, headerY, headerW, headerH, 22);
  ctx.stroke();

  // Subtle Golden Mihrab Arch Pattern Lines inside Header Background
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.08)';
  ctx.lineWidth = 1.2;
  for (let archI = -3; archI <= 3; archI++) {
    const archX = 620 + archI * 120;
    ctx.beginPath();
    ctx.moveTo(archX - 50, headerY + headerH);
    ctx.lineTo(archX - 50, headerY + 110);
    ctx.quadraticCurveTo(archX, headerY + 60, archX + 50, headerY + 110);
    ctx.lineTo(archX + 50, headerY + headerH);
    ctx.stroke();
  }
  ctx.restore();

  // Draw Symmetrical User-Selected Logo Editions on Header Flanks inside Golden Rings
  const logoSize = 104;
  const leftLogoCx = 136;
  const leftLogoCy = 156;
  const rightLogoCx = 1104;
  const rightLogoCy = 156;

  // Golden Circular Rings for Logo Framing
  ctx.beginPath();
  ctx.arc(leftLogoCx, leftLogoCy, 56, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rightLogoCx, rightLogoCy, 56, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (logoImg) {
    ctx.drawImage(logoImg, leftLogoCx - logoSize / 2, leftLogoCy - logoSize / 2, logoSize, logoSize);
    ctx.drawImage(logoImg, rightLogoCx - logoSize / 2, rightLogoCy - logoSize / 2, logoSize, logoSize);
  } else {
    // Graceful canvas fallback
    drawRoyalNoorEmblem(ctx, leftLogoCx, leftLogoCy, 42);
    drawRoyalNoorEmblem(ctx, rightLogoCx, rightLogoCy, 42);
  }

  // Header Center Typography (strictly bounded within x = 210..1030)
  // y = 92: Golden Arabic Bismillah
  ctx.fillStyle = '#F5D061';
  ctx.font = 'bold 24px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 620, 92);

  // y = 122: Tracked uppercase subtitle
  ctx.fillStyle = '#E2C15A';
  ctx.font = getPdfFont(data.lang, 12.5, true);
  ctx.fillText('NOOR CONNECT • SHARIAH WEALTH & ZAKAT AL-MĀL CERTIFICATE', 620, 122);

  // y = 162: Bold localized main title + زكاة المال
  ctx.fillStyle = '#FFFFFF';
  ctx.font = getPdfFont(data.lang, 28, true);
  const reportMainTitle = `${ui.reportTitle} • زكاة المال`;
  ctx.fillText(reportMainTitle, 620, 162, 780);

  // Gregorian + Authentic Hijri Date
  const now = new Date();
  const gregDateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const hijriDateStr = getAuthenticHijriDate(now, data.lang);
  const currencySymbol =
    data.currency === 'INR' ? '₹' :
    data.currency === 'USD' ? '$' :
    data.currency === 'GBP' ? '£' :
    data.currency === 'EUR' ? '€' :
    data.currency === 'AED' ? 'د.إ' :
    data.currency === 'SAR' ? '﷼' : data.currency;

  // y = 192..228: Compact Centered Metadata Pill — STRICT WIDTH 760px (x = 240..1000)
  // Guaranteed 52px clearance from left logo (x = 84..188) and right logo (x = 1052..1156)!
  const metaPillX = 240;
  const metaPillY = 192;
  const metaPillW = 760;
  const metaPillH = 36;

  ctx.fillStyle = 'rgba(212, 175, 55, 0.14)';
  roundRect(ctx, metaPillX, metaPillY, metaPillW, metaPillH, 18);
  ctx.fill();

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
  ctx.lineWidth = 1;
  roundRect(ctx, metaPillX, metaPillY, metaPillW, metaPillH, 18);
  ctx.stroke();

  ctx.fillStyle = '#FFF7D6';
  ctx.font = getPdfFont(data.lang, 12, true);
  const metaText = `📅 ${gregDateStr}  •  🌙 ${hijriDateStr}  •  🪙 ${pdfUi.currencyLabel}: ${data.currency} (${currencySymbol})`;
  ctx.fillText(metaText, 620, 215, 730);

  // 5. 3-Column Luxury Bullion & Nisab Reference Cards (y = 294, height = 118)
  const refY = 294;
  const refH = 118;
  const cardW = 360;
  const cardGap = 24;

  // Card 1: 24K Fine Gold Rate (x = 56)
  const card1X = headerX;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, card1X, refY, cardW, refH, 14);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, card1X, refY, cardW, refH, 14);
  ctx.stroke();

  // Top Accent Bar
  ctx.fillStyle = '#C59B27';
  roundRect(ctx, card1X, refY, cardW, 6, 3);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#B45309';
  ctx.font = getPdfFont(data.lang, 11, true);
  ctx.fillText(`🪙 ${ui.fineGold24k.toUpperCase()}`, card1X + cardW / 2, refY + 28);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px monospace, system-ui, sans-serif';
  ctx.fillText(`${formatCurrencyAmount(data.goldPerGram, data.currency)}/g`, card1X + cardW / 2, refY + 58);

  ctx.fillStyle = '#64748B';
  ctx.font = getPdfFont(data.lang, 12.5, false);
  ctx.fillText(`${formatCurrencyAmount(data.goldPerTola, data.currency)}/tola`, card1X + cardW / 2, refY + 86);

  // Card 2: 999 Fine Silver Rate (x = 440)
  const card2X = headerX + cardW + cardGap;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, card2X, refY, cardW, refH, 14);
  ctx.fill();
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1.5;
  roundRect(ctx, card2X, refY, cardW, refH, 14);
  ctx.stroke();

  // Top Accent Bar
  ctx.fillStyle = '#64748B';
  roundRect(ctx, card2X, refY, cardW, 6, 3);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.font = getPdfFont(data.lang, 11, true);
  ctx.fillText(`🥈 ${ui.fineSilver999.toUpperCase()}`, card2X + cardW / 2, refY + 28);

  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 17px monospace, system-ui, sans-serif';
  ctx.fillText(`${formatCurrencyAmount(data.silverPerGram, data.currency)}/g`, card2X + cardW / 2, refY + 58);

  ctx.fillStyle = '#64748B';
  ctx.font = getPdfFont(data.lang, 12.5, false);
  ctx.fillText(`${formatCurrencyAmount(data.silverPerTola, data.currency)}/tola`, card2X + cardW / 2, refY + 86);

  // Card 3: Active Shariah Nisab Standard (x = 824) - Highlighted warm gold-tinted card
  const card3X = headerX + (cardW + cardGap) * 2;
  ctx.fillStyle = '#FAF2DF';
  roundRect(ctx, card3X, refY, cardW, refH, 14);
  ctx.fill();
  ctx.strokeStyle = '#C59B27';
  ctx.lineWidth = 2;
  roundRect(ctx, card3X, refY, cardW, refH, 14);
  ctx.stroke();

  // Top Accent Bar
  ctx.fillStyle = '#083326';
  roundRect(ctx, card3X, refY, cardW, 6, 3);
  ctx.fill();

  ctx.fillStyle = '#047857';
  ctx.font = getPdfFont(data.lang, 11, true);
  ctx.fillText(`⚖️ ${ui.nisabSectionTitle.toUpperCase()}`, card3X + cardW / 2, refY + 28);

  ctx.fillStyle = '#0F172A';
  ctx.font = getPdfFont(data.lang, 14, true);
  const nisabChoiceText = data.nisabChoice === 'silver' ? pdfUi.silverChoiceLabel : pdfUi.goldChoiceLabel;
  const nisabChoiceVal = data.nisabChoice === 'silver' ? pdfUi.silverStdVal : pdfUi.goldStdVal;
  ctx.fillText(`${nisabChoiceText}: ${nisabChoiceVal}`, card3X + cardW / 2, refY + 58);

  ctx.fillStyle = '#B45309';
  ctx.font = 'bold 13px monospace, system-ui, sans-serif';
  const nisabThresholdText = `Nisab: ${formatCurrencyAmount(data.activeNisabThreshold, data.currency)} • ${data.isNisabReached ? pdfUi.statusMet : pdfUi.statusBelow}`;
  ctx.fillText(nisabThresholdText, card3X + cardW / 2, refY + 86);

  // 6. Modern Islamic Itemized Wealth Table with Numbered Octagonal Badges (y = 434)
  const tableY = 434;
  const tableHeaderH = 46;
  const rowH = 50;

  // Table Header Banner (Deep emerald #083326 with gold border)
  ctx.fillStyle = '#083326';
  roundRect(ctx, headerX, tableY, headerW, tableHeaderH, 12);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, tableY, headerW, tableHeaderH, 12);
  ctx.stroke();

  ctx.fillStyle = '#F5D061';
  ctx.font = getPdfFont(data.lang, 12.5, true);
  ctx.textAlign = 'left';
  ctx.fillText(pdfUi.itemizedBreakdown, headerX + 24, tableY + 28);

  ctx.textAlign = 'right';
  ctx.fillText(`${pdfUi.amountHeader} (${data.currency})`, headerX + headerW - 24, tableY + 28);

  const categories = [
    { title: ui.cashTitle, val: data.cashTotal, isNeg: false },
    { title: ui.goldTitle, val: data.goldTotal, isNeg: false },
    { title: ui.silverTitle, val: data.silverTotal, isNeg: false },
    { title: ui.investmentsTitle, val: data.investmentsTotal, isNeg: false },
    { title: ui.businessTitle, val: data.businessTotal, isNeg: false },
    { title: ui.otherTitle, val: data.otherTotal, isNeg: false },
    { title: ui.ushrTitle, val: data.ushrDue, isNeg: false, note: data.ushrDue > 0 ? `Ushr: ${data.ushrPercentage || 'Harvest'}` : undefined },
    { title: ui.livestockTitle, val: data.livestockZakatable ? 1 : 0, isLivestock: true, note: data.livestockDueText },
    { title: ui.debtsTitle, val: data.totalLiabilities, isNeg: true },
  ];

  let curY = tableY + tableHeaderH;
  categories.forEach((cat, idx) => {
    // Alternating warm ivory and soft parchment backgrounds
    if (cat.isNeg) {
      ctx.fillStyle = '#FFF1F2'; // Soft rose for liabilities
    } else if (idx % 2 === 1) {
      ctx.fillStyle = '#F6EFE0';
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(headerX, curY, headerW, rowH);

    // Golden-beige row divider
    ctx.strokeStyle = '#E5D9C0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headerX, curY + rowH);
    ctx.lineTo(headerX + headerW, curY + rowH);
    ctx.stroke();

    // Numbered 8-Pointed Octagonal Badge (28px × 28px) on Left
    drawOctagonalRowBadge(ctx, headerX + 28, curY + rowH / 2, 28, String(idx + 1), cat.isNeg);

    // Category Title
    ctx.fillStyle = cat.isNeg ? '#BE123C' : '#1E293B';
    ctx.font = getPdfFont(data.lang, 12.5, cat.isNeg);
    ctx.textAlign = 'left';
    ctx.fillText(cat.title, headerX + 54, curY + 31);

    // Value on Right with Optional Subtle Pill Background
    ctx.textAlign = 'right';
    if (cat.isLivestock) {
      ctx.fillStyle = data.livestockZakatable ? '#B45309' : '#64748B';
      ctx.font = getPdfFont(data.lang, 12, true);
      ctx.fillText(data.livestockZakatable ? (cat.note || pdfUi.zakatDueBadge) : pdfUi.belowNisabBadge, headerX + headerW - 24, curY + 31);
    } else {
      const formattedVal = (cat.isNeg && cat.val > 0 ? '-' : '') + formatCurrencyAmount(cat.val, data.currency);
      if (cat.val > 0) {
        // Subtle pill background
        const valWidth = 160;
        ctx.fillStyle = cat.isNeg ? 'rgba(244, 63, 94, 0.12)' : 'rgba(212, 175, 55, 0.12)';
        roundRect(ctx, headerX + headerW - valWidth - 14, curY + 9, valWidth, 32, 6);
        ctx.fill();
      }

      ctx.fillStyle = cat.isNeg ? '#BE123C' : '#0F172A';
      ctx.font = 'bold 13.5px monospace, system-ui, sans-serif';
      ctx.fillText(formattedVal, headerX + headerW - 24, curY + 31);
    }

    curY += rowH;
  });

  // Table Outer Frame
  ctx.strokeStyle = '#C59B27';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, tableY, headerW, curY - tableY, 12);
  ctx.stroke();

  // 7. Executive Shariah Assessment Ledger (y = 955, height = 175)
  const ledgerY = 955;
  const ledgerH = 175;

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, headerX, ledgerY, headerW, ledgerH, 14);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, ledgerY, headerW, ledgerH, 14);
  ctx.stroke();

  // Ledger Header
  ctx.fillStyle = '#0B3B2D';
  ctx.font = getPdfFont(data.lang, 13.5, true);
  ctx.textAlign = 'left';
  ctx.fillText(pdfUi.shariahAssessmentVerdict, headerX + 24, ledgerY + 28);

  // Calculation Breakdown Rows
  const breakdownRows = [
    { label: ui.grossWealth, val: formatCurrencyAmount(data.totalGrossWealth, data.currency), color: '#0F172A', bold: false },
    { label: ui.lessLiabilities, val: `-${formatCurrencyAmount(data.totalLiabilities, data.currency)}`, color: '#BE123C', bold: false },
    { label: ui.netWealth, val: formatCurrencyAmount(data.netZakatableWealth, data.currency), color: '#047857', bold: true, isHighlight: true },
    { label: `${ui.activeNisabLabel} (${nisabChoiceText}):`, val: formatCurrencyAmount(data.activeNisabThreshold, data.currency), color: '#64748B', bold: false },
  ];

  let bY = ledgerY + 44;
  breakdownRows.forEach((row) => {
    if (row.isHighlight) {
      // Warm golden-ivory highlight bar
      ctx.fillStyle = '#FAF2DF';
      roundRect(ctx, headerX + 16, bY - 3, headerW - 32, 28, 6);
      ctx.fill();
      ctx.strokeStyle = '#C59B27';
      ctx.lineWidth = 1;
      roundRect(ctx, headerX + 16, bY - 3, headerW - 32, 28, 6);
      ctx.stroke();
    }

    ctx.fillStyle = row.isHighlight ? '#047857' : '#475569';
    ctx.font = getPdfFont(data.lang, 12, row.bold);
    ctx.textAlign = 'left';
    ctx.fillText(row.label, headerX + 24, bY + 16);

    ctx.fillStyle = row.color;
    ctx.font = `${row.bold ? 'bold 15px' : '13px'} monospace, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(row.val, headerX + headerW - 24, bY + 16);

    bY += 31;
  });

  // 8. Grand Zakat Al-Māl Verdict Card + Official Shariah Seal Stamp (y = 1148, height = 185)
  const verdictCardY = 1148;
  const verdictCardH = 185;

  const dueGrad = ctx.createLinearGradient(headerX, verdictCardY, headerX, verdictCardY + verdictCardH);
  dueGrad.addColorStop(0, '#062B1F');
  dueGrad.addColorStop(0.5, '#0C4735');
  dueGrad.addColorStop(1, '#062B1F');
  ctx.fillStyle = dueGrad;
  roundRect(ctx, headerX, verdictCardY, headerW, verdictCardH, 16);
  ctx.fill();

  // Double Gold Border
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  roundRect(ctx, headerX, verdictCardY, headerW, verdictCardH, 16);
  ctx.stroke();

  ctx.strokeStyle = '#E5C158';
  ctx.lineWidth = 1;
  roundRect(ctx, headerX + 6, verdictCardY + 6, headerW - 12, verdictCardH - 12, 12);
  ctx.stroke();

  // Top Pill Badge: Verdict
  const verdictPillW = 340;
  const verdictPillH = 26;
  const verdictPillY = verdictCardY + 16;
  ctx.fillStyle = 'rgba(245, 208, 97, 0.16)';
  roundRect(ctx, headerX + 24, verdictPillY, verdictPillW, verdictPillH, 13);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 208, 97, 0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, headerX + 24, verdictPillY, verdictPillW, verdictPillH, 13);
  ctx.stroke();

  ctx.fillStyle = '#F5D061';
  ctx.font = getPdfFont(data.lang, 11, true);
  ctx.textAlign = 'center';
  const verdictPillText = data.isNisabReached ? `✓ ${ui.nisabReached.toUpperCase()}` : ui.belowNisab.toUpperCase();
  ctx.fillText(verdictPillText, headerX + 24 + verdictPillW / 2, verdictPillY + 18);

  // Center-Left Zakat Due Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FDE68A';
  ctx.font = getPdfFont(data.lang, 13.5, true);
  ctx.fillText(ui.zakatDueTitle.toUpperCase(), headerX + 24, verdictCardY + 68);

  // Monumental Golden Amount (52px bold gold #F5D061)
  ctx.fillStyle = '#F5D061';
  ctx.font = 'bold 50px monospace, system-ui, sans-serif';
  ctx.fillText(formatCurrencyAmount(data.zakatDue, data.currency), headerX + 24, verdictCardY + 122);

  // Monthly Installment Breakdown
  if (data.zakatDue > 0) {
    ctx.fillStyle = '#FEF3C7';
    ctx.font = getPdfFont(data.lang, 12, false);
    const monthlyAmt = formatCurrencyAmount(Math.round(data.zakatDue / 12), data.currency);
    ctx.fillText(`💡 ${ui.monthlyOpt} ${monthlyAmt} / month ${pdfUi.monthlyInstallmentSuffix}`, headerX + 24, verdictCardY + 154);
  }

  // Ushr or Livestock Notes if applicable
  if (data.ushrDue > 0 || (data.livestockZakatable && data.livestockDueText)) {
    ctx.fillStyle = '#D1FAE5';
    ctx.font = getPdfFont(data.lang, 11, false);
    const extraNotes = [
      data.ushrDue > 0 ? `${pdfUi.ushrDuePrefix} ${formatCurrencyAmount(data.ushrDue, data.currency)}` : null,
      data.livestockZakatable ? `${pdfUi.livestockPrefix} ${data.livestockDueText || pdfUi.zakatDueBadge}` : null,
    ].filter(Boolean).join('  •  ');
    ctx.fillText(extraNotes, headerX + 24, verdictCardY + 172);
  }

  // Right Side: Official Circular/Octagonal Golden Islamic Seal Stamp rotated -8deg!
  drawShariahSealStamp(ctx, 1040, verdictCardY + verdictCardH / 2, 64);

  // 9. Bottom Quranic Scroll Footer (y = 1350, height = 105)
  const footerY = 1350;
  const footerH = 105;

  ctx.fillStyle = '#FAF6ED';
  roundRect(ctx, headerX, footerY, headerW, footerH, 14);
  ctx.fill();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, footerY, headerW, footerH, 14);
  ctx.stroke();

  // Arabic Ayah from Surah At-Tawbah (9:103)
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 18px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pdfUi.ayahArabic, 620, footerY + 38);

  // Localized Translation
  ctx.fillStyle = '#475569';
  ctx.font = getPdfFont(data.lang, 12, false);
  ctx.fillText(pdfUi.ayahTranslation, 620, footerY + 68);

  // Bottom Security & Privacy Guarantee
  ctx.fillStyle = '#64748B';
  ctx.font = getPdfFont(data.lang, 10.5, false);
  ctx.textAlign = 'center';
  ctx.fillText(pdfUi.securityNote1, 620, footerY + 130);

  ctx.fillStyle = '#94A3B8';
  ctx.font = getPdfFont(data.lang, 9.5, false);
  ctx.fillText(pdfUi.securityNote2, 620, footerY + 148);

  // 8. Convert Canvas to High-Quality JPEG Data URL
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.93);
  const jpegBytes = dataUrlToUint8Array(jpegDataUrl);

  // 9. Wrap in Spec-Compliant %PDF-1.4 Single-Page Binary
  return jpegBytesToA4PdfBlob(jpegBytes, width, height);
}

/**
 * 1-Tap PDF Share & Download Handler:
 * Priority 1: Native AndroidBridge.shareBase64Pdf (Direct Native Android Intent)
 * Priority 2: Web Share Level 2 File Sharing (navigator.share with File)
 * Priority 3: Automatic .pdf Download + Text Share Fallback
 */
export async function shareZakatPdfReport(
  data: ZakatPdfData,
  summaryText: string
): Promise<{ success: boolean; method: string }> {
  const fileName = `Noor_Connect_Zakat_Report_${data.currency}_${new Date().toISOString().slice(0, 10)}.pdf`;
  const pdfBlob = await generateZakatReportPdf(data);

  // Priority 1: Native AndroidBridge (via MainActivity.java)
  if (typeof window !== 'undefined') {
    const androidBridge = (window as unknown as { AndroidBridge?: { shareBase64Pdf?: (b64: string, name: string, title: string) => void } }).AndroidBridge;
    if (androidBridge && typeof androidBridge.shareBase64Pdf === 'function') {
      try {
        const base64 = await blobToBase64(pdfBlob);
        androidBridge.shareBase64Pdf(base64, fileName, 'Share Zakat Assessment Report (PDF)');
        return { success: true, method: 'android-bridge' };
      } catch (err) {
        console.warn('[ZakatPdfGenerator] AndroidBridge.shareBase64Pdf failed, falling back to Web Share API:', err);
      }
    }
  }

  // Priority 2: Web Share Level 2 File Sharing
  if (typeof navigator !== 'undefined' && typeof File !== 'undefined' && navigator.canShare) {
    try {
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: 'Noor Connect — Zakat Al-Māl Report',
          text: summaryText,
        });
        return { success: true, method: 'web-share-file' };
      }
    } catch {
      // User cancelled share or file sharing unsupported, fallback to download
    }
  }

  // Priority 3: Automatic .pdf Download + Text Share Fallback
  try {
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

    // If text share is available, also invoke for user convenience
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Noor Connect — Zakat Al-Māl Report',
          text: summaryText,
        });
      } catch {
        // Handled silently
      }
    }

    return { success: true, method: 'download-fallback' };
  } catch (err) {
    console.error('[ZakatPdfGenerator] Failed to download PDF fallback:', err);
    throw err;
  }
}
