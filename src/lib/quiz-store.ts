/**
 * Quiz Store Manager - Handles inventory, purchases, and XP economy
 * Users spend XP to buy power-ups and boosters
 */

import {
  StoreItem,
  UserInventory,
  PurchaseRecord,
  StoreState,
  DailyReward,
  DailyRewardStatus,
  ComboState,
  QuizSession,
  DailyChallenge,
  XPTransaction,
  STORAGE_KEYS,
  ActiveBooster
} from '@/data/quiz-store-data';
import { ALL_STORE_ITEMS, getStoreItemById, meetsRequirements } from '@/data/store-catalog';
import { QuizStats, LEVEL_THRESHOLDS } from '@/data/enhanced-quiz-data';
import { quizManager } from './quiz-manager';

export class QuizStore {
  private static instance: QuizStore;

  static getInstance(): QuizStore {
    if (!QuizStore.instance) {
      QuizStore.instance = new QuizStore();
    }
    return QuizStore.instance;
  }

  // ==================== INVENTORY ====================

  getInventory(): UserInventory {
    const saved = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (saved) {
      return { ...this.getDefaultInventory(), ...JSON.parse(saved) };
    }
    return this.getDefaultInventory();
  }

  private getDefaultInventory(): UserInventory {
    return {
      items: {},
      activeBoosters: []
    };
  }

  private saveInventory(inventory: UserInventory): void {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inventory));
  }

  // Get quantity of specific item in inventory
  getItemQuantity(itemId: string): number {
    const inventory = this.getInventory();
    return inventory.items[itemId] || 0;
  }

  // Add items to inventory (from purchase or rewards)
  addToInventory(itemId: string, quantity: number = 1): boolean {
    const item = getStoreItemById(itemId);
    if (!item) return false;

    const inventory = this.getInventory();
    const currentQty = inventory.items[itemId] || 0;
    const newQty = Math.min(currentQty + quantity, item.maxInventory);

    inventory.items[itemId] = newQty;
    this.saveInventory(inventory);
    return true;
  }

  // Remove item from inventory (when used)
  removeFromInventory(itemId: string, quantity: number = 1): boolean {
    const inventory = this.getInventory();
    const currentQty = inventory.items[itemId] || 0;

    if (currentQty < quantity) return false;

    inventory.items[itemId] = currentQty - quantity;
    if (inventory.items[itemId] === 0) {
      delete inventory.items[itemId];
    }

    this.saveInventory(inventory);
    return true;
  }

  // Use an item from inventory
  useItem(itemId: string): boolean {
    const item = getStoreItemById(itemId);
    if (!item) return false;

    // Handle boosters differently
    if (item.type === 'booster') {
      return this.activateBooster(itemId);
    }

    return this.removeFromInventory(itemId, 1);
  }

  // ==================== STORE STATE & PURCHASES ====================

  getStoreState(): StoreState {
    const saved = localStorage.getItem(STORAGE_KEYS.STORE_STATE);
    if (saved) {
      return { ...this.getDefaultStoreState(), ...JSON.parse(saved) };
    }
    return this.getDefaultStoreState();
  }

  private getDefaultStoreState(): StoreState {
    return {
      inventory: this.getDefaultInventory(),
      purchaseHistory: [],
      totalSpent: 0
    };
  }

  private saveStoreState(state: StoreState): void {
    localStorage.setItem(STORAGE_KEYS.STORE_STATE, JSON.stringify(state));
  }

  // Get all store items with user's current inventory status
  getStoreItems(): (StoreItem & { owned: number; canAfford: boolean; unlocked: boolean })[] {
    const stats = quizManager.getStats();
    const achievements = stats.achievements || [];
    const inventory = this.getInventory();
    const currentXP = stats.xp;

    return ALL_STORE_ITEMS.map(item => {
      const owned = inventory.items[item.id] || 0;
      const canAfford = currentXP >= item.cost;
      const unlocked = meetsRequirements(item, stats.level, achievements, stats.categoryMastery);

      return {
        ...item,
        owned,
        canAfford,
        unlocked
      };
    });
  }

  // Purchase item with XP
  purchaseItem(itemId: string): { success: boolean; message?: string } {
    const item = getStoreItemById(itemId);
    if (!item) {
      return { success: false, message: 'Item not found' };
    }

    // Check requirements
    const stats = quizManager.getStats();
    if (!meetsRequirements(item, stats.level, stats.achievements, stats.categoryMastery)) {
      return { success: false, message: 'Requirements not met' };
    }

    // Check inventory space
    const currentQty = this.getItemQuantity(itemId);
    if (currentQty >= item.maxInventory) {
      return { success: false, message: 'Maximum inventory reached' };
    }

    // Check if user can afford
    if (stats.xp < item.cost) {
      return { success: false, message: 'Not enough XP' };
    }

    // Spend XP
    const spent = this.spendXP(item.cost, `Purchase: ${item.name}`);
    if (!spent) {
      return { success: false, message: 'Failed to spend XP' };
    }

    // Add to inventory
    this.addToInventory(itemId, item.quantity);

    // Record purchase
    this.recordPurchase(item);

    return { success: true, message: `Purchased ${item.name}!` };
  }

  // Record purchase in history
  private recordPurchase(item: StoreItem): void {
    const state = this.getStoreState();
    const record: PurchaseRecord = {
      itemId: item.id,
      itemName: item.name,
      cost: item.cost,
      quantity: item.quantity,
      purchasedAt: new Date().toISOString()
    };

    state.purchaseHistory.unshift(record);
    state.totalSpent += item.cost;

    // Keep only last 50 purchases
    if (state.purchaseHistory.length > 50) {
      state.purchaseHistory = state.purchaseHistory.slice(0, 50);
    }

    this.saveStoreState(state);
  }

  // Get purchase history
  getPurchaseHistory(): PurchaseRecord[] {
    return this.getStoreState().purchaseHistory;
  }

  // ==================== XP MANAGEMENT ====================

  // Spend XP (returns true if successful)
  spendXP(amount: number, reason: string): boolean {
    const stats = quizManager.getStats();
    if (stats.xp < amount) return false;

    // Update stats
    stats.xp -= amount;
    localStorage.setItem('enhanced-quiz-stats', JSON.stringify(stats));

    // Record transaction
    this.recordXPTransaction(-amount, 'spent', reason);

    return true;
  }

  // Add XP (from quiz completion, achievements, etc.)
  addXP(amount: number, source: string): number {
    const stats = quizManager.getStats();

    // Apply booster effects
    const boosters = this.getActiveBoosters();
    let multiplier = 1;

    boosters.forEach(booster => {
      if (booster.effect.type === 'xpBonus') {
        multiplier += booster.effect.value;
      }
    });

    const finalAmount = Math.round(amount * multiplier);
    stats.xp += finalAmount;

    // Check for level up
    const newLevel = this.calculateLevel(stats.xp);
    const leveledUp = newLevel.level > stats.level;
    stats.level = newLevel.level;

    // Save stats
    localStorage.setItem('enhanced-quiz-stats', JSON.stringify(stats));

    // Record transaction
    this.recordXPTransaction(finalAmount, 'earned', source);

    return finalAmount;
  }

  // Calculate level based on XP
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

  // Record XP transaction
  private recordXPTransaction(amount: number, type: 'earned' | 'spent', source: string): void {
    const saved = localStorage.getItem(STORAGE_KEYS.XP_TRANSACTIONS);
    const transactions: XPTransaction[] = saved ? JSON.parse(saved) : [];

    const stats = quizManager.getStats();
    const transaction: XPTransaction = {
      id: `xp_${Date.now()}`,
      amount: Math.abs(amount),
      type,
      source,
      timestamp: new Date().toISOString(),
      balanceAfter: stats.xp
    };

    transactions.unshift(transaction);

    // Keep only last 100 transactions
    if (transactions.length > 100) {
      transactions.pop();
    }

    localStorage.setItem(STORAGE_KEYS.XP_TRANSACTIONS, JSON.stringify(transactions));
  }

  // Get XP transaction history
  getXPTransactions(): XPTransaction[] {
    const saved = localStorage.getItem(STORAGE_KEYS.XP_TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  }

  // ==================== BOOSTERS ====================

  activateBooster(itemId: string): boolean {
    const item = getStoreItemById(itemId);
    if (!item || item.type !== 'booster' || !item.effect?.duration) return false;

    // Remove from inventory
    if (!this.removeFromInventory(itemId, 1)) return false;

    const inventory = this.getInventory();

    // Add to active boosters
    const now = new Date();
    const expiresAt = new Date(now.getTime() + item.effect.duration * 1000);

    const booster: ActiveBooster = {
      itemId,
      activatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      effect: {
        type: item.effect.type,
        value: item.effect.value
      }
    };

    inventory.activeBoosters.push(booster);
    this.saveInventory(inventory);

    return true;
  }

  getActiveBoosters(): ActiveBooster[] {
    const inventory = this.getInventory();
    const now = new Date();

    // Filter out expired boosters
    const active = inventory.activeBoosters.filter(
      booster => new Date(booster.expiresAt) > now
    );

    // Save if any were removed
    if (active.length !== inventory.activeBoosters.length) {
      inventory.activeBoosters = active;
      this.saveInventory(inventory);
    }

    return active;
  }

  // Check if specific effect is active
  isEffectActive(effectType: string): boolean {
    return this.getActiveBoosters().some(b => b.effect.type === effectType);
  }

  // Get effect value if active
  getEffectValue(effectType: string): number {
    const booster = this.getActiveBoosters().find(b => b.effect.type === effectType);
    return booster ? booster.effect.value : 0;
  }

  // ==================== DAILY REWARDS ====================

  getDailyRewardStatus(): DailyRewardStatus {
    const saved = localStorage.getItem(STORAGE_KEYS.DAILY_REWARDS);
    const today = new Date().toDateString();

    let status: DailyRewardStatus;
    if (saved) {
      status = JSON.parse(saved);
    } else {
      status = this.createDefaultDailyRewards();
    }

    // Check if streak is broken
    const lastClaim = status.lastClaimDate ? new Date(status.lastClaimDate) : null;
    if (lastClaim) {
      const daysDiff = Math.round(
        (new Date(today).getTime() - lastClaim.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If more than 1 day passed and no streak freeze used, reset streak
      if (daysDiff > 1) {
        // Check for streak freeze in inventory
        const streakFreezes = this.getItemQuantity('streak_freeze');
        if (streakFreezes > 0) {
          // Use streak freeze
          this.removeFromInventory('streak_freeze', 1);
        } else {
          status.rewards = this.createDefaultDailyRewards().rewards;
          status.currentStreak = 0;
        }
      }
    }

    // If completed 7 days previously and it's a new day, start new cycle
    if (status.currentStreak >= 7 && status.lastClaimDate !== today) {
      status.rewards = this.createDefaultDailyRewards().rewards;
      status.currentStreak = 0;
    }

    // Check if can claim today
    const todayReward = status.rewards.find(r => r.day === status.currentStreak + 1);
    
    if (status.lastClaimDate === today) {
      status.canClaimToday = false;
    } else if (todayReward) {
      status.canClaimToday = true;
    } else {
      status.canClaimToday = false;
    }
    
    status.nextReward = status.canClaimToday ? todayReward : null;

    // Save updated status
    localStorage.setItem(STORAGE_KEYS.DAILY_REWARDS, JSON.stringify(status));

    return status;
  }

  private createDefaultDailyRewards(): DailyRewardStatus {
    const rewards: DailyReward[] = [
      { day: 1, xp: 50, claimed: false },
      { day: 2, xp: 75, items: [{ itemId: 'fifty_fifty', quantity: 1 }], claimed: false },
      { day: 3, xp: 100, items: [{ itemId: 'hint', quantity: 2 }], claimed: false },
      { day: 4, xp: 125, items: [{ itemId: 'extra_time', quantity: 1 }], claimed: false },
      { day: 5, xp: 150, items: [{ itemId: 'skip', quantity: 1 }], claimed: false },
      { day: 6, xp: 200, items: [{ itemId: 'double_points', quantity: 1 }], claimed: false },
      { day: 7, xp: 300, items: [{ itemId: 'perfect_round', quantity: 1 }], claimed: false }
    ];

    return {
      currentStreak: 0,
      lastClaimDate: null,
      rewards,
      canClaimToday: true,
      nextReward: rewards[0]
    };
  }

  claimDailyReward(): { success: boolean; reward?: DailyReward; message?: string } {
    const status = this.getDailyRewardStatus();
    const today = new Date().toDateString();

    if (!status.canClaimToday) {
      return { success: false, message: 'Already claimed today' };
    }

    const reward = status.rewards.find(r => r.day === status.currentStreak + 1);
    if (!reward) {
      return { success: false, message: 'No reward available' };
    }

    // Mark as claimed
    reward.claimed = true;
    reward.claimDate = today;

    // Update streak
    status.currentStreak = reward.day;
    status.lastClaimDate = today;

    // Give rewards
    if (reward.xp > 0) {
      this.addXP(reward.xp, 'Daily Reward Day ' + reward.day);
    }

    if (reward.items) {
      reward.items.forEach(item => {
        this.addToInventory(item.itemId, item.quantity);
      });
    }

    // Check for 7-day completion bonus
    if (status.currentStreak === 7) {
      // Bonus XP for completing week
      this.addXP(500, 'Weekly Streak Complete!');
      // It will reset to day 1 naturally tomorrow via getDailyRewardStatus
    }

    // Update next reward
    status.nextReward = null;
    status.canClaimToday = false;

    localStorage.setItem(STORAGE_KEYS.DAILY_REWARDS, JSON.stringify(status));

    return { success: true, reward };
  }

  // ==================== COMBO SYSTEM ====================

  getComboState(): ComboState {
    const saved = localStorage.getItem(STORAGE_KEYS.COMBO_STATE);
    if (saved) {
      return { ...this.getDefaultComboState(), ...JSON.parse(saved) };
    }
    return this.getDefaultComboState();
  }

  private getDefaultComboState(): ComboState {
    return {
      currentCombo: 0,
      maxCombo: 0,
      comboMultiplier: 1,
      lastAnswerTime: 0,
      isActive: false
    };
  }

  private saveComboState(state: ComboState): void {
    localStorage.setItem(STORAGE_KEYS.COMBO_STATE, JSON.stringify(state));
  }

  updateCombo(isCorrect: boolean): ComboState {
    const state = this.getComboState();

    if (isCorrect) {
      state.currentCombo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.currentCombo);
      state.isActive = true;
      state.lastAnswerTime = Date.now();

      // Calculate multiplier: every 3 correct = +0.1x, max 3x
      const multiplierBonus = Math.floor(state.currentCombo / 3) * 0.1;
      state.comboMultiplier = Math.min(1 + multiplierBonus, 3);

      // Check for combo rewards
      this.checkComboRewards(state.currentCombo);
    } else {
      // Check for streak protection
      const hasProtection = this.isEffectActive('streakProtection');
      if (hasProtection) {
        // Protection used, but combo still breaks
        state.currentCombo = 0;
        state.comboMultiplier = 1;
        state.isActive = false;
        // Remove one-time protection
        const inventory = this.getInventory();
        inventory.activeBoosters = inventory.activeBoosters.filter(
          b => b.effect.type !== 'streakProtection'
        );
        this.saveInventory(inventory);
      } else {
        state.currentCombo = 0;
        state.comboMultiplier = 1;
        state.isActive = false;
      }
    }

    this.saveComboState(state);
    return state;
  }

  private checkComboRewards(combo: number): void {
    // Every 10 combo = free random power-up
    if (combo % 10 === 0) {
      const basicItems = ALL_STORE_ITEMS.filter(i => i.category === 'basic');
      const randomItem = basicItems[Math.floor(Math.random() * basicItems.length)];
      this.addToInventory(randomItem.id, 1);
    }

    // Streak rewards
    const streakRewards: Record<number, { xp: number; item?: string }> = {
      5: { xp: 10 },
      10: { xp: 25, item: 'hint' },
      15: { xp: 50, item: 'skip' },
      20: { xp: 100 }
    };

    const reward = streakRewards[combo];
    if (reward) {
      this.addXP(reward.xp, `${combo} Answer Streak!`);
      if (reward.item) {
        this.addToInventory(reward.item, 1);
      }
    }
  }

  resetCombo(): void {
    this.saveComboState(this.getDefaultComboState());
  }

  getCurrentMultiplier(): number {
    return this.getComboState().comboMultiplier;
  }

  // ==================== QUIZ HISTORY ====================

  saveQuizSession(session: QuizSession): void {
    const saved = localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
    const history: QuizSession[] = saved ? JSON.parse(saved) : [];

    history.unshift(session);

    // Keep only last 50 sessions
    if (history.length > 50) {
      history.pop();
    }

    localStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(history));
  }

  getQuizHistory(): QuizSession[] {
    const saved = localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
    return saved ? JSON.parse(saved) : [];
  }

  getQuizHistoryByMode(mode: QuizSession['mode']): QuizSession[] {
    return this.getQuizHistory().filter(s => s.mode === mode);
  }

  getBestScore(mode: QuizSession['mode']): number {
    const history = this.getQuizHistoryByMode(mode);
    return history.reduce((best, session) => Math.max(best, session.score), 0);
  }

  // ==================== DAILY CHALLENGES ====================

  getDailyChallenge(): DailyChallenge {
    const saved = localStorage.getItem(STORAGE_KEYS.DAILY_CHALLENGE);
    const today = new Date().toDateString();

    if (saved) {
      const challenge: DailyChallenge = JSON.parse(saved);
      // Check if it's a new day
      if (new Date(challenge.date).toDateString() === today) {
        return challenge;
      }
    }

    // Generate new challenge
    const newChallenge = this.generateDailyChallenge();
    localStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE, JSON.stringify(newChallenge));
    return newChallenge;
  }

  private generateDailyChallenge(): DailyChallenge {
    const today = new Date();
    const types: DailyChallenge['type'][] = ['category', 'speedRun', 'noPowerups', 'hardMode', 'mystery'];
    const categories = ['quran', 'prophets', 'prayer', 'pillars', 'history', 'ramadan'];

    // Use date to deterministically pick challenge
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
    );
    const type = types[dayOfYear % types.length];
    const category = categories[dayOfYear % categories.length];

    const challengeConfigs: Record<DailyChallenge['type'], Partial<DailyChallenge>> = {
      category: {
        title: 'Category Focus',
        description: `Answer 10 questions about ${category}`,
        rules: { category, questionCount: 10, allowPowerups: true }
      },
      speedRun: {
        title: 'Speed Run',
        description: 'Answer 20 questions as fast as possible!',
        rules: { questionCount: 20, timeLimit: 180, allowPowerups: true }
      },
      noPowerups: {
        title: 'Pure Knowledge',
        description: 'Test your knowledge without any power-ups! 2x XP reward.',
        rules: { questionCount: 15, allowPowerups: false }
      },
      hardMode: {
        title: 'Hard Mode',
        description: 'Only hard questions! 3x XP reward.',
        rules: { questionCount: 10, difficulty: 'hard', allowPowerups: true }
      },
      mystery: {
        title: 'Mystery Mix',
        description: 'Random categories and difficulties!',
        rules: { questionCount: 15, difficulty: 'mixed', allowPowerups: true }
      }
    };

    const config = challengeConfigs[type];

    return {
      id: `challenge_${today.toISOString().split('T')[0]}`,
      date: today.toISOString(),
      type,
      title: config.title!,
      description: config.description!,
      rules: {
        questionCount: 10,
        allowPowerups: true,
        ...config.rules
      },
      reward: {
        xp: type === 'hardMode' ? 300 : type === 'noPowerups' ? 200 : 100,
        item: { itemId: 'hint', quantity: 1 }
      },
      completed: false
    };
  }

  completeDailyChallenge(): void {
    const challenge = this.getDailyChallenge();
    if (challenge.completed) return;

    challenge.completed = true;
    challenge.completedAt = new Date().toISOString();

    // Give rewards
    this.addXP(challenge.reward.xp, 'Daily Challenge Complete!');
    if (challenge.reward.item) {
      this.addToInventory(challenge.reward.item.itemId, challenge.reward.item.quantity);
    }

    localStorage.setItem(STORAGE_KEYS.DAILY_CHALLENGE, JSON.stringify(challenge));
  }

  // ==================== UTILITY ====================

  // Get user's total XP spent and earned
  getXPSummary(): { earned: number; spent: number; current: number } {
    const transactions = this.getXPTransactions();
    const earned = transactions
      .filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.amount, 0);
    const spent = transactions
      .filter(t => t.type === 'spent')
      .reduce((sum, t) => sum + t.amount, 0);
    const stats = quizManager.getStats();

    return { earned, spent, current: stats.xp };
  }

  // Reset all store data (for testing)
  resetStore(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const quizStore = QuizStore.getInstance();
