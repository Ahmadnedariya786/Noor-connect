import { safeSetLocalStorageItem } from './cache-manager';

export type PrayerHadithLang = 'en' | 'ur' | 'gu' | 'hi';

export const PRAYER_HADITH_LANG_KEY = 'noor_prayer_hadith_lang';
export const PRAYER_HADITH_LANG_EVENT = 'noor-prayer-hadith-lang-change';

export interface PrayerHadithEntry {
  prayer: string;
  arabic: string;
  en: string;
  ur: string;
  gu: string;
  hi: string;
  referenceEn: string;
  referenceUr: string;
  referenceGu: string;
  referenceHi: string;
}

export const PRAYER_HADITHS: Record<string, PrayerHadithEntry> = {
  Fajr: {
    prayer: 'Fajr',
    arabic: '«الصَّلَاةُ فِي وَقْتِهَا»',
    en: '“The deed most beloved to Allah is prayer offered at its earliest appointed time.”',
    ur: '”اللّٰہ تعالیٰ کے نزدیک سب سے محبوب عمل نماز کو اس کے اول وقت پر ادا کرنا ہے۔“',
    gu: '“અલ્લાહ તઆલાને સૌથી વધુ પ્રિય અમલ નમાઝને તેના નિર્ધારિત પ્રથમ સમયે અદા કરવી છે.”',
    hi: '“अल्लाह तआला को सबसे प्रिय अमल नमाज़ को उसके पहले वक़्त पर अदा करना है।”',
    referenceEn: 'Bukhari 527',
    referenceUr: 'صحیح بخاری 527',
    referenceGu: 'બુખારી 527',
    referenceHi: 'सहीह बुख़ारी 527',
  },
  Dhuhr: {
    prayer: 'Dhuhr',
    arabic: '«حَافِظُوا عَلَى الصَّلَوَاتِ»',
    en: '“Guard strictly your five obligatory prayers; the five daily prayers wipe out sins committed between them.”',
    ur: '”اپنی فرض نمازوں کی پابندی کرو، پانچوں نمازیں ان گناہوں کا کفارہ بن جاتی ہیں جو ان کے درمیان ہوں۔“',
    gu: '“તમારી ફરઝ નમાઝોની પાબંદી કરો, પાંચેય નમાઝો તેમની વચ્ચે થયેલા ગુનાહોનું કફ્ફારો બની જાય છે.”',
    hi: '“अपनी फ़र्ज़ नमाज़ों की पाबंदी करो, पाँचों नमाज़ें उनके दरमियान होने वाले गुनाहों का कफ़्फ़ारा बन जाती हैं।”',
    referenceEn: 'Muslim 233',
    referenceUr: 'صحیح مسلم 233',
    referenceGu: 'મુસ્લિમ 233',
    referenceHi: 'सहीह मुस्लिम 233',
  },
  Jummah: {
    prayer: 'Jummah',
    arabic: '«خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ»',
    en: '“The best day on which the sun rises is Friday; on it Adam was created and on it he was admitted to Paradise.”',
    ur: '”سب سے بہترین دن جس پر سورج طلوع ہوا جمعہ کا دن ہے، اسی دن حضرت آدم علیہ السلام پیدا ہوئے۔“',
    gu: '“સૌથી ઉત્તમ દિવસ જેના પર સૂરજ ઊગ્યો તે શુક્રવાર (જુમુઅહ)નો દિવસ છે.”',
    hi: '“सबसे बेहतरीन दिन जिस पर सूरज निकला वह जुमुआ का दिन है।”',
    referenceEn: 'Muslim 854',
    referenceUr: 'صحیح مسلم 854',
    referenceGu: 'મુસ્લિમ 854',
    referenceHi: 'सहीह मुस्लिम 854',
  },
  Asr: {
    prayer: 'Asr',
    arabic: '«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ»',
    en: '“Whoever prays the two cool prayers (Fajr and Asr) on time will enter Paradise.”',
    ur: '”جو شخص دو ٹھنڈے وقتوں (فجر اور عصر) کی نماز پابندی سے پڑھے گا وہ جنت میں داخل ہوگا۔“',
    gu: '“જે વ્યક્તિ બે ઠંડા સમયો (ફજર અને અસર)ની નમાઝ પઢશે તે જન્નતમાં દાખલ થશે.”',
    hi: '“जो व्यक्ति दो ठंडे समयों (फ़ज्र और अस्र) की नमाज़ पाबंदी से पढ़ेगा वह जन्नत में दाखिल होगा।”',
    referenceEn: 'Bukhari 574',
    referenceUr: 'صحیح بخاری 574',
    referenceGu: 'બુખારી 574',
    referenceHi: 'सहीह बुख़ारी 574',
  },
  Maghrib: {
    prayer: 'Maghrib',
    arabic: '«أَقِمِ الصَّلَاةَ لِدُلُوكِ الشَّمْسِ»',
    en: '“My Ummah will remain upon goodness as long as they do not delay the Maghrib prayer.”',
    ur: '”میری امت اس وقت تک بھلائی اور فطرت پر رہے گی جب تک وہ مغرب کی نماز میں تاخیر نہ کرے۔“',
    gu: '“મારી ઉમ્મત ત્યાં સુધી ભલાઈ પર રહેશે જ્યાં સુધી તેઓ મગરિબની નમાઝમાં વિલંબ નહીં કરે.”',
    hi: '“मेरी उम्मत उस वक़्त तक भलाई पर रहेगी जब तक वह मग़रिब की नमाज़ में ताख़ीर न करे।”',
    referenceEn: 'Abu Dawud 418',
    referenceUr: 'ابو داؤد 418',
    referenceGu: 'અબૂ દાઊદ 418',
    referenceHi: 'अबू दाऊद 418',
  },
  Isha: {
    prayer: 'Isha',
    arabic: '«مَنْ صَلَّى الْعِشَاءَ فِي جَمَاعَةٍ»',
    en: '“Whoever prays Isha in congregation, it is as if he stood in prayer for half the night.”',
    ur: '”جس نے عشاء کی نماز باجماعت ادا کی، گویا اس نے آدھی رات تک قیام کیا۔“',
    gu: '“જેણે ઈશાની નમાઝ જમાઅત સાથે અદા કરી, જાણે તેણે અડધી રાત સુધી ઇબાદત કરી.”',
    hi: '“जिसने इशा की नमाज़ बा-जमाअत अदा की, गोया उसने आधी रात तक क़ियाम किया।”',
    referenceEn: 'Muslim 656',
    referenceUr: 'صحیح مسلم 656',
    referenceGu: 'મુસ્લિમ 656',
    referenceHi: 'सहीह मुस्लिम 656',
  },
  Sunrise: {
    prayer: 'Sunrise',
    arabic: '«صَلَاةُ الْأَوَّابِينَ»',
    en: '“The prayer of the penitent is when the young camels’ feet are burned by the sun.”',
    ur: '”چاشت اور اشراق کی نماز رجوع کرنے والوں کی نماز ہے۔“',
    gu: '“ઇશરાક અને ચાશ્તની નમાઝ રૂજુ કરનારાઓની નમાઝ છે.”',
    hi: '“चाश्त और इशराक़ की नमाज़ रुजू करने वालों की नमाज़ है।”',
    referenceEn: 'Muslim 748',
    referenceUr: 'صحیح مسلم 748',
    referenceGu: 'મુસ્લિમ 748',
    referenceHi: 'सहीह मुस्लिम 748',
  },
};

export interface PrayerRakahDetail {
  arabicName: string;
  rakahEn: string;
  rakahUr: string;
  rakahGu: string;
  rakahHi: string;
}

export const PRAYER_RAKAH_DETAILS: Record<string, PrayerRakahDetail> = {
  Fajr: {
    arabicName: 'الفَجْر',
    rakahEn: '2 Sunnah • 2 Fardh (4 Rak\'ah)',
    rakahUr: '2 سنت موکدہ • 2 فرض (4 رکعات)',
    rakahGu: '2 સુન્નત • 2 ફરઝ (4 રકાઅત)',
    rakahHi: '2 सुन्नत • 2 फ़र्ज़ (4 रकअत)',
  },
  Dhuhr: {
    arabicName: 'الظُّهْر',
    rakahEn: '4 Sunnah • 4 Fardh • 2 Sunnah • 2 Nafl (12 Rak\'ah)',
    rakahUr: '4 سنت • 4 فرض • 2 سنت • 2 نفل (12 رکعات)',
    rakahGu: '4 સુન્નત • 4 ફરઝ • 2 સુન્નત • 2 નફ્લ (12 રકાઅત)',
    rakahHi: '4 सुन्नत • 4 फ़र्ज़ • 2 सुन्नत • 2 नफ़्ल (12 रकअत)',
  },
  Jummah: {
    arabicName: 'الجُمُعَة',
    rakahEn: '4 Sunnah • 2 Fardh • 4 Sunnah • 2 Sunnah • 2 Nafl (14 Rak\'ah)',
    rakahUr: '4 سنت • 2 فرض • 4 سنت • 2 سنت • 2 نفل (14 رکعات)',
    rakahGu: '4 સુન્નત • 2 ફરઝ • 4 સુન્નત • 2 સુન્નત • 2 નફ્લ (14 રકાઅત)',
    rakahHi: '4 सुन्नत • 2 फ़र्ज़ • 4 सुन्नत • 2 सुन्नत • 2 नफ़्ल (14 रकअत)',
  },
  Asr: {
    arabicName: 'العَصْر',
    rakahEn: '4 Sunnah • 4 Fardh (8 Rak\'ah)',
    rakahUr: '4 سنت غیر موکدہ • 4 فرض (8 رکعات)',
    rakahGu: '4 સુન્નત • 4 ફરઝ (8 રકાઅત)',
    rakahHi: '4 सुन्नत • 4 फ़र्ज़ (8 रकअत)',
  },
  Maghrib: {
    arabicName: 'المَغْرِب',
    rakahEn: '3 Fardh • 2 Sunnah • 2 Nafl Awwabin (7 Rak\'ah)',
    rakahUr: '3 فرض • 2 سنت موکدہ • 2 نفل اوابین (7 رکعات)',
    rakahGu: '3 ફરઝ • 2 સુન્નત • 2 નફ્લ અવ્વાબીન (7 રકાઅત)',
    rakahHi: '3 फ़र्ज़ • 2 सुन्नत • 2 नफ़्ल अव्वाबीन (7 रकअत)',
  },
  Isha: {
    arabicName: 'العِشَاء',
    rakahEn: '4 Sunnah • 4 Fardh • 2 Sunnah • 2 Nafl • 3 Witr • 2 Nafl (17 Rak\'ah)',
    rakahUr: '4 سنت • 4 فرض • 2 سنت • 2 نفل • 3 وتر • 2 نفل (17 رکعات)',
    rakahGu: '4 સુન્નત • 4 ફરઝ • 2 સુન્નત • 2 નફ્લ • 3 વિત્ર • 2 નફ્લ (17 રકાઅત)',
    rakahHi: '4 सुन्नत • 4 फ़र्ज़ • 2 सुन्नत • 2 नफ़्ल • 3 वित्र • 2 नफ़्ल (17 रकअत)',
  },
  Sunrise: {
    arabicName: 'الشُّرُوق',
    rakahEn: 'Duha / Ishraq Sunnah',
    rakahUr: 'اشراق اور چاشت کی سنت نماز',
    rakahGu: 'ઇશરાક અને ચાશ્તની સુન્નત નમાઝ',
    rakahHi: 'इशराक़ और चाश्त की सुन्नत नमाज़',
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
    { id: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी (Hindi)', pillLabel: 'हिं' },
  ];

/**
 * Returns user's active prayer notification Hadith language preference.
 * Defaults to 'ur' (Urdu).
 */
export function getPrayerHadithLang(): PrayerHadithLang {
  if (typeof localStorage === 'undefined') return 'ur';
  try {
    const saved = localStorage.getItem(PRAYER_HADITH_LANG_KEY);
    if (saved === 'en' || saved === 'ur' || saved === 'gu' || saved === 'hi') {
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
  const target: PrayerHadithLang = (lang === 'en' || lang === 'ur' || lang === 'gu' || lang === 'hi') ? lang : 'ur';

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
 * Strips any trailing parenthetical or bracketed Hadith reference from a text string.
 * Prevents duplicate references like "(Bukhari 527) — Bukhari 527".
 */
export function stripTrailingHadithRef(text: string, ref?: string): string {
  if (!text) return '';
  let cleaned = text.trim();

  // 1. If explicit ref provided, remove it if wrapped at the end
  if (ref && ref.trim()) {
    const escapedRef = ref.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const refRegex = new RegExp(`\\s*[\\(\\[（\\s]*${escapedRef}[\\)\\]）\\s]*$`, 'i');
    cleaned = cleaned.replace(refRegex, '').trim();
  }

  // 2. Generic removal of any trailing citations in parentheses/brackets
  cleaned = cleaned.replace(
    new RegExp('\\s*[(（\\[](?:Bukhari|Muslim|Abu Dawud|Dawud|Tirmidhi|Nasai|Ibn Majah|صحیح بخاری|صحیح مسلم|بخاری|مسلم|ابو داؤد|ترمذی|نسائی|ابن ماجہ|બુખારી|મુસ્લિમ|અબૂ દાઊદ|તિરમિઝી|નસાઈ|ઇબ્ને માજહ|सहीह बुख़ारी|सहीह मुस्लिम|बुख़ारी|मुस्लिम|अबू दाऊद|तिर्मिज़ी|नसई|इब्न माजा)[\\s\\d\\w.-]*[)）\\]]\\s*$', 'i'),
    ''
  ).trim();

  // 3. Ensure closing quotes are properly restored if stripped
  if (cleaned.startsWith('“') && !cleaned.endsWith('”') && !cleaned.endsWith('"')) {
    cleaned = cleaned + '”';
  } else if (cleaned.startsWith('”') && !cleaned.endsWith('“') && !cleaned.endsWith('”')) {
    cleaned = cleaned + '“';
  }

  return cleaned;
}

/**
 * Resolves authentic Arabic phrase, localized translation, and rakat details for a given prayer.
 */
export function getPrayerHadith(prayerName: string, lang?: PrayerHadithLang): {
  prayer: string;
  arabic: string;
  translation: string;
  reference: string;
  rakah: string;
  lang: PrayerHadithLang;
} {
  const activeLang = lang || getPrayerHadithLang();
  const normalized = (prayerName || 'Fajr').trim();
  const key = normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();

  const entry = PRAYER_HADITHS[key] || PRAYER_HADITHS.Fajr;
  const rakahDetail = PRAYER_RAKAH_DETAILS[key] || PRAYER_RAKAH_DETAILS.Fajr;

  let translation = entry.ur;
  let reference = entry.referenceUr;
  let rakah = rakahDetail.rakahUr;

  if (activeLang === 'en') {
    translation = entry.en;
    reference = entry.referenceEn;
    rakah = rakahDetail.rakahEn;
  } else if (activeLang === 'gu') {
    translation = entry.gu;
    reference = entry.referenceGu;
    rakah = rakahDetail.rakahGu;
  } else if (activeLang === 'hi') {
    translation = entry.hi;
    reference = entry.referenceHi;
    rakah = rakahDetail.rakahHi;
  }

  const cleanTranslation = stripTrailingHadithRef(translation, reference);

  return {
    prayer: entry.prayer,
    arabic: entry.arabic,
    translation: cleanTranslation,
    reference,
    rakah,
    lang: activeLang,
  };
}
