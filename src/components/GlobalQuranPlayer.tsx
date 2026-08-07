import { useEffect, useRef, useState, useMemo } from "react";
import { useReciters } from "@/hooks/useReciters";
import { AlertCircle, Pause, Play, User, Volume2, X, ChevronUp, ChevronDown, Repeat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { androidAudioHelper } from "@/lib/android-audio-helper";
import { useGlobalRadio } from "@/lib/global-radio"; // To pause radio
import { useGlobalQuran, setGlobalQuranAudioRef, Reciter } from "@/lib/global-quran";
import { downloadManager } from "@/lib/download-manager";

const formatTime = (time: number): string => {
    if (!time || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const RECITER_STORAGE_KEY = 'mp3quran-selected-reciter';

export function GlobalQuranPlayer() {
    const audioRef = useRef<HTMLAudioElement>(null);
    const {
        isPlaying, surahNumber, surahName, reciter, volume, progress, duration, isBackgroundMode,
        updateState, playSurah, pause, resume, setProgress, setDuration
    } = useGlobalQuran();

    const { isPlaying: isRadioPlaying, updateRadioState: updateRadioState } = useGlobalRadio();

    const [isExpanded, setIsExpanded] = useState(false);
    // Local seek position drives the slider + time labels at full update rate
    // WITHOUT touching the global store (which notifies every useGlobalQuran
    // consumer and writes localStorage). Global progress is pushed at ~1Hz.
    const [seekValue, setSeekValue] = useState(0);
    const lastProgressPushRef = useRef(0);

    // Use shared reciter hook
    const { reciters, isLoading: isReciterLoading, error: fetchError } = useReciters();
    const [isAudioLoading, setIsAudioLoading] = useState(false);
    const isLoading = isReciterLoading || isAudioLoading;

    // Initialize Global Ref
    useEffect(() => {
        setGlobalQuranAudioRef(audioRef.current);
    }, []);

    // Set default reciter when loaded
    useEffect(() => {
        if (!reciters.length || reciter) return;

        const savedId = localStorage.getItem(RECITER_STORAGE_KEY);
        if (savedId) {
            const saved = reciters.find(r => r.id === savedId);
            if (saved) updateState({ reciter: saved });
        } else {
            const defaultReciter = reciters.find(r => r.name.includes('Mishary')) || reciters[0];
            if (defaultReciter) updateState({ reciter: defaultReciter });
        }
    }, [reciters, reciter]);

    const { toast } = useToast();

    // Sync Audio Source
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !surahNumber || !reciter) return;

        // Check availability
        if (reciter.surahList && !reciter.surahList.includes(surahNumber)) {
            console.warn(`Surah ${surahNumber} not available for reciter ${reciter.name}`);
            toast({
                title: "Recitation Unavailable",
                description: `This reciter does not have a recording for Surah ${surahName}.`,
                variant: "destructive"
            });
            return;
        }

        const loadAudio = async () => {
            // Check if downloaded
            let sourceUrl = "";
            try {
                const blob = await downloadManager.getSurah(reciter.id, surahNumber);
                if (blob) {
                    sourceUrl = URL.createObjectURL(blob);
                    console.log(`Playing from Offline Cache: ${surahNumber}`);
                } else {
                    const paddedSurah = surahNumber.toString().padStart(3, '0');
                    const server = reciter.server.endsWith('/') ? reciter.server : `${reciter.server}/`;
                    sourceUrl = `${server}${paddedSurah}.mp3`;
                    console.log(`Streaming from Network: ${sourceUrl}`);
                }
            } catch (e) {
                console.error("Offline check failed, falling back to network", e);
                const paddedSurah = surahNumber.toString().padStart(3, '0');
                const server = reciter.server.endsWith('/') ? reciter.server : `${reciter.server}/`;
                sourceUrl = `${server}${paddedSurah}.mp3`;
            }

            if (audio.src !== sourceUrl) {
                setIsAudioLoading(true);
                audio.src = sourceUrl;
                audio.load();
                if (isPlaying) {
                    audio.play().catch(e => {
                        console.error("Play failed", e);
                    });
                }
            }
        };

        loadAudio();
    }, [surahNumber, reciter?.id, isPlaying]); // Depend on ID to trigger change

    // Sync the local seek display whenever a new track is loaded (new surah
    // starts at 0, same-surah resume restores the persisted position).
    useEffect(() => {
        setSeekValue(progress);
    }, [surahNumber, reciter?.id]);

    // Handle Play/Pause State
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying && audio.paused && audio.src) {
            // Pause Radio if it conflicts
            if (isRadioPlaying) updateRadioState({ isPlaying: false });

            audio.play().catch(e => {
                console.error("Play request failed", e);
                updateState({ isPlaying: false });
            });
        } else if (!isPlaying && !audio.paused) {
            audio.pause();
        }
    }, [isPlaying, isRadioPlaying]);

    // Pause Quran if Radio starts
    useEffect(() => {
        if (isRadioPlaying && isPlaying) {
            updateState({ isPlaying: false });
        }
    }, [isRadioPlaying]);

    // Handle Volume
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume / 100;
    }, [volume]);

    // Audio Event Listeners
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            const t = audio.currentTime;
            const dur = audio.duration || 0;
            // Smooth local UI: re-render only this component (~4Hz).
            setSeekValue(t);
            // Global store: throttle to ~1Hz so listeners + localStorage
            // writes don't run at timeupdate rate.
            const now = performance.now();
            if (now - lastProgressPushRef.current > 1000) {
                lastProgressPushRef.current = now;
                setProgress(t);
                if (dur && isFinite(dur)) setDuration(dur);
            }
        };
        const handleEnded = () => {
            setSeekValue(0);
            updateState({ isPlaying: false, progress: 0 });
        };
        const handleCanPlay = () => setIsAudioLoading(false);
        const handleError = () => {
            setIsAudioLoading(false);
            updateState({ isPlaying: false });
            console.error("Audio error", audio.error);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('error', handleError);
        };
    }, []);

    // Media Session
    useEffect(() => {
        if ('mediaSession' in navigator && surahName && reciter) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: surahName,
                artist: reciter.name,
                album: 'Quran Recitation',
                artwork: [{ src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' }]
            });

            navigator.mediaSession.setActionHandler('play', resume);
            navigator.mediaSession.setActionHandler('pause', pause);

            return () => {
                navigator.mediaSession.setActionHandler('play', null);
                navigator.mediaSession.setActionHandler('pause', null);
            };
        }
    }, [surahName, reciter]);

    // Render nothing if no surah selected
    if (!surahNumber) return <audio ref={audioRef} />;

    const togglePlayback = () => {
        if (isPlaying) pause();
        else resume();
    };

    const handleReciterChange = (id: string) => {
        const newReciter = reciters.find(r => r.id === id);
        if (newReciter) {
            updateState({ reciter: newReciter });
            localStorage.setItem(RECITER_STORAGE_KEY, id);
        }
    };

    // Mini Player (Floating Glass Pill)
    if (!isExpanded) {
        return (
            <>
                <audio ref={audioRef} />
                <div className="fixed bottom-24 left-0 right-0 z-[100] px-4">
                    <Card className="w-full max-w-lg mx-auto bg-zinc-900/95 backdrop-blur-md text-white border-white/10 shadow-2xl rounded-full p-2 pr-4 flex items-center justify-between transition-transform duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom border">
                        {/* Clickable Area to Expand */}
                        <div className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer" onClick={() => setIsExpanded(true)}>
                            {/* Rotating Vinyl Icon */}
                            <div className={`w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-white/10 ${isPlaying ? 'animate-spin-slow' : ''}`}>
                                <Play className="w-4 h-4 text-primary fill-current" />
                            </div>

                            <div className="min-w-0 pr-2">
                                <p className="font-bold text-sm truncate leading-none mb-1 text-white">{surahName}</p>
                                <p className="text-xs text-zinc-400 truncate leading-none uppercase tracking-wider font-medium">{reciter?.name}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="ghost" onClick={togglePlayback} disabled={isLoading} className="text-white hover:text-primary hover:bg-white/10 rounded-full w-9 h-9">
                                {isLoading ? (
                                    <div className="w-4 h-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                                ) : isPlaying ? (
                                    <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                            </Button>

                            {/* Close/Stop Button */}
                            <Button size="icon" variant="ghost" onClick={() => { pause(); updateState({ surahNumber: null }); }} className="text-zinc-500 hover:text-destructive hover:bg-white/10 rounded-full w-8 h-8">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </Card>
                </div>
            </>
        );
    }

    // Expanded Player (Popup Modal)
    return (
        <>
            <audio ref={audioRef} />
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm animate-in fade-in p-4" onClick={() => setIsExpanded(false)}>
                <Card className="w-full max-w-md bg-card border-border shadow-2xl animate-in zoom-in-95 duration-200 p-6 space-y-6" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b pb-4">
                        <div>
                            <h3 className="font-bold text-xl">{surahName}</h3>
                            <p className="text-sm text-primary font-medium">{reciter?.name}</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="rounded-full hover:bg-muted">
                            <ChevronDown className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Reciter Select */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reciter</label>
                            <Select value={reciter?.id} onValueChange={handleReciterChange}>
                                <SelectTrigger className="h-12">
                                    <User className="w-4 h-4 me-2 text-primary" />
                                    <SelectValue placeholder="Select Reciter" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] z-[200]">
                                    {reciters.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                            <Slider
                                value={[seekValue]}
                                max={duration || 100}
                                onValueChange={([v]) => {
                                    setSeekValue(v);
                                    if (audioRef.current) audioRef.current.currentTime = v;
                                    setProgress(v);
                                }}
                                className="cursor-pointer"
                            />
                            <div className="flex justify-between text-xs font-mono text-muted-foreground">
                                <span>{formatTime(seekValue)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-6 pt-2">
                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => {
                                if (audioRef.current) audioRef.current.currentTime -= 10;
                            }}>
                                <Repeat className="w-4 h-4" /> {/* Just a placeholder for seek back */}
                            </Button>

                            <Button size="icon" className="h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform" onClick={togglePlayback} disabled={isLoading}>
                                {isLoading ? (
                                    <div className="w-6 h-6 border-4 border-primary-foreground border-t-transparent animate-spin rounded-full" />
                                ) : isPlaying ? (
                                    <Pause className="w-8 h-8 fill-current" />
                                ) : (
                                    <Play className="w-8 h-8 ml-1 fill-current" />
                                )}
                            </Button>

                            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={() => {
                                if (audioRef.current) audioRef.current.currentTime += 10;
                            }}>
                                <Repeat className="w-4 h-4 rotate-180" /> {/* Just a placeholder for seek fwd */}
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    );
}
