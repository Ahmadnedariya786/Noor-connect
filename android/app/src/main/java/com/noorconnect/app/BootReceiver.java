package com.noorconnect.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Boot / time / timezone receiver.
 *
 * This receiver handles ONLY the native adhan alarms (NativeAdhanScheduler).
 *
 * Widget refresh + widget alarm rescheduling is handled separately by
 * com.noorconnect.app.widgets.WidgetBootReceiver — see the manifest for
 * its intent-filter.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : null;
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action)
                || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {

            Log.d(TAG, "System event received (" + action + "), restoring adhan alarms");

            // Restore native adhan alarms (setAlarmClock — Doze immune)
            NativeAdhanScheduler.rescheduleAlarms(context);

            Log.d(TAG, "Adhan alarms rescheduled");
        }
    }
}
