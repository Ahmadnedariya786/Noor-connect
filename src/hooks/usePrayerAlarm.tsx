import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { getAdhanUrlForPrayer, type PrayerName } from '@/lib/adhan-preferences';
import { nativeAdhan } from '@/lib/native-adhan';
import {
  PRAYER_ALARM_CONTROL_EVENT,
  PRAYER_ALARM_STATE_EVENT,
  PRAYER_ALARM_TOGGLE_EVENT,
  type PrayerAlarmControlDetail,
  type PrayerAlarmStateDetail,
  type PrayerAlarmToggleDetail,
} from '@/lib/prayer-alarm-events';
import { adhanService } from '@/lib/adhan-service';

const STORAGE_KEY = 'prayer-alarm-enabled';

const dispatchToggleEvent = (enabled: boolean): void => {
  const detail: PrayerAlarmToggleDetail = { enabled };
  window.dispatchEvent(new CustomEvent<PrayerAlarmToggleDetail>(PRAYER_ALARM_TOGGLE_EVENT, { detail }));
};

const dispatchControlEvent = (detail: PrayerAlarmControlDetail): void => {
  window.dispatchEvent(new CustomEvent<PrayerAlarmControlDetail>(PRAYER_ALARM_CONTROL_EVENT, { detail }));
};

export const usePrayerAlarm = () => {
  const [isEnabled, setIsEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPrayer, setCurrentPrayer] = useState<string | null>(null);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setIsEnabled(event.newValue === 'true');
      }
    };

    const handleToggle = (event: Event) => {
      const detail = (event as CustomEvent<PrayerAlarmToggleDetail>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setIsEnabled(detail.enabled);
      }
    };

    const handlePlaybackState = (event: Event) => {
      const detail = (event as CustomEvent<PrayerAlarmStateDetail>).detail;
      if (!detail) return;

      setIsPlaying(detail.isPlaying);
      setCurrentPrayer(detail.prayerName);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(PRAYER_ALARM_TOGGLE_EVENT, handleToggle as EventListener);
    window.addEventListener(PRAYER_ALARM_STATE_EVENT, handlePlaybackState as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(PRAYER_ALARM_TOGGLE_EVENT, handleToggle as EventListener);
      window.removeEventListener(PRAYER_ALARM_STATE_EVENT, handlePlaybackState as EventListener);
    };
  }, [handleStorageChange, handleToggle, handlePlaybackState]);

  const enableAlarm = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Try to unlock audio playback from a user gesture context.
    const url = await getAdhanUrlForPrayer('Dhuhr');
    const tempAudio = new Audio(url);
    tempAudio.volume = 0;
    try {
      await tempAudio.play();
      tempAudio.pause();
    } catch {
      // Browser may still block autoplay until another interaction.
    } finally {
      tempAudio.src = '';
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    // Keep adhan-config in sync with this primary toggle
    const config = adhanService.getAdhanConfig();
    
    // If all prayers were off, turn them all on when enabling the master switch
    const allOff = !config.fajrEnabled && !config.dhuhrEnabled && !config.asrEnabled && 
                   !config.maghribEnabled && !config.ishaEnabled && !config.jummahEnabled;
    
    const updated = { 
      ...config, 
      enabled: true,
      ...(allOff ? {
        fajrEnabled: true,
        dhuhrEnabled: true,
        asrEnabled: true,
        maghribEnabled: true,
        ishaEnabled: true,
        jummahEnabled: true
      } : {})
    };
    
    adhanService.saveAdhanConfig(updated);
    setIsEnabled(true);
    dispatchToggleEvent(true);
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: updated }));
    await nativeAdhan.setEnabled(true);

    // Re-sync native alarms immediately when the user enables adhan.
    import('@/lib/local-notifications')
      .then(({ localNotifications }) => localNotifications.schedulePrayerNotificationsFromAPI())
      .catch((error) => {
        console.warn('Failed to refresh native adhan alarms after enabling:', error);
      });

    toast.success('Prayer Alarm Enabled', {
      description: 'Adhan will play automatically at prayer time.',
    });
  }, []);

  const stopAdhan = useCallback(() => {
    dispatchControlEvent({ action: 'stop' });
    setIsPlaying(false);
    setCurrentPrayer(null);
  }, []);

  const disableAlarm = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'false');
    const config = adhanService.getAdhanConfig();
    
    // When master switch is off, also turn off all individual toggles
    const updated = { 
      ...config, 
      enabled: false,
      fajrEnabled: false,
      dhuhrEnabled: false,
      asrEnabled: false,
      maghribEnabled: false,
      ishaEnabled: false,
      jummahEnabled: false
    };
    
    adhanService.saveAdhanConfig(updated);
    setIsEnabled(false);
    dispatchToggleEvent(false);
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: updated }));
    void nativeAdhan.setEnabled(false);
    stopAdhan();

    toast.success('Adhan Silence Mode Active', {
      description: 'Master switch and all individual adhan alerts have been turned OFF.'
    });
  }, [stopAdhan]);

  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup stop timeout on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
    };
  }, []);

  const testAdhan = useCallback(() => {
    // Cycle through different prayers for testing
    const prayers: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const currentHour = new Date().getHours();
    
    // Select a prayer based on current time to make testing more realistic
    let selectedPrayer: PrayerName;
    if (currentHour >= 5 && currentHour < 9) selectedPrayer = 'Fajr';
    else if (currentHour >= 9 && currentHour < 13) selectedPrayer = 'Dhuhr';
    else if (currentHour >= 13 && currentHour < 17) selectedPrayer = 'Asr';
    else if (currentHour >= 17 && currentHour < 20) selectedPrayer = 'Maghrib';
    else selectedPrayer = 'Isha';
    
    dispatchControlEvent({ action: 'test', prayerName: selectedPrayer });

    // Clear any previous timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }
    stopTimeoutRef.current = window.setTimeout(() => {
      dispatchControlEvent({ action: 'stop' });
      stopTimeoutRef.current = null;
    }, 8000); // Slightly longer for different adhan lengths
  }, []);

  return {
    isEnabled,
    isPlaying,
    currentPrayer,
    enableAlarm,
    disableAlarm,
    stopAdhan,
    testAdhan,
  };
};
