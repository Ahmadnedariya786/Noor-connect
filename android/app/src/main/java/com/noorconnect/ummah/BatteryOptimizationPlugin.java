package com.noorconnect.ummah;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Plugin for managing battery optimization settings.
 * Allows checking if the app is ignoring battery optimizations
 * and requesting the user to disable them.
 */
@CapacitorPlugin(name = "BatteryOptimization")
public class BatteryOptimizationPlugin extends Plugin {

    private static final String TAG = "BatteryOptPlugin";

    /**
     * Check if the app is ignoring battery optimizations
     */
    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            // Battery optimization API not available before Android 6.0
            call.resolve(new JSObject().put("isIgnoring", true));
            return;
        }

        try {
            PowerManager powerManager = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            if (powerManager == null) {
                call.reject("PowerManager not available");
                return;
            }

            String packageName = getContext().getPackageName();
            boolean isIgnoring = powerManager.isIgnoringBatteryOptimizations(packageName);
            
            JSObject result = new JSObject();
            result.put("isIgnoring", isIgnoring);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Error checking battery optimization status", e);
            call.reject("Error checking battery optimization status: " + e.getMessage());
        }
    }

    /**
     * Request to ignore battery optimizations
     * Opens the system settings page where the user can disable battery optimization
     */
    @PluginMethod
    public void requestIgnoreBatteryOptimizations(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            // Battery optimization API not available before Android 6.0
            call.resolve();
            return;
        }

        try {
            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity not available");
                return;
            }

            String packageName = getContext().getPackageName();
            Intent intent = new Intent();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + packageName));
            }
            
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization exemption", e);
            call.reject("Error requesting battery optimization exemption: " + e.getMessage());
        }
    }

    /**
     * Open the app's battery optimization settings page
     */
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        try {
            Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity not available");
                return;
            }

            String packageName = getContext().getPackageName();
            Intent intent = new Intent();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.setData(Uri.parse("package:" + packageName));
            } else {
                // Fallback to app settings for older Android versions
                intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + packageName));
            }
            
            activity.startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Error opening battery settings", e);
            call.reject("Error opening battery settings: " + e.getMessage());
        }
    }
}
