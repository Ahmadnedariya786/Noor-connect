package com.noorconnect.ummah;

import android.app.AlarmManager;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import androidx.core.app.NotificationCompat;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.BufferedInputStream;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;
import org.json.JSONObject;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
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
            "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36";

    // Guard so setDataDirectorySuffix is called at most once per process lifetime
    private static boolean sDataDirectorySuffixSet = false;

    // Guard against multiple simultaneous renderer crash recovery attempts
    private final java.util.concurrent.atomic.AtomicBoolean isHandlingRendererCrash =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    // State for in-app native dual-engine OTA updater
    private volatile boolean isDownloadingApk = false;
    private volatile boolean isUserCancelled = false;
    private volatile String otaState = "idle"; // idle, connecting, downloading, verifying, installing, permission_required, cancelled, error
    private volatile String otaEngine = "stream"; // stream or system
    private volatile long otaDownloadedBytes = 0L;
    private volatile long otaTotalBytes = 0L;
    private volatile int otaPercent = 0;
    private volatile double otaSpeedMBps = 0.0;
    private volatile String otaError = "";
    private volatile File otaReadyApkFile = null;

    private Thread activeStreamThread = null;
    private volatile HttpURLConnection activeStreamConn = null;
    private volatile long activeDownloadManagerId = -1L;
    private Thread activeDmPollingThread = null;
    private BroadcastReceiver downloadManagerReceiver = null;

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
            String bgHex = getSharedPreferences("noor_native_theme", MODE_PRIVATE).getString("bg_hex", "#050914");
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

        // Ensure user-selected launcher icon alias matches persisted preference
        applyPersistedLauncherIcon();

        // First-launch permission sequence (Step A: background dialog -> Step B: exact alarm settings)
        // is now explicitly coordinated by runFirstLaunchPermissionOnboarding() in the UI layer.

        // Enable Motion Event Splitting and allow immediate audio playback on the WebView
        WebView webView = (this.getBridge() != null) ? this.getBridge().getWebView() : null;
        if (webView != null) {
            try {
                String bgHex = getSharedPreferences("noor_native_theme", MODE_PRIVATE).getString("bg_hex", "#050914");
                final int color = android.graphics.Color.parseColor(bgHex);
                webView.setBackgroundColor(color);
            } catch (Exception ignored) {
                // Ignore invalid color strings safely
            }
            try {
                Bridge bridge = getBridge();
                if (bridge != null) {
                    webView.setWebChromeClient(new BridgeWebChromeClient(bridge) {
                        @Override
                        public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                            if (consoleMessage != null) {
                                String msg = consoleMessage.message() + " ["
                                        + consoleMessage.sourceId() + ":"
                                        + consoleMessage.lineNumber() + "]";
                                if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                                    Log.e("WebViewConsole", msg);
                                } else if (consoleMessage.messageLevel() == ConsoleMessage.MessageLevel.WARNING) {
                                    Log.w("WebViewConsole", msg);
                                } else {
                                    Log.d("WebViewConsole", msg);
                                }
                            }
                            return super.onConsoleMessage(consoleMessage);
                        }
                    });
                }
            } catch (Throwable t) {
                Log.w(TAG, "Failed to set BridgeWebChromeClient with console logging", t);
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
                    public String getOtaStatusJson() {
                        return MainActivity.this.getOtaStatusJson();
                    }

                    @android.webkit.JavascriptInterface
                    public void startUpdateDownload(String apkUrl, long expectedBytes) {
                        MainActivity.this.startUpdateDownload(apkUrl, expectedBytes);
                    }

                    @android.webkit.JavascriptInterface
                    public void startUpdateDownload(String apkUrl) {
                        MainActivity.this.startUpdateDownload(apkUrl, 0L);
                    }

                    @android.webkit.JavascriptInterface
                    public void downloadAndInstallApk(String apkUrl) {
                        MainActivity.this.startUpdateDownload(apkUrl, 0L);
                    }

                    @android.webkit.JavascriptInterface
                    public void downloadAndInstallApk(String apkUrl, long expectedBytes) {
                        MainActivity.this.startUpdateDownload(apkUrl, expectedBytes);
                    }

                    @android.webkit.JavascriptInterface
                    public void cancelApkDownload() {
                        MainActivity.this.cancelApkDownload();
                    }

                    @android.webkit.JavascriptInterface
                    public void installReadyApk() {
                        MainActivity.this.installReadyApk();
                    }

                    @android.webkit.JavascriptInterface
                    public void installDownloadedApk() {
                        MainActivity.this.installReadyApk();
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
                    public void shareBase64Pdf(final String base64Pdf, final String fileName, final String shareTitle) {
                        runOnUiThread(() -> {
                            try {
                                if (base64Pdf == null || base64Pdf.isEmpty()) {
                                    Log.w(TAG, "shareBase64Pdf: base64Pdf is empty");
                                    return;
                                }
                                String pureBase64 = base64Pdf;
                                if (pureBase64.contains(",")) {
                                    pureBase64 = pureBase64.substring(pureBase64.indexOf(",") + 1);
                                }
                                byte[] pdfBytes = android.util.Base64.decode(pureBase64, android.util.Base64.DEFAULT);
                                String targetName = (fileName != null && !fileName.trim().isEmpty())
                                        ? fileName.trim()
                                        : "Noor_Connect_Zakat_Report.pdf";
                                if (!targetName.toLowerCase().endsWith(".pdf")) {
                                    targetName += ".pdf";
                                }
                                File pdfFile = new File(getCacheDir(), targetName);
                                try (FileOutputStream fos = new FileOutputStream(pdfFile)) {
                                    fos.write(pdfBytes);
                                    fos.flush();
                                }

                                Uri contentUri = androidx.core.content.FileProvider.getUriForFile(
                                        MainActivity.this,
                                        getPackageName() + ".fileprovider",
                                        pdfFile
                                );

                                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                                sendIntent.setType("application/pdf");
                                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                                String title = (shareTitle != null && !shareTitle.trim().isEmpty())
                                        ? shareTitle.trim()
                                        : "Share Zakat Report (PDF)";
                                Intent chooser = Intent.createChooser(sendIntent, title);
                                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(chooser);
                            } catch (Throwable t) {
                                Log.e(TAG, "Failed to share PDF document natively", t);
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

                    @android.webkit.JavascriptInterface
                    public void setScreenOrientation(final String mode) {
                        runOnUiThread(() -> {
                            try {
                                if ("landscape".equalsIgnoreCase(mode)) {
                                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
                                } else {
                                    setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                                }
                            } catch (Throwable t) {
                                Log.w(TAG, "Failed to set screen orientation: " + mode, t);
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public void openAppSettings() {
                        runOnUiThread(() -> {
                            try {
                                android.content.Intent intent = new android.content.Intent(
                                    android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                                    android.net.Uri.fromParts("package", getPackageName(), null)
                                );
                                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                            } catch (Throwable t) {
                                try {
                                    android.content.Intent fallback = new android.content.Intent(android.provider.Settings.ACTION_SETTINGS);
                                    fallback.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                                    startActivity(fallback);
                                } catch (Throwable ignored) {}
                            }
                        });
                    }

                    @android.webkit.JavascriptInterface
                    public boolean checkLocationPermission() {
                        try {
                            int fine = androidx.core.content.ContextCompat.checkSelfPermission(
                                MainActivity.this,
                                android.Manifest.permission.ACCESS_FINE_LOCATION
                            );
                            int coarse = androidx.core.content.ContextCompat.checkSelfPermission(
                                MainActivity.this,
                                android.Manifest.permission.ACCESS_COARSE_LOCATION
                            );
                            return fine == android.content.pm.PackageManager.PERMISSION_GRANTED ||
                                   coarse == android.content.pm.PackageManager.PERMISSION_GRANTED;
                        } catch (Throwable t) {
                            return false;
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void setLauncherIconEdition(final int editionIndex) {
                        try {
                            final int target = (editionIndex >= 0 && editionIndex <= 4) ? editionIndex : 0;
                            android.content.SharedPreferences prefs = getSharedPreferences("noor_connect_prefs", MODE_PRIVATE);
                            int current = prefs.getInt("selected_logo_edition", -1);
                            if (current == target) return;
                            prefs.edit().putInt("selected_logo_edition", target).apply();

                            android.content.pm.PackageManager pm = getPackageManager();
                            String pkg = getPackageName();
                            for (int i = 0; i <= 4; i++) {
                                android.content.ComponentName cn = new android.content.ComponentName(pkg, pkg + ".LauncherAlias" + i);
                                int newState = (i == target)
                                    ? android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                                    : android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                                pm.setComponentEnabledSetting(cn, newState, android.content.pm.PackageManager.DONT_KILL_APP);
                            }
                            Log.i(TAG, "Switched launcher icon to edition: " + target);
                        } catch (Throwable t) {
                            Log.w(TAG, "Failed to switch launcher icon edition", t);
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void setPrayerNotificationLang(final String lang) {
                        try {
                            PrayerHadithHelper.setHadithLanguage(MainActivity.this, lang);
                        } catch (Throwable t) {
                            Log.w(TAG, "Failed to update prayer notification Hadith language", t);
                        }
                    }

                    @android.webkit.JavascriptInterface
                    public void triggerTestPrayerNotification(final String prayerName, final String prayerTime12h) {
                        runOnUiThread(() -> {
                            try {
                                final String pName = (prayerName != null && !prayerName.trim().isEmpty()) ? prayerName : "Fajr";
                                final String pTime = (prayerTime12h != null && !prayerTime12h.trim().isEmpty()) ? prayerTime12h : "05:15 AM";
                                final String channelId = "noor_prayer_reminders";

                                NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
                                if (nm == null) return;

                                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                    NotificationChannel channel = nm.getNotificationChannel(channelId);
                                    if (channel == null) {
                                        channel = new NotificationChannel(
                                                channelId,
                                                "Prayer Reminders",
                                                NotificationManager.IMPORTANCE_HIGH
                                        );
                                        channel.setDescription("Authentic prayer time alerts and Adhan reminders");
                                        channel.enableLights(true);
                                        channel.enableVibration(true);
                                        channel.setShowBadge(true);
                                        nm.createNotificationChannel(channel);
                                    }
                                }

                                Intent openAppIntent = new Intent(MainActivity.this, MainActivity.class);
                                openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                                PendingIntent contentPi = PendingIntent.getActivity(
                                        MainActivity.this,
                                        7701,
                                        openAppIntent,
                                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                                );

                                String title = pName + " Prayer • " + pTime;
                                String hadith = PrayerHadithHelper.getPrayerHadith(MainActivity.this, pName);
                                String bigText = "🕌 Hayya 'alas-Salah — Time for " + pName + " (" + pTime + ")\n"
                                        + hadith;

                                NotificationCompat.Builder builder = new NotificationCompat.Builder(MainActivity.this, channelId)
                                        .setSmallIcon(R.drawable.ic_stat_noor_mosque)
                                        .setColor(0xFFD4AF37)
                                        .setContentTitle(title)
                                        .setContentText("It is now time for " + pName + " prayer (" + pTime + "). Tap to open.")
                                        .setSubText("Noor Connect")
                                        .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText))
                                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                                        .setDefaults(NotificationCompat.DEFAULT_ALL)
                                        .setAutoCancel(true)
                                        .setContentIntent(contentPi);

                                nm.notify(7701, builder.build());
                                Log.i(TAG, "Triggered test prayer notification for: " + pName);
                            } catch (Throwable t) {
                                Log.w(TAG, "Failed to trigger test prayer notification", t);
                            }
                        });
                    }
                }, "AndroidBridge");
            } catch (Throwable t) {
                Log.w(TAG, "Failed to register AndroidBridge JavascriptInterface", t);
            }

            try {
                // Explicitly disable WebView geolocation prompts to prevent native Chromium dialog crashes on Android 15.
                // Noor Connect utilizes privacy-first, secure HTTPS IP and city-level geocoding in JS.
                webView.getSettings().setGeolocationEnabled(false);
            } catch (Throwable t) {
                Log.w(TAG, "Failed to configure WebView geolocation settings", t);
            }

        }

        // Install renderer process crash handler via Capacitor's bridge listener
        installRenderProcessCrashHandler();

        // Install native GitHub Release E-Book stream proxy on BridgeWebViewClient
        installGhEbookStreamProxy();

        // No persistent foreground service needed.
        // Adhan alarms use setAlarmClock() which is Doze-immune.
        // Adhan playback uses a short-lived foreground service started
        // by AdhanAlarmReceiver only when it's time to play.
    }

    private void applyPersistedLauncherIcon() {
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("noor_connect_prefs", MODE_PRIVATE);
            int target = prefs.getInt("selected_logo_edition", -1);
            if (target < 0 || target > 4) return;

            android.content.pm.PackageManager pm = getPackageManager();
            String pkg = getPackageName();
            for (int i = 0; i <= 4; i++) {
                android.content.ComponentName cn = new android.content.ComponentName(pkg, pkg + ".LauncherAlias" + i);
                int desired = (i == target)
                    ? android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED
                    : android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED;
                if (pm.getComponentEnabledSetting(cn) != desired) {
                    pm.setComponentEnabledSetting(cn, desired, android.content.pm.PackageManager.DONT_KILL_APP);
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Failed to apply persisted launcher icon", t);
        }
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
     * Intercepts `/__gh_ebook__/` URLs inside the WebView to stream large PDF volumes
     * directly from GitHub Releases (`ebooks-library-v1`) with native HttpURLConnection,
     * following cross-domain redirects (github.com -> AWS S3) and injecting CORS headers
     * so JavaScript `fetch()` receives the exact Content-Length without CORS blocks.
     */
    private void installGhEbookStreamProxy() {
        try {
            Bridge bridge = getBridge();
            if (bridge == null) {
                Log.w(TAG, "Bridge is null; cannot install GitHub ebook stream proxy");
                return;
            }

            bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    if (request != null && request.getUrl() != null) {
                        String path = request.getUrl().getPath();
                        if (path != null && path.startsWith("/__gh_ebook__/")) {
                            WebResourceResponse resp = handleGhEbookRequest(request);
                            if (resp != null) {
                                return resp;
                            }
                        }
                    }
                    return super.shouldInterceptRequest(view, request);
                }
            });
            Log.i(TAG, "Installed custom BridgeWebViewClient with GitHub release ebook stream proxy");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to install GitHub release ebook stream proxy", t);
        }
    }

    private WebResourceResponse handleGhEbookRequest(WebResourceRequest request) {
        if (request == null || request.getUrl() == null) return null;
        String method = request.getMethod();
        if ("OPTIONS".equalsIgnoreCase(method)) {
            Map<String, String> corsHeaders = new HashMap<>();
            corsHeaders.put("Access-Control-Allow-Origin", "*");
            corsHeaders.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            corsHeaders.put("Access-Control-Allow-Headers", "*");
            corsHeaders.put("Access-Control-Max-Age", "86400");
            return new WebResourceResponse("text/plain", "UTF-8", 200, "OK", corsHeaders, new ByteArrayInputStream(new byte[0]));
        }

        String path = request.getUrl().getPath();
        if (path == null) return null;
        String fileName = path.substring(path.lastIndexOf('/') + 1);
        if (!fileName.matches("^AnwarulBayan-Volume[1-5]\\.pdf$|^[A-Za-z0-9._-]+\\.pdf$")) {
            Log.w(TAG, "handleGhEbookRequest: invalid fileName rejected: " + fileName);
            return null;
        }

        String targetUrl = "https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/" + fileName;
        Log.i(TAG, "handleGhEbookRequest: streaming " + fileName + " from " + targetUrl);

        HttpURLConnection conn = null;
        try {
            String currentUrl = targetUrl;
            int redirects = 0;
            final int maxRedirects = 5;

            while (redirects < maxRedirects) {
                URL u = new URL(currentUrl);
                conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(20000);
                conn.setReadTimeout(45000);
                conn.setInstanceFollowRedirects(false);
                conn.setRequestProperty("User-Agent", "NoorConnect-Android/2.3.0");

                if (request.getRequestHeaders() != null) {
                    for (Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                        if ("Range".equalsIgnoreCase(entry.getKey()) || "If-Range".equalsIgnoreCase(entry.getKey())) {
                            conn.setRequestProperty(entry.getKey(), entry.getValue());
                        }
                    }
                }

                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                    code == HttpURLConnection.HTTP_MOVED_TEMP ||
                    code == HttpURLConnection.HTTP_SEE_OTHER ||
                    code == 307 || code == 308) {
                    String loc = conn.getHeaderField("Location");
                    if (loc == null || loc.trim().isEmpty()) {
                        break;
                    }
                    URL base = new URL(currentUrl);
                    currentUrl = new URL(base, loc).toExternalForm();
                    conn.disconnect();
                    redirects++;
                    continue;
                }
                break;
            }

            if (conn == null) {
                return null;
            }

            int statusCode = conn.getResponseCode();
            String statusMsg = conn.getResponseMessage();
            if (statusMsg == null || statusMsg.trim().isEmpty()) {
                statusMsg = (statusCode >= 200 && statusCode < 300) ? "OK" : "Error";
            }

            Map<String, String> responseHeaders = new HashMap<>();
            responseHeaders.put("Access-Control-Allow-Origin", "*");
            responseHeaders.put("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
            responseHeaders.put("Access-Control-Allow-Headers", "*");
            responseHeaders.put("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
            responseHeaders.put("Content-Type", "application/pdf");

            long contentLength = conn.getContentLengthLong();
            if (contentLength <= 0) {
                String clHeader = conn.getHeaderField("Content-Length");
                if (clHeader != null && !clHeader.trim().isEmpty()) {
                    try {
                        contentLength = Long.parseLong(clHeader.trim());
                    } catch (Exception ignored) {}
                }
            }
            if (contentLength <= 0) {
                if (fileName.contains("Volume1")) contentLength = 165044224L;
                else if (fileName.contains("Volume2")) contentLength = 162214912L;
                else if (fileName.contains("Volume3")) contentLength = 146486272L;
                else if (fileName.contains("Volume4")) contentLength = 168296448L;
                else if (fileName.contains("Volume5")) contentLength = 155189248L;
            }
            if (contentLength > 0) {
                responseHeaders.put("Content-Length", String.valueOf(contentLength));
            }
            String contentRange = conn.getHeaderField("Content-Range");
            if (contentRange != null) {
                responseHeaders.put("Content-Range", contentRange);
            }
            String acceptRanges = conn.getHeaderField("Accept-Ranges");
            if (acceptRanges != null) {
                responseHeaders.put("Accept-Ranges", acceptRanges);
            }

            InputStream is = (statusCode >= 200 && statusCode < 400) ? conn.getInputStream() : conn.getErrorStream();
            return new WebResourceResponse("application/pdf", null, statusCode, statusMsg, responseHeaders, is);
        } catch (Exception e) {
            Log.e(TAG, "handleGhEbookRequest exception for " + fileName, e);
            if (conn != null) {
                try { conn.disconnect(); } catch (Throwable ignored) {}
            }
            return null;
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
        if (otaReadyApkFile != null && otaReadyApkFile.exists()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getPackageManager().canRequestPackageInstalls()) {
                File toInstall = otaReadyApkFile;
                launchPackageInstallerIntent(toInstall);
            }
        }
    }

    /**
     * Pollable volatile state JSON synchronously returned to JS bridge
     */
    public String getOtaStatusJson() {
        try {
            JSONObject json = new JSONObject();
            json.put("state", otaState);
            json.put("engine", otaEngine);
            json.put("downloadedBytes", otaDownloadedBytes);
            json.put("totalBytes", otaTotalBytes);
            json.put("percent", otaPercent);
            json.put("speedMBps", Math.round(otaSpeedMBps * 10.0) / 10.0);
            json.put("error", otaError != null ? otaError : "");
            return json.toString();
        } catch (Throwable t) {
            return "{\"state\":\"error\",\"engine\":\"none\",\"downloadedBytes\":0,\"totalBytes\":0,\"percent\":0,\"speedMBps\":0.0,\"error\":\"E_BRIDGE\"}";
        }
    }

    /**
     * Start Dual-Engine APK download (Engine A: Direct Stream, Engine B: DownloadManager failover)
     */
    public void startUpdateDownload(String apkUrl, long expectedBytes) {
        if ("connecting".equals(otaState) || "downloading".equals(otaState) || "verifying".equals(otaState)) {
            Log.w(TAG, "startUpdateDownload called while download is already in progress");
            return;
        }

        final String targetApkUrl = (apkUrl != null && !apkUrl.trim().isEmpty())
                ? apkUrl.trim()
                : "https://github.com/Ahmadnedariya786/Noor-connect/releases/download/nightly/noor-connect-nightly.apk";

        isDownloadingApk = true;
        isUserCancelled = false;
        otaState = "connecting";
        otaEngine = "stream";
        otaDownloadedBytes = 0L;
        otaPercent = 0;
        otaSpeedMBps = 0.0;
        otaError = "";
        otaReadyApkFile = null;
        // Honest total size: expectedBytes from caller if > 15MB, else 0
        otaTotalBytes = (expectedBytes > 15_000_000L) ? expectedBytes : 0L;
        dispatchDownloadProgress();

        File storageDir = getExternalFilesDir(null);
        if (storageDir == null) {
            storageDir = getCacheDir();
        }
        if (!storageDir.exists()) {
            storageDir.mkdirs();
        }
        final File targetApk = new File(storageDir, "noor-connect-update.apk");
        if (targetApk.exists()) {
            try { targetApk.delete(); } catch (Throwable ignored) {}
        }

        activeStreamThread = new Thread(() -> {
            runStreamEngine(targetApkUrl, expectedBytes, targetApk);
        }, "noor-ota-stream");
        activeStreamThread.start();
    }

    /**
     * Backward-compatible alias for downloadAndInstallApk
     */
    public void downloadAndInstallApk(String apkUrl) {
        startUpdateDownload(apkUrl, 0L);
    }

    /**
     * Engine A: Direct single-stream downloader with 6-second first-byte watchdog
     */
    private void runStreamEngine(String apkUrl, long expectedBytes, File targetApk) {
        long connectStartTime = System.currentTimeMillis();
        String currentUrl = apkUrl;
        HttpURLConnection conn = null;
        InputStream in = null;
        FileOutputStream out = null;
        int redirects = 0;
        boolean connected = false;

        try {
            // Follow up to 8 HTTP 301/302/303/307/308 redirects manually
            while (redirects < 8 && !isUserCancelled) {
                if (System.currentTimeMillis() - connectStartTime > 6000) {
                    Log.w(TAG, "Engine A: Redirect / connection negotiation exceeded 6s, failing over to Engine B");
                    triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_CONNECT_TIMEOUT");
                    return;
                }

                URL u = new URL(currentUrl);
                conn = (HttpURLConnection) u.openConnection();
                activeStreamConn = conn;
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(6000);
                conn.setReadTimeout(8000);
                // Send ONLY standard browser User-Agent and Accept headers; NO Range or Authorization
                conn.setRequestProperty("User-Agent", CHROME_USER_AGENT);
                conn.setRequestProperty("Accept", "*/*");

                int code = conn.getResponseCode();
                if (code == 301 || code == 302 || code == 303 || code == 307 || code == 308) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    activeStreamConn = null;
                    if (location != null && !location.isEmpty()) {
                        currentUrl = new URL(new URL(currentUrl), location).toString();
                        redirects++;
                        continue;
                    }
                }

                if (code >= 400) {
                    Log.w(TAG, "Engine A: HTTP code " + code + ", failing over to Engine B");
                    conn.disconnect();
                    activeStreamConn = null;
                    triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_HTTP_" + code);
                    return;
                }

                connected = true;
                break;
            }

            if (isUserCancelled) return;
            if (!connected || conn == null) {
                triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_CONNECT_FAIL");
                return;
            }

            // Honest total size: Content-Length if > 0, else expectedBytes if > 15MB, else 0
            long contentLength = -1L;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                contentLength = conn.getContentLengthLong();
            } else {
                contentLength = conn.getContentLength();
            }

            if (contentLength > 0) {
                otaTotalBytes = contentLength;
            } else if (expectedBytes > 15_000_000L) {
                otaTotalBytes = expectedBytes;
            } else {
                otaTotalBytes = 0L;
            }

            in = new BufferedInputStream(conn.getInputStream(), 131072);
            out = new FileOutputStream(targetApk, false);
            byte[] buffer = new byte[131072]; // 128 KB buffer

            otaState = "downloading";
            dispatchDownloadProgress();

            long streamStartTime = System.currentTimeMillis();
            long lastByteTime = System.currentTimeMillis();
            long lastDispatchTime = System.currentTimeMillis();
            long lastDispatchBytes = 0L;
            long downloaded = 0L;
            boolean gotFirst64KB = false;
            int read;

            while (!isUserCancelled && (read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                downloaded += read;
                otaDownloadedBytes = downloaded;
                long now = System.currentTimeMillis();
                lastByteTime = now;

                if (!gotFirst64KB && downloaded >= 65536) {
                    gotFirst64KB = true;
                }

                // Update downloadedBytes, percent, speed every 150ms
                if (now - lastDispatchTime >= 150) {
                    long timeDelta = now - lastDispatchTime;
                    long bytesDelta = downloaded - lastDispatchBytes;
                    otaSpeedMBps = (timeDelta > 0)
                            ? ((double) bytesDelta / (1024.0 * 1024.0)) / ((double) timeDelta / 1000.0)
                            : 0.0;
                    if (otaTotalBytes > 0) {
                        otaPercent = Math.min(99, (int) ((downloaded * 100) / otaTotalBytes));
                    } else {
                        otaPercent = 0;
                    }
                    lastDispatchTime = now;
                    lastDispatchBytes = downloaded;
                    dispatchDownloadProgress();
                }

                // 6-second first 64 KB watchdog
                if (!gotFirst64KB && (now - streamStartTime > 6000)) {
                    Log.w(TAG, "Engine A: No first 64KB within 6s, failing over to Engine B");
                    try { out.close(); } catch (Throwable ignored) {}
                    try { in.close(); } catch (Throwable ignored) {}
                    conn.disconnect();
                    activeStreamConn = null;
                    triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_FIRST_BYTE_TIMEOUT");
                    return;
                }

                // 8-second mid-stream stall watchdog
                if (gotFirst64KB && (now - lastByteTime > 8000)) {
                    Log.w(TAG, "Engine A: Mid-stream stall > 8s without bytes, failing over to Engine B");
                    try { out.close(); } catch (Throwable ignored) {}
                    try { in.close(); } catch (Throwable ignored) {}
                    conn.disconnect();
                    activeStreamConn = null;
                    triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_STREAM_STALL");
                    return;
                }
            }

            out.flush();

            if (isUserCancelled) return;

            if (downloaded >= 15_000_000L) {
                otaDownloadedBytes = downloaded;
                if (otaTotalBytes <= 0) otaTotalBytes = downloaded;
                otaPercent = 100;
                dispatchDownloadProgress();
                verifyAndInstall(targetApk, otaTotalBytes);
            } else {
                Log.w(TAG, "Engine A: Stream completed with < 15MB (" + downloaded + " bytes), failing over to Engine B");
                try { out.close(); } catch (Throwable ignored) {}
                try { in.close(); } catch (Throwable ignored) {}
                conn.disconnect();
                activeStreamConn = null;
                triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_STREAM_INCOMPLETE");
            }

        } catch (Throwable t) {
            if (!isUserCancelled) {
                Log.w(TAG, "Engine A stream exception: " + t.getMessage() + ", failing over to Engine B", t);
                triggerFailoverToEngineB(apkUrl, expectedBytes, targetApk, "E_STREAM_" + t.getClass().getSimpleName());
            }
        } finally {
            if (out != null) {
                try { out.close(); } catch (Throwable ignored) {}
            }
            if (in != null) {
                try { in.close(); } catch (Throwable ignored) {}
            }
            if (conn != null) {
                try { conn.disconnect(); } catch (Throwable ignored) {}
                activeStreamConn = null;
            }
        }
    }

    /**
     * Automatic failover trigger to Engine B (DownloadManager)
     */
    private void triggerFailoverToEngineB(String apkUrl, long expectedBytes, File targetApk, String reason) {
        if (isUserCancelled) return;
        Log.i(TAG, "Failing over to Engine B (DownloadManager) due to: " + reason);

        // Delete partial Engine A file before switching
        if (targetApk != null && targetApk.exists()) {
            try { targetApk.delete(); } catch (Throwable ignored) {}
        }

        otaEngine = "system";
        otaState = "connecting";
        otaDownloadedBytes = 0L;
        otaPercent = 0;
        otaSpeedMBps = 0.0;
        if (expectedBytes > 15_000_000L) {
            otaTotalBytes = expectedBytes;
        }
        dispatchDownloadProgress();

        runDownloadManagerEngine(apkUrl, expectedBytes);
    }

    /**
     * Engine B: Android OS DownloadManager with 200ms background polling
     */
    private void runDownloadManagerEngine(String apkUrl, long expectedBytes) {
        if (isUserCancelled) return;

        DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) {
            isDownloadingApk = false;
            otaState = "error";
            otaError = "E_DM_UNAVAILABLE";
            dispatchDownloadProgress();
            return;
        }

        final File dmDestFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "noor-connect-update.apk");
        if (dmDestFile.exists()) {
            try { dmDestFile.delete(); } catch (Throwable ignored) {}
        }

        try {
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(apkUrl));
            request.setTitle("Noor Connect Update");
            request.setDescription("Downloading official update package...");
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, "noor-connect-update.apk");

            final long downloadId = dm.enqueue(request);
            activeDownloadManagerId = downloadId;

            activeDmPollingThread = new Thread(() -> {
                long lastPollTime = System.currentTimeMillis();
                long lastPollBytes = 0L;
                boolean polling = true;

                while (polling && !isUserCancelled) {
                    try {
                        Thread.sleep(200);
                    } catch (InterruptedException e) {
                        break;
                    }
                    if (isUserCancelled) break;

                    DownloadManager.Query query = new DownloadManager.Query().setFilterById(downloadId);
                    Cursor cursor = null;
                    try {
                        cursor = dm.query(query);
                        if (cursor != null && cursor.moveToFirst()) {
                            int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                            int downloadedIdx = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                            int totalIdx = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                            int reasonIdx = cursor.getColumnIndex(DownloadManager.COLUMN_REASON);

                            int status = (statusIdx != -1) ? cursor.getInt(statusIdx) : -1;
                            long downloaded = (downloadedIdx != -1) ? cursor.getLong(downloadedIdx) : 0L;
                            long total = (totalIdx != -1) ? cursor.getLong(totalIdx) : 0L;
                            int dmReason = (reasonIdx != -1) ? cursor.getInt(reasonIdx) : 0;

                            if (total > 0) {
                                otaTotalBytes = total;
                            } else if (expectedBytes > 15_000_000L && otaTotalBytes <= 0) {
                                otaTotalBytes = expectedBytes;
                            }

                            otaDownloadedBytes = downloaded;
                            long now = System.currentTimeMillis();
                            long timeDelta = now - lastPollTime;
                            long bytesDelta = downloaded - lastPollBytes;
                            if (timeDelta >= 200) {
                                otaSpeedMBps = (timeDelta > 0)
                                        ? ((double) bytesDelta / (1024.0 * 1024.0)) / ((double) timeDelta / 1000.0)
                                        : 0.0;
                                lastPollTime = now;
                                lastPollBytes = downloaded;
                            }

                            if (status == DownloadManager.STATUS_RUNNING) {
                                otaState = "downloading";
                                if (otaTotalBytes > 0) {
                                    otaPercent = Math.min(99, (int) ((downloaded * 100) / otaTotalBytes));
                                } else {
                                    otaPercent = 0;
                                }
                                dispatchDownloadProgress();
                            } else if (status == DownloadManager.STATUS_PENDING) {
                                otaState = "connecting";
                                dispatchDownloadProgress();
                            } else if (status == DownloadManager.STATUS_SUCCESSFUL) {
                                polling = false;
                                isDownloadingApk = false;
                                otaPercent = 100;
                                otaDownloadedBytes = (total > 0) ? total : downloaded;
                                if (otaTotalBytes <= 0) otaTotalBytes = otaDownloadedBytes;
                                dispatchDownloadProgress();

                                File readyFile = dmDestFile;
                                if (!readyFile.exists() || readyFile.length() <= 15_000_000L) {
                                    int uriIdx = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                                    if (uriIdx != -1) {
                                        String uriStr = cursor.getString(uriIdx);
                                        if (uriStr != null && uriStr.startsWith("file://")) {
                                            readyFile = new File(Uri.parse(uriStr).getPath());
                                        }
                                    }
                                }
                                verifyAndInstall(readyFile, otaTotalBytes);
                            } else if (status == DownloadManager.STATUS_FAILED) {
                                polling = false;
                                isDownloadingApk = false;
                                otaState = "error";
                                otaError = "E_DM_FAILED_" + dmReason;
                                dispatchDownloadProgress();
                            }
                        }
                    } catch (Throwable t) {
                        Log.w(TAG, "Error polling DownloadManager", t);
                    } finally {
                        if (cursor != null) {
                            try { cursor.close(); } catch (Throwable ignored) {}
                        }
                    }
                }
            }, "noor-ota-dm-poll");
            activeDmPollingThread.start();

        } catch (Throwable t) {
            isDownloadingApk = false;
            otaState = "error";
            otaError = "E_DM_ENQUEUE_" + t.getClass().getSimpleName();
            dispatchDownloadProgress();
        }
    }

    /**
     * Integrity check before installation (state: verifying)
     */
    private void verifyAndInstall(File apkFile, long expectedTotalBytes) {
        if (isUserCancelled) return;
        otaState = "verifying";
        dispatchDownloadProgress();

        // 1. File must exist and be > 15_000_000 bytes
        if (apkFile == null || !apkFile.exists() || apkFile.length() <= 15_000_000L) {
            Log.e(TAG, "Integrity check failed: file missing or size <= 15 MB");
            if (apkFile != null && apkFile.exists()) {
                try { apkFile.delete(); } catch (Throwable ignored) {}
            }
            otaState = "error";
            otaError = "E_INTEGRITY";
            dispatchDownloadProgress();
            return;
        }

        // 2. If otaTotalBytes > 0 came from server, verify file length
        if (expectedTotalBytes > 15_000_000L && Math.abs(apkFile.length() - expectedTotalBytes) > 1024L) {
            Log.e(TAG, "Integrity check failed: length mismatch: " + apkFile.length() + " != " + expectedTotalBytes);
            try { apkFile.delete(); } catch (Throwable ignored) {}
            otaState = "error";
            otaError = "E_INTEGRITY";
            dispatchDownloadProgress();
            return;
        }

        otaReadyApkFile = apkFile;
        triggerApkInstall(apkFile);
    }

    /**
     * Check unknown sources permission and launch package installer
     */
    public void triggerApkInstall(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            otaState = "error";
            otaError = "E_APK_NOT_FOUND";
            dispatchDownloadProgress();
            return;
        }

        otaReadyApkFile = apkFile;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getPackageManager().canRequestPackageInstalls()) {
            otaState = "permission_required";
            dispatchDownloadProgress();
            Log.i(TAG, "REQUEST_INSTALL_PACKAGES not granted yet, launching unknown app sources settings");
            try {
                Intent settingsIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settingsIntent.setData(Uri.parse("package:" + getPackageName()));
                settingsIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(settingsIntent);
            } catch (Throwable t) {
                Log.e(TAG, "Failed to launch unknown app sources settings", t);
            }
            return;
        }

        launchPackageInstallerIntent(apkFile);
    }

    /**
     * Launch Android OS PackageInstaller Intent with FileProvider and clear top flags
     */
    public void launchPackageInstallerIntent(File apkFile) {
        if (apkFile == null || !apkFile.exists()) {
            otaState = "error";
            otaError = "E_APK_NOT_FOUND";
            dispatchDownloadProgress();
            return;
        }

        runOnUiThread(() -> {
            try {
                otaState = "installing";
                otaPercent = 100;
                dispatchDownloadProgress();

                Uri apkUri = androidx.core.content.FileProvider.getUriForFile(
                        this,
                        getPackageName() + ".fileprovider",
                        apkFile
                );
                Log.i(TAG, "Launching PackageInstaller for APK: " + apkFile.getAbsolutePath() + " with URI: " + apkUri);
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(installIntent);
            } catch (Throwable t) {
                Log.e(TAG, "Failed to launch PackageInstaller intent", t);
                otaState = "error";
                otaError = "E_INSTALL_FAILED";
                dispatchDownloadProgress();
            }
        });
    }

    /**
     * Expose installReadyApk() so user can re-open installer if dismissed
     */
    public void installReadyApk() {
        if (otaReadyApkFile != null && otaReadyApkFile.exists() && otaReadyApkFile.length() > 15_000_000L) {
            launchPackageInstallerIntent(otaReadyApkFile);
            return;
        }
        File dmFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "noor-connect-update.apk");
        if (dmFile.exists() && dmFile.length() > 15_000_000L) {
            otaReadyApkFile = dmFile;
            launchPackageInstallerIntent(dmFile);
            return;
        }
        File streamFile = new File(getExternalFilesDir(null) != null ? getExternalFilesDir(null) : getCacheDir(), "noor-connect-update.apk");
        if (streamFile.exists() && streamFile.length() > 15_000_000L) {
            otaReadyApkFile = streamFile;
            launchPackageInstallerIntent(streamFile);
            return;
        }
        otaState = "error";
        otaError = "E_NO_APK_READY";
        dispatchDownloadProgress();
    }

    /**
     * Backward-compatible alias for installDownloadedApk()
     */
    public void installDownloadedApk() {
        installReadyApk();
    }

    /**
     * Real user cancel ONLY - stops active engine, deletes partial files, sets otaState = "cancelled"
     */
    public void cancelApkDownload() {
        Log.i(TAG, "cancelApkDownload: real user cancel initiated");
        isUserCancelled = true;
        isDownloadingApk = false;
        otaState = "cancelled";
        otaPercent = 0;
        otaSpeedMBps = 0.0;
        dispatchDownloadProgress();

        if (activeStreamConn != null) {
            try {
                activeStreamConn.disconnect();
            } catch (Throwable ignored) {}
            activeStreamConn = null;
        }

        if (activeStreamThread != null && activeStreamThread.isAlive()) {
            try {
                activeStreamThread.interrupt();
            } catch (Throwable ignored) {}
            activeStreamThread = null;
        }

        if (activeDownloadManagerId != -1L) {
            try {
                DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
                if (dm != null) {
                    dm.remove(activeDownloadManagerId);
                }
            } catch (Throwable ignored) {}
            activeDownloadManagerId = -1L;
        }

        if (activeDmPollingThread != null && activeDmPollingThread.isAlive()) {
            try {
                activeDmPollingThread.interrupt();
            } catch (Throwable ignored) {}
            activeDmPollingThread = null;
        }

        try {
            File dmFile = new File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "noor-connect-update.apk");
            if (dmFile.exists()) dmFile.delete();
            File streamFile = new File(getExternalFilesDir(null) != null ? getExternalFilesDir(null) : getCacheDir(), "noor-connect-update.apk");
            if (streamFile.exists()) streamFile.delete();
        } catch (Throwable ignored) {}
    }

    /**
     * Fallback to open URL in standard external browser (NOT Chrome Custom Tab).
     * Aborts any active background download first to prevent bandwidth contention!
     */
    public void openExternalBrowser(String url) {
        if (url == null || url.trim().isEmpty()) return;
        if (isDownloadingApk || "downloading".equals(otaState) || "connecting".equals(otaState)) {
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
    private void dispatchDownloadProgress() {
        runOnUiThread(() -> {
            try {
                WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
                if (webView != null) {
                    JSONObject detail = new JSONObject();
                    detail.put("percent", otaPercent);
                    double dlMB = (double) otaDownloadedBytes / (1024.0 * 1024.0);
                    double totMB = (otaTotalBytes > 0) ? (double) otaTotalBytes / (1024.0 * 1024.0) : 0.0;
                    detail.put("downloadedMB", Math.round(dlMB * 10.0) / 10.0);
                    detail.put("totalMB", Math.round(totMB * 10.0) / 10.0);
                    detail.put("downloadedBytes", otaDownloadedBytes);
                    detail.put("totalBytes", otaTotalBytes);
                    detail.put("speedMBps", Math.round(otaSpeedMBps * 10.0) / 10.0);
                    detail.put("state", otaState);
                    detail.put("engine", otaEngine);
                    detail.put("error", otaError != null ? otaError : "");

                    String legacyStatus = "downloading";
                    if ("idle".equals(otaState)) legacyStatus = "idle";
                    else if ("connecting".equals(otaState)) legacyStatus = "downloading";
                    else if ("downloading".equals(otaState)) legacyStatus = "downloading";
                    else if ("verifying".equals(otaState)) legacyStatus = "verifying";
                    else if ("installing".equals(otaState)) legacyStatus = "installing";
                    else if ("permission_required".equals(otaState)) legacyStatus = "permission_required";
                    else if ("cancelled".equals(otaState)) legacyStatus = "cancelled";
                    else if ("error".equals(otaState)) legacyStatus = "error";
                    detail.put("status", legacyStatus);
                    detail.put("message", otaError != null && !otaError.isEmpty() ? otaError : null);

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
