import { createPortal } from 'react-dom';
import { Compass, X, CheckCircle2, AlertTriangle, AlertCircle, RotateCw } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface QiblaCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  compassSignal: number | null;
}

export const QiblaCalibrationModal = ({
  isOpen,
  onClose,
  compassSignal,
}: QiblaCalibrationModalProps) => {
  useBodyScrollLock(isOpen);

  if (!isOpen || typeof document === 'undefined') return null;

  const signal = compassSignal ?? 0;
  const isHigh = signal >= 80;
  const isMedium = signal >= 50 && signal < 80;

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

        {/* Current Signal Status Pill */}
        <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
              Sensor Accuracy
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    compassSignal === null
                      ? 'var(--text-secondary)'
                      : isHigh
                      ? 'var(--accent)'
                      : isMedium
                      ? '#f59e0b'
                      : '#ef4444',
                  boxShadow:
                    compassSignal !== null && isHigh
                      ? '0 0 8px var(--accent)'
                      : 'none',
                }}
              />
              <span className="text-sm font-black font-mono">
                {compassSignal !== null ? `${compassSignal}%` : 'Offline / Standby'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full border text-[11px]"
              style={{
                backgroundColor: isHigh
                  ? 'var(--accent-soft)'
                  : isMedium
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(239, 68, 68, 0.15)',
                color: isHigh
                  ? 'var(--accent-text)'
                  : isMedium
                  ? '#f59e0b'
                  : '#ef4444',
                borderColor: isHigh
                  ? 'var(--accent)'
                  : isMedium
                  ? '#f59e0b'
                  : '#ef4444',
              }}
            >
              {compassSignal === null
                ? 'No Magnetometer'
                : isHigh
                ? 'High Accuracy'
                : isMedium
                ? 'Moderate Interference'
                : 'Calibrate Now'}
            </span>
          </div>
        </div>

        {/* Animated Figure-8 Graphic */}
        <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] flex flex-col items-center justify-center text-center space-y-2">
          <div className="relative w-28 h-14 flex items-center justify-center">
            <svg
              width="100"
              height="50"
              viewBox="0 0 100 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="overflow-visible"
            >
              {/* Figure 8 infinity loop track */}
              <path
                d="M 25,25 C 25,12 37,12 50,25 C 63,38 75,38 75,25 C 75,12 63,12 50,25 C 37,38 25,38 25,25 Z"
                stroke="var(--border)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 25,25 C 25,12 37,12 50,25 C 63,38 75,38 75,25 C 63,12 50,25 37,38 25,38 25,25 Z"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="8 6"
                fill="none"
              />
            </svg>
            <div className="absolute text-[11px] font-bold text-[var(--accent-text)] flex items-center gap-1">
              <RotateCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Figure-8</span>
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
