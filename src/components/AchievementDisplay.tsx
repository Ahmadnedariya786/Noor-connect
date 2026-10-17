import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Star, 
  Lock, 
  Unlock, 
  Gift, 
  Flame, 
  Target, 
  Zap,
  Crown,
  Shield,
  TrendingUp,
  Award,
  CheckCircle
} from 'lucide-react';
import { quizManager } from '@/lib/quiz-manager';
import { type Achievement } from '@/data/enhanced-quiz-data';

interface AchievementDisplayProps {
  showUnlocked?: boolean;
}

export function AchievementDisplay({ showUnlocked = false }: AchievementDisplayProps) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  useEffect(() => {
    setAchievements(quizManager.getAchievements());
  }, []);

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'unlocked') return achievement.unlocked;
    if (filter === 'locked') return !achievement.unlocked;
    return true;
  });

  const getAchievementIcon = (achievement: Achievement) => {
    const iconMap: Record<string, any> = {
      '👶': Trophy,
      '💯': Star,
      '🔥': Flame,
      '⚡': Zap,
      '📖': Award,
      '🗓️': Target,
      '🎯': TrendingUp,
      '🌟': Crown,
      '📚': Shield
    };
    const IconComponent = iconMap[achievement.icon] || Trophy;
    return <IconComponent className="w-6 h-6" />;
  };

  const getRarityColor = (points: number) => {
    if (points >= 500) return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
    if (points >= 300) return 'bg-gradient-to-r from-purple-400 to-pink-500 text-white';
    if (points >= 200) return 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white';
    if (points >= 100) return 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] text-[var(--on-accent)]';
    return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white';
  };

  return (
    <div className="space-y-4">
      {/* Filter Buttons */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All ({achievements.length})
        </Button>
        <Button
          variant={filter === 'unlocked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('unlocked')}
        >
          Unlocked ({achievements.filter(a => a.unlocked).length})
        </Button>
        <Button
          variant={filter === 'locked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('locked')}
        >
          Locked ({achievements.filter(a => !a.unlocked).length})
        </Button>
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAchievements.map(achievement => (
          <Card 
            key={achievement.id} 
            className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
              achievement.unlocked ? 'bg-gradient-to-br from-primary/5 to-primary/10' : 'opacity-60'
            }`}
          >
            {/* Achievement Badge */}
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${getRarityColor(achievement.points)}`}>
              {achievement.points} XP
            </div>

            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  achievement.unlocked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                }`}>
                  {getAchievementIcon(achievement)}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {achievement.name}
                    {achievement.unlocked ? (
                      <CheckCircle className="w-4 h-4 text-[var(--success)]" />
                    ) : (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {achievement.description}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {achievement.unlocked && achievement.unlockedAt ? (
                    <span>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                  ) : (
                    <span>Not yet unlocked</span>
                  )}
                </div>
                
                {/* Progress indicator for achievements */}
                {!achievement.unlocked && (
                  <div className="text-xs text-muted-foreground">
                    {getProgressText(achievement)}
                  </div>
                )}
              </div>
            </CardContent>

            {/* Sparkle effect for unlocked achievements */}
            {achievement.unlocked && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <div className="absolute top-3 right-2 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-75" />
                <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-pulse delay-150" />
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Achievement Stats */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-medium">Achievement Progress</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {achievements.filter(a => a.unlocked).length} / {achievements.length} Unlocked
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-primary/60 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(achievements.filter(a => a.unlocked).length / achievements.length) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getProgressText(achievement: Achievement): string {
  const stats = quizManager.getStats();
  
  switch (achievement.requirement.type) {
    case 'total':
      if (achievement.requirement.value === 7) {
        return `${stats.dailyStreak}/7 days`;
      }
      return `${stats.totalGames}/${achievement.requirement.value} games`;
    case 'score':
      return `${stats.totalCorrect}/${achievement.requirement.value} correct`;
    case 'streak':
      return `${stats.bestStreak}/${achievement.requirement.value} streak`;
    case 'category': {
      const categoryCorrect = stats.categoryMastery[achievement.requirement.category!] || 0;
      return `${categoryCorrect}/${achievement.requirement.value} correct`;
    }
    case 'accuracy': {
      const accuracy = stats.totalQuestions > 0 ? (stats.totalCorrect / stats.totalQuestions) * 100 : 0;
      return `${Math.round(accuracy)}%/${achievement.requirement.value}%`;
    }
    case 'level':
      return `Level ${stats.level}/${achievement.requirement.value}`;
    default:
      return 'In progress...';
  }
}
