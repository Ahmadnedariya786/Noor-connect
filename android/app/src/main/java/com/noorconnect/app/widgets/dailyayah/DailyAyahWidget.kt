package com.noorconnect.app.widgets.dailyayah

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.app.R
import com.noorconnect.app.widgets.WidgetDeeplink
import com.noorconnect.app.widgets.WidgetPrefs
import com.noorconnect.app.widgets.WidgetRefreshWorker

/**
 * Daily Ayah Widget (4×2)
 *
 * Shows:
 *  - Reference chip ("Al-Baqarah 2:255")
 *  - Arabic verse (RTL, Scheherazade New font)
 *  - Arabesque divider
 *  - Translation
 *
 * The web side pushes the daily ayah via [DailyContentPayload] on every
 * app launch and day rollover. If no payload exists, the widget falls back
 * to a default Bismillah string from resources.
 *
 * Tap → deep-link to /quran?surah=N&ayah=N
 */
class DailyAyahWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "DailyAyahWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_ayah)

            val payload = WidgetPrefs.getDailyContent(context)

            if (payload == null) {
                // Empty state — show default Bismillah so the widget never looks broken
                views.setTextViewText(R.id.widget_quran_ref, context.getString(R.string.widget_quran_ref_default))
                views.setTextViewText(R.id.widget_quran_arabic, context.getString(R.string.widget_quran_arabic_default))
                views.setTextViewText(R.id.widget_quran_translation, context.getString(R.string.widget_quran_translation_default))
            } else {
                val ayah = payload.ayah
                views.setTextViewText(R.id.widget_quran_ref, ayah.reference.ifEmpty { context.getString(R.string.widget_quran_ref_default) })
                views.setTextViewText(R.id.widget_quran_arabic, ayah.arabic.ifEmpty { context.getString(R.string.widget_quran_arabic_default) })
                views.setTextViewText(R.id.widget_quran_translation, ayah.translation.ifEmpty { context.getString(R.string.widget_quran_translation_default) })
            }

            // Tap → deep-link /quran?surah=X&ayah=Y
            val (surah, ayahNum) = if (payload != null) {
                Pair(payload.ayah.surahNumber, payload.ayah.ayahNumber)
            } else {
                Pair(1, 1)
            }
            val deeplink = WidgetDeeplink.buildQuran(surah, ayahNum)
            val intent = WidgetDeeplink.toIntent(context, deeplink)
            val pi = PendingIntent.getActivity(
                context,
                101,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { updateWidget(context, appWidgetManager, it) }
    }

    override fun onEnabled(context: Context) {
        WidgetRefreshWorker.enqueuePeriodic(context)
        Log.d(TAG, "Widget enabled")
    }
}
