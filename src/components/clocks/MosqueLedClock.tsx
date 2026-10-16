import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';
import { getPrayerDisplayName } from '@/lib/prayer-utils';

export const MosqueLedClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  nextPrayer,
  isStaticPreview = false,
}) => {
  const is12 = timeFormat === '12h';

  // Compute live countdown string
  const countdownText = useMemo(() => {
    if (isStaticPreview) return '2h 22m';
    if (!nextPrayer.targetTime) return '00:00';

    const diff = nextPrayer.targetTime.getTime() - now.getTime();
    if (diff <= 0) return '00:00';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  }, [now, nextPrayer.targetTime, isStaticPreview]);

  // Digits formatting
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const displayHours = is12
    ? String(hours % 12 || 12).padStart(2, '0')
    : String(hours).padStart(2, '0');
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  const ampm = is12 ? (hours >= 12 ? 'PM' : 'AM') : '';

  // Ghost mask for 7-segment simulation
  const ghostTime = isStaticPreview
    ? (is12 ? '88:88' : '88:88')
    : (is12 ? '88:88:88' : '88:88:88');

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "p-1.5" : "pt-2 pb-4 px-3"
      )}
    >
      {/* Mosque Wall Clock Dark Panel */}
      <div
        className={cn(
          "w-full max-w-sm rounded-2xl relative overflow-hidden flex flex-col items-center justify-center transition-all",
          isStaticPreview ? "p-2.5 rounded-xl shadow-md" : "p-4 sm:p-5 shadow-2xl"
        )}
        style={{
          border: '1px solid var(--border)',
          background: 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)',
          boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.9), 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 1px var(--accent-glow)',
        }}
      >
        {/* Top Mosque Header / Hijri Date */}
        <div
          className="w-full flex items-center justify-between text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mb-1.5 px-1"
          style={{ color: 'var(--accent-text)' }}
        >
          <span className="truncate max-w-[65%]">{hijriDate}</span>
          {is12 && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-black"
              style={{
                color: 'var(--on-accent)',
                background: 'var(--accent)',
                border: '1px solid var(--border)',
              }}
            >
              {ampm}
            </span>
          )}
        </div>

        {/* 7-Segment Digits Simulation with Ghost Layer */}
        <div className="relative flex items-center justify-center my-0.5 sm:my-1">
          {/* Ghost unlit 88:88 segments */}
          <div
            className="font-mono font-bold tracking-widest pointer-events-none select-none tabular-nums"
            style={{
              color: 'var(--accent)',
              opacity: 0.12,
              fontSize: isStaticPreview ? '22px' : 'clamp(38px, 12vw, 60px)',
              letterSpacing: '0.12em',
            }}
            aria-hidden="true"
          >
            {ghostTime}
          </div>

          {/* Active Glowing Digits */}
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-bold tracking-widest tabular-nums"
            style={{
              color: 'var(--accent-text)',
              fontSize: isStaticPreview ? '22px' : 'clamp(38px, 12vw, 60px)',
              letterSpacing: '0.12em',
              textShadow: '0 0 10px var(--accent-glow), 0 0 20px var(--accent-glow)',
            }}
          >
            <span>{displayHours}</span>
            <span className={cn("inline-block mx-0.5", !isStaticPreview && "animate-pulse")}>:</span>
            <span>{displayMinutes}</span>
            {!isStaticPreview && (
              <>
                <span className="inline-block mx-0.5 animate-pulse">:</span>
                <span style={{ color: 'var(--accent-text)', opacity: 0.9 }}>{displaySeconds}</span>
              </>
            )}
          </div>
        </div>

        {/* Thin Divider & Next Prayer Live Countdown Banner */}
        <div
          className="w-full mt-2 pt-2 flex items-center justify-between text-[10px] sm:text-xs font-mono font-bold tracking-wider"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <span
            className="uppercase flex items-center gap-1 truncate"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping inline-block"
              style={{ background: 'var(--accent)' }}
            />
            <span className="truncate">{getPrayerDisplayName(nextPrayer.name, now) || 'Prayer'}</span>
          </span>
          <span
            className="font-black shrink-0 ml-2"
            style={{
              color: 'var(--accent-text)',
              textShadow: '0 0 6px var(--accent-glow)',
            }}
          >
            IN {countdownText}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MosqueLedClock;
