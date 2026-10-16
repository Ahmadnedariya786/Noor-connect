/**
 * Prayer Utility Functions
 * Noor Connect - Shared helper for prayer display names and formatting
 */

const PRAYER_CANONICAL_NAMES: Record<string, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  jummah: 'Jummah',
};

/**
 * Returns the user-facing display name for a prayer.
 * On Fridays (day 5), Dhuhr is displayed as "Jummah" everywhere.
 *
 * @param prayer - Prayer name string or object with name property
 * @param date - Optional date to check (defaults to prayer.date or current date)
 * @returns Formatted display name (e.g. "Jummah" on Fridays for Dhuhr, or original name)
 */
export function getPrayerDisplayName(
  prayer: string | { name?: string; date?: Date | null } | null | undefined,
  date?: Date | null
): string {
  if (!prayer) return '';
  const rawName = typeof prayer === 'string' ? prayer : (prayer.name || '');
  if (!rawName) return '';

  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();

  // If already Jummah, return Jummah
  if (lower === 'jummah') {
    return 'Jummah';
  }

  // Check if it's Dhuhr
  if (lower === 'dhuhr') {
    let checkDate: Date | null = null;
    if (date instanceof Date && !isNaN(date.getTime())) {
      checkDate = date;
    } else if (typeof prayer === 'object' && prayer.date instanceof Date && !isNaN(prayer.date.getTime())) {
      checkDate = prayer.date;
    } else {
      checkDate = new Date();
    }

    // Friday in JavaScript is day 5 (0 = Sunday, 1 = Monday, ..., 5 = Friday)
    if (checkDate.getDay() === 5) {
      return 'Jummah';
    }
  }

  return PRAYER_CANONICAL_NAMES[lower] || trimmed;
}
