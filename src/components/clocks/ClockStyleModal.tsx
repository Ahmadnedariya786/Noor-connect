import React from 'react';
import { X } from 'lucide-react';
import { ClockStylePicker } from './ClockStylePicker';

interface ClockStyleModalProps {
  open: boolean;
  onClose: () => void;
}

export const ClockStyleModal: React.FC<ClockStyleModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] bg-card border border-border/70 rounded-[28px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card/60 backdrop-blur-md">
          <div>
            <h3 className="text-base font-bold text-foreground">Clock Style</h3>
            <p className="text-xs text-muted-foreground">Select home dashboard clock</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain">
          <ClockStylePicker onSelected={onClose} />
        </div>
      </div>
    </div>
  );
};

export default ClockStyleModal;
