import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ThemePicker } from '@/components/themes/ThemePicker';

export const SettingsThemePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-32"
      style={{ paddingBottom: '120px' }}
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)] font-display-signature">App Theme</h1>
          <p className="text-xs text-[var(--text-secondary)]">Choose your full-app color theme</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-3 sm:px-4 py-4 space-y-4">
        <ThemePicker />
      </div>
    </div>
  );
};

export default SettingsThemePage;
