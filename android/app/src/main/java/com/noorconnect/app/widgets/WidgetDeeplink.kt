package com.noorconnect.app.widgets

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
            .appendPath("prayers")
            .appendQueryParameter("focus", focus)
            .build()

    fun buildQuran(surah: Int, ayah: Int): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("quran")
            .appendQueryParameter("surah", surah.toString())
            .appendQueryParameter("ayah", ayah.toString())
            .build()

    fun buildHadith(collection: String, book: Int, number: Int): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("hadith")
            .appendQueryParameter("collection", collection)
            .appendQueryParameter("book", book.toString())
            .appendQueryParameter("number", number.toString())
            .build()

    fun buildQuranReading(): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("quran")
            .appendPath("reading")
            .build()

    fun buildTasbeeh(): Uri =
        Uri.Builder()
            .scheme(SCHEME)
            .authority(HOST)
            .appendPath("tasbeeh")
            .build()

    /**
     * Build a launcher Intent that opens MainActivity with the deep-link URI.
     * MainActivity must declare an intent-filter for this scheme in the
     * AndroidManifest, OR MainActivity handles it via onNewIntent.
     */
    fun toIntent(context: Context, uri: Uri): Intent =
        Intent(Intent.ACTION_VIEW).apply {
            data = uri
            setClassName(context.packageName, "com.noorconnect.app.MainActivity")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
}
