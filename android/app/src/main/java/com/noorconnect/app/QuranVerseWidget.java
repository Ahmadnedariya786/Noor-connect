package com.noorconnect.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

/**
 * Quran Verse Home-Screen Widget
 *
 * Shows today's daily Ayah pulled from SharedPreferences via WidgetPlugin.
 * Data keys: quran_verse_arabic, quran_verse_translit, quran_verse_ref
 */
public class QuranVerseWidget extends AppWidgetProvider {

    private static final String TAG = "QuranVerseWidget";

    public static final String PREFS_NAME = "com.noorconnect.app.widget";
    public static final String KEY_QURAN_ARABIC = "quran_verse_arabic";
    public static final String KEY_QURAN_TRANSLIT = "quran_verse_translit";
    public static final String KEY_QURAN_REF = "quran_verse_ref";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        Log.d(TAG, "onUpdate called");
        for (int id : appWidgetIds) {
            updateWidget(context, appWidgetManager, id);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (PrayerWidget.UPDATE_ACTION.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(context, QuranVerseWidget.class));
            for (int id : ids)
                updateWidget(context, mgr, id);
        }
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, QuranVerseWidget.class));
        for (int id : ids)
            updateWidget(context, mgr, id);
    }

    private static void updateWidget(Context context, AppWidgetManager mgr, int widgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            String arabic = prefs.getString(KEY_QURAN_ARABIC, context.getString(R.string.widget_quran_arabic_default));
            String translit = prefs.getString(KEY_QURAN_TRANSLIT,
                    context.getString(R.string.widget_quran_translit_default));
            String ref = prefs.getString(KEY_QURAN_REF, context.getString(R.string.widget_quran_ref_default));

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quran_verse_widget);
            views.setTextViewText(R.id.widget_quran_arabic, arabic);
            views.setTextViewText(R.id.widget_quran_translit, translit);
            views.setTextViewText(R.id.widget_quran_ref, ref);

            // Tap → open app
            Intent tapIntent = new Intent(context, MainActivity.class);
            tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            tapIntent.putExtra("navigate", "quran");
            PendingIntent pi = PendingIntent.getActivity(context, 1, tapIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.quran_widget_root, pi);

            mgr.updateAppWidget(widgetId, views);
            Log.d(TAG, "Quran widget updated: ref=" + ref);
        } catch (Exception e) {
            Log.e(TAG, "Failed to update Quran widget " + widgetId, e);
        }
    }
}
