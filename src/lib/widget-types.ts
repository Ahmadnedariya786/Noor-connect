/**
 * Type definitions for the Noor Connect widget bridge.
 *
 * These types MUST stay in sync with the Kotlin data classes in
 * android/app/src/main/java/com/noorconnect/ummah/widgets/WidgetPayloads.kt.
 *
 * If you change a field on one side, change it on the other.
 */

export interface PrayerEntry {
  /** "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha" */
  name: string;
  /** epoch milliseconds */
  time: number;
  /** "05:15" — already localized for display */
  formattedTime: string;
  /** Qaza end time in epoch milliseconds (optional) */
  endTime?: number;
  /** "06:45" — formatted Qaza end time for display (optional) */
  formattedEndTime?: string;
}

export interface PrayerPayload {
  prayers: PrayerEntry[];          // exactly 6 entries
  nextPrayerIndex: number;         // 0..5
  hijriDate: string;               // "5 Rajab 1447"
  gregorianDate: string;           // "4 July 2026"
  locationLabel: string;           // "Karachi, Pakistan"
  madhab: 'HANAFI' | 'SHAFI';
  calculationMethod: string;       // 'KARACHI' | 'MWL' | 'ISNA' | ...
  currentTime24h: string;          // "14:35"
  lastUpdated: number;             // epoch millis
  dstOffset?: number;              // DST offset in hours (0 or usually 1)

  // Flagship Qaza End Time boundaries & customization sync
  fajrEndFormatted?: string;
  dhuhrEndFormatted?: string;
  asrEndFormatted?: string;
  maghribEndFormatted?: string;
  ishaEndFormatted?: string;
  showQazaEndTime?: boolean;

  // Widget visual settings cache
  surfaceStyle?: string;
  opacity?: number;
  accentColorHex?: string;
  bgColorHex?: string;
  fontScale?: number;
  showCity?: boolean;
  showCountdown?: boolean;
  showStrip?: boolean;
}

export interface AyahContent {
  arabic: string;
  translation: string;
  transliteration: string;
  reference: string;               // "Al-Baqarah 2:255"
  surahNumber: number;
  ayahNumber: number;
  lastUpdated: number;             // epoch millis
}

export interface HadithContent {
  arabic: string;
  translation: string;
  narrator: string;
  source: string;                  // "Sahih Bukhari 1:1"
  grade: string;                   // "Sahih" | "Hasan" | "Daif"
  collection: string;              // "bukhari" | "muslim" | ...
  bookNumber: number;
  hadithNumber: number;
  lastUpdated: number;             // epoch millis
}

export interface DailyContentPayload {
  ayah: AyahContent;
  hadith: HadithContent;
  locale: string;                  // "en" | "ar" | "ur" | "tr" | "id"
  lastUpdated: number;             // epoch millis
}

export interface QuranProgressPayload {
  currentSurah: number;            // 1-114
  currentAyah: number;
  currentJuz: number;              // 1-30
  totalPagesRead: number;          // 0-604
  totalPercent: number;            // 0.0 - 100.0
  dailyStreak: number;
  lastReadTimestamp: number;
  lastReadLabel: string;           // "Al-Baqarah 2:255"
  goalPercent: number;             // 0.0 - 100.0
  lastUpdated: number;             // epoch millis
}
