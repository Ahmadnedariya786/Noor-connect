import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';

// Arabic-Indic Numerals for 12, 1, 2, ..., 11
const ARABIC_INDIC_NUMERALS: Record<number, string> = {
  12: '١٢',
  1: '١',
  2: '٢',
  3: '٣',
  4: '٤',
  5: '٥',
  6: '٦',
  7: '٧',
  8: '٨',
  9: '٩',
  10: '١٠',
  11: '١١',
};

export const OttomanHeritageClock: React.FC<ClockProps> = ({
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
  const numeralRadius = 82;

  // 12 hour positions
  const numerals = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const hr = i === 0 ? 12 : i;
      const angle = (i * 30 * Math.PI) / 180;
      const x = center + numeralRadius * Math.sin(angle);
      const y = center - numeralRadius * Math.cos(angle);

      // Midpoint angle for ornament between numerals
      const midAngle = ((i * 30 + 15) * Math.PI) / 180;
      const ox = center + numeralRadius * Math.sin(midAngle);
      const oy = center - numeralRadius * Math.cos(midAngle);

      return {
        hour: hr,
        arabic: ARABIC_INDIC_NUMERALS[hr],
        x,
        y,
        ox,
        oy,
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
          border: '2.5px solid var(--border)',
          background: 'radial-gradient(circle at 50% 50%, var(--card-sheen) 0%, var(--surface-2) 35%, var(--surface) 70%, var(--bg-base) 100%)',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), inset 0 0 25px rgba(0,0,0,0.85), 0 0 2px var(--accent-glow)',
        }}
      >
        <svg
          viewBox="0 0 240 240"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="ottomanGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="var(--accent-2)" />
            </linearGradient>
            <filter id="ottomanShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.75" />
            </filter>
          </defs>

          {/* Double Decorative Concentric Gold Rings */}
          <circle
            cx={center}
            cy={center}
            r="108"
            fill="none"
            stroke="url(#ottomanGold)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
            opacity="0.6"
          />
          <circle
            cx={center}
            cy={center}
            r="104"
            fill="none"
            stroke="url(#ottomanGold)"
            strokeWidth="0.8"
            opacity="0.4"
          />
          <circle
            cx={center}
            cy={center}
            r="58"
            fill="none"
            stroke="url(#ottomanGold)"
            strokeWidth="0.8"
            opacity="0.35"
          />

          {/* Center Gold Ornamental Arabesque Motif (Islamic 8-Point Star Rosette) */}
          <g transform={`translate(${center}, ${center})`} opacity="0.85">
            {/* 8-pointed star base */}
            <path
              d="M 0 -26 L 7 -18 L 18 -18 L 18 -7 L 26 0 L 18 7 L 18 18 L 7 18 L 0 26 L -7 18 L -18 18 L -18 7 L -26 0 L -18 -7 L -18 -18 L -7 -18 Z"
              fill="var(--accent-soft)"
              stroke="url(#ottomanGold)"
              strokeWidth="1.2"
            />
            {/* Inner rotated star */}
            <path
              d="M 0 -17 L 5 -12 L 12 -12 L 12 -5 L 17 0 L 12 5 L 12 12 L 5 12 L 0 17 L -5 12 L -12 12 L -12 5 L -17 0 L -12 -5 L -12 -12 L -5 -12 Z"
              fill="var(--accent-soft)"
              stroke="url(#ottomanGold)"
              strokeWidth="0.9"
              transform="rotate(22.5)"
            />
            {/* Central floral petals */}
            <circle cx="0" cy="0" r="6" fill="var(--accent-soft)" stroke="var(--accent-text)" strokeWidth="0.8" />
          </g>

          {/* Numerals & Intermediate Corner Ornaments */}
          {numerals.map(({ arabic, x, y, ox, oy }, idx) => (
            <React.Fragment key={`num-group-${idx}`}>
              {/* Arabic-Indic Digit */}
              <text
                x={x}
                y={y + 5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="'Traditional Arabic', 'Amiri', 'Scheherazade New', serif"
                fontWeight="bold"
                fontSize="17"
                fill="var(--accent-text)"
                style={{
                  textShadow: '0 0 6px var(--accent-glow)',
                }}
              >
                {arabic}
              </text>

              {/* Small Gold Diamond/Fleuron Ornament Between Numerals */}
              <g transform={`translate(${ox}, ${oy})`}>
                <polygon
                  points="0,-2.5 2,0 0,2.5 -2,0"
                  fill="url(#ottomanGold)"
                  opacity="0.75"
                />
              </g>
            </React.Fragment>
          ))}

          {/* Ornate Heritage Hour Hand */}
          <g
            style={{
              transform: `rotate(${hourAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#ottomanShadow)"
          >
            {/* Ornate spade silhouette */}
            <path
              d={`
                M ${center - 2.5} ${center + 12}
                L ${center - 2} ${center - 24}
                C ${center - 7} ${center - 34}, ${center - 5} ${center - 48}, ${center} ${center - 58}
                C ${center + 5} ${center - 48}, ${center + 7} ${center - 34}, ${center + 2} ${center - 24}
                L ${center + 2.5} ${center + 12}
                Z
              `}
              fill="url(#ottomanGold)"
            />
            {/* Pierced spade center opening */}
            <circle cx={center} cy={center - 38} r="3" fill="var(--surface)" />
          </g>

          {/* Ornate Heritage Minute Hand */}
          <g
            style={{
              transform: `rotate(${minuteAngle}deg)`,
              transformOrigin: `${center}px ${center}px`,
              transition: isStaticPreview ? 'none' : 'transform 0.2s cubic-bezier(0.4, 2.08, 0.55, 0.44)',
            }}
            filter="url(#ottomanShadow)"
          >
            {/* Pierced lancet hand */}
            <path
              d={`
                M ${center - 2} ${center + 14}
                L ${center - 1.5} ${center - 40}
                C ${center - 5} ${center - 54}, ${center - 4} ${center - 70}, ${center} ${center - 82}
                C ${center + 4} ${center - 70}, ${center + 5} ${center - 54}, ${center + 1.5} ${center - 40}
                L ${center + 2} ${center + 14}
                Z
              `}
              fill="url(#ottomanGold)"
            />
            <circle cx={center} cy={center - 56} r="2.5" fill="var(--surface)" />
          </g>

          {/* Slim Gold Second Hand */}
          {!isStaticPreview && (
            <g
              style={{
                transform: `rotate(${secondAngle}deg)`,
                transformOrigin: `${center}px ${center}px`,
              }}
            >
              <line
                x1={center}
                y1={center + 18}
                x2={center}
                y2={center - 90}
                stroke="var(--accent-text)"
                strokeWidth="0.9"
              />
              <circle cx={center} cy={center + 12} r="2.5" fill="var(--accent)" />
            </g>
          )}

          {/* Center Medallion Cap */}
          <circle cx={center} cy={center} r="5" fill="url(#ottomanGold)" stroke="var(--accent-text)" strokeWidth="0.8" />
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

export default OttomanHeritageClock;
