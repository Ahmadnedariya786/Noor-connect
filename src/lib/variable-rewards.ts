/**
 * Variable Rewards System
 * Random XP drops, surprise power-ups, unexpected rewards
 */

import { quizStore } from '@/lib/quiz-store';
import { mysteryBoxSystem } from '@/lib/mystery-box';

export interface VariableReward {
  type: 'xp_drop' | 'powerup_surprise' | 'streak_bonus' | 'lucky_find';
  amount: number;
  itemId?: string;
  message: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic';
}

// XP Drop ranges by rarity
const XP_DROPS: Record<string, { min: number; max: number }> = {
  common: { min: 10, max: 25 },
  uncommon: { min: 25, max: 50 },
  rare: { min: 50, max: 100 },
  epic: { min: 100, max: 200 }
};

// Surprise power-up drops
const SURPRISE_POWERUPS = [
  { itemId: 'hint', probability: 40, rarity: 'common' },
  { itemId: 'extra_time', probability: 30, rarity: 'common' },
  { itemId: 'fifty_fifty', probability: 20, rarity: 'uncommon' },
  { itemId: 'skip', probability: 8, rarity: 'rare' },
  { itemId: 'double_points', probability: 2, rarity: 'epic' }
];

export class VariableRewardsSystem {
  private static instance: VariableRewardsSystem;

  static getInstance(): VariableRewardsSystem {
    if (!VariableRewardsSystem.instance) {
      VariableRewardsSystem.instance = new VariableRewardsSystem();
    }
    return VariableRewardsSystem.instance;
  }

  // Random XP drop after quiz completion
  rollQuizCompletionReward(
    score: number,
    accuracy: number,
    combo: number,
    streak: number
  ): VariableReward | null {
    // Base chance: 30% for any reward
    const baseChance = 0.3;
    
    // Bonus chance based on performance
    const performanceBonus = (accuracy / 100) * 0.2; // Up to +20%
    const comboBonus = Math.min(combo / 50, 0.2); // Up to +20%
    
    const totalChance = Math.min(baseChance + performanceBonus + comboBonus, 0.8);
    
    if (Math.random() > totalChance) {
      return null; // No reward this time
    }

    // Determine rarity based on performance
    const roll = Math.random();
    let rarity: VariableReward['rarity'] = 'common';
    
    if (accuracy >= 90 && roll > 0.95) {
      rarity = 'epic';
    } else if (accuracy >= 80 && roll > 0.85) {
      rarity = 'rare';
    } else if (accuracy >= 70 && roll > 0.70) {
      rarity = 'uncommon';
    }

    // Roll between XP drop and power-up
    if (Math.random() > 0.6) {
      // XP Drop
      const xpRange = XP_DROPS[rarity];
      const xpAmount = Math.floor(Math.random() * (xpRange.max - xpRange.min + 1)) + xpRange.min;
      
      // Give XP
      quizStore.addXP(xpAmount, 'Lucky XP Drop!');
      
      return {
        type: 'xp_drop',
        amount: xpAmount,
        message: `Lucky Drop! +${xpAmount} XP`,
        icon: '✨',
        rarity
      };
    } else {
      // Surprise Power-up
      const powerup = this.rollSurprisePowerup(rarity);
      if (powerup) {
        quizStore.addToInventory(powerup.itemId, 1);
        
        return {
          type: 'powerup_surprise',
          amount: 1,
          itemId: powerup.itemId,
          message: `Surprise! You got ${powerup.name}!`,
          icon: powerup.icon,
          rarity: powerup.rarity as VariableReward['rarity']
        };
      }
    }

    return null;
  }

  // Streak milestone bonus
  checkStreakMilestone(streak: number): VariableReward | null {
    const milestones: Record<number, { xp: number; item?: string; message: string }> = {
      3: { xp: 15, message: '3 in a row! Keep going!' },
      5: { xp: 25, item: 'hint', message: '5 Streak! Here\'s a gift!' },
      7: { xp: 40, message: 'Lucky 7! You\'re on fire!' },
      10: { xp: 60, item: 'extra_time', message: '10 Streak! Amazing!' },
      15: { xp: 100, item: 'skip', message: '15 Streak! Incredible!' },
      20: { xp: 150, item: 'double_points', message: '20 Streak! UNSTOPPABLE!' },
      25: { xp: 200, item: 'freeze_time', message: '25 Streak! LEGENDARY!' },
      30: { xp: 300, item: 'perfect_round', message: '30 STREAK! YOU ARE A GOD!' }
    };

    const milestone = milestones[streak];
    if (!milestone) return null;

    // Give XP
    quizStore.addXP(milestone.xp, `${streak} Answer Streak!`);

    // Give item if applicable
    if (milestone.item) {
      quizStore.addToInventory(milestone.item, 1);
    }

    return {
      type: 'streak_bonus',
      amount: milestone.xp,
      itemId: milestone.item,
      message: milestone.message,
      icon: '🔥',
      rarity: streak >= 20 ? 'epic' : streak >= 10 ? 'rare' : 'uncommon'
    };
  }

  // Lucky find - rare random drops during gameplay
  rollLuckyFind(): VariableReward | null {
    // Very rare: 2% chance
    if (Math.random() > 0.02) return null;

    const luckyFinds = [
      { xp: 50, message: 'Lucky Find! +50 XP', icon: '🍀', rarity: 'uncommon' },
      { xp: 100, message: 'Rare Find! +100 XP', icon: '💎', rarity: 'rare' },
      { xp: 200, message: 'JACKPOT! +200 XP', icon: '🎰', rarity: 'epic' }
    ];

    const roll = Math.random();
    let find = luckyFinds[0];
    
    if (roll > 0.95) {
      find = luckyFinds[2];
    } else if (roll > 0.80) {
      find = luckyFinds[1];
    }

    quizStore.addXP(find.xp, 'Lucky Find!');

    return {
      type: 'lucky_find',
      amount: find.xp,
      message: find.message,
      icon: find.icon,
      rarity: find.rarity as VariableReward['rarity']
    };
  }

  // Mystery box bonus - extra drops
  rollMysteryBoxBonus(): VariableReward | null {
    // 10% chance for bonus item in mystery boxes
    if (Math.random() > 0.10) return null;

    const bonuses = [
      { itemId: 'hint', name: 'Bonus Hint', icon: '💡', rarity: 'common' },
      { itemId: 'extra_time', name: 'Bonus Time', icon: '⏰', rarity: 'common' },
      { itemId: 'xp_25', name: '+25 XP', icon: '✨', rarity: 'uncommon' }
    ];

    const bonus = bonuses[Math.floor(Math.random() * bonuses.length)];
    
    if (bonus.itemId === 'xp_25') {
      quizStore.addXP(25, 'Mystery Box Bonus');
    } else {
      quizStore.addToInventory(bonus.itemId, 1);
    }

    return {
      type: 'powerup_surprise',
      amount: 1,
      itemId: bonus.itemId,
      message: `Bonus: ${bonus.name}!`,
      icon: bonus.icon,
      rarity: bonus.rarity as VariableReward['rarity']
    };
  }

  // Roll surprise power-up based on rarity
  private rollSurprisePowerup(minRarity: string): { itemId: string; name: string; icon: string; rarity: string } | null {
    const available = SURPRISE_POWERUPS.filter(p => {
      const rarityValue = { common: 1, uncommon: 2, rare: 3, epic: 4 }[p.rarity] || 0;
      const minValue = { common: 1, uncommon: 2, rare: 3, epic: 4 }[minRarity] || 0;
      return rarityValue <= minValue + 1; // Allow one tier above
    });

    const totalProbability = available.reduce((sum, p) => sum + p.probability, 0);
    const roll = Math.random() * totalProbability;
    
    let cumulative = 0;
    for (const powerup of available) {
      cumulative += powerup.probability;
      if (roll <= cumulative) {
        // Get item details from store catalog
        const item = this.getItemDetails(powerup.itemId);
        if (item) {
          return { ...item, rarity: powerup.rarity };
        }
      }
    }

    return null;
  }

  private getItemDetails(itemId: string): { itemId: string; name: string; icon: string } | null {
    const items: Record<string, { name: string; icon: string }> = {
      'hint': { name: 'Hint', icon: '💡' },
      'extra_time': { name: 'Extra Time', icon: '⏰' },
      'fifty_fifty': { name: '50:50', icon: '✂️' },
      'skip': { name: 'Skip', icon: '⏭️' },
      'double_points': { name: 'Double Points', icon: '2️⃣' }
    };

    const item = items[itemId];
    return item ? { itemId, ...item } : null;
  }

  // Get rarity color for UI
  getRarityColor(rarity: VariableReward['rarity']): string {
    const colors: Record<string, string> = {
      common: 'text-slate-500',
      uncommon: 'text-[var(--accent)]',
      rare: 'text-blue-500',
      epic: 'text-purple-500'
    };
    return colors[rarity] || 'text-slate-500';
  }

  // Get rarity background color
  getRarityBg(rarity: VariableReward['rarity']): string {
    const colors: Record<string, string> = {
      common: 'bg-slate-100',
      uncommon: 'bg-[var(--accent-soft)]',
      rare: 'bg-blue-100',
      epic: 'bg-purple-100'
    };
    return colors[rarity] || 'bg-slate-100';
  }
}

export const variableRewardsSystem = VariableRewardsSystem.getInstance();
