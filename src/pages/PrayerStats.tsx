/**
 * All-In-One Worship, Sunnah & Fasting Journal with 3-Month Heatmap
 * Bidirectional sync with Home Dashboard (DAILY SALAH, WEEKLY PROGRESS & QAZA PRAYERS)
 * Single Source of Truth: 'salah-tracker', 'qaza-prayers', and 'salah-streak'
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Flame,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  WifiOff,
  Sun,
  ShieldCheck,
} from "lucide-react";
import {
  formatDateKey,
  getDayWorshipLog,
  updatePrayerStatus,
  cycleSunnahRawatib,
  updateNightWorship,
  toggleFastingStatus,
  getRecommendedFast,
  getWorshipKPIs,
  get3MonthHeatmapData,
  getPrayerTimesForDate,
  type DayWorshipLog,
  type PrayerName,
  type PrayerStatus,
  type FastCategory,
  type WorshipKPIs,
  type HeatmapDayCell,
} from "@/lib/worship-log";
import { formatTimetableTime } from "@/lib/prayer-utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { getWorshipJournalStrings } from "@/lib/worship-journal-i18n";

const PRAYERS: { key: PrayerName; label: string; sunnahMax: number; sunnahCycleLabel: string }[] = [
  { key: "fajr", label: "Fajr", sunnahMax: 2, sunnahCycleLabel: "2 Sunnah Before" },
  { key: "dhuhr", label: "Dhuhr", sunnahMax: 6, sunnahCycleLabel: "4 Before • 2 After" },
  { key: "asr", label: "Asr", sunnahMax: 0, sunnahCycleLabel: "Nafl Optional" },
  { key: "maghrib", label: "Maghrib", sunnahMax: 2, sunnahCycleLabel: "2 Sunnah After" },
  { key: "isha", label: "Isha", sunnahMax: 2, sunnahCycleLabel: "2 Sunnah After" },
];

export default function PrayerStats() {
  const { timeFormat } = useSettings();
  const { language, ui, isRTL } = useLanguage();
  const wj = useMemo(() => getWorshipJournalStrings(language), [language]);
  const is24h = timeFormat === "24h";

  // Selected date for Daily Worship Editor
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const isSelectedDateToday = useMemo(() => {
    return selectedDateKey === formatDateKey(new Date());
  }, [selectedDateKey]);

  // Reactive state
  const [dayLog, setDayLog] = useState<DayWorshipLog>(() => getDayWorshipLog(selectedDateKey));
  const [kpis, setKpis] = useState<WorshipKPIs>(() => getWorshipKPIs());
  const [heatmapCells, setHeatmapCells] = useState<HeatmapDayCell[]>(() => get3MonthHeatmapData());

  // Prayer times state for selected date
  const [daySchedule, setDaySchedule] = useState<any>(null);
  const [isOfflineTimes, setIsOfflineTimes] = useState(false);
  const [selectedFastCategory, setSelectedFastCategory] = useState<FastCategory>("sunnah");

  // Read location coordinates
  const { lat, lon } = useMemo(() => {
    let latitude = 21.3891;
    let longitude = 39.8579;
    try {
      const locStr = localStorage.getItem("location-storage");
      if (locStr) {
        const parsed = JSON.parse(locStr);
        if (typeof parsed.latitude === "number" && typeof parsed.longitude === "number") {
          latitude = parsed.latitude;
          longitude = parsed.longitude;
        }
      }
    } catch {
      // Default coordinates fallback
    }
    return { lat: latitude, lon: longitude };
  }, []);

  // Refresh reactive data
  const refreshAll = useCallback(() => {
    setDayLog(getDayWorshipLog(selectedDateKey));
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  }, [selectedDateKey]);

  // Sync with storage events from Home Dashboard
  useEffect(() => {
    refreshAll();
    const handleSync = () => refreshAll();
    window.addEventListener("salah-updated", handleSync);
    window.addEventListener("qaza-updated", handleSync);
    return () => {
      window.removeEventListener("salah-updated", handleSync);
      window.removeEventListener("qaza-updated", handleSync);
    };
  }, [refreshAll]);

  // Load prayer times for selected date (online-first with offline fallback)
  useEffect(() => {
    let isMounted = true;
    getPrayerTimesForDate(selectedDate, lat, lon)
      .then(({ schedule, isOfflineTimes: offline }) => {
        if (!isMounted) return;
        setDaySchedule(schedule);
        setIsOfflineTimes(offline);
      })
      .catch(() => {
        // Safe catch for network or compute failure
        if (!isMounted) return;
        setIsOfflineTimes(true);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, lat, lon]);

  // Auto-detected recommended fast
  const recommendedFast = useMemo(() => {
    const hDay = daySchedule?.date?.hijri?.day ? parseInt(daySchedule.date.hijri.day, 10) : undefined;
    const hMonth = daySchedule?.date?.hijri?.month?.number ? parseInt(daySchedule.date.hijri.month.number, 10) : undefined;
    return getRecommendedFast(selectedDate, hDay, hMonth);
  }, [selectedDate, daySchedule]);

  // Set default fast category when switching days
  useEffect(() => {
    if (dayLog.fastType) {
      setSelectedFastCategory(dayLog.fastType);
    } else {
      setSelectedFastCategory(recommendedFast.defaultCategory);
    }
  }, [dayLog.fastType, recommendedFast.defaultCategory]);

  // Date navigation handlers
  const handlePrevDay = () => {
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleBackToToday = () => {
    setSelectedDate(new Date());
  };

  // Status button tap handler
  const handleStatusChange = (prayer: PrayerName, status: PrayerStatus) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const updated = updatePrayerStatus(selectedDateKey, prayer, status);
    setDayLog(updated);
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  };

  // Sunnah Rawatib tap handler
  const handleCycleSunnah = (prayer: PrayerName) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const updated = cycleSunnahRawatib(selectedDateKey, prayer);
    setDayLog(updated);
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  };

  // Night worship handlers
  const handleToggleWitr = () => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const updated = updateNightWorship(selectedDateKey, { witr: !dayLog.witr });
    setDayLog(updated);
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  };

  const handleStepQiyam = (delta: number) => {
    if ("vibrate" in navigator) navigator.vibrate(15);
    const updated = updateNightWorship(selectedDateKey, { qiyamDelta: delta });
    setDayLog(updated);
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  };

  // Fasting tap handler
  const handleToggleFasting = () => {
    if ("vibrate" in navigator) navigator.vibrate(25);
    const updated = toggleFastingStatus(selectedDateKey, selectedFastCategory);
    setDayLog(updated);
    setKpis(getWorshipKPIs());
    setHeatmapCells(get3MonthHeatmapData());
  };

  // Compute month abbreviations aligned above 13 week columns
  const monthLabels = useMemo(() => {
    const labels: { colIndex: number; label: string }[] = [];
    let lastMonth = -1;
    for (let c = 0; c < 13; c++) {
      const cell = heatmapCells[c * 7];
      if (cell) {
        const m = cell.dateObj.getMonth();
        if (m !== lastMonth) {
          lastMonth = m;
          const monthShort = cell.dateObj.toLocaleDateString(language || "en", { month: "short" });
          labels.push({ colIndex: c, label: monthShort });
        }
      }
    }
    return labels;
  }, [heatmapCells, language]);

  // Format Gregorian & Hijri dates for switcher header
  const formattedGregorian = useMemo(() => {
    return selectedDate.toLocaleDateString(language || "en", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }, [selectedDate, language]);

  const formattedHijri = useMemo(() => {
    if (daySchedule?.date?.hijri) {
      const h = daySchedule.date.hijri;
      return `${h.day} ${h.month.en}`;
    }
    return "";
  }, [daySchedule]);

  // Times mapping for the 5 prayers + Suhoor/Iftaar
  const prayerTimesMap = useMemo(() => {
    const timings = daySchedule?.timings;
    if (!timings) return null;
    return {
      fajr: formatTimetableTime(timings.Fajr, is24h),
      dhuhr: formatTimetableTime(timings.Dhuhr, is24h),
      asr: formatTimetableTime(timings.Asr, is24h),
      maghrib: formatTimetableTime(timings.Maghrib, is24h),
      isha: formatTimetableTime(timings.Isha, is24h),
      suhoor: formatTimetableTime(timings.Imsak || timings.Fajr, is24h),
      iftaar: formatTimetableTime(timings.Maghrib, is24h),
    };
  }, [daySchedule, is24h]);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-32">
        <AppBar title={wj.pageTitle} showBack={true} />

        <div className="max-w-2xl mx-auto px-3.5 sm:px-4 pt-3 space-y-4">
          {/* TOP 4 WORSHIP KPI PODS (Clean 2x2 Grid, Zero Truncation, Isolated BiDi) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* KPI 1: On-Time Streak */}
            <Card
              className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center justify-center text-center shadow-sm"
              style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Flame className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {wj.streak}
                </span>
              </div>
              <div className="text-lg font-black text-[var(--accent-text)] tracking-tight leading-none">
                <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="inline-block tabular-nums font-mono">
                  {kpis.onTimeStreak}
                </span>{" "}
                <bdi>{kpis.onTimeStreak === 1 ? wj.day : wj.days}</bdi>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">
                {wj.ontimeSalah}
              </span>
            </Card>

            {/* KPI 2: Sunnah Kept % */}
            <Card
              className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center justify-center text-center shadow-sm"
              style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="w-4 h-4 text-[var(--accent-2)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {wj.sunnah}
                </span>
              </div>
              <div className="text-lg font-black text-[var(--text-primary)] tracking-tight leading-none">
                <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="inline-block tabular-nums font-mono">
                  {kpis.sunnahKeptPercent}%
                </span>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium bidi-plaintext" style={{ unicodeBidi: 'plaintext' }}>
                {wj.rawatibThisMo}
              </span>
            </Card>

            {/* KPI 3: Fasted Days */}
            <Card
              className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center justify-center text-center shadow-sm"
              style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Moon className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {wj.fasted}
                </span>
              </div>
              <div className="text-lg font-black text-[var(--accent-text)] tracking-tight leading-none">
                <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="inline-block tabular-nums font-mono">
                  {kpis.fastedDaysThisMonth}
                </span>{" "}
                <bdi>{kpis.fastedDaysThisMonth === 1 ? wj.day : wj.days}</bdi>
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">
                {wj.thisMonth}
              </span>
            </Card>

            {/* KPI 4: Qaza Owed */}
            <Card
              className="p-3 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex flex-col items-center justify-center text-center shadow-sm"
              style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {wj.qazaOwed}
                </span>
              </div>
              <div
                className={`text-lg font-black tracking-tight leading-none ${
                  kpis.qazaOwedTotal === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {kpis.qazaOwedTotal === 0 ? (
                  wj.clearZero
                ) : (
                  <>
                    <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="inline-block tabular-nums font-mono">
                      {kpis.qazaOwedTotal}
                    </span>{" "}
                    <bdi>{wj.left}</bdi>
                  </>
                )}
              </div>
              <span className="text-[10px] text-[var(--text-secondary)] mt-1 font-medium">
                {wj.pendingMakeup}
              </span>
            </Card>
          </div>

          {/* INTERACTIVE 3-MONTH GITHUB-STYLE HEATMAP — Flexbox Header Fix with Zero Text Overlap */}
          <Card
            className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md"
            style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 var(--card-sheen)" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "12px",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] shrink-0" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  {wj.heatmapTitle}
                </h3>
              </div>
              <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                {wj.tapCellToEdit}
              </span>
            </div>

            {/* Heatmap Grid Container (Horizontal scroll safe for 360px) */}
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
              <div className="min-w-[240px]">
                {/* Month labels aligned above corresponding week columns */}
                <div className="flex pl-5 mb-1 select-none">
                  <div
                    className="flex-1 grid gap-1.5"
                    style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
                  >
                    {Array.from({ length: 13 }).map((_, c) => {
                      const found = monthLabels.find((ml) => ml.colIndex === c);
                      return (
                        <div
                          key={c}
                          className="text-[10px] font-bold text-[var(--accent-text)] text-left select-none"
                          style={{ overflow: 'visible', whiteSpace: 'nowrap' }}
                        >
                          {found ? found.label : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-1.5 justify-between">
                  {/* Day-of-week labels on left: M, W, F, S */}
                  <div className="flex flex-col justify-between text-[9px] font-bold text-[var(--text-secondary)] pr-1 select-none py-0.5">
                    {wj.weekdays.map((d, idx) => (
                      <span key={idx}>{d}</span>
                    ))}
                  </div>

                  {/* 13 Week Columns */}
                  <div className="flex-1 grid grid-flow-col grid-rows-7 gap-1.5 auto-cols-fr">
                    {heatmapCells.map((cell) => {
                      const isSelected = cell.date === selectedDateKey;
                      const c = cell.completedCount;

                      // High contrast empty vs logged cells
                      let cellBg = "rgba(255, 255, 255, 0.06)";
                      let cellColorMix = "rgba(255, 255, 255, 0.06)";
                      let shadowGlow = "none";

                      if (c >= 5) {
                        cellBg = "var(--accent)";
                        cellColorMix = "var(--accent)";
                        shadowGlow = "0 0 6px var(--accent-glow)";
                      } else if (c >= 3) {
                        cellBg = "rgba(212, 175, 55, 0.65)";
                        cellColorMix = "color-mix(in srgb, var(--accent) 65%, transparent)";
                      } else if (c >= 1) {
                        cellBg = "rgba(212, 175, 55, 0.32)";
                        cellColorMix = "color-mix(in srgb, var(--accent) 32%, transparent)";
                      }

                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => setSelectedDate(cell.dateObj)}
                          title={`${cell.date}: ${cell.completedCount}/5${cell.fasted ? " • " + wj.fastedDay : ""}`}
                          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[4px] relative flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-2 border-[var(--accent)]"
                              : "border border-[var(--border)]"
                          }`}
                          style={{
                            backgroundColor: cellBg,
                            background: cellColorMix,
                            boxShadow: isSelected ? "0 0 0 2px var(--accent)" : shadowGlow,
                          }}
                        >
                          {/* Fasted Day indicator: crisp bright accent ring/dot */}
                          {cell.fasted && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)] block pointer-events-none"
                              style={{ boxShadow: "0 0 4px var(--accent)" }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] mt-3 pt-2.5 border-t border-[var(--border)]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-text)]" /> {wj.fastedDay}
              </span>
              <div className="flex items-center gap-1.5">
                <span>{wj.less}</span>
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--surface-2)]" />
                <span
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{
                    backgroundColor: "rgba(212, 175, 55, 0.28)",
                    background: "color-mix(in srgb, var(--accent) 28%, var(--surface-2))",
                  }}
                />
                <span
                  className="w-2.5 h-2.5 rounded-[2px]"
                  style={{
                    backgroundColor: "rgba(212, 175, 55, 0.6)",
                    background: "color-mix(in srgb, var(--accent) 60%, var(--surface-2))",
                  }}
                />
                <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--accent)]" />
                <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="tabular-nums font-mono">
                  5/5
                </span>
              </div>
            </div>
          </Card>

          {/* DATE SWITCHER HEADER (< Selected Date • Hijri Date > + Back to Today Chip) */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevDay}
              className="h-8 w-8 p-0 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Previous day"
            >
              <ChevronLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>

            <div className="flex items-center gap-2 min-w-0 flex-1 justify-center text-center">
              <div className="min-w-0">
                <h2 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] truncate">
                  {isSelectedDateToday ? wj.today : formattedGregorian}
                  {formattedHijri ? ` • ${formattedHijri}` : ""}
                </h2>
                {isOfflineTimes && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                    <WifiOff className="w-2.5 h-2.5" />
                    <span>{wj.offlineTimes}</span>
                  </span>
                )}
              </div>

              {!isSelectedDateToday && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToToday}
                  className="h-6 px-2 text-[10px] font-bold rounded-lg bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] shrink-0"
                >
                  {wj.backToToday}
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextDay}
              className="h-8 w-8 p-0 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Next day"
            >
              <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* 5 FARD PRAYER CARDS */}
          <div className="space-y-2.5">
            {PRAYERS.map((prayer) => {
              const currentStatus = dayLog.statuses[prayer.key] || "none";
              const prayerTime = prayerTimesMap ? (prayerTimesMap as any)[prayer.key] : "...";
              const sunnahCount = dayLog.sunnah[prayer.key] || 0;
              const prayerDisplayName = (ui as any)[prayer.key] || prayer.label;

              return (
                <Card
                  key={prayer.key}
                  className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] space-y-2.5 shadow-sm"
                  style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
                >
                  {/* Top Line: Name + Live Time + Sunnah Rawatib Chip */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                      <span className="font-bold text-sm text-[var(--text-primary)]">{prayerDisplayName}</span>
                      <span dir="ltr" className="text-xs text-[var(--accent-text)] font-mono font-semibold tabular-nums">
                        {prayerTime}
                      </span>
                    </div>

                    {/* Interactive Sunnah Rawatib Chip */}
                    {prayer.sunnahMax > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCycleSunnah(prayer.key)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border"
                        style={{
                          background: sunnahCount > 0 ? "var(--accent-soft)" : "var(--surface-2)",
                          color: sunnahCount > 0 ? "var(--accent-text)" : "var(--text-secondary)",
                          borderColor: sunnahCount > 0 ? "var(--accent)" : "var(--border)",
                        }}
                        title={`Tap to cycle Sunnah: ${sunnahCount}/${prayer.sunnahMax}`}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>
                          <bdi>{wj.sunnahLabel}</bdi>{" "}
                          <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="tabular-nums font-mono">
                            {sunnahCount}/{prayer.sunnahMax}
                          </span>
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 4-Pill Status Selector (Fitting 360px with repeat(4, 1fr)) */}
                  <div className="grid grid-cols-4 gap-1.5" style={{ minWidth: 0 }}>
                    {[
                      { key: "ontime" as PrayerStatus, label: wj.statusOnTime },
                      { key: "late" as PrayerStatus, label: wj.statusLate },
                      { key: "missed" as PrayerStatus, label: wj.statusMissed },
                      { key: "makeup" as PrayerStatus, label: wj.statusMakeup },
                    ].map((pill) => {
                      const isActive = currentStatus === pill.key;
                      let activeStyle = {};
                      if (isActive) {
                        if (pill.key === "ontime") {
                          activeStyle = { background: "var(--accent)", color: "var(--on-accent)" };
                        } else if (pill.key === "late") {
                          activeStyle = { background: "#F59E0B", color: "#000000" };
                        } else if (pill.key === "missed") {
                          activeStyle = { background: "#EF4444", color: "#FFFFFF" };
                        } else if (pill.key === "makeup") {
                          activeStyle = { background: "#10B981", color: "#FFFFFF" };
                        }
                      }

                      return (
                        <button
                          key={pill.key}
                          type="button"
                          onClick={() => handleStatusChange(prayer.key, pill.key)}
                          className={`w-full py-1.5 px-0.5 rounded-[10px] text-[11px] font-bold transition-all truncate text-center select-none ${
                            isActive
                              ? "shadow-sm font-extrabold"
                              : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]"
                          }`}
                          style={activeStyle}
                        >
                          {pill.label}
                        </button>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* NIGHT WORSHIP CARD BELOW ISHA (Witr Prayed Toggle + Qiyam Stepper) */}
          <Card
            className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm space-y-3"
            style={{ boxShadow: "inset 0 1px 0 var(--card-sheen)" }}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                {wj.nightWorship}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Witr Prayed Toggle Pill */}
              <button
                type="button"
                onClick={handleToggleWitr}
                className={`w-full py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                  dayLog.witr
                    ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm"
                    : "bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)]"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{dayLog.witr ? wj.witrPrayedDone : wj.witrPrayed}</span>
              </button>

              {/* Qiyam Stepper in Steps of 2 */}
              <div className="flex items-center justify-between p-1 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStepQiyam(-2)}
                  disabled={dayLog.qiyam <= 0}
                  className="h-7 w-7 p-0 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Decrease Qiyam rak'ats"
                >
                  <Minus className="w-3.5 h-3.5" />
                </Button>

                <div className="text-center">
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    <span dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }} className="inline-block tabular-nums font-mono">
                      {dayLog.qiyam}
                    </span>{" "}
                    <bdi>{wj.rakats}</bdi>
                  </span>
                  <span className="block text-[8.5pt] text-[var(--text-secondary)] leading-none">{wj.qiyam}</span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStepQiyam(2)}
                  className="h-7 w-7 p-0 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Increase Qiyam rak'ats"
                >
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </Card>

          {/* INTEGRATED SUNNAH & RAMADAN FASTING CARD */}
          <Card
            className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md space-y-3.5"
            style={{ boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25), inset 0 1px 0 var(--card-sheen)" }}
          >
            {/* Header: Title + Auto-Detected Recommended Fast Badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  {wj.fastingJournal}
                </h3>
              </div>

              {recommendedFast.isRecommended && (
                <Badge
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    background: "var(--accent-soft)",
                    color: "var(--accent-text)",
                    borderColor: "var(--border)",
                  }}
                >
                  ✦ {recommendedFast.label}
                </Badge>
              )}
            </div>

            {/* Suhoor & Iftaar Times Bar */}
            <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                  {wj.suhoor}
                </span>
                <span dir="ltr" className="text-xs font-mono font-bold text-[var(--accent-text)] tabular-nums">
                  {prayerTimesMap?.suhoor || "..."}
                </span>
              </div>
              <div className="border-l border-[var(--border)] pl-2 rtl:border-l-0 rtl:border-r rtl:pr-2">
                <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">
                  {wj.iftaar}
                </span>
                <span dir="ltr" className="text-xs font-mono font-bold text-[var(--accent-text)] tabular-nums">
                  {prayerTimesMap?.iftaar || "..."}
                </span>
              </div>
            </div>

            {/* Fast Category Selector Pills */}
            <div className="grid grid-cols-4 gap-1.5" style={{ minWidth: 0 }}>
              {[
                { key: "sunnah" as FastCategory, label: wj.catSunnah },
                { key: "ramadan" as FastCategory, label: wj.catRamadan },
                { key: "qaza" as FastCategory, label: wj.catQaza },
                { key: "nafl" as FastCategory, label: wj.catNafl },
              ].map((cat) => {
                const isCatActive = selectedFastCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedFastCategory(cat.key)}
                    className={`w-full py-1.5 px-0.5 rounded-[10px] text-[11px] font-bold transition-all truncate text-center select-none ${
                      isCatActive
                        ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                        : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* 1-Tap Fasted Action Button */}
            <Button
              type="button"
              onClick={handleToggleFasting}
              className="w-full h-11 rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
              style={{
                background: dayLog.fasted
                  ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
                  : "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                color: dayLog.fasted ? "#FFFFFF" : "var(--on-accent)",
              }}
            >
              {dayLog.fasted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{wj.fastKept}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4" />
                  <span>{wj.markFasted}</span>
                </>
              )}
            </Button>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

