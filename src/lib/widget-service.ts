/**
 * widget-service.ts
 * Sends enriched prayer + Quran data to the Android home-screen widgets.
 */
import { registerPlugin } from '@capacitor/core';
import { calculatePrayerTimes, formatPrayerTime, getNextPrayer } from './prayer-calculator';
import type { WidgetPluginInterface, PrayerEntry, WidgetStrings } from './widgetPlugin';
import { runIfNative } from './capacitor-utils';
import { getMadhab } from './storage';

/* Re-export the plugin type for convenience */
export type { WidgetPluginInterface, PrayerEntry, WidgetStrings };

const WidgetPlugin = registerPlugin<WidgetPluginInterface>('WidgetPlugin');

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

/**
 * Convert a Gregorian Date to a human-readable Hijri string.
 * Uses the `Intl` API — no external library required.
 */
function getHijriDateString(): string {
    try {
        const islamicFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        return islamicFormatter.format(new Date());
    } catch {
        return '';
    }
}

/**
 * Get a formatted clock string for the widget header (e.g. "14:35").
 */
function getCurrentTimeString(): string {
    return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Build prayer data JSON for Kotlin widgets with timestamps.
 * Format: { prayers: [{name, time (timestamp)}, ...], nextPrayerIndex, lastUpdated }
 */
function buildPrayerDataJson(prayerTimes: any, lat: number, lon: number): string {
    const now = new Date();
    const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
    const dates = [prayerTimes.fajr, prayerTimes.dhuhr, prayerTimes.asr, prayerTimes.maghrib, prayerTimes.isha];

    const prayers = dates.map((date, i) => ({
        name: names[i],
        time: date.getTime(), // Timestamp for countdown calculation
        timeStr: formatPrayerTime(date) // Display time
    }));

    // Find next prayer index
    let nextPrayerIndex = 0;
    for (let i = 0; i < prayers.length; i++) {
        if (prayers[i].time > now.getTime()) {
            nextPrayerIndex = i;
            break;
        }
    }

    const data = {
        prayers,
        nextPrayerIndex,
        lastUpdated: now.getTime(),
        location: { lat, lon }
    };

    return JSON.stringify(data);
}

/**
 * Build the all-5-prayers array with pass/active/upcoming status.
 */
function buildAllPrayers(lat: number, lon: number): PrayerEntry[] {
    const now = new Date();
    const times = calculatePrayerTimes(lat, lon, now);
    const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
    const dates = [times.fajr, times.dhuhr, times.asr, times.maghrib, times.isha];

    let activeAssigned = false;
    const result: PrayerEntry[] = [];

    for (let i = dates.length - 1; i >= 0; i--) {
        if (!activeAssigned && now >= dates[i]) {
            result[i] = {
                name: names[i],
                time: formatPrayerTime(dates[i]),
                status: 'active',
            };
            activeAssigned = true;
        }
    }

    for (let i = 0; i < dates.length; i++) {
        if (!result[i]) {
            result[i] = {
                name: names[i],
                time: formatPrayerTime(dates[i]),
                status: now > dates[i] ? 'passed' : 'upcoming',
            };
        }
    }

    return result;
}

/**
 * Read today's Quran verse from localStorage (set by the DailyAyah component).
 */
function getStoredQuranVerse(): { arabic: string; translit: string; ref: string } | null {
    try {
        const raw = localStorage.getItem('daily-ayah-cache');
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        // Support both camelCase and snake_case keys from different sources
        return {
            arabic: parsed.arabic || parsed.text_arabic || parsed.textArabic || '',
            translit: parsed.transliteration || parsed.translit || '',
            ref: parsed.reference || parsed.ref || '',
        };
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────
// Public service class
// ─────────────────────────────────────────────────────────

export class WidgetService {
    /**
     * Full widget update: sends prayer schedule, Hijri date, current time,
     * and today's Quran verse to ALL Noor Connect home-screen widgets.
     */
    static async updateWidget(
        latitude: number,
        longitude: number,
        locationName?: string,
        prayerTimes?: any,
    ) {
        try {
            // Calculate prayer times if not provided
            const times = prayerTimes || calculatePrayerTimes(latitude, longitude, new Date());
            
            const next = getNextPrayer(latitude, longitude);
            if (!next) return;

            const isRamadan = localStorage.getItem('ramadan-mode') === 'true';
            let prayerName = next.name;
            if (isRamadan) {
                if (next.name === 'Maghrib') prayerName += ' (Iftar)';
                if (next.name === 'Fajr') prayerName += ' (Suhoor)';
            }

            const nextTimeStr = next.time.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });

            const allPrayers = buildAllPrayers(latitude, longitude);
            const quran = getStoredQuranVerse();

            // Build prayer data JSON for new Kotlin widgets
            const prayerData = buildPrayerDataJson(times, latitude, longitude);

            // Build ayah data JSON
            const ayahData = JSON.stringify({
                arabic: quran?.arabic ?? '',
                transliteration: quran?.translit ?? '',
                reference: quran?.ref ?? '',
                hijriDate: getHijriDateString(),
                location: locationName ?? ''
            });

            // Use notifyWidgetDataChanged for new Kotlin widgets
            await runIfNative(() => 
                WidgetPlugin.notifyWidgetDataChanged({
                    prayerData,
                    ayahData
                })
            );

            // Also call updateWidgetFull for backward compatibility with old Java widgets
            await runIfNative(() => 
                WidgetPlugin.updateWidgetFull({
                    name: prayerName,
                    time: nextTimeStr,
                    remaining: next.timeUntil,
                    location: locationName ?? '',
                    hijriDate: getHijriDateString(),
                    currentTime: getCurrentTimeString(),
                    allPrayers,
                    quranArabic: quran?.arabic ?? '',
                    quranTranslit: quran?.translit ?? '',
                    quranRef: quran?.ref ?? '',
                })
            );

            console.log('[WidgetService] Widget updated with prayer data for Kotlin widgets');

        } catch (error) {
            console.error('[WidgetService] updateWidget failed:', error);
        }
    }

    /**
     * Start auto-update timer (every 30 minutes).
     * Returns the interval ID for cleanup.
     */
    static startAutoUpdate(
        latitude: number,
        longitude: number,
        locationName?: string,
    ): ReturnType<typeof setInterval> {
        WidgetService.updateWidget(latitude, longitude, locationName).catch(console.error);
        return setInterval(
            () => WidgetService.updateWidget(latitude, longitude, locationName).catch(console.error),
            30 * 60 * 1000,
        );
    }
}
