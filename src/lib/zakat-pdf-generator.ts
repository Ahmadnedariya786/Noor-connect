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

  // 1. Pure White Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // 2. Ornate Double Border
  // Outer Emerald Border
  ctx.strokeStyle = '#047857';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Inner Gold Border
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, width - 56, height - 56);

  // Corner Ornaments (Little Diamond Embellishments)
  const corners = [
    [28, 28],
    [width - 28, 28],
    [28, height - 28],
    [width - 28, height - 28],
  ];
  ctx.fillStyle = '#D97706';
  corners.forEach(([cx, cy]) => {
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // 3. Royal Header Banner
  const headerX = 42;
  const headerY = 36;
  const headerW = width - 84; // 1156
  const headerH = 205;

  // Emerald/Dark Green Gradient Fill
  const headerGrad = ctx.createLinearGradient(headerX, headerY, headerX, headerY + headerH);
  headerGrad.addColorStop(0, '#064E3B');
  headerGrad.addColorStop(1, '#022C22');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, headerX, headerY, headerW, headerH, 14);
  ctx.fill();

  // Ornate Gold Header Border
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, headerY, headerW, headerH, 14);
  ctx.stroke();

  // Draw Symmetrical User-Selected Logo Editions on Header Flanks
  const logoSize = 100;
  const leftLogoX = headerX + 38; // x = 80..180
  const leftLogoY = headerY + 24; // y = 60..160
  const rightLogoX = headerX + headerW - 38 - logoSize; // x = 1060..1160
  const rightLogoY = headerY + 24; // y = 60..160

  if (logoImg) {
    ctx.drawImage(logoImg, leftLogoX, leftLogoY, logoSize, logoSize);
    ctx.drawImage(logoImg, rightLogoX, rightLogoY, logoSize, logoSize);
  } else {
    // Graceful canvas fallback
    drawRoyalNoorEmblem(ctx, leftLogoX + logoSize / 2, leftLogoY + logoSize / 2, 40);
    drawRoyalNoorEmblem(ctx, rightLogoX + logoSize / 2, rightLogoY + logoSize / 2, 40);
  }

  // Arabic Bismillah (Centered)
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 22px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, headerY + 38);

  // App Title / Localized Branding
  ctx.fillStyle = '#FBBF24';
  ctx.font = getPdfFont(data.lang, 12, true);
  ctx.fillText(pdfUi.brandingSub, width / 2, headerY + 64);

  // Report Main Title: Localized Title & Arabic Calligraphy
  ctx.fillStyle = '#FFFFFF';
  ctx.font = getPdfFont(data.lang, 23, true);
  const reportMainTitle = `${ui.reportTitle} • زكاة المال`;
  ctx.fillText(reportMainTitle, width / 2, headerY + 104);

  // Gregorian + Authentic Hijri Date
  const now = new Date();
  const gregDateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const hijriDateStr = getAuthenticHijriDate(now, data.lang);

  // Metadata Strip inside Header (Pill Bar strictly centered with 30px lateral clearance from logos)
  const metaBoxW = 820;
  const metaBoxX = (width - metaBoxW) / 2; // x: 210..1030 (clear from left logo at 180 and right at 1060)
  const metaBoxY = headerY + 148;          // y: 184..222 (clear from logos bottom at 160)
  const metaBoxH = 38;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  roundRect(ctx, metaBoxX, metaBoxY, metaBoxW, metaBoxH, 8);
  ctx.fill();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = getPdfFont(data.lang, 11.5, false);
  const metaText = `📅 ${gregDateStr}  •  🌙 ${hijriDateStr}  •  🪙 ${pdfUi.currencyLabel}: ${data.currency}  •  ⚖️ ${pdfUi.shariahStandardLabel}`;
  ctx.fillText(metaText, width / 2, metaBoxY + 24);

  // 4. Live Bullion & Nisab Reference Bar
  const refY = 252;
  const refH = 80;
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, headerX, refY, headerW, refH, 10);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  roundRect(ctx, headerX, refY, headerW, refH, 10);
  ctx.stroke();

  const colW = headerW / 4;
  const refCols = [
    {
      label: ui.fineGold24k,
      val1: `${formatCurrencyAmount(data.goldPerGram, data.currency)}/g`,
      val2: `${formatCurrencyAmount(data.goldPerTola, data.currency)}/tola`,
      color: '#B45309',
    },
    {
      label: ui.fineSilver999,
      val1: `${formatCurrencyAmount(data.silverPerGram, data.currency)}/g`,
      val2: `${formatCurrencyAmount(data.silverPerTola, data.currency)}/tola`,
      color: '#475569',
    },
    {
      label: ui.nisabSectionTitle,
      val1: data.nisabChoice === 'silver' ? pdfUi.silverStdVal : pdfUi.goldStdVal,
      val2: data.nisabChoice === 'silver' ? pdfUi.silverStdSub : pdfUi.goldStdSub,
      color: '#047857',
    },
    {
      label: ui.activeNisabLabel,
      val1: formatCurrencyAmount(data.activeNisabThreshold, data.currency),
      val2: data.isNisabReached ? pdfUi.statusMet : pdfUi.statusBelow,
      color: data.isNisabReached ? '#047857' : '#B45309',
    },
  ];

  refCols.forEach((col, idx) => {
    const colX = headerX + idx * colW;
    ctx.textAlign = 'center';

    // Vertical Divider
    if (idx > 0) {
      ctx.strokeStyle = '#E2E8F0';
      ctx.beginPath();
      ctx.moveTo(colX, refY + 10);
      ctx.lineTo(colX, refY + refH - 10);
      ctx.stroke();
    }

    // Top Label
    ctx.fillStyle = col.color;
    ctx.font = getPdfFont(data.lang, 10, true);
    ctx.fillText(col.label, colX + colW / 2, refY + 22);

    // Primary Value
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13.5px monospace, system-ui, sans-serif';
    ctx.fillText(col.val1, colX + colW / 2, refY + 44);

    // Secondary Value
    ctx.fillStyle = '#64748B';
    ctx.font = getPdfFont(data.lang, 10.5, false);
    ctx.fillText(col.val2, colX + colW / 2, refY + 64);
  });

  // 5. Itemized Wealth & Liabilities Table
  const tableY = 344;
  const tableHeaderH = 34;
  const rowH = 43;

  // Table Header
  ctx.fillStyle = '#064E3B';
  roundRect(ctx, headerX, tableY, headerW, tableHeaderH, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = getPdfFont(data.lang, 12, true);
  ctx.textAlign = 'left';
  ctx.fillText(pdfUi.itemizedBreakdown, headerX + 16, tableY + 22);

  ctx.textAlign = 'right';
  ctx.fillText(`${pdfUi.amountHeader} (${data.currency})`, headerX + headerW - 16, tableY + 22);

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
    // Zebra background
    if (cat.isNeg) {
      ctx.fillStyle = '#FFF1F2'; // Soft rose for liabilities
    } else if (idx % 2 === 1) {
      ctx.fillStyle = '#F8FAFC';
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(headerX, curY, headerW, rowH);

    // Row divider
    ctx.strokeStyle = '#F1F5F9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(headerX, curY + rowH);
    ctx.lineTo(headerX + headerW, curY + rowH);
    ctx.stroke();

    // Category Title
    ctx.fillStyle = cat.isNeg ? '#BE123C' : '#1E293B';
    ctx.font = getPdfFont(data.lang, 12, false);
    ctx.textAlign = 'left';
    ctx.fillText(cat.title, headerX + 16, curY + 26);

    // Value on Right
    ctx.textAlign = 'right';
    if (cat.isLivestock) {
      ctx.fillStyle = data.livestockZakatable ? '#B45309' : '#64748B';
      ctx.font = getPdfFont(data.lang, 12, true);
      ctx.fillText(data.livestockZakatable ? (cat.note || pdfUi.zakatDueBadge) : pdfUi.belowNisabBadge, headerX + headerW - 16, curY + 26);
    } else {
      ctx.fillStyle = cat.isNeg ? '#BE123C' : '#0F172A';
      ctx.font = 'bold 13px monospace, system-ui, sans-serif';
      const formattedVal = (cat.isNeg && cat.val > 0 ? '-' : '') + formatCurrencyAmount(cat.val, data.currency);
      ctx.fillText(formattedVal, headerX + headerW - 16, curY + 26);
    }

    curY += rowH;
  });

  // Table Outer Frame
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  roundRect(ctx, headerX, tableY, headerW, curY - tableY, 8);
  ctx.stroke();

  // 6. Final Calculation Summary & Shariah Verdict Box
  const summaryY = curY + 16;
  const summaryH = 430;

  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, headerX, summaryY, headerW, summaryH, 12);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.5;
  roundRect(ctx, headerX, summaryY, headerW, summaryH, 12);
  ctx.stroke();

  // Summary Card Header
  ctx.fillStyle = '#0F172A';
  ctx.font = getPdfFont(data.lang, 13.5, true);
  ctx.textAlign = 'left';
  ctx.fillText(pdfUi.shariahAssessmentVerdict, headerX + 20, summaryY + 30);

  // Calculation Breakdown Rows
  const nisabChoiceText = data.nisabChoice === 'silver' ? pdfUi.silverChoiceLabel : pdfUi.goldChoiceLabel;
  const breakdownRows = [
    { label: ui.grossWealth, val: formatCurrencyAmount(data.totalGrossWealth, data.currency), color: '#0F172A', bold: false },
    { label: ui.lessLiabilities, val: `-${formatCurrencyAmount(data.totalLiabilities, data.currency)}`, color: '#BE123C', bold: false },
    { label: ui.netWealth, val: formatCurrencyAmount(data.netZakatableWealth, data.currency), color: '#047857', bold: true },
    { label: `${ui.activeNisabLabel} (${nisabChoiceText}):`, val: formatCurrencyAmount(data.activeNisabThreshold, data.currency), color: '#64748B', bold: false },
  ];

  let bY = summaryY + 54;
  breakdownRows.forEach((row) => {
    ctx.fillStyle = '#64748B';
    ctx.font = getPdfFont(data.lang, 12, false);
    ctx.textAlign = 'left';
    ctx.fillText(row.label, headerX + 20, bY + 14);

    ctx.fillStyle = row.color;
    ctx.font = `${row.bold ? 'bold 14.5px' : '13px'} monospace, system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(row.val, headerX + headerW - 20, bY + 14);

    bY += 26;
  });

  // Nisab Status Verdict Banner
  const verdictY = bY + 8;
  const verdictH = 42;
  if (data.isNisabReached) {
    ctx.fillStyle = '#ECFDF5';
    ctx.strokeStyle = '#10B981';
    roundRect(ctx, headerX + 16, verdictY, headerW - 32, verdictH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#065F46';
    ctx.font = getPdfFont(data.lang, 12.5, true);
    ctx.textAlign = 'center';
    ctx.fillText(ui.nisabReached, width / 2, verdictY + 26);
  } else {
    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#F59E0B';
    roundRect(ctx, headerX + 16, verdictY, headerW - 32, verdictH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.font = getPdfFont(data.lang, 12.5, true);
    ctx.textAlign = 'center';
    ctx.fillText(ui.belowNisab, width / 2, verdictY + 26);
  }

  // Hero Zakat Due Box
  const dueBoxY = verdictY + verdictH + 16;
  const dueBoxH = 175;

  const dueGrad = ctx.createLinearGradient(headerX + 16, dueBoxY, headerX + 16, dueBoxY + dueBoxH);
  dueGrad.addColorStop(0, '#064E3B');
  dueGrad.addColorStop(1, '#047857');
  ctx.fillStyle = dueGrad;
  roundRect(ctx, headerX + 16, dueBoxY, headerW - 32, dueBoxH, 12);
  ctx.fill();

  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  roundRect(ctx, headerX + 16, dueBoxY, headerW - 32, dueBoxH, 12);
  ctx.stroke();

  // Top Label in Due Box
  ctx.fillStyle = '#FDE68A';
  ctx.font = getPdfFont(data.lang, 13, true);
  ctx.textAlign = 'center';
  ctx.fillText(ui.zakatDueTitle.toUpperCase(), width / 2, dueBoxY + 34);

  // Large Zakat Due Amount
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px monospace, system-ui, sans-serif';
  ctx.fillText(formatCurrencyAmount(data.zakatDue, data.currency), width / 2, dueBoxY + 82);

  // Monthly Installment Breakdown
  if (data.zakatDue > 0) {
    ctx.fillStyle = '#FEF3C7';
    ctx.font = getPdfFont(data.lang, 12, false);
    const monthlyAmt = formatCurrencyAmount(Math.round(data.zakatDue / 12), data.currency);
    ctx.fillText(`💡 ${ui.monthlyOpt} ${monthlyAmt} / month ${pdfUi.monthlyInstallmentSuffix}`, width / 2, dueBoxY + 115);
  }

  // Ushr or Livestock Notes if applicable
  if (data.ushrDue > 0 || (data.livestockZakatable && data.livestockDueText)) {
    ctx.fillStyle = '#D1FAE5';
    ctx.font = getPdfFont(data.lang, 11.5, false);
    const extraNotes = [
      data.ushrDue > 0 ? `${pdfUi.ushrDuePrefix} ${formatCurrencyAmount(data.ushrDue, data.currency)}` : null,
      data.livestockZakatable ? `${pdfUi.livestockPrefix} ${data.livestockDueText || pdfUi.zakatDueBadge}` : null,
    ].filter(Boolean).join('  •  ');
    ctx.fillText(extraNotes, width / 2, dueBoxY + 144);
  }

  // 7. Footer: Quranic Ayah Citation & Authenticity Seal
  const footerY = 1530;

  // Decorative Rule
  ctx.strokeStyle = '#D97706';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(headerX, footerY);
  ctx.lineTo(headerX + headerW, footerY);
  ctx.stroke();

  // Ayah Box
  ctx.fillStyle = '#F8FAFC';
  roundRect(ctx, headerX, footerY + 12, headerW, 90, 8);
  ctx.fill();
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  roundRect(ctx, headerX, footerY + 12, headerW, 90, 8);
  ctx.stroke();

  // Arabic Ayah
  ctx.fillStyle = '#065F46';
  ctx.font = 'bold 15px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(pdfUi.ayahArabic, width / 2, footerY + 42);

  // Translation
  ctx.fillStyle = '#475569';
  ctx.font = getPdfFont(data.lang, 11.5, false);
  ctx.fillText(pdfUi.ayahTranslation, width / 2, footerY + 68);

  // Bottom Security & Privacy Guarantee
  ctx.fillStyle = '#94A3B8';
  ctx.font = getPdfFont(data.lang, 10, false);
  ctx.textAlign = 'center';
  ctx.fillText(pdfUi.securityNote1, width / 2, footerY + 130);
  ctx.fillText(pdfUi.securityNote2, width / 2, footerY + 148);

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
