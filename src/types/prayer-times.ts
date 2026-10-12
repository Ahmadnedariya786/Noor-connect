/**
 * TypeScript interfaces for prayer times and location data
 * Provides type safety for prayer-related components
 */

export interface PrayerTime {
  name: string;
  time: string;
  date: Date;
}

export interface PrayerTimes {
  fajr: Date;
  sunrise: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  midnight: Date;
}

export interface PrayerWithEndTime {
  name: string;
  time: string;
  datetime: Date;
  endTime: Date;
  endTimeFormatted: string;
}

export interface PrayerTimesWithEnd {
  fajr: { start: Date; end: Date };
  sunrise: { start: Date; end: Date };
  dhuhr: { start: Date; end: Date };
  asr: { start: Date; end: Date };
  maghrib: { start: Date; end: Date };
  isha: { start: Date; end: Date };
}

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  source: 'geolocation' | 'ip' | 'manual' | 'default';
  timestamp: string;
}

export interface LocationState {
  location: LocationData | null;
  locationName: string;
  isDetecting: boolean;
  latitude: number;
  longitude: number;
  detectLocation: () => Promise<any>;
}

export interface AladhanPrayerTime {
  Fajr: string;
  Sunrise: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
  Midnight: string;
}

export interface CountdownReturn {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formattedTime: string;
}

export interface PrayerCountdownData {
  currentPrayer: PrayerWithEndTime | null;
  nextPrayer: PrayerWithEndTime | null;
  isEndingSoon: boolean;
  countdown: CountdownReturn;
}

export interface NotificationScheduleData {
  prayerTimes: PrayerTimesWithEnd;
  location: LocationData;
  lastScheduledDate: string;
}
