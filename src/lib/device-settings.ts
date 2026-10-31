/**
 * Device Settings Helper
 *
 * Provides safe, robust navigation to native Android application details,
 * permission screens, and alarms settings without throwing unhandled
 * Promise rejections (such as App.openSettings() which is not implemented on Android).
 */

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

declare global {
  interface Window {
    AndroidBridge?: {
      openAppSettings?: () => void;
      openExactAlarmSettings?: () => void;
      checkLocationPermission?: () => boolean;
      [key: string]: unknown;
    };
  }
}

/**
 * Safely opens device application settings.
 * Prioritizes native AndroidBridge, avoids unhandled promise rejections on Android,
 * and falls back safely across Web and iOS.
 */
export async function openDeviceAppSettings(type?: 'location' | 'notifications' | 'alarms'): Promise<void> {
  // 1. Android Native Bridge priority
  if (typeof window !== 'undefined' && window.AndroidBridge?.openAppSettings) {
    try {
      window.AndroidBridge.openAppSettings();
      return;
    } catch (err) {
      console.warn('AndroidBridge.openAppSettings invocation failed:', err);
    }
  }

  // 2. Exact alarms settings via native bridge if requested
  if (type === 'alarms' && typeof window !== 'undefined' && window.AndroidBridge?.openExactAlarmSettings) {
    try {
      window.AndroidBridge.openExactAlarmSettings();
      return;
    } catch (err) {
      console.warn('AndroidBridge.openExactAlarmSettings invocation failed:', err);
    }
  }

  // 3. iOS support (App.openSettings is officially supported on iOS by Capacitor)
  if (Capacitor.getPlatform() === 'ios') {
    try {
      await App.openSettings();
      return;
    } catch (err) {
      console.warn('App.openSettings on iOS failed:', err);
    }
  }

  // 4. Web browser content settings fallback
  if (typeof window !== 'undefined') {
    try {
      if (type === 'location') {
        window.open('chrome://settings/content/location', '_blank');
      } else if (type === 'notifications') {
        window.open('chrome://settings/content/notifications', '_blank');
      }
    } catch {
      // Safe fallback if window.open is restricted
    }
  }
}
