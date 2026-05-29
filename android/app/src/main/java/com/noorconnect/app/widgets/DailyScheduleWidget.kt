package com.noorconnect.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.noorconnect.app.MainActivity
import com.noorconnect.app.R
import java.util.concurrent.TimeUnit

/**
 * Daily Schedule Widget (4×2)
 * Shows all prayer times in a scrollable ListView with the next prayer highlighted.
 */
class DailyScheduleWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "DailyScheduleWidget"
        private const val WORK_TAG = "noor_widget_periodic"

        fun updateWidget(
            context: Context,
            mgr: AppWidgetManager,
            id: Int
        ) {
            try {
                val rv = RemoteViews(context.packageName, R.layout.widget_daily_schedule)

                // Set the RemoteAdapter for the ListView
                val serviceIntent = Intent(context, PrayerListService::class.java)
                rv.setRemoteAdapter(R.id.prayer_list, serviceIntent)
                rv.setEmptyView(R.id.prayer_list, R.id.empty_state)

                // Tap anywhere → open app
                val intent = Intent(context, MainActivity::class.java)
                    .setFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val pi = PendingIntent.getActivity(
                    context, 101, intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                rv.setOnClickPendingIntent(R.id.prayer_list, pi)

                mgr.updateAppWidget(id, rv)
                mgr.notifyAppWidgetViewDataChanged(id, R.id.prayer_list)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to update schedule widget $id", e)
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onEnabled(context: Context) {
        val periodicWork = PeriodicWorkRequestBuilder<WidgetDataWorker>(
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_TAG,
            ExistingPeriodicWorkPolicy.KEEP,
            periodicWork
        )

        val prefs = context.getSharedPreferences(
            "NoorConnectWidgetPrefs", Context.MODE_PRIVATE
        )
        val prayerJson = prefs.getString("widget_prayer_data", null)
        if (prayerJson != null) {
            AlarmScheduler.scheduleNextPrayerAlarm(context, prayerJson)
        }

        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_TAG)
        AlarmScheduler.cancelAllAlarms(context)
        Log.d(TAG, "Widget disabled")
    }
}
