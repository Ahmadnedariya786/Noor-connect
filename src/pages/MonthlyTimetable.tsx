import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Share2,
  Printer,
  RefreshCw,
  MapPin,
  Calendar,
  Sparkles,
  Download,
  CheckCircle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { useToast } from "@/hooks/use-toast";
import { useLocationState } from "@/lib/location-state";
import { useSettings } from "@/contexts/SettingsContext";
import { prayerMethods } from "@/lib/prayer-methods";
import { getMadhab } from "@/lib/storage";
import {
  OnlinePrayerAPI,
  type LiveMonthlyCalendar,
  type LiveDaySchedule
} from "@/lib/online-prayer-api";
import {
  getPrayerMinuteOffsets,
  applyOffsetsToTimings,
  PRAYER_OFFSETS_CHANGED_EVENT,
  type PrayerMinuteOffsets
} from "@/lib/prayer-offsets";
import { generateQRCodeSVG } from "@/lib/qr-generator";

const GITHUB_APP_URL = "https://github.com/Ahmadnedariya786/Noor-connect";

function sanitizeHijri(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, "ū")
    .replace(/al-ola/gi, "al-ūlā")
    .replace(/al-ōlā/gi, "al-ūlā")
    .replace(/ō/g, "ū");
}

function getConciseHijriMonth(monthNumber?: number, rawMonthName?: string): string {
  const titles: Record<number, string> = {
    1: "Muharram",
    2: "Safar",
    3: "Rabīʿ I",
    4: "Rabīʿ II",
    5: "Jumādā I",
    6: "Jumādā II",
    7: "Rajab",
    8: "Sha'ban",
    9: "Ramadan",
    10: "Shawwal",
    11: "Dhul-Qa'dah",
    12: "Dhul-Hijjah",
  };
  if (monthNumber && titles[monthNumber]) {
    return titles[monthNumber];
  }
  const clean = sanitizeHijri(rawMonthName || "").toLowerCase();
  if (clean.includes("muharram")) return "Muharram";
  if (clean.includes("safar")) return "Safar";
  if (clean.includes("rabi") && (clean.includes("awwal") || clean.includes("1") || clean.includes("i"))) return "Rabīʿ I";
  if (clean.includes("rabi")) return "Rabīʿ II";
  if (clean.includes("jumad") && (clean.includes("ula") || clean.includes("1") || clean.includes("i"))) return "Jumādā I";
  if (clean.includes("jumad")) return "Jumādā II";
  if (clean.includes("rajab")) return "Rajab";
  if (clean.includes("sha")) return "Sha'ban";
  if (clean.includes("ramadan")) return "Ramadan";
  if (clean.includes("shawwal")) return "Shawwal";
  if (clean.includes("qa")) return "Dhul-Qa'dah";
  if (clean.includes("hij")) return "Dhul-Hijjah";
  return clean ? clean.slice(0, 7) : "Hijri";
}

function formatTimetableTime(timeStr: string, is24h: boolean): string {
  if (!timeStr) return "--:--";
  const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, "").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return cleaned;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm) {
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
  }
  if (is24h) {
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m}`;
}

export default function MonthlyTimetable() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocationState();
  const { timeFormat } = useSettings();
  const is24h = timeFormat === "24h";

  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<LiveMonthlyCalendar | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);
  const [offsets, setOffsets] = useState<PrayerMinuteOffsets>(() => getPrayerMinuteOffsets());

  const selectedMethod = useMemo(() => prayerMethods.getSelectedMethod(), []);
  const madhab = useMemo(() => getMadhab(), []);

  // Listen to minute offsets changes
  useEffect(() => {
    const handleOffsetsChange = () => {
      setOffsets(getPrayerMinuteOffsets());
    };
    window.addEventListener("prayer-offsets-changed", handleOffsetsChange);
    window.addEventListener(PRAYER_OFFSETS_CHANGED_EVENT, handleOffsetsChange);
    window.addEventListener("focus", handleOffsetsChange);
    return () => {
      window.removeEventListener("prayer-offsets-changed", handleOffsetsChange);
      window.removeEventListener(PRAYER_OFFSETS_CHANGED_EVENT, handleOffsetsChange);
      window.removeEventListener("focus", handleOffsetsChange);
    };
  }, []);

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(GITHUB_APP_URL, 64, "#0B101B", "#FFFFFF");
  }, []);

  const printQrSvg = useMemo(() => {
    return generateQRCodeSVG(GITHUB_APP_URL, 56, "#0f172a", "#ffffff");
  }, []);

  const loadCalendar = useCallback(async (year: number, month: number, forceRefresh = false) => {
    if (!location.latitude || !location.longitude) return;
    setIsLoading(true);
    try {
      const data = await OnlinePrayerAPI.fetchMonthlyCalendar(
        year,
        month,
        location.latitude,
        location.longitude,
        forceRefresh
      );
      setCalendar(data);
    } catch {
      // Fallback local calendar
      const fallback = OnlinePrayerAPI.generateLocalMonthlyCalendar(
        year,
        month,
        location.latitude,
        location.longitude,
        3,
        madhab === "hanafi" ? 1 : 0,
        0
      );
      setCalendar(fallback);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [location.latitude, location.longitude, madhab]);

  useEffect(() => {
    loadCalendar(currentYear, currentMonth);
  }, [currentYear, currentMonth, loadCalendar]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handleRefresh = async () => {
    if (!location.latitude || !location.longitude) return;
    setIsRefreshing(true);
    try {
      await OnlinePrayerAPI.refreshLiveData(location.latitude, location.longitude, currentYear, currentMonth);
      await loadCalendar(currentYear, currentMonth, true);
      toast({
        title: "Live Data Refreshed",
        description: "Monthly prayer timetable synced with AlAdhan live API."
      });
    } catch {
      toast({
        title: "Sync Failed",
        description: "Could not refresh live data. Showing cached timetable.",
        variant: "destructive"
      });
      setIsRefreshing(false);
    }
  };

  // Month Display Name
  const monthName = useMemo(() => {
    const d = new Date(currentYear, currentMonth - 1, 1);
    return d.toLocaleString("en-US", { month: "long" });
  }, [currentYear, currentMonth]);

  // Derived Hijri Span for the month
  const hijriMonthSpan = useMemo(() => {
    if (!calendar || calendar.days.length === 0) return "";
    const firstDay = calendar.days[0];
    const lastDay = calendar.days[calendar.days.length - 1];
    const m1 = sanitizeHijri(firstDay.date.hijri.month.en);
    const m2 = sanitizeHijri(lastDay.date.hijri.month.en);
    const y = lastDay.date.hijri.year;
    if (m1 === m2) return `${m1} ${y} AH`;
    return `${m1} / ${m2} ${y} AH`;
  }, [calendar]);

  // Check if a day is today
  const isToday = (daySchedule: LiveDaySchedule): boolean => {
    const now = new Date();
    const d = parseInt(daySchedule.date.gregorian.day, 10);
    const m = daySchedule.date.gregorian.month.number;
    const y = parseInt(daySchedule.date.gregorian.year, 10);
    return d === now.getDate() && m === now.getMonth() + 1 && y === now.getFullYear();
  };

  // Check if a day is Friday (Jumu'ah)
  const isFriday = (daySchedule: LiveDaySchedule): boolean => {
    return daySchedule.date.gregorian.weekday.en.toLowerCase() === "friday";
  };

  // 1-Tap Share Image (Offscreen Canvas 2x DPI with native AndroidBridge integration)
  const handleShareImage = async () => {
    if (!calendar || calendar.days.length === 0) return;
    setIsSharingImage(true);

    try {
      const scale = 2;
      const width = 1000 * scale;
      const rowHeight = 32 * scale;
      const headerHeight = 220 * scale;
      const tableHeaderHeight = 44 * scale;
      const footerHeight = 70 * scale;
      const totalRows = calendar.days.length;
      const height = headerHeight + tableHeaderHeight + totalRows * rowHeight + footerHeight;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsSharingImage(false);
        return;
      }

      // Dark background
      ctx.fillStyle = "#0B1220";
      ctx.fillRect(0, 0, width, height);

      // Subtle decorative radial header gradient
      const grad = ctx.createLinearGradient(0, 0, width, headerHeight);
      grad.addColorStop(0, "#131E35");
      grad.addColorStop(1, "#0B1220");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, headerHeight);

      // Gold header bar
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(40 * scale, 30 * scale, 6 * scale, 48 * scale);

      // Title & Subtitles
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${24 * scale}px sans-serif`;
      ctx.fillText("NOOR CONNECT", 56 * scale, 52 * scale);

      ctx.fillStyle = "#F59E0B";
      ctx.font = `bold ${14 * scale}px sans-serif`;
      ctx.fillText("MONTHLY PRAYER TIMETABLE", 56 * scale, 72 * scale);

      // Location, Gregorian & Hijri metadata
      ctx.fillStyle = "#E2E8F0";
      ctx.font = `bold ${16 * scale}px sans-serif`;
      ctx.fillText(`📍 ${location.locationName || "Current Location"}`, 40 * scale, 120 * scale);

      ctx.fillStyle = "#94A3B8";
      ctx.font = `${13 * scale}px sans-serif`;
      ctx.fillText(`📅 ${monthName} ${currentYear}  •  🌙 ${hijriMonthSpan}`, 40 * scale, 146 * scale);

      ctx.font = `${12 * scale}px sans-serif`;
      ctx.fillText(`⚖️ Method: ${selectedMethod.name}  •  Fiqh: ${madhab === "hanafi" ? "Hanafi" : "Shafi/Standard"}`, 40 * scale, 170 * scale);

      // Table Header Row
      const tableY = headerHeight;
      ctx.fillStyle = "#1E293B";
      ctx.fillRect(40 * scale, tableY, width - 80 * scale, tableHeaderHeight);

      const cols = [
        { label: "DAY", x: 60 * scale },
        { label: "DATE", x: 130 * scale },
        { label: "HIJRI", x: 230 * scale },
        { label: "FAJR", x: 340 * scale },
        { label: "SUNRISE", x: 440 * scale },
        { label: "DHUHR", x: 550 * scale },
        { label: "ASR", x: 660 * scale },
        { label: "MAGHRIB", x: 770 * scale },
        { label: "ISHA", x: 880 * scale }
      ];

      ctx.fillStyle = "#F59E0B";
      ctx.font = `bold ${11 * scale}px sans-serif`;
      for (const col of cols) {
        ctx.fillText(col.label, col.x, tableY + 27 * scale);
      }

      // Draw Rows
      let curY = tableY + tableHeaderHeight;
      ctx.font = `${11.5 * scale}px sans-serif`;

      calendar.days.forEach((day, idx) => {
        const isFri = isFriday(day);
        const isTod = isToday(day);
        const adj = applyOffsetsToTimings(day.timings, offsets);

        // Row background
        if (isTod) {
          ctx.fillStyle = "rgba(245, 158, 11, 0.22)";
          ctx.fillRect(40 * scale, curY, width - 80 * scale, rowHeight);
        } else if (isFri) {
          ctx.fillStyle = "rgba(16, 185, 129, 0.14)";
          ctx.fillRect(40 * scale, curY, width - 80 * scale, rowHeight);
        } else if (idx % 2 === 1) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
          ctx.fillRect(40 * scale, curY, width - 80 * scale, rowHeight);
        }

        // Row border
        ctx.strokeStyle = "rgba(148, 163, 184, 0.15)";
        ctx.lineWidth = 1 * scale;
        ctx.strokeRect(40 * scale, curY, width - 80 * scale, rowHeight);

        // Text values
        ctx.fillStyle = isTod ? "#FCD34D" : isFri ? "#6EE7B7" : "#FFFFFF";
        const dNum = day.date.gregorian.day;
        const wk = day.date.gregorian.weekday.en.substring(0, 3);
        const cleanHijriMonth = sanitizeHijri(day.date.hijri.month.en);
        const hijriStr = `${day.date.hijri.day} ${cleanHijriMonth.substring(0, 7)}`;

        ctx.fillText(`${wk} ${dNum}`, cols[0].x, curY + 20 * scale);
        ctx.fillText(`${day.date.gregorian.day} ${monthName.substring(0, 3)}`, cols[1].x, curY + 20 * scale);
        ctx.fillText(hijriStr, cols[2].x, curY + 20 * scale);

        // Offset-adjusted prayer times in preferred format
        ctx.fillText(formatTimetableTime(adj.Fajr, is24h), cols[3].x, curY + 20 * scale);
        ctx.fillText(formatTimetableTime(adj.Sunrise, is24h), cols[4].x, curY + 20 * scale);
        ctx.fillText(formatTimetableTime(adj.Dhuhr, is24h), cols[5].x, curY + 20 * scale);
        ctx.fillText(formatTimetableTime(adj.Asr, is24h), cols[6].x, curY + 20 * scale);
        ctx.fillText(formatTimetableTime(adj.Maghrib, is24h), cols[7].x, curY + 20 * scale);
        ctx.fillText(formatTimetableTime(adj.Isha, is24h), cols[8].x, curY + 20 * scale);

        curY += rowHeight;
      });

      // Footer
      ctx.fillStyle = "#64748B";
      ctx.font = `${11 * scale}px sans-serif`;
      ctx.fillText(
        `Generated by Noor Connect • Open Source Islamic Companion • ${GITHUB_APP_URL}`,
        40 * scale,
        curY + 36 * scale
      );

      const fileName = `noor-connect-timetable-${currentYear}-${String(currentMonth).padStart(2, "0")}.png`;

      // Native AndroidBridge share method check
      if (typeof window !== "undefined" && (window as any).AndroidBridge?.shareTimetablePng) {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          (window as any).AndroidBridge.shareTimetablePng(dataUrl, fileName);
          setIsSharingImage(false);
          return;
        } catch {
          // Fall through to browser share or download
        }
      }

      // Fallback: convert to blob and share/download
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharingImage(false);
          return;
        }

        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Noor Connect Timetable — ${monthName} ${currentYear}`,
              text: `Monthly prayer timetable for ${location.locationName} (${monthName} ${currentYear})`,
              files: [file]
            });
            toast({ title: "Timetable Shared", description: "Timetable PNG sent successfully." });
          } catch {
            // User cancelled share
          }
        } else {
          // Direct download fallback
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Timetable Downloaded", description: "Saved high-DPI timetable PNG." });
        }
        setIsSharingImage(false);
      }, "image/png");
    } catch {
      toast({ title: "Export Failed", description: "Could not generate image.", variant: "destructive" });
      setIsSharingImage(false);
    }
  };

  // 1-Tap Share PDF / Print (A4) with native AndroidBridge integration
  const handlePrintPDF = () => {
    const jobName = `Noor-Connect-Timetable-${monthName}-${currentYear}`;
    if (typeof window !== "undefined" && (window as any).AndroidBridge?.printTimetablePdf) {
      try {
        (window as any).AndroidBridge.printTimetablePdf(jobName);
        return;
      } catch {
        // Fall back to window.print
      }
    }
    window.print();
  };

  const printSheetPortal = typeof document !== "undefined" ? createPortal(
    <div id="noor-a4-print-sheet" aria-hidden="true">
      {/* Header Banner */}
      <div
        style={{
          marginBottom: "6px",
          padding: "8px 12px",
          border: "1.5px solid #0f172a",
          borderRadius: "8px",
          background: "#f8fafc",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left Side: Title & Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          <h1
            style={{
              fontSize: "13pt",
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              padding: 0,
              lineHeight: 1.2,
              letterSpacing: "0.02em",
            }}
          >
            NOOR CONNECT — MONTHLY PRAYER TIMETABLE
          </h1>
          <div
            style={{
              fontSize: "9pt",
              fontWeight: 600,
              color: "#0f172a",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "1px",
            }}
          >
            <span>📍 {location.locationName || "Current Location"}</span>
            <span>•</span>
            <span>📅 {monthName} {currentYear} • 🌙 {hijriMonthSpan}</span>
          </div>
          <div
            style={{
              fontSize: "8.5pt",
              color: "#334155",
              marginTop: "1px",
            }}
          >
            Method: {selectedMethod.name} • Fiqh: {madhab === "hanafi" ? "Hanafi" : "Shafi/Standard"} • Includes active Masjid minute offsets
          </div>
        </div>

        {/* Right Side: QR Code + Caption */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            marginLeft: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: printQrSvg }}
          />
          <span
            style={{
              fontSize: "7pt",
              color: "#334155",
              marginTop: "2px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Scan for App
          </span>
        </div>
      </div>

      {/* Full-Month Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "8.2pt",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.15,
        }}
      >
        <thead>
          <tr style={{ background: "#0f172a", color: "#ffffff" }}>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "left", width: "9%" }}>Day</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "left", width: "11%" }}>Date</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "left", width: "14%" }}>Hijri</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Fajr</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Sunrise</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Dhuhr</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Asr</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Maghrib</th>
            <th style={{ background: "#0f172a", color: "#ffffff", fontWeight: 700, padding: "4px 5px", border: "1px solid #0f172a", textAlign: "center", width: "11%" }}>Isha</th>
          </tr>
        </thead>
        <tbody>
          {calendar?.days.map((day, idx) => {
            const fri = isFriday(day);
            const adj = applyOffsetsToTimings(day.timings, offsets);
            const conciseHijriTitles: Record<number, string> = {
              1: "Muharram",
              2: "Safar",
              3: "Rabi I",
              4: "Rabi II",
              5: "Jumada I",
              6: "Jumada II",
              7: "Rajab",
              8: "Sha'ban",
              9: "Ramadan",
              10: "Shawwal",
              11: "Dhul-Qa'dah",
              12: "Dhul-Hijjah",
            };
            const monthNum = day.date.hijri.month.number;
            const rawHijri = day.date.hijri.month.en || "";
            let shortHijriMonth = conciseHijriTitles[monthNum];
            if (!shortHijriMonth) {
              const l = rawHijri.toLowerCase();
              if (l.includes("muharram")) shortHijriMonth = "Muharram";
              else if (l.includes("safar")) shortHijriMonth = "Safar";
              else if (l.includes("rabi") && (l.includes("awwal") || l.includes("1") || l.includes("i"))) shortHijriMonth = "Rabi I";
              else if (l.includes("rabi")) shortHijriMonth = "Rabi II";
              else if (l.includes("jumad") && (l.includes("ula") || l.includes("1") || l.includes("i"))) shortHijriMonth = "Jumada I";
              else if (l.includes("jumad")) shortHijriMonth = "Jumada II";
              else if (l.includes("rajab")) shortHijriMonth = "Rajab";
              else if (l.includes("sha")) shortHijriMonth = "Sha'ban";
              else if (l.includes("ramadan")) shortHijriMonth = "Ramadan";
              else if (l.includes("shawwal")) shortHijriMonth = "Shawwal";
              else if (l.includes("qa")) shortHijriMonth = "Dhul-Qa'dah";
              else if (l.includes("hij")) shortHijriMonth = "Dhul-Hijjah";
              else shortHijriMonth = "Jumada I";
            }

            const rowBg = fri ? "#ecfdf5" : (idx % 2 === 1 ? "#f8fafc" : "#ffffff");
            const rowColor = fri ? "#065f46" : "#0f172a";
            const rowFontWeight = fri ? 700 : 500;

            return (
              <tr
                key={idx}
                style={{
                  background: rowBg,
                  color: rowColor,
                  fontWeight: rowFontWeight,
                  pageBreakInside: "avoid",
                }}
              >
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "left" }}>
                  {day.date.gregorian.weekday.en.substring(0, 3)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "left" }}>
                  {day.date.gregorian.day} {monthName.substring(0, 3)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "left" }}>
                  {day.date.hijri.day} {shortHijriMonth}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Fajr, is24h)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Sunrise, is24h)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Dhuhr, is24h)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Asr, is24h)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Maghrib, is24h)}
                </td>
                <td style={{ padding: "3px 5px", lineHeight: 1.15, borderBottom: "1px solid #cbd5e1", color: "inherit", textAlign: "center" }}>
                  {formatTimetableTime(adj.Isha, is24h)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Compact Footer */}
      <div
        style={{
          marginTop: "5px",
          fontSize: "7.5pt",
          color: "#475569",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Times formatted in 12h/24h per user preference • Includes active Masjid minute offsets</span>
        <span>Generated by Noor Connect (Free & Open Source)</span>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <PageTransition>
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24">
        {/* Screen-Only App Bar with Back Button and Refresh Action */}
        <div>
          <AppBar
            title="Monthly Timetable"
            showBack={true}
            actions={
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="h-8 w-8 rounded-full border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] hover:bg-[var(--accent-soft)] transition-colors"
                title="Refresh live data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              </Button>
            }
          />
        </div>

        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 pt-3 space-y-3">
          {/* Header Card with Location, Month Switcher & Action Grid */}
          <Card
            className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
            style={{ boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)" }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              {/* Left Info */}
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)] shrink-0" />
                  <h1 className="text-base sm:text-xl font-bold tracking-tight text-[var(--text-primary)] truncate">
                    Monthly Timetable
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] shrink-0"
                  >
                    {calendar?.isOnlineSource ? "AlAdhan Live" : "Local Math"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span className="flex items-center gap-1 font-medium truncate max-w-[200px]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                    {location.locationName || "Current Location"}
                  </span>
                  <span>•</span>
                  <span>{selectedMethod.name}</span>
                  <span>•</span>
                  <span>Fiqh: {madhab === "hanafi" ? "Hanafi" : "Shafi/Standard"}</span>
                </div>
              </div>
            </div>

            {/* Month Switcher Row */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 rounded-xl border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] shrink-0 print:hidden"
                  aria-label="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="px-3 py-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center flex-1 sm:flex-initial print:border-none print:bg-transparent print:p-0">
                  <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] print:text-black">
                    {monthName} {currentYear}
                  </h2>
                  <p className="text-[10px] font-medium text-[var(--accent-text)] truncate print:text-gray-600">
                    {hijriMonthSpan}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 rounded-xl border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] shrink-0 print:hidden"
                  aria-label="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 2-Column Action Buttons Grid (360px overflow proof) */}
            <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-2 gap-2 w-full print:hidden">
              <Button
                variant="outline"
                onClick={handleShareImage}
                disabled={isSharingImage}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--accent-text)] w-full truncate"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{isSharingImage ? "Generating..." : "Share Image"}</span>
              </Button>

              <Button
                onClick={handlePrintPDF}
                className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] border-none shadow-md shadow-[var(--accent-glow)] w-full px-2"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[0.76rem] font-bold whitespace-nowrap">Save / Print PDF</span>
              </Button>
            </div>
          </Card>

          {/* Timetable Table Card - 360px Fit with Zero Horizontal Scroll */}
          <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl print:border-black print:bg-white print:shadow-none">
            <div className="w-full">
              <table className="w-full text-center border-collapse table-fixed">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] uppercase tracking-wider font-bold text-[10px] sm:text-[11px] print:bg-gray-100 print:text-black print:border-black">
                    <th className="py-2.5 px-1 w-[20%] text-left pl-2">Date/Hijri</th>
                    <th className="py-2.5 px-0.5 w-[13.3%]">Fajr</th>
                    <th className="py-2.5 px-0.5 w-[13.3%] text-[var(--text-secondary)] print:text-gray-700">Rise</th>
                    <th className="py-2.5 px-0.5 w-[13.3%]">Dhuhr</th>
                    <th className="py-2.5 px-0.5 w-[13.3%]">Asr</th>
                    <th className="py-2.5 px-0.5 w-[13.3%]">Magh</th>
                    <th className="py-2.5 px-0.5 w-[13.3%]">Isha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 text-[10.5px] sm:text-xs print:divide-gray-300">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-sm text-[var(--text-secondary)]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                          <span>Loading monthly prayer timetable...</span>
                        </div>
                      </td>
                    </tr>
                  ) : calendar?.days.map((day, idx) => {
                    const today = isToday(day);
                    const friday = isFriday(day);
                    const adj = applyOffsetsToTimings(day.timings, offsets);
                    const cleanHijriMonth = sanitizeHijri(day.date.hijri.month.en);
                    const shortHijriMonth = getConciseHijriMonth(day.date.hijri.month.number, day.date.hijri.month.en);

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors font-medium ${
                          today
                            ? "bg-[var(--accent-soft)] font-bold border-l-2 border-l-[var(--accent)] print:bg-yellow-50"
                            : friday
                            ? "bg-emerald-500/10 text-emerald-300 print:bg-green-50 print:text-black"
                            : idx % 2 === 1
                            ? "bg-[var(--surface-2)]/40 print:bg-gray-50"
                            : "hover:bg-[var(--surface-2)]/70"
                        }`}
                      >
                        {/* Compact Combined Date / Hijri Column */}
                        <td className="py-2 px-1 text-left pl-2 whitespace-nowrap">
                          <div className="flex flex-col leading-tight">
                            <span className="font-bold text-[11px] text-[var(--text-primary)] print:text-black">
                              <span className={friday ? "text-emerald-400 font-extrabold print:text-black" : ""}>
                                {day.date.gregorian.weekday.en.substring(0, 3)}
                              </span>{" "}
                              {day.date.gregorian.day}
                              {today && (
                                <span className="ml-1 text-[8px] font-black uppercase text-[var(--accent-text)] print:text-black">
                                  •
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)] print:text-gray-600">
                              {day.date.hijri.day} {shortHijriMonth}
                            </span>
                          </div>
                        </td>

                        {/* 6 Prayer Columns (Formatted in 12h/24h) */}
                        <td className="py-2 px-0.5 tabular-nums font-semibold text-[var(--text-primary)] print:text-black">
                          {formatTimetableTime(adj.Fajr, is24h)}
                        </td>
                        <td className="py-2 px-0.5 tabular-nums text-[var(--text-secondary)] print:text-gray-600">
                          {formatTimetableTime(adj.Sunrise, is24h)}
                        </td>
                        <td className="py-2 px-0.5 tabular-nums font-semibold text-[var(--text-primary)] print:text-black">
                          {formatTimetableTime(adj.Dhuhr, is24h)}
                        </td>
                        <td className="py-2 px-0.5 tabular-nums font-semibold text-[var(--text-primary)] print:text-black">
                          {formatTimetableTime(adj.Asr, is24h)}
                        </td>
                        <td className="py-2 px-0.5 tabular-nums font-semibold text-[var(--text-primary)] print:text-black">
                          {formatTimetableTime(adj.Maghrib, is24h)}
                        </td>
                        <td className="py-2 px-0.5 tabular-nums font-semibold text-[var(--text-primary)] print:text-black">
                          {formatTimetableTime(adj.Isha, is24h)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Sleek Mosque Share Footer Card */}
          <Card className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg flex items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-16 h-16 shrink-0 p-1 bg-white rounded-xl flex items-center justify-center shadow-inner overflow-hidden"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[var(--accent-text)] tracking-wider uppercase">
                  Noor Connect • Mosque Share
                </p>
                <p className="text-xs text-[var(--text-primary)] font-semibold truncate">
                  {location.locationName || "Prayer Timetable"}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Scan to get Noor Connect
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareImage}
              disabled={isSharingImage}
              className="shrink-0 text-xs font-bold h-8 px-3 rounded-xl border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] hover:bg-[var(--accent-soft)]"
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share
            </Button>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-[10px] text-[var(--text-secondary)]/80 py-1.5">
            Timetable includes active minute offsets • Based on {selectedMethod.name} ({madhab === "hanafi" ? "Hanafi" : "Shafi/Standard"})
          </div>
        </div>
      </div>
    </PageTransition>
    {printSheetPortal}
  </>
);
}
