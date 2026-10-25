package com.noorconnect.ummah.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Receives alarms fired at each prayer time.
 *
 * On receive:
 *  1. Enqueues an expedited [WidgetRefreshWorker] to refresh all widgets.
 *  2. Re-reads [WidgetPrefs.getPrayerPayload] and reschedules the next prayer alarm.
 *  3. Also handles ACTION_FALLBACK_ALARM as a safety net if exact alarm missed.
 *
 * Also listens for ACTION_BOOT_COMPLETED, ACTION_TIME_SET, ACTION_TIMEZONE_CHANGED,
 * ACTION_LOCALE_CHANGED so widgets survive system events.
 */
class WidgetAlarmReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "WidgetAlarmReceiver"
        const val ACTION_REFRESH_ALL = "com.noorconnect.ummah.WIDGET_REFRESH"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        val pendingResult = goAsync()
        try {
            // Always enqueue an expedited refresh
            WidgetRefreshWorker.enqueueImmediate(context)

            // Reschedule next prayer alarm if we have prayer data
            val prayerPayload = WidgetPrefs.getPrayerPayload(context)
            if (prayerPayload != null) {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, prayerPayload)
            }

            // Also handle fallback alarm (15 min after prayer) - same logic
        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive", e)
        } finally {
            pendingResult.finish()
        }
    }
}
