import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Clock, X, Check } from 'lucide-react';

interface MakruhQazaConfirmationModalProps {
  isOpen: boolean;
  makruhName: string;
  makruhEndTime: string;
  onConfirm: () => void;
  onClose: () => void;
}

export const MakruhQazaConfirmationModal: React.FC<MakruhQazaConfirmationModalProps> = ({
  isOpen,
  makruhName,
  makruhEndTime,
  onConfirm,
  onClose,
}) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="makruh-modal-title"
      className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'none',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl border p-4 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-3.5 select-none"
        style={{
          background: 'var(--surface, #121820)',
          borderColor: 'var(--warning, #f59e0b)',
          color: 'var(--text-primary, #ffffff)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(245, 158, 11, 0.25)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                background: 'rgba(245, 158, 11, 0.15)',
                borderColor: 'var(--warning, #f59e0b)',
                color: 'var(--warning, #f59e0b)',
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3
                id="makruh-modal-title"
                className="font-bold text-sm leading-tight flex items-center gap-1.5"
                style={{ color: 'var(--warning, #f59e0b)' }}
              >
                <span>⏳ Makruh Waqt Active</span>
              </h3>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium">
                Islamic Fiqh Timing Guard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center border text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer shrink-0"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Message */}
        <div
          className="p-3 rounded-xl border text-xs leading-relaxed space-y-1.5"
          style={{
            background: 'var(--surface-2, #18202c)',
            borderColor: 'var(--border, rgba(255, 255, 255, 0.1))',
          }}
        >
          <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--warning, #f59e0b)' }}>
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{makruhName} ends at {makruhEndTime}</span>
          </div>
          <p className="text-[11px] text-[var(--text-primary)] font-medium">
            Offering Qaza during Makruh Waqt is prohibited in authentic Islamic Fiqh — did you pray this Qaza earlier?
          </p>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-2.5 rounded-xl font-bold text-xs border text-center transition-all cursor-pointer active:scale-95 truncate"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            Wait until {makruhEndTime}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1 text-center transition-all cursor-pointer active:scale-95 truncate shadow-sm"
            style={{
              background: 'var(--accent, #D4AF37)',
              color: 'var(--on-accent, #000000)',
            }}
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Yes, prayed earlier</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
