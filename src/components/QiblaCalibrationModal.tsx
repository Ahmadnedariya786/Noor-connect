import { createPortal } from 'react-dom';
import { Compass, X, CheckCircle2, AlertTriangle, AlertCircle, RotateCw } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface QiblaCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  compassSignal: number | null;
  isCompassActive?: boolean;
  isSensorInactive?: boolean;
}

export const QiblaCalibrationModal = ({
  isOpen,
  onClose,
  compassSignal,
  isCompassActive = true,
  isSensorInactive = false,
}: QiblaCalibrationModalProps) => {
  useBodyScrollLock(isOpen);

  if (!isOpen || typeof document === 'undefined') return null;

  const isLive = isCompassActive && compassSignal !== null && !isSensorInactive;
  const isPaused = !isCompassActive && !isSensorInactive;
  const signal = compassSignal ?? 0;
  const isHigh = isLive && signal >= 80;
  const isMedium = isLive && signal >= 50 && signal < 80;

  // Determine single-line status badge
  let badgeLabel = 'Standby';
  let badgeColor = '#f59e0b';
  let badgeBg = 'rgba(245, 158, 11, 0.15)';
  let valueText = 'Standby';

  if (isSensorInactive) {
    badgeLabel = 'No Sensor';
    badgeColor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.15)';
    valueText = 'Unavailable';
  } else if (isPaused) {
    badgeLabel = 'Standby';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
    valueText = 'Standby';
  } else if (isLive) {
    valueText = `${signal}%`;
    if (isHigh) {
      badgeLabel = 'High Accuracy';
      badgeColor = 'var(--accent-text)';
      badgeBg = 'var(--accent-soft)';
    } else if (isMedium) {
      badgeLabel = 'Moderate';
      badgeColor = '#f59e0b';
      badgeBg = 'rgba(245, 158, 11, 0.15)';
    } else {
      badgeLabel = 'Calibrate Now';
      badgeColor = '#ef4444';
      badgeBg = 'rgba(239, 68, 68, 0.15)';
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calibration-title"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl relative"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
          maxHeight: '90vh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[var(--accent)] border border-[var(--border)]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 id="calibration-title" className="text-sm font-bold text-[var(--text-primary)]">
                Compass Calibration
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)]">
                Magnetometer precision guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Signal Status Pill (1-line, no stacked badge) */}
        <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Sensor Accuracy
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: badgeColor,
                  boxShadow: isHigh ? '0 0 8px var(--accent)' : 'none',
                }}
              />
              <span className="text-sm font-black font-mono">
                {valueText}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full border text-[11px] whitespace-nowrap inline-block"
              style={{
                backgroundColor: badgeBg,
                color: badgeColor,
                borderColor: badgeColor,
              }}
            >
              {badgeLabel}
            </span>
          </div>
        </div>

        {/* Animated Figure-8 Graphic (Clean Vertical Flex Stack with Zero Overlap) */}
        <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex flex-col items-center justify-center gap-2">
            <svg
              width="100"
              height="46"
              viewBox="0 0 100 46"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="overflow-visible"
            >
              {/* Figure 8 infinity loop track */}
              <path
                d="M 25,23 C 25,11 37,11 50,23 C 63,35 75,35 75,23 C 75,11 63,11 50,23 C 37,35 25,35 25,23 Z"
                stroke="var(--border)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 25,23 C 25,11 37,11 50,23 C 63,35 75,35 75,23 C 63,11 50,23 37,35 25,35 25,23 Z"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="8 6"
                fill="none"
              />
            </svg>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-text)]">
              <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Figure-8 Motion</span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
            Wave device in a slow <strong>horizontal figure-8 motion (∞)</strong> for 5–8 seconds to recalibrate the magnetometer sensor.
          </p>
        </div>

        {/* Accuracy Level Explanations */}
        <div className="space-y-2 text-xs leading-relaxed text-[var(--text-secondary)]">
          <div className="p-2.5 rounded-xl border space-y-1 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="font-bold text-[var(--text-primary)]">≥ 80% — High Accuracy</span>
            </div>
            <p className="text-[11px] pl-5.5 text-[var(--text-secondary)]">
              Minimal electromagnetic interference; reading is scientifically reliable.
            </p>
          </div>

          <div className="p-2.5 rounded-xl border space-y-1 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-[var(--text-primary)]">50%–79% — Nearby Interference</span>
            </div>
            <p className="text-[11px] pl-5.5 text-[var(--text-secondary)]">
              Metal tables, magnetic phone cases, or laptops nearby are warping field lines.
            </p>
          </div>

          <div className="p-2.5 rounded-xl border space-y-1 bg-[var(--surface-2)] border-[var(--border)]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
              <span className="font-bold text-[var(--text-primary)]">&lt; 50% — Recalibration Required</span>
            </div>
            <p className="text-[11px] pl-5.5 text-[var(--text-secondary)]">
              Perform the figure-8 motion or step into an open area away from concrete rebar.
            </p>
          </div>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent)',
          }}
        >
          Done
        </button>
      </div>
    </div>,
    document.body
  );
};
