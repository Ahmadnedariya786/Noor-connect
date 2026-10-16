/**
 * Quran Progress Widget
 * Displays overall Quran reading progress including completed surahs, streak, and achievements
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, TrendingUp, Award, Calendar } from 'lucide-react';
import { quranFeaturesService } from '@/lib/quran-features';
import { useToast } from '@/hooks/use-toast';

interface OverallProgress {
  totalSurahs: number;
  completedSurahs: number;
  totalAyahs: number;
  completedAyahs: number;
  totalPages: number;
  pagesRead: number;
  percentage: number;
}

interface QuranProgressWidgetProps {
  className?: string;
}

export function QuranProgressWidget({ className }: QuranProgressWidgetProps) {
  const [progress, setProgress] = useState<OverallProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadProgress = async () => {
    try {
      const progressData = await quranFeaturesService.getOverallProgress();
      setProgress(progressData);
    } catch (error) {
      console.error('Error loading Quran progress:', error);
      toast({
        title: 'Error',
        description: 'Failed to load Quran progress',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();

    // Listen for widget refresh events
    const handleRefresh = () => {
      loadProgress();
    };

    window.addEventListener('widget-refresh', handleRefresh);
    window.addEventListener('noorconnect:quran-progress-changed', handleRefresh);

    return () => {
      window.removeEventListener('widget-refresh', handleRefresh);
      window.removeEventListener('noorconnect:quran-progress-changed', handleRefresh);
    };
  }, []);

  const getAchievementBadge = (percentage: number) => {
    if (percentage >= 100) return { icon: Award, text: 'Completed' };
    if (percentage >= 75) return { icon: TrendingUp, text: 'Advanced' };
    if (percentage >= 50) return { icon: BookOpen, text: 'Progressing' };
    if (percentage >= 25) return { icon: Calendar, text: 'Started' };
    return { icon: BookOpen, text: 'Beginner' };
  };

  const getMotivationalMessage = (percentage: number) => {
    if (percentage >= 100) return '🎉 Congratulations! You have completed the entire Quran!';
    if (percentage >= 75) return '🌟 Excellent progress! You\'re almost there!';
    if (percentage >= 50) return '💪 Great job! Half way through the Quran!';
    if (percentage >= 25) return '📚 Keep going! You\'re building momentum!';
    return '🌱 Start your Quran journey today!';
  };

  if (loading) {
    return (
      <Card className={`bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-md ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-[var(--text-primary)]">
            <BookOpen className="w-5 h-5 text-[var(--accent-text)]" />
            Quran Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-muted/30 rounded w-3/4" />
            <div className="h-4 bg-muted/30 rounded w-2/4 ml-2" />
            <div className="h-4 bg-muted/30 rounded w-1/4 ml-2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress) {
    return (
      <Card className={`bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-md ${className || ''}`}>
        <CardHeader>
          <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-[var(--text-primary)]">
            <BookOpen className="w-5 h-5 text-[var(--accent-text)]" />
            Quran Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-[var(--text-secondary)] text-xs font-bold uppercase tracking-widest">No progress data available</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-xs rounded-xl"
              onClick={() => window.location.href = '/quran'}
            >
              Start Reading
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const achievement = getAchievementBadge(progress.percentage);
  const motivationalMessage = getMotivationalMessage(progress.percentage);

  return (
    <Card className={`relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-md ${className || ''}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-[20px] pointer-events-none" />

      <CardHeader className="relative z-10">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-[var(--text-primary)]">
          <BookOpen className="w-5 h-5 text-[var(--accent-text)]" />
          Quran Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {/* Main Progress Display */}
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center w-24 h-24">
            <svg className="transform -rotate-90 w-24 h-24">
              <circle cx="48" cy="48" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted/30" />
              <circle
                cx="48" cy="48" r="36" stroke="var(--accent)" strokeWidth="8" fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress.percentage / 100)}`}
                style={{ transform: 'rotate(-90deg)', transformOrigin: '48px 48px', transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold font-serif italic text-[var(--text-primary)]">{Math.round(progress.percentage)}%</span>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-3xl font-bold font-serif italic text-[var(--accent-text)]">
              {progress.completedSurahs} / {progress.totalSurahs}
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Surahs fully Completed</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress.percentage} className="h-2 bg-[var(--surface-2)]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] text-center">
            {progress.pagesRead} / {progress.totalPages} Pages Read
          </p>
        </div>

        {/* Achievement Badge */}
        <div className="flex items-center justify-center">
          <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
            <achievement.icon className="w-4 h-4" />
            {achievement.text}
          </Badge>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
          <p className="text-xs font-medium text-[var(--text-primary)]/90">{motivationalMessage}</p>
        </div>

        {/* Action Button */}
        <div className="text-center space-y-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => window.location.href = '/quran'}
            className="gap-2 bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 font-bold uppercase tracking-wider text-xs w-full rounded-xl"
          >
            <BookOpen className="w-4 h-4" />
            Continue Reading
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/quran-progress'}
            className="gap-2 w-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)] font-bold uppercase tracking-wider text-xs rounded-xl"
          >
            <TrendingUp className="w-4 h-4" />
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuranProgressWidget;
