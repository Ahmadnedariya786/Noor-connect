import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, Clock, Radio, Trash2, Trophy, Flame, Target, TrendingUp, ArrowLeft, MonitorPlay } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSortedStationStats, getTotalListeningTime, resetRadioStats, formatDuration, type StationStats } from '@/lib/radio-stats';
import { getAllAchievements, getCurrentStreak } from '@/lib/radio-achievements';
import { useToast } from '@/hooks/use-toast';

export default function RadioStats() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<StationStats[]>([]);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [stations, total, currentStreak, allAchievements] = await Promise.all([
        getSortedStationStats(),
        getTotalListeningTime(),
        getCurrentStreak(),
        getAllAchievements(),
      ]);
      setStats(stations);
      setTotalTime(total);
      setStreak(currentStreak);
      setAchievements(allAchievements);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load listening statistics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all listening statistics?')) {
      return;
    }

    try {
      await resetRadioStats();
      await loadStats();
      toast({
        title: 'Statistics Reset',
        description: 'All listening statistics have been cleared',
      });
    } catch (error) {
      console.error('Failed to reset stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset statistics',
        variant: 'destructive',
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const maxTime = stats.length > 0 ? stats[0].totalSeconds : 0;
  const totalSessions = stats.reduce((sum, s) => sum + s.sessionCount, 0);
  const avgSessionDuration = totalSessions > 0 ? Math.floor(totalTime / totalSessions) : 0;
  const mostListened = stats.length > 0 ? stats[0] : null;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quran-radio")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Media Statistics</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Listen & Watch Habits</p>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak} day streak</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Time */}
          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-600" />
              <p className="text-xs font-medium text-muted-foreground">Total Time</p>
            </div>
            <p className="text-2xl font-black text-foreground">{formatDuration(totalTime)}</p>
          </Card>

          {/* Streak */}
          <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-600" />
              <p className="text-xs font-medium text-muted-foreground">Current Streak</p>
            </div>
            <p className="text-2xl font-black text-foreground">{streak} days</p>
          </Card>

          {/* Total Sessions */}
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-muted-foreground">Total Sessions</p>
            </div>
            <p className="text-2xl font-black text-foreground">{totalSessions}</p>
          </Card>

          {/* Avg Duration */}
          <Card className="p-4 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
              <p className="text-xs font-medium text-muted-foreground">Avg Session</p>
            </div>
            <p className="text-2xl font-black text-foreground">{formatDuration(avgSessionDuration)}</p>
          </Card>
        </div>

        {/* Most Listened Station */}
        {mostListened && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {mostListened.stationId.startsWith('live_') ? (
                  <MonitorPlay className="w-5 h-5 text-primary" />
                ) : (
                  <Radio className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Top Station / Stream</p>
                <p className="text-sm font-bold text-foreground truncate">{mostListened.stationName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">{formatDuration(mostListened.totalSeconds)}</p>
                <p className="text-xs text-muted-foreground">
                  {((mostListened.totalSeconds / totalTime) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Achievements Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Achievements
            </h2>
            <span className="text-xs font-medium text-muted-foreground">
              {unlockedCount}/{achievements.length} unlocked
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {achievements.map((achievement) => (
              <Card
                key={achievement.id}
                className={`p-3 text-center ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20'
                    : 'bg-muted/30 border-muted/50 opacity-60'
                }`}
              >
                <div className="text-2xl mb-1">{achievement.icon}</div>
                <p className="text-xs font-bold text-foreground leading-tight mb-0.5">
                  {achievement.title}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">
                  {achievement.description}
                </p>
                {achievement.unlocked && (
                  <div className="mt-1.5">
                    <div className="w-full h-1 bg-yellow-500/30 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full w-full" />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Station List */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">Media Breakdown</h2>
          {stats.length === 0 ? (
            <Card className="p-8 text-center">
              <MonitorPlay className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No media data yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Start listening to radio or watching streams to see statistics</p>
            </Card>
          ) : (
            <div className="space-y-3">
            {stats.map((station, index) => {
              const percentage = maxTime > 0 ? (station.totalSeconds / maxTime) * 100 : 0;
              return (
                <Card key={station.stationId} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {station.stationId.startsWith('live_') ? (
                            <MonitorPlay className="w-4 h-4 text-primary" />
                          ) : (
                            <Radio className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{station.stationName}</p>
                          <p className="text-xs text-muted-foreground">
                            {station.sessionCount} session{station.sessionCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{formatDuration(station.totalSeconds)}</p>
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={stats.length === 0}
            className="flex-1 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
