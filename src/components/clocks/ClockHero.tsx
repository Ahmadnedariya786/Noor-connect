import React, { useState, useEffect, memo } from 'react';
import { useClockStyle } from '@/lib/clock-style';
import { ClockRenderer } from './ClockRenderer';
import { getPrayerDisplayName } from '@/lib/prayer-utils';
import { LivingSkyAura } from './LivingSkyAura';
import { evaluateMakruhState } from '@/lib/makruh-times';

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
  prayers?: any[];
}

export const ClockHero: React.FC<ClockHeroProps> = memo(({
  hijriDate,
  timeFormat,
  nextPrayer,
  previousPrayer,
  prayers,
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

  const makruhState = evaluateMakruhState(prayers || [], now, normalizedTimeFormat);

  return (
    <div className="w-full flex flex-col justify-center items-center relative overflow-hidden rounded-[26px]" key="clock-hero-wrapper">
      <LivingSkyAura nextPrayerName={nextPrayer?.name} currentHour={now.getHours()} />
      <div className="relative z-10 w-full flex flex-col justify-center items-center">
        <ClockRenderer
          key={`clock-${clockStyle}`}
          styleId={clockStyle}
          now={now}
          timeFormat={normalizedTimeFormat}
          hijriDate={sanitizedHijriDate}
          nextPrayer={normalizedNext}
          previousPrayer={normalizedPrev}
        />

        {/* Real-Time Makruh Prohibited Waqt Blinking Pill Indicator */}
        {makruhState.isMakruhNow && makruhState.activeWindow && (
          <div
            className="mt-3 mx-auto px-3.5 py-1.5 rounded-full makruh-red-blink-banner flex items-center justify-between gap-2 max-w-[340px] w-[92%] text-xs font-bold select-none transition-all duration-300"
            style={{
              border: '1px solid #EF4444',
              color: '#FEE2E2',
              background: 'rgba(239, 68, 68, 0.20)',
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.45)',
            }}
            role="alert"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-[#FF1E1E] makruh-red-dot-blink shrink-0" />
              <span className="tracking-wide uppercase text-[11px] truncate text-red-100 font-extrabold">
                MAKRUH WAQT • {makruhState.activeWindow.shortLabel}
              </span>
            </div>
            <span className="font-mono tabular-nums text-[11px] shrink-0 text-red-200 font-bold pl-2" dir="ltr">
              Ends in {makruhState.remainingFormatted}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

ClockHero.displayName = 'ClockHero';

export default ClockHero;
