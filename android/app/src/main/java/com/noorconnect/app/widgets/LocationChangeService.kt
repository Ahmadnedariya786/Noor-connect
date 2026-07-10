package com.noorconnect.app.widgets

import android.content.Context
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.util.Log

/**
 * Service for detecting significant location changes and triggering widget refreshes.
 * 
 * Monitors location changes and triggers widget refresh when the user moves
 * a significant distance (default 10km) to ensure prayer times remain accurate.
 */
object LocationChangeService {
    private const val TAG = "LocationChangeService"
    private const val LOCATION_CHANGE_THRESHOLD_METERS = 10000.0 // 10km change threshold
    private const val MIN_TIME_BETWEEN_UPDATES_MS = 300000L // 5 minutes minimum between updates
    
    private var locationManager: LocationManager? = null
    private var locationListener: LocationListener? = null
    private var lastLocation: Location? = null
    private var lastUpdateTime: Long = 0L
    private var isRunning = false

    /**
     * Start location change detection.
     */
    fun start(context: Context) {
        if (isRunning) {
            Log.d(TAG, "Location change detection already running")
            return
        }

        try {
            locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            locationListener = LocationChangeListener(context)
            
            // Request location updates with balanced criteria
            val provider = LocationManager.NETWORK_PROVIDER
            val minTime = MIN_TIME_BETWEEN_UPDATES_MS
            val minDistance = LOCATION_CHANGE_THRESHOLD_METERS.toFloat()
            
            locationManager?.requestLocationUpdates(provider, minTime, minDistance, locationListener!!)
            
            // Try to get GPS as well if available
            if (locationManager?.isProviderEnabled(LocationManager.GPS_PROVIDER) == true) {
                locationManager?.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    minTime,
                    minDistance,
                    locationListener!!
                )
            }
            
            isRunning = true
            Log.d(TAG, "Location change detection started")
        } catch (e: SecurityException) {
            Log.e(TAG, "Location permission denied", e)
            stop(context)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start location change detection", e)
            stop(context)
        }
    }

    /**
     * Stop location change detection.
     */
    fun stop(context: Context) {
        if (!isRunning) {
            return
        }

        try {
            locationListener?.let { listener ->
                locationManager?.removeUpdates(listener)
            }
            locationManager = null
            locationListener = null
            lastLocation = null
            lastUpdateTime = 0L
            isRunning = false
            Log.d(TAG, "Location change detection stopped")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop location change detection", e)
        }
    }

    /**
     * Check if location change detection is currently running.
     */
    fun isRunning(): Boolean = isRunning

    /**
     * Location listener that triggers widget refresh on significant location changes.
     */
    private class LocationChangeListener(private val context: Context) : LocationListener {
        override fun onLocationChanged(location: Location) {
            val now = System.currentTimeMillis()
            
            // Only process if enough time has passed since last update
            if (now - lastUpdateTime < MIN_TIME_BETWEEN_UPDATES_MS) {
                return
            }
            
            // Check if this is a significant location change
            val prevLocation = lastLocation
            if (prevLocation != null) {
                val distance = location.distanceTo(prevLocation)
                if (distance < LOCATION_CHANGE_THRESHOLD_METERS) {
                    Log.d(TAG, "Location change below threshold: ${distance}m")
                    return
                }
            }
            
            lastLocation = location
            lastUpdateTime = now
            
            Log.d(TAG, "Significant location change detected, refreshing widgets")
            WidgetRefreshWorker.enqueueImmediate(context)
        }

        override fun onProviderDisabled(provider: String) {
            Log.d(TAG, "Location provider disabled: $provider")
        }

        override fun onProviderEnabled(provider: String) {
            Log.d(TAG, "Location provider enabled: $provider")
        }

        override fun onStatusChanged(provider: String, status: Int, extras: Bundle) {
            // Not needed for our use case
        }
    }
}
