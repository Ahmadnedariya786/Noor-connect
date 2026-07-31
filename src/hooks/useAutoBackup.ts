import { useEffect, useRef, useCallback } from 'react';
import { autoBackup } from '@/lib/backup-service';

const ACTIVITY_TIMEOUT = 20 * 60 * 1000;

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
      // Silent fail
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

  const enable = useCallback(() => {
    if (intervalRef.current) return;
    runBackup();
    intervalRef.current = setInterval(() => {
      runBackup();
    }, ACTIVITY_TIMEOUT);
    resetActivityTimer();
    const activityHandler = () => resetActivityTimer();
    const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
    events.forEach(event => window.addEventListener(event, activityHandler));
    (window as any).__autoBackupActivityHandler = activityHandler;
  }, [runBackup, resetActivityTimer]);

  const disable = useCallback(() => {
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
      const events = ['click', 'touchstart', 'keydown', 'scroll', 'mousemove'];
      events.forEach(event => window.removeEventListener(event, handler));
      delete (window as any).__autoBackupActivityHandler;
    }
  }, []);

  const backupNow = useCallback(async () => {
    await runBackup();
  }, [runBackup]);

  useEffect(() => {
    return () => disable();
  }, [disable]);

  return { enable, disable, backupNow };
}