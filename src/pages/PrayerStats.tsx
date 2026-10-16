import { useState, useEffect, useCallback } from "react";
import { AppBar } from "@/components/AppBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, TrendingUp, Award, Target, CheckCircle, Circle } from "lucide-react";
import { getPrayerHistory, type DailyPrayers } from "@/lib/salah-tracker";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useLanguage } from "@/contexts/LanguageContext-new";

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
const CHART_COLORS = ['#C9860A', '#E8A020', '#F3B140', '#FCD570', '#FDE7A6'];

export default function PrayerStats() {
  const { t } = useLanguage();
  const PRAYERS = [t("fajr"), t("dhuhr"), t("asr"), t("maghrib"), t("isha")];
  const [history, setHistory] = useState<DailyPrayers[]>([]);
  const [stats, setStats] = useState({
    totalPrayers: 0,
    completedPrayers: 0,
    currentStreak: 0,
    longestStreak: 0,
    bestDay: '',
    weeklyAverage: 0,
    prayerBreakdown: [] as { name: string; completed: number; total: number }[],
  });

  const loadData = useCallback(() => {
    const data = getPrayerHistory(30); // Last 30 days
    setHistory(data);
    
    // Calculate statistics
    let totalCompleted = 0;
    const totalPossible = data.length * 5;
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let bestDayCount = 0;
    let bestDayDate = '';
    
    const prayerCounts: Record<string, { completed: number; total: number }> = {};
    PRAYERS.forEach(p => prayerCounts[p] = { completed: 0, total: data.length });
    
    // Process each day
    data.forEach((day, index) => {
      const dayCompleted = PRAYER_KEYS.filter(key => day[key]).length;
      totalCompleted += dayCompleted;
      
      // Count per-prayer completions
      PRAYER_KEYS.forEach((key, i) => {
        if (day[key]) {
          prayerCounts[PRAYERS[i]].completed++;
        }
      });
      
      // Track streaks (5/5 days)
      if (dayCompleted === 5) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        if (index === 0) {
          currentStreak = tempStreak;
        }
        tempStreak = 0;
      }
      
      // Best day
      if (dayCompleted > bestDayCount) {
        bestDayCount = dayCompleted;
        bestDayDate = day.date;
      }
    });
    
    // If streak continues to today
    if (tempStreak > 0) {
      currentStreak = tempStreak;
    }
    
    const prayerBreakdown = PRAYERS.map(name => ({
      name,
      completed: prayerCounts[name].completed,
      total: prayerCounts[name].total,
    }));
    
    setStats({
      totalPrayers: totalPossible,
      completedPrayers: totalCompleted,
      currentStreak,
      longestStreak,
      bestDay: bestDayDate,
      weeklyAverage: data.length >= 7 
        ? Math.round((data.slice(0, 7).reduce((acc, d) => acc + PRAYER_KEYS.filter(key => d[key]).length, 0) / 7) * 10) / 10
        : 0,
      prayerBreakdown,
    });
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('salah-updated', loadData);
    return () => window.removeEventListener('salah-updated', loadData);
  }, [loadData]);

  const completionRate = stats.totalPrayers > 0 
    ? Math.round((stats.completedPrayers / stats.totalPrayers) * 100) 
    : 0;

  // Prepare chart data
  const weeklyChartData = history.slice(0, 7).reverse().map(day => ({
    date: new Date(day.date).toLocaleDateString('en', { weekday: 'short' }),
    completed: PRAYER_KEYS.filter(key => day[key]).length,
  }));

  const pieData = stats.prayerBreakdown.map((p, i) => ({
    name: p.name,
    value: p.completed,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <AppBar title={t("prayerStatistics") || "Prayer Statistics"} showBack />
      
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Overview Card */}
        <Card className="overflow-hidden bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] shadow-xl">
          <div className="bg-gradient-to-br from-[var(--accent)]/20 via-[var(--accent)]/5 to-transparent p-6 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/15 rounded-full blur-[20px] pointer-events-none" />
            <div className="text-center relative z-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-2">30-Day Completion Rate</p>
              <p className="text-6xl font-bold text-[var(--text-primary)] font-serif italic mb-2 drop-shadow-md">{completionRate}%</p>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {stats.completedPrayers} of {stats.totalPrayers} prayers
              </p>
            </div>
          </div>
          <CardContent className="p-5 border-t border-[var(--border)]">
            <Progress value={completionRate} className="h-2 bg-[var(--surface-2)]" />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Current Streak</span>
            </div>
            <p className="text-3xl font-bold font-serif italic text-[var(--text-primary)]">{stats.currentStreak} <span className="text-sm not-italic text-[var(--text-secondary)]">days</span></p>
          </Card>
          <Card className="p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <Award className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Best Streak</span>
            </div>
            <p className="text-3xl font-bold font-serif italic text-[var(--text-primary)]">{stats.longestStreak} <span className="text-sm not-italic text-[var(--text-secondary)]">days</span></p>
          </Card>
          <Card className="p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <Target className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Weekly Average</span>
            </div>
            <p className="text-3xl font-bold font-serif italic text-[var(--text-primary)]">{stats.weeklyAverage}<span className="text-sm not-italic text-[var(--text-secondary)]">/5</span></p>
          </Card>
          <Card className="p-5 bg-[var(--surface)] border border-[var(--border)] shadow-sm">
            <div className="flex items-center gap-2 text-[var(--accent)] mb-3">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Days Tracked</span>
            </div>
            <p className="text-3xl font-bold font-serif italic text-[var(--text-primary)]">{history.length}</p>
          </Card>
        </div>

        {/* Weekly Chart */}
        <Card className="bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Weekly Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="completed" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Prayer Breakdown */}
        <Card className="bg-[var(--surface)] border border-[var(--border)] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Prayer Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {stats.prayerBreakdown.map((prayer, index) => {
                  const rate = prayer.total > 0 ? Math.round((prayer.completed / prayer.total) * 100) : 0;
                  return (
                    <div key={prayer.name} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm font-medium flex-1 tracking-wide">{prayer.name}</span>
                      <span className="text-lg font-bold font-serif italic text-[var(--accent)]">{rate}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent History */}
        <Card className="bg-[var(--surface)] border border-[var(--border)] shadow-sm pb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">Recent History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 7).map(day => (
              <div key={day.date} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <span className="text-sm">
                  {new Date(day.date).toLocaleDateString('en', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
                <div className="flex gap-1">
                  {PRAYER_KEYS.map((key, index) => (
                    <div 
                      key={key}
                      title={PRAYERS[index]}
                      className="w-6 h-6 rounded-full flex items-center justify-center"
                    >
                      {day[key] ? (
                        <CheckCircle className="w-4 h-4 text-[var(--accent)]" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/30" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
