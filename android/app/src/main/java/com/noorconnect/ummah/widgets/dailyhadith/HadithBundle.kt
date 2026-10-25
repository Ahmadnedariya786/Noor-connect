package com.noorconnect.ummah.widgets.dailyhadith

import android.content.Context
import com.noorconnect.ummah.widgets.HadithContent
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar

/**
 * Loads the bundled hadith list from `assets/widget_hadiths.json` and
 * returns the day's fallback hadith (used when no payload was pushed
 * from the web side, e.g. before the user opens the app for the first time).
 *
 * The bundle is built at build time by a Gradle task that aggregates the
 * 16 hadith collection JSONs in `public/data/hadith-collections/` into a
 * flat JSON array of [HadithContent] objects.
 *
 * Selection: DAY_OF_YEAR % hadiths.size for deterministic daily rotation.
 */
object HadithBundle {

    private const val ASSET_NAME = "widget_hadiths.json"

    @Volatile
    private var cachedHadiths: List<HadithContent>? = null

    fun getFallbackHadith(context: Context): HadithContent {
        val list = loadAll(context)
        if (list.isEmpty()) {
            return HadithContent(
                arabic = "",
                translation = "",
                narrator = "",
                source = "",
                grade = "Sahih",
                collection = "bukhari",
                bookNumber = 0,
                hadithNumber = 0
            )
        }
        val dayOfYear = Calendar.getInstance().get(Calendar.DAY_OF_YEAR)
        val index = dayOfYear % list.size
        return list[index]
    }

    private fun loadAll(context: Context): List<HadithContent> {
        cachedHadiths?.let { return it }
        return try {
            val json = context.assets.open(ASSET_NAME).use { it.readBytes().toString(Charsets.UTF_8) }
            val arr = JSONArray(json)
            val list = mutableListOf<HadithContent>()
            for (i in 0 until arr.length()) {
                val o = arr.getJSONObject(i)
                list.add(HadithContent.fromJson(o))
            }
            cachedHadiths = list
            list
        } catch (e: Exception) {
            emptyList()
        }
    }
}
