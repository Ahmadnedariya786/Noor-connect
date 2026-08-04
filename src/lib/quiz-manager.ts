/**
 * Quiz Manager - Handles all gamification logic
 * XP, levels, achievements, streaks, and progression
 */

import { 
  QuizStats, 
  Achievement, 
  PowerUp, 
  LEVEL_THRESHOLDS, 
  ACHIEVEMENTS, 
  POWER_UPS,
  ENHANCED_QUESTIONS,
  type QuizQuestion 
} from '@/data/enhanced-quiz-data';

const QUIZ_STATS_KEY = 'enhanced-quiz-stats';
const POWER_UPS_KEY = 'quiz-power-ups';
const ACHIEVEMENTS_KEY = 'quiz-achievements';

export class QuizManager {
  private static instance: QuizManager;
  
  static getInstance(): QuizManager {
    if (!QuizManager.instance) {
      QuizManager.instance = new QuizManager();
    }
    return QuizManager.instance;
  }

  // Get user stats
  getStats(): QuizStats {
    const saved = localStorage.getItem(QUIZ_STATS_KEY);
    if (saved) {
      return { ...this.getDefaultStats(), ...JSON.parse(saved) };
    }
    return this.getDefaultStats();
  }

  private getDefaultStats(): QuizStats {
    return {
      totalGames: 0,
      totalCorrect: 0,
      totalQuestions: 0,
      currentStreak: 0,
      bestStreak: 0,
      xp: 0,
      level: 1,
      achievements: [],
      categoryMastery: {},
      lastPlayed: '',
      dailyStreak: 0,
      longestDailyStreak: 0,
      lastDailyPlay: ''
    };
  }

  // Update stats after quiz completion
  updateStats(
    score: number, 
    totalQuestions: number, 
    categoryAnswers: Record<string, { correct: number; total: number }>,
    streak: number,
    xpOverride?: number
  ): QuizStats {
    const stats = this.getStats();
    
    // Update basic stats
    stats.totalGames += 1;
    stats.totalCorrect += score;
    stats.totalQuestions += totalQuestions;
    stats.currentStreak = streak;
    stats.bestStreak = Math.max(stats.bestStreak, streak);
    stats.lastPlayed = new Date().toISOString();
    
    // Calculate XP earned (use override if provided, e.g. from quizStore.addXP with boosters)
    const xpEarned = xpOverride !== undefined ? xpOverride : this.calculateXPEarned(score, totalQuestions, streak);
    stats.xp += xpEarned;
    
    // Update level
    const newLevel = this.calculateLevel(stats.xp);
    stats.level = newLevel.level;
    
    // Update category mastery
    Object.entries(categoryAnswers).forEach(([category, answers]) => {
      const mastery = (answers.correct / answers.total) * 100;
      stats.categoryMastery[category] = Math.round(mastery);
    });
    
    // Update daily streak
    this.updateDailyStreak(stats);
    
    // Save stats
    localStorage.setItem(QUIZ_STATS_KEY, JSON.stringify(stats));
    
    // Check for new achievements
    this.checkAchievements(stats);
    
    return stats;
  }

  private calculateXPEarned(score: number, totalQuestions: number, streak: number): number {
    let xp = score * 10; // Base XP per correct answer
    
    // Streak bonus
    xp += streak * 5;
    
    // Perfect score bonus
    if (score === totalQuestions) {
      xp += 50;
    }
    
    // Accuracy bonus
    const accuracy = (score / totalQuestions) * 100;
    if (accuracy >= 90) xp += 30;
    else if (accuracy >= 80) xp += 20;
    else if (accuracy >= 70) xp += 10;
    
    return xp;
  }

  private calculateLevel(xp: number): { level: number; title: string } {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i].xp) {
        return {
          level: LEVEL_THRESHOLDS[i].level,
          title: LEVEL_THRESHOLDS[i].title
        };
      }
    }
    return { level: 1, title: 'Beginner' };
  }

  private updateDailyStreak(stats: QuizStats): void {
    const today = new Date().toDateString();
    const lastPlay = stats.lastDailyPlay ? new Date(stats.lastDailyPlay).toDateString() : '';
    
    if (today === lastPlay) {
      // Already played today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastPlay === yesterday.toDateString()) {
      // Consecutive day
      stats.dailyStreak += 1;
      stats.longestDailyStreak = Math.max(stats.longestDailyStreak, stats.dailyStreak);
    } else {
      // Streak broken
      stats.dailyStreak = 1;
    }
    
    stats.lastDailyPlay = today;
  }

  private checkAchievements(stats: QuizStats): Achievement[] {
    const unlockedAchievements: Achievement[] = [];
    const currentAchievements = this.getAchievements();
    
    ACHIEVEMENTS.forEach(achievement => {
      if (currentAchievements.find(a => a.id === achievement.id)?.unlocked) {
        return; // Already unlocked
      }
      
      let unlocked = false;
      
      switch (achievement.requirement.type) {
        case 'total':
          if (achievement.requirement.value === 7) {
            unlocked = stats.dailyStreak >= 7;
          } else {
            unlocked = stats.totalGames >= achievement.requirement.value;
          }
          break;
          
        case 'score':
          unlocked = stats.totalCorrect >= achievement.requirement.value;
          break;
          
        case 'streak':
          unlocked = stats.bestStreak >= achievement.requirement.value;
          break;
          
        case 'category': {
          const categoryCorrect = stats.categoryMastery[achievement.requirement.category!] || 0;
          unlocked = categoryCorrect >= achievement.requirement.value;
          break;
        }
          
        case 'accuracy':
          if (stats.totalQuestions > 0) {
            const accuracy = (stats.totalCorrect / stats.totalQuestions) * 100;
            unlocked = accuracy >= achievement.requirement.value;
          }
          break;
          
        case 'level':
          unlocked = stats.level >= achievement.requirement.value;
          break;
      }
      
      if (unlocked) {
        const updatedAchievement = {
          ...achievement,
          unlocked: true,
          unlockedAt: new Date().toISOString()
        };
        
        currentAchievements.push(updatedAchievement);
        unlockedAchievements.push(updatedAchievement);
        
        // Add achievement points to XP
        stats.xp += achievement.points;
      }
    });
    
    // Save achievements
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(currentAchievements));
    
    return unlockedAchievements;
  }

  // Get all achievements
  getAchievements(): Achievement[] {
    const saved = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (saved) {
      const savedAchievements = JSON.parse(saved);
      return ACHIEVEMENTS.map(achievement => {
        const saved = savedAchievements.find((a: Achievement) => a.id === achievement.id);
        return saved || achievement;
      });
    }
    return ACHIEVEMENTS;
  }

  // Get power-ups
  getPowerUps(): PowerUp[] {
    const saved = localStorage.getItem(POWER_UPS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
    return POWER_UPS.map(p => ({ ...p }));
  }

  // Use power-up
  usePowerUp(powerUpId: string): boolean {
    const powerUps = this.getPowerUps();
    const powerUp = powerUps.find(p => p.id === powerUpId);
    
    if (powerUp && powerUp.uses > 0) {
      powerUp.uses -= 1;
      localStorage.setItem(POWER_UPS_KEY, JSON.stringify(powerUps));
      return true;
    }
    
    return false;
  }

  // Add power-up uses (reward system)
  addPowerUpUses(powerUpId: string, uses: number): void {
    const powerUps = this.getPowerUps();
    const powerUp = powerUps.find(p => p.id === powerUpId);
    
    if (powerUp) {
      powerUp.uses = Math.min(powerUp.uses + uses, powerUp.maxUses);
      localStorage.setItem(POWER_UPS_KEY, JSON.stringify(powerUps));
    }
  }

  // Get questions for specific categories and difficulty
  getQuestions(categories?: string[], difficulty?: string, count: number = 10): QuizQuestion[] {
    let filtered = ENHANCED_QUESTIONS;
    
    if (categories && categories.length > 0) {
      filtered = filtered.filter(q => categories.includes(q.category));
    }
    
    if (difficulty) {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }
    
    // Shuffle and take requested count
    return filtered
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(count, filtered.length));
  }

  // Get level progress
  getLevelProgress(): { current: number; next: number; progress: number; remaining: number } {
    const stats = this.getStats();
    const currentLevel = LEVEL_THRESHOLDS.find(l => l.level === stats.level);
    const nextLevel = LEVEL_THRESHOLDS.find(l => l.level === stats.level + 1);
    
    if (!currentLevel) return { current: 0, next: 100, progress: 0, remaining: 100 };
    if (!nextLevel) return { current: currentLevel.xp, next: currentLevel.xp, progress: 100, remaining: 0 };
    
    const currentXP = stats.xp - currentLevel.xp;
    const neededXP = nextLevel.xp - currentLevel.xp;
    const progress = (currentXP / neededXP) * 100;
    
    return {
      current: currentXP,
      next: neededXP,
      progress: Math.min(100, Math.max(0, progress)),
      remaining: Math.max(0, neededXP - currentXP)
    };
  }

  // Reset all stats (for testing)
  resetStats(): void {
    localStorage.removeItem(QUIZ_STATS_KEY);
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    localStorage.removeItem(POWER_UPS_KEY);
  }
}

export const quizManager = QuizManager.getInstance();
