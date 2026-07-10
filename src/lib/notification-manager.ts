/**
 * Enhanced Notification System
 * Handles Islamic event notifications, Ramadan countdown, and diverse daily reminders
 * Features: varied content, smart frequency, time-based themes, and rich Islamic content
 */

import { importantIslamicDates, IslamicDate, isRamadanCountdownPeriod, getDaysUntilRamadan } from '@/data/islamic-dates';
import { getRandomContent, getContentByType, getContentByCategory, IslamicContent } from '@/data/expanded-islamic-content';
import { isLowEndDevice } from '@/lib/performance-optimizations';

export interface NotificationPreferences {
  ramadanCountdowns: boolean;
  eidGreetings: boolean;
  fridayKahfReminders: boolean;
  dailyHadithNotifications: boolean;
  morningReminders: boolean;
  eveningReminders: boolean;
  quranicVerses: boolean;
  dhikrReminders: boolean;
  islamicKnowledge: boolean;
  motivationalMessages: boolean;
  maxDailyNotifications: number; // Smart frequency control
}

export interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  icon?: string;
  timestamp: number;
  type: 'ramadan-countdown' | 'eid-greeting' | 'islamic-date' | 'friday-kahf' | 'daily-hadith' | 'quranic-verse' | 'dhikr-reminder' | 'islamic-knowledge' | 'motivational-message' | 'morning-reminder' | 'evening-reminder';
  contentType?: 'hadith' | 'quran' | 'dhikr' | 'dua' | 'knowledge' | 'motivation';
  priority?: 'low' | 'medium' | 'high';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  ramadanCountdowns: true,
  eidGreetings: true,
  fridayKahfReminders: true,
  dailyHadithNotifications: true, // Enabled by default now
  morningReminders: true,
  eveningReminders: true,
  quranicVerses: true,
  dhikrReminders: true,
  islamicKnowledge: true,
  motivationalMessages: true,
  maxDailyNotifications: 5, // Smart frequency limit
};

const STORAGE_KEY = 'notification-preferences';
const SENT_NOTIFICATIONS_KEY = 'sent-notifications-today';
const LAST_NOTIFICATION_DATE_KEY = 'last-notification-date';
const DAILY_NOTIFICATION_COUNT_KEY = 'daily-notification-count';
const NOTIFICATION_HISTORY_KEY = 'notification-history';
const DEFAULT_NOTIFICATION_ICON = '/icon-192x192.png';
const DEFAULT_NOTIFICATION_BADGE = '/icon-96x96.png';

export class NotificationManager {
  private preferences: NotificationPreferences;
  private lastNotificationDate: string | null = null;
  private sentNotificationIds: Set<string> = new Set();
  private isSupported: boolean;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private static instance: NotificationManager | null = null;
  private permissionCheckInterval: ReturnType<typeof setInterval> | null = null;
  private dailyNotificationCount: number = 0;
  private notificationHistory: NotificationEvent[] = [];

  constructor() {
    this.isSupported = 'Notification' in window;
    this.preferences = this.loadPreferences();
    this.lastNotificationDate = this.getLastNotificationDate();
    this.sentNotificationIds = this.loadSentNotifications();
    this.dailyNotificationCount = this.loadDailyNotificationCount();
    this.notificationHistory = this.loadNotificationHistory();
  }

  // Load preferences from localStorage
  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  // Save preferences to localStorage
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
    } catch (error) {
      console.error('Failed to save notification preferences:', error);
    }
  }

  // Load last notification date
  private getLastNotificationDate(): string | null {
    try {
      return localStorage.getItem(LAST_NOTIFICATION_DATE_KEY);
    } catch {
      return null;
    }
  }

  // Save last notification date
  private saveLastNotificationDate(date: string): void {
    try {
      localStorage.setItem(LAST_NOTIFICATION_DATE_KEY, date);
      this.lastNotificationDate = date;
    } catch (error) {
      console.error('Failed to save last notification date:', error);
    }
  }

  // Load sent notification IDs for today
  private loadSentNotifications(): Set<string> {
    try {
      const today = new Date().toDateString();
      const stored = localStorage.getItem(SENT_NOTIFICATIONS_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Only return if it's from today
        if (data.date === today) {
          return new Set(data.ids);
        }
      }
    } catch (error) {
      console.error('Failed to load sent notifications:', error);
    }
    return new Set();
  }

  // Save sent notification ID
  private saveSentNotification(id: string): void {
    try {
      const today = new Date().toDateString();
      this.sentNotificationIds.add(id);
      localStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify({
        date: today,
        ids: Array.from(this.sentNotificationIds)
      }));
    } catch (error) {
      console.error('Failed to save sent notification:', error);
    }
  }

  // Load daily notification count
  private loadDailyNotificationCount(): number {
    try {
      const today = new Date().toDateString();
      const stored = localStorage.getItem(DAILY_NOTIFICATION_COUNT_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Reset if it's a new day
        if (data.date === today) {
          return data.count || 0;
        }
      }
    } catch (error) {
      console.error('Failed to load daily notification count:', error);
    }
    return 0;
  }

  // Save daily notification count
  private saveDailyNotificationCount(): void {
    try {
      const today = new Date().toDateString();
      localStorage.setItem(DAILY_NOTIFICATION_COUNT_KEY, JSON.stringify({
        date: today,
        count: this.dailyNotificationCount
      }));
    } catch (error) {
      console.error('Failed to save daily notification count:', error);
    }
  }

  // Load notification history
  private loadNotificationHistory(): NotificationEvent[] {
    try {
      const stored = localStorage.getItem(NOTIFICATION_HISTORY_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
    return [];
  }

  // Save notification to history
  private saveNotificationToHistory(notification: NotificationEvent): void {
    this.notificationHistory.unshift(notification);
    // Keep only last 50 notifications
    if (this.notificationHistory.length > 50) {
      this.notificationHistory = this.notificationHistory.slice(0, 50);
    }
    try {
      localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Failed to save notification history:', error);
    }
  }

  // Check if daily notification limit reached
  private hasReachedDailyLimit(): boolean {
    return this.dailyNotificationCount >= this.preferences.maxDailyNotifications;
  }

  // Increment daily notification count
  private incrementDailyCount(): void {
    this.dailyNotificationCount++;
    this.saveDailyNotificationCount();
  }

  // Reset daily count (called when date changes)
  private resetDailyCount(): void {
    this.dailyNotificationCount = 0;
    this.saveDailyNotificationCount();
  }

  // Get time-based notification type
  private getTimeBasedType(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  // Check if notification was already sent today
  private wasNotificationSentToday(id: string): boolean {
    const today = new Date().toDateString();
    // Reset if it's a new day
    if (this.lastNotificationDate !== today) {
      this.sentNotificationIds.clear();
      this.resetDailyCount();
      this.saveLastNotificationDate(today);
    }
    return this.sentNotificationIds.has(id);
  }

  // Get appropriate content based on time and preferences
  private getTimelyContent(): IslamicContent | null {
    const timeOfDay = this.getTimeBasedType();
    const availableTypes: string[] = [];

    // Build list of available content types based on preferences
    if (this.preferences.dailyHadithNotifications) availableTypes.push('hadith');
    if (this.preferences.quranicVerses) availableTypes.push('quran');
    if (this.preferences.dhikrReminders) availableTypes.push('dhikr');
    if (this.preferences.islamicKnowledge) availableTypes.push('knowledge');
    if (this.preferences.motivationalMessages) availableTypes.push('motivation');

    if (availableTypes.length === 0) return null;

    // Time-based content selection
    let selectedType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Prioritize certain content types based on time
    if (timeOfDay === 'morning' && availableTypes.includes('quran')) {
      selectedType = 'quran'; // Morning Quran verses
    } else if (timeOfDay === 'evening' && availableTypes.includes('dhikr')) {
      selectedType = 'dhikr'; // Evening dhikr
    }

    return getRandomContent(selectedType);
  }
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    // Compatibility for older browsers that don't return a promise
    const permission = await new Promise<NotificationPermission>((resolve) => {
      const result = Notification.requestPermission(resolve);
      if (result && (result as any).then) {
        (result as any).then(resolve);
      }
    });

    return permission === 'granted';
  }

  // Check if notifications are enabled
  areNotificationsEnabled(): boolean {
    // We already have Notification.permission check, but let's make it smarter
    if (this.isSupported) {
      return Notification.permission === 'granted';
    }
    return false;
  }

  // Get current preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // Update preferences
  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
  }

  private getNotificationIconUrl(event: NotificationEvent): string {
    const defaultIcon = event.type === 'eid-greeting'
      ? '/icon-512x512.png'
      : DEFAULT_NOTIFICATION_ICON;

    if (!event.icon) {
      return defaultIcon;
    }

    const icon = event.icon.trim();

    // Emoji and non-URL strings are silently replaced with default icon
    const isUrl =
      icon.startsWith('/') ||
      icon.startsWith('http://') ||
      icon.startsWith('https://') ||
      icon.startsWith('data:') ||
      icon.startsWith('blob:');

    if (!isUrl) {
      return defaultIcon;
    }

    return icon;
  }

  // Send a notification with enhanced features
  private async sendNotification(event: NotificationEvent): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      return;
    }

    // Check daily limit
    if (this.hasReachedDailyLimit() && event.priority !== 'high') {
      console.log('Daily notification limit reached, skipping:', event.title);
      return;
    }

    // Check if already sent today
    if (this.wasNotificationSentToday(event.id)) {
      return;
    }

    try {
      const notification = new Notification(event.title, {
        body: event.body,
        icon: this.getNotificationIconUrl(event),
        tag: event.id,
        requireInteraction: event.type === 'eid-greeting' || event.priority === 'high',
        badge: DEFAULT_NOTIFICATION_BADGE,
      });

      // Auto-close timing based on priority
      const closeDelay = event.priority === 'high' ? 8000 : 
                        event.priority === 'medium' ? 6000 : 5000;
      
      if (event.type !== 'eid-greeting') {
        setTimeout(() => {
          notification.close();
        }, closeDelay);
      }

      // Handle click events
      notification.onclick = () => {
        notification.close();
        window.focus();
      };

      // Mark as sent and update counters
      this.saveSentNotification(event.id);
      this.saveLastNotificationDate(new Date().toDateString());
      this.incrementDailyCount();
      this.saveNotificationToHistory(event);
      
      console.log(`Notification sent: ${event.title} (${event.type})`);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Enhanced Ramadan countdown with contextual messages
  private async checkRamadanCountdown(): Promise<void> {
    if (!this.preferences.ramadanCountdowns) {
      return;
    }

    const today = new Date();

    if (isRamadanCountdownPeriod(today)) {
      const daysUntil = getDaysUntilRamadan(today);

      if (daysUntil > 0 && daysUntil <= 30) {
        let title = 'Ramadan Countdown';
        let body = '';
        
        // Contextual messages based on proximity
        if (daysUntil <= 7) {
          title = 'Ramadan is Almost Here!';
          body = daysUntil === 1 ? 
            'Tomorrow begins the blessed month of Ramadan! Prepare your heart and home.' :
            `Only ${daysUntil} days left until Ramadan! Time to prepare for the month of mercy.`;
        } else if (daysUntil <= 14) {
          title = 'Ramadan Preparation';
          body = `${daysUntil} days until Ramadan. Start planning your spiritual goals.`;
        } else {
          body = `${daysUntil} day${daysUntil > 1 ? 's' : ''} until Ramadan ${today.getFullYear() + (today.getMonth() < 6 ? 1447 : 1446)} AH`;
        }

        const event: NotificationEvent = {
          id: `ramadan-countdown-${daysUntil}`,
          title,
          body,
          type: 'ramadan-countdown',
          timestamp: Date.now(),
          priority: daysUntil <= 7 ? 'high' : 'medium',
          icon: daysUntil <= 7 ? '/icon-512x512.png' : DEFAULT_NOTIFICATION_ICON
        };

        await this.sendNotification(event);
      }
    }
  }

  // Check and send Eid greetings
  private async checkEidGreetings(): Promise<void> {
    if (!this.preferences.eidGreetings) {
      return;
    }

    const today = new Date();

    // Check for Eid-ul-Fitr (10th of Shawwal, Hijri month 10)
    // Check for Eid-ul-Adha (10th of Dhul Hijjah, Hijri month 12)
    // This is simplified - in production, you'd use a proper Hijri calendar API

    const eidDates = importantIslamicDates.filter(date => date.type === 'eid');

    for (const eid of eidDates) {
      // Simplified check - would need proper Hijri calendar conversion
      if (await this.isEidDay(today, eid)) {
        const event: NotificationEvent = {
          id: `eid-${eid.id}`,
          title: eid.name,
          body: eid.notificationMessage,
          icon: '/eid-icon.png',
          type: 'eid-greeting',
          timestamp: Date.now(),
        };

        await this.sendNotification(event);

        // Trigger festive UI event
        this.triggerFestiveUI(eid);
        break;
      }
    }
  }

  private async isEidDay(date: Date, eid: IslamicDate): Promise<boolean> {
    try {
      const { islamicCalendarService } = await import('@/lib/islamic-calendar-service');
      const islamicDate = await islamicCalendarService.getIslamicDate(date);
      const hijriMonth = parseInt(islamicDate.hijri.month.number.toString());
      const hijriDay = parseInt(islamicDate.hijri.day);

      if (eid.id === 'eid-ul-fitr') {
        return hijriMonth === 10 && hijriDay === 1;
      }
      if (eid.id === 'eid-ul-adha') {
        return hijriMonth === 12 && hijriDay === 10;
      }
      return false;
    } catch {
      return false;
    }
  }

  // Enhanced Friday Surah Kahf reminder with varied content
  private async checkFridayKahfReminder(): Promise<void> {
    if (!this.preferences.fridayKahfReminders) {
      return;
    }

    const today = new Date();

    // Check if today is Friday (day 5 in JavaScript, where 0 = Sunday)
    if (today.getDay() === 5) {
      const fridayMessages = [
        {
          title: 'Friday Blessings',
          body: 'Don\'t forget to read Surah Al-Kahf today! It\'s a Sunnah with great rewards.',
          icon: ''
        },
        {
          title: 'Jumu\'ah Mubarak',
          body: 'Friday is here! Send blessings upon the Prophet and read Surah Al-Kahf.',
          icon: ''
        },
        {
          title: 'Best Day of the Week',
          body: 'Friday is the best day! Seize its blessings with Surah Al-Kahf and good deeds.',
          icon: ''
        }
      ];
      
      const message = fridayMessages[Math.floor(Math.random() * fridayMessages.length)];
      
      const event: NotificationEvent = {
        id: 'friday-kahf',
        title: message.title,
        body: message.body,
        icon: message.icon,
        type: 'friday-kahf',
        timestamp: Date.now(),
        priority: 'medium'
      };

      await this.sendNotification(event);
    }
  }

  // Enhanced daily hadith with variety
  private async checkDailyHadith(): Promise<void> {
    if (!this.preferences.dailyHadithNotifications) {
      return;
    }

    const now = new Date();
    const today = now.toDateString();
    const stored = localStorage.getItem('daily-hadith-target');
    let target = stored ? JSON.parse(stored) : null;

    // Generate new target if none stored or it's from a different day
    if (!target || target.date !== today) {
      target = {
        date: today,
        hour: 8 + Math.floor(Math.random() * 12),
        minute: Math.floor(Math.random() * 60),
      };
      localStorage.setItem('daily-hadith-target', JSON.stringify(target));
    }

    // Only fire once when the target minute arrives
    if (now.getHours() === target.hour && now.getMinutes() === target.minute) {
      const content = getRandomContent('hadith');

      if (content) {
        const event: NotificationEvent = {
          id: `daily-hadith-${today}`,
          title: 'Daily Hadith',
          body: content.translation,
          type: 'daily-hadith',
          contentType: 'hadith',
          timestamp: Date.now(),
          priority: 'medium'
        };

        await this.sendNotification(event);
      }
    }
  }

  // New: Quranic verse notifications
  private async checkQuranicVerses(): Promise<void> {
    if (!this.preferences.quranicVerses) {
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    
    // Morning Quran verses (6 AM - 10 AM)
    if (hour >= 6 && hour < 10) {
      const content = getRandomContent('quran');
      
      if (content) {
        const event: NotificationEvent = {
          id: `quran-verse-${now.toDateString()}`,
          title: 'Quranic Verse',
          body: content.translation,
          type: 'quranic-verse',
          contentType: 'quran',
          timestamp: Date.now(),
          icon: '🕌',
          priority: 'medium'
        };

        await this.sendNotification(event);
      }
    }
  }

  // New: Dhikr reminders
  private async checkDhikrReminders(): Promise<void> {
    if (!this.preferences.dhikrReminders) {
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    
    // Morning and evening dhikr
    if ((hour >= 7 && hour < 9) || (hour >= 18 && hour < 20)) {
      const content = getRandomContent('dhikr');
      
      if (content) {
        const timeOfDay = hour < 12 ? 'Morning' : 'Evening';
        const event: NotificationEvent = {
          id: `dhikr-${timeOfDay.toLowerCase()}-${now.toDateString()}`,
          title: `${timeOfDay} Dhikr`,
          body: content.translation,
          type: 'dhikr-reminder',
          contentType: 'dhikr',
          timestamp: Date.now(),
          icon: '🤲',
          priority: 'low'
        };

        await this.sendNotification(event);
      }
    }
  }

  // New: Islamic knowledge notifications
  private async checkIslamicKnowledge(): Promise<void> {
    if (!this.preferences.islamicKnowledge) {
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    
    // Afternoon knowledge bites (2 PM - 4 PM)
    if (hour >= 14 && hour < 16) {
      const content = getRandomContent('knowledge');
      
      if (content) {
        const event: NotificationEvent = {
          id: `islamic-knowledge-${now.toDateString()}`,
          title: 'Islamic Knowledge',
          body: content.translation,
          type: 'islamic-knowledge',
          contentType: 'knowledge',
          timestamp: Date.now(),
          icon: '🎓',
          priority: 'low'
        };

        await this.sendNotification(event);
      }
    }
  }

  // New: Motivational messages
  private async checkMotivationalMessages(): Promise<void> {
    if (!this.preferences.motivationalMessages) {
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    
    // Mid-morning motivation (10 AM - 11 AM)
    if (hour >= 10 && hour < 11) {
      const content = getRandomContent('motivation');
      
      if (content) {
        const event: NotificationEvent = {
          id: `motivation-${now.toDateString()}`,
          title: 'Daily Motivation',
          body: content.translation,
          type: 'motivational-message',
          contentType: 'motivation',
          timestamp: Date.now(),
          icon: '💪',
          priority: 'low'
        };

        await this.sendNotification(event);
      }
    }
  }

  // Trigger festive UI for special events
  private triggerFestiveUI(event: IslamicDate): void {
    // Dispatch custom event for UI components to listen to
    const customEvent = new CustomEvent('islamicEvent', {
      detail: {
        type: event.type,
        name: event.name,
        arabicName: event.arabicName,
        message: event.notificationMessage,
      },
    });

    window.dispatchEvent(customEvent);
  }

  // Enhanced main check method with all notification types
  async checkAllNotifications(): Promise<void> {
    if (!this.areNotificationsEnabled()) {
      return;
    }

    await Promise.all([
      this.checkRamadanCountdown(),
      this.checkEidGreetings(),
      this.checkFridayKahfReminder(),
      this.checkDailyHadith(),
      this.checkQuranicVerses(),
      this.checkDhikrReminders(),
      this.checkIslamicKnowledge(),
      this.checkMotivationalMessages(),
    ]);
  }

  // Start the notification service - runs outside React render cycle
  start(): void {
    // Prevent duplicate intervals
    if (this.intervalId !== null) {
      return;
    }

    // On low-end devices, check less frequently to reduce battery/CPU impact
    const checkInterval = isLowEndDevice() ? 300000 : 60000;

    this.intervalId = setInterval(() => {
      this.checkAllNotifications();
    }, checkInterval);

    // For APK users, add persistent permission checking
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      // Check permissions every 30 minutes, but only trigger if cooldown allows
      this.permissionCheckInterval = setInterval(async () => {
        const { shouldRequestPermission } = await import('./notifications');
        if (shouldRequestPermission()) {
          console.log('APK user needs notification permission - triggering persistent check');
          // Trigger a permission request event that UI can listen to
          const permissionEvent = new CustomEvent('requestNotificationPermission', {
            detail: { source: 'apk-persistent-check' }
          });
          window.dispatchEvent(permissionEvent);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }

    // Check immediately on start
    this.checkAllNotifications();
  }

  // Get notification history
  getNotificationHistory(): NotificationEvent[] {
    return [...this.notificationHistory];
  }

  // Clear notification history
  clearNotificationHistory(): void {
    this.notificationHistory = [];
    try {
      localStorage.setItem(NOTIFICATION_HISTORY_KEY, JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  // Get today's notification count
  getTodayNotificationCount(): number {
    return this.dailyNotificationCount;
  }

  // Test notification with random content
  async sendTestNotification(): Promise<void> {
    const content = getRandomContent();
    
    if (content) {
      const event: NotificationEvent = {
        id: `test-${Date.now()}`,
        title: 'Test Notification',
        body: content.translation,
        type: 'motivational-message',
        contentType: content.type,
        timestamp: Date.now(),
        icon: '🧪',
        priority: 'low'
      };

      await this.sendNotification(event);
    }
  }

  // Stop the notification service and clean up intervals
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.permissionCheckInterval !== null) {
      clearInterval(this.permissionCheckInterval);
      this.permissionCheckInterval = null;
    }

    console.log('Notification service stopped');
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();
