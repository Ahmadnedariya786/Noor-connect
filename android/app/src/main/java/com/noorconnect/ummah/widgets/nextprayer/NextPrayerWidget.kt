package com.noorconnect.ummah.widgets.nextprayer

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.ummah.R
import com.noorconnect.ummah.widgets.PrayerEntry
import com.noorconnect.ummah.widgets.PrayerPayload
import com.noorconnect.ummah.widgets.WidgetAccent
import com.noorconnect.ummah.widgets.WidgetAlarmScheduler
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetRefreshWorker
import java.util.concurrent.TimeUnit

/**
 * Next Prayer Widget (4×2 Universal Grid)
 *
 * Shows:
 *  - Hijri date chip
 *  - "NEXT PRAYER" section label
 *  - Prayer name (hero text)
 *  - Location (Chhapi, India or user location)
 *  - Progress ring around a live TextClock (zero battery cost — system-rendered)
 *  - Countdown label ("in 3h 24m")
 *
 * Tap → deep-link to /prayers?focus=next
 */
class NextPrayerWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "NextPrayerWidget"

        private fun getDefaultPrayerPayload(context: Context): PrayerPayload {
            val now = System.currentTimeMillis()

            fun makePrayerTime(hour: Int, min: Int): Long {
                val c = java.util.Calendar.getInstance()
                c.set(java.util.Calendar.HOUR_OF_DAY, hour)
                c.set(java.util.Calendar.MINUTE, min)
                c.set(java.util.Calendar.SECOND, 0)
                c.set(java.util.Calendar.MILLISECOND, 0)
                return c.timeInMillis
            }

            val prayers = listOf(
                PrayerEntry("Fajr", makePrayerTime(5, 27), "05:27 AM"),
                PrayerEntry("Sunrise", makePrayerTime(6, 45), "06:45 AM"),
                PrayerEntry("Dhuhr", makePrayerTime(12, 24), "12:24 PM"),
                PrayerEntry("Asr", makePrayerTime(16, 29), "04:29 PM"),
                PrayerEntry("Maghrib", makePrayerTime(18, 5), "06:05 PM"),
                PrayerEntry("Isha", makePrayerTime(19, 17), "07:17 PM")
            )

            var nextIdx = 0
            for (i in prayers.indices) {
                if (prayers[i].time > now) {
                    nextIdx = i
                    break
                }
            }
            if (nextIdx == 0 && now > prayers.last().time) {
                nextIdx = 0
            }

            return PrayerPayload(
                prayers = prayers,
                nextPrayerIndex = nextIdx,
                hijriDate = "Noor Connect",
                gregorianDate = "",
                locationLabel = "Chhapi, India",
                madhab = "HANAFI",
                calculationMethod = "MWL",
                currentTime24h = "",
                lastUpdated = now
            )
        }

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_next_prayer)

                val rawPayload = WidgetPrefs.getPrayerPayload(context)
                val payload = if (rawPayload == null || rawPayload.prayers.isEmpty()) {
                    getDefaultPrayerPayload(context)
                } else {
                    rawPayload
                }

                views.setViewVisibility(R.id.layout_empty, View.GONE)
                views.setViewVisibility(R.id.widget_root, View.VISIBLE)

                val prayers = payload.prayers
                val nextIdx = payload.nextPrayerIndex.coerceIn(0, prayers.size - 1)
                val nextPrayer = prayers.getOrNull(nextIdx) ?: prayers[0]

                // ─── Header ───
                val hijriDisplay = payload.hijriDate.ifEmpty { context.getString(R.string.widget_hijri_default) }
                views.setTextViewText(R.id.widget_hijri_date, hijriDisplay)

                val locDisplay = payload.locationLabel.ifEmpty { "Chhapi, India" }
                views.setTextViewText(R.id.widget_location, locDisplay)

                // ─── Prayer name + time ───
                views.setTextViewText(R.id.widget_prayer_name, nextPrayer.name)
                views.setTextViewText(R.id.widget_prayer_time, nextPrayer.formattedTime)

                // ─── Countdown ───
                val now = System.currentTimeMillis()
                val remaining = nextPrayer.time - now
                val countdownStr = formatCountdown(remaining)
                views.setTextViewText(R.id.widget_countdown, countdownStr)
                views.setTextColor(R.id.widget_countdown, WidgetAccent.resolve(context, appWidgetId))

                // ─── Progress ring fill ───
                val prevTime = if (nextIdx > 0) {
                    prayers[nextIdx - 1].time
                } else {
                    val cal = java.util.Calendar.getInstance()
                    cal.set(java.util.Calendar.HOUR_OF_DAY, 0)
                    cal.set(java.util.Calendar.MINUTE, 0)
                    cal.set(java.util.Calendar.SECOND, 0)
                    cal.set(java.util.Calendar.MILLISECOND, 0)
                    cal.timeInMillis
                }
                val total = nextPrayer.time - prevTime
                val progress = if (total > 0) {
                    ((now - prevTime).toFloat() / total.toFloat()).coerceIn(0f, 1f)
                } else 0f
                views.setInt(R.id.widget_ring_progress, "setImageLevel", (progress * 10000).toInt())

                // ─── Stale data badge (only if truly stale and real payload) ───
                val staleThreshold = 4 * 60 * 60 * 1000L // 4 hours
                val isStale = rawPayload != null && (now - payload.lastUpdated) > staleThreshold
                views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

                // ─── Accessibility content description ───
                val contentDesc = context.getString(R.string.widget_a11y_next_prayer, nextPrayer.name, countdownStr)
                views.setContentDescription(R.id.widget_root, contentDesc)

                // ─── Tap → deep-link /prayers?focus=next ───
                val deeplink = WidgetDeeplink.buildPrayers(focus = "next")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    100,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, pi)

                // ─── Customizer Styling (Phase 4A - Crash Proof) ───
                applyCustomStyles(context, views, appWidgetId)

                mgr.updateAppWidget(appWidgetId, views)
            } catch (t: Throwable) {
                Log.e(TAG, "Critical error updating NextPrayerWidget $appWidgetId", t)
            }
        }

        private fun applyCustomStyles(context: Context, views: RemoteViews, appWidgetId: Int) {
            val configJson = WidgetPrefs.getWidgetStyleConfig(context) ?: return
            try {
                val json = org.json.JSONObject(configJson)
                val surfaceStyle = json.optString("surfaceStyle", "theme")
                val opacity = json.optInt("opacity", 85)
                val accentPreset = json.optString("accentPreset", "ivory")
                val showCity = json.optBoolean("showCity", true)
                val showCountdown = json.optBoolean("showCountdown", true)
                val fontScale = json.optInt("fontScale", 100)

                // 1. Safe background tint overlay (preserves rounded corners and border, NO reflection)
                val alpha = (opacity * 255 / 100).coerceIn(0, 255)
                val baseRgb = when (surfaceStyle) {
                    "oled" -> 0xFF000000.toInt()
                    "frosted" -> 0xFF121826.toInt()
                    else -> 0xFF0B101B.toInt() // dark jewel default
                }
                views.setViewVisibility(R.id.widget_bg_tint, View.VISIBLE)
                views.setInt(R.id.widget_bg_tint, "setColorFilter", baseRgb)
                views.setInt(R.id.widget_bg_tint, "setImageAlpha", alpha)

                // 2. Resolve accent and text colors
                val accentColor = when (accentPreset.lowercase()) {
                    "white" -> 0xFFFFFFFF.toInt()
                    "parchment" -> 0xFFE6C280.toInt()
                    "mint" -> 0xFF10B981.toInt()
                    "sapphire" -> 0xFF38BDF8.toInt()
                    "rose" -> 0xFFF43F5E.toInt()
                    else -> 0xFFD4AF37.toInt() // ivory & gold
                }
                val textColor = when (accentPreset.lowercase()) {
                    "white" -> 0xFFFFFFFF.toInt()
                    "parchment" -> 0xFFFDF6E2.toInt()
                    "mint" -> 0xFFECFDF5.toInt()
                    "sapphire" -> 0xFFF0F9FF.toInt()
                    "rose" -> 0xFFFFF1F2.toInt()
                    else -> 0xFFFDFBF7.toInt()
                }

                views.setTextColor(R.id.widget_clock, accentColor)
                views.setTextColor(R.id.widget_countdown, accentColor)
                views.setTextColor(R.id.widget_prayer_name, textColor)

                // 3. Visibility toggles
                views.setViewVisibility(R.id.widget_location, if (showCity) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_countdown, if (showCountdown) View.VISIBLE else View.GONE)

                // 4. Font scale using standard RemoteViews API
                val scaledSp = (32f * fontScale / 100f).coerceIn(24f, 40f)
                views.setTextViewTextSize(R.id.widget_prayer_name, android.util.TypedValue.COMPLEX_UNIT_SP, scaledSp)
            } catch (e: Throwable) {
                Log.w(TAG, "Error applying custom widget styles", e)
            }
        }

        private fun formatCountdown(remainingMs: Long): String {
            return when {
                remainingMs <= 0 -> "Now"
                remainingMs > 3_600_000L -> {
                    val hours = TimeUnit.MILLISECONDS.toHours(remainingMs)
                    val minutes = TimeUnit.MILLISECONDS.toMinutes(remainingMs) - hours * 60
                    "in ${hours}h ${minutes}m"
                }
                else -> {
                    val minutes = TimeUnit.MILLISECONDS.toMinutes(remainingMs)
                    val seconds = TimeUnit.MILLISECONDS.toSeconds(remainingMs) - minutes * 60
                    "in ${minutes}m ${seconds}s"
                }
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        try {
            appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
        } catch (t: Throwable) {
            Log.e(TAG, "onUpdate fatal error", t)
        }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        try {
            val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
            val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
            val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
            
            Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
            updateWidget(context, appWidgetManager, appWidgetId)
        } catch (t: Throwable) {
            Log.e(TAG, "onAppWidgetOptionsChanged error", t)
        }
    }

    override fun onEnabled(context: Context) {
        try {
            WidgetForegroundService.start(context)
            WidgetPrefs.getPrayerPayload(context)?.let {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, it)
            }
            Log.d(TAG, "Widget enabled — foreground service + alarm scheduled")
        } catch (t: Throwable) {
            Log.e(TAG, "onEnabled error", t)
        }
    }

    override fun onDisabled(context: Context) {
        try {
            if (!WidgetForegroundService.hasActiveWidgets(context)) {
                WidgetAlarmScheduler.cancelAllAlarms(context)
                WidgetForegroundService.stop(context)
            }
            Log.d(TAG, "Widget disabled")
        } catch (t: Throwable) {
            Log.e(TAG, "onDisabled error", t)
        }
    }
}
