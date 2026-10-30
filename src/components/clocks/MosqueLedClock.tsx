import React, { useMemo } from 'react';
import { type ClockProps } from '@/types/clock';
import { cn } from '@/lib/utils';
import { getPrayerDisplayName } from '@/lib/prayer-utils';

export const MosqueLedClock: React.FC<ClockProps> = ({
  now,
  timeFormat,
  hijriDate,
  nextPrayer,
  isStaticPreview = false,
}) => {
  const is12 = timeFormat === '12h';

  // Digits formatting
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const displayHours = is12
    ? String(hours % 12 || 12).padStart(2, '0')
    : String(hours).padStart(2, '0');
  const displayMinutes = String(minutes).padStart(2, '0');
  const displaySeconds = String(seconds).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  // Compute live countdown string
  const countdownText = useMemo(() => {
    if (isStaticPreview) return 'IN 2h 22m';
    if (!nextPrayer?.targetTime) return 'APPROACHING';

    const diff = nextPrayer.targetTime.getTime() - now.getTime();
    if (diff <= 0) return 'DUE NOW';

    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    if (h > 0) {
      return `IN ${h}h ${m}m ${s}s`;
    }
    return `IN ${m}m ${s}s`;
  }, [now, nextPrayer?.targetTime, isStaticPreview]);

  const prayerName = useMemo(() => {
    return (getPrayerDisplayName(nextPrayer?.name, nextPrayer?.targetTime || now) || 'PRAYER').toUpperCase();
  }, [nextPrayer?.name, nextPrayer?.targetTime, now]);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center select-none w-full",
        isStaticPreview ? "p-0.5" : "pt-2 pb-3 px-2 sm:px-4"
      )}
    >
      {/* ── Outer Recessed Hardware Casing ── */}
      <div
        className={cn(
          "w-full transition-all flex flex-col justify-between select-none",
          isStaticPreview
            ? "max-w-[200px] p-1 rounded-xl shadow-md"
            : "max-w-md p-2 rounded-[22px] shadow-2xl"
        )}
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--border)',
          boxShadow: isStaticPreview
            ? '0 6px 18px rgba(0,0,0,0.45)'
            : '0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        {/* ── Inner Recessed LED Screen ── */}
        <div
          className={cn(
            "w-full relative overflow-hidden flex flex-col justify-between",
            isStaticPreview
              ? "p-1.5 rounded-lg"
              : "p-4 sm:p-5 rounded-[16px]"
          )}
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 4px 14px rgba(0,0,0,0.75)',
          }}
        >
          {/* Diagonal Glass Reflection Overlay */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 50%)',
            }}
            aria-hidden="true"
          />

          {/* ── Top Bar: Hijri Date Centered ── */}
          <div
            className={cn(
              "relative z-10 w-full flex items-center justify-center text-center font-mono font-bold uppercase px-0.5",
              isStaticPreview
                ? "text-[0.66rem] tracking-tight mb-1"
                : "text-[10px] sm:text-xs tracking-widest mb-1 sm:mb-2"
            )}
            style={{ color: 'var(--accent-text)' }}
          >
            <span
              className={cn(
                "whitespace-nowrap text-center",
                isStaticPreview ? "overflow-visible text-clip" : "truncate max-w-full"
              )}
              title={hijriDate}
            >
              {(hijriDate || '')
                .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
                .replace(/al-ola/gi, 'al-ūlā')
                .replace(/al-ōlā/gi, 'al-ūlā')
                .replace(/ō/g, 'ū')}
            </span>
          </div>

          {/* ── Center LED Matrix Display: LED Digits + Glowing AM/PM Badge Directly to Right ── */}
          <div
            className="relative z-10 w-full flex items-center justify-center gap-2 sm:gap-3 my-1 sm:my-2 overflow-hidden"
            style={{ whiteSpace: 'nowrap' }}
          >
            <div
              className="relative grid place-items-center"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                whiteSpace: 'nowrap',
              }}
            >
              {/* Ghost Unlit Segments (88 : 88 : 88) */}
              <div
                className="pointer-events-none select-none font-mono font-bold"
                style={{
                  gridArea: '1 / 1',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: isStaticPreview ? '0.98rem' : 'clamp(1.75rem, 7.5vw, 3.1rem)',
                  letterSpacing: isStaticPreview ? '0.02em' : '0.06em',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  opacity: 0.08,
                  lineHeight: 1.1,
                }}
                aria-hidden="true"
              >
                <span>88</span>
                <span className={cn("inline-block", isStaticPreview ? "mx-[2px]" : "mx-0.5 sm:mx-1")}>:</span>
                <span>88</span>
                <span className={cn("inline-block", isStaticPreview ? "mx-[2px]" : "mx-0.5 sm:mx-1")}>:</span>
                <span>88</span>
              </div>

              {/* Active Illuminated LED Digits */}
              <div
                className="select-none font-mono font-bold"
                style={{
                  gridArea: '1 / 1',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  fontSize: isStaticPreview ? '0.98rem' : 'clamp(1.75rem, 7.5vw, 3.1rem)',
                  letterSpacing: isStaticPreview ? '0.02em' : '0.06em',
                  fontVariantNumeric: 'tabular-nums',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  color: 'var(--accent-text)',
                  textShadow: isStaticPreview ? undefined : '0 0 12px var(--accent-glow)',
                  lineHeight: 1.1,
                }}
              >
                <span>{displayHours}</span>
                <span className={cn("inline-block", isStaticPreview ? "mx-[2px]" : "mx-0.5 sm:mx-1", !isStaticPreview && "animate-pulse")}>:</span>
                <span>{displayMinutes}</span>
                <span className={cn("inline-block", isStaticPreview ? "mx-[2px]" : "mx-0.5 sm:mx-1", !isStaticPreview && "animate-pulse")}>:</span>
                <span style={{ opacity: 0.95 }}>{displaySeconds}</span>
              </div>
            </div>

            {/* AM/PM Badge: Strictly to the right of LED digits (hidden in 24h mode) */}
            {is12 && (
              <span
                className={cn(
                  "rounded font-black shrink-0 select-none uppercase",
                  isStaticPreview ? "px-1 py-[1px] text-[0.55rem]" : "px-2 py-1 text-[9px] sm:text-[10px]"
                )}
                style={{
                  color: 'var(--on-accent)',
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  boxShadow: '0 0 8px var(--accent-glow)',
                  letterSpacing: '0.05em',
                  transform: 'translateY(-2px)',
                }}
              >
                {ampm}
              </span>
            )}
          </div>

          {/* ── Bottom Bar: Divider + Active Dot & Next Prayer + Live Countdown ── */}
          <div
            className={cn(
              "relative z-10 w-full flex items-center justify-between font-mono font-bold",
              isStaticPreview
                ? "text-[0.65rem] mt-1 pt-1 tracking-normal"
                : "text-[10px] sm:text-xs mt-2 pt-2 tracking-wider"
            )}
            style={{ borderTop: '1px solid var(--border)' }}
          >
            {/* Active / Next Prayer with glowing dot */}
            <div
              className={cn(
                "uppercase flex items-center shrink-0",
                isStaticPreview ? "gap-1" : "gap-1.5 truncate max-w-[55%]"
              )}
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                style={{
                  background: 'var(--accent)',
                  boxShadow: '0 0 6px var(--accent-glow)',
                }}
              />
              <span className={cn(isStaticPreview ? "whitespace-nowrap" : "truncate")}>
                {prayerName}
              </span>
            </div>

            {/* Live Countdown Readout */}
            <span
              className={cn(
                "font-black shrink-0 text-right whitespace-nowrap",
                isStaticPreview ? "text-[0.65rem] ml-1" : "ml-2"
              )}
              style={{
                color: 'var(--accent-text)',
                textShadow: isStaticPreview ? undefined : '0 0 8px var(--accent-glow)',
              }}
            >
              {countdownText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MosqueLedClock;
