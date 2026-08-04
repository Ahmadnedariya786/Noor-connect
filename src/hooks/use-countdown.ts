import { useState, useEffect, useCallback, useRef } from 'react';
import { globalTimerManager } from '@/lib/timer-manager';

interface CountdownReturn {
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  formattedTime: string;
}

export const useCountdown = (targetTime: Date, id: string): CountdownReturn => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date();
    const difference = targetTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(difference / 1000));
  });

  const timerIdRef = useRef<string | null>(null);

  const calculateTimeLeft = useCallback(() => {
    const now = new Date();
    const difference = targetTime.getTime() - now.getTime();
    return Math.max(0, Math.floor(difference / 1000));
  }, [targetTime]);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0 && timerIdRef.current) {
        globalTimerManager.removeCallback(timerIdRef.current);
        timerIdRef.current = null;
      }
    };

    timerIdRef.current = globalTimerManager.addCallback(updateCountdown, 1000, id);

    return () => {
      if (timerIdRef.current) {
        globalTimerManager.removeCallback(timerIdRef.current);
        timerIdRef.current = null;
      }
    };
  }, [calculateTimeLeft, id]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft === 0;
  
  const formattedTime = isExpired 
    ? 'Expired' 
    : minutes >= 60
      ? `${Math.floor(minutes / 60)}h ${minutes % 60}m ${seconds}s left`
      : minutes > 0 
        ? `${minutes}m ${seconds}s left`
        : `${seconds}s left`;

  return {
    minutes,
    seconds,
    totalSeconds: timeLeft,
    isExpired,
    formattedTime
  };
};
