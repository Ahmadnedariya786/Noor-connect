package com.noorconnect.ummah.widgets.dailyayah

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
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetRefreshWorker
import com.noorconnect.ummah.widgets.WidgetStyleHelper

/**
 * Daily Ayah Widget (4×2)
 *
 * Shows:
 *  - Reference chip ("Al-Baqarah 2:255")
 *  - Arabic verse (RTL, Scheherazade New / Amiri font)
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

                // ─── 1. Customizer Styles (Background & Colors) ───
                val style = WidgetStyleHelper.parseConfig(context)
                val bgBitmap = WidgetStyleHelper.renderBackgroundBitmap(
                    surfaceStyle = style.surfaceStyle,
                    themeHex = style.themeHex,
                    opacityPercent = style.opacity,
                    accentHex = style.accentHex
                )
                views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

                // ─── 2. Data Content ───
                val payload = WidgetPrefs.getDailyContent(context)

                if (payload == null) {
                    views.setTextViewText(R.id.widget_quran_ref, context.getString(R.string.widget_quran_ref_default))
                    views.setTextViewText(R.id.widget_quran_arabic, context.getString(R.string.widget_quran_arabic_default))
                    views.setTextViewText(R.id.widget_quran_translation, context.getString(R.string.widget_quran_translation_default))
                } else {
                    val ayah = payload.ayah
                    views.setTextViewText(R.id.widget_quran_ref, ayah.reference.ifEmpty { context.getString(R.string.widget_quran_ref_default) })
                    views.setTextViewText(R.id.widget_quran_arabic, ayah.arabic.ifEmpty { context.getString(R.string.widget_quran_arabic_default) })
                    views.setTextViewText(R.id.widget_quran_translation, ayah.translation.ifEmpty { context.getString(R.string.widget_quran_translation_default) })
                }

                // ─── 3. Swatches & Colors ───
                try {
                    val accentCol = Color.parseColor(style.accentHex)
                    val textCol = Color.parseColor(style.textHex)
                    val subCol = Color.parseColor(style.subHex)

                    views.setTextColor(R.id.widget_quran_ref, accentCol)
                    views.setTextColor(R.id.widget_quran_arabic, textCol)
                    views.setTextColor(R.id.widget_quran_translation, subCol)
                } catch (_: Throwable) {}

                // ─── 4. Font Scaling ───
                val scaledArabic = (21f * style.fontScale / 100f).coerceIn(16f, 28f)
                views.setTextViewTextSize(R.id.widget_quran_arabic, TypedValue.COMPLEX_UNIT_SP, scaledArabic)

                val scaledTrans = (12f * style.fontScale / 100f).coerceIn(10f, 16f)
                views.setTextViewTextSize(R.id.widget_quran_translation, TypedValue.COMPLEX_UNIT_SP, scaledTrans)

                // ─── 5. Stale data badge ───
                val now = System.currentTimeMillis()
                val lastSync = WidgetPrefs.lastContentSyncMs(context)
                val isStale = lastSync > 0 && (now - lastSync) > 4 * 60 * 60 * 1000L
                views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

                // ─── 6. Accessibility ───
                val contentDesc = if (payload != null) {
                    context.getString(R.string.widget_a11y_daily_ayah, payload.ayah.reference)
                } else {
                    context.getString(R.string.widget_a11y_daily_ayah_default)
                }
                views.setContentDescription(R.id.widget_root, contentDesc)

                // ─── 7. Tap → deep-link /quran?surah=X&ayah=Y ───
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
