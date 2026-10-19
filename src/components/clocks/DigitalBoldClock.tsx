import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';
import { getPrayerDisplayName } from '@/lib/prayer-utils';

export const DigitalBoldClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  nextPrayer,
  isStaticPreview = false,
}) => {
  const is12 = timeFormat === '12h';
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const displayHours = is12
    ? String(hours % 12 || 12).padStart(2, '0')
    : String(hours).padStart(2, '0');
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Live countdown string for mini status pill
  const countdownText = useMemo(() => {
    if (isStaticPreview) return 'in 2h 22m';
    if (!nextPrayer?.targetTime) return '';
    const diff = nextPrayer.targetTime.getTime() - now.getTime();
    if (diff <= 0) return 'due now';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
  }, [now, nextPrayer?.targetTime, isStaticPreview]);

  const prayerName = useMemo(() => {
    return getPrayerDisplayName(nextPrayer?.name, nextPrayer?.targetTime || now) || 'Next';
  }, [nextPrayer?.name, nextPrayer?.targetTime, now]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "py-1 px-1" : "pt-2 pb-3 px-2 sm:px-4"
      )}
    >
      {/* ── Luxury Glassmorphic Chrono Card ── */}
      <div
        className={cn(
          "w-full relative overflow-hidden transition-all flex flex-col justify-between",
          isStaticPreview
            ? "max-w-[210px] p-2.5 rounded-xl shadow-md"
            : "max-w-md p-5 sm:p-6 rounded-[24px] shadow-2xl"
        )}
        style={{
          background: 'linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)',
          border: '1px solid var(--border)',
          boxShadow: isStaticPreview
            ? '0 4px 14px rgba(0,0,0,0.3)'
            : '0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        {/* Subtle Ambient Radial Glow Behind Numerals */}
        {!isStaticPreview && (
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              background: 'radial-gradient(circle at 45% 40%, var(--accent-glow) 0%, transparent 65%)',
              opacity: 0.25,
            }}
            aria-hidden="true"
          />
        )}

        {/* Faint Islamic Octagram Corner Watermark */}
        <div
          className="absolute -right-4 -top-4 pointer-events-none select-none opacity-[0.06]"
          aria-hidden="true"
        >
          <svg width={isStaticPreview ? "64" : "110"} height={isStaticPreview ? "64" : "110"} viewBox="0 0 100 100" fill="none">
            <rect x="25" y="25" width="50" height="50" stroke="var(--accent)" strokeWidth="1.5" />
            <rect x="25" y="25" width="50" height="50" stroke="var(--accent)" strokeWidth="1.5" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="18" stroke="var(--accent)" strokeWidth="1" />
          </svg>
        </div>

        {/* ── Main Digits Row (HH:MM + Stacked Column) ── */}
        <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-3 my-0.5">
          {/* Bold Metallic Gradient HH:MM Numerals */}
          <div
            className="font-extrabold tracking-tight tabular-nums leading-none"
            style={{
              fontSize: isStaticPreview ? '1.8rem' : 'clamp(2.8rem, 11vw, 4.2rem)',
              background: 'linear-gradient(180deg, var(--text-primary) 20%, var(--accent-text) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
            }}
          >
            {displayHours}:{displayMinutes}
          </div>

          {/* Stacked Right Column: :SS Seconds + AM/PM Pill (Only in 12h mode) */}
          <div className="flex flex-col items-start justify-center gap-1 shrink-0">
            {/* Live Ticking Seconds */}
            <span
              className="font-bold tabular-nums leading-none"
              style={{
                color: 'var(--accent-text)',
                fontSize: isStaticPreview ? '0.75rem' : '1.15rem',
              }}
            >
              :{displaySeconds}
            </span>

            {/* AM/PM Pill Badge: strictly hidden in 24h mode per 12/24h Guard */}
            {is12 && (
              <span
                className="font-bold tracking-wider leading-none rounded-full select-none"
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-text)',
                  fontSize: isStaticPreview ? '0.55rem' : '0.7rem',
                  padding: isStaticPreview ? '1px 5px' : '2px 8px',
                }}
              >
                {ampm}
              </span>
            )}
          </div>
        </div>

        {/* ── Gradient Divider Line ── */}
        <div
          className="relative z-10 w-full h-[1px] my-2 sm:my-2.5 opacity-60"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, var(--border) 20%, var(--accent) 50%, var(--border) 80%, transparent 100%)',
          }}
        />

        {/* ── Footer Row: Hijri Date + Next Prayer Mini Status Pill ── */}
        <div className="relative z-10 flex items-center justify-between gap-1 text-[10px] sm:text-xs">
          {/* Hijri Date with Decorative Diamond Stars */}
          <div
            className="flex items-center gap-1 font-medium truncate max-w-[55%] text-[var(--text-secondary)]"
            title={hijriDate}
          >
            <span className="text-[9px]" style={{ color: 'var(--accent)' }}>✦</span>
            <span className="truncate">{hijriDate}</span>
            <span className="text-[9px]" style={{ color: 'var(--accent)' }}>✦</span>
          </div>

          {/* Mini Next-Prayer Status Pill */}
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold shrink-0 select-none border"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--accent-text)',
              fontSize: isStaticPreview ? '9px' : '10.5px',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
              style={{ background: 'var(--accent)' }}
            />
            <span className="truncate max-w-[65px] sm:max-w-none">{prayerName}</span>
            {countdownText && (
              <span className="font-mono text-[var(--text-secondary)] font-normal ml-0.5">
                {countdownText}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalBoldClock;
