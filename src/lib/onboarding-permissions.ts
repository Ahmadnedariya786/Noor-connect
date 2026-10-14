import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import BatteryOptimization from './battery-optimization';
import { nativeAdhan } from './native-adhan';

export const ONBOARDING_PERMS_V2_KEY = 'onboarding_perms_v2_done';

let isSequenceRunning = false;

/**
 * Wait until the user returns to the app from an external system dialog or activity.
 * Listens to Capacitor resume / appStateChange, DOM visibilitychange, and window focus.
 */
function waitForUserReturn(): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false;
    let cleanup: (() => void) | null = null;

    const onReturn = () => {
      if (resolved) return;
      resolved = true;
      if (cleanup) cleanup();
      resolve();
    };

    // 1. Capacitor App lifecycle listeners
    const resumePromise = CapacitorApp.addListener('resume', () => {
      onReturn();
    }).catch(() => {
      // Listener error handled on platforms without App plugin
    });

    const statePromise = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        onReturn();
      }
    }).catch(() => {
      // Listener error handled on platforms without App plugin
    });

    // 2. DOM visibilitychange
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onReturn();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 3. Window focus
    window.addEventListener('focus', onReturn);

    cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onReturn);
      resumePromise.then((h) => h?.remove?.()).catch(() => {
        // Safe listener cleanup fallback
      });
      statePromise.then((h) => h?.remove?.()).catch(() => {
        // Safe listener cleanup fallback
      });
    };
  });
}

/**
 * ONE explicit first-launch onboarding sequence:
 * STEP A: OEM/system dialog "Let app always run in background?" (Allow/Deny) appears FIRST.
 * STEP B: Only AFTER user returns from STEP A, the app opens system "Alarms & reminders" settings.
 * Persists localStorage flag 'onboarding_perms_v2_done' so it runs only once and never loops.
 */
export async function runFirstLaunchPermissionOnboarding(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  if (localStorage.getItem(ONBOARDING_PERMS_V2_KEY) === 'true') {
    return;
  }

  if (isSequenceRunning) {
    return;
  }
  isSequenceRunning = true;

  try {
    // Persist completion flag immediately to guarantee it never loops or prompts repeatedly
    localStorage.setItem(ONBOARDING_PERMS_V2_KEY, 'true');

    // STEP A: OEM dialog "Let app always run in background?" (Allow/Deny) FIRST
    try {
      const status = await BatteryOptimization.isIgnoringBatteryOptimizations().catch(() => {
        // Caught query failure: assume not yet whitelisted to attempt prompt
        return { isIgnoring: false };
      });

      if (!status?.isIgnoring) {
        // Prepare resume/visibility listener BEFORE triggering intent to avoid race conditions
        const userReturnPromise = waitForUserReturn();

        await BatteryOptimization.requestIgnoreBatteryOptimizations();

        // Wait until user answers STEP A and returns to app
        await userReturnPromise;

        // Brief delay to allow Android activity transition and view focus to settle
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    } catch (stepAErr) {
      // Step A unsupported on this device; catch and proceed straight to Step B
      console.warn('Step A (battery optimization) unsupported or failed:', stepAErr);
    }

    // STEP B: Only AFTER user answers STEP A, check & open system "Alarms & reminders" settings
    try {
      const canSchedule = await nativeAdhan.canScheduleExactAlarms();
      if (!canSchedule) {
        await nativeAdhan.requestExactAlarmPermission();
      }
    } catch (stepBErr) {
      // Caught error requesting exact alarm permission; proceed safely
      console.warn('Step B (exact alarm settings) failed:', stepBErr);
    }
  } catch (err) {
    // Global onboarding sequence error guard
    console.warn('First launch permission onboarding encountered error:', err);
  } finally {
    isSequenceRunning = false;
  }
}
