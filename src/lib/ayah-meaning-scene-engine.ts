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

  // 2. SURAH AN-NUR 24:35 — The Verse of Light (Ayat an-Nur)
  if (surahNumber === 24 && ayahNumber === 35) {
    return {
      ayahNumber,
      sceneId: 'heavens-earth-rays',
      moodLabel: 'Heavens & Noor',
      icon: '🌅',
      category: 'Divine Light',
      matchedKeyword: 'الله نور السماوات والارض',
    };
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

  // 4. PRIORITY 1 — SUN & MOON ORBIT & ASTRONOMICAL HARMONY
  const sunMoonAr = [
    'شمس وقمر',
    'شمس والقمر',
    'الشمس والقمر',
    'شمس',
    'قمر',
    'حسبان',
    'فلك يسبحون',
    'منازل القمر',
    'سراجا وهاجا',
    'ضياء ونورا',
  ];
  const sunMoonEn = [
    'sun and moon',
    'sun and the moon',
    'sun',
    'moon',
    'orbit',
    'orbits',
    'swimming in an orbit',
    'phases of the moon',
    'solar',
    'lunar',
  ];
  for (const w of sunMoonAr) {
    if (ar.includes(w)) {
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
  for (const w of sunMoonEn) {
    if (en.includes(w)) {
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
 * Sub-Ayah Phrase Choreography (video_2.mp4 signature feature):
 * Whenever an Ayah contains multiple distinct visual clauses (e.g. Surah An-Nur 24:35),
 * or when duration is long (> 7s), this splits the verse into 1 to 4 timed visual segments.
 */
export function resolveAyahVisualTimeline(
  ayahTextArabic: string,
  translationEn: string = '',
  surahNumber: number = 1,
  ayahNumber: number = 1,
  durationSec: number = 8.0
): VisualSegment[] {
  const safeDur = Math.max(1.0, durationSec);

  // 1. SURAH AN-NUR 24:35 — 4 distinct timed scenes
  if (surahNumber === 24 && ayahNumber === 35) {
    return [
      {
        startRatio: 0.00,
        endRatio: 0.25,
        startTime: 0.00,
        endTime: safeDur * 0.25,
        sceneId: 'heavens-earth-rays',
        label: 'Heavens & Noor',
        icon: '🌅',
      },
      {
        startRatio: 0.25,
        endRatio: 0.50,
        startTime: safeDur * 0.25,
        endTime: safeDur * 0.50,
        sceneId: 'niche-lamp',
        label: 'Mishkat Lamp',
        icon: '🏮',
      },
      {
        startRatio: 0.50,
        endRatio: 0.75,
        startTime: safeDur * 0.50,
        endTime: safeDur * 0.75,
        sceneId: 'glass-orb-lamp',
        label: 'Crystal Orb',
        icon: '🔮',
      },
      {
        startRatio: 0.75,
        endRatio: 1.00,
        startTime: safeDur * 0.75,
        endTime: safeDur,
        sceneId: 'pearly-star',
        label: 'Pearly Star',
        icon: '⭐',
      },
    ];
  }

  // 2. SURAH AL-WAQI'AH (56:1–3) — Single cohesive scenes per Ayah
  // 3. Multi-Clause splitting for long verses (> 8s) with distinct sentence boundaries
  if (safeDur >= 8.5) {
    const ar = cleanArabicForMatching(ayahTextArabic);
    // Check if verse has a clear midpoint clause (e.g. then, or, while)
    if (ar.includes(' ثم ') || ar.includes(' وان ') || ar.includes(' فان ') || translationEn.includes('; ') || translationEn.includes('. ')) {
      // Split into 2 halves
      const firstHalfAr = ayahTextArabic.slice(0, Math.floor(ayahTextArabic.length * 0.5));
      const secondHalfAr = ayahTextArabic.slice(Math.floor(ayahTextArabic.length * 0.5));
      const res1 = resolveSceneForAyah(firstHalfAr, translationEn, surahNumber, ayahNumber);
      const res2 = resolveSceneForAyah(secondHalfAr, translationEn, surahNumber, ayahNumber);

      if (res1.sceneId !== res2.sceneId) {
        return [
          {
            startRatio: 0.00,
            endRatio: 0.50,
            startTime: 0.00,
            endTime: safeDur * 0.50,
            sceneId: res1.sceneId,
            label: res1.moodLabel,
            icon: res1.icon,
          },
          {
            startRatio: 0.50,
            endRatio: 1.00,
            startTime: safeDur * 0.50,
            endTime: safeDur,
            sceneId: res2.sceneId,
            label: res2.moodLabel,
            icon: res2.icon,
          },
        ];
      }
    }
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
    },
  ];
}

/**
 * Resolves a full sequence of Ayahs for "✨ Auto Meaning" mode.
 * Enforces variety so adjacent Ayahs transition across distinct visual themes.
 */
export function resolveSceneJourney(
  ayahs: Array<{ ayahNumber: number; textUthmani: string; translation?: string }>,
  surahNumber: number = 1
): AyahSceneResolution[] {
  const result: AyahSceneResolution[] = [];

  for (let i = 0; i < ayahs.length; i++) {
    const a = ayahs[i];
    let res = resolveSceneForAyah(a.textUthmani, a.translation || '', surahNumber, a.ayahNumber);
    const subTimeline = resolveAyahVisualTimeline(a.textUthmani, a.translation || '', surahNumber, a.ayahNumber, 6.0);
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
