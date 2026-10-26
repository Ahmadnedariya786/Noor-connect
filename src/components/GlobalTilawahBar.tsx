/**
 * Noor Connect — Global Persistent Tilawah Mini-Player Bar
 *
 * Renders a sleek 42px persistent top bar whenever Quran recitation is active.
 * Follows the user across all app routes without interrupting playback.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTilawah } from '@/contexts/TilawahContext';
import { BookOpen, Headphones, Play, Pause, X, Loader2 } from 'lucide-react';

export const GlobalTilawahBar: React.FC = () => {
  const navigate = useNavigate();
  const {
    isBarVisible,
    isPlaying,
    isLoading,
    currentSurah,
    currentAyah,
    surahInfo,
    reciter,
    progressPercent,
    togglePlay,
    openPlayer,
    dismissBar,
  } = useTilawah();

  if (!isBarVisible) return null;

  const handleOpenReader = () => {
    navigate(`/quran/surah-${currentSurah}`, { replace: false });
  };

  return (
    <aside
      role="region"
      aria-label="Quran Tilawah Mini Player"
      className="sticky top-0 z-40 w-full print:hidden select-none"
      style={{
        height: '42px',
        backgroundColor: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.28)',
      }}
    >
      <div className="max-w-4xl mx-auto h-full px-3 flex items-center justify-between gap-2">
        {/* Left: Pulsing Dot + Surah & Ayah Reference + Reciter Short Name */}
        <div
          onClick={openPlayer}
          role="button"
          tabIndex={0}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer group"
          title="Open Tilawah Player"
        >
          {/* Pulsing Accent Dot */}
          <div className="relative flex items-center justify-center shrink-0 w-3 h-3">
            {isPlaying && (
              <span
                className="absolute w-3 h-3 rounded-full animate-ping opacity-75"
                style={{ backgroundColor: 'var(--accent)' }}
              />
            )}
            <span
              className="relative w-2 h-2 rounded-full"
              style={{
                backgroundColor: isPlaying ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            />
          </div>

          {/* Reference & Reciter */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            <span
              className="font-bold text-xs group-hover:text-[var(--accent-text)] transition-colors truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {surahInfo?.englishName || `Surah ${currentSurah}`} {currentSurah}:{currentAyah}
            </span>
            <span
              className="text-[11px] font-medium shrink-0 truncate opacity-75"
              style={{ color: 'var(--text-secondary)' }}
            >
              • {reciter.shortName}
            </span>
          </div>
        </div>

        {/* Right: 4 Compact Icon Buttons (32px × 32px each) */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. Open Mushaf Reader */}
          <button
            type="button"
            onClick={handleOpenReader}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface)] text-[var(--accent-text)]"
            title="Read in Mushaf"
            aria-label="Read in Mushaf"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* 2. Full Player & Sleep Timer */}
          <button
            type="button"
            onClick={openPlayer}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface)] text-[var(--text-primary)]"
            title="Tilawah Audio Player & Sleep Timer"
            aria-label="Tilawah Audio Player & Sleep Timer"
          >
            <Headphones className="w-4 h-4" />
          </button>

          {/* 3. Play / Pause Toggle */}
          <button
            type="button"
            onClick={togglePlay}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform active:scale-95 text-[var(--on-accent)] shadow-sm"
            style={{
              backgroundColor: 'var(--accent)',
            }}
            title={isPlaying ? 'Pause Recitation' : 'Play Recitation'}
            aria-label={isPlaying ? 'Pause Recitation' : 'Play Recitation'}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* 4. Dismiss Mini-Player */}
          <button
            type="button"
            onClick={dismissBar}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-400"
            title="Close Tilawah Player"
            aria-label="Close Tilawah Player"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Edge: 2px Progress Hairline */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, progressPercent))}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>
    </aside>
  );
};
