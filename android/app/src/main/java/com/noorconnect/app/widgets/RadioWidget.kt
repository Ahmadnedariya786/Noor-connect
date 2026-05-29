package com.noorconnect.app.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.RemoteViews
import com.noorconnect.app.R

class RadioWidget : AppWidgetProvider() {

    companion object {
        fun updateAllWidgets(context: Context, isPlaying: Boolean, title: String) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context) ?: return
                val componentName = ComponentName(context, RadioWidget::class.java)
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName) ?: return

                for (id in appWidgetIds) {
                    try {
                        val views = RemoteViews(context.packageName, R.layout.widget_radio)

                        // Update UI text
                        views.setTextViewText(R.id.radio_title, title)
                        views.setTextViewText(R.id.radio_status, if (isPlaying) "Streaming Live" else "Paused")

                        // Update Play/Pause icon
                        views.setImageViewResource(R.id.btn_play_pause,
                            if (isPlaying) R.drawable.ic_widget_pause else R.drawable.ic_widget_play
                        )

                        // Set pending intents for buttons mapping to RadioPlaybackService
                        views.setOnClickPendingIntent(R.id.btn_play_pause, getServiceIntent(context, ACTION_PLAY_PAUSE))
                        views.setOnClickPendingIntent(R.id.btn_prev, getServiceIntent(context, ACTION_PREV))
                        views.setOnClickPendingIntent(R.id.btn_next, getServiceIntent(context, ACTION_NEXT))

                        appWidgetManager.updateAppWidget(id, views)
                    } catch (e: Exception) {
                        Log.e("RadioWidget", "Failed to update radio widget $id", e)
                    }
                }
            } catch (e: Exception) {
                Log.e("RadioWidget", "Failed to update radio widgets", e)
            }
        }

        private fun getServiceIntent(context: Context, action: String): PendingIntent {
            val intent = Intent(context, RadioPlaybackService::class.java).setAction(action)
            return PendingIntent.getService(context, action.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Initial setup for untouched widgets (defaulting to paused state)
        updateAllWidgets(context, false, "Local Radio")
    }
}
