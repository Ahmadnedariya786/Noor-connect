/**
 * Enhanced Menstrual Mode - Notification Service
 * Handles smart, phase-aware notifications for cycle tracking
 */

import { db, generateId } from './menstrual-db';
import type { NotificationType, ScheduledNotification, CyclePrediction, Profile } from '@/types/menstrual';
import type { DBScheduledNotification } from './menstrual-db';

// ============================================
// Notification Templates
// ============================================

interface NotificationTemplate {
  title: string;
  body: string;
}

const PHASE_NOTIFICATIONS: Record<string, NotificationTemplate> = {
  menstrual: {
    title: '🌙 Menstrual Phase',
    body: 'Take it easy today. Rest, stay warm, and be gentle with yourself.',
  },
  follicular: {
    title: '🌸 Follicular Phase',
    body: 'Energy is rising! A great time to start new projects and exercise.',
  },
  ovulatory: {
    title: '☀️ Ovulatory Phase',
    body: 'Peak energy days! You may feel more social and confident.',
  },
  luteal: {
    title: '🌙 Luteal Phase',
    body: 'Focus on completing tasks. Start winding down and prioritizing rest.',
  },
  premenstrual: {
    title: '🧡 Premenstrual Phase',
    body: 'PMS may be approaching. Practice self-care and stress management.',
  },
};

const SYMPTOM_CHECKIN = {
  title: '💜 How are you feeling?',
  body: 'Take a moment to log your symptoms and mood for today.',
};

const PMS_WARNING = {
  title: '⚠️ PMS Reminder',
  body: 'PMS symptoms may start in the next few days. Prepare comfort items.',
};

const PERIOD_PREDICTION = {
  title: '📅 Period Prediction',
  body: 'Your period is expected to start soon. Make sure you have supplies ready.',
};

const MEDICATION_REMINDER = {
  title: '💊 Medication Reminder',
  body: 'Time to take your supplements or medication.',
};

const REFILL_ALERT = {
  title: '📦 Low Supply Alert',
  body: 'One of your medications is running low. Consider refilling soon.',
};

// ============================================
// Notification Service Class
// ============================================

class NotificationService {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private quietHoursStart = 22; // 10 PM
  private quietHoursEnd = 7; // 7 AM
  private maxPerDay = 3;
  private sentToday = 0;
  private lastSentDate = '';

  /**
   * Initialize the notification service
   */
  init(settings?: { quietHoursStart?: string; quietHoursEnd?: string; maxPerDay?: number }) {
    if (settings?.quietHoursStart) {
      this.quietHoursStart = parseInt(settings.quietHoursStart.split(':')[0], 10);
    }
    if (settings?.quietHoursEnd) {
      this.quietHoursEnd = parseInt(settings.quietHoursEnd.split(':')[0], 10);
    }
    if (settings?.maxPerDay) {
      this.maxPerDay = settings.maxPerDay;
    }

    // Reset daily counter
    this.resetDailyCounter();

    // Start checking every hour
    this.startChecking();
  }

  /**
   * Stop the notification service
   */
  destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check if we're in quiet hours
   */
  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    if (this.quietHoursStart > this.quietHoursEnd) {
      // Overnight quiet hours (e.g., 22:00 - 07:00)
      return hour >= this.quietHoursStart || hour < this.quietHoursEnd;
    }
    return hour >= this.quietHoursStart && hour < this.quietHoursEnd;
  }

  /**
   * Reset daily notification counter
   */
  private resetDailyCounter() {
    const today = new Date().toDateString();
    if (this.lastSentDate !== today) {
      this.sentToday = 0;
      this.lastSentDate = today;
    }
  }

  /**
   * Check if we can send a notification
   */
  private canSend(): boolean {
    this.resetDailyCounter();
    return !this.isQuietHours() && this.sentToday < this.maxPerDay;
  }

  /**
   * Start periodic checking
   */
  private startChecking() {
    // Check every hour
    this.checkInterval = setInterval(() => {
      this.processPendingNotifications();
    }, 60 * 60 * 1000);

    // Also check immediately
    this.processPendingNotifications();
  }

  /**
   * Process pending notifications
   */
  async processPendingNotifications() {
    if (!this.canSend()) return;

    try {
      const pending = await db.notifications
        .where('sent')
        .equals(false)
        .filter(n => new Date(n.scheduledAt) <= new Date())
        .toArray();

      for (const notification of pending.slice(0, this.maxPerDay - this.sentToday)) {
        await this.sendNotification(notification);
      }
    } catch (error) {
      console.error('[NotificationService] Error processing notifications:', error);
    }
  }

  /**
   * Send a notification (via Capacitor or browser)
   */
  private async sendNotification(notification: DBScheduledNotification) {
    if (!this.canSend()) return;

    try {
      // Try Capacitor local notifications first
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        await LocalNotifications.schedule({
          notifications: [{
            id: parseInt(notification.id.slice(-8), 36) % 2147483647,
            title: notification.title,
            body: notification.body,
            schedule: { at: new Date(Date.now() + 1000) }, // 1 second from now
            extra: { type: notification.type, profileId: notification.profileId },
          }],
        });
      } catch {
        // Fallback to browser Notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.body,
            icon: '/icon-192.png',
            tag: notification.id,
          });
        }
      }

      // Mark as sent
      await db.notifications.update(notification.id, {
        sent: true,
        sentAt: new Date(),
      });

      this.sentToday++;
    } catch (error) {
      console.error('[NotificationService] Failed to send notification:', error);
    }
  }

  /**
   * Schedule a notification
   */
  async schedule(
    profileId: string,
    type: NotificationType,
    title: string,
    body: string,
    scheduledAt: Date
  ): Promise<string> {
    const id = generateId();
    const notification: DBScheduledNotification = {
      id,
      profileId,
      type,
      title,
      body,
      scheduledAt,
      sent: false,
      createdAt: new Date(),
    };

    await db.notifications.add(notification);
    return id;
  }

  /**
   * Schedule phase change notification
   */
  async schedulePhaseNotification(profileId: string, phase: string, delayMinutes: number = 0) {
    const template = PHASE_NOTIFICATIONS[phase];
    if (!template) return;

    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + delayMinutes);

    return this.schedule(profileId, 'phaseChange', template.title, template.body, scheduledAt);
  }

  /**
   * Schedule symptom check-in
   */
  async scheduleSymptomCheckin(profileId: string, hour: number = 9) {
    const scheduledAt = new Date();
    scheduledAt.setHours(hour, 0, 0, 0);
    if (scheduledAt <= new Date()) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }

    return this.schedule(profileId, 'symptomCheckin', SYMPTOM_CHECKIN.title, SYMPTOM_CHECKIN.body, scheduledAt);
  }

  /**
   * Schedule PMS warning
   */
  async schedulePMSWarning(profileId: string, pmsDate: Date) {
    const scheduledAt = new Date(pmsDate);
    scheduledAt.setDate(scheduledAt.getDate() - 1); // 1 day before PMS

    return this.schedule(profileId, 'pmsWarning', PMS_WARNING.title, PMS_WARNING.body, scheduledAt);
  }

  /**
   * Schedule period prediction notification
   */
  async schedulePeriodPrediction(profileId: string, periodDate: Date) {
    const scheduledAt = new Date(periodDate);
    scheduledAt.setDate(scheduledAt.getDate() - 2); // 2 days before

    return this.schedule(profileId, 'periodPrediction', PERIOD_PREDICTION.title, PERIOD_PREDICTION.body, scheduledAt);
  }

  /**
   * Schedule medication reminder
   */
  async scheduleMedicationReminder(profileId: string, medicationName: string, hour: number = 8) {
    const scheduledAt = new Date();
    scheduledAt.setHours(hour, 0, 0, 0);
    if (scheduledAt <= new Date()) {
      scheduledAt.setDate(scheduledAt.getDate() + 1);
    }

    return this.schedule(
      profileId,
      'medicationReminder',
      MEDICATION_REMINDER.title,
      `Time to take your ${medicationName}.`
    );
  }

  /**
   * Schedule refill alert
   */
  async scheduleRefillAlert(profileId: string, medicationName: string) {
    const scheduledAt = new Date();
    scheduledAt.setHours(scheduledAt.getHours() + 1);

    return this.schedule(
      profileId,
      'refillAlert',
      REFILL_ALERT.title,
      `Your ${medicationName} is running low. Consider refilling soon.`
    );
  }

  /**
   * Schedule prediction-based notifications
   */
  async schedulePredictionNotifications(profileId: string, prediction: CyclePrediction) {
    // PMS warning
    if (prediction.pmsStartDate) {
      await this.schedulePMSWarning(profileId, new Date(prediction.pmsStartDate));
    }

    // Period prediction
    await this.schedulePeriodPrediction(profileId, new Date(prediction.nextPeriodDate));

    // Fertility window
    if (prediction.fertilityWindowStart) {
      const scheduledAt = new Date(prediction.fertilityWindowStart);
      scheduledAt.setDate(scheduledAt.getDate() - 1);
      await this.schedule(
        profileId,
        'fertilityWindow',
        '🌸 Fertility Window',
        'Your fertility window is starting tomorrow.',
        scheduledAt
      );
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Try Capacitor first
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const result = await LocalNotifications.requestPermission();
        return result.display === 'granted';
      } catch {
        // Fallback to browser API
        if ('Notification' in window) {
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        }
      }
    } catch (error) {
      console.error('[NotificationService] Permission request failed:', error);
    }
    return false;
  }

  /**
   * Check notification permission status
   */
  async hasPermission(): Promise<boolean> {
    try {
      try {
        const { LocalNotifications } = await import('@capacitor/local-notifications');
        const result = await LocalNotifications.checkPermissions();
        return result.display === 'granted';
      } catch {
        if ('Notification' in window) {
          return Notification.permission === 'granted';
        }
      }
    } catch {
      return false;
    }
    return false;
  }

  /**
   * Cancel all scheduled notifications for a profile
   */
  async cancelAllForProfile(profileId: string) {
    await db.notifications
      .where('profileId')
      .equals(profileId)
      .filter(n => !n.sent)
      .delete();
  }

  /**
   * Get scheduled notifications for a profile
   */
  async getScheduled(profileId: string): Promise<ScheduledNotification[]> {
    const notifications = await db.notifications
      .where('profileId')
      .equals(profileId)
      .filter(n => !n.sent)
      .sortBy('scheduledAt');

    return notifications.map(n => ({
      id: n.id,
      profileId: n.profileId,
      type: n.type as NotificationType,
      title: n.title,
      body: n.body,
      scheduledAt: n.scheduledAt.toISOString(),
      sent: n.sent,
      sentAt: n.sentAt?.toISOString(),
      createdAt: n.createdAt.toISOString(),
    }));
  }
}

// ============================================
// Singleton Export
// ============================================

export const notificationService = new NotificationService();
export default notificationService;
