import { useState, useEffect, useCallback, useRef, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { getPrayerHistory, type DailyPrayers } from "@/lib/salah-tracker";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

export interface ExtendedChartData {
  day: string;
  fullDate: string;
  completed: number;
  total: number;
  isToday: boolean;
}

export const WeeklySalahChart = memo(function WeeklySalahChart() {
  const { t: ti18n } = useI18n();
  const [chartData, setChartData] = useState<ExtendedChartData[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0, percentage: 0 });

  const lastHistoryHashRef = useRef<string>("");
  const lastRefreshTimeRef = useRef<number>(0);

  const refreshData = useCallback((force = false) => {
    const now = Date.now();
    // Throttle background widget-refresh to at most once per 60 seconds
    if (!force && lastRefreshTimeRef.current !== 0 && now - lastRefreshTimeRef.current < 60000) {
      return;
    }
    lastRefreshTimeRef.current = now;

    const history = getPrayerHistory(7);
    const historyHash = JSON.stringify(history);

    // If data hasn't changed, skip re-calculation and don't re-render chart
    if (historyHash === lastHistoryHashRef.current && lastHistoryHashRef.current !== "") {
      return;
    }
    lastHistoryHashRef.current = historyHash;

    const todayStr = new Date().toDateString();
    // Do not mutate in place
    const data: ExtendedChartData[] = [...history].reverse().map((day: DailyPrayers) => {
      const completed = [day.fajr, day.dhuhr, day.asr, day.maghrib, day.isha].filter(Boolean).length;
      const date = new Date(day.date);
      const isToday = date.toDateString() === todayStr;
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
        fullDate: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        completed,
        total: 5,
        isToday,
      };
    });

    if (data.length === 0) {
      setChartData([]);
      setWeeklyStats({ completed: 0, total: 0, percentage: 0 });
    } else {
      setChartData(data);

      const totalCompleted = data.reduce((sum, d) => sum + d.completed, 0);
      const totalPossible = 7 * 5;
      setWeeklyStats({
        completed: totalCompleted,
        total: totalPossible,
        percentage: Math.round((totalCompleted / totalPossible) * 100)
      });
    }
  }, []);

  useEffect(() => {
    refreshData(true);

    // Listen for real-time updates (salah check-ins force check; background refreshes are throttled)
    const handleSalahUpdate = () => refreshData(true);
    const handleWidgetRefresh = () => refreshData(false);

    window.addEventListener('salah-updated', handleSalahUpdate);
    window.addEventListener('widget-refresh', handleWidgetRefresh);
    return () => {
      window.removeEventListener('salah-updated', handleSalahUpdate);
      window.removeEventListener('widget-refresh', handleWidgetRefresh);
    };
  }, [refreshData]);

  return (
    <Card
      className="bg-[var(--surface)] border border-[var(--border)] overflow-hidden rounded-[22px] backdrop-blur-md relative"
      style={{
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
      }}
    >
      <CardHeader className="pb-2 pt-4 px-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
            {ti18n('weeklyProgress')}
          </CardTitle>
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent-text)',
              border: '1px solid var(--border)',
            }}
          >
            <TrendingUp className="w-3 h-3 text-[var(--accent)]" />
            <span>{weeklyStats.percentage}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4 px-5">
        {/* Stats Summary */}
        <div className="flex items-center justify-between mb-3 text-xs font-semibold text-[var(--text-secondary)]">
          <span>
            {weeklyStats.completed} / {weeklyStats.total} {ti18n('prayersThisWeek')}
          </span>
          <span className="text-[11px] font-medium opacity-80">
            Past 7 Days
          </span>
        </div>

        {/* 7-Day Structured Capsule Track Chart */}
        <div className="w-full pt-1 pb-2">
          {chartData.length > 0 ? (
            <div className="flex items-center justify-between gap-1.5 px-1">
              {chartData.map((entry, index) => {
                const heightPercent = entry.completed === 0 ? 0 : Math.max(12, Math.round((entry.completed / 5) * 100));
                return (
                  <div key={index} className="flex-1 flex flex-col items-center gap-1.5">
                    {/* Numeric Count (0-5) in tiny tabular numerals above each capsule */}
                    <span
                      className="text-[10px] font-mono font-semibold tabular-nums"
                      style={{
                        color: entry.isToday ? 'var(--accent-text)' : 'var(--text-secondary)',
                      }}
                    >
                      {entry.completed}
                    </span>

                    {/* Capsule Track */}
                    <div
                      className="relative transition-all duration-300"
                      style={{
                        height: '68px',
                        width: '28px',
                        borderRadius: '999px',
                        background: 'var(--surface-2)',
                        border: entry.isToday ? '1px solid var(--accent)' : '1px solid var(--border)',
                        boxShadow: entry.isToday ? '0 0 12px var(--accent-glow)' : 'none',
                        display: 'flex',
                        alignItems: 'flex-end',
                        overflow: 'hidden',
                        padding: '2px',
                      }}
                    >
                      {/* Filled Bar */}
                      {entry.completed > 0 && (
                        <div
                          className="w-full transition-all duration-500 ease-out"
                          style={{
                            height: `${heightPercent}%`,
                            background: 'linear-gradient(180deg, var(--accent), var(--accent-2))',
                            borderRadius: '999px',
                            boxShadow: entry.isToday ? '0 0 8px var(--accent-glow)' : 'none',
                          }}
                        />
                      )}
                    </div>

                    {/* Day Label (Tu, We, Th, etc.) */}
                    <span
                      className={cn(
                        "text-[11px] font-semibold tracking-tight transition-colors",
                        entry.isToday ? "text-[var(--accent-text)] font-bold" : "text-[var(--text-secondary)]"
                      )}
                    >
                      {entry.day}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 w-full flex flex-col items-center justify-center text-[var(--text-secondary)] text-xs">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p>{ti18n('noPrayerDataYet')}</p>
              <p className="text-xs mt-1">{ti18n('checkInPrayersToSeeProgress')}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs font-semibold tracking-wider text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
            <span>5/5</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent)' }} />
            <span>3–4</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }} />
            <span>1–2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--surface-2)', opacity: 0.6 }} />
            <span>0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default WeeklySalahChart;
