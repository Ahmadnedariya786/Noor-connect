package com.noorconnect.ummah.widgets.dailyayah

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import com.noorconnect.ummah.R
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetRefreshWorker

/**
 * Daily Ayah Widget (4×2)
 *
 * Shows:
 *  - Reference chip ("Al-Baqarah 2:255")
 *  - Arabic verse (RTL, Scheherazade New font)
 *  - Arabesque divider
 *  - Translation
 *
 * Tap → deep-link to /quran?surah=N&ayah=N
 */
class DailyAyahWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "DailyAyahWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            try {
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

                // Stale data badge
                val now = System.currentTimeMillis()
                val lastSync = WidgetPrefs.lastContentSyncMs(context)
                val isStale = lastSync > 0 && (now - lastSync) > 4 * 60 * 60 * 1000L
                views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

                // Accessibility content description
                val contentDesc = if (payload != null) {
                    context.getString(R.string.widget_a11y_daily_ayah, payload.ayah.reference)
                } else {
                    context.getString(R.string.widget_a11y_daily_ayah_default)
                }
                views.setContentDescription(R.id.widget_root, contentDesc)

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
            } catch (t: Throwable) {
                Log.e(TAG, "Critical error updating DailyAyahWidget $appWidgetId", t)
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
            WidgetRefreshWorker.enqueuePeriodic(context)
            Log.d(TAG, "Widget enabled")
        } catch (t: Throwable) {
            Log.e(TAG, "onEnabled error", t)
        }
    }

    override fun onDisabled(context: Context) {
        try {
            if (!WidgetForegroundService.hasActiveWidgets(context)) {
                WidgetForegroundService.stop(context)
            }
            Log.d(TAG, "Widget disabled")
        } catch (t: Throwable) {
            Log.e(TAG, "onDisabled error", t)
        }
    }
}
