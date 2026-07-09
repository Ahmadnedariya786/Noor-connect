/**
 * Backup and Restore Service
 * Handles automatic backup creation on first install and restoration on reinstall
 * Optimized for low CPU/RAM usage with background processing
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';

const BACKUP_FOLDER_NAME = 'noor_connect_backup';
const BACKUP_METADATA_KEY = 'backup_metadata';
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
      const backupExists = await this.backupFolderExists();
      
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

  private async backupFolderExists(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      const result = await Filesystem.readdir({
        path: '',
        directory: Directory.Documents
      });

      return result.files.some(file => 
        file.name === BACKUP_FOLDER_NAME || file.type === 'directory'
      );
    } catch {
      return false;
    }
  }

  private async getBackupMetadata(): Promise<BackupMetadata | null> {
    try {
      const result = await Filesystem.readFile({
        path: `${BACKUP_FOLDER_NAME}/metadata.json`,
        directory: Directory.Documents
      });

      const metadata = JSON.parse(result.data);
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
          await this.createBackupFolder();
          
          // Collect data efficiently
          const backupData = await this.collectBackupData();
          
          // Save backup data
          await this.saveBackupData(backupData);
          
          // Save metadata
          await this.saveBackupMetadata(backupData.metadata);
          
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

  private async createBackupFolder(): Promise<void> {
    try {
      await Filesystem.mkdir({
        path: BACKUP_FOLDER_NAME,
        directory: Directory.Documents
      });
    } catch (error) {
      // Folder might already exist, ignore error
      console.warn('Backup folder creation (might already exist):', error);
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
    // Save localStorage data
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER_NAME}/localStorage.json`,
      data: JSON.stringify(backupData.localStorage),
      directory: Directory.Documents
    });

    // Save preferences data
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER_NAME}/preferences.json`,
      data: JSON.stringify(backupData.preferences),
      directory: Directory.Documents
    });
  }

  private async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    await Filesystem.writeFile({
      path: `${BACKUP_FOLDER_NAME}/metadata.json`,
      data: JSON.stringify(metadata),
      directory: Directory.Documents
    });
  }

  /**
   * Restore data from backup
   */
  async restoreBackup(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      const backupData = await this.loadBackupData();
      if (!backupData) return false;

      // Restore localStorage data
      await this.restoreLocalStorage(backupData.localStorage);

      // Restore preferences data
      await this.restorePreferences(backupData.preferences);

      // Mark backup as restored
      await Preferences.set({
        key: 'backup_restored',
        value: new Date().toISOString()
      });

      console.log('Backup restored successfully');
      return true;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }

  private async loadBackupData(): Promise<BackupData | null> {
    try {
      // Load metadata
      const metadataResult = await Filesystem.readFile({
        path: `${BACKUP_FOLDER_NAME}/metadata.json`,
        directory: Directory.Documents
      });
      const metadata = JSON.parse(metadataResult.data);

      // Load localStorage
      const localStorageResult = await Filesystem.readFile({
        path: `${BACKUP_FOLDER_NAME}/localStorage.json`,
        directory: Directory.Documents
      });
      const localStorageData = JSON.parse(localStorageResult.data);

      // Load preferences
      const preferencesResult = await Filesystem.readFile({
        path: `${BACKUP_FOLDER_NAME}/preferences.json`,
        directory: Directory.Documents
      });
      const preferencesData = JSON.parse(preferencesResult.data);

      return {
        metadata,
        localStorage: localStorageData,
        preferences: preferencesData
      };
    } catch (error) {
      console.error('Failed to load backup data:', error);
      return null;
    }
  }

  private async restoreLocalStorage(data: Record<string, string>): Promise<void> {
    // Clear existing localStorage
    localStorage.clear();

    // Restore data
    for (const [key, value] of Object.entries(data)) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to restore localStorage key ${key}:`, error);
      }
    }
  }

  private async restorePreferences(data: Record<string, string>): Promise<void> {
    // Clear existing preferences
    try {
      const allPrefs = await Preferences.keys();
      for (const key of allPrefs.keys) {
        await Preferences.remove({ key });
      }
    } catch (error) {
      console.warn('Failed to clear preferences:', error);
    }

    // Restore data
    for (const [key, value] of Object.entries(data)) {
      try {
        await Preferences.set({ key, value });
      } catch (error) {
        console.warn(`Failed to restore preference ${key}:`, error);
      }
    }
  }

  /**
   * Delete backup folder
   */
  async deleteBackup(): Promise<boolean> {
    if (!this.isNative) return false;

    try {
      await Filesystem.rmdir({
        path: BACKUP_FOLDER_NAME,
        directory: Directory.Documents,
        recursive: true
      });

      // Mark that we've checked for backup in this session
      await Preferences.set({
        key: 'backup_checked_session',
        value: 'true'
      });

      console.log('Backup deleted successfully');
      return true;
    } catch (error) {
      console.error('Backup deletion failed:', error);
      return false;
    }
  }

  /**
   * Mark backup check as done for this session
   */
  async markBackupCheckDone(): Promise<void> {
    await Preferences.set({
      key: 'backup_checked_session',
      value: 'true'
    });
  }

  /**
   * Check if this is a fresh install (no backup found)
   */
  async isFreshInstall(): Promise<boolean> {
    if (!this.isNative) return false;

    const backupExists = await this.backupFolderExists();
    return !backupExists;
  }
}

export const backupRestoreService = BackupRestoreService.getInstance();