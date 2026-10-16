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
          "border border-amber-500/30",
          isStaticPreview ? "p-2.5 rounded-xl shadow-md" : "p-4 sm:p-5 shadow-2xl"
        )}
        style={{
          background: 'linear-gradient(180deg, #0d0f14 0%, #06070a 100%)',
          boxShadow: 'inset 0 0 25px rgba(0, 0, 0, 0.9), 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 1px rgba(245, 158, 11, 0.25)',
        }}
      >
        {/* Top Mosque Header / Hijri Date */}
        <div className="w-full flex items-center justify-between text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mb-1.5 px-1 text-amber-500/80">
          <span className="truncate max-w-[65%]">{hijriDate}</span>
          {is12 && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-black border border-amber-500/40"
              style={{
                color: '#FFB800',
                textShadow: '0 0 8px rgba(255, 184, 0, 0.8)',
                background: 'rgba(255, 184, 0, 0.1)',
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
            className="font-mono font-bold tracking-widest text-amber-500/[0.08] pointer-events-none select-none tabular-nums"
            style={{
              fontSize: isStaticPreview ? '22px' : 'clamp(38px, 12vw, 60px)',
              letterSpacing: '0.12em',
            }}
            aria-hidden="true"
          >
            {ghostTime}
          </div>

          {/* Active Glowing Amber Digits */}
          <div
            className="absolute inset-0 flex items-center justify-center font-mono font-bold tracking-widest text-[#FFB800] tabular-nums"
            style={{
              fontSize: isStaticPreview ? '22px' : 'clamp(38px, 12vw, 60px)',
              letterSpacing: '0.12em',
              textShadow: '0 0 10px rgba(255, 184, 0, 0.85), 0 0 20px rgba(245, 158, 11, 0.5), 0 0 35px rgba(217, 119, 6, 0.3)',
            }}
          >
            <span>{displayHours}</span>
            <span className={cn("inline-block mx-0.5", !isStaticPreview && "animate-pulse")}>:</span>
            <span>{displayMinutes}</span>
            {!isStaticPreview && (
              <>
                <span className="inline-block mx-0.5 animate-pulse">:</span>
                <span className="text-amber-400/90">{displaySeconds}</span>
              </>
            )}
          </div>
        </div>

        {/* Thin Divider & Next Prayer Live Countdown Banner */}
        <div className="w-full border-t border-amber-500/20 mt-2 pt-2 flex items-center justify-between text-[10px] sm:text-xs font-mono font-bold tracking-wider">
          <span className="text-amber-300/80 uppercase flex items-center gap-1 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
            <span className="truncate">{getPrayerDisplayName(nextPrayer.name, now) || 'Prayer'}</span>
          </span>
          <span
            className="font-black text-amber-400 shrink-0 ml-2"
            style={{ textShadow: '0 0 6px rgba(255, 184, 0, 0.6)' }}
          >
            IN {countdownText}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MosqueLedClock;
