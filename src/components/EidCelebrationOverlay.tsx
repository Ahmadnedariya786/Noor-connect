import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Moon, Star, X, Sparkles, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useIslamicCalendar } from "@/hooks/useIslamicCalendar";

export function EidCelebrationOverlay() {
  const { isEidAlFitr, isEidAlAdha, islamicInfo, isRamadan } = useIslamicCalendar();
  const [isVisible, setIsVisible] = useState(false);
  
  // GUARD: Never show Eid overlay if we're still in Ramadan (month 9)
  // This prevents false triggers on the last day of Ramadan
  const safeEidType = isRamadan ? null : (isEidAlFitr ? 'fitr' : isEidAlAdha ? 'adha' : null);

  useEffect(() => {
    if (!safeEidType) return;

    const lastSeenKey = `eid-greeting-seen-${safeEidType}-${islamicInfo?.hijriYear}`;
    const hasSeen = localStorage.getItem(lastSeenKey);

    if (!hasSeen) {
      // Small delay for the app to settle
      const timer = setTimeout(() => {
        setIsVisible(true);
        triggerConfetti();
        // Play a chime if possible (optional)
      }, 1500);
      
      localStorage.setItem(lastSeenKey, 'true');
      return () => clearTimeout(timer);
    }
  }, [safeEidType, islamicInfo]);

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  if (!isVisible || !safeEidType) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <m.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: Math.random() * window.innerHeight,
                scale: 0,
                opacity: 0
              }}
              animate={{ 
                scale: [0, 1, 0.5, 1],
                opacity: [0, 0.5, 0.2, 0.5],
                rotate: 360
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              className="absolute text-yellow-500/20"
            >
              <Star className="w-4 h-4" />
            </m.div>
          ))}
        </div>

        <m.div
          initial={{ scale: 0.8, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="relative w-full max-w-sm bg-gradient-to-br from-[#1a237e] via-[#0d1b40] to-black rounded-[40px] p-8 border border-white/10 shadow-2xl text-center overflow-hidden"
        >
          {/* Animated background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#e0c097]/20 rounded-full blur-[20px]"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-[20px] delay-700"></div>

          <button 
            onClick={() => setIsVisible(false)}
            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 space-y-8">
            <div className="flex justify-center">
              <m.div
                animate={{ 
                  rotate: [0, 10, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 bg-[#e0c097]/10 rounded-3xl border border-[#e0c097]/20 flex items-center justify-center"
              >
                <Moon className="w-12 h-12 text-[#e0c097]" />
              </m.div>
            </div>

            <div className="space-y-3">
              <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-4xl font-bold text-white tracking-tight">
                  Eid Mubarak!
                </h2>
                <p className="text-[#e0c097] text-lg font-arabic mt-1">
                  {safeEidType === 'fitr' ? 'عيد الفطر مبارك' : 'عيد الأضحى مبارك'}
                </p>
              </m.div>
              
              <m.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-sm leading-relaxed"
              >
                May this blessed day bring joy, peace, and prosperity to you and your loved ones. May Allah accept our deeds.
              </m.p>
            </div>

            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              className="pt-4 flex flex-col gap-3"
            >
              <Button 
                onClick={() => setIsVisible(false)}
                className="bg-[#e0c097] text-black hover:bg-[#d4af37] h-14 rounded-2xl font-bold text-lg w-full shadow-lg shadow-[#e0c097]/20"
              >
                Ameen, Eid Mubarak!
              </Button>
              
              <Button 
                variant="ghost"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Eid Mubarak!',
                      text: `Eid Mubarak! Wishing you and your family a blessed and joyous day. May Allah accept our good deeds. 🌙✨ - Shared via Noor Connect`,
                      url: window.location.origin
                    }).catch(console.error);
                  }
                }}
                className="text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-2xl border border-white/5"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Spread the Joy (Share)
              </Button>
              
              <div className="flex items-center justify-center gap-2 text-white/40 text-xs">
                <Heart className="w-3 h-3 text-red-500/50" />
                <span>With love from Noor Connect</span>
              </div>
            </m.div>
          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
