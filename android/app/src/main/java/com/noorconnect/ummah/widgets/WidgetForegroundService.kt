package com.noorconnect.ummah.widgets

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.noorconnect.ummah.R

/**
 * Foreground service for continuous widget monitoring:
 *  - Step detection (Sensor.TYPE_STEP_COUNTER / TYPE_STEP_DETECTOR)
 *  - Significant location change detection (network + GPS)
 *
 * Runs as a foreground service with type "specialUse" to survive
 * Doze mode and App Standby. Self-stops when no widgets are active.
 * Gracefully degrades when sensors/permissions unavailable.
 */
class WidgetForegroundService : Service() {

    companion object {
        private const val TAG = "WidgetForegroundService"
        private const val NOTIFICATION_ID = 9902
        private const val CHANNEL_ID = "widget_monitor_channel"
        private const val STEP_REFRESH_DELAY_MS = 30000L // 30s debounce
        private const val LOCATION_CHANGE_THRESHOLD_METERS = 10000f // 10km
        private const val MIN_TIME_BETWEEN_LOCATION_UPDATES_MS = 300000L // 5 min

        @JvmStatic fun start(context: Context) {
            val intent = Intent(context, WidgetForegroundService::class.java)
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                Log.w(TAG, "Could not start WidgetForegroundService from background context: ${e.message}")
            }
        }

        @JvmStatic fun stop(context: Context) {
            val intent = Intent(context, WidgetForegroundService::class.java)
            context.stopService(intent)
        }

        /**
         * True if at least one instance of ANY widget type is still placed.
         * Used by onDisabled handlers to avoid stopping the shared foreground
         * service (or cancelling alarms) when other widget types remain.
         */
        @JvmStatic fun hasActiveWidgets(context: Context): Boolean {
            val mgr = AppWidgetManager.getInstance(context)
            return WidgetRefreshWorker.WIDGET_PROVIDERS.any { provider ->
                mgr.getAppWidgetIds(ComponentName(context, provider::class.java)).isNotEmpty()
            }
        }

        // Track running state for health checks
        private var isServiceRunning = false

        @JvmStatic fun isRunning(): Boolean = isServiceRunning

        @JvmStatic fun setRunning(running: Boolean) {
            isServiceRunning = running
        }
    }

    // Step detection
    private var sensorManager: SensorManager? = null
    private var stepListener: SensorEventListener? = null
    private var stepHandler: Handler? = null
    private var stepRunnable: Runnable? = null
    private var lastStepTime = 0L
    private var hasStepSensor = false

    // Location detection
    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var lastLocation: Location? = null
    private var lastLocationUpdateTime = 0L
    private var hasLocationPermission = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        checkCapabilities()
        startStepDetection()
        startLocationMonitoring()
    }

    private fun checkCapabilities() {
        // Check step sensor availability
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        val stepCounter = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        val stepDetector = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
        hasStepSensor = stepCounter != null || stepDetector != null
        if (!hasStepSensor) {
            Log.w(TAG, "No step sensors available - step detection disabled")
        }

        // Check location permission
        hasLocationPermission = ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                               ContextCompat.checkSelfPermission(this, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!hasLocationPermission) {
            Log.w(TAG, "Location permission not granted - location monitoring disabled")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        setRunning(true)
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopStepDetection()
        stopLocationMonitoring()
        setRunning(false)
        super.onDestroy()
    }

    // ═══════════════════════════════════════════════════════════════
    // Step Detection (graceful degradation if no sensor)
    // ═══════════════════════════════════════════════════════════════

    private fun startStepDetection() {
        if (!hasStepSensor) return

        sensorManager = getSystemService(Context.SENSOR_SERVICE) as? SensorManager
        stepListener = StepListener()
        stepHandler = Handler(Looper.getMainLooper())

        val stepCounterSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        if (stepCounterSensor != null) {
            sensorManager?.registerListener(stepListener, stepCounterSensor, SensorManager.SENSOR_DELAY_NORMAL)
            Log.d(TAG, "Step counter sensor registered")
        } else {
            val stepDetectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR)
            if (stepDetectorSensor != null) {
                sensorManager?.registerListener(stepListener, stepDetectorSensor, SensorManager.SENSOR_DELAY_NORMAL)
                Log.d(TAG, "Step detector sensor registered")
            }
        }
    }

    private fun stopStepDetection() {
        stepListener?.let { sensorManager?.unregisterListener(it) }
        stepRunnable?.let { stepHandler?.removeCallbacks(it) }
        sensorManager = null
        stepListener = null
        stepHandler = null
        stepRunnable = null
    }

    private inner class StepListener : SensorEventListener {
        override fun onSensorChanged(event: SensorEvent?) {
            event?.let {
                if (it.sensor.type == Sensor.TYPE_STEP_COUNTER || it.sensor.type == Sensor.TYPE_STEP_DETECTOR) {
                    val now = System.currentTimeMillis()
                    if (now - lastStepTime > STEP_REFRESH_DELAY_MS) {
                        lastStepTime = now
                        stepRunnable?.let { stepHandler?.removeCallbacks(it) }
                        val runnable = Runnable {
                            Log.d(TAG, "Step-based widget refresh triggered")
                            WidgetRefreshWorker.enqueueImmediate(this@WidgetForegroundService)
                        }
                        stepRunnable = runnable
                        stepHandler?.postDelayed(runnable, STEP_REFRESH_DELAY_MS)
                    }
                }
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}
    }

    // ═══════════════════════════════════════════════════════════════
    // Location Monitoring (graceful degradation if no permission)
    // ═══════════════════════════════════════════════════════════════

    private fun startLocationMonitoring() {
        if (!hasLocationPermission) return

        locationManager = getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        locationListener = LocationChangeListener()

        try {
            // Network provider (low power)
            locationManager?.requestLocationUpdates(
                LocationManager.NETWORK_PROVIDER,
                MIN_TIME_BETWEEN_LOCATION_UPDATES_MS,
                LOCATION_CHANGE_THRESHOLD_METERS,
                locationListener!!
            )

            // GPS if available
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    MIN_TIME_BETWEEN_LOCATION_UPDATES_MS,
                    LOCATION_CHANGE_THRESHOLD_METERS,
                    locationListener!!
                )
            }
            Log.d(TAG, "Location monitoring started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission denied at runtime", e)
        }
    }

    private fun stopLocationMonitoring() {
        locationListener?.let { locationManager?.removeUpdates(it) }
        locationManager = null
        locationListener = null
        lastLocation = null
        lastLocationUpdateTime = 0
    }

    private inner class LocationChangeListener : LocationListener {
        override fun onLocationChanged(location: Location) {
            val now = System.currentTimeMillis()
            if (now - lastLocationUpdateTime < MIN_TIME_BETWEEN_LOCATION_UPDATES_MS) return

            lastLocation?.let { prev ->
                val distance = location.distanceTo(prev)
                if (distance < LOCATION_CHANGE_THRESHOLD_METERS) {
                    Log.d(TAG, "Location change below threshold: ${distance}m")
                    return
                }
            }

            lastLocation = location
            lastLocationUpdateTime = now
            Log.d(TAG, "Significant location change detected, refreshing widgets")
            WidgetRefreshWorker.enqueueImmediate(this@WidgetForegroundService)
        }

        override fun onProviderDisabled(provider: String) {}
        override fun onProviderEnabled(provider: String) {}
        @Suppress("DEPRECATION")
        override fun onStatusChanged(provider: String, status: Int, extras: Bundle?) {}
    }

    // ═══════════════════════════════════════════════════════════════
    // Notification
    // ═══════════════════════════════════════════════════════════════

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                getString(R.string.widget_monitor_channel_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.widget_monitor_channel_desc)
                setShowBadge(false)
                enableVibration(false)
                setSound(null, null)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val intent = Intent(this, com.noorconnect.ummah.MainActivity::class.java)
        val pi = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(getString(R.string.widget_monitor_notif_title))
            .setContentText(getString(R.string.widget_monitor_notif_text))
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pi)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }
}