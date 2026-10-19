/**
 * Quran Progress Page
 * Detailed statistics and achievements for Quran reading progress
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Award, Clock, ChevronLeft, BarChart3, Flame } from 'lucide-react';
import { quranFeaturesService, type QuranStreak, type QuranAchievement } from '@/lib/quran-features';
import { PageTransition } from '@/components/PageTransition';
import { AppBar } from '@/components/AppBar';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { useToast } from '@/hooks/use-toast';

export default function QuranProgress() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [overallProgress, setOverallProgress] = useState<any>(null);
  const [streak, setStreak] = useState<QuranStreak | null>(null);
  const [achievements, setAchievements] = useState<QuranAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [progress, streakData, achievementData] = await Promise.all([
          quranFeaturesService.getOverallProgress(),
          quranFeaturesService.getReadingStreak(),
          quranFeaturesService.getAchievements()
        ]);
        
        setOverallProgress(progress);
        setStreak(streakData);
        setAchievements(achievementData);
      } catch (error) {
        console.error('Error loading progress data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load progress data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <AppBar title={t("quranProgress") || "Quran Progress"} showBack />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-12">
        <AppBar title={t("quranProgress") || "Quran Progress"} showBack />
        
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Overall Progress Summary */}
          <Card
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[22px] overflow-hidden backdrop-blur-md relative"
            style={{
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 px-5 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Surahs Progress */}
                <div className="text-center flex flex-col items-center">
                  <div className="relative inline-flex items-center justify-center w-32 h-32 mb-2">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="48"
                        stroke="var(--surface-2)"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="48"
                        stroke="var(--accent)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - (overallProgress?.percentage || 0) / 100)}`}
                        style={{
                          filter: 'drop-shadow(0 0 6px var(--accent-glow))',
                          transition: 'stroke-dashoffset 0.8s ease-out',
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <div
                          className="text-2xl font-black tracking-tight"
                          style={{
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {Math.round(overallProgress?.percentage || 0)}%
                        </div>
                        <div className="text-[11px] font-medium text-[var(--text-secondary)]">Complete</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-extrabold text-[var(--accent-text)]">
                      {overallProgress?.completedSurahs || 0} / {overallProgress?.totalSurahs || 114}
                    </p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Surahs</p>
                  </div>
                </div>

                {/* Reading Streak */}
                <div className="text-center flex flex-col items-center">
                  <div className="flex justify-center mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                      style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent-text)',
                        boxShadow: '0 0 16px var(--accent-glow)',
                      }}
                    >
                      <Flame className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-extrabold text-[var(--accent-text)]">
                      {streak?.currentStreak || 0}
                    </p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Day Streak</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Longest: {streak?.longestStreak || 0} days
                    </p>
                  </div>
                </div>

                {/* Total Reading */}
                <div className="text-center flex flex-col items-center">
                  <div className="flex justify-center mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center transition-transform hover:scale-105"
                      style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent-text)',
                        boxShadow: '0 0 16px var(--accent-glow)',
                      }}
                    >
                      <BookOpen className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-extrabold text-[var(--text-primary)]">
                      {(overallProgress?.completedAyahs || 0).toLocaleString()}
                    </p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-[var(--text-secondary)]">Ayahs Read</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      of {(overallProgress?.totalAyahs || 6236).toLocaleString()} total
                    </p>
                  </div>
                </div>
              </div>

              {/* Theme Progress Bar */}
              <div className="space-y-2 pt-2">
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)] p-0.5">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, overallProgress?.percentage || 0))}%`,
                      background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                      boxShadow: '0 0 12px var(--accent-glow)',
                    }}
                  />
                </div>
                <p className="text-center text-xs font-medium text-[var(--text-secondary)]">
                  {overallProgress?.completedAyahs?.toLocaleString() || 0} / {overallProgress?.totalAyahs?.toLocaleString() || 6236} ayahs completed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reading Stats */}
          <Card
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[22px] overflow-hidden backdrop-blur-md relative"
            style={{
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--accent)]" />
                Reading Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px]">
                  <p className="text-2xl font-black text-[var(--accent-text)]">{streak?.totalDaysRead || 0}</p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Total Days Read</p>
                </div>
                <div className="text-center p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px]">
                  <p className="text-2xl font-black text-[var(--text-primary)]">{overallProgress?.completedSurahs || 0}</p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Surahs Completed</p>
                </div>
                <div className="text-center p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px]">
                  <p className="text-2xl font-black text-[var(--accent-text)]">
                    {streak?.currentStreak || 0}
                  </p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-[16px]">
                  <p className="text-2xl font-black text-[var(--text-primary)]">{streak?.longestStreak || 0}</p>
                  <p className="text-xs font-semibold text-[var(--text-secondary)] mt-1">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card
            className="bg-[var(--surface)] border border-[var(--border)] rounded-[22px] overflow-hidden backdrop-blur-md relative"
            style={{
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <CardHeader className="pb-2 pt-5 px-5">
              <CardTitle className="text-sm font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--accent)]" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-3.5 bg-[var(--surface-2)] rounded-[16px] border border-[var(--border)]"
                    >
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs text-[var(--text-primary)] truncate">{achievement.title}</h3>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">{achievement.description}</p>
                        <p className="text-[10px] text-[var(--accent-text)] mt-1">
                          Unlocked {formatDate(achievement.unlockedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="flex justify-center mb-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--accent)',
                        color: 'var(--accent-text)',
                        boxShadow: '0 0 16px var(--accent-glow)',
                      }}
                    >
                      <Award className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] font-medium">No achievements yet. Start reading to unlock them!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => navigate('/quran')}
              className="h-11 rounded-[16px] font-semibold text-xs uppercase tracking-wider gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: 'var(--on-accent)',
                boxShadow: '0 4px 16px var(--accent-glow)',
              }}
            >
              <BookOpen className="w-4 h-4" />
              Continue Reading
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="h-11 rounded-[16px] font-semibold text-xs uppercase tracking-wider gap-2 border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface)] transition-all active:scale-[0.98]"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
