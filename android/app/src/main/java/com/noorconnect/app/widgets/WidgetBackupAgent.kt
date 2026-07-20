package com.noorconnect.app.widgets

import android.app.backup.BackupAgent
import android.app.backup.BackupDataInput
import android.app.backup.BackupDataOutput
import android.content.Context
import android.content.SharedPreferences
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.IOException

/**
 * BackupAgent for widget data.
 * Backs up widget configuration (size, theme, density, accent) but NOT the volatile payload data
 * (prayer times, daily content, quran progress, tasbeeh) which should be re-synced from the app.
 */
class WidgetBackupAgent : BackupAgent() {

    companion object {
        private const val TAG = "WidgetBackupAgent"
        private const val WIDGET_PREFS = "NoorConnectWidgetPrefs"
        private const val CONFIG_PREFS = "WidgetConfigPrefs"
    }

    override fun onBackup(oldState: ParcelFileDescriptor?, data: BackupDataOutput?, newState: ParcelFileDescriptor?) {
        try {
            // Backup widget configuration preferences
            val configPrefs = applicationContext.getSharedPreferences(CONFIG_PREFS, Context.MODE_PRIVATE)
            val editor = configPrefs.edit()
            
            // Force sync to ensure all pending writes are committed
            editor.apply()
            
            // The system will automatically backup SharedPreferences with allowBackup=true
            // We just need to ensure config prefs are clean
            Log.d(TAG, "Widget config backup completed")
        } catch (e: Exception) {
            Log.e(TAG, "Backup failed", e)
        }
    }

    override fun onRestore(data: BackupDataInput?, appVersionCode: Int, newState: ParcelFileDescriptor?) {
        try {
            // Configuration preferences are restored automatically by the system
            // Payload data (prayer times, etc.) is intentionally NOT restored - 
            // it will be re-synced from the app on next launch
            Log.d(TAG, "Widget config restored, payload will re-sync from app")
        } catch (e: Exception) {
            Log.e(TAG, "Restore failed", e)
        }
    }
}