/**
 * Noor Connect — Centralized Multi-Language Strings for Home, Prayer Names,
 * Countdown Formatting, Quran Progress Badges, Tasbeeh & Micro-Tags (8 Languages)
 * Supports: en, ar, ur, gu, hi, bn, ru, fr with graceful English fallback.
 */

import type { LanguageCode } from './language-config';

export interface PrayerNameTranslations {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  jummah: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export const PRAYER_NAMES_I18N: Record<LanguageCode, PrayerNameTranslations> = {
  en: {
    fajr: 'Fajr',
    sunrise: 'Sunrise',
    dhuhr: 'Dhuhr',
    jummah: "Jumu'ah",
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  },
  ar: {
    fajr: 'الفجر',
    sunrise: 'الشروق',
    dhuhr: 'الظهر',
    jummah: 'الجمعة',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
  },
  ur: {
    fajr: 'فجر',
    sunrise: 'طلوع آفتاب',
    dhuhr: 'ظہر',
    jummah: 'جمعہ',
    asr: 'عصر',
    maghrib: 'مغرب',
    isha: 'عشاء',
  },
  gu: {
    fajr: 'ફજર',
    sunrise: 'સૂર્યોદય',
    dhuhr: 'ઝુહર',
    jummah: 'જુમા',
    asr: 'અસર',
    maghrib: 'મગરીબ',
    isha: 'ઇશા',
  },
  hi: {
    fajr: 'फज्र',
    sunrise: 'सूर्योदय',
    dhuhr: 'जुह्र',
    jummah: 'जुमा',
    asr: 'अस्र',
    maghrib: 'मग़रिब',
    isha: 'इशा',
  },
  bn: {
    fajr: 'ফজর',
    sunrise: 'সূর্যোদয়',
    dhuhr: 'যোহর',
    jummah: 'জুমুআ',
    asr: 'আসর',
    maghrib: 'মাগরিব',
    isha: 'ইশা',
  },
  ru: {
    fajr: 'Фаджр',
    sunrise: 'Восход',
    dhuhr: 'Зухр',
    jummah: 'Джума',
    asr: 'Аср',
    maghrib: 'Магриб',
    isha: 'Иша',
  },
  fr: {
    fajr: 'Fajr',
    sunrise: 'Lever du soleil',
    dhuhr: 'Dhuhr',
    jummah: 'Vendredi',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
  },
};

export function getLocalizedPrayerName(
  prayerKey: string | undefined | null,
  lang: LanguageCode = 'en'
): string {
  if (!prayerKey) return '';
  const lower = prayerKey.trim().toLowerCase();
  const dict = PRAYER_NAMES_I18N[lang] || PRAYER_NAMES_I18N.en;

  if (lower === 'fajr') return dict.fajr;
  if (lower === 'sunrise') return dict.sunrise;
  if (lower === 'dhuhr') return dict.dhuhr;
  if (lower === 'jummah' || lower === "jumu'ah") return dict.jummah;
  if (lower === 'asr') return dict.asr;
  if (lower === 'maghrib') return dict.maghrib;
  if (lower === 'isha') return dict.isha;

  return prayerKey;
}

export function formatLocalizedCountdown(
  diffMs: number,
  lang: LanguageCode = 'en'
): string {
  if (diffMs <= 0) {
    const dueNowMap: Record<LanguageCode, string> = {
      en: 'due now',
      ar: 'حان الآن',
      ur: 'اب وقت ہے',
      gu: 'હવે સમય છે',
      hi: 'अभी समय है',
      bn: 'এখন সময়',
      ru: 'сейчас',
      fr: 'maintenant',
    };
    return dueNowMap[lang] || 'due now';
  }

  const h = Math.floor(diffMs / (1000 * 60 * 60));
  const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  switch (lang) {
    case 'ur':
      return h > 0 ? `${h} گھنٹے ${m} منٹ میں` : `${m} منٹ میں`;
    case 'ar':
      return h > 0 ? `خلال ${h} س ${m} د` : `خلال ${m} د`;
    case 'gu':
      return h > 0 ? `${h}ક ${m}મિ. માં` : `${m}મિ. માં`;
    case 'hi':
      return h > 0 ? `${h}घंटे ${m}मिनट में` : `${m}मिनट में`;
    case 'bn':
      return h > 0 ? `${h}ঘণ্টা ${m}মিনিটে` : `${m}মিনিটে`;
    case 'ru':
      return h > 0 ? `Через ${h}ч ${m}мин` : `Через ${m}мин`;
    case 'fr':
      return h > 0 ? `Dans ${h}h ${m}m` : `Dans ${m}m`;
    default:
      return h > 0 ? `In ${h}h ${m}m` : `In ${m}m`;
  }
}

export function formatLocalizedAfterPrayer(
  prayerKey: string,
  lang: LanguageCode = 'en'
): string {
  const localizedPrayer = getLocalizedPrayerName(prayerKey, lang);
  switch (lang) {
    case 'ur':
      return `${localizedPrayer} کے بعد`;
    case 'ar':
      return `بعد ${localizedPrayer}`;
    case 'gu':
      return `${localizedPrayer} પછી`;
    case 'hi':
      return `${localizedPrayer} के बाद`;
    case 'bn':
      return `${localizedPrayer}-এর পরে`;
    case 'ru':
      return `После ${localizedPrayer}`;
    case 'fr':
      return `Après ${localizedPrayer}`;
    default:
      return `After ${localizedPrayer}`;
  }
}

export const QURAN_PROGRESS_I18N: Record<
  LanguageCode,
  {
    badges: {
      completed: string;
      advanced: string;
      progressing: string;
      started: string;
      beginner: string;
    };
    messages: {
      completed: string;
      advanced: string;
      progressing: string;
      started: string;
      beginner: string;
    };
  }
> = {
  en: {
    badges: {
      completed: 'Completed',
      advanced: 'Advanced',
      progressing: 'Progressing',
      started: 'Started',
      beginner: 'Beginner',
    },
    messages: {
      completed: '🎉 Congratulations! You have completed the entire Quran!',
      advanced: "🌟 Excellent progress! You're almost there!",
      progressing: '💪 Great job! Half way through the Quran!',
      started: "📚 Keep going! You're building momentum!",
      beginner: '🌱 Start your Quran journey today!',
    },
  },
  ar: {
    badges: {
      completed: 'مكتمل',
      advanced: 'متقدم',
      progressing: 'مستمر',
      started: 'بدأ',
      beginner: 'مبتدئ',
    },
    messages: {
      completed: '🎉 مبروك! لقد ختمت القرآن الكريم كاملاً!',
      advanced: '🌟 تقدم ممتاز! لقد اقتربت من الختم!',
      progressing: '💪 عمل رائع! في منتصف رحلتك مع القرآن!',
      started: '📚 واصل التقدم! أنت تبني عادة مباركة!',
      beginner: '🌱 ابدأ رحلتك القرآنية اليوم!',
    },
  },
  ur: {
    badges: {
      completed: 'مکمل',
      advanced: 'اعلیٰ',
      progressing: 'جاری',
      started: 'شروع',
      beginner: 'مبتدی',
    },
    messages: {
      completed: '🎉 مبارک ہو! آپ نے مکمل قرآن کریم ختم کر لیا!',
      advanced: '🌟 شاندار پیشرفت! آپ منزل کے بالکل قریب ہیں!',
      progressing: '💪 بہت خوب! آدھا قرآن مکمل ہو چکا ہے!',
      started: '📚 جاری رکھیں! آپ کا تعلق مضبوط ہو رہا ہے!',
      beginner: '🌱 آج ہی اپنے قرآنی سفر کا آغاز کریں!',
    },
  },
  gu: {
    badges: {
      completed: 'પૂર્ણ',
      advanced: 'ઉચ્ચ',
      progressing: 'ચાલુ',
      started: 'શરૂ',
      beginner: 'પ્રારંભિક',
    },
    messages: {
      completed: '🎉 મુબારક! તમે સમગ્ર કુરાન પૂર્ણ કર્યું છે!',
      advanced: '🌟 ઉત્તમ પ્રગતિ! તમે લક્ષ્યની ખૂબ નજીક છો!',
      progressing: '💪 ઉત્તમ કાર્ય! અડધું કુરાન પૂર્ણ થયું!',
      started: '📚 ચાલુ રાખો! તમારી ગતિ વધી રહી છે!',
      beginner: '🌱 આજે જ તમારી કુરાન યાત્રા શરૂ કરો!',
    },
  },
  hi: {
    badges: {
      completed: 'पूर्ण',
      advanced: 'उन्नत',
      progressing: 'जारी',
      started: 'शुरू',
      beginner: 'आरंभिक',
    },
    messages: {
      completed: '🎉 मुबारक! आपने पूरा क़ुरआन मुकम्मल कर लिया!',
      advanced: '🌟 शानदार प्रगति! आप मंज़िल के बेहद क़रीब हैं!',
      progressing: '💪 बहुत बढ़िया! आधा क़ुरआन मुकम्मل हो गया!',
      started: '📚 जारी रखें! आपकी रफ़्तार बढ़ रही है!',
      beginner: '🌱 आज ही अपने क़ुरआनी सफ़र का आग़ाज़ करें!',
    },
  },
  bn: {
    badges: {
      completed: 'সম্পূর্ণ',
      advanced: 'উন্নত',
      progressing: 'চলমান',
      started: 'শুরু',
      beginner: 'শিক্ষানবিস',
    },
    messages: {
      completed: '🎉 মোবারকবাদ! আপনি পুরো কুরআন খতম করেছেন!',
      advanced: '🌟 দারুণ অগ্রগতি! আপনি প্রায় পৌঁছে গেছেন!',
      progressing: '💪 চমৎকার! অর্ধেক কুরআন পড়া সম্পন্ন হয়েছে!',
      started: '📚 এগিয়ে যান! আপনার অভ্যাস গড়ে উঠছে!',
      beginner: '🌱 আজই আপনার কুরআন তিলাওয়াতের যাত্রা শুরু করুন!',
    },
  },
  ru: {
    badges: {
      completed: 'Завершено',
      advanced: 'Продвинутый',
      progressing: 'В процессе',
      started: 'Начато',
      beginner: 'Начинающий',
    },
    messages: {
      completed: '🎉 Поздравляем! Вы полностью прочитали Священный Коран!',
      advanced: '🌟 Отличный прогресс! Вы почти у цели!',
      progressing: '💪 Отличная работа! Половина Корана пройдена!',
      started: '📚 Продолжайте! Вы на верном пути!',
      beginner: '🌱 Начните чтение Корана уже сегодня!',
    },
  },
  fr: {
    badges: {
      completed: 'Terminé',
      advanced: 'Avancé',
      progressing: 'En cours',
      started: 'Démarré',
      beginner: 'Débutant',
    },
    messages: {
      completed: '🎉 Félicitations ! Vous avez terminé le Coran entier !',
      advanced: '🌟 Excellent progrès ! Vous y êtes presque !',
      progressing: '💪 Beau travail ! Vous êtes à mi-chemin du Coran !',
      started: '📚 Continuez ! Vous créez une belle habitude !',
      beginner: '🌱 Commencez votre voyage avec le Coran dès aujourd’hui !',
    },
  },
};

export const TASBEEH_I18N: Record<
  LanguageCode,
  {
    set: string;
    lock: string;
    locked: string;
    sunnahChainOn: string;
    sunnahChainMode: string;
    setOfTarget: string;
    dhikrOfChange: string;
    tapToCount: string;
    reset: string;
    auto: string;
    sound: string;
    vibrate: string;
    mute: string;
    totalDhikrRecorded: string;
    lifetimeCount: string;
    total: string;
    resetCounter: string;
    resetConfirmText: string;
    cancel: string;
    exitZen: string;
    goalProgress: string;
    goal: string;
    prev: string;
    next: string;
    skip: string;
  }
> = {
  en: {
    set: 'Set',
    lock: 'Lock',
    locked: 'Locked',
    sunnahChainOn: '⛓ Sunnah Chain: ON',
    sunnahChainMode: '⛓ Sunnah Chain Mode',
    setOfTarget: 'Set {step} of 6 • Target {target}',
    dhikrOfChange: 'Dhikr {current} of {total} • Change',
    tapToCount: 'TAP TO COUNT',
    reset: 'Reset',
    auto: 'Auto',
    sound: 'Sound',
    vibrate: 'Vibrate',
    mute: 'Mute',
    totalDhikrRecorded: 'Total Dhikr Recorded',
    lifetimeCount: 'Lifetime count across sessions',
    total: 'Total',
    resetCounter: 'Reset Counter',
    resetConfirmText: 'Reset current counter to 0?',
    cancel: 'Cancel',
    exitZen: '✕ Exit Zen',
    goalProgress: 'Goal Progress',
    goal: 'GOAL',
    prev: 'Prev',
    next: 'Next',
    skip: 'Skip',
  },
  ar: {
    set: 'مجموعة',
    lock: 'قفل',
    locked: 'مقفل',
    sunnahChainOn: '⛓ سلسلة السنّة: مفعّلة',
    sunnahChainMode: '⛓ وضع سلسلة السنّة',
    setOfTarget: 'مجموعة {step} من ٦ • الهدف {target}',
    dhikrOfChange: 'ذكر {current} من {total} • تغيير',
    tapToCount: 'المس للتسبيح',
    reset: 'إعادة ضبط',
    auto: 'تلقائي',
    sound: 'صوت',
    vibrate: 'اهتزاز',
    mute: 'صامت',
    totalDhikrRecorded: 'إجمالي الأذكار المسجلة',
    lifetimeCount: 'العدد الإجمالي عبر الجلسات',
    total: 'الإجمالي',
    resetCounter: 'إعادة ضبط العداد',
    resetConfirmText: 'هل تريد تصفير العداد الحالي؟',
    cancel: 'إلغاء',
    exitZen: '✕ خروج من التركيز',
    goalProgress: 'تقدم الهدف',
    goal: 'الهدف',
    prev: 'السابق',
    next: 'التالي',
    skip: 'تخطي',
  },
  ur: {
    set: 'سیٹ',
    lock: 'لاک',
    locked: 'مقفل',
    sunnahChainOn: '⛓ سنت زنجیر: آن',
    sunnahChainMode: '⛓ سنت زنجیر موڈ',
    setOfTarget: 'سیٹ {step} از ۶ • ہدف {target}',
    dhikrOfChange: 'ذکر {current} از {total} • تبدیل',
    tapToCount: 'گننے کے لیے چھوئیں',
    reset: 'دوبارہ شروع',
    auto: 'خودکار',
    sound: 'آواز',
    vibrate: 'تھرتھراہٹ',
    mute: 'خاموش',
    totalDhikrRecorded: 'کل ریکارڈ شدہ اذکار',
    lifetimeCount: 'تمام نشستوں کی مجموعی گنتی',
    total: 'کل',
    resetCounter: 'کاؤنٹر ری سیٹ کریں',
    resetConfirmText: 'کیا آپ کاؤنٹر کو صفر کرنا چاہتے ہیں؟',
    cancel: 'منسوخ',
    exitZen: '✕ زین موڈ بند کریں',
    goalProgress: 'ہدف کی پیشرفت',
    goal: 'ہدف',
    prev: 'پچھلا',
    next: 'اگلا',
    skip: 'چھوڑیں',
  },
  gu: {
    set: 'સેટ',
    lock: 'લૉક',
    locked: 'લૉક કરેલ',
    sunnahChainOn: '⛓ સુન્નત શ્રૃંખલા: ચાલુ',
    sunnahChainMode: '⛓ સુન્નત શ્રૃંખલા મોડ',
    setOfTarget: 'સેટ {step} / ૬ • લક્ષ્ય {target}',
    dhikrOfChange: 'ઝિક્ર {current} / {total} • બદલો',
    tapToCount: 'ગણવા માટે ટૅપ કરો',
    reset: 'રીસેટ',
    auto: 'ઑટો',
    sound: 'અવાજ',
    vibrate: 'વાઇબ્રેટ',
    mute: 'શાંત',
    totalDhikrRecorded: 'કુલ નોંધાયેલ ઝિક્ર',
    lifetimeCount: 'તમામ સત્રોની આજીવન ગણતરી',
    total: 'કુલ',
    resetCounter: 'કાઉન્ટર રીસેટ કરો',
    resetConfirmText: 'વર્તમાન કાઉન્ટરને શૂન્ય પર રીસેટ કરવું છે?',
    cancel: 'રદ કરો',
    exitZen: '✕ ઝેન મોડમાંથી બહાર',
    goalProgress: 'લક્ષ્ય પ્રગતિ',
    goal: 'લક્ષ્ય',
    prev: 'પાછળ',
    next: 'આગળ',
    skip: 'છોડો',
  },
  hi: {
    set: 'सेट',
    lock: 'लॉक',
    locked: 'लॉक किया गया',
    sunnahChainOn: '⛓ सुन्नत श्रृंखला: चालू',
    sunnahChainMode: '⛓ सुन्नत श्रृंखला मोड',
    setOfTarget: 'सेट {step} / ६ • लक्ष्य {target}',
    dhikrOfChange: 'ज़िक्र {current} / {total} • बदलें',
    tapToCount: 'गिनने के लिए टैप करें',
    reset: 'रीसेट',
    auto: 'ऑटो',
    sound: 'आवाज़',
    vibrate: 'कंपन',
    mute: 'मूक',
    totalDhikrRecorded: 'कुल दर्ज अज़कार',
    lifetimeCount: 'सभी सत्रों की कुल गिनती',
    total: 'कुल',
    resetCounter: 'काउंटर रीसेट करें',
    resetConfirmText: 'क्या आप वर्तमान काउंटर को शून्य करना चाहते हैं?',
    cancel: 'रद्द करें',
    exitZen: '✕ ज़ेन मोड से बाहर',
    goalProgress: 'लक्ष्य प्रगति',
    goal: 'लक्ष्य',
    prev: 'पिछला',
    next: 'अगला',
    skip: 'छोड़ें',
  },
  bn: {
    set: 'সেট',
    lock: 'লক',
    locked: 'লক করা',
    sunnahChainOn: '⛓ সুন্নাহ ধারা: চালু',
    sunnahChainMode: '⛓ সুন্নাহ ধারা মোড',
    setOfTarget: 'সেট {step}/৬ • লক্ষ্য {target}',
    dhikrOfChange: 'জিকির {current}/{total} • পরিবর্তন',
    tapToCount: 'গণনা করতে স্পর্শ করুন',
    reset: 'রিসেট',
    auto: 'স্বয়ংক্রিয়',
    sound: 'শব্দ',
    vibrate: 'কম্পন',
    mute: 'নীরব',
    totalDhikrRecorded: 'মোট জিকির রেকর্ড',
    lifetimeCount: 'সকল সেশনের আজীবন গণনা',
    total: 'মোট',
    resetCounter: 'কাউন্টার রিসেট করুন',
    resetConfirmText: 'বর্তমান কাউন্টার শূন্য করতে চান?',
    cancel: 'বাতিল',
    exitZen: '✕ জেন মোড ত্যাগ',
    goalProgress: 'লক্ষ্য অগ্রগতি',
    goal: 'লক্ষ্য',
    prev: 'পূর্ববর্তী',
    next: 'পরবর্তী',
    skip: 'এড়িয়ে যান',
  },
  ru: {
    set: 'Сет',
    lock: 'Блок',
    locked: 'Заблокир.',
    sunnahChainOn: '⛓ Цепь Сунны: ВКЛ',
    sunnahChainMode: '⛓ Режим Цепи Сунны',
    setOfTarget: 'Сет {step} из 6 • Цель {target}',
    dhikrOfChange: 'Зикр {current} из {total} • Сменить',
    tapToCount: 'НАЖМИТЕ ДЛЯ СЧЁТА',
    reset: 'Сброс',
    auto: 'Авто',
    sound: 'Звук',
    vibrate: 'Вибро',
    mute: 'Без звука',
    totalDhikrRecorded: 'Всего зикров записано',
    lifetimeCount: 'Общий счёт за всё время',
    total: 'Всего',
    resetCounter: 'Сбросить счётчик',
    resetConfirmText: 'Сбросить текущий счётчик на 0?',
    cancel: 'Отмена',
    exitZen: '✕ Выйти из Дзен',
    goalProgress: 'Прогресс цели',
    goal: 'ЦЕЛЬ',
    prev: 'Назад',
    next: 'Далее',
    skip: 'Пропуск',
  },
  fr: {
    set: 'Série',
    lock: 'Verrou',
    locked: 'Verrouillé',
    sunnahChainOn: '⛓ Chaîne Sunnah : ACTIVÉE',
    sunnahChainMode: '⛓ Mode Chaîne Sunnah',
    setOfTarget: 'Série {step} sur 6 • Cible {target}',
    dhikrOfChange: 'Dhikr {current} sur {total} • Changer',
    tapToCount: 'TOUCHER POUR COMPTER',
    reset: 'Réinit.',
    auto: 'Auto',
    sound: 'Son',
    vibrate: 'Vibreur',
    mute: 'Muet',
    totalDhikrRecorded: 'Total Dhikr Enregistré',
    lifetimeCount: 'Compte cumulé des sessions',
    total: 'Total',
    resetCounter: 'Réinitialiser le compteur',
    resetConfirmText: 'Remettre le compteur à 0 ?',
    cancel: 'Annuler',
    exitZen: '✕ Quitter le mode Zen',
    goalProgress: 'Progression de l’objectif',
    goal: 'OBJECTIF',
    prev: 'Préc.',
    next: 'Suiv.',
    skip: 'Passer',
  },
};

export const REVELATION_TYPE_I18N: Record<
  LanguageCode,
  { meccan: string; medinan: string }
> = {
  en: { meccan: 'MECCAN', medinan: 'MEDINAN' },
  ar: { meccan: 'مكية', medinan: 'مدنية' },
  ur: { meccan: 'مکی', medinan: 'مدنی' },
  gu: { meccan: 'મક્કી', medinan: 'મદની' },
  hi: { meccan: 'मक्की', medinan: 'मदनी' },
  bn: { meccan: 'মাক্কী', medinan: 'মাদানী' },
  ru: { meccan: 'МЕККАНСКАЯ', medinan: 'МЕДИНСКАЯ' },
  fr: { meccan: 'MECQUOISE', medinan: 'MÉDINOISE' },
};

export const SERVICES_TOOLS_BANNER_I18N: Record<LanguageCode, string> = {
  en: 'Noor Connect • 17 Spiritual Tools',
  ar: 'نور كونكت • ١٧ أداة روحانية',
  ur: 'نور کنیکٹ • ۱۷ روحانی ٹولز',
  gu: 'નૂર કનેક્ટ • ૧૭ આધ્યાત્મિક સાધનો',
  hi: 'नूर कनेक्ट • १७ आध्यात्मिक साधन',
  bn: 'নূর কানেক্ট • ১৭টি আধ্যাত্মিক সরঞ্জাম',
  ru: 'Noor Connect • 17 духовных инструментов',
  fr: 'Noor Connect • 17 outils spirituels',
};
