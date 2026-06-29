/**
 * PDF Report Generator
 * Generates comprehensive menstrual health reports using jsPDF
 */

import type { CycleRecord, CycleStatistics, MedicationDefinition, ExportOptions } from '@/types/menstrual';
import { format, parseISO, subMonths } from 'date-fns';

// Lazy load jsPDF to reduce bundle size
let jsPDFModule: any = null;

async function getJsPDF() {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.jsPDF;
}

interface ReportData {
  profileName: string;
  cycles: CycleRecord[];
  statistics: CycleStatistics | null;
  medications: MedicationDefinition[];
  dateRange: { start: Date; end: Date };
  generatedAt: Date;
}

const COLORS = {
  primary: [225, 29, 72],    // rose-600
  secondary: [100, 116, 139], // slate-500
  accent: [59, 130, 246],     // blue-500
  success: [16, 185, 129],    // emerald-500
  warning: [245, 158, 11],    // amber-500
  text: [15, 23, 42],         // slate-900
  muted: [148, 163, 184],     // slate-400
  bg: [248, 250, 252],        // slate-50
};

/**
 * Generate a comprehensive PDF report
 */
export const generatePDFReport = async (data: ReportData, options?: Partial<ExportOptions>): Promise<Blob> => {
  const jsPDF = await getJsPDF();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      addPage();
    }
  };

  // ===== COVER PAGE =====
  // Background
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 60, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('Noor Connect', margin, 25);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Menstrual Health Report', margin, 35);

  doc.setFontSize(10);
  doc.text(`Generated: ${format(data.generatedAt, 'MMMM d, yyyy')}`, margin, 45);
  doc.text(`Profile: ${data.profileName}`, margin, 51);

  // Date range
  y = 70;
  doc.setTextColor(...COLORS.text);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Report Period', margin, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${format(data.dateRange.start, 'MMM d, yyyy')} — ${format(data.dateRange.end, 'MMM d, yyyy')}`,
    margin,
    y
  );

  // Disclaimer
  y = pageHeight - 40;
  doc.setDrawColor(...COLORS.muted);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.muted);
  doc.text('This report is for personal tracking purposes only and is not a medical document.', margin, y);
  y += 4;
  doc.text('Consult a healthcare professional for medical advice.', margin, y);

  // ===== EXECUTIVE SUMMARY =====
  if (data.statistics) {
    addPage();
    y = margin;

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, y);
    y += 12;

    // Stats boxes
    const stats = [
      { label: 'Avg Cycle', value: `${data.statistics.averageCycleLength} days`, color: COLORS.primary },
      { label: 'Avg Period', value: `${data.statistics.averagePeriodLength} days`, color: COLORS.accent },
      { label: 'Regularity', value: `${Math.round(data.statistics.cycleRegularity * 100)}%`, color: COLORS.success },
      { label: 'Cycles Tracked', value: `${data.statistics.totalCyclesTracked}`, color: COLORS.warning },
    ];

    const boxWidth = (contentWidth - 10) / 2;
    const boxHeight = 25;

    stats.forEach((stat, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = margin + col * (boxWidth + 10);
      const boxY = y + row * (boxHeight + 5);

      doc.setFillColor(...COLORS.bg);
      doc.roundedRect(x, boxY, boxWidth, boxHeight, 3, 3, 'F');

      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(stat.label, x + 5, boxY + 8);

      doc.setTextColor(...stat.color);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(stat.value, x + 5, boxY + 20);
    });

    y += stats.length / 2 * (boxHeight + 5) + 10;

    // Most common symptoms
    if (data.statistics.mostCommonSymptoms.length > 0) {
      checkPageBreak(30);
      doc.setTextColor(...COLORS.text);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Most Common Symptoms', margin, y);
      y += 8;

      data.statistics.mostCommonSymptoms.slice(0, 5).forEach(({ symptom, averageSeverity }) => {
        checkPageBreak(8);
        const readable = symptom.replace(/([A-Z])/g, ' $1').trim();
        const barWidth = (averageSeverity / 5) * (contentWidth - 60);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.text);
        doc.text(readable, margin, y + 3);

        // Bar background
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin + 45, y - 2, contentWidth - 60, 5, 2, 2, 'F');

        // Bar fill
        doc.setFillColor(...COLORS.primary);
        doc.roundedRect(margin + 45, y - 2, barWidth, 5, 2, 2, 'F');

        doc.setTextColor(...COLORS.muted);
        doc.text(`${averageSeverity}/5`, pageWidth - margin - 10, y + 3);

        y += 10;
      });
    }
  }

  // ===== CYCLE HISTORY =====
  addPage();
  y = margin;

  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Cycle History', margin, y);
  y += 10;

  const completedCycles = data.cycles
    .filter(c => c.endDate)
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  if (completedCycles.length === 0) {
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(10);
    doc.text('No completed cycles in the selected period.', margin, y);
  } else {
    // Table header
    doc.setFillColor(...COLORS.bg);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.secondary);
    doc.text('Start Date', margin + 3, y + 5.5);
    doc.text('End Date', margin + 40, y + 5.5);
    doc.text('Duration', margin + 77, y + 5.5);
    doc.text('Period', margin + 105, y + 5.5);
    doc.text('Symptoms', margin + 130, y + 5.5);
    y += 10;

    completedCycles.slice(0, 20).forEach((cycle, i) => {
      checkPageBreak(8);
      const start = parseISO(cycle.startDate);
      const end = cycle.endDate ? parseISO(cycle.endDate) : new Date();
      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (i % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 3, contentWidth, 7, 'F');
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.text);
      doc.text(format(start, 'MMM d, yyyy'), margin + 3, y + 2);
      doc.text(format(end, 'MMM d, yyyy'), margin + 40, y + 2);
      doc.text(`${duration} days`, margin + 77, y + 2);
      doc.text(cycle.periodLength ? `${cycle.periodLength}d` : '—', margin + 105, y + 2);
      doc.text(`${cycle.symptoms.length}`, margin + 130, y + 2);
      y += 7;
    });
  }

  // ===== MEDICATION LOG =====
  if (data.medications.length > 0) {
    addPage();
    y = margin;

    doc.setTextColor(...COLORS.primary);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Medication Log', margin, y);
    y += 10;

    data.medications.forEach(med => {
      checkPageBreak(25);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.text);
      doc.text(med.name, margin, y);
      y += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text(`${med.type} • ${med.defaultDosage} • ${med.logs.length} doses logged`, margin, y);
      y += 7;

      // Recent logs
      const recentLogs = med.logs.slice(0, 5);
      if (recentLogs.length > 0) {
        recentLogs.forEach(log => {
          checkPageBreak(5);
          const date = parseISO(log.takenAt);
          doc.setFontSize(8);
          doc.text(
            `  ${format(date, 'MMM d, yyyy h:mm a')} — ${log.dosage}${log.effectiveness ? ` (${'★'.repeat(log.effectiveness)})` : ''}`,
            margin,
            y
          );
          y += 4;
        });
      }
      y += 5;
    });
  }

  // ===== FOOTER ON ALL PAGES =====
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.muted);
    doc.text(
      `Noor Connect • Page ${i} of ${pageCount} • Confidential`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
};

/**
 * Generate report data from cycles and medications
 */
export const prepareReportData = (
  profileName: string,
  cycles: CycleRecord[],
  statistics: CycleStatistics | null,
  medications: MedicationDefinition[],
  months: number = 6
): ReportData => {
  const endDate = new Date();
  const startDate = subMonths(endDate, months);

  const filteredCycles = cycles.filter(c => {
    const start = new Date(c.startDate);
    return start >= startDate && start <= endDate;
  });

  return {
    profileName,
    cycles: filteredCycles,
    statistics,
    medications,
    dateRange: { start: startDate, end: endDate },
    generatedAt: new Date(),
  };
};

/**
 * Download the PDF
 */
export const downloadPDF = (blob: Blob, filename: string = 'menstrual-report.pdf') => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
