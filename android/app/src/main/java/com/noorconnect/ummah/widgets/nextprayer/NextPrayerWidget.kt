package com.noorconnect.ummah.widgets.nextprayer

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.ummah.MainActivity
import com.noorconnect.ummah.R
import com.noorconnect.ummah.widgets.WidgetAccent
import com.noorconnect.ummah.widgets.WidgetAlarmScheduler
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetRefreshWorker
import java.util.concurrent.TimeUnit

/**
 * Next Prayer Widget (4×2)
 *
 * Shows:
 *  - Hijri date chip
 *  - "NEXT PRAYER" section label
 *  - Prayer name
 *  - Location
 *  - Progress ring around a live TextClock (zero battery cost — system-rendered)
 *  - Countdown label ("in 3h 24m")
 *
 * The TextClock ticks every second automatically. The countdown label is
 * a static TextView updated by [WidgetRefreshWorker] every 30 min and by
 * [WidgetAlarmReceiver] at each prayer transition.
 *
 * Tap → deep-link to /prayers?focus=next
 */
class NextPrayerWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "NextPrayerWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_next_prayer)

            val payload = WidgetPrefs.getPrayerPayload(context)

            if (payload == null || payload.prayers.isEmpty()) {
                // Empty state — app never opened
                views.setViewVisibility(R.id.widget_root, View.GONE)
                views.setViewVisibility(R.id.layout_empty, View.VISIBLE)

                // Set empty state message with call-to-action
                views.setTextViewText(R.id.empty_message, context.getString(R.string.widget_empty_message))
                views.setTextViewText(R.id.empty_action, context.getString(R.string.widget_empty_action))
                views.setTextColor(R.id.empty_action, WidgetAccent.resolve(context, appWidgetId))

                // Set click listener to open app
                val deeplink = WidgetDeeplink.buildPrayers(focus = "setup")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    101,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.layout_empty, pi)

                mgr.updateAppWidget(appWidgetId, views)
                return
            }

            views.setViewVisibility(R.id.layout_empty, View.GONE)
            views.setViewVisibility(R.id.widget_root, View.VISIBLE)

            val nextIdx = payload.nextPrayerIndex
            val prayers = payload.prayers
            val nextPrayer = prayers.getOrNull(nextIdx)

            if (nextPrayer == null) {
                views.setViewVisibility(R.id.widget_root, View.GONE)
                views.setViewVisibility(R.id.layout_empty, View.VISIBLE)

                // Set empty state message with call-to-action
                views.setTextViewText(R.id.empty_message, context.getString(R.string.widget_empty_message))
                views.setTextViewText(R.id.empty_action, context.getString(R.string.widget_empty_action))
                views.setTextColor(R.id.empty_action, WidgetAccent.resolve(context, appWidgetId))

                // Set click listener to open app
                val deeplink = WidgetDeeplink.buildPrayers(focus = "setup")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    101,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.layout_empty, pi)

                mgr.updateAppWidget(appWidgetId, views)
                return
            }

            // ─── Header ───
            views.setTextViewText(R.id.widget_hijri_date, payload.hijriDate.ifEmpty { context.getString(R.string.widget_hijri_default) })
            views.setTextViewText(R.id.widget_location, payload.locationLabel.ifEmpty { context.getString(R.string.widget_location_default) })

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
            // NOTE: Do NOT use RemoteViews reflection for setRotation here.
            // View.setRotation only became @RemotableViewMethod in Android 12 (API 31);
            // on API <= 30 the reflection action throws ActionException and the whole
            // widget fails to render ("Problem loading widget"). The level-based arc
            // (setImageLevel on a useLevel=true ring drawable) works on all supported
            // API levels, so it is the single source of truth for ring progress.
            val prevTime = if (nextIdx > 0) {
                prayers[nextIdx - 1].time
            } else {
                // Start of today
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

            // ─── Stale data badge (if data is older than 2 hours) ───
            val staleThreshold = 2 * 60 * 60 * 1000L // 2 hours
            val isStale = (now - payload.lastUpdated) > staleThreshold
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
            // ─── Customizer Styling (Phase 4A) ───
            applyCustomStyles(context, views, appWidgetId)

            mgr.updateAppWidget(appWidgetId, views)
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

                // 1. Calculate background color with alpha (standard RemoteViews method, NO reflection)
                val alpha = (opacity * 255 / 100).coerceIn(0, 255)
                val baseRgb = when (surfaceStyle) {
                    "oled" -> 0x000000
                    "frosted" -> 0x121826
                    else -> 0x0F172A // theme default dark
                }
                val bgColor = (alpha shl 24) or (baseRgb and 0x00FFFFFF)
                views.setInt(R.id.widget_root, "setBackgroundColor", bgColor)

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
            } catch (e: Exception) {
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
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: android.os.Bundle
    ) {
        // Handle widget resize - update layout based on new size
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
        
        // Trigger update with new dimensions
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        // Start the foreground service for step detection + location monitoring
        WidgetForegroundService.start(context)
        // Schedule next prayer alarm if we have data
        WidgetPrefs.getPrayerPayload(context)?.let {
            WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, it)
        }
        Log.d(TAG, "Widget enabled — foreground service + alarm scheduled")
    }

    override fun onDisabled(context: Context) {
        // Only stop the shared foreground service / cancel alarms when NO widget
        // of ANY type remains, because other widget types may still need them.
        if (!WidgetForegroundService.hasActiveWidgets(context)) {
            WidgetAlarmScheduler.cancelAllAlarms(context)
            WidgetForegroundService.stop(context)
        }
        Log.d(TAG, "Widget disabled")
    }
}
