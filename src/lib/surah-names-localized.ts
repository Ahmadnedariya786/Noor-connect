// Noor Connect — Localized Surah Names Mapping
// Supports full native script localization across English, Urdu, Gujarati & Hindi (all 114 Surahs)

export interface LocalizedSurahNames {
  en: string;
  ur: string;
  gu: string;
  hi: string;
}

export const SURAH_LOCALIZED_NAMES: Record<number, LocalizedSurahNames> = {
  1: { en: "Al-Fatiha", ur: "الفاتحہ", gu: "અલ-ફાતિહા", hi: "अल-फ़ातिहा" },
  2: { en: "Al-Baqarah", ur: "البقرہ", gu: "અલ-બકરહ", hi: "अल-बक़रह" },
  3: { en: "Ali 'Imran", ur: "آل عمران", gu: "આલે ઇમરાન", hi: "आल-इमरान" },
  4: { en: "An-Nisa", ur: "النساء", gu: "અન-નિસા", hi: "अन-निसा" },
  5: { en: "Al-Ma'idah", ur: "المائدہ", gu: "અલ-માઇદાહ", hi: "अल-माइदा" },
  6: { en: "Al-An'am", ur: "الانعام", gu: "અલ-અનઆમ", hi: "अल-अनआम" },
  7: { en: "Al-A'raf", ur: "الاعراف", gu: "અલ-અઅરાફ", hi: "अल-अअराफ़" },
  8: { en: "Al-Anfal", ur: "الانفال", gu: "અલ-અનફાલ", hi: "अल-अनफाल" },
  9: { en: "At-Tawbah", ur: "التوبہ", gu: "અત-તૌબાહ", hi: "अत-तौबा" },
  10: { en: "Yunus", ur: "یونس", gu: "યૂનુસ", hi: "यूनुस" },
  11: { en: "Hud", ur: "ہود", gu: "હૂદ", hi: "हूद" },
  12: { en: "Yusuf", ur: "یوسف", gu: "યૂસુફ", hi: "यूसुफ़" },
  13: { en: "Ar-Ra'd", ur: "الرعد", gu: "અર-રઅદ", hi: "अर-रअद" },
  14: { en: "Ibrahim", ur: "ابراہیم", gu: "ઇબ્રાહીમ", hi: "इब्राहीम" },
  15: { en: "Al-Hijr", ur: "الحجر", gu: "અલ-હિજ્ર", hi: "अल-हिज्र" },
  16: { en: "An-Nahl", ur: "النحل", gu: "અન-નહલ", hi: "अन-नहल" },
  17: { en: "Al-Isra", ur: "الاسراء", gu: "અલ-ઇસરા", hi: "अल-इसरा" },
  18: { en: "Al-Kahf", ur: "الکہف", gu: "અલ-કહફ", hi: "अल-कहफ़" },
  19: { en: "Maryam", ur: "مریم", gu: "મરયમ", hi: "मरयम" },
  20: { en: "Ta-Ha", ur: "طٰہٰ", gu: "તા-હા", hi: "ता-हा" },
  21: { en: "Al-Anbiya", ur: "الانبیاء", gu: "અલ-અમ્બિયા", hi: "अल-अंबिया" },
  22: { en: "Al-Hajj", ur: "الحج", gu: "અલ-હજ", hi: "अल-હज्ज" },
  23: { en: "Al-Mu'minun", ur: "المؤمنون", gu: "અલ-મુમિનૂન", hi: "अल-मोमिनून" },
  24: { en: "An-Nur", ur: "النور", gu: "અન-નૂર", hi: "अन-नूर" },
  25: { en: "Al-Furqan", ur: "الفرقان", gu: "અલ-ફુરકાન", hi: "अल-फ़ुरक़ान" },
  26: { en: "Ash-Shu'ara", ur: "الشعراء", gu: "અશ-શુઅરા", hi: "अश-शुअरा" },
  27: { en: "An-Naml", ur: "النمل", gu: "અન-નમ્લ", hi: "अन-नम्ल" },
  28: { en: "Al-Qasas", ur: "القصص", gu: "અલ-કસસ", hi: "अल-क़सस" },
  29: { en: "Al-Ankabut", ur: "العنکبوت", gu: "અલ-અનકબૂત", hi: "अल-अन्कबूत" },
  30: { en: "Ar-Rum", ur: "الروم", gu: "અર-રૂમ", hi: "अर-रूम" },
  31: { en: "Luqman", ur: "لقمان", gu: "લુકમાન", hi: "लुक़मान" },
  32: { en: "As-Sajdah", ur: "السجدہ", gu: "અસ-સજદહ", hi: "अस-सजदा" },
  33: { en: "Al-Ahzab", ur: "الاحزاب", gu: "અલ-અહઝાબ", hi: "अल-अहज़ाब" },
  34: { en: "Saba", ur: "سبا", gu: "સબા", hi: "सबा" },
  35: { en: "Fatir", ur: "فاطر", gu: "ફાતિર", hi: "फ़ातिर" },
  36: { en: "Ya-Sin", ur: "یٰس", gu: "યાસીન", hi: "या-सीन" },
  37: { en: "As-Saffat", ur: "الصافات", gu: "અસ-સાફ્ફાત", hi: "अस-साफ़्ફात" },
  38: { en: "Sad", ur: "ص", gu: "સાદ", hi: "साद" },
  39: { en: "Az-Zumar", ur: "الزمر", gu: "અઝ-ઝુમર", hi: "अज़-ज़ुमर" },
  40: { en: "Ghafir", ur: "غافر", gu: "ગાફિર", hi: "ग़ाफ़िर" },
  41: { en: "Fussilat", ur: "فصلت", gu: "ફુસ્સિલત", hi: "फ़ुस्सिलात" },
  42: { en: "Ash-Shura", ur: "الشوریٰ", gu: "અશ-શૂરા", hi: "अश-શૂરા" },
  43: { en: "Az-Zukhruf", ur: "الزخرف", gu: "અઝ-ઝુખરૂફ", hi: "अज़-ज़ुख़रुफ़" },
  44: { en: "Ad-Dukhan", ur: "الدخان", gu: "અદ-દુખાન", hi: "अद-दुख़ान" },
  45: { en: "Al-Jathiyah", ur: "الجاثیہ", gu: "અલ-જાસિયાહ", hi: "अल-जासिया" },
  46: { en: "Al-Ahqaf", ur: "الاحقاف", gu: "અલ-અહકાફ", hi: "अल-अहक़ाफ़" },
  47: { en: "Muhammad", ur: "محمد", gu: "મુહમ્મદ", hi: "मुहम्मद" },
  48: { en: "Al-Fath", ur: "الفتح", gu: "અલ-ફતહ", hi: "अल-फ़तह" },
  49: { en: "Al-Hujurat", ur: "الحجرات", gu: "અલ-હુજુરાત", hi: "अल-हुजुरात" },
  50: { en: "Qaf", ur: "ق", gu: "કાફ", hi: "क़ाफ़" },
  51: { en: "Adh-Dhariyat", ur: "الذاریات", gu: "અઝ-ઝારિયાત", hi: "अज़-ज़ारियात" },
  52: { en: "At-Tur", ur: "الطور", gu: "અત-તૂર", hi: "अत-तूर" },
  53: { en: "An-Najm", ur: "النجم", gu: "અન-નજ્મ", hi: "अन-नज्म" },
  54: { en: "Al-Qamar", ur: "القمر", gu: "અલ-કમર", hi: "अल-क़मर" },
  55: { en: "Ar-Rahman", ur: "الرحمن", gu: "અર-રહમાન", hi: "अर-रहमान" },
  56: { en: "Al-Waqi'ah", ur: "الواقعہ", gu: "અલ-વાકિઅહ", hi: "अल-वाक़िआ" },
  57: { en: "Al-Hadid", ur: "الحدید", gu: "અલ-હદીદ", hi: "अल-हदीद" },
  58: { en: "Al-Mujadilah", ur: "المجادلہ", gu: "અલ-મુજાદિલાહ", hi: "अल-मुजादिला" },
  59: { en: "Al-Hashr", ur: "الحشر", gu: "અલ-હશ્ર", hi: "अल-हश्र" },
  60: { en: "Al-Mumtahanah", ur: "الممتحنہ", gu: "અલ-મુમ્તહિનાહ", hi: "अल-मुम्तहिना" },
  61: { en: "As-Saff", ur: "الصف", gu: "અસ-સફ", hi: "अस-सफ़" },
  62: { en: "Al-Jumu'ah", ur: "الجمعہ", gu: "અલ-જુમુઅહ", hi: "अल-जुमुआ" },
  63: { en: "Al-Munafiqun", ur: "المنافقون", gu: "અલ-મુનાફિકૂન", hi: "अल-मुनाफ़िक़ून" },
  64: { en: "At-Taghabun", ur: "التغابن", gu: "અત-તગાબુન", hi: "अत-तग़ाबुन" },
  65: { en: "At-Talaq", ur: "الطلاق", gu: "અત-તલાક", hi: "अत-तलाक़" },
  66: { en: "At-Tahrim", ur: "التحریم", gu: "અત-તહરીમ", hi: "अत-तहरीम" },
  67: { en: "Al-Mulk", ur: "الملک", gu: "અલ-મુલ્ક", hi: "अल-मुल्क" },
  68: { en: "Al-Qalam", ur: "القلم", gu: "અલ-કલમ", hi: "अल-क़लम" },
  69: { en: "Al-Haqqah", ur: "الحاقہ", gu: "અલ-હાક્કાહ", hi: "अल-हाक़्क़ा" },
  70: { en: "Al-Ma'arij", ur: "المعارج", gu: "અલ-મઆરિજ", hi: "अल-मआरिज" },
  71: { en: "Nuh", ur: "نوح", gu: "નૂહ", hi: "नूह" },
  72: { en: "Al-Jinn", ur: "الجن", gu: "અલ-જિન્ન", hi: "अल-जिन्न" },
  73: { en: "Al-Muzzammil", ur: "المزمل", gu: "અલ-મુઝ્ઝમ્મિલ", hi: "अल-मुज़म्मिल" },
  74: { en: "Al-Muddaththir", ur: "المدثر", gu: "અલ-મુદ્દસ્સિર", hi: "अल-मुद्दस्सिर" },
  75: { en: "Al-Qiyamah", ur: "القیامہ", gu: "અલ-કિયામાહ", hi: "अल-क़ियामा" },
  76: { en: "Al-Insan", ur: "الانسان", gu: "અલ-ઇન્સાન", hi: "अल-इंसान" },
  77: { en: "Al-Mursalat", ur: "المرسلات", gu: "અલ-મુર્સલાત", hi: "अल-मुर्सलात" },
  78: { en: "An-Naba", ur: "النباء", gu: "અન-નબા", hi: "अन-नबा" },
  79: { en: "An-Nazi'at", ur: "النازعات", gu: "અન-નાઝિઆત", hi: "अन-नाज़િઆત" },
  80: { en: "'Abasa", ur: "عبس", gu: "અબસ", hi: "अबस" },
  81: { en: "At-Takwir", ur: "التکویر", gu: "અત-તકવીર", hi: "अत-तकवीर" },
  82: { en: "Al-Infitar", ur: "الانفطار", gu: "અલ-ઇન્ફિતાર", hi: "अल-इन्फ़ितार" },
  83: { en: "Al-Mutaffifin", ur: "المطففین", gu: "અલ-મુતફ્ફિફીન", hi: "अल-मुतफ़्फ़िफ़ीन" },
  84: { en: "Al-Inshiqaq", ur: "الانشقاق", gu: "અલ-ઇન્શિકાક", hi: "अल-इन्शिक़ाक़" },
  85: { en: "Al-Buruj", ur: "البروج", gu: "અલ-બુરુજ", hi: "अल-बुरुज" },
  86: { en: "At-Tariq", ur: "الطارق", gu: "અત-તારિક", hi: "अत-तारिक़" },
  87: { en: "Al-A'la", ur: "الاعلیٰ", gu: "અલ-અઅલા", hi: "अल-अअला" },
  88: { en: "Al-Ghashiyah", ur: "الغاشیہ", gu: "અલ-ગાશિયાહ", hi: "अल-ग़ाशिया" },
  89: { en: "Al-Fajr", ur: "الفجر", gu: "અલ-ફજ્ર", hi: "अल-फ़ज्र" },
  90: { en: "Al-Balad", ur: "البلد", gu: "અલ-બલદ", hi: "अल-बलद" },
  91: { en: "Ash-Shams", ur: "الشمس", gu: "અશ-શમ્સ", hi: "अश-शम्स" },
  92: { en: "Al-Layl", ur: "اللیل", gu: "અલ-લયલ", hi: "अल-लैल" },
  93: { en: "Ad-Duha", ur: "الضحیٰ", gu: "અદ-દુહા", hi: "अद-दुहा" },
  94: { en: "Ash-Sharh", ur: "الشرح", gu: "અશ-શર્હ", hi: "अश-शर्ह" },
  95: { en: "At-Tin", ur: "التین", gu: "અત-તીન", hi: "अत-तीन" },
  96: { en: "Al-'Alaq", ur: "العلق", gu: "અલ-અલક", hi: "अल-अलक़" },
  97: { en: "Al-Qadr", ur: "القدر", gu: "અલ-કદર", hi: "अल-क़द्र" },
  98: { en: "Al-Bayyinah", ur: "البینہ", gu: "અલ-બય્યિનાહ", hi: "अल-बय्यिना" },
  99: { en: "Az-Zalzalah", ur: "الزلزلہ", gu: "અઝ-ઝલઝલાહ", hi: "अज़-ज़लज़ला" },
  100: { en: "Al-'Adiyat", ur: "العادیات", gu: "અલ-આદિયાત", hi: "अल-आदियात" },
  101: { en: "Al-Qari'ah", ur: "القارئہ", gu: "અલ-કારિઅહ", hi: "अल-क़ारिआ" },
  102: { en: "At-Takathur", ur: "التکاثر", gu: "અત-તકાસુર", hi: "अत-તકાસુર" },
  103: { en: "Al-'Asr", ur: "العصر", gu: "અલ-અસ્ર", hi: "अल-असर" },
  104: { en: "Al-Humazah", ur: "الہمزہ", gu: "અલ-હુમઝહ", hi: "अल-हुमज़ा" },
  105: { en: "Al-Fil", ur: "الفیل", gu: "અલ-ફીલ", hi: "अल-फ़ील" },
  106: { en: "Quraysh", ur: "قریش", gu: "કુરૈશ", hi: "क़ुरैश" },
  107: { en: "Al-Ma'un", ur: "الماعون", gu: "અલ-માઉન", hi: "अल-माऊन" },
  108: { en: "Al-Kawthar", ur: "الکوثر", gu: "અલ-કૌસર", hi: "अल-कौसर" },
  109: { en: "Al-Kafirun", ur: "الکافرون", gu: "અલ-કાફિરૂન", hi: "अल-काफ़िरून" },
  110: { en: "An-Nasr", ur: "النصر", gu: "અન-નસ્ર", hi: "अन-नस्र" },
  111: { en: "Al-Masad", ur: "المسد", gu: "અલ-મસદ", hi: "अल-मसद" },
  112: { en: "Al-Ikhlas", ur: "الاخلاص", gu: "અલ-ઇખ્લાસ", hi: "अल-इख़्लास" },
  113: { en: "Al-Falaq", ur: "الفلق", gu: "અલ-ફલક", hi: "अल-फ़लक़" },
  114: { en: "An-Nas", ur: "الناس", gu: "અન-નાસ", hi: "अन-नास" },
};

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Pre-computed normalized name lookup table to Surah number
const NAME_TO_SURAH_NUMBER: Record<string, number> = {};
Object.entries(SURAH_LOCALIZED_NAMES).forEach(([numStr, info]) => {
  const num = Number(numStr);
  NAME_TO_SURAH_NUMBER[normalizeKey(info.en)] = num;
});

// Common alternative aliases
const SURAH_ALIASES: Record<string, number> = {
  fatiha: 1,
  fatihah: 1,
  alfatihah: 1,
  baqara: 2,
  albaqara: 2,
  baqarah: 2,
  imran: 3,
  aliimran: 3,
  alimran: 3,
  almaidah: 5,
  talaq: 65,
  attalaq: 65,
  sharh: 94,
  ashsharh: 94,
  inshirah: 94,
  rad: 13,
  arrad: 13,
  dhariyat: 51,
  adhdhariyat: 51,
  yasin: 36,
  yaseen: 36,
  rahman: 55,
  arrahman: 55,
  mulk: 67,
  almulk: 67,
  kahf: 18,
  alkahf: 18,
  ikhlas: 112,
  alikhlas: 112,
  falaq: 113,
  alfalaq: 113,
  nas: 114,
  annas: 114,
  waqiah: 56,
  alwaqiah: 56,
  tawbah: 9,
  attawbah: 9,
  tawba: 9,
};

/**
 * Resolves a localized Surah name across Urdu, Gujarati, Hindi, or English.
 * Safely accepts either a Surah number (1-114) or any English Surah name string.
 */
export function getLocalizedSurahName(
  surah: number | string | undefined | null,
  lang: 'en' | 'ur' | 'gu' | 'hi' | string
): string {
  if (!surah) return '';

  let surahNum: number | undefined;

  if (typeof surah === 'number' && surah >= 1 && surah <= 114) {
    surahNum = surah;
  } else if (typeof surah === 'string') {
    const parsedNum = parseInt(surah, 10);
    if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 114) {
      surahNum = parsedNum;
    } else {
      const key = normalizeKey(surah);
      surahNum = SURAH_ALIASES[key] ?? NAME_TO_SURAH_NUMBER[key];
    }
  }

  if (surahNum && SURAH_LOCALIZED_NAMES[surahNum]) {
    const info = SURAH_LOCALIZED_NAMES[surahNum];
    if (lang === 'ur') return info.ur;
    if (lang === 'gu') return info.gu;
    if (lang === 'hi') return info.hi;
    return info.en;
  }

  // Graceful fallback to input string
  return typeof surah === 'string' ? surah : String(surah);
}
