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

export interface ZakatPdfData {
  lang: ContentLang;
  currency: string;
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
  const isUrdu = data.lang === 'ur';

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
  const headerY = 42;
  const headerW = width - 84;
  const headerH = 175;

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

  // Arabic Bismillah (Centered)
  ctx.fillStyle = '#FDE68A';
  ctx.font = 'bold 22px "Amiri", "Traditional Arabic", serif, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', width / 2, headerY + 36);

  // App Title / Branding
  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('NOOR CONNECT — ISLAMIC COMPANION', width / 2, headerY + 60);

  // Report Main Title: Arabic Calligraphy & Localized Subtitle
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
  const reportMainTitle = `${ui.reportTitle} • زكاة المال`;
  ctx.fillText(reportMainTitle, width / 2, headerY + 98);

  // Gregorian + Hijri Date Helper
  const now = new Date();
  const gregDateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  let hijriDateStr = '1448 AH';
  try {
    const hijriFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    hijriDateStr = hijriFmt.format(now) + ' AH';
  } catch {
    // Intl fallback
  }

  // Metadata Strip inside Header
  const metaBoxY = headerY + 120;
  const metaBoxH = 38;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, headerX + 24, metaBoxY, headerW - 48, metaBoxH, 8);
  ctx.fill();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  const metaText = `📅 ${gregDateStr}  •  🌙 ${hijriDateStr}  •  💰 Currency: ${data.currency}  •  ⚖️ Standard: Authentic Islamic Shariah (Hawl & Nisab)`;
  ctx.fillText(metaText, width / 2, metaBoxY + 24);

  // 4. Live Bullion & Nisab Reference Bar
  const refY = 230;
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
      val1: data.nisabChoice === 'silver' ? 'Silver 612.36g' : 'Gold 87.48g',
      val2: data.nisabChoice === 'silver' ? '52.5 Tola Std' : '7.5 Tola Std',
      color: '#047857',
    },
    {
      label: ui.activeNisabLabel,
      val1: formatCurrencyAmount(data.activeNisabThreshold, data.currency),
      val2: data.isNisabReached ? 'Status: Met ✓' : 'Status: Below',
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
    ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
    ctx.fillText(col.label, colX + colW / 2, refY + 22);

    // Primary Value
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 13.5px monospace, system-ui, sans-serif';
    ctx.fillText(col.val1, colX + colW / 2, refY + 44);

    // Secondary Value
    ctx.fillStyle = '#64748B';
    ctx.font = '10.5px system-ui, -apple-system, sans-serif';
    ctx.fillText(col.val2, colX + colW / 2, refY + 64);
  });

  // 5. Itemized Wealth & Liabilities Table
  const tableY = 325;
  const tableHeaderH = 34;
  const rowH = 43;

  // Table Header
  ctx.fillStyle = '#064E3B';
  roundRect(ctx, headerX, tableY, headerW, tableHeaderH, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ITEMIZED WEALTH & LIABILITIES BREAKDOWN', headerX + 16, tableY + 22);

  ctx.textAlign = 'right';
  ctx.fillText(`AMOUNT (${data.currency})`, headerX + headerW - 16, tableY + 22);

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
    ctx.font = isUrdu ? '13px "Jameel Noori Nastaliq", system-ui, sans-serif' : '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cat.title, headerX + 16, curY + 26);

    // Value on Right
    ctx.textAlign = 'right';
    if (cat.isLivestock) {
      ctx.fillStyle = data.livestockZakatable ? '#B45309' : '#64748B';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(data.livestockZakatable ? (cat.note || 'Zakat Due') : 'Below Nisab', headerX + headerW - 16, curY + 26);
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
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SHARIAH ASSESSMENT & ZAKAT AL-MĀL VERDICT', headerX + 20, summaryY + 30);

  // Calculation Breakdown Rows
  const breakdownRows = [
    { label: ui.grossWealth, val: formatCurrencyAmount(data.totalGrossWealth, data.currency), color: '#0F172A', bold: false },
    { label: ui.lessLiabilities, val: `-${formatCurrencyAmount(data.totalLiabilities, data.currency)}`, color: '#BE123C', bold: false },
    { label: ui.netWealth, val: formatCurrencyAmount(data.netZakatableWealth, data.currency), color: '#047857', bold: true },
    { label: `${ui.activeNisabLabel} (${data.nisabChoice.toUpperCase()}):`, val: formatCurrencyAmount(data.activeNisabThreshold, data.currency), color: '#64748B', bold: false },
  ];

  let bY = summaryY + 54;
  breakdownRows.forEach((row) => {
    ctx.fillStyle = '#64748B';
    ctx.font = isUrdu ? '13px "Jameel Noori Nastaliq", system-ui, sans-serif' : '12px system-ui, -apple-system, sans-serif';
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
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(ui.nisabReached, width / 2, verdictY + 26);
  } else {
    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#F59E0B';
    roundRect(ctx, headerX + 16, verdictY, headerW - 32, verdictH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#92400E';
    ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
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
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ui.zakatDueTitle.toUpperCase(), width / 2, dueBoxY + 34);

  // Large Zakat Due Amount
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px monospace, system-ui, sans-serif';
  ctx.fillText(formatCurrencyAmount(data.zakatDue, data.currency), width / 2, dueBoxY + 82);

  // Monthly Installment Breakdown
  if (data.zakatDue > 0) {
    ctx.fillStyle = '#FEF3C7';
    ctx.font = '12.5px system-ui, -apple-system, sans-serif';
    const monthlyAmt = formatCurrencyAmount(Math.round(data.zakatDue / 12), data.currency);
    ctx.fillText(`💡 ${ui.monthlyOpt} ${monthlyAmt} / month (12 equal monthly installments)`, width / 2, dueBoxY + 115);
  }

  // Ushr or Livestock Notes if applicable
  if (data.ushrDue > 0 || (data.livestockZakatable && data.livestockDueText)) {
    ctx.fillStyle = '#D1FAE5';
    ctx.font = '11.5px system-ui, -apple-system, sans-serif';
    const extraNotes = [
      data.ushrDue > 0 ? `🌾 Ushr Due: ${formatCurrencyAmount(data.ushrDue, data.currency)}` : null,
      data.livestockZakatable ? `🐑 Livestock: ${data.livestockDueText}` : null,
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
  ctx.fillText('« خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا »', width / 2, footerY + 42);

  // Translation
  ctx.fillStyle = '#475569';
  ctx.font = 'italic 11.5px system-ui, -apple-system, sans-serif';
  ctx.fillText('“Take from their wealth a charity by which you purify them and cause them increase.” (Surah At-Tawbah 9:103)', width / 2, footerY + 68);

  // Bottom Security & Privacy Guarantee
  ctx.fillStyle = '#94A3B8';
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'Calculated locally on your device according to authentic Islamic Shariah (Hawl & Nisab) • Noor Connect Islamic Companion',
    width / 2,
    footerY + 130
  );
  ctx.fillText(
    'Personal data never leaves your device • 100% Private, Secure & Offline-First',
    width / 2,
    footerY + 148
  );

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
