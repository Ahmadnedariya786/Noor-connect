import { useEffect, useRef } from 'react';
import { WidgetPlugin } from '@/lib/widgetPlugin';
import { isNativePlatform } from '@/lib/capacitor-utils';
import { usePrayerTimes } from '@/hooks/usePrayerTimes';
import { globalTimerManager } from '@/lib/timer-manager';

/**
 * Custom hook to synchronize prayer and ayah data with the native Android
 * widget suite. Runs whenever prayerTimes updates AND every 10 minutes so
 * the Next-Adhan countdown stays alive even when the user doesn't navigate.
 */
export function useWidgetSync() {
  const { prayerTimes } = usePrayerTimes();
  // Keep a stable ref to prayerTimes so the interval can read the latest value
  const prayerTimesRef = useRef(prayerTimes);
  prayerTimesRef.current = prayerTimes;

  const doSync = (pt: typeof prayerTimes) => {
    if (!pt) return;
    // Only push to native if running inside Capacitor
    if (!isNativePlatform()) return;

    try {
      // ── 1. Prayer Data ──────────────────────────────────────────────
      const now = Date.now();
      const prayersArray = [
        { name: 'Fajr',    time: pt.fajr.getTime() },
        { name: 'Sunrise', time: pt.sunrise.getTime() },
        { name: 'Dhuhr',   time: pt.dhuhr.getTime() },
        { name: 'Asr',     time: pt.asr.getTime() },
        { name: 'Maghrib', time: pt.maghrib.getTime() },
        { name: 'Isha',    time: pt.isha.getTime() },
      ];

      let nextIndex = prayersArray.findIndex(p => p.time > now);
      if (nextIndex === -1) nextIndex = 0; // Fallback to Fajr tomorrow

      const prayerData = JSON.stringify({
        prayers: prayersArray,
        nextPrayerIndex: nextIndex,
        lastUpdated: now,
      });

      // ── 2. Ayah Data ────────────────────────────────────────────────
      const ayahDataObj: { ayahs: { arabic: string; translation: string; reference: string }[] } =
        { ayahs: [] };
      try {
        const raw = localStorage.getItem('daily-ayah-cache');
        if (raw) {
          const parsed = JSON.parse(raw);
          ayahDataObj.ayahs.push({
            arabic:      parsed.text_arabic    || parsed.textArabic    || parsed.arabic      || '',
            translation: parsed.translation    || parsed.translit      || '',
            reference:   parsed.reference      || parsed.ref           || '',
          });
        }
      } catch (e) {
        console.warn('[useWidgetSync] Ayah cache parse error:', e);
      }

      const ayahData = JSON.stringify(ayahDataObj);

      // ── 3. Push to native plugin ────────────────────────────────────
      WidgetPlugin.notifyWidgetDataChanged({ prayerData, ayahData }).catch(err => {
        console.warn('[useWidgetSync] notifyWidgetDataChanged failed:', err);
      });

    } catch (err) {
      console.warn('[useWidgetSync] sync error:', err);
    }
  };

  // Sync when prayer times first load / change
  useEffect(() => {
    doSync(prayerTimes);
  }, [prayerTimes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also sync every 10 minutes so the countdown widget stays fresh
  useEffect(() => {
    const timerId = globalTimerManager.addCallback(() => {
      doSync(prayerTimesRef.current);
    }, 10 * 60 * 1000, 'widget-sync');

    return () => globalTimerManager.removeCallback(timerId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
