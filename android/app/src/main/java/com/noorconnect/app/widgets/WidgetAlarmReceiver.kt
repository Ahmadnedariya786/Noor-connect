package com.noorconnect.app.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager

/**
 * Receives alarms fired at each prayer time.
 *
 * On receive:
 *  1. Enqueues an expedited [WidgetRefreshWorker] to refresh all widgets.
 *  2. Re-reads [WidgetPrefs.getPrayerPayload] and reschedules the next prayer alarm.
 *
 * Also listens for ACTION_BOOT_COMPLETED, ACTION_TIME_SET, ACTION_TIMEZONE_CHANGED,
 * ACTION_LOCALE_CHANGED so widgets survive system events.
 */
class WidgetAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "WidgetAlarmReceiver"
        const val ACTION_REFRESH_ALL = "com.noorconnect.app.WIDGET_REFRESH"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        try {
            // Always enqueue an expedited refresh
            val workRequest = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                "widget_alarm_refresh_${System.currentTimeMillis()}",
                ExistingWorkPolicy.REPLACE,
                workRequest
            )

            // Reschedule next prayer alarm if we have prayer data
            val prayerPayload = WidgetPrefs.getPrayerPayload(context)
            if (prayerPayload != null) {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, prayerPayload)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive", e)
        }
    }
}
