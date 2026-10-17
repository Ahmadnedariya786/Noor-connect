import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Download, Loader2, User, BookOpen, Clock, Wifi, WifiOff, Headphones, Sparkles, Heart } from 'lucide-react';
import { QURAN_AUDIO_API, Reciter, SurahAudio } from '@/lib/quran-audio';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface QuranAudioPlayerProps {
  className?: string;
}

export function QuranAudioPlayer({ className }: QuranAudioPlayerProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // State
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [currentAudio, setCurrentAudio] = useState<SurahAudio | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [surahList, setSurahList] = useState<any[]>([]);
  const [reciterList, setReciterList] = useState<Reciter[]>([]);
  
  // Load data on mount
  useEffect(() => {
    loadInitialData();
  }, []);
  
  // Load initial data
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Load reciters and Surahs in parallel
      const [reciterResponse, surahResponse] = await Promise.all([
        QURAN_AUDIO_API.getReciters(),
        QURAN_AUDIO_API.getSurahList()
      ]);
      
      if (reciterResponse.data) {
        setReciterList(reciterResponse.data);
        // Set default reciter (Mishary Rashid Alafasy - ID: 5)
        const defaultReciter = reciterResponse.data.find((r: Reciter) => r.id === 5) || reciterResponse.data[0];
        setSelectedReciter(defaultReciter);
      }
      
      if (surahResponse.data) {
        setSurahList(surahResponse.data);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setIsLoading(false);
      toast({
        title: 'Error',
        description: 'Failed to load Quran data',
        variant: 'destructive'
      });
    }
  };
  
  // Load Surah audio
  const loadSurahAudio = async (surahNumber: number, recitationId: number) => {
    try {
      setIsLoading(true);
      
      const response = await QURAN_AUDIO_API.getSurahAudio(surahNumber, recitationId);
      
      if (response.data && response.data.recitation) {
        setCurrentAudio(response.data);
        
        // Set audio source with crossOrigin for CORS
        if (audioRef.current) {
          audioRef.current.crossOrigin = 'anonymous';
          audioRef.current.src = response.data.recitation.audioUrl;
          audioRef.current.load();
        }
      }
    } catch (error) {
      console.error('Failed to load Surah audio:', error);
      setIsLoading(false);
      toast({
        title: 'Audio Loading Issue',
        description: 'Trying to load audio... This may take a moment.',
        variant: 'default'
      });
    }
  };
  
  // Handle play/pause
  const togglePlayPause = () => {
    if (!audioRef.current || !currentAudio || isLoading) return;
    
    // Check if audio is ready to play
    if (audioRef.current.readyState < 2) { // HAVE_CURRENT_DATA
      toast({
        title: 'Loading',
        description: 'Audio is still loading, please wait...',
        variant: 'default'
      });
      return;
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Play failed:', error);
          setIsPlaying(false);
          toast({
            title: 'Playback Error',
            description: 'Failed to play audio. Please try again.',
            variant: 'destructive'
          });
        });
    }
  };
  
  // Navigation functions
  const playPreviousSurah = () => {
    if (selectedSurah > 1) {
      handleSurahChange((selectedSurah - 1).toString());
    }
  };
  
  const playNextSurah = () => {
    if (selectedSurah < 114) {
      const nextSurah = selectedSurah + 1;
      setSelectedSurah(nextSurah);
      if (selectedReciter) {
        loadSurahAudio(nextSurah, selectedReciter.recitationId);
      }
    }
  };
  
  // Handle download
  const handleDownload = () => {
    if (currentAudio && currentAudio.recitation) {
      const link = document.createElement('a');
      link.href = currentAudio.recitation.audioUrl;
      link.download = `surah-${selectedSurah}-${selectedReciter?.name || 'reciter'}.mp3`;
      link.target = '_blank'; // Add target blank to handle CORS
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      // Auto-play next Surah
      if (selectedSurah < 114) {
        playNextSurah();
      }
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    const handleLoadStart = () => {
      setIsLoading(true);
    };
    
    const handleCanPlay = () => {
      setIsLoading(false);
    };
    
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Provide helpful error message
      const audio = e.target as HTMLAudioElement;
      if (audio.error) {
        console.error('Audio error code:', audio.error.code);
        toast({
          title: 'Audio Loading Error',
          description: 'Unable to load audio. You can try downloading the file directly.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Audio Error',
          description: 'Failed to load audio. Please try a different Surah or reciter.',
          variant: 'destructive'
        });
      }
    };
    
    // Add all event listeners
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    
    return () => {
      // Remove all event listeners
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [selectedSurah]);
  
  // Load initial Surah
  useEffect(() => {
    if (selectedReciter) {
      loadSurahAudio(1, selectedReciter.recitationId);
    }
  }, [selectedReciter]);
  
  // Format time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Get current Surah info
  const getCurrentSurahInfo = () => {
    return surahList.find(surah => surah.sequence === selectedSurah);
  };
  
  const currentSurahInfo = getCurrentSurahInfo();
  
  // Handle reciter change
  const handleReciterChange = (reciterValue: string) => {
    const recitationId = parseInt(reciterValue);
    const reciter = reciterList.find(r => r.id === recitationId);
    if (reciter) {
      setSelectedReciter(reciter);
      loadSurahAudio(selectedSurah, recitationId);
    }
  };
  
  // Handle Surah change
  const handleSurahChange = (surahValue: string) => {
    const surahNumber = parseInt(surahValue);
    setSelectedSurah(surahNumber);
    if (selectedReciter) {
      loadSurahAudio(surahNumber, selectedReciter.recitationId);
    }
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="relative overflow-hidden border border-[var(--border)] shadow-[var(--elevation-6)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] backdrop-blur-xl">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 via-transparent to-[var(--accent-2)]/5 animate-pulse" />
        <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-[var(--accent)]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-80px] left-[-80px] w-64 h-64 bg-[var(--accent-2)]/10 rounded-full blur-3xl" />
        
        {/* Glassmorphism Overlay */}
        <div className="absolute inset-0 bg-white/5 dark:bg-black/10 backdrop-blur-sm" />
        
        {/* Content */}
        <CardContent className="relative z-10 p-8 space-y-8">
          {/* Premium Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] rounded-2xl shadow-lg border border-[var(--accent)]/30">
                <BookOpen className="w-8 h-8 text-[var(--on-accent)]" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Quran Audio Player</h2>
                <p className="text-sm flex items-center gap-2 mt-1" style={{ color: "var(--text-secondary)" }}>
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  Premium Divine Recitations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-2 px-3 py-1 bg-[var(--accent-soft)] rounded-full"
                >
                  <div className="w-2 h-2 bg-[var(--accent)] rounded-full animate-pulse" />
                  <span className="text-xs font-medium text-[var(--accent-text)]">Playing</span>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Premium Selection Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reciter Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--accent)]" />
                <label className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Reciter</label>
              </div>
              <Select value={selectedReciter?.id?.toString() || ""} onValueChange={handleReciterChange}>
                <SelectTrigger
                  className="h-12 backdrop-blur-sm rounded-xl border"
                  style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <div className="flex items-center gap-3">
                    <Headphones className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <SelectValue placeholder="Select Master Reciter" />
                  </div>
                </SelectTrigger>
                <SelectContent
                  className="backdrop-blur-sm border"
                  style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
                >
                  {reciterList.map((reciter) => (
                    <SelectItem key={reciter.id} value={reciter.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{reciter.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Expert Recitation</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Surah Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <label className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>Surah</label>
              </div>
              <Select value={selectedSurah.toString()} onValueChange={handleSurahChange}>
                <SelectTrigger
                  className="h-12 backdrop-blur-sm rounded-xl border"
                  style={{ background: "var(--bg-elev)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <SelectValue placeholder="Select Divine Surah" />
                  </div>
                </SelectTrigger>
                <SelectContent
                  className="max-h-80 backdrop-blur-sm border"
                  style={{ background: "var(--bg-elev)", borderColor: "var(--border)" }}
                >
                  {surahList.map((surah) => (
                    <SelectItem key={surah.sequence} value={surah.sequence.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{surah.name?.latin?.short || surah.name?.latin?.long}</span>
                        <span className="text-xs text-muted-foreground">
                          {surah.ayahCount} verses • {surah.type?.latin} • {surah.name?.arabic?.short}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Current Surah Premium Display */}
          <AnimatePresence>
            {currentAudio && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] backdrop-blur-sm border border-[var(--border)] p-6"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--accent)]/5 to-transparent opacity-50" />
                <div className="relative z-10 text-center space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="p-2 bg-[var(--accent-soft)] rounded-xl backdrop-blur-sm">
                      <Heart className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <h3 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                      {currentSurahInfo?.name?.latin?.short || `Surah ${selectedSurah}`}
                    </h3>
                  </div>
                  <p className="text-lg font-arabic" style={{ color: "var(--text-primary)" }}>
                    {currentSurahInfo?.name?.arabic?.short || ''}
                  </p>
                  <div className="flex items-center justify-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{currentAudio.ayahCount} Verses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(currentAudio.recitation.duration / 60)}:{(currentAudio.recitation.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wifi className="w-4 h-4" />
                      <span>HD Quality</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <Badge variant="outline" className="bg-[var(--accent-soft)] border-[var(--border)] text-[var(--accent-text)]">
                      {currentAudio.recitation.reciterName}
                    </Badge>
                    <Badge variant="outline" className="bg-[var(--surface-2)] border-[var(--border)]" style={{ color: "var(--text-secondary)" }}>
                      {currentAudio.type?.latin}
                    </Badge>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Premium Audio Player */}
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative">
                <div className="w-full bg-[var(--surface-2)] rounded-full h-3 backdrop-blur-sm border border-[var(--border)]">
                  <motion.div 
                    className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] h-3 rounded-full shadow-lg"
                    style={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(currentTime / duration) * 100 || 0}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--surface)] rounded-full shadow-lg border-2 border-[var(--accent)] cursor-pointer"
                  style={{ left: `calc(${(currentTime / duration) * 100 || 0}% - 8px)` }}
                  onClick={(e) => {
                    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                    if (rect && audioRef.current) {
                      const x = e.clientX - rect.left;
                      const percentage = x / rect.width;
                      audioRef.current.currentTime = percentage * duration;
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Premium Controls */}
            <div className="flex items-center justify-center gap-6">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playPreviousSurah}
                  disabled={selectedSurah <= 1 || isLoading}
                  className="w-12 h-12 rounded-full border transition-all"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <SkipBack className="w-5 h-5" />
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="lg"
                  onClick={togglePlayPause}
                  disabled={!currentAudio || isLoading}
                  className="w-20 h-20 rounded-full shadow-lg hover:shadow-xl border"
                  style={{
                    background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)",
                    color: "var(--on-accent)",
                    borderColor: "transparent",
                    boxShadow: "0 8px 24px var(--accent-glow)",
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  ) : isPlaying ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : (
                    <Play className="w-8 h-8 text-white ml-1" />
                  )}
                </Button>
              </motion.div>
              
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={playNextSurah}
                  disabled={selectedSurah >= 114 || isLoading}
                  className="w-12 h-12 rounded-full border transition-all"
                  style={{
                    background: "var(--surface-2)",
                    borderColor: "var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <SkipForward className="w-5 h-5" />
                </Button>
              </motion.div>
            </div>
            
            {/* Advanced Controls */}
            <div
              className="flex items-center justify-between p-4 rounded-xl border"
              style={{
                background: "var(--surface-2)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5" style={{ color: "var(--accent)" }} />
                <Slider
                  value={[volume * 100]}
                  onValueChange={(v) => {
                    const newVolume = v[0] / 100;
                    setVolume(newVolume);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                    }
                  }}
                  max={100}
                  step={1}
                  className="w-32"
                />
                <span className="text-sm font-medium w-10" style={{ color: "var(--text-secondary)" }}>
                  {Math.round(volume * 100)}%
                </span>
              </div>
              
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  disabled={!currentAudio}
                  className="bg-[var(--accent-soft)] border-[var(--border)] text-[var(--accent-text)] hover:opacity-90"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </motion.div>
            </div>
          </div>
          
          {/* Hidden Audio Element */}
          <audio
            ref={audioRef}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}
