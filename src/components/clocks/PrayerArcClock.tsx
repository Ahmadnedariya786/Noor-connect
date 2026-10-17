import React, { useMemo } from 'react';
import { Moon, Bell } from 'lucide-react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';
import { getPrayerDisplayName } from '@/lib/prayer-utils';

function parseTimeTo12hAngle(timeStr?: string, dateObj?: Date | null): number {
  if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
    return ((dateObj.getHours() % 12) + dateObj.getMinutes() / 60) * 30;
  }
  if (!timeStr) return 0;
  const cleaned = timeStr.replace(/\s*\(.*?\)\s*/g, '').trim();
  const match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (cleaned.toLowerCase().includes('pm') && h < 12) h += 12;
  if (cleaned.toLowerCase().includes('am') && h === 12) h = 0;
  return ((h % 12) + m / 60) * 30;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.sin(rad),
    y: cy - r * Math.cos(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const span = ((endAngle - startAngle) % 360 + 360) % 360;
  if (span <= 0.1) return '';
  if (span >= 359.9) {
    const p1 = polarToCartesian(cx, cy, r, startAngle);
    const pMid = polarToCartesian(cx, cy, r, startAngle + 180);
    return `M ${p1.x} ${p1.y} A ${r} ${r} 0 1 1 ${pMid.x} ${pMid.y} A ${r} ${r} 0 1 1 ${p1.x} ${p1.y}`;
  }

  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = span > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

export const PrayerArcClock: React.FC<ClockProps> = ({
  now,
  hijriDate,
  nextPrayer,
  previousPrayer,
  isStaticPreview = false,
}) => {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourAngle = ((hours % 12) + minutes / 60 + (isStaticPreview ? 0 : seconds / 3600)) * 30;
  const minuteAngle = (minutes + (isStaticPreview ? 0 : seconds / 60)) * 6;

  const center = 120;
  const arcRadius = 72;
  const numeralRadius = 96;

  // Compute angles for previous and next prayer
  const startAngle = useMemo(() => {
    if (isStaticPreview) return 155; // ~5:10
    const calculated = parseTimeTo12hAngle(previousPrayer?.time, previousPrayer?.date);
    return calculated;
  }, [previousPrayer, isStaticPreview]);

  const endAngle = useMemo(() => {
    if (isStaticPreview) return 20; // ~12:40
    const calculated = parseTimeTo12hAngle(nextPrayer?.time, nextPrayer?.targetTime);
    return calculated;
  }, [nextPrayer, isStaticPreview]);

  const span = useMemo(() => {
    const s = ((endAngle - startAngle) % 360 + 360) % 360;
    return s === 0 ? 360 : s;
  }, [startAngle, endAngle]);

  const progress = useMemo(() => {
    if (isStaticPreview) return 0.55;
    const raw = nextPrayer?.progress ?? 0;
    return Math.min(1, Math.max(0, raw > 1 ? raw / 100 : raw));
  }, [nextPrayer, isStaticPreview]);

  const currentFilledAngle = startAngle + span * progress;

  // Arc paths
  const backgroundArcPath = useMemo(() => {
    return describeArc(center, center, arcRadius, startAngle, endAngle);
  }, [center, arcRadius, startAngle, endAngle]);

  const filledArcPath = useMemo(() => {
    if (progress <= 0.005) return '';
    return describeArc(center, center, arcRadius, startAngle, currentFilledAngle);
  }, [center, arcRadius, startAngle, currentFilledAngle, progress]);

  // Badge positions
  const startBadge = useMemo(() => polarToCartesian(center, center, arcRadius, startAngle), [center, arcRadius, startAngle]);
  const endBadge = useMemo(() => polarToCartesian(center, center, arcRadius, endAngle), [center, arcRadius, endAngle]);

  // Countdown string
  const countdownText = useMemo(() => {
    if (isStaticPreview) return 'in 1h 45m';
    if (!nextPrayer.targetTime) return 'approaching';
    const diff = nextPrayer.targetTime.getTime() - now.getTime();
    if (diff <= 0) return 'due now';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  }, [now, nextPrayer.targetTime, isStaticPreview]);

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
          border: '1.5px solid var(--border)',
          background: 'radial-gradient(circle at 50% 50%, var(--card-sheen) 0%, var(--surface-2) 35%, var(--surface) 70%, var(--bg-base) 100%)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), inset 0 0 25px rgba(0,0,0,0.85)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="prayerArcGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <filter id="arcGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--accent-glow)" floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Minimal Grey Numerals (12, 1..11) */}
          {Array.from({ length: 12 }, (_, i) => {
            const hr = i === 0 ? 12 : i;
            const a = (i * 30 * Math.PI) / 180;
            const x = center + numeralRadius * Math.sin(a);
            const y = center - numeralRadius * Math.cos(a);
            return (
              <text
                key={`arc-num-${hr}`}
                x={x}
                y={y + 3.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="sans-serif"
                fontWeight="600"
                fontSize={hr % 3 === 0 ? '11' : '9.5'}
                fill={hr % 3 === 0 ? 'var(--text-primary)' : 'var(--text-secondary)'}
              >
                {hr}
              </text>
            );
          })}

          {/* Background Prayer Arc Track */}
          {backgroundArcPath && (
            <path
              d={backgroundArcPath}
              fill="none"
              stroke="var(--accent-soft)"
              strokeWidth="9"
              strokeLinecap="round"
            />
          )}

          {/* Thick Glowing Active Prayer Arc */}
          {filledArcPath && (
            <path
              d={filledArcPath}
              fill="none"
              stroke="url(#prayerArcGold)"
              strokeWidth="9"
              strokeLinecap="round"
              filter="url(#arcGlow)"
            />
          )}

          {/* Previous Prayer Badge (Moon) at arc start */}
          <g transform={`translate(${startBadge.x}, ${startBadge.y})`}>
            <circle
              cx="0"
              cy="0"
              r="7.5"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              filter="drop-shadow(0 0 4px var(--accent-glow))"
            />
            {/* Small Moon icon vector */}
            <path
              d="M 1.5 -3.5 A 3.8 3.8 0 1 0 1.5 3.5 A 2.8 2.8 0 0 1 1.5 -3.5 Z"
              fill="var(--accent-text)"
            />
          </g>

          {/* Next Prayer Badge (Bell) at arc end */}
          <g transform={`translate(${endBadge.x}, ${endBadge.y})`}>
            <circle
              cx="0"
              cy="0"
              r="7.5"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="1.5"
              filter="drop-shadow(0 0 4px var(--accent-glow))"
            />
            {/* Small Bell icon vector */}
            <path
              d="M -2.5 1.5 C -2.5 -0.5, -1 -2, 0 -2.5 C 1 -2, 2.5 -0.5, 2.5 1.5 L 3.2 2.5 L -3.2 2.5 Z M -0.8 3 C -0.8 3.5, 0.8 3.5, 0.8 3"
              fill="var(--accent-text)"
              stroke="var(--accent-text)"
              strokeWidth="0.5"
            />
          </g>

          {/* Minimal Hour Hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - 46}
            stroke="var(--text-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              transform: `rotate(${hourAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
          />

          {/* Minimal Minute Hand */}
          <line
            x1={center}
            y1={center}
            x2={center}
            y2={center - 64}
            stroke="var(--text-primary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            style={{
              transform: `rotate(${minuteAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
          />

          {/* Center Hub */}
          <circle cx={center} cy={center} r="3.5" fill="var(--accent)" stroke="var(--accent-text)" strokeWidth="0.8" />

          {/* Center Info: Next Prayer Name + Live Countdown */}
          <text
            x={center}
            y={center + 20}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="bold"
            letterSpacing="0.08em"
            fill="url(#prayerArcGold)"
          >
            {getPrayerDisplayName(nextPrayer.name, now).toUpperCase()}
          </text>
          <text
            x={center}
            y={center + 31}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="600"
            fill="url(#prayerArcGold)"
          >
            {countdownText}
          </text>
        </svg>
      </div>

      {!isStaticPreview && (
        <div className="flex items-center justify-center gap-2 mt-2 select-none">
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
    </div>
  );
};

export default PrayerArcClock;
