/**
 * Service Worker Manager for PWA functionality
 * Handles notifications, periodic sync, and caching
 * Version: 2.1.0 - Fixed permission handling
 */

import { Capacitor } from '@capacitor/core';

// Extend Window interface for PWA install prompt
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    deferredPrompt: BeforeInstallPromptEvent | null;
  }
}

// Extend ServiceWorkerRegistration for periodicSync
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
}

interface ServiceWorkerRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
}

export interface NotificationHistoryItem {
  type: 'prayer' | 'ramadan-countdown' | 'eid' | 'friday-kahf' | 'daily-hadith';
  title: string;
  body: string;
  timestamp: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private messageChannel: MessageChannel | null = null;
  private notificationHistory: NotificationHistoryItem[] = [];

  constructor() {
    this.loadNotificationHistory();
    this.setupMessageListener();
  }

  // Register Service Worker (Web only)
  async register(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      // Service workers are web-only; skip silently on native platforms
      return false;
    }

    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully:', this.registration.scope);

      // Wait for the Service Worker to be active
      await this.waitForActivation();

      return true;
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      return false;
    }
  }

  // Wait for Service Worker to be active
  private async waitForActivation(): Promise<void> {
    if (!this.registration) return;

    if (this.registration.active) {
      return;
    }

    return new Promise((resolve) => {
      const serviceWorker = this.registration!.installing || this.registration!.waiting;
      
      if (serviceWorker) {
        serviceWorker.addEventListener('statechange', () => {
          if (serviceWorker.state === 'activated') {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  // Setup periodic sync for background checks
  private async setupPeriodicSync(): Promise<void> {
    const reg = this.registration as ServiceWorkerRegistrationWithPeriodicSync | null;
    if (!reg || !reg.periodicSync) {
      console.log('Periodic Sync not supported');
      return;
    }

    try {
      // Register periodic sync for prayer times (every hour)
      await reg.periodicSync.register('prayer-times-check', {
        minInterval: 60 * 60 * 1000 // 1 hour
      });

      // Register periodic sync for Islamic events (every 6 hours)
      await reg.periodicSync.register('islamic-events-check', {
        minInterval: 6 * 60 * 60 * 1000 // 6 hours
      });

      console.log('Periodic Sync registered successfully');
    } catch (error) {
      console.error('Failed to register Periodic Sync:', error);
    }
  }

  // Setup message listener for Service Worker communication
  private setupMessageListener(): void {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;

      switch (data.type) {
        case 'NOTIFICATION_HISTORY_UPDATE':
          this.notificationHistory = data.data;
          this.saveNotificationHistory();
          this.dispatchHistoryUpdate();
          break;
      }
    });
  }

  // Get notification history from Service Worker
  async getNotificationHistory(): Promise<NotificationHistoryItem[]> {
    if (!this.registration) {
      return this.notificationHistory;
    }

    try {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'NOTIFICATION_HISTORY') {
            this.notificationHistory = event.data.data;
            this.saveNotificationHistory();
            resolve(this.notificationHistory);
          }
        };

        this.registration!.active?.postMessage({
          type: 'GET_NOTIFICATION_HISTORY'
        }, [messageChannel.port2]);
      });
    } catch (error) {
      console.error('Failed to get notification history:', error);
      return this.notificationHistory;
    }
  }

  // Clear notification history
  async clearNotificationHistory(): Promise<void> {
    if (!this.registration) {
      this.notificationHistory = [];
      this.saveNotificationHistory();
      this.dispatchHistoryUpdate();
      return;
    }

    try {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'NOTIFICATION_HISTORY_CLEARED') {
          this.notificationHistory = [];
          this.saveNotificationHistory();
          this.dispatchHistoryUpdate();
        }
      };

      this.registration.active?.postMessage({
        type: 'CLEAR_NOTIFICATION_HISTORY'
      }, [messageChannel.port2]);
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }

  // Trigger manual prayer time check
  async triggerPrayerCheck(): Promise<void> {
    if (!this.registration) return;

    try {
      this.registration.active?.postMessage({
        type: 'TRIGGER_PRAYER_CHECK'
      });
    } catch (error) {
      console.error('Failed to trigger prayer check:', error);
    }
  }

  // Trigger manual Islamic events check
  async triggerIslamicEventsCheck(): Promise<void> {
    if (!this.registration) return;

    try {
      this.registration.active?.postMessage({
        type: 'TRIGGER_ISLAMIC_EVENTS_CHECK'
      });
    } catch (error) {
      console.error('Failed to trigger Islamic events check:', error);
    }
  }

  // Load notification history from localStorage
  private loadNotificationHistory(): void {
    try {
      const stored = localStorage.getItem('notification-history');
      if (stored) {
        this.notificationHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
      this.notificationHistory = [];
    }
  }

  // Save notification history to localStorage
  private saveNotificationHistory(): void {
    try {
      localStorage.setItem('notification-history', JSON.stringify(this.notificationHistory));
    } catch (error) {
      console.error('Failed to save notification history:', error);
    }
  }

  // Dispatch custom event for history updates
  private dispatchHistoryUpdate(): void {
    window.dispatchEvent(new CustomEvent('notificationHistoryUpdate', {
      detail: this.notificationHistory
    }));
  }

  // Get current registration status
  getRegistrationStatus(): {
    isSupported: boolean;
    isRegistered: boolean;
    isActive: boolean;
    hasNotifications: boolean;
  } {
    return {
      isSupported: 'serviceWorker' in navigator,
      isRegistered: !!this.registration,
      isActive: this.registration?.active?.state === 'activated',
      hasNotifications: 'Notification' in window && Notification.permission === 'granted'
    };
  }

  // Check if app is installable
  async isInstallable(): Promise<boolean> {
    if (!this.registration) return false;

    // Check if the app can be installed
    const promptEvent = window.deferredPrompt;
    return !!promptEvent;
  }

  // Prompt for app installation
  async promptInstall(): Promise<boolean> {
    const promptEvent = window.deferredPrompt;
    if (!promptEvent) return false;

    try {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      window.deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Failed to prompt for installation:', error);
      return false;
    }
  }
}

// Singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Export for use in components
export default serviceWorkerManager;
