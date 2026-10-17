import { useState, useRef, useEffect } from "react";
import { Play, Pause, Music, Volume2, SkipForward, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const TAKBIRAT_URL = "https://archive.org/download/TakbeeratEid/Takbeerat%20Eid.mp3";

export function TakbiratPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { toast } = useToast();
  const [loadError, setLoadError] = useState(false);

  const togglePlay = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          setLoadError(false);
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (err) {
          console.error("Playback failed:", err);
          setLoadError(true);
          setIsPlaying(false);
          toast({ 
            title: "Playback Error", 
            description: "Could not load the Takbirat audio. It might be blocked or unavailable.", 
            variant: "destructive" 
          });
        }
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const p = (audio.currentTime / audio.duration) * 100;
      setProgress(p || 0);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-[32px] p-[2px] bg-gradient-to-r from-[#e0c097]/30 via-[#d4af37]/20 to-[#e0c097]/30 shadow-2xl">
      <div className="bg-[#12141d]/90 backdrop-blur-xl rounded-[30px] p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#e0c097]/5 rounded-full blur-[20px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--accent)]/5 rounded-full blur-[20px] pointer-events-none"></div>

        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                isPlaying ? "bg-[#e0c097] text-black shadow-lg shadow-[#e0c097]/20 scale-110" : "bg-white/5 text-white/40"
              )}>
                <Music className={cn("w-6 h-6", isPlaying && "animate-pulse")} />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg tracking-tight">Takbirat Eid</h3>
                <p className="text-[#e0c097] text-xs font-medium uppercase tracking-widest">Global Celebration</p>
              </div>
            </div>
          </div>

          {/* Scrolling Arabic Text if playing */}
          <div className="bg-black/25 rounded-2xl p-4 h-20 flex items-center justify-center overflow-hidden border border-[#e0c097]/20 relative">
            <AnimatePresence mode="wait">
              {isPlaying ? (
                <motion.div
                  key="playing"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="flex flex-col items-center gap-1"
                >
                  <p className="text-white text-xl font-bold font-arabic text-center">
                    اللَّهُ أَكْبَرُ، اللَّهُ أَكْبَرُ، لَا إِلَهَ إِلَّا اللَّهُ
                  </p>
                  <p className="text-white/40 text-xs uppercase tracking-tighter">Reciting along...</p>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1 opacity-40"
                >
                  <p className="text-white text-lg font-arabic">Allahu Akbar, Allahu Akbar...</p>
                  <p className="text-xs">Celebrate the spirit of Eid</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#e0c097] to-[#d4af37]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: "tween", ease: "linear" }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-white/40" />
                <div className="w-16 h-1 bg-white/10 rounded-full">
                  <div className="w-2/3 h-full bg-white/20 rounded-full"></div>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-[#e0c097] hover:bg-[#d4af37] text-black shadow-xl shrink-0 group"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current translate-x-0.5" />
                )}
              </Button>

              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-white/5 text-white/20">
                  <Info className="w-4 h-4 cursor-help" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <audio 
          ref={audioRef} 
          src={TAKBIRAT_URL} 
          preload="metadata" 
          crossOrigin="anonymous" 
          onError={() => {
            setLoadError(true);
            setIsPlaying(false);
          }}
        />
      </div>
    </div>
  );
}
