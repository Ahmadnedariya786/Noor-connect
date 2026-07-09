package com.noorconnect.app.widgets

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.util.Log

/**
 * Service for detecting user steps and triggering widget refreshes.
 * 
 * Uses Android's step counter/detector sensors to detect significant movement
 * and refreshes widgets 30 seconds after step detection to provide location
 * updates when the user is moving.
 */
object StepDetectionService {
    private const val TAG = "StepDetectionService"
    private const val STEP_REFRESH_DELAY_MS = 30000L // 30 seconds after steps
    
    private var sensorManager: SensorManager? = null
    private var stepListener: StepListener? = null
    private var stepHandler: Handler? = null
    private var stepRunnable: Runnable? = null
    private var lastStepTime = 0L
    private var isRunning = false

    /**
     * Start step detection for motion-based widget refresh.
     * Refreshes widgets 30 seconds after detecting significant movement (steps).
     */
    fun start(context: Context) {
        if (isRunning) {
            Log.d(TAG, "Step detection already running")
            return
        }

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
                    return
                }
            }
            
            isRunning = true
            Log.d(TAG, "Step detection started")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start step detection", e)
            stop(context)
        }
    }

    /**
     * Stop step detection.
     */
    fun stop(context: Context) {
        if (!isRunning) {
            return
        }

        try {
            sensorManager?.unregisterListener(stepListener)
            stepHandler?.removeCallbacks(stepRunnable)
            sensorManager = null
            stepListener = null
            stepHandler = null
            stepRunnable = null
            isRunning = false
            Log.d(TAG, "Step detection stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop step detection", e)
        }
    }

    /**
     * Check if step detection is currently running.
     */
    fun isRunning(): Boolean = isRunning

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
                        
                        // Cancel any pending refresh
                        stepHandler?.removeCallbacks(stepRunnable)
                        
                        // Schedule widget refresh after 30 seconds
                        stepHandler = Handler(Looper.getMainLooper())
                        stepRunnable = Runnable {
                            Log.d(TAG, "Step-based widget refresh triggered")
                            WidgetRefreshWorker.enqueueImmediate(context)
                        }
                        stepHandler?.postDelayed(stepRunnable!!, STEP_REFRESH_DELAY_MS)
                        
                        Log.d(TAG, "Step detected, scheduling widget refresh in ${STEP_REFRESH_DELAY_MS}ms")
                    }
                }
            }
        }

        override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
            // Not needed for step detection
        }
    }
}
