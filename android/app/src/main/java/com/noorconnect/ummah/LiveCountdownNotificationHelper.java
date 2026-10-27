package com.noorconnect.ummah;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * LiveCountdownNotificationHelper
 * Manages an ongoing, zero-battery Android notification with native chronometer countdown
 * showing remaining time to the next prayer and all 5 prayer times in the expanded body.
 */
public class LiveCountdownNotificationHelper {
    private static final String TAG = "LiveCountdownNotif";
    public static final String CHANNEL_ID = "noor_live_prayer_countdown";
    public static final int NOTIFICATION_ID = 8801;

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Live Prayer Countdown",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Silent ongoing countdown to the next prayer");
                channel.setShowBadge(false);
                channel.enableVibration(false);
                channel.enableLights(false);
                nm.createNotificationChannel(channel);
            }
        }
    }

    /**
     * Update or post the live countdown notification.
     */
    public static void updateCountdown(Context context, String jsonPayload) {
        if (context == null || jsonPayload == null || jsonPayload.trim().isEmpty()) return;

        try {
            createNotificationChannel(context);
            JSONObject obj = new JSONObject(jsonPayload);
            boolean enabled = obj.optBoolean("enabled", true);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            if (!enabled) {
                nm.cancel(NOTIFICATION_ID);
                return;
            }

            String nextPrayerName = obj.optString("nextPrayerName", "Prayer");
            String nextPrayerTimeFormatted = obj.optString("nextPrayerTimeFormatted", "");
            long nextPrayerEpochMillis = obj.optLong("nextPrayerEpochMillis", 0L);
            String allPrayersSummary = obj.optString("allPrayersSummary", "");

            if (nextPrayerEpochMillis <= 0) {
                nextPrayerEpochMillis = System.currentTimeMillis() + (30 * 60 * 1000L);
            }

            Intent openAppIntent = new Intent(context, MainActivity.class);
            openAppIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent contentPi = PendingIntent.getActivity(
                    context,
                    NOTIFICATION_ID,
                    openAppIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            String title = "Next: " + nextPrayerName + (nextPrayerTimeFormatted.isEmpty() ? "" : " • " + nextPrayerTimeFormatted);

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_notification)
                    .setContentTitle(title)
                    .setContentText(allPrayersSummary.isEmpty() ? "Tap to open Noor Connect" : allPrayersSummary)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(allPrayersSummary))
                    .setOngoing(true)
                    .setSilent(true)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setWhen(nextPrayerEpochMillis)
                    .setUsesChronometer(true)
                    .setContentIntent(contentPi);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                builder.setChronometerCountDown(true);
            }

            nm.notify(NOTIFICATION_ID, builder.build());
            Log.d(TAG, "Updated live prayer countdown notification for " + nextPrayerName);
        } catch (Throwable t) {
            Log.w(TAG, "Error updating live prayer countdown notification", t);
        }
    }

    public static void cancel(Context context) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Error cancelling live prayer countdown notification", t);
        }
    }
}
