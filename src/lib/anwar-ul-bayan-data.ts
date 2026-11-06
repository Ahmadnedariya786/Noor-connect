/**
 * Tafseer Anwar-ul-Bayan (by Mufti Muhammad Aashiq Ilahi Bulandshahri R.A.)
 * Complete 5-Volume Set catalog & IndexedDB large-file linking helpers.
 */

import {
  savePdfBlob,
  getPdfBlobUrl,
  hasPdfBlob,
  deletePdfBlob,
} from './idb-pdf-store';

export interface AnwarUlBayanVolume {
  id: string;
  volNumber: number;
  title: string;
  urduTitle: string;
  urduSubtitle: string;
  author: string;
  urduAuthor: string;
  coverage: string;
  juzCoverage: string;
  surahRange: string;
  category: 'Quran & Tafsir';
  streamUrl: string;
  urduStreamUrl: string;
  embedViewerUrl?: string;
  primaryDownloadUrl?: string;
  estimatedSize: string;
  localKey: string;
  description: string;
  surahs: { number: number; name: string; arabicName: string }[];
}

export const ANWAR_UL_BAYAN_VOLUMES: AnwarUlBayanVolume[] = [
  {
    id: 'anwar-ul-bayan-vol-1',
    volNumber: 1,
    title: 'Tafseer Anwar-ul-Bayan — Part 1 (Vol. 1)',
    urduTitle: 'تفسیر انوار البیان — جلد اول',
    urduSubtitle: 'پارہ ۱ تا ۷',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: "Surah Al-Fatiha (1) to Surah Al-Ma'idah (5) • Juz 1 to 7",
    juzCoverage: 'Juz 1 to 7',
    surahRange: "Al-Fatiha (1) — Al-Ma'idah (5)",
    category: 'Quran & Tafsir',
    primaryDownloadUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume1.pdf',
    streamUrl:
      'https://archive.org/download/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-1.pdf',
    urduStreamUrl:
      'https://archive.org/download/TafseerAnwarUlBayan/Tafseer%20Anwar-ul-Bayan%20Vol%201.pdf',
    embedViewerUrl:
      'https://archive.org/embed/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-1',
    estimatedSize: '~120 MB',
    localKey: 'anwar-ul-bayan-vol-1',
    description:
      'Comprehensive illumination of Surah Al-Fatiha through Surah Al-Ma’idah spanning the first 7 Ajzaa, blending authentic classical exegesis with practical spiritual insight.',
    surahs: [
      { number: 1, name: 'Al-Fatiha', arabicName: 'الفاتحة' },
      { number: 2, name: 'Al-Baqarah', arabicName: 'البقرة' },
      { number: 3, name: "Ali 'Imran", arabicName: 'آل عمران' },
      { number: 4, name: 'An-Nisa', arabicName: 'النساء' },
      { number: 5, name: "Al-Ma'idah", arabicName: 'المائدة' },
    ],
  },
  {
    id: 'anwar-ul-bayan-vol-2',
    volNumber: 2,
    title: 'Tafseer Anwar-ul-Bayan — Part 2 (Vol. 2)',
    urduTitle: 'تفسیر انوار البیان — جلد دوم',
    urduSubtitle: 'پارہ ۸ تا ۱۳',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: "Surah Al-An'am (6) to Surah Ibrahim (14) • Juz 7 to 13",
    juzCoverage: 'Juz 7 to 13',
    surahRange: "Al-An'am (6) — Ibrahim (14)",
    category: 'Quran & Tafsir',
    primaryDownloadUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume2.pdf',
    streamUrl:
      'https://archive.org/download/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-2.pdf',
    urduStreamUrl:
      'https://archive.org/download/TafseerAnwarUlBayan/Tafseer%20Anwar-ul-Bayan%20Vol%202.pdf',
    embedViewerUrl:
      'https://archive.org/embed/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-2',
    estimatedSize: '~135 MB',
    localKey: 'anwar-ul-bayan-vol-2',
    description:
      'Detailed exegesis of Surahs Al-An’am, Al-A’raf, Al-Anfal, At-Tawbah, Yunus, Hud, Yusuf, Ar-Ra’d, and Ibrahim, exploring deep theological foundations and Prophetic narratives.',
    surahs: [
      { number: 6, name: "Al-An'am", arabicName: 'الأنعام' },
      { number: 7, name: "Al-A'raf", arabicName: 'الأعراف' },
      { number: 8, name: 'Al-Anfal', arabicName: 'الأنفال' },
      { number: 9, name: 'At-Tawbah', arabicName: 'التوبة' },
      { number: 10, name: 'Yunus', arabicName: 'يونس' },
      { number: 11, name: 'Hud', arabicName: 'هود' },
      { number: 12, name: 'Yusuf', arabicName: 'يوسف' },
      { number: 13, name: "Ar-Ra'd", arabicName: 'الرعد' },
      { number: 14, name: 'Ibrahim', arabicName: 'إبراهيم' },
    ],
  },
  {
    id: 'anwar-ul-bayan-vol-3',
    volNumber: 3,
    title: 'Tafseer Anwar-ul-Bayan — Part 3 (Vol. 3)',
    urduTitle: 'تفسیر انوار البیان — جلد سوم',
    urduSubtitle: 'پارہ ۱۴ تا ۱۸',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Al-Hijr (15) to Surah Al-Ankabut (29) • Juz 14 to 21',
    juzCoverage: 'Juz 14 to 21',
    surahRange: 'Al-Hijr (15) — Al-Ankabut (29)',
    category: 'Quran & Tafsir',
    primaryDownloadUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume3.pdf',
    streamUrl:
      'https://archive.org/download/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-3.pdf',
    urduStreamUrl:
      'https://archive.org/download/TafseerAnwarUlBayan/Tafseer%20Anwar-ul-Bayan%20Vol%203.pdf',
    embedViewerUrl:
      'https://archive.org/embed/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-3',
    estimatedSize: '~145 MB',
    localKey: 'anwar-ul-bayan-vol-3',
    description:
      'Profound discourses across Surahs Al-Hijr, An-Nahl, Al-Isra, Al-Kahf, Maryam, Ta-Ha, Al-Anbiya, Al-Hajj, Al-Mu’minun, An-Nur, Al-Furqan, Ash-Shu’ara, An-Naml, Al-Qasas, and Al-Ankabut.',
    surahs: [
      { number: 15, name: 'Al-Hijr', arabicName: 'الحجر' },
      { number: 16, name: 'An-Nahl', arabicName: 'النحل' },
      { number: 17, name: 'Al-Isra', arabicName: 'الإسراء' },
      { number: 18, name: 'Al-Kahf', arabicName: 'الكهف' },
      { number: 19, name: 'Maryam', arabicName: 'مريم' },
      { number: 20, name: 'Ta-Ha', arabicName: 'طه' },
      { number: 21, name: 'Al-Anbiya', arabicName: 'الأنبياء' },
      { number: 22, name: 'Al-Hajj', arabicName: 'الحج' },
      { number: 23, name: "Al-Mu'minun", arabicName: 'المؤمنون' },
      { number: 24, name: 'An-Nur', arabicName: 'النور' },
      { number: 25, name: 'Al-Furqan', arabicName: 'الفرقان' },
      { number: 26, name: "Ash-Shu'ara", arabicName: 'الشعراء' },
      { number: 27, name: 'An-Naml', arabicName: 'النمل' },
      { number: 28, name: 'Al-Qasas', arabicName: 'القصص' },
      { number: 29, name: 'Al-Ankabut', arabicName: 'العنكبوت' },
    ],
  },
  {
    id: 'anwar-ul-bayan-vol-4',
    volNumber: 4,
    title: 'Tafseer Anwar-ul-Bayan — Part 4 (Vol. 4)',
    urduTitle: 'تفسیر انوار البیان — جلد چہارم',
    urduSubtitle: 'پارہ ۱۹ تا ۲۴',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Ar-Rum (30) to Surah Al-Hadid (57) • Juz 21 to 27',
    juzCoverage: 'Juz 21 to 27',
    surahRange: 'Ar-Rum (30) — Al-Hadid (57)',
    category: 'Quran & Tafsir',
    primaryDownloadUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume4.pdf',
    streamUrl:
      'https://archive.org/download/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-4.pdf',
    urduStreamUrl:
      'https://archive.org/download/TafseerAnwarUlBayan/Tafseer%20Anwar-ul-Bayan%20Vol%204.pdf',
    embedViewerUrl:
      'https://archive.org/embed/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-4',
    estimatedSize: '~140 MB',
    localKey: 'anwar-ul-bayan-vol-4',
    description:
      'Illuminating commentary on Surahs Ar-Rum, Luqman, As-Sajdah, Al-Ahzab, Saba, Fatir, Ya-Sin, As-Saffat, Sad, Az-Zumar, Ghafir, Fussilat, Ash-Shura, Az-Zukhruf, Ad-Dukhan, Al-Jathiyah, Al-Ahqaf, Muhammad, Al-Fath, Al-Hujurat, Qaf, Adh-Dhariyat, At-Tur, An-Najm, Al-Qamar, Ar-Rahman, Al-Waqi’ah, and Al-Hadid.',
    surahs: [
      { number: 30, name: 'Ar-Rum', arabicName: 'الروم' },
      { number: 31, name: 'Luqman', arabicName: 'لقمان' },
      { number: 32, name: 'As-Sajdah', arabicName: 'السجدة' },
      { number: 33, name: 'Al-Ahzab', arabicName: 'الأحزاب' },
      { number: 36, name: 'Ya-Sin', arabicName: 'يس' },
      { number: 55, name: 'Ar-Rahman', arabicName: 'الرحمن' },
      { number: 56, name: "Al-Waqi'ah", arabicName: 'الواقعة' },
      { number: 57, name: 'Al-Hadid', arabicName: 'الحديد' },
    ],
  },
  {
    id: 'anwar-ul-bayan-vol-5',
    volNumber: 5,
    title: 'Tafseer Anwar-ul-Bayan — Part 5 (Vol. 5)',
    urduTitle: 'تفسیر انوار البیان — جلد پنجم',
    urduSubtitle: 'پارہ ۲۵ تا ۳۰',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Al-Mujadilah (58) to Surah An-Nas (114) • Juz 28 to 30',
    juzCoverage: 'Juz 28 to 30',
    surahRange: 'Al-Mujadilah (58) — An-Nas (114)',
    category: 'Quran & Tafsir',
    primaryDownloadUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume5.pdf',
    streamUrl:
      'https://archive.org/download/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-5.pdf',
    urduStreamUrl:
      'https://archive.org/download/TafseerAnwarUlBayan/Tafseer%20Anwar-ul-Bayan%20Vol%205.pdf',
    embedViewerUrl:
      'https://archive.org/embed/islamic-illuminating-discourses-of-the-noble-quran-tafsir-anwarul-bayan/Illuminating-Discourses-of-the-Noble-Quran-Vol-5',
    estimatedSize: '~150 MB',
    localKey: 'anwar-ul-bayan-vol-5',
    description:
      'Closing volumes covering the last 3 Ajzaa (Qadd Sami’a, Tabarak, and ‘Amma), spanning Surah Al-Mujadilah to Surah An-Nas, filled with vital societal injunctions, eschatology, and short surah secrets.',
    surahs: [
      { number: 58, name: 'Al-Mujadilah', arabicName: 'المجادلة' },
      { number: 67, name: 'Al-Mulk', arabicName: 'الملك' },
      { number: 78, name: 'An-Naba', arabicName: 'النبأ' },
      { number: 112, name: 'Al-Ikhlas', arabicName: 'الإخلاص' },
      { number: 113, name: 'Al-Falaq', arabicName: 'الفلق' },
      { number: 114, name: 'An-Nas', arabicName: 'الناس' },
    ],
  },
];

/**
 * Check whether a volume has been linked locally in IndexedDB
 */
export async function isVolumeLinkedLocally(volId: string): Promise<boolean> {
  return hasPdfBlob(volId);
}

/**
 * Link a local PDF file from the device storage into IndexedDB
 */
export async function linkVolumeLocalFile(
  volId: string,
  file: File
): Promise<void> {
  await savePdfBlob(volId, file, file.name);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('anwar-ul-bayan-linked', { detail: { volId } }));
  }
}

/**
 * Unlink local PDF file for a volume
 */
export async function unlinkVolumeLocalFile(volId: string): Promise<void> {
  await deletePdfBlob(volId);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('anwar-ul-bayan-linked', { detail: { volId } }));
  }
}

/**
 * Get the resolved PDF source for a volume (local blob URL if linked, or online stream)
 */
export async function getVolumeResolvedSource(
  vol: AnwarUlBayanVolume
): Promise<{ url: string; isLocal: boolean; localKey?: string }> {
  const isLinked = await hasPdfBlob(vol.localKey);
  if (isLinked) {
    const blobUrl = await getPdfBlobUrl(vol.localKey);
    if (blobUrl) {
      return { url: blobUrl, isLocal: true, localKey: vol.localKey };
    }
  }
  return { url: vol.streamUrl, isLocal: false };
}
