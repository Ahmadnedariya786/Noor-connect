package com.noorconnect.ummah.widgets

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Builds and parses deep-link URIs for the Noor Connect app.
 *
 * URI scheme: `noorconnect://app/<route>?<query>`
 *
 * Routes:
 *  - /prayers?focus=next
 *  - /quran?surah=N&ayah=N
 *  - /hadith?collection=X&book=N&number=N
 *  - /quran/reading
 *  - /tasbeeh
 *
 * The MainActivity receives the intent, extracts the URI, and forwards
 * the path+query to React Router via the Capacitor App plugin.
 */
object WidgetDeeplink {

    const val SCHEME = "noorconnect"
    const val HOST = "app"

    fun buildPrayers(focus: String = "next"): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("dashboard")
            .build()

    fun buildQuran(surah: Int = 1, ayah: Int = 1): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("quran")
            .build()

    fun buildHadith(collection: String = "", book: Int = 0, number: Int = 0): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("hadith")
            .build()

    fun buildQuranReading(): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("quran-progress")
            .build()

    fun buildTasbeeh(): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("tasbeeh")
            .build()

    /**
     * Build a launcher Intent that opens MainActivity with the deep-link URI.
     * Uses FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_SINGLE_TOP to bring existing
     * MainActivity to the front smoothly without cold-rebooting or flashing.
     */
    fun toIntent(context: Context, uri: Uri): Intent =
        Intent(Intent.ACTION_VIEW).apply {
            data = uri
            setClassName(context.packageName, "com.noorconnect.ummah.MainActivity")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
}
