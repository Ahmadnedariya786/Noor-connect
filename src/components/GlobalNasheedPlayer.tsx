import { useEffect, useRef, useState, useCallback } from "react";
import { Pause, Play, X, Music, ChevronDown, SkipBack, SkipForward, Shuffle, Repeat, Repeat1, Wifi, WifiOff } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Slider } from "./ui/slider";
import { useGlobalNasheed, setGlobalNasheedAudioRef } from "@/lib/global-nasheed";
import { nasheedCache } from "@/lib/nasheed-cache";
import { useGlobalRadio } from "@/lib/global-radio";
import { useGlobalQuran } from "@/lib/global-quran";
import { Equalizer } from "./Equalizer";

const formatTime = (time: number): string => {
    if (!time || isNaN(time) || !isFinite(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ── Robust safe-play helper ───────────────────────────────────────────────────
// Wraps audio.play() to silently swallow AbortError (caused by rapid track
// switching interrupting an in-flight play() promise) and optionally runs a
// callback on real errors.
const safePlay = (
    audio: HTMLAudioElement,
    onRealError?: (err: unknown) => void
): void => {
    const promise = audio.play();
    if (promise !== undefined) {
        promise.catch((err: unknown) => {
            if (err instanceof DOMException && err.name === 'AbortError') {
                // Intentional: a new track was loaded before play() resolved.
                // This is not an error — just swallow it.
                return;
            }
            // Any other error (NotAllowedError, NetworkError, etc.) is real.
            onRealError?.(err);
        });
    }
};

export function GlobalNasheedPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);

    // ── Generation counter ─────────────────────────────────────────────────
    // Every time we load a new track we bump this. Any async callback that
    // captures an older generation number knows it's stale and bails out.
    // This eliminates the "play Track A, immediately click Track B → both
    // resolve and fight over the audio element" race condition.
    const generationRef = useRef(0);

    // Prevents re-entrant play/pause calls while a transition is in-flight
    const isTransitioningRef = useRef(false);

    // Track whether user is dragging the seek slider
    const seekDraggingRef = useRef(false);

    // Direct DOM ref for the mini-player progress bar — updated without React re-renders
    const progressBarRef = useRef<HTMLDivElement>(null);
    // Throttle: timestamp of last React state update from timeupdate
    const lastStateUpdateRef = useRef(0);

    // Retry state for weak-WiFi recovery
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const MAX_RETRIES = 3;
    const RETRY_DELAYS_MS = [1500, 3000, 5000]; // exponential backoff

    const {
        isPlaying, currentTrack, volume, progress, duration,
        repeatMode, isShuffled, queue, currentIndex,
        updateState, pause, resume, setProgress, setDuration,
        nextTrack, prevTrack, toggleShuffle, cycleRepeat,
    } = useGlobalNasheed();

    const { isPlaying: isRadioPlaying, updateRadioState } = useGlobalRadio();
    const { isPlaying: isQuranPlaying, pause: pauseQuran } = useGlobalQuran();

    const [isExpanded, setIsExpanded] = useState(false);

    // ── Loading / buffering state ──────────────────────────────────────────
    // 'idle'      → no track loaded
    // 'loading'   → src set, waiting for canplay
    // 'buffering' → playing but network stalled (weak WiFi indicator)
    // 'ready'     → ready to play
    type AudioStatus = 'idle' | 'loading' | 'buffering' | 'ready' | 'error';
    const [audioStatus, setAudioStatus] = useState<AudioStatus>('idle');
    const [seekValue, setSeekValue] = useState(0);

    useEffect(() => {
        setGlobalNasheedAudioRef(audioRef.current);
        return () => setGlobalNasheedAudioRef(null);
    }, []);

    // ── Cancel any pending retry ───────────────────────────────────────────
    const cancelRetry = useCallback(() => {
        if (retryTimerRef.current) {
            clearTimeout(retryTimerRef.current);
            retryTimerRef.current = null;
        }
        retryCountRef.current = 0;
    }, []);

    // ── Core: load a new audio source ─────────────────────────────────────
    // This is the ONLY place we set audio.src / audio.load().
    // We bump the generation counter so any in-flight promises become stale.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (!currentTrack) {
            // No track → stop everything
            if (!audio.paused) audio.pause();
            audio.removeAttribute('src');
            setAudioStatus('idle');
            cancelRetry();
            return;
        }

        const myGeneration = ++generationRef.current;
        cancelRetry();

        // Pause first — this resolves any in-flight play() promise as
        // AbortError (which safePlay() silently swallows), preventing the
        // "play interrupted by new load" console error.
        if (!audio.paused) {
            audio.pause();
        }

        setAudioStatus('loading');
        isTransitioningRef.current = true;
        audio.src = currentTrack.url;
        audio.preload = 'auto';
        audio.load();

        // After canplay fires (handled in the event listener effect below),
        // we attempt play — but only if this generation is still current.
        // We store the generation at load-time in a closure for that check.
        // (No actual play() call here — let the event handlers drive it.)

        return () => {
            // If this effect re-runs before canplay, bump generation again
            // to invalidate stale closures.
            if (generationRef.current === myGeneration) {
                // Don't bump here — the next effect invocation will do it.
            }
        };
    }, [currentTrack?.url]); // Only re-run when URL actually changes

    // ── Play / Pause sync ──────────────────────────────────────────────────
    // Responds to isPlaying flag changes that DON'T require a source change.
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audio.src) return;

        if (isPlaying && audio.paused && audioStatus === 'ready') {
            // Pause competing players first
            if (isRadioPlaying) updateRadioState({ isPlaying: false });
            if (isQuranPlaying) pauseQuran();

            safePlay(audio, () => {
                updateState({ isPlaying: false });
                setAudioStatus('error');
            });
        } else if (!isPlaying && !audio.paused) {
            audio.pause();
        }
    }, [isPlaying]);

    // ── Pause Nasheed when Radio/Quran starts ──────────────────────────────
    useEffect(() => {
        if ((isRadioPlaying || isQuranPlaying) && isPlaying) {
            pause();
        }
    }, [isRadioPlaying, isQuranPlaying]);

    // ── Volume sync ────────────────────────────────────────────────────────
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = Math.max(0, Math.min(1, volume / 100));
        }
    }, [volume]);

    // ── Seek sync (for prevTrack restart) ─────────────────────────────────
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || seekDraggingRef.current) return;
        if (progress === 0 && audio.currentTime > 1) {
            audio.currentTime = 0;
        }
    }, [progress]);

    // ── Audio element event listeners ──────────────────────────────────────
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleCanPlay = () => {
            // Guard: only act if we're still on the same generation
            const currentGen = generationRef.current;
            setAudioStatus('ready');
            isTransitioningRef.current = false;
            retryCountRef.current = 0; // reset retry counter on success

            if (isPlaying) {
                if (isRadioPlaying) updateRadioState({ isPlaying: false });
                if (isQuranPlaying) pauseQuran();

                safePlay(audio, () => {
                    // Only update state if still on this generation
                    if (generationRef.current === currentGen) {
                        updateState({ isPlaying: false });
                        setAudioStatus('error');
                    }
                });
            }
        };

        const handleTimeUpdate = () => {
            if (seekDraggingRef.current) return;

            const t = audio.currentTime;
            const dur = audio.duration;

            // ── Direct DOM update for progress bar (ZERO React re-renders) ──
            if (progressBarRef.current && dur && isFinite(dur) && dur > 0) {
                progressBarRef.current.style.width = `${(t / dur) * 100}%`;
            }

            // ── Throttle React/global state updates to max once per second ──
            const now = performance.now();
            if (now - lastStateUpdateRef.current > 1000) {
                lastStateUpdateRef.current = now;
                setSeekValue(t);
                setProgress(t); // global store — notifies all listeners
                if (dur && isFinite(dur)) setDuration(dur);
            }
        };

        const handleEnded = () => {
            if (repeatMode === 'one') {
                audio.currentTime = 0;
                safePlay(audio);
                return;
            }
            nextTrack();
        };

        // ── Weak WiFi: buffering events ────────────────────────────────────
        const handleWaiting = () => {
            // Audio is starved — network is too slow to keep up
            setAudioStatus('buffering');
        };

        const handlePlaying = () => {
            // Playback resumed after buffering stall
            setAudioStatus('ready');
            isTransitioningRef.current = false;
        };

        const handleStalled = () => {
            // Browser gave up fetching — treat same as buffering
            setAudioStatus('buffering');
        };

        // ── Network error with exponential-backoff retry ───────────────────
        const handleError = () => {
            const err = audio.error;

            // Ignore abort errors — these are intentional (track switch)
            if (err?.code === MediaError.MEDIA_ERR_ABORTED) return;

            // Ignore errors on empty/stale sources
            if (!audio.src || audio.src === window.location.href) return;

            const currentGen = generationRef.current;

            if (retryCountRef.current < MAX_RETRIES) {
                const attempt = retryCountRef.current;
                retryCountRef.current++;
                const delay = RETRY_DELAYS_MS[attempt] ?? 5000;

                setAudioStatus('buffering'); // show "slow connection" UI
                retryTimerRef.current = setTimeout(() => {
                    if (generationRef.current !== currentGen) return; // stale
                    // Force reload same URL with cache-bust
                    const url = currentTrack?.url;
                    if (!url) return;
                    audio.src = `${url}${url.includes('?') ? '&' : '?'}_retry=${Date.now()}`;
                    audio.load();
                    // canplay will trigger play again
                }, delay);
            } else {
                // Exhausted retries
                cancelRetry();
                setAudioStatus('error');
                updateState({ isPlaying: false });
                isTransitioningRef.current = false;
            }
        };

        const handleLoadStart = () => setAudioStatus('loading');

        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('waiting', handleWaiting);
        audio.addEventListener('playing', handlePlaying);
        audio.addEventListener('stalled', handleStalled);
        audio.addEventListener('error', handleError);
        audio.addEventListener('loadstart', handleLoadStart);

        return () => {
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('waiting', handleWaiting);
            audio.removeEventListener('playing', handlePlaying);
            audio.removeEventListener('stalled', handleStalled);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadstart', handleLoadStart);
        };
    }, [isPlaying, repeatMode, currentTrack?.url]);

    // ── Pre-fetch next track in queue for instant "next" ─────────────────────
    // The service worker caches the response (CacheFirst), so when the user
    // advances to the next track, it loads from cache — no buffering on weak WiFi.
    useEffect(() => {
        const next = queue[currentIndex + 1];
        if (next) {
            nasheedCache.preload(next.url);
        }
    }, [currentTrack?.url, queue, currentIndex]);

    // ── Media Session API ──────────────────────────────────────────────────
    useEffect(() => {
        if (!('mediaSession' in navigator) || !currentTrack) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title,
            artist: currentTrack.artist,
            album: 'Noor Nasheed Player',
            artwork: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
        });
        navigator.mediaSession.setActionHandler('play', resume);
        navigator.mediaSession.setActionHandler('pause', pause);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);

        return () => {
            navigator.mediaSession.setActionHandler('play', null);
            navigator.mediaSession.setActionHandler('pause', null);
            navigator.mediaSession.setActionHandler('nexttrack', null);
            navigator.mediaSession.setActionHandler('previoustrack', null);
        };
    }, [currentTrack]);

    if (!currentTrack) return <audio ref={audioRef} preload="none" />;

    const togglePlayback = () => {
        if (isTransitioningRef.current) return; // debounce rapid taps
        if (isPlaying) pause();
        else resume();
    };

    const isLoading = audioStatus === 'loading';
    const isBuffering = audioStatus === 'buffering';
    const isError = audioStatus === 'error';
    const showSpinner = isLoading || isBuffering;

    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < queue.length - 1 || repeatMode === 'all';
    const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;
    const repeatActive = repeatMode !== 'none';

    // ── Mini Player ────────────────────────────────────────────────────────
    if (!isExpanded) {
        return (
            <>
                <audio ref={audioRef} preload="auto" playsInline />
                <div className="fixed bottom-24 left-0 right-0 z-[100] px-4">
                    {/* Plain div with inline style — guaranteed dark regardless of light/dark theme */}
                    <div
                        className="w-full max-w-lg mx-auto backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden animate-in slide-in-from-bottom border border-white/10"
                        style={{ background: 'rgba(24,24,27,0.97)', color: '#fff' }}
                    >
                        {/* Progress bar — clickable to seek */}
                        <div
                            className="h-1.5 bg-white/10 cursor-pointer relative group"
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                                const percentage = x / rect.width;
                                const newTime = percentage * duration;
                                if (audioRef.current && isFinite(newTime)) {
                                    audioRef.current.currentTime = newTime;
                                    setProgress(newTime);
                                    setSeekValue(newTime);
                                }
                            }}
                        >
                            {/* Hover hit area expansion */}
                            <div className="absolute inset-y-[-8px] inset-x-0" />
                            <div
                                ref={progressBarRef}
                                className="h-full bg-emerald-500 group-hover:bg-emerald-400 relative"
                                style={{ width: '0%', transition: 'none' }}
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-sm translate-x-1/2 transition-opacity" />
                            </div>
                        </div>

                        <div className="p-2 pr-3 flex items-center justify-between gap-3">
                            {/* Track info */}
                            <div
                                className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer min-w-0"
                                onClick={() => setIsExpanded(true)}
                            >
                                <div
                                    className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border border-white/10 ${
                                        isPlaying && !showSpinner ? 'animate-pulse' : ''
                                    }`}
                                    style={{ background: isError ? 'rgba(239,68,68,0.2)' : isPlaying && !showSpinner ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}
                                >
                                    {showSpinner ? (
                                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full" />
                                    ) : isError ? (
                                        <WifiOff className="w-4 h-4 text-red-400" />
                                    ) : (
                                        <Music className="w-4 h-4 text-emerald-400" />
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-sm truncate leading-none mb-0.5" style={{ color: '#fff' }}>{currentTrack.title}</p>
                                    <p className="text-[11px] truncate leading-none uppercase tracking-wider font-medium" style={{ color: '#a1a1aa' }}>
                                        {isBuffering ? '● Buffering…' : isError ? 'Retrying…' : currentTrack.artist}
                                    </p>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                                <Button size="icon" variant="ghost" onClick={prevTrack} disabled={!hasPrev || showSpinner} className="hover:bg-white/10 rounded-full w-8 h-8 disabled:opacity-30" style={{ color: '#a1a1aa' }}>
                                    <SkipBack className="w-4 h-4 fill-current" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={togglePlayback} className="hover:bg-white/10 rounded-full w-9 h-9" style={{ color: '#fff' }}>
                                    {showSpinner ? (
                                        <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent animate-spin rounded-full" />
                                    ) : isPlaying ? (
                                        <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                        <Play className="w-4 h-4 fill-current ml-0.5" />
                                    )}
                                </Button>
                                <Button size="icon" variant="ghost" onClick={nextTrack} disabled={!hasNext || showSpinner} className="hover:bg-white/10 rounded-full w-8 h-8 disabled:opacity-30" style={{ color: '#a1a1aa' }}>
                                    <SkipForward className="w-4 h-4 fill-current" />
                                </Button>
                                <Button size="icon" variant="ghost" onClick={() => { pause(); updateState({ currentTrack: null, queue: [], currentIndex: -1 }); cancelRetry(); }} className="hover:bg-white/10 rounded-full w-7 h-7" style={{ color: '#52525b' }}>
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // ── Expanded Modal ─────────────────────────────────────────────────────
    return (
        <>
            <audio ref={audioRef} preload="auto" playsInline />
            <div
                className="fixed inset-0 bg-black/80 z-[100] flex items-end justify-center backdrop-blur-sm animate-in fade-in p-4 pb-8"
                onClick={() => setIsExpanded(false)}
            >
                <div
                    className="w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-300 rounded-3xl overflow-hidden border border-white/10"
                    style={{ background: '#18181b', color: '#fff' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-bold mb-1">Now Playing</p>
                            <p className="text-xs text-emerald-400 font-medium">
                                {currentIndex + 1} / {queue.length} tracks
                            </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-white/10 text-zinc-400 hover:text-white">
                            <ChevronDown className="w-5 h-5" />
                        </Button>
                    </div>

                    {/* Album Art */}
                    <div className="mx-5 mb-5">
                        <div className="aspect-square bg-gradient-to-br from-emerald-900 via-teal-900 to-zinc-900 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden shadow-inner border border-white/5">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,_rgba(16,185,129,0.2)_0%,_transparent_60%)]" />

                            {showSpinner ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 animate-spin rounded-full" />
                                    <p className="text-xs text-zinc-400 animate-pulse">
                                        {isBuffering ? 'Buffering… slow connection detected' : 'Loading…'}
                                    </p>
                                    {isBuffering && <Wifi className="w-5 h-5 text-amber-400 opacity-70 animate-pulse" />}
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center gap-3">
                                    <WifiOff className="w-12 h-12 text-red-400/50" />
                                    <p className="text-xs text-zinc-400 text-center px-6">
                                        Connection failed. Retrying…<br />
                                        <span className="text-zinc-600">Check your internet connection</span>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Music className={`w-28 h-28 text-emerald-500/40 ${isPlaying ? 'animate-pulse' : ''}`} />
                                    {isPlaying && (
                                        <Equalizer
                                            bars={5}
                                            barWidth="w-1.5"
                                            barColor="bg-emerald-400"
                                            heightClass="h-8"
                                            gapClass="gap-1"
                                            className="absolute bottom-4"
                                            delayStep={100}
                                            durationBase={600}
                                            durationStep={100}
                                            heightPercent={(i) => 40 + Math.sin(i * 1.5) * 30}
                                        />
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Track Info */}
                    <div className="px-5 mb-4">
                        <h3 className="font-bold text-xl text-white truncate leading-tight">{currentTrack.title}</h3>
                        <p className="text-sm text-emerald-400 font-medium mt-0.5 truncate">{currentTrack.artist}</p>
                    </div>

                    {/* Seek Bar */}
                    <div className="px-5 mb-4 space-y-2">
                        <Slider
                            value={[seekValue]}
                            max={duration || 100}
                            step={0.1}
                            disabled={isLoading}
                            onValueChange={([v]) => {
                                seekDraggingRef.current = true;
                                setSeekValue(v);
                            }}
                            onValueCommit={([v]) => {
                                seekDraggingRef.current = false;
                                if (audioRef.current && audioRef.current.readyState >= 2) {
                                    audioRef.current.currentTime = v;
                                }
                                setProgress(v);
                                setSeekValue(v);
                            }}
                            className="cursor-pointer [&_[role=slider]]:bg-emerald-400 [&_[role=slider]]:border-0"
                        />
                        <div className="flex justify-between text-xs font-mono text-zinc-500">
                            <span>{formatTime(seekValue)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="px-5 mb-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" size="icon" onClick={toggleShuffle}
                                className={`rounded-full w-10 h-10 transition-all ${isShuffled ? 'text-emerald-400 bg-emerald-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}>
                                <Shuffle className="w-4 h-4" />
                            </Button>

                            <Button size="icon" variant="ghost" onClick={prevTrack} disabled={!hasPrev}
                                className="text-white hover:text-emerald-400 hover:bg-white/10 rounded-full w-12 h-12 disabled:opacity-30">
                                <SkipBack className="w-6 h-6 fill-current" />
                            </Button>

                            <Button size="icon" onClick={togglePlayback}
                                className="h-16 w-16 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform bg-emerald-500 hover:bg-emerald-400 text-white border-0">
                                {showSpinner ? (
                                    <div className="w-6 h-6 border-4 border-white border-t-transparent animate-spin rounded-full" />
                                ) : isPlaying ? (
                                    <Pause className="w-8 h-8 fill-current" />
                                ) : (
                                    <Play className="w-8 h-8 ml-1 fill-current" />
                                )}
                            </Button>

                            <Button size="icon" variant="ghost" onClick={nextTrack} disabled={!hasNext}
                                className="text-white hover:text-emerald-400 hover:bg-white/10 rounded-full w-12 h-12 disabled:opacity-30">
                                <SkipForward className="w-6 h-6 fill-current" />
                            </Button>

                            <Button variant="ghost" size="icon" onClick={cycleRepeat}
                                className={`rounded-full w-10 h-10 transition-all ${repeatActive ? 'text-emerald-400 bg-emerald-500/20' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}>
                                <RepeatIcon className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Volume */}
                    <div className="px-5 pb-6 flex items-center gap-3">
                        <span className="text-lg select-none">🔈</span>
                        <Slider
                            value={[volume]}
                            max={100}
                            onValueChange={([v]) => updateState({ volume: v })}
                            className="flex-1"
                        />
                        <span className="text-lg select-none">🔊</span>
                    </div>
                </div>
            </div>
        </>
    );
}
