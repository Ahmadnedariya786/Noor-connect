package com.noorconnect.ummah;
 
import android.app.AlarmManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Boot / time / timezone / exact alarm state receiver.
 *
 * This receiver handles native adhan alarms (NativeAdhanScheduler)
 * and reschedules them when boot completes, timezone/time changes,
 * or when the user grants exact-alarm permission in system settings.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        boolean isAlarmPermissionChange = false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            isAlarmPermissionChange = AlarmManager.ACTION_SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED.equals(action);
        }

        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)
                || isAlarmPermissionChange) {

            Log.d(TAG, "System event received (" + action + "), restoring adhan alarms");

            // Restore native adhan alarms (setAlarmClock — Doze immune)
            NativeAdhanScheduler.rescheduleAlarms(context);

            Log.d(TAG, "Adhan alarms rescheduled");
        }
    }
}
