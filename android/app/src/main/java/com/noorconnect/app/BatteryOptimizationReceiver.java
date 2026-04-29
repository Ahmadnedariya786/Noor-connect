package com.noorconnect.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receiver for battery optimization state changes.
 * Reschedules adhan alarms when battery optimization settings change.
 */
public class BatteryOptimizationReceiver extends BroadcastReceiver {
    private static final String TAG = "BatteryOptReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }

        String action = intent.getAction();
        if (android.os.action.POWER_SAVE_MODE_CHANGED.equals(action)) {
            Log.d(TAG, "Power save mode changed, rescheduling adhan alarms");
            // Reschedule alarms to ensure they work with new battery optimization state
            NativeAdhanScheduler.rescheduleAlarms(context);
        }
    }
}
