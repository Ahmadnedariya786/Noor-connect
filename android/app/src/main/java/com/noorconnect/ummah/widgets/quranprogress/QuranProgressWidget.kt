package com.noorconnect.ummah.widgets.quranprogress

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
 * Quran Progress Widget (4×2)
 *
 * Shows:
 *  - Section label + daily streak badge
 *  - Progress ring (total %) with % text overlay
 *  - Last read label, current Juz, pages read
 *  - Linear progress bar (Ramadan goal)
 *
 * Tap → deep-link to /quran/reading
 */
class QuranProgressWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "QuranProgressWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_quran_progress)

                // ─── 1. Customizer Styles (Background & Colors) ───
                val style = WidgetStyleHelper.parseConfig(context)
                val bgBitmap = WidgetStyleHelper.renderBackgroundBitmap(
                    surfaceStyle = style.surfaceStyle,
                    themeHex = style.themeHex,
                    opacityPercent = style.opacity,
                    accentHex = style.accentHex
                )
                views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

                // ─── 2. Content ───
                val payload = WidgetPrefs.getQuranProgress(context)

                if (payload == null) {
                    views.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_quran_progress_streak_format, 0))
                    views.setTextViewText(R.id.widget_percent, context.getString(R.string.widget_quran_progress_percent_format, 0))
                    views.setTextViewText(R.id.widget_last_read, context.getString(R.string.widget_quran_progress_last_read_format, "Surah Al-Fatiha"))
                    views.setTextViewText(R.id.widget_juz, context.getString(R.string.widget_quran_progress_juz_format, 1))
                    views.setTextViewText(R.id.widget_pages, context.getString(R.string.widget_quran_progress_pages_format, 0))
                    views.setTextViewText(R.id.widget_goal_label, context.getString(R.string.widget_quran_progress_goal_format, 0))
                    views.setProgressBar(R.id.widget_goal_bar, 100, 0, false)
                    views.setInt(R.id.widget_ring_progress, "setImageLevel", 0)
                } else {
                    // Streak
                    views.setTextViewText(R.id.widget_streak, context.getString(R.string.widget_quran_progress_streak_format, payload.dailyStreak))

                    // Percent (rounded)
                    val pctInt = payload.totalPercent.toInt().coerceIn(0, 100)
                    views.setTextViewText(R.id.widget_percent, context.getString(R.string.widget_quran_progress_percent_format, pctInt))

                    // Last read
                    views.setTextViewText(R.id.widget_last_read, context.getString(R.string.widget_quran_progress_last_read_format, payload.lastReadLabel.ifEmpty { "Surah Al-Fatiha" }))

                    // Juz + pages
                    views.setTextViewText(R.id.widget_juz, context.getString(R.string.widget_quran_progress_juz_format, payload.currentJuz))
                    views.setTextViewText(R.id.widget_pages, context.getString(R.string.widget_quran_progress_pages_format, payload.totalPagesRead))

                    // Goal
                    val goalInt = payload.goalPercent.toInt().coerceIn(0, 100)
                    views.setTextViewText(R.id.widget_goal_label, context.getString(R.string.widget_quran_progress_goal_format, goalInt))
                    views.setProgressBar(R.id.widget_goal_bar, 100, goalInt, false)

                    // Ring fill
                    val progressFraction = (payload.totalPercent / 100f).coerceIn(0f, 1f)
                    views.setInt(R.id.widget_ring_progress, "setImageLevel", (progressFraction * 10000).toInt())
                }

                // ─── 3. Swatches & Colors ───
                try {
                    val accentCol = Color.parseColor(style.accentHex)
                    val textCol = Color.parseColor(style.textHex)
                    val subCol = Color.parseColor(style.subHex)

                    views.setTextColor(R.id.widget_percent, accentCol)
                    views.setTextColor(R.id.widget_streak, accentCol)
                    views.setTextColor(R.id.widget_last_read, textCol)
                    views.setTextColor(R.id.widget_juz, subCol)
                    views.setTextColor(R.id.widget_pages, subCol)
                    views.setTextColor(R.id.widget_goal_label, subCol)
                } catch (_: Throwable) {}

                // ─── 4. Font Scaling ───
                val scaledTitle = (15f * style.fontScale / 100f).coerceIn(12f, 20f)
                views.setTextViewTextSize(R.id.widget_last_read, TypedValue.COMPLEX_UNIT_SP, scaledTitle)

                // ─── 5. Stale data badge ───
                val now = System.currentTimeMillis()
                val isStale = payload?.let { (now - it.lastReadTimestamp) > 4 * 60 * 60 * 1000L } ?: false
                views.setViewVisibility(R.id.widget_stale_badge, if (isStale) View.VISIBLE else View.GONE)

                // ─── 6. Accessibility ───
                val streakVal = payload?.dailyStreak ?: 0
                val percentVal = payload?.totalPercent?.toInt() ?: 0
                val contentDesc = context.getString(R.string.widget_a11y_quran_progress, percentVal, streakVal)
                views.setContentDescription(R.id.widget_root, contentDesc)

                // ─── 7. Tap → deep-link /quran/reading ───
                val deeplink = WidgetDeeplink.buildQuranReading()
                val intent = WidgetDeeplink.toIntent(context, deeplink)
                val pi = PendingIntent.getActivity(
                    context,
                    103,
                    intent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, pi)

                mgr.updateAppWidget(appWidgetId, views)
            } catch (t: Throwable) {
                Log.e(TAG, "Critical error updating QuranProgressWidget $appWidgetId", t)
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
