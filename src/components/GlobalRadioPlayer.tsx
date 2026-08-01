import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Radio, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useGlobalRadio, getGlobalAudioRef, setGlobalAudioRef } from "@/lib/global-radio";
import { radioStations } from "@/data/radio-stations";
import { recordListeningTime } from "@/lib/radio-stats";
import Hls from 'hls.js';

// Helper to format seconds to MM:SS or HH:MM:SS
const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function GlobalRadioPlayer() {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const globalRadio = useGlobalRadio();
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 2;

  // Protection refs
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const isTransitioning = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize global audio reference
  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // Initialize global audio reference
  useEffect(() => {
    setGlobalAudioRef(audioRef.current);
    return () => {
      destroyHls();
    };
  }, []);

  // Listening timer - uses Date.now() delta for accuracy even when backgrounded
  useEffect(() => {
    if (!globalRadio.isPlaying || !globalRadio.sessionStartTime) {
      // When paused, just show accumulated time
      setDisplayDuration(globalRadio.accumulatedTime);
      return;
    }

    const updateTimer = () => {
      const currentSessionTime = Math.floor((Date.now() - globalRadio.sessionStartTime!) / 1000);
      setDisplayDuration(globalRadio.accumulatedTime + currentSessionTime);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [globalRadio.isPlaying, globalRadio.sessionStartTime, globalRadio.accumulatedTime]);

  // Media Session API - for lock screen controls and background stability
  useEffect(() => {
    if (!('mediaSession' in navigator) || !globalRadio.currentStation) return;

    try {
      const station = globalRadio.currentStation;
      const stationData = radioStations.find(s => s.id === station.id);
      const artworkUrl = stationData?.img || '/icon-192x192.png';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: station.name,
        artist: 'Quran Reciter',
        album: 'Noor Connect Radio',
        artwork: [
          { src: artworkUrl, sizes: '96x96', type: 'image/png' },
          { src: artworkUrl, sizes: '128x128', type: 'image/png' },
          { src: artworkUrl, sizes: '192x192', type: 'image/png' },
          { src: artworkUrl, sizes: '256x256', type: 'image/png' },
          { src: artworkUrl, sizes: '384x384', type: 'image/png' },
          { src: artworkUrl, sizes: '512x512', type: 'image/png' },
        ]
      });

      const updatePlaybackState = () => {
        if ('playbackState' in navigator.mediaSession) {
          navigator.mediaSession.playbackState = globalRadio.isPlaying ? 'playing' : 'paused';
        }
      };

      updatePlaybackState();

      navigator.mediaSession.setActionHandler('play', () => {
        handlePlayPause();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        handlePlayPause();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        globalRadio.stopRadio();
        setIsVisible(false);
      });
    } catch (error) {
      console.warn('Media Session API setup failed:', error);
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [globalRadio.currentStation, globalRadio.isPlaying, globalRadio]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => {
      isTransitioning.current = false;
      globalRadio.updateRadioState({ isPlaying: true, sessionStartTime: Date.now() });
      setIsLoading(false);
      setRetryCount(0); // Reset retry count on success
    };

    const handlePause = () => {
      isTransitioning.current = false;

      // Calculate additional time before updating state
      const additionalTime = globalRadio.sessionStartTime
        ? Math.floor((Date.now() - globalRadio.sessionStartTime) / 1000)
        : 0;

      globalRadio.updateRadioState({
        isPlaying: false,
        sessionStartTime: null,
        accumulatedTime: globalRadio.accumulatedTime + additionalTime
      });
      setIsLoading(false);

      // Record listening time for statistics (non-blocking)
      if (globalRadio.currentStation && additionalTime > 0) {
        console.log('Recording listening time:', {
          stationId: globalRadio.currentStation.id,
          stationName: globalRadio.currentStation.name,
          seconds: additionalTime
        });
        recordListeningTime(
          String(globalRadio.currentStation.id),
          globalRadio.currentStation.name,
          additionalTime
        ).catch(err => console.error('Failed to record listening time:', err));
      }
    };

    const handleEnded = () => {
      isTransitioning.current = false;
      globalRadio.updateRadioState({ isPlaying: false });
    };

    const handleError = (e: Event) => {
      const audioElem = e.target as HTMLAudioElement;

      // Ignore spurious errors resulting from empty/cleared sources
      if (!audioElem.src || audioElem.src === window.location.href) {
        return;
      }

      // Ignore error if it's not the currently expected station (happens on fast switching)
      const currentRequestedUrl = globalRadio.currentStation?.url?.replace("http://", "https://") || "";
      if (currentRequestedUrl && !audioElem.src.includes(currentRequestedUrl)) {
        return;
      }

      isTransitioning.current = false;
      console.error('Global radio error:', audioElem.error);

      // Handle Automatic Retry with format fallback
      if (retryCount < MAX_RETRIES && audioElem.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
        console.log(`Retrying playback... Attempt ${retryCount + 1}/${MAX_RETRIES}`);
        setRetryCount(prev => prev + 1);

        // Brief delay before retrying
        setTimeout(() => {
          if (globalRadio.isPlaying && globalRadio.currentStation) {
            const currentUrl = audioElem.src.split('?')[0];
            
            // Try different formats on retry
            let retryUrl = currentUrl;
            if (retryCount === 0) {
              // First retry: try adding format extension
              if (!currentUrl.includes('.mp3') && !currentUrl.includes('.aac') && !currentUrl.includes('.m3u8')) {
                retryUrl = `${currentUrl}.mp3`;
              }
            } else if (retryCount === 1) {
              // Second retry: try with cache buster
              retryUrl = `${currentUrl}?cb=${Date.now()}`;
            }
            
            audioElem.src = retryUrl;
            audioElem.load();
            audioElem.play().catch(e => {
              if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
                console.warn('Retry play failed:', e);
              }
            });
          }
        }, 1500);
        return;
      }

      globalRadio.updateRadioState({ isPlaying: false });
      setIsLoading(false);
      setRetryCount(0);

      let errorMessage = "Failed to play radio station.";
      if (audioElem.error) {
        switch (audioElem.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Playback was aborted.";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error. Please check your internet connection.";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Audio format not supported. Trying alternative format...";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Radio stream not available or format not supported.";
            break;
        }
      }

      // Only show toast if it's not an abort error and we were trying to play
      if (audioElem.error?.code !== MediaError.MEDIA_ERR_ABORTED) {
        toast({
          title: "Radio Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [globalRadio]);

  // Update audio properties when global state changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !globalRadio) return;

    const volume = globalRadio.isMuted ? 0 : globalRadio.volume / 100;
    if (isFinite(volume)) {
      audio.volume = volume;
    }
  }, [globalRadio?.volume, globalRadio?.isMuted]);

  // Integrated Player Controller (Handles station changes and play/pause intents)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !globalRadio.currentStation) return;

    const stationUrl = globalRadio.currentStation.url;
    if (!stationUrl || typeof stationUrl !== 'string') return;

    // Force HTTPS
    const secureUrl = stationUrl.replace("http://", "https://");

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      // Check if we need to change the source
      // We check if the current station URL matches what we expect
      const currentStationUrl = globalRadio.currentStation?.url;
      const isDifferentStation = !audio.src.includes(secureUrl) && !hlsRef.current;
      const isSwitchingToHls = secureUrl.toLowerCase().includes(".m3u8") && !hlsRef.current;
      const isSwitchingFromHls = !secureUrl.toLowerCase().includes(".m3u8") && hlsRef.current;

      if (isDifferentStation || isSwitchingToHls || isSwitchingFromHls) {
        if (isTransitioning.current) {
          // Retry later if transitioning
          debounceTimerRef.current = setTimeout(() => {
            if (globalRadio.currentStation && audio.src !== secureUrl) {
              globalRadio.updateRadioState({ isPlaying: false });
            }
          }, 200);
          return;
        }

        try {
          isTransitioning.current = true;
          audio.pause();
          destroyHls();

          const isM3U8 = secureUrl.toLowerCase().includes(".m3u8");
          const supportsNativeHls = audio.canPlayType('application/vnd.apple.mpegurl') ||
            audio.canPlayType('application/x-mpegURL');

          if (isM3U8 && !supportsNativeHls && Hls.isSupported()) {
            const hls = new Hls();
            hlsRef.current = hls;
            hls.loadSource(secureUrl);
            hls.attachMedia(audio);
            hls.on(Hls.Events.MANIFEST_PARSED, async () => {
              if (globalRadio.isPlaying) {
                try {
                  const promise = audio.play();
                  playPromiseRef.current = promise;
                  await promise;
                } catch (e: any) {
                  if (e.name !== 'AbortError') console.error('HLS play error:', e);
                }
              }
            });
          } else {
            // Standard audio stream - add format detection and fallback
            let audioUrl = secureUrl;
            
            // Try to detect missing format and add appropriate extension
            if (!audioUrl.includes('.mp3') && !audioUrl.includes('.aac') && !audioUrl.includes('.m3u8') && !audioUrl.includes('.ogg')) {
              // Most radio streams are MP3, try that first
              audioUrl = `${audioUrl}.mp3`;
            }
            
            audio.src = audioUrl;
            audio.crossOrigin = "anonymous"; // Handle CORS issues

            if (globalRadio.isPlaying) {
              const promise = audio.play();
              if (promise !== undefined) {
                promise.catch(e => {
                  if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
                    // If format fails, try without extension
                    if (e.name === 'NotSupportedError' && audioUrl !== secureUrl) {
                      console.log('Format not supported, trying original URL');
                      audio.src = secureUrl;
                      audio.load();
                      audio.play().catch(playError => {
                        if (playError.name !== 'AbortError' && playError.name !== 'NotSupportedError') {
                          console.error('Playback failed:', playError);
                        }
                      });
                    } else {
                      console.error('Playback failed:', e);
                    }
                  }
                });
              }
            }
          }
        } catch (e: any) {
          if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
            console.error('Station change play error:', e);
          }
        } finally {
          isTransitioning.current = false;
        }
        return;
      }

      // 2. Handle Play/Pause Sync
      if (isTransitioning.current) return;

      try {
        if (globalRadio.isPlaying && audio.paused) {
          isTransitioning.current = true;
          const promise = audio.play();
          if (promise !== undefined) {
            promise.catch(e => {
              if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
                console.error('Sync play failed:', e);
              }
            }).finally(() => {
              isTransitioning.current = false;
            });
          } else {
            isTransitioning.current = false;
          }
        } else if (!globalRadio.isPlaying && !audio.paused) {
          audio.pause();
        }
      } catch (error: any) {
        isTransitioning.current = false;
        if (error.name !== 'AbortError' && error.name !== 'NotSupportedError') {
          console.error('Remote sync error:', error);
        }
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [globalRadio.currentStation?.url, globalRadio.isPlaying]);

  // Auto-show player when radio starts playing
  useEffect(() => {
    if (globalRadio.isPlaying && globalRadio.currentStation) {
      setIsVisible(true);
    }
  }, [globalRadio.isPlaying, globalRadio.currentStation]);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio || !globalRadio.currentStation || isTransitioning.current) return;

    try {
      isTransitioning.current = true;
      if (globalRadio.isPlaying) {
        audio.pause();
        // UI state updates via handlePause listener
      } else {
        setIsLoading(true);
        const promise = audio.play();
        if (promise !== undefined) {
          promise.catch(e => {
            if (e.name !== 'AbortError' && e.name !== 'NotSupportedError') {
              console.error('Manual play failed:', e);
              setIsLoading(false);
            }
          }).finally(() => {
            isTransitioning.current = false;
          });
        } else {
          isTransitioning.current = false;
        }
        // UI state updates via handlePlaying listener
      }
    } catch (error: any) {
      isTransitioning.current = false;
      if (error.name !== 'AbortError' && error.name !== 'NotSupportedError') {
        console.error('Manual play/pause error:', error);
        toast({
          title: "Playback Error",
          description: "Failed to toggle radio. Please try again.",
          variant: "destructive"
        });
      }
    } finally {
      isTransitioning.current = false;
      playPromiseRef.current = null;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    globalRadio?.setVolume(value[0]);
  };

  const toggleMute = () => {
    globalRadio?.toggleMute();
  };

  const handleClose = () => {
    // Record listening time before stopping
    if (globalRadio.currentStation && globalRadio.isPlaying && globalRadio.sessionStartTime) {
      const additionalTime = Math.floor((Date.now() - globalRadio.sessionStartTime) / 1000);
      if (additionalTime > 0) {
        recordListeningTime(
          String(globalRadio.currentStation.id),
          globalRadio.currentStation.name,
          additionalTime
        ).catch(err => console.error('Failed to record listening time:', err));
      }
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }
    destroyHls();
    globalRadio?.stopRadio();
    setIsVisible(false);
  };

  // Always render audio element, but conditionally show UI
  return (
    <>
      {/* Hidden Audio Element - ALWAYS rendered */}
      <audio
        ref={audioRef}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        style={{ display: 'none' }}
        onError={(e) => {
          // Prevent extension-related errors from bubbling up
          e.stopPropagation();
        }}
      />

      {/* Mini Player UI - only shown when visible and station selected */}
      {globalRadio?.currentStation && isVisible && (
        <div className="fixed bottom-24 left-0 right-0 z-[100] px-4">
          <Card className="max-w-lg mx-auto shadow-2xl bg-card/95 backdrop-blur-xl border-border border shadow-primary/10 overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-3">
              {/* Compact Header with Station Info and Timer */}
              <div className="flex items-center gap-3">
                {/* Radio Icon & Station Info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse-slow">
                    <Radio className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate text-foreground">{globalRadio?.currentTrackInfo || 'Unknown Station'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span className="font-mono">{formatDuration(displayDuration)}</span>
                      <span className="text-primary/50">•</span>
                      <span>{globalRadio.isPlaying ? 'Live' : 'Paused'}</span>
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                  {/* Play/Pause Button */}
                  <Button
                    size="icon"
                    variant="default"
                    onClick={handlePlayPause}
                    disabled={isLoading}
                    className="rounded-full w-10 h-10 shadow-md transform active:scale-95 transition-transform"
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                    ) : globalRadio?.isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 ml-0.5 fill-current" />
                    )}
                  </Button>

                  {/* Mute Toggle */}
                  <Button variant="ghost" size="icon" onClick={toggleMute} className="w-8 h-8 rounded-full">
                    {globalRadio?.isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Close */}
                  <Button variant="ghost" size="icon" onClick={handleClose} className="w-8 h-8 rounded-full opacity-50 hover:opacity-100">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Volume Slider & Progress Visual */}
              <div className="mt-3 flex items-center gap-2">
                <Slider
                  value={[globalRadio?.volume || 0]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="flex-1 cursor-pointer"
                />
                <span className="text-xs font-bold text-muted-foreground w-8 text-right font-mono">{globalRadio?.volume || 0}%</span>
              </div>
            </div>
          </Card>
        </div>
      )}

    </>
  );
}
