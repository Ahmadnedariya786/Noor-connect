/**
 * Global Time Formatter Utility
 * Formats time as 12-hour ("05:30 AM") or 24-hour ("17:30") based on user preference.
 */

export type TimeFormat = '12h' | '24h';

export interface FormatTimeOptions {
  showSeconds?: boolean;
  timeZone?: string;
  locale?: string;
}

/**
 * Format a Date object or time string (e.g. '05:30', '17:30', '17:30:00', '05:30 (PKT)')
 * based on user preference:
 * - '12h': "05:30 AM" (or "05:30:00 AM" if showSeconds is true)
 * - '24h': "17:30" (or "17:30:00" if showSeconds is true)
 */
export function formatTime(
  time: string | Date | null | undefined,
  format: '12h' | '24h' | '12' | '24' = '12h',
  options: FormatTimeOptions = {}
): string {
  if (!time) return '--:--';

  let date: Date;

  if (typeof time === 'string') {
    // Strip trailing timezone abbreviations e.g. "(PKT)" or extra whitespace
    const cleaned = time.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (!cleaned) return '--:--';

    const parts = cleaned.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parts[2] ? parseInt(parts[2], 10) : 0;

    if (isNaN(hours) || isNaN(minutes)) {
      return time; // Fallback to raw string if unparseable
    }

    date = new Date();
    date.setHours(hours, minutes, isNaN(seconds) ? 0 : seconds, 0);
  } else if (time instanceof Date) {
    if (isNaN(time.getTime())) return '--:--';
    date = time;
  } else {
    return '--:--';
  }

  const is12Hour = format === '12h' || format === '12';

  const formatOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: is12Hour,
    timeZone: options.timeZone || undefined,
  };

  if (options.showSeconds) {
    formatOptions.second = '2-digit';
  }

  return date.toLocaleTimeString(options.locale || 'en-US', formatOptions);
}

/**
 * Shorthand helper for prayer times formatting.
 */
export function formatPrayerTime(
  time: string | Date | null | undefined,
  format: '12h' | '24h' | '12' | '24' = '12h',
  timeZone?: string
): string {
  return formatTime(time, format, { timeZone });
}
