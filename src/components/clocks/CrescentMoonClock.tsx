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
  const dialRadius = 108;
  const moonWindowY = 72; // cx=50%, cy=30% of 240
  const moonRadius = 13;

  // 60-Minute Chapter Ring Ticks
  const chapterTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i < 60; i++) {
      const isHour = i % 5 === 0;
      const len = isHour ? 6 : 3;
      const rOuter = dialRadius - 2;
      const rInner = rOuter - len;
      const rad = ((i * 6 - 90) * Math.PI) / 180;
      ticks.push({
        id: i,
        x1: (center + rInner * Math.cos(rad)).toFixed(2),
        y1: (center + rInner * Math.sin(rad)).toFixed(2),
        x2: (center + rOuter * Math.cos(rad)).toFixed(2),
        y2: (center + rOuter * Math.sin(rad)).toFixed(2),
        isHour,
      });
    }
    return ticks;
  }, [center, dialRadius]);

  // 12 Faceted Hour Markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    const r = dialRadius - 14;
    for (let i = 0; i < 12; i++) {
      const hr = i === 0 ? 12 : i;
      const rad = ((i * 30 - 90) * Math.PI) / 180;
      markers.push({
        hr,
        x: center + r * Math.cos(rad),
        y: center + r * Math.sin(rad),
        isCardinal: i % 3 === 0,
      });
    }
    return markers;
  }, [center, dialRadius]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "py-1" : "pt-2 pb-3"
      )}
    >
      {/* ── Double Metallic Bezel Dial ── */}
      <div
        className={cn(
          "relative rounded-full transition-all flex items-center justify-center",
          isStaticPreview
            ? "w-28 h-28 sm:w-32 sm:h-32 shadow-md"
            : "w-[220px] h-[220px] sm:w-[250px] sm:h-[250px] shadow-2xl"
        )}
        style={{
          border: '2px solid var(--border)',
          background: 'radial-gradient(circle at 50% 35%, var(--surface-2) 0%, var(--surface) 40%, var(--bg-base) 85%)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.65), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible', isolation: 'isolate' }}
        >
          <defs>
            <linearGradient id="crescentGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <linearGradient id="moonGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFF9E6" />
              <stop offset="100%" stopColor="#E2C98A" />
            </linearGradient>
            {!isStaticPreview && (
              <filter id="crescentHandShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.75" />
              </filter>
            )}
          </defs>

          {/* ── Layer 1: Inner Accent Bezel Ring ── */}
          <circle
            cx={center}
            cy={center}
            r={dialRadius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1"
            opacity="0.45"
          />

          {/* ── Layer 2: 60-Minute Perimeter Chapter Ring ── */}
          {chapterTicks.map((t) => (
            <line
              key={`tick-${t.id}`}
              x1={t.x1}
              y1={t.y1}
              x2={t.x2}
              y2={t.y2}
              stroke={t.isHour ? "var(--accent)" : "var(--border)"}
              strokeWidth={t.isHour ? "1.8" : "1"}
              opacity={t.isHour ? "0.85" : "0.35"}
              strokeLinecap="round"
            />
          ))}

          {/* 12 Faceted Hour Markers */}
          {hourMarkers.map(({ hr, x, y, isCardinal }) => {
            if (hr === 12) {
              // Subtle diamond pip at 12 to frame the aperture
              return (
                <polygon
                  key={`hr-${hr}`}
                  points={`${x},${y - 3} ${x + 2.5},${y} ${x},${y + 3} ${x - 2.5},${y}`}
                  fill="url(#crescentGold)"
                />
              );
            }
            if (isCardinal) {
              return (
                <text
                  key={`num-${hr}`}
                  x={x}
                  y={y + 4}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="'Cinzel', serif, Georgia"
                  fontWeight="bold"
                  fontSize="12.5"
                  fill="var(--accent-text)"
                >
                  {hr}
                </text>
              );
            }
            return (
              <polygon
                key={`hr-${hr}`}
                points={`${x},${y - 2.5} ${x + 2},${y} ${x},${y + 2.5} ${x - 2},${y}`}
                fill="var(--accent)"
                opacity="0.85"
              />
            );
          })}

          {/* ── Layer 3: Recessed Moon-Phase Aperture Window (cx=50%, cy=30%) ── */}
          <g transform={`translate(${center}, ${moonWindowY})`}>
            {/* Window Outer Recessed Bezel */}
            <circle
              cx="0"
              cy="0"
              r={moonRadius + 3.5}
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="1.2"
              opacity="0.9"
            />
            {/* Deep Night-Sky Inner Fill */}
            <circle cx="0" cy="0" r={moonRadius + 2} fill="#040814" />

            {/* Tiny Star Dots in Night Sky */}
            <circle cx="-7" cy="-5" r="0.6" fill="#FFFFFF" opacity="0.8" />
            <circle cx="8" cy="-4" r="0.7" fill="#FFFFFF" opacity="0.85" />
            <circle cx="-5" cy="6" r="0.5" fill="#FFFFFF" opacity="0.6" />
            <circle cx="6" cy="6" r="0.6" fill="#FFFFFF" opacity="0.75" />
            <circle cx="1" cy="-7" r="0.5" fill="#FFFFFF" opacity="0.9" />

            {/* Computed Illuminated Moon Phase Disc */}
            <path
              d={getMoonSvgPath(moonInfo.phase, moonRadius)}
              fill="url(#moonGlow)"
              filter={!isStaticPreview ? "drop-shadow(0 0 3px rgba(255, 245, 200, 0.5))" : undefined}
            />
          </g>

          {/* ── Layer 4 (TOP): Watchmaker Hands + Center Jewel Cap ── */}
          <g id="crescent-hands" filter={!isStaticPreview ? "url(#crescentHandShadow)" : undefined}>
            {/* Tapered Sword Hour Hand with Luminous Spine */}
            <g
              style={{
                transform: `rotate(${hourAngle}deg)`,
                transformOrigin: `${center}px ${center}px`,
                transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
              }}
            >
              <path
                d={`M ${center - 3.5} ${center + 10} L ${center - 2} ${center - 48} L ${center} ${center - 56} L ${center + 2} ${center - 48} L ${center + 3.5} ${center + 10} Z`}
                fill="var(--text-primary)"
              />
              <line
                x1={center}
                y1={center + 8}
                x2={center}
                y2={center - 52}
                stroke="var(--accent-text)"
                strokeWidth="1"
              />
            </g>

            {/* Tapered Sword Minute Hand with Luminous Spine */}
            <g
              style={{
                transform: `rotate(${minuteAngle}deg)`,
                transformOrigin: `${center}px ${center}px`,
                transition: isStaticPreview ? 'none' : 'transform 0.15s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
              }}
            >
              <path
                d={`M ${center - 2.8} ${center + 12} L ${center - 1.5} ${center - 70} L ${center} ${center - 78} L ${center + 1.5} ${center - 70} L ${center + 2.8} ${center + 12} Z`}
                fill="var(--text-primary)"
              />
              <line
                x1={center}
                y1={center + 10}
                x2={center}
                y2={center - 74}
                stroke="var(--accent-text)"
                strokeWidth="1"
              />
            </g>

            {/* Sweeping Thin Second Hand with Counterbalance Tail */}
            {!isStaticPreview && (
              <g
                style={{
                  transform: `rotate(${secondAngle}deg)`,
                  transformOrigin: `${center}px ${center}px`,
                }}
              >
                <line
                  x1={center}
                  y1={center + 20}
                  x2={center}
                  y2={center - 90}
                  stroke="var(--accent)"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <circle
                  cx={center}
                  cy={center + 14}
                  r="2.8"
                  fill="var(--accent)"
                  stroke="var(--bg-base)"
                  strokeWidth="0.8"
                />
              </g>
            )}

            {/* 3-Layer Center Jewel Cap */}
            <circle
              cx={center}
              cy={center}
              r="4.8"
              fill="var(--accent)"
              stroke="var(--border)"
              strokeWidth="0.8"
            />
            <circle
              cx={center}
              cy={center}
              r="3"
              fill="var(--bg-base)"
            />
            <circle
              cx={center}
              cy={center}
              r="1.4"
              fill="var(--accent-text)"
            />
          </g>
        </svg>
      </div>

      {/* Subtle Lunar & Hijri subtitle when not in preview */}
      {!isStaticPreview && (
        <div className="mt-2 text-center select-none">
          <div className="flex items-center justify-center gap-2 select-none">
            <span className="text-[9px] select-none" style={{ color: 'var(--accent)' }}>◈</span>
            <p
              className="text-xs font-semibold tracking-[0.06em] text-center"
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
          <p className="text-[11px] font-medium tracking-wider mt-0.5" style={{ color: 'var(--accent-text)' }}>
            {moonInfo.phaseName} • {Math.round(moonInfo.fraction * 100)}%
          </p>
        </div>
      )}
    </div>
  );
};

export default CrescentMoonClock;
