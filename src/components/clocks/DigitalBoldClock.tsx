import React from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';

export const DigitalBoldClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  isStaticPreview = false,
}) => {
  const is12 = timeFormat === '12h';
  const timeStr = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: is12,
  });

  return (
    <div
      className={cn(
        "text-center flex flex-col justify-center items-center gap-1 select-none w-full",
        isStaticPreview ? "py-2" : "pt-3 pb-4"
      )}
    >
      <h1
        className="font-black leading-none tracking-tighter tabular-nums"
        style={{
          color: 'var(--text-primary)',
          fontSize: isStaticPreview ? '28px' : 'clamp(52px, 18vw, 96px)',
          letterSpacing: '-0.03em',
        }}
      >
        {timeStr}
      </h1>
      <div className="flex items-center justify-center gap-2 mt-1 select-none">
        <span className="text-[9px] select-none" style={{ color: 'var(--accent)' }}>◈</span>
        <p
          className={cn(
            "font-semibold tracking-[0.06em] px-1 text-center leading-tight",
            isStaticPreview ? "text-[10px] truncate max-w-[140px]" : "text-xs sm:text-sm md:text-base"
          )}
          style={{
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 10px var(--accent-glow))',
          }}
        >
          {hijriDate}
        </p>
        <span className="text-[9px] select-none" style={{ color: 'var(--accent)' }}>◈</span>
      </div>
    </div>
  );
};

export default DigitalBoldClock;
