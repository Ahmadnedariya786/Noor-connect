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

async function resolveBridge(): Promise<WidgetBridge> {
  if (resolvedBridge) return resolvedBridge;

  if (!Capacitor.isNativePlatform()) {
    resolvedBridge = noopBridge;
    return resolvedBridge;
  }

  try {
    nativeInstance = Capacitor.registerPlugin<NativeWidgetBridge>('WidgetBridge');
  } catch (err) {
    console.warn('[WidgetBridge] Failed to register native plugin, using noop:', err);
    resolvedBridge = noopBridge;
    return resolvedBridge;
  }

  if (!nativeInstance) {
    resolvedBridge = noopBridge;
    return resolvedBridge;
  }

  resolvedBridge = {
    syncPrayerData: async (payload) => {
      try {
        await nativeInstance!.syncPrayerData({ payload: JSON.stringify(payload) });
      } catch (err) {
        console.warn('[WidgetBridge] syncPrayerData failed:', err);
      }
    },
    syncDailyContent: async (payload) => {
      try {
        await nativeInstance!.syncDailyContent({ payload: JSON.stringify(payload) });
      } catch (err) {
        console.warn('[WidgetBridge] syncDailyContent failed:', err);
      }
    },
    syncQuranProgress: async (payload) => {
      try {
        await nativeInstance!.syncQuranProgress({ payload: JSON.stringify(payload) });
      } catch (err) {
        console.warn('[WidgetBridge] syncQuranProgress failed:', err);
      }
    },
    pushTasbeehIncrement: async (count) => {
      try {
        await nativeInstance!.pushTasbeehIncrement({ count });
      } catch (err) {
        console.warn('[WidgetBridge] pushTasbeehIncrement failed:', err);
      }
    },
  };

  return resolvedBridge;
}

/**
 * Push prayer data to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncPrayerData(payload: PrayerPayload): Promise<void> {
  const b = await resolveBridge();
  return b.syncPrayerData(payload);
}

/**
 * Push daily ayah + hadith to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncDailyContent(payload: DailyContentPayload): Promise<void> {
  const b = await resolveBridge();
  return b.syncDailyContent(payload);
}

/**
 * Push Quran reading progress to native widgets.
 * Safe to call on web — no-op there.
 */
export async function syncQuranProgress(payload: QuranProgressPayload): Promise<void> {
  const b = await resolveBridge();
  return b.syncQuranProgress(payload);
}

/**
 * Bump the total tasbeeh count by `count` (used when user completes a
 * session in-app). The widget reads from SharedPreferences on the native side.
 */
export async function pushTasbeehIncrement(count: number): Promise<void> {
  const b = await resolveBridge();
  return b.pushTasbeehIncrement(count);
}
