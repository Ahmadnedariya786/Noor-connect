import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import BatteryOptimization from './battery-optimization';
import { nativeAdhan, openExactAlarmSettings } from './native-adhan';
import { toast } from '@/hooks/use-toast';

export const ONBOARDING_STEP_A_KEY = 'onboarding_step_a_done';
export const ONBOARDING_STEP_B_KEY = 'onboarding_step_b_done';
export const ONBOARDING_PERMS_V2_KEY = 'onboarding_perms_v2_done';

let isSequenceRunning = false;

interface WaitForUserReturnOptions {
  gracePeriodMs?: number;
  timeoutMs?: number;
}

/**
 * Wait until the user returns to the app from an external system dialog or activity.
 * 1. Attaches listeners BEFORE the intent is fired.
 * 2. Enforces a 1000ms grace period so Android activity transition flaps (focus / visibilitychange) are ignored.
 * 3. Enforces a ~75-second safety timeout fallback so a missed OEM lifecycle event never hangs the app forever.
 */
function waitForUserReturn(options?: WaitForUserReturnOptions): Promise<void> {
  const gracePeriodMs = options?.gracePeriodMs ?? 1000;
  const timeoutMs = options?.timeoutMs ?? 75000;
  const startTime = Date.now();

  return new Promise<void>((resolve) => {
    let resolved = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cleanup: (() => void) | null = null;

    const onReturn = () => {
      if (resolved) return;
      const elapsed = Date.now() - startTime;
      if (elapsed < gracePeriodMs) {
        // Ignore activity transition flaps during initial grace period
        return;
      }
      resolved = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (cleanup) cleanup();
      resolve();
    };

    // Safety timeout fallback (75s) so a dropped OEM event never hangs the sequence forever
    timeoutId = setTimeout(() => {
      onReturn();
    }, timeoutMs);

    // 1. Capacitor App lifecycle listeners
    const resumePromise: Promise<PluginListenerHandle | null> = CapacitorApp.addListener('resume', () => {
      onReturn();
    }).catch(() => null);

    const statePromise: Promise<PluginListenerHandle | null> = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        onReturn();
      }
    }).catch(() => null);

    // 2. DOM visibilitychange
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onReturn();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // 3. Window focus
    const onFocus = () => {
      onReturn();
    };
    window.addEventListener('focus', onFocus);

    cleanup = () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', onFocus);
      resumePromise.then((h) => h?.remove()).catch(() => {
        // Safe listener cleanup fallback
      });
      statePromise.then((h) => h?.remove()).catch(() => {
        // Safe listener cleanup fallback
      });
    };
  });
}

/**
 * Executes STEP B only:
 * 1. Attaches return listeners BEFORE firing the intent.
 * 2. Opens the system "Alarms & reminders" settings page for Noor Connect.
 * 3. Waits for the user to return from settings (with 1s grace period and 75s timeout).
 * 4. Shows a small toast hint:
 *    - Success hint if exact-alarm permission is now granted.
 *    - Gentle hint ("you can enable this later in Settings") if not.
 * 5. Sets onboarding_step_b_done and onboarding_perms_v2_done flags so it never repeats.
 */
export async function executeStepB(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }

  let granted = false;
  try {
    // Attach return listener BEFORE triggering settings intent
    const returnPromise = waitForUserReturn({ gracePeriodMs: 1000, timeoutMs: 75000 });

    // Directly open system "Alarms & reminders" settings screen
    await openExactAlarmSettings();

    // Wait until the user returns from settings (or 75s timeout fallback)
    await returnPromise;

    // Brief delay to allow Android activity transition and view focus to settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify whether exact alarm permission is now granted
    granted = await nativeAdhan.canScheduleExactAlarms();

    if (granted) {
      toast({
        title: 'Alarms & Reminders Enabled',
        description: 'Exact prayer alarms are now configured to alert on time.',
      });
    } else {
      toast({
        title: 'Alarms Permission Not Enabled',
        description: 'You can enable Alarms & reminders later in Settings > Privacy & Permissions.',
      });
    }
  } catch (err) {
    // Handled non-fatal error executing Step B
    console.warn('Step B (exact alarms settings) error:', err);
  } finally {
    localStorage.setItem(ONBOARDING_STEP_B_KEY, 'true');
    localStorage.setItem(ONBOARDING_PERMS_V2_KEY, 'true');
  }

  return granted;
}

/**
 * Coordinated first-launch permission onboarding sequence:
 * 1. FIRST LAUNCH ONLY, right after splash hands off to home:
 *    OEM/system dialog "Let app always run in background?" (Allow/Deny) appears FIRST (Step A).
 * 2. AFTER user answers that dialog and returns to the app:
 *    The app THEN opens the system "Alarms & reminders" settings page for this app (Step B).
 * 3. AFTER the user returns from that settings page:
 *    Show a small toast - success hint if granted, or gentle reminder if not.
 * 4. The sequence must NEVER loop or repeat on later launches (two-flag localStorage persistence),
 *    and must never run on web.
 */
export async function runFirstLaunchPermissionOnboarding(force = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const stepADone = localStorage.getItem(ONBOARDING_STEP_A_KEY) === 'true';
  const stepBDone = localStorage.getItem(ONBOARDING_STEP_B_KEY) === 'true';

  // If already finished and not forced, return immediately
  if (!force && stepADone && stepBDone) {
    return;
  }

  // Also respect legacy flag if both steps aren't explicitly tracked
  if (!force && !stepADone && !stepBDone && localStorage.getItem(ONBOARDING_PERMS_V2_KEY) === 'true') {
    return;
  }

  if (isSequenceRunning) {
    return;
  }
  isSequenceRunning = true;

  try {
    // ── STEP A: OEM Background / Battery Optimization Dialog ──
    if (force || !stepADone) {
      // Mark Step A done immediately before intent so it never repeats
      localStorage.setItem(ONBOARDING_STEP_A_KEY, 'true');

      try {
        const status = await BatteryOptimization.isIgnoringBatteryOptimizations().catch(() => {
          // Fallback query failure: assume not yet whitelisted
          return { isIgnoring: false };
        });

        if (!status?.isIgnoring) {
          // Attach return listener BEFORE triggering intent to avoid race conditions
          const returnPromise = waitForUserReturn({ gracePeriodMs: 1000, timeoutMs: 75000 });

          await BatteryOptimization.requestIgnoreBatteryOptimizations();

          // Wait until user answers Step A and returns to app
          await returnPromise;

          // Brief delay to allow Android activity transition and view focus to settle
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      } catch (stepAErr) {
        // Step A unsupported on this device/ROM; log and continue to Step B
        console.warn('Step A (battery optimization) unsupported or failed:', stepAErr);
      }
    }

    // ── STEP B: Exact Alarm Settings ──
    if (force || !stepBDone) {
      const canSchedule = await nativeAdhan.canScheduleExactAlarms();
      if (!canSchedule) {
        await executeStepB();
      } else {
        localStorage.setItem(ONBOARDING_STEP_B_KEY, 'true');
        localStorage.setItem(ONBOARDING_PERMS_V2_KEY, 'true');
      }
    }
  } catch (err) {
    // Global onboarding sequence error guard
    console.warn('First launch permission onboarding encountered error:', err);
  } finally {
    isSequenceRunning = false;
  }
}

/**
 * On ANY later resume or next launch, if Step A is done but Step B is not done
 * and the exact-alarm permission is still missing, run STEP B then.
 * This guarantees STEP B happens even if the return event was missed.
 */
export async function checkPendingOnboardingStepB(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  if (isSequenceRunning) {
    return;
  }

  const stepADone = localStorage.getItem(ONBOARDING_STEP_A_KEY) === 'true';
  const stepBDone = localStorage.getItem(ONBOARDING_STEP_B_KEY) === 'true';

  if (stepADone && !stepBDone) {
    try {
      const canSchedule = await nativeAdhan.canScheduleExactAlarms();
      if (!canSchedule) {
        isSequenceRunning = true;
        try {
          await executeStepB();
        } finally {
          isSequenceRunning = false;
        }
      } else {
        localStorage.setItem(ONBOARDING_STEP_B_KEY, 'true');
        localStorage.setItem(ONBOARDING_PERMS_V2_KEY, 'true');
      }
    } catch (err) {
      // Handled error checking pending Step B
      console.warn('Error during pending Step B check:', err);
    }
  }
}

/**
 * Self-heal cleared onboarding flags on existing install:
 * If native bridge checks (canScheduleExactAlarms / isIgnoringBatteryOptimizations) return true
 * while the localStorage markers were cleared by a previous cache clear, automatically restore those
 * markers in localStorage so the user's device immediately returns to 8/8 Subsystems Passed.
 */
export async function healPermissionOnboardingFlags(): Promise<{
  stepA: boolean;
  stepB: boolean;
  permsV2: boolean;
}> {
  if (!Capacitor.isNativePlatform()) {
    return { stepA: true, stepB: true, permsV2: true };
  }

  let stepA = localStorage.getItem(ONBOARDING_STEP_A_KEY) === 'true';
  let stepB = localStorage.getItem(ONBOARDING_STEP_B_KEY) === 'true';
  let permsV2 = localStorage.getItem(ONBOARDING_PERMS_V2_KEY) === 'true';

  try {
    const [batteryStatus, canSchedule] = await Promise.all([
      BatteryOptimization.isIgnoringBatteryOptimizations().catch(() => ({ isIgnoring: false })),
      nativeAdhan.canScheduleExactAlarms().catch(() => false),
    ]);

    if (batteryStatus?.isIgnoring && !stepA) {
      localStorage.setItem(ONBOARDING_STEP_A_KEY, 'true');
      stepA = true;
    }
    if (canSchedule && (!stepB || !permsV2)) {
      localStorage.setItem(ONBOARDING_STEP_B_KEY, 'true');
      localStorage.setItem(ONBOARDING_PERMS_V2_KEY, 'true');
      stepB = true;
      permsV2 = true;
    }
  } catch (err) {
    // Handled bridge check error
    console.warn('healPermissionOnboardingFlags bridge error:', err);
  }

  return { stepA, stepB, permsV2 };
}

/**
 * Debug trigger for testing:
 * Clears onboarding flags and immediately runs the full sequence (native only).
 */
export async function rerunPermissionOnboarding(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  localStorage.removeItem(ONBOARDING_STEP_A_KEY);
  localStorage.removeItem(ONBOARDING_STEP_B_KEY);
  localStorage.removeItem(ONBOARDING_PERMS_V2_KEY);
  isSequenceRunning = false;
  await runFirstLaunchPermissionOnboarding(true);
}

// Auto-attach lifecycle listener for Step B and self-healing recovery on native resume
if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  // Run eager heal on startup
  healPermissionOnboardingFlags().catch(() => {
    // Safe startup heal fallback
  });

  CapacitorApp.addListener('resume', () => {
    healPermissionOnboardingFlags().catch(() => {
      // Safe resume heal fallback
    });
    checkPendingOnboardingStepB().catch((err) => {
      // Handled background resume Step B recovery error
      console.warn('Resume Step B check failed:', err);
    });
  }).catch(() => {
    // Handled platform where CapacitorApp listener registration is unavailable
  });
}
