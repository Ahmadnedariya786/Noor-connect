/**
 * Backup and Restore Service
 * Handles automatic backup creation on first install and restoration on reinstall
 * Optimized for low CPU/RAM usage with background processing
 * Uses localStorage for cross-platform compatibility
 */

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const BACKUP_METADATA_KEY = 'backup_metadata';
const BACKUP_DATA_KEY = 'backup_data';
const BACKUP_VERSION = '1.0';
const BACKUP_CHECK_DELAY = 2000; // 2 seconds delay to avoid blocking UI

export interface BackupMetadata {
  version: string;
  created: string;
  deviceId: string;
  appVersion: string;
  lastBackupDate: string;
  dataCount: number;
}

interface BackupData {
  metadata: BackupMetadata;
  localStorage: Record<string, string>;
  preferences: Record<string, string>;
  indexedDB?: Record<string, any>;
}

class BackupRestoreService {
  private static instance: BackupRestoreService;
  private deviceId: string;
  private isNative: boolean;
  private backupCheckScheduled: boolean = false;

  private constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.deviceId = this.generateDeviceId();
  }

  static getInstance(): BackupRestoreService {
    if (!BackupRestoreService.instance) {
      BackupRestoreService.instance = new BackupRestoreService();
    }
    return BackupRestoreService.instance;
  }

  private generateDeviceId(): string {
    // Generate a unique device ID using available info
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${randomPart}${timestamp}`;
  }

  /**
   * Check for existing backup on app start
   * Uses setTimeout to avoid blocking the main thread
   */
  async checkForBackup(): Promise<boolean> {
    if (!this.isNative) return false; // Only on native platforms

    // Check if we've already handled backup for this session
    const alreadyChecked = await Preferences.get({ key: 'backup_checked_session' });
    if (alreadyChecked.value === 'true') {
      return false;
    }

    // Schedule backup check in background to avoid UI blocking
    if (!this.backupCheckScheduled) {
      this.backupCheckScheduled = true;
      setTimeout(async () => {
        await this.performBackupCheck();
        this.backupCheckScheduled = false;
      }, BACKUP_CHECK_DELAY);
    }

    return false;
  }

  private async performBackupCheck(): Promise<void> {
    try {
      const backupExists = await this.backupExists();
      
      if (backupExists) {
        const metadata = await this.getBackupMetadata();
        if (metadata) {
          // Emit event for UI to show restore dialog
          this.emitBackupFoundEvent(metadata);
        }
      } else {
        // No backup found, create initial backup
        await this.createBackup();
      }
    } catch (error) {
      console.error('Backup check failed:', error);
    }
  }

  private async backupExists(): Promise<boolean> {
    try {
      const metadata = localStorage.getItem(BACKUP_METADATA_KEY);
      return metadata !== null;
    } catch {
      return false;
    }
  }

  private async getBackupMetadata(): Promise<BackupMetadata | null> {
    try {
      const metadataStr = localStorage.getItem(BACKUP_METADATA_KEY);
      if (!metadataStr) return null;
      
      const metadata = JSON.parse(metadataStr);
      return metadata;
    } catch {
      return null;
    }
  }

  private emitBackupFoundEvent(metadata: BackupMetadata): void {
    const event = new CustomEvent('backup-found', { 
      detail: metadata 
    });
    window.dispatchEvent(event);
  }

  /**
   * Create a backup of all app data
   * Optimized to run in background without blocking UI
   */
  async createBackup(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      // Use requestIdleCallback if available for background processing
      const createBackup = async () => {
        try {
          // Collect data efficiently
          const backupData = await this.collectBackupData();
          
          // Save backup data to localStorage
          await this.saveBackupData(backupData);
          
          console.log('Backup created successfully');
          return true;
        } catch (error) {
          console.error('Backup creation failed:', error);
          return false;
        }
      };

      // Use requestIdleCallback for background processing on supported browsers
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return new Promise((resolve) => {
          // @ts-ignore
          window.requestIdleCallback(async () => {
            const result = await createBackup();
            resolve(result);
          });
        });
      } else {
        // Fallback to setTimeout for background processing
        return new Promise((resolve) => {
          setTimeout(async () => {
            const result = await createBackup();
            resolve(result);
          }, 100);
        });
      }
    } catch (error) {
      console.error('Backup creation failed:', error);
      return false;
    }
  }

  private async collectBackupData(): Promise<BackupData> {
    // Collect localStorage data
    const localStorageData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key) || '';
      }
    }

    // Collect Capacitor Preferences data
    const preferencesData: Record<string, string> = {};
    try {
      const allPrefs = await Preferences.keys();
      for (const key of allPrefs.keys) {
        const { value } = await Preferences.get({ key });
        if (value !== null) {
          preferencesData[key] = value;
        }
      }
    } catch (error) {
      console.warn('Failed to collect preferences:', error);
    }

    // Create metadata
    const metadata: BackupMetadata = {
      version: BACKUP_VERSION,
      created: new Date().toISOString(),
      deviceId: this.deviceId,
      appVersion: process.env.npm_package_version || '2.0.0',
      lastBackupDate: new Date().toISOString(),
      dataCount: Object.keys(localStorageData).length + Object.keys(preferencesData).length
    };

    return {
      metadata,
      localStorage: localStorageData,
      preferences: preferencesData
    };
  }

  private async saveBackupData(backupData: BackupData): Promise<void> {
    // Save metadata
    localStorage.setItem(BACKUP_METADATA_KEY, JSON.stringify(backupData.metadata));
    
    // Save full backup data
    localStorage.setItem(BACKUP_DATA_KEY, JSON.stringify(backupData));
  }

  /**
   * Restore data from backup
   */
  async restoreBackup(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      const backupDataStr = localStorage.getItem(BACKUP_DATA_KEY);
      if (!backupDataStr) {
        console.error('No backup data found');
        return false;
      }

      const backupData: BackupData = JSON.parse(backupDataStr);
      
      // Validate backup version
      if (backupData.metadata.version !== BACKUP_VERSION) {
        console.warn('Backup version mismatch, attempting restore anyway');
      }

      // Restore localStorage data
      for (const [key, value] of Object.entries(backupData.localStorage)) {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn(`Failed to restore localStorage key ${key}:`, error);
        }
      }

      // Restore preferences data
      for (const [key, value] of Object.entries(backupData.preferences)) {
        try {
          await Preferences.set({ key, value });
        } catch (error) {
          console.warn(`Failed to restore preference ${key}:`, error);
        }
      }

      // Mark backup as restored
      await Preferences.set({ key: 'backup_checked_session', value: 'true' });

      console.log('Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }

  /**
   * Delete backup data
   */
  async deleteBackup(): Promise<boolean> {
    try {
      localStorage.removeItem(BACKUP_METADATA_KEY);
      localStorage.removeItem(BACKUP_DATA_KEY);
      await Preferences.set({ key: 'backup_checked_session', value: 'true' });
      return true;
    } catch (error) {
      console.error('Backup deletion failed:', error);
      return false;
    }
  }

  /**
   * Get backup info without restoring
   */
  async getBackupInfo(): Promise<BackupMetadata | null> {
    return this.getBackupMetadata();
  }

  /**
   * Manually trigger backup (e.g., before app update)
   */
  async manualBackup(): Promise<boolean> {
    return this.createBackup();
  }

  /**
   * Check if backup is available
   */
  async hasBackup(): Promise<boolean> {
    return this.backupExists();
  }

  /**
   * Reset the backup check session flag
   * Call this when user dismisses the restore dialog without restoring
   */
  async dismissBackup(): Promise<void> {
    await Preferences.set({ key: 'backup_checked_session', value: 'true' });
  }
}

export const backupRestoreService = BackupRestoreService.getInstance();
