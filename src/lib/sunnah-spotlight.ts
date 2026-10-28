/**
 * 5-Waqt Sunnah Surah Spiritual Spotlight & Fazilat Engine
 *
 * Noor Connect (com.noorconnect.ummah)
 * Dynamically spotlights the beloved Sunnah Surah corresponding to the active prayer window
 * (Fajr -> Ya-Sin, Dhuhr -> Ar-Rahman / Friday Al-Kahf, Asr -> Al-Kahf, Maghrib -> Al-Waqi'ah, Isha -> Al-Mulk)
 * and pairs it with an inspiring, heart-touching Fazilat hook across all 8 languages.
 */

import { LanguageCode } from '@/lib/language-config';

export type PrayerWindow = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface SunnahSurahItem {
  number: number;
  name: string;
  arabicName: string;
  page: number;
  readTime: string;
  targetWindow: PrayerWindow;
  badgeLabel: string;
  isSpecialFriday?: boolean;
}

export interface SpotlightVirtue {
  prayerLabel: string;
  recommendedHeader: string;
  fazilatText: string;
  readAction: string;
}

export interface PrayerTimesInput {
  fajr?: Date | string | null;
  dhuhr?: Date | string | null;
  asr?: Date | string | null;
  maghrib?: Date | string | null;
  isha?: Date | string | null;
}

/**
 * Determine the active prayer window based on live prayer times or hour fallback.
 */
export function getActivePrayerWindow(
  now: Date,
  times?: PrayerTimesInput | null
): PrayerWindow {
  const toMs = (val?: Date | string | null): number | null => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.getTime();
  };

  const fMs = toMs(times?.fajr);
  const dMs = toMs(times?.dhuhr);
  const aMs = toMs(times?.asr);
  const mMs = toMs(times?.maghrib);
  const iMs = toMs(times?.isha);

  const nowMs = now.getTime();

  if (fMs && dMs && aMs && mMs && iMs) {
    if (nowMs >= fMs && nowMs < dMs) return 'fajr';
    if (nowMs >= dMs && nowMs < aMs) return 'dhuhr';
    if (nowMs >= aMs && nowMs < mMs) return 'asr';
    if (nowMs >= mMs && nowMs < iMs) return 'maghrib';
    return 'isha';
  }

  // Fallback to local hour
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'fajr';
  if (h >= 12 && h < 16) return 'dhuhr';
  if (h >= 16 && h < 18) return 'asr';
  if (h >= 18 && h < 20) return 'maghrib';
  return 'isha';
}

const BASE_SURAHS: Record<PrayerWindow, { number: number; name: string; arabicName: string; page: number; readTime: string }> = {
  fajr: { number: 36, name: 'Ya-Sin', arabicName: 'يس', page: 440, readTime: '5 min' },
  dhuhr: { number: 55, name: 'Ar-Rahman', arabicName: 'الرحمن', page: 531, readTime: '4 min' },
  asr: { number: 18, name: 'Al-Kahf', arabicName: 'الكهف', page: 293, readTime: '15 min' },
  maghrib: { number: 56, name: "Al-Waqi'ah", arabicName: 'الواقعة', page: 534, readTime: '4 min' },
  isha: { number: 67, name: 'Al-Mulk', arabicName: 'الملك', page: 562, readTime: '3 min' },
};

const KAHF_FRIDAY_DHUHR = { number: 18, name: 'Al-Kahf', arabicName: 'الكهف', page: 293, readTime: '15 min' };

const BADGES: Record<LanguageCode, Record<PrayerWindow | 'jumuah' | 'jumuahDhuhr' | 'asrRegular', string>> = {
  en: {
    fajr: '🌅 Fajr Sunnah',
    dhuhr: '☀️ Dhuhr Noor',
    asr: '🌤️ Asr Reflection',
    maghrib: '🌇 Maghrib Sunnah',
    isha: '🌙 Isha / Night',
    jumuah: '🕌 Jumu\'ah Sunnah',
    jumuahDhuhr: '🕌 Jumu\'ah Noor',
    asrRegular: '🌤️ Asr Reflection',
  },
  ar: {
    fajr: '🌅 سنة الفجر',
    dhuhr: '☀️ نور الظهر',
    asr: '🌤️ تأمل العصر',
    maghrib: '🌇 سنة المغرب',
    isha: '🌙 سنة العشاء / الليل',
    jumuah: '🕌 سنة الجمعة',
    jumuahDhuhr: '🕌 نور الجمعة',
    asrRegular: '🌤️ تأمل العصر',
  },
  ur: {
    fajr: '🌅 فجر سنت',
    dhuhr: '☀️ ظہر نور',
    asr: '🌤️ عصر تفکر',
    maghrib: '🌇 مغرب سنت',
    isha: '🌙 عشاء / شب سنت',
    jumuah: '🕌 جمعہ سنت',
    jumuahDhuhr: '🕌 جمعہ نور',
    asrRegular: '🌤️ عصر تفکر',
  },
  gu: {
    fajr: '🌅 ફજર સુન્નત',
    dhuhr: '☀️ ઝુહર નૂર',
    asr: '🌤️ અસ્ર ચિંતન',
    maghrib: '🌇 મગરીબ સુન્નત',
    isha: '🌙 ઇશા / રાત સુન્નત',
    jumuah: '🕌 જુમુઆ સુન્નત',
    jumuahDhuhr: '🕌 જુમુઆ નૂર',
    asrRegular: '🌤️ અસ્ર ચિંતન',
  },
  hi: {
    fajr: '🌅 फज्र सुन्नत',
    dhuhr: '☀️ ज़ुहर नूर',
    asr: '🌤️ अस्र तफ़क्कुर',
    maghrib: '🌇 मग़रिब सुन्नत',
    isha: '🌙 इशा / रात सुन्नत',
    jumuah: '🕌 जुमुआ सुन्नत',
    jumuahDhuhr: '🕌 जुमुआ नूर',
    asrRegular: '🌤️ अस्र तफ़क्कुर',
  },
  bn: {
    fajr: '🌅 ফজর সুন্নত',
    dhuhr: '☀️ জোহর নূর',
    asr: '🌤️ আসর প্রতিফলন',
    maghrib: '🌇 মাগরিব সুন্নত',
    isha: '🌙 এশা / রাতের সুন্নত',
    jumuah: '🕌 জুমুআহ সুন্নত',
    jumuahDhuhr: '🕌 জুমুআহ নূর',
    asrRegular: '🌤️ আসর প্রতিফলন',
  },
  ru: {
    fajr: '🌅 Фаджр Сунна',
    dhuhr: '☀️ Зухр Нур',
    asr: '🌤️ Аср Размышление',
    maghrib: '🌇 Магриб Сунна',
    isha: '🌙 Иша / Ночная Сунна',
    jumuah: '🕌 Джума Сунна',
    jumuahDhuhr: '🕌 Джума Нур',
    asrRegular: '🌤️ Аср Размышление',
  },
  fr: {
    fajr: '🌅 Fajr Sounnah',
    dhuhr: '☀️ Dhohr Noor',
    asr: '🌤️ Méditation d\'Asr',
    maghrib: '🌇 Maghreb Sounnah',
    isha: '🌙 Icha / Nuit',
    jumuah: '🕌 Jumu\'ah Sounnah',
    jumuahDhuhr: '🕌 Jumu\'ah Noor',
    asrRegular: '🌤️ Méditation d\'Asr',
  },
};

const VIRTUE_DATA: Record<LanguageCode, {
  recommendedPrefix: string;
  read: string;
  listen: string;
  fajr: { prayer: string; hook: string };
  dhuhrRahman: { prayer: string; hook: string };
  dhuhrKahfFriday: { prayer: string; hook: string };
  asrKahf: { prayer: string; hook: string };
  maghrib: { prayer: string; hook: string };
  isha: { prayer: string; hook: string };
}> = {
  en: {
    recommendedPrefix: '✦ RECOMMENDED FOR',
    read: 'Read',
    listen: 'Tilawah',
    fajr: {
      prayer: 'FAJR',
      hook: 'The Heart of the Quran — reciting it in the morning brings ease and barakah to your entire day.',
    },
    dhuhrRahman: {
      prayer: 'DHUHR',
      hook: 'The Bride of the Quran — pause at midday to reflect on the countless favors of your Lord.',
    },
    dhuhrKahfFriday: {
      prayer: 'JUMU\'AH',
      hook: 'A sacred light illuminating your entire week from one Friday to the next.',
    },
    asrKahf: {
      prayer: 'ASR',
      hook: 'A shield of sacred Noor and steadfastness of faith for the believer\'s heart.',
    },
    maghrib: {
      prayer: 'MAGHRIB',
      hook: 'Surah of Abundance — recited in the evening for gratitude, barakah, and protection from hardship.',
    },
    isha: {
      prayer: 'ISHA',
      hook: '30 verses that intercede for the believer and protect from the trial of the grave before sleep.',
    },
  },
  ar: {
    recommendedPrefix: '✦ مُوصى به لوقت',
    read: 'اقرأ',
    listen: 'تلاوة',
    fajr: {
      prayer: 'الفجر',
      hook: 'قلب القرآن — قراءتها في الصباح تجلب التيسير والبركة ليومك كله.',
    },
    dhuhrRahman: {
      prayer: 'الظهر',
      hook: 'عروس القرآن — تأمل في منتصف النهار في نعم ربك التي لا تُعد ولا تُحصى.',
    },
    dhuhrKahfFriday: {
      prayer: 'الجمعة',
      hook: 'نور ساطع يضيء للمؤمن ما بين الجمعتين ويحفظه من الفتن.',
    },
    asrKahf: {
      prayer: 'العصر',
      hook: 'نور ساطع وثبات للإيمان في قلب المؤمن من الجمعة إلى الجمعة.',
    },
    maghrib: {
      prayer: 'المغرب',
      hook: 'سورة الغنى — تُقرأ في المساء للشكر ونيل البركة والوقاية من الشدائد.',
    },
    isha: {
      prayer: 'العشاء',
      hook: '٣٠ آية تشفع لصاحبها وتحميه من عذاب القبر قبل النوم.',
    },
  },
  ur: {
    recommendedPrefix: '✦ مستحب برائے',
    read: 'پڑھیں',
    listen: 'تلاوت',
    fajr: {
      prayer: 'فجر',
      hook: 'قرآن کا دل — صبح کے وقت اس کی تلاوت پورے دن میں آسانی اور برکت لاتی ہے۔',
    },
    dhuhrRahman: {
      prayer: 'ظہر',
      hook: 'عروس القرآن — دوپہر کے وقت اپنے رب کی ان گنت نعمتوں کا شکر ادا کریں۔',
    },
    dhuhrKahfFriday: {
      prayer: 'جمعہ',
      hook: 'ایک مقدس نور جو ایک جمعہ سے دوسرے جمعہ تک آپ کے لیے روشن رہتا ہے۔',
    },
    asrKahf: {
      prayer: 'عصر',
      hook: 'مومن کے دل کے لیے مقدس نور اور استقامتِ ایمان کی پناہ گاہ۔',
    },
    maghrib: {
      prayer: 'مغرب',
      hook: 'سورۂ وسعت و کشادگی — شام کو شکر گزاری، برکت اور تنگی سے حفاظت کے لیے۔',
    },
    isha: {
      prayer: 'عشاء',
      hook: '۳۰ آیات جو مومن کی شفاعت کرتی ہیں اور سونے سے پہلے عذابِ قبر سے حفاظت دلاتی ہیں۔',
    },
  },
  gu: {
    recommendedPrefix: '✦ ભલામણ કરેલ વક્ત',
    read: 'વાંચો',
    listen: 'તિલાવત',
    fajr: {
      prayer: 'ફજર',
      hook: 'કુરાનનું હૃદય — સવારે તિલાવત કરવાથી દિવસભર સરળતા અને બરકત રહે છે.',
    },
    dhuhrRahman: {
      prayer: 'ઝુહર',
      hook: 'કુરાનની દુલ્હન — બપોરના સમયે આપના રબની અગણિત રહેમતો પર ગૌર કરો.',
    },
    dhuhrKahfFriday: {
      prayer: 'જુમુઆ',
      hook: 'એક પવિત્ર નૂર જે એક શુક્રવારથી બીજા શુક્રવાર સુધી પ્રકાશમાન રહે છે.',
    },
    asrKahf: {
      prayer: 'અસ્ર',
      hook: 'મોમિનના દિલ માટે પવિત્ર નૂર અને ઈમાનની મજબૂતીની ઢાલ.',
    },
    maghrib: {
      prayer: 'મગરીબ',
      hook: 'બરકત અને સમૃદ્ધિની સૂરહ — સાંજે શુક્રગુઝારી અને મુશ્કેલીઓથી રક્ષણ માટે.',
    },
    isha: {
      prayer: 'ઇશા',
      hook: '૩૦ આયતો જે મોમિન માટે શફાઅત કરે છે અને ઊંઘતા પહેલાં કબરના અઝાબથી રક્ષણ આપે છે.',
    },
  },
  hi: {
    recommendedPrefix: '✦ मुस्तहब वक़्त',
    read: 'पढ़ें',
    listen: 'तिलावत',
    fajr: {
      prayer: 'फज्र',
      hook: 'क़ुरआन का दिल — सुबह इसकी तिलावत से पूरे दिन में आसानी और बरकत आती है।',
    },
    dhuhrRahman: {
      prayer: 'ज़ुहर',
      hook: 'क़ुरआन की दुल्हन — दोपहर के वक्त अपने रब की बेशुमार नेमतों पर गौर करें।',
    },
    dhuhrKahfFriday: {
      prayer: 'जुमुआ',
      hook: 'एक मुक़द्दस नूर जो एक जुमे से दूसरे जुमे तक रोशन रहता है।',
    },
    asrKahf: {
      prayer: 'अस्र',
      hook: 'मोमिन के दिल के लिए मुक़द्दस नूर और ईमान की मज़बूती की ढाल।',
    },
    maghrib: {
      prayer: 'मग़रिब',
      hook: 'बरकत और वुक़अत की सूरह — शाम को शुक्रगुज़ारी और तंगी से हिफ़ाज़त के लिए।',
    },
    isha: {
      prayer: 'इशा',
      hook: '३० आयतें जो मोमिन की शफ़ाअत करती हैं और सोने से पहले अज़ाब-ए-क़ब्र से बचाती हैं।',
    },
  },
  bn: {
    recommendedPrefix: '✦ বিশেষ সুপারিশকৃত ওয়াক্ত',
    read: 'পড়ুন',
    listen: 'তিলাওয়াত',
    fajr: {
      prayer: 'ফজর',
      hook: 'কুরআনের হৃৎপিণ্ড — সকালে পাঠ করলে সারাদিন সহজ ও বরকতময় হয়।',
    },
    dhuhrRahman: {
      prayer: 'জোহর',
      hook: 'কুরআনের কনে — দ্বিপ্রহরে আপনার রবের অগণিত নিয়ামতের কৃতজ্ঞতা জ্ঞাপন করুন।',
    },
    dhuhrKahfFriday: {
      prayer: 'জুমুআহ',
      hook: 'এক পবিত্র নূর যা এক জুমুআহ থেকে অন্য জুমুআহ পর্যন্ত জীবনকে আলোকিত করে।',
    },
    asrKahf: {
      prayer: 'আসর',
      hook: 'মুমিনের হৃদয়ে পবিত্র নূর ও ঈমানের দৃঢ়তার ঐশ্বরিক ঢাল।',
    },
    maghrib: {
      prayer: 'মাগরিব',
      hook: 'প্রাচুর্যের সূরা — সন্ধ্যায় কৃতজ্ঞতা, বরকত ও অভাব-অনটন থেকে সুরক্ষার জন্য।',
    },
    isha: {
      prayer: 'এশা',
      hook: '৩০টি আয়াত যা মুমিনের জন্য সুপারিশ করবে এবং ঘুমানোর আগে কবরের শাস্তি থেকে রক্ষা করবে।',
    },
  },
  ru: {
    recommendedPrefix: '✦ РЕКОМЕНДОВАНО ДЛЯ',
    read: 'Читать',
    listen: 'Тилават',
    fajr: {
      prayer: 'ФАДЖР',
      hook: 'Сердце Корана — чтение утром приносит легкость и благодать на весь день.',
    },
    dhuhrRahman: {
      prayer: 'ЗУХР',
      hook: 'Невеста Корана — сделайте паузу в полдень, чтобы задуматься о бесчисленных милостях вашего Господа.',
    },
    dhuhrKahfFriday: {
      prayer: 'ДЖУМА',
      hook: 'Священный свет, озаряющий верующего от одной пятницы до следующей.',
    },
    asrKahf: {
      prayer: 'АСР',
      hook: 'Щит священного Нура и стойкости веры для сердца верующего.',
    },
    maghrib: {
      prayer: 'МАГРИБ',
      hook: 'Сура изобилия — читается вечером для благодарности, бараката и защиты от трудностей.',
    },
    isha: {
      prayer: 'ИША',
      hook: '30 аятов, которые заступаются за верующего и защищают от мучений могилы перед сном.',
    },
  },
  fr: {
    recommendedPrefix: '✦ RECOMMANDÉ POUR',
    read: 'Lire',
    listen: 'Tilawah',
    fajr: {
      prayer: 'FAJR',
      hook: 'Le Cœur du Coran — sa récitation le matin apporte facilité et bénédiction à toute votre journée.',
    },
    dhuhrRahman: {
      prayer: 'DHOHR',
      hook: 'La Fiancée du Coran — faites une pause à midi pour méditer sur les innombrables bienfaits de votre Seigneur.',
    },
    dhuhrKahfFriday: {
      prayer: 'JUMU\'AH',
      hook: 'Une lumière sacrée qui illumine toute votre semaine d\'un vendredi à l\'autre.',
    },
    asrKahf: {
      prayer: 'ASR',
      hook: 'Un bouclier de sainte lumière (Noor) et de fermeté dans la foi pour le cœur du croyant.',
    },
    maghrib: {
      prayer: 'MAGHREB',
      hook: 'Sourate de l\'Abondance — récitée le soir pour la gratitude, la bénédiction et la protection contre le besoin.',
    },
    isha: {
      prayer: 'ICHA',
      hook: '30 versets qui intercèdent pour le croyant et protègent du supplice de la tombe avant de dormir.',
    },
  },
};

/**
 * Returns the ordered list of 5 Sunnah Surahs with the active window's featured Surah placed FIRST,
 * plus metadata for badges and Jumu'ah special styling.
 */
export function getOrderedSunnahSurahs(
  activeWindow: PrayerWindow,
  isFriday: boolean,
  lang: LanguageCode = 'en'
): {
  orderedList: SunnahSurahItem[];
  featuredSurah: SunnahSurahItem;
  virtue: SpotlightVirtue;
} {
  const b = BADGES[lang] || BADGES.en;
  const v = VIRTUE_DATA[lang] || VIRTUE_DATA.en;

  // Determine the primary featured surah for the active window
  const featuredKey: PrayerWindow = activeWindow;
  let featuredBase = BASE_SURAHS[activeWindow];
  let featuredBadge = b[activeWindow];
  let virtueData = v[activeWindow === 'dhuhr' ? 'dhuhrRahman' : activeWindow === 'asr' ? 'asrKahf' : activeWindow];

  if (isFriday) {
    if (activeWindow === 'dhuhr') {
      featuredBase = KAHF_FRIDAY_DHUHR;
      featuredBadge = b.jumuahDhuhr;
      virtueData = v.dhuhrKahfFriday;
    } else if (activeWindow === 'asr') {
      featuredBadge = b.jumuah;
      virtueData = v.asrKahf;
    }
  }

  const featuredItem: SunnahSurahItem = {
    ...featuredBase,
    targetWindow: featuredKey,
    badgeLabel: featuredBadge,
    isSpecialFriday: isFriday && (featuredBase.number === 18),
  };

  // Build remaining 4 surahs
  const remainingWindows: PrayerWindow[] = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerWindow[]).filter(
    (w) => {
      if (isFriday && activeWindow === 'dhuhr') {
        // featured is Kahf (#18), so exclude 'asr' (Kahf) from remaining
        return w !== 'asr';
      }
      return w !== activeWindow;
    }
  );

  const remainingItems: SunnahSurahItem[] = remainingWindows.map((w) => {
    const base = BASE_SURAHS[w];
    let badge = b[w];
    let isSpecial = false;

    // If today is Friday and this surah is Kahf (w === 'asr'), give it secondary Jumu'ah badge
    if (isFriday && base.number === 18) {
      badge = b.jumuah;
      isSpecial = true;
    }

    return {
      ...base,
      targetWindow: w,
      badgeLabel: badge,
      isSpecialFriday: isSpecial,
    };
  });

  const orderedList = [featuredItem, ...remainingItems];

  const virtue: SpotlightVirtue = {
    prayerLabel: virtueData.prayer,
    recommendedHeader: `${v.recommendedPrefix} ${virtueData.prayer} • ${featuredItem.name.toUpperCase()} (${featuredItem.readTime})`,
    fazilatText: virtueData.hook,
    readAction: v.read,
  };

  return {
    orderedList,
    featuredSurah: featuredItem,
    virtue,
  };
}

