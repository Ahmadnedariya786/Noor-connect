import React, { useState, useEffect, memo } from 'react';
import { useClockStyle } from '@/lib/clock-style';
import { ClockRenderer } from './ClockRenderer';
import { getPrayerDisplayName } from '@/lib/prayer-utils';

interface ClockHeroProps {
  hijriDate: string;
  timeFormat: '12' | '24' | '12h' | '24h';
  nextPrayer: {
    name: string;
    time: string;
    targetTime?: Date | null;
    progress: number;
  };
  previousPrayer?: {
    name: string;
    time: string;
    date?: Date;
  } | null;
}

export const ClockHero: React.FC<ClockHeroProps> = memo(({
  hijriDate,
  timeFormat,
  nextPrayer,
  previousPrayer,
}) => {
  const { clockStyle } = useClockStyle();
  const [now, setNow] = useState<Date>(() => new Date());

  // Isolated 1-second ticker - only this clock subtree re-renders every second!
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startTicker = () => {
      if (intervalId !== null) return;
      // Sync immediately on wakeup/mount
      setNow(new Date());
      intervalId = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return;
        setNow(new Date());
      }, 1000);
    };

    const stopTicker = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopTicker();
      } else {
        startTicker();
      }
    };

    startTicker();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopTicker();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const normalizedTimeFormat: '12h' | '24h' =
    timeFormat === '24' || timeFormat === '24h' ? '24h' : '12h';

  const nextDisplayName = getPrayerDisplayName(nextPrayer.name, nextPrayer.targetTime || now);
  const prevDisplayName = previousPrayer?.name
    ? getPrayerDisplayName(previousPrayer.name, previousPrayer.date || now)
    : 'Previous Prayer';

  const normalizedNext = {
    name: nextDisplayName || 'Next Prayer',
    time: nextPrayer.time || '--:--',
    progress: nextPrayer.progress > 1 ? nextPrayer.progress / 100 : (nextPrayer.progress || 0),
    targetTime: nextPrayer.targetTime,
  };

  const normalizedPrev = {
    name: prevDisplayName,
    time: previousPrayer?.time || '--:--',
    date: previousPrayer?.date,
  };

  const sanitizedHijriDate = (hijriDate || '')
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
    .replace(/al-ola/gi, 'al-ūlā')
    .replace(/al-ōlā/gi, 'al-ūlā')
    .replace(/ō/g, 'ū');

  return (
    <div className="w-full flex justify-center items-center" key="clock-hero-wrapper">
      <ClockRenderer
        key={`clock-${clockStyle}`}
        styleId={clockStyle}
        now={now}
        timeFormat={normalizedTimeFormat}
        hijriDate={sanitizedHijriDate}
        nextPrayer={normalizedNext}
        previousPrayer={normalizedPrev}
      />
    </div>
  );
});

ClockHero.displayName = 'ClockHero';

export default ClockHero;
