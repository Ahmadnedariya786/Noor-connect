package com.noorconnect.app.widgets.tasbeeh

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.VibrationEffect
import android.os.VibratorManager
import android.os.Vibrator
import android.util.Log
import android.widget.RemoteViews
import com.noorconnect.app.R
import com.noorconnect.app.widgets.WidgetDeeplink
import com.noorconnect.app.widgets.WidgetForegroundService
import com.noorconnect.app.widgets.WidgetPrefs
import com.noorconnect.app.widgets.WidgetRefreshWorker
import com.noorconnect.app.widgets.TasbeehState

/**
 * Tasbeeh Counter Widget (2×2)
 *
 * Behavior:
 *  - Tap anywhere on the widget body → increment count via [TasbeehReceiver]
 *  - Tap reset icon (bottom-left) → reset session count
 *  - Tap open-app icon (bottom-right) → deep-link to /tasbeeh
 *
 * The increment is delivered as a broadcast to [TasbeehReceiver], which
 * updates SharedPreferences atomically and refreshes all Tasbeeh widgets.
 *
 * Haptic feedback: short tick on each tap, plus a longer "completion"
 * pattern when sessionCount reaches targetPerSession (which auto-advances
 * to the next dhikr in the cycle: SubhanAllah → Alhamdulillah → Allahu Akbar).
 */
class TasbeehWidget : AppWidgetProvider() {

    companion object {
        private const val TAG = "TasbeehWidget"

        const val ACTION_INCREMENT = "com.noorconnect.app.TASBEEH_INCREMENT"
        const val ACTION_RESET = "com.noorconnect.app.TASBEEH_RESET"
        const val ACTION_OPEN_APP = "com.noorconnect.app.TASBEEH_OPEN_APP"

        const val EXTRA_APPWIDGET_IDS = "appWidgetIds"

        fun updateWidget(context: Context, mgr: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_tasbeeh)

            val state = WidgetPrefs.getTasbeehState(context)

            views.setTextViewText(R.id.widget_dhikr_name, localizedDhikr(context, state.currentDhikr))
            views.setTextViewText(R.id.widget_count, state.sessionCount.toString())
            views.setTextViewText(R.id.widget_target, context.getString(R.string.widget_tasbeeh_target_format, state.targetPerSession))
            views.setTextViewText(R.id.widget_total_today, context.getString(R.string.widget_tasbeeh_total_today_format, state.totalCount))

            // Tap-to-increment: large PendingIntent covering the whole root.
            // Use a unique requestCode per appWidgetId so multiple widgets don't collide.
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
            val deeplink = WidgetDeeplink.buildTasbeeh()
            val openIntent = WidgetDeeplink.toIntent(context, deeplink)
            val openPi = PendingIntent.getActivity(
                context,
                appWidgetId * 10 + 3,
                openIntent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            views.setOnClickPendingIntent(R.id.widget_open_app, openPi)

            mgr.updateAppWidget(appWidgetId, views)
        }

        fun updateAllWidgets(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, TasbeehWidget::class.java))
            ids.forEach { updateWidget(context, mgr, it) }
        }

        /**
         * Haptic feedback for tasbeeh taps.
         *  - Normal tap: 20ms tick
         *  - Target reached (auto-advance): 50-30-50 pattern
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
        }

        private fun localizedDhikr(context: Context, key: String): String {
            return when (key) {
                "SubhanAllah" -> context.getString(R.string.widget_tasbeeh_subhanallah)
                "Alhamdulillah" -> context.getString(R.string.widget_tasbeeh_alhamdulillah)
                "Allahu Akbar" -> context.getString(R.string.widget_tasbeeh_allahuakbar)
                "La ilaha illa Allah" -> context.getString(R.string.widget_tasbeeh_lailaha)
                else -> key
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
        val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
        val minHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0)
        val maxWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 0)
        val maxHeight = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
        
        Log.d(TAG, "Widget resized: min=${minWidth}x${minHeight}, max=${maxWidth}x${maxHeight}")
        
        updateWidget(context, appWidgetManager, appWidgetId)
    }

    override fun onEnabled(context: Context) {
        WidgetForegroundService.start(context)
        Log.d(TAG, "Widget enabled — foreground service started")
    }

    override fun onDisabled(context: Context) {
        val mgr = AppWidgetManager.getInstance(context)
        val ids = mgr.getAppWidgetIds(ComponentName(context, TasbeehWidget::class.java))
        if (ids.isEmpty()) {
            WidgetForegroundService.stop(context)
        }
        Log.d(TAG, "Widget disabled")
    }
}
