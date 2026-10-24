/**
 * Prayer Minute Offsets Service (Masjid Tuning)
 * Allows per-prayer adjustments from -30 to +30 minutes
 * Persisted in localStorage and applied globally across Clocks, Dashboard, and Timetables
 */

export interface PrayerMinuteOffsets {
  fajr: number;
  sunrise: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export const DEFAULT_OFFSETS: PrayerMinuteOffsets = {
  fajr: 0,
  sunrise: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
};

const STORAGE_KEY = 'prayer_minute_offsets';
export const PRAYER_OFFSETS_CHANGED_EVENT = 'prayer-minute-offsets-changed';

export function getPrayerMinuteOffsets(): PrayerMinuteOffsets {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_OFFSETS };
    const parsed = JSON.parse(raw);
    return {
      fajr: typeof parsed.fajr === 'number' ? clampOffset(parsed.fajr) : 0,
      sunrise: typeof parsed.sunrise === 'number' ? clampOffset(parsed.sunrise) : 0,
      dhuhr: typeof parsed.dhuhr === 'number' ? clampOffset(parsed.dhuhr) : 0,
      asr: typeof parsed.asr === 'number' ? clampOffset(parsed.asr) : 0,
      maghrib: typeof parsed.maghrib === 'number' ? clampOffset(parsed.maghrib) : 0,
      isha: typeof parsed.isha === 'number' ? clampOffset(parsed.isha) : 0,
    };
  } catch (error) {
    // Return default offsets on read or parse failure
    return { ...DEFAULT_OFFSETS };
  }
}

export function savePrayerMinuteOffsets(offsets: PrayerMinuteOffsets): void {
  try {
    const sanitized: PrayerMinuteOffsets = {
      fajr: clampOffset(offsets.fajr),
      sunrise: clampOffset(offsets.sunrise),
      dhuhr: clampOffset(offsets.dhuhr),
      asr: clampOffset(offsets.asr),
      maghrib: clampOffset(offsets.maghrib),
      isha: clampOffset(offsets.isha),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PRAYER_OFFSETS_CHANGED_EVENT, { detail: sanitized }));
    }
  } catch (error) {
    // Fail safely if storage quota exceeded
  }
}

export function resetPrayerMinuteOffsets(): void {
  savePrayerMinuteOffsets(DEFAULT_OFFSETS);
}

function clampOffset(val: number): number {
  if (isNaN(val)) return 0;
  return Math.max(-30, Math.min(30, Math.round(val)));
}

/**
 * Adjust a Date object by minutes for a specific prayer
 */
export function applyOffsetToDate(date: Date, prayerName: string, offsets?: PrayerMinuteOffsets): Date {
  if (!date || isNaN(date.getTime())) return date;
  const currentOffsets = offsets || getPrayerMinuteOffsets();
  const key = prayerName.toLowerCase().trim() as keyof PrayerMinuteOffsets;
  const minutes = currentOffsets[key] || 0;
  if (minutes === 0) return date;
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Adjust a "HH:mm" 24h or 12h time string by specified prayer offset
 */
export function adjustTimeStringByMinutes(timeStr: string, minutes: number): string {
  if (!timeStr || minutes === 0) return timeStr;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();

  if (ampm) {
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
  }

  let totalMinutes = hours * 60 + mins + minutes;
  totalMinutes = ((totalMinutes % 1440) + 1440) % 1440;

  const newHours24 = Math.floor(totalMinutes / 60);
  const newMins = totalMinutes % 60;
  const minPad = newMins.toString().padStart(2, '0');

  if (ampm) {
    const isPm = newHours24 >= 12;
    let h12 = newHours24 % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}:${minPad} ${isPm ? 'PM' : 'AM'}`;
  }

  return `${newHours24.toString().padStart(2, '0')}:${minPad}`;
}

/**
 * Adjust prayer timings object by saved offsets
 */
export function applyOffsetsToTimings<T extends Record<string, string>>(
  timings: T,
  offsets?: PrayerMinuteOffsets
): T {
  const currentOffsets = offsets || getPrayerMinuteOffsets();
  const adjusted = { ...timings };

  const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
  for (const prayer of prayers) {
    const key = prayer.toLowerCase() as keyof PrayerMinuteOffsets;
    const offset = currentOffsets[key];
    if (offset !== 0 && adjusted[prayer]) {
      adjusted[prayer] = adjustTimeStringByMinutes(adjusted[prayer], offset) as any;
    }
  }

  return adjusted;
}
