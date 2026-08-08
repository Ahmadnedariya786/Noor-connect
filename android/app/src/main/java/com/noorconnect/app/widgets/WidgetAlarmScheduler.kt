package com.noorconnect.app.widgets

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * Schedules exact alarms to fire at each prayer time, triggering a
 * widget refresh via [WidgetAlarmReceiver].
 *
 * On API 31+ where `SCHEDULE_EXACT_ALARM` is denied, falls back to
 * inexact alarms (~15 min accuracy). A 15-min fallback alarm is also
 * scheduled as a safety net.
 */
object WidgetAlarmScheduler {

    private const val TAG = "WidgetAlarmScheduler"
    const val ACTION_PRAYER_ALARM = "com.noorconnect.app.PRAYER_ALARM"
    const val ACTION_FALLBACK_ALARM = "com.noorconnect.app.PRAYER_FALLBACK"
    private const val REQUEST_CODE = 9001
    private const val FALLBACK_REQUEST_CODE = 9002
    private const val FALLBACK_DELAY_MS = 15 * 60 * 1000L // 15 minutes

    fun scheduleNextPrayerAlarm(context: Context, payload: PrayerPayload) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return

            val now = System.currentTimeMillis()
            val prayers = payload.prayers
            if (prayers.isEmpty()) return

            // Find the next prayer whose time is > now
            var triggerAtMs = -1L
            for (p in prayers) {
                if (p.time > now) {
                    triggerAtMs = p.time
                    break
                }
            }

            // If all prayers have passed today, schedule for the first prayer tomorrow (+24h)
            if (triggerAtMs == -1L) {
                triggerAtMs = prayers.first().time + 86_400_000L
            }

            if (triggerAtMs <= now) return

            val pendingIntent = buildPendingIntent(context)

            // Cancel any existing exact alarm first
            alarmManager.cancel(pendingIntent)

            // Also schedule a 15-minute fallback alarm as safety net
            scheduleFallbackAlarm(context, alarmManager, triggerAtMs)

            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }

            if (canExact) {
                alarmManager.setExactAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMs,
                    pendingIntent
                )
                Log.d(TAG, "Exact alarm scheduled at $triggerAtMs (${formatTime(triggerAtMs)})")
            } else {
                // Degraded mode — inexact alarm with ~15 min accuracy.
                // WorkManager's periodic refresh will catch up.
                alarmManager.setAndAllowWhileIdle(
                    AlarmManager.RTC_WAKEUP,
                    triggerAtMs,
                    pendingIntent
                )
                Log.w(TAG, "SCHEDULE_EXACT_ALARM denied — using inexact fallback at $triggerAtMs")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to schedule alarm", e)
        }
    }

    private fun scheduleFallbackAlarm(context: Context, alarmManager: AlarmManager, prayerTimeMs: Long) {
        val fallbackTime = prayerTimeMs + FALLBACK_DELAY_MS
        val fallbackIntent = Intent(context, WidgetAlarmReceiver::class.java).apply {
            action = ACTION_FALLBACK_ALARM
        }
        val fallbackPendingIntent = PendingIntent.getBroadcast(
            context,
            FALLBACK_REQUEST_CODE,
            fallbackIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        alarmManager.cancel(fallbackPendingIntent)
        alarmManager.setAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            fallbackTime,
            fallbackPendingIntent
        )
        Log.d(TAG, "Fallback alarm scheduled at $fallbackTime (15 min after prayer)")
    }

    fun cancelAllAlarms(context: Context) {
        try {
            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
                ?: return
            alarmManager.cancel(buildPendingIntent(context))
            alarmManager.cancel(buildFallbackPendingIntent(context))
            Log.d(TAG, "All prayer alarms cancelled")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to cancel alarms", e)
        }
    }

    private fun buildPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, WidgetAlarmReceiver::class.java).apply {
            action = ACTION_PRAYER_ALARM
        }
        return PendingIntent.getBroadcast(
            context,
            REQUEST_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun buildFallbackPendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, WidgetAlarmReceiver::class.java).apply {
            action = ACTION_FALLBACK_ALARM
        }
        return PendingIntent.getBroadcast(
            context,
            FALLBACK_REQUEST_CODE,
            intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
    }

    private fun formatTime(ms: Long): String = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date(ms))
}
