import { useEffect, useRef, useCallback } from 'react';
import { autoBackup } from '@/lib/backup-service';

const ACTIVITY_TIMEOUT = 20 * 60 * 1000;
const FIRST_BACKUP_DELAY = 5 * 1000;

/**
 * Always-on auto backup. Runs shortly after mount (deferred to idle time so
 * it never blocks startup), then every 20 minutes of app use (the timer
 * resets on any user activity). There is no toggle — backups are
 * non-negotiable by design.
 */
export function useAutoBackup(onBackup?: () => void) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBackupRef = useRef(onBackup);
  onBackupRef.current = onBackup;

  const runBackup = useCallback(async () => {
    try {
      await autoBackup();
      onBackupRef.current?.();
    } catch (error) {
      // Silent fail — the 20-minute cadence retries automatically.
    }
  }, []);

  const resetActivityTimer = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    activityTimeoutRef.current = setTimeout(() => {
      runBackup();
    }, ACTIVITY_TIMEOUT);
  }, [runBackup]);

  useEffect(() => {
    let firstBackupTimeout: ReturnType<typeof setTimeout> | null = null;
    let firstBackupIdleId: number | null = null;
    firstBackupTimeout = setTimeout(() => {
      if ('requestIdleCallback' in window) {
        firstBackupIdleId = window.requestIdleCallback(() => runBackup());
      } else {
        runBackup();
      }
    }, FIRST_BACKUP_DELAY);
    intervalRef.current = setInterval(() => {
      runBackup();
    }, ACTIVITY_TIMEOUT);
    resetActivityTimer();
    const activityHandler = () => resetActivityTimer();
    const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
    events.forEach(event => window.addEventListener(event, activityHandler));
    (window as any).__autoBackupActivityHandler = activityHandler;
    return () => {
      if (firstBackupTimeout) {
        clearTimeout(firstBackupTimeout);
      }
      if (firstBackupIdleId !== null) {
        window.cancelIdleCallback(firstBackupIdleId);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
      const handler = (window as any).__autoBackupActivityHandler;
      if (handler) {
        events.forEach(event => window.removeEventListener(event, handler));
        delete (window as any).__autoBackupActivityHandler;
      }
    };
  }, [runBackup, resetActivityTimer]);
}
