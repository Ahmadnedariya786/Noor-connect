import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { getMoonPhase, getMoonSvgPath } from '@/utils/moonPhase';
import { cn } from '@/lib/utils';

export const CrescentMoonClock: React.FC<ClockProps> = ({
  now,
  hijriDate,
  isStaticPreview = false,
}) => {
  // Hand rotation calculations
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = ((hours % 12) + minutes / 60 + (isStaticPreview ? 0 : seconds / 3600)) * 30;
  const minuteAngle = (minutes + (isStaticPreview ? 0 : seconds / 60)) * 6;
  const secondAngle = seconds * 6;

  // Real-time Moon phase computation
  const moonInfo = useMemo(() => getMoonPhase(now), [now]);

  // ViewBox: 240 x 240
  const center = 120;
  const radius = 104;
  const moonWindowY = 66;
  const moonRadius = 14;

  // Generate 12 hour positions
  const hourPositions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const r = 90;
      return {
        hour: i === 0 ? 12 : i,
        x: center + r * Math.sin(angle),
        y: center - r * Math.cos(angle),
        isCardinal: i % 3 === 0,
      };
    });
  }, []);

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
          border: '2px solid var(--border)',
          background: `
            linear-gradient(135deg, transparent 20%, rgba(255,255,255,0.02) 28%, var(--accent-soft) 30%, transparent 34%),
            linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.015) 43%, var(--accent-soft) 46%, transparent 50%),
            radial-gradient(circle at 50% 50%, var(--surface-2) 0%, var(--surface) 65%, var(--bg-base) 100%)
          `,
          boxShadow: '0 12px 36px rgba(0,0,0,0.65), inset 0 0 25px rgba(0,0,0,0.8), inset 0 0 3px var(--accent-glow)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Theme Accented Gradients */}
            <linearGradient id="crescentGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-text)" />
              <stop offset="50%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
            <linearGradient id="moonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF9E6" />
              <stop offset="100%" stopColor="#E2C98A" />
            </linearGradient>
            {/* Hand Drop Shadow */}
            <filter id="handShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.7" />
            </filter>
          </defs>

          {/* Minute track: 60 subtle dots */}
          {Array.from({ length: 60 }).map((_, i) => {
            if (i % 5 === 0) return null; // Hour marker handles these
            const a = (i * 6 * Math.PI) / 180;
            const x = center + radius * Math.sin(a);
            const y = center - radius * Math.cos(a);
            return (
              <circle
                key={`dot-${i}`}
                cx={x}
                cy={y}
                r="1"
                fill="var(--accent)"
                opacity="0.3"
              />
            );
          })}

          {/* Hour markers & Numerals */}
          {hourPositions.map(({ hour, x, y, isCardinal }) => {
            if (hour === 12) {
              // Leave space for the moon window at 12
              return (
                <circle
                  key={`hr-${hour}`}
                  cx={x}
                  cy={y + 16}
                  r="2"
                  fill="url(#crescentGold)"
                />
              );
            }
            if (isCardinal) {
              return (
                <text
                  key={`num-${hour}`}
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="serif"
                  fontWeight="bold"
                  fontSize="13"
                  fill="var(--accent-text)"
                >
                  {hour}
                </text>
              );
            }
            return (
              <circle
                key={`hr-${hour}`}
                cx={x}
                cy={y}
                r="2.2"
                fill="url(#crescentGold)"
              />
            );
          })}

          {/* Top-Center Moon Phase Aperture Window */}
          <g transform={`translate(${center}, ${moonWindowY})`}>
            {/* Window Outer Rim */}
            <circle
              cx="0"
              cy="0"
              r={moonRadius + 3}
              fill="var(--surface)"
              stroke="url(#crescentGold)"
              strokeWidth="1.5"
              filter="drop-shadow(0 0 4px var(--accent-glow))"
            />
            {/* Starfield dots inside moon window */}
            <circle cx="-8" cy="-6" r="0.6" fill="rgba(255,255,255,0.7)" />
            <circle cx="9" cy="-5" r="0.8" fill="rgba(255,255,255,0.8)" />
            <circle cx="-6" cy="7" r="0.7" fill="rgba(255,255,255,0.6)" />
            <circle cx="7" cy="8" r="0.5" fill="rgba(255,255,255,0.7)" />
            <circle cx="2" cy="-9" r="0.6" fill="rgba(255,255,255,0.9)" />

            {/* Dark unlit moon background disc */}
            <circle cx="0" cy="0" r={moonRadius} fill="var(--bg-base)" />

            {/* Computed Illuminated Moon Phase Surface */}
            <path
              d={getMoonSvgPath(moonInfo.phase, moonRadius)}
              fill="url(#moonGlow)"
              filter="drop-shadow(0 0 3px rgba(255, 245, 200, 0.4))"
            />
          </g>

          {/* Hour Hand */}
          <g
            style={{
              transform: `rotate(${hourAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#handShadow)"
          >
            {/* Hour sword hand */}
            <path
              d={`M ${center - 3.5} ${center + 12} L ${center - 2} ${center - 54} L ${center} ${center - 62} L ${center + 2} ${center - 54} L ${center + 3.5} ${center + 12} Z`}
              fill="url(#crescentGold)"
            />
            <line
              x1={center}
              y1={center + 10}
              x2={center}
              y2={center - 58}
              stroke="var(--accent-text)"
              strokeWidth="0.8"
            />
          </g>

          {/* Minute Hand */}
          <g
            style={{
              transform: `rotate(${minuteAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#handShadow)"
          >
            {/* Minute lancet hand */}
            <path
              d={`M ${center - 2.5} ${center + 14} L ${center - 1.5} ${center - 76} L ${center} ${center - 85} L ${center + 1.5} ${center - 76} L ${center + 2.5} ${center + 14} Z`}
              fill="url(#crescentGold)"
            />
            <line
              x1={center}
              y1={center + 12}
              x2={center}
              y2={center - 80}
              stroke="var(--accent-text)"
              strokeWidth="0.8"
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
                y1={center + 22}
                x2={center}
                y2={center - 92}
                stroke="var(--accent-text)"
                strokeWidth="1"
              />
              {/* Counterweight circle */}
              <circle
                cx={center}
                cy={center + 14}
                r="3"
                fill="var(--accent)"
                stroke="var(--accent-text)"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Center Pivot Cap */}
          <circle
            cx={center}
            cy={center}
            r="4.5"
            fill="url(#crescentGold)"
            stroke="var(--accent-text)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* Subtle Lunar & Hijri subtitle when not in preview */}
      {!isStaticPreview && (
        <div className="mt-2 text-center">
          <p className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {hijriDate}
          </p>
          <p className="text-[11px] font-medium tracking-wider" style={{ color: 'var(--accent-text)' }}>
            {moonInfo.phaseName} • {Math.round(moonInfo.fraction * 100)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default CrescentMoonClock;
