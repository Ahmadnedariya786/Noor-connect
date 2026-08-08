package com.noorconnect.app.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.WorkManager
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import java.util.concurrent.TimeUnit

/**
 * Re-schedules widget periodic work and prayer alarms after:
 *  - BOOT_COMPLETED (device restart)
 *  - LOCKED_BOOT_COMPLETED (direct boot — for prayer alarms only)
 *  - TIME_SET / TIMEZONE_CHANGED (user changed time or timezone)
 *  - LOCALE_CHANGED (user changed language)
 *
 * This ensures widgets survive every system event that would otherwise
 * break the alarm schedule or leave widgets showing stale data.
 *
 * Delegates to WidgetRefreshWorker helpers to keep scheduling logic centralized.
 */
class WidgetBootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "WidgetBootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        // goAsync() extends the receiver's lifetime to ~30 seconds so
        // WorkManager + SharedPreferences I/O won't ANR on slow devices.
        val pendingResult = goAsync()
        try {
            // Start widget foreground service for step/location monitoring
            WidgetForegroundService.start(context)

            // Reschedule next prayer alarm if we have data
            val prayerPayload = WidgetPrefs.getPrayerPayload(context)
            if (prayerPayload != null) {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, prayerPayload)
            }

            // Enqueue periodic health check (runs every 6 hours)
            HealthCheckWorker.enqueuePeriodic(context)

            // Also trigger an immediate one-shot refresh (best-effort)
            WidgetRefreshWorker.enqueueImmediate(context)
        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive", e)
        } finally {
            pendingResult.finish()
        }
    }
}
