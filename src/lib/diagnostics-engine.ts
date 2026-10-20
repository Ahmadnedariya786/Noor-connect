/**
 * Deep X-Ray Diagnostic Engine & Flight Recorder
 *
 * 100% local, capped in-memory ring buffers + quota-safe localStorage persistence.
 * Zero external tracking, zero new dependencies.
 *
 * Features:
 * - 5 Error & Warning Categories (capped ring buffer of 50 entries):
 *     REACT_CRASH, RUNTIME_ERROR, PROMISE_REJECTION, CONSOLE_ERROR, CONSOLE_WARN.
 * - Flight Recorder Breadcrumbs (last 35 navigation / action events).
 * - Active 8-Point "Deep Health Scanner" for live system diagnostics.
 * - One-tap structured AI Diagnostic Report export.
 */

import { BUILD_COMMIT, BUILD_TIME, APP_VERSION } from '@/buildInfo';
import { Capacitor } from '@capacitor/core';
import { calculatePrayerTimes, formatPrayerTime } from '@/lib/prayer-calculator';
import { getClockStyle } from '@/lib/clock-style';
import { LOCATION_STORAGE_KEY } from '@/lib/location-config';
import {
  ONBOARDING_STEP_A_KEY,
  ONBOARDING_STEP_B_KEY,
  ONBOARDING_PERMS_V2_KEY,
} from '@/lib/onboarding-permissions';

export type DiagnosticCategory =
  | 'REACT_CRASH'
  | 'RUNTIME_ERROR'
  | 'PROMISE_REJECTION'
  | 'CONSOLE_ERROR'
  | 'CONSOLE_WARN';

export interface DiagnosticEvent {
  id: string;
  category: DiagnosticCategory;
  message: string;
  stack?: string;
  componentStack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  route: string;
  time: string; // ISO
  commit?: string;
  type?: string; // backwards compatibility (e.g., 'react-boundary', 'startup-crash')
  step?: string; // backwards compatibility
  extra?: Record<string, unknown>;
}

export interface FlightBreadcrumb {
  id: string;
  timestamp: string; // ISO
  type: string;
  message: string;
}

export type HealthCheckStatus = 'PASS' | 'WARN' | 'FAIL';

export interface HealthCheckItem {
  id: string;
  name: string;
  status: HealthCheckStatus;
  summary: string;
  details: string;
}

export interface DeepHealthScanReport {
  timestamp: string;
  overallStatus: HealthCheckStatus;
  passedCount: number;
  warnCount: number;
  failCount: number;
  totalChecks: number;
  checks: HealthCheckItem[];
}

// Storage keys
export const DIAGNOSTICS_STORAGE_KEY = 'noor_diagnostics_store';
export const BREADCRUMBS_STORAGE_KEY = 'noor_flight_breadcrumbs';
export const LEGACY_CRASH_STORAGE_KEY = 'noor_last_crash';

const MAX_DIAGNOSTIC_EVENTS = 50;
const MAX_BREADCRUMBS = 35;
const MAX_LEGACY_CRASHES = 5;

// In-memory buffers
let eventsBuffer: DiagnosticEvent[] = [];
let breadcrumbsBuffer: FlightBreadcrumb[] = [];
let isStoreHydrated = false;

// Subscribers
type Listener = () => void;
const subscribers = new Set<Listener>();

function notifySubscribers(): void {
  subscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      // Safe subscriber invocation guard
    }
  });
}

export function subscribeDiagnostics(listener: Listener): () => void {
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
}

export function getSafeRoute(): string {
  try {
    if (typeof window !== 'undefined' && window.location) {
      return (window.location.pathname || '/') + (window.location.search || '') + (window.location.hash || '');
    }
  } catch {
    // Fallback if window.location throws
  }
  return '/';
}

function safePersist(key: string, data: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Handle QuotaExceededError defensively
    try {
      if (Array.isArray(data)) {
        const halved = data.slice(0, Math.max(1, Math.floor(data.length / 2)));
        localStorage.setItem(key, JSON.stringify(halved));
      }
    } catch {
      // If still fails, drop write safely without breaking app execution
    }
  }
}

function hydrateStore(): void {
  if (isStoreHydrated || typeof localStorage === 'undefined') return;
  isStoreHydrated = true;

  try {
    const rawEvents = localStorage.getItem(DIAGNOSTICS_STORAGE_KEY);
    if (rawEvents) {
      const parsed = JSON.parse(rawEvents);
      if (Array.isArray(parsed)) {
        const currentCommit =
          BUILD_COMMIT ||
          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) ||
          'unknown';

        eventsBuffer = parsed
          .filter((e: DiagnosticEvent) => {
            // Prune entries from previous commits if commit is known
            if (currentCommit !== 'unknown' && e.commit && e.commit !== 'unknown' && e.commit !== currentCommit) {
              return false;
            }
            // Filter out old resolved WidgetPlugin, network fetch, and gzip errors from previous versions
            const msg = String(e.message || '').toLowerCase();
            const isResolvedStartupIssue =
              msg.includes('widgetplugin') ||
              msg.includes('failed to send widget strings') ||
              msg.includes('failed to fetch') ||
              msg.includes('gzip variant missing') ||
              msg.includes('worker parse failed') ||
              msg.includes('could not verify native permissions') ||
              msg.includes('[updatechecker] check failed') ||
              msg.includes('failed to fetch monthly calendar') ||
              msg.includes('error fetching islamic date');

            if (isResolvedStartupIssue) {
              if (currentCommit !== 'unknown' && e.commit !== currentCommit) {
                return false;
              }
              if (e.commit === '331b0b1') {
                return false;
              }
            }
            return true;
          })
          .slice(0, MAX_DIAGNOSTIC_EVENTS);

        // Keep storage clean with pruned buffer
        safePersist(DIAGNOSTICS_STORAGE_KEY, eventsBuffer);
        syncLegacyCrashStore(eventsBuffer);
      }
    }
  } catch {
    eventsBuffer = [];
  }

  try {
    const rawCrumbs = localStorage.getItem(BREADCRUMBS_STORAGE_KEY);
    if (rawCrumbs) {
      const parsed = JSON.parse(rawCrumbs);
      if (Array.isArray(parsed)) {
        breadcrumbsBuffer = parsed.slice(0, MAX_BREADCRUMBS);
      }
    }
  } catch {
    breadcrumbsBuffer = [];
  }
}

// Ensure store is hydrated when module loads
hydrateStore();

/**
 * Sync legacy 'noor_last_crash' store so older components or external readers
 * remain 100% compatible.
 */
function syncLegacyCrashStore(events: DiagnosticEvent[]): void {
  try {
    const crashesOnly = events
      .filter((e) => e.category === 'REACT_CRASH' || e.category === 'RUNTIME_ERROR' || e.type === 'startup-crash')
      .slice(0, MAX_LEGACY_CRASHES)
      .map((e) => ({
        message: e.message,
        stack: e.stack || '',
        time: e.time,
        route: e.route,
        ...(e.type ? { type: e.type } : {}),
        ...(e.step ? { step: e.step } : {}),
        ...(e.commit ? { commit: e.commit } : {}),
      }));
    safePersist(LEGACY_CRASH_STORAGE_KEY, crashesOnly);
  } catch {
    // Safe legacy sync fallback
  }
}

let lastLoggedMessage = '';
let lastLoggedTimestamp = 0;

/**
 * Record a structured diagnostic event (Crash, Error, Rejection, Warning).
 */
export function recordDiagnosticEvent(event: {
  category: DiagnosticCategory;
  message: string;
  stack?: string;
  componentStack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  route?: string;
  time?: string;
  commit?: string;
  type?: string;
  step?: string;
  extra?: Record<string, unknown>;
}): DiagnosticEvent {
  hydrateStore();

  const now = Date.now();
  const msg = event.message || 'Unknown Diagnostic Event';

  // Throttling for duplicate CONSOLE_WARN or rapid repeated logs within 1000ms
  if (event.category === 'CONSOLE_WARN' && msg === lastLoggedMessage && now - lastLoggedTimestamp < 1000) {
    return eventsBuffer[0];
  }
  lastLoggedMessage = msg;
  lastLoggedTimestamp = now;

  const currentCommit =
    event.commit ||
    BUILD_COMMIT ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) ||
    'unknown';

  const entry: DiagnosticEvent = {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    category: event.category,
    message: msg,
    stack: event.stack?.trim(),
    componentStack: event.componentStack?.trim(),
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    route: event.route || getSafeRoute(),
    time: event.time || new Date().toISOString(),
    commit: currentCommit,
    ...(event.type ? { type: event.type } : {}),
    ...(event.step ? { step: event.step } : {}),
    ...(event.extra ? { extra: event.extra } : {}),
  };

  eventsBuffer = [entry, ...eventsBuffer].slice(0, MAX_DIAGNOSTIC_EVENTS);
  safePersist(DIAGNOSTICS_STORAGE_KEY, eventsBuffer);
  syncLegacyCrashStore(eventsBuffer);
  notifySubscribers();

  return entry;
}

/**
 * Record a timestamped flight-recorder breadcrumb.
 */
export function recordBreadcrumb(type: string, message: string): void {
  hydrateStore();

  try {
    const item: FlightBreadcrumb = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: type.toUpperCase(),
      message: message.trim(),
    };

    breadcrumbsBuffer = [item, ...breadcrumbsBuffer].slice(0, MAX_BREADCRUMBS);
    safePersist(BREADCRUMBS_STORAGE_KEY, breadcrumbsBuffer);
    notifySubscribers();
  } catch {
    // Safe breadcrumb recording guard
  }
}

/**
 * Get all captured diagnostic events (up to 50).
 */
export function getDiagnosticEntries(): DiagnosticEvent[] {
  hydrateStore();
  return [...eventsBuffer];
}

/**
 * Get all flight recorder breadcrumbs (up to 35).
 */
export function getRecentBreadcrumbs(): FlightBreadcrumb[] {
  hydrateStore();
  return [...breadcrumbsBuffer];
}

/**
 * Clear all diagnostic events and breadcrumbs.
 */
export function clearDiagnostics(): void {
  eventsBuffer = [];
  breadcrumbsBuffer = [];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DIAGNOSTICS_STORAGE_KEY);
      localStorage.removeItem(BREADCRUMBS_STORAGE_KEY);
      localStorage.removeItem(LEGACY_CRASH_STORAGE_KEY);
    }
  } catch {
    // Safe clearance fallback
  }
  notifySubscribers();
}

// -------------------------------------------------------------
// Global Interceptors
// -------------------------------------------------------------

let isInterceptorsInitialized = false;
let originalConsoleError: typeof console.error | null = null;
let originalConsoleWarn: typeof console.warn | null = null;
let isCapturingConsole = false;

function stringifyConsoleArg(arg: unknown): string {
  if (arg === undefined) return 'undefined';
  if (arg === null) return 'null';
  if (arg instanceof Error) {
    return arg.stack || arg.message || String(arg);
  }
  if (typeof arg === 'object') {
    try {
      return JSON.stringify(arg);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function extractStackSnippet(stack?: string): string {
  if (!stack || typeof stack !== 'string') return '';
  return stack
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(1, 6)
    .join('\n');
}

/**
 * Initialize all global error interceptors:
 * 1. window 'error' (JS errors + element resource failures in capture phase)
 * 2. window 'unhandledrejection' (Async/Promise/Capacitor failures)
 * 3. console.error & console.warn wrappers with recursion protection
 */
export function initDiagnosticsEngine(): void {
  if (isInterceptorsInitialized || typeof window === 'undefined') return;
  isInterceptorsInitialized = true;

  // 1. Uncaught JS runtime errors AND resource load failures (<audio>, <img>, <script>)
  window.addEventListener(
    'error',
    (event: ErrorEvent | Event) => {
      try {
        if (event instanceof ErrorEvent) {
          recordDiagnosticEvent({
            category: 'RUNTIME_ERROR',
            message: event.message || 'Script error',
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack:
              event.error?.stack ||
              (event.filename ? `at ${event.filename}:${event.lineno}:${event.colno}` : undefined),
          });
        } else {
          // Resource loading error
          const target = event.target as HTMLElement | null;
          if (target) {
            const tagName = target.tagName ? target.tagName.toLowerCase() : 'element';
            const src =
              (target as HTMLImageElement | HTMLAudioElement | HTMLScriptElement).src ||
              (target as unknown as { currentSrc?: string }).currentSrc ||
              '';
            recordDiagnosticEvent({
              category: 'RUNTIME_ERROR',
              message: `Resource failed to load: <${tagName}>${src ? ` [${src}]` : ''}`,
              filename: src || undefined,
            });
          }
        }
      } catch {
        // Safe interceptor error guard
      }
    },
    true // Capture phase: crucial for non-bubbling resource errors
  );

  // 2. Unhandled promise rejections (async, fetch, Capacitor plugin errors)
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

      recordDiagnosticEvent({
        category: 'PROMISE_REJECTION',
        message,
        stack,
      });
    } catch {
      // Safe interceptor rejection guard
    }
  });

  // 3. console.error interception
  if (!originalConsoleError) {
    originalConsoleError = console.error;
    console.error = function (...args: unknown[]) {
      try {
        if (originalConsoleError) {
          originalConsoleError.apply(console, args);
        }
      } catch {
        // Safe console output fallback
      }

      if (isCapturingConsole) return;
      isCapturingConsole = true;
      try {
        const msg = args.map(stringifyConsoleArg).join(' ');
        // Don't record internal diagnostics logs
        if (!msg.includes('[NOOR_DIAGNOSTICS]')) {
          const stack = new Error().stack;
          recordDiagnosticEvent({
            category: 'CONSOLE_ERROR',
            message: msg,
            stack: extractStackSnippet(stack),
          });
        }
      } catch {
        // Safe console error recording guard
      } finally {
        isCapturingConsole = false;
      }
    };
  }

  // 4. console.warn interception
  if (!originalConsoleWarn) {
    originalConsoleWarn = console.warn;
    console.warn = function (...args: unknown[]) {
      try {
        if (originalConsoleWarn) {
          originalConsoleWarn.apply(console, args);
        }
      } catch {
        // Safe console output fallback
      }

      if (isCapturingConsole) return;
      isCapturingConsole = true;
      try {
        const msg = args.map(stringifyConsoleArg).join(' ');
        // Don't record internal diagnostics logs or known noise
        if (!msg.includes('[NOOR_DIAGNOSTICS]')) {
          recordDiagnosticEvent({
            category: 'CONSOLE_WARN',
            message: msg,
          });
        }
      } catch {
        // Safe console warn recording guard
      } finally {
        isCapturingConsole = false;
      }
    };
  }

  recordBreadcrumb('STARTUP', 'Global diagnostics engine & interceptors initialized');
}

// -------------------------------------------------------------
// Active 8-Point "Deep Health Scanner"
// -------------------------------------------------------------

export const REQUIRED_THEME_TOKENS = [
  '--bg-base',
  '--bg-elev',
  '--surface',
  '--surface-2',
  '--border',
  '--accent',
  '--accent-text',
  '--on-accent',
  '--accent-soft',
  '--accent-glow',
  '--accent-2',
  '--text-primary',
  '--text-secondary',
  '--success',
  '--warning',
  '--danger',
  '--card-sheen',
] as const;

export const VALID_CLOCK_STYLES = [
  'digital-bold',
  'mosque-led',
  'crescent-moon',
  'ottoman-heritage',
  'hour-wedge',
  'prayer-arc',
] as const;

/**
 * Scan DOM for interactive horizontal overflows and viewport clipping
 */
function scanDomOverflow(): { count: number; items: string[]; hasScreenShift: boolean } {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return { count: 0, items: [], hasScreenShift: false };
  }

  const offending: string[] = [];
  const winWidth = window.innerWidth;
  const docScrollWidth = document.documentElement.scrollWidth;
  const hasScreenShift = docScrollWidth > winWidth + 1;

  if (hasScreenShift) {
    offending.push(`document.documentElement (scrollWidth=${docScrollWidth}px > innerWidth=${winWidth}px) [Screen shifting detected]`);
  }

  // 1. Scan interactive candidates for scrollWidth > clientWidth
  const candidates = document.querySelectorAll<HTMLElement>(
    'button, [role="button"], .card, [data-card], header, nav, .pill'
  );
  candidates.forEach((el) => {
    if (el.offsetParent !== null) {
      if (el.scrollWidth > el.clientWidth + 2) {
        const tag = el.tagName.toLowerCase();
        const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.')
          : '';
        const itemStr = `<${tag}${cls}> "${text}" (scrollWidth=${el.scrollWidth}px > clientWidth=${el.clientWidth}px)`;
        if (!offending.includes(itemStr)) {
          offending.push(itemStr);
        }
      }
    }
  });

  // 2. Scan visible elements in #root to detect bounding box extending outside viewport
  const rootElements = document.querySelectorAll<HTMLElement>('#root *');
  rootElements.forEach((el) => {
    if (el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0) {
      const rect = el.getBoundingClientRect();
      if (rect.right > winWidth + 2 || rect.left < -2) {
        const tag = el.tagName.toLowerCase();
        const text = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 24);
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.')
          : '';
        const positionDetail = rect.right > winWidth + 2
          ? `right=${Math.round(rect.right)}px > windowWidth=${winWidth}px (+${Math.round(rect.right - winWidth)}px overflow)`
          : `left=${Math.round(rect.left)}px < -2px`;
        const itemStr = `<${tag}${cls}> "${text}" (${positionDetail})`;
        if (!offending.includes(itemStr) && offending.length < 20) {
          offending.push(itemStr);
        }
      }
    }
  });

  return { count: offending.length, items: offending, hasScreenShift };
}

/**
 * Executes the active 8-point system health scan live.
 */
export async function runDeepSystemHealthScan(): Promise<DeepHealthScanReport> {
  const checks: HealthCheckItem[] = [];
  const now = new Date().toISOString();

  // 1. Build & Environment Check
  try {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    const width = typeof window !== 'undefined' ? window.innerWidth : 0;
    const height = typeof window !== 'undefined' ? window.innerHeight : 0;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const commitShort = BUILD_COMMIT !== 'unknown' ? BUILD_COMMIT.slice(0, 7) : 'dev';

    checks.push({
      id: 'build-env',
      name: 'Build & Environment Check',
      status: 'PASS',
      summary: `${platform.toUpperCase()} (${isNative ? 'Native' : 'Web'}) • Commit: ${commitShort} • ${width}×${height} (DPR: ${dpr})`,
      details: `Commit: ${BUILD_COMMIT}\nBuilt: ${BUILD_TIME}\nApp Version: ${APP_VERSION}\nPlatform: ${platform} (isNative: ${isNative})\nViewport: ${width}px × ${height}px (DPR: ${dpr})\nUser-Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`,
    });
  } catch (err) {
    checks.push({
      id: 'build-env',
      name: 'Build & Environment Check',
      status: 'WARN',
      summary: 'Could not read full environment metadata',
      details: String(err),
    });
  }

  // 2. Theme Token Integrity
  try {
    const computed = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    const activeTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('noor_theme')) || 'oxford-gold';
    const missingTokens: string[] = [];

    if (computed) {
      REQUIRED_THEME_TOKENS.forEach((token) => {
        const val = computed.getPropertyValue(token).trim();
        if (!val) {
          missingTokens.push(token);
        }
      });
    }

    if (missingTokens.length === 0) {
      checks.push({
        id: 'theme-tokens',
        name: 'Theme Token Integrity',
        status: 'PASS',
        summary: `All 17 root CSS tokens active on DOM • Theme: ${activeTheme}`,
        details: `17/17 design system tokens verified non-empty on document.documentElement.\nTheme ID: ${activeTheme}\nVerified tokens: ${REQUIRED_THEME_TOKENS.join(', ')}`,
      });
    } else {
      checks.push({
        id: 'theme-tokens',
        name: 'Theme Token Integrity',
        status: 'FAIL',
        summary: `${missingTokens.length} missing root theme tokens on DOM`,
        details: `Missing tokens: ${missingTokens.join(', ')}\nActive theme: ${activeTheme}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'theme-tokens',
      name: 'Theme Token Integrity',
      status: 'WARN',
      summary: 'Could not evaluate root CSS computed properties',
      details: String(err),
    });
  }

  // 3. Clock & Prayer Engine Integrity
  try {
    const currentClock = getClockStyle();
    const isClockValid = VALID_CLOCK_STYLES.includes(currentClock as unknown as typeof VALID_CLOCK_STYLES[number]);

    let lat = 21.4225; // Default: Makkah
    let lon = 39.8262;
    let locName = 'Makkah (Default)';

    if (typeof localStorage !== 'undefined') {
      const storedLoc = localStorage.getItem(LOCATION_STORAGE_KEY) || localStorage.getItem('user_selected_location');
      if (storedLoc) {
        try {
          const parsed = JSON.parse(storedLoc);
          if (typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number') {
            lat = parsed.latitude;
            lon = parsed.longitude;
            locName = parsed.locationName || 'Saved Location';
          }
        } catch {
          // Keep default coordinates
        }
      }
    }

    const times = calculatePrayerTimes(lat, lon, new Date());
    const validDates =
      times.fajr instanceof Date &&
      !isNaN(times.fajr.getTime()) &&
      times.dhuhr instanceof Date &&
      !isNaN(times.dhuhr.getTime()) &&
      times.asr instanceof Date &&
      !isNaN(times.asr.getTime()) &&
      times.maghrib instanceof Date &&
      !isNaN(times.maghrib.getTime()) &&
      times.isha instanceof Date &&
      !isNaN(times.isha.getTime());

    const formattedFajr = formatPrayerTime(times.fajr, '12h');
    const formattedMaghrib = formatPrayerTime(times.maghrib, '12h');
    const hasInvalidString =
      formattedFajr.includes('NaN') ||
      formattedFajr.includes('undefined') ||
      formattedMaghrib.includes('NaN') ||
      formattedMaghrib.includes('undefined');

    if (isClockValid && validDates && !hasInvalidString) {
      checks.push({
        id: 'clock-prayer',
        name: 'Clock & Prayer Engine Integrity',
        status: 'PASS',
        summary: `Clock: ${currentClock} • Prayer times calculated OK (${locName})`,
        details: `Clock Style: ${currentClock} (valid: ${isClockValid})\nLocation: ${locName} (${lat.toFixed(4)}, ${lon.toFixed(4)})\nCalculated Prayer Times:\n- Fajr: ${formattedFajr}\n- Sunrise: ${formatPrayerTime(times.sunrise, '12h')}\n- Dhuhr: ${formatPrayerTime(times.dhuhr, '12h')}\n- Asr: ${formatPrayerTime(times.asr, '12h')}\n- Maghrib: ${formattedMaghrib}\n- Isha: ${formatPrayerTime(times.isha, '12h')}`,
      });
    } else {
      checks.push({
        id: 'clock-prayer',
        name: 'Clock & Prayer Engine Integrity',
        status: 'FAIL',
        summary: 'Clock style or prayer calculation returned invalid data',
        details: `Clock Style: ${currentClock} (valid: ${isClockValid})\nDates valid: ${validDates}\nFormatted check: ${!hasInvalidString}\nFajr: ${formattedFajr}, Maghrib: ${formattedMaghrib}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'clock-prayer',
      name: 'Clock & Prayer Engine Integrity',
      status: 'FAIL',
      summary: 'Prayer calculation engine threw an exception',
      details: String(err),
    });
  }

  // 4. Navigation & Back-Button Health
  try {
    const route = getSafeRoute();
    const historyLen = typeof window !== 'undefined' ? window.history.length : 1;
    const isCapAppAvailable = Capacitor.isPluginAvailable('App');
    const hasAndroidBridge = typeof window !== 'undefined' && Boolean((window as unknown as { AndroidBridge?: unknown }).AndroidBridge);
    const isNative = Capacitor.isNativePlatform();

    if (historyLen > 3) {
      checks.push({
        id: 'navigation-back',
        name: 'Navigation & Back-Button Health',
        status: 'WARN',
        summary: `History stack: ${historyLen} (> 3, risk of loop) • Route: ${route}`,
        details: `Current Route: ${route}\nHistory Stack Length: ${historyLen} (warning: length > 3 may cause back-navigation loops on Android)\nCapacitor App Plugin Available: ${isCapAppAvailable}\nNative AndroidBridge Active: ${hasAndroidBridge}`,
      });
    } else {
      checks.push({
        id: 'navigation-back',
        name: 'Navigation & Back-Button Health',
        status: 'PASS',
        summary: `History stack: ${historyLen} (healthy ≤ 3) • Route: ${route}`,
        details: `Current Route: ${route}\nHistory Stack Length: ${historyLen}\nCapacitor App Plugin Available: ${isCapAppAvailable}\nNative AndroidBridge Active: ${hasAndroidBridge}\nPlatform: ${isNative ? 'Native Android' : 'Web Browser'}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'navigation-back',
      name: 'Navigation & Back-Button Health',
      status: 'WARN',
      summary: 'Could not inspect navigation stack state',
      details: String(err),
    });
  }

  // 5. LocalStorage & Data Integrity
  try {
    let keyCount = 0;
    let totalBytes = 0;
    const corruptKeys: string[] = [];

    if (typeof localStorage !== 'undefined') {
      keyCount = localStorage.length;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const v = localStorage.getItem(k) || '';
          totalBytes += (k.length + v.length) * 2;
        }
      }

      // Test critical JSON keys
      const testKeys = [
        'noor_theme',
        'noor_clock_style',
        LOCATION_STORAGE_KEY,
        'user_selected_location',
        'qaza_prayers_count',
        'salah_records',
        'quran_reading_progress',
        DIAGNOSTICS_STORAGE_KEY,
        BREADCRUMBS_STORAGE_KEY,
        ONBOARDING_STEP_A_KEY,
      ];

      testKeys.forEach((k) => {
        const val = localStorage.getItem(k);
        if (val && (val.startsWith('{') || val.startsWith('['))) {
          try {
            JSON.parse(val);
          } catch {
            corruptKeys.push(k);
          }
        }
      });
    }

    const approxKB = (totalBytes / 1024).toFixed(1);

    if (corruptKeys.length === 0) {
      checks.push({
        id: 'storage-integrity',
        name: 'LocalStorage & Data Integrity',
        status: 'PASS',
        summary: `${keyCount} keys (~${approxKB} KB) • All critical JSON structures valid`,
        details: `Total localStorage keys: ${keyCount}\nApproximate storage used: ${approxKB} KB\nTested critical JSON keys: all parsed with zero SyntaxError exceptions.`,
      });
    } else {
      checks.push({
        id: 'storage-integrity',
        name: 'LocalStorage & Data Integrity',
        status: 'WARN',
        summary: `${corruptKeys.length} JSON key(s) failed parsing in localStorage`,
        details: `Corrupted key(s): ${corruptKeys.join(', ')}\nTotal keys: ${keyCount}\nApprox size: ${approxKB} KB`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'storage-integrity',
      name: 'LocalStorage & Data Integrity',
      status: 'FAIL',
      summary: 'LocalStorage is inaccessible or threw an exception',
      details: String(err),
    });
  }

  // 6. DOM Overflow & Clipping Detector
  try {
    const overflow = scanDomOverflow();
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 360;
    const docScrollWidth = typeof document !== 'undefined' ? document.documentElement.scrollWidth : winWidth;

    if (overflow.count === 0) {
      checks.push({
        id: 'dom-overflow',
        name: 'DOM Overflow & Clipping Detector',
        status: 'PASS',
        summary: '0 overflowing or clipped elements detected on active screen',
        details: `Viewport: ${winWidth}px • Document width: ${docScrollWidth}px\nScanned interactive elements and bounding rects in #root. Zero horizontal overflows or screen-shifting detected.`,
      });
    } else {
      checks.push({
        id: 'dom-overflow',
        name: 'DOM Overflow & Clipping Detector',
        status: overflow.hasScreenShift ? 'FAIL' : 'WARN',
        summary: `${overflow.count} element(s) exceeding card or viewport boundaries`,
        details: `Viewport: ${winWidth}px • Document width: ${docScrollWidth}px\nOffending element(s):\n${overflow.items.map((it, i) => `${i + 1}. ${it}`).join('\n')}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'dom-overflow',
      name: 'DOM Overflow & Clipping Detector',
      status: 'WARN',
      summary: 'Could not run DOM overflow scan',
      details: String(err),
    });
  }

  // 7. Audio & Media Subsystem
  try {
    const hasAudio = typeof window !== 'undefined' && typeof window.Audio !== 'undefined';
    const canPlayMp3 = hasAudio ? new Audio().canPlayType('audio/mpeg') : 'no';
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (hasAudio && canPlayMp3 !== '') {
      checks.push({
        id: 'audio-media',
        name: 'Audio & Media Subsystem',
        status: isOnline ? 'PASS' : 'WARN',
        summary: `Audio supported (MP3 playable) • Network: ${isOnline ? 'Online' : 'Offline'}`,
        details: `HTMLAudioElement: Available\nMP3 Codec Support: ${canPlayMp3 || 'none'}\nNetwork Connectivity: ${isOnline ? 'Connected (online)' : 'Disconnected (offline)'}`,
      });
    } else {
      checks.push({
        id: 'audio-media',
        name: 'Audio & Media Subsystem',
        status: 'WARN',
        summary: 'HTMLAudioElement not supported or MP3 codec unavailable',
        details: `HTMLAudioElement: ${hasAudio}\nMP3 Codec: ${canPlayMp3}\nNetwork: ${isOnline ? 'Online' : 'Offline'}`,
      });
    }
  } catch (err) {
    checks.push({
      id: 'audio-media',
      name: 'Audio & Media Subsystem',
      status: 'WARN',
      summary: 'Error checking audio and network subsystems',
      details: String(err),
    });
  }

  // 8. Permission Onboarding Flags
  try {
    const isNative = Capacitor.isNativePlatform();
    const stepA = typeof localStorage !== 'undefined' ? localStorage.getItem(ONBOARDING_STEP_A_KEY) : null;
    const stepB = typeof localStorage !== 'undefined' ? localStorage.getItem(ONBOARDING_STEP_B_KEY) : null;
    const permsV2 = typeof localStorage !== 'undefined' ? localStorage.getItem(ONBOARDING_PERMS_V2_KEY) : null;

    if (!isNative) {
      checks.push({
        id: 'permission-flags',
        name: 'Permission Onboarding Flags',
        status: 'PASS',
        summary: 'Web platform • Native Android permissions not required',
        details: 'Running in Web Browser mode. Android exact alarm and OEM background permission onboarding are skipped automatically.',
      });
    } else {
      const isComplete = stepA === 'true' && (stepB === 'true' || permsV2 === 'true');
      if (isComplete) {
        checks.push({
          id: 'permission-flags',
          name: 'Permission Onboarding Flags',
          status: 'PASS',
          summary: 'OEM Background: Done • Exact Alarm: Done',
          details: `Step A (OEM background exemption): ${stepA}\nStep B (Exact alarm permission): ${stepB}\nPermissions v2 marker: ${permsV2}`,
        });
      } else {
        checks.push({
          id: 'permission-flags',
          name: 'Permission Onboarding Flags',
          status: 'WARN',
          summary: `Step A: ${stepA === 'true' ? 'Done' : 'Pending'} • Step B: ${stepB === 'true' ? 'Done' : 'Pending'}`,
          details: `Android permission onboarding has pending steps.\nStep A (OEM background exemption): ${stepA ?? 'unset'}\nStep B (Exact alarm permission): ${stepB ?? 'unset'}\nPermissions v2 marker: ${permsV2 ?? 'unset'}`,
        });
      }
    }
  } catch (err) {
    checks.push({
      id: 'permission-flags',
      name: 'Permission Onboarding Flags',
      status: 'WARN',
      summary: 'Could not inspect permission onboarding flags',
      details: String(err),
    });
  }

  const passedCount = checks.filter((c) => c.status === 'PASS').length;
  const warnCount = checks.filter((c) => c.status === 'WARN').length;
  const failCount = checks.filter((c) => c.status === 'FAIL').length;
  const overallStatus: HealthCheckStatus = failCount > 0 ? 'FAIL' : warnCount > 0 ? 'WARN' : 'PASS';

  recordBreadcrumb('HEALTH_SCAN', `8-Point Scan Completed: ${passedCount} PASS, ${warnCount} WARN, ${failCount} FAIL`);

  return {
    timestamp: now,
    overallStatus,
    passedCount,
    warnCount,
    failCount,
    totalChecks: checks.length,
    checks,
  };
}

// -------------------------------------------------------------
// AI Diagnostic Report Generator (1-Tap Copy)
// -------------------------------------------------------------

/**
 * Format a comprehensive structured Markdown report ready to paste to AI.
 */
export async function generateAiDiagnosticReport(existingScan?: DeepHealthScanReport | null): Promise<string> {
  const scan = existingScan || (await runDeepSystemHealthScan());
  const events = getDiagnosticEntries();
  const crumbs = getRecentBreadcrumbs();
  const now = new Date().toISOString();

  const commitShort = BUILD_COMMIT !== 'unknown' ? BUILD_COMMIT.slice(0, 7) : 'dev';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  const height = typeof window !== 'undefined' ? window.innerHeight : 0;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  let md = `# NOOR CONNECT — DEEP X-RAY DIAGNOSTIC REPORT & FLIGHT RECORDER\n`;
  md += `**Generated:** ${now}\n`;
  md += `**App Version:** ${APP_VERSION}\n`;
  md += `**Commit:** ${commitShort} (${BUILD_COMMIT})\n`;
  md += `**Built:** ${BUILD_TIME}\n`;
  md += `**Platform:** ${platform.toUpperCase()} (${isNative ? 'Native Android' : 'Web Browser'})\n`;
  md += `**Viewport:** ${width}px × ${height}px (DPR: ${dpr})\n`;
  md += `**Active Route:** ${getSafeRoute()}\n`;
  md += `**User-Agent:** ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}\n\n`;

  md += `---\n\n`;
  md += `## 1. 8-POINT SUBSYSTEM HEALTH SCAN (${scan.passedCount}/${scan.totalChecks} PASSED)\n\n`;

  scan.checks.forEach((chk, idx) => {
    const symbol = chk.status === 'PASS' ? '✓ [PASS]' : chk.status === 'WARN' ? '⚠ [WARN]' : '✕ [FAIL]';
    md += `### ${idx + 1}. ${chk.name} — ${symbol}\n`;
    md += `**Summary:** ${chk.summary}\n`;
    if (chk.details) {
      md += `\`\`\`text\n${chk.details}\n\`\`\`\n`;
    }
    md += `\n`;
  });

  md += `---\n\n`;
  md += `## 2. RECORDED ERRORS & WARNINGS (${events.length} TOTAL)\n\n`;

  if (events.length === 0) {
    md += `✓ *No crashes, runtime errors, or console errors recorded in buffer.*\n\n`;
  } else {
    events.forEach((ev, idx) => {
      md += `### [${idx + 1}] [${ev.category}] ${ev.time} — Route: ${ev.route}\n`;
      md += `**Message:** ${ev.message}\n`;
      if (ev.filename) {
        md += `**Location:** ${ev.filename}${ev.lineno !== undefined ? `:${ev.lineno}:${ev.colno}` : ''}\n`;
      }
      if (ev.commit) {
        md += `**Commit Hash:** ${ev.commit}\n`;
      }
      if (ev.componentStack) {
        md += `**React Component Stack:**\n\`\`\`text\n${ev.componentStack}\n\`\`\`\n`;
      }
      if (ev.stack) {
        md += `**Stack Trace:**\n\`\`\`text\n${ev.stack}\n\`\`\`\n`;
      }
      md += `\n`;
    });
  }

  md += `---\n\n`;
  md += `## 3. FLIGHT RECORDER BREADCRUMBS (LAST ${crumbs.length} EVENTS)\n\n`;

  if (crumbs.length === 0) {
    md += `*No flight breadcrumbs recorded yet.*\n\n`;
  } else {
    crumbs.forEach((crumb, idx) => {
      md += `${idx + 1}. \`[${crumb.timestamp}]\` **[${crumb.type}]** ${crumb.message}\n`;
    });
    md += `\n`;
  }

  md += `---\n*Generated by Noor Connect Deep X-Ray Diagnostics Engine*\n`;

  return md;
}
