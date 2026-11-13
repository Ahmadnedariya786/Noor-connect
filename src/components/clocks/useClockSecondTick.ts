import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

/**
 * Isolated leaf-level 1-second ticker hook.
 *
 * Aligns to the next exact second boundary using Date.now().
 * Automatically pauses when document is hidden (visibilitychange)
 * or when app is in the background (Capacitor appStateChange),
 * resyncing instantly upon resume.
 */
export function useClockSecondTick(isStaticPreview = false, externalNow?: Date): Date {
  const [now, setNow] = useState<Date>(() => externalNow || new Date());

  useEffect(() => {
    if (isStaticPreview) return;
    if (externalNow) {
      setNow(externalNow);
      return;
    }

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const tick = () => {
      if (isCancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      setNow(new Date());

      // Align precisely to the next second boundary
      const nowMs = Date.now();
      const delay = 1000 - (nowMs % 1000);
      timerId = setTimeout(tick, delay);
    };

    const startTicker = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      setNow(new Date());
      const nowMs = Date.now();
      const delay = 1000 - (nowMs % 1000);
      timerId = setTimeout(tick, delay);
    };

    const stopTicker = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        stopTicker();
      } else {
        startTicker();
      }
    };

    startTicker();

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    let appStateHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          startTicker();
        } else {
          stopTicker();
        }
      }).then((handle) => {
        appStateHandle = handle;
      }).catch(() => {
        // Safe listener fallback
      });
    }

    return () => {
      isCancelled = true;
      stopTicker();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (appStateHandle) {
        try {
          appStateHandle.remove();
        } catch {
          // Safe removal fallback
        }
      }
    };
  }, [isStaticPreview, externalNow]);

  return externalNow || now;
}

export default useClockSecondTick;
