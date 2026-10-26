/**
 * Noor Connect — Dedicated Tilawah Audio Player & Sleep Timer Modal
 *
 * Full-screen jewel-styled player featuring:
 * - Now Playing calligraphy & metadata
 * - 1-tap Reciter Drawer (with search)
 * - Ayah scrubber & transport controls
 * - Playback speed pills (0.75×–2×)
 * - Smart Sleep Timer with live countdown
 * - Synchronized live Ayah card with vocalized Arabic & translation
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTilawah, PlaybackSpeed, SleepTimerOption } from '@/contexts/TilawahContext';
import { TILAWAH_RECITERS } from '@/lib/tilawah-data';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Moon,
  Clock,
  BookOpen,
  User,
  Search,
  Check,
  ChevronDown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';

interface TilawahPlayerModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const TilawahPlayerModal: React.FC<TilawahPlayerModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const navigate = useNavigate();
  const {
    isPlayerOpen,
    closePlayer,
    isPlaying,
    isLoading,
    currentSurah,
    currentAyah,
    surahInfo,
    totalAyahs,
    reciter,
    playbackSpeed,
    activeAyahArabic,
    activeAyahTranslation,
    sleepTimerOption,
    sleepRemainingSeconds,
    togglePlay,
    nextAyah,
    prevAyah,
    seekAyah,
    setSpeed,
    setReciter,
    setSleepTimer,
  } = useTilawah();

  const isOpen = propIsOpen !== undefined ? propIsOpen : isPlayerOpen;
  const handleClose = propOnClose || closePlayer;

  // Reciter Selector Drawer state
  const [showReciterDrawer, setShowReciterDrawer] = useState<boolean>(false);
  const [reciterSearch, setReciterSearch] = useState<string>('');

  // Sleep Timer Drawer state
  const [showSleepDrawer, setShowSleepDrawer] = useState<boolean>(false);

  // Filter reciters
  const filteredReciters = useMemo(() => {
    if (!reciterSearch.trim()) return TILAWAH_RECITERS;
    const q = reciterSearch.toLowerCase();
    return TILAWAH_RECITERS.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q) ||
        r.style.toLowerCase().includes(q)
    );
  }, [reciterSearch]);

  // Format remaining sleep timer seconds into mm:ss
  const formattedSleepCountdown = useMemo(() => {
    if (sleepRemainingSeconds === null) return null;
    const mins = Math.floor(sleepRemainingSeconds / 60);
    const secs = sleepRemainingSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [sleepRemainingSeconds]);

  if (!isOpen) return null;

  const handleOpenInReader = () => {
    handleClose();
    navigate(`/quran/surah-${currentSurah}`);
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tilawah Audio Player"
      className="fixed inset-0 flex flex-col justify-end backdrop-blur-md animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg mx-auto rounded-t-[32px] flex flex-col max-h-[92vh] overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-elev)',
          borderTop: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Top Handle & Dismiss Button */}
        <div className="pt-3 px-5 pb-2 flex items-center justify-between shrink-0">
          <div className="w-10 h-1 rounded-full bg-[var(--border)] mx-auto absolute left-1/2 -translate-x-1/2 top-2.5" />
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--accent-text)' }}
            >
              🎧 Noor Tilawah
            </span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            aria-label="Close Tilawah Player"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="px-5 overflow-y-auto space-y-5"
          style={{ paddingBottom: 'calc(28px + env(safe-area-inset-bottom, 0px))' }}
        >
          {/* Now Playing Header Card */}
          <div
            className="p-4 rounded-2xl text-center relative overflow-hidden"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
            }}
          >
            {/* Arabic Surah Calligraphy */}
            <h2
              className="font-arabic font-extrabold text-2xl sm:text-3xl leading-snug mb-1"
              style={{ color: 'var(--accent-text)' }}
            >
              {surahInfo?.name || 'سورة'}
            </h2>

            {/* English Title & Translation */}
            <h3
              className="font-bold text-base sm:text-lg leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {surahInfo?.englishName || `Surah ${currentSurah}`}
            </h3>
            <p
              className="text-xs font-medium mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {surahInfo?.englishNameTranslation} • Ayah {currentAyah} of {totalAyahs}
            </p>

            {/* Reciter Selector Chip */}
            <div className="mt-3 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setShowReciterDrawer(!showReciterDrawer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:border-[var(--accent)]"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                }}
              >
                <User className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                <span className="truncate max-w-[200px]">{reciter.name}</span>
                <ChevronDown className="w-3 h-3 text-[var(--text-secondary)]" />
              </button>
            </div>
          </div>

          {/* Reciter Selector Drawer */}
          {showReciterDrawer && (
            <div
              className="p-3.5 rounded-2xl space-y-2.5 animate-in slide-in-from-top-2 duration-150"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-center gap-2 px-1">
                <Search className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  placeholder="Search 6 curated reciters..."
                  value={reciterSearch}
                  onChange={(e) => setReciterSearch(e.target.value)}
                  className="bg-transparent text-xs w-full outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
                />
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {filteredReciters.map((r) => {
                  const isSelected = r.id === reciter.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        setReciter(r.id);
                        setShowReciterDrawer(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                        border: isSelected
                          ? '1px solid var(--accent)'
                          : '1px solid var(--border)',
                      }}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                          {r.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {r.style}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 shrink-0 text-[var(--accent-text)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ayah Scrubber & Slider */}
          <div className="space-y-1.5 px-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span style={{ color: 'var(--accent-text)' }}>Ayah {currentAyah}</span>
              <span style={{ color: 'var(--text-secondary)' }}>Total: {totalAyahs}</span>
            </div>
            <Slider
              value={[currentAyah]}
              min={1}
              max={totalAyahs}
              step={1}
              onValueChange={([val]) => seekAyah(val)}
              className="w-full cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
          </div>

          {/* Transport Controls (⏮ Prev • ▶/⏸ Jewel • ⏭ Next) */}
          <div className="flex items-center justify-center gap-6 pt-1">
            {/* Prev Ayah */}
            <button
              type="button"
              onClick={prevAyah}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-90 hover:bg-[var(--surface-2)]"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              title="Previous Ayah"
              aria-label="Previous Ayah"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            {/* Play / Pause Large Glowing Jewel Button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={isLoading}
              className="w-16 h-16 rounded-3xl flex items-center justify-center transition-all active:scale-95 shadow-xl hover:scale-105"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--on-accent)',
                boxShadow: '0 8px 24px var(--accent-glow)',
              }}
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 className="w-7 h-7 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </button>

            {/* Next Ayah */}
            <button
              type="button"
              onClick={nextAyah}
              className="w-11 h-11 rounded-2xl flex items-center justify-center transition-transform active:scale-90 hover:bg-[var(--surface-2)]"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
              title="Next Ayah"
              aria-label="Next Ayah"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Playback Speed Pills */}
          <div className="space-y-1.5 text-center">
            <span
              className="text-[11px] font-bold uppercase tracking-wider block"
              style={{ color: 'var(--text-secondary)' }}
            >
              Playback Speed
            </span>
            <div className="flex items-center justify-center gap-1.5">
              {([0.75, 1, 1.25, 1.5, 2] as PlaybackSpeed[]).map((spd) => {
                const isActive = playbackSpeed === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setSpeed(spd)}
                    className="px-3 py-1 rounded-xl text-xs font-bold transition-all"
                    style={{
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--surface)',
                      color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {spd}×
                  </button>
                );
              })}
            </div>
          </div>

          {/* Smart Sleep Timer Section */}
          <div
            className="p-3 rounded-2xl flex items-center justify-between gap-2"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--surface-2)',
                  color: 'var(--accent-text)',
                }}
              >
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Sleep Timer
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  {formattedSleepCountdown ? (
                    <span className="font-bold text-emerald-400">
                      🌙 Fading in {formattedSleepCountdown}
                    </span>
                  ) : sleepTimerOption === 'end-of-surah' ? (
                    <span className="font-bold text-amber-400">🌙 Pauses at end of Surah</span>
                  ) : (
                    'Gentle audio fade-out'
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSleepDrawer(!showSleepDrawer)}
              className="h-8 text-xs font-bold rounded-xl border-[var(--border)] bg-[var(--surface-2)] text-[var(--accent-text)]"
            >
              {sleepTimerOption ? 'Active' : 'Set Timer'}
            </Button>
          </div>

          {/* Sleep Timer Options Drawer */}
          {showSleepDrawer && (
            <div
              className="p-3 rounded-2xl grid grid-cols-3 gap-1.5 animate-in slide-in-from-top-2 duration-150"
              style={{
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
              }}
            >
              {[
                { label: 'Off', val: null },
                { label: '15 Min', val: 15 as const },
                { label: '30 Min', val: 30 as const },
                { label: '45 Min', val: 45 as const },
                { label: '60 Min', val: 60 as const },
                { label: 'End of Surah', val: 'end-of-surah' as const },
              ].map((opt) => {
                const isActive = sleepTimerOption === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setSleepTimer(opt.val as SleepTimerOption);
                      setShowSleepDrawer(false);
                    }}
                    className="py-1.5 px-2 rounded-xl text-xs font-bold transition-all text-center"
                    style={{
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--surface)',
                      color: isActive ? 'var(--on-accent)' : 'var(--text-primary)',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Live Synchronized Ayah Card */}
          <div
            className="p-4 rounded-2xl space-y-2.5"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1.5px solid var(--accent)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div className="flex items-center justify-between">
              <Badge
                className="text-[10px] font-bold px-2 py-0.5 border"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  borderColor: 'var(--border)',
                }}
              >
                Ayah {currentSurah}:{currentAyah}
              </Badge>
              <button
                type="button"
                onClick={handleOpenInReader}
                className="text-xs font-bold text-[var(--accent-text)] hover:underline flex items-center gap-1"
              >
                <span>Open in Mushaf Reader</span>
                <BookOpen className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Vocalized Uthmani Arabic */}
            <p
              dir="rtl"
              className="font-arabic font-bold text-xl sm:text-2xl text-right leading-[2.25] pt-1"
              style={{
                color: 'var(--text-primary)',
                fontFamily: "'Amiri', 'Traditional Arabic', serif",
              }}
            >
              {activeAyahArabic || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
            </p>

            {/* Translation */}
            <p
              className="text-xs sm:text-sm leading-relaxed pt-1 border-t border-[var(--border)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {activeAyahTranslation || 'Loading verified translation...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
