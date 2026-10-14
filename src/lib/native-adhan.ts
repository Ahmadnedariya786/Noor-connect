import { Capacitor } from '@capacitor/core';

export interface NativeAdhanAlarm {
  id: number;
  triggerAt: number;
  prayerName: string;
  adhanUrl: string;
  overrideSilent?: boolean;
  maxVolume?: boolean;
}

interface NativeAdhanPlugin {
  schedule(options: { alarms: NativeAdhanAlarm[]; enabled?: boolean }): Promise<{ scheduled: number; enabled: boolean }>;
  clear(): Promise<{ status: string }>;
  setEnabled(options: { enabled: boolean }): Promise<{ enabled: boolean; count: number }>;
  getStatus(): Promise<{ enabled: boolean; count: number }>;
  canScheduleExactAlarms(): Promise<{ canSchedule: boolean }>;
  requestExactAlarmPermission(): Promise<{ opened: boolean; alreadyGranted?: boolean }>;
}

const NativeAdhanPlugin = Capacitor.registerPlugin<NativeAdhanPlugin>('NativeAdhanPlugin');

const EXACT_ALARM_PROMPT_KEY = 'exact-alarm-prompted-session';

class NativeAdhanBridge {
  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check if exact alarms can be scheduled (Android 12+ / API 31+)
   */
  async canScheduleExactAlarms(): Promise<boolean> {
    if (!this.isNative()) return true;

    try {
      const res = await NativeAdhanPlugin.canScheduleExactAlarms();
      return res?.canSchedule ?? true;
    } catch (error) {
      console.warn('Failed to check canScheduleExactAlarms:', error);
      return true;
    }
  }

  /**
   * Fire ACTION_REQUEST_SCHEDULE_EXACT_ALARM intent for Noor Connect
   * Opens the exact system "Alarms & reminders" screen with the app focused.
   */
  async requestExactAlarmPermission(): Promise<boolean> {
    if (!this.isNative()) return false;

    try {
      const res = await NativeAdhanPlugin.requestExactAlarmPermission();
      return res?.opened ?? false;
    } catch (error) {
      console.warn('Failed to request exact alarm permission:', error);
      return false;
    }
  }

  /**
   * Check and ensure exact alarm permission politely.
   * If not granted, opens system settings once per session/context to prevent nag loops.
   */
  async ensureExactAlarmPermission(forcePrompt: boolean = false): Promise<boolean> {
    if (!this.isNative()) return true;

    const canSchedule = await this.canScheduleExactAlarms();
    if (canSchedule) return true;

    if (forcePrompt) {
      await this.requestExactAlarmPermission();
      return false;
    }

    // Do not trigger background session prompt if first-launch onboarding sequence is pending
    if (localStorage.getItem('onboarding_perms_v2_done') !== 'true') {
      return false;
    }

    const alreadyPrompted = sessionStorage.getItem(EXACT_ALARM_PROMPT_KEY);
    if (!alreadyPrompted) {
      sessionStorage.setItem(EXACT_ALARM_PROMPT_KEY, 'true');
      await this.requestExactAlarmPermission();
    }

    return false;
  }

  async schedule(alarms: NativeAdhanAlarm[], enabled: boolean): Promise<number> {
    if (!this.isNative()) return 0;

    try {
      const result = await NativeAdhanPlugin.schedule({ alarms, enabled });
      return result.scheduled ?? 0;
    } catch (error) {
      console.warn('Failed to schedule native adhan alarms:', error);
      return 0;
    }
  }

  async clear(): Promise<void> {
    if (!this.isNative()) return;

    try {
      await NativeAdhanPlugin.clear();
    } catch (error) {
      console.warn('Failed to clear native adhan alarms:', error);
    }
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (!this.isNative()) return;

    try {
      await NativeAdhanPlugin.setEnabled({ enabled });
    } catch (error) {
      console.warn('Failed to update native adhan enabled state:', error);
    }
  }

  async getStatus(): Promise<{ enabled: boolean; count: number }> {
    if (!this.isNative()) {
      return { enabled: true, count: 0 };
    }

    try {
      return await NativeAdhanPlugin.getStatus();
    } catch (error) {
      console.warn('Failed to fetch native adhan status:', error);
      return { enabled: true, count: 0 };
    }
  }
}

export const nativeAdhan = new NativeAdhanBridge();

/**
 * Convenient standalone helper to check and request exact alarms on native.
 */
export async function checkAndRequestExactAlarms(force: boolean = false): Promise<boolean> {
  return nativeAdhan.ensureExactAlarmPermission(force);
}

/**
 * Check whether exact alarm permission is granted.
 */
export async function isExactAlarmPermissionGranted(): Promise<boolean> {
  return nativeAdhan.canScheduleExactAlarms();
}
