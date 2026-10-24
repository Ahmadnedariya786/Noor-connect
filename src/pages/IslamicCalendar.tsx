// v2.0.3 - Fixed Missing useMemo import
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Moon, Star, ChevronLeft, ChevronRight, X, ArrowLeft, Sparkles, Gift, Heart, Landmark } from "lucide-react";
import { toast } from "sonner";
import { calendarApiResponseSchema, safeParseApiResponse } from "@/lib/api-schemas";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useNavigate } from "react-router-dom";
import { goBackOrFallback } from "@/lib/navigation";
import { islamicCalendarService } from "@/lib/islamic-calendar-service";

const importantDates = [
  { name: "Ramadan", Icon: Moon, description: "Month of Fasting" },
  { name: "Laylat al-Qadr", Icon: Sparkles, description: "Night of Power" },
  { name: "Eid al-Fitr", Icon: Gift, description: "Festival of Breaking the Fast" },
  { name: "Eid al-Adha", Icon: Heart, description: "Festival of Sacrifice" },
  { name: "Dhul Hijjah", Icon: Landmark, description: "Month of Hajj" },
  { name: "Muharram", Icon: Calendar, description: "Islamic New Year" },
  { name: "Ashura", Icon: Star, description: "Day of Ashura" },
];

interface CalendarDay {
  hijriDay: number;
  hijriMonth: {
    number: number;
    en: string;
    ar: string;
  };
  hijriYear: number;
  gregorianDate: string;
  gregorianDay: number;
  gregorianMonthName: string;
  gregorianYear: number;
  weekday: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  holidays: string[];
}

export const normalizeHijriMonth = (val: string): string =>
  (val || '')
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
    .replace(/al-ola/gi, 'al-ūlā')
    .replace(/al-ōlā/gi, 'al-ūlā')
    .replace(/ō/g, 'ū');

export default function IslamicCalendar() {
  const navigate = useNavigate();
  // Use the Maghrib-aware hook (same as Dashboard) for the header date
  const { islamicInfo, isLoading: dateLoading } = useIslamicCalendar();

  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [apiMonthData, setApiMonthData] = useState<Record<string, any[]>>({});
  const [selectedDayNum, setSelectedDayNum] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchMonthCalendar(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const handleOffsetChange = () => fetchMonthCalendar(currentMonth, currentYear);
    window.addEventListener('hijri-date-offset-changed', handleOffsetChange);
    return () => window.removeEventListener('hijri-date-offset-changed', handleOffsetChange);
  }, [currentMonth, currentYear]);

  const fetchMonthCalendar = async (month: number, year: number) => {
    const key = `${year}-${month}`;
    try {
      setLoading(true);
      const offset = parseInt(localStorage.getItem('hijri-date-offset') || '0', 10);
      const response = await fetch(
        `https://api.aladhan.com/v1/gToHCalendar/${month}/${year}`
      );
      const rawData = await response.json();

      const parseResult = safeParseApiResponse(calendarApiResponseSchema, rawData);

      if (parseResult.success && parseResult.data.code === 200) {
        let dataToProcess = parseResult.data.data;
        
        if (offset !== 0) {
           dataToProcess = dataToProcess.map((dayData: any, index: number) => {
              const sourceIndex = index + offset;
              if (sourceIndex >= 0 && sourceIndex < dataToProcess.length) {
                 return { ...dayData, hijri: dataToProcess[sourceIndex].hijri };
              } else {
                 const newHijri = JSON.parse(JSON.stringify(dayData.hijri));
                 let newDay = parseInt(newHijri.day) + offset;
                 if (newDay <= 0) {
                    newDay = 30 + newDay;
                    newHijri.month.number -= 1;
                    if (newHijri.month.number === 0) {
                       newHijri.month.number = 12;
                       newHijri.year = (parseInt(newHijri.year) - 1).toString();
                    }
                 } else if (newDay > 30) {
                    newDay -= 30;
                    newHijri.month.number += 1;
                    if (newHijri.month.number === 13) {
                       newHijri.month.number = 1;
                       newHijri.year = (parseInt(newHijri.year) + 1).toString();
                    }
                 }
                 newHijri.day = newDay.toString().padStart(2, '0');
                 return { ...dayData, hijri: newHijri };
              }
           });
        }
        
        setApiMonthData(prev => ({ ...prev, [key]: dataToProcess }));
      }
    } catch {
      // Fallback: synchronous tabular calendar remains active seamlessly
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const key = `${currentYear}-${currentMonth}`;
    const offset = parseInt(localStorage.getItem('hijri-date-offset') || '0', 10);
    const today = new Date();
    const days: CalendarDay[] = [];

    // If we have Aladhan API data for this month, use it
    const monthApiData = apiMonthData[key];
    if (monthApiData && monthApiData.length > 0) {
      const firstDayData = monthApiData[0];
      const firstDayDate = new Date(
        firstDayData.gregorian.year,
        firstDayData.gregorian.month.number - 1,
        firstDayData.gregorian.day
      );
      const firstWeekdayIndex = firstDayDate.getDay();

      for (let i = 0; i < firstWeekdayIndex; i++) {
        days.push({
          hijriDay: 0,
          hijriMonth: { number: 0, en: "", ar: "" },
          hijriYear: 0,
          gregorianDate: '',
          gregorianDay: 0,
          gregorianMonthName: '',
          gregorianYear: 0,
          weekday: '',
          isCurrentMonth: false,
          isToday: false,
          holidays: [],
        });
      }

      monthApiData.forEach((dayData: any) => {
        const gregorianDate = new Date(
          dayData.gregorian.year,
          dayData.gregorian.month.number - 1,
          dayData.gregorian.day
        );
        const gDay = parseInt(dayData.gregorian.day, 10);
        const gMonth = dayData.gregorian.month.en;
        const gYear = parseInt(dayData.gregorian.year, 10);
        const weekday = dayData.gregorian.weekday?.en || '';
        const monthEn = normalizeHijriMonth(dayData.hijri.month.en);

        days.push({
          hijriDay: parseInt(dayData.hijri.day, 10),
          hijriMonth: {
            number: dayData.hijri.month.number,
            en: monthEn,
            ar: dayData.hijri.month.ar
          },
          hijriYear: parseInt(dayData.hijri.year, 10),
          gregorianDate: `${gDay} ${gMonth} ${gYear}`,
          gregorianDay: gDay,
          gregorianMonthName: gMonth,
          gregorianYear: gYear,
          weekday: weekday,
          isCurrentMonth: true,
          isToday: gregorianDate.toDateString() === today.toDateString(),
          holidays: dayData.hijri.holidays || [],
        });
      });
    } else {
      // Synchronous offline computation: instant load with 0 skeleton flash!
      const numDays = new Date(currentYear, currentMonth, 0).getDate();
      const firstDayDate = new Date(currentYear, currentMonth - 1, 1);
      const firstWeekdayIndex = firstDayDate.getDay();

      for (let i = 0; i < firstWeekdayIndex; i++) {
        days.push({
          hijriDay: 0,
          hijriMonth: { number: 0, en: "", ar: "" },
          hijriYear: 0,
          gregorianDate: '',
          gregorianDay: 0,
          gregorianMonthName: '',
          gregorianYear: 0,
          weekday: '',
          isCurrentMonth: false,
          isToday: false,
          holidays: [],
        });
      }

      for (let day = 1; day <= numDays; day++) {
        const gDate = new Date(currentYear, currentMonth - 1, day);
        const effectiveDate = new Date(gDate);
        if (offset !== 0) {
          effectiveDate.setDate(effectiveDate.getDate() + offset);
        }
        const hijriInfo = islamicCalendarService.calculateIslamicDate(effectiveDate);
        const gDay = day;
        const gMonth = gDate.toLocaleDateString('en-US', { month: 'long' });
        const gYear = currentYear;
        const weekday = gDate.toLocaleDateString('en-US', { weekday: 'long' });
        const monthEn = normalizeHijriMonth(hijriInfo.hijri.month.en);

        days.push({
          hijriDay: parseInt(hijriInfo.hijri.day, 10),
          hijriMonth: {
            number: hijriInfo.hijri.month.number,
            en: monthEn,
            ar: hijriInfo.hijri.month.ar
          },
          hijriYear: parseInt(hijriInfo.hijri.year, 10),
          gregorianDate: `${gDay} ${gMonth} ${gYear}`,
          gregorianDay: gDay,
          gregorianMonthName: gMonth,
          gregorianYear: gYear,
          weekday: weekday,
          isCurrentMonth: true,
          isToday: gDate.toDateString() === today.toDateString(),
          holidays: [],
        });
      }
    }

    // Pad trailing empty days so each row has 7 columns
    const remainder = days.length % 7;
    if (remainder !== 0) {
      const fillNeeded = 7 - remainder;
      for (let i = 0; i < fillNeeded; i++) {
        days.push({
          hijriDay: 0,
          hijriMonth: { number: 0, en: "", ar: "" },
          hijriYear: 0,
          gregorianDate: '',
          gregorianDay: 0,
          gregorianMonthName: '',
          gregorianYear: 0,
          weekday: '',
          isCurrentMonth: false,
          isToday: false,
          holidays: [],
        });
      }
    }

    return days;
  }, [currentMonth, currentYear, apiMonthData]);

  const monthData = useMemo(() => {
    const key = `${currentYear}-${currentMonth}`;
    const apiFirst = apiMonthData[key]?.[0];
    if (apiFirst) return apiFirst;
    const gDate = new Date(currentYear, currentMonth - 1, 1);
    return {
      gregorian: {
        month: { en: gDate.toLocaleDateString('en-US', { month: 'long' }) },
        year: currentYear.toString(),
      }
    };
  }, [currentYear, currentMonth, apiMonthData]);

  const selectedDate = useMemo<CalendarDay | null>(() => {
    if (calendarDays.length === 0) return null;
    const currentDays = calendarDays.filter(d => d.isCurrentMonth);
    if (selectedDayNum !== null) {
      const found = currentDays.find(d => d.gregorianDay === selectedDayNum);
      if (found) return found;
    }
    const todayMatch = currentDays.find(d => d.isToday);
    if (todayMatch) return todayMatch;
    return currentDays[0] || null;
  }, [calendarDays, selectedDayNum]);

  const handlePreviousMonth = () => {
    setSelectedDayNum(null);
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedDayNum(null);
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setSelectedDayNum(today.getDate());
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const handleDateClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth) return;
    setSelectedDayNum(day.gregorianDay);
  };

  const closeDateModal = () => {
    setShowDetailModal(false);
  };

  const hijriMonthHeader = useMemo(() => {
    if (calendarDays.length === 0) return "";
    const activeDays = calendarDays.filter(d => d.isCurrentMonth);
    const months = Array.from(new Set(activeDays.map(d => normalizeHijriMonth(d.hijriMonth.en))));
    const years = Array.from(new Set(activeDays.map(d => d.hijriYear)));

    const shortenMonth = (m: string) => {
      return (m || '')
        .replace(/al-ōlā/gi, 'al-ūlā')
        .replace(/ō/g, 'ū')
        .replace(/al-thānī/gi, 'II')
        .replace(/al-thani/gi, 'II')
        .replace(/al-ūlā/gi, 'I')
        .replace(/al-ula/gi, 'I')
        .replace(/al-awwal/gi, 'I');
    };

    if (months.length === 1) return `${months[0]} ${years[0]}`;
    if (years.length === 1) return `${shortenMonth(months[0])} – ${shortenMonth(months[1])} ${years[0]}`;
    return `${shortenMonth(months[0])} ${years[0]} – ${shortenMonth(months[1])} ${years[1]}`;
  }, [calendarDays]);

  const weeks = useMemo(() => {
    const rows: CalendarDay[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      rows.push(calendarDays.slice(i, i + 7));
    }
    return rows;
  }, [calendarDays]);

  const getDayStatus = (day: CalendarDay) => {
    if (day.holidays && day.holidays.length > 0) {
      return day.holidays[0];
    }
    if (day.hijriDay >= 13 && day.hijriDay <= 15) {
      return "🌕 Ayyam al-Beed Fast";
    }
    const isFri = day.weekday?.toLowerCase() === 'friday';
    if (isFri) {
      return "✦ Blessed Jumu'ah";
    }
    const isMonThu = day.weekday?.toLowerCase() === 'monday' || day.weekday?.toLowerCase() === 'thursday';
    if (isMonThu) {
      return "🌙 Sunnah Fast";
    }
    if (day.isToday) {
      return "✨ Today";
    }
    return null;
  };

  return (
    <div className="min-h-screen px-4 pb-20 safe-top" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'calc(var(--safe-top) + 1.5rem)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goBackOrFallback(navigate, '/dashboard')}
              className="rounded-full"
              style={{ color: 'var(--text-secondary)', background: 'var(--surface-2)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Islamic Calendar</h1>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Hijri Dates</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/timetable')}
            className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)] border-none shadow-sm hover:opacity-90 transition-opacity"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Monthly Timetable →</span>
            <span className="sm:hidden">Timetable →</span>
          </Button>
        </div>

        {/* Current Islamic Date */}
        <Card
          className="border rounded-3xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <CardHeader className="text-center pb-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              <CardTitle className="text-xl" style={{ color: 'var(--text-primary)' }}>Islamic Calendar</CardTitle>
            </div>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>Today's Hijri Date</CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {dateLoading && (
              <div
                className="rounded-2xl p-6 space-y-3 min-h-[200px] animate-pulse"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
              >
                <div className="h-8 w-3/4 mx-auto bg-white/10 rounded" />
                <div className="h-7 w-4/5 mx-auto bg-white/10 rounded" />
                <div className="h-4 w-40 mx-auto bg-white/10 rounded" />
              </div>
            )}

            {!dateLoading && islamicInfo && (
              <>
                <div
                  className="rounded-2xl p-6 space-y-2 text-center"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface-2) 100%)',
                    border: '1px solid var(--accent)',
                    boxShadow: '0 8px 30px var(--accent-glow)',
                  }}
                >
                  <div
                    className="font-extrabold tracking-tight mb-1"
                    style={{
                      fontSize: 'clamp(1.25rem, 5.2vw, 1.6rem)',
                      color: 'var(--accent-text)',
                      lineHeight: 1.25,
                    }}
                  >
                    <span className="whitespace-nowrap">{islamicInfo.currentDate.hijri.day} {normalizeHijriMonth(islamicInfo.currentDate.hijri.month.en)}</span>{' '}
                    <span className="whitespace-nowrap">{islamicInfo.currentDate.hijri.year} AH</span>
                  </div>
                  <div className="text-2xl sm:text-3xl quran-arabic mb-3" dir="rtl" style={{ color: 'var(--accent-text)' }}>
                    {islamicInfo.currentDate.hijri.day} {islamicInfo.currentDate.hijri.month.ar} {islamicInfo.currentDate.hijri.year}
                  </div>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {islamicInfo.currentDate.hijri.weekday.en}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    Gregorian: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Show holidays if any */}
                {islamicInfo.currentDate.hijri.holidays && islamicInfo.currentDate.hijri.holidays.length > 0 && (
                  <div
                    className="rounded-2xl p-4 border"
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--accent)',
                    }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Star className="h-4 w-4" style={{ color: 'var(--accent)' }} />
                      <h3 className="font-bold text-sm" style={{ color: 'var(--accent-text)' }}>Special Day</h3>
                    </div>
                    {islamicInfo.currentDate.hijri.holidays.map((holiday: string, index: number) => (
                      <p key={index} className="text-center font-medium text-xs" style={{ color: 'var(--text-primary)' }}>
                        {holiday}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Full Calendar View with Laser-Spotlight Card Frame */}
        <div
          className="relative overflow-hidden"
          style={{
            borderRadius: '24px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 var(--card-sheen)',
            padding: '16px 12px',
          }}
        >
          {/* Subtle top radial spotlight */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 0%, var(--accent-soft), transparent 65%)',
            }}
          />

          {/* Top-center glowing laser accent bar */}
          <div
            className="relative z-10"
            style={{
              width: '72px',
              height: '3px',
              borderRadius: '0 0 999px 999px',
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              boxShadow: '0 2px 16px var(--accent-glow)',
              margin: '0 auto 10px auto',
            }}
          />

          {/* Sleek Month Switcher Header */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3 px-1">
            <button
              type="button"
              onClick={handlePreviousMonth}
              aria-label="Previous month"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
              style={{
                borderRadius: '50%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center min-w-0 flex-1 px-1">
              <h2
                className="font-bold leading-tight"
                style={{
                  fontSize: '0.84rem',
                  lineHeight: 1.2,
                  color: 'var(--text-primary)',
                  wordBreak: 'normal',
                }}
              >
                {hijriMonthHeader ? `${hijriMonthHeader} AH` : 'Islamic Calendar'}
              </h2>
              <p className="text-xs font-semibold mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {monthData ? `${monthData.gregorian.month.en} ${monthData.gregorian.year}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToday}
                className="px-2.5 py-1 rounded-full text-xs font-bold transition-transform active:scale-95"
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Next month"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shrink-0"
                style={{
                  borderRadius: '50%',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Open Architectural Grid Container */}
          <div className="relative z-10 w-full">
            {/* 7-Column Header */}
            <div
              className="grid grid-cols-7 gap-1 text-center py-1.5 mb-1"
              style={{
                borderBottom: '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
              }}
            >
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI ✦', 'SAT'].map((col, idx) => {
                const isFri = idx === 5;
                return (
                  <div
                    key={col}
                    className="text-[11px] uppercase tracking-wider py-1 select-none"
                    style={{
                      color: isFri ? 'var(--accent-text)' : 'var(--text-secondary)',
                      fontWeight: isFri ? 700 : 600,
                    }}
                  >
                    {col}
                  </div>
                );
              })}
            </div>

            {/* Skeletons while loading initial state (fallback tabular guarantees calendarDays is present) */}
            {loading && calendarDays.length === 0 && (
              <div className="space-y-1 py-1">
                {Array.from({ length: 5 }).map((_, w) => (
                  <div key={`skel-row-${w}`} className="grid grid-cols-7 gap-1 py-1">
                    {Array.from({ length: 7 }).map((_, c) => (
                      <div
                        key={`skel-c-${w}-${c}`}
                        className="min-h-[46px] rounded-xl flex flex-col items-center justify-center gap-1 animate-pulse"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <div className="h-3 w-4 rounded bg-white/10" />
                        <div className="h-2 w-3 rounded bg-white/5" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Open Architectural Grid Weeks — Instant render with 0-flash */}
            {calendarDays.length > 0 && (
              <div className="space-y-0.5">
                {weeks.map((week, wIdx) => {
                  const isLastWeek = wIdx === weeks.length - 1;
                  return (
                    <div
                      key={`week-${wIdx}`}
                      className="grid grid-cols-7 gap-1 py-1"
                      style={{
                        borderBottom: isLastWeek ? 'none' : '1px solid color-mix(in srgb, var(--border) 55%, transparent)',
                      }}
                    >
                      {week.map((day, dIdx) => {
                        if (!day.isCurrentMonth) {
                          return (
                            <div key={`empty-${wIdx}-${dIdx}`} className="min-h-[46px] opacity-0 pointer-events-none" />
                          );
                        }

                        const isFri = dIdx === 5;
                        const isAyyam = day.hijriDay >= 13 && day.hijriDay <= 15;
                        const isSelected = selectedDate !== null && selectedDate.isCurrentMonth && selectedDate.hijriDay === day.hijriDay;
                        const isOrb = isSelected;

                        let cellBg = 'transparent';
                        let borderStyle: React.CSSProperties = {};
                        let boxShadow = 'none';

                        if (isOrb) {
                          cellBg = 'linear-gradient(135deg, var(--accent), var(--accent-2))';
                          boxShadow = '0 4px 16px var(--accent-glow)';
                          borderStyle = { borderRadius: '14px' };
                        } else if (isAyyam) {
                          cellBg = 'color-mix(in srgb, var(--accent-soft) 65%, transparent)';
                          borderStyle = {
                            borderTop: '1px dashed var(--accent)',
                            borderBottom: '1px dashed var(--accent)',
                            ...(day.hijriDay === 13 ? {
                              borderLeft: '1px dashed var(--accent)',
                              borderTopLeftRadius: '10px',
                              borderBottomLeftRadius: '10px',
                            } : {}),
                            ...(day.hijriDay === 15 ? {
                              borderRight: '1px dashed var(--accent)',
                              borderTopRightRadius: '10px',
                              borderBottomRightRadius: '10px',
                            } : {}),
                          };
                        } else if (isFri) {
                          // Delicate vertical column tint for Friday cells
                          cellBg = 'color-mix(in srgb, var(--accent-soft) 35%, transparent)';
                          borderStyle = { borderRadius: '10px' };
                        }

                        // Today indicator if not currently selected orb
                        if (day.isToday && !isOrb) {
                          borderStyle = {
                            ...borderStyle,
                            border: '1.5px solid var(--accent)',
                            borderRadius: borderStyle.borderRadius || '10px',
                          };
                          boxShadow = '0 0 10px var(--accent-glow)';
                        }

                        return (
                          <div
                            key={`day-${day.hijriDay}-${dIdx}`}
                            onClick={() => handleDateClick(day)}
                            className="min-h-[46px] flex flex-col items-center justify-center relative cursor-pointer transition-transform active:scale-95 select-none"
                            style={{
                              background: cellBg,
                              boxShadow,
                              ...borderStyle,
                            }}
                          >
                            {/* Top number: Gregorian day */}
                            <span
                              style={{
                                fontSize: '0.90rem',
                                fontWeight: 700,
                                color: isOrb ? 'var(--on-accent)' : (day.isToday ? 'var(--accent-text)' : 'var(--text-primary)'),
                                lineHeight: 1.15,
                              }}
                            >
                              {day.gregorianDay}
                            </span>

                            {/* Bottom number: Hijri day */}
                            <span
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 600,
                                color: isOrb ? 'var(--on-accent)' : 'var(--accent-text)',
                                opacity: isOrb ? 0.95 : 0.85,
                                lineHeight: 1.1,
                              }}
                            >
                              {day.hijriDay}
                            </span>

                            {/* Islamic event indicator dot */}
                            {day.holidays.length > 0 && (
                              <div
                                style={{
                                  width: '4px',
                                  height: '4px',
                                  borderRadius: '50%',
                                  background: isOrb ? 'var(--on-accent)' : 'var(--accent)',
                                  boxShadow: '0 0 4px var(--accent)',
                                  marginTop: '2px',
                                }}
                                title={day.holidays.join(', ')}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ayyam al-Beed Legend Pill Below Grid */}
            <div className="flex items-center justify-center mt-3 pt-2">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold select-none"
                style={{
                  fontSize: '0.70rem',
                  whiteSpace: 'nowrap',
                  background: 'color-mix(in srgb, var(--accent-soft) 55%, transparent)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                <span>🌕 13–15 Hijri • Ayyam al-Beed Sunnah Fast</span>
              </div>
            </div>

            {/* Interactive Selected-Day Contextual Detail Bar */}
            {selectedDate && (
              <div
                onClick={() => setShowDetailModal(true)}
                className="mt-3 flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  borderRadius: '14px',
                  boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                }}
                title="Tap to view full details"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div
                    className="font-bold flex items-center gap-1.5 flex-wrap"
                    style={{
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      color: 'var(--accent-text)',
                      lineHeight: 1.25,
                    }}
                  >
                    <span style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>
                      {selectedDate.hijriDay} {normalizeHijriMonth(selectedDate.hijriMonth.en)} {selectedDate.hijriYear} AH
                    </span>
                    {selectedDate.isToday && (
                      <span
                        className="text-[9px] uppercase font-extrabold flex-shrink-0 leading-none select-none"
                        style={{
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                          padding: '3px 7px',
                          borderRadius: '999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                        }}
                      >
                        Today
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                    {selectedDate.weekday ? `${selectedDate.weekday.slice(0, 3)}, ` : ''}{selectedDate.gregorianDate}
                  </div>
                </div>

                {/* Status pill badge container — unclipped and wrap-safe */}
                <div
                  className="flex items-center justify-end flex-wrap gap-1.5 shrink-0"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                    gap: '6px',
                    overflow: 'visible',
                  }}
                >
                  {(() => {
                    const status = getDayStatus(selectedDate);
                    return status ? (
                      <div
                        className="rounded-full font-bold flex items-center gap-1 select-none leading-normal"
                        style={{
                          fontSize: '0.66rem',
                          padding: '3px 8px',
                          flexShrink: 0,
                          background: 'var(--accent-soft)',
                          border: '1px solid var(--accent)',
                          color: 'var(--accent-text)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {status}
                      </div>
                    ) : (
                      <div
                        className="rounded-full font-semibold select-none leading-normal"
                        style={{
                          fontSize: '0.66rem',
                          padding: '3px 8px',
                          flexShrink: 0,
                          background: 'var(--surface)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Details ↗
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Details Modal */}
        {showDetailModal && selectedDate && (
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeDateModal}
          >
            <div
              className="rounded-3xl border max-w-sm w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
              style={{
                background: 'var(--bg-elev)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Islamic Date Details</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDateModal}
                  className="rounded-full"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Hijri Date */}
              <div
                className="space-y-2 p-4 rounded-2xl border text-center"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                }}
              >
                <div className="text-2xl font-bold" style={{ color: 'var(--accent-text)' }}>
                  {selectedDate.hijriDay} {normalizeHijriMonth(selectedDate.hijriMonth.en)} {selectedDate.hijriYear} AH
                </div>
                <div className="text-xl quran-arabic" dir="rtl" style={{ color: 'var(--accent-text)' }}>
                  {selectedDate.hijriDay} {selectedDate.hijriMonth.ar} {selectedDate.hijriYear} AH
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Gregorian: {selectedDate.gregorianDate}
                </div>
              </div>

              {/* Holidays/Events */}
              {selectedDate.holidays.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Star className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    Events & Holidays
                  </h4>
                  <div className="space-y-1">
                    {selectedDate.holidays.map((holiday, idx) => (
                      <span
                        key={idx}
                        className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full me-1 mb-1"
                        style={{
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-text)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        {holiday}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Special note if today */}
              {selectedDate.isToday && (
                <div className="text-center text-xs font-bold py-2 rounded-xl" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  🌙 Today
                </div>
              )}
            </div>
          </div>
        )}

        {/* Important Islamic Dates */}
        <Card
          className="border rounded-3xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--text-primary)' }}>
              <Star className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              Important Islamic Dates
            </CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              Key events in the Islamic calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {importantDates.map((event, index) => (
                <div
                  key={index}
                  className="rounded-2xl p-4 transition-all duration-200 border"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <event.Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{event.name}</h3>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{event.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Islamic Months */}
        <Card
          className="border rounded-3xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
          }}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--text-primary)' }}>
              <Moon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
              Islamic Months
            </CardTitle>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              The 12 months of the Hijri calendar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {[
                "Muharram", "Safar", "Rabi' al-awwal", "Rabi' al-thani",
                "Jumada al-awwal", "Jumada al-thani", "Rajab", "Sha'ban",
                "Ramadan", "Shawwal", "Dhul Qi'dah", "Dhul Hijjah"
              ].map((month, index) => {
                const isActive = islamicInfo?.currentDate.hijri.month.number === index + 1;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-center py-2 px-3 rounded-xl text-xs font-semibold border transition-all"
                    style={{
                      background: isActive ? 'var(--accent)' : 'var(--surface-2)',
                      color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                      borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                    }}
                  >
                    {index + 1}. {month}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
