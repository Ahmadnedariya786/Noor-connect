import { useMemo } from 'react';

export interface DailyInspiration {
  id: string;
  type: 'ayah' | 'hadith';
  title: string;
  subtitle: string;
  content: string;
  reference: string;
  reflection: string;
}

const ayahCollection: DailyInspiration[] = [
  { 
    id: 'ayah-1',
    type: 'ayah',
    title: 'Verse of the Day',
    subtitle: 'Al-Baqarah 2:45',
    content: "And seek help through patience and prayer...",
    reference: "Al-Baqarah 2:45",
    reflection: "Patience and prayer are the keys to overcoming life's challenges."
  },
  { 
    id: 'ayah-2',
    type: 'ayah',
    title: 'Verse of the Day',
    subtitle: "Ar-Ra'd 13:28",
    content: "Unquestionably, by the remembrance of Allah hearts are assured.",
    reference: "Ar-Ra'd 13:28",
    reflection: "True peace is found in the connection with your Creator."
  },
  { 
    id: 'ayah-3',
    type: 'ayah',
    title: 'Verse of the Day',
    subtitle: 'Al-Imran 3:139',
    content: "So do not lose heart and do not grieve, and you will be superior if you are believers.",
    reference: "Al-Imran 3:139",
    reflection: "Faith gives you the strength to overcome any adversity."
  },
  { 
    id: 'ayah-4',
    type: 'ayah',
    title: 'Verse of the Day',
    subtitle: 'At-Tawbah 9:18',
    content: "The mosques of Allah are only to be maintained by those who believe in Allah and the Last Day...",
    reference: "At-Tawbah 9:18",
    reflection: "True devotion is shown through consistent worship and faith."
  },
  { 
    id: 'ayah-5',
    type: 'ayah',
    title: 'Verse of the Day',
    subtitle: 'Al-Baqarah 2:186',
    content: "And when My servants ask you concerning Me - indeed I am near. I respond to the invocation of the supplicant...",
    reference: "Al-Baqarah 2:186",
    reflection: "Allah is always close to those who call upon Him with sincerity."
  }
];

const hadithCollection: DailyInspiration[] = [
  {
    id: 'hadith-1',
    type: 'hadith',
    title: 'Hadith of the Day',
    subtitle: 'Sahih Bukhari',
    content: "Actions are judged by intentions, and each person will have what they intended.",
    reference: "Sahih Bukhari 1",
    reflection: "Always check your heart before you act."
  },
  {
    id: 'hadith-2',
    type: 'hadith',
    title: 'Hadith of the Day',
    subtitle: 'Sahih Muslim',
    content: "Whoever Allah wants good for, He grants them understanding of the religion.",
    reference: "Sahih Muslim 1037",
    reflection: "Seeking knowledge is a divine gift."
  },
  {
    id: 'hadith-3',
    type: 'hadith',
    title: 'Hadith of the Day',
    subtitle: 'Sunan Tirmidhi',
    content: "The best among you are those who have the best manners and character.",
    reference: "Sunan Tirmidhi 1162",
    reflection: "Your character defines who you truly are."
  },
  {
    id: 'hadith-4',
    type: 'hadith',
    title: 'Hadith of the Day',
    subtitle: 'Sahih Bukhari',
    content: "None of you truly believes until he loves for his brother what he loves for himself.",
    reference: "Sahih Bukhari 13",
    reflection: "True faith is reflected in how you treat others."
  },
  {
    id: 'hadith-5',
    type: 'hadith',
    title: 'Hadith of the Day',
    subtitle: 'Sahih Muslim',
    content: "The strong person is not the one who can wrestle someone else down. The strong person is the one who can control himself when he is angry.",
    reference: "Sahih Muslim 2582",
    reflection: "True strength is self-control, not physical power."
  }
];

/**
 * Get the day of year (1-366) for consistent daily content selection
 */
function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

/**
 * Get the daily Ayah for the current day
 */
export function getDailyAyah(): DailyInspiration {
  const dayOfYear = getDayOfYear();
  return ayahCollection[dayOfYear % ayahCollection.length];
}

/**
 * Get the daily Hadith for the current day
 */
export function getDailyHadith(): DailyInspiration {
  const dayOfYear = getDayOfYear();
  return hadithCollection[dayOfYear % hadithCollection.length];
}

/**
 * Get both daily inspirations (Ayah and Hadith) for the current day
 */
export function getDailyInspirations(): DailyInspiration[] {
  const dayOfYear = getDayOfYear();
  return [
    ayahCollection[dayOfYear % ayahCollection.length],
    hadithCollection[dayOfYear % hadithCollection.length]
  ];
}

/**
 * Hook to get daily inspirations with memoization
 */
export function useDailyInspirations(): DailyInspiration[] {
  return useMemo(() => getDailyInspirations(), []);
}

/**
 * Hook to get daily Ayah with memoization
 */
export function useDailyAyah(): DailyInspiration {
  return useMemo(() => {
    const dayOfYear = getDayOfYear();
    return ayahCollection[dayOfYear % ayahCollection.length];
  }, []);
}

/**
 * Hook to get daily Hadith with memoization
 */
export function useDailyHadith(): DailyInspiration {
  return useMemo(() => getDailyHadith(), []);
}
