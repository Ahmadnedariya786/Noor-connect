/**
 * NOOR CONNECT — SEMANTIC AYAH-MEANING SCENE ENGINE (@sufariq Visual Storytelling Edition)
 *
 * 100% Offline, Deterministic Semantic Classifier & Visual Choreographer.
 * Analyzes Arabic root tokens and English translation keywords to dynamically map
 * each Ayah (and multi-clause verses) to 16 concrete illustrated object scenes:
 *
 * 1. Heavens, Earth & Noor Rays (video_2.mp4 00:02)
 * 2. The Wall Niche & Lamp — Mishkat (video_2.mp4 00:06)
 * 3. Crystal Glass Orb & Flame — Zujajah (video_2.mp4 00:10)
 * 4. Pearly Radiant Star — Kawkab Durriyy (video_2.mp4 00:13)
 * 5. The Wise Quran / Open Mushaf on Rehal (Surah Ya-Sin 36:2)
 * 6. Sirat al-Mustaqim / Guided Road (Surah Ya-Sin 36:3-4)
 * 7. Blessed Olive Tree & Jannah Gardens
 * 8. Ocean Waves, Ark & Barrier (The Two Seas)
 * 9. Rain from the Sky & Blooming Earth
 * 10. The Balance Scale of Justice — Al-Mizan (Surah Ar-Rahman)
 * 11. Total Solar Eclipse & Shattering Earth (Surah Al-Waqi'ah)
 * 12. Blazing Fire & Warning (Ember Volcanic Crags)
 * 13. The Sacred Kaaba & Makkah (Isometric Kiswah & Tawaf)
 * 14. Grand Mosque Arcade & Chandelier (Rawdah Mihrab)
 * 15. Barriers & Parting Light for the Heedless (Surah Ya-Sin 36:6-10)
 * 16. Ancient Desert Canyon & Twilight Sky
 */

import type { SceneId } from './quran-clip-renderer';

export interface VisualSegment {
  startRatio: number; // 0.0 to 1.0
  endRatio: number;   // 0.0 to 1.0
  startTime: number;  // seconds
  endTime: number;    // seconds
  sceneId: SceneId;
  label: string;
  icon: string;
  arabicClause?: string;     // Active clause Arabic text for this segment
  translationClause?: string;// Active clause translated text for this segment
}

export interface AyahSceneResolution {
  ayahNumber: number;
  sceneId: SceneId;
  moodLabel: string;
  category: string;
  icon: string;
  matchedKeyword?: string;
  subTimeline?: VisualSegment[];
}

// Clean tashkeel & diacritics for accurate Arabic keyword matching
export function cleanArabicForMatching(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

export function cleanEnglishForMatching(text: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

/**
 * Strips leading Bismillah from Ayah 1 of Surahs 2–114 (except Surah 9 At-Tawbah which has no Bismillah).
 * In Surah Al-Fatihah (1), Bismillah IS Ayah 1, so it is preserved.
 * In Surahs 2–114, APIs prepend "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ " to Ayah 1.
 */
export function stripLeadingBismillah(
  text: string,
  surahNumber: number = 1,
  ayahNumber: number = 1
): string {
  if (!text) return '';
  if (surahNumber === 1 || surahNumber === 9 || ayahNumber !== 1) {
    return text;
  }
  const words = text.trim().split(/\s+/);
  if (words.length > 4) {
    const cleanW = words.slice(0, 4).map((w) =>
      w
        .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
        .replace(/[إأآءٱ]/g, 'ا')
    );
    if (
      cleanW[0] === 'بسم' &&
      (cleanW[1] === 'الله' || cleanW[1] === 'لله') &&
      cleanW[2] === 'الرحمن' &&
      cleanW[3] === 'الرحيم'
    ) {
      return words.slice(4).join(' ').trim();
    }
  }
  return text;
}

// 16 Concrete Illustrated Scenes Metadata
export const ILLUSTRATED_SCENES: Record<
  string,
  { sceneId: SceneId; label: string; icon: string; category: string }
> = {
  'heavens-earth-rays': {
    sceneId: 'heavens-earth-rays',
    label: 'Heavens & Noor',
    icon: '🌅',
    category: 'Divine Light & Creation',
  },
  'niche-lamp': {
    sceneId: 'niche-lamp',
    label: 'Mishkat Lamp',
    icon: '🏮',
    category: 'Parables & Illumination',
  },
  'glass-orb-lamp': {
    sceneId: 'glass-orb-lamp',
    label: 'Crystal Orb',
    icon: '🔮',
    category: 'Crystal Radiance',
  },
  'pearly-star': {
    sceneId: 'pearly-star',
    label: 'Pearly Star',
    icon: '⭐',
    category: 'Celestial Splendor',
  },
  'illuminated-quran': {
    sceneId: 'illuminated-quran',
    label: 'Wise Quran',
    icon: '📖',
    category: 'Divine Revelation',
  },
  'straight-path': {
    sceneId: 'straight-path',
    label: 'Straight Path',
    icon: '🛤️',
    category: 'Guidance & Prophethood',
  },
  'blessed-tree-garden': {
    sceneId: 'blessed-tree-garden',
    label: 'Jannah Tree',
    icon: '🌳',
    category: 'Paradise & Grace',
  },
  'two-seas-ship': {
    sceneId: 'two-seas-ship',
    label: 'Ocean & Ship',
    icon: '🌊',
    category: 'Signs in the Seas',
  },
  'rain-revival': {
    sceneId: 'rain-revival',
    label: 'Life Rain',
    icon: '🌧️',
    category: 'Revival of the Earth',
  },
  'cosmic-scale': {
    sceneId: 'cosmic-scale',
    label: 'Cosmic Scale',
    icon: '⚖️',
    category: 'Justice & Balance',
  },
  'cosmic-eclipse-qiyamah': {
    sceneId: 'cosmic-eclipse-qiyamah',
    label: 'Eclipse Awe',
    icon: '🌑',
    category: 'Qiyamah & Upheaval',
  },
  'ember-warning': {
    sceneId: 'ember-warning',
    label: 'Ember Warning',
    icon: '🔥',
    category: 'Accountability & Hellfire',
  },
  'kaaba-sanctuary': {
    sceneId: 'kaaba-sanctuary',
    label: 'Kaaba House',
    icon: '🕋',
    category: 'Sacred Sanctuary',
  },
  'rawdah-mihrab-prayer': {
    sceneId: 'rawdah-mihrab-prayer',
    label: 'Rawdah Arcade',
    icon: '🕌',
    category: 'Worship & Prayer',
  },
  'iron-chains-veil': {
    sceneId: 'iron-chains-veil',
    label: 'Veil & Barrier',
    icon: '⛓️',
    category: 'Warning to the Heedless',
  },
  'desert-fortress-history': {
    sceneId: 'desert-fortress-history',
    label: 'Desert Canyon',
    icon: '🏜️',
    category: 'History & Nations',
  },
  'sun-moon-orbit': {
    sceneId: 'sun-moon-orbit',
    label: 'Sun & Moon Orbit',
    icon: '🌗',
    category: 'Cosmic Harmony',
  },
  'celestial-creation': {
    sceneId: 'celestial-creation',
    label: 'Divine Creation',
    icon: '✨',
    category: 'Creation of Man',
  },
  'eloquence-light': {
    sceneId: 'eloquence-light',
    label: 'Sacred Wisdom',
    icon: '🪶',
    category: 'Speech & Eloquence',
  },
};

// Harmonic fallback sequence of concrete illustrated scenes (Safe celestial & guidance themes only, NO kaaba or fire)
const FALLBACK_SCENE_SEQUENCE: Array<{ sceneId: SceneId; label: string; icon: string; category: string }> = [
  ILLUSTRATED_SCENES['illuminated-quran'],
  ILLUSTRATED_SCENES['heavens-earth-rays'],
  ILLUSTRATED_SCENES['straight-path'],
  ILLUSTRATED_SCENES['sun-moon-orbit'],
  ILLUSTRATED_SCENES['blessed-tree-garden'],
  ILLUSTRATED_SCENES['two-seas-ship'],
  ILLUSTRATED_SCENES['pearly-star'],
  ILLUSTRATED_SCENES['celestial-creation'],
  ILLUSTRATED_SCENES['eloquence-light'],
  ILLUSTRATED_SCENES['rawdah-mihrab-prayer'],
  ILLUSTRATED_SCENES['desert-fortress-history'],
  ILLUSTRATED_SCENES['cosmic-scale'],
  ILLUSTRATED_SCENES['rain-revival'],
];

/**
 * Deterministic Semantic Ayah Classifier:
 * Analyzes stripped-tashkeel Arabic root tokens and English translation keywords.
 */
export function resolveSceneForAyah(
  ayahTextArabic: string,
  translationEn: string = '',
  surahNumber: number = 1,
  ayahNumber: number = 1
): AyahSceneResolution {
  const ar = cleanArabicForMatching(ayahTextArabic);
  const en = cleanEnglishForMatching(translationEn);

  // 1. SPECIFIC SURAH-LEVEL SIGNATURES FIRST
  // Surah Ya-Sin (36:1–4)
  if (surahNumber === 36) {
    if (ayahNumber === 1) {
      return {
        ayahNumber,
        sceneId: 'parting-monoliths',
        moodLabel: 'Guiding Light',
        icon: '✨',
        category: 'Divine Revelation',
        matchedKeyword: 'يس',
      };
    }
    if (ayahNumber === 2) {
      return {
        ayahNumber,
        sceneId: 'illuminated-quran',
        moodLabel: 'Wise Quran',
        icon: '📖',
        category: 'Divine Revelation',
        matchedKeyword: 'والقران الحكيم',
      };
    }
    if (ayahNumber === 3) {
      return {
        ayahNumber,
        sceneId: 'straight-path',
        moodLabel: 'Sent Messenger',
        icon: '🛤️',
        category: 'Guidance & Prophethood',
        matchedKeyword: 'انك لمن المرسلين',
      };
    }
    if (ayahNumber === 4) {
      return {
        ayahNumber,
        sceneId: 'straight-path',
        moodLabel: 'Straight Path',
        icon: '🛤️',
        category: 'Guidance & Prophethood',
        matchedKeyword: 'علي صراط مستقيم',
      };
    }
    if (ayahNumber >= 6 && ayahNumber <= 10) {
      return {
        ayahNumber,
        sceneId: 'iron-chains-veil',
        moodLabel: 'Veil & Barrier',
        icon: '⛓️',
        category: 'Warning to the Heedless',
        matchedKeyword: 'اغلالا سدا',
      };
    }
  }

  // 2. SURAH AN-NUR (24) — Exact Thematic Routing & Legal/Mercy Safeguards
  if (surahNumber === 24) {
    if (ayahNumber >= 2 && ayahNumber <= 4) {
      return {
        ayahNumber,
        sceneId: 'cosmic-scale',
        moodLabel: 'Cosmic Scale',
        icon: '⚖️',
        category: 'Justice & Moral Law',
        matchedKeyword: 'شهداء جلدة الحق',
      };
    }
    if (ayahNumber === 5) {
      return {
        ayahNumber,
        sceneId: 'heavens-earth-rays',
        moodLabel: 'Sanctuary Mercy',
        icon: '🌅',
        category: 'Divine Mercy & Repentance',
        matchedKeyword: 'غفور رحيم',
      };
    }
    if (ayahNumber === 35) {
      return {
        ayahNumber,
        sceneId: 'heavens-earth-rays',
        moodLabel: 'Heavens & Noor',
        icon: '🌅',
        category: 'Divine Light',
        matchedKeyword: 'الله نور السماوات والارض',
      };
    }
  }

  // 3. SURAH AR-RAHMAN (55:1–25) — Autonomous Cinematic Reel Director
  if (surahNumber === 55) {
    if (ayahNumber === 1) {
      return {
        ayahNumber,
        sceneId: 'heavens-earth-rays',
        moodLabel: 'Heavens & Noor',
        icon: '🌅',
        category: 'Divine Mercy & Light',
        matchedKeyword: 'الرحمن',
      };
    }
    if (ayahNumber === 2) {
      return {
        ayahNumber,
        sceneId: 'illuminated-quran',
        moodLabel: 'Wise Quran',
        icon: '📖',
        category: 'Divine Scripture',
        matchedKeyword: 'علم القران',
      };
    }
    if (ayahNumber === 3) {
      return {
        ayahNumber,
        sceneId: 'celestial-creation',
        moodLabel: 'Divine Creation',
        icon: '✨',
        category: 'Creation of Man',
        matchedKeyword: 'خلق الانسان',
      };
    }
    if (ayahNumber === 4) {
      return {
        ayahNumber,
        sceneId: 'eloquence-light',
        moodLabel: 'Sacred Wisdom',
        icon: '🪶',
        category: 'Speech & Eloquence',
        matchedKeyword: 'علمه البيان',
      };
    }
    if (ayahNumber === 5) {
      return {
        ayahNumber,
        sceneId: 'sun-moon-orbit',
        moodLabel: 'Sun & Moon Orbit',
        icon: '🌗',
        category: 'Cosmic Harmony',
        matchedKeyword: 'الشمس والقمر بحسبان',
      };
    }
    if (ayahNumber === 6) {
      return {
        ayahNumber,
        sceneId: 'blessed-tree-garden',
        moodLabel: 'Creation Prostrates',
        icon: '🌳',
        category: 'Creation & Prostration',
        matchedKeyword: 'والنجم والشجر يسجدان',
      };
    }
    if (ayahNumber >= 7 && ayahNumber <= 9) {
      return {
        ayahNumber,
        sceneId: 'cosmic-scale',
        moodLabel: 'Cosmic Scale',
        icon: '⚖️',
        category: 'Justice & Balance',
        matchedKeyword: 'وضع الميزان',
      };
    }
    if (ayahNumber >= 10 && ayahNumber <= 13) {
      return {
        ayahNumber,
        sceneId: 'blessed-tree-garden',
        moodLabel: 'Jannah Tree',
        icon: '🌳',
        category: 'Fruits & Jannah Grace',
        matchedKeyword: 'فيها فاكهه والنخل ذات الاكمام',
      };
    }
    if (ayahNumber >= 19 && ayahNumber <= 25) {
      return {
        ayahNumber,
        sceneId: 'two-seas-ship',
        moodLabel: 'Ocean & Ship',
        icon: '🌊',
        category: 'Signs of the Two Seas',
        matchedKeyword: 'مرج البحرين يلتقيان الجوار المنشات',
      };
    }
  }

  // 4. PRIORITY 1 — SUN & MOON ORBIT & ASTRONOMICAL HARMONY (Regex Word-Boundary Enforced)
  const sunMoonAr = [
    'شمس وقمر',
    'شمس والقمر',
    'الشمس والقمر',
    'الشمس',
    'شمس',
    'القمر',
    'قمر',
    'حسبان',
    'فلك يسبحون',
    'منازل القمر',
    'سراجا وهاجا',
    'ضياء ونورا',
  ];
  const arTokens = ar.split(/\s+/);
  for (const w of sunMoonAr) {
    if (w.includes(' ') ? ar.includes(w) : arTokens.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'sun-moon-orbit',
        moodLabel: 'Sun & Moon Orbit',
        icon: '🌗',
        category: 'Cosmic Harmony',
        matchedKeyword: w,
      };
    }
  }
  const SUN_MOON_EN_REGEX = /\b(sun\s+and\s+(?:the\s+)?moon|sun|moon|orbit|orbits|swimming in an orbit|phases of the moon|solar|lunar)\b/i;
  if (SUN_MOON_EN_REGEX.test(translationEn)) {
    return {
      ayahNumber,
      sceneId: 'sun-moon-orbit',
      moodLabel: 'Sun & Moon Orbit',
      icon: '🌗',
      category: 'Cosmic Harmony',
      matchedKeyword: 'celestial-orbit',
    };
  }

  // 5. PRIORITY 2 — THE WISE QURAN & SCRIPTURE
  const quranAr = [
    'علم القران',
    'قران',
    'كتاب',
    'فرقان',
    'صحف',
    'ايات',
    'تنزيل',
    'حكيم',
    'يس',
    'طه',
    'الم',
    'حم',
    'تبيان',
    'تذكره',
  ];
  const quranEn = [
    'quran',
    'book',
    'scripture',
    'revelation',
    'verses',
    'wise',
    'reminder',
    'inscribed',
  ];
  for (const w of quranAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'illuminated-quran',
        moodLabel: 'Wise Quran',
        icon: '📖',
        category: 'Divine Scripture',
        matchedKeyword: w,
      };
    }
  }
  for (const w of quranEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'illuminated-quran',
        moodLabel: 'Wise Quran',
        icon: '📖',
        category: 'Divine Scripture',
        matchedKeyword: w,
      };
    }
  }

  // 6. PRIORITY 3 — HUMAN CREATION, STARDUST & CLAY
  const creationAr = [
    'خلق الانسان',
    'خلقكم',
    'صلصال',
    'فخار',
    'طين لازب',
    'طين',
    'سواك فعدلك',
    'نفخ فيه من روحه',
    'نطفه',
    'علقه',
    'مضغه',
    'بشر',
    'ذريه',
    'احسن تقويم',
  ];
  const creationEn = [
    'created man',
    'created mankind',
    'creation of man',
    'clay',
    'sounding clay',
    'dust',
    'fashioned you',
    'breathed into him of his spirit',
    'molded',
    'formed man',
  ];
  for (const w of creationAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'celestial-creation',
        moodLabel: 'Divine Creation',
        icon: '✨',
        category: 'Creation of Man',
        matchedKeyword: w,
      };
    }
  }
  for (const w of creationEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'celestial-creation',
        moodLabel: 'Divine Creation',
        icon: '✨',
        category: 'Creation of Man',
        matchedKeyword: w,
      };
    }
  }

  // 7. PRIORITY 4 — SPEECH, ELOQUENCE & SACRED WISDOM
  const eloquenceAr = [
    'علمه البيان',
    'البيان',
    'لسان',
    'منطق',
    'حكمه',
    'يعلمهم الكتاب والحكمه',
    'قول سديد',
    'كلمه طيبه',
    'فصل الخطاب',
    'فصح',
  ];
  const eloquenceEn = [
    'eloquence',
    'speech',
    'expression',
    'clear expression',
    'wisdom',
    'wisdom and speech',
    'good word',
    'clear explanation',
    'articulat',
  ];
  for (const w of eloquenceAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'eloquence-light',
        moodLabel: 'Sacred Wisdom',
        icon: '🪶',
        category: 'Speech & Eloquence',
        matchedKeyword: w,
      };
    }
  }
  for (const w of eloquenceEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'eloquence-light',
        moodLabel: 'Sacred Wisdom',
        icon: '🪶',
        category: 'Speech & Eloquence',
        matchedKeyword: w,
      };
    }
  }

  // 8. PRIORITY 5 — DIVINE MERCY, HEAVENS & DIVINE NOOR
  const heavensAr = [
    'رحمن',
    'رحيم',
    'رحمه',
    'وسعت كل شيء',
    'نور السماوات',
    'سماوات',
    'سماء',
    'فاطر',
    'عرش',
    'كرسي',
    'ملائكه',
    'نور علي نور',
    'رب العالمين',
  ];
  const heavensEn = [
    'most merciful',
    'mercy',
    'heavens and earth',
    'heavens',
    'light of the heavens',
    'throne',
    'angels',
    'light upon light',
    'lord of the worlds',
  ];
  for (const w of heavensAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'heavens-earth-rays',
        moodLabel: 'Heavens & Noor',
        icon: '🌅',
        category: 'Divine Mercy & Light',
        matchedKeyword: w,
      };
    }
  }
  for (const w of heavensEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'heavens-earth-rays',
        moodLabel: 'Heavens & Noor',
        icon: '🌅',
        category: 'Divine Mercy & Light',
        matchedKeyword: w,
      };
    }
  }

  // 9. THE BALANCE SCALE OF JUSTICE (Al-Mizan)
  const scaleAr = ['ميزان', 'موازين', 'وزن', 'قسط', 'عدل', 'وزنوا بالقسطاس'];
  const scaleEn = ['balance', 'scale', 'scales', 'weigh', 'justice', 'just measure'];
  for (const w of scaleAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-scale',
        moodLabel: 'Cosmic Scale',
        icon: '⚖️',
        category: 'Justice & Balance',
        matchedKeyword: w,
      };
    }
  }
  for (const w of scaleEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-scale',
        moodLabel: 'Cosmic Scale',
        icon: '⚖️',
        category: 'Justice & Balance',
        matchedKeyword: w,
      };
    }
  }

  // 5. THE STRAIGHT PATH & MESSENGERS
  const pathAr = ['صراط', 'مستقيم', 'سبيل', 'هدي', 'مرسلين', 'رسول', 'نبي', 'اهدنا', 'مهتدين', 'سواء السبيل'];
  const pathEn = ['straight path', 'path', 'messengers', 'messenger', 'prophet', 'guided', 'guidance', 'way'];
  for (const w of pathAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'straight-path',
        moodLabel: 'Straight Path',
        icon: '🛤️',
        category: 'Guidance & Path',
        matchedKeyword: w,
      };
    }
  }
  for (const w of pathEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'straight-path',
        moodLabel: 'Straight Path',
        icon: '🛤️',
        category: 'Guidance & Path',
        matchedKeyword: w,
      };
    }
  }

  // 6. THE WALL NICHE & OIL LAMP (Mishkat & Misbah)
  const lampAr = ['مشكاه', 'مصباح', 'سراج', 'وقود', 'زيت'];
  const lampEn = ['niche', 'lamp', 'lantern', 'oil'];
  for (const w of lampAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'niche-lamp',
        moodLabel: 'Mishkat Lamp',
        icon: '🏮',
        category: 'Parables & Light',
        matchedKeyword: w,
      };
    }
  }
  for (const w of lampEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'niche-lamp',
        moodLabel: 'Mishkat Lamp',
        icon: '🏮',
        category: 'Parables & Light',
        matchedKeyword: w,
      };
    }
  }

  // 7. CRYSTAL GLASS & STAR (Zujajah & Kawkab)
  const starAr = ['زجاجه', 'كوكب', 'كوكب دري', 'نجوم', 'نجم', 'طارق', 'بروج', 'شهاب', 'ثاقب'];
  const starEn = ['glass', 'crystal', 'star', 'stars', 'pearly', 'piercing star', 'constellations', 'meteor'];
  for (const w of starAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: w.includes('زجاجه') ? 'glass-orb-lamp' : 'pearly-star',
        moodLabel: w.includes('زجاجه') ? 'Crystal Orb' : 'Pearly Star',
        icon: w.includes('زجاجه') ? '🔮' : '⭐',
        category: 'Celestial Light',
        matchedKeyword: w,
      };
    }
  }
  for (const w of starEn) {
    if (en.includes(w)) {
      const isGlass = w.includes('glass') || w.includes('crystal');
      return {
        ayahNumber,
        sceneId: isGlass ? 'glass-orb-lamp' : 'pearly-star',
        moodLabel: isGlass ? 'Crystal Orb' : 'Pearly Star',
        icon: isGlass ? '🔮' : '⭐',
        category: 'Celestial Light',
        matchedKeyword: w,
      };
    }
  }



  // 9. JANNAH GARDENS, BLESSED OLIVE TREE & SPRINGS
  const gardenAr = [
    'جنه', 'جنات', 'شجره', 'زيتونه', 'نخل', 'فاكهه', 'انهار', 'فردوس', 'نعيم',
    'طوبي', 'سندس', 'استبرق', 'قطوف دانيه', 'عين سلسبيل', 'كوثر'
  ];
  const gardenEn = [
    'garden', 'gardens', 'paradise', 'olive tree', 'palm', 'fruit', 'fruits',
    'rivers', 'bliss', 'green brocade', 'delight', 'fountain'
  ];
  for (const w of gardenAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'blessed-tree-garden',
        moodLabel: 'Jannah Tree',
        icon: '🌳',
        category: 'Paradise & Bliss',
        matchedKeyword: w,
      };
    }
  }
  for (const w of gardenEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'blessed-tree-garden',
        moodLabel: 'Jannah Tree',
        icon: '🌳',
        category: 'Paradise & Bliss',
        matchedKeyword: w,
      };
    }
  }

  // 10. OCEAN WAVES, THE TWO SEAS & SAILING ARKS
  const seaAr = ['بحر', 'بحرين', 'فلك', 'سفينه', 'موج', 'لؤلؤ', 'مرجان', 'يم', 'مرج البحرين', 'برزخ'];
  const seaEn = ['sea', 'seas', 'ocean', 'ship', 'ships', 'ark', 'waves', 'pearls', 'coral', 'two seas'];
  for (const w of seaAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'two-seas-ship',
        moodLabel: 'Ocean & Ship',
        icon: '🌊',
        category: 'Signs of the Ocean',
        matchedKeyword: w,
      };
    }
  }
  for (const w of seaEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'two-seas-ship',
        moodLabel: 'Ocean & Ship',
        icon: '🌊',
        category: 'Signs of the Ocean',
        matchedKeyword: w,
      };
    }
  }

  // 11. RAIN FROM THE SKY & EARTH REVIVAL
  const rainAr = ['ماء من السماء', 'مطر', 'غيث', 'سحاب', 'احيينا به', 'نبات', 'زرع', 'ماء طهورا'];
  const rainEn = ['rain', 'water from the sky', 'clouds', 'revived the earth', 'vegetation', 'pure water'];
  for (const w of rainAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rain-revival',
        moodLabel: 'Life Rain',
        icon: '🌧️',
        category: 'Revival & Earth',
        matchedKeyword: w,
      };
    }
  }
  for (const w of rainEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rain-revival',
        moodLabel: 'Life Rain',
        icon: '🌧️',
        category: 'Revival & Earth',
        matchedKeyword: w,
      };
    }
  }

  // 12. SOLAR ECLIPSE, THE HOUR & QIYAMAH
  const qiyamahAr = [
    'واقعه', 'قارعه', 'زلزله', 'ساعه', 'قيامه', 'كورت', 'انفطرت', 'انشقت',
    'رجت', 'بست', 'دكت', 'حاقه', 'طامه', 'صاخه', 'نفخ في الصور', 'يوم الدين'
  ];
  const qiyamahEn = [
    'event', 'resurrection', 'earthquake', 'shaken', 'trumpet', 'overthrown',
    'cleft asunder', 'the hour', 'calamity', 'day of judgment'
  ];
  for (const w of qiyamahAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-eclipse-qiyamah',
        moodLabel: 'Eclipse Awe',
        icon: '🌑',
        category: 'Qiyamah & Upheaval',
        matchedKeyword: w,
      };
    }
  }
  for (const w of qiyamahEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-eclipse-qiyamah',
        moodLabel: 'Eclipse Awe',
        icon: '🌑',
        category: 'Qiyamah & Upheaval',
        matchedKeyword: w,
      };
    }
  }

  // 13. HELLFIRE, BLAZING CRAGS & SOLEMN WARNING
  const fireAr = [
    'نار', 'جهنم', 'جحيم', 'سعير', 'سقر', 'لظي', 'حطمه', 'عذاب', 'ويل',
    'سموم', 'حميم', 'زقوم', 'شواظ', 'حريق'
  ];
  const fireEn = [
    'fire', 'hell', 'blaze', 'blazing', 'punishment', 'torment', 'scald',
    'flames', 'boiling', 'woe', 'severe penalty'
  ];
  for (const w of fireAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'ember-warning',
        moodLabel: 'Ember Warning',
        icon: '🔥',
        category: 'Solemn Warning',
        matchedKeyword: w,
      };
    }
  }
  for (const w of fireEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'ember-warning',
        moodLabel: 'Ember Warning',
        icon: '🔥',
        category: 'Solemn Warning',
        matchedKeyword: w,
      };
    }
  }

  // 14. THE SACRED KAABA & MAKKAH
  const kaabaAr = ['كعبه', 'بيت حرام', 'مكه', 'بكه', 'حج', 'طواف', 'قبله', 'ابراهيم مقام'];
  const kaabaEn = ['kaaba', 'sacred house', 'makkah', 'pilgrimage', 'tawaf', 'qiblah'];
  for (const w of kaabaAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'kaaba-sanctuary',
        moodLabel: 'Kaaba House',
        icon: '🕋',
        category: 'Sacred Sanctuary',
        matchedKeyword: w,
      };
    }
  }
  for (const w of kaabaEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'kaaba-sanctuary',
        moodLabel: 'Kaaba House',
        icon: '🕋',
        category: 'Sacred Sanctuary',
        matchedKeyword: w,
      };
    }
  }

  // 15. MOSQUE ARCADE, PRAYER & WORSHIP
  const prayerAr = ['صلاه', 'سجود', 'ركوع', 'مسجد', 'دعاء', 'سبحان', 'ذكر', 'اذان', 'محراب'];
  const prayerEn = ['prayer', 'prostrate', 'bow', 'mosque', 'worship', 'supplication', 'praise'];
  for (const w of prayerAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rawdah-mihrab-prayer',
        moodLabel: 'Rawdah Arcade',
        icon: '🕌',
        category: 'Worship & Prayer',
        matchedKeyword: w,
      };
    }
  }
  for (const w of prayerEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rawdah-mihrab-prayer',
        moodLabel: 'Rawdah Arcade',
        icon: '🕌',
        category: 'Worship & Prayer',
        matchedKeyword: w,
      };
    }
  }

  // 16. BARRIERS, SHACKLES & VEILS (Ghafilun / As-Sadd)
  const barrierAr = ['اغلال', 'سد', 'غافلون', 'ابصارهم', 'ختم', 'غشاوه', 'صم بكم'];
  const barrierEn = ['shackles', 'barrier', 'barriers', 'heedless', 'sealed', 'blind', 'veil'];
  for (const w of barrierAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'iron-chains-veil',
        moodLabel: 'Veil & Barrier',
        icon: '⛓️',
        category: 'Warning & Barrier',
        matchedKeyword: w,
      };
    }
  }
  for (const w of barrierEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'iron-chains-veil',
        moodLabel: 'Veil & Barrier',
        icon: '⛓️',
        category: 'Warning & Barrier',
        matchedKeyword: w,
      };
    }
  }

  // 17. ANCIENT NATIONS, DESERT CANYONS & PARABLES
  const desertAr = ['قريه', 'اصحاب', 'فرعون', 'عاد', 'ثمود', 'جبال', 'حجر', 'اوتاد', 'مد الارض'];
  const desertEn = ['city', 'people of', 'pharaoh', 'mountains', 'dwellings', 'ancients', 'generations'];
  for (const w of desertAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'desert-fortress-history',
        moodLabel: 'Desert Canyon',
        icon: '🏜️',
        category: 'History & Signs',
        matchedKeyword: w,
      };
    }
  }
  for (const w of desertEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'desert-fortress-history',
        moodLabel: 'Desert Canyon',
        icon: '🏜️',
        category: 'History & Signs',
        matchedKeyword: w,
      };
    }
  }

  // 18. HARMONIC FALLBACK WITH SEQUENTIAL CONTRAST
  const fallbackIndex = Math.abs(surahNumber * 7 + ayahNumber) % FALLBACK_SCENE_SEQUENCE.length;
  const item = FALLBACK_SCENE_SEQUENCE[fallbackIndex];

  return {
    ayahNumber,
    sceneId: item.sceneId,
    moodLabel: item.label,
    icon: item.icon,
    category: item.category,
  };
}

/**
 * Proportional Translation Clause Slicer:
 * Gracefully divides any translation (English, Urdu, Hindi, Gujarati) across N visual segments.
 */
export function splitTranslationIntoClauses(fullTranslation: string, count: number): string[] {
  if (!fullTranslation || count <= 1) return [fullTranslation || ''];
  const sentences = fullTranslation
    .split(/([.;!?।\n]+|\s+--\s+)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);

  if (sentences.length >= count) {
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const startIdx = Math.round((i * sentences.length) / count);
      const endIdx = Math.round(((i + 1) * sentences.length) / count);
      const slice = sentences.slice(startIdx, Math.max(startIdx + 1, endIdx)).join(' ');
      result.push(slice || fullTranslation);
    }
    return result;
  }

  // Fallback: Split by word count proportionately
  const words = fullTranslation.trim().split(/\s+/);
  if (words.length <= count) {
    return Array(count).fill(fullTranslation);
  }
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const startIdx = Math.round((i * words.length) / count);
    const endIdx = Math.round(((i + 1) * words.length) / count);
    const chunk = words.slice(startIdx, Math.max(startIdx + 1, endIdx)).join(' ');
    result.push(chunk || fullTranslation);
  }
  return result;
}

// Curated 1:1 Clause Dictionaries for Multi-Clause Masterpiece Verses
export const CURATED_MASTERPIECE_CLAUSES: Record<
  string, // `${surahNumber}:${ayahNumber}`
  {
    clauses: Array<{
      arabic: string;
      sceneId: SceneId;
      label: string;
      icon: string;
      defaultRatio: [number, number]; // [startRatio, endRatio]
      translations: {
        en: string;
        ur: string;
        hi: string;
        gu: string;
      };
    }>;
  }
> = {
  '24:35': {
    clauses: [
      {
        arabic: 'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ ۚ',
        sceneId: 'heavens-earth-rays',
        label: 'Heavens & Noor',
        icon: '🌅',
        defaultRatio: [0.00, 0.10],
        translations: {
          en: 'Allah is the Light of the heavens and the earth.',
          ur: 'اللہ آسمانوں اور زمین کا نور ہے۔',
          hi: 'अल्लाह आकाशों और धरती का नूर (ज्योति) है।',
          gu: 'અલ્લાહ આકાશો અને ધરતીનો નૂર (પ્રકાશ) છે.',
        },
      },
      {
        arabic: 'مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ ۖ',
        sceneId: 'niche-lamp',
        label: 'Mishkat Lamp',
        icon: '🏮',
        defaultRatio: [0.10, 0.20],
        translations: {
          en: 'The example of His light is like a niche within which is a lamp;',
          ur: 'اس کے نور کی مثال ایسی ہے جیسے ایک طاق جس میں ایک چراغ ہو،',
          hi: 'उसके नूर की मिसाल ऐसी है जैसे एक ताक़ (दीवार का आला) हो जिसमें एक चिराग़ हो,',
          gu: 'તેના નૂરનું ઉદાહરણ એવું છે જાણે કે એક ગોખલો જેમાં એક દીવો હોય,',
        },
      },
      {
        arabic: 'الْمِصْبَاحُ فِي زُجَاجَةٍ ۖ الزُّجَاجَةُ كَأَنَّهَا كَوْكَبٌ دُرِّيٌّ',
        sceneId: 'glass-orb-lamp',
        label: 'Crystal Orb',
        icon: '🔮',
        defaultRatio: [0.20, 0.31],
        translations: {
          en: 'the lamp is within glass, the glass as if it were a pearly star,',
          ur: 'چراغ ایک شیشے کی قندیل میں ہے، قندیل گویا موتی جیسا چمکتا ہوا تارہ ہے،',
          hi: 'चिराग़ एक शीशे की कंदील में हो, कंदील मानो मोती जैसा चमकता हुआ तारा हो,',
          gu: 'દીવો એક કાચની કંદીલમાં હોય, કંદીલ જાણે મોતી જેવો ચમકતો તારો હોય,',
        },
      },
      {
        arabic: 'يُوقَدُ مِن شَجَرَةٍ مُّبَارَكَةٍ زَيْتُونَةٍ لَّا شَرْقِيَّةٍ وَلَا غَرْبِيَّةٍ يَكَادُ زَيْتُهَا يُضِيءُ وَلَوْ لَمْ تَمْسَسْهُ نَارٌ ۚ',
        sceneId: 'pearly-star',
        label: 'Blessed Olive Tree',
        icon: '🫒',
        defaultRatio: [0.31, 0.66],
        translations: {
          en: 'lit from a blessed olive tree, neither of east nor west, whose oil would almost glow even if untouched by fire.',
          ur: 'وہ زیتون کے بابرکت درخت کے تیل سے جلایا جاتا ہے جو نہ مشرقی ہے نہ مغربی، اس کا تیل آپ ہی آپ بھڑکا پڑتا ہے چاہے آگ اسے نہ بھی چھوئے،',
          hi: 'जो ज़ैतून के एक बरकत वाले पेड़ के तेल से जलाया जाता हो, जो न पूरब का हो न पच्छिम का; उसका तेल ऐसा हो कि वह खुद ही भड़क उठे चाहे आग उसे न भी छुए,',
          gu: 'જે ઝૈતૂનના બરકતવાળા વૃક્ષથી પ્રગટાવાયો હોય, જે ન પૂર્વનું હોય ન પશ્ચિમનું; તેનું તેલ એવું હોય કે જાણે પોતે જ સળગી ઊઠશે ભલે આગ તેને અડી પણ ન હોય,',
        },
      },
      {
        arabic: 'نُّورٌ عَلَىٰ نُورٍ ۗ يَهْدِي اللَّهُ لِنُورِهِ مَن يَشَاءُ ۚ وَيَضْرِبُ اللَّهُ الْأَمْثَالَ لِلنَّاسِ ۗ وَاللَّهُ بِكُلِّ شَيْءٍ عَلِيمٌ',
        sceneId: 'heavens-earth-rays',
        label: 'Light Upon Light',
        icon: '✨',
        defaultRatio: [0.66, 1.00],
        translations: {
          en: 'Light upon light. Allah guides to His light whom He wills. And Allah presents examples for the people, and Allah is Knowing of all things.',
          ur: 'نور پر نور ہے۔ اللہ اپنے نور کی طرف جسے چاہتا ہے رہنمائی فرماتا ہے، اور اللہ لوگوں کے لیے مثالیں بیان فرماتا ہے، اور اللہ ہر چیز کا خوب جاننے والا ہے۔',
          hi: 'नूर पर नूर! अल्लाह अपने नूर का मार्ग जिसे चाहता है दिखाता है, और अल्लाह लोगों के लिए मिसालें बयान करता है, और अल्लाह हर चीज़ को खूब जानने वाला है।',
          gu: 'નૂર પર નૂર! અલ્લાહ જેને ચાહે છે પોતાના નૂર તરફ માર્ગદર્શન આપે છે, અને અલ્લાહ લોકો માટે દ્રષ્ટાંતો રજૂ કરે છે, અને અલ્લાહ દરેક વસ્તુને ખૂબ સારી રીતે જાણે છે.',
        },
      },
    ],
  },
  '2:255': {
    clauses: [
      {
        arabic: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ',
        sceneId: 'heavens-earth-rays',
        label: 'The Ever-Living',
        icon: '🌅',
        defaultRatio: [0.00, 0.22],
        translations: {
          en: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of all existence. Neither drowsiness overtakes Him nor sleep.',
          ur: 'اللہ، اس کے سوا کوئی معبود نہیں، وہ ہمیشہ زندہ رہنے والا اور سب کو سنبھالنے والا ہے۔ نہ اسے اونگھ آتی ہے نہ نیند۔',
          hi: 'अल्लाह, जिसके सिवा कोई पूज्य नहीं, वह सदा जीवित और सबका संभालने वाला है। न उसे ऊंघ आती है और न नींद।',
          gu: 'અલ્લાહ, જેના સિવાય કોઈ ઈબાદતને લાયક નથી, તે સદા જીવંત અને સૌનો સંભાળ રાખનાર છે. તેને ન તો ઝોકું આવે છે કે ન ઊંઘ.',
        },
      },
      {
        arabic: 'لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ',
        sceneId: 'celestial-creation',
        label: 'Sovereignty of Heavens',
        icon: '✨',
        defaultRatio: [0.22, 0.44],
        translations: {
          en: 'To Him belongs whatever is in the heavens and whatever is on the earth. Who is it that can intercede with Him except by His permission?',
          ur: 'اسی کا ہے جو کچھ آسمانوں میں ہے اور جو کچھ زمین میں ہے۔ کون ہے جو اس کی اجازت کے بغیر اس کے پاس سفارش کر سکے؟',
          hi: 'उसी का है जो कुछ आकाशों में है और जो कुछ धरती में है। कौन है जो उसकी अनुमति के बिना उसके पास सिफ़ारिश कर सके?',
          gu: 'તેનું જ છે જે કંઈ આકાશોમાં છે અને જે કંઈ ધરતીમાં છે. કોણ છે જે તેની પરવાનગી વિના તેની પાસે ભલામણ કરી શકે?',
        },
      },
      {
        arabic: 'يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ',
        sceneId: 'cosmic-scale',
        label: 'All-Encompassing Knowledge',
        icon: '⚖️',
        defaultRatio: [0.44, 0.70],
        translations: {
          en: 'He knows what is before them and what will be after them, and they encompass not a thing of His knowledge except for what He wills.',
          ur: 'وہ جانتا ہے جو کچھ ان کے سامنے ہے اور جو کچھ ان کے پیچھے ہے، اور وہ اس کے علم میں سے کسی چیز کا احاطہ نہیں کر سکتے مگر جتنا وہ چاہے۔',
          hi: 'वह जानता है जो कुछ उनके आगे है और जो कुछ उनके पीछे है, और वे उसके ज्ञान में से किसी चीज़ को अपने घेरे में नहीं ले सकते सिवाय उसके जितना वह चाहे।',
          gu: 'તે જાણે છે જે કંઈ તેઓની આગળ છે અને જે કંઈ તેઓની પાછળ છે, અને તેઓ તેના જ્ઞાનમાંથી કોઈ વસ્તુનો ઘેરાવ કરી શકતા નથી સિવાય કે જે તે ઇચ્છે.',
        },
      },
      {
        arabic: 'وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
        sceneId: 'heavens-earth-rays',
        label: 'Throne of Majesty',
        icon: '🌅',
        defaultRatio: [0.70, 1.00],
        translations: {
          en: 'His Kursi extends over the heavens and the earth, and their preservation tires Him not. And He is the Most High, the Most Great.',
          ur: 'اس کی کرسی آسمانوں اور زمین پر چھائی ہوئی ہے، اور ان دونوں کی حفاظت اس پر گراں نہیں گزرتی، اور وہ سب سے بلند اور سب سے بڑا ہے۔',
          hi: 'उसकी कुर्सी ने आकाशों और धरती को घेर रखा है, और इन दोनों की हिफ़ाज़त उसे थकाती नहीं, और वह सबसे उच्च और सबसे महान है।',
          gu: 'તેની કુરસી આકાશો અને ધરતી પર છવાયેલી છે, અને આ બંનેનું રક્ષણ તેને થકવતું નથી, અને તે સર્વોચ્ચ અને મહાન છે.',
        },
      },
    ],
  },
};

/**
 * Sub-Ayah Phrase Choreography (video_2.mp4 signature feature):
 * Whenever an Ayah contains multiple distinct visual clauses (e.g. Surah An-Nur 24:35 & Ayat al-Kursi 2:255),
 * or when duration is long (> 7s), this splits the verse into 1 to 5 timed visual segments.
 * Each segment contains only its matching Arabic and translation clause in large readable type.
 */
export function resolveAyahVisualTimeline(
  ayahTextArabic: string,
  translationEn: string = '',
  surahNumber: number = 1,
  ayahNumber: number = 1,
  durationSec: number = 8.0,
  subtitleLang: string = 'en'
): VisualSegment[] {
  const safeDur = Math.max(1.0, durationSec);
  const verseKey = `${surahNumber}:${ayahNumber}`;

  // Check Curated Masterpiece Verses (Surah An-Nur 24:35 & Ayat al-Kursi 2:255)
  const curated = CURATED_MASTERPIECE_CLAUSES[verseKey];
  if (curated) {
    // Determine language to present
    let lang = subtitleLang;
    if (lang === 'none' || lang === 'ar' || !lang) {
      if (/[\u0600-\u06FF]/.test(translationEn)) lang = 'ur';
      else if (/[\u0900-\u097F]/.test(translationEn)) lang = 'hi';
      else if (/[\u0A80-\u0AFF]/.test(translationEn)) lang = 'gu';
      else lang = 'en';
    }

    return curated.clauses.map((c) => {
      const [startRatio, endRatio] = c.defaultRatio;
      const transText =
        c.translations[lang as keyof typeof c.translations] ||
        c.translations.en;

      return {
        startRatio,
        endRatio,
        startTime: safeDur * startRatio,
        endTime: safeDur * endRatio,
        sceneId: c.sceneId,
        label: c.label,
        icon: c.icon,
        arabicClause: c.arabic,
        translationClause: transText,
      };
    });
  }

  // 3. Multi-Clause splitting for long verses (> 8.5s or > 140 chars)
  if (safeDur >= 8.5 || ayahTextArabic.length > 140) {
    const ar = cleanArabicForMatching(ayahTextArabic);
    // Find midpoint pause mark or clause connector
    const midTokens = [' ۚ ', ' ۖ ', ' ۗ ', ' ثم ', ' وان ', ' فان '];
    let splitIdx = -1;
    for (const tok of midTokens) {
      const idx = ayahTextArabic.indexOf(tok);
      if (idx > 25 && idx < ayahTextArabic.length - 25) {
        splitIdx = idx + tok.length;
        break;
      }
    }
    if (splitIdx === -1) {
      splitIdx = Math.floor(ayahTextArabic.length * 0.5);
    }

    const firstHalfAr = ayahTextArabic.slice(0, splitIdx).trim();
    const secondHalfAr = ayahTextArabic.slice(splitIdx).trim();
    const transParts = splitTranslationIntoClauses(translationEn, 2);

    const res1 = resolveSceneForAyah(firstHalfAr, transParts[0], surahNumber, ayahNumber);
    const res2 = resolveSceneForAyah(secondHalfAr, transParts[1], surahNumber, ayahNumber);

    return [
      {
        startRatio: 0.00,
        endRatio: 0.50,
        startTime: 0.00,
        endTime: safeDur * 0.50,
        sceneId: res1.sceneId,
        label: res1.moodLabel,
        icon: res1.icon,
        arabicClause: firstHalfAr,
        translationClause: transParts[0],
      },
      {
        startRatio: 0.50,
        endRatio: 1.00,
        startTime: safeDur * 0.50,
        endTime: safeDur,
        sceneId: res2.sceneId,
        label: res2.moodLabel,
        icon: res2.icon,
        arabicClause: secondHalfAr,
        translationClause: transParts[1],
      },
    ];
  }

  // Default: 1 unified segment for the Ayah
  const singleRes = resolveSceneForAyah(ayahTextArabic, translationEn, surahNumber, ayahNumber);
  return [
    {
      startRatio: 0.00,
      endRatio: 1.00,
      startTime: 0.00,
      endTime: safeDur,
      sceneId: singleRes.sceneId,
      label: singleRes.moodLabel,
      icon: singleRes.icon,
      arabicClause: ayahTextArabic,
      translationClause: translationEn,
    },
  ];
}

/**
 * Resolves a full sequence of Ayahs for "✨ Auto Meaning" mode.
 * Enforces variety so adjacent Ayahs transition across distinct visual themes.
 */
export function resolveSceneJourney(
  ayahs: Array<{ ayahNumber: number; textUthmani: string; translation?: string }>,
  surahNumber: number = 1,
  subtitleLang: string = 'en'
): AyahSceneResolution[] {
  const result: AyahSceneResolution[] = [];

  for (let i = 0; i < ayahs.length; i++) {
    const a = ayahs[i];
    let res = resolveSceneForAyah(a.textUthmani, a.translation || '', surahNumber, a.ayahNumber);
    const subTimeline = resolveAyahVisualTimeline(a.textUthmani, a.translation || '', surahNumber, a.ayahNumber, 6.0, subtitleLang);
    res.subTimeline = subTimeline;

    // If identical to the previous Ayah's scene, nudge fallback if it was a generic fallback match
    if (i > 0 && res.sceneId === result[i - 1].sceneId && !res.matchedKeyword) {
      const nextIndex = (Math.abs(surahNumber * 7 + a.ayahNumber + 1)) % FALLBACK_SCENE_SEQUENCE.length;
      const nextFallback = FALLBACK_SCENE_SEQUENCE[nextIndex];
      res = {
        ayahNumber: a.ayahNumber,
        sceneId: nextFallback.sceneId,
        moodLabel: nextFallback.label,
        icon: nextFallback.icon,
        category: nextFallback.category,
        subTimeline: [
          {
            startRatio: 0.00,
            endRatio: 1.00,
            startTime: 0.00,
            endTime: 6.0,
            sceneId: nextFallback.sceneId,
            label: nextFallback.label,
            icon: nextFallback.icon,
          },
        ],
      };
    }

    result.push(res);
  }

  return result;
}
