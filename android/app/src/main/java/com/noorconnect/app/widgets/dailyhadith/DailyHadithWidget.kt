package com.noorconnect.app.widgets.dailyhadith

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.util.Log
import android.widget.RemoteViews
import com.noorconnect.app.R
import com.noorconnect.app.widgets.HadithBundle
import com.noorconnect.app.widgets.WidgetDeeplink
import com.noorconnect.app.widgets.WidgetForegroundService
import com.noorconnect.app.widgets.WidgetPrefs
import com.noorconnect.app.widgets.WidgetRefreshWorker
import java.util.Calendar

/**
 * Daily Hadith Widget (4×2)
 *
 * Shows:
 *  - Source chip ("Sahih Bukhari 1:1")
 *  - Grade badge (color-coded: Sahih=emerald, Hasan=gold, Daif=red)
 *  - Arabic hadith (RTL, Scheherazade New font)
 *  - Translation
 *  - Narrator row
 *
 * Picks today's hadith:
 *  1. If web side pushed a fresh [DailyContentPayload], use that.
 *  2. Otherwise, pick from bundled `assets/widget_hadiths.json` using
 *     DAY_OF_YEAR % hadiths.size for deterministic daily rotation.
 *
 * Tap → deep-link to /hadith?collection=X&book=N&number=N
 */
class DailyHadithWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "DailyHadithWidget"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_daily_hadith)

            // Try pushed payload first
            val payload = WidgetPrefs.getDailyContent(context)
            val hadith = payload?.hadith ?: HadithBundle.getFallbackHadith(context)

            // Source + grade
            views.setTextViewText(R.id.widget_hadith_source, hadith.source.ifEmpty { context.getString(R.string.widget_hadith_source_default) })
            views.setTextViewText(R.id.widget_hadith_grade, hadith.grade.ifEmpty { context.getString(R.string.widget_hadith_grade_default) })
            applyGradeColor(context, views, hadith.grade)

            // Arabic + translation + narrator
            views.setTextViewText(R.id.widget_hadith_arabic, hadith.arabic.ifEmpty { context.getString(R.string.widget_hadith_arabic_default) })
            views.setTextViewText(R.id.widget_hadith_translation, hadith.translation.ifEmpty { context.getString(R.string.widget_hadith_translation_default) })

            val narratorDisplay = if (hadith.narrator.isBlank()) {
                context.getString(R.string.widget_hadith_narrator_default)
            } else {
                context.getString(R.string.widget_hadith_narrator_format, hadith.narrator)
            }
            views.setTextViewText(R.id.widget_hadith_narrator, narratorDisplay)

            // Tap → deep-link /hadith?collection=X&book=N&number=N
            val deeplink = WidgetDeeplink.buildHadith(
                hadith.collection.ifEmpty { "bukhari" },
                hadith.bookNumber,
                hadith.hadithNumber
            )
            val intent = WidgetDeeplink.toIntent(context, deeplink)
            val pi = PendingIntent.getActivity(
                context,
                102,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_root, pi)

            mgr.updateAppWidget(appWidgetId, views)
        }

        private fun applyGradeColor(context: Context, views: RemoteViews, grade: String) {
            val colorRes = when (grade.lowercase()) {
                "sahih", "صحيح" -> R.color.widget_grade_sahih
                "hasan", "hasan sahih", "حسن" -> R.color.widget_grade_hasan
                "daif", "da'if", "ضعيف" -> R.color.widget_grade_daif
                else -> R.color.widget_grade_sahih
            }
            val color = androidx.core.content.ContextCompat.getColor(context, colorRes)
            views.setTextColor(R.id.widget_hadith_grade, color)
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
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
        
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        WidgetForegroundService.start(context)
        WidgetRefreshWorker.enqueuePeriodic(context)
        Log.d(TAG, "Widget enabled")
    }

    override fun onDisabled(context: Context) {
        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(android.content.ComponentName(context, DailyHadithWidget::class.java))
        if (ids.isEmpty()) {
            WidgetForegroundService.stop(context)
        }
        Log.d(TAG, "Widget disabled")
    }
}
