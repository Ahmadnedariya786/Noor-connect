/**
 * Noor Connect — Quran Guide & Quran UI Multi-Language Translations
 * Complete, natural, idiomatic localization across all 8 app languages:
 * en (English), ur (اردو), gu (ગુજરાતી), ar (العربية), hi (हिन्दी), bn (বাংলা), ru (Русский), fr (Français)
 */

import type { LanguageCode } from './language-config';

export interface QuranGuideCard {
  id: 'wbw' | 'tafsir' | 'hifz' | 'modes' | 'khatmah';
  badge: string;
  title: string;
  description: string;
  tip: string;
}

export interface QuranGuideData {
  title: string;
  subtitle: string;
  stepPrefix: string;
  stepSuffix?: string;
  cards: QuranGuideCard[];
  footer: string;
  footerHighlight: string;
  gotIt: string;
}

export interface QuranUIStrings {
  welcomeBannerTitle: string;
  welcomeBannerDesc: string;
  seeHow: string;
  guideBtn: string;
  studyBtn: string;
  quranBack: string;
  page: string;
  juz: string;
  subToolbarHint: {
    tapWord: string;
    meaning: string;
    tapMedallion: string;
    tafsir: string;
  };
  autoPageOn: string;
  syncAudio: string;
  subtitleStats: string;
  continueReading: string;
  resume: string;
  khatmah: string;
  startPlan: string;
  tilawah: string;
  tilawahSub: string;
  oftenRead: string;
  searchPlaceholder: string;
  jump: string;
  surahsTab: string;
  juzTab: string;
  savedTab: string;
  all: string;
  meccan: string;
  medinan: string;
  verseOfTheDay: string;
  readInSurah: string;
  study: string;
  jewel: string;
  paper: string;
  night: string;
  scan: string;
  tajweed: string;
  prev: string;
  next: string;
  ayahs: string;
}

export interface AppearanceUIStrings {
  language: string;
  appThemeTitle: string;
  appThemeSubtitle: string;
  fluidAnimationsTitle: string;
  fluidAnimationsSubtitle: string;
  salamGreetingTitle: string;
  salamGreetingSubtitle: string;
  splashWelcomeTitle: string;
  splashWelcomeSubtitle: string;
  splashScreenTitle: string;
  splashScreenSubtitle: string;
  timeFormat24Title: string;
  timeFormat24Subtitle: string;
}

const GUIDE_TRANSLATIONS: Record<LanguageCode, QuranGuideData> = {
  en: {
    title: 'Quran Features Guide',
    subtitle: 'Tap-to-learn interactive tools & smart workflows',
    stepPrefix: 'Step',
    cards: [
      {
        id: 'wbw',
        badge: 'Word Study',
        title: '👆 Word-by-Word Study & Audio',
        description: 'Tap any Arabic word on the Mushaf page to view its exact English meaning, transliteration, and root word.',
        tip: 'Tap the audio button in the popup to hear that exact word pronounced clearly by the Qari.',
      },
      {
        id: 'tafsir',
        badge: 'Tafsir & Translations',
        title: 'Tafsir & Multi-Translation',
        description: 'Tap any verse number medallion or the top Study button to open comprehensive verse study.',
        tip: "Switch between English (Sahih Int'l, Pickthall), Urdu & Hindi, plus Ibn Kathir & Ma'arif al-Qur'an Tafsirs.",
      },
      {
        id: 'hifz',
        badge: 'Hifz Engine',
        title: '🔁 Hifz (Memorization) Engine',
        description: 'Inside Study → Hifz, loop any verse or custom verse range 3× to 10× to commit it to memory.',
        tip: 'Enable Recite Pause to recite aloud after the Qari, and use the Blur Words slider to test recall.',
      },
      {
        id: 'modes',
        badge: '4 Reading Modes',
        title: '🎨 4 Reading Modes & Tajweed Colours',
        description: 'Choose your preferred Mushaf experience: Jewel (deep luxury), Paper (Madinah cream), Night (OLED black), or Scan (original print).',
        tip: 'Tap 🎨 Tajweed to color-code Ghunnah, Idgham, Qalqalah & Madd recitation rules with the interactive rules guide.',
      },
      {
        id: 'khatmah',
        badge: 'Smart Progress',
        title: '📖 Smart Khatmah & 5-Colour Auto-Bookmarks',
        description: 'Set a 30, 60, or 90-day Khatmah goal that automatically recalibrates daily targets if you read extra or miss a day.',
        tip: 'Assign 5 distinct colored bookmarks (Emerald, Ruby, Amber, etc.) with Auto-move so your ribbon advances with each page turn.',
      },
    ],
    footer: 'Available anytime via',
    footerHighlight: '? Guide',
    gotIt: 'Got It',
  },

  ur: {
    title: 'قرآن فیچرز گائیڈ',
    subtitle: 'انٹرایکٹو ٹولز اور سمارٹ ورک فلوز سیکھیں',
    stepPrefix: 'مرحلہ',
    cards: [
      {
        id: 'wbw',
        badge: 'لفظی مطالعہ',
        title: '👆 لفظ بہ لفظ مطالعہ اور آڈیو',
        description: 'مصحف کے صفحے پر کسی بھی عربی لفظ پر ٹیپ کر کے اس کا درست ترجمہ، تلفظ اور مادہ (Root Word) دیکھیں۔',
        tip: 'پاپ اپ میں آڈیو بٹن دبائیں تاکہ قاری کی آواز میں اس مخصوص لفظ کا صحیح تلفظ سن سکیں۔',
      },
      {
        id: 'tafsir',
        badge: 'تفسیر و تراجم',
        title: 'تفسیر اور کثیر تراجم',
        description: 'آیت نمبر کے نشان یا اوپر Study بٹن پر ٹیپ کر کے آیت کا جامع مطالعہ اور مستند تفسیر کھولیں۔',
        tip: 'اردو، انگریزی اور ہندی تراجم کے ساتھ ساتھ تفسیر ابن کثیر اور معارف القرآن کے درمیان آسانی سے سوئچ کریں۔',
      },
      {
        id: 'hifz',
        badge: 'حفظ انجن',
        title: '🔁 حفظ (یادداشت) انجن',
        description: 'مطالعہ Study ← Hifz میں کسی بھی آیت یا منتخب آیات کے سلسلے کو 3 سے 10 مرتبہ دہرائیں تاکہ یاد ہو جائے۔',
        tip: 'قاری کے بعد تلاوت کے لیے Recite Pause آن کریں اور یادداشت جانچنے کے لیے Blur Words سلائیڈر استعمال کریں۔',
      },
      {
        id: 'modes',
        badge: '4 تلاوت موڈز',
        title: '🎨 4 تلاوت موڈز اور تجوید کے رنگ',
        description: 'اپنا پسندیدہ مصحف منتخب کریں: جیول (شاہی حسن)، پیپر (مدینہ کریمی)، نائٹ (ڈارک اسکرین) یا اسکین (پرنٹ مصحف)۔',
        tip: 'غنہ، ادغام، قلقلہ اور مد کے قواعد کو رنگین دیکھنے اور سمجھنے کے لیے 🎨 Tajweed پر ٹیپ کریں۔',
      },
      {
        id: 'khatmah',
        badge: 'سمارٹ پیش رفت',
        title: '📖 سمارٹ ختمہ اور 5 رنگین خودکار بوک مارکس',
        description: '30، 60 یا 90 دن کا ختمہ ہدف مقرر کریں جو آگے یا پیچھے پڑھنے کی صورت میں روزانہ کا ہدف خود بخود ایڈجسٹ کرتا ہے۔',
        tip: '5 خوبصورت رنگین بوک مارکس استعمال کریں، آٹو موو کی مدد سے صفحہ پلٹنے پر بوک مارک خود بخود آگے بڑھتا ہے۔',
      },
    ],
    footer: 'کسی بھی وقت دستیاب بذریعہ',
    footerHighlight: '؟ گائیڈ',
    gotIt: 'سمجھ آ گیا',
  },

  gu: {
    title: 'કુર્આન ફીચર્સ ગાઇડ',
    subtitle: 'ઇન્ટરેક્ટિવ સાધનો અને સ્માર્ટ ફીચર્સ જાણો',
    stepPrefix: 'પગલું',
    cards: [
      {
        id: 'wbw',
        badge: 'શબ્દ અભ્યાસ',
        title: '👆 શબ્દ-દર-શબ્દ અભ્યાસ અને ઑડિયો',
        description: 'મુસ્હફ પૃષ્ઠ પર કોઈપણ અરબી શબ્દ પર ટેપ કરીને તેનો સચોટ અર્થ, ઉચ્ચાર અને મૂળ શબ્દ (Root Word) જુઓ.',
        tip: 'પૉપઅપમાં ઑડિયો બટન દબાવીને કારીના અવાજમાં તે ચોક્કસ શબ્દનો શુદ્ધ ઉચ્ચાર સાંભળો.',
      },
      {
        id: 'tafsir',
        badge: 'તફસીર અને અનુવાદ',
        title: 'તફસીર અને બહુભાષી અનુવાદ',
        description: 'કોઈપણ આયત નંબર નિશાન અથવા ટોચના Study બટન પર ટેપ કરીને ઊંડાણપૂર્વક આયત અભ્યાસ ખોલો.',
        tip: 'ગુજરાતી, ઉર્દૂ, હિન્દી અને અંગ્રેજી અનુવાદો તેમજ તફસીર ઇબ્ને કસીર વચ્ચે સરળતાથી સ્વિચ કરો.',
      },
      {
        id: 'hifz',
        badge: 'હિફ્ઝ એન્જિન',
        title: '🔁 હિફ્ઝ (કંઠસ્થ) એન્જિન',
        description: 'Study → Hifz માં કોઈપણ આયત કે પસંદ કરેલ આયતોને 3 થી 10 વાર લૂપ (પુનરાવર્તન) કરીને યાદ કરો.',
        tip: 'કારી પછી મોટેથી પઢવા Recite Pause ચાલુ કરો અને યાદશક્તિ ચકાસવા Blur Words સ્લાઇડર વાપરો.',
      },
      {
        id: 'modes',
        badge: '4 વાંચન મોડ્સ',
        title: '🎨 4 વાંચન મોડ્સ અને તજવીદ કલર્સ',
        description: 'તમારો મનપસંદ મુસ્હફ મોડ પસંદ કરો: જ્વેલ (શાહી લક્ઝરી), પેપર (મદીના ક્રીમ), નાઇટ (ડાર્ક OLED) અથવા સ્કેન (મૂળ પ્રિન્ટ).',
        tip: 'ગુન્નાહ, ઇદગામ, કલકલાહ અને મદના નિયમોને રંગીન જોવા માટે 🎨 Tajweed બટન પર ટેપ કરો.',
      },
      {
        id: 'khatmah',
        badge: 'સ્માર્ટ પ્રગતિ',
        title: '📖 સ્માર્ટ ખત્મ અને 5-કલર ઑટો-બુકમાર્ક્સ',
        description: '30, 60 કે 90 દિવસનો ખત્મ ટાર્ગેટ સેટ કરો, જે રોજ વાંચન મુજબ દૈનિક લક્ષ્ય આપમેળે ગોઠવે છે.',
        tip: '5 અલગ રંગબેરંગી બુકમાર્ક્સ વાપરો, ઑટો-મૂવ સાથે દરેક પેજ ફેરવવા પર તમારી રિબન આપોઆપ આગળ વધશે.',
      },
    ],
    footer: 'કોઈપણ સમયે ઉપલબ્ધ via',
    footerHighlight: '? ગાઇડ',
    gotIt: 'સમજાઈ ગયું',
  },

  ar: {
    title: 'دليل ميزات القرآن',
    subtitle: 'أدوات تفاعلية ذكية لتلاوة ودراسة كتاب الله',
    stepPrefix: 'الخطوة',
    cards: [
      {
        id: 'wbw',
        badge: 'معاني الكلمات',
        title: '👆 دراسة الكلمات كلمة بكلمة وصوتياً',
        description: 'اضغط على أي كلمة قرآنية في صفحة المصحف لعرض معناها الدقيق واللفظ اللاتيني وجذر الكلمة.',
        tip: 'اضغط على زر الصوت في النافذة المنبثقة للاستماع إلى النطق الصحيح للكلمة بصوت القارئ.',
      },
      {
        id: 'tafsir',
        badge: 'التفسير والتراجم',
        title: 'التفسير والتراجم المتعددة',
        description: 'اضغط على علامة رقم الآية أو زر Study في الأعلى لفتح الدراسة الشاملة للآية والتفسير المعتمد.',
        tip: 'تنقّل بسهولة بين التفاسير المعتمدة (ابن كثير ومعارف القرآن) والتراجم العالمية بعدة لغات.',
      },
      {
        id: 'hifz',
        badge: 'محرك الحفظ',
        title: '🔁 محرك الحفظ والتكرار الذكي',
        description: 'من خلال Study ← الحفظ، كرّر أي آية أو نطاق محدد من الآيات من ٣ إلى ١٠ مرات لترسيخ الحفظ.',
        tip: 'فعّل وقفة الترديد للتلاوة بعد القارئ، واستخدم ميزة إخفاء الكلمات لاختبار قوة استحضار الحفظ.',
      },
      {
        id: 'modes',
        badge: '٤ أوضاع للقراءة',
        title: '🎨 ٤ أوضاع للقراءة وألوان التجويد',
        description: 'اختر أسلوب عرض المصحف المفضل: الجوهرة (فخامة داكنة)، الورقي (كريمي مدني)، الليلي (أسود OLED)، أو المصور.',
        tip: 'اضغط على 🎨 التجويد لترميز أحكام الغنة والإدغام والقلقلة والمدود بالألوان مع دليل الأحكام التفاعلي.',
      },
      {
        id: 'khatmah',
        badge: 'المتابعة الذكية',
        title: '📖 الختمة الذكية و٥ علامات مرجعية ملونة متحركة',
        description: 'حدّد هدف ختمتك خلال ٣٠ أو ٦٠ أو ٩٠ يوماً، حيث يُعاد ضبط الورد اليومي تلقائياً إذا قرأت زيادة أو فاتك يوم.',
        tip: 'خصّص ٥ علامات مرجعية بألوان مختلفة مع ميزة التحرّك التلقائي لتتقدّم العلامة مع كل صفحة تقرؤها.',
      },
    ],
    footer: 'متاح في أي وقت عبر',
    footerHighlight: '؟ الدليل',
    gotIt: 'حسناً فهمت',
  },

  hi: {
    title: 'क़ुरआन फीचर्स गाइड',
    subtitle: 'इंटरैक्टिव टूल्स और स्मार्ट वर्कफ़्लो सीखें',
    stepPrefix: 'चरण',
    cards: [
      {
        id: 'wbw',
        badge: 'शब्द अध्ययन',
        title: '👆 शब्द-दर-शब्द अध्ययन और ऑडियो',
        description: 'मुस्हफ़ पृष्ठ पर किसी भी अरबी शब्द पर टैप करके उसका सटीक अर्थ, उच्चारण और मूल शब्द देखें।',
        tip: 'पॉपअप में ऑडियो बटन दबाकर क़ारी की आवाज़ में उस शब्द का सही उच्चारण सुनें।',
      },
      {
        id: 'tafsir',
        badge: 'तफ़सीर व अनुवाद',
        title: 'तफ़सीर और बहुभाषी अनुवाद',
        description: 'किसी भी आयत संख्या निशान या शीर्ष Study बटन पर टैप करके विस्तृत आयत अध्ययन व तफ़सीर खोलें।',
        tip: 'हिन्दी, उर्दू और अंग्रेज़ी अनुवादों के साथ-साथ तफ़सीर इब्न कसीर और मआरिफ़ुल क़ुरआन में स्विच करें।',
      },
      {
        id: 'hifz',
        badge: 'हिफ़्ज़ इंजन',
        title: '🔁 हिफ़्ज़ (कंठस्थ) इंजन',
        description: 'Study → हिफ़्ज़ में किसी भी आयत या आयत समूह को 3 से 10 बार दोहराकर याद करें।',
        tip: 'क़ारी के बाद पढ़ने के लिए Recite Pause चालू करें और याददाश्त परखने के लिए Blur Words स्लाइडर का उपयोग करें।',
      },
      {
        id: 'modes',
        badge: '4 पठन मोड',
        title: '🎨 4 पठन मोड और तजवीद रंग',
        description: 'अपना पसंदीदा मुस्हफ़ चुनें: ज्वेल (शाही लक्ज़री), पेपर (मदीना क्रीम), नाइट (डार्क OLED) या स्कैन (मूल प्रिंट)।',
        tip: 'गुन्ना, इदग़ाम, क़लक़ला और मद के नियमों को रंगों में देखने के लिए 🎨 Tajweed पर टैप करें।',
      },
      {
        id: 'khatmah',
        badge: 'स्मार्ट प्रगति',
        title: '📖 स्मार्ट ख़त्म और 5-रंगीन ऑटो-बुकमार्क्स',
        description: '30, 60 या 90 दिनों का ख़त्म लक्ष्य तय करें जो आपके दैनिक पाठ के अनुसार रोज़ाना लक्ष्य अपने-आप समायोजित करता है।',
        tip: '5 अलग रंगों के बुकमार्क इस्तेमाल करें, ऑटो-मूव के साथ हर पन्ना पलटने पर बुकमार्क आगे बढ़ता है।',
      },
    ],
    footer: 'किसी भी समय उपलब्ध via',
    footerHighlight: '? गाइड',
    gotIt: 'समझ आ गया',
  },

  bn: {
    title: 'কুরআন ফিচার গাইড',
    subtitle: 'ইন্টারেক্টিভ টুলস এবং স্মার্ট পড়ার পদ্ধতি জানুন',
    stepPrefix: 'ধাপ',
    cards: [
      {
        id: 'wbw',
        badge: 'শব্দার্থ পাঠ',
        title: '👆 শব্দে শব্দে কুরআন অধ্যয়ন ও অডিও',
        description: 'মুসহাফের যেকোনো আরবি শব্দে ট্যাপ করে তার সঠিক অর্থ, উচ্চারণ ও মূল শব্দ (Root Word) জানুন।',
        tip: 'পপআপে অডিও বাটনে চাপ দিয়ে কারীর কণ্ঠে সেই নির্দিষ্ট শব্দের বিশুদ্ধ উচ্চারণ শুনুন।',
      },
      {
        id: 'tafsir',
        badge: 'তাফসির ও অনুবাদ',
        title: 'তাফসির ও বহুভাষিক অনুবাদ',
        description: 'যেকোনো আয়াত নম্বর সংকেত অথবা উপরের Study বাটনে ট্যাপ করে আয়াতের বিস্তারিত তাফসির দেখুন।',
        tip: 'বাংলা, ইংরেজি, উর্দু অনুবাদ এবং তাফসিরে ইবনে কাসির সহজে পরিবর্তন করে পড়ুন।',
      },
      {
        id: 'hifz',
        badge: 'হিফজ ইঞ্জিন',
        title: '🔁 হিফজ (মুখস্থকরণ) ইঞ্জিন',
        description: 'Study → হিফজে যেকোনো আয়াত বা আয়াতের অংশ ৩ থেকে ১০ বার পুনরাবৃত্তি করে সহজেই মুখস্থ করুন।',
        tip: 'কারীর সাথে সাথে পড়ার জন্য Recite Pause চালু করুন এবং স্মরণশক্তি যাচাইয়ে শব্দ অস্পষ্টকরণ স্লাইডার ব্যবহার করুন।',
      },
      {
        id: 'modes',
        badge: '৪টি পাঠ মোড',
        title: '🎨 ৪টি পাঠ মোড ও তাজবিদ কালার',
        description: 'আপনার পছন্দের মুসহাফ শৈলী বেছে নিন: জুয়েল (রাজকীয়), পেপার (মদিনা ক্রিম), নাইট (কালো স্ক্রিন) বা স্ক্যান (মুদ্রিত রূপ)।',
        tip: 'গুন্নাহ, ইদগাম, কলকলাহ ও মাদের নিয়মাবলী রঙিন দেখতে 🎨 Tajweed বাটনে চাপ দিন।',
      },
      {
        id: 'khatmah',
        badge: 'স্মার্ট অগ্রগতি',
        title: '📖 স্মার্ট খতম ও ৫-রঙিন অটো-বুকমার্ক',
        description: '৩০, ৬০ বা ৯০ দিনের খতমের লক্ষ্য নির্ধারণ করুন, যা আপনার পড়ার গতি অনুযায়ী দৈনিক অংশ স্বয়ংক্রিয়ভাবে সমন্বয় করে।',
        tip: '৫টি ভিন্ন রঙের বুকমার্ক ব্যবহার করুন; অটো-মুভ চালু থাকলে পৃষ্ঠা পরিবর্তনের সাথে সাথে ফিতা এগিয়ে যাবে।',
      },
    ],
    footer: 'যেকোনো সময় উপলব্ধ via',
    footerHighlight: '? গাইড',
    gotIt: 'বুঝেছি',
  },

  ru: {
    title: 'Руководство по функциям Корана',
    subtitle: 'Интерактивные инструменты и удобные функции',
    stepPrefix: 'Шаг',
    cards: [
      {
        id: 'wbw',
        badge: 'Слова',
        title: '👆 Пословное изучение и аудио',
        description: 'Нажмите на любое арабское слово на странице Мусхафа, чтобы увидеть его значение, транскрипцию и корень.',
        tip: 'Нажмите кнопку звука во всплывающем окне, чтобы прослушать правильное произношение слова чтецом.',
      },
      {
        id: 'tafsir',
        badge: 'Тафсир',
        title: 'Тафсир и переводы смыслов',
        description: 'Нажмите на номер аята или верхнюю кнопку Study, чтобы открыть подробное толкование аята.',
        tip: 'Переключайтесь между русским переводом (Кулиев), другими языками и классическими тафсирами (Ибн Касир).',
      },
      {
        id: 'hifz',
        badge: 'Хифз',
        title: '🔁 Модуль заучивания (Хифз)',
        description: 'В разделе Study → Хифз зацикливайте чтение аята или диапазона от 3 до 10 раз для запоминания.',
        tip: 'Включите паузу для повторения за чтецом и используйте размытие слов для проверки памяти.',
      },
      {
        id: 'modes',
        badge: '4 режима',
        title: '🎨 4 режима чтения и цвета таджвида',
        description: 'Выберите оформление Мусхафа: «Драгоценность» (люкс), «Бумага» (мединский кремовый), «Ночь» (OLED) или «Скан».',
        tip: 'Нажмите 🎨 «Таджвид» для цветового выделения правил гунны, идгама, калькаля и мадда с подсказками.',
      },
      {
        id: 'khatmah',
        badge: 'Прогресс',
        title: '📖 Умный хатм и 5 цветных авто-закладок',
        description: 'Установите цель хатма на 30, 60 или 90 дней — дневная норма автоматически пересчитывается при опережении или пропуске.',
        tip: 'Используйте 5 цветных закладок с автоперемещением — лента будет двигаться вслед за перелистыванием страниц.',
      },
    ],
    footer: 'Доступно в любое время через',
    footerHighlight: '? Инфо',
    gotIt: 'Понятно',
  },

  fr: {
    title: 'Guide des fonctionnalités du Coran',
    subtitle: 'Outils interactifs et fonctionnalités d’apprentissage',
    stepPrefix: 'Étape',
    cards: [
      {
        id: 'wbw',
        badge: 'Mot à mot',
        title: '👆 Étude mot à mot et audio',
        description: 'Touchez n’importe quel mot arabe sur la page du Mushaf pour voir son sens exact, sa phonétique et sa racine.',
        tip: 'Appuyez sur le bouton audio pour écouter la prononciation exacte du mot par le récitateur.',
      },
      {
        id: 'tafsir',
        badge: 'Tafsir',
        title: 'Tafsir et traductions multiples',
        description: 'Touchez le numéro de verset ou le bouton Study pour ouvrir l’étude approfondie et le commentaire.',
        tip: 'Basculez entre les traductions en français, anglais, ainsi que les tafsirs reconnus comme Ibn Kathir.',
      },
      {
        id: 'hifz',
        badge: 'Hifz',
        title: '🔁 Moteur de mémorisation (Hifz)',
        description: 'Dans Study → Hifz, répétez n’importe quel verset ou plage de 3 à 10 fois pour le mémoriser.',
        tip: 'Activez la pause de récitation pour répéter après le récitateur et masquez les mots pour tester votre mémoire.',
      },
      {
        id: 'modes',
        badge: '4 modes',
        title: '🎨 4 modes de lecture et couleurs de Tajwid',
        description: 'Choisissez votre affichage : Joyau (luxe sombre), Papier (crème de Médine), Nuit (OLED) ou Scan (imprimé).',
        tip: 'Appuyez sur 🎨 Tajweed pour colorer les règles de Ghunnah, Idgham, Qalqalah et Madd avec le guide interactif.',
      },
      {
        id: 'khatmah',
        badge: 'Progression',
        title: '📖 Khatmah intelligente et 5 marque-pages automatiques',
        description: 'Définissez un objectif de Khatmah sur 30, 60 ou 90 jours qui recalibre automatiquement vos pages quotidiennes.',
        tip: 'Attribuez 5 marque-pages de couleurs distinctes avec déplacement automatique à chaque page tournée.',
      },
    ],
    footer: 'Disponible à tout moment via',
    footerHighlight: '? Guide',
    gotIt: 'Compris',
  },
};

const UI_STRINGS: Record<LanguageCode, QuranUIStrings> = {
  en: {
    welcomeBannerTitle: 'Explore New Quran Tools',
    welcomeBannerDesc: 'Word meaning, Hifz & Tajweed',
    seeHow: 'See How →',
    guideBtn: '? Guide',
    studyBtn: 'Study',
    quranBack: 'Quran',
    page: 'Page',
    juz: 'Juz',
    subToolbarHint: {
      tapWord: 'Tap word',
      meaning: 'Meaning',
      tapMedallion: 'Tap',
      tafsir: 'Tafsir',
    },
    autoPageOn: '🔄 Auto-Page ON',
    syncAudio: '📍 Sync Audio',
    subtitleStats: '114 Surahs • 30 Juz • 604 Pages',
    continueReading: 'Continue:',
    resume: 'Resume →',
    khatmah: 'Khatmah',
    startPlan: 'Start 30–90d Plan',
    tilawah: 'Tilawah',
    tilawahSub: '6 Reciters • Gapless',
    oftenRead: 'Sunnah Surahs',
    searchPlaceholder: 'Search Surah, Juz, Page...',
    jump: 'Jump',
    surahsTab: 'Surahs',
    juzTab: 'Juz (1–30)',
    savedTab: '★ Saved',
    all: 'All',
    meccan: 'Meccan',
    medinan: 'Medinan',
    verseOfTheDay: 'Verse of the Day',
    readInSurah: 'Read in Surah',
    study: 'Study',
    jewel: 'Jewel',
    paper: 'Paper',
    night: 'Night',
    scan: 'Scan',
    tajweed: 'Tajweed',
    prev: 'Prev',
    next: 'Next',
    ayahs: 'AYAHS',
  },
  ur: {
    welcomeBannerTitle: 'قرآن کے نئے فیچرز دریافت کریں',
    welcomeBannerDesc: 'لفظی معانی، حفظ اور تجوید',
    seeHow: 'طریقہ دیکھیں ←',
    guideBtn: '؟ گائیڈ',
    studyBtn: 'مطالعہ',
    quranBack: 'قرآن',
    page: 'صفحہ',
    juz: 'پارہ',
    subToolbarHint: {
      tapWord: 'لفظ پر ٹیپ',
      meaning: 'معنی',
      tapMedallion: 'ٹیپ',
      tafsir: 'تفسیر',
    },
    autoPageOn: '🔄 خودکار صفحہ فعال',
    syncAudio: '📍 آڈیو پر جائیں',
    subtitleStats: '۱۱۴ سورتیں • ۳۰ پارے • ۶۰۴ صفحات',
    continueReading: 'جاری رکھیں:',
    resume: 'دوبارہ شروع کریں ←',
    khatmah: 'ختمہ',
    startPlan: '۳۰–۹۰ دن کا منصوبہ شروع کریں',
    tilawah: 'تلاوت',
    tilawahSub: '۶ قاری • مسلسل تلاوت',
    oftenRead: 'مسنون سورتیں',
    searchPlaceholder: 'سورہ، پارہ، یا صفحہ تلاش کریں...',
    jump: 'چھلانگ',
    surahsTab: 'سورتیں',
    juzTab: 'پارے (۱–۳۰)',
    savedTab: '★ محفوظ شدہ',
    all: 'تمام',
    meccan: 'مکی',
    medinan: 'مدنی',
    verseOfTheDay: 'آج کی آیت',
    readInSurah: 'سورہ میں پڑھیں',
    study: 'مطالعہ',
    jewel: 'جواہر',
    paper: 'کاغذ',
    night: 'رات',
    scan: 'اسکین',
    tajweed: 'تجوید',
    prev: 'پچھلا',
    next: 'اگلا',
    ayahs: 'آیات',
  },
  gu: {
    welcomeBannerTitle: 'કુર્આનના નવા સાધનો શોધો',
    welcomeBannerDesc: 'શબ્દાર્થ, હિફ્ઝ અને તજવીદ',
    seeHow: 'જુઓ કેવી રીતે →',
    guideBtn: '? ગાઇડ',
    studyBtn: 'અભ્યાસ',
    quranBack: 'કુર્આન',
    page: 'પેજ',
    juz: 'પારો',
    subToolbarHint: {
      tapWord: 'શબ્દ પર ટેપ',
      meaning: 'અર્થ',
      tapMedallion: 'ટેપ',
      tafsir: 'તફસીર',
    },
    autoPageOn: '🔄 ઑટો-પેજ ચાલુ',
    syncAudio: '📍 ઑડિયો મેળવો',
    subtitleStats: '114 સૂરાહ • 30 જુઝ • 604 પૃષ્ઠો',
    continueReading: 'ચાલુ રાખો:',
    resume: 'આગળ વધો →',
    khatmah: 'ખતમહ',
    startPlan: '30–90 દિવસનો પ્લાન શરૂ કરો',
    tilawah: 'તિલાવત',
    tilawahSub: '6 ક્વારીઓ • અવિરત',
    oftenRead: 'સુન્નત સૂરાઓ',
    searchPlaceholder: 'સૂરાહ, જુઝ, પૃષ્ઠ શોધો...',
    jump: 'જમ્પ',
    surahsTab: 'સૂરાઓ',
    juzTab: 'જુઝ (1–30)',
    savedTab: '★ સાચવેલ',
    all: 'બધા',
    meccan: 'મક્કી',
    medinan: 'મદની',
    verseOfTheDay: 'આજની આયત',
    readInSurah: 'સૂરાહમાં વાંચો',
    study: 'અભ્યાસ',
    jewel: 'ઝવેરાત',
    paper: 'કાગળ',
    night: 'રાત્રિ',
    scan: 'સ્કેન',
    tajweed: 'તજવીદ',
    prev: 'પાછળ',
    next: 'આગળ',
    ayahs: 'આયતો',
  },
  ar: {
    welcomeBannerTitle: 'اكتشف أدوات القرآن الجديدة',
    welcomeBannerDesc: 'معاني الكلمات، الحفظ والتجويد',
    seeHow: 'تعرّف عليها ←',
    guideBtn: '؟ الدليل',
    studyBtn: 'دراسة',
    quranBack: 'القرآن',
    page: 'صفحة',
    juz: 'جزء',
    subToolbarHint: {
      tapWord: 'اضغط الكلمة',
      meaning: 'المعنى',
      tapMedallion: 'اضغط',
      tafsir: 'التفسير',
    },
    autoPageOn: '🔄 تقليب تلقائي',
    syncAudio: '📍 مزامنة التلاوة',
    subtitleStats: '١١٤ سورة • ٣٠ جزء • ٦٠٤ صفحة',
    continueReading: 'متابعة:',
    resume: 'استئناف ←',
    khatmah: 'ختمة',
    startPlan: 'ابدأ خطة ٣٠–٩٠ يوم',
    tilawah: 'تلاوة',
    tilawahSub: '٦ قراء • بدون انقطاع',
    oftenRead: 'السور المسنونة',
    searchPlaceholder: 'ابحث عن سورة، جزء، صفحة...',
    jump: 'انتقال',
    surahsTab: 'السور',
    juzTab: 'الأجزاء (١–٣٠)',
    savedTab: '★ المحفوظات',
    all: 'الكل',
    meccan: 'مكية',
    medinan: 'مدنية',
    verseOfTheDay: 'آية اليوم',
    readInSurah: 'اقرأ في السورة',
    study: 'دراسة',
    jewel: 'جوهر',
    paper: 'ورق',
    night: 'ليلي',
    scan: 'مسح',
    tajweed: 'تجويد',
    prev: 'السابق',
    next: 'التالي',
    ayahs: 'آيات',
  },
  hi: {
    welcomeBannerTitle: 'क़ुरआन के नए टूल्स जानें',
    welcomeBannerDesc: 'शब्दार्थ, हिफ़्ज़ और तजवीद',
    seeHow: 'देखें कैसे →',
    guideBtn: '? गाइड',
    studyBtn: 'अध्ययन',
    quranBack: 'क़ुरआन',
    page: 'पृष्ठ',
    juz: 'पारा',
    subToolbarHint: {
      tapWord: 'शब्द पर टैप',
      meaning: 'अर्थ',
      tapMedallion: 'टैप',
      tafsir: 'तफ़सीर',
    },
    autoPageOn: '🔄 ऑटो-पेज चालू',
    syncAudio: '📍 ऑडियो सिंक',
    subtitleStats: '114 सूरह • 30 जुज़ • 604 पृष्ठ',
    continueReading: 'जारी रखें:',
    resume: 'आगे पढ़ें →',
    khatmah: 'खत्मह',
    startPlan: '30–90 दिन की योजना शुरू करें',
    tilawah: 'तिलावत',
    tilawahSub: '6 कारी • निरंतर',
    oftenRead: 'सुन्नत सूरतें',
    searchPlaceholder: 'सूरह, जुज़, पृष्ठ खोजें...',
    jump: 'जाएं',
    surahsTab: 'सूरह',
    juzTab: 'जुज़ (1–30)',
    savedTab: '★ सहेजे गए',
    all: 'सभी',
    meccan: 'मक्की',
    medinan: 'मदनी',
    verseOfTheDay: 'आज की आयत',
    readInSurah: 'सूरह में पढ़ें',
    study: 'अध्ययन',
    jewel: 'रत्न',
    paper: 'कागज़',
    night: 'रात्रि',
    scan: 'स्कैन',
    tajweed: 'तजवीद',
    prev: 'पिछला',
    next: 'अगला',
    ayahs: 'आयात',
  },
  bn: {
    welcomeBannerTitle: 'কুরআনের নতুন ফিচারসমূহ জানুন',
    welcomeBannerDesc: 'শব্দার্থ, হিফজ ও তাজবিদ',
    seeHow: 'কীভাবে দেখুন →',
    guideBtn: '? গাইড',
    studyBtn: 'পাঠ',
    quranBack: 'কুরআন',
    page: 'পৃষ্ঠা',
    juz: 'পারা',
    subToolbarHint: {
      tapWord: 'শব্দে ট্যাপ',
      meaning: 'অর্থ',
      tapMedallion: 'ট্যাপ',
      tafsir: 'তাফসির',
    },
    autoPageOn: '🔄 অটো-পৃষ্ঠা চালু',
    syncAudio: '📍 অডিও মিলান',
    subtitleStats: '১১৪ টি সূরা • ৩০ পারা • ৬০৪ পৃষ্ঠা',
    continueReading: 'চালিয়ে যান:',
    resume: 'পুনরায় শুরু →',
    khatmah: 'খতম',
    startPlan: '৩০–৯০ দিনের পরিকল্পনা শুরু করুন',
    tilawah: 'তিলাওয়াত',
    tilawahSub: '৬ জন ক্বারী • বিরতিহীন',
    oftenRead: 'সুন্নাত সূরাসমূহ',
    searchPlaceholder: 'সূরা, পারা, পৃষ্ঠা খুঁজুন...',
    jump: 'যান',
    surahsTab: 'সূরাসমূহ',
    juzTab: 'পারা (১–৩০)',
    savedTab: '★ সংরক্ষিত',
    all: 'সব',
    meccan: 'মাক্কী',
    medinan: 'মাদানী',
    verseOfTheDay: 'আজকের আয়াত',
    readInSurah: 'সূরা থেকে পড়ুন',
    study: 'অধ্যয়ন',
    jewel: 'রত্ন',
    paper: 'কাগজ',
    night: 'রাত',
    scan: 'স্ক্যান',
    tajweed: 'তাজবীদ',
    prev: 'পূর্ববর্তী',
    next: 'পরবর্তী',
    ayahs: 'আয়াত',
  },
  ru: {
    welcomeBannerTitle: 'Новые инструменты для Корана',
    welcomeBannerDesc: 'Значения слов, хифз и таджвид',
    seeHow: 'Подробнее →',
    guideBtn: '? Инфо',
    studyBtn: 'Учеба',
    quranBack: 'Коран',
    page: 'Стр.',
    juz: 'Джуз',
    subToolbarHint: {
      tapWord: 'Слово',
      meaning: 'перевод',
      tapMedallion: 'Нажмите',
      tafsir: 'тафсир',
    },
    autoPageOn: '🔄 Авто-страница ВКЛ',
    syncAudio: '📍 К аудио',
    subtitleStats: '114 сур • 30 джузов • 604 страницы',
    continueReading: 'Продолжить:',
    resume: 'Продолжить →',
    khatmah: 'Хатма',
    startPlan: 'Начать план 30–90 дней',
    tilawah: 'Тиляват',
    tilawahSub: '6 чтецов • Без пауз',
    oftenRead: 'Сунна-суры',
    searchPlaceholder: 'Поиск суры, джуза, страницы...',
    jump: 'Перейти',
    surahsTab: 'Суры',
    juzTab: 'Джузы (1–30)',
    savedTab: '★ Закладки',
    all: 'Все',
    meccan: 'Мекканские',
    medinan: 'Мединские',
    verseOfTheDay: 'Аят дня',
    readInSurah: 'Читать в суре',
    study: 'Изучение',
    jewel: 'Жемчуг',
    paper: 'Бумага',
    night: 'Ночь',
    scan: 'Скан',
    tajweed: 'Таджвид',
    prev: 'Назад',
    next: 'Вперед',
    ayahs: 'АЯТОВ',
  },
  fr: {
    welcomeBannerTitle: 'Découvrez les nouveaux outils du Coran',
    welcomeBannerDesc: 'Sens des mots, Hifz et Tajwid',
    seeHow: 'Découvrir →',
    guideBtn: '? Guide',
    studyBtn: 'Étude',
    quranBack: 'Coran',
    page: 'Page',
    juz: 'Juz',
    subToolbarHint: {
      tapWord: 'Mot',
      meaning: 'sens',
      tapMedallion: 'Touchez',
      tafsir: 'tafsir',
    },
    autoPageOn: '🔄 Auto-Page ACTIF',
    syncAudio: '📍 Sync Audio',
    subtitleStats: '114 Sourates • 30 Juz • 604 Pages',
    continueReading: 'Continuer :',
    resume: 'Reprendre →',
    khatmah: 'Khatmah',
    startPlan: 'Démarrer plan 30–90j',
    tilawah: 'Tilawah',
    tilawahSub: '6 Récitateurs • Sans pause',
    oftenRead: 'Sourates Sunnah',
    searchPlaceholder: 'Rechercher sourate, juz, page...',
    jump: 'Aller',
    surahsTab: 'Sourates',
    juzTab: 'Juz (1–30)',
    savedTab: '★ Enregistrés',
    all: 'Tous',
    meccan: 'Mecquoise',
    medinan: 'Médinoise',
    verseOfTheDay: 'Verset du Jour',
    readInSurah: 'Lire dans la sourate',
    study: 'Étude',
    jewel: 'Joyau',
    paper: 'Papier',
    night: 'Nuit',
    scan: 'Scan',
    tajweed: 'Tajweed',
    prev: 'Préc.',
    next: 'Suiv.',
    ayahs: 'VERSETS',
  },
};

const APPEARANCE_STRINGS: Record<LanguageCode, AppearanceUIStrings> = {
  en: {
    language: 'Language',
    appThemeTitle: 'App Theme',
    appThemeSubtitle: 'Choose your full-app color theme',
    fluidAnimationsTitle: 'Fluid Animations',
    fluidAnimationsSubtitle: 'Enable smooth UI transitions',
    salamGreetingTitle: 'Salam Greeting',
    salamGreetingSubtitle: 'Show daily salam on home screen',
    splashWelcomeTitle: 'Splash Welcome',
    splashWelcomeSubtitle: 'Show "Islamic Companion" on launch',
    splashScreenTitle: 'Splash Screen',
    splashScreenSubtitle: 'Enable app startup animation',
    timeFormat24Title: '24-Hour Time Format',
    timeFormat24Subtitle: 'Use 24-hour clock (17:30) instead of 12-hour AM/PM',
  },
  ur: {
    language: 'زبان',
    appThemeTitle: 'ایپ تھیم',
    appThemeSubtitle: 'اپنی پوری ایپ کا رنگ منتخب کریں',
    fluidAnimationsTitle: 'ہموار اینیمیشنز',
    fluidAnimationsSubtitle: 'ہموار انٹرفیس ٹرانزیشنز فعال کریں',
    salamGreetingTitle: 'سلام و تحیات',
    salamGreetingSubtitle: 'ہوم اسکرین پر روزانہ سلام دکھائیں',
    splashWelcomeTitle: 'ویلکم اسپلش',
    splashWelcomeSubtitle: 'ایپ کھلتے وقت "Islamic Companion" دکھائیں',
    splashScreenTitle: 'اسپلش اسکرین',
    splashScreenSubtitle: 'ایپ شروع ہونے کی اینیمیشن فعال کریں',
    timeFormat24Title: '۲۴ گھنٹے فارمیٹ',
    timeFormat24Subtitle: '۱۲ گھنٹے AM/PM کے بجائے ۲۴ گھنٹے کی گھڑی (17:30) استعمال کریں',
  },
  gu: {
    language: 'ભાષા',
    appThemeTitle: 'એપ થીમ',
    appThemeSubtitle: 'તમારી આખી એપની કલર થીમ પસંદ કરો',
    fluidAnimationsTitle: 'ફ્લુઇડ એનિમેશન',
    fluidAnimationsSubtitle: 'સરળ UI ટ્રાન્ઝિશન સક્ષમ કરો',
    salamGreetingTitle: 'સલામ અભિવાદન',
    salamGreetingSubtitle: 'હોમ સ્ક્રીન પર દૈનિક સલામ દર્શાવો',
    splashWelcomeTitle: 'સ્પ્લેશ સ્વાગત',
    splashWelcomeSubtitle: 'શરૂઆતમાં "Islamic Companion" દર્શાવો',
    splashScreenTitle: 'સ્પ્લેશ સ્ક્રીન',
    splashScreenSubtitle: 'એપ શરૂઆતનું એનિમેશન સક્ષમ કરો',
    timeFormat24Title: '24-કલાકનું સમય ફોર્મેટ',
    timeFormat24Subtitle: '12-કલાક AM/PM ને બદલે 24-કલાકની ઘડિયાળ (17:30) નો ઉપયોગ કરો',
  },
  ar: {
    language: 'اللغة',
    appThemeTitle: 'مظهر التطبيق',
    appThemeSubtitle: 'اختر نسق الألوان لجميع شاشات التطبيق',
    fluidAnimationsTitle: 'الحركات السلسة',
    fluidAnimationsSubtitle: 'تفعيل الانتقالات السلسة بين الشاشات',
    salamGreetingTitle: 'تحية السلام',
    salamGreetingSubtitle: 'إظهار تحية السلام اليومية على الشاشة الرئيسية',
    splashWelcomeTitle: 'شاشة الترحيب',
    splashWelcomeSubtitle: 'إظهار "الرفيق الإسلامي" عند تشغيل التطبيق',
    splashScreenTitle: 'شاشة البدء',
    splashScreenSubtitle: 'تفعيل حركة بدء تشغيل التطبيق',
    timeFormat24Title: 'تنسيق الوقت ٢٤ ساعة',
    timeFormat24Subtitle: 'استخدام نظام ٢٤ ساعة (١٧:٣٠) بدلاً من نظام ١٢ ساعة',
  },
  hi: {
    language: 'भाषा',
    appThemeTitle: 'ऐप थीम',
    appThemeSubtitle: 'अपनी संपूर्ण ऐप के लिए रंग थीम चुनें',
    fluidAnimationsTitle: 'सहज एनिमेशन',
    fluidAnimationsSubtitle: 'सहज इंटरफ़ेस बदलाव सक्षम करें',
    salamGreetingTitle: 'सलाम अभिवादन',
    salamGreetingSubtitle: 'होम स्क्रीन पर दैनिक सलाम दिखाएं',
    splashWelcomeTitle: 'प्रारंभिक स्वागत',
    splashWelcomeSubtitle: 'शुरू में "Islamic Companion" दिखाएं',
    splashScreenTitle: 'स्प्लैश स्क्रीन',
    splashScreenSubtitle: 'ऐप स्टार्टअप एनिमेशन सक्षम करें',
    timeFormat24Title: '24-घंटे समय प्रारूप',
    timeFormat24Subtitle: '12-घंटे AM/PM के बजाय 24-घंटे की घड़ी (17:30) का उपयोग करें',
  },
  bn: {
    language: 'ভাষা',
    appThemeTitle: 'অ্যাপের থিম',
    appThemeSubtitle: 'আপনার পুরো অ্যাপের রঙের থিম নির্বাচন করুন',
    fluidAnimationsTitle: 'সাবলীল অ্যানিমেশন',
    fluidAnimationsSubtitle: 'সহজ UI রূপান্তর সক্রিয় করুন',
    salamGreetingTitle: 'সালাম অভিবাদন',
    salamGreetingSubtitle: 'হোম স্ক্রিনে প্রতিদিনের সালাম প্রদর্শন করুন',
    splashWelcomeTitle: 'স্প্ল্যাশ স্বাগতম',
    splashWelcomeSubtitle: 'অ্যাপ খোলার সময় "Islamic Companion" দেখান',
    splashScreenTitle: 'স্প্ল্যাশ স্ক্রিন',
    splashScreenSubtitle: 'অ্যাপ স্টার্টআপ অ্যানিমেশন সক্রিয় করুন',
    timeFormat24Title: '২৪ ঘণ্টার সময় বিন্যাস',
    timeFormat24Subtitle: '১২-ঘণ্টা AM/PM এর পরিবর্তে ২৪-ঘণ্টা ঘড়ি (17:30) ব্যবহার করুন',
  },
  ru: {
    language: 'Язык',
    appThemeTitle: 'Тема приложения',
    appThemeSubtitle: 'Выберите цветовую тему оформления приложения',
    fluidAnimationsTitle: 'Плавные анимации',
    fluidAnimationsSubtitle: 'Включить плавные переходы интерфейса',
    salamGreetingTitle: 'Приветствие Салам',
    salamGreetingSubtitle: 'Показывать ежедневное приветствие на главном экране',
    splashWelcomeTitle: 'Приветственный экран',
    splashWelcomeSubtitle: 'Показывать "Исламский спутник" при запуске',
    splashScreenTitle: 'Заставка запуска',
    splashScreenSubtitle: 'Включить анимацию запуска приложения',
    timeFormat24Title: '24-часовой формат времени',
    timeFormat24Subtitle: 'Использовать 24-часовой формат (17:30) вместо 12-часового AM/PM',
  },
  fr: {
    language: 'Langue',
    appThemeTitle: "Thème de l'application",
    appThemeSubtitle: "Choisissez le thème de couleur de l'application",
    fluidAnimationsTitle: 'Animations fluides',
    fluidAnimationsSubtitle: "Activer les transitions fluides de l'interface",
    salamGreetingTitle: 'Salutations de Salam',
    salamGreetingSubtitle: "Afficher le salam quotidien sur l'écran d'accueil",
    splashWelcomeTitle: 'Accueil Splash',
    splashWelcomeSubtitle: 'Afficher "Compagnon Islamique" au lancement',
    splashScreenTitle: 'Écran de démarrage',
    splashScreenSubtitle: "Activer l'animation de démarrage",
    timeFormat24Title: "Format de l'heure 24h",
    timeFormat24Subtitle: "Utiliser le format 24h (17:30) au lieu de 12h AM/PM",
  },
};

export function getQuranGuideData(lang: LanguageCode | string | undefined): QuranGuideData {
  if (lang && lang in GUIDE_TRANSLATIONS) {
    return GUIDE_TRANSLATIONS[lang as LanguageCode];
  }
  return GUIDE_TRANSLATIONS.en;
}

export function getQuranUIStrings(lang: LanguageCode | string | undefined): QuranUIStrings {
  if (lang && lang in UI_STRINGS) {
    return UI_STRINGS[lang as LanguageCode];
  }
  return UI_STRINGS.en;
}

export function getAppearanceUIStrings(lang: LanguageCode | string | undefined): AppearanceUIStrings {
  if (lang && lang in APPEARANCE_STRINGS) {
    return APPEARANCE_STRINGS[lang as LanguageCode];
  }
  return APPEARANCE_STRINGS.en;
}

export function formatStepBadge(stepIdx: number, lang: LanguageCode | string | undefined): string {
  const guide = getQuranGuideData(lang);
  const arabicNumerals = ['١', '٢', '٣', '٤', '٥'];
  const bengaliNumerals = ['১', '২', '৩', '৪', '৫'];

  if (lang === 'ur' || lang === 'ar') {
    const num = arabicNumerals[stepIdx] || String(stepIdx + 1);
    return `${guide.stepPrefix} ${num}`;
  }
  if (lang === 'bn') {
    const num = bengaliNumerals[stepIdx] || String(stepIdx + 1);
    return `${guide.stepPrefix} ${num}`;
  }
  return `${guide.stepPrefix} ${stepIdx + 1}`;
}
