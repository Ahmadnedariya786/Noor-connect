package com.noorconnect.app.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
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
 */
class WidgetBootReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "WidgetBootReceiver"
        private const val WORK_TAG = "noor_widget_periodic"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        try {
            // Re-enqueue the periodic refresh (KEEP so we don't reset the timing)
            val periodicWork = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
                30, TimeUnit.MINUTES
            ).build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicWork
            )

            // Reschedule next prayer alarm if we have data
            val prayerPayload = WidgetPrefs.getPrayerPayload(context)
            if (prayerPayload != null) {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, prayerPayload)
            }

            // Also trigger an immediate one-shot refresh (best-effort)
            val oneShot = androidx.work.OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
                .setExpedited(androidx.work.OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                "widget_boot_refresh_${System.currentTimeMillis()}",
                androidx.work.ExistingWorkPolicy.REPLACE,
                oneShot
            )
        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive", e)
        }
    }
}
