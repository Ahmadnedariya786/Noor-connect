import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RotateCcw, Sparkles, History, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Smartphone, Lock, Unlock, Maximize2, Minimize2,
  Play, Pause, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTasbeehTotal, getTasbeehHistory, addTasbeehEntry } from "@/lib/storage";
import { motion, AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AppBar } from "@/components/AppBar";
import { useLanguage } from "@/contexts/LanguageContext-new";

const DHIKR_OPTIONS = [
  { value: "subhanallah", label: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah" },
  { value: "alhamdulillah", label: "ٱلْحَمْدُ لِلَّٰهِ", transliteration: "Alhamdulillah", translation: "Praise be to Allah" },
  { value: "allahuakbar", label: "اللَّٰهُ أَكْبَرُ", transliteration: "Allahu Akbar", translation: "Allah is the Greatest" },
  { value: "lailahaillallah", label: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", transliteration: "La ilaha illallah", translation: "None has the right to be worshipped but Allah" },
  { value: "astagfirullah", label: "أَسْتَغْفِرُ ٱللَّٰهَ", transliteration: "Astagfirullah", translation: "I seek forgiveness from Allah" },
  { value: "salawat", label: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ", transliteration: "Allahumma Salli Ala Muhammad", translation: "O Allah, send blessings upon Muhammad" },
  { value: "hawqala", label: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "La Hawla Wa La Quwwata Illa Billah", translation: "There is no power nor strength except with Allah" },
];

const GOAL_OPTIONS = [33, 99, 100, 1000, Infinity];

type FeedbackMode = 'all' | 'vibrate' | 'silent';

const Tasbeeh = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_OPTIONS[0].value);
  const [dailyHistory, setDailyHistory] = useState<{ date: string; count: number; label: string }[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [targetGoal, setTargetGoal] = useState<number>(33);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('all');
  const [isAutoCounting, setIsAutoCounting] = useState(false);
  const [autoPace, setAutoPace] = useState(2.0); // seconds: 1.5, 2.0, 2.5
  const [zenMode, setZenMode] = useState(false);

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentDhikr = useMemo(() => {
    return DHIKR_OPTIONS.find(d => d.value === selectedDhikr) || DHIKR_OPTIONS[0];
  }, [selectedDhikr]);

  const currentIndex = useMemo(() => {
    const idx = DHIKR_OPTIONS.findIndex(d => d.value === selectedDhikr);
    return idx >= 0 ? idx : 0;
  }, [selectedDhikr]);

  const label = currentDhikr.transliteration;

  // Initialize total and history from storage
  useEffect(() => {
    setTotalCount(getTasbeehTotal());
    setDailyHistory(getTasbeehHistory());
  }, []);

  // Session timer that ticks cleanly while page is open
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format session time as MM:SS
  const formattedSessionTime = useMemo(() => {
    const m = Math.floor(sessionSeconds / 60);
    const s = sessionSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [sessionSeconds]);

  // Audio click synthesizer (zero dependencies, 0 latency, 100% offline)
  const playAudioClick = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
      setTimeout(() => {
        try { ctx.close(); } catch {}
      }, 120);
    } catch {
      // Audio context guard
    }
  }, []);

  // Enhanced haptic feedback patterns
  const triggerHapticFeedback = useCallback((type: 'increment' | 'milestone' | 'reset' | 'select' = 'increment') => {
    if (!('vibrate' in navigator)) return;
    try {
      switch (type) {
        case 'increment':
          navigator.vibrate(8);
          break;
        case 'milestone':
          navigator.vibrate([10, 50, 10]);
          break;
        case 'reset':
          navigator.vibrate([15, 30, 15, 30, 15]);
          break;
        case 'select':
          navigator.vibrate(5);
          break;
      }
    } catch {
      // Vibration error guard
    }
  }, []);

  // Core increment logic
  const handleIncrement = useCallback(() => {
    setCount(prev => {
      const newCount = prev + 1;
      addTasbeehEntry(label);
      setTotalCount(getTasbeehTotal());
      setDailyHistory(getTasbeehHistory());

      // Feedback
      if (feedbackMode === 'all' || feedbackMode === 'vibrate') {
        const goalNum = targetGoal === Infinity ? 100 : targetGoal;
        if (newCount === 33 || newCount === 99 || newCount === 100 || (newCount % goalNum === 0 && newCount > 0)) {
          triggerHapticFeedback('milestone');
        } else {
          triggerHapticFeedback('increment');
        }
      }
      if (feedbackMode === 'all') {
        playAudioClick();
      }

      return newCount;
    });
  }, [feedbackMode, label, playAudioClick, targetGoal, triggerHapticFeedback]);

  // Keep a stable ref for auto counter
  const handleIncrementRef = useRef(handleIncrement);
  useEffect(() => {
    handleIncrementRef.current = handleIncrement;
  }, [handleIncrement]);

  // Hands-free rhythmic auto counter timer
  useEffect(() => {
    if (isAutoCounting) {
      autoIntervalRef.current = setInterval(() => {
        handleIncrementRef.current();
      }, autoPace * 1000);
    } else {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    }
    return () => {
      if (autoIntervalRef.current) {
        clearInterval(autoIntervalRef.current);
        autoIntervalRef.current = null;
      }
    };
  }, [isAutoCounting, autoPace]);

  // Stop auto counter on unmount or when locked
  useEffect(() => {
    if (isLocked && isAutoCounting) {
      setIsAutoCounting(false);
    }
  }, [isLocked, isAutoCounting]);

  const confirmReset = () => {
    setCount(0);
    triggerHapticFeedback('reset');
    setShowResetDialog(false);
  };

  const handleDhikrChange = (value: string) => {
    if (isLocked) return;
    setSelectedDhikr(value);
    setCount(0);
    triggerHapticFeedback('select');
  };

  const handlePrevDhikr = () => {
    if (isLocked) return;
    const idx = DHIKR_OPTIONS.findIndex(d => d.value === selectedDhikr);
    const prevIdx = (idx - 1 + DHIKR_OPTIONS.length) % DHIKR_OPTIONS.length;
    setSelectedDhikr(DHIKR_OPTIONS[prevIdx].value);
    triggerHapticFeedback('select');
  };

  const handleNextDhikr = () => {
    if (isLocked) return;
    const idx = DHIKR_OPTIONS.findIndex(d => d.value === selectedDhikr);
    const nextIdx = (idx + 1) % DHIKR_OPTIONS.length;
    setSelectedDhikr(DHIKR_OPTIONS[nextIdx].value);
    triggerHapticFeedback('select');
  };

  const cycleGoal = () => {
    if (isLocked) return;
    const currentIdx = GOAL_OPTIONS.indexOf(targetGoal);
    const nextIdx = (currentIdx + 1) % GOAL_OPTIONS.length;
    setTargetGoal(GOAL_OPTIONS[nextIdx]);
    triggerHapticFeedback('select');
  };

  const cycleFeedbackMode = () => {
    if (feedbackMode === 'all') setFeedbackMode('vibrate');
    else if (feedbackMode === 'vibrate') setFeedbackMode('silent');
    else setFeedbackMode('all');
    triggerHapticFeedback('select');
  };

  const toggleAutoCounter = () => {
    if (isLocked) return;
    setIsAutoCounting(prev => !prev);
    triggerHapticFeedback('select');
  };

  const cycleAutoPace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    if (autoPace === 1.5) setAutoPace(2.0);
    else if (autoPace === 2.0) setAutoPace(2.5);
    else setAutoPace(1.5);
    triggerHapticFeedback('select');
  };

  const toggleLock = () => {
    setIsLocked(prev => !prev);
    triggerHapticFeedback('select');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
    triggerHapticFeedback('select');
  };

  const toggleZenMode = () => {
    setZenMode(prev => !prev);
    triggerHapticFeedback('select');
  };

  // Progress percentage calculation
  const progress = useMemo(() => {
    if (targetGoal === Infinity) {
      return Math.min(100, Math.round(((count % 100) / 100) * 100));
    }
    const lap = count % targetGoal;
    if (count > 0 && lap === 0) return 100;
    return Math.min(100, Math.round((lap / targetGoal) * 100));
  }, [count, targetGoal]);

  // Completed rounds (Set #)
  const currentGoalNum = targetGoal === Infinity ? 33 : targetGoal;
  const setNumber = Math.floor(count / currentGoalNum) + 1;

  // 3D Gemstone beads coordinates along quadratic curve M 15 28 Q 180 10 345 28
  const beadsData = useMemo(() => {
    const totalBeads = 7;
    const shift = count % totalBeads;
    return Array.from({ length: totalBeads }, (_, i) => {
      const frac = ((i + shift) % totalBeads) / (totalBeads - 1);
      const t = 0.08 + 0.84 * frac;
      const cx = (1 - t) * (1 - t) * 15 + 2 * (1 - t) * t * 180 + t * t * 345;
      const cy = (1 - t) * (1 - t) * 28 + 2 * (1 - t) * t * 10 + t * t * 28;
      const isLead = i === shift;
      return { id: i, cx, cy, isLead };
    });
  }, [count]);

  // Zen Mode overlay
  if (zenMode) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center select-none"
        style={{ background: 'var(--bg-base)' }}
        onClick={handleIncrement}
      >
        {/* 1-Tap Exit Zen Pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZenMode(false);
            triggerHapticFeedback('reset');
          }}
          className="absolute top-4 left-4 select-none active:scale-95 transition-transform cursor-pointer"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.78rem',
            fontWeight: 600,
            zIndex: 50,
          }}
        >
          ✕ Exit Zen
        </button>

        <div className="absolute top-16 left-0 right-0 text-center px-4">
          <p className="text-xl font-bold font-arabic mb-1" style={{ color: 'var(--accent-text)' }}>{currentDhikr.label}</p>
          <p className="text-xs uppercase font-bold tracking-widest" style={{ color: 'var(--text-secondary)' }}>{currentDhikr.transliteration}</p>
        </div>

        <span
          className="text-[12rem] sm:text-[15rem] font-black leading-none select-none tabular-nums"
          style={{ color: 'var(--text-primary)', textShadow: '0 0 24px var(--accent-glow)' }}
        >
          {count}
        </span>

        <div className="absolute bottom-28 pb-4 left-0 right-0 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-1" style={{ color: 'var(--text-secondary)' }}>Goal Progress</p>
          <p className="text-2xl font-bold italic" style={{ color: 'var(--accent-text)' }}>
            {targetGoal === Infinity ? '∞' : `${count % targetGoal} / ${targetGoal}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div
        className={`min-h-screen pb-20 transition-all ${isFullscreen ? 'fixed inset-0 z-40 overflow-y-auto' : ''}`}
        style={{
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          paddingBottom: isFullscreen ? '112px' : '96px',
        }}
      >
        {!isFullscreen && <AppBar title={t('digitalTasbeeh')} showBack />}

        <div className="max-w-md mx-auto px-4 pt-2.5 sm:pt-4 space-y-2.5">

          {/* 1. Top Instrument Status Bar */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            {/* Left pills: Set # & Session Timer */}
            <div className="flex items-center gap-1.5">
              <div
                className="px-3 py-1 rounded-full text-xs font-bold select-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                Set: <span style={{ color: 'var(--accent-text)' }}>{setNumber}</span>
              </div>

              <div
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold tabular-nums select-none"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>⏱</span>
                <span>{formattedSessionTime}</span>
              </div>
            </div>

            {/* Right pills: Touch Lock & Fullscreen & Zen */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleLock}
                className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 select-none"
                style={{
                  background: isLocked ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${isLocked ? 'var(--accent)' : 'var(--border)'}`,
                  color: isLocked ? 'var(--accent-text)' : 'var(--text-secondary)',
                }}
                title={isLocked ? "Touch is locked to prevent accidental taps" : "Lock screen controls"}
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isLocked ? 'Locked' : 'Lock'}</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-transform active:scale-95"
                style={{
                  background: isFullscreen ? 'var(--accent-soft)' : 'var(--surface-2)',
                  border: `1px solid ${isFullscreen ? 'var(--accent)' : 'var(--border)'}`,
                  color: isFullscreen ? 'var(--accent-text)' : 'var(--text-secondary)',
                }}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={toggleZenMode}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-transform active:scale-95"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-text)',
                }}
                title="Zen Mode"
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Luminous Vocalized Dhikr Stage & Inline Goal Progress Bar */}
          <div
            className="relative overflow-hidden rounded-3xl border select-none"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.45), inset 0 1px 0 var(--card-sheen)',
              position: 'relative',
              padding: '12px 44px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {/* Ambient radial glow */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(circle at 50% 0%, var(--accent-soft), transparent 70%)',
              }}
            />

            {/* Prev Carousel Button */}
            <button
              type="button"
              disabled={isLocked}
              onClick={handlePrevDhikr}
              aria-label="Previous Dhikr"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Next Carousel Button */}
            <button
              type="button"
              disabled={isLocked}
              onClick={handleNextDhikr}
              aria-label="Next Dhikr"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40 cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Top Pill (Dropdown Trigger): Dhikr X of Y • Change ⌄ */}
            <div className="relative z-10">
              <Select value={selectedDhikr} onValueChange={handleDhikrChange} disabled={isLocked}>
                <SelectTrigger
                  className="h-auto w-auto px-2.5 py-1 border shadow-none text-center justify-center gap-1 font-semibold rounded-full select-none"
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    color: 'var(--accent-text)',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    padding: '3px 10px',
                  }}
                >
                  <span>Dhikr {currentIndex + 1} of {DHIKR_OPTIONS.length} • Change</span>
                </SelectTrigger>
                <SelectContent
                  style={{
                    background: 'var(--bg-elev)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {DHIKR_OPTIONS.map((dhikr) => (
                    <SelectItem key={dhikr.value} value={dhikr.value} className="py-2.5">
                      <div className="flex flex-col text-left">
                        <span className="font-arabic text-base" style={{ color: 'var(--accent-text)' }}>{dhikr.label}</span>
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{dhikr.transliteration}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Main Arabic Calligraphy (Rendered ONCE) */}
            <div
              className="relative z-10 quran-arabic select-none"
              dir="rtl"
              style={{
                fontSize: 'clamp(1.45rem, 5.5vw, 1.8rem)',
                fontWeight: 700,
                color: 'var(--accent-text)',
                textShadow: '0 0 16px var(--accent-glow)',
                lineHeight: 1.35,
                textAlign: 'center',
                marginTop: '2px',
              }}
            >
              {currentDhikr.label}
            </div>

            {/* Uppercase Transliteration (Rendered ONCE) */}
            <p
              className="relative z-10 uppercase select-none"
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
                textAlign: 'center',
              }}
            >
              {currentDhikr.transliteration}
            </p>

            {/* English Meaning (Rendered ONCE) */}
            <p
              className="relative z-10 italic select-none"
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.25,
              }}
            >
              "{currentDhikr.translation}"
            </p>

            {/* Goal Pill & Progress Bar */}
            <div className="relative z-10 pt-1.5 w-full flex flex-col items-center gap-1.5">
              <button
                type="button"
                disabled={isLocked}
                onClick={cycleGoal}
                className="px-2.5 py-0.5 rounded-full font-bold transition-transform active:scale-95 select-none disabled:opacity-40"
                style={{
                  fontSize: '0.70rem',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--accent-text)',
                }}
                title="Tap to change target goal"
              >
                GOAL: {targetGoal === Infinity ? '∞' : targetGoal} • {progress}% ✎
              </button>

              {/* Sleek 4px progress bar */}
              <div
                className="w-full h-1 rounded-full overflow-hidden"
                style={{
                  background: 'var(--surface-2)',
                }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3. Interactive Curved 3D Gemstone Bead String */}
          <div className="w-full px-2">
            <svg
              className="w-full h-[40px] overflow-visible"
              viewBox="0 0 360 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="tasbihBeadGrad" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="var(--accent-text)" />
                  <stop offset="55%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--bg-base)" />
                </radialGradient>
              </defs>

              {/* Thread wire */}
              <path
                d="M 15 28 Q 180 10 345 28"
                stroke="var(--border)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                opacity={0.65}
              />

              {/* 7 3D Gemstone Beads along the wire */}
              {beadsData.map((bead) => (
                <g key={bead.id} style={{ transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  {/* Lead bead ambient aura */}
                  {bead.isLead && (
                    <circle cx={bead.cx} cy={bead.cy} r={12} fill="var(--accent)" opacity={0.32} />
                  )}

                  {/* Gemstone sphere body */}
                  <circle
                    cx={bead.cx}
                    cy={bead.cy}
                    r={7.5}
                    fill="url(#tasbihBeadGrad)"
                    stroke="var(--border)"
                    strokeWidth={1}
                  />

                  {/* Specular 3D highlight */}
                  <circle
                    cx={bead.cx - 2.2}
                    cy={bead.cy - 2.2}
                    r={2}
                    fill="#FFFFFF"
                    opacity={0.85}
                  />
                </g>
              ))}
            </svg>
          </div>

          {/* 4. 100% Theme-Tokenized Concentric Dark-Jewel Tap Pad */}
          <div className="flex flex-col items-center justify-center py-1 sm:py-2">
            <div className="relative w-[236px] h-[236px] flex items-center justify-center">
              {/* Outer Circular Progress Track */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 236 236" style={{ overflow: 'visible' }}>
                <circle
                  cx={118}
                  cy={118}
                  r={108}
                  fill="transparent"
                  stroke="var(--surface-2)"
                  strokeWidth={8}
                />
                <circle
                  cx={118}
                  cy={118}
                  r={108}
                  fill="transparent"
                  stroke="var(--accent)"
                  strokeWidth={8}
                  strokeDasharray={679}
                  strokeDashoffset={679 - (679 * progress) / 100}
                  strokeLinecap="round"
                  transform="rotate(-90 118 118)"
                  style={{
                    transition: 'stroke-dashoffset 0.3s ease-out',
                    filter: 'drop-shadow(0 0 6px var(--accent-glow))',
                  }}
                />
                {/* Comet Tip Orb */}
                {progress > 0 && (() => {
                  const angleRad = ((progress / 100) * 360 - 90) * (Math.PI / 180);
                  const orbX = 118 + 108 * Math.cos(angleRad);
                  const orbY = 118 + 108 * Math.sin(angleRad);
                  return (
                    <g style={{ transition: 'all 0.3s ease-out' }}>
                      <circle cx={orbX} cy={orbY} r={6} fill="var(--accent)" opacity={0.4} />
                      <circle cx={orbX} cy={orbY} r={3} fill="var(--accent-text)" stroke="var(--accent)" strokeWidth={1.5} />
                    </g>
                  );
                })()}
              </svg>

              {/* Concentric Jewel Tap Pad */}
              <button
                type="button"
                onClick={handleIncrement}
                className="relative w-[196px] h-[196px] rounded-full flex flex-col items-center justify-center active:scale-95 transition-transform duration-100 select-none cursor-pointer outline-none"
                style={{
                  background: 'radial-gradient(circle at 50% 35%, var(--surface-2) 0%, var(--surface) 65%, var(--bg-base) 100%)',
                  border: '1.5px solid var(--border)',
                  boxShadow: 'inset 0 2px 12px var(--accent-soft), 0 10px 28px rgba(0,0,0,0.55)',
                }}
              >
                {/* Inner subtle geometric dashed ring */}
                <div
                  className="absolute inset-3 rounded-full pointer-events-none"
                  style={{
                    border: '1px dashed var(--card-sheen)',
                    opacity: 0.6,
                  }}
                />

                {/* Center Count Readout */}
                <motion.span
                  key={count}
                  initial={{ scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.12 }}
                  className="text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums"
                  style={{
                    color: 'var(--accent-text)',
                    textShadow: '0 0 18px var(--accent-glow)',
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                  }}
                >
                  {count}
                </motion.span>

                {/* Subtitle */}
                <span
                  className="text-[9px] font-bold uppercase tracking-[0.2em] mt-1 select-none"
                  style={{
                    color: 'var(--text-secondary)',
                  }}
                >
                  TAP TO COUNT
                </span>
              </button>
            </div>
          </div>

          {/* 5. 3-Pill Bottom Control Deck */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 w-full px-1">
            {/* Left Pill: Reset */}
            <button
              type="button"
              disabled={isLocked}
              onClick={() => setShowResetDialog(true)}
              className="h-11 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 select-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span>Reset</span>
            </button>

            {/* Center Primary Pill: Auto Rhythm Counter */}
            <button
              type="button"
              disabled={isLocked}
              onClick={toggleAutoCounter}
              className="h-11 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 disabled:opacity-40 select-none"
              style={{
                background: isAutoCounting ? 'var(--accent)' : 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                color: isAutoCounting ? 'var(--on-accent)' : 'var(--accent-text)',
                boxShadow: isAutoCounting ? '0 0 14px var(--accent-glow)' : 'none',
              }}
              title="Hands-free rhythmic counter"
            >
              {isAutoCounting ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Auto</span>
                  <span
                    onClick={cycleAutoPace}
                    className="text-[10px] opacity-80 underline cursor-pointer px-0.5 py-0.5 rounded"
                  >
                    ({autoPace.toFixed(1)}s)
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Auto</span>
                </>
              )}
            </button>

            {/* Right Pill: Sound / Vibrate */}
            <button
              type="button"
              onClick={cycleFeedbackMode}
              className="h-11 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 select-none"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              {feedbackMode === 'all' && (
                <>
                  <Volume2 className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Sound</span>
                </>
              )}
              {feedbackMode === 'vibrate' && (
                <>
                  <Smartphone className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span>Vibrate</span>
                </>
              )}
              {feedbackMode === 'silent' && (
                <>
                  <VolumeX className="w-3.5 h-3.5" style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Mute</span>
                </>
              )}
            </button>
          </div>

          {/* Today's Lifetime Activity & History Card */}
          <div
            className="rounded-3xl p-4 border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: 'inset 0 1px 0 var(--card-sheen)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{
                    background: 'var(--accent-soft)',
                    borderColor: 'var(--border)',
                    color: 'var(--accent)',
                  }}
                >
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                    Total Dhikr Recorded
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Lifetime count across sessions
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-black tabular-nums" style={{ color: 'var(--accent-text)' }}>
                  {totalCount.toLocaleString()}
                </p>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                  Total
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Tokenized Reset Confirmation Modal */}
        <AnimatePresence>
          {showResetDialog && (
            <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm rounded-[24px] p-6 space-y-4 shadow-2xl"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2.5 rounded-xl border"
                    style={{
                      background: 'var(--accent-soft)',
                      borderColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                    }}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>Reset Counter</h3>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Reset current counter to 0?</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl h-11 transition-all"
                    style={{
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    onClick={() => setShowResetDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 rounded-xl h-11 font-bold shadow-md transition-all"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--on-accent)',
                    }}
                    onClick={confirmReset}
                  >
                    Reset
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default Tasbeeh;

