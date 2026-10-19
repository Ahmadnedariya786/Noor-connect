package com.noorconnect.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.noorconnect.app.widgets.WidgetBridge;
import com.noorconnect.app.widgets.WidgetForegroundService;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int EXACT_ALARM_PERMISSION_REQUEST = 9001;
    private static final int BATTERY_OPTIMIZATION_REQUEST = 9002;
    private static final String PREFS_ONBOARDING = "noor_permission_flow_prefs";
    private static final String KEY_EXACT_ALARM_REDIRECTED = "exact_alarm_redirected";
    private static final String KEY_BATTERY_PROMPTED = "battery_whitelist_prompted";

    // Guard so setDataDirectorySuffix is called at most once per process lifetime
    private static boolean sDataDirectorySuffixSet = false;

    // Guard against multiple simultaneous renderer crash recovery attempts
    private final java.util.concurrent.atomic.AtomicBoolean isHandlingRendererCrash =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Versioned WebView data directory prevents cache corruption across installs/updates
        // Must only be called once per process and before any WebView initialization
        if (!sDataDirectorySuffixSet) {
            try {
                WebView.setDataDirectorySuffix(BuildConfig.VERSION_NAME);
                sDataDirectorySuffixSet = true;
            } catch (Throwable t) {
                Log.w(TAG, "WebView.setDataDirectorySuffix already configured or failed", t);
            }
        }

        registerPlugin(WidgetBridge.class);
        registerPlugin(NativeAdhanPlugin.class);
        registerPlugin(BatteryOptimizationPlugin.class);
        super.onCreate(savedInstanceState);

        // Create default notification channel for Capacitor LocalNotifications
        createDefaultNotificationChannel();

        // First-launch permission sequence (Step A: background dialog -> Step B: exact alarm settings)
        // is now explicitly coordinated by runFirstLaunchPermissionOnboarding() in the UI layer.

        // Enable Motion Event Splitting and allow immediate audio playback on the WebView
        WebView webView = (this.getBridge() != null) ? this.getBridge().getWebView() : null;
        if (webView != null) {
            try {
                webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            } catch (Throwable t) {
                Log.w(TAG, "Failed to set setMediaPlaybackRequiresUserGesture(false)", t);
            }
            try {
                webView.setMotionEventSplittingEnabled(true);
            } catch (Throwable t) {
                Log.w(TAG, "Failed to set setMotionEventSplittingEnabled", t);
            }
            try {
                webView.addJavascriptInterface(new Object() {
                    @android.webkit.JavascriptInterface
                    public void closeApp() {
                        runOnUiThread(() -> {
                            Log.i(TAG, "AndroidBridge.closeApp() invoked from JS: finishing activity affinity");
                            finishAffinity();
                        });
                    }
                }, "AndroidBridge");
            } catch (Throwable t) {
                Log.w(TAG, "Failed to register AndroidBridge JavascriptInterface", t);
            }
        }

        // Install renderer process crash handler via Capacitor's bridge listener
        installRenderProcessCrashHandler();

        // No persistent foreground service needed.
        // Adhan alarms use setAlarmClock() which is Doze-immune.
        // Adhan playback uses a short-lived foreground service started
        // by AdhanAlarmReceiver only when it's time to play.
    }

    /**
     * Register a render-process crash handler.
     *
     * When the WebView renderer process dies (OOM / low memory kill, heavy JS,
     * or internal WebView bugs) the default Android behavior is to tear down the whole
     * application — resulting in "Noor Connect keeps stopping" or a silent drop to launcher.
     *
     * By returning {@code true} from onRenderProcessGone, we signal to Android that the
     * crash is handled and prevent the OS from terminating the application process.
     *
     * Once the renderer dies, the dead WebView instance can NEVER be reused. We cleanly
     * detach and destroy the dead WebView, then recreate the Activity so that Capacitor
     * instantiates a fresh Bridge and WebView cleanly from splash.
     */
    private void installRenderProcessCrashHandler() {
        try {
            if (getBridge() == null) {
                Log.w(TAG, "Bridge is null; cannot install render process crash handler");
                return;
            }

            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    boolean didCrash = detail != null && detail.didCrash();
                    int priority = -1;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && detail != null) {
                        try {
                            priority = detail.rendererPriorityAtExit();
                        } catch (Throwable ignored) {
                            // Ignored: rendererPriorityAtExit may throw or be unsupported on custom ROMs
                        }
                    }

                    String reason = didCrash ? "RENDERER_CRASHED" : "KILLED_BY_SYSTEM_LOW_MEMORY";
                    Log.w(TAG, "WebView renderer gone: " + reason + " (priority=" + priority + "). Recovering cleanly.");

                    // If the Activity is already finishing or destroyed, nothing to recover
                    if (isFinishing() || isDestroyed()) {
                        return true;
                    }

                    // Guard against re-entrant calls or duplicate renderer termination events
                    if (isHandlingRendererCrash.compareAndSet(false, true)) {
                        runOnUiThread(() -> {
                            try {
                                // 1. Cleanly detach and destroy the dead WebView to prevent memory leaks and zombie calls
                                if (view != null) {
                                    try {
                                        android.view.ViewParent parent = view.getParent();
                                        if (parent instanceof android.view.ViewGroup) {
                                            ((android.view.ViewGroup) parent).removeView(view);
                                        }
                                        view.destroy();
                                    } catch (Throwable t) {
                                        Log.w(TAG, "Error cleaning up dead WebView instance", t);
                                    }
                                }

                                // 2. Recreate Activity so Capacitor rebuilds a fresh Bridge and WebView from splash
                                Log.i(TAG, "Recreating MainActivity to restore WebView state after renderer termination");
                                recreate();
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed to recreate activity after renderer termination", t);
                                try {
                                    // Fallback: try restarting the launcher intent
                                    Intent restartIntent = getIntent();
                                    finish();
                                    startActivity(restartIntent);
                                } catch (Throwable fallbackErr) {
                                    Log.e(TAG, "Fallback activity restart also failed", fallbackErr);
                                }
                            } finally {
                                // Reset the guard after a safe delay
                                new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(() -> {
                                    isHandlingRendererCrash.set(false);
                                }, 3000);
                            }
                        });
                    }

                    // CRITICAL: Returning true tells the Android framework that the crash was handled.
                    // This is what suppresses "Noor Connect keeps stopping" and process kill.
                    return true;
                }
            });
        } catch (Throwable t) {
            Log.w(TAG, "Could not install render process crash handler", t);
        }
    }

    /**
     * Step 1: Request SCHEDULE_EXACT_ALARM permission on Android 12+ (API 31+).
     * If NOT granted, immediately redirect the user to system "Alarms & reminders" settings screen.
     */
    private void requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!canScheduleExactAlarms()) {
                android.content.SharedPreferences prefs = getSharedPreferences(PREFS_ONBOARDING, MODE_PRIVATE);
                boolean alreadyRedirected = prefs.getBoolean(KEY_EXACT_ALARM_REDIRECTED, false);
                if (!alreadyRedirected) {
                    prefs.edit().putBoolean(KEY_EXACT_ALARM_REDIRECTED, true).apply();
                    try {
                        Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to launch ACTION_REQUEST_SCHEDULE_EXACT_ALARM intent", e);
                    }
                }
            }
        }
    }

    /**
     * Step 2: Once the user returns from settings (or exact alarm is granted),
     * ask for the "Background execution" / battery optimization permission via standard dialog.
     */
    private void requestBatteryOptimizationWhitelist() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.content.SharedPreferences prefs = getSharedPreferences(PREFS_ONBOARDING, MODE_PRIVATE);
            boolean alreadyPrompted = prefs.getBoolean(KEY_BATTERY_PROMPTED, false);
            if (!alreadyPrompted) {
                PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName())) {
                    prefs.edit().putBoolean(KEY_BATTERY_PROMPTED, true).apply();
                    try {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    } catch (Exception e) {
                        Log.w(TAG, "Failed to launch ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS intent", e);
                    }
                }
            }
        }
    }

    private boolean canScheduleExactAlarms() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            return am != null && am.canScheduleExactAlarms();
        }
        return true;
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
    public void onResume() {
        super.onResume();
        // Start widget foreground service when exact alarms are allowed
        if (canScheduleExactAlarms()) {
            WidgetForegroundService.start(this);
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

    /**
     * Override hardware/gesture back press to dispatch custom nativeBackPressed event to WebView
     * and allow Capacitor's App.addListener('backButton') to coordinate root navigation / exit.
     */
    @Override
    public void onBackPressed() {
        Log.d(TAG, "onBackPressed intercepted: dispatching nativeBackPressed DOM event to WebView");
        WebView webView = (this.getBridge() != null) ? this.getBridge().getWebView() : null;
        if (webView != null) {
            webView.post(() -> {
                webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('nativeBackPressed'));", null);
            });
        }
        super.onBackPressed();
    }
}
