import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';
import { getPrayerDisplayName } from '@/lib/prayer-utils';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { getLocalizedPrayerName, formatLocalizedCountdown } from '@/lib/home-prayer-i18n';

export const DigitalBoldClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  nextPrayer,
  isStaticPreview = false,
}) => {
  const { language } = useLanguage();
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

  // Live countdown string for mini status pill, fully localized
  const countdownText = useMemo(() => {
    if (isStaticPreview) return formatLocalizedCountdown(2 * 3600 * 1000 + 22 * 60 * 1000, language);
    if (!nextPrayer?.targetTime) return '';
    const diff = nextPrayer.targetTime.getTime() - now.getTime();
    return formatLocalizedCountdown(diff, language);
  }, [now, nextPrayer?.targetTime, isStaticPreview, language]);

  const prayerName = useMemo(() => {
    const raw = getPrayerDisplayName(nextPrayer?.name, nextPrayer?.targetTime || now) || 'Next';
    return getLocalizedPrayerName(raw, language);
  }, [nextPrayer?.name, nextPrayer?.targetTime, now, language]);

  // Normalized progress (0 to 1)
  const prayerProgress = useMemo(() => {
    if (!nextPrayer || typeof nextPrayer.progress !== 'number') return 0;
    const p = nextPrayer.progress > 1 ? nextPrayer.progress / 100 : nextPrayer.progress;
    return Math.max(0, Math.min(1, p));
  }, [nextPrayer]);

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
          "w-full relative overflow-hidden transition-all flex flex-col justify-between items-center",
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
              background: 'radial-gradient(circle at 50% 35%, var(--accent-glow) 0%, transparent 65%)',
              opacity: 0.22,
            }}
            aria-hidden="true"
          />
        )}

        {/* Faint Islamic Geometric Rub el Hizb Center-Background Watermark (opacity: 0.04) */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          style={{ opacity: 0.04 }}
          aria-hidden="true"
        >
          <svg width={isStaticPreview ? "90" : "180"} height={isStaticPreview ? "90" : "180"} viewBox="0 0 100 100" fill="none">
            <rect x="25" y="25" width="50" height="50" stroke="var(--accent)" strokeWidth="1.5" />
            <rect x="25" y="25" width="50" height="50" stroke="var(--accent)" strokeWidth="1.5" transform="rotate(45 50 50)" />
            <circle cx="50" cy="50" r="18" stroke="var(--accent)" strokeWidth="1" />
          </svg>
        </div>

        {/* ── Main Single-Row Luxury Horology Layout (1000588780.jpg Fix) ── */}
        <div
          className="relative z-10 flex items-baseline justify-center ltr-num"
          dir="ltr"
          style={{
            direction: 'ltr',
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: isStaticPreview ? '4px' : '8px',
            whiteSpace: 'nowrap',
            width: '100%',
          }}
        >
          {/* Hours & Minutes (11:45) */}
          <div
            className="font-extrabold tracking-tight tabular-nums leading-none select-none"
            style={{
              fontSize: isStaticPreview ? '1.8rem' : '3.35rem',
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {displayHours}:{displayMinutes}
          </div>

          {/* Seconds & AM/PM Stacked Badge Column */}
          <div
            className="inline-flex flex-col items-start justify-center shrink-0"
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: isStaticPreview ? '2px' : '3px',
              transform: isStaticPreview ? 'translateY(-2px)' : 'translateY(-4px)',
            }}
          >
            {/* Top: :02 Live Ticking Seconds */}
            <span
              className="font-bold tabular-nums leading-none select-none"
              style={{
                color: 'var(--accent-text)',
                fontSize: isStaticPreview ? '0.75rem' : '1.15rem',
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              :{displaySeconds}
            </span>

            {/* Bottom: AM/PM Pill (Only in 12h mode) */}
            {is12 && (
              <span
                className="font-extrabold tracking-wider leading-none select-none uppercase"
                style={{
                  fontSize: isStaticPreview ? '0.50rem' : '0.62rem',
                  fontWeight: 800,
                  padding: isStaticPreview ? '1px 4px' : '2px 6px',
                  borderRadius: '6px',
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  letterSpacing: '0.06em',
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

        {/* ── Centered Hijri Date Row ── */}
        <div
          className="relative z-10 w-full flex flex-col items-center justify-center text-center select-none"
          style={{
            gap: isStaticPreview ? '4px' : '7px',
          }}
        >
          {/* Full Hijri Date with Decorative Diamond Stars */}
          <div
            className="flex items-center justify-center gap-1.5 font-semibold text-center select-none"
            style={{
              fontSize: isStaticPreview ? '0.68rem' : '0.80rem',
              fontWeight: 600,
              color: 'var(--accent-text)',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              lineHeight: 1.2,
              textAlign: 'center',
            }}
            title={hijriDate}
          >
            <span
              className="inline-block shrink-0 select-none"
              style={{
                fontSize: isStaticPreview ? '0.60rem' : '0.72rem',
                color: 'var(--accent)',
              }}
            >
              ✦
            </span>
            <span className="tracking-wide select-none">
              {(hijriDate || '')
                .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
                .replace(/al-ola/gi, 'al-ūlā')
                .replace(/al-ōlā/gi, 'al-ūlā')
                .replace(/ō/g, 'ū')}
            </span>
            <span
              className="inline-block shrink-0 select-none"
              style={{
                fontSize: isStaticPreview ? '0.60rem' : '0.72rem',
                color: 'var(--accent)',
              }}
            >
              ✦
            </span>
          </div>

          {/* Next Prayer Countdown Pill */}
          <div
            className="inline-flex items-center justify-center font-semibold shrink-0 select-none border"
            style={{
              gap: isStaticPreview ? '4px' : '6px',
              padding: isStaticPreview ? '2px 8px' : '4px 12px',
              borderRadius: '999px',
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--accent-text)',
              fontSize: isStaticPreview ? '0.65rem' : '0.78rem',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            <span
              className="rounded-full inline-block shrink-0"
              style={{
                width: isStaticPreview ? '5px' : '6px',
                height: isStaticPreview ? '5px' : '6px',
                background: 'var(--accent)',
              }}
            />
            <span className={cn(isStaticPreview ? "whitespace-nowrap" : "truncate max-w-[120px] sm:max-w-none")}>
              {prayerName}
            </span>
            {countdownText && (
              <span className="font-mono text-[var(--text-secondary)] font-normal ml-0.5">
                • {countdownText}
              </span>
            )}
          </div>

          {/* Sleek Subtle Progress Bar */}
          {!isStaticPreview && prayerProgress > 0 && (
            <div
              className="w-28 sm:w-36 h-1 rounded-full overflow-hidden bg-[var(--surface-2)] mt-0.5"
              style={{ border: '1px solid rgba(212, 175, 55, 0.15)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.round(prayerProgress * 100)}%`,
                  background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DigitalBoldClock;
