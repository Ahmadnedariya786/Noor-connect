import React, { useState, useEffect, memo } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useClockStyle } from '@/lib/clock-style';
import { ClockRenderer } from './ClockRenderer';
import { getPrayerDisplayName } from '@/lib/prayer-utils';
import { LivingSkyAura } from './LivingSkyAura';
import { evaluateMakruhState, type MakruhWindowInfo, formatCountdownRemaining } from '@/lib/makruh-times';

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

const MakruhHeroPill: React.FC<{ activeWindow: MakruhWindowInfo }> = memo(({ activeWindow }) => {
  const [remainingFormatted, setRemainingFormatted] = useState(() => {
    const now = new Date();
    const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const rem = Math.max(0, activeWindow.endSecondsOfDay - nowSec);
    return formatCountdownRemaining(rem);
  });

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      const now = new Date();
      const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const rem = Math.max(0, activeWindow.endSecondsOfDay - nowSec);
      setRemainingFormatted(formatCountdownRemaining(rem));
    };

    tick();
    timerId = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerId !== null) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [activeWindow.endSecondsOfDay]);

  return (
    <div
      className="mt-3 mx-auto rounded-full makruh-red-blink-banner select-none transition-all duration-300"
      style={{
        fontSize: '0.72rem',
        fontWeight: 800,
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        width: '100%',
        maxWidth: '340px',
        boxSizing: 'border-box',
        border: '1px solid #EF4444',
        color: '#FEE2E2',
        background: 'rgba(239, 68, 68, 0.20)',
        boxShadow: '0 0 16px rgba(239, 68, 68, 0.45)',
      }}
      role="alert"
    >
      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
        <span className="w-2 h-2 rounded-full bg-[#FF1E1E] makruh-red-dot-blink shrink-0" />
        <span className="tracking-wide uppercase text-red-100 font-extrabold whitespace-nowrap">
          {activeWindow.id === 'tulu'
            ? 'MAKRUH • Sunrise'
            : activeWindow.id === 'zawal'
              ? 'MAKRUH • Zawal'
              : 'MAKRUH • Sunset'}
        </span>
      </div>
      <span className="font-mono tabular-nums shrink-0 text-red-200 font-bold whitespace-nowrap" dir="ltr">
        Ends in {remainingFormatted}
      </span>
    </div>
  );
});

MakruhHeroPill.displayName = 'MakruhHeroPill';

export const ClockHero: React.FC<ClockHeroProps> = memo(({
  hijriDate,
  timeFormat,
  nextPrayer,
  previousPrayer,
  prayers,
}) => {
  const { clockStyle } = useClockStyle();
  const [boundaryKey, setBoundaryKey] = useState(0);

  const normalizedTimeFormat: '12h' | '24h' =
    timeFormat === '24' || timeFormat === '24h' ? '24h' : '12h';

  // Exact next-boundary scheduler: schedules ONE timeout for the exact boundary
  // (next minute boundary, next prayer start, or Makruh window start/end)
  useEffect(() => {
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isCancelled = false;

    const scheduleNext = () => {
      if (isCancelled) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const now = new Date();
      const nowMs = now.getTime();

      // Candidate 1: Next minute boundary (+50ms buffer)
      const nextMinuteMs = nowMs + ((60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 50);
      const candidates: number[] = [nextMinuteMs];

      // Candidate 2: Next upcoming prayer start
      if (Array.isArray(prayers)) {
        for (const p of prayers) {
          if (p.date instanceof Date && p.date.getTime() > nowMs) {
            candidates.push(p.date.getTime() + 50);
          }
        }
      }

      // Candidate 3: Makruh window boundaries
      const currentMakruh = evaluateMakruhState(prayers || [], now, normalizedTimeFormat);
      if (currentMakruh.activeWindow) {
        candidates.push(currentMakruh.activeWindow.end.getTime() + 50);
      }
      for (const w of currentMakruh.allWindows) {
        if (w.start.getTime() > nowMs) {
          candidates.push(w.start.getTime() + 50);
        }
      }

      const earliest = Math.min(...candidates);
      const delay = Math.max(100, earliest - nowMs);

      timerId = setTimeout(() => {
        setBoundaryKey(k => k + 1);
      }, delay);
    };

    scheduleNext();

    const handleResume = () => {
      setBoundaryKey(k => k + 1);
    };

    const handleVisibility = () => {
      if (!document.hidden) handleResume();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let appStateHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) handleResume();
      }).then(h => { appStateHandle = h; }).catch((_err) => { void _err; });
    }

    window.addEventListener('timeupdate', handleResume);
    window.addEventListener('timezonechange', handleResume);

    return () => {
      isCancelled = true;
      if (timerId !== null) clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('timeupdate', handleResume);
      window.removeEventListener('timezonechange', handleResume);
      if (appStateHandle) {
        try {
          appStateHandle.remove();
        } catch (_err) {
          void _err;
        }
      }
    };
  }, [prayers, normalizedTimeFormat, boundaryKey]);

  const renderNow = new Date();
  const currentHour = renderNow.getHours();

  const nextDisplayName = getPrayerDisplayName(nextPrayer.name, nextPrayer.targetTime || renderNow);
  const prevDisplayName = previousPrayer?.name
    ? getPrayerDisplayName(previousPrayer.name, previousPrayer.date || renderNow)
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

  const makruhState = evaluateMakruhState(prayers || [], renderNow, normalizedTimeFormat);

  return (
    <div
      className="w-full flex flex-col justify-center items-center relative overflow-hidden theme-hero-card"
      style={{
        borderRadius: 'var(--sig-radius, 26px)',
        border: 'var(--sig-border, 1px solid var(--border))',
        boxShadow: 'var(--sig-glow, 0 10px 30px rgba(0,0,0,0.4))',
      }}
      key="clock-hero-wrapper"
    >
      {/* Hero card inner vignette for jewel depth (Part 2 item 3) */}
      <div className="hero-inner-vignette" aria-hidden="true" />
      {/* Card-level pattern on Hero card (Part 2 item 1, opacity <= 0.07 cap) */}
      <div className="hero-pattern-layer sig-pattern-layer" aria-hidden="true" />
      {/* Macro motif watermark with outer radial vignette fade (Part 2 items 1 & 2) */}
      <div className="sig-motif-vignette" aria-hidden="true">
        <div
          className="sig-motif-layer"
          style={{
            width: '210px',
            height: '210px',
          }}
        />
      </div>
      {/* Kiswa Noir top gold-embroidery band (Part 1 item 4a) */}
      <div className="kiswa-hero-band" aria-hidden="true" />
      <LivingSkyAura nextPrayerName={nextPrayer?.name} currentHour={currentHour} />
      <div className="relative z-10 w-full flex flex-col justify-center items-center">
        <ClockRenderer
          key={`clock-${clockStyle}`}
          styleId={clockStyle}
          timeFormat={normalizedTimeFormat}
          hijriDate={sanitizedHijriDate}
          nextPrayer={normalizedNext}
          previousPrayer={normalizedPrev}
        />

        {/* Real-Time Makruh Prohibited Waqt Blinking Pill Indicator */}
        {makruhState.isMakruhNow && makruhState.activeWindow && (
          <MakruhHeroPill activeWindow={makruhState.activeWindow} />
        )}
      </div>
    </div>
  );
});

ClockHero.displayName = 'ClockHero';

export default ClockHero;
