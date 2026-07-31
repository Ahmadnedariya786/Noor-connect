/**
 * Quran Progress Page
 * Detailed statistics and achievements for Quran reading progress
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, Award, Calendar, Target, Clock, ChevronLeft, BarChart3 } from 'lucide-react';
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

  const getStreakEmoji = (days: number) => {
    if (days >= 30) return '🔥🔥🔥';
    if (days >= 14) return '🔥🔥';
    if (days >= 7) return '🔥';
    if (days >= 3) return '💪';
    return '🌱';
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background">
          <AppBar title={t("quranProgress") || "Quran Progress"} showBack />
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <AppBar title={t("quranProgress") || "Quran Progress"} showBack />
        
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Overall Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Overall Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Surahs Progress */}
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-32 h-32">
                    <svg className="transform -rotate-90 w-32 h-32">
                      <circle
                        cx="64"
                        cy="64"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="48"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 48}`}
                        strokeDashoffset={`${2 * Math.PI * 48 * (1 - overallProgress?.percentage / 100)}`}
                        className="text-primary transition-all duration-500"
                        transform="rotate(-90 64 64)"
                        transformOrigin="64 64"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <div className="text-2xl font-bold">{Math.round(overallProgress?.percentage || 0)}%</div>
                        <div className="text-xs text-muted-foreground">Complete</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1">
                    <p className="text-3xl font-bold text-primary">
                      {overallProgress?.completedSurahs || 0} / {overallProgress?.totalSurahs || 114}
                    </p>
                    <p className="text-sm text-muted-foreground">Surahs</p>
                  </div>
                </div>

                {/* Reading Streak */}
                <div className="text-center">
                  <div className="text-6xl mb-4">
                    {getStreakEmoji(streak?.currentStreak || 0)}
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-orange-600">
                      {streak?.currentStreak || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Day Streak</p>
                    <p className="text-xs text-muted-foreground">
                      Longest: {streak?.longestStreak || 0} days
                    </p>
                  </div>
                </div>

                {/* Total Reading */}
                <div className="text-center">
                  <div className="text-6xl mb-4">📖</div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-blue-600">
                      {(overallProgress?.completedAyahs || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">Ayahs Read</p>
                    <p className="text-xs text-muted-foreground">
                      of {(overallProgress?.totalAyahs || 6236).toLocaleString()} total
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={overallProgress?.percentage || 0} className="h-4" />
                <p className="text-center text-sm text-muted-foreground">
                  {overallProgress?.completedAyahs?.toLocaleString() || 0} / {overallProgress?.totalAyahs?.toLocaleString() || 6236} ayahs completed
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reading Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Reading Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{streak?.totalDaysRead || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Days Read</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{overallProgress?.completedSurahs || 0}</p>
                  <p className="text-sm text-muted-foreground">Surahs Completed</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {streak?.currentStreak || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-orange-600">{streak?.longestStreak || 0}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20"
                    >
                      <div className="text-3xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm">{achievement.title}</h3>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Unlocked {formatDate(achievement.unlockedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-muted-foreground">No achievements yet. Start reading to unlock them!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={() => navigate('/quran')}
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Continue Reading
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="gap-2"
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
