/**
 * Noor Connect — Global Persistent Tilawah Audio Engine & Context
 *
 * Provides a single persistent ayah-by-ayah recitation controller at the root App level
 * with gapless preloading, MediaSession lockscreen integration, sleep timer,
 * and Hifz memorization loop engine.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  TilawahReciter,
  TILAWAH_RECITERS,
  DEFAULT_TILAWAH_RECITER,
  getPrimaryAyahAudioUrl,
  getSecondaryAyahAudioUrl,
} from '@/lib/tilawah-data';
import { quranService, SurahInfo } from '@/lib/quran-service';
import { useToast } from '@/hooks/use-toast';

export type PlaybackSpeed = 0.75 | 1 | 1.25 | 1.5 | 2;
export type SleepTimerOption = null | 15 | 30 | 45 | 60 | 'end-of-surah';
export type HifzHideMode = 'none' | 'arabic' | 'translation';

export interface HifzConfig {
  isActive: boolean;
  repeatCount: number; // repeats per ayah (1, 2, 3, 5, 10)
  currentRepeat: number;
  rangeStart: number;
  rangeEnd: number;
  rangeLoops: number | 'infinite';
  currentRangeLoop: number;
  pauseFactor: number; // 0, 0.5, 1
  hideMode: HifzHideMode;
}

export interface TilawahContextValue {
  // Playback state
  isPlaying: boolean;
  isLoading: boolean;
  currentSurah: number;
  currentAyah: number;
  surahInfo: SurahInfo | null;
  totalAyahs: number;
  reciter: TilawahReciter;
  playbackSpeed: PlaybackSpeed;
  currentTime: number;
  duration: number;
  progressPercent: number;

  // Active Ayah synchronized text
  activeAyahArabic: string;
  activeAyahTranslation: string;

  // Sleep Timer
  sleepTimerOption: SleepTimerOption;
  sleepRemainingSeconds: number | null;

  // Hifz Engine
  hifzConfig: HifzConfig;

  // UI state
  isBarVisible: boolean;
  isPlayerOpen: boolean;

  // Actions
  playAyah: (surah: number, ayah: number, reciterId?: string) => Promise<void>;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  nextAyah: () => void;
  prevAyah: () => void;
  seekAyah: (ayah: number) => void;
  setSpeed: (speed: PlaybackSpeed) => void;
  setReciter: (reciterId: string) => void;
  setSleepTimer: (option: SleepTimerOption) => void;
  startHifzLoop: (config: Partial<HifzConfig>) => void;
  stopHifzLoop: () => void;
  setHifzHideMode: (mode: HifzHideMode) => void;
  openPlayer: () => void;
  closePlayer: () => void;
  dismissBar: () => void;
}

const STORAGE_STATE_KEY = 'noor_tilawah_state';

const TilawahContext = createContext<TilawahContextValue | null>(null);

export const TilawahProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();

  // Load initial saved state or defaults
  const initialSaved = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_STATE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // Fallback
    }
    return {
      surah: 1,
      ayah: 1,
      reciterId: DEFAULT_TILAWAH_RECITER.id,
      speed: 1,
    };
  }, []);

  const [currentSurah, setCurrentSurah] = useState<number>(initialSaved.surah || 1);
  const [currentAyah, setCurrentAyah] = useState<number>(initialSaved.ayah || 1);
  const [reciter, setReciterState] = useState<TilawahReciter>(() => {
    return (
      TILAWAH_RECITERS.find((r) => r.id === initialSaved.reciterId) ||
      DEFAULT_TILAWAH_RECITER
    );
  });
  const [playbackSpeed, setPlaybackSpeedState] = useState<PlaybackSpeed>(
    initialSaved.speed || 1
  );

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // Synchronized text state
  const [activeAyahArabic, setActiveAyahArabic] = useState<string>('');
  const [activeAyahTranslation, setActiveAyahTranslation] = useState<string>('');

  // Mini-player bar visibility
  const [isBarVisible, setIsBarVisible] = useState<boolean>(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState<boolean>(false);

  // Sleep Timer state
  const [sleepTimerOption, setSleepTimerOption] = useState<SleepTimerOption>(null);
  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState<number | null>(null);

  // Hifz Engine state
  const [hifzConfig, setHifzConfig] = useState<HifzConfig>({
    isActive: false,
    repeatCount: 1,
    currentRepeat: 1,
    rangeStart: 1,
    rangeEnd: 7,
    rangeLoops: 1,
    currentRangeLoop: 1,
    pauseFactor: 0,
    hideMode: 'none',
  });

  // Audio elements & refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadAudioRef = useRef<HTMLAudioElement | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const activeRequestIdRef = useRef<number>(0);

  // Surah info
  const surahInfo = useMemo(() => {
    return quranService.getSurahInfo(currentSurah);
  }, [currentSurah]);

  const totalAyahs = surahInfo ? surahInfo.numberOfAyahs : 7;
  const progressPercent = totalAyahs > 0 ? (currentAyah / totalAyahs) * 100 : 0;

  // Persist state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_STATE_KEY,
        JSON.stringify({
          surah: currentSurah,
          ayah: currentAyah,
          reciterId: reciter.id,
          speed: playbackSpeed,
        })
      );
    } catch {
      // Storage fallback
    }
  }, [currentSurah, currentAyah, reciter, playbackSpeed]);

  // Fetch Ayah Text & Translation for live preview
  useEffect(() => {
    let cancelled = false;
    const fetchAyahContent = async () => {
      // Check cache first
      const cacheKey = `noor_ayah_preview_${currentSurah}_${currentAyah}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!cancelled) {
            setActiveAyahArabic(parsed.arabic);
            setActiveAyahTranslation(parsed.translation);
          }
          return;
        }
      } catch {
        // Safe cache check
      }

      try {
        const res = await fetch(
          `https://api.alquran.cloud/v1/ayah/${currentSurah}:${currentAyah}/editions/quran-uthmani,en.sahih`,
          { signal: AbortSignal.timeout(4500) }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length >= 2) {
            const arText = json.data[0].text;
            const enText = json.data[1].text;
            if (!cancelled) {
              setActiveAyahArabic(arText);
              setActiveAyahTranslation(enText);
            }
            try {
              localStorage.setItem(
                cacheKey,
                JSON.stringify({ arabic: arText, translation: enText })
              );
            } catch {
              // Ignore cache write
            }
          }
        }
      } catch {
        // Fallback for offline or network delay
        if (!cancelled && !activeAyahArabic) {
          setActiveAyahArabic(`${surahInfo?.name || 'القرآن'} — آية ${currentAyah}`);
          setActiveAyahTranslation(
            `${surahInfo?.englishName || 'Surah'} Verse ${currentAyah}`
          );
        }
      }
    };

    fetchAyahContent();
    return () => {
      cancelled = true;
    };
  }, [currentSurah, currentAyah, surahInfo]);

  // Preload Next Ayah
  const preloadNextAyah = useCallback(
    (surah: number, ayah: number, reciterId: string) => {
      let nextSurah = surah;
      let nextAyah = ayah + 1;
      const sInfo = quranService.getSurahInfo(surah);
      if (sInfo && nextAyah > sInfo.numberOfAyahs) {
        if (surah < 114) {
          nextSurah = surah + 1;
          nextAyah = 1;
        } else {
          return; // End of Quran
        }
      }

      const nextUrl = getPrimaryAyahAudioUrl(reciterId, nextSurah, nextAyah);
      try {
        if (!preloadAudioRef.current) {
          preloadAudioRef.current = new Audio();
        }
        preloadAudioRef.current.src = nextUrl;
        preloadAudioRef.current.preload = 'auto';
      } catch {
        // Preload failure handled silently
      }
    },
    []
  );

  // Setup / Initialize Persistent HTMLAudioElement
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
      setIsBarVisible(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onWaiting = () => {
      setIsLoading(true);
    };

    const onCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('canplay', onCanPlay);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Update MediaSession lock-screen & notification metadata
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !surahInfo) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${surahInfo.englishName} • Ayah ${currentSurah}:${currentAyah}`,
        artist: reciter.name,
        album: 'Noor Connect Tilawah',
        artwork: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play().catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        handlePrevAyah();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNextAyah();
      });
    } catch {
      // MediaSession safe catch
    }
  }, [currentSurah, currentAyah, surahInfo, reciter]);

  // Execute playback of a given ayah
  const playAyahInternal = useCallback(
    async (surah: number, ayah: number, reciterObj = reciter) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }

      const currentReqId = ++activeRequestIdRef.current;

      setIsLoading(true);
      setCurrentSurah(surah);
      setCurrentAyah(ayah);
      setIsBarVisible(true);

      const primaryUrl = getPrimaryAyahAudioUrl(reciterObj.id, surah, ayah);
      const secondaryUrl = getSecondaryAyahAudioUrl(reciterObj.everyAyahDir, surah, ayah);

      audio.playbackRate = playbackSpeed;
      audio.src = primaryUrl;

      // Setup secondary CDN fallback on primary error
      const handleError = () => {
        if (currentReqId !== activeRequestIdRef.current) return;
        if (audio.src === primaryUrl) {
          audio.src = secondaryUrl;
          audio.play().catch((err: any) => {
            if (currentReqId !== activeRequestIdRef.current) return;
            if (err?.name === 'AbortError' || err?.code === 20) return;
            // Both CDNs failed or device is offline
            setIsPlaying(false);
            setIsLoading(false);
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
              toast({
                title: 'Recitation Offline',
                description: 'Could not connect to Tilawah audio server. Check internet connection.',
                variant: 'destructive',
              });
            }
          });
        } else {
          setIsPlaying(false);
          setIsLoading(false);
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            toast({
              title: 'Recitation Offline',
              description: 'Could not connect to Tilawah audio server. Check internet connection.',
              variant: 'destructive',
            });
          }
        }
      };

      audio.onerror = handleError;

      try {
        await audio.play();
        if (currentReqId !== activeRequestIdRef.current) return;
        setIsPlaying(true);
        setIsLoading(false);
        // Preload next ayah for seamless transition
        preloadNextAyah(surah, ayah, reciterObj.id);
      } catch (err: any) {
        if (currentReqId !== activeRequestIdRef.current) return;
        if (err?.name === 'AbortError' || err?.code === 20) {
          // Play was intentionally aborted due to fast switching/pause
          return;
        }
        // Autoplay policy or offline
        setIsLoading(false);
      }
    },
    [reciter, playbackSpeed, toast, preloadNextAyah]
  );

  // Transition handler when an ayah completes
  const handleAyahCompletion = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Check Hifz loop engine first
    if (hifzConfig.isActive) {
      if (hifzConfig.currentRepeat < hifzConfig.repeatCount) {
        // Repeat the same ayah again
        setHifzConfig((prev) => ({ ...prev, currentRepeat: prev.currentRepeat + 1 }));

        const pauseDurationMs =
          hifzConfig.pauseFactor > 0 ? (duration || 3) * hifzConfig.pauseFactor * 1000 : 0;

        if (pauseDurationMs > 0) {
          pauseTimerRef.current = setTimeout(() => {
            playAyahInternal(currentSurah, currentAyah);
            isTransitioningRef.current = false;
          }, pauseDurationMs);
        } else {
          playAyahInternal(currentSurah, currentAyah);
          isTransitioningRef.current = false;
        }
        return;
      }

      // Reached repeat limit for this ayah -> advance in range
      setHifzConfig((prev) => ({ ...prev, currentRepeat: 1 }));

      if (currentAyah < hifzConfig.rangeEnd) {
        const next = currentAyah + 1;
        playAyahInternal(currentSurah, next);
        isTransitioningRef.current = false;
        return;
      }

      // Reached end of range: check range loop limit
      const isInfinite = hifzConfig.rangeLoops === 'infinite';
      const maxLoops = typeof hifzConfig.rangeLoops === 'number' ? hifzConfig.rangeLoops : 1;

      if (isInfinite || hifzConfig.currentRangeLoop < maxLoops) {
        setHifzConfig((prev) => ({
          ...prev,
          currentRangeLoop: prev.currentRangeLoop + 1,
          currentRepeat: 1,
        }));
        playAyahInternal(currentSurah, hifzConfig.rangeStart);
        isTransitioningRef.current = false;
        return;
      }

      // Hifz loop completed!
      setHifzConfig((prev) => ({ ...prev, isActive: false }));
      setIsPlaying(false);
      isTransitioningRef.current = false;
      toast({
        title: 'Hifz Session Completed! 🎯',
        description: `Completed memorization loop for Ayahs ${hifzConfig.rangeStart}–${hifzConfig.rangeEnd}.`,
      });
      return;
    }

    // Normal Tilawah flow
    // 1. Check Sleep Timer "End of Surah"
    if (sleepTimerOption === 'end-of-surah' && currentAyah >= totalAyahs) {
      setIsPlaying(false);
      setSleepTimerOption(null);
      setSleepRemainingSeconds(null);
      isTransitioningRef.current = false;
      toast({
        title: 'Sleep Timer',
        description: 'Recitation paused at the end of the Surah. 🌙',
      });
      return;
    }

    // 2. Advance to next ayah in current surah
    if (currentAyah < totalAyahs) {
      playAyahInternal(currentSurah, currentAyah + 1);
      isTransitioningRef.current = false;
      return;
    }

    // 3. Advance to next surah
    if (currentSurah < 114) {
      playAyahInternal(currentSurah + 1, 1);
      isTransitioningRef.current = false;
      return;
    }

    // End of whole Quran
    setIsPlaying(false);
    isTransitioningRef.current = false;
  }, [
    hifzConfig,
    duration,
    currentSurah,
    currentAyah,
    totalAyahs,
    sleepTimerOption,
    playAyahInternal,
    toast,
  ]);

  // Wire 'ended' event to completion handler
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.onended = handleAyahCompletion;
    return () => {
      audio.onended = null;
    };
  }, [handleAyahCompletion]);

  // Navigation handlers
  const handleNextAyah = useCallback(() => {
    if (currentAyah < totalAyahs) {
      playAyahInternal(currentSurah, currentAyah + 1);
    } else if (currentSurah < 114) {
      playAyahInternal(currentSurah + 1, 1);
    }
  }, [currentAyah, totalAyahs, currentSurah, playAyahInternal]);

  const handlePrevAyah = useCallback(() => {
    if (currentAyah > 1) {
      playAyahInternal(currentSurah, currentAyah - 1);
    } else if (currentSurah > 1) {
      const prevSurahInfo = quranService.getSurahInfo(currentSurah - 1);
      const prevTotal = prevSurahInfo ? prevSurahInfo.numberOfAyahs : 1;
      playAyahInternal(currentSurah - 1, prevTotal);
    }
  }, [currentAyah, currentSurah, playAyahInternal]);

  const seekAyah = useCallback(
    (ayah: number) => {
      const clamped = Math.max(1, Math.min(totalAyahs, ayah));
      playAyahInternal(currentSurah, clamped);
    },
    [totalAyahs, currentSurah, playAyahInternal]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      if (!audio.src || audio.src === '') {
        playAyahInternal(currentSurah, currentAyah);
      } else {
        audio.play().catch(() => {
          playAyahInternal(currentSurah, currentAyah);
        });
      }
    }
  }, [isPlaying, currentSurah, currentAyah, playAyahInternal]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const setSpeed = useCallback((speed: PlaybackSpeed) => {
    setPlaybackSpeedState(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const setReciter = useCallback(
    (reciterId: string) => {
      const target = TILAWAH_RECITERS.find((r) => r.id === reciterId);
      if (!target) return;
      setReciterState(target);
      if (isPlaying) {
        playAyahInternal(currentSurah, currentAyah, target);
      }
    },
    [isPlaying, currentSurah, currentAyah, playAyahInternal]
  );

  // Sleep Timer countdown ticker
  useEffect(() => {
    if (typeof sleepTimerOption !== 'number' || sleepRemainingSeconds === null) return;

    if (sleepRemainingSeconds <= 0) {
      // Gently fade out & pause
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = 1;
      }
      setSleepTimerOption(null);
      setSleepRemainingSeconds(null);
      toast({
        title: 'Sleep Timer Finished',
        description: 'Recitation paused gently. May Allah grant you peaceful rest. 🌙',
      });
      return;
    }

    const interval = setInterval(() => {
      setSleepRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) return 0;

        // Gentle volume fade over final 10 seconds
        if (prev <= 10 && audioRef.current) {
          audioRef.current.volume = Math.max(0, (prev - 1) / 10);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerOption, sleepRemainingSeconds, toast]);

  const setSleepTimer = useCallback(
    (option: SleepTimerOption) => {
      setSleepTimerOption(option);
      if (typeof option === 'number') {
        setSleepRemainingSeconds(option * 60);
        if (audioRef.current) audioRef.current.volume = 1;
        toast({
          title: 'Sleep Timer Set',
          description: `Audio will gently turn off in ${option} minutes. 🌙`,
        });
      } else if (option === 'end-of-surah') {
        setSleepRemainingSeconds(null);
        if (audioRef.current) audioRef.current.volume = 1;
        toast({
          title: 'Sleep Timer Set',
          description: 'Audio will pause at the end of the current Surah. 🌙',
        });
      } else {
        setSleepRemainingSeconds(null);
        if (audioRef.current) audioRef.current.volume = 1;
        toast({
          title: 'Sleep Timer Cancelled',
          description: 'Playback will continue normally.',
        });
      }
    },
    [toast]
  );

  // Hifz Engine actions
  const startHifzLoop = useCallback(
    (config: Partial<HifzConfig>) => {
      const merged: HifzConfig = {
        isActive: true,
        repeatCount: config.repeatCount ?? hifzConfig.repeatCount,
        currentRepeat: 1,
        rangeStart: config.rangeStart ?? currentAyah,
        rangeEnd: config.rangeEnd ?? Math.min(totalAyahs, currentAyah + 4),
        rangeLoops: config.rangeLoops ?? hifzConfig.rangeLoops,
        currentRangeLoop: 1,
        pauseFactor: config.pauseFactor ?? hifzConfig.pauseFactor,
        hideMode: config.hideMode ?? hifzConfig.hideMode,
      };
      setHifzConfig(merged);
      playAyahInternal(currentSurah, merged.rangeStart);
      toast({
        title: 'Hifz Memorization Loop Started',
        description: `Repeating Ayahs ${merged.rangeStart}–${merged.rangeEnd} (${merged.repeatCount}× each).`,
      });
    },
    [hifzConfig, currentAyah, totalAyahs, currentSurah, playAyahInternal, toast]
  );

  const stopHifzLoop = useCallback(() => {
    setHifzConfig((prev) => ({ ...prev, isActive: false }));
    toast({ title: 'Hifz Loop Stopped' });
  }, [toast]);

  const setHifzHideMode = useCallback((mode: HifzHideMode) => {
    setHifzConfig((prev) => ({ ...prev, hideMode: mode }));
  }, []);

  const openPlayer = useCallback(() => setIsPlayerOpen(true), []);
  const closePlayer = useCallback(() => setIsPlayerOpen(false), []);
  const dismissBar = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setIsBarVisible(false);
  }, []);

  const value = useMemo<TilawahContextValue>(
    () => ({
      isPlaying,
      isLoading,
      currentSurah,
      currentAyah,
      surahInfo,
      totalAyahs,
      reciter,
      playbackSpeed,
      currentTime,
      duration,
      progressPercent,
      activeAyahArabic,
      activeAyahTranslation,
      sleepTimerOption,
      sleepRemainingSeconds,
      hifzConfig,
      isBarVisible,
      isPlayerOpen,
      playAyah: playAyahInternal,
      togglePlay,
      pause,
      resume,
      nextAyah: handleNextAyah,
      prevAyah: handlePrevAyah,
      seekAyah,
      setSpeed,
      setReciter,
      setSleepTimer,
      startHifzLoop,
      stopHifzLoop,
      setHifzHideMode,
      openPlayer,
      closePlayer,
      dismissBar,
    }),
    [
      isPlaying,
      isLoading,
      currentSurah,
      currentAyah,
      surahInfo,
      totalAyahs,
      reciter,
      playbackSpeed,
      currentTime,
      duration,
      progressPercent,
      activeAyahArabic,
      activeAyahTranslation,
      sleepTimerOption,
      sleepRemainingSeconds,
      hifzConfig,
      isBarVisible,
      isPlayerOpen,
      playAyahInternal,
      togglePlay,
      pause,
      resume,
      handleNextAyah,
      handlePrevAyah,
      seekAyah,
      setSpeed,
      setReciter,
      setSleepTimer,
      startHifzLoop,
      stopHifzLoop,
      setHifzHideMode,
      openPlayer,
      closePlayer,
      dismissBar,
    ]
  );

  return <TilawahContext.Provider value={value}>{children}</TilawahContext.Provider>;
};

export const useTilawah = (): TilawahContextValue => {
  const ctx = useContext(TilawahContext);
  if (!ctx) {
    throw new Error('useTilawah must be used within a TilawahProvider');
  }
  return ctx;
};
