import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { prayerMethods } from "@/lib/prayer-methods";
import { getMadhab } from "@/lib/storage";
import {
  OnlinePrayerAPI,
  type LiveMonthlyCalendar,
  type LiveDaySchedule
} from "@/lib/online-prayer-api";
import { getPrayerMinuteOffsets, applyOffsetsToTimings } from "@/lib/prayer-offsets";
import { generateQRCodeSVG } from "@/lib/qr-generator";

const GITHUB_APP_URL = "https://github.com/Ahmadnedariya786/Noor-connect";

export default function MonthlyTimetable() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocationState();

  const [currentYear, setCurrentYear] = useState<number>(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [calendar, setCalendar] = useState<LiveMonthlyCalendar | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);

  const selectedMethod = useMemo(() => prayerMethods.getSelectedMethod(), []);
  const madhab = useMemo(() => getMadhab(), []);
  const offsets = useMemo(() => getPrayerMinuteOffsets(), []);

  const qrSvg = useMemo(() => {
    return generateQRCodeSVG(GITHUB_APP_URL, 68, "var(--text-primary)", "transparent");
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
    } catch (err) {
      // Fallback local calendar
      const fallback = OnlinePrayerAPI.generateLocalMonthlyCalendar(
        year,
        month,
        location.latitude,
        location.longitude,
        3,
        madhab === 'hanafi' ? 1 : 0,
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
    const m1 = firstDay.date.hijri.month.en;
    const m2 = lastDay.date.hijri.month.en;
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

  // 1-Tap Share Image (Offscreen Canvas 2x DPI)
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
      if (!ctx) return;

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
      ctx.fillText(`📍 ${location.locationName || 'Unknown Location'}`, 40 * scale, 120 * scale);

      ctx.fillStyle = "#94A3B8";
      ctx.font = `${13 * scale}px sans-serif`;
      ctx.fillText(`📅 ${monthName} ${currentYear}  •  🌙 ${hijriMonthSpan}`, 40 * scale, 146 * scale);

      ctx.font = `${12 * scale}px sans-serif`;
      ctx.fillText(`⚖️ Method: ${selectedMethod.name}  •  Fiqh: ${madhab === 'hanafi' ? 'Hanafi' : 'Shafi/Standard'}`, 40 * scale, 170 * scale);

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
        const hijriStr = `${day.date.hijri.day} ${day.date.hijri.month.en.substring(0, 7)}`;

        ctx.fillText(`${wk} ${dNum}`, cols[0].x, curY + 20 * scale);
        ctx.fillText(`${day.date.gregorian.day} ${monthName.substring(0, 3)}`, cols[1].x, curY + 20 * scale);
        ctx.fillText(hijriStr, cols[2].x, curY + 20 * scale);

        // Prayer times
        ctx.fillText(day.timings.Fajr, cols[3].x, curY + 20 * scale);
        ctx.fillText(day.timings.Sunrise, cols[4].x, curY + 20 * scale);
        ctx.fillText(day.timings.Dhuhr, cols[5].x, curY + 20 * scale);
        ctx.fillText(day.timings.Asr, cols[6].x, curY + 20 * scale);
        ctx.fillText(day.timings.Maghrib, cols[7].x, curY + 20 * scale);
        ctx.fillText(day.timings.Isha, cols[8].x, curY + 20 * scale);

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

      // Convert to blob and share/download
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsSharingImage(false);
          return;
        }

        const fileName = `noor-connect-timetable-${currentYear}-${String(currentMonth).padStart(2, '0')}.png`;
        const file = new File([blob], fileName, { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Noor Connect Timetable — ${monthName} ${currentYear}`,
              text: `Monthly prayer timetable for ${location.locationName} (${monthName} ${currentYear})`,
              files: [file]
            });
            toast({ title: "Timetable Shared", description: "Timetable PNG sent successfully." });
          } catch (shareErr) {
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
    } catch (err) {
      toast({ title: "Export Failed", description: "Could not generate image.", variant: "destructive" });
      setIsSharingImage(false);
    }
  };

  // 1-Tap Share PDF / Print (A4)
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24 print:bg-white print:text-black print:pb-0">
        {/* Screen-Only App Bar */}
        <div className="print:hidden">
          <AppBar title="Monthly Timetable" />
        </div>

        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-4 print:p-0 print:m-0 print:max-w-none">
          {/* Header Card with Location, Month Switcher & Actions */}
          <Card
            className="p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] print:border-none print:bg-transparent print:p-0 print:shadow-none"
            style={{ boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)' }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              {/* Left Info */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-6 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-2)]" />
                  <h1 className="text-lg md:text-xl font-bold tracking-tight text-[var(--text-primary)] print:text-black">
                    Monthly Prayer Timetable
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold uppercase tracking-wider bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] print:border-black print:text-black"
                  >
                    {calendar?.isOnlineSource ? "AlAdhan Live" : "Local Math"}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)] print:text-gray-700">
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 print:text-black" />
                    {location.locationName || "Current Location"}
                  </span>
                  <span>•</span>
                  <span>{selectedMethod.name}</span>
                  <span>•</span>
                  <span>Fiqh: {madhab === 'hanafi' ? 'Hanafi' : 'Shafi/Standard'}</span>
                </div>
              </div>

              {/* QR Code (Vector) linking to Noor Connect */}
              <div className="hidden sm:flex items-center gap-3 bg-[var(--surface-2)] p-2 rounded-xl border border-[var(--border)] print:flex print:border-black print:bg-white">
                <div
                  className="w-14 h-14 shrink-0 flex items-center justify-center text-[var(--text-primary)] print:text-black"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                <div className="text-[10px] space-y-0.5 pr-1">
                  <p className="font-bold text-[var(--accent-text)] print:text-black">NOOR CONNECT</p>
                  <p className="text-[var(--text-secondary)] print:text-gray-600">Scan for App</p>
                  <p className="text-[9px] text-[var(--text-secondary)]/75 print:text-gray-500 truncate max-w-[90px]">Free & Open Source</p>
                </div>
              </div>
            </div>

            {/* Month Switcher Bar */}
            <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3 print:border-gray-300">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-9 w-9 rounded-xl border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] print:hidden"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="px-3 py-1.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center print:border-none print:bg-transparent print:p-0">
                  <h2 className="text-sm md:text-base font-bold text-[var(--text-primary)] print:text-black">
                    {monthName} {currentYear}
                  </h2>
                  <p className="text-[11px] font-medium text-[var(--accent-text)] print:text-gray-600">
                    {hijriMonthSpan}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-9 w-9 rounded-xl border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] print:hidden"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Action Buttons: Refresh, Share Image, Print PDF */}
              <div className="flex items-center gap-2 print:hidden">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">Refresh live data</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareImage}
                  disabled={isSharingImage}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--accent-soft)] text-[var(--accent-text)]"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isSharingImage ? "Generating..." : "Share Image"}</span>
                </Button>

                <Button
                  size="sm"
                  onClick={handlePrintPDF}
                  className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] border-none shadow-md shadow-[var(--accent-glow)]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Share / Print PDF (A4)</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Timetable Table Card */}
          <Card className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-xl print:border-black print:bg-white print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)] uppercase tracking-wider text-[11px] font-bold print:bg-gray-100 print:text-black print:border-black">
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-2">Date</th>
                    <th className="py-3 px-2">Hijri</th>
                    <th className="py-3 px-2">Fajr</th>
                    <th className="py-3 px-2">Sunrise</th>
                    <th className="py-3 px-2">Dhuhr</th>
                    <th className="py-3 px-2">Asr</th>
                    <th className="py-3 px-2">Maghrib</th>
                    <th className="py-3 px-2">Isha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]/60 print:divide-gray-300">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-sm text-[var(--text-secondary)]">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
                          <span>Loading monthly prayer timetable...</span>
                        </div>
                      </td>
                    </tr>
                  ) : calendar?.days.map((day, idx) => {
                    const today = isToday(day);
                    const friday = isFriday(day);

                    return (
                      <tr
                        key={idx}
                        className={`transition-colors font-medium ${
                          today
                            ? "bg-[var(--accent-soft)] font-bold border-l-4 border-l-[var(--accent)] print:bg-yellow-50"
                            : friday
                            ? "bg-emerald-500/10 text-emerald-300 print:bg-green-50 print:text-black"
                            : idx % 2 === 1
                            ? "bg-[var(--surface-2)]/40 print:bg-gray-50"
                            : "hover:bg-[var(--surface-2)]/70"
                        }`}
                      >
                        {/* Day Column */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={friday ? "font-bold text-emerald-400 print:text-black" : ""}>
                              {day.date.gregorian.weekday.en.substring(0, 3)}
                            </span>
                            {today && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-[var(--accent)] text-[var(--on-accent)] print:border print:border-black">
                                TODAY
                              </span>
                            )}
                            {friday && !today && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 print:text-black">
                                JUMU'AH
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Gregorian Date */}
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums text-[var(--text-primary)] print:text-black">
                          {day.date.gregorian.day} {monthName.substring(0, 3)}
                        </td>

                        {/* Hijri Date */}
                        <td className="py-2.5 px-2 whitespace-nowrap text-[var(--text-secondary)] print:text-gray-700">
                          {day.date.hijri.day} {day.date.hijri.month.en.substring(0, 6)}
                        </td>

                        {/* Prayer Columns */}
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums font-semibold">{day.timings.Fajr}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums text-[var(--text-secondary)] print:text-gray-600">{day.timings.Sunrise}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums font-semibold">{day.timings.Dhuhr}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums font-semibold">{day.timings.Asr}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums font-semibold">{day.timings.Maghrib}</td>
                        <td className="py-2.5 px-2 whitespace-nowrap tabular-nums font-semibold">{day.timings.Isha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Footer Note */}
          <div className="text-center text-[11px] text-[var(--text-secondary)]/80 py-2 print:text-gray-600">
            Timetable includes active minute offsets • Based on {selectedMethod.name} ({madhab === 'hanafi' ? 'Hanafi' : 'Shafi/Standard'})
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
