package com.noorconnect.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.noorconnect.app.widgets.WidgetBridge;
import com.noorconnect.app.widgets.WidgetForegroundService;

public class MainActivity extends BridgeActivity {
    private static final int EXACT_ALARM_PERMISSION_REQUEST = 9001;
    private static final int BATTERY_OPTIMIZATION_REQUEST = 9002;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WidgetBridge.class);
        registerPlugin(NativeAdhanPlugin.class);
        registerPlugin(BatteryOptimizationPlugin.class);
        super.onCreate(savedInstanceState);

        // Create default notification channel for Capacitor LocalNotifications
        createDefaultNotificationChannel();

        // Request SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31+)
        requestExactAlarmPermission();

        // Request battery optimization whitelist for reliable widget updates
        requestBatteryOptimizationWhitelist();

        // Enable Motion Event Splitting on the WebView
        WebView webView = this.getBridge().getWebView();
        if (webView != null) {
            webView.setMotionEventSplittingEnabled(true);
        }

        // No persistent foreground service needed.
        // Adhan alarms use setAlarmClock() which is Doze-immune.
        // Adhan playback uses a short-lived foreground service started
        // by AdhanAlarmReceiver only when it's time to play.
    }

    /**
     * Request SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31+).
     * This is required for exact alarm scheduling used by widget prayer-time alarms.
     */
    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!canScheduleExactAlarms()) {
                // Request the permission
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                startActivityForResult(intent, EXACT_ALARM_PERMISSION_REQUEST);
            } else {
                // Permission already granted - start widget foreground service
                WidgetForegroundService.start(this);
            }
        }
    }

    /**
     * Request battery optimization whitelist to prevent widget foreground service from being killed.
     * Critical for step detection and location monitoring on Android 6+.
     */
    private void requestBatteryOptimizationWhitelist() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, BATTERY_OPTIMIZATION_REQUEST);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == EXACT_ALARM_PERMISSION_REQUEST) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (canScheduleExactAlarms()) {
                    // Permission granted - start widget foreground service
                    WidgetForegroundService.start(this);
                }
            }
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Re-check permissions on resume in case user granted them from settings
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (canScheduleExactAlarms()) {
                WidgetForegroundService.start(this);
            }
        }
        // Also re-check battery optimization
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (pm != null && pm.isIgnoringBatteryOptimizations(getPackageName())) {
                WidgetForegroundService.start(this);
            }
        }
    }

    /**
     * Forward widget deep-link intents (noorconnect://app/...) to the JS layer
     * via the App plugin's appUrlOpen event. With launchMode="singleTask", taps
     * on a widget while the app is already running arrive here instead of onCreate.
     */
    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri data = intent.getData();
        if (data != null && "noorconnect".equals(data.getScheme())) {
            // BridgeActivity forwards new intents to the App plugin, which fires
            // appUrlOpen on the JS side. Setting the intent first ensures
            // getLaunchUrl() / getIntent() also reflect the deep link.
        }
    }

    /**
     * Create default notification channel for Capacitor LocalNotifications
     * Required for Android 8.0+ (API 26+)
     */
    private void createDefaultNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "default";
            String channelName = "Default";
            String channelDescription = "Default notification channel for Noor Connect";

            NotificationChannel channel = new NotificationChannel(
                    channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription(channelDescription);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
}
