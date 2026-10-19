/**
 * Startup Breadcrumb & Diagnostics Helper
 *
 * Tracks the app startup sequence step-by-step in localStorage ('noor_startup_step').
 * BEFORE each startup step, writes: stepName + '@' + Date.now()
 * AFTER the step completes, writes: 'done'
 *
 * If the app crashes at the native or process layer (e.g. SIGSEGV, low-memory kill,
 * unhandled WebView crash, plugin fault), on the NEXT launch 'noor_startup_step'
 * will still hold the unfinished step.
 *
 * checkAndRecordStartupCrash() reads this value immediately on launch:
 * if non-'done', it records the failure into the existing Diagnostics crash store
 * ('noor_last_crash') as { type: 'startup-crash', step, time, ... } and resets
 * the marker to 'done'. This surfaces the exact crashing step in Settings > About > Diagnostics
 * without needing logcat or developer tools.
 */

import { recordCrash } from './crash-logger';
import { recordBreadcrumb } from './diagnostics-engine';

export const STARTUP_STEP_KEY = 'noor_startup_step';
export const STARTUP_STEP_DONE = 'done';

/**
 * Cheap, synchronous marker written before an initialization step begins.
 */
export function markStartupStep(stepName: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STARTUP_STEP_KEY, `${stepName}@${Date.now()}`);
    }
  } catch {
    // localStorage may fail in extreme private-mode or quota-exceeded cases
  }
  recordBreadcrumb('STARTUP', `Step started: ${stepName}`);
}

/**
 * Cheap, synchronous marker written after an initialization step completes.
 */
export function completeStartupStep(stepName?: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STARTUP_STEP_KEY, STARTUP_STEP_DONE);
    }
  } catch {
    // Silently ignore
  }
  if (stepName) {
    recordBreadcrumb('STARTUP', `Step completed: ${stepName}`);
  }
}

/**
 * Inspects 'noor_startup_step' on launch before anything else runs.
 * If a non-'done' value is found from the previous launch, records it
 * into the Diagnostics crash log and clears the marker.
 */
export function checkAndRecordStartupCrash(): void {
  try {
    if (typeof localStorage === 'undefined') return;

    const raw = localStorage.getItem(STARTUP_STEP_KEY);
    if (raw && raw !== STARTUP_STEP_DONE) {
      // Previous run died mid-step!
      const atIndex = raw.lastIndexOf('@');
      let stepName = raw;
      let timestamp = Date.now();

      if (atIndex !== -1) {
        stepName = raw.slice(0, atIndex);
        const parsedTime = Number(raw.slice(atIndex + 1));
        if (!isNaN(parsedTime) && parsedTime > 0) {
          timestamp = parsedTime;
        }
      }

      const isoTime = new Date(timestamp).toISOString();

      // Record into the existing diagnostics crash store
      recordCrash({
        type: 'startup-crash',
        step: raw,
        time: isoTime,
        message: `[startup-crash] Failed during step: ${stepName}`,
        stack: `Process exited abnormally while executing startup step: ${raw}`,
        route: 'startup',
      });

      // Clear marker so it is only logged once
      localStorage.setItem(STARTUP_STEP_KEY, STARTUP_STEP_DONE);
    }
  } catch (err) {
    console.warn('Failed to check startup breadcrumb:', err);
  }
}

/**
 * Defensive execution helper that marks before, wraps in try/catch,
 * and completes after. Works for both synchronous functions and Promises.
 */
export function runStartupStep<T>(stepName: string, fn: () => T): T | undefined {
  markStartupStep(stepName);
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return (result as any).then(
        (val: any) => {
          completeStartupStep(stepName);
          return val;
        },
        (err: any) => {
          completeStartupStep(stepName);
          console.warn(`[Startup] Step '${stepName}' rejected:`, err);
          return undefined;
        }
      ) as unknown as T;
    }
    completeStartupStep(stepName);
    return result;
  } catch (err) {
    completeStartupStep(stepName);
    console.warn(`[Startup] Step '${stepName}' threw synchronously:`, err);
    return undefined;
  }
}
