package com.noorconnect.app.widgets.tasbeeh

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import com.noorconnect.app.widgets.WidgetPrefs

/**
 * Receives tasbeeh increment / reset intents from the [TasbeehWidget]'s
 * PendingIntents and updates SharedPreferences atomically.
 *
 * Concurrency-safe: multiple rapid taps (e.g. 100 taps in 5 seconds)
 * will produce exactly the correct final count, never a lost increment.
 */
class TasbeehReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "TasbeehReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "onReceive: $action")

        val pendingResult = goAsync()
        try {
            when (action) {
                TasbeehWidget.ACTION_INCREMENT -> {
                    val newState = WidgetPrefs.atomicIncrementTasbeeh(context)
                    // Haptic: if sessionCount just rolled over (i.e. == 0 after increment), it means a target was reached
                    val completed = newState.sessionCount == 0 && newState.lastIncrementAt > 0
                    TasbeehWidget.hapticTick(context, completed = completed)
                    TasbeehWidget.updateAllWidgets(context)
                }
                TasbeehWidget.ACTION_RESET -> {
                    WidgetPrefs.atomicResetTasbeeh(context)
                    TasbeehWidget.hapticTick(context, completed = true)
                    TasbeehWidget.updateAllWidgets(context)
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in onReceive", e)
        } finally {
            pendingResult.finish()
        }
    }
}
