/**
 * Crash Logger & Diagnostics ("Black Box")
 * Captures uncaught errors and unhandled promise rejections, persisting the last 3 entries to localStorage.
 */

export interface CrashEntry {
  message: string;
  stack: string;
  time: string;
  route: string;
  type?: string;
  step?: string;
}

const CRASH_STORAGE_KEY = 'noor_last_crash';
const MAX_ENTRIES = 3;

function getSafeRoute(): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      return (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
    }
  } catch {
    // silent fallback - intentional, see stability hardening notes
  }
  return '/';
}

function extractFirstFiveStackLines(stack?: string): string {
  if (!stack || typeof stack !== 'string') return '';
  return stack
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .join('\n');
}

export function recordCrash(entry: {
  message: string;
  stack?: string;
  route?: string;
  time?: string;
  type?: string;
  step?: string;
}): void {
  try {
    const existing = getLastCrashes();
    const cleanEntry: CrashEntry = {
      message: entry.message || 'Unknown error',
      stack: extractFirstFiveStackLines(entry.stack),
      time: entry.time || new Date().toISOString(),
      route: entry.route || getSafeRoute(),
      ...(entry.type ? { type: entry.type } : {}),
      ...(entry.step ? { step: entry.step } : {}),
    };

    const updated = [cleanEntry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(CRASH_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to record crash diagnostics:', err);
  }
}

export function getLastCrashes(): CrashEntry[] {
  try {
    const raw = localStorage.getItem(CRASH_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_ENTRIES);
    }
  } catch {
    // silent fallback - intentional, see stability hardening notes
  }
  return [];
}

export function clearCrashes(): void {
  try {
    localStorage.removeItem(CRASH_STORAGE_KEY);
  } catch {
    // silent fallback - intentional, see stability hardening notes
  }
}

let isInitialized = false;

export function initCrashLogger(): void {
  if (isInitialized || typeof window === 'undefined') return;
  isInitialized = true;

  // Global uncaught JS exceptions
  const originalOnError = window.onerror;
  window.onerror = function (event, source, lineno, colno, error) {
    try {
      const msg = typeof event === 'string' ? event : error?.message || 'Script error';
      const stack = error?.stack || (source ? `at ${source}:${lineno}:${colno}` : '');
      recordCrash({
        message: msg,
        stack,
      });
    } catch {
      // silent fallback - intentional, see stability hardening notes
    }

    if (typeof originalOnError === 'function') {
      return originalOnError.apply(this, [event, source, lineno, colno, error]);
    }
    return false;
  };

  // Global unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    try {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack = '';

      if (reason instanceof Error) {
        message = reason.message || 'Error in Promise';
        stack = reason.stack || '';
      } else if (typeof reason === 'string') {
        message = reason;
      } else if (reason && typeof reason === 'object') {
        try {
          message = JSON.stringify(reason);
        } catch {
          message = String(reason);
        }
      }

      recordCrash({
        message,
        stack,
      });
    } catch {
      // silent fallback - intentional, see stability hardening notes
    }
  });
}
