/**
 * Authentic Standard 30-Juz Metadata (Madinah Mushaf 604-page layout)
 */

export interface JuzItem {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  startSurahNumber: number;
  startSurahName: string;
  startAyah: number;
  startPage: number;
  endPage: number;
}

export const JUZ_LIST: JuzItem[] = [
  { number: 1, nameArabic: 'آلم', nameEnglish: 'Alif-Lam-Meem', startSurahNumber: 1, startSurahName: 'Al-Fatihah', startAyah: 1, startPage: 1, endPage: 21 },
  { number: 2, nameArabic: 'سَيَقُولُ', nameEnglish: 'Sayaqool', startSurahNumber: 2, startSurahName: 'Al-Baqarah', startAyah: 142, startPage: 22, endPage: 41 },
  { number: 3, nameArabic: 'تِلْكَ الرُّسُلُ', nameEnglish: 'Tilkar-Rusul', startSurahNumber: 2, startSurahName: 'Al-Baqarah', startAyah: 253, startPage: 42, endPage: 61 },
  { number: 4, nameArabic: 'لَنْ تَنَالُوا', nameEnglish: 'Lan Tanalu', startSurahNumber: 3, startSurahName: "Ali 'Imran", startAyah: 92, startPage: 62, endPage: 81 },
  { number: 5, nameArabic: 'وَالْمُحْصَنَاتُ', nameEnglish: 'Wal-Muhsanat', startSurahNumber: 4, startSurahName: "An-Nisa'", startAyah: 24, startPage: 82, endPage: 101 },
  { number: 6, nameArabic: 'لَا يُحِبُّ اللَّهُ', nameEnglish: 'La Yuhibbullah', startSurahNumber: 4, startSurahName: "An-Nisa'", startAyah: 148, startPage: 102, endPage: 121 },
  { number: 7, nameArabic: 'وَإِذَا سَمِعُوا', nameEnglish: 'Wa Iza Samiu', startSurahNumber: 5, startSurahName: "Al-Ma'idah", startAyah: 82, startPage: 122, endPage: 141 },
  { number: 8, nameArabic: 'وَلَوْ أَنَّنَا', nameEnglish: 'Walaw Annana', startSurahNumber: 6, startSurahName: "Al-An'am", startAyah: 111, startPage: 142, endPage: 161 },
  { number: 9, nameArabic: 'قَالَ الْمَلَأُ', nameEnglish: 'Qalal-Mala', startSurahNumber: 7, startSurahName: "Al-A'raf", startAyah: 88, startPage: 162, endPage: 181 },
  { number: 10, nameArabic: 'وَاعْلَمُوا', nameEnglish: "Wa'lamu", startSurahNumber: 8, startSurahName: 'Al-Anfal', startAyah: 41, startPage: 182, endPage: 201 },
  { number: 11, nameArabic: 'يَعْتَذِرُونَ', nameEnglish: "Ya'tazirun", startSurahNumber: 9, startSurahName: 'At-Tawbah', startAyah: 93, startPage: 202, endPage: 221 },
  { number: 12, nameArabic: 'وَمَا مِنْ دَابَّةٍ', nameEnglish: 'Wa Mamin Dabbah', startSurahNumber: 11, startSurahName: 'Hud', startAyah: 6, startPage: 222, endPage: 241 },
  { number: 13, nameArabic: 'وَمَا أُبَرِّئُ', nameEnglish: "Wa Ma Ubarri'u", startSurahNumber: 12, startSurahName: 'Yusuf', startAyah: 53, startPage: 242, endPage: 261 },
  { number: 14, nameArabic: 'رُبَمَا', nameEnglish: 'Rubama', startSurahNumber: 15, startSurahName: 'Al-Hijr', startAyah: 1, startPage: 262, endPage: 281 },
  { number: 15, nameArabic: 'سُبْحَانَ الَّذِي', nameEnglish: 'Subhanallazi', startSurahNumber: 17, startSurahName: "Al-Isra'", startAyah: 1, startPage: 282, endPage: 301 },
  { number: 16, nameArabic: 'قَالَ أَلَمْ', nameEnglish: 'Qala Alam', startSurahNumber: 18, startSurahName: 'Al-Kahf', startAyah: 75, startPage: 302, endPage: 321 },
  { number: 17, nameArabic: 'اقْتَرَبَ', nameEnglish: 'Iqtaraba', startSurahNumber: 21, startSurahName: "Al-Anbiya'", startAyah: 1, startPage: 322, endPage: 341 },
  { number: 18, nameArabic: 'قَدْ أَفْلَحَ', nameEnglish: 'Qad Aflaha', startSurahNumber: 23, startSurahName: "Al-Mu'minun", startAyah: 1, startPage: 342, endPage: 361 },
  { number: 19, nameArabic: 'وَقَالَ الَّذِينَ', nameEnglish: 'Wa Qalal-Lazina', startSurahNumber: 25, startSurahName: 'Al-Furqan', startAyah: 21, startPage: 362, endPage: 381 },
  { number: 20, nameArabic: 'فَمَا كَانَ', nameEnglish: 'Fama Kana', startSurahNumber: 27, startSurahName: 'An-Naml', startAyah: 56, startPage: 382, endPage: 401 },
  { number: 21, nameArabic: 'وَلَا تُجَادِلُوا', nameEnglish: 'Wala Tujadilu', startSurahNumber: 29, startSurahName: "Al-'Ankabut", startAyah: 46, startPage: 402, endPage: 421 },
  { number: 22, nameArabic: 'وَمَنْ يَقْنُتْ', nameEnglish: 'Wa Man Yaqnut', startSurahNumber: 33, startSurahName: 'Al-Ahzab', startAyah: 31, startPage: 422, endPage: 441 },
  { number: 23, nameArabic: 'وَمَا أَنْزَلْنَا', nameEnglish: 'Wa Ma Anzalna', startSurahNumber: 36, startSurahName: 'Ya-Sin', startAyah: 28, startPage: 442, endPage: 461 },
  { number: 24, nameArabic: 'فَمَنْ أَظْلَمُ', nameEnglish: 'Faman Azlamu', startSurahNumber: 39, startSurahName: 'Az-Zumar', startAyah: 32, startPage: 462, endPage: 481 },
  { number: 25, nameArabic: 'إِلَيْهِ يُرَدُّ', nameEnglish: 'Ilayhi Yuraddu', startSurahNumber: 41, startSurahName: 'Fussilat', startAyah: 47, startPage: 482, endPage: 501 },
  { number: 26, nameArabic: 'حم', nameEnglish: 'Ha-Meem', startSurahNumber: 46, startSurahName: 'Al-Ahqaf', startAyah: 1, startPage: 502, endPage: 521 },
  { number: 27, nameArabic: 'قَالَ فَمَا خَطْبُكُمْ', nameEnglish: 'Qala Fama Khatbukum', startSurahNumber: 51, startSurahName: 'Az-Zariyat', startAyah: 31, startPage: 522, endPage: 541 },
  { number: 28, nameArabic: 'قَدْ سَمِعَ اللَّهُ', nameEnglish: "Qad Sami'allah", startSurahNumber: 58, startSurahName: 'Al-Mujadila', startAyah: 1, startPage: 542, endPage: 561 },
  { number: 29, nameArabic: 'تَبَارَكَ الَّذِي', nameEnglish: 'Tabarakallazi', startSurahNumber: 67, startSurahName: 'Al-Mulk', startAyah: 1, startPage: 562, endPage: 581 },
  { number: 30, nameArabic: 'عَمَّ', nameEnglish: 'Amma', startSurahNumber: 78, startSurahName: "An-Naba'", startAyah: 1, startPage: 582, endPage: 604 },
];
