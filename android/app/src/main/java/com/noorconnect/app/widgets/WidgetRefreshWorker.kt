package com.noorconnect.app.widgets

import android.app.NotificationChannel
import android.app.NotificationManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.ForegroundInfo
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.noorconnect.app.R
import com.noorconnect.app.widgets.dailyayah.DailyAyahWidget
import com.noorconnect.app.widgets.dailyhadith.DailyHadithWidget
import com.noorconnect.app.widgets.nextprayer.NextPrayerWidget
import com.noorconnect.app.widgets.quranprogress.QuranProgressWidget
import com.noorconnect.app.widgets.tasbeeh.TasbeehWidget
import java.util.concurrent.TimeUnit

/**
 * Single WorkManager worker that refreshes all 5 widgets.
 *
 * Runs:
 *  - Periodic (every 30 minutes) via [enqueuePeriodic]
 *  - One-shot (expedited) via [enqueueImmediate]
 *  - Motion-based (step detection) via [enqueueMotionBased]
 *
 * This is the ONLY refresh trigger besides the prayer-time alarm.
 * No broadcasts, no Capacitor callbacks. Single source of truth.
 */
class WidgetRefreshWorker(
    ctx: Context,
    params: WorkerParameters
) : CoroutineWorker(ctx, params) {

    companion object {
        private const val TAG = "WidgetRefreshWorker"
        private const val NOTIFICATION_ID = 9901
        private const val CHANNEL_ID = "widget_sync_channel"
        private const val WORK_TAG = "noor_widget_periodic"
        private const val MOTION_WORK_TAG = "widget_motion"

        // Step detection configuration
        private const val STEP_REFRESH_DELAY_MS = 30000L // 30 seconds after steps
        private var lastStepTime = 0L
        private var stepHandler: Handler? = null
        private var stepRunnable: Runnable? = null
        private var sensorManager: SensorManager? = null
        private var stepListener: StepListener? = null

        val WIDGET_PROVIDERS = listOf(
            NextPrayerWidget(),
            DailyAyahWidget(),
            DailyHadithWidget(),
            QuranProgressWidget(),
            TasbeehWidget()
        )

        /**
         * Enqueue (or keep) the 30-minute periodic refresh.
         * Safe to call multiple times — KEEP policy preserves existing schedule.
         */
        fun enqueuePeriodic(context: Context) {
            val periodicWork = PeriodicWorkRequestBuilder<WidgetRefreshWorker>(
                30, TimeUnit.MINUTES
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                periodicWork
            )
            Log.d(TAG, "Periodic refresh enqueued (30 min interval)")
        }

        /**
         * Enqueue an immediate expedited refresh.
         */
        private const val IMMEDIATE_WORK_TAG = "widget_immediate"

        fun enqueueImmediate(context: Context) {
            val workRequest = OneTimeWorkRequestBuilder<WidgetRefreshWorker>()
                .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                IMMEDIATE_WORK_TAG,
                ExistingWorkPolicy.REPLACE,
                workRequest
            )
        }

        /**
         * Start step detection for motion-based widget refresh.
         * Refreshes widgets 30 seconds after detecting significant movement (steps).
         */
        fun startStepDetection(context: Context) {
            try {
                sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
                stepListener = StepListener(context)
                
                // Try to use step counter sensor first (more accurate)
                val stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
                if (stepCounterSensor != null) {
                    sensorManager?.registerListener(
                        stepListener,
                        stepCounterSensor,
                        SensorManager.SENSOR_DELAY_NORMAL
                    )
                    Log.d(TAG, "Step counter sensor registered")
                } else {
                    // Fallback to step detector
                    val stepDetectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
                    if (stepDetectorSensor != null) {
                        sensorManager?.registerListener(
                            stepListener,
                            stepDetectorSensor,
                            SensorManager.SENSOR_DELAY_NORMAL
                        )
                        Log.d(TAG, "Step detector sensor registered")
                    } else {
                        Log.w(TAG, "No step sensors available")
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start step detection", e)
            }
        }

        /**
         * Stop step detection.
         */
        fun stopStepDetection(context: Context) {
            try {
                stepListener?.let { listener ->
                    sensorManager?.unregisterListener(listener)
                }
                stepRunnable?.let { runnable ->
                    stepHandler?.removeCallbacks(runnable)
                }
                sensorManager = null
                stepListener = null
                stepHandler = null
                stepRunnable = null
                Log.d(TAG, "Step detection stopped")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to stop step detection", e)
            }
        }
    }

    /**
     * Step listener that triggers widget refresh after 30 seconds of step detection.
     */
    private class StepListener(private val context: Context) : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
            event?.let {
                if (it.sensor.type == Sensor.TYPE_STEP_COUNTER || it.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
                    val now = System.currentTimeMillis()
                    
                    // Only trigger if enough time has passed since last refresh
                    if (now - lastStepTime > STEP_REFRESH_DELAY_MS) {
                        lastStepTime = now
                        
                        // Schedule widget refresh after 30 seconds
                        stepHandler = Handler(Looper.getMainLooper())
                        val runnable = Runnable {
                            Log.d(TAG, "Step-based widget refresh triggered")
                            enqueueImmediate(context)
                        }
                        stepRunnable = runnable
                        stepHandler?.postDelayed(runnable, STEP_REFRESH_DELAY_MS)
                    }
                }
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
            // Not needed for step detection
        }
    }

    override suspend fun doWork(): Result {
        return try {
            val ctx = applicationContext
            val mgr = AppWidgetManager.getInstance(ctx)

            // Refresh each widget with individual error isolation
            var anySuccess = false
            WIDGET_PROVIDERS.forEach { provider ->
                try {
                    refreshWidget(ctx, mgr, provider)
                    anySuccess = true
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to refresh ${provider::class.java.simpleName}, continuing with others", e)
                }
            }

            // Self-cancel the periodic worker when no widget instances remain.
            val hasAnyInstances = WIDGET_PROVIDERS.any { provider ->
                val cls = provider::class.java
                mgr.getAppWidgetIds(ComponentName(ctx, cls)).isNotEmpty()
            }
            if (!hasAnyInstances) {
                Log.d(TAG, "No widget instances remain — cancelling periodic worker")
                WorkManager.getInstance(ctx).cancelUniqueWork(WORK_TAG)
            }

            // If ALL widgets failed, retry. If some succeeded, consider it a partial success.
            if (!anySuccess) {
                Log.e(TAG, "All widget refreshes failed")
                Result.retry()
            } else {
                Log.d(TAG, "Widget refresh completed (partial success ok)")
                Result.success()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Worker failed unexpectedly", e)
            Result.retry()
        }
    }

    override suspend fun getForegroundInfo(): ForegroundInfo {
        ensureChannel(applicationContext)
        val notification = NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(applicationContext.getString(R.string.notif_widget_sync_text))
            .setSilent(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
        return ForegroundInfo(NOTIFICATION_ID, notification)
    }

    private fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            ?: return
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.notif_channel_widget_sync),
                NotificationManager.IMPORTANCE_MIN
            ).apply {
                description = context.getString(R.string.notif_channel_widget_sync_desc)
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            nm.createNotificationChannel(channel)
        }
    }

    private fun refreshWidget(
        context: Context,
        mgr: AppWidgetManager,
        provider: android.appwidget.AppWidgetProvider
    ) {
        try {
            val ids = mgr.getAppWidgetIds(ComponentName(context, provider::class.java))
            if (ids.isEmpty()) return

            // Dispatch to onUpdate via the standard AppWidgetProvider mechanism.
            // We call onUpdate directly so we don't need to broadcast an intent.
            provider.onUpdate(context, mgr, ids)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to refresh ${provider::class.java.simpleName}", e)
        }
    }
}
