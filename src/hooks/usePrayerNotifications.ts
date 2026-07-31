import { useEffect, useMemo, type MutableRefObject } from 'react';
import { formatPrayerTime } from '@/lib/time-formatter';
import { getMenstrualModeData } from '@/lib/menstrual-mode';
import type { PrayerTimes, LocationData } from './usePrayerTimes';

/**
 * Schedules prayer-time notifications only when the actual prayer times change.
 * Shares the signature ref with the caller so that method/madhab changes can
 * force a re-schedule by resetting it.
 */
export function usePrayerNotifications(
  prayerTimes: PrayerTimes | null,
  location: LocationData | null,
  previousNotificationSignatureRef: MutableRefObject<string | null>
) {
  const notificationPrayerTimesKey = useMemo(() => {
    if (!prayerTimes || !location) {
      return null;
    }

    return JSON.stringify({
      fajr: formatPrayerTime(prayerTimes.fajr, '24'),
      dhuhr: formatPrayerTime(prayerTimes.dhuhr, '24'),
      asr: formatPrayerTime(prayerTimes.asr, '24'),
      maghrib: formatPrayerTime(prayerTimes.maghrib, '24'),
      isha: formatPrayerTime(prayerTimes.isha, '24'),
      location: `${location.latitude},${location.longitude}`
    });
  }, [prayerTimes, location]);

  useEffect(() => {
    if (!prayerTimes || !location || !notificationPrayerTimesKey) return;

    const menstrualMode = getMenstrualModeData();
    if (menstrualMode.isActive && menstrualMode.pausePrayerNotifications) {
      import('@/lib/local-notifications').then(({ localNotifications }) => {
        localNotifications.clearPrayerNotifications().catch((error) => {
          console.error('Failed to clear prayer notifications in Menstrual Mode:', error);
        });
      });
      return;
    }

    // Only schedule if prayer times have actually changed
    if (previousNotificationSignatureRef.current !== notificationPrayerTimesKey) {
      previousNotificationSignatureRef.current = notificationPrayerTimesKey;

      // Throttle notification scheduling to prevent rapid calls
      const timeoutId = setTimeout(() => {
        import('@/lib/local-notifications').then(({ localNotifications }) => {
          localNotifications.schedulePrayerNotificationsFromAPI().catch((error) => {
            console.error('Failed to schedule prayer notifications:', error);
          });
        });
      }, 1000); // 1 second throttle

      return () => clearTimeout(timeoutId);
    }
  }, [prayerTimes, location, notificationPrayerTimesKey, previousNotificationSignatureRef]);
}
