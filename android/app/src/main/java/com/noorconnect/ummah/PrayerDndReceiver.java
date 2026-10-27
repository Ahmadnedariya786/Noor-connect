package com.noorconnect.ummah;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * PrayerDndReceiver
 * Automatically mutes phone notifications (NotificationManager.INTERRUPTION_FILTER_PRIORITY)
 * at Fard prayer time and reliably restores the user's previous interruption filter
 * when the configured duration completes.
 */
public class PrayerDndReceiver extends BroadcastReceiver {
    private static final String TAG = "PrayerDndReceiver";

    public static final String ACTION_DND_START = "com.noorconnect.ummah.PRAYER_DND_START";
    public static final String ACTION_DND_END = "com.noorconnect.ummah.PRAYER_DND_END";
    public static final String EXTRA_PRAYER_NAME = "prayer_name";
    public static final String EXTRA_DURATION_MINUTES = "duration_minutes";

    private static final String PREFS_NAME = "noor_prayer_dnd";
    private static final String KEY_SAVED_FILTER = "saved_filter";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return;
        }

        try {
            if (!nm.isNotificationPolicyAccessGranted()) {
                Log.w(TAG, "Notification policy access not granted; skipping Auto-DND");
                return;
            }

            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            if (ACTION_DND_START.equals(action)) {
                String prayerName = intent.getStringExtra(EXTRA_PRAYER_NAME);
                int currentFilter = nm.getCurrentInterruptionFilter();
                prefs.edit().putInt(KEY_SAVED_FILTER, currentFilter).apply();

                nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_PRIORITY);
                Log.i(TAG, "Auto-DND activated for " + prayerName + ". Saved filter: " + currentFilter);

            } else if (ACTION_DND_END.equals(action)) {
                int savedFilter = prefs.getInt(KEY_SAVED_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL);
                nm.setInterruptionFilter(savedFilter);
                prefs.edit().remove(KEY_SAVED_FILTER).apply();
                Log.i(TAG, "Auto-DND finished. Restored filter: " + savedFilter);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "SecurityException adjusting interruption filter: " + se.getMessage());
        } catch (Throwable t) {
            Log.e(TAG, "Unexpected error in PrayerDndReceiver", t);
        }
    }

    /**
     * Parse jsonConfig and schedule AlarmManager start/end triggers around selected Fard prayers.
     */
    public static void configureAutoDnd(Context context, String jsonConfig) {
        if (context == null || jsonConfig == null) return;
        cancelAllDndAlarms(context);

        try {
            JSONObject obj = new JSONObject(jsonConfig);
            boolean enabled = obj.optBoolean("enabled", false);
            if (!enabled) {
                Log.i(TAG, "Auto-DND is disabled by user config");
                return;
            }

            int defaultDuration = obj.optInt("durationMinutes", 20);
            int fridayDuration = obj.optInt("fridayDurationMinutes", 45);

            JSONArray prayers = obj.optJSONArray("prayers");
            if (prayers == null || prayers.length() == 0) return;

            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            long now = System.currentTimeMillis();

            for (int i = 0; i < prayers.length(); i++) {
                JSONObject p = prayers.getJSONObject(i);
                String name = p.optString("name", "");
                long timeMs = p.optLong("timeMs", 0L);
                boolean isFriday = p.optBoolean("isFriday", false);
                boolean isJummah = isFriday && (name.equalsIgnoreCase("dhuhr") || name.equalsIgnoreCase("jummah"));

                int duration = isJummah ? fridayDuration : defaultDuration;
                long startMs = timeMs;
                long endMs = timeMs + (duration * 60 * 1000L);

                if (startMs > now) {
                    scheduleDndAlarm(context, am, ACTION_DND_START, name, startMs, i * 2);
                }
                if (endMs > now) {
                    scheduleDndAlarm(context, am, ACTION_DND_END, name, endMs, (i * 2) + 1);
                }
            }
            Log.i(TAG, "Configured Auto-DND for " + prayers.length() + " prayer windows");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to configure Auto-DND triggers", t);
        }
    }

    private static void scheduleDndAlarm(Context context, AlarmManager am, String action, String prayerName, long triggerMs, int requestCode) {
        try {
            Intent intent = new Intent(context, PrayerDndReceiver.class);
            intent.setAction(action);
            intent.putExtra(EXTRA_PRAYER_NAME, prayerName);

            PendingIntent pi = PendingIntent.getBroadcast(
                    context,
                    9500 + requestCode,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerMs, pi);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Exact alarm permission missing for DND schedule: " + se.getMessage());
        } catch (Throwable t) {
            Log.w(TAG, "Failed scheduling DND alarm for " + prayerName, t);
        }
    }

    public static void cancelAllDndAlarms(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            for (int i = 0; i < 20; i++) {
                Intent intent = new Intent(context, PrayerDndReceiver.class);
                intent.setAction(i % 2 == 0 ? ACTION_DND_START : ACTION_DND_END);
                PendingIntent pi = PendingIntent.getBroadcast(
                        context,
                        9500 + i,
                        intent,
                        PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
                );
                if (pi != null) {
                    am.cancel(pi);
                    pi.cancel();
                }
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error cancelling existing DND alarms", t);
        }
    }
}
