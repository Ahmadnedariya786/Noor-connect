/**
 * Unified Widget Data Models
 * Single source of truth for widget data structure shared between TypeScript and Android
 */

// ─────────────────────────────────────────────────────────────
// Core Types
// ─────────────────────────────────────────────────────────────

export interface PrayerTimeData {
  name: string;
  time: number;           // Unix timestamp in milliseconds
  timeStr: string;        // Formatted time string (e.g., "05:30")
  status: 'passed' | 'active' | 'upcoming';
}

export interface WidgetPrayerData {
  prayers: PrayerTimeData[];
  nextPrayerIndex: number;
  lastUpdated: number;    // Unix timestamp
  location?: {
    lat: number;
    lon: number;
    name?: string;
  };
}

export interface WidgetAyahData {
  arabic: string;
  transliteration: string;
  reference: string;
  hijriDate: string;
  location?: string;
}

export interface WidgetRadioData {
  isPlaying: boolean;
  stationName: string;
  reciterName: string;
  surahName?: string;
}

// ─────────────────────────────────────────────────────────────
// Widget Identifiers (matching Android widget providers)
// ─────────────────────────────────────────────────────────────

export enum WidgetType {
  NEXT_ADHAN = 'next_adhan',           // 2x2 - Next prayer countdown
  DAILY_SCHEDULE = 'daily_schedule',   // 4x2 - All 5 prayers list
  DAILY_AYAH = 'daily_ayah',           // 4x4 - Quran verse of the day
  RADIO = 'radio',                     // 4x1 - Radio controls
}

// ─────────────────────────────────────────────────────────────
// Capacitor Plugin Interface
// ─────────────────────────────────────────────────────────────

export interface WidgetPluginInterface {
  /**
   * Update all widgets with prayer and ayah data in a single call.
   * This is the primary method - replaces all legacy methods.
   */
  updateWidgets(options: {
    prayerData: string;  // JSON string of WidgetPrayerData
    ayahData: string;    // JSON string of WidgetAyahData
    radioData?: string;  // JSON string of WidgetRadioData (optional)
  }): Promise<{ status: string }>;

  /**
   * Schedule exact alarm for next prayer (Android 12+ requires SCHEDULE_EXACT_ALARM)
   */
  scheduleNextPrayerAlarm(options: {
    nextPrayerTime: number;  // Unix timestamp in milliseconds
  }): Promise<{ status: string }>;

  /**
   * Cancel all scheduled alarms
   */
  cancelAlarms(): Promise<{ status: string }>;

  /**
   * Get current widget data from SharedPreferences (for debugging)
   */
  getWidgetData(): Promise<{
    prayerData: string;
    ayahData: string;
    radioData: string;
  }>;
}

// Type for plugin registration
export const WIDGET_PLUGIN_NAME = 'WidgetPlugin';