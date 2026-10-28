package com.noorconnect.ummah;

import android.app.AlarmManager;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
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

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONObject;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.noorconnect.ummah.widgets.WidgetBridge;
import com.noorconnect.ummah.widgets.WidgetForegroundService;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static final int EXACT_ALARM_PERMISSION_REQUEST = 9001;
    private static final int BATTERY_OPTIMIZATION_REQUEST = 9002;
    private static final String PREFS_ONBOARDING = "noor_permission_flow_prefs";
    private static final String KEY_EXACT_ALARM_REDIRECTED = "exact_alarm_redirected";
    private static final String KEY_BATTERY_PROMPTED = "battery_whitelist_prompted";

    // Standard Android Chrome User-Agent prevents GitHub CDN / Fastly rate-limiting and connection throttling
    private static final String CHROME_USER_AGENT =
            "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";

    // Guard so setDataDirectorySuffix is called at most once per process lifetime
    private static boolean sDataDirectorySuffixSet = false;

    // Guard against multiple simultaneous renderer crash recovery attempts
    private final java.util.concurrent.atomic.AtomicBoolean isHandlingRendererCrash =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    // State for in-app native APK updater
    private volatile boolean isDownloadingApk = false;
    private volatile boolean isDownloadCancelled = false;
    private final List<HttpURLConnection> activeConnections = Collections.synchronizedList(new ArrayList<>());
    private ExecutorService downloadExecutor = null;
    private long activeDownloadManagerId = -1;
    private BroadcastReceiver downloadManagerReceiver = null;
    private File pendingApkFile = null;
    private File lastDownloadedApkFile = null;

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

        // Apply persisted native theme background color immediately to eliminate cold-start flash
        try {
            String bgHex = getSharedPreferences("noor_native_theme", MODE_PRIVATE).getString("bg_hex", "#070709");
            final int color = android.graphics.Color.parseColor(bgHex);
            getWindow().getDecorView().setBackgroundColor(color);
            getWindow().setStatusBarColor(color);
            getWindow().setNavigationBarColor(color);
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().setBackgroundColor(color);
            }
        } catch (Exception ignored) {
            // Ignore invalid color strings safely on cold start
        }

        // Create default notification channel for Capacitor LocalNotifications
        createDefaultNotificationChannel();

        // First-launch permission sequence (Step A: background dialog -> Step B: exact alarm settings)
        // is now explicitly coordinated by runFirstLaunchPermissionOnboarding() in the UI layer.

        // Enable Motion Event Splitting and allow immediate audio playback on the WebView
        WebView webView = (this.getBridge() != null) ? this.getBridge().getWebView() : null;
        if (webView != null) {
            try {
                String bgHex = getSharedPreferences("noor_native_theme", MODE_PRIVATE).getString("bg_hex", "#070709");
                final int color = android.graphics.Color.parseColor(bgHex);
                webView.setBackgroundColor(color);
            } catch (Exception ignored) {
                // Ignore invalid color strings safely
            }
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
                    public void setNativeThemeBg(String hexColor) {
                        try {
                            final int color = android.graphics.Color.parseColor(hexColor);
                            getSharedPreferences("noor_native_theme", MODE_PRIVATE)
                                .edit()
                                .putString("bg_hex", hexColor)
                                .apply();
                            runOnUiThread(() -> {
                                getWindow().getDecorView().setBackgroundColor(color);
                                getWindow().setStatusBarColor(color);
                                getWindow().setNavigationBarColor(color);
                                if (getBridge() != null && getBridge().getWebView() != null) {
                                    getBridge().getWebView().setBackgroundColor(color);
                                }
                            });
                        } catch (Exception ignored) {
                            // Ignore invalid color strings safely
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void closeApp() {
                        runOnUiThread(() -> {
                            Log.i(TAG, "AndroidBridge.closeApp() invoked from JS: finishing activity affinity");
                            finishAffinity();
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void downloadAndInstallApk(String apkUrl) {
                        MainActivity.this.downloadAndInstallApk(apkUrl);
                    }

                    @android.webkit.JavascriptInterface
                    public void cancelApkDownload() {
                        MainActivity.this.cancelApkDownload();
                    }

                    @android.webkit.JavascriptInterface
                    public void installDownloadedApk() {
                        MainActivity.this.installDownloadedApk();
                    }

                    @android.webkit.JavascriptInterface
                    public void openExternalBrowser(String url) {
                        MainActivity.this.openExternalBrowser(url);
                    }

                    @android.webkit.JavascriptInterface
                    public void printTimetablePdf(String jobName) {
                        runOnUiThread(() -> {
                            try {
                                WebView wv = (getBridge() != null) ? getBridge().getWebView() : null;
                                if (wv == null) {
                                    Log.w(TAG, "printTimetablePdf: WebView is null");
                                    return;
                                }
                                android.print.PrintManager printManager = (android.print.PrintManager) getSystemService(Context.PRINT_SERVICE);
                                if (printManager == null) {
                                    Log.w(TAG, "printTimetablePdf: PrintManager not available on this device");
                                    return;
                                }
                                String printJobName = (jobName != null && !jobName.trim().isEmpty())
                                        ? jobName.trim()
                                        : "Noor-Connect-Timetable";
                                android.print.PrintDocumentAdapter adapter = wv.createPrintDocumentAdapter(printJobName);
                                android.print.PrintAttributes attrs = new android.print.PrintAttributes.Builder()
                                        .setMediaSize(android.print.PrintAttributes.MediaSize.ISO_A4)
                                        .setColorMode(android.print.PrintAttributes.COLOR_MODE_COLOR)
                                        .build();
                                printManager.print(printJobName, adapter, attrs);
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed to launch native print manager", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void shareTimetablePng(String base64DataUrl, String fileName) {
                        runOnUiThread(() -> {
                            try {
                                if (base64DataUrl == null || base64DataUrl.isEmpty()) {
                                    Log.w(TAG, "shareTimetablePng: base64DataUrl is empty");
                                    return;
                                }
                                String pureBase64 = base64DataUrl;
                                if (pureBase64.contains(",")) {
                                    pureBase64 = pureBase64.substring(pureBase64.indexOf(",") + 1);
                                }
                                byte[] imageBytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT);
                                String targetName = (fileName != null && !fileName.trim().isEmpty())
                                        ? fileName.trim()
                                        : "noor-connect-timetable.png";
                                File imageFile = new File(getCacheDir(), targetName);
                                try (FileOutputStream fos = new FileOutputStream(imageFile)) {
                                    fos.write(imageBytes);
                                    fos.flush();
                                }

                                Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                                        MainActivity.this,
                                        getPackageName() + ".fileprovider",
                                        imageFile
                                );

                                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                                sendIntent.setType("image/png");
                                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                                Intent chooser = Intent.createChooser(sendIntent, "Share Prayer Timetable");
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed to share timetable image natively", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public boolean requestPinWidget(String widgetType) {
                        try {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(MainActivity.this);
                                if (appWidgetManager != null && appWidgetManager.isRequestPinAppWidgetSupported()) {
                                    String type = (widgetType != null) ? widgetType.toLowerCase().trim() : "next_prayer";
                                    Class<?> widgetClass;
                                    switch (type) {
                                        case "daily_ayah":
                                        case "ayah":
                                            widgetClass = com.noorconnect.ummah.widgets.dailyayah.DailyAyahWidget.class;
                                            break;
                                        case "daily_hadith":
                                        case "hadith":
                                            widgetClass = com.noorconnect.ummah.widgets.dailyhadith.DailyHadithWidget.class;
                                            break;
                                        case "quran_progress":
                                        case "quran":
                                            widgetClass = com.noorconnect.ummah.widgets.quranprogress.QuranProgressWidget.class;
                                            break;
                                        case "tasbeeh":
                                        case "dhikr":
                                            widgetClass = com.noorconnect.ummah.widgets.tasbeeh.TasbeehWidget.class;
                                            break;
                                        case "next_prayer":
                                        case "prayer":
                                        case "prayer_times":
                                        case "nextprayer":
                                        default:
                                            widgetClass = com.noorconnect.ummah.widgets.nextprayer.NextPrayerWidget.class;
                                            break;
                                    }
                                    ComponentName provider = new ComponentName(MainActivity.this, widgetClass);
                                    boolean requested = appWidgetManager.requestPinAppWidget(provider, null, null);
                                    Log.i(TAG, "requestPinWidget: type=" + widgetType + " -> " + widgetClass.getSimpleName() + " result=" + requested);
                                    return requested;
                                } else {
                                    Log.w(TAG, "requestPinAppWidget is not supported on this launcher");
                                }
                            }
                        } catch (Throwable t) {
                            Log.e(TAG, "requestPinWidget failed for type: " + widgetType, t);
                        }
                        return false;
                    }

                    @android.webkit.JavascriptInterface
                    public void syncWidgetCustomization(String jsonConfig) {
                        runOnUiThread(() -> {
                            try {
                                if (jsonConfig == null || jsonConfig.trim().isEmpty()) {
                                    return;
                                }
                                com.noorconnect.ummah.widgets.WidgetPrefs.INSTANCE.saveWidgetStyleConfig(MainActivity.this, jsonConfig);

                                AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(MainActivity.this);
                                if (appWidgetManager == null) return;

                                // Update Next Prayer Widgets
                                ComponentName nextPrayerCn = new ComponentName(MainActivity.this, com.noorconnect.ummah.widgets.nextprayer.NextPrayerWidget.class);
                                int[] nextPrayerIds = appWidgetManager.getAppWidgetIds(nextPrayerCn);
                                if (nextPrayerIds != null && nextPrayerIds.length > 0) {
                                    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                                    updateIntent.setComponent(nextPrayerCn);
                                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, nextPrayerIds);
                                    sendBroadcast(updateIntent);
                                    for (int id : nextPrayerIds) {
                                        com.noorconnect.ummah.widgets.nextprayer.NextPrayerWidget.Companion.updateWidget(MainActivity.this, appWidgetManager, id);
                                    }
                                }

                                // Update Daily Ayah Widgets
                                ComponentName dailyAyahCn = new ComponentName(MainActivity.this, com.noorconnect.ummah.widgets.dailyayah.DailyAyahWidget.class);
                                int[] dailyAyahIds = appWidgetManager.getAppWidgetIds(dailyAyahCn);
                                if (dailyAyahIds != null && dailyAyahIds.length > 0) {
                                    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                                    updateIntent.setComponent(dailyAyahCn);
                                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, dailyAyahIds);
                                    sendBroadcast(updateIntent);
                                    for (int id : dailyAyahIds) {
                                        com.noorconnect.ummah.widgets.dailyayah.DailyAyahWidget.Companion.updateWidget(MainActivity.this, appWidgetManager, id);
                                    }
                                }

                                // Update Daily Hadith Widgets
                                ComponentName dailyHadithCn = new ComponentName(MainActivity.this, com.noorconnect.ummah.widgets.dailyhadith.DailyHadithWidget.class);
                                int[] dailyHadithIds = appWidgetManager.getAppWidgetIds(dailyHadithCn);
                                if (dailyHadithIds != null && dailyHadithIds.length > 0) {
                                    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                                    updateIntent.setComponent(dailyHadithCn);
                                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, dailyHadithIds);
                                    sendBroadcast(updateIntent);
                                    for (int id : dailyHadithIds) {
                                        com.noorconnect.ummah.widgets.dailyhadith.DailyHadithWidget.Companion.updateWidget(MainActivity.this, appWidgetManager, id);
                                    }
                                }

                                // Update Quran Progress Widgets
                                ComponentName quranProgressCn = new ComponentName(MainActivity.this, com.noorconnect.ummah.widgets.quranprogress.QuranProgressWidget.class);
                                int[] quranProgressIds = appWidgetManager.getAppWidgetIds(quranProgressCn);
                                if (quranProgressIds != null && quranProgressIds.length > 0) {
                                    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                                    updateIntent.setComponent(quranProgressCn);
                                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, quranProgressIds);
                                    sendBroadcast(updateIntent);
                                    for (int id : quranProgressIds) {
                                        com.noorconnect.ummah.widgets.quranprogress.QuranProgressWidget.Companion.updateWidget(MainActivity.this, appWidgetManager, id);
                                    }
                                }

                                // Update Tasbeeh Widgets
                                ComponentName tasbeehCn = new ComponentName(MainActivity.this, com.noorconnect.ummah.widgets.tasbeeh.TasbeehWidget.class);
                                int[] tasbeehIds = appWidgetManager.getAppWidgetIds(tasbeehCn);
                                if (tasbeehIds != null && tasbeehIds.length > 0) {
                                    Intent updateIntent = new Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                                    updateIntent.setComponent(tasbeehCn);
                                    updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, tasbeehIds);
                                    sendBroadcast(updateIntent);
                                    for (int id : tasbeehIds) {
                                        com.noorconnect.ummah.widgets.tasbeeh.TasbeehWidget.Companion.updateWidget(MainActivity.this, appWidgetManager, id);
                                    }
                                }

                                com.noorconnect.ummah.widgets.WidgetRefreshWorker.Companion.enqueueImmediate(MainActivity.this);
                                Log.i(TAG, "syncWidgetCustomization: synced all widgets successfully");
                            } catch (Throwable t) {
                                Log.e(TAG, "Error syncing widget customization", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public boolean hasDndPolicyAccess() {
                        try {
                            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                            if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                return nm.isNotificationPolicyAccessGranted();
                            }
                        } catch (Throwable t) {
                            Log.w(TAG, "Error checking DND policy access", t);
                        }
                        return true;
                    }

                    @android.webkit.JavascriptInterface
                    public void openDndPolicySettings() {
                        runOnUiThread(() -> {
                            try {
                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(intent);
                                }
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed to launch DND policy settings", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void configurePrayerAutoDnd(String jsonConfig) {
                        runOnUiThread(() -> {
                            try {
                                PrayerDndReceiver.configureAutoDnd(MainActivity.this, jsonConfig);
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed configuring Prayer Auto-DND", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void setAlarmStreamEnabled(boolean enabled) {
                        try {
                            getSharedPreferences("noor_smart_salah", MODE_PRIVATE)
                                    .edit()
                                    .putBoolean("alarm_stream_enabled", enabled)
                                    .apply();
                        } catch (Throwable t) {
                            Log.w(TAG, "Error saving alarm_stream_enabled", t);
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void setFullScreenAlertsEnabled(boolean enabled) {
                        try {
                            getSharedPreferences("noor_smart_salah", MODE_PRIVATE)
                                    .edit()
                                    .putBoolean("fullscreen_alerts_enabled", enabled)
                                    .apply();
                        } catch (Throwable t) {
                            Log.w(TAG, "Error saving fullscreen_alerts_enabled", t);
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void updateLivePrayerCountdown(String jsonPayload) {
                        runOnUiThread(() -> {
                            try {
                                LiveCountdownNotificationHelper.updateCountdown(MainActivity.this, jsonPayload);
                            } catch (Throwable t) {
                                Log.w(TAG, "Error updating live prayer countdown", t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void setLiveCountdownEnabled(boolean enabled) {
                        runOnUiThread(() -> {
                            try {
                                getSharedPreferences("noor_smart_salah", MODE_PRIVATE)
                                        .edit()
                                        .putBoolean("live_countdown_enabled", enabled)
                                        .apply();
                                if (!enabled) {
                                    LiveCountdownNotificationHelper.cancel(MainActivity.this);
                                }
                            } catch (Throwable t) {
                                Log.w(TAG, "Error setting live countdown enabled", t);
                            }
                        });
                    }
                }, "AndroidBridge");
            } catch (Throwable t) {
                Log.w(TAG, "Failed to register AndroidBridge JavascriptInterface", t);
            }

            try {
                webView.getSettings().setGeolocationEnabled(true);
                webView.getSettings().setGeolocationDatabasePath(getFilesDir().getPath());
            } catch (Throwable t) {
                Log.w(TAG, "Failed to enable WebView geolocation settings", t);
            }

            try {
                final android.webkit.WebChromeClient existingChromeClient = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                        ? webView.getWebChromeClient()
                        : null;
                webView.setWebChromeClient(new android.webkit.WebChromeClient() {
                    @Override
                    public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                        try {
                            boolean hasFine = ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                            boolean hasCoarse = ContextCompat.checkSelfPermission(MainActivity.this, android.Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                            if (hasFine || hasCoarse) {
                                callback.invoke(origin, true, false);
                            } else {
                                ActivityCompat.requestPermissions(MainActivity.this, new String[]{
                                        android.Manifest.permission.ACCESS_FINE_LOCATION,
                                        android.Manifest.permission.ACCESS_COARSE_LOCATION
                                }, 9003);
                                callback.invoke(origin, true, false);
                            }
                        } catch (Throwable t) {
                            Log.w(TAG, "Error handling geolocation permission prompt safely", t);
                            callback.invoke(origin, false, false);
                        }
                    }

                    @Override
                    public boolean onShowFileChooser(WebView webView, android.webkit.ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                        if (existingChromeClient != null) {
                            return existingChromeClient.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                        }
                        return super.onShowFileChooser(webView, filePathCallback, fileChooserParams);
                    }

                    @Override
                    public boolean onConsoleMessage(android.webkit.ConsoleMessage consoleMessage) {
                        if (existingChromeClient != null) {
                            return existingChromeClient.onConsoleMessage(consoleMessage);
                        }
                        return super.onConsoleMessage(consoleMessage);
                    }

                    @Override
                    public void onProgressChanged(WebView view, int newProgress) {
                        if (existingChromeClient != null) {
                            existingChromeClient.onProgressChanged(view, newProgress);
                        } else {
                            super.onProgressChanged(view, newProgress);
                        }
                    }
                });
            } catch (Throwable t) {
                Log.w(TAG, "Failed to set custom WebChromeClient for geolocation", t);
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

        // Auto-resume APK installation if returning from "Install unknown apps" settings
        if (pendingApkFile != null && pendingApkFile.exists()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                File toInstall = pendingApkFile;
                pendingApkFile = null;
                launchApkInstallerIntent(toInstall);
            }
        }
    }

    /**
     * Abort any in-progress APK download immediately, close all active sockets,
     * terminate the parallel thread pool, and cancel system DownloadManager if active.
     */
    public void cancelApkDownload() {
        Log.i(TAG, "cancelApkDownload: aborting active download and closing sockets");
        isDownloadCancelled = true;
        isDownloadingApk = false;

        // 1. Immediately disconnect all active HttpURLConnection sockets
        synchronized (activeConnections) {
            for (HttpURLConnection conn : activeConnections) {
                try {
                    conn.disconnect();
                } catch (Throwable ignored) {
                    // Handled connection disconnect
                }
            }
            activeConnections.clear();
        }

        // 2. Shut down parallel worker threads immediately
        if (downloadExecutor != null) {
            try {
                downloadExecutor.shutdownNow();
            } catch (Throwable ignored) {
                // Handled executor shutdown
            }
            downloadExecutor = null;
        }

        // 3. Cancel DownloadManager task if active
        if (activeDownloadManagerId != -1) {
            try {
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.remove(activeDownloadManagerId);
                }
            } catch (Throwable ignored) {
                // Handled DownloadManager cancel
            }
            activeDownloadManagerId = -1;
        }

        // 4. Unregister DownloadManager receiver if active
        if (downloadManagerReceiver != null) {
            try {
                unregisterReceiver(downloadManagerReceiver);
            } catch (Throwable ignored) {
                // Handled receiver unregister
            }
            downloadManagerReceiver = null;
        }

        // 5. Notify frontend of cancelled state
        dispatchDownloadProgress(0, 0, 0, 0.0, "cancelled", "Download cancelled");
    }

    /**
     * Download an APK using 4-connection parallel range downloading across a 4-thread pool.
     * Follows HTTP 302 redirects to signed CDN URLs, uses large 256KB buffers, and
     * calculates live transfer speed. Falls back to 256KB single stream or system DownloadManager.
     */
    public void downloadAndInstallApk(String apkUrl) {
        if (apkUrl == null || apkUrl.trim().isEmpty()) {
            dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Invalid download URL");
            return;
        }

        if (isDownloadingApk) {
            Log.w(TAG, "downloadAndInstallApk called while download is already in progress");
            return;
        }

        isDownloadingApk = true;
        isDownloadCancelled = false;

        new Thread(() -> {
            try {
                File downloadDir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS);
                if (downloadDir == null) {
                    downloadDir = getCacheDir();
                }
                if (!downloadDir.exists()) {
                    downloadDir.mkdirs();
                }

                File apkFile = new File(downloadDir, "noor-connect-update.apk");
                if (apkFile.exists()) {
                    apkFile.delete();
                }

                Log.i(TAG, "Starting native APK download from: " + apkUrl);
                dispatchDownloadProgress(0, 0, 0, 0.0, "downloading", null);

                // Step A — Resolve Final Redirect URL & Content-Length
                String currentUrl = apkUrl;
                int redirects = 0;
                String finalUrl = currentUrl;
                long contentLength = -1;

                while (redirects < 6 && !isDownloadCancelled) {
                    URL url = new URL(currentUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", CHROME_USER_AGENT);
                    conn.setRequestProperty("Accept", "*/*");
                    conn.setRequestProperty("Accept-Encoding", "identity");
                    activeConnections.add(conn);

                    int responseCode = conn.getResponseCode();
                    if (responseCode == HttpURLConnection.HTTP_MOVED_PERM
                            || responseCode == HttpURLConnection.HTTP_MOVED_TEMP
                            || responseCode == HttpURLConnection.HTTP_SEE_OTHER
                            || responseCode == 307
                            || responseCode == 308) {
                        String newUrl = conn.getHeaderField("Location");
                        activeConnections.remove(conn);
                        conn.disconnect();
                        if (newUrl != null && !newUrl.isEmpty()) {
                            currentUrl = newUrl;
                            redirects++;
                            continue;
                        }
                    }

                    if (responseCode >= 200 && responseCode < 300) {
                        finalUrl = currentUrl;
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                            contentLength = conn.getContentLengthLong();
                        } else {
                            contentLength = conn.getContentLength();
                        }
                    }
                    activeConnections.remove(conn);
                    conn.disconnect();
                    break;
                }

                if (isDownloadCancelled) {
                    return;
                }

                // Step B — 4-Thread Parallel Chunk Download (with 256KB buffers)
                boolean parallelSuccess = false;
                if (contentLength >= 2 * 1024 * 1024) {
                    try {
                        parallelSuccess = downloadParallelChunks(finalUrl, apkFile, contentLength);
                    } catch (Throwable t) {
                        Log.w(TAG, "Parallel chunks failed: " + t.getMessage(), t);
                        parallelSuccess = false;
                    }
                }

                if (isDownloadCancelled) {
                    return;
                }

                // Fallback to high-buffer single stream if parallel was not supported or failed
                if (!parallelSuccess) {
                    Log.w(TAG, "Falling back to 256KB single stream download...");
                    runSingleStreamDownload(finalUrl, apkFile, contentLength);
                    return;
                }

                // Step C — Instant Auto-Install at 100%
                if (!isDownloadCancelled && apkFile.exists() && apkFile.length() >= 1_000_000) {
                    double finalMB = (double) apkFile.length() / (1024.0 * 1024.0);
                    Log.i(TAG, "Native APK parallel download complete: " + apkFile.getAbsolutePath() + " (" + finalMB + " MB)");
                    lastDownloadedApkFile = apkFile;
                    dispatchDownloadProgress(100, finalMB, finalMB, 0.0, "installing", null);
                    launchApkInstallerIntent(apkFile);
                } else if (!isDownloadCancelled) {
                    throw new java.io.IOException("Downloaded APK file is incomplete (" + (apkFile.exists() ? apkFile.length() : 0) + " bytes)");
                }

            } catch (Throwable t) {
                if (!isDownloadCancelled) {
                    Log.e(TAG, "Error downloading APK: " + t.getMessage(), t);
                    dispatchDownloadProgress(-1, 0, 0, 0.0, "error", t.getMessage() != null ? t.getMessage() : "Download failed");
                }
            } finally {
                isDownloadingApk = false;
            }
        }).start();
    }

    /**
     * Download file using 4 parallel HTTP Range connections writing into pre-allocated RandomAccessFile
     */
    private boolean downloadParallelChunks(String finalUrl, File apkFile, long contentLength) {
        RandomAccessFile raf = null;
        ExecutorService executor = null;
        try {
            raf = new RandomAccessFile(apkFile, "rw");
            raf.setLength(contentLength);
            raf.close();
            raf = null;

            final int NUM_THREADS = 4;
            long chunkSize = (contentLength + NUM_THREADS - 1) / NUM_THREADS;
            executor = Executors.newFixedThreadPool(NUM_THREADS);
            downloadExecutor = executor;

            AtomicLong totalDownloaded = new AtomicLong(0);
            AtomicBoolean hasError = new AtomicBoolean(false);
            CountDownLatch latch = new CountDownLatch(NUM_THREADS);

            for (int i = 0; i < NUM_THREADS; i++) {
                final int chunkIndex = i;
                final long chunkStart = i * chunkSize;
                final long chunkEnd = Math.min(chunkStart + chunkSize - 1, contentLength - 1);

                if (chunkStart > chunkEnd) {
                    latch.countDown();
                    continue;
                }

                executor.submit(() -> {
                    HttpURLConnection conn = null;
                    InputStream in = null;
                    RandomAccessFile chunkRaf = null;
                    try {
                        if (isDownloadCancelled || hasError.get()) {
                            return;
                        }

                        URL u = new URL(finalUrl);
                        conn = (HttpURLConnection) u.openConnection();
                        conn.setConnectTimeout(15000);
                        conn.setReadTimeout(30000);
                        conn.setRequestProperty("User-Agent", CHROME_USER_AGENT);
                        conn.setRequestProperty("Accept", "*/*");
                        conn.setRequestProperty("Accept-Encoding", "identity");
                        conn.setRequestProperty("Range", "bytes=" + chunkStart + "-" + chunkEnd);
                        activeConnections.add(conn);

                        conn.connect();
                        int code = conn.getResponseCode();
                        if (code != 206) {
                            throw new java.io.IOException("Chunk " + chunkIndex + " server did not honor Range: HTTP " + code);
                        }

                        in = new BufferedInputStream(conn.getInputStream(), 262144);
                        chunkRaf = new RandomAccessFile(apkFile, "rw");
                        chunkRaf.seek(chunkStart);

                        byte[] buffer = new byte[262144]; // 256 KB buffer
                        long chunkBytesRead = 0;
                        long expectedBytes = chunkEnd - chunkStart + 1;
                        int read;

                        while (!isDownloadCancelled && !hasError.get() && (read = in.read(buffer)) != -1) {
                            chunkRaf.write(buffer, 0, read);
                            chunkBytesRead += read;
                            totalDownloaded.addAndGet(read);
                        }

                        if (!isDownloadCancelled && !hasError.get() && chunkBytesRead != expectedBytes) {
                            throw new java.io.IOException("Chunk " + chunkIndex + " read mismatch: " + chunkBytesRead + " vs " + expectedBytes);
                        }
                    } catch (Throwable t) {
                        if (!isDownloadCancelled) {
                            Log.w(TAG, "Chunk " + chunkIndex + " failed: " + t.getMessage());
                            hasError.set(true);
                        }
                    } finally {
                        if (chunkRaf != null) {
                            try { chunkRaf.close(); } catch (Throwable ignored) { /* Handled RAF close */ }
                        }
                        if (in != null) {
                            try { in.close(); } catch (Throwable ignored) { /* Handled stream close */ }
                        }
                        if (conn != null) {
                            activeConnections.remove(conn);
                            try { conn.disconnect(); } catch (Throwable ignored) { /* Handled connection close */ }
                        }
                        latch.countDown();
                    }
                });
            }

            long lastBytes = 0;
            long lastTime = System.currentTimeMillis();

            while (!latch.await(200, TimeUnit.MILLISECONDS)) {
                if (isDownloadCancelled || hasError.get()) {
                    break;
                }
                long now = System.currentTimeMillis();
                long currentBytes = totalDownloaded.get();
                long timeDelta = now - lastTime;
                double speedMBps = 0.0;
                if (timeDelta > 0) {
                    long bytesDelta = currentBytes - lastBytes;
                    speedMBps = ((double) bytesDelta / (1024.0 * 1024.0)) / ((double) timeDelta / 1000.0);
                }
                lastBytes = currentBytes;
                lastTime = now;

                int percent = (contentLength > 0) ? (int) ((currentBytes * 100) / contentLength) : -1;
                double downloadedMB = (double) currentBytes / (1024.0 * 1024.0);
                double totalMB = (contentLength > 0) ? (double) contentLength / (1024.0 * 1024.0) : 0;
                dispatchDownloadProgress(percent, downloadedMB, totalMB, speedMBps, "downloading", null);
            }

            if (isDownloadCancelled) {
                return false;
            }

            if (hasError.get()) {
                return false;
            }

            return apkFile.exists() && apkFile.length() == contentLength;
        } catch (Throwable t) {
            Log.w(TAG, "downloadParallelChunks error: " + t.getMessage(), t);
            return false;
        } finally {
            if (raf != null) {
                try { raf.close(); } catch (Throwable ignored) { /* Handled RAF close */ }
            }
            if (executor != null) {
                try { executor.shutdown(); } catch (Throwable ignored) { /* Handled executor shutdown */ }
                downloadExecutor = null;
            }
        }
    }

    /**
     * Fallback 256KB single stream download with Chrome User-Agent and real-time speed calculation
     */
    private void runSingleStreamDownload(String downloadUrl, File apkFile, long knownContentLength) {
        if (isDownloadCancelled) return;
        HttpURLConnection conn = null;
        InputStream in = null;
        FileOutputStream out = null;
        try {
            if (apkFile.exists()) {
                apkFile.delete();
            }
            URL u = new URL(downloadUrl);
            conn = (HttpURLConnection) u.openConnection();
            conn.setInstanceFollowRedirects(true);
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestProperty("User-Agent", CHROME_USER_AGENT);
            conn.setRequestProperty("Accept", "*/*");
            conn.setRequestProperty("Accept-Encoding", "identity");
            activeConnections.add(conn);
            conn.connect();

            int code = conn.getResponseCode();
            if (code < 200 || code >= 300) {
                throw new java.io.IOException("Single stream returned HTTP " + code);
            }

            long totalBytes = knownContentLength;
            if (totalBytes <= 0) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    totalBytes = conn.getContentLengthLong();
                } else {
                    totalBytes = conn.getContentLength();
                }
            }

            in = new BufferedInputStream(conn.getInputStream(), 262144);
            out = new FileOutputStream(apkFile);
            byte[] buffer = new byte[262144]; // 256 KB buffer
            long downloaded = 0;
            long lastDispatch = System.currentTimeMillis();
            long lastBytes = 0;
            int read;

            while (!isDownloadCancelled && (read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                downloaded += read;

                long now = System.currentTimeMillis();
                if (now - lastDispatch > 200) {
                    long timeDelta = now - lastDispatch;
                    long bytesDelta = downloaded - lastBytes;
                    double speedMBps = (timeDelta > 0) ? ((double) bytesDelta / (1024.0 * 1024.0)) / ((double) timeDelta / 1000.0) : 0.0;
                    lastDispatch = now;
                    lastBytes = downloaded;

                    int percent = (totalBytes > 0) ? (int) ((downloaded * 100) / totalBytes) : -1;
                    double downloadedMB = (double) downloaded / (1024.0 * 1024.0);
                    double totalMB = (totalBytes > 0) ? (double) totalBytes / (1024.0 * 1024.0) : 0;
                    dispatchDownloadProgress(percent, downloadedMB, totalMB, speedMBps, "downloading", null);
                }
            }

            out.flush();
            out.close();
            out = null;
            in.close();
            in = null;
            activeConnections.remove(conn);
            conn.disconnect();
            conn = null;

            if (isDownloadCancelled) {
                return;
            }

            if (!apkFile.exists() || apkFile.length() < 1_000_000) {
                throw new java.io.IOException("Single stream downloaded file is incomplete (" + (apkFile.exists() ? apkFile.length() : 0) + " bytes)");
            }

            double finalMB = (double) apkFile.length() / (1024.0 * 1024.0);
            Log.i(TAG, "Native APK single stream download complete: " + apkFile.getAbsolutePath() + " (" + finalMB + " MB)");
            lastDownloadedApkFile = apkFile;
            dispatchDownloadProgress(100, finalMB, finalMB, 0.0, "installing", null);
            launchApkInstallerIntent(apkFile);

        } catch (Throwable t) {
            if (!isDownloadCancelled) {
                Log.e(TAG, "Single stream download failed, attempting DownloadManager fallback: " + t.getMessage(), t);
                runDownloadManagerFallback(downloadUrl);
            }
        } finally {
            if (out != null) {
                try { out.close(); } catch (Throwable ignored) { /* Handled stream close */ }
            }
            if (in != null) {
                try { in.close(); } catch (Throwable ignored) { /* Handled stream close */ }
            }
            if (conn != null) {
                activeConnections.remove(conn);
                try { conn.disconnect(); } catch (Throwable ignored) { /* Handled connection close */ }
            }
        }
    }

    /**
     * Fallback to native Android system DownloadManager
     */
    private void runDownloadManagerFallback(String downloadUrl) {
        if (isDownloadCancelled) return;
        try {
            DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
            if (dm == null) {
                dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Download failed and DownloadManager unavailable");
                return;
            }

            Uri uri = Uri.parse(downloadUrl);
            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle("Noor Connect Update");
            request.setDescription("Downloading latest update...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");
            request.addRequestHeader("User-Agent", CHROME_USER_AGENT);
            request.setDestinationInExternalFilesDir(this, android.os.Environment.DIRECTORY_DOWNLOADS, "noor-connect-update.apk");

            // Clean up previous receiver if any
            if (downloadManagerReceiver != null) {
                try { unregisterReceiver(downloadManagerReceiver); } catch (Throwable ignored) { /* Handled cleanup */ }
            }

            long downloadId = dm.enqueue(request);
            activeDownloadManagerId = downloadId;

            downloadManagerReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                    if (id == activeDownloadManagerId) {
                        try {
                            context.unregisterReceiver(this);
                        } catch (Throwable ignored) {
                            // Handled unregister
                        }
                        downloadManagerReceiver = null;
                        activeDownloadManagerId = -1;
                        isDownloadingApk = false;

                        File downloadDir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS);
                        File apkFile = new File(downloadDir, "noor-connect-update.apk");
                        if (apkFile.exists() && apkFile.length() > 1_000_000) {
                            double finalMB = (double) apkFile.length() / (1024.0 * 1024.0);
                            lastDownloadedApkFile = apkFile;
                            dispatchDownloadProgress(100, finalMB, finalMB, 0.0, "installing", null);
                            launchApkInstallerIntent(apkFile);
                        } else {
                            dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Download via system manager failed or incomplete");
                        }
                    }
                }
            };

            ContextCompat.registerReceiver(
                    this,
                    downloadManagerReceiver,
                    new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE),
                    ContextCompat.RECEIVER_EXPORTED
            );

            dispatchDownloadProgress(50, 0, 0, 0.0, "downloading", null);
        } catch (Throwable t) {
            Log.e(TAG, "DownloadManager fallback failed", t);
            dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Download failed: " + t.getMessage());
        }
    }

    /**
     * Manually trigger installation of previously downloaded update APK
     */
    public void installDownloadedApk() {
        if (lastDownloadedApkFile != null && lastDownloadedApkFile.exists() && lastDownloadedApkFile.length() > 1_000_000) {
            launchApkInstallerIntent(lastDownloadedApkFile);
            return;
        }
        File downloadDir = getExternalFilesDir(android.os.Environment.DIRECTORY_DOWNLOADS);
        File fallback = (downloadDir != null) ? new File(downloadDir, "noor-connect-update.apk") : new File(getCacheDir(), "noor-connect-update.apk");
        if (fallback.exists() && fallback.length() > 1_000_000) {
            lastDownloadedApkFile = fallback;
            launchApkInstallerIntent(fallback);
        } else {
            dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "No downloaded APK found to install");
        }
    }

    /**
     * Launch the Android OS PackageInstaller Intent for an APK file
     */
    public void launchApkInstallerIntent(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            Log.w(TAG, "launchApkInstallerIntent: APK file does not exist");
            dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Downloaded APK file not found");
            return;
        }

        runOnUiThread(() -> {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
                    pendingApkFile = apkFile;
                    Log.i(TAG, "REQUEST_INSTALL_PACKAGES not granted yet, opening unknown app sources settings");
                    Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(settingsIntent);
                    return;
                }

                Uri apkUri = androidx.core.content.FileProvider.getUriForFile(
                        this,
                        getPackageName() + ".fileprovider",
                        apkFile
                );
                Log.i(TAG, "Launching PackageInstaller for APK: " + apkFile.getAbsolutePath() + " with URI: " + apkUri);
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(installIntent);
                double sizeMB = (double) apkFile.length() / (1024.0 * 1024.0);
                dispatchDownloadProgress(100, sizeMB, sizeMB, 0.0, "completed", null);
            } catch (Throwable t) {
                Log.e(TAG, "Failed to launch PackageInstaller intent", t);
                dispatchDownloadProgress(-1, 0, 0, 0.0, "error", "Install error: " + t.getMessage());
            }
        });
    }

    /**
     * Fallback to open URL in standard external browser (NOT Chrome Custom Tab).
     * Aborts any active background download first to prevent bandwidth contention!
     */
    public void openExternalBrowser(String url) {
        if (url == null || url.trim().isEmpty()) return;
        // Instantly cancel any background download to guarantee 100% network bandwidth to browser
        if (isDownloadingApk) {
            cancelApkDownload();
        }
        runOnUiThread(() -> {
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(intent);
            } catch (Throwable t) {
                Log.e(TAG, "Failed to open external browser for: " + url, t);
            }
        });
    }

    /**
     * Dispatch live download and install progress events to the JS WebView
     */
    private void dispatchDownloadProgress(int percent, double downloadedMB, double totalMB, String status, String errorMsg) {
        dispatchDownloadProgress(percent, downloadedMB, totalMB, 0.0, status, errorMsg);
    }

    private void dispatchDownloadProgress(int percent, double downloadedMB, double totalMB, double speedMBps, String status, String errorMsg) {
        runOnUiThread(() -> {
            try {
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
                if (webView != null) {
                    JSONObject detail = new JSONObject();
                    detail.put("percent", percent);
                    detail.put("downloadedMB", Math.round(downloadedMB * 10.0) / 10.0);
                    detail.put("totalMB", Math.round(totalMB * 10.0) / 10.0);
                    detail.put("speedMBps", Math.round(speedMBps * 10.0) / 10.0);
                    detail.put("status", status);
                    if (errorMsg != null) {
                        detail.put("message", errorMsg);
                    }
                    String script = "window.dispatchEvent(new CustomEvent('apkDownloadProgress', { detail: " + detail.toString() + " }));";
                    webView.evaluateJavascript(script, null);
                }
            } catch (Throwable t) {
                Log.w(TAG, "Failed to dispatch apkDownloadProgress event", t);
            }
        });
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

    @Override
    public void onDestroy() {
        if (isDownloadingApk) {
            cancelApkDownload();
        }
        if (downloadManagerReceiver != null) {
            try {
                unregisterReceiver(downloadManagerReceiver);
            } catch (Throwable ignored) {
                // Handled receiver unregister on destroy
            }
            downloadManagerReceiver = null;
        }
        super.onDestroy();
    }
}
