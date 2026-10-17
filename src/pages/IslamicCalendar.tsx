// v2.0.3 - Fixed Missing useMemo import
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Moon, Star, ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { calendarApiResponseSchema, safeParseApiResponse } from "@/lib/api-schemas";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";
import { useNavigate } from "react-router-dom";
import { goBackOrFallback } from "@/lib/navigation";

const importantDates = [
  { name: "Ramadan", icon: "🌙", description: "Month of Fasting", color: "bg-primary/10 text-foreground border border-primary/20" },
  { name: "Laylat al-Qadr", icon: "✨", description: "Night of Power", color: "bg-primary/20 text-foreground border border-primary/30" },
  { name: "Eid al-Fitr", icon: "🎉", description: "Festival of Breaking the Fast", color: "bg-accent/10 text-foreground border border-accent/20" },
  { name: "Eid al-Adha", icon: "🐑", description: "Festival of Sacrifice", color: "bg-secondary/20 text-foreground border border-primary/30" },
  { name: "Dhul Hijjah", icon: "🕋", description: "Month of Hajj", color: "bg-primary/15 text-foreground border border-primary/25" },
  { name: "Muharram", icon: "🌟", description: "Islamic New Year", color: "bg-accent/15 text-foreground border border-accent/25" },
  { name: "Ashura", icon: "⭐", description: "Day of Ashura", color: "bg-secondary/25 text-foreground border border-primary/20" },
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
  isCurrentMonth: boolean;
  isToday: boolean;
  holidays: string[];
}

export default function IslamicCalendar() {
  const navigate = useNavigate();
  // Use the Maghrib-aware hook (same as Dashboard) for the header date
  const { islamicInfo, isLoading: dateLoading } = useIslamicCalendar();

  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [monthData, setMonthData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchMonthCalendar(currentMonth, currentYear);
  }, [currentMonth, currentYear]);

  useEffect(() => {
    const handleOffsetChange = () => fetchMonthCalendar(currentMonth, currentYear);
    window.addEventListener('hijri-date-offset-changed', handleOffsetChange);
    return () => window.removeEventListener('hijri-date-offset-changed', handleOffsetChange);
  }, [currentMonth, currentYear]);

  const fetchMonthCalendar = async (month: number, year: number) => {
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
        
        setMonthData(dataToProcess[0]);
        generateCalendarDays(dataToProcess);
      } else {
        throw new Error("Invalid API response");
      }
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (monthData: any[]) => {
    const days: CalendarDay[] = [];
    const today = new Date();

    if (monthData.length === 0) return;

    // Get the first day of the month to determine starting weekday
    const firstDayData = monthData[0];
    const firstDayDate = new Date(
      firstDayData.gregorian.year,
      firstDayData.gregorian.month.number - 1,
      firstDayData.gregorian.day
    );

    // Get weekday index (0 = Sunday, 1 = Monday, etc.)
    const firstWeekdayIndex = firstDayDate.getDay();

    // Add empty cells for days before the 1st of the month
    for (let i = 0; i < firstWeekdayIndex; i++) {
      days.push({
        hijriDay: 0,
        hijriMonth: { number: 0, en: "", ar: "" },
        hijriYear: 0,
        gregorianDate: '',
        isCurrentMonth: false,
        isToday: false,
        holidays: [],
      });
    }

    // Add the actual days of the month
    monthData.forEach((dayData: any) => {
      const gregorianDate = new Date(
        dayData.gregorian.year,
        dayData.gregorian.month.number - 1,
        dayData.gregorian.day
      );

      days.push({
        hijriDay: parseInt(dayData.hijri.day),
        hijriMonth: {
          number: dayData.hijri.month.number,
          en: dayData.hijri.month.en,
          ar: dayData.hijri.month.ar
        },
        hijriYear: parseInt(dayData.hijri.year),
        gregorianDate: `${dayData.gregorian.day} ${dayData.gregorian.month.en}`,
        isCurrentMonth: true,
        isToday: gregorianDate.toDateString() === today.toDateString(),
        holidays: dayData.hijri.holidays || [],
      });
    });

    setCalendarDays(days);
  };

  const handlePreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day);
  };

  const closeDateModal = () => {
    setSelectedDate(null);
  };

  const hijriMonthHeader = useMemo(() => {
    if (calendarDays.length === 0) return "";
    const activeDays = calendarDays.filter(d => d.isCurrentMonth);
    const months = Array.from(new Set(activeDays.map(d => d.hijriMonth.en)));
    const years = Array.from(new Set(activeDays.map(d => d.hijriYear)));

    if (months.length === 1) return `${months[0]} ${years[0]}`;
    if (years.length === 1) return `${months.join(" / ")} ${years[0]}`;
    return `${months[0]} ${years[0]} / ${months[1]} ${years[1]}`;
  }, [calendarDays]);
  return (
    <div className="min-h-screen px-4 pb-20 safe-top" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', paddingTop: 'calc(var(--safe-top) + 1.5rem)' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
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
          <div className="flex-1">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>Islamic Calendar</h1>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Hijri Dates</p>
          </div>
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
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-1" style={{ color: 'var(--accent-text)' }}>
                    {islamicInfo.currentDate.hijri.day} {islamicInfo.currentDate.hijri.month.en} {islamicInfo.currentDate.hijri.year} AH
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

        {/* Full Calendar View */}
        <Card
          className="border rounded-3xl overflow-hidden"
          style={{
            background: 'var(--surface)',
            borderColor: 'var(--border)',
            boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)',
          }}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg" style={{ color: 'var(--text-primary)' }}>
                <Moon className="h-5 w-5" style={{ color: 'var(--accent)' }} />
                {hijriMonthHeader || (
                  <span className="inline-block h-5 w-40 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
                )}
                {" AH"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToday}
                  className="rounded-xl font-bold text-xs"
                  style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePreviousMonth}
                  className="rounded-xl h-8 w-8"
                  style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="rounded-xl h-8 w-8"
                  style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription style={{ color: 'var(--text-secondary)' }}>
              {monthData && `${monthData.gregorian.month.en} ${monthData.gregorian.year}`}
              {!monthData && (
                <span className="inline-block h-4 w-28 rounded animate-pulse" style={{ background: 'var(--surface-2)' }} />
              )}
            </CardDescription>
          </CardHeader>
          <CardContent style={{ contentVisibility: "auto", containIntrinsicSize: "800px" }}>
            <div className="w-full">
              {/* Single CSS grid: 7 columns, fixed min cell height, no overlapping layers */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-bold text-xs p-1" style={{ color: 'var(--text-secondary)' }}>
                    {day}
                  </div>
                ))}

                {/* Calendar days skeletons */}
                {loading && (
                  Array.from({ length: 35 }).map((_, index) => (
                    <div
                      key={`cal-skel-${index}`}
                      className="rounded-xl p-2 border min-h-[64px] sm:min-h-[72px]"
                      style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                    >
                      <div className="flex flex-col h-full justify-between">
                        <div className="h-3 w-4 rounded animate-pulse bg-white/10" />
                        <div className="h-3 w-8 rounded animate-pulse bg-white/10" />
                      </div>
                    </div>
                  ))
                )}

                {/* Calendar days normal flow: Day number on top, Hijri number below */}
                {!loading && calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`
                      min-w-0 p-1.5 sm:p-2 border rounded-xl min-h-[64px] sm:min-h-[72px] flex flex-col justify-between transition-colors
                      ${!day.isCurrentMonth ? 'opacity-25 cursor-default' : 'cursor-pointer hover:border-[var(--accent)] active:scale-[0.98]'}
                    `}
                    style={{
                      background: day.isToday
                        ? 'var(--accent-soft)'
                        : day.isCurrentMonth ? 'var(--surface)' : 'transparent',
                      borderColor: day.isToday ? 'var(--accent)' : 'var(--border)',
                      boxShadow: day.isToday ? '0 0 14px var(--accent-glow)' : 'inset 0 1px 0 var(--card-sheen)',
                    }}
                    onClick={() => day.isCurrentMonth && handleDateClick(day)}
                  >
                    {day.isCurrentMonth ? (
                      <div className="flex flex-col h-full justify-between min-w-0">
                        {/* Line 1: Gregorian day number + today indicator dot */}
                        <div className="flex items-center justify-between">
                          <span
                            className="text-xs sm:text-sm font-bold tabular-nums"
                            style={{ color: day.isToday ? 'var(--accent-text)' : 'var(--text-primary)' }}
                          >
                            {day.gregorianDate.split(' ')[0] || day.gregorianDate}
                          </span>
                          {day.isToday && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }}
                            />
                          )}
                        </div>

                        {/* Line 2: Hijri number below in normal flow */}
                        <div className="mt-auto pt-1">
                          <span
                            className="text-[11px] sm:text-xs font-semibold tabular-nums block"
                            style={{ color: 'var(--accent-text)' }}
                          >
                            {day.hijriDay}
                            {day.hijriDay === 1 && (
                              <span className="text-[9px] uppercase font-bold ml-1 opacity-70">
                                {day.hijriMonth.en.substring(0, 3)}
                              </span>
                            )}
                          </span>
                          {day.holidays.length > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--accent)' }} />
                              <span className="text-[9px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                {day.holidays[0]}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs" style={{ color: 'var(--text-secondary)', opacity: 0.3 }}>—</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date Details Modal */}
        {selectedDate && (
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
                  {selectedDate.hijriDay} {selectedDate.hijriMonth.en} {selectedDate.hijriYear} AH
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
                    <span className="text-2xl">{event.icon}</span>
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
