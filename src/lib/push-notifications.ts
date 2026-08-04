/**
 * Push Notification System
 * Strategic notifications for retention and engagement
 */

import { quizStore } from '@/lib/quiz-store';
import { quizManager } from '@/lib/quiz-manager';
import { livesSystem } from '@/lib/lives-system';
import { timeEventsSystem } from '@/lib/time-events';
import { mysteryBoxSystem } from '@/lib/mystery-box';

const NOTIFICATION_SETTINGS_KEY = 'quiz-notification-settings';
const LAST_NOTIFICATION_KEY = 'quiz-last-notifications';

export interface NotificationSettings {
  dailyReward: boolean;
  streakWarning: boolean;
  livesRefill: boolean;
  events: boolean;
  achievements: boolean;
  friendActivity: boolean;
  enabled: boolean;
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  data?: any;
  timestamp: number;
}

export class PushNotificationSystem {
  private static instance: PushNotificationSystem;

  static getInstance(): PushNotificationSystem {
    if (!PushNotificationSystem.instance) {
      PushNotificationSystem.instance = new PushNotificationSystem();
    }
    return PushNotificationSystem.instance;
  }

  private getSettings(): NotificationSettings {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
    }
    return this.getDefaultSettings();
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      dailyReward: true,
      streakWarning: true,
      livesRefill: true,
      events: true,
      achievements: true,
      friendActivity: false,
      enabled: true
    };
  }

  saveSettings(settings: Partial<NotificationSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
  }

  // Check if notifications are enabled
  isEnabled(): boolean {
    return this.getSettings().enabled;
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      this.saveSettings({ enabled: true });
      
      // Send welcome notification
      this.send({
        id: 'welcome',
        title: '🎉 Welcome!',
        body: 'You\'ll now receive quiz reminders and rewards notifications.',
        icon: '📚',
        timestamp: Date.now()
      });
      
      return true;
    }
    
    return false;
  }

  // Send a notification
  send(notification: PushNotification): void {
    if (!this.isEnabled()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Check if similar notification was sent recently (prevent spam)
    if (this.wasRecentlySent(notification.tag || notification.id, 30 * 60 * 1000)) {
      return; // Don't send if similar notification sent in last 30 min
    }

    // Show notification
    const notifOptions: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge,
      tag: notification.tag || notification.id,
      requireInteraction: notification.requireInteraction,
      data: notification.data
    };
    
    // Add actions only if supported
    if (notification.actions && 'actions' in Notification.prototype) {
      (notifOptions as any).actions = notification.actions;
    }
    
    new Notification(notification.title, notifOptions);

    // Record that we sent this
    this.recordNotification(notification);
  }

  // Check if similar notification was recently sent
  private wasRecentlySent(tag: string, windowMs: number): boolean {
    const history = this.getNotificationHistory();
    const recent = history.find(n => n.tag === tag && Date.now() - n.timestamp < windowMs);
    return !!recent;
  }

  // Get notification history
  private getNotificationHistory(): Array<{ tag: string; timestamp: number }> {
    const saved = localStorage.getItem(LAST_NOTIFICATION_KEY);
    return saved ? JSON.parse(saved) : [];
  }

  // Record notification sent
  private recordNotification(notification: PushNotification): void {
    const history = this.getNotificationHistory();
    history.push({
      tag: notification.tag || notification.id,
      timestamp: Date.now()
    });

    // Keep only last 50
    if (history.length > 50) {
      history.shift();
    }

    localStorage.setItem(LAST_NOTIFICATION_KEY, JSON.stringify(history));
  }

  // ===== STRATEGIC NOTIFICATIONS =====

  // 1. Daily Reward Expiring
  sendDailyRewardReminder(): void {
    if (!this.getSettings().dailyReward) return;

    const dailyStatus = quizStore.getDailyRewardStatus();
    if (!dailyStatus.canClaimToday) return;

    this.send({
      id: 'daily-reward',
      title: '🎁 Daily Reward Waiting!',
      body: 'Claim your free XP and power-ups before midnight!',
      icon: '🎁',
      tag: 'daily-reward',
      timestamp: Date.now()
    });
  }

  // 2. Streak Warning (Loss Aversion)
  sendStreakWarning(): void {
    if (!this.getSettings().streakWarning) return;

    const dailyStatus = quizStore.getDailyRewardStatus();
    const hoursLeft = this.getHoursUntilMidnight();

    if (dailyStatus.canClaimToday && hoursLeft <= 4 && hoursLeft > 0) {
      this.send({
        id: 'streak-warning',
        title: '⚠️ Streak in Danger!',
        body: `Your ${dailyStatus.currentStreak}-day streak expires in ${hoursLeft} hours! Play now to save it.`,
        icon: '🔥',
        tag: 'streak-warning',
        requireInteraction: true,
        timestamp: Date.now()
      });
    }
  }

  // 3. Lives Refilled
  sendLivesRefilled(): void {
    if (!this.getSettings().livesRefill) return;

    const lives = livesSystem.getCurrentLives();
    const maxLives = livesSystem.getMaxLives();

    if (lives >= maxLives) {
      this.send({
        id: 'lives-refilled',
        title: '❤️ Lives Full!',
        body: 'Your lives are refilled. Ready to play?',
        icon: '❤️',
        tag: 'lives-refilled',
        timestamp: Date.now()
      });
    }
  }

  // 4. Lives Running Low (Critical)
  sendLivesCritical(): void {
    if (!this.getSettings().livesRefill) return;

    const lives = livesSystem.getCurrentLives();
    const timeUntilNext = livesSystem.getTimeUntilNextLife();

    if (lives === 1) {
      this.send({
        id: 'lives-critical',
        title: '💔 Last Life!',
        body: `You have 1 life left. Next life in ${timeUntilNext}. Don't lose your progress!`,
        icon: '💔',
        tag: 'lives-critical',
        requireInteraction: true,
        timestamp: Date.now()
      });
    }
  }

  // 5. Event Starting
  sendEventStarting(): void {
    if (!this.getSettings().events) return;

    const event = timeEventsSystem.getActiveEvent();
    if (!event) return;

    // Only send once per event
    if (this.wasRecentlySent(`event-${event.id}`, 24 * 60 * 60 * 1000)) return;

    this.send({
      id: 'event-start',
      title: `${event.icon} ${event.title} is LIVE!`,
      body: `${event.multiplier}x XP active now! ${event.description}`,
      icon: event.icon,
      tag: `event-${event.id}`,
      timestamp: Date.now()
    });
  }

  // 6. Event Ending Soon
  sendEventEnding(): void {
    if (!this.getSettings().events) return;

    const urgency = timeEventsSystem.getUrgencyMessage();
    if (!urgency) return;

    this.send({
      id: 'event-ending',
      title: '⏰ Event Ending Soon!',
      body: urgency,
      icon: '⏰',
      tag: 'event-ending',
      requireInteraction: true,
      timestamp: Date.now()
    });
  }

  // 7. Mystery Box Available
  sendMysteryBoxReady(): void {
    if (!mysteryBoxSystem.canClaimDailyBox()) return;

    // Only send if not claimed for 20+ hours
    this.send({
      id: 'mystery-box',
      title: '🎁 Free Mystery Box!',
      body: 'Your daily free mystery box is ready! Open it for random rewards.',
      icon: '🎁',
      tag: 'mystery-box',
      timestamp: Date.now()
    });
  }

  // 8. Achievement Close
  sendAchievementClose(): void {
    if (!this.getSettings().achievements) return;

    const stats = quizStore.getXPSummary();
    const levelProgress = quizManager.getLevelProgress();

    if (levelProgress.remaining <= 100) {
      this.send({
        id: 'level-up-close',
        title: '🏆 Level Up Imminent!',
        body: `Only ${levelProgress.remaining} XP to next level! Play one more quiz to level up.`,
        icon: '🏆',
        tag: 'level-up-close',
        timestamp: Date.now()
      });
    }
  }

  // 9. Flash Sale Alert
  sendFlashSale(): void {
    const event = timeEventsSystem.getActiveEvent();
    if (event?.type === 'flash_sale') {
      this.send({
        id: 'flash-sale',
        title: '⚡ FLASH SALE!',
        body: `${event.storeDiscount}% OFF all store items! Limited time only!`,
        icon: '⚡',
        tag: 'flash-sale',
        requireInteraction: true,
        timestamp: Date.now()
      });
    }
  }

  // 10. Come Back After Absence
  sendComeBack(): void {
    const lastPlayed = localStorage.getItem('quiz-last-played');
    if (!lastPlayed) return;

    const daysSince = (Date.now() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince >= 3 && daysSince < 4) {
      this.send({
        id: 'come-back',
        title: '😢 We Miss You!',
        body: 'Come back and claim your daily rewards! Your streak is waiting...',
        icon: '😢',
        tag: 'come-back',
        timestamp: Date.now()
      });
    }
  }

  // ===== UTILITY =====

  // Get hours until midnight
  private getHoursUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return (midnight.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  // Check all conditions and send appropriate notifications
  checkAndSendNotifications(): void {
    if (!this.isEnabled()) return;

    this.sendDailyRewardReminder();
    this.sendStreakWarning();
    this.sendLivesRefilled();
    this.sendLivesCritical();
    this.sendEventStarting();
    this.sendEventEnding();
    this.sendMysteryBoxReady();
    this.sendAchievementClose();
    this.sendFlashSale();
    this.sendComeBack();
  }

  // Schedule periodic checks
  private periodicInterval: ReturnType<typeof setInterval> | null = null;
  private periodicVisibilityHandler: (() => void) | null = null;

  startPeriodicChecks(): void {
    // Idempotent — repeated calls must not stack intervals or listeners.
    if (this.periodicInterval !== null) return;

    // Check every 15 minutes
    this.periodicInterval = setInterval(() => {
      this.checkAndSendNotifications();
    }, 15 * 60 * 1000);

    // Also check on visibility change (when user returns to app)
    this.periodicVisibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.checkAndSendNotifications();
      }
    };
    document.addEventListener('visibilitychange', this.periodicVisibilityHandler);
  }

  stopPeriodicChecks(): void {
    if (this.periodicInterval !== null) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
    if (this.periodicVisibilityHandler !== null) {
      document.removeEventListener('visibilitychange', this.periodicVisibilityHandler);
      this.periodicVisibilityHandler = null;
    }
  }
}

export const pushNotificationSystem = PushNotificationSystem.getInstance();
