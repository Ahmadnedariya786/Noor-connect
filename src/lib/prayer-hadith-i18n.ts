import { safeSetLocalStorageItem } from './cache-manager';

export type PrayerHadithLang = 'en' | 'ur' | 'gu';

export const PRAYER_HADITH_LANG_KEY = 'noor_prayer_hadith_lang';
export const PRAYER_HADITH_LANG_EVENT = 'noor-prayer-hadith-lang-change';

export interface PrayerHadithEntry {
  prayer: string;
  arabic: string;
  en: string;
  ur: string;
  gu: string;
  referenceEn: string;
  referenceUr: string;
  referenceGu: string;
}

export const PRAYER_HADITHS: Record<string, PrayerHadithEntry> = {
  Fajr: {
    prayer: 'Fajr',
    arabic: '«الصَّلَاةُ فِي وَقْتِهَا»',
    en: '“The deed most beloved to Allah is prayer offered at its earliest appointed time.” (Bukhari 527)',
    ur: '”اللّٰہ تعالیٰ کے نزدیک سب سے محبوب عمل نماز کو اس کے اول وقت پر ادا کرنا ہے۔“ (صحیح بخاری 527)',
    gu: '“અલ્લાહ તઆલાને સૌથી વધુ પ્રિય અમલ નમાઝને તેના નિર્ધારિત પ્રથમ સમયે અદા કરવી છે.” (બુખારી 527)',
    referenceEn: 'Bukhari 527',
    referenceUr: 'صحیح بخاری 527',
    referenceGu: 'બુખારી 527',
  },
  Dhuhr: {
    prayer: 'Dhuhr',
    arabic: '«حَافِظُوا عَلَى الصَّلَوَاتِ»',
    en: '“Guard strictly your five obligatory prayers; they are a light and burhan for the believer.” (Ahmad / Muslim)',
    ur: '”اپنی فرض نمازوں کی پابندی کرو، بے شک نماز مومن کے لیے نور اور دلیل ہے۔“ (صحیح مسلم 223)',
    gu: '“તમારી ફરઝ નમાઝોની હિફાઝત કરો; બેશક નમાઝ મોમિન માટે નૂર અને દલીલ છે.” (મુસ્લિમ 223)',
    referenceEn: 'Muslim 223',
    referenceUr: 'صحیح مسلم 223',
    referenceGu: 'મુસ્લિમ 223',
  },
  Asr: {
    prayer: 'Asr',
    arabic: '«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ»',
    en: '“Whoever prays the two cool prayers (Fajr and Asr) on time will enter Paradise.” (Bukhari 574)',
    ur: '”جو شخص دو ٹھنڈے وقتوں (فجر اور عصر) کی نماز پابندی سے پڑھے گا وہ جنت میں داخل ہوگا۔“ (صحیح بخاری 574)',
    gu: '“જે વ્યક્તિ બે ઠંડા સમયો (ફજર અને અસર)ની નમાઝ પઢશે તે જન્નતમાં દાખલ થશે.” (બુખારી 574)',
    referenceEn: 'Bukhari 574',
    referenceUr: 'صحیح بخاری 574',
    referenceGu: 'બુખારી 574',
  },
  Maghrib: {
    prayer: 'Maghrib',
    arabic: '«أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ»',
    en: '“My Ummah will remain upon goodness as long as they do not delay the Maghrib prayer.” (Abu Dawud 418)',
    ur: '”میری امت اس وقت تک بھلائی اور فطرت پر رہے گی جب تک وہ مغرب کی نماز میں تاخیر نہ کرے۔“ (ابو داؤد 418)',
    gu: '“મારી ઉમ્મત ત્યાં સુધી ભલાઈ પર રહેશે જ્યાં સુધી તેઓ મગરિબની નમાઝમાં વિલંબ નહીં કરે.” (અબૂ દાઊદ 418)',
    referenceEn: 'Abu Dawud 418',
    referenceUr: 'ابو داؤد 418',
    referenceGu: 'અબૂ દાઊદ 418',
  },
  Isha: {
    prayer: 'Isha',
    arabic: '«مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ»',
    en: '“Whoever prays Isha in congregation, it is as if he stood in prayer for half the night.” (Muslim 656)',
    ur: '”جس نے عشاء کی نماز باجماعت ادا کی، گویا اس نے آدھی رات تک قیام کیا۔“ (صحیح مسلم 656)',
    gu: '“જેણે ઈશાની નમાઝ જમાઅત સાથે અદા કરી, જાણે તેણે અડધી રાત સુધી ઇબાદત કરી.” (મુસ્લિમ 656)',
    referenceEn: 'Muslim 656',
    referenceUr: 'صحیح مسلم 656',
    referenceGu: 'મુસ્લિમ 656',
  },
  Sunrise: {
    prayer: 'Sunrise',
    arabic: '«صَلَاةُ الْأَوَّابِينَ»',
    en: '“The prayer of the penitent is when the young camels’ feet are burned by the sun.” (Muslim 748)',
    ur: '”چاشت اور اشراق کی نماز رجوع کرنے والوں کی نماز ہے۔“ (صحیح مسلم 748)',
    gu: '“ઇશરાક અને ચાશ્તની નમાઝ રૂજુ કરનારાઓની નમાઝ છે.” (મુસ્લિમ 748)',
    referenceEn: 'Muslim 748',
    referenceUr: 'صحیح مسلم 748',
    referenceGu: 'મુસ્લિમ 748',
  },
};

export const PRAYER_HADITH_LANG_OPTIONS: Array<{
  id: PrayerHadithLang;
  label: string;
  nativeLabel: string;
  pillLabel: string;
}> = [
  { id: 'ur', label: 'Urdu', nativeLabel: 'اردو (Urdu)', pillLabel: 'اردو' },
  { id: 'en', label: 'English', nativeLabel: 'English', pillLabel: 'EN' },
  { id: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી (Gujarati)', pillLabel: 'ગુજ' },
];

/**
 * Returns user's active prayer notification Hadith language preference.
 * Defaults to 'ur' (Urdu).
 */
export function getPrayerHadithLang(): PrayerHadithLang {
  if (typeof localStorage === 'undefined') return 'ur';
  try {
    const saved = localStorage.getItem(PRAYER_HADITH_LANG_KEY);
    if (saved === 'en' || saved === 'ur' || saved === 'gu') {
      return saved;
    }
  } catch (err) {
    console.warn('Failed to read prayer hadith lang from localStorage:', err);
  }
  return 'ur';
}

/**
 * Updates prayer Hadith language preference, dispatches window change event,
 * and synchronizes with native Android background notification engine.
 */
export function setPrayerHadithLang(lang: PrayerHadithLang): void {
  const target: PrayerHadithLang = (lang === 'en' || lang === 'ur' || lang === 'gu') ? lang : 'ur';

  if (typeof localStorage !== 'undefined') {
    try {
      safeSetLocalStorageItem(PRAYER_HADITH_LANG_KEY, target);
    } catch {
      try {
        localStorage.setItem(PRAYER_HADITH_LANG_KEY, target);
      } catch (storageErr) {
        console.warn('Failed to persist prayer hadith lang:', storageErr);
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent(PRAYER_HADITH_LANG_EVENT, { detail: { lang: target } })
      );
    } catch (evtErr) {
      console.warn('Failed to dispatch prayer hadith lang event:', evtErr);
    }

    try {
      if ((window as any).AndroidBridge?.setPrayerNotificationLang) {
        (window as any).AndroidBridge.setPrayerNotificationLang(target);
      }
    } catch (bridgeErr) {
      console.warn('Failed to notify AndroidBridge of prayer hadith lang:', bridgeErr);
    }
  }
}

/**
 * Resolves authentic Arabic phrase and localized translation for a given prayer.
 */
export function getPrayerHadith(prayerName: string, lang?: PrayerHadithLang): {
  prayer: string;
  arabic: string;
  translation: string;
  reference: string;
  lang: PrayerHadithLang;
} {
  const activeLang = lang || getPrayerHadithLang();
  const normalized = (prayerName || 'Fajr').trim();
  const key = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  const entry = PRAYER_HADITHS[key] || PRAYER_HADITHS.Fajr;

  let translation = entry.ur;
  let reference = entry.referenceUr;

  if (activeLang === 'en') {
    translation = entry.en;
    reference = entry.referenceEn;
  } else if (activeLang === 'gu') {
    translation = entry.gu;
    reference = entry.referenceGu;
  }

  return {
    prayer: entry.prayer,
    arabic: entry.arabic,
    translation,
    reference,
    lang: activeLang,
  };
}
