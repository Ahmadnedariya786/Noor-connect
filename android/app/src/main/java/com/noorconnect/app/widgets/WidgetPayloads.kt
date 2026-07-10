package com.noorconnect.app.widgets

import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Data contracts for the Noor Connect widget suite.
 *
 * The web side (TypeScript / Capacitor) pushes JSON payloads that map
 * directly to these data classes. Native code never recomputes prayer
 * times — it only consumes and renders.
 *
 * The classes are intentionally simple POJOs so that (de)serialization
 * is a single-line `JSONObject(...)` call.
 */

// ─────────────────────────────────────────────────────────────
// 1) PRAYER PAYLOAD
//    Pushed on app launch, prayer-time change, every 30 min.
// ─────────────────────────────────────────────────────────────

data class PrayerPayload(
    val prayers: List<PrayerEntry>,    // exactly 6: Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha
    val nextPrayerIndex: Int,           // 0..5
    val hijriDate: String,              // "5 Rajab 1447"
    val gregorianDate: String,          // "4 July 2026"
    val locationLabel: String,          // "Karachi, Pakistan"
    val madhab: String,                 // "HANAFI" | "SHAFI"
    val calculationMethod: String,      // "KARACHI" | "MWL" | "ISNA" | ...
    val currentTime24h: String,         // "14:35" — for initial clock render
    val lastUpdated: Long,             // epoch millis
    val dstOffset: Double = 0.0        // DST offset in hours (0 or usually 1)
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("prayers", JSONArray().also { arr ->
            prayers.forEach { arr.put(it.toJson()) }
        })
        put("nextPrayerIndex", nextPrayerIndex)
        put("hijriDate", hijriDate)
        put("gregorianDate", gregorianDate)
        put("locationLabel", locationLabel)
        put("madhab", madhab)
        put("calculationMethod", calculationMethod)
        put("currentTime24h", currentTime24h)
        put("lastUpdated", lastUpdated)
        put("dstOffset", dstOffset)
    }

    companion object {
        private const val TAG = "WidgetPayloads"
        
        fun fromJson(json: String): PrayerPayload? {
            try {
                val o = JSONObject(json)
                val prayers = mutableListOf<PrayerEntry>()
                val arr = o.getJSONArray("prayers")
                
                // Validate prayers array
                if (arr.length() != 6) {
                    Log.w(TAG, "Invalid prayer payload: expected 6 prayers, got ${arr.length()}")
                    return null
                }
                
                for (i in 0 until arr.length()) {
                    try {
                        prayers.add(PrayerEntry.fromJson(arr.getJSONObject(i)))
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to parse prayer entry at index $i", e)
                        return null
                    }
                }
                
                // Validate next prayer index
                val nextPrayerIndex = o.optInt("nextPrayerIndex", 0)
                if (nextPrayerIndex < 0 || nextPrayerIndex >= prayers.size) {
                    Log.w(TAG, "Invalid nextPrayerIndex: $nextPrayerIndex")
                    return null
                }
                
                // Validate prayer times are reasonable (not in far past/future)
                val now = System.currentTimeMillis()
                val oneYearMs = 365L * 24 * 60 * 60 * 1000
                for (prayer in prayers) {
                    if (prayer.time < now - oneYearMs || prayer.time > now + oneYearMs) {
                        Log.w(TAG, "Invalid prayer time: ${prayer.time}")
                        return null
                    }
                }
                
                return PrayerPayload(
                    prayers = prayers,
                    nextPrayerIndex = nextPrayerIndex,
                    hijriDate = o.optString("hijriDate", ""),
                    gregorianDate = o.optString("gregorianDate", ""),
                    locationLabel = o.optString("locationLabel", ""),
                    madhab = o.optString("madhab", "HANAFI"),
                    calculationMethod = o.optString("calculationMethod", "MWL"),
                    currentTime24h = o.optString("currentTime24h", ""),
                    lastUpdated = o.optLong("lastUpdated", System.currentTimeMillis()),
                    dstOffset = o.optDouble("dstOffset", 0.0)
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse PrayerPayload", e)
                return null
            }
        }
    }
}

data class PrayerEntry(
    val name: String,           // "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha"
    val time: Long,             // epoch millis
    val formattedTime: String   // "05:15" (already localized)
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("name", name)
        put("time", time)
        put("formattedTime", formattedTime)
    }

    companion object {
        private const val TAG = "WidgetPayloads"
        
        fun fromJson(o: JSONObject): PrayerEntry {
            val entry = PrayerEntry(
                name = o.optString("name", "—"),
                time = o.optLong("time", 0L),
                formattedTime = o.optString("formattedTime", "--:--")
            )
            // Validate prayer entry
            if (entry.name.isBlank()) {
                Log.w(TAG, "Invalid prayer entry: blank name")
            }
            if (entry.time <= 0) {
                Log.w(TAG, "Invalid prayer entry: invalid time ${entry.time}")
            }
            return entry
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 2) DAILY CONTENT PAYLOAD (Ayah + Hadith)
//    Pushed once per app launch + on day rollover.
// ─────────────────────────────────────────────────────────────

data class DailyContentPayload(
    val ayah: AyahContent,
    val hadith: HadithContent,
    val locale: String       // "en" | "ar" | "ur" | "tr" | "id"
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("ayah", ayah.toJson())
        put("hadith", hadith.toJson())
        put("locale", locale)
    }

    companion object {
        private const val TAG = "WidgetPayloads"
        
        fun fromJson(json: String): DailyContentPayload? = try {
            val o = JSONObject(json)
            DailyContentPayload(
                ayah = AyahContent.fromJson(o.getJSONObject("ayah")),
                hadith = HadithContent.fromJson(o.getJSONObject("hadith")),
                locale = o.optString("locale", "en")
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse DailyContentPayload", e)
            null
        }
    }
}

data class AyahContent(
    val arabic: String,
    val translation: String,
    val transliteration: String,
    val reference: String,           // "Al-Baqarah 2:255"
    val surahNumber: Int,
    val ayahNumber: Int
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("arabic", arabic)
        put("translation", translation)
        put("transliteration", transliteration)
        put("reference", reference)
        put("surahNumber", surahNumber)
        put("ayahNumber", ayahNumber)
    }

    companion object {
        fun fromJson(o: JSONObject) = AyahContent(
            arabic = o.optString("arabic", ""),
            translation = o.optString("translation", ""),
            transliteration = o.optString("transliteration", ""),
            reference = o.optString("reference", ""),
            surahNumber = o.optInt("surahNumber", 0),
            ayahNumber = o.optInt("ayahNumber", 0)
        )
    }
}

data class HadithContent(
    val arabic: String,
    val translation: String,
    val narrator: String,            // "Umar ibn al-Khattab (RA)"
    val source: String,              // "Sahih Bukhari 1:1"
    val grade: String,               // "Sahih" | "Hasan" | "Daif"
    val collection: String,          // "bukhari" | "muslim" | ...
    val bookNumber: Int,
    val hadithNumber: Int
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("arabic", arabic)
        put("translation", translation)
        put("narrator", narrator)
        put("source", source)
        put("grade", grade)
        put("collection", collection)
        put("bookNumber", bookNumber)
        put("hadithNumber", hadithNumber)
    }

    companion object {
        fun fromJson(o: JSONObject) = HadithContent(
            arabic = o.optString("arabic", ""),
            translation = o.optString("translation", ""),
            narrator = o.optString("narrator", ""),
            source = o.optString("source", ""),
            grade = o.optString("grade", "Sahih"),
            collection = o.optString("collection", ""),
            bookNumber = o.optInt("bookNumber", 0),
            hadithNumber = o.optInt("hadithNumber", 0)
        )
    }
}

// ─────────────────────────────────────────────────────────────
// 3) QURAN PROGRESS PAYLOAD
//    Pushed when user reads in-app.
// ─────────────────────────────────────────────────────────────

data class QuranProgressPayload(
    val currentSurah: Int,           // 1-114
    val currentAyah: Int,
    val currentJuz: Int,             // 1-30
    val totalPagesRead: Int,         // 0-604
    val totalPercent: Float,         // 0.0 - 100.0
    val dailyStreak: Int,
    val lastReadTimestamp: Long,
    val lastReadLabel: String,       // "Al-Baqarah 2:255"
    val goalPercent: Float
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("currentSurah", currentSurah)
        put("currentAyah", currentAyah)
        put("currentJuz", currentJuz)
        put("totalPagesRead", totalPagesRead)
        put("totalPercent", totalPercent)
        put("dailyStreak", dailyStreak)
        put("lastReadTimestamp", lastReadTimestamp)
        put("lastReadLabel", lastReadLabel)
        put("goalPercent", goalPercent)
    }

    companion object {
        private const val TAG = "WidgetPayloads"
        
        fun fromJson(json: String): QuranProgressPayload? = try {
            val o = JSONObject(json)
            QuranProgressPayload(
                currentSurah = o.optInt("currentSurah", 1),
                currentAyah = o.optInt("currentAyah", 1),
                currentJuz = o.optInt("currentJuz", 1),
                totalPagesRead = o.optInt("totalPagesRead", 0),
                totalPercent = o.optDouble("totalPercent", 0.0).toFloat(),
                dailyStreak = o.optInt("dailyStreak", 0),
                lastReadTimestamp = o.optLong("lastReadTimestamp", 0L),
                lastReadLabel = o.optString("lastReadLabel", ""),
                goalPercent = o.optDouble("goalPercent", 0.0).toFloat()
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse QuranProgressPayload", e)
            null
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 4) TASBEEH STATE (lives entirely on native side)
// ─────────────────────────────────────────────────────────────

data class TasbeehState(
    val totalCount: Long,
    val sessionCount: Int,
    val currentDhikr: String,
    val targetPerSession: Int,
    val lastIncrementAt: Long
) {
    fun toJson(): JSONObject = JSONObject().apply {
        put("totalCount", totalCount)
        put("sessionCount", sessionCount)
        put("currentDhikr", currentDhikr)
        put("targetPerSession", targetPerSession)
        put("lastIncrementAt", lastIncrementAt)
    }

    companion object {
        private const val TAG = "WidgetPayloads"
        
        val DEFAULT = TasbeehState(
            totalCount = 0L,
            sessionCount = 0,
            currentDhikr = "SubhanAllah",
            targetPerSession = 33,
            lastIncrementAt = 0L
        )

        val DHIKR_CYCLE = listOf(
            "SubhanAllah",
            "Alhamdulillah",
            "Allahu Akbar"
        )

        fun fromJson(json: String): TasbeehState? = try {
            val o = JSONObject(json)
            TasbeehState(
                totalCount = o.optLong("totalCount", 0L),
                sessionCount = o.optInt("sessionCount", 0),
                currentDhikr = o.optString("currentDhikr", "SubhanAllah"),
                targetPerSession = o.optInt("targetPerSession", 33),
                lastIncrementAt = o.optLong("lastIncrementAt", 0L)
            )
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse TasbeehState", e)
            DEFAULT
        }
    }
}
