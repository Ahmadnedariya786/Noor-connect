// Quran Audio Player using verified audio URLs
// Professional audio recitations with rich metadata
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AlertCircle, Pause, Play, User, Volume2, X, Download, Trash2, Bell, BellOff } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { androidAudioHelper } from "@/lib/android-audio-helper";
import { useGlobalRadio } from "@/lib/global-radio";
import { QURAN_AUDIO_API } from "@/lib/quran-audio";
import { AdhanControl } from "./AdhanControl";
import { adhanService } from "@/lib/adhan-service";
import { audioNotificationService, type AudioNotificationData } from "@/lib/audio-notifications";
import { NotificationContentGenerator } from "@/lib/notification-content";

// Download storage interface
interface DownloadedSurah {
  surahNumber: number;
  reciterId: number;
  reciterName: string;
  audioUrl: string;
  downloadedAt: number;
  fileSize?: number;
}

// Local storage key for downloads
const DOWNLOADS_STORAGE_KEY = 'quran-downloaded-surahs';
// Local storage key for persisting selected reciter
const RECITER_STORAGE_KEY = 'quran-selected-reciter';

interface QuranAudioPlayerProps {
  surahNumber: number;
  surahName: string;
  totalAyahs: number;
  currentAyah: number;
  onAyahChange?: (ayah: number) => void;
  onClose: () => void;
}

export function QuranAudioPlayer({
  surahNumber,
  surahName,
  totalAyahs,
  currentAyah = 1,
  onAyahChange,
  onClose
}: QuranAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reciters, setReciters] = useState<any[]>([]);
  const [selectedReciterId, setSelectedReciterId] = useState<number>(1);
  const [isBackgroundMode, setIsBackgroundMode] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloadedSurahs, setDownloadedSurahs] = useState<DownloadedSurah[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [adhanEnabled, setAdhanEnabled] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<any>(null);
  const { updateRadioState, isPlaying: isRadioPlaying } = useGlobalRadio();

  // Load Adhan config and downloaded surahs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DOWNLOADS_STORAGE_KEY);
      if (stored) {
        setDownloadedSurahs(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load downloaded surahs:', error);
    }

    // Load Adhan configuration
    try {
      const adhanConfig = adhanService.getAdhanConfig();
      setAdhanEnabled(adhanConfig.enabled);
    } catch (error) {
      console.error('Failed to load Adhan config:', error);
    }
  }, []);

  // Generate audio URL from our verified audio system
  const audioSrc = useMemo(() => {
    if (!selectedReciterId || reciters.length === 0) {
      return '';
    }

    // Use our verified audio system to get the audio URL
    const reciter = reciters.find(r => r.id === selectedReciterId);
    if (!reciter) return '';

    const reciterInfo = QURAN_AUDIO_API.RECITER_AUDIO_MAP[selectedReciterId as keyof typeof QURAN_AUDIO_API.RECITER_AUDIO_MAP];
    if (!reciterInfo) return '';

    let url: string;
    if (reciterInfo.requiresZeroPadding) {
      const paddedChapter = surahNumber.toString().padStart(3, '0');
      url = `${reciterInfo.url}/${paddedChapter}.mp3`;
    } else {
      url = `${reciterInfo.url}/${surahNumber}.mp3`;
    }

    console.log(`Loading Surah ${surahNumber} from: ${url}`);
    return url;
  }, [surahNumber, selectedReciterId, reciters]);

  const togglePlayback = useCallback(async () => {
    if (!audioRef.current || !audioSrc) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Pause global radio if playing
      if (isRadioPlaying) {
        updateRadioState({ isPlaying: false });
      }

      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        console.error("Play error:", e);
        setIsPlaying(false);
      }
    }
  }, [isPlaying, audioSrc, isRadioPlaying, updateRadioState]);

  // Check if current surah is downloaded for selected reciter
  const isCurrentSurahDownloaded = useMemo(() => {
    return downloadedSurahs.some(
      ds => ds.surahNumber === surahNumber && ds.reciterId === selectedReciterId
    );
  }, [downloadedSurahs, surahNumber, selectedReciterId]);

  // Enhanced background audio setup with notifications
  useEffect(() => {
    if (isBackgroundMode && audioRef.current) {
      setupBackgroundAudio();
    } else {
      cleanupBackgroundAudio();
    }
    
    return () => {
      cleanupBackgroundAudio();
    };
  }, [isBackgroundMode, audioSrc]);

  // Setup background audio with enhanced features and notifications
  const setupBackgroundAudio = useCallback(() => {
    if (!audioRef.current) return;
    
    const audio = audioRef.current;
    
    // Use enhanced platform-specific optimizations
    androidAudioHelper.setupPlatformOptimizations(audio);
    
    // Setup notification service
    audioNotificationService.setupBackgroundAudio(audio);
    
    // Request notification permission
    audioNotificationService.requestPermission().then(granted => {
      if (granted) {
        console.log('Audio notifications permission granted');
      } else {
        console.warn('Audio notifications permission denied');
      }
    });
    
    // Check and log background capabilities
    const capabilities = androidAudioHelper.getBackgroundCapabilities();
    console.log('Background audio capabilities:', capabilities);
    
    // Request picture-in-picture if available (better background experience)
    if ('documentPictureInPicture' in window && !document.pictureInPictureElement) {
      console.log('Picture-in-Picture API available for enhanced background playback');
    }
    
    // Additional background optimizations
    if (androidAudioHelper.supportsBackgroundPlayback()) {
      console.log('Browser supports background playback with Media Session API');
    } else {
      console.warn('Browser may have limited background playback support');
    }
    
    console.log(`Background audio setup complete for ${androidAudioHelper.getPlatformName()}`);
  }, [audioSrc]);

  const cleanupBackgroundAudio = useCallback(() => {
    androidAudioHelper.cleanup();
    audioNotificationService.closeNotification();
    console.log('Background audio cleanup complete');
  }, []);

  // Enhanced Media Session API for robust background playback with notifications
  useEffect(() => {
    if (!('mediaSession' in navigator)) {
      console.warn('Media Session API not available - background controls limited');
      return;
    }

    const updateMediaSession = () => {
      const reciterName = reciters.find(r => r.id === selectedReciterId)?.name || 'Quran Recitation';
      
      // Show persistent notification when playing with rich content
      if (isPlaying) {
        const notificationContent = NotificationContentGenerator.generateQuranRecitationContent({
          surahNumber,
          surahName,
          reciterName,
          isPlaying,
          currentTime: progress,
          duration,
          verses: totalAyahs,
          type: currentAudio?.type?.latin || 'Quran Recitation'
        });
        
        audioNotificationService.showNotification({
          type: 'quran-recitation',
          title: `Surah ${surahNumber}: ${surahName}`,
          artist: reciterName,
          album: 'Holy Quran - Noor Connect',
          isPlaying,
          currentTime: progress,
          duration
        });
      } else {
        audioNotificationService.updateNotification({ isPlaying: false });
      }
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `Surah ${surahNumber}: ${surahName}`,
        artist: reciterName,
        album: 'Holy Quran - Noor Connect',
        artwork: [
          { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
          { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      });

      // Enhanced media session action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        console.log('Media session play triggered');
        togglePlayback();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        console.log('Media session pause triggered');
        togglePlayback();
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        console.log('Media session stop triggered');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
        setProgress(0);
        audioNotificationService.closeNotification();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          setProgress(0);
        }
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (surahNumber < 114) {
          console.log('Next surah requested - parent component should handle this');
          // You could add auto-advance logic here
        } else {
          togglePlayback();
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setProgress(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const seekTime = Math.max(0, audioRef.current.currentTime - (details.seekOffset || 10));
          audioRef.current.currentTime = seekTime;
          setProgress(seekTime);
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const seekTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + (details.seekOffset || 10));
          audioRef.current.currentTime = seekTime;
          setProgress(seekTime);
        }
      });

      // Set playback state for better integration
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    };

    updateMediaSession();

    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('stop', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('seekto', null);
        navigator.mediaSession.setActionHandler('seekbackward', null);
        navigator.mediaSession.setActionHandler('seekforward', null);
      }
    };
  }, [surahName, surahNumber, selectedReciterId, reciters, togglePlayback, isPlaying, progress, duration]);

  // Fetch reciters from our verified audio system
  useEffect(() => {
    const fetchReciters = async () => {
      try {
        setFetchError(null);
        const response = await QURAN_AUDIO_API.getReciters();
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to fetch reciters');
        }
        
        const recitersData = response.data || [];
        console.log(`Loaded ${recitersData.length} reciters from verified audio system`);
        setReciters(recitersData);

        // Try to restore previously selected reciter from localStorage
        const savedReciterId = localStorage.getItem(RECITER_STORAGE_KEY);
        if (savedReciterId) {
          const savedId = parseInt(savedReciterId);
          const reciterExists = recitersData.find((r: any) => r.id === savedId);
          if (reciterExists) {
            setSelectedReciterId(savedId);
          } else {
            // Default to first reciter if saved one doesn't exist
            setSelectedReciterId(recitersData[0]?.id || 1);
          }
        } else {
          // Default to first reciter
          setSelectedReciterId(recitersData[0]?.id || 1);
        }
      } catch (e) {
        console.error("Failed to fetch reciters:", e);
        setFetchError("Failed to load reciters. Please check your internet connection.");
      }
    };

    fetchReciters();
  }, []);

  // Persist selected reciter to localStorage
  useEffect(() => {
    if (selectedReciterId) {
      localStorage.setItem(RECITER_STORAGE_KEY, selectedReciterId.toString());
    }
  }, [selectedReciterId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioSrc) return;

    // Only reload if the source has actually changed
    if (audio.src === audioSrc && audio.src !== '') return;

    setIsLoading(true);
    setIsPlaying(false); // Reset playing state when changing source

    audio.pause();
    audio.src = audioSrc;
    audio.load();

    // Don't auto-play when switching reciters - let user press play
    setIsLoading(false);
  }, [audioSrc]);

  // Enhanced visibility change handler for background playback with notifications
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleVisibilityChange = () => {
      console.log('Visibility changed:', document.hidden, 'Background mode:', isBackgroundMode, 'Playing:', isPlaying);
      
      if (document.hidden && isPlaying && isBackgroundMode) {
        // Page is hidden (in background) and should continue playing
        if (audio.paused) {
          console.log('Attempting to resume playback in background');
          audio.play().then(() => {
            // Ensure notification is shown when going to background
            const reciterName = reciters.find(r => r.id === selectedReciterId)?.name || 'Quran Recitation';
            audioNotificationService.showNotification({
              type: 'quran-recitation',
              title: `Surah ${surahNumber}: ${surahName}`,
              artist: reciterName,
              album: 'Holy Quran - Noor Connect',
              isPlaying: true,
              currentTime: audio.currentTime,
              duration: audio.duration
            });
          }).catch(error => {
            console.warn('Failed to resume background playback:', error);
            // Try to reload and play if resume fails
            if (audioSrc) {
              audio.load();
              audio.play().catch(e => console.warn('Background playback still failed after reload:', e));
            }
          });
        }
      } else if (!document.hidden && !isPlaying) {
        // Page is visible and not playing - close notification
        audioNotificationService.closeNotification();
      }
      
      // Update media session playback state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying && !audio.paused ? 'playing' : 'paused';
      }
    };

    const handlePageUnload = () => {
      if (isPlaying) {
        // Save state for potential restoration
        localStorage.setItem('quran-audio-state', JSON.stringify({
          surahNumber,
          surahName,
          selectedReciterId,
          isPlaying: true,
          isBackgroundMode,
          currentTime: audioRef.current?.currentTime || 0,
          timestamp: Date.now()
        }));
        console.log('Audio state saved before page unload');
      }
      // Clean up notification on page unload
      audioNotificationService.closeNotification();
    };

    // Enhanced page load state restoration
    const savedState = localStorage.getItem('quran-audio-state');
    if (savedState && !isPlaying) {
      try {
        const state = JSON.parse(savedState);
        const timeDiff = Date.now() - state.timestamp;

        // Restore state if recent (within 30 minutes) and same surah
        if (timeDiff < 30 * 60 * 1000 && state.surahNumber === surahNumber) {
          console.log('Restoring audio state from background session');
          
          if (state.selectedReciterId) {
            setSelectedReciterId(state.selectedReciterId);
          }
          setIsBackgroundMode(state.isBackgroundMode);

          // Restore playback position if background mode was active
          if (state.isBackgroundMode && state.isPlaying && audioRef.current) {
            setTimeout(() => {
              if (audioRef.current && state.currentTime > 0) {
                audioRef.current.currentTime = state.currentTime;
              }
              togglePlayback();
            }, 1000);
          }
        }
      } catch (error) {
        console.error('Failed to restore audio state:', error);
      }
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handlePageUnload);
    window.addEventListener('pagehide', handlePageUnload); // Better for mobile

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handlePageUnload);
      window.removeEventListener('pagehide', handlePageUnload);
      // Clean up notifications on unmount
      audioNotificationService.closeNotification();
    };
  }, [isPlaying, isBackgroundMode, surahNumber, surahName, selectedReciterId, audioSrc, togglePlayback]);

  // Enhanced audio element event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      console.log('Audio playback started');
      setIsPlaying(true);
      
      // Update media session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      
      // Ensure background mode optimizations are active
      if (isBackgroundMode) {
        setupBackgroundAudio();
      }
    };

    const handlePause = () => {
      console.log('Audio playback paused');
      setIsPlaying(false);
      
      // Update media session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleError = (error: Event) => {
      console.error(`Audio failed to load: ${audio.src}`, error);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Update media session state
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };

    const handleCanPlay = () => {
      console.log('Audio ready to play');
      setIsLoading(false);
    };

    const handleStalled = () => {
      console.warn('Audio playback stalled - attempting to recover');
      if (isPlaying && audioSrc) {
        // Try to recover from stall
        setTimeout(() => {
          if (audio && !audio.paused) return;
          audio.load();
          audio.play().catch(e => console.warn('Recovery attempt failed:', e));
        }, 1000);
      }
    };

    // Add comprehensive event listeners
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('stalled', handleStalled);
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleTimeUpdate);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('stalled', handleStalled);
      audio.removeEventListener('ended', handleAudioEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleTimeUpdate);
    };
  }, [audioSrc, isBackgroundMode, isPlaying, setupBackgroundAudio]);



  const handleAudioEnded = () => {
    console.log(`Surah ${surahName} playback completed`);
    setIsPlaying(false);
    audioNotificationService.closeNotification();
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || isNaN(audio.duration) || audio.duration === 0) return;
    setProgress(audio.currentTime);
    setDuration(audio.duration || 0);

    // Update notification with current progress
    if (isPlaying) {
      audioNotificationService.updateNotification({
        currentTime: audio.currentTime,
        duration: audio.duration
      });
    }

    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate,
        position: audio.currentTime
      });
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  const formatTime = (time: number): string => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Download current surah for selected reciter
  const handleDownloadSurah = async () => {
    if (!audioSrc || isDownloading) return;

    setIsDownloading(true);
    try {
      // Check if already downloaded
      if (isCurrentSurahDownloaded) {
        console.log('Surah already downloaded');
        return;
      }

      // Fetch the audio file to get its size and verify it works
      const response = await fetch(audioSrc, { method: 'HEAD' });
      if (!response.ok) {
        throw new Error(`Failed to access audio file: ${response.statusText}`);
      }

      const fileSize = parseInt(response.headers.get('content-length') || '0');
      const reciter = reciters.find(r => r.id === selectedReciterId);
      
      // Create download record
      const downloadRecord: DownloadedSurah = {
        surahNumber,
        reciterId: selectedReciterId,
        reciterName: reciter?.name || 'Unknown',
        audioUrl: audioSrc,
        downloadedAt: Date.now(),
        fileSize
      };

      // Save to localStorage
      const updatedDownloads = [...downloadedSurahs, downloadRecord];
      setDownloadedSurahs(updatedDownloads);
      localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));

      console.log(`Downloaded Surah ${surahNumber} by ${reciter?.name}`);
    } catch (error) {
      console.error('Download failed:', error);
      // You could show a toast notification here
    } finally {
      setIsDownloading(false);
    }
  };

  // Remove downloaded surah
  const handleRemoveDownload = () => {
    const updatedDownloads = downloadedSurahs.filter(
      ds => !(ds.surahNumber === surahNumber && ds.reciterId === selectedReciterId)
    );
    setDownloadedSurahs(updatedDownloads);
    localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(updatedDownloads));
  };

  const handleReciterChange = (id: string) => {
    const newReciterId = parseInt(id);
    setSelectedReciterId(newReciterId);
    // Reset playback state when switching reciters
    setProgress(0);
    setDuration(0);
    setIsPlaying(false);
  };

  const toggleAdhan = () => {
    const newConfig = adhanService.toggleAdhan();
    setAdhanEnabled(newConfig.enabled);
  };

  return (
    <>
      {/* Adhan Control */}
      <div className="fixed top-4 right-4 z-50">
        <AdhanControl />
      </div>
      
      <Card className="fixed bottom-20 left-4 right-4 z-40 shadow-lg bg-card/95 backdrop-blur-lg border-border">
        <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{surahName}</p>
            <p className="text-xs text-muted-foreground">Full Surah Recitation</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Adhan Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleAdhan}
              className="relative"
            >
              {adhanEnabled ? (
                <Bell className="w-4 h-4 text-[var(--accent)]" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
              {adhanEnabled && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--accent)] rounded-full"></div>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Fetch Error */}
        {fetchError && (
          <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* Reciter Selector */}
        <Select
          value={selectedReciterId.toString()}
          onValueChange={handleReciterChange}
          disabled={reciters.length === 0}
        >
          <SelectTrigger className="w-full">
            <User className="w-4 h-4 mr-2" />
            <SelectValue placeholder={reciters.length === 0 ? "Loading reciters..." : "Select reciter"} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {reciters.map((r) => (
              <SelectItem key={r.id} value={r.id.toString()}>
                <div className="flex flex-col">
                  <span>{r.name}</span>
                  <span className="text-xs text-muted-foreground">
                    Verified Reciter
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Download Status and Controls */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {isCurrentSurahDownloaded ? (
              <>
                <Badge variant="default" className="text-xs">
                  Downloaded
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Available offline
                </span>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">
                Not downloaded
              </span>
            )}
          </div>
          <Button
            variant={isCurrentSurahDownloaded ? "outline" : "default"}
            size="sm"
            onClick={isCurrentSurahDownloaded ? handleRemoveDownload : handleDownloadSurah}
            disabled={isDownloading || !audioSrc}
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isCurrentSurahDownloaded ? (
              <Trash2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Downloaded Surahs List */}
        {downloadedSurahs.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Downloaded Surahs</h4>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {downloadedSurahs
                .filter(ds => ds.surahNumber === surahNumber)
                .map((ds, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                    <span>{ds.reciterName}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatBytes(ds.fileSize || 0)}
                    </Badge>
                  </div>
                ))}
              {downloadedSurahs.filter(ds => ds.surahNumber === surahNumber).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No downloads for this surah yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Background Mode Toggle */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Background Play</span>
          </div>
          <Button
            variant={isBackgroundMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsBackgroundMode(!isBackgroundMode)}
          >
            {isBackgroundMode ? "ON" : "OFF"}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={duration || 100}
            step={0.1}
            className="w-full"
            disabled={!audioSrc}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">

          <Button
            size="icon"
            className="h-12 w-12 rounded-full"
            onClick={togglePlayback}
            disabled={isLoading || !audioSrc || !selectedReciterId}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>


          <div className="flex items-center gap-2 ml-2">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0])}
              max={100}
              step={1}
              className="w-20"
            />
          </div>
        </div>
      </div>

        <audio
          ref={audioRef}
          onEnded={handleAudioEnded}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleTimeUpdate}
        />
      </Card>
    </>
  );
}
