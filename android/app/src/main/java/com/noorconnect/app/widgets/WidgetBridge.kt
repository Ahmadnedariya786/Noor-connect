package com.noorconnect.app.widgets

import android.content.Context
import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

/**
 * WidgetBridge — the single Capacitor plugin that the React/TypeScript side
 * uses to push data to the native Android widgets.
 *
 * Exposes exactly four methods:
 *  - syncPrayerData(payload)
 *  - syncDailyContent(payload)
 *  - syncQuranProgress(payload)
 *  - pushTasbeehIncrement(count)
 *
 * Each method:
 *  1. Validates the payload.
 *  2. Writes to [WidgetPrefs] (background-thread-safe via SharedPreferences).
 *  3. Triggers an expedited [WidgetRefreshWorker].
 *  4. For prayer data: also reschedules the next prayer alarm.
 *
 * Replaces the deleted `WidgetPlugin.java` which had multiple overlapping methods.
 */
@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridge : Plugin() {

    companion object {
        private const val TAG = "WidgetBridge"
    }

    // ─────────────────────────────────────────────────────────
    // 1) syncPrayerData
    // ─────────────────────────────────────────────────────────
    @PluginMethod
    fun syncPrayerData(call: PluginCall) {
        try {
            val prayerDataStr = call.getString("payload")
            if (prayerDataStr.isNullOrEmpty()) {
                call.reject("payload is required")
                return
            }

            val payload = PrayerPayload.fromJson(prayerDataStr)
            if (payload == null) {
                call.reject("invalid prayer payload")
                return
            }

            // Validate exactly 6 prayers (Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha)
            if (payload.prayers.size != 6) {
                call.reject("invalid prayer payload: expected 6 prayers, got ${payload.prayers.size}")
                return
            }

            // Validate nextPrayerIndex is in valid range
            if (payload.nextPrayerIndex < 0 || payload.nextPrayerIndex >= 6) {
                call.reject("invalid prayer payload: nextPrayerIndex out of range")
                return
            }

            // Validate nextPrayerIndex matches an existing prayer entry
            if (payload.prayers.getOrNull(payload.nextPrayerIndex) == null) {
                call.reject("invalid prayer payload: nextPrayerIndex has no matching prayer")
                return
            }

            val context = getContext()
            WidgetPrefs.savePrayerPayload(context, payload)
            WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, payload)
            WidgetRefreshWorker.enqueueImmediate(context)

            Log.d(TAG, "Prayer data synced: ${payload.prayers.size} prayers, next=${payload.nextPrayerIndex}")
            call.resolve(JSObject().put("status", "ok"))
        } catch (e: Exception) {
            Log.e(TAG, "syncPrayerData error", e)
            call.reject("Failed: ${e.message}")
        }
    }

    // ─────────────────────────────────────────────────────────
    // 2) syncDailyContent
    // ─────────────────────────────────────────────────────────
    @PluginMethod
    fun syncDailyContent(call: PluginCall) {
        try {
            val contentStr = call.getString("payload")
            if (contentStr.isNullOrEmpty()) {
                call.reject("payload is required")
                return
            }

            val payload = DailyContentPayload.fromJson(contentStr)
            if (payload == null) {
                call.reject("invalid daily content payload")
                return
            }

            val context = getContext()
            WidgetPrefs.saveDailyContent(context, payload)
            WidgetRefreshWorker.enqueueImmediate(context)

            Log.d(TAG, "Daily content synced: ayah=${payload.ayah.reference}, hadith=${payload.hadith.source}")
            call.resolve(JSObject().put("status", "ok"))
        } catch (e: Exception) {
            Log.e(TAG, "syncDailyContent error", e)
            call.reject("Failed: ${e.message}")
        }
    }

    // ─────────────────────────────────────────────────────────
    // 3) syncQuranProgress
    // ─────────────────────────────────────────────────────────
    @PluginMethod
    fun syncQuranProgress(call: PluginCall) {
        try {
            val progressStr = call.getString("payload")
            if (progressStr.isNullOrEmpty()) {
                call.reject("payload is required")
                return
            }

            val payload = QuranProgressPayload.fromJson(progressStr)
            if (payload == null) {
                call.reject("invalid quran progress payload")
                return
            }

            val context = getContext()
            WidgetPrefs.saveQuranProgress(context, payload)
            WidgetRefreshWorker.enqueueImmediate(context)

            Log.d(TAG, "Quran progress synced: ${payload.totalPercent}%")
            call.resolve(JSObject().put("status", "ok"))
        } catch (e: Exception) {
            Log.e(TAG, "syncQuranProgress error", e)
            call.reject("Failed: ${e.message}")
        }
    }

    // ─────────────────────────────────────────────────────────
    // 4) pushTasbeehIncrement
    // ─────────────────────────────────────────────────────────
    @PluginMethod
    fun pushTasbeehIncrement(call: PluginCall) {
        try {
            val count = call.getLong("count") ?: 0L
            if (count <= 0) {
                call.reject("count must be > 0")
                return
            }

            val context = getContext()
            WidgetPrefs.addTasbeehTotal(context, count)
            WidgetRefreshWorker.enqueueImmediate(context)

            Log.d(TAG, "Tasbeeh total bumped by $count")
            call.resolve(JSObject().put("status", "ok"))
        } catch (e: Exception) {
            Log.e(TAG, "pushTasbeehIncrement error", e)
            call.reject("Failed: ${e.message}")
        }
    }
}
