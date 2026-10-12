/**
 * WidgetBridge — TypeScript wrapper for the native Android WidgetBridge plugin.
 *
 * Exposes four concrete methods implemented in Kotlin (WidgetBridge.kt):
 *   - syncPrayerData(payload: PrayerPayload)
 *   - syncDailyContent(payload: DailyContentPayload)
 *   - syncQuranProgress(payload: QuranProgressPayload)
 *   - pushTasbeehIncrement(count: number)
 *
 * SAFETY INVARIANTS:
 *   1. The Capacitor plugin proxy is NEVER awaited, passed to Promise.race, or treated
 *      as a thenable. Doing so causes JS to invoke "WidgetBridge.then()", which fails
 *      on Android because "then" is not an implemented native plugin method.
 *   2. Native calls run ONLY when Capacitor.isNativePlatform() is true.
 *   3. Every native call verifies method existence and is wrapped in try/catch with
 *      silent fallback so widget sync issues can never crash or throw unhandled rejections.
 *   4. On web (non-native), all functions are safe no-ops returning resolved promises.
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
 * Native plugin interface matching Kotlin WidgetBridge.kt:
 * Each method receives a JSObject with stringified "payload" or numeric "count".
 */
interface NativeWidgetBridge {
  syncPrayerData(opts: { payload: string }): Promise<{ status: string }>;
  syncDailyContent(opts: { payload: string }): Promise<{ status: string }>;
  syncQuranProgress(opts: { payload: string }): Promise<{ status: string }>;
  pushTasbeehIncrement(opts: { count: number }): Promise<{ status: string }>;
}

let nativePluginInstance: NativeWidgetBridge | null = null;

/**
 * Synchronous plugin getter. NEVER await this object or check its `.then`.
 */
function getNativePlugin(): NativeWidgetBridge | null {
  if (nativePluginInstance) return nativePluginInstance;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    // Capacitor.registerPlugin returns a synchronous Proxy object.
    // Do NOT wrap this in Promise.race or await!
    nativePluginInstance = Capacitor.registerPlugin<NativeWidgetBridge>('WidgetBridge');
    return nativePluginInstance;
  } catch (err) {
    console.warn('[WidgetBridge] Failed to register native plugin:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────

function validatePrayerPayload(payload: PrayerPayload): string | null {
  if (!payload || !payload.prayers || payload.prayers.length !== 6) {
    return 'Prayer payload must contain exactly 6 prayers';
  }
  if (payload.nextPrayerIndex < 0 || payload.nextPrayerIndex >= 6) {
    return 'nextPrayerIndex out of range (0-5)';
  }
  if (!payload.prayers[payload.nextPrayerIndex]) {
    return 'nextPrayerIndex does not match a valid prayer';
  }
  return null;
}

function validateDailyContentPayload(payload: DailyContentPayload): string | null {
  if (!payload || !payload.ayah || !payload.ayah.arabic) {
    return 'Daily content missing ayah arabic';
  }
  if (!payload.hadith || !payload.hadith.source) {
    return 'Daily content missing hadith source';
  }
  return null;
}

function validateQuranProgressPayload(payload: QuranProgressPayload): string | null {
  if (!payload) {
    return 'Quran progress payload is missing';
  }
  if (payload.currentSurah < 1 || payload.currentSurah > 114) {
    return 'currentSurah out of range (1-114)';
  }
  if (payload.totalPercent < 0 || payload.totalPercent > 100) {
    return 'totalPercent out of range (0-100)';
  }
  return null;
}

// ─────────────────────────────────────────────────────────
// Public Exported Bridge Functions
// ─────────────────────────────────────────────────────────

/**
 * Push prayer times to Android widgets.
 * Safe to call anywhere; no-ops on web with resolved promise.
 */
export async function syncPrayerData(payload: PrayerPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const err = validatePrayerPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncPrayerData validation error:', err);
    return;
  }

  try {
    const plugin = getNativePlugin();
    if (!plugin || typeof plugin.syncPrayerData !== 'function') return;
    await plugin.syncPrayerData({ payload: JSON.stringify(payload) });
  } catch (err) {
    // Silent fallback: never surface widget errors to global error handlers
    console.warn('[WidgetBridge] syncPrayerData failed silently:', err);
  }
}

/**
 * Push daily ayah + hadith to Android widgets.
 * Safe to call anywhere; no-ops on web with resolved promise.
 */
export async function syncDailyContent(payload: DailyContentPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const err = validateDailyContentPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncDailyContent validation error:', err);
    return;
  }

  try {
    const plugin = getNativePlugin();
    if (!plugin || typeof plugin.syncDailyContent !== 'function') return;
    await plugin.syncDailyContent({ payload: JSON.stringify(payload) });
  } catch (err) {
    console.warn('[WidgetBridge] syncDailyContent failed silently:', err);
  }
}

/**
 * Push Quran reading progress to Android widgets.
 * Safe to call anywhere; no-ops on web with resolved promise.
 */
export async function syncQuranProgress(payload: QuranProgressPayload): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const err = validateQuranProgressPayload(payload);
  if (err) {
    console.warn('[WidgetBridge] syncQuranProgress validation error:', err);
    return;
  }

  try {
    const plugin = getNativePlugin();
    if (!plugin || typeof plugin.syncQuranProgress !== 'function') return;
    await plugin.syncQuranProgress({ payload: JSON.stringify(payload) });
  } catch (err) {
    console.warn('[WidgetBridge] syncQuranProgress failed silently:', err);
  }
}

/**
 * Increment total tasbeeh counter on native widgets.
 * Safe to call anywhere; no-ops on web with resolved promise.
 */
export async function pushTasbeehIncrement(count: number): Promise<void> {
  if (!Capacitor.isNativePlatform() || count <= 0) return;

  try {
    const plugin = getNativePlugin();
    if (!plugin || typeof plugin.pushTasbeehIncrement !== 'function') return;
    await plugin.pushTasbeehIncrement({ count });
  } catch (err) {
    console.warn('[WidgetBridge] pushTasbeehIncrement failed silently:', err);
  }
}
