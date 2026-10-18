import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';

export const HourWedgeClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  isStaticPreview = false,
}) => {
  const is12 = timeFormat === '12h';
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  // 12-hour dial geometry: 30 degrees per hour
  const hour12 = hours % 12;
  const wedgeAngle = hour12 * 30; // 0 deg is at 12 o'clock, 30 at 1, etc.

  // Label text inside wedge respects 12h / 24h
  const wedgeLabel = is12
    ? String(hour12 === 0 ? 12 : hour12)
    : String(hours).padStart(2, '0');

  // Smooth hand rotation angles (0 at 12 o'clock)
  const hourAngle = (hour12 + minutes / 60 + (isStaticPreview ? 0 : seconds / 3600)) * 30;
  const minuteAngle = (minutes + (isStaticPreview ? 0 : seconds / 60)) * 6;
  const secondAngle = seconds * 6;

  // Dial geometry in 240x240 viewBox
  const center = 120;
  const dialRadius = 108;
  const wedgeRadius = Math.round(dialRadius * 0.92); // ~99px
  const textRadius = Math.round(wedgeRadius * 0.72); // ~71px from center

  // Pre-calculated 30-degree pie slice centered vertically at the top (-15 deg to +15 deg)
  const arcX1 = center - wedgeRadius * 0.2588;
  const arcY1 = center - wedgeRadius * 0.9659;
  const arcX2 = center + wedgeRadius * 0.2588;
  const arcY2 = center - wedgeRadius * 0.9659;
  const fullWedgePath = `M ${center} ${center} L ${arcX1.toFixed(2)} ${arcY1.toFixed(2)} A ${wedgeRadius} ${wedgeRadius} 0 0 1 ${arcX2.toFixed(2)} ${arcY2.toFixed(2)} Z`;

  // Progressive wedge: fraction of the current hour elapsed (0 to 1)
  const minuteFraction = Math.min(1, Math.max(0, (minutes + (isStaticPreview ? 0 : seconds / 60)) / 60));
  const splitAngle = -15 + minuteFraction * 30;

  const elapsedWedgePath = useMemo(() => {
    if (minuteFraction <= 0.005) return null;
    if (minuteFraction >= 0.995) return fullWedgePath;
    const radStart = (-15 * Math.PI) / 180;
    const radEnd = (splitAngle * Math.PI) / 180;
    const x1 = center + wedgeRadius * Math.sin(radStart);
    const y1 = center - wedgeRadius * Math.cos(radStart);
    const x2 = center + wedgeRadius * Math.sin(radEnd);
    const y2 = center - wedgeRadius * Math.cos(radEnd);
    return `M ${center} ${center} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${wedgeRadius} ${wedgeRadius} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  }, [minuteFraction, splitAngle, center, wedgeRadius, fullWedgePath]);

  // 60 Faint Minute Ticks around the inner rim (every 5th tick slightly longer & brighter)
  const minuteTicks = useMemo(() => {
    const ticks = [];
    const rOuter = dialRadius - 3;
    for (let i = 0; i < 60; i++) {
      const isFifth = i % 5 === 0;
      const length = isFifth ? 6 : 3;
      const rInner = rOuter - length;
      const rad = ((i * 6 - 90) * Math.PI) / 180;
      const x1 = center + rInner * Math.cos(rad);
      const y1 = center + rInner * Math.sin(rad);
      const x2 = center + rOuter * Math.cos(rad);
      const y2 = center + rOuter * Math.sin(rad);
      ticks.push({
        id: i,
        x1: x1.toFixed(2),
        y1: y1.toFixed(2),
        x2: x2.toFixed(2),
        y2: y2.toFixed(2),
        isFifth,
      });
    }
    return ticks;
  }, [center, dialRadius]);

  // 4 Cardinal orientation dots at 12, 3, 6, 9
  const cardinalDots = useMemo(() => {
    const r = dialRadius - 12;
    return [
      { x: center, y: center - r }, // 12
      { x: center + r, y: center }, // 3
      { x: center, y: center + r }, // 6
      { x: center - r, y: center }, // 9
    ];
  }, [center, dialRadius]);

  // Formatted digital readout: HH:MM with AM/PM in 12h, HH:MM in 24h
  const formattedDigitalTime = useMemo(() => {
    if (is12) {
      const displayHours = hours % 12 || 12;
      const displayMinutes = String(minutes).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      return `${String(displayHours).padStart(2, '0')}:${displayMinutes} ${ampm}`;
    } else {
      const displayHours = String(hours).padStart(2, '0');
      const displayMinutes = String(minutes).padStart(2, '0');
      return `${displayHours}:${displayMinutes}`;
    }
  }, [is12, hours, minutes]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "py-1" : "pt-2 pb-3"
      )}
    >
      {/* Matte Dark Dial with Neumorphic Depth and Inner Sheen */}
      <div
        className={cn(
          "relative rounded-full transition-all flex items-center justify-center",
          isStaticPreview
            ? "w-28 h-28 sm:w-32 sm:h-32 shadow-md"
            : "w-[220px] h-[220px] sm:w-[250px] sm:h-[250px]"
        )}
        style={{
          border: '1px solid var(--border)',
          background: 'radial-gradient(circle at 50% 50%, var(--surface-2) 0%, var(--bg-elev) 100%)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.45), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Accent gradient for the active hour slice */}
            <linearGradient id="hourWedgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>

            {/* Soft shadow under hands */}
            <filter id="wedgeHandShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* 60 Faint Minute Ticks around the inner rim */}
          {minuteTicks.map((tick) => (
            <line
              key={`tick-${tick.id}`}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke="var(--border)"
              strokeWidth={tick.isFifth ? "1.5" : "1"}
              opacity={tick.isFifth ? "0.6" : "0.25"}
              strokeLinecap="round"
            />
          ))}

          {/* 4 Faint Cardinal Orientation Dots */}
          {cardinalDots.map((dot, i) => (
            <circle
              key={`cardinal-${i}`}
              cx={dot.x}
              cy={dot.y}
              r={isStaticPreview ? "1.5" : "2"}
              fill="var(--border)"
              opacity="0.85"
            />
          ))}

          {/* ── Hour Wedge: 30° pie slice rotating on hour change with 0.6s ease ── */}
          <g
            style={{
              transform: `rotate(${wedgeAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          >
            {/* Base wedge rendered in accent at 25% alpha */}
            <path
              d={fullWedgePath}
              fill="var(--accent)"
              opacity="0.25"
            />

            {/* Progressive elapsed wedge filled with the bright accent gradient */}
            {elapsedWedgePath && (
              <path
                d={elapsedWedgePath}
                fill="url(#hourWedgeGrad)"
                opacity="0.95"
              />
            )}

            {/* Upright Hour Number inside the wedge (counter-rotated to stay horizontally upright) */}
            <g
              style={{
                transform: `rotate(${-wedgeAngle}deg)`,
                transformOrigin: `${center}px ${center - textRadius}px`,
                transition: isStaticPreview ? 'none' : 'transform 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)',
              }}
            >
              <text
                x={center}
                y={center - textRadius}
                textAnchor="middle"
                dominantBaseline="central"
                fill="var(--on-accent)"
                fontSize={isStaticPreview ? "18" : (wedgeLabel.length > 1 ? "21" : "23")}
                fontWeight="900"
                fontFamily="'Impact', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Trebuchet MS', sans-serif"
                style={{
                  letterSpacing: '-0.02em',
                }}
              >
                {wedgeLabel}
              </text>
            </g>
          </g>

          {/* ── Hour Hand: Short thick rounded bar in var(--text-primary) ── */}
          <line
            x1={center}
            y1={center + 6}
            x2={center}
            y2={center - 46}
            stroke="var(--text-primary)"
            strokeWidth={isStaticPreview ? "4" : "5.5"}
            strokeLinecap="round"
            filter="url(#wedgeHandShadow)"
            style={{
              transform: `rotate(${hourAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2, 0.55, 0.44)',
            }}
          />

          {/* ── Minute Hand: Longer medium bar in var(--text-primary) with a var(--accent) tip dot ── */}
          <g
            style={{
              transform: `rotate(${minuteAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.15s cubic-bezier(0.4, 2, 0.55, 0.44)',
            }}
            filter="url(#wedgeHandShadow)"
          >
            <line
              x1={center}
              y1={center + 8}
              x2={center}
              y2={center - 74}
              stroke="var(--text-primary)"
              strokeWidth={isStaticPreview ? "2.5" : "3.5"}
              strokeLinecap="round"
            />
            {/* Distinct var(--accent) tip dot */}
            <circle
              cx={center}
              cy={center - 80}
              r={isStaticPreview ? "2.5" : "3.5"}
              fill="var(--accent)"
              stroke="var(--surface-2)"
              strokeWidth="0.75"
            />
          </g>

          {/* ── Second Hand: 1px var(--accent), omitted in static preview ── */}
          {!isStaticPreview && (
            <line
              x1={center}
              y1={center + 16}
              x2={center}
              y2={center - 90}
              stroke="var(--accent)"
              strokeWidth="1"
              strokeLinecap="round"
              style={{
                transform: `rotate(${secondAngle}deg)`,
                transformOrigin: `${center}px ${center}px`,
              }}
            />
          )}

          {/* Center Cap (var(--accent)) */}
          <circle
            cx={center}
            cy={center}
            r="4"
            fill="var(--accent)"
            stroke="var(--surface-2)"
            strokeWidth="1"
          />
        </svg>
      </div>

      {/* ── Premium Hijri Date Line ── */}
      {!isStaticPreview && (
        <div className="flex items-center justify-center gap-2 mt-2.5 select-none">
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
      )}

      {/* ── Small digital readout line directly below Hijri date line ── */}
      {!isStaticPreview && (
        <div className="mt-1 text-center select-none">
          <p
            className="font-mono font-bold tabular-nums"
            style={{
              color: 'var(--accent-text)',
              fontSize: '14px',
              letterSpacing: '0.08em',
            }}
          >
            {formattedDigitalTime}
          </p>
        </div>
      )}
    </div>
  );
};

export default HourWedgeClock;
