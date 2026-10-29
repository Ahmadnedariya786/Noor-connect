package com.noorconnect.ummah.widgets

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.util.Log
import org.json.JSONObject

object WidgetStyleHelper {
    private const val TAG = "WidgetStyleHelper"

    data class ResolvedStyle(
        val surfaceStyle: String,
        val opacity: Int,
        val accentPreset: String,
        val showCity: Boolean,
        val showCountdown: Boolean,
        val showFivePrayerStrip: Boolean,
        val fontScale: Int,
        val themeHex: String,
        val city: String,
        val hijriDateFormatted: String,
        val accentHex: String,
        val textHex: String,
        val subHex: String
    )

    fun parseConfig(context: Context): ResolvedStyle {
        val configJson = WidgetPrefs.getWidgetStyleConfig(context)
        var surfaceStyle = "theme"
        var opacity = 85
        var accentPreset = "ivory"
        var showCity = true
        var showCountdown = true
        var showFivePrayerStrip = true
        var fontScale = 100
        var themeHex = "#0B101B"
        var city = "Chhapi, India"
        var hijriDateFormatted = ""

        if (!configJson.isNullOrEmpty()) {
            try {
                val json = JSONObject(configJson)
                surfaceStyle = json.optString("surfaceStyle", "theme")
                opacity = json.optInt("opacity", 85)
                accentPreset = json.optString("accentPreset", "ivory")
                showCity = json.optBoolean("showCity", true)
                showCountdown = json.optBoolean("showCountdown", true)
                showFivePrayerStrip = json.optBoolean("showFullStrip", json.optBoolean("showFivePrayerStrip", true))
                fontScale = json.optInt("fontScale", 100)
                themeHex = json.optString("themeHex", "#0B101B")
                city = json.optString("city", "Chhapi, India").ifEmpty { "Chhapi, India" }
                hijriDateFormatted = json.optString("hijriDateFormatted", "")
            } catch (t: Throwable) {
                Log.w(TAG, "Error parsing widget style config", t)
            }
        }

        val (accentHex, textHex, subHex) = resolveSwatchColors(accentPreset)

        return ResolvedStyle(
            surfaceStyle = surfaceStyle,
            opacity = opacity.coerceIn(0, 100),
            accentPreset = accentPreset,
            showCity = showCity,
            showCountdown = showCountdown,
            showFivePrayerStrip = showFivePrayerStrip,
            fontScale = fontScale.coerceIn(85, 120),
            themeHex = themeHex,
            city = city,
            hijriDateFormatted = hijriDateFormatted,
            accentHex = accentHex,
            textHex = textHex,
            subHex = subHex
        )
    }

    fun resolveSwatchColors(preset: String): Triple<String, String, String> {
        return when (preset.lowercase()) {
            "white", "pure-white" -> Triple("#FFFFFF", "#FFFFFF", "#CBD5E1")
            "parchment", "warm-parchment" -> Triple("#E6C280", "#FDF6E2", "#C2A268")
            "mint", "madinah-mint" -> Triple("#10B981", "#ECFDF5", "#34D399")
            "sapphire", "sapphire-ice" -> Triple("#38BDF8", "#F0F9FF", "#7DD3FC")
            "rose", "velvet-rose" -> Triple("#F43F5E", "#FFF1F2", "#FB7185")
            else -> Triple("#D4AF37", "#FDFBF7", "#C5A059") // Ivory & Gold default
        }
    }

    @JvmStatic
    fun createRoundedBackgroundBitmap(
        surfaceStyle: String,
        themeHex: String,
        opacityPercent: Int,
        accentHex: String
    ): Bitmap = renderBackgroundBitmap(surfaceStyle, themeHex, opacityPercent, accentHex)

    @JvmStatic
    fun renderBackgroundBitmap(
        surfaceStyle: String,
        themeHex: String,
        opacityPercent: Int,
        accentHex: String
    ): Bitmap {
        val width = 320
        val height = 160
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)

        val clampedOpacity = opacityPercent.coerceIn(0, 100)
        val fillAlpha = Math.round((clampedOpacity / 100f) * 255f)

        val baseColor = when (surfaceStyle.lowercase()) {
            "oled" -> Color.BLACK
            "frosted" -> Color.parseColor("#141B29")
            else -> try {
                Color.parseColor(themeHex)
            } catch (t: Throwable) {
                Color.parseColor("#0B101B")
            }
        }

        val cornerRadius = 26f
        val rect = RectF(2.5f, 2.5f, width - 2.5f, height - 2.5f)

        // 1. Draw fill background if opacity > 0 (when 0%, fill is 100% crystal-clear transparent)
        if (fillAlpha > 0) {
            val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.FILL
                color = baseColor
                alpha = fillAlpha
            }
            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, fillPaint)
        }

        // 2. Draw subtle 1.5f - 2f stroke border in accentHex (alpha = Math.max(60, fillAlpha))
        try {
            val parsedAccent = Color.parseColor(accentHex)
            val strokeAlpha = if (fillAlpha == 0) 75 else Math.max(60, (fillAlpha * 0.45f).toInt()).coerceIn(40, 220)
            val strokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                style = Paint.Style.STROKE
                strokeWidth = 2.0f
                color = parsedAccent
                alpha = strokeAlpha
            }
            canvas.drawRoundRect(rect, cornerRadius, cornerRadius, strokePaint)
        } catch (t: Throwable) {
            Log.w(TAG, "Error drawing border", t)
        }

        return bitmap
    }

    /**
     * Canonical & Concise Islamic Month Names
     */
    val CANONICAL_ISLAMIC_MONTHS = arrayOf(
        "Muharram",
        "Safar",
        "Rabīʿ I",
        "Rabīʿ II",
        "Jumādā I",
        "Jumādā II",
        "Rajab",
        "Shaʿbān",
        "Ramadān",
        "Shawwāl",
        "Dhul-Qaʿdah",
        "Dhul-Hijjah"
    )

    /**
     * Concise Hijri date formatter ("17 Jumādā I 1448") that NEVER emits "BC",
     * removes trailing " AH" to prevent top-bar countdown clipping, and standardizes
     * long month suffixes.
     */
    fun formatHijriDate(rawHijri: String?): String {
        if (!rawHijri.isNullOrBlank()) {
            val trimmed = rawHijri.trim()
            val normalized = trimmed
                .replace("[\u014d\u014c\u00f4\u00d4]".toRegex(), "ū")
                .replace("(?i)Jum[aā]d[aā]\\s*(al-)?(ula|ūlā|ōlā|ola|1|i)\\b".toRegex(), "Jumādā I")
                .replace("(?i)Jum[aā]d[aā]\\s*(al-)?(akhirah|ākhirah|akhira|thani|thānī|2|ii)\\b".toRegex(), "Jumādā II")
                .replace("(?i)Rab[iī]ʿ?\\s*(al-)?(awwal|1|i)\\b".toRegex(), "Rabīʿ I")
                .replace("(?i)Rab[iī]ʿ?\\s*(al-)?(thani|thānī|akhir|ākhir|2|ii)\\b".toRegex(), "Rabīʿ II")
                .replace("(?i)\\s+(AH|هـ)\\.?$".toRegex(), "")
                .replace("(?i)\\bBC\\b".toRegex(), "")
                .replace("(?i)\\bBCE\\b".toRegex(), "")
                .trim()

            if (normalized.isNotBlank()) {
                return normalized
            }
        }
        return computeFallbackHijri()
    }

    fun computeFallbackHijri(): String {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val hijrah = java.time.chrono.HijrahDate.now()
                val day = hijrah.get(java.time.temporal.ChronoField.DAY_OF_MONTH)
                val month = hijrah.get(java.time.temporal.ChronoField.MONTH_OF_YEAR)
                val year = hijrah.get(java.time.temporal.ChronoField.YEAR)
                val mName = if (month in 1..12) CANONICAL_ISLAMIC_MONTHS[month - 1] else "Jumādā I"
                return "$day $mName $year"
            } catch (t: Throwable) {
                Log.w(TAG, "HijrahDate error", t)
            }
        }
        return computeKuwaitiTabularHijri(System.currentTimeMillis())
    }

    private fun computeKuwaitiTabularHijri(timeMs: Long): String {
        val cal = java.util.Calendar.getInstance().apply { timeInMillis = timeMs }
        val day = cal.get(java.util.Calendar.DAY_OF_MONTH)
        val month = cal.get(java.util.Calendar.MONTH) // 0-based
        var year = cal.get(java.util.Calendar.YEAR)

        var m = month + 1
        var y = year
        if (m < 3) {
            y -= 1
            m += 12
        }

        val a = Math.floor(y / 100.0)
        val b = 2 - a + Math.floor(a / 4.0)
        val jd = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5

        val z = jd - 1948440 + 10632
        val n = Math.floor((z - 1) / 10631.0)
        val zMod = z - 10631 * n + 354
        val j = (Math.floor((10985 - zMod) / 5316.0)) * (Math.floor((50 * zMod) / 17719.0)) +
                (Math.floor(zMod / 5670.0)) * (Math.floor((43 * zMod) / 15238.0))
        val zMod2 = zMod - (Math.floor((30 - j) / 15.0)) * (Math.floor((17719 * j) / 50.0)) -
                (Math.floor(j / 16.0)) * (Math.floor((15238 * j) / 43.0)) + 29
        val mHijri = Math.floor((24 * zMod2) / 709.0).toInt()
        val dHijri = (zMod2 - Math.floor((709 * mHijri) / 24.0)).toInt()
        val yHijri = (30 * n + j - 30).toInt()

        val mName = if (mHijri in 1..12) CANONICAL_ISLAMIC_MONTHS[mHijri - 1] else "Jumādā I"
        return "$dHijri $mName $yHijri"
    }
}

