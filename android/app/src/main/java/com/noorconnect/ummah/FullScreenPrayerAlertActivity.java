package com.noorconnect.ummah;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.KeyguardManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * FullScreenPrayerAlertActivity
 * High-priority full-screen intent activity shown when the phone is locked at prayer time.
 * Wakes the screen with dark theme, large gold prayer typography, Dismiss and Snooze 5m actions.
 */
public class FullScreenPrayerAlertActivity extends Activity {
    public static final String EXTRA_PRAYER_NAME = "prayer_name";
    public static final String EXTRA_PRAYER_TIME = "prayer_time";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Turn screen on and show over keyguard safely across all API versions
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                            | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                            | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        getWindow().setStatusBarColor(0xFF080B10);
        getWindow().setNavigationBarColor(0xFF080B10);

        String prayerName = getIntent().getStringExtra(EXTRA_PRAYER_NAME);
        if (prayerName == null || prayerName.isEmpty()) {
            prayerName = "Salah";
        }
        String prayerTime = getIntent().getStringExtra(EXTRA_PRAYER_TIME);
        if (prayerTime == null || prayerTime.isEmpty()) {
            prayerTime = "Now";
        }

        // Programmatic serene dark UI (100% self-contained)
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xFF080B10);
        int pad = dpToPx(24);
        root.setPadding(pad, pad, pad, pad);

        // Arabic brand glyph
        TextView arabicMark = new TextView(this);
        arabicMark.setText("نُور");
        arabicMark.setTextColor(0xFFD4AF37);
        arabicMark.setTextSize(TypedValue.COMPLEX_UNIT_SP, 38);
        arabicMark.setTypeface(Typeface.DEFAULT_BOLD);
        arabicMark.setGravity(Gravity.CENTER);
        root.addView(arabicMark);

        // Subtitle: Time for Prayer
        TextView subLabel = new TextView(this);
        subLabel.setText("TIME FOR PRAYER");
        subLabel.setTextColor(0xAAFFFFFF);
        subLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        subLabel.setLetterSpacing(0.2f);
        subLabel.setTypeface(Typeface.DEFAULT_BOLD);
        subLabel.setGravity(Gravity.CENTER);
        subLabel.setPadding(0, dpToPx(12), 0, 0);
        root.addView(subLabel);

        // Hero Prayer Name
        TextView nameView = new TextView(this);
        nameView.setText(prayerName);
        nameView.setTextColor(0xFFFFFFFF);
        nameView.setTextSize(TypedValue.COMPLEX_UNIT_SP, 44);
        nameView.setTypeface(Typeface.DEFAULT_BOLD);
        nameView.setGravity(Gravity.CENTER);
        nameView.setPadding(0, dpToPx(4), 0, 0);
        root.addView(nameView);

        // Target Time Pill
        TextView timePill = new TextView(this);
        timePill.setText(prayerTime);
        timePill.setTextColor(0xFFD4AF37);
        timePill.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        timePill.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        timePill.setGravity(Gravity.CENTER);
        timePill.setPadding(dpToPx(16), dpToPx(6), dpToPx(16), dpToPx(6));

        GradientDrawable pillBg = new GradientDrawable();
        pillBg.setColor(0x1AD4AF37);
        pillBg.setCornerRadius(dpToPx(16));
        pillBg.setStroke(dpToPx(1), 0x44D4AF37);
        timePill.setBackground(pillBg);

        LinearLayout.LayoutParams pillLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        pillLp.gravity = Gravity.CENTER;
        pillLp.topMargin = dpToPx(14);
        pillLp.bottomMargin = dpToPx(48);
        root.addView(timePill, pillLp);

        // Action Buttons Row (Dismiss + Snooze 5m)
        LinearLayout actionsRow = new LinearLayout(this);
        actionsRow.setOrientation(LinearLayout.HORIZONTAL);
        actionsRow.setGravity(Gravity.CENTER);

        // Snooze 5m Button
        Button snoozeBtn = new Button(this);
        snoozeBtn.setText("Snooze 5m");
        snoozeBtn.setTextColor(0xFFCBD5E1);
        snoozeBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        snoozeBtn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable snoozeBg = new GradientDrawable();
        snoozeBg.setColor(0xFF1E293B);
        snoozeBg.setCornerRadius(dpToPx(14));
        snoozeBg.setStroke(dpToPx(1), 0xFF334155);
        snoozeBtn.setBackground(snoozeBg);
        snoozeBtn.setPadding(dpToPx(20), dpToPx(12), dpToPx(20), dpToPx(12));
        final String currentPrayer = prayerName;
        snoozeBtn.setOnClickListener(v -> {
            scheduleSnooze(currentPrayer, 5);
            stopAdhanService();
            finish();
        });

        LinearLayout.LayoutParams snoozeLp = new LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
        );
        snoozeLp.rightMargin = dpToPx(8);
        actionsRow.addView(snoozeBtn, snoozeLp);

        // Dismiss Button
        Button dismissBtn = new Button(this);
        dismissBtn.setText("Dismiss");
        dismissBtn.setTextColor(0xFF0F172A);
        dismissBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        dismissBtn.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable dismissBg = new GradientDrawable();
        dismissBg.setColor(0xFFD4AF37);
        dismissBg.setCornerRadius(dpToPx(14));
        dismissBtn.setBackground(dismissBg);
        dismissBtn.setPadding(dpToPx(24), dpToPx(12), dpToPx(24), dpToPx(12));
        dismissBtn.setOnClickListener(v -> {
            stopAdhanService();
            finish();
        });

        LinearLayout.LayoutParams dismissLp = new LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                1f
        );
        dismissLp.leftMargin = dpToPx(8);
        actionsRow.addView(dismissBtn, dismissLp);

        LinearLayout.LayoutParams actionsLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        actionsLp.gravity = Gravity.CENTER;
        actionsLp.topMargin = dpToPx(20);
        root.addView(actionsRow, actionsLp);

        setContentView(root);
    }

    private void stopAdhanService() {
        try {
            Intent stopIntent = new Intent(this, AdhanPlaybackService.class);
            stopIntent.setAction(AdhanPlaybackService.ACTION_STOP);
            startService(stopIntent);
        } catch (Throwable t) {
            // Handled stop failure safely
        }
    }

    private void scheduleSnooze(String prayerName, int minutes) {
        try {
            AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            long triggerAt = System.currentTimeMillis() + (minutes * 60 * 1000L);
            Intent intent = new Intent(this, AdhanAlarmReceiver.class);
            intent.setAction(AdhanAlarmReceiver.ACTION_TRIGGER);
            intent.putExtra(AdhanAlarmReceiver.EXTRA_PRAYER_NAME, prayerName + " (Snooze)");

            PendingIntent pi = PendingIntent.getBroadcast(
                    this,
                    9999,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Throwable t) {
            // Handled snooze schedule error
        }
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density + 0.5f);
    }
}
