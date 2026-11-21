package com.siraj.app.widgets.compactstrip

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.util.Log
import android.widget.RemoteViews
import com.siraj.app.R
import com.siraj.app.widgets.PrayerEntry
import com.siraj.app.widgets.PrayerPayload
import com.siraj.app.widgets.WidgetAlarmReceiver
import com.siraj.app.widgets.WidgetAlarmScheduler
import com.siraj.app.widgets.WidgetDeeplink
import com.siraj.app.widgets.WidgetForegroundService
import com.siraj.app.widgets.WidgetPrefs
import com.siraj.app.widgets.WidgetStyleHelper

/**
 * NoorCompactStripWidget (4×1 Launcher Bar)
 *
 * Ultra-Compact 1-Row 6-Prayer Strip Widget:
 *  - Single top row: Gregorian + Hijri Date · City · ↻ Refresh button
 *  - 6-Column equal-weight horizontal prayer row: FAJR | RISE | DHUHR | ASR | MAGH | ISHA
 *  - Active / Next prayer highlighted in rounded accent container
 */
class NoorCompactStripWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "NoorCompactStripWidget"

        private fun getDefaultPrayerPayload(): PrayerPayload {
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
                PrayerEntry("Fajr", makePrayerTime(5, 40), "05:40"),
                PrayerEntry("Sunrise", makePrayerTime(6, 59), "06:59"),
                PrayerEntry("Dhuhr", makePrayerTime(12, 26), "12:26"),
                PrayerEntry("Asr", makePrayerTime(16, 17), "04:17"),
                PrayerEntry("Maghrib", makePrayerTime(17, 56), "05:56"),
                PrayerEntry("Isha", makePrayerTime(19, 12), "07:12")
            )

            var nextIdx = 0
            for (i in prayers.indices) {
                if (prayers[i].time > now) {
                    nextIdx = i
                    break
                }
            }

            return PrayerPayload(
                prayers = prayers,
                nextPrayerIndex = nextIdx,
                hijriDate = WidgetStyleHelper.computeFallbackHijri(),
                gregorianDate = "Fri, 20 Nov",
                locationLabel = "Vadgām, India",
                madhab = "HANAFI",
                calculationMethod = "Karachi",
                currentTime24h = "16:17",
                lastUpdated = now
            )
        }

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_compact_strip)

                val rawPayload = WidgetPrefs.getPrayerPayload(context)
                val payload = if (rawPayload == null || rawPayload.prayers.isEmpty()) {
                    getDefaultPrayerPayload()
                } else {
                    rawPayload
                }

                val style = WidgetStyleHelper.parseConfig(context)

                // 1. Offscreen Rendered Background
                val bgBitmap = WidgetStyleHelper.renderBackgroundBitmap(
                    surfaceStyle = style.surfaceStyle,
                    themeHex = style.themeHex,
                    opacityPercent = style.opacity,
                    accentHex = style.accentHex
                )
                views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

                // 2. Date Line: Gregorian + Hijri
                val candidateHijri = when {
                    style.hijriDateFormatted.isNotBlank() -> style.hijriDateFormatted
                    payload.hijriDate.isNotBlank() && !payload.hijriDate.contains("Siraj", ignoreCase = true) -> payload.hijriDate
                    else -> null
                }
                val hijriDisplay = WidgetStyleHelper.formatHijriDate(candidateHijri)
                val gregDisplay = if (payload.gregorianDate.isNotBlank()) payload.gregorianDate else "Fri 20 Nov"
                val dateLine = "$gregDisplay • $hijriDisplay"
                views.setTextViewText(R.id.widget_date_line, dateLine)

                // 3. City Name
                val cityDisplay = when {
                    style.city.isNotBlank() -> style.city.split(',')[0].trim()
                    payload.locationLabel.isNotBlank() -> payload.locationLabel.split(',')[0].trim()
                    else -> "Vadgām"
                }
                views.setTextViewText(R.id.widget_city_name, cityDisplay)

                // 4. Color Swatches
                val accentCol = try { Color.parseColor(style.accentHex) } catch (_: Throwable) { Color.parseColor("#D4AF37") }
                val textCol = try { Color.parseColor(style.textHex) } catch (_: Throwable) { Color.parseColor("#FDFBF7") }
                val subCol = try { Color.parseColor(style.subHex) } catch (_: Throwable) { Color.parseColor("#C5A059") }

                views.setTextColor(R.id.widget_date_line, accentCol)
                views.setTextColor(R.id.widget_city_name, subCol)
                views.setTextColor(R.id.widget_btn_refresh, accentCol)

                // 5. Populate 6 Prayer Slots
                val prayerEntries = payload.prayers
                fun getSlotTime(name: String, fallback: String): String {
                    val match = prayerEntries.firstOrNull { entry ->
                        entry.name.contains(name, ignoreCase = true) ||
                        (name.equals("dhuhr", ignoreCase = true) &&
                         (entry.name.contains("jumu", ignoreCase = true) || entry.name.contains("juma", ignoreCase = true)))
                    }
                    return match?.formattedTime?.replace(" AM", "")?.replace(" PM", "")?.trim() ?: fallback
                }

                val nextIdx = payload.nextPrayerIndex.coerceIn(0, prayerEntries.size - 1)
                val targetPrayerName = prayerEntries.getOrNull(nextIdx)?.name?.lowercase() ?: "asr"

                val isFriday = gregDisplay.startsWith("Fri", ignoreCase = true) || payload.gregorianDate.startsWith("Fri", ignoreCase = true)
                views.setTextViewText(R.id.widget_name_dhuhr, if (isFriday) "JUMA" else "DHUHR")

                val slots = listOf(
                    Triple("fajr", R.id.widget_name_fajr, R.id.widget_time_fajr),
                    Triple("sunrise", R.id.widget_name_sunrise, R.id.widget_time_sunrise),
                    Triple("dhuhr", R.id.widget_name_dhuhr, R.id.widget_time_dhuhr),
                    Triple("asr", R.id.widget_name_asr, R.id.widget_time_asr),
                    Triple("maghrib", R.id.widget_name_maghrib, R.id.widget_time_maghrib),
                    Triple("isha", R.id.widget_name_isha, R.id.widget_time_isha)
                )

                for ((slotId, nameId, timeId) in slots) {
                    val isTarget = targetPrayerName.contains(slotId)
                    val timeStr = getSlotTime(slotId, "--:--")
                    views.setTextViewText(timeId, timeStr)

                    if (isTarget) {
                        views.setTextColor(nameId, accentCol)
                        views.setTextColor(timeId, accentCol)
                    } else {
                        views.setTextColor(nameId, subCol)
                        views.setTextColor(timeId, textCol)
                    }
                }

                // 6. On-Widget ↻ Refresh PendingIntent
                val refreshIntent = Intent(context, WidgetAlarmReceiver::class.java).apply {
                    action = WidgetAlarmReceiver.ACTION_REFRESH_ALL
                }
                val refreshPi = PendingIntent.getBroadcast(
                    context,
                    203,
                    refreshIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_btn_refresh, refreshPi)

                // 7. Root Tap -> Deep Link
                val deeplink = WidgetDeeplink.buildPrayers(focus = "next")
                val openIntent = WidgetDeeplink.toIntent(context, deeplink)
                val openPi = PendingIntent.getActivity(
                    context,
                    103,
                    openIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, openPi)

                mgr.updateAppWidget(appWidgetId, views)
            } catch (t: Throwable) {
                Log.e(TAG, "Error updating NoorCompactStripWidget $appWidgetId", t)
            }
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        try {
            appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
        } catch (t: Throwable) {
            Log.e(TAG, "onUpdate error", t)
        }
    }

    override fun onEnabled(context: Context) {
        try {
            WidgetForegroundService.start(context)
            WidgetPrefs.getPrayerPayload(context)?.let {
                WidgetAlarmScheduler.scheduleNextPrayerAlarm(context, it)
            }
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
        } catch (t: Throwable) {
            Log.e(TAG, "onDisabled error", t)
        }
    }
}
