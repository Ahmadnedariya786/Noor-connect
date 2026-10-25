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

/**
 * Normalizes a prayer name for robust matching:
 * - Strips any parenthetical annotations such as "(Tomorrow)", "(Today)", etc.
 * - Trims whitespace and converts to lower case
 * - Maps "jummah" to "dhuhr" for canonical Friday equivalence
 *
 * @param name - Raw prayer name string
 * @returns Canonical lowercase prayer key (e.g., 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha')
 */
export function normalizePrayerName(name?: string | null): string {
  if (!name) return '';
  const stripped = name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
  if (stripped === 'jummah') return 'dhuhr';
  return stripped;
}

/**
 * Checks if two prayer names match, taking into account:
 * - "(Tomorrow)" / parenthetical suffix stripping (e.g., "Fajr (Tomorrow)" matches "Fajr")
 * - Friday Jummah <-> Dhuhr canonical equality
 * - Case-insensitivity
 */
export function isMatchingPrayer(nameA?: string | null, nameB?: string | null): boolean {
  const normA = normalizePrayerName(nameA);
  const normB = normalizePrayerName(nameB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Format prayer time string for display according to 12h or 24h preference
 */
export function formatTimetableTime(timeStr: string, is24h: boolean): string {
  if (!timeStr) return "--:--";
  const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, "").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return cleaned;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3]?.toUpperCase();
  if (ampm) {
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
  }
  if (is24h) {
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${m}`;
}

