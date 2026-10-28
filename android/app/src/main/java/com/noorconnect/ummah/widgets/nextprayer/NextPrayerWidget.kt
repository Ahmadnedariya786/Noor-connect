package com.noorconnect.ummah.widgets.nextprayer

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Color
import android.util.Log
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.ummah.R
import com.noorconnect.ummah.widgets.PrayerEntry
import com.noorconnect.ummah.widgets.PrayerPayload
import com.noorconnect.ummah.widgets.WidgetAlarmScheduler
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetStyleHelper
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Next Prayer Widget (4×2 Universal Grid)
 *
 * Shows:
 *  - Top row: Arabic brand glyph "نور" + Hijri date pill + Live TextClock + Countdown pill
 *  - Middle row: "NEXT PRAYER" + large bold Prayer name + City pill | Prayer time + Circular progress ring
 *  - Bottom row: Full 5-prayer strip (FAJR, DHUHR, ASR, MAGHRIB, ISHA) with next prayer highlighted
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
                PrayerEntry("Fajr", makePrayerTime(5, 28), "05:28 AM"),
                PrayerEntry("Sunrise", makePrayerTime(6, 45), "06:45 AM"),
                PrayerEntry("Dhuhr", makePrayerTime(12, 24), "12:24 PM"),
                PrayerEntry("Asr", makePrayerTime(16, 28), "04:28 PM"),
                PrayerEntry("Maghrib", makePrayerTime(18, 4), "06:04 PM"),
                PrayerEntry("Isha", makePrayerTime(19, 16), "07:16 PM")
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
                hijriDate = WidgetStyleHelper.computeFallbackHijri(),
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
                views.setViewVisibility(R.id.widget_content_container, View.VISIBLE)

                // ─── Parse Customizer Style & Theme ───
                val style = WidgetStyleHelper.parseConfig(context)

                // ─── 1. Background Bitmap via Canvas Offscreen Render (Opacity 0..100%) ───
                val bgBitmap = WidgetStyleHelper.renderBackgroundBitmap(
                    surfaceStyle = style.surfaceStyle,
                    themeHex = style.themeHex,
                    opacityPercent = style.opacity,
                    accentHex = style.accentHex
                )
                views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

                // ─── Header Title ("نور • NEXT PRAYER") ───
                try {
                    views.setTextViewText(R.id.widget_header_title, "نور • NEXT PRAYER")
                } catch (t: Throwable) {
                    Log.w(TAG, "Header title error", t)
                }

                // ─── 2. Hijri Date (Canonical Islamic month + AH, NEVER BC!) ───
                val candidateHijri = when {
                    style.hijriDateFormatted.isNotBlank() -> style.hijriDateFormatted
                    payload.hijriDate.isNotBlank() && !payload.hijriDate.equals("Noor Connect", ignoreCase = true) -> payload.hijriDate
                    else -> null
                }
                val hijriDisplay = WidgetStyleHelper.formatHijriDate(candidateHijri)
                views.setTextViewText(R.id.widget_hijri_date, hijriDisplay)
                try {
                    views.setTextColor(R.id.widget_hijri_date, Color.parseColor(style.accentHex))
                } catch (_: Throwable) {}

                // ─── 3. Location / City ───
                val locDisplay = when {
                    style.city.isNotBlank() -> style.city
                    payload.locationLabel.isNotBlank() -> payload.locationLabel
                    else -> "Chhapi, India"
                }
                views.setTextViewText(R.id.widget_location, locDisplay)
                views.setViewVisibility(R.id.widget_city_container, if (style.showCity) View.VISIBLE else View.GONE)

                // ─── 4. Next Prayer Calculation ───
                val prayers = payload.prayers
                val nextIdx = payload.nextPrayerIndex.coerceIn(0, prayers.size - 1)
                val nextPrayer = prayers.getOrNull(nextIdx) ?: prayers[0]

                views.setTextViewText(R.id.widget_prayer_name, nextPrayer.name)
                views.setTextViewText(R.id.widget_prayer_time, nextPrayer.formattedTime)

                // ─── 5. Countdown Pill ───
                val now = System.currentTimeMillis()
                val remaining = nextPrayer.time - now
                val countdownStr = formatCountdown(remaining)
                views.setTextViewText(R.id.widget_countdown_pill, countdownStr)
                views.setViewVisibility(R.id.widget_countdown_pill, if (style.showCountdown) View.VISIBLE else View.GONE)
                views.setViewVisibility(R.id.widget_clock, View.GONE)

                // ─── 6. Swatch Color Application ───
                try {
                    val accentCol = Color.parseColor(style.accentHex)
                    val textCol = Color.parseColor(style.textHex)
                    val subCol = Color.parseColor(style.subHex)

                    views.setTextColor(R.id.widget_header_title, accentCol)
                    views.setTextColor(R.id.widget_clock, accentCol)
                    views.setTextColor(R.id.widget_countdown_pill, accentCol)
                    views.setTextColor(R.id.widget_prayer_name, textCol)
                    views.setTextColor(R.id.widget_prayer_time, textCol)
                    views.setTextColor(R.id.widget_section_label, subCol)
                    views.setTextColor(R.id.widget_location, subCol)
                } catch (e: Throwable) {
                    Log.w(TAG, "Color parsing error", e)
                }

                // ─── 7. Font Scaling ───
                val scaledHeroSp = (26f * style.fontScale / 100f).coerceIn(20f, 36f)
                views.setTextViewTextSize(R.id.widget_prayer_name, TypedValue.COMPLEX_UNIT_SP, scaledHeroSp)

                val scaledTimeSp = (19f * style.fontScale / 100f).coerceIn(15f, 26f)
                views.setTextViewTextSize(R.id.widget_prayer_time, TypedValue.COMPLEX_UNIT_SP, scaledTimeSp)

                // ─── 8. Safe Horizontal ProgressBar ───
                try {
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
                    views.setProgressBar(R.id.widget_progress_bar, 100, (progress * 100).toInt(), false)
                } catch (t: Throwable) {
                    Log.w(TAG, "Progress bar update error", t)
                }

                // ─── 9. Full 5-Prayer Strip ───
                updateFivePrayerStrip(views, payload, nextPrayer.name, style)
                views.setViewVisibility(R.id.widget_five_prayer_strip, if (style.showFivePrayerStrip) View.VISIBLE else View.GONE)

                // ─── 10. Stale data badge (permanently gone) ───
                views.setViewVisibility(R.id.widget_stale_badge, View.GONE)

                // ─── 11. Accessibility ───
                val contentDesc = context.getString(R.string.widget_a11y_next_prayer, nextPrayer.name, countdownStr)
                views.setContentDescription(R.id.widget_root, contentDesc)

                // ─── 12. Deep Link Intent ───
                val deeplink = WidgetDeeplink.buildPrayers(focus = "next")
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    100,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, pi)

                mgr.updateAppWidget(appWidgetId, views)
            } catch (t: Throwable) {
                Log.e(TAG, "Critical error updating NextPrayerWidget $appWidgetId", t)
            }
        }

        private fun updateFivePrayerStrip(
            views: RemoteViews,
            payload: PrayerPayload,
            activePrayerName: String,
            style: WidgetStyleHelper.ResolvedStyle
        ) {
            try {
                val prayerEntries = payload.prayers
                fun findPrayerTime(name: String): String {
                    val match = prayerEntries.firstOrNull { it.name.equals(name, ignoreCase = true) }
                    return match?.formattedTime ?: "--:--"
                }

                val prayers = listOf(
                    Triple("FAJR", findPrayerTime("Fajr"), R.id.widget_name_fajr to R.id.widget_time_fajr),
                    Triple("DHUHR", findPrayerTime("Dhuhr"), R.id.widget_name_dhuhr to R.id.widget_time_dhuhr),
                    Triple("ASR", findPrayerTime("Asr"), R.id.widget_name_asr to R.id.widget_time_asr),
                    Triple("MAGHRIB", findPrayerTime("Maghrib"), R.id.widget_name_maghrib to R.id.widget_time_maghrib),
                    Triple("ISHA", findPrayerTime("Isha"), R.id.widget_name_isha to R.id.widget_time_isha)
                )

                val accentCol = try { Color.parseColor(style.accentHex) } catch (_: Throwable) { Color.parseColor("#D4AF37") }
                val textCol = try { Color.parseColor(style.textHex) } catch (_: Throwable) { Color.parseColor("#FDFBF7") }
                val subCol = try { Color.parseColor(style.subHex) } catch (_: Throwable) { Color.parseColor("#C5A059") }

                for ((name, time, labelIds) in prayers) {
                    val (nameId, timeId) = labelIds

                    views.setTextViewText(nameId, name)
                    views.setTextViewText(timeId, time)

                    val isActive = name.equals(activePrayerName, ignoreCase = true)
                    if (isActive) {
                        views.setTextColor(nameId, accentCol)
                        views.setTextColor(timeId, accentCol)
                    } else {
                        views.setTextColor(nameId, subCol)
                        views.setTextColor(timeId, textCol)
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Error updating five prayer strip", t)
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
                    if (minutes > 0) "in ${minutes}m" else "in ${seconds}s"
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
