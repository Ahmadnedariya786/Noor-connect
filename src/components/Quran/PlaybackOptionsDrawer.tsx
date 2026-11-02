/**
 * Noor Connect — Advanced Tilawah Playback Options Drawer
 *
 * Signature recitation controls replicating eQuran:
 * - 45+ Reciter Switcher
 * - Playback Speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
 * - Ayah Delay: 0s, 1s, 2s, 3s, 5s, Match Ayah Length
 * - Sleep Timer: Off, 15m, 30m, 45m, 60m, End of Surah
 * - Interval Range Looping (Start Surah:Ayah, End Surah:Ayah, Interval repeats, Ayah repeats)
 * - Audio Download triggers
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Volume2,
  Clock,
  Repeat,
  Download,
  Gauge,
  Sliders,
  ChevronRight,
  Minus,
  Plus,
  Play,
  Loader2,
  Check,
} from 'lucide-react';
import { useTilawah, type PlaybackSpeed, type SleepTimerOption, type AyahDelayOption } from '@/contexts/TilawahContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { ReciterPickerModal } from '@/components/Quran/ReciterPickerModal';
import { quranService } from '@/lib/quran-service';
import { cacheAyahAudio, cacheSurahAudio } from '@/lib/offline-audio';

interface PlaybackOptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSurahId?: number;
  activeAyahNumber?: number;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const DELAY_OPTIONS: { label: string; value: AyahDelayOption }[] = [
  { label: 'No delay', value: 0 },
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: 'Match Ayah', value: 'match' },
];

const SLEEP_OPTIONS: { label: string; value: SleepTimerOption }[] = [
  { label: 'Off', value: null },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '45m', value: 45 },
  { label: '60m', value: 60 },
  { label: 'End Surah', value: 'end-of-surah' },
];

export const PlaybackOptionsDrawer: React.FC<PlaybackOptionsDrawerProps> = ({
  isOpen,
  onClose,
  activeSurahId,
  activeAyahNumber,
}) => {
  useBodyScrollLock(isOpen);
  const {
    reciter,
    setReciter,
    playbackSpeed,
    setSpeed,
    ayahDelay,
    setAyahDelay,
    sleepTimerOption,
    setSleepTimer,
    sleepRemainingSeconds,
    intervalRange,
    startIntervalRange,
    stopIntervalRange,
    isPlaying,
    currentSurah,
    currentAyah,
    totalAyahs,
  } = useTilawah();

  // Sync active download targets with current reader view (avoiding stale background session surah)
  const effectiveSurah =
    isPlaying && currentSurah > 0 ? currentSurah : activeSurahId || currentSurah || 1;
  const effectiveAyah =
    isPlaying && currentAyah > 0 ? currentAyah : activeAyahNumber || currentAyah || 1;

  const [isReciterModalOpen, setIsReciterModalOpen] = useState(false);
  const [showIntervalForm, setShowIntervalForm] = useState(intervalRange.isActive);

  // Download state
  const [isSavingAyah, setIsSavingAyah] = useState(false);
  const [isAyahSaved, setIsAyahSaved] = useState(false);
  const [surahProgress, setSurahProgress] = useState<number | null>(null);
  const [isSurahSaved, setIsSurahSaved] = useState(false);

  const handleDownloadAyahClick = async () => {
    if (isSavingAyah) return;
    setIsSavingAyah(true);
    try {
      await cacheAyahAudio(reciter.everyAyahDir, effectiveSurah, effectiveAyah, reciter.id);
      setIsAyahSaved(true);
      setTimeout(() => setIsAyahSaved(false), 3500);
    } catch (e) {
      console.warn('Ayah audio cache error:', e);
    } finally {
      setIsSavingAyah(false);
    }
  };

  const handleDownloadSurahClick = async () => {
    if (surahProgress !== null) return;
    setSurahProgress(0);
    try {
      const sInfo = quranService.getSurahInfo(effectiveSurah);
      const ayahs = sInfo?.numberOfAyahs || 7;
      await cacheSurahAudio(
        reciter.everyAyahDir,
        effectiveSurah,
        ayahs,
        reciter.id,
        (_done, _total, pct) => setSurahProgress(pct)
      );
      setIsSurahSaved(true);
      setTimeout(() => setIsSurahSaved(false), 4000);
    } catch (e) {
      console.warn('Surah audio cache error:', e);
    } finally {
      setSurahProgress(null);
    }
  };

  // Interval local form state
  const [intStartSurah, setIntStartSurah] = useState(intervalRange.startSurah || effectiveSurah);
  const [intStartAyah, setIntStartAyah] = useState(intervalRange.startAyah || effectiveAyah);
  const [intEndSurah, setIntEndSurah] = useState(intervalRange.endSurah || effectiveSurah);
  const [intEndAyah, setIntEndAyah] = useState(
    intervalRange.endAyah || Math.min(totalAyahs, effectiveAyah + 4)
  );
  const [intRepeatInterval, setIntRepeatInterval] = useState<number | 'infinite'>(
    intervalRange.repeatInterval || 1
  );
  const [intRepeatEachAyah, setIntRepeatEachAyah] = useState<number>(
    intervalRange.repeatEachAyah || 1
  );

  const startSurahInfo = quranService.getSurahInfo(intStartSurah);
  const endSurahInfo = quranService.getSurahInfo(intEndSurah);
  const maxStartAyah = startSurahInfo?.numberOfAyahs || 7;
  const maxEndAyah = endSurahInfo?.numberOfAyahs || 7;

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="playback-options-title"
      className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[var(--border)] overflow-hidden shadow-2xl transition-all"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--text-primary)',
          boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] shrink-0 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]"
              style={{
                backgroundColor: 'var(--surface-2)',
                color: 'var(--accent)',
              }}
            >
              <Sliders className="w-5 h-5 text-[var(--accent-text)]" />
            </div>
            <div className="min-w-0">
              <h2 id="playback-options-title" className="text-base sm:text-lg font-bold tracking-tight truncate flex items-center gap-1.5">
                Playback Options
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent-text)] border border-[var(--accent)]/30">
                  Audio Studio
                </span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                Ayah delay, interval repeats & recitation speed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close playback options"
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable controls */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {/* 1. Reciter Selector Row */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              Reciter (45+ Qaris)
            </label>
            <button
              onClick={() => setIsReciterModalOpen(true)}
              className="w-full p-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/50 hover:border-[var(--accent)] transition-all flex items-center justify-between gap-3 text-left group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                    {reciter.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--accent)]/15 text-[var(--accent-text)] font-semibold border border-[var(--accent)]/30 shrink-0">
                    {reciter.style}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span dir="rtl" className="font-arabic text-xs text-[var(--accent-text)] truncate">
                    {reciter.arabicName}
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">•</span>
                  <span className="text-[10.5px] text-[var(--text-secondary)]">
                    {reciter.bitrate}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>

          {/* 2. Recitation Speed */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                Playback Speed
              </label>
              <span className="text-[11px] font-bold text-[var(--accent-text)]">{playbackSpeed}x</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {SPEED_OPTIONS.map((speed) => {
                const isActive = playbackSpeed === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => setSpeed(speed)}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {speed}x
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Ayah Delay (Timing between verses) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                Ayah Delay (Quiet Pause)
              </label>
              <span className="text-[11px] font-bold text-[var(--accent-text)]">
                {ayahDelay === 'match' ? 'Match Ayah Length' : `${ayahDelay}s pause`}
              </span>
            </div>
            <p className="text-[10.5px] text-[var(--text-secondary)]/80 mb-2">
              Inserts a silent pause after each ayah so you can repeat and practice recitation aloud.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {DELAY_OPTIONS.map((opt) => {
                const isActive = ayahDelay === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setAyahDelay(opt.value)}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all text-center truncate ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Sleep Timer */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                Sleep Timer
              </label>
              {sleepRemainingSeconds !== null && (
                <span className="text-[11px] font-mono font-bold text-[var(--accent-text)] animate-pulse">
                  {Math.floor(sleepRemainingSeconds / 60)}:
                  {String(sleepRemainingSeconds % 60).padStart(2, '0')}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {SLEEP_OPTIONS.map((opt) => {
                const isActive = sleepTimerOption === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    onClick={() => setSleepTimer(opt.value)}
                    className={`py-2 px-1 text-[11px] font-semibold rounded-xl border transition-all text-center truncate ${
                      isActive
                        ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                        : 'bg-[var(--surface-2)]/60 text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Interval Range Looping (eQuran signature feature) */}
          <div className="p-3.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-[var(--accent-text)]" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Interval Range Looping
                </span>
              </div>
              <button
                onClick={() => setShowIntervalForm((prev) => !prev)}
                className="text-[11px] font-bold text-[var(--accent-text)] hover:underline"
              >
                {showIntervalForm ? 'Hide' : 'Configure'}
              </button>
            </div>

            {intervalRange.isActive && (
              <div className="p-2.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-between gap-2">
                <div className="text-[11px]">
                  <span className="font-bold text-[var(--accent-text)]">Active: </span>
                  Surah {intervalRange.startSurah}:{intervalRange.startAyah} → {intervalRange.endSurah}:{intervalRange.endAyah}
                  <span className="text-[10px] text-[var(--text-secondary)] block">
                    Interval loop {intervalRange.currentInterval} • Ayah repeat {intervalRange.currentAyahRepeat}/{intervalRange.repeatEachAyah}
                  </span>
                </div>
                <button
                  onClick={stopIntervalRange}
                  className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[var(--danger)] text-white hover:opacity-90 active:scale-95 transition-all"
                >
                  Stop
                </button>
              </div>
            )}

            {showIntervalForm && (
              <div className="space-y-3 pt-2 border-t border-[var(--border)]/70">
                {/* Start Point */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      Start Surah
                    </label>
                    <div className="flex items-center gap-1 border border-[var(--border)] rounded-xl bg-[var(--surface)] p-1">
                      <button
                        onClick={() => setIntStartSurah((s) => Math.max(1, s - 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center font-bold text-xs">
                        {intStartSurah}. {startSurahInfo?.englishName || ''}
                      </span>
                      <button
                        onClick={() => setIntStartSurah((s) => Math.min(114, s + 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      Start Ayah
                    </label>
                    <div className="flex items-center gap-1 border border-[var(--border)] rounded-xl bg-[var(--surface)] p-1">
                      <button
                        onClick={() => setIntStartAyah((a) => Math.max(1, a - 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center font-bold text-xs">{intStartAyah}</span>
                      <button
                        onClick={() => setIntStartAyah((a) => Math.min(maxStartAyah, a + 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* End Point */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      End Surah
                    </label>
                    <div className="flex items-center gap-1 border border-[var(--border)] rounded-xl bg-[var(--surface)] p-1">
                      <button
                        onClick={() => setIntEndSurah((s) => Math.max(intStartSurah, s - 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center font-bold text-xs">
                        {intEndSurah}. {endSurahInfo?.englishName || ''}
                      </span>
                      <button
                        onClick={() => setIntEndSurah((s) => Math.min(114, s + 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      End Ayah
                    </label>
                    <div className="flex items-center gap-1 border border-[var(--border)] rounded-xl bg-[var(--surface)] p-1">
                      <button
                        onClick={() => setIntEndAyah((a) => Math.max(1, a - 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="flex-1 text-center font-bold text-xs">{intEndAyah}</span>
                      <button
                        onClick={() => setIntEndAyah((a) => Math.min(maxEndAyah, a + 1))}
                        className="w-7 h-7 rounded-lg bg-[var(--surface-2)] flex items-center justify-center text-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Repeat Controls */}
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      Repeat Each Ayah
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {[1, 2, 3, 5, 10].map((num) => {
                        const isSel = intRepeatEachAyah === num;
                        return (
                          <button
                            key={num}
                            onClick={() => setIntRepeatEachAyah(num)}
                            className={`py-1.5 text-[11px] font-bold rounded-lg border text-center transition-all ${
                              isSel
                                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
                            }`}
                          >
                            {num === 1 ? 'Once' : `${num}×`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-1 block">
                      Interval Repeat
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {([1, 2, 3, 5, 'infinite'] as const).map((rep) => {
                        const isSel = intRepeatInterval === rep;
                        return (
                          <button
                            key={String(rep)}
                            onClick={() => setIntRepeatInterval(rep)}
                            className={`py-1.5 text-[11px] font-bold rounded-lg border text-center transition-all ${
                              isSel
                                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]'
                                : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]'
                            }`}
                          >
                            {rep === 'infinite' ? '∞' : rep === 1 ? 'Once' : `${rep}×`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={() => {
                    startIntervalRange({
                      startSurah: intStartSurah,
                      startAyah: intStartAyah,
                      endSurah: intEndSurah,
                      endAyah: intEndAyah,
                      repeatInterval: intRepeatInterval,
                      repeatEachAyah: intRepeatEachAyah,
                    });
                    onClose();
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Start Interval Looping
                </button>
              </div>
            )}
          </div>

          {/* 6. Audio Downloads */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-[var(--accent-text)]" />
              Audio Downloads (Offline Access)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSavingAyah}
                onClick={handleDownloadAyahClick}
                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--accent)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-75"
              >
                {isSavingAyah ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-text)]" />
                    <span>Saving Ayah...</span>
                  </>
                ) : isAyahSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span className="text-[var(--success)]">✓ Ayah Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    <span>Current Ayah MP3</span>
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={surahProgress !== null}
                onClick={handleDownloadSurahClick}
                className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 hover:border-[var(--accent)] text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-75"
              >
                {surahProgress !== null ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent-text)]" />
                    <span>{surahProgress}% Saved</span>
                  </>
                ) : isSurahSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                    <span className="text-[var(--success)]">✓ Surah Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                    <span>Surah {effectiveSurah} Audio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-base)]/40 flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Powered by EveryAyah & MP3Quran
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent)] active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>

      {/* Embedded Reciter Picker Modal */}
      <ReciterPickerModal
        isOpen={isReciterModalOpen}
        onClose={() => setIsReciterModalOpen(false)}
        selectedReciterId={reciter.id}
        onSelectReciter={(r) => setReciter(r.id)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
