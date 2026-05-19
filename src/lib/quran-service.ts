// Quran Service using quran-json CDN data source
// Provides complete Quran data with translations via jsdelivr CDN (no CORS issues)

const CDN_BASE_URL = "https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist";

// Cache configuration
const CACHE_PREFIX = "quran-service-";
const CACHE_VERSION = "2.0";
const DEFAULT_TTL = 90 * 24 * 60 * 60 * 1000; // 90 days for static Quran text (was 7 days)
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB limit

// TypeScript interfaces for quran-json data structure
export interface QuranVerse {
  id: number;
  text: string;
  translation?: string;
}

export interface QuranSurah {
  id: number;
  name: string;
  transliteration: string;
  translation: string;
  type: "meccan" | "medinan";
  total_verses: number;
  verses: QuranVerse[];
}

// Legacy interface for backward compatibility
export interface Ayah {
  number: number;
  text: string;
  numberInSurah?: number;
  translation?: string;
}

// Legacy interface for backward compatibility
export interface SurahData {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
  ayahs: Ayah[];
}

export interface SurahInfo {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: "Meccan" | "Medinan";
}

// Translation/edition info
export interface QuranEdition {
  id: string;
  name: string;
  author: string;
  language: string;
  languageCode: string;
  direction: "ltr" | "rtl";
  comments?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

// Available translations from quran-json
const AVAILABLE_EDITIONS: QuranEdition[] = [
  {
    id: "ara",
    name: "Quran (Arabic)",
    author: "Uthmani Script",
    language: "Arabic",
    languageCode: "ar",
    direction: "rtl"
  },
  {
    id: "en",
    name: "English",
    author: "Sahih International",
    language: "English",
    languageCode: "en",
    direction: "ltr"
  },
  {
    id: "en-yusufali",
    name: "English (Yusuf Ali)",
    author: "Abdullah Yusuf Ali",
    language: "English",
    languageCode: "en",
    direction: "ltr"
  },
  {
    id: "en-pickthall",
    name: "English (Pickthall)",
    author: "Mohammed Marmaduke Pickthall",
    language: "English",
    languageCode: "en",
    direction: "ltr"
  },
  {
    id: "fr",
    name: "French",
    author: "Hamidullah",
    language: "French",
    languageCode: "fr",
    direction: "ltr"
  },
  {
    id: "de",
    name: "German",
    author: "Bubenheim",
    language: "German",
    languageCode: "de",
    direction: "ltr"
  },
  {
    id: "es",
    name: "Spanish",
    author: "Cortes",
    language: "Spanish",
    languageCode: "es",
    direction: "ltr"
  },
  {
    id: "id",
    name: "Indonesian",
    author: "Indonesian Ministry of Religious Affairs",
    language: "Indonesian",
    languageCode: "id",
    direction: "ltr"
  },
  {
    id: "tr",
    name: "Turkish",
    author: "Diyanet",
    language: "Turkish",
    languageCode: "tr",
    direction: "ltr"
  },
  {
    id: "ur",
    name: "Urdu",
    author: "Maulana Muhammad Junagarhi",
    language: "Urdu",
    languageCode: "ur",
    direction: "rtl"
  },
  {
    id: "hi",
    name: "Hindi",
    author: "Suhel Farooq Khan",
    language: "Hindi",
    languageCode: "hi",
    direction: "ltr"
  },
  {
    id: "bn",
    name: "Bengali",
    author: "Muhiuddin Khan",
    language: "Bengali",
    languageCode: "bn",
    direction: "ltr"
  },
  {
    id: "ru",
    name: "Russian",
    author: "Elmir Kuliev",
    language: "Russian",
    languageCode: "ru",
    direction: "ltr"
  },
  {
    id: "zh",
    name: "Chinese",
    author: "Ma Jian",
    language: "Chinese",
    languageCode: "zh",
    direction: "ltr"
  },
  {
    id: "it",
    name: "Italian",
    author: "Hamza Piccardo",
    language: "Italian",
    languageCode: "it",
    direction: "ltr"
  },
  {
    id: "sv",
    name: "Swedish",
    author: "Bernström",
    language: "Swedish",
    languageCode: "sv",
    direction: "ltr"
  },
  {
    id: "pt",
    name: "Portuguese",
    author: "Samir El-Hayek",
    language: "Portuguese",
    languageCode: "pt",
    direction: "ltr"
  },
  {
    id: "nl",
    name: "Dutch",
    author: "Sofian Siregar",
    language: "Dutch",
    languageCode: "nl",
    direction: "ltr"
  },
  {
    id: "fa",
    name: "Persian",
    author: "Makarem Shirazi",
    language: "Persian",
    languageCode: "fa",
    direction: "rtl"
  },
  {
    id: "ta",
    name: "Tamil",
    author: "Jan Turst Foundation",
    language: "Tamil",
    languageCode: "ta",
    direction: "ltr"
  }
];

// Complete surah info (114 surahs)
const SURAH_INFO: SurahInfo[] = [
  { number: 1, name: "الفاتحة", englishName: "Al-Fatiha", englishNameTranslation: "The Opening", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 2, name: "البقرة", englishName: "Al-Baqara", englishNameTranslation: "The Cow", numberOfAyahs: 286, revelationType: "Medinan" },
  { number: 3, name: "آل عمران", englishName: "Ali-Imran", englishNameTranslation: "The Family of Imran", numberOfAyahs: 200, revelationType: "Medinan" },
  { number: 4, name: "النساء", englishName: "An-Nisa", englishNameTranslation: "The Women", numberOfAyahs: 176, revelationType: "Medinan" },
  { number: 5, name: "المائدة", englishName: "Al-Ma'idah", englishNameTranslation: "The Table Spread", numberOfAyahs: 120, revelationType: "Medinan" },
  { number: 6, name: "الأنعام", englishName: "Al-An'am", englishNameTranslation: "The Cattle", numberOfAyahs: 165, revelationType: "Meccan" },
  { number: 7, name: "الأعراف", englishName: "Al-A'raf", englishNameTranslation: "The Heights", numberOfAyahs: 206, revelationType: "Meccan" },
  { number: 8, name: "الأنفال", englishName: "Al-Anfal", englishNameTranslation: "The Spoils of War", numberOfAyahs: 75, revelationType: "Medinan" },
  { number: 9, name: "التوبة", englishName: "At-Tawbah", englishNameTranslation: "The Repentance", numberOfAyahs: 129, revelationType: "Medinan" },
  { number: 10, name: "يونس", englishName: "Yunus", englishNameTranslation: "Jonah", numberOfAyahs: 109, revelationType: "Meccan" },
  { number: 11, name: "هود", englishName: "Hud", englishNameTranslation: "Hud", numberOfAyahs: 123, revelationType: "Meccan" },
  { number: 12, name: "يوسف", englishName: "Yusuf", englishNameTranslation: "Joseph", numberOfAyahs: 111, revelationType: "Meccan" },
  { number: 13, name: "الرعد", englishName: "Ar-Ra'd", englishNameTranslation: "The Thunder", numberOfAyahs: 43, revelationType: "Medinan" },
  { number: 14, name: "إبراهيم", englishName: "Ibrahim", englishNameTranslation: "Abraham", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 15, name: "الحجر", englishName: "Al-Hijr", englishNameTranslation: "The Rocky Tract", numberOfAyahs: 99, revelationType: "Meccan" },
  { number: 16, name: "النحل", englishName: "An-Nahl", englishNameTranslation: "The Bee", numberOfAyahs: 128, revelationType: "Meccan" },
  { number: 17, name: "الإسراء", englishName: "Al-Isra", englishNameTranslation: "The Night Journey", numberOfAyahs: 111, revelationType: "Meccan" },
  { number: 18, name: "الكهف", englishName: "Al-Kahf", englishNameTranslation: "The Cave", numberOfAyahs: 110, revelationType: "Meccan" },
  { number: 19, name: "مريم", englishName: "Maryam", englishNameTranslation: "Mary", numberOfAyahs: 98, revelationType: "Meccan" },
  { number: 20, name: "طه", englishName: "Ta-Ha", englishNameTranslation: "Ta-Ha", numberOfAyahs: 135, revelationType: "Meccan" },
  { number: 21, name: "الأنبياء", englishName: "Al-Anbiya", englishNameTranslation: "The Prophets", numberOfAyahs: 112, revelationType: "Meccan" },
  { number: 22, name: "الحج", englishName: "Al-Hajj", englishNameTranslation: "The Pilgrimage", numberOfAyahs: 78, revelationType: "Medinan" },
  { number: 23, name: "المؤمنون", englishName: "Al-Mu'minun", englishNameTranslation: "The Believers", numberOfAyahs: 118, revelationType: "Meccan" },
  { number: 24, name: "النور", englishName: "An-Nur", englishNameTranslation: "The Light", numberOfAyahs: 64, revelationType: "Medinan" },
  { number: 25, name: "الفرقان", englishName: "Al-Furqan", englishNameTranslation: "The Criterion", numberOfAyahs: 77, revelationType: "Meccan" },
  { number: 26, name: "الشعراء", englishName: "Ash-Shu'ara", englishNameTranslation: "The Poets", numberOfAyahs: 227, revelationType: "Meccan" },
  { number: 27, name: "النمل", englishName: "An-Naml", englishNameTranslation: "The Ants", numberOfAyahs: 93, revelationType: "Meccan" },
  { number: 28, name: "القصص", englishName: "Al-Qasas", englishNameTranslation: "The Stories", numberOfAyahs: 88, revelationType: "Meccan" },
  { number: 29, name: "العنكبوت", englishName: "Al-Ankabut", englishNameTranslation: "The Spider", numberOfAyahs: 69, revelationType: "Meccan" },
  { number: 30, name: "الروم", englishName: "Ar-Rum", englishNameTranslation: "The Romans", numberOfAyahs: 60, revelationType: "Meccan" },
  { number: 31, name: "لقمان", englishName: "Luqman", englishNameTranslation: "Luqman", numberOfAyahs: 34, revelationType: "Meccan" },
  { number: 32, name: "السجدة", englishName: "As-Sajdah", englishNameTranslation: "The Prostration", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 33, name: "الأحزاب", englishName: "Al-Ahzab", englishNameTranslation: "The Combined Forces", numberOfAyahs: 73, revelationType: "Medinan" },
  { number: 34, name: "سبأ", englishName: "Saba", englishNameTranslation: "Sheba", numberOfAyahs: 54, revelationType: "Meccan" },
  { number: 35, name: "فاطر", englishName: "Fatir", englishNameTranslation: "The Originator", numberOfAyahs: 45, revelationType: "Meccan" },
  { number: 36, name: "يس", englishName: "Ya-Sin", englishNameTranslation: "Ya-Sin", numberOfAyahs: 83, revelationType: "Meccan" },
  { number: 37, name: "الصافات", englishName: "As-Saffat", englishNameTranslation: "Those Ranged in Ranks", numberOfAyahs: 182, revelationType: "Meccan" },
  { number: 38, name: "ص", englishName: "Sad", englishNameTranslation: "Sad", numberOfAyahs: 88, revelationType: "Meccan" },
  { number: 39, name: "الزمر", englishName: "Az-Zumar", englishNameTranslation: "The Groups", numberOfAyahs: 75, revelationType: "Meccan" },
  { number: 40, name: "غافر", englishName: "Ghafir", englishNameTranslation: "The Forgiver", numberOfAyahs: 85, revelationType: "Meccan" },
  { number: 41, name: "فصلت", englishName: "Fussilat", englishNameTranslation: "Expounded", numberOfAyahs: 54, revelationType: "Meccan" },
  { number: 42, name: "الشورى", englishName: "Ash-Shura", englishNameTranslation: "The Consultation", numberOfAyahs: 53, revelationType: "Meccan" },
  { number: 43, name: "الزخرف", englishName: "Az-Zukhruf", englishNameTranslation: "The Gold Ornaments", numberOfAyahs: 89, revelationType: "Meccan" },
  { number: 44, name: "الدخان", englishName: "Ad-Dukhan", englishNameTranslation: "The Smoke", numberOfAyahs: 59, revelationType: "Meccan" },
  { number: 45, name: "الجاثية", englishName: "Al-Jathiyah", englishNameTranslation: "The Crouching", numberOfAyahs: 37, revelationType: "Meccan" },
  { number: 46, name: "الأحقاف", englishName: "Al-Ahqaf", englishNameTranslation: "The Wind-Curved Sandhills", numberOfAyahs: 35, revelationType: "Meccan" },
  { number: 47, name: "محمد", englishName: "Muhammad", englishNameTranslation: "Muhammad", numberOfAyahs: 38, revelationType: "Medinan" },
  { number: 48, name: "الفتح", englishName: "Al-Fath", englishNameTranslation: "The Victory", numberOfAyahs: 29, revelationType: "Medinan" },
  { number: 49, name: "الحجرات", englishName: "Al-Hujurat", englishNameTranslation: "The Dwellings", numberOfAyahs: 18, revelationType: "Medinan" },
  { number: 50, name: "ق", englishName: "Qaf", englishNameTranslation: "Qaf", numberOfAyahs: 45, revelationType: "Meccan" },
  { number: 51, name: "الذاريات", englishName: "Adh-Dhariyat", englishNameTranslation: "The Winnowing Winds", numberOfAyahs: 60, revelationType: "Meccan" },
  { number: 52, name: "الطور", englishName: "At-Tur", englishNameTranslation: "The Mount", numberOfAyahs: 49, revelationType: "Meccan" },
  { number: 53, name: "النجم", englishName: "An-Najm", englishNameTranslation: "The Star", numberOfAyahs: 62, revelationType: "Meccan" },
  { number: 54, name: "القمر", englishName: "Al-Qamar", englishNameTranslation: "The Moon", numberOfAyahs: 55, revelationType: "Meccan" },
  { number: 55, name: "الرحمن", englishName: "Ar-Rahman", englishNameTranslation: "The Beneficent", numberOfAyahs: 78, revelationType: "Medinan" },
  { number: 56, name: "الواقعة", englishName: "Al-Waqi'ah", englishNameTranslation: "The Inevitable", numberOfAyahs: 96, revelationType: "Meccan" },
  { number: 57, name: "الحديد", englishName: "Al-Hadid", englishNameTranslation: "The Iron", numberOfAyahs: 29, revelationType: "Medinan" },
  { number: 58, name: "المجادلة", englishName: "Al-Mujadilah", englishNameTranslation: "The Pleading Woman", numberOfAyahs: 22, revelationType: "Medinan" },
  { number: 59, name: "الحشر", englishName: "Al-Hashr", englishNameTranslation: "The Exile", numberOfAyahs: 24, revelationType: "Medinan" },
  { number: 60, name: "الممتحنة", englishName: "Al-Mumtahanah", englishNameTranslation: "She that is to be examined", numberOfAyahs: 13, revelationType: "Medinan" },
  { number: 61, name: "الصف", englishName: "As-Saff", englishNameTranslation: "The Ranks", numberOfAyahs: 14, revelationType: "Medinan" },
  { number: 62, name: "الجمعة", englishName: "Al-Jumu'ah", englishNameTranslation: "The Congregation", numberOfAyahs: 11, revelationType: "Medinan" },
  { number: 63, name: "المنافقون", englishName: "Al-Munafiqun", englishNameTranslation: "The Hypocrites", numberOfAyahs: 11, revelationType: "Medinan" },
  { number: 64, name: "التغابن", englishName: "At-Taghabun", englishNameTranslation: "The Mutual Disillusion", numberOfAyahs: 18, revelationType: "Medinan" },
  { number: 65, name: "الطلاق", englishName: "At-Talaq", englishNameTranslation: "The Divorce", numberOfAyahs: 12, revelationType: "Medinan" },
  { number: 66, name: "التحريم", englishName: "At-Tahrim", englishNameTranslation: "The Prohibition", numberOfAyahs: 12, revelationType: "Medinan" },
  { number: 67, name: "الملك", englishName: "Al-Mulk", englishNameTranslation: "The Sovereignty", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 68, name: "القلم", englishName: "Al-Qalam", englishNameTranslation: "The Pen", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 69, name: "الحاقة", englishName: "Al-Haqqah", englishNameTranslation: "The Reality", numberOfAyahs: 52, revelationType: "Meccan" },
  { number: 70, name: "المعارج", englishName: "Al-Ma'arij", englishNameTranslation: "The Ascending Stairways", numberOfAyahs: 44, revelationType: "Meccan" },
  { number: 71, name: "نوح", englishName: "Nuh", englishNameTranslation: "Noah", numberOfAyahs: 28, revelationType: "Meccan" },
  { number: 72, name: "الجن", englishName: "Al-Jinn", englishNameTranslation: "The Jinn", numberOfAyahs: 28, revelationType: "Meccan" },
  { number: 73, name: "المزمل", englishName: "Al-Muzzammil", englishNameTranslation: "The Enshrouded One", numberOfAyahs: 20, revelationType: "Meccan" },
  { number: 74, name: "المدثر", englishName: "Al-Muddaththir", englishNameTranslation: "The Cloaked One", numberOfAyahs: 56, revelationType: "Meccan" },
  { number: 75, name: "القيامة", englishName: "Al-Qiyamah", englishNameTranslation: "The Resurrection", numberOfAyahs: 40, revelationType: "Meccan" },
  { number: 76, name: "الإنسان", englishName: "Al-Insan", englishNameTranslation: "Man", numberOfAyahs: 31, revelationType: "Medinan" },
  { number: 77, name: "المرسلات", englishName: "Al-Mursalat", englishNameTranslation: "The Emissaries", numberOfAyahs: 50, revelationType: "Meccan" },
  { number: 78, name: "النبأ", englishName: "An-Naba", englishNameTranslation: "The Tidings", numberOfAyahs: 40, revelationType: "Meccan" },
  { number: 79, name: "النازعات", englishName: "An-Nazi'at", englishNameTranslation: "Those Who Drag Forth", numberOfAyahs: 46, revelationType: "Meccan" },
  { number: 80, name: "عبس", englishName: "'Abasa", englishNameTranslation: "He Frowned", numberOfAyahs: 42, revelationType: "Meccan" },
  { number: 81, name: "التكوير", englishName: "At-Takwir", englishNameTranslation: "The Overthrowing", numberOfAyahs: 29, revelationType: "Meccan" },
  { number: 82, name: "الإنفطار", englishName: "Al-Infitar", englishNameTranslation: "The Cleaving", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 83, name: "المطففين", englishName: "Al-Mutaffifin", englishNameTranslation: "Defrauding", numberOfAyahs: 36, revelationType: "Meccan" },
  { number: 84, name: "الإنشقاق", englishName: "Al-Inshiqaq", englishNameTranslation: "The Sundering", numberOfAyahs: 25, revelationType: "Meccan" },
  { number: 85, name: "البروج", englishName: "Al-Buruj", englishNameTranslation: "The Mansions of the Stars", numberOfAyahs: 22, revelationType: "Meccan" },
  { number: 86, name: "الطارق", englishName: "At-Tariq", englishNameTranslation: "The Nightcomer", numberOfAyahs: 17, revelationType: "Meccan" },
  { number: 87, name: "الأعلى", englishName: "Al-A'la", englishNameTranslation: "The Most High", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 88, name: "الغاشية", englishName: "Al-Ghashiyah", englishNameTranslation: "The Overwhelming", numberOfAyahs: 26, revelationType: "Meccan" },
  { number: 89, name: "الفجر", englishName: "Al-Fajr", englishNameTranslation: "The Dawn", numberOfAyahs: 30, revelationType: "Meccan" },
  { number: 90, name: "البلد", englishName: "Al-Balad", englishNameTranslation: "The City", numberOfAyahs: 20, revelationType: "Meccan" },
  { number: 91, name: "الشمس", englishName: "Ash-Shams", englishNameTranslation: "The Sun", numberOfAyahs: 15, revelationType: "Meccan" },
  { number: 92, name: "الليل", englishName: "Al-Layl", englishNameTranslation: "The Night", numberOfAyahs: 21, revelationType: "Meccan" },
  { number: 93, name: "الضحى", englishName: "Ad-Duha", englishNameTranslation: "The Morning Hours", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 94, name: "الشرح", englishName: "Ash-Sharh", englishNameTranslation: "The Relief", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 95, name: "التين", englishName: "At-Tin", englishNameTranslation: "The Fig", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 96, name: "العلق", englishName: "Al-'Alaq", englishNameTranslation: "The Clot", numberOfAyahs: 19, revelationType: "Meccan" },
  { number: 97, name: "القدر", englishName: "Al-Qadr", englishNameTranslation: "The Power", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 98, name: "البينة", englishName: "Al-Bayyinah", englishNameTranslation: "The Clear Proof", numberOfAyahs: 8, revelationType: "Medinan" },
  { number: 99, name: "الزلزلة", englishName: "Az-Zalzalah", englishNameTranslation: "The Earthquake", numberOfAyahs: 8, revelationType: "Medinan" },
  { number: 100, name: "العاديات", englishName: "Al-'Adiyat", englishNameTranslation: "The Courser", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 101, name: "القارعة", englishName: "Al-Qari'ah", englishNameTranslation: "The Calamity", numberOfAyahs: 11, revelationType: "Meccan" },
  { number: 102, name: "التكاثر", englishName: "At-Takathur", englishNameTranslation: "The Rivalry in Worldly Increase", numberOfAyahs: 8, revelationType: "Meccan" },
  { number: 103, name: "العصر", englishName: "Al-'Asr", englishNameTranslation: "The Declining Day", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 104, name: "الهمزة", englishName: "Al-Humazah", englishNameTranslation: "The Traducer", numberOfAyahs: 9, revelationType: "Meccan" },
  { number: 105, name: "الفيل", englishName: "Al-Fil", englishNameTranslation: "The Elephant", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 106, name: "قريش", englishName: "Quraysh", englishNameTranslation: "Quraysh", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 107, name: "الماعون", englishName: "Al-Ma'un", englishNameTranslation: "Small Kindnesses", numberOfAyahs: 7, revelationType: "Meccan" },
  { number: 108, name: "الكوثر", englishName: "Al-Kawthar", englishNameTranslation: "Abundance", numberOfAyahs: 3, revelationType: "Meccan" },
  { number: 109, name: "الكافرون", englishName: "Al-Kafirun", englishNameTranslation: "The Disbelievers", numberOfAyahs: 6, revelationType: "Meccan" },
  { number: 110, name: "النصر", englishName: "An-Nasr", englishNameTranslation: "The Divine Support", numberOfAyahs: 3, revelationType: "Medinan" },
  { number: 111, name: "المسد", englishName: "Al-Masad", englishNameTranslation: "The Palm Fiber", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 112, name: "الإخلاص", englishName: "Al-Ikhlas", englishNameTranslation: "The Sincerity", numberOfAyahs: 4, revelationType: "Meccan" },
  { number: 113, name: "الفلق", englishName: "Al-Falaq", englishNameTranslation: "The Daybreak", numberOfAyahs: 5, revelationType: "Meccan" },
  { number: 114, name: "الناس", englishName: "An-Nas", englishNameTranslation: "Mankind", numberOfAyahs: 6, revelationType: "Meccan" }
];

class QuranService {
  private quranData: Map<string, QuranSurah[]> = new Map();

  /**
   * Get cache key for a translation
   */
  private getCacheKey(translationId: string): string {
    return `${CACHE_PREFIX}quran-${translationId}`;
  }

  /**
   * Get cached item from localStorage
   */
  private getCachedItem<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Check version
      if (entry.version !== CACHE_VERSION) {
        localStorage.removeItem(key);
        return null;
      }

      // Check TTL
      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Error reading cache for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached item in localStorage
   */
  private setCachedItem<T>(key: string, data: T, ttl: number): void {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        version: CACHE_VERSION
      };

      const serialized = JSON.stringify(entry);

      // Check cache size
      if (this.getCacheSize() + serialized.length > MAX_CACHE_SIZE) {
        this.cleanupCache();
      }

      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`Error writing cache for ${key}:`, error);

      // If quota exceeded, try to clean up and retry
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        this.cleanupCache(true);
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            ttl,
            version: CACHE_VERSION
          };
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryError) {
          console.error("Failed to cache even after cleanup:", retryError);
        }
      }
    }
  }

  /**
   * Get current cache size in bytes
   */
  private getCacheSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length;
        }
      }
    }
    return size;
  }

  /**
   * Clean up old cache entries
   */
  private cleanupCache(aggressive: boolean = false): void {
    const entries: { key: string; timestamp: number; size: number }[] = [];

    // Collect all cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const parsed = JSON.parse(item);
            entries.push({
              key,
              timestamp: parsed.timestamp || 0,
              size: item.length
            });
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);

    // Remove expired entries
    const now = Date.now();
    for (const entry of entries) {
      const item = localStorage.getItem(entry.key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (now - parsed.timestamp > (parsed.ttl || DEFAULT_TTL)) {
            localStorage.removeItem(entry.key);
          }
        } catch {
          localStorage.removeItem(entry.key);
        }
      }
    }

    // Aggressive cleanup - remove half of oldest entries
    if (aggressive) {
      const remaining = entries.filter(e => {
        const item = localStorage.getItem(e.key);
        return item !== null;
      });

      const toRemove = Math.floor(remaining.length / 2);
      for (let i = 0; i < toRemove && i < remaining.length; i++) {
        localStorage.removeItem(remaining[i].key);
      }
    }
  }

  /**
   * Get the JSON file URL for a translation
   */
  private getTranslationUrl(translationId: string): string {
    // Handle special cases for English variants
    if (translationId === "ara") {
      return `${CDN_BASE_URL}/quran.json`;
    }
    if (translationId === "en-yusufali") {
      return `${CDN_BASE_URL}/quran_yusufali.json`;
    }
    if (translationId === "en-pickthall") {
      return `${CDN_BASE_URL}/quran_pickthall.json`;
    }
    return `${CDN_BASE_URL}/quran_${translationId}.json`;
  }

  /**
   * Load Quran data for a translation
   */
  async loadQuranData(translationId: string = "en"): Promise<QuranSurah[]> {
    // Check memory cache first
    if (this.quranData.has(translationId)) {
      return this.quranData.get(translationId)!;
    }

    // Check localStorage cache
    const cacheKey = this.getCacheKey(translationId);
    const cached = this.getCachedItem<QuranSurah[]>(cacheKey);
    if (cached) {
      this.quranData.set(translationId, cached);
      return cached;
    }

    // Fetch from CDN
    try {
      const url = this.getTranslationUrl(translationId);
      const response = await fetch(url);

      if (!response.ok) {
        // Fallback to English if translation not available
        if (translationId !== "en") {
          console.warn(`Translation ${translationId} not available, falling back to English`);
          return this.loadQuranData("en");
        }
        throw new Error(`Failed to load Quran data: ${response.status}`);
      }

      const data: QuranSurah[] = await response.json();

      // Cache the data
      this.quranData.set(translationId, data);
      this.setCachedItem(cacheKey, data, DEFAULT_TTL);

      return data;
    } catch (error) {
      console.error("Error loading Quran data:", error);
      throw error;
    }
  }

  /**
   * Get all surah info
   */
  getAllSurahs(): SurahInfo[] {
    return SURAH_INFO;
  }

  /**
   * Get surah info by number
   */
  getSurahInfo(surahNumber: number): SurahInfo | null {
    return SURAH_INFO.find(s => s.number === surahNumber) || null;
  }

  /**
   * Get surah data with optional translation
   * Returns legacy SurahData format for backward compatibility
   */
  async getSurah(surahNumber: number, translationId: string = "en"): Promise<SurahData | null> {
    try {
      const quranData = await this.loadQuranData(translationId);
      const surah = quranData.find(s => s.id === surahNumber);

      if (!surah) {
        return null;
      }

      const surahInfo = this.getSurahInfo(surahNumber);
      if (!surahInfo) {
        return null;
      }

      // Map to legacy format
      const ayahs: Ayah[] = surah.verses.map((verse, index) => ({
        number: verse.id,
        text: verse.text,
        numberInSurah: verse.id,
        translation: verse.translation
      }));

      return {
        number: surahInfo.number,
        name: surahInfo.name,
        englishName: surahInfo.englishName,
        englishNameTranslation: surahInfo.englishNameTranslation,
        numberOfAyahs: surahInfo.numberOfAyahs,
        revelationType: surahInfo.revelationType,
        ayahs
      };
    } catch (error) {
      console.error(`Error getting surah ${surahNumber}:`, error);
      return null;
    }
  }

  /**
   * Get available editions/translations
   */
  getEditions(): QuranEdition[] {
    return AVAILABLE_EDITIONS;
  }

  /**
   * Get editions grouped by language
   */
  getEditionsByLanguage(): { [language: string]: QuranEdition[] } {
    const grouped: { [language: string]: QuranEdition[] } = {};

    for (const edition of AVAILABLE_EDITIONS) {
      if (!grouped[edition.language]) {
        grouped[edition.language] = [];
      }
      grouped[edition.language].push(edition);
    }

    // Sort each language group
    for (const language in grouped) {
      grouped[language].sort((a, b) => a.author.localeCompare(b.author));
    }

    return grouped;
  }

  /**
   * Get edition by ID
   */
  getEditionById(editionId: string): QuranEdition | null {
    return AVAILABLE_EDITIONS.find(e => e.id === editionId) || null;
  }

  /**
   * Get ayah by surah and ayah number
   */
  async getAyah(surahNumber: number, ayahNumber: number, translationId: string = "en"): Promise<QuranVerse | null> {
    try {
      const surah = await this.getSurah(surahNumber, translationId);
      if (!surah) return null;

      const ayah = surah.ayahs.find(a => a.number === ayahNumber);
      if (!ayah) return null;

      return {
        id: ayah.number,
        text: ayah.text,
        translation: ayah.translation
      };
    } catch (error) {
      console.error(`Error getting ayah ${surahNumber}:${ayahNumber}:`, error);
      return null;
    }
  }

  /**
   * Search for text in Quran
   */
  async search(query: string, translationId: string = "en", limit: number = 50): Promise<{ surah: number; ayah: number; text: string; translation?: string }[]> {
    try {
      const quranData = await this.loadQuranData(translationId);
      const results: { surah: number; ayah: number; text: string; translation?: string }[] = [];
      const searchTerm = query.toLowerCase();

      for (const surah of quranData) {
        for (const verse of surah.verses) {
          const matchesArabic = verse.text.toLowerCase().includes(searchTerm);
          const matchesTranslation = verse.translation?.toLowerCase().includes(searchTerm) ?? false;

          if (matchesArabic || matchesTranslation) {
            results.push({
              surah: surah.id,
              ayah: verse.id,
              text: verse.text,
              translation: verse.translation
            });

            if (results.length >= limit) {
              return results;
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error searching Quran:", error);
      return [];
    }
  }

  /**
   * Get random ayah
   */
  async getRandomAyah(translationId: string = "en"): Promise<{ surah: SurahInfo; ayah: Ayah } | null> {
    try {
      const quranData = await this.loadQuranData(translationId);
      const randomSurahIndex = Math.floor(Math.random() * quranData.length);
      const surah = quranData[randomSurahIndex];
      const randomAyahIndex = Math.floor(Math.random() * surah.verses.length);
      const verse = surah.verses[randomAyahIndex];
      const surahInfo = this.getSurahInfo(surah.id);

      if (!surahInfo) return null;

      return {
        surah: surahInfo,
        ayah: {
          number: verse.id,
          text: verse.text,
        numberInSurah: index + 1,
          translation: verse.translation
        }
      };
    } catch (error) {
      console.error("Error getting random ayah:", error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.quranData.clear();

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryEntries: number;
    localStorageEntries: number;
    size: number;
    sizeMB: string;
  } {
    let localStorageEntries = 0;
    let size = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        localStorageEntries++;
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length;
        }
      }
    }

    return {
      memoryEntries: this.quranData.size,
      localStorageEntries,
      size,
      sizeMB: (size / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Preload Quran data for offline use
   */
  async preloadTranslations(
    translationIds: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const total = translationIds.length;
    let completed = 0;

    for (const translationId of translationIds) {
      try {
        await this.loadQuranData(translationId);
        completed++;
        onProgress?.(completed, total);
      } catch (error) {
        console.error(`Failed to preload translation ${translationId}:`, error);
      }
    }
  }
}

// Export singleton instance
export const quranService = new QuranService();

// Export for backward compatibility with quran-proxy
export const quranProxyService = quranService;
