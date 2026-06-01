/**
 * Islamic Wellness Content for Menstrual Mode
 * Provides Islamic guidance and support during menstrual cycle
 */

export interface IslamicGuidance {
  phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'premenstrual';
  title: string;
  description: string;
  rulings: {
    prayer: string;
    fasting: string;
    quran: string;
    mosque: string;
  };
  spiritualPractices: string[];
  duas: Array<{
    arabic: string;
    transliteration: string;
    translation: string;
    occasion: string;
  }>;
  hadiths: Array<{
    text: string;
    source: string;
    relevance: string;
  }>;
  selfCare: string[];
}

export const islamicWellnessContent: IslamicGuidance[] = [
  {
    phase: 'menstrual',
    title: 'During Menstruation',
    description: 'A period of rest and spiritual reflection',
    rulings: {
      prayer: 'You are excused from obligatory prayers. Make up missed prayers later (qaza).',
      fasting: 'You are excused from fasting during Ramadan. Make up missed fasts later.',
      quran: 'You cannot touch the Quran or recite it, but can listen to recitations.',
      mosque: 'You cannot enter the prayer area of a mosque, but may enter other areas.'
    },
    spiritualPractices: [
      'Make abundant dhikr (remembrance of Allah)',
      'Listen to Quran recitations',
      'Read Islamic books and articles',
      'Make dua for forgiveness and guidance',
      'Reflect on the blessings of Allah',
      'Give charity (sadaqah)',
      'Help family members with household tasks'
    ],
    duas: [
      {
        arabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ سُبْحَانَ اللَّهِ الْعَظِيمِ',
        transliteration: 'Subhanallah wa bihamdihi, subhanallahil-adheem',
        translation: 'Glory is to Allah and all praise is to Him, glory is to Allah the Great',
        occasion: 'General remembrance'
      },
      {
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ',
        transliteration: 'Allahumma inni as-alukal-afiyah',
        translation: 'O Allah, I ask You for well-being',
        occasion: 'During discomfort'
      },
      {
        arabic: 'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا',
        transliteration: 'Rabbana la tuakhidhana in nasiina aw akhtaana',
        translation: 'Our Lord, do not impose blame upon us if we forget or make a mistake',
        occasion: 'For missed obligations'
      }
    ],
    hadiths: [
      {
        text: 'The Prophet (peace be upon him) said: "Is not the fact that she does not pray and fast during her menses a sign of her intellect?"',
        source: 'Sahih Bukhari',
        relevance: 'Shows the wisdom and mercy in Islamic rulings'
      },
      {
        text: 'Aisha reported that the Prophet (peace be upon him) said to her: "Give me the prayer mat." She said: "I was menstruating." He said: "Your menstruation is not in your hand."',
        source: 'Sahih Muslim',
        relevance: 'Shows that menstruation is natural and not something to be ashamed of'
      }
    ],
    selfCare: [
      'Rest adequately - your body is performing a natural function',
      'Stay warm and comfortable',
      'Eat nourishing foods and stay hydrated',
      'Use pain relief methods that are Islamically permissible',
      'Accept this as part of Allah\'s design for women',
      'Remember that this is a temporary state of purification'
    ]
  },
  {
    phase: 'follicular',
    title: 'Post-Menstrual Renewal',
    description: 'A time of spiritual renewal and increased energy',
    rulings: {
      prayer: 'Resume all obligatory prayers with gratitude',
      fasting: 'Resume fasting if applicable',
      quran: 'Resume reading and touching the Quran',
      mosque: 'Full participation in mosque activities'
    },
    spiritualPractices: [
      'Perform ghusl (full ritual bath) after menstruation ends',
      'Make up missed prayers (qaza) gradually',
      'Increase voluntary prayers',
      'Read Quran with renewed focus',
      'Attend mosque regularly',
      'Give thanks for restored ability to worship' ,
    ],
    duas: [
      {
        arabic: 'الْحَمْدُ لِلَّهِ الَّذِي بِعَافِيَتِهِ تَتَمُّ الصَّحَّةُ',
        transliteration: 'Alhamdulillahilladhi bi afiyati tatimmus-sihhah',
        translation: 'Praise is to Allah by whose blessings well-being is complete',
        occasion: 'After menstruation ends'
      },
      {
        arabic: 'اللَّهُمَّ اجْعَلْنِي شَاكِرًا لِنِعْمَتِكَ',
        transliteration: 'Allahumma ij-alni shakiran li nimatik',
        translation: 'O Allah, make me grateful for Your blessings',
        occasion: 'For restored ability to worship'
      }
    ],
    hadiths: [
      {
        text: 'The Prophet (peace be upon him) said: "When a menstruating woman finishes her period, she should perform ghusl and then pray."',
        source: 'Sahih Bukhari',
        relevance: 'Guidance on resuming worship after menstruation'
      }
    ],
    selfCare: [
      'Perform ghusl properly according to Islamic teachings',
      'Gradually ease back into physical activities',
      'Maintain the spiritual habits developed during rest',
      'Plan for the next cycle\'s spiritual activities'
    ]
  },
  {
    phase: 'ovulatory',
    title: 'Peak Energy and Worship',
    description: 'A time of high energy for both physical and spiritual activities',
    rulings: {
      prayer: 'Full participation with extra voluntary prayers',
      fasting: 'Excellent time for voluntary fasts',
      quran: 'Increased Quran recitation and memorization',
      mosque: 'Active participation in community activities'
    },
    spiritualPractices: [
      'Perform night prayers (tahajjud)',
      'Engage in extra voluntary fasts (Mondays, Thursdays, Ayyam al-Beed)',
      'Increase Quran memorization',
      'Teach others what you know',
      'Participate in community service',
      'Give charity generously'
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ',
        transliteration: 'Allahumma ainni ala dhikrika wa shukrika wa husni ibadatik',
        translation: 'O Allah, help me to remember You, thank You, and worship You properly',
        occasion: 'For increased worship'
      }
    ],
    hadiths: [
      {
        text: 'The Prophet (peace be upon him) said: "The best of deeds are those done regularly, even if they are few."',
        source: 'Sahih Bukhari',
        relevance: 'Encourages consistency in worship during high-energy periods'
      }
    ],
    selfCare: [
      'Channel increased energy into productive activities',
      'Maintain balance between worship and rest',
      'Use this time for community building',
      'Prepare for the upcoming luteal phase'
    ]
  },
  {
    phase: 'luteal',
    title: 'Reflection and Preparation',
    description: 'A time for deeper worship and preparation for the next cycle',
    rulings: {
      prayer: 'Maintain consistent obligatory prayers',
      fasting: 'Continue voluntary fasts if comfortable',
      quran: 'Focus on reflection and understanding',
      mosque: 'Regular participation with focus on learning'
    },
    spiritualPractices: [
      'Focus on quality over quantity in worship',
      'Engage in reflective reading of Quran',
      'Make dua for upcoming menstrual period',
      'Prepare for qaza prayers if needed',
      'Increase dhikr and remembrance',
      'Study Islamic knowledge'
    ],
    duas: [
      {
        arabic: 'رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا',
        transliteration: 'Rabbana wa tuhammil alayna isran kama hamaltahu alalladhina min qablina',
        translation: 'Our Lord, do not burden us as You burdened those before us',
        occasion: 'Seeking ease in upcoming period'
      }
    ],
    hadiths: [
      {
        text: 'The Prophet (peace be upon him) said: "Verily, Allah does not burden a soul beyond its capacity."',
        source: 'Surah Al-Baqarah 2:286',
        relevance: 'Divine wisdom in the natural cycle'
      }
    ],
    selfCare: [
      'Maintain healthy routines',
      'Prepare comfort items for next menstrual period',
      'Practice stress management',
      'Get adequate sleep',
      'Eat nourishing foods'
    ]
  },
  {
    phase: 'premenstrual',
    title: 'Preparing for Menstruation',
    description: 'A time of preparation and self-care before menstruation',
    rulings: {
      prayer: 'Maintain prayers with focus on quality',
      fasting: 'Continue if feeling well, otherwise pause',
      quran: 'Continue reading, focus on comforting verses',
      mosque: 'Maintain attendance if comfortable'
    },
    spiritualPractices: [
      'Make dua for ease during upcoming period',
      'Increase dhikr for spiritual comfort',
      'Read comforting Quran verses',
      'Prepare for making up missed worship',
      'Practice gratitude for current ability to worship',
      'Help others while you have the energy'
    ],
    duas: [
      {
        arabic: 'اللَّهُمَّ يَسِّرْ لِي أَمْرِي وَرَفِقْ بِي فِي أَمْرِي',
        transliteration: 'Allahumma yassir li amri wa rafiq bi fi amri',
        translation: 'O Allah, make my affairs easy and be gentle with me in my affairs',
        occasion: 'Seeking ease for upcoming period'
      }
    ],
    hadiths: [
      {
        text: 'The Prophet (peace be upon him) said: "When Allah loves a servant, He tests them."',
        source: 'Tirmidhi',
        relevance: 'Understanding tests as a sign of Allah\'s love'
      }
    ],
    selfCare: [
      'Reduce stress and obligations if possible',
      'Prepare comfort items for period',
      'Eat comfort foods and stay hydrated',
      'Get extra rest',
      'Practice gentle exercise',
      'Accept mood changes as natural'
    ]
  }
];

export function getIslamicGuidance(phase: string): IslamicGuidance | null {
  return islamicWellnessContent.find(g => g.phase === phase) || null;
}

export function getPhaseSpecificDuas(phase: string) {
  const guidance = getIslamicGuidance(phase);
  return guidance?.duas || [];
}

export function getPhaseSpecificHadiths(phase: string) {
  const guidance = getIslamicGuidance(phase);
  return guidance?.hadiths || [];
}
