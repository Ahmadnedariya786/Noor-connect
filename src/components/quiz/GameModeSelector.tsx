/**
 * Game Mode Selector Component
 * Allows users to choose between different quiz game modes
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { quizStore } from '@/lib/quiz-store';
import { quizManager } from '@/lib/quiz-manager';
import { QuizSession, DailyChallenge } from '@/data/quiz-store-data';
import {
  Clock,
  Flame,
  Calendar,
  Target,
  Trophy,
  Zap,
  TrendingUp,
  Star,
  ChevronRight,
  Lock,
  Sparkles,
  Timer,
  AlertCircle,
  Crown
} from 'lucide-react';

export type GameMode = 'classic' | 'timeAttack' | 'survival' | 'daily' | 'category';

interface GameModeSelectorProps {
  onSelectMode: (mode: GameMode, config?: any) => void;
  onBack: () => void;
}

interface ModeConfig {
  id: GameMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  bestScore: number;
  unlockLevel: number;
  rules: string[];
  rewards: string;
}

export function GameModeSelector({ onSelectMode, onBack }: GameModeSelectorProps) {
  const [userLevel, setUserLevel] = useState(1);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null);
  const [bestScores, setBestScores] = useState<Record<GameMode, number>>({
    classic: 0,
    timeAttack: 0,
    survival: 0,
    daily: 0,
    category: 0
  });

  useEffect(() => {
    const stats = quizManager.getStats();
    setUserLevel(stats.level);
    setDailyChallenge(quizStore.getDailyChallenge());

    // Load best scores from history
    const history = quizStore.getQuizHistory();
    const scores: Record<GameMode, number> = {
      classic: 0,
      timeAttack: 0,
      survival: 0,
      daily: 0,
      category: 0
    };

    history.forEach((session: QuizSession) => {
      if (session.score > scores[session.mode]) {
        scores[session.mode] = session.score;
      }
    });

    setBestScores(scores);
  }, []);

  const modes: ModeConfig[] = [
    {
      id: 'classic',
      name: 'Classic Quiz',
      description: 'Answer questions at your own pace. Perfect for learning!',
      icon: <Target className="w-8 h-8" />,
      color: 'text-blue-500',
      gradient: 'from-blue-500/20 to-cyan-500/20',
      bestScore: bestScores.classic,
      unlockLevel: 1,
      rules: [
        '10 questions per quiz',
        'Choose your difficulty',
        'Use power-ups freely',
        'Learn from explanations'
      ],
      rewards: 'Standard XP rewards'
    },
    {
      id: 'timeAttack',
      name: 'Time Attack',
      description: 'Race against the clock! Answer as many as you can in 2 minutes.',
      icon: <Timer className="w-8 h-8" />,
      color: 'text-orange-500',
      gradient: 'from-orange-500/20 to-red-500/20',
      bestScore: bestScores.timeAttack,
      unlockLevel: 2,
      rules: [
        '2 minute timer',
        'Unlimited questions',
        'Speed bonuses apply',
        'Combo adds time!'
      ],
      rewards: '+15 XP per question + speed bonus'
    },
    {
      id: 'survival',
      name: 'Survival Mode',
      description: 'One life, endless questions. How long can you survive?',
      icon: <Flame className="w-8 h-8" />,
      color: 'text-red-500',
      gradient: 'from-red-500/20 to-pink-500/20',
      bestScore: bestScores.survival,
      unlockLevel: 3,
      rules: [
        'One wrong answer = game over',
        'Difficulty increases',
        'Time gets shorter',
        'Exponential XP rewards!'
      ],
      rewards: 'Progressive XP (10-500 per question!)'
    },
    {
      id: 'daily',
      name: 'Daily Challenge',
      description: dailyChallenge?.description || 'A special challenge every day!',
      icon: <Calendar className="w-8 h-8" />,
      color: 'text-purple-500',
      gradient: 'from-purple-500/20 to-violet-500/20',
      bestScore: bestScores.daily,
      unlockLevel: 1,
      rules: [
        'New challenge every day',
        'Special rules apply',
        'Complete for bonus rewards',
        '7-day streak bonus!'
      ],
      rewards: '100-300 XP + power-up rewards'
    },
    {
      id: 'category',
      name: 'Category Mastery',
      description: 'Focus on your selected topics to master them completely.',
      icon: <Crown className="w-8 h-8" />,
      color: 'text-amber-500',
      gradient: 'from-amber-500/20 to-yellow-500/20',
      bestScore: bestScores.category,
      unlockLevel: 2,
      rules: [
        'Choose any topics',
        'Track mastery progress',
        'Bronze → Silver → Gold → Platinum',
        'Unlock legendary items!'
      ],
      rewards: 'Mastery badges + bonus XP'
    }
  ];

  const isUnlocked = (mode: ModeConfig) => userLevel >= mode.unlockLevel;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              Choose Game Mode
            </h1>
            <p className="text-muted-foreground mt-1">
              Select how you want to play today
            </p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modes.map((mode) => (
            <motion.div
              key={mode.id}
              whileHover={isUnlocked(mode) ? { scale: 1.02 } : {}}
              whileTap={isUnlocked(mode) ? { scale: 0.98 } : {}}
            >
              <Card
                className={`relative overflow-hidden cursor-pointer transition-all ${
                  isUnlocked(mode)
                    ? 'hover:shadow-lg hover:border-primary/50'
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => isUnlocked(mode) && onSelectMode(mode.id)}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-50`} />

                <CardContent className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl shadow-sm border border-[var(--border)] bg-[var(--surface-2)] ${mode.color}`}>
                        {mode.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{mode.name}</h3>
                          {!isUnlocked(mode) && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Lvl {mode.unlockLevel}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {mode.description}
                        </p>
                      </div>
                    </div>

                    {isUnlocked(mode) && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Stats & Rules */}
                  {isUnlocked(mode) && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Best Score */}
                      {mode.bestScore > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Trophy className="w-4 h-4 text-yellow-500" />
                          <span className="text-muted-foreground">Best:</span>
                          <span className="font-semibold">{mode.bestScore}</span>
                        </div>
                      )}

                      {/* Rules */}
                      <div className="flex flex-wrap gap-2">
                        {mode.rules.slice(0, 2).map((rule, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {rule}
                          </Badge>
                        ))}
                        {mode.rules.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{mode.rules.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Rewards */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Zap className="w-3 h-3 text-amber-500" />
                        {mode.rewards}
                      </div>
                    </div>
                  )}

                  {/* Daily Challenge Status */}
                  {mode.id === 'daily' && dailyChallenge && (
                    <div className="mt-3">
                      <Badge
                        variant={dailyChallenge.completed ? 'default' : 'secondary'}
                        className="w-full justify-center"
                      >
                        {dailyChallenge.completed ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Completed Today
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Available Now - {dailyChallenge.reward.xp} XP
                          </>
                        )}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tips */}
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-sm">Pro Tip</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Play Time Attack for quick XP farming, or try Survival Mode for high-risk,
                  high-reward gameplay. Daily Challenges offer the best value for your time!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper component for checkmark
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}
