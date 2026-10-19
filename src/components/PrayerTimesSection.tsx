import React, { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sunset, Bell } from 'lucide-react';
import { getPrayerDisplayName, isMatchingPrayer } from '@/lib/prayer-utils';

export interface PrayerItem {
  name: string;
  originalName?: string;
  time: string;
  date?: Date;
  isActive?: boolean;
  isUpcoming?: boolean;
  isCompleted?: boolean;
  onCheckIn?: () => void;
}

export interface PrayerTimesSectionProps {
  nextPrayer: {
    name: string;
    time: string;
    targetTime?: Date | null;
    progress: number;
  };
  previousPrayer?: {
    name: string;
    time: string;
    date?: Date;
  } | null;
  prayers: PrayerItem[];
  suhoorIftaar?: {
    suhoorTime: string;
    suhoorLabel: string;
    iftaarTime: string;
    iftaarLabel: string;
  };
  onLocationClick?: () => void;
  locationLabel?: string;
}

/**
 * Custom SVG icons for each waqt matching Part 3 requirements:
 * - Fajr: Dawn / Horizon sun
 * - Sunrise: Rising sun with arrow/rays
 * - Dhuhr / Jummah: Full bright sun / zenith clock
 * - Asr: Afternoon sun / partial cloud-sun
 * - Maghrib: Sunset horizon / dome icon
 * - Isha: Crescent moon & star
 */
function WaqtIcon({ name, isActive }: { name: string; isActive?: boolean }) {
  const color = isActive ? 'var(--accent-text)' : 'var(--text-secondary)';
  const lower = name.toLowerCase();

  if (lower === 'fajr') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-colors duration-200"
        aria-hidden="true"
      >
        <path d="M3 18h18" />
        <path d="M12 9v5" />
        <path d="M16 14a4 4 0 0 0-8 0" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="m17.66 12.34 1.41-1.41" />
        <path d="M12 4v2" />
      </svg>
    );
  }

  if (lower === 'sunrise') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-colors duration-200"
        aria-hidden="true"
      >
        <path d="M12 2v5" />
        <path d="m9 4.5 3-2.5 3 2.5" />
        <path d="M2 18h20" />
        <path d="M16 18a4 4 0 0 0-8 0" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="m17.66 12.34 1.41-1.41" />
      </svg>
    );
  }

  if (lower === 'dhuhr' || lower === 'jummah') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-colors duration-200"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    );
  }

  if (lower === 'asr') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-colors duration-200"
        aria-hidden="true"
      >
        <path d="M12 2v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="M20 12h2" />
        <path d="m19.07 4.93-1.41 1.41" />
        <path d="M15.95 8.05a5 5 0 0 0-7.07 1.07" />
        <path d="M17.5 19H9a5 5 0 0 1-5-5 5 5 0 0 1 4.5-4.95A6 6 0 0 1 18 10a4 4 0 0 1 3.5 4 4 4 0 0 1-4 5z" />
      </svg>
    );
  }

  if (lower === 'maghrib') {
    return (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 transition-colors duration-200"
        aria-hidden="true"
      >
        <path d="M12 10v4" />
        <path d="m9 12 3 2 3-2" />
        <path d="m4.93 10.93 1.41 1.41" />
        <path d="M2 18h20" />
        <path d="m19.07 10.93-1.41 1.41" />
        <path d="M16 18a4 4 0 0 0-8 0" />
      </svg>
    );
  }

  // Isha
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 transition-colors duration-200"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      <path d="M19 3v4M17 5h4" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Subtle Mosque Silhouette Vector background art for Top Hero Card (Part 1.2).
 * Tints dynamically to var(--accent) across all 5 dark themes at 0.12 opacity.
 */
function MosqueSilhouette() {
  return (
    <div
      className="absolute bottom-0 right-0 pointer-events-none select-none overflow-hidden"
      style={{
        width: '180px',
        height: '110px',
        opacity: 0.12,
        color: 'var(--accent)',
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 240 140"
        fill="currentColor"
        className="w-full h-full object-contain object-bottom"
        preserveAspectRatio="xMaxYMax meet"
      >
        {/* Left Minaret */}
        <path d="M22 140V50h2V44h-2V30l4-14 4 14v14h-2v6h2v90h-8z" />
        <path d="M18 78h16v3H18zm2-30h12v3H20z" />
        <circle cx="26" cy="12" r="2.5" />
        <path d="M26 14v-5" stroke="currentColor" strokeWidth="1" />

        {/* Small Left Dome */}
        <path d="M50 140V96c0-14 12-24 24-24s24 10 24 24v44H50z" />
        <path d="M74 72V64" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="74" cy="62" r="1.5" />

        {/* Grand Central Dome */}
        <path d="M88 140V86c0-26 22-44 42-44s42 18 42 44v54H88z" />
        <path d="M130 42V30" stroke="currentColor" strokeWidth="2" />
        <circle cx="130" cy="27" r="3" />
        <path d="M132 25a3 3 0 1 0 0 4 2.5 2.5 0 0 1 0-4z" />

        {/* Small Right Dome */}
        <path d="M162 140V96c0-14 12-24 24-24s24 10 24 24v44h-48z" />
        <path d="M186 72V64" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="186" cy="62" r="1.5" />

        {/* Right Minaret */}
        <path d="M214 140V50h2V44h-2V30l4-14 4 14v14h-2v6h2v90h-8z" />
        <path d="M210 78h16v3h-16zm2-30h12v3h-12z" />
        <circle cx="218" cy="12" r="2.5" />
        <path d="M218 14v-5" stroke="currentColor" strokeWidth="1" />

        {/* Base Arcade */}
        <path d="M0 140h240v-10H0z" />
        <path d="M120 140v-16c0-6 4-10 10-10s10 4 10 10v16h-20z" opacity="0.6" />
        <path d="M64 140v-12c0-5 3-8 8-8s8 3 8 8v12h-16z" opacity="0.5" />
        <path d="M178 140v-12c0-5 3-8 8-8s8 3 8 8v12h-16z" opacity="0.5" />
      </svg>
    </div>
  );
}

/**
 * Formats countdown string from target Date object cleanly with no jitter.
 */
function useCountdownText(targetTime?: Date | null): string {
  const [text, setText] = useState<string>(() => {
    if (!targetTime) return 'In --';
    const diff = targetTime.getTime() - Date.now();
    if (diff <= 0) return 'due now';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return h > 0 ? `In ${h}h ${m}m` : `In ${m}m`;
  });

  useEffect(() => {
    if (!targetTime) {
      setText('In --');
      return;
    }

    const update = () => {
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) {
        setText('due now');
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setText(h > 0 ? `In ${h}h ${m}m` : `In ${m}m`);
    };

    update();
    const timerId = setInterval(update, 5000);
    return () => clearInterval(timerId);
  }, [targetTime]);

  return text;
}

export const PrayerTimesSectionComponent: React.FC<PrayerTimesSectionProps> = ({
  nextPrayer,
  previousPrayer,
  prayers,
  suhoorIftaar,
  onLocationClick,
  locationLabel,
}) => {
  const navigate = useNavigate();

  // Notification status check for bell styling
  const [notificationsEnabled] = useState(() => {
    return localStorage.getItem('prayer-notifications-enabled') !== 'false';
  });

  const countdownText = useCountdownText(nextPrayer.targetTime);

  // Resolved Display Name for Next Prayer (ensures Friday Dhuhr is "Jummah")
  const resolvedNextDisplayName = useMemo(() => {
    return getPrayerDisplayName(nextPrayer.name, nextPrayer.targetTime || new Date());
  }, [nextPrayer.name, nextPrayer.targetTime]);

  // Match prayer time with the floating prayer list row to guarantee 100% AM/PM consistency
  const matchingPrayer = useMemo(() => {
    return prayers.find(
      (p) =>
        isMatchingPrayer(p.name, nextPrayer.name) ||
        isMatchingPrayer(p.originalName, nextPrayer.name) ||
        isMatchingPrayer(getPrayerDisplayName(p.name, p.date), resolvedNextDisplayName)
    );
  }, [prayers, nextPrayer.name, resolvedNextDisplayName]);

  const heroDisplayTime = matchingPrayer?.time || nextPrayer.time || '--:--';

  // Dynamic progress clamping between 5% and 100%
  const progressPercent = useMemo(() => {
    const raw = nextPrayer.progress > 1 ? nextPrayer.progress : nextPrayer.progress * 100;
    if (isNaN(raw) || raw <= 0) return 5;
    return Math.min(100, Math.max(5, Math.round(raw)));
  }, [nextPrayer.progress]);

  // Derive Suhoor & Iftaar data strictly from calculation outputs per Guard 1
  const fajrPrayer = useMemo(() => {
    return prayers.find(p => (p.originalName || p.name).toLowerCase() === 'fajr');
  }, [prayers]);

  const maghribPrayer = useMemo(() => {
    return prayers.find(p => (p.originalName || p.name).toLowerCase() === 'maghrib');
  }, [prayers]);

  const suhoorTime = suhoorIftaar?.suhoorTime || fajrPrayer?.time || '--:--';
  const suhoorLabel = 'Suhoor';
  const iftaarTime = suhoorIftaar?.iftaarTime || maghribPrayer?.time || '--:--';
  const iftaarLabel = 'Iftaar';

  // Subtitle next to or below progress bar
  const remainingSubtitle = useMemo(() => {
    if (countdownText === 'due now') return 'Time for prayer';
    if (countdownText.startsWith('In ')) return `${countdownText.slice(3)} remaining`;
    return `${countdownText} remaining`;
  }, [countdownText]);

  return (
    <div className="w-full flex flex-col">
      {/* ── Section Header with Change City ── */}
      <div className="flex items-center justify-between px-1 mb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            Prayer Times
          </h2>
          <div
            className="w-6 h-[3px] rounded-full mt-1.5"
            style={{ background: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
          />
        </div>
        {onLocationClick && (
          <button
            type="button"
            onClick={onLocationClick}
            className="text-xs font-semibold uppercase tracking-widest transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            {locationLabel ? 'Change City' : 'Set City'}
          </button>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* PART 1: TOP HERO CARD (MOSQUE SILHOUETTE + PROGRESS BAR)    */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div
        className="w-full select-none"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          padding: '18px 20px',
          background:
            'radial-gradient(circle at 100% 0%, var(--accent-soft) 0%, transparent 60%), linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%)',
          border: '1px solid var(--border)',
          boxShadow:
            '0 10px 30px -10px rgba(0, 0, 0, 0.45), 0 0 20px var(--accent-glow), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        {/* Subtle Mosque Silhouette Vector background art */}
        <MosqueSilhouette />

        {/* Two-Column Flex Header (Zero Overlap) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left Column */}
          <div className="flex flex-col min-w-0">
            <span
              className="font-serif capitalize tracking-wide text-sm sm:text-base leading-none mb-1"
              style={{
                color: 'var(--accent-text)',
                fontWeight: 600,
              }}
            >
              {resolvedNextDisplayName}
            </span>
            <span
              className="tracking-tight tabular-nums"
              style={{
                color: 'var(--text-primary)',
                fontSize: '2rem',
                lineHeight: 1.1,
                fontWeight: 700,
              }}
            >
              {heroDisplayTime}
            </span>
          </div>

          {/* Right Column (Right-Aligned) */}
          <div className="flex flex-col items-end shrink-0 text-right">
            <span
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: 'var(--on-accent)',
                fontWeight: 700,
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: '999px',
                boxShadow: '0 2px 10px var(--accent-glow)',
                letterSpacing: '0.06em',
                lineHeight: 1.2,
                display: 'inline-block',
              }}
            >
              NEXT
            </span>
            <span
              className="tabular-nums mt-1"
              style={{
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {countdownText}
            </span>
          </div>
        </div>

        {/* Elapsed/Remaining Progress Bar (Bottom of Hero Card) */}
        <div
          style={{
            marginTop: '14px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Progress bar track */}
          <div
            style={{
              height: '6px',
              borderRadius: '999px',
              background: 'var(--surface-2)',
              overflow: 'hidden',
              width: '100%',
            }}
          >
            {/* Inner fill bar */}
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                borderRadius: '999px',
              }}
            />
          </div>

          {/* Secondary remaining timer / end-time subtitle below progress bar */}
          <div
            className="flex items-center justify-between mt-2 px-0.5"
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.75rem',
            }}
          >
            <span>
              {previousPrayer?.name ? `After ${previousPrayer.name}` : `Starts at ${nextPrayer.time}`}
            </span>
            <span>{remainingSubtitle}</span>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* PART 2: SUHOOR & IFTAAR / SUNRISE-SUNSET GLASS PILL         */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div
        className="w-full flex items-center justify-around gap-2 select-none"
        style={{
          marginTop: '12px',
          padding: '10px 16px',
          borderRadius: '999px',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Left Item: Suhoor */}
        <div
          className="text-[0.82rem] min-[390px]:text-[0.85rem]"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Moon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-text)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Suhoor
          </span>
          <span
            className="font-semibold tabular-nums shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {suhoorTime}
          </span>
        </div>

        {/* Center Divider: 1px vertical divider */}
        <div
          className="w-px shrink-0"
          style={{
            height: '16px',
            background: 'var(--border)',
          }}
        />

        {/* Right Item: Iftaar */}
        <div
          className="text-[0.82rem] min-[390px]:text-[0.85rem]"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Sunset className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-text)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>
            Iftaar
          </span>
          <span
            className="font-semibold tabular-nums shrink-0"
            style={{ color: 'var(--text-primary)' }}
          >
            {iftaarTime}
          </span>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* PART 3: FLOATING PRAYER LIST CARDS WITH GLOWING ACTIVE STATE */}
      {/* ═════════════════════════════════════════════════════════════ */}
      <div
        className="w-full flex flex-col select-none"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '14px',
        }}
      >
        {prayers.map((prayer) => {
          const rawName = prayer.originalName || prayer.name;
          const displayName = getPrayerDisplayName(prayer.name, prayer.date);
          const isRowActive = Boolean(
            prayer.isActive ||
            isMatchingPrayer(prayer.name, nextPrayer.name) ||
            isMatchingPrayer(prayer.originalName, nextPrayer.name) ||
            isMatchingPrayer(displayName, nextPrayer.name) ||
            isMatchingPrayer(displayName, resolvedNextDisplayName)
          );

          return (
            <div
              key={rawName}
              className="flex items-center justify-between transition-all duration-200"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                padding: '13px 16px',
                borderRadius: '14px',
                background: isRowActive
                  ? 'linear-gradient(90deg, var(--accent-soft), var(--surface))'
                  : 'var(--surface)',
                border: isRowActive ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                boxShadow: isRowActive ? '0 0 16px var(--accent-glow)' : 'none',
              }}
            >
              {/* Row Left Side: Time-of-Day Icon + Prayer Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  minWidth: 0,
                }}
              >
                <WaqtIcon name={rawName} isActive={isRowActive} />
                <span
                  className="truncate"
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: isRowActive ? 700 : 600,
                    fontSize: '1rem',
                  }}
                >
                  {displayName}
                </span>
              </div>

              {/* Row Right Side: Formatted Time + Notification Bell Button */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: isRowActive ? 'var(--accent-text)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '0.95rem',
                  }}
                >
                  {prayer.time}
                </span>

                {/* Per-Prayer Notification Bell Button: wires to Prayer Notifications settings per Guard 2 */}
                <button
                  type="button"
                  aria-label={`Notification settings for ${displayName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/settings/notifications');
                  }}
                  className="p-1.5 rounded-full hover:bg-[var(--surface-2)] active:scale-95 transition-all"
                  style={{
                    color: isRowActive
                      ? 'var(--accent)'
                      : notificationsEnabled && rawName !== 'Sunrise'
                      ? 'var(--accent)'
                      : 'var(--text-secondary)',
                    opacity: isRowActive || (notificationsEnabled && rawName !== 'Sunrise') ? 1 : 0.5,
                  }}
                >
                  <Bell className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const PrayerTimesSection = memo(PrayerTimesSectionComponent);
export default PrayerTimesSection;
