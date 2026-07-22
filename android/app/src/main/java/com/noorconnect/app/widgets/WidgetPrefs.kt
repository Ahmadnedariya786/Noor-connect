package com.noorconnect.app.widgets

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/**
 * Typed wrapper around SharedPreferences for all widget data.
 *
 * Single source of truth: one prefs file (`NoorConnectWidgetPrefs`),
 * one set of keys, all reads/writes go through this object.
 *
 * Concurrency: SharedPreferences is process-safe and thread-safe.
 * For Tasbeeh increments (which can fire rapidly), use [TasbeehLock].
 */
object WidgetPrefs {

    private const val PREFS_NAME = "NoorConnectWidgetPrefs"

    // Keys for raw JSON payloads (each is one of the WidgetPayloads data classes)
    private const val KEY_PRAYER_PAYLOAD = "prayer_payload"
    private const val KEY_DAILY_CONTENT_PAYLOAD = "daily_content_payload"
    private const val KEY_QURAN_PROGRESS_PAYLOAD = "quran_progress_payload"
    private const val KEY_TASBEEH_STATE = "tasbeeh_state"

    // Sync metadata
    private const val KEY_LAST_PRAYER_SYNC = "last_prayer_sync_ms"
    private const val KEY_LAST_CONTENT_SYNC = "last_content_sync_ms"
    private const val KEY_LAST_PROGRESS_SYNC = "last_progress_sync_ms"

    // Throttling: prevent excessive RemoteViews updates (system limit ~30/sec per widget)
    private const val KEY_LAST_WIDGET_UPDATE = "last_widget_update_ms_"
    private const val MIN_UPDATE_INTERVAL_MS = 500L // 500ms minimum between updates per widget

    fun privatePrefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ─────────── Prayer ───────────

    fun savePrayerPayload(context: Context, payload: PrayerPayload) {
        privatePrefs(context).edit {
            putString(KEY_PRAYER_PAYLOAD, payload.toJson().toString())
            putLong(KEY_LAST_PRAYER_SYNC, System.currentTimeMillis())
        }
    }

    fun getPrayerPayload(context: Context): PrayerPayload? {
        val json = privatePrefs(context).getString(KEY_PRAYER_PAYLOAD, null) ?: return null
        return PrayerPayload.fromJson(json)
    }

    fun lastPrayerSyncMs(context: Context): Long =
        privatePrefs(context).getLong(KEY_LAST_PRAYER_SYNC, 0L)

    // ─────────── Daily Content ───────────

    fun lastContentSyncMs(context: Context): Long =
        privatePrefs(context).getLong(KEY_LAST_CONTENT_SYNC, 0L)

    fun saveDailyContent(context: Context, payload: DailyContentPayload) {
        privatePrefs(context).edit {
            putString(KEY_DAILY_CONTENT_PAYLOAD, payload.toJson().toString())
            putLong(KEY_LAST_CONTENT_SYNC, System.currentTimeMillis())
        }
    }

    fun getDailyContent(context: Context): DailyContentPayload? {
        val json = privatePrefs(context).getString(KEY_DAILY_CONTENT_PAYLOAD, null) ?: return null
        return DailyContentPayload.fromJson(json)
    }

    // ─────────── Quran Progress ───────────

    fun saveQuranProgress(context: Context, payload: QuranProgressPayload) {
        privatePrefs(context).edit {
            putString(KEY_QURAN_PROGRESS_PAYLOAD, payload.toJson().toString())
            putLong(KEY_LAST_PROGRESS_SYNC, System.currentTimeMillis())
        }
    }

    fun getQuranProgress(context: Context): QuranProgressPayload? {
        val json = privatePrefs(context).getString(KEY_QURAN_PROGRESS_PAYLOAD, null) ?: return null
        return QuranProgressPayload.fromJson(json)
    }

    // ─────────── Tasbeeh ───────────

    fun saveTasbeehState(context: Context, state: TasbeehState) {
        privatePrefs(context).edit {
            putString(KEY_TASBEEH_STATE, state.toJson().toString())
        }
    }

    fun getTasbeehState(context: Context): TasbeehState {
        val json = privatePrefs(context).getString(KEY_TASBEEH_STATE, null) ?: return TasbeehState.DEFAULT
        return TasbeehState.fromJson(json) ?: TasbeehState.DEFAULT
    }

    // ─────────── Throttling ───────────

    /**
     * Check if enough time has passed since last widget update.
     * Prevents RemoteViews updates faster than system allows (~30/sec).
     */
    fun canUpdateWidget(context: Context, widgetId: Int): Boolean {
        val prefs = privatePrefs(context)
        val lastUpdate = prefs.getLong("$KEY_LAST_WIDGET_UPDATE$widgetId", 0L)
        val now = System.currentTimeMillis()
        return (now - lastUpdate) >= MIN_UPDATE_INTERVAL_MS
    }

    fun recordWidgetUpdate(context: Context, widgetId: Int) {
        privatePrefs(context).edit {
            putLong("$KEY_LAST_WIDGET_UPDATE$widgetId", System.currentTimeMillis())
        }
    }

    /**
     * Atomically increment tasbeeh count and rotate dhikr when target reached.
     * Uses a synchronized block to handle rapid taps with debouncing.
     */
    fun atomicIncrementTasbeeh(context: Context): TasbeehState {
        synchronized(TasbeehLock) {
            val now = System.currentTimeMillis()
            val current = getTasbeehState(context)
            
            // Debounce: ignore rapid taps within 100ms
            if (now - current.lastIncrementAt < 100) {
                return current
            }
            
            val newSessionCount = current.sessionCount + 1
            val newTotal = current.totalCount + 1

            val newState = if (newSessionCount >= current.targetPerSession) {
                // Cycle to next dhikr
                val cycle = TasbeehState.DHIKR_CYCLE
                val idx = cycle.indexOf(current.currentDhikr).let { if (it < 0) 0 else it }
                val next = cycle[(idx + 1) % cycle.size]
                current.copy(
                    totalCount = newTotal,
                    sessionCount = 0,
                    currentDhikr = next,
                    lastIncrementAt = now
                )
            } else {
                current.copy(
                    totalCount = newTotal,
                    sessionCount = newSessionCount,
                    lastIncrementAt = now
                )
            }
            saveTasbeehState(context, newState)
            return newState
        }
    }

    fun atomicResetTasbeeh(context: Context): TasbeehState {
        synchronized(TasbeehLock) {
            val current = getTasbeehState(context)
            val now = System.currentTimeMillis()
            val newState = current.copy(
                sessionCount = 0,
                lastIncrementAt = now
            )
            saveTasbeehState(context, newState)
            return newState
        }
    }

    /**
     * Used by the bridge to bump the count when the user finishes a session
     * in the web app. Just adds to total — doesn't touch sessionCount.
     */
    fun addTasbeehTotal(context: Context, count: Long) {
        synchronized(TasbeehLock) {
            val now = System.currentTimeMillis()
            val current = getTasbeehState(context)
            val newState = current.copy(
                totalCount = current.totalCount + count,
                lastIncrementAt = now
            )
            saveTasbeehState(context, newState)
        }
    }
}

private object TasbeehLock
