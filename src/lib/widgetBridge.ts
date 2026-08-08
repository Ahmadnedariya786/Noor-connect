/**
 * WidgetBridge — TypeScript wrapper for the native Android WidgetBridge plugin.
 *
 * This module replaces the deleted `widgetPlugin.ts`. It exposes four methods
 * that mirror the Kotlin `WidgetBridge` Capacitor plugin:
 *
 *   syncPrayerData(payload: PrayerPayload)
 *   syncDailyContent(payload: DailyContentPayload)
 *   syncQuranProgress(payload: QuranProgressPayload)
 *   pushTasbeehIncrement(count: number)
 *
 * On web (non-native), all methods are no-ops that resolve immediately —
 * so the rest of the app can call them unconditionally without breaking
 * the browser preview.
 *
 * The bridge is lazy-initialized on first use to avoid top-level await.
 * Includes cold-start guard to prevent plugin registration race conditions.
 */

import { Capacitor } from '@capacitor/core';
import type {
  PrayerPayload,
  DailyContentPayload,
  QuranProgressPayload,
} from './widget-types';

export interface WidgetBridge {
  syncPrayerData(payload: PrayerPayload): Promise<void>;
  syncDailyContent(payload: DailyContentPayload): Promise<void>;
  syncQuranProgress(payload: QuranProgressPayload): Promise<void>;
  pushTasbeehIncrement(count: number): Promise<void>;
}

/**
 * Note: the native plugin expects `payload` as a JSON string (Kotlin reads
 * it via `call.getString("payload")`). We serialize here on the TS side.
 */
interface NativeWidgetBridge {
  syncPrayerData(opts: { payload: string }): Promise<{ status: string }>;
  syncDailyContent(opts: { payload: string }): Promise<{ status: string }>;
  syncQuranProgress(opts: { payload: string }): Promise<{ status: string }>;
  pushTasbeehIncrement(opts: { count: number }): Promise<{ status: string }>;
}

const noopBridge: WidgetBridge = {
  syncPrayerData: async () => {},
  syncDailyContent: async () => {},
  syncQuranProgress: async () => {},
  pushTasbeehIncrement: async () => {},
};

let nativeInstance: NativeWidgetBridge | null = null;
let resolvedBridge: WidgetBridge | null = null;
let registrationPromise: Promise<NativeWidgetBridge | null> | null = null;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const REGISTRATION_TIMEOUT_MS = 5000;

/**
 * Cold-start guard: ensures plugin registration happens only once
 * and times out if Capacitor isn't ready (e.g., web view not initialized).
 */
async function registerPlugin(): Promise<NativeWidgetBridge | null> {
  if (nativeInstance) return nativeInstance;

  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      // Timeout guard for slow webview initialization
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Plugin registration timeout')), REGISTRATION_TIMEOUT_MS)
      );

      nativeInstance = await Promise.race([
        Capacitor.registerPlugin<NativeWidgetBridge>('WidgetBridge'),
        timeoutPromise,
      ]);
      return nativeInstance;
    } catch (err) {
      console.warn('[WidgetBridge] Native plugin registration failed:', err);
      nativeInstance = null;
      return null;
    } finally {
      registrationPromise = null;
    }
  })();

  return registrationPromise;
}

async function resolveBridge(): Promise<WidgetBridge> {
  if (resolvedBridge) return resolvedBridge;

  if (!Capacitor.isNativePlatform()) {
    resolvedBridge = noopBridge;
    return resolvedBridge;
  }

  await registerPlugin();

  if (!nativeInstance) {
    resolvedBridge = noopBridge;
    return resolvedBridge;
  }

  resolvedBridge = {
    syncPrayerData: async (payload) => {
      await withRetry(() => nativeInstance!.syncPrayerData({ payload: JSON.stringify(payload) }));
    },
    syncDailyContent: async (payload) => {
      await withRetry(() => nativeInstance!.syncDailyContent({ payload: JSON.stringify(payload) }));
    },
    syncQuranProgress: async (payload) => {
      await withRetry(() => nativeInstance!.syncQuranProgress({ payload: JSON.stringify(payload) }));
    },
    pushTasbeehIncrement: async (count) => {
      await withRetry(() => nativeInstance!.pushTasbeehIncrement({ count }));
    },
  };

  return resolvedBridge;
}

// Validation helpers
function validatePrayerPayload(payload: PrayerPayload): string | null {
  if (!payload.prayers || payload.prayers.length !== 6) {
    return 'Prayer payload must contain exactly 6 prayers';
  }
  if (payload.nextPrayerIndex < 0 || payload.nextPrayerIndex >= 6) {
    return 'nextPrayerIndex out of range (0-5)';
  }
  if (!payload.prayers[payload.nextPrayerIndex]) {
    return 'nextPrayerIndex does not match a valid prayer';
  }
  if (!payload.lastUpdated || payload.lastUpdated > Date.now() + 86400000) {
    return 'lastUpdated timestamp is invalid';
  }
  return null;
}

function validateDailyContentPayload(payload: DailyContentPayload): string | null {
  if (!payload.ayah || !payload.ayah.arabic) {
    return 'Daily content missing ayah arabic';
  }
  if (!payload.hadith || !payload.hadith.source) {
    return 'Daily content missing hadith source';
  }
  return null;
}

function validateQuranProgressPayload(payload: QuranProgressPayload): string | null {
  if (payload.currentSurah < 1 || payload.currentSurah > 114) {
    return 'currentSurah out of range (1-114)';
  }
  if (payload.totalPercent < 0 || payload.totalPercent > 100) {
    return 'totalPercent out of range (0-100)';
  }
  if (!payload.lastUpdated || payload.lastUpdated > Date.now() + 86400000) {
    return 'lastUpdated timestamp is invalid';
  }
  return null;
}

// Retry wrapper with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const delay = BASE_RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
    console.warn(`[WidgetBridge] Call failed, retrying in ${delay}ms (${retries} retries left):`, err);
    await new Promise(r => setTimeout(r, delay));
    return withRetry(fn, retries - 1);
  }
}

/**
 * Push prayer data to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncPrayerData(payload: PrayerPayload): Promise<void> {
  const err = validatePrayerPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncPrayerData validation failed:', err);
    return;
  }
  const b = await resolveBridge();
  return b.syncPrayerData(payload);
}

/**
 * Push daily ayah + hadith to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncDailyContent(payload: DailyContentPayload): Promise<void> {
  const err = validateDailyContentPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncDailyContent validation failed:', err);
    return;
  }
  const b = await resolveBridge();
  return b.syncDailyContent(payload);
}

/**
 * Push Quran reading progress to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncQuranProgress(payload: QuranProgressPayload): Promise<void> {
  const err = validateQuranProgressPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncQuranProgress validation failed:', err);
    return;
  }
  const b = await resolveBridge();
  return b.syncQuranProgress(payload);
}

/**
 * Bump the total tasbeeh count by `count` (used when user completes a
 * session in-app). The widget reads from SharedPreferences on the native side.
 */
export async function pushTasbeehIncrement(count: number): Promise<void> {
  if (count <= 0) return;
  const b = await resolveBridge();
  return b.pushTasbeehIncrement(count);
}
