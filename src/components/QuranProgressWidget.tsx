/**
 * Quran Progress Widget
 * Displays overall Quran reading progress including completed surahs, streak, and achievements.
 * Features a dual-ring SVG radial gauge, recessed stat tiles, and 0ms SPA routing.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const navigate = useNavigate();
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
        variant: 'destructive',
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
    if (percentage >= 75) return "🌟 Excellent progress! You're almost there!";
    if (percentage >= 50) return '💪 Great job! Half way through the Quran!';
    if (percentage >= 25) return "📚 Keep going! You're building momentum!";
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
              onClick={() => navigate('/quran')}
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
  const pct = Math.min(Math.max(progress.percentage, 0), 100);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct / 100);

  return (
    <Card className={`relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-md rounded-[24px] ${className || ''}`}
      style={{
        boxShadow: '0 10px 28px rgba(0,0,0,0.35), inset 0 1px 0 var(--card-sheen)',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-80" />
      <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--accent)]/10 rounded-full blur-[28px] pointer-events-none" />

      <CardHeader className="relative z-10 pb-2">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-between text-[var(--text-primary)]">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--accent-text)]" />
            Quran Progress
          </span>
          <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
            <achievement.icon className="w-3 h-3" />
            {achievement.text}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10 pt-1">
        {/* Main Dual-Ring Gauge & Overview */}
        <div className="flex items-center justify-center pt-1 pb-1">
          <div className="relative inline-flex items-center justify-center w-28 h-28">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="quranArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-2)" />
                </linearGradient>
              </defs>

              {/* Outer Decorative Tick Ring */}
              <circle
                cx="50"
                cy="50"
                r="46"
                fill="none"
                stroke="var(--border)"
                strokeWidth="1"
                strokeDasharray="2 4"
                opacity="0.5"
              />

              {/* Background Track Ring (Thick 8px in surface-2) */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="var(--surface-2)"
                strokeWidth="8"
              />

              {/* Glowing Progress Arc */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke="url(#quranArcGrad)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  filter: 'drop-shadow(0 0 4px var(--accent-glow))',
                }}
              />

              {/* Glowing Start Indicator Dot */}
              <circle
                cx="50"
                cy="12"
                r="3"
                fill="var(--accent)"
                style={{
                  filter: 'drop-shadow(0 0 4px var(--accent-glow))',
                }}
              />
            </svg>

            {/* Centered % Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span
                className="text-2xl font-black font-mono tracking-tight tabular-nums leading-none"
                style={{
                  background: 'linear-gradient(180deg, var(--text-primary) 20%, var(--accent-text) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {Math.round(pct)}%
              </span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)] mt-0.5">
                Completed
              </span>
            </div>
          </div>
        </div>

        {/* 2 Recessed Stat Tiles */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] text-center">
            <p className="text-base sm:text-lg font-black tabular-nums text-[var(--accent-text)]">
              {progress.completedSurahs} <span className="text-[11px] text-[var(--text-secondary)] font-normal">/ {progress.totalSurahs}</span>
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mt-0.5">
              Surahs Completed
            </p>
          </div>
          <div className="p-3 rounded-[14px] bg-[var(--surface-2)] border border-[var(--border)] text-center">
            <p className="text-base sm:text-lg font-black tabular-nums text-[var(--text-primary)]">
              {progress.pagesRead} <span className="text-[11px] text-[var(--text-secondary)] font-normal">/ {progress.totalPages}</span>
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)] mt-0.5">
              Pages Read
            </p>
          </div>
        </div>

        {/* Horizontal Theme Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2 rounded-full bg-[var(--surface-2)] overflow-hidden border border-[var(--border)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(pct, 2)}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                boxShadow: '0 0 8px var(--accent-glow)',
              }}
            />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-secondary)] text-center">
            {progress.completedAyahs?.toLocaleString() || 0} / {progress.totalAyahs?.toLocaleString() || 6236} Total Ayahs
          </p>
        </div>

        {/* Motivational Message */}
        <div className="text-center p-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl">
          <p className="text-xs font-medium text-[var(--text-primary)]/90">{motivationalMessage}</p>
        </div>

        {/* Action Buttons with 0ms SPA Router Navigation - 100% Full-Width Stacked Layout */}
        <div className="pt-1 w-full" style={{ display: 'flex', flexDirection: 'column' }}>
          <button
            type="button"
            onClick={() => navigate('/quran', { replace: true })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px 16px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              color: 'var(--on-accent)',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.03em',
              textTransform: 'uppercase',
              border: 'none',
              boxShadow: '0 4px 14px var(--accent-glow)',
              boxSizing: 'border-box',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="hover:opacity-95 active:scale-[0.98]"
          >
            <BookOpen
              className="stroke-[2.5]"
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
                color: 'var(--on-accent)',
              }}
            />
            Continue Reading
          </button>
          <button
            type="button"
            onClick={() => navigate('/quran-progress', { replace: true })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px 16px',
              borderRadius: '14px',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '0.82rem',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
              border: '1px solid var(--border)',
              boxSizing: 'border-box',
              marginTop: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            className="hover:bg-[var(--surface)] active:scale-[0.98]"
          >
            <TrendingUp
              className="stroke-[2.5]"
              style={{
                width: '16px',
                height: '16px',
                flexShrink: 0,
                color: 'var(--accent-text)',
              }}
            />
            View Details
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuranProgressWidget;
