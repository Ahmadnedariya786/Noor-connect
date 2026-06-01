/**
 * Islamic Cycle Utilities
 * Islamic context-aware features for menstrual cycle tracking
 */

import type { CyclePhase } from '@/types/menstrual';

// ============================================
// Prayer Guidance by Phase
// ============================================

interface PrayerGuidance {
  canPray: boolean;
  canFast: boolean;
  canReadQuran: boolean;
  canVisitMosque: boolean;
  suggestion: string;
  shortPrayerTip?: string;
}

export const getPrayerGuidance = (phase: CyclePhase, isActive: boolean): PrayerGuidance => {
  if (!isActive || phase !== 'menstrual') {
    return {
      canPray: true,
      canFast: true,
      canReadQuran: true,
      canVisitMosque: true,
      suggestion: 'Continue with your regular worship routine.',
    };
  }

  return {
    canPray: false,
    canFast: false,
    canReadQuran: false,
    canVisitMosque: false,
    suggestion: 'You are exempt from prayer and fasting during menstruation. Focus on dhikr, dua, and acts of kindness.',
    shortPrayerTip: 'Instead of formal salah, engage in extra dhikr: SubhanAllah, Alhamdulillah, Allahu Akbar.',
  };
};

// ============================================
// Ramadan Fasting Management
// ============================================

interface FastingStatus {
  exempt: boolean;
  missedFasts: number;
  makeUpRequired: number;
  fidyahRequired: boolean;
  recommendation: string;
}

export const getRamadanGuidance = (
  phase: CyclePhase,
  isActive: boolean,
  missedFasts: number = 0
): FastingStatus => {
  if (!isActive || phase !== 'menstrual') {
    return {
      exempt: false,
      missedFasts,
      makeUpRequired: missedFasts,
      fidyahRequired: false,
      recommendation: missedFasts > 0
        ? `You have ${missedFasts} make-up fasts remaining. Plan to complete them before next Ramadan.`
        : 'You can fast normally. Maintain suhoor with complex carbs and protein.',
    };
  }

  return {
    exempt: true,
    missedFasts: missedFasts + 1,
    makeUpRequired: missedFasts + 1,
    fidyahRequired: false,
    recommendation: 'You are exempt from fasting during menstruation. These fasts must be made up after Ramadan. No fidyah is required.',
  };
};

/**
 * Calculate make-up fast schedule
 */
export const calculateMakeUpSchedule = (
  totalMissed: number,
  startDate: Date = new Date()
): Array<{ date: Date; fastNumber: number }> => {
  const schedule: Array<{ date: Date; fastNumber: number }> = [];
  const avoidDays = [
    // Eid al-Fitr (approximate - should be dynamic)
    // Eid al-Adha (approximate - should be dynamic)
    // Fridays alone (Sunnah to fast Thu+Fri or Fri+Sat)
  ];

  const currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Start tomorrow

  let count = 0;
  while (count < totalMissed) {
    const dayOfWeek = currentDate.getDay();

    // Prefer Monday and Thursday (Sunnah fasting days)
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      schedule.push({
        date: new Date(currentDate),
        fastNumber: count + 1,
      });
      count++;
    }
    // Or add other days if we need more
    else if (schedule.length < totalMissed && dayOfWeek !== 5) {
      // Avoid Friday alone
      const nextDay = new Date(currentDate);
      nextDay.setDate(nextDay.getDate() + 1);
      if (nextDay.getDay() !== 5) {
        // Not followed by Friday alone
        schedule.push({
          date: new Date(currentDate),
          fastNumber: count + 1,
        });
        count++;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedule;
};

// ============================================
// Eid Preparation
// ============================================

interface EidPreparation {
  eidDate: Date | null;
  daysUntil: number;
  expectedPhase: CyclePhase | null;
  willBeOnPeriod: boolean;
  suggestion: string;
}

/**
 * Check if period might overlap with Eid
 */
export const checkEidOverlap = (
  nextPeriodDate: Date | null,
  periodLength: number,
  eidDate: Date
): EidPreparation => {
  if (!nextPeriodDate) {
    return {
      eidDate,
      daysUntil: Math.ceil((eidDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      expectedPhase: null,
      willBeOnPeriod: false,
      suggestion: 'Track your cycle to predict if your period will overlap with Eid.',
    };
  }

  const periodEnd = new Date(nextPeriodDate);
  periodEnd.setDate(periodEnd.getDate() + periodLength);

  const willBeOnPeriod = eidDate >= nextPeriodDate && eidDate <= periodEnd;
  const daysUntil = Math.ceil((eidDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  let suggestion: string;
  if (willBeOnPeriod) {
    suggestion = `Your period may overlap with Eid. Prepare by planning prayer alternatives and comfort items for the celebration.`;
  } else {
    suggestion = `You should be clear for Eid prayers and celebrations. Period is expected to end before Eid.`;
  }

  return {
    eidDate,
    daysUntil,
    expectedPhase: willBeOnPeriod ? 'menstrual' : null,
    willBeOnPeriod,
    suggestion,
  };
};

// ============================================
// Nutrition Tips by Phase (Islamic Context)
// ============================================

interface IslamicNutritionTip {
  tip: string;
  hadithReference?: string;
  benefit: string;
}

export const getIslamicNutritionTips = (phase: CyclePhase): IslamicNutritionTip[] => {
  const tips: Record<CyclePhase, IslamicNutritionTip[]> = {
    menstrual: [
      {
        tip: 'Eat dates (Ajwa or Medjool) for energy and iron',
        hadithReference: 'Sahih Bukhari',
        benefit: 'Dates are rich in iron, helping replenish blood loss during menstruation.',
      },
      {
        tip: 'Drink warm water with honey',
        hadithReference: 'Quran 16:69',
        benefit: 'Honey has healing properties and helps with cramps and digestion.',
      },
      {
        tip: 'Include black seed (Nigella sativa) in your diet',
        hadithReference: 'Sahih Bukhari',
        benefit: 'Black seed is known for its healing properties and anti-inflammatory effects.',
      },
      {
        tip: 'Eat pomegranates for antioxidants',
        hadithReference: 'Quran 55:68',
        benefit: 'Pomegranates are rich in iron and antioxidants, supporting blood health.',
      },
    ],
    follicular: [
      {
        tip: 'Start your day with Suhoor-style meals: complex carbs and protein',
        benefit: 'Sustained energy throughout the day during your rising energy phase.',
      },
      {
        tip: 'Include olive oil in your meals',
        hadithReference: 'Quran 23:20',
        benefit: 'Olive oil supports hormone balance and provides healthy fats.',
      },
    ],
    ovulatory: [
      {
        tip: 'Stay hydrated with Zamzam water or regular water',
        benefit: 'Peak energy phase requires optimal hydration for body functions.',
      },
      {
        tip: 'Include fiber-rich foods for digestive health',
        benefit: 'Supports estrogen metabolism during ovulation.',
      },
    ],
    luteal: [
      {
        tip: 'Eat magnesium-rich foods: dates, almonds, spinach',
        benefit: 'Magnesium helps with mood regulation and sleep quality.',
      },
      {
        tip: 'Have warm soups and stews',
        benefit: 'Warming foods support the body during the cooling luteal phase.',
      },
    ],
    premenstrual: [
      {
        tip: 'Reduce salt intake to minimize bloating',
        benefit: 'Helps prevent water retention common before menstruation.',
      },
      {
        tip: 'Drink chamomile tea for relaxation',
        benefit: 'Natural calming properties help with PMS anxiety and sleep.',
      },
    ],
  };

  return tips[phase] || tips.follicular;
};

// ============================================
// Duas by Phase
// ============================================

interface PhaseDua {
  arabic: string;
  transliteration: string;
  translation: string;
  occasion: string;
}

export const getPhaseDuas = (phase: CyclePhase): PhaseDua[] => {
  const duas: Record<CyclePhase, PhaseDua[]> = {
    menstrual: [
      {
        arabic: 'اللَّهُمَّ اشْفِنِي',
        transliteration: "Allahumma ishfini",
        translation: 'O Allah, heal me.',
        occasion: 'For relief from pain and discomfort',
      },
      {
        arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي',
        transliteration: 'Rabbish rahli sadri',
        translation: 'My Lord, expand for me my breast.',
        occasion: 'For ease and emotional comfort',
      },
      {
        arabic: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
        transliteration: "La ilaha illa anta subhanaka inni kuntu minaz-zalimin",
        translation: 'There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.',
        occasion: 'Dua of Yunus (AS) - accepted for any difficulty',
      },
    ],
    follicular: [
      {
        arabic: 'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina adhaban-nar',
        translation: 'Our Lord, give us in this world good and in the Hereafter good and protect us from the punishment of the Fire.',
        occasion: 'Comprehensive dua for worldly and spiritual goodness',
      },
    ],
    ovulatory: [
      {
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        transliteration: 'Rabbi zidni ilma',
        translation: 'My Lord, increase me in knowledge.',
        occasion: 'For growth and peak energy utilization',
      },
    ],
    luteal: [
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الصَّبْرَ',
        transliteration: "Allahumma inni as'aluka as-sabr",
        translation: 'O Allah, I ask You for patience.',
        occasion: 'For patience during the winding down phase',
      },
    ],
    premenstrual: [
      {
        arabic: 'اللَّهُمَّ لَا سَهْلَ إِلَّا مَا جَعَلْتَهُ سَهْلًا',
        transliteration: "Allahumma la sahla illa ma ja'altahu sahla",
        translation: 'O Allah, there is no ease except in what You have made easy.',
        occasion: 'For ease during challenging PMS days',
      },
    ],
  };

  return duas[phase] || duas.follicular;
};

// ============================================
// Activity Suggestions by Phase
// ============================================

export const getPhaseActivities = (phase: CyclePhase): string[] => {
  const activities: Record<CyclePhase, string[]> = {
    menstrual: [
      'Make extra dhikr while resting',
      'Listen to Quran recitation',
      'Read Islamic books about women in Islam',
      'Make dua during times of prayer acceptance',
      'Give charity (sadaqah) for ease',
    ],
    follicular: [
      'Attend Islamic study circles',
      'Memorize new Quran verses',
      'Volunteer for community service',
      'Start a new learning project',
      'Engage in congregational prayers',
    ],
    ovulatory: [
      'Increase voluntary prayers (Nafl)',
      'Practice Tahajjud (night prayer)',
      'Engage in teaching others',
      'Deep Quran reflection (Tadabbur)',
      'Intensive dhikr sessions',
    ],
    luteal: [
      'Maintain consistent daily prayers',
      'Practice gratitude journaling',
      'Read stories of the Prophets',
      'Gentle dhikr for calm',
      'Connect with supportive sisters',
    ],
    premenstrual: [
      'Simplify worship - focus on quality',
      'Extra istighfar (seeking forgiveness)',
      'Listen to soothing Islamic lectures',
      'Practice patience (Sabr) intentionally',
      'Make dua for emotional stability',
    ],
  };

  return activities[phase] || activities.follicular;
};
