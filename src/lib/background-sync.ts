import { Capacitor } from '@capacitor/core';
import { offlineSyncService } from './offline-sync-service';
import { offlineQuranStorage } from './offline-quran-storage';

export interface BackgroundSyncConfig {
  enabled: boolean;
  syncInterval: number; // minutes
  wifiOnly: boolean;
  chargingOnly: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export interface BackgroundSyncStatus {
  isSupported: boolean;
  isEnabled: boolean;
  lastBackgroundSync: number;
  nextScheduledSync: number;
  activeTask: string | null;
}

export class BackgroundSyncManager {
  private config: BackgroundSyncConfig = {
    enabled: true,
    syncInterval: 60, // 1 hour
    wifiOnly: false,
    chargingOnly: false,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '06:00'
    }
  };

  private status: BackgroundSyncStatus = {
    isSupported: false,
    isEnabled: false,
    lastBackgroundSync: 0,
    nextScheduledSync: 0,
    activeTask: null
  };

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Check if background sync is supported
    this.status.isSupported = await this.isBackgroundSyncSupported();
    
    if (this.status.isSupported) {
      await this.loadConfig();
      await this.setupBackgroundSync();
    }
  }

  private async isBackgroundSyncSupported(): Promise<boolean> {
    // Check if running on native platform
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    // Check if BackgroundRunner plugin is available
    try {
      // Use a more compatible approach to check plugin availability
      return typeof (Capacitor as any).Plugins?.BackgroundRunner !== 'undefined';
    } catch {
      return false;
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const stored = localStorage.getItem('background-sync-config');
      if (stored) {
        this.config = { ...this.config, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load background sync config:', error);
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('background-sync-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save background sync config:', error);
    }
  }

  private async setupBackgroundSync(): Promise<void> {
    if (!this.config.enabled || !this.status.isSupported) {
      return;
    }

    try {
      // For Capacitor Background Runner, use the correct API
      // Note: The actual API might differ based on the plugin version
      // This is a simplified implementation
      
      // Store the background task configuration
      localStorage.setItem('background-sync-task', JSON.stringify({
        id: 'quran-sync-task',
        callback: 'performQuranSync',
        title: 'Quran Content Sync',
        description: 'Syncing Quran content for offline use',
        interval: this.config.syncInterval * 60 * 1000
      }));
      
      // Schedule periodic sync using a compatible approach
      await this.scheduleNextSync();
      
      this.status.isEnabled = true;
    } catch (error) {
      console.error('Failed to setup background sync:', error);
      this.status.isEnabled = false;
    }
  }

  private async scheduleNextSync(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const now = Date.now();
    const intervalMs = this.config.syncInterval * 60 * 1000;
    const nextSyncTime = now + intervalMs;

    this.status.nextScheduledSync = nextSyncTime;

    try {
      // Use a compatible approach for scheduling
      // Store the scheduled sync time for the app to check
      localStorage.setItem('next-sync-time', nextSyncTime.toString());
      
      // For native platforms, the actual background scheduling would be handled
      // by the platform-specific background task scheduler
      console.log(`Next background sync scheduled for: ${new Date(nextSyncTime)}`);
    } catch (error) {
      console.error('Failed to schedule background sync:', error);
    }
  }

  private async shouldSyncNow(): Promise<boolean> {
    // Check quiet hours
    if (this.config.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const { start, end } = this.config.quietHours;
      if (this.isTimeInRange(currentTime, start, end)) {
        return false;
      }
    }

    // Check charging requirement
    if (this.config.chargingOnly) {
      // In a real implementation, check battery status
      // For now, we'll assume it's not charging
      return false;
    }

    // Check WiFi requirement
    if (this.config.wifiOnly) {
      // In a real implementation, check network type
      // For now, we'll assume it's available
      return true;
    }

    return true;
  }

  private isTimeInRange(current: string, start: string, end: string): boolean {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const currentMinutes = toMinutes(current);
    const startMinutes = toMinutes(start);
    const endMinutes = toMinutes(end);

    if (startMinutes <= endMinutes) {
      // Same day range (e.g., 22:00 to 06:00 crosses midnight)
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      // Crosses midnight (e.g., 22:00 to 06:00)
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  // Main background sync function
  async performQuranSync(): Promise<void> {
    if (!await this.shouldSyncNow()) {
      console.log('Background sync skipped due to conditions');
      return;
    }

    try {
      this.status.activeTask = 'quran-sync';
      
      // Perform the actual sync
      await offlineSyncService.sync();
      
      this.status.lastBackgroundSync = Date.now();
      
      // Schedule next sync
      await this.scheduleNextSync();
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
      
      // Retry with exponential backoff
      const retryDelay = Math.min(5 * 60 * 1000, 30 * 60 * 1000); // Max 30 minutes
      setTimeout(() => this.scheduleNextSync(), retryDelay);
    } finally {
      this.status.activeTask = null;
    }
  }

  // Public API
  async enable(): Promise<void> {
    if (!this.status.isSupported) {
      throw new Error('Background sync is not supported on this device');
    }

    this.config.enabled = true;
    this.saveConfig();
    await this.setupBackgroundSync();
  }

  async disable(): Promise<void> {
    this.config.enabled = false;
    this.saveConfig();
    
    try {
      // Clear the scheduled sync from localStorage
      localStorage.removeItem('background-sync-task');
      localStorage.removeItem('next-sync-time');
      
      this.status.isEnabled = false;
      this.status.nextScheduledSync = 0;
      
      console.log('Background sync disabled');
    } catch (error) {
      console.error('Failed to disable background sync:', error);
    }
  }

  updateConfig(updates: Partial<BackgroundSyncConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    
    // Restart background sync with new config
    if (this.config.enabled && this.status.isSupported) {
      this.setupBackgroundSync();
    }
  }

  getConfig(): BackgroundSyncConfig {
    return { ...this.config };
  }

  getStatus(): BackgroundSyncStatus {
    return { ...this.status };
  }

  async forceSync(): Promise<void> {
    if (!this.status.isSupported) {
      throw new Error('Background sync is not supported on this device');
    }

    await this.performQuranSync();
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    lastSyncDuration: number;
  }> {
    // In a real implementation, these would be stored persistently
    // For now, return mock data
    return {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      lastSyncDuration: 0
    };
  }

  // Cleanup method
  async destroy(): Promise<void> {
    if (this.status.isEnabled) {
      await this.disable();
    }
  }
}

// Global instance
export const backgroundSyncManager = new BackgroundSyncManager();

// Make the sync function available globally for the background runner
declare global {
  interface Window {
    performQuranSync: () => Promise<void>;
  }
}

// Register the global function for background execution
if (typeof window !== 'undefined') {
  window.performQuranSync = () => backgroundSyncManager.performQuranSync();
}

// Service Worker registration for web platforms
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      // Register for background sync if available
      if ('sync' in registration) {
        const syncRegistration = registration as any;
        if (syncRegistration.sync && typeof syncRegistration.sync.register === 'function') {
          await syncRegistration.sync.register('quran-content-sync');
        }
      }
      
      console.log('Service Worker registered for background sync');
    } catch (error) {
      console.error('Failed to register service worker:', error);
    }
  }
}

// Periodic Sync API for web platforms
export async function requestPeriodicSync(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Request permission for periodic sync
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync' as PermissionName
      });
      
      if (status.state === 'granted') {
        // Use type assertion for periodic sync as it's experimental
        const syncRegistration = registration as any;
        if (syncRegistration.periodicSync && typeof syncRegistration.periodicSync.register === 'function') {
          await syncRegistration.periodicSync.register('quran-content-sync', {
            minInterval: 60 * 60 * 1000 // 1 hour
          });
          console.log('Periodic sync registered');
        } else {
          console.warn('Periodic sync not supported in this browser');
        }
      }
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
    }
  }
}
