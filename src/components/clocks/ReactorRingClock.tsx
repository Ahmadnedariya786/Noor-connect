import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';

export const ReactorRingClock: React.FC<ClockProps> = ({
  now,
  hijriDate,
  isStaticPreview = false,
}) => {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = ((hours % 12) + minutes / 60 + (isStaticPreview ? 0 : seconds / 3600)) * 30;
  const minuteAngle = (minutes + (isStaticPreview ? 0 : seconds / 60)) * 6;
  const secondAngle = seconds * 6;

  const center = 120;
  const ringRadius = 96;

  // 60 segments: 0..59
  const segments = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const angle = (i * 6 * Math.PI) / 180;
      const isCardinal = i % 15 === 0;
      const innerR = isCardinal ? ringRadius - 12 : ringRadius - 6;
      const outerR = ringRadius;

      const x1 = center + innerR * Math.sin(angle);
      const y1 = center - innerR * Math.cos(angle);
      const x2 = center + outerR * Math.sin(angle);
      const y2 = center - outerR * Math.cos(angle);

      const isElapsed = i <= minutes;

      return {
        index: i,
        x1,
        y1,
        x2,
        y2,
        isCardinal,
        isElapsed,
      };
    });
  }, [minutes]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "py-1" : "pt-2 pb-3"
      )}
    >
      <div
        className={cn(
          "relative rounded-full transition-all flex items-center justify-center",
          isStaticPreview ? "w-28 h-28 sm:w-32 sm:h-32 shadow-md" : "w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] shadow-2xl"
        )}
        style={{
          border: '1.5px solid rgba(255,255,255,0.1)',
          background: 'radial-gradient(circle at 50% 50%, #151a24 0%, #0d111a 65%, #06080d 100%)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), inset 0 0 30px rgba(0,0,0,0.85)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <filter id="reactorGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#F59E0B" floodOpacity="0.8" />
            </filter>
            <filter id="whiteHandShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Inner Accent Ring */}
          <circle
            cx={center}
            cy={center}
            r={ringRadius - 16}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />

          {/* 60 Radial Segments */}
          {segments.map(({ index, x1, y1, x2, y2, isCardinal, isElapsed }) => {
            const strokeColor = isElapsed
              ? (isCardinal ? '#FBBF24' : '#E5A93C')
              : (isCardinal ? '#475569' : '#1E293B');
            const strokeWidth = isCardinal ? 2.5 : 1.5;

            return (
              <line
                key={`seg-${index}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                filter={isElapsed ? 'url(#reactorGlow)' : undefined}
                opacity={isElapsed ? 1 : 0.6}
              />
            );
          })}

          {/* 4 Cardinal Tick Highlights (12, 3, 6, 9) */}
          <circle cx={center} cy={center - ringRadius + 18} r="1.5" fill={minutes >= 0 ? '#FBBF24' : '#475569'} />
          <circle cx={center + ringRadius - 18} cy={center} r="1.5" fill={minutes >= 15 ? '#FBBF24' : '#475569'} />
          <circle cx={center} cy={center + ringRadius - 18} r="1.5" fill={minutes >= 30 ? '#FBBF24' : '#475569'} />
          <circle cx={center - ringRadius + 18} cy={center} r="1.5" fill={minutes >= 45 ? '#FBBF24' : '#475569'} />

          {/* Slim White Hour Hand */}
          <g
            style={{
              transform: `rotate(${hourAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#whiteHandShadow)"
          >
            <line
              x1={center}
              y1={center + 10}
              x2={center}
              y2={center - 54}
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </g>

          {/* Slim White Minute Hand */}
          <g
            style={{
              transform: `rotate(${minuteAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#whiteHandShadow)"
          >
            <line
              x1={center}
              y1={center + 12}
              x2={center}
              y2={center - 78}
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>

          {/* Thin Gold Second Hand */}
          {!isStaticPreview && (
            <g
              style={{
                transform: `rotate(${secondAngle}deg)`,
                transformOrigin: `${center}px ${center}px`,
              }}
            >
              <line
                x1={center}
                y1={center + 16}
                x2={center}
                y2={center - 86}
                stroke="#F59E0B"
                strokeWidth="1"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Glowing Center Hub */}
          <circle cx={center} cy={center} r="4" fill="#FFFFFF" />
          <circle cx={center} cy={center} r="2" fill="#F59E0B" />
        </svg>
      </div>

      {!isStaticPreview && (
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold tracking-wide text-primary">
            {hijriDate}
          </p>
          <p className="text-[11px] font-mono font-medium text-amber-400/80">
            {minutes}/60m elapsed
          </p>
        </div>
      )}
    </div>
  );
};

export default ReactorRingClock;
