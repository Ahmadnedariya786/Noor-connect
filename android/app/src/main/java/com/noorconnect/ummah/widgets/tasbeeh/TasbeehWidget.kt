package com.noorconnect.ummah.widgets.tasbeeh

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.util.TypedValue
import android.widget.RemoteViews
import com.noorconnect.ummah.R
import com.noorconnect.ummah.widgets.TasbeehState
import com.noorconnect.ummah.widgets.WidgetDeeplink
import com.noorconnect.ummah.widgets.WidgetForegroundService
import com.noorconnect.ummah.widgets.WidgetPrefs
import com.noorconnect.ummah.widgets.WidgetRefreshWorker
import com.noorconnect.ummah.widgets.WidgetStyleHelper

/**
 * Tasbeeh Counter Widget (2×2)
 *
 * Behavior:
 *  - Tap anywhere on the widget body → increment count via [TasbeehReceiver]
 *  - Tap reset icon (bottom-left) → reset session count
 *  - Tap open-app icon (bottom-right) → deep-link to /tasbeeh
 */
class TasbeehWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "TasbeehWidget"

        const val ACTION_INCREMENT = "com.noorconnect.ummah.TASBEEH_INCREMENT"
        const val ACTION_RESET = "com.noorconnect.ummah.TASBEEH_RESET"
        const val ACTION_OPEN_APP = "com.noorconnect.ummah.TASBEEH_OPEN_APP"

        const val EXTRA_APPWIDGET_IDS = "appWidgetIds"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            try {
                val views = RemoteViews(context.packageName, R.layout.widget_tasbeeh)

                // ─── 1. Customizer Styles (Background & Colors) ───
                val style = WidgetStyleHelper.parseConfig(context)
                val bgBitmap = WidgetStyleHelper.renderBackgroundBitmap(
                    surfaceStyle = style.surfaceStyle,
                    themeHex = style.themeHex,
                    opacityPercent = style.opacity,
                    accentHex = style.accentHex
                )
                views.setImageViewBitmap(R.id.widget_bg_image, bgBitmap)

                // ─── 2. Data State ───
                val state = WidgetPrefs.getTasbeehState(context)

                views.setTextViewText(R.id.widget_dhikr_name, localizedDhikr(context, state.currentDhikr))
                views.setTextViewText(R.id.widget_count, state.sessionCount.toString())
                views.setTextViewText(R.id.widget_target, context.getString(R.string.widget_tasbeeh_target_format, state.targetPerSession))
                views.setTextViewText(R.id.widget_total_today, context.getString(R.string.widget_tasbeeh_total_today_format, state.totalCount))

                // ─── 3. Swatches & Colors ───
                try {
                    val accentCol = Color.parseColor(style.accentHex)
                    val textCol = Color.parseColor(style.textHex)
                    val subCol = Color.parseColor(style.subHex)

                    views.setTextColor(R.id.widget_count, accentCol)
                    views.setTextColor(R.id.widget_dhikr_name, accentCol)
                    views.setTextColor(R.id.widget_target, subCol)
                    views.setTextColor(R.id.widget_total_today, textCol)
                } catch (_: Throwable) {}

                // ─── 4. Font Scaling ───
                val scaledCount = (48f * style.fontScale / 100f).coerceIn(36f, 60f)
                views.setTextViewTextSize(R.id.widget_count, TypedValue.COMPLEX_UNIT_SP, scaledCount)

                // Tap-to-increment: large PendingIntent covering the whole root.
                val incrementIntent = Intent(context, TasbeehReceiver::class.java).apply {
                    action = ACTION_INCREMENT
                    putExtra(EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                }
                val incrementPi = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 10 + 1,
                    incrementIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_root, incrementPi)

                // Reset icon → reset session
                val resetIntent = Intent(context, TasbeehReceiver::class.java).apply {
                    action = ACTION_RESET
                    putExtra(EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                }
                val resetPi = PendingIntent.getBroadcast(
                    context,
                    appWidgetId * 10 + 2,
                    resetIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_reset, resetPi)

                // Open-app icon → deep-link /tasbeeh
                val openAppIntent = WidgetDeeplink.toIntent(context, WidgetDeeplink.buildTasbeeh())
                val openAppPi = PendingIntent.getActivity(
                    context,
                    appWidgetId * 10 + 3,
                    openAppIntent,
                    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
                )
                views.setOnClickPendingIntent(R.id.widget_open_app, openAppPi)

                mgr.updateAppWidget(appWidgetId, views)
            } catch (t: Throwable) {
                Log.e(TAG, "Critical error updating TasbeehWidget $appWidgetId", t)
            }
        }

        fun updateAllWidgets(context: Context) {
            try {
                val mgr = AppWidgetManager.getInstance(context)
                val ids = mgr.getAppWidgetIds(ComponentName(context, TasbeehWidget::class.java))
                ids.forEach { updateWidget(context, mgr, it) }
            } catch (t: Throwable) {
                Log.e(TAG, "updateAllWidgets failed", t)
            }
        }

        /**
         * Haptic feedback for tasbeeh taps.
         */
        fun hapticTick(context: Context, completed: Boolean = false) {
            try {
                if (completed) {
                    val pattern = longArrayOf(0, 50, 30, 50)
                    vibrate(context, pattern, -1)
                } else {
                    vibrate(context, longArrayOf(0, 20), -1)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Haptic failed", e)
            }
        }

        private fun vibrate(context: Context, pattern: LongArray, repeat: Int) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vm = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    val effect = VibrationEffect.createWaveform(pattern, repeat)
                    vm?.defaultVibrator?.vibrate(effect)
                } else {
                    @Suppress("DEPRECATION")
                    val v = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val effect = VibrationEffect.createWaveform(pattern, repeat)
                        v?.vibrate(effect)
                    } else {
                        @Suppress("DEPRECATION")
                        v?.vibrate(pattern, repeat)
                    }
                }
            } catch (t: Throwable) {
                Log.w(TAG, "Vibrate exception", t)
            }
        }

        private fun localizedDhikr(context: Context, dhikr: String): String {
            return when (dhikr) {
                "SubhanAllah" -> context.getString(R.string.widget_tasbeeh_subhanallah)
                "Alhamdulillah" -> context.getString(R.string.widget_tasbeeh_alhamdulillah)
                "Allahu Akbar" -> context.getString(R.string.widget_tasbeeh_allahuakbar)
                "La ilaha illa Allah", "La ilaha illallah" -> context.getString(R.string.widget_tasbeeh_lailaha)
                else -> dhikr
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
