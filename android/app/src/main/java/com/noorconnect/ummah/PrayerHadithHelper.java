package com.noorconnect.ummah;

import android.content.Context;
import android.util.Log;
import java.util.Locale;

/**
 * Shared Helper for authentic Prayer Hadith text and translations
 * across Urdu, English, and Gujarati for Android native notifications.
 */
public final class PrayerHadithHelper {
    private static final String TAG = "PrayerHadithHelper";
    public static final String PREFS_NAME = "noor_connect_prefs";
    public static final String KEY_HADITH_LANG = "prayer_hadith_lang";

    private PrayerHadithHelper() {
        // Utility class
    }

    public static String getHadithLanguage(Context context) {
        if (context == null) return "ur";
        try {
            return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .getString(KEY_HADITH_LANG, "ur");
        } catch (Throwable t) {
            Log.w(TAG, "Failed to read prayer_hadith_lang from SharedPreferences", t);
            return "ur";
        }
    }

    public static void setHadithLanguage(Context context, String lang) {
        if (context == null) return;
        try {
            String target = (lang != null && (lang.equals("en") || lang.equals("gu") || lang.equals("ur")))
                    ? lang
                    : "ur";
            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putString(KEY_HADITH_LANG, target)
                    .apply();
            Log.i(TAG, "Updated prayer notification Hadith language preference to: " + target);
        } catch (Throwable t) {
            Log.w(TAG, "Failed to persist prayer_hadith_lang in SharedPreferences", t);
        }
    }

    public static String getPrayerHadith(Context context, String prayerName) {
        String lang = getHadithLanguage(context);
        return getPrayerHadith(prayerName, lang);
    }

    public static String getPrayerHadith(String prayerName, String lang) {
        String targetLang = (lang != null && (lang.equals("en") || lang.equals("gu") || lang.equals("ur")))
                ? lang
                : "ur";
        String p = (prayerName != null) ? prayerName.toLowerCase(Locale.ROOT).trim() : "fajr";

        if ("fajr".equals(p)) {
            if ("ur".equals(targetLang)) {
                return "«الصَّلَاةُ فِي وَقْتِهَا» — ”اللّٰہ تعالیٰ کے نزدیک سب سے محبوب عمل نماز کو اس کے اول وقت پر ادا کرنا ہے۔“ (صحیح بخاری 527)";
            } else if ("gu".equals(targetLang)) {
                return "«الصَّلَاةُ فِي وَقْتِهَا» — “અલ્લાહ તઆલાને સૌથી વધુ પ્રિય અમલ નમાઝને તેના નિર્ધારિત પ્રથમ સમયે અદા કરવી છે.” (બુખારી 527)";
            } else {
                return "«الصَّلَاةُ فِي وَقْتِهَا» — “The deed most beloved to Allah is prayer offered at its earliest appointed time.” (Bukhari 527)";
            }
        } else if ("dhuhr".equals(p)) {
            if ("ur".equals(targetLang)) {
                return "«حَافِظُوا عَلَى الصَّلَوَاتِ» — ”اپنی فرض نمازوں کی پابندی کرو، بے شک نماز مومن کے لیے نور اور دلیل ہے۔“ (صحیح مسلم 223)";
            } else if ("gu".equals(targetLang)) {
                return "«حَافِظُوا عَلَى الصَّلَوَاتِ» — “તમારી ફરઝ નમાઝોની હિફાઝત કરો; બેશક નમાઝ મોમિન માટે નૂર અને દલીલ છે.” (મુસ્લિમ 223)";
            } else {
                return "«حَافِظُوا عَلَى الصَّلَوَاتِ» — “Guard strictly your five obligatory prayers; they are a light and burhan for the believer.” (Ahmad / Muslim)";
            }
        } else if ("asr".equals(p)) {
            if ("ur".equals(targetLang)) {
                return "«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ» — ”جو شخص دو ٹھنڈے وقتوں (فجر اور عصر) کی نماز پابندی سے پڑھے گا وہ جنت میں داخل ہوگا۔“ (صحیح بخاری 574)";
            } else if ("gu".equals(targetLang)) {
                return "«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ» — “જે વ્યક્તિ બે ઠંડા સમયો (ફજર અને અસર)ની નમાઝ પઢશે તે જન્નતમાં દાખલ થશે.” (બુખારી 574)";
            } else {
                return "«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ» — “Whoever prays the two cool prayers (Fajr and Asr) on time will enter Paradise.” (Bukhari 574)";
            }
        } else if ("maghrib".equals(p)) {
            if ("ur".equals(targetLang)) {
                return "«أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ» — ”میری امت اس وقت تک بھلائی اور فطرت پر رہے گی جب تک وہ مغرب کی نماز میں تاخیر نہ کرے۔“ (ابو داؤد 418)";
            } else if ("gu".equals(targetLang)) {
                return "«أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ» — “મારી ઉમ્મત ત્યાં સુધી ભલાઈ પર રહેશે જ્યાં સુધી તેઓ મગરિબની નમાઝમાં વિલંબ નહીં કરે.” (અબૂ દાઊદ 418)";
            } else {
                return "«أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ» — “My Ummah will remain upon goodness as long as they do not delay the Maghrib prayer.” (Abu Dawud 418)";
            }
        } else if ("isha".equals(p)) {
            if ("ur".equals(targetLang)) {
                return "«مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ» — ”جس نے عشاء کی نماز باجماعت ادا کی، گویا اس نے آدھی رات تک قیام کیا۔“ (صحیح مسلم 656)";
            } else if ("gu".equals(targetLang)) {
                return "«مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ» — “જેણે ઈશાની નમાઝ જમાઅત સાથે અદા કરી, જાણે તેણે અડધી રાત સુધી ઇબાદત કરી.” (મુસ્લિમ 656)";
            } else {
                return "«مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ» — “Whoever prays Isha in congregation, it is as if he stood in prayer for half the night.” (Muslim 656)";
            }
        }

        // Generic / Sunrise fallback
        if ("ur".equals(targetLang)) {
            return "«الصَّلَاةُ فِي وَقْتِهَا» — ”اللّٰہ تعالیٰ کے نزدیک سب سے محبوب عمل نماز کو اس کے اول وقت پر ادا کرنا ہے۔“ (صحیح بخاری 527)";
        } else if ("gu".equals(targetLang)) {
            return "«الصَّلَاةُ فِي وَقْتِهَا» — “અલ્લાહ તઆલાને સૌથી વધુ પ્રિય અમલ નમાઝને તેના નિર્ધારિત પ્રથમ સમયે અદા કરવી છે.” (બુખારી 527)";
        } else {
            return "«الصَّلَاةُ فِي وَقْتِهَا» — “The deed most beloved to Allah is prayer offered at its earliest appointed time.” (Bukhari 527)";
        }
    }
}
