/**
 * Radio Listening Statistics
 * Tracks listening time per radio station for statistics
 */

import { Preferences } from '@capacitor/preferences';
import { checkAchievements, updateStreak } from './radio-achievements';

export interface StationStats {
  stationId: string;
  stationName: string;
  totalSeconds: number;
  sessionCount: number;
  lastListened: number; // timestamp
}

export interface RadioStatsData {
  stations: Record<string, StationStats>;
  totalListeningTime: number;
}

const STATS_KEY = 'radio-listening-stats';

// Default empty stats
const DEFAULT_STATS: RadioStatsData = {
  stations: {},
  totalListeningTime: 0,
};

/**
 * Load stats from storage
 */
export async function loadRadioStats(): Promise<RadioStatsData> {
  try {
    const { value } = await Preferences.get({ key: STATS_KEY });
    if (value) {
      return JSON.parse(value);
    }
  } catch (error) {
    console.error('Failed to load radio stats:', error);
  }
  return DEFAULT_STATS;
}

/**
 * Save stats to storage
 */
export async function saveRadioStats(stats: RadioStatsData): Promise<void> {
  try {
    await Preferences.set({
      key: STATS_KEY,
      value: JSON.stringify(stats),
    });
  } catch (error) {
    console.error('Failed to save radio stats:', error);
  }
}

/**
 * Record listening time for a station
 * Called when radio is paused or stopped
 */
export async function recordListeningTime(
  stationId: string,
  stationName: string,
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const stats = await loadRadioStats();
  
  if (!stats.stations[stationId]) {
    stats.stations[stationId] = {
      stationId,
      stationName,
      totalSeconds: 0,
      sessionCount: 0,
      lastListened: Date.now(),
    };
  }

  stats.stations[stationId].totalSeconds += seconds;
  stats.stations[stationId].sessionCount += 1;
  stats.stations[stationId].lastListened = Date.now();
  stats.totalListeningTime += seconds;

  await saveRadioStats(stats);

  // Update streak and check achievements
  await updateStreak();

  const totalSessions = Object.values(stats.stations).reduce((sum, s) => sum + s.sessionCount, 0);
  const uniqueStations = Object.keys(stats.stations).length;
  const currentStreak = await (await import('./radio-achievements')).getCurrentStreak();

  await checkAchievements({
    totalSeconds: stats.totalListeningTime,
    totalSessions,
    uniqueStations,
    currentStreak,
  });
}

/**
 * Get all station stats sorted by total listening time
 */
export async function getSortedStationStats(): Promise<StationStats[]> {
  const stats = await loadRadioStats();
  return Object.values(stats.stations).sort(
    (a, b) => b.totalSeconds - a.totalSeconds
  );
}

/**
 * Get total listening time across all stations
 */
export async function getTotalListeningTime(): Promise<number> {
  const stats = await loadRadioStats();
  return stats.totalListeningTime;
}

/**
 * Reset all stats
 */
export async function resetRadioStats(): Promise<void> {
  await saveRadioStats(DEFAULT_STATS);
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
