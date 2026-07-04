/**
 * Prayer Stats Widget
 * Shows prayer tracking statistics and achievements
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Calendar, TrendingUp, Award, Target, CheckCircle, Trophy, Flame, Medal } from "lucide-react";
import { getPrayerHistory, getSalahStats } from "@/lib/salah-tracker";

const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;

type RangeKey = "week" | "month";

interface PrayerStatsSummary {
  rangeKey: RangeKey;
  rangeDays: number;
  completed: number;
  totalPossible: number;
  completionRate: number;
  averagePerDay: number;
  currentStreak: number;
  longestStreak: number;
  todayCompleted: number;
}

export function PrayerStatsWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PrayerStatsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<RangeKey>("week");

  const loadStats = useCallback(() => {
    try {
      const rangeDays = timeRange === "week" ? 7 : 30;
      const history = getPrayerHistory(rangeDays);
      const completionCounts = history.map((day) => PRAYER_KEYS.filter((k) => day[k]).length);

      const completed = completionCounts.reduce((sum, n) => sum + n, 0);
      const totalPossible = history.length * 5;
      const completionRate = totalPossible > 0 ? Math.round((completed / totalPossible) * 100) : 0;
      const averagePerDay = history.length > 0 ? Math.round((completed / history.length) * 10) / 10 : 0;

      const salahStats = getSalahStats();

      setStats({
        rangeKey: timeRange,
        rangeDays,
        completed,
        totalPossible,
        completionRate,
        averagePerDay,
        currentStreak: salahStats.currentStreak,
        longestStreak: salahStats.longestStreak,
        todayCompleted: salahStats.todayCompleted,
      });
    } catch (error) {
      console.error('Error loading prayer stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadStats();

    // Listen for prayer tracking updates
    window.addEventListener('salah-updated', loadStats);
    window.addEventListener('widget-refresh', loadStats);

    return () => {
      window.removeEventListener('salah-updated', loadStats);
      window.removeEventListener('widget-refresh', loadStats);
    };
  }, [loadStats]);

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'text-green-600 bg-green-50 border-green-200';
    if (streak >= 14) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (streak >= 7) return 'text-purple-600 bg-purple-50 border-purple-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const achievements = useMemo(() => {
    if (!stats) return [];

    const rangeIsWeek = stats.rangeKey === "week";

    return [
      {
        id: "perfect-range",
        title: rangeIsWeek ? "Perfect Week" : "Perfect Month",
        description: rangeIsWeek ? "Completed all prayers this week" : "Completed all prayers this month",
        icon: Trophy,
        unlocked: stats.completionRate === 100 && stats.totalPossible > 0,
      },
      {
        id: "streak-7",
        title: "Consistency",
        description: "Maintain a 7‑day streak",
        icon: Flame,
        unlocked: stats.currentStreak >= 7,
      },
      {
        id: "rate-80",
        title: "Momentum",
        description: rangeIsWeek ? "80%+ completion this week" : "80%+ completion this month",
        icon: Medal,
        unlocked: stats.completionRate >= 80 && stats.totalPossible > 0,
      },
    ].filter((a) => a.unlocked);
  }, [stats]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-12 bg-muted rounded" />
            <div className="h-12 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (!stats) return null;

  const missed = Math.max(0, stats.totalPossible - stats.completed);

  return (
    <Card className="relative overflow-hidden border-purple-200 bg-gradient-to-br from-purple-50/50 to-transparent transition-all duration-500 hover:shadow-lg hover:shadow-purple-100">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-100/30 rounded-full blur-2xl" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
            Prayer Statistics
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={timeRange === 'week' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs rounded-lg"
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs rounded-lg"
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/50">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-muted-foreground">Completed</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {stats.completed}
            </p>
            <p className="text-xs text-muted-foreground">
              {stats.completionRate}% rate
            </p>
          </div>
          
          <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/50">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-muted-foreground">Remaining</span>
            </div>
            <p className="text-lg font-bold text-foreground">
              {missed}
            </p>
            <p className="text-xs text-muted-foreground">
              of {stats.totalPossible}
            </p>
          </div>
        </div>

        {/* Current Streak */}
        <div className={`p-3 rounded-xl border ${getStreakColor(stats.currentStreak)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span className="text-sm font-medium">Current Streak</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.currentStreak}</p>
              <p className="text-xs">days</p>
            </div>
          </div>
          {stats.longestStreak > stats.currentStreak && (
            <p className="text-xs mt-1">
              Longest: {stats.longestStreak} days
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Completion Rate</span>
            <span className="text-muted-foreground">
              {stats.completionRate}%
            </span>
          </div>
          <Progress 
            value={stats.completionRate} 
            className="h-2"
          />
          <p className="text-[10px] text-muted-foreground text-center">
            Avg {stats.averagePerDay}/5 per day • Today {stats.todayCompleted}/5
          </p>
        </div>

        {/* Achievements */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-600" />
            Recent Achievements
          </h4>
          <div className="space-y-2">
            {achievements.length > 0 ? (
              achievements.slice(0, 2).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-yellow-50/50 border border-yellow-200/50"
                >
                  <achievement.icon className="w-4 h-4 text-yellow-700" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{achievement.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{achievement.description}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/30 border border-border/50">
                Keep checking in your prayers to unlock achievements.
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-purple-300 hover:bg-purple-50"
          onClick={() => navigate('/prayer-stats')}
        >
          <Calendar className="w-4 h-4" />
          View Detailed Stats
        </Button>
      </CardContent>
    </Card>
  );
}

export default PrayerStatsWidget;
