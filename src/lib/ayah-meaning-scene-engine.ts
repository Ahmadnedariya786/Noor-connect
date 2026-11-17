/**
 * NOOR CONNECT — SEMANTIC AYAH-MEANING SCENE ENGINE
 * 
 * 100% Offline, Deterministic Semantic Classifier that analyzes Arabic root tokens
 * and English translation keywords to dynamically map each individual Ayah to a
 * thematic procedural canvas background (Cosmic, Jannah, Warning, Ocean, Sunset,
 * Divine Light, Kaaba Sanctuary, etc.) with 700ms cross-fades.
 */

import type { SceneId } from './quran-clip-renderer';

export interface AyahSceneResolution {
  ayahNumber: number;
  sceneId: SceneId;
  moodLabel: string;
  category: string;
  matchedKeyword?: string;
}

// Clean tashkeel & diacritics for accurate Arabic keyword matching
function cleanArabicForMatching(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[إأآء]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

function cleanEnglishForMatching(text: string): string {
  if (!text) return '';
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
}

// Curated harmonic fallback cycle for Ayahs with general narrative text
const FALLBACK_SCENE_SEQUENCE: Array<{ sceneId: SceneId; moodLabel: string; category: string }> = [
  { sceneId: 'kiswah-gold', moodLabel: 'Sanctuary Gold', category: 'Sacred Sanctuary' },
  { sceneId: 'persian-arch', moodLabel: 'Celestial Arch', category: 'Divine Light' },
  { sceneId: 'desert-sunset', moodLabel: 'Sunset Dunes', category: 'Creation & Earth' },
  { sceneId: 'moonlit-ocean', moodLabel: 'Moonlit Waters', category: 'Peace & Reflection' },
  { sceneId: 'rawdah-emerald', moodLabel: 'Emerald Garden', category: 'Living Grace' },
  { sceneId: 'dawn-glow', moodLabel: 'Honey Dawn', category: 'Dawn Horizon' },
  { sceneId: 'burgundy-velvet', moodLabel: 'Royal Mihrab', category: 'Sanctuary Elegance' },
  { sceneId: 'mushaf-parchment', moodLabel: 'Noble Parchment', category: 'Divine Scripture' },
];

/**
 * Deterministic Semantic Ayah Classifier:
 * Analyzes both stripped-tashkeel Arabic root tokens and English translation keywords.
 */
export function resolveSceneForAyah(
  ayahTextArabic: string,
  translationEn: string = '',
  surahNumber: number = 1,
  ayahNumber: number = 1
): AyahSceneResolution {
  const ar = cleanArabicForMatching(ayahTextArabic);
  const en = cleanEnglishForMatching(translationEn);

  // -------------------------------------------------------------------------
  // CATEGORY 1: Cosmic Upheaval / Qiyamah / The Hour / Judgment
  // -------------------------------------------------------------------------
  const cosmicAr = [
    'واقعه', 'قارعه', 'زلزله', 'ساعه', 'قيامه', 'رجت', 'بست', 'انفطرت', 'كورت',
    'انشقت', 'يوم الدين', 'حاقه', 'طامه', 'صاخه', 'دكت', 'زلزلت', 'اوزار', 'بعثر',
    'حشرت', 'سجرت', 'كواكب', 'نجوم انكدرت', 'سيرت', 'يوم يفر', 'يوم ترجف',
    'راجفه', 'رادفه', 'صيحه', 'نفخ في الصور', 'صور', 'خافضه رافعه'
  ];
  const cosmicEn = [
    'resurrection', 'earthquake', 'shaken', 'trumpet', 'reckoning', 'judgment',
    'scattered', 'overthrown', 'blast', 'inevitable', 'calamity', 'crushed',
    'terror', 'gathering', 'day of judgment', 'hour has come', 'sky splits',
    'stars scatter', 'mountains blown', 'heavens rent', 'the striking calamity'
  ];

  for (const w of cosmicAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-nebula',
        moodLabel: 'Cosmic Awe',
        category: 'Qiyamah & Cosmic Power',
        matchedKeyword: w,
      };
    }
  }
  for (const w of cosmicEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'cosmic-nebula',
        moodLabel: 'Cosmic Awe',
        category: 'Qiyamah & Cosmic Power',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 2: Warning / Hellfire / Accountability / Torment
  // -------------------------------------------------------------------------
  const emberAr = [
    'نار', 'جهنم', 'جحيم', 'سعير', 'لظي', 'سقر', 'حطمه', 'عذاب', 'ويل', 'سموم',
    'حميم', 'زقوم', 'شواظ', 'نحاس', 'غسلين', 'سلاسل', 'اغلال', 'سعرت', 'حاصب',
    'نكال', 'رجيم', 'عذاب اليم', 'عذاب مهين', 'عذاب غليظ', 'حريق'
  ];
  const emberEn = [
    'hell', 'blaze', 'blazing', 'punishment', 'torment', 'scald', 'scalding',
    'flame', 'flames', 'smoke', 'boiling', 'chains', 'ruin', 'fuel', 'severe',
    'wrath', 'woe', 'painful punishment', 'burning fire', 'abode of fire'
  ];

  for (const w of emberAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'ember-horizon',
        moodLabel: 'Ember Warning',
        category: 'Solemn Warning & Justice',
        matchedKeyword: w,
      };
    }
  }
  for (const w of emberEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'ember-horizon',
        moodLabel: 'Ember Warning',
        category: 'Solemn Warning & Justice',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 3: Jannah / Mercy / Gardens / Springs / Bliss
  // -------------------------------------------------------------------------
  const jannahAr = [
    'جنه', 'جنات', 'انهار', 'عين', 'عيون', 'رحمه', 'الرحمن', 'الرحيم', 'مغفره',
    'نعيم', 'فردوس', 'فاكهه', 'ابرار', 'سلام', 'طوبي', 'قطوف', 'دان', 'غرف',
    'سرر', 'حرير', 'سندس', 'استبرق', 'رضوان', 'متقين', 'فوز', 'جنات عدن',
    'ظل ممدود', 'ماء مسكوب', 'حور'
  ];
  const jannahEn = [
    'garden', 'gardens', 'paradise', 'rivers', 'springs', 'mercy', 'merciful',
    'forgive', 'forgiveness', 'bliss', 'righteous', 'peace', 'delight', 'fruits',
    'fountain', 'shades', 'silk', 'reward', 'favor', 'bounties', 'eternal home',
    'abode of peace', 'green brocade', 'cups of pure drink'
  ];

  for (const w of jannahAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rawdah-emerald',
        moodLabel: 'Emerald Mercy',
        category: 'Jannah & Divine Grace',
        matchedKeyword: w,
      };
    }
  }
  for (const w of jannahEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'rawdah-emerald',
        moodLabel: 'Emerald Mercy',
        category: 'Jannah & Divine Grace',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 4: Ocean / Water / Rain / Ships / Clouds
  // -------------------------------------------------------------------------
  const oceanAr = [
    'بحر', 'بحار', 'فلك', 'موج', 'ماء', 'سحاب', 'مطر', 'غيث', 'لؤلؤ', 'مرجان',
    'سفينه', 'جاريه', 'كوثر', 'سلسبيل', 'يم', 'مرج البحرين', 'برزخ', 'جوار'
  ];
  const oceanEn = [
    'sea', 'seas', 'ocean', 'waves', 'ship', 'ships', 'water', 'rain', 'clouds',
    'pearl', 'coral', 'vessel', 'sailing', 'fountain', 'flow', 'streams',
    'two seas meet', 'barrier between them', 'sailing ships'
  ];

  for (const w of oceanAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'moonlit-ocean',
        moodLabel: 'Moonlit Sea',
        category: 'Ocean & Waters of Life',
        matchedKeyword: w,
      };
    }
  }
  for (const w of oceanEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'moonlit-ocean',
        moodLabel: 'Moonlit Sea',
        category: 'Ocean & Waters of Life',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 5: Sun / Dawn / Day / Mountains / Earth
  // -------------------------------------------------------------------------
  const sunsetAr = [
    'شمس', 'ضحي', 'فجر', 'صبح', 'نهار', 'جبال', 'ارض', 'رياح', 'مشرق', 'مغرب',
    'طور', 'اوتاد', 'مد', 'حجر', 'وادي', 'قمر', 'ليل اذا يغشي', 'نهار اذا تجلي'
  ];
  const sunsetEn = [
    'sun', 'morning', 'dawn', 'daylight', 'mountain', 'mountains', 'earth', 'wind',
    'winds', 'east', 'west', 'sunset', 'dusk', 'horizon', 'firmly set', 'valley',
    'spread out the earth', 'pegs', 'daybreak'
  ];

  for (const w of sunsetAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'desert-sunset',
        moodLabel: 'Sunset Horizon',
        category: 'Creation & Majestic Earth',
        matchedKeyword: w,
      };
    }
  }
  for (const w of sunsetEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'desert-sunset',
        moodLabel: 'Sunset Horizon',
        category: 'Creation & Majestic Earth',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 6: Divine Light / Throne / Heavens / Angels
  // -------------------------------------------------------------------------
  const lightAr = [
    'نور', 'عرش', 'كرسي', 'سماوات', 'ملائكه', 'روح', 'وحي', 'سبح', 'قدوس',
    'ملكوت', 'جبريل', 'ميكال', 'سدره', 'نور علي نور', 'مصباح', 'زجاجه', 'كوكب دري'
  ];
  const lightEn = [
    'light', 'throne', 'heavens', 'angels', 'angel', 'spirit', 'revelation',
    'glorify', 'stars', 'celestial', 'firmament', 'holy', 'radiance', 'ascend',
    'light upon light', 'highest realm', 'exalted'
  ];

  for (const w of lightAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'persian-arch',
        moodLabel: 'Celestial Noor',
        category: 'Divine Light & Heavens',
        matchedKeyword: w,
      };
    }
  }
  for (const w of lightEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'persian-arch',
        moodLabel: 'Celestial Noor',
        category: 'Divine Light & Heavens',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 7: Worship / Prayer / Kaaba / Quran / Dua / Remembrance
  // -------------------------------------------------------------------------
  const worshipAr = [
    'صلاه', 'سجود', 'ركوع', 'مسجد', 'بيت', 'كعبه', 'قران', 'كتاب', 'هدي',
    'ربنا', 'دعاء', 'سبحان', 'ذكر', 'اذان', 'قبله', 'حرم', 'ابراهيم', 'مقام',
    'امانه', 'تلاوه', 'فرقان'
  ];
  const worshipEn = [
    'prayer', 'prostrate', 'prostration', 'bow', 'mosque', 'house', 'kaaba',
    'quran', 'book', 'guidance', 'our lord', 'worship', 'supplication',
    'remembrance', 'sacred', 'scripture', 'recite', 'sanctuary'
  ];

  for (const w of worshipAr) {
    if (ar.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'kiswah-gold',
        moodLabel: 'Sanctuary Gold',
        category: 'Worship & Sacred Guidance',
        matchedKeyword: w,
      };
    }
  }
  for (const w of worshipEn) {
    if (en.includes(w)) {
      return {
        ayahNumber,
        sceneId: 'kiswah-gold',
        moodLabel: 'Sanctuary Gold',
        category: 'Worship & Sacred Guidance',
        matchedKeyword: w,
      };
    }
  }

  // -------------------------------------------------------------------------
  // CATEGORY 8: Harmonic Fallback with Sequential Variety
  // -------------------------------------------------------------------------
  const fallbackIndex = Math.abs(surahNumber * 7 + ayahNumber) % FALLBACK_SCENE_SEQUENCE.length;
  const item = FALLBACK_SCENE_SEQUENCE[fallbackIndex];

  return {
    ayahNumber,
    sceneId: item.sceneId,
    moodLabel: item.moodLabel,
    category: item.category,
  };
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

    // If identical to the previous Ayah's scene, nudge fallback if it was a generic fallback match
    if (i > 0 && res.sceneId === result[i - 1].sceneId && !res.matchedKeyword) {
      const nextIndex = (Math.abs(surahNumber * 7 + a.ayahNumber + 1)) % FALLBACK_SCENE_SEQUENCE.length;
      const nextFallback = FALLBACK_SCENE_SEQUENCE[nextIndex];
      res = {
        ayahNumber: a.ayahNumber,
        sceneId: nextFallback.sceneId,
        moodLabel: nextFallback.moodLabel,
        category: nextFallback.category,
      };
    }

    result.push(res);
  }

  return result;
}
