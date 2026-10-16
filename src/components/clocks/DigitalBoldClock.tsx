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
        className="font-black leading-none tracking-tighter text-foreground tabular-nums"
        style={{
          fontSize: isStaticPreview ? '28px' : 'clamp(52px, 18vw, 96px)',
          letterSpacing: '-0.03em',
        }}
      >
        {timeStr}
      </h1>
      <p
        className={cn(
          "font-semibold tracking-wide text-primary px-3 text-center leading-tight",
          isStaticPreview ? "text-[10px] text-primary/90 truncate max-w-[150px]" : "text-sm md:text-base"
        )}
      >
        {hijriDate}
      </p>
    </div>
  );
};

export default DigitalBoldClock;
