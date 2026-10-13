/**
 * Global Time Formatter Utility
 * Handles consistent time formatting across the app based on user preferences
 */
import i18n from '@/lib/i18n-new';

export interface TimeFormatOptions {
  format?: '12' | '24';
  showSeconds?: boolean;
  showAMPM?: boolean;
  timeZone?: string;
}

function getLocale(): string {
  return i18n.language || 'en';
}

/**
 * Format time string or Date object based on user preference
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12' or '24')
 * @param options - Additional formatting options
 * @returns Formatted time string
 */
export type TimeFormatMode = '12' | '24' | '12h' | '24h';

export function formatTime(
  time: string | Date,
  format: TimeFormatMode = '12h',
  options: TimeFormatOptions = {}
): string {
  const { showSeconds = false, showAMPM = true, timeZone } = options;

  let date: Date;

  if (typeof time === 'string') {
    // Strip timezone abbreviation like "(PKT)" from Aladhan API strings
    const cleaned = time.replace(/\s*\(.*?\)\s*/g, '').trim();
    // Parse time string (HH:MM or HH:MM:SS)
    const [hours, minutes, seconds] = cleaned.split(':').map(Number);
    date = new Date();
    if (isNaN(hours) || isNaN(minutes)) {
      console.warn('formatTime: failed to parse time string:', time);
      date = new Date(); // fallback
    } else {
      date.setHours(hours, minutes, seconds || 0, 0);
    }
  } else {
    date = time;
  }

  const is12Hour = format === '12' || format === '12h';

  if (is12Hour) {
    // 12-hour format
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: showAMPM,
      timeZone: timeZone || undefined
    };

    if (showSeconds) {
      timeOptions.second = '2-digit';
    }

    return date.toLocaleTimeString(getLocale(), timeOptions);
  } else {
    // 24-hour format
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timeZone || undefined
    };

    if (showSeconds) {
      timeOptions.second = '2-digit';
    }

    return date.toLocaleTimeString(getLocale(), timeOptions);
  }
}

/**
 * Format time for prayer cards (shorter version)
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12', '24', '12h', '24h')
 * @returns Formatted time string
 */
export function formatPrayerTime(time: string | Date, format: TimeFormatMode = '12h', timeZone?: string): string {
  return formatTime(time, format, { showSeconds: false, showAMPM: true, timeZone });
}

/**
 * Format time for countdown display
 * @param time - Time string (HH:MM) or Date object
 * @param format - Time format preference ('12', '24', '12h', '24h')
 * @returns Formatted time string
 */
export function formatCountdownTime(time: string | Date, format: TimeFormatMode = '12h'): string {
  return formatTime(time, format, { showSeconds: false, showAMPM: true });
}

/**
 * Get current time format from localStorage
 * @returns Current time format preference ('12' or '24')
 */
export function getTimeFormat(): '12' | '24' {
  const stored = localStorage.getItem('time_format') || localStorage.getItem('time-format');
  if (stored === '24h' || stored === '24') return '24';
  return '12';
}

/**
 * Get current time format with '12h' | '24h' notation
 */
export function getTimeFormat1224(): '12h' | '24h' {
  const stored = localStorage.getItem('time_format') || localStorage.getItem('time-format');
  if (stored === '24h' || stored === '24') return '24h';
  return '12h';
}

/**
 * Set time format preference
 * @param format - Time format preference ('12', '24', '12h', or '24h')
 */
export function setTimeFormat(format: TimeFormatMode): void {
  const canonical = format === '24' || format === '24h' ? '24h' : '12h';
  const legacy = canonical === '24h' ? '24' : '12';
  localStorage.setItem('time_format', canonical);
  localStorage.setItem('time-format', legacy);
  window.dispatchEvent(new CustomEvent('time-format-changed', {
    detail: { format: legacy, timeFormat: canonical }
  }));
}

/**
 * Pre-convert prayer times object to selected format to avoid on-the-fly calculations
 * @param prayerTimes - Object with prayer time strings
 * @param format - Time format preference ('12' or '24')
 * @returns Object with formatted prayer times
 */
export function preConvertPrayerTimes(prayerTimes: Record<string, string>, format: '12' | '24' = '24'): Record<string, string> {
  const converted: Record<string, string> = {};

  for (const [prayer, time] of Object.entries(prayerTimes)) {
    converted[prayer] = formatPrayerTime(time, format);
  }

  return converted;
}

/**
 * Batch format multiple prayer times efficiently
 * @param times - Array of time strings or Date objects
 * @param format - Time format preference ('12' or '24')
 * @returns Array of formatted time strings
 */
export function batchFormatTimes(times: (string | Date)[], format: '12' | '24' = '24'): string[] {
  return times.map(time => formatPrayerTime(time, format));
}
