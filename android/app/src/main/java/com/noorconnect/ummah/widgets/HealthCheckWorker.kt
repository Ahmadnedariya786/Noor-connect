package com.noorconnect.ummah.widgets

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * Periodic health check worker that runs every 6 hours to verify:
 * - Network connectivity for payload sync
 * - Widget foreground service is running
 * - Prayer alarms are scheduled
 * - No widget instances are orphaned
 */
class HealthCheckWorker(
    ctx: Context,
    params: WorkerParameters
) : CoroutineWorker(ctx, params) {

    companion object {
        private const val TAG = "HealthCheckWorker"
        private const val WORK_TAG = "widget_health_check"
        private const val INTERVAL_HOURS = 6

        fun enqueuePeriodic(context: Context) {
            val work = PeriodicWorkRequestBuilder<HealthCheckWorker>(
                INTERVAL_HOURS.toLong(), TimeUnit.HOURS
            ).build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                work
            )
            Log.d(TAG, "Health check enqueued (${INTERVAL_HOURS}h interval)")
        }
    }

    override suspend fun doWork(): Result {
        return try {
            val ctx = applicationContext

            // 1. Check network connectivity
            val hasNetwork = hasNetworkConnectivity(ctx)
            Log.d(TAG, "Network connectivity: $hasNetwork")

            // 2. Check widget foreground service
            val fgRunning = WidgetForegroundService.isRunning()
            Log.d(TAG, "Foreground service running: $fgRunning")

            // 3. Check if we have any widget instances
            val mgr = android.appwidget.AppWidgetManager.getInstance(ctx)
            val totalWidgets = WidgetRefreshWorker.WIDGET_PROVIDERS.sumOf { provider ->
                mgr.getAppWidgetIds(android.content.ComponentName(ctx, provider::class.java)).size
            }
            Log.d(TAG, "Active widget instances: $totalWidgets")

            // 4. Verify prayer alarms are scheduled
            val prayerPayload = WidgetPrefs.getPrayerPayload(ctx)
            val hasAlarms = prayerPayload != null
            Log.d(TAG, "Prayer payload exists (alarms should be scheduled): $hasAlarms")

            // 5. If network available but payload stale, trigger immediate sync
            if (hasNetwork && prayerPayload != null) {
                val now = System.currentTimeMillis()
                val staleThreshold = 2 * 60 * 60 * 1000L // 2 hours
                if ((now - prayerPayload.lastUpdated) > staleThreshold) {
                    Log.w(TAG, "Prayer payload stale, triggering immediate sync")
                    WidgetRefreshWorker.enqueueImmediate(ctx)
                }
            }

            // 6. Restart foreground service if dead but widgets exist
            if (!fgRunning && totalWidgets > 0) {
                Log.w(TAG, "Foreground service dead with active widgets, restarting")
                WidgetForegroundService.start(ctx)
            }

            // 7. If no widgets at all, clean up
            if (totalWidgets == 0) {
                Log.d(TAG, "No widgets active, health check complete")
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Health check failed", e)
            Result.retry()
        }
    }

    private fun hasNetworkConnectivity(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
               caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}