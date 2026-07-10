/**
 * Weekly Salah History Chart
 * Shows prayer completion over the past 7 days
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Calendar } from "lucide-react";
import { getPrayerHistory, type DailyPrayers } from "@/lib/salah-tracker";
import { Skeleton } from "@/components/LoadingSkeleton";
import { useI18n } from "@/hooks/useI18n";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

interface ChartData {
  day: string;
  fullDate: string;
  completed: number;
  total: number;
}

export function WeeklySalahChart() {
  const { t: ti18n } = useI18n();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [dataVersion, setDataVersion] = useState(0);
  const [weeklyStats, setWeeklyStats] = useState({ completed: 0, total: 0, percentage: 0 });

  const refreshData = useCallback(() => {
    const history = getPrayerHistory(7);
    console.log('Prayer history data refreshed:', history);

    // Reverse to show oldest first (left to right)
    const data = history.reverse().map((day: DailyPrayers) => {
      const completed = [day.fajr, day.dhuhr, day.asr, day.maghrib, day.isha].filter(Boolean).length;
      const date = new Date(day.date);
      return {
        day: date.toLocaleDateString('en', { weekday: 'short' }).slice(0, 2),
        fullDate: date.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        completed,
        total: 5
      };
    });

    // Only show real data - no fake/sample data
    if (data.length === 0) {
      setChartData([]);
      setWeeklyStats({ completed: 0, total: 0, percentage: 0 });
    } else {
      setChartData(data);
      setDataVersion(v => v + 1);

      // Calculate weekly stats
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
    refreshData();

    // Listen for real-time updates
    window.addEventListener('salah-updated', refreshData);
    window.addEventListener('widget-refresh', refreshData);
    return () => {
      window.removeEventListener('salah-updated', refreshData);
      window.removeEventListener('widget-refresh', refreshData);
    };
  }, [refreshData]);

  const getBarColor = (completed: number): string => {
    if (completed === 5) return "#C9860A";
    if (completed >= 3) return "rgba(201,134,10,0.65)";
    if (completed >= 1) return "rgba(201,134,10,0.35)";
    return "rgba(255,255,255,0.08)";
  };

  return (
    <Card className="bg-[#1A1A1A] border border-[#C9860A]/30 overflow-hidden min-h-[200px] shadow-md">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#C9860A]" />
            {ti18n('weeklyProgress')}
          </CardTitle>
          <div className="flex items-center gap-1.5 text-[10px]">
            <TrendingUp className="w-3 h-3 text-[#C9860A]" />
            <span className="font-bold font-serif italic text-[#C9860A]">{weeklyStats.percentage}%</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Stats Summary */}
        <div className="flex items-center justify-between mb-3 text-[10px] font-bold uppercase tracking-widest">
          <span className="text-muted-foreground">
            {weeklyStats.completed} / {weeklyStats.total} {ti18n('prayersThisWeek')}
          </span>
        </div>

        {/* Chart with fixed height to prevent CLS */}
        <div className="h-24 w-full min-h-[96px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={dataVersion} data={chartData} barCategoryGap="20%">
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis hide domain={[0, 5]} />
                <Bar
                  dataKey="completed"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.completed)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground text-xs">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p>{ti18n('noPrayerDataYet')}</p>
              <p className="text-[10px] mt-1">{ti18n('checkInPrayersToSeeProgress')}</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#C9860A]" />
            <span>5/5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(201,134,10,0.65)' }} />
            <span>3-4</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(201,134,10,0.35)' }} />
            <span>1-2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted" />
            <span>0</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeeklySalahChart;
