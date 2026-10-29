/**
 * Islamic Stream Player — Premium Redesign
 * HLS streaming for Makkah & Madinah.
 * Uses hls.js (MIT License). Primary: SBA/Globecast/Akamai CDN (HTTPS, CORS-enabled).
 * Fallback: Kwikmotion 1080p for Makkah. YouTube removed for F-Droid compliance.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Hls from 'hls.js';
import { Capacitor } from '@capacitor/core';
import {
  Maximize,
  Minimize,
  Play,
  Pause,
  Loader2,
  Volume2,
  VolumeX,
  WifiOff,
  RefreshCw,
  Radio,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FALLBACK_STREAMS, type Channel } from '@/lib/m3u-parser';
import { isLowEndDevice } from '@/lib/performance-optimizations';
import { recordListeningTime } from '@/lib/radio-stats';
import { useContentLanguage } from '@/lib/content-translator';

type StreamLocation = 'makkah' | 'madinah';
type QualityPreset = 'auto' | '360p' | '720p' | '1080p';

interface StreamState {
  channel: Channel | null;
  isLoading: boolean;
  error: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
}

const LOCATION_META: Record<StreamLocation, { label: string; arabic: string; color: string }> = {
  makkah: { label: 'Makkah', arabic: 'مكة المكرمة', color: 'var(--accent)' },
  madinah: { label: 'Madinah', arabic: 'المدينة المنورة', color: '#6366f1' },
};

const PLAYER_STRINGS = {
  en: {
    makkah: 'Makkah',
    madinah: 'Madinah',
    live: 'LIVE',
    offline: 'OFFLINE',
    connecting: 'Connecting to sacred stream…',
    buffering: 'Buffering',
    unavailable: 'Stream Unavailable',
    retry: 'Retry',
    auto: 'Auto (Adaptive)',
    dataSaver: '360p (Data Saver)',
    hd720: '720p HD',
    fhd1080: '1080p Full HD',
  },
  ur: {
    makkah: 'مکہ مکرمہ',
    madinah: 'مدینہ منورہ',
    live: 'براہ راست',
    offline: 'آف لائن',
    connecting: 'مقدس نشریات سے رابطہ ہو رہا ہے…',
    buffering: 'بفرنگ',
    unavailable: 'نشریات فی الوقت دستیاب نہیں',
    retry: 'دوبارہ کوشش کریں',
    auto: 'خودکار (موافق)',
    dataSaver: '360p (ڈیٹا سیور)',
    hd720: '720p ایچ ڈی',
    fhd1080: '1080p فل ایچ ڈی',
  },
  gu: {
    makkah: 'મક્કા મુકર્રમા',
    madinah: 'મદીના મુનવ્વરા',
    live: 'લાઈવ',
    offline: 'ઓફલાઇન',
    connecting: 'પવિત્ર લાઈવ સ્ટ્રીમ સાથે જોડાઈ રહ્યું છે…',
    buffering: 'બફરિંગ',
    unavailable: 'સ્ટ્રીમ ઉપલબ્ધ નથી',
    retry: 'ફરી પ્રયાસ કરો',
    auto: 'ઓટો (એડેપ્ટિવ)',
    dataSaver: '360p (ડેટા સેવર)',
    hd720: '720p એચડી',
    fhd1080: '1080p ફુલ એચડી',
  },
  hi: {
    makkah: 'मक्का मुकर्रमा',
    madinah: 'मदीना मुनव्वरा',
    live: 'लाइव',
    offline: 'ऑफ़लाइन',
    connecting: 'पवित्र लाइव प्रसारण से जुड़ रहा है…',
    buffering: 'बफ़रिंग',
    unavailable: 'स्ट्रीम अनुपलब्ध है',
    retry: 'पुनः प्रयास करें',
    auto: 'ऑटो (अनुकूली)',
    dataSaver: '360p (डेटा सेवर)',
    hd720: '720p एचडी',
    fhd1080: '1080p फुल एचडी',
  },
};

export default function IslamicStreamPlayer() {
  const { contentLang, isRtl } = useContentLanguage();
  const strings = PLAYER_STRINGS[contentLang] || PLAYER_STRINGS.en;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef = useRef<Record<StreamLocation, number>>({ makkah: 0, madinah: 0 });
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const playStartRef = useRef<number>(0);
  const isNative = Capacitor.isNativePlatform();
  const streamUrlsRef = useRef<Record<StreamLocation, { primary: string; fallback: string | null }>>({
    makkah: {
      primary: isNative ? FALLBACK_STREAMS.makkah?.nativeUrl || '' : FALLBACK_STREAMS.makkah?.webUrl || '',
      fallback: FALLBACK_STREAMS.makkah?.fallbackUrl || null,
    },
    madinah: {
      primary: isNative ? FALLBACK_STREAMS.madinah?.nativeUrl || '' : FALLBACK_STREAMS.madinah?.webUrl || '',
      fallback: FALLBACK_STREAMS.madinah?.fallbackUrl || null,
    },
  });
  const fallbackTriedRef = useRef<Record<StreamLocation, boolean>>({ makkah: false, madinah: false });
  const activeTabRef = useRef<StreamLocation>('makkah');

  const [activeTab, setActiveTab] = useState<StreamLocation>('makkah');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Quality state
  const [levels, setLevels] = useState<{ id: number, height: number, bitrate: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1); // -1 is auto
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  const [streams, setStreams] = useState<Record<StreamLocation, StreamState>>(() => ({
    makkah: {
      channel: { name: FALLBACK_STREAMS.makkah?.name || 'Al-Quran Al-Kareem (Makkah)', url: streamUrlsRef.current.makkah.primary },
      isLoading: true, error: null, isPlaying: false, isBuffering: false,
    },
    madinah: {
      channel: { name: FALLBACK_STREAMS.madinah?.name || 'As-Sunnah (Madinah)', url: streamUrlsRef.current.madinah.primary },
      isLoading: true, error: null, isPlaying: false, isBuffering: false,
    },
  }));

  const current = streams[activeTab];
  const lowEnd = isLowEndDevice();

  /* ─── Apply Quality Preset to HLS ─── */
  const applyPreset = useCallback((preset: QualityPreset, availableLevels: { id: number; height: number; bitrate: number }[]) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (preset === 'auto' || availableLevels.length === 0) {
      hls.currentLevel = -1;
      setCurrentLevel(-1);
      return;
    }

    const sortedDesc = [...availableLevels].sort((a, b) => (b.height || b.bitrate) - (a.height || a.bitrate));

    if (preset === '1080p') {
      // Find 1080p or highest available resolution
      const match = sortedDesc.find(l => l.height >= 1000) || sortedDesc[0];
      if (match) {
        hls.currentLevel = match.id;
        setCurrentLevel(match.id);
      }
    } else if (preset === '720p') {
      // Find 720p or middle/upper rendition
      const match = sortedDesc.find(l => l.height >= 700 && l.height <= 900) ||
                    sortedDesc.find(l => l.height >= 700) ||
                    (sortedDesc.length > 1 ? sortedDesc[1] : sortedDesc[0]);
      if (match) {
        hls.currentLevel = match.id;
        setCurrentLevel(match.id);
      }
    } else if (preset === '360p') {
      // Find 360p or lowest rendition
      const sortedAsc = [...availableLevels].sort((a, b) => (a.height || a.bitrate) - (b.height || b.bitrate));
      const match = sortedAsc.find(l => l.height <= 480 && l.height >= 240) || sortedAsc[0];
      if (match) {
        hls.currentLevel = match.id;
        setCurrentLevel(match.id);
      }
    }
  }, []);

  /* ─── Controls auto-hide ─── */
  const scheduleHide = useCallback(() => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3500);
  }, []);

  const showAndScheduleHide = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  /* ─── Track watch time ─── */
  const flushListenTime = useCallback(() => {
    if (playStartRef.current > 0) {
      const elapsed = Math.floor((Date.now() - playStartRef.current) / 1000);
      if (elapsed > 10) {
        const tab = activeTabRef.current;
        recordListeningTime(`live_${tab}`, `Live ${LOCATION_META[tab].label}`, elapsed);
      }
      playStartRef.current = 0;
    }
  }, []);

  /* ─── Destroy HLS ─── */
  const destroyHLS = useCallback(() => {
    flushListenTime();
    const video = videoRef.current;
    if (video) { video.pause(); video.src = ''; video.load(); }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  /* ─── Auto-retry with backoff ─── */
  const scheduleRetry = useCallback((tab: StreamLocation) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const attempt = retryCountRef.current[tab] || 0;
    if (attempt >= 3) return;
    const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
    retryCountRef.current[tab] = attempt + 1;
    retryTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const urls = streamUrlsRef.current[tab];
      const url = fallbackTriedRef.current[tab] && urls.fallback ? urls.fallback : urls.primary;
      if (url) initHLS(url, tab);
    }, delay);
  }, []);

  /* ─── Init HLS ─── */
  const initHLS = useCallback((url: string, tab: StreamLocation) => {
    const video = videoRef.current;
    if (!video) return;

    destroyHLS();
    setStreams(prev => ({
      ...prev,
      [tab]: { ...prev[tab], isLoading: true, error: null, isPlaying: false, isBuffering: false },
    }));

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: !lowEnd,
        // LL-HLS requires server-side partial-segment support. The SBA
        // Globecast/Akamai origin serves standard HLS; running lowLatencyMode
        // against it causes brief garbled ("gibberish") audio at segment
        // boundaries until the buffer resyncs, so it stays off.
        lowLatencyMode: false,
        capLevelToPlayerSize: false, // Let user or Auto handle it
        backBufferLength: 30, // Keep some history
        maxBufferLength: 60, // aggressive buffer for stability
        maxMaxBufferLength: 120,
        manifestLoadingTimeOut: 30000,
        manifestLoadingMaxRetry: 5,
        levelLoadingTimeOut: 30000,
        levelLoadingMaxRetry: 5,
        fragLoadingTimeOut: 30000,
        fragLoadingMaxRetry: 5,
        startLevel: -1, // Auto by default
      });
      hlsRef.current = hls;

      let mediaRecoveryAttempts = 0;

      hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));

      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        retryCountRef.current[tab] = 0;
        
        // Extract available quality levels
        if (data.levels && data.levels.length > 0) {
          const formattedLevels = data.levels.map((l, i) => ({
            id: i,
            height: l.height || 0,
            bitrate: l.bitrate || 0
          }));
          setLevels(formattedLevels);
          applyPreset(qualityPreset, formattedLevels);
        } else {
          setLevels([]);
        }

        setStreams(prev => ({
          ...prev,
          [tab]: { ...prev[tab], isLoading: false, isBuffering: false, isPlaying: true },
        }));
        playStartRef.current = Date.now();
        video.play().catch(() => {
          setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isPlaying: false } }));
          playStartRef.current = 0;
        });
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        
        switch (data.type) {
          case Hls.ErrorTypes.MEDIA_ERROR:
            // Fix catastrophic infinite loop on weak WiFi
            if (mediaRecoveryAttempts < 3) {
              mediaRecoveryAttempts++;
              console.warn('Recovering media error...');
              hls.recoverMediaError();
            } else if (mediaRecoveryAttempts < 6) {
              mediaRecoveryAttempts++;
              console.warn('Swapping audio codec and recovering...');
              hls.swapAudioCodec();
              hls.recoverMediaError();
            } else {
              fallbackOrError(tab);
            }
            break;
          case Hls.ErrorTypes.NETWORK_ERROR:
            fallbackOrError(tab);
            break;
          default:
            fallbackOrError(tab);
            break;
        }
      });

      hls.on(Hls.Events.BUFFER_APPENDING, () =>
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: true } })));
      hls.on(Hls.Events.BUFFER_APPENDED, () =>
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isBuffering: false } })));

      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => {
        setCurrentLevel(data.level);
      });

      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setStreams(prev => ({ ...prev, [tab]: { ...prev[tab], isLoading: false, isPlaying: true } }));
        playStartRef.current = Date.now();
        video.play().catch(() => {
          playStartRef.current = 0;
        });
      }, { once: true });
    } else {
      setStreams(prev => ({
        ...prev,
        [tab]: { ...prev[tab], error: 'HLS not supported in this browser.', isLoading: false },
      }));
    }
  }, [destroyHLS, scheduleRetry, lowEnd]);

  /* ─── On fatal error: try fallback once, then friendly error + Retry ─── */
  const fallbackOrError = useCallback((tab: StreamLocation) => {
    const urls = streamUrlsRef.current[tab];
    if (urls?.fallback && !fallbackTriedRef.current[tab]) {
      fallbackTriedRef.current[tab] = true;
      retryCountRef.current[tab] = 0;
      console.warn(`[IslamicStreamPlayer] ${tab} primary failed, switching to fallback stream...`);
      initHLS(urls.fallback, tab);
    } else {
      flushListenTime();
      setStreams(prev => ({
        ...prev,
        [tab]: { ...prev[tab], error: 'Stream temporarily unavailable. Please try again later.', isLoading: false, isBuffering: false, isPlaying: false },
      }));
      destroyHLS();
      scheduleRetry(tab);
    }
  }, [initHLS, destroyHLS, scheduleRetry, flushListenTime]);

  /* ─── Online/Offline Monitor ─── */
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      const urls = streamUrlsRef.current[activeTabRef.current];
      const url = fallbackTriedRef.current[activeTabRef.current] && urls.fallback ? urls.fallback : urls.primary;
      if (url && streams[activeTabRef.current]?.error) initHLS(url, activeTabRef.current);
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  /* ─── Mounted ref cleanup ─── */
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      flushListenTime();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [flushListenTime]);

  /* ─── Initialize stream URLs once ─── */
  useEffect(() => {
    const url = streamUrlsRef.current[activeTabRef.current].primary;
    if (url) initHLS(url, activeTabRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── Switch tab → init new stream ─── */
  useEffect(() => {
    activeTabRef.current = activeTab;
    fallbackTriedRef.current[activeTab] = false;
    const url = streamUrlsRef.current[activeTab].primary;
    if (url) initHLS(url, activeTab);
    return () => { destroyHLS(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  /* ─── Fullscreen listener ─── */
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  /* ─── Recalc video size when fullscreen state / orientation changes ─── */
  useEffect(() => {
    if (!isFullscreen) return;
    const recalc = () => {
      const video = videoRef.current;
      if (!video) return;
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'contain';
    };
    recalc();
    const t = setTimeout(recalc, 100);
    window.addEventListener('resize', recalc);
    window.addEventListener('orientationchange', recalc);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', recalc);
      window.removeEventListener('orientationchange', recalc);
    };
  }, [isFullscreen]);

  /* ─── Controls ─── */
  const handleRetry = useCallback(() => {
    const url = streamUrlsRef.current[activeTab].primary;
    if (url) {
      fallbackTriedRef.current[activeTab] = false;
      retryCountRef.current[activeTab] = 0;
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], error: null, isLoading: true } }));
      initHLS(url, activeTab);
    }
  }, [activeTab, initHLS]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], isPlaying: true } }));
      playStartRef.current = Date.now();
    } else {
      v.pause();
      flushListenTime();
      setStreams(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], isPlaying: false } }));
    }
  }, [activeTab, flushListenTime]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isMuted) { v.volume = volume || 1; setIsMuted(false); }
    else { v.volume = 0; setIsMuted(true); }
  }, [isMuted, volume]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    if (val > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

   const toggleFullscreen = useCallback(async () => {
     const el = containerRef.current;
     if (!el) return;
     try {
       if (!isFullscreen) {
         await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
         if (Capacitor.isNativePlatform()) {
           document.documentElement.requestFullscreen?.();
           (screen.orientation as any)?.lock?.('landscape').catch(() => {});
         }
       } else {
         await (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.());
         if (Capacitor.isNativePlatform()) {
           document.exitFullscreen?.();
           (screen.orientation as any)?.unlock?.();
         }
       }
     } catch (error) {
       // Handle error if needed
     }
   }, [isFullscreen]);

   const handlePresetSelect = useCallback((preset: QualityPreset) => {
     setQualityPreset(preset);
     applyPreset(preset, levels);
     setShowQualityMenu(false);
   }, [applyPreset, levels]);

   const qualityBadge = useMemo(() => {
     if (qualityPreset === '1080p') return '1080p FHD';
     if (qualityPreset === '720p') return '720p HD';
     if (qualityPreset === '360p') return '360p';
     return 'AUTO';
   }, [qualityPreset]);

  return (
    <div
      ref={containerRef}
      className={`select-none w-full text-white rounded-[28px] overflow-hidden bg-[#080c14] shadow-2xl border border-[var(--border)] ${isFullscreen ? 'fixed top-0 left-0 rounded-none flex flex-col' : 'relative'}`}
      style={isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#000',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      } : undefined}
      onMouseMove={showAndScheduleHide}
      onTouchStart={showAndScheduleHide}
    >
      {/* ── Location Switcher ── */}
      <div className={`flex items-center gap-1 p-3 bg-gradient-to-b from-black/80 to-transparent ${isRtl ? 'flex-row-reverse' : ''}`}>
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/6 backdrop-blur-md border border-[var(--border)] flex-1">
          {(['makkah', 'madinah'] as StreamLocation[]).map(loc => {
            const m = LOCATION_META[loc];
            const active = activeTab === loc;
            const label = loc === 'makkah' ? strings.makkah : strings.madinah;
            return (
              <button
                key={loc}
                onClick={() => setActiveTab(loc)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  active
                    ? 'text-white shadow-lg'
                    : 'text-white/50 hover:text-white/80'
                }`}
                style={active ? { background: `linear-gradient(135deg, ${m.color}cc, ${m.color}88)` } : {}}
              >
                <span className={`text-xs font-black tracking-wide uppercase ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{label}</span>
                <span className="text-xs font-normal opacity-80 font-arabic">{m.arabic}</span>
              </button>
            );
          })}
        </div>

        {/* Live badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ml-2 transition-all ${
          current.isPlaying
            ? 'bg-red-500/20 border-red-500/40 text-red-400'
            : 'bg-white/6 border-[var(--border)] text-white/40'
        }`}>
          <span className={`w-2 h-2 rounded-full ${current.isPlaying ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
          <span className={contentLang === 'ur' ? 'font-urdu text-[11px]' : ''}>{strings.live}</span>
        </div>
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ml-1 bg-amber-500/20 border-amber-500/40 text-amber-400 shrink-0">
            <WifiOff className="w-3.5 h-3.5" />
            <span className={contentLang === 'ur' ? 'font-urdu text-[11px]' : ''}>{strings.offline}</span>
          </div>
        )}
      </div>

      {/* ── Video Area ── */}
      <div
        className={`relative w-full bg-black ${isFullscreen ? 'h-full' : ''}`}
        style={isFullscreen ? { aspectRatio: 'auto', flex: 1 } : { aspectRatio: '16/9' }}
        onClick={() => { if (!current.isLoading && !current.error) { togglePlay(); showAndScheduleHide(); } }}
      >
        <video
          ref={videoRef}
          className={`${isFullscreen ? 'absolute inset-0' : 'relative'} w-full h-full object-contain`}
          style={{
            ...(isFullscreen ? { width: '100%', height: '100%', objectFit: 'contain' as const } : {}),
            filter: (qualityPreset === '720p' || qualityPreset === '1080p') ? 'contrast(1.04) saturate(1.05)' : 'none',
          }}
          playsInline
          muted={isMuted}
        />

        {/* Loading overlay */}
        {current.isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-[var(--accent)]/20" />
              <div className="absolute inset-0 rounded-full border-[3px] border-t-[var(--accent)] animate-spin" />
              <Radio className="absolute inset-0 m-auto w-6 h-6 text-[var(--accent)] animate-pulse" />
            </div>
            <p className={`text-white/70 text-sm font-medium ${contentLang === 'ur' ? 'font-urdu text-base' : ''}`}>
              {strings.connecting}
            </p>
          </div>
        )}

        {/* Buffering overlay */}
        {current.isBuffering && !current.isLoading && (
          <div className="absolute top-3 right-3">
            <div className="bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-2 border border-[var(--border)]">
              <Loader2 className="w-3.5 h-3.5 text-[var(--accent)] animate-spin" />
              <span className={`text-xs text-white/70 font-medium ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
                {strings.buffering}
              </span>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {current.error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black/80 backdrop-blur-sm p-6">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
              <WifiOff className="w-8 h-8 text-red-400" />
            </div>
            <div className="text-center space-y-1.5">
              <p className={`text-white font-semibold ${contentLang === 'ur' ? 'font-urdu text-lg' : ''}`}>
                {strings.unavailable}
              </p>
              <p className="text-white/50 text-sm max-w-xs">{current.error}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); handleRetry(); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-[var(--on-accent)] font-bold text-sm transition-opacity ${contentLang === 'ur' ? 'font-urdu' : ''}`}
            >
              <RefreshCw className="w-4 h-4" />
              {strings.retry}
            </button>
          </div>
        )}

        {/* Center play button — shows when paused and loaded */}
        {!current.isLoading && !current.error && !current.isPlaying && showControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-18 h-18 rounded-full bg-black/50 backdrop-blur-md border border-[var(--border)] flex items-center justify-center w-20 h-20">
              <Play className="w-9 h-9 text-white ml-1" />
            </div>
          </div>
        )}

        {/* Channel name toast */}
        {current.channel?.name && current.isPlaying && showControls && (
          <div className="absolute top-3 left-3 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 border border-[var(--border)]">
              <MonitorPlay className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="text-xs text-white/80 font-medium">{current.channel.name}</span>
            </div>
          </div>
        )}

        {/* ── Bottom Controls Bar ── */}
        <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls || !current.isPlaying ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent px-4 pt-8 pb-4">
            <div className="flex items-center justify-between gap-3">

              {/* Left: Play + Volume */}
              <div className="flex items-center gap-3">
                <button
                  onClick={e => { e.stopPropagation(); togglePlay(); }}
                  disabled={current.isLoading}
                  className="w-10 h-10 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors disabled:opacity-40"
                >
                  {current.isLoading
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : current.isPlaying
                      ? <Pause className="w-5 h-5" />
                      : <Play className="w-5 h-5 ml-0.5" />
                  }
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); toggleMute(); }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  >
                    {isMuted || volume === 0
                      ? <VolumeX className="w-4 h-4 text-white/70" />
                      : <Volume2 className="w-4 h-4 text-white/70" />
                    }
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    onClick={e => e.stopPropagation()}
                    className="w-20 h-1 accent-[var(--accent)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Right: Quality + Fullscreen */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-44 bg-black/95 backdrop-blur-md rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col z-50 py-1.5 shadow-2xl">
                      <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-white/10">
                        Resolution
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); handlePresetSelect('auto'); }}
                        className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreset === 'auto' ? 'text-[var(--accent)] font-bold' : 'text-white'}`}
                      >
                        <span>{strings.auto}</span>
                        {qualityPreset === 'auto' && <span className="text-[10px] text-[var(--accent)]">●</span>}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handlePresetSelect('1080p'); }}
                        className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreset === '1080p' ? 'text-[var(--accent)] font-bold' : 'text-white'}`}
                      >
                        <span>{strings.fhd1080}</span>
                        {qualityPreset === '1080p' && <span className="text-[10px] text-[var(--accent)]">●</span>}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handlePresetSelect('720p'); }}
                        className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreset === '720p' ? 'text-[var(--accent)] font-bold' : 'text-white'}`}
                      >
                        <span>{strings.hd720}</span>
                        {qualityPreset === '720p' && <span className="text-[10px] text-[var(--accent)]">●</span>}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handlePresetSelect('360p'); }}
                        className={`px-3 py-2 text-xs font-semibold text-left hover:bg-white/10 transition-colors flex items-center justify-between ${qualityPreset === '360p' ? 'text-[var(--accent)] font-bold' : 'text-white'}`}
                      >
                        <span>{strings.dataSaver}</span>
                        {qualityPreset === '360p' && <span className="text-[10px] text-[var(--accent)]">●</span>}
                      </button>
                    </div>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setShowQualityMenu(p => !p); showAndScheduleHide(); }}
                    className="h-8 px-3 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-xs font-bold tracking-wide border border-white/15"
                  >
                    {qualityBadge}
                  </button>
                </div>
                
                <button
                  onClick={e => { e.stopPropagation(); toggleFullscreen(); }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4 text-white/70" /> : <Maximize className="w-4 h-4 text-white/70" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
