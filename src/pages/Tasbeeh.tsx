import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCcw, Sparkles, History, ChevronRight, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTasbeehTotal, getTasbeehHistory, addTasbeehEntry, setTasbeehTotal } from "@/lib/storage";
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
];

const Tasbeeh = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [count, setCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedDhikr, setSelectedDhikr] = useState(DHIKR_OPTIONS[0].value);
  const [dailyHistory, setDailyHistory] = useState<{ date: string; count: number; label: string }[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const currentDhikr = DHIKR_OPTIONS.find(d => d.value === selectedDhikr) || DHIKR_OPTIONS[0];
  const label = currentDhikr.transliteration;

  useEffect(() => {
    setTotalCount(getTasbeehTotal());
    setDailyHistory(getTasbeehHistory());
  }, []);

  // Enhanced haptic feedback patterns
  const triggerHapticFeedback = (type: 'increment' | 'milestone' | 'reset' | 'select' = 'increment') => {
    if (!('vibrate' in navigator)) return;

    switch (type) {
      case 'increment':
        // Single tap for normal increment
        navigator.vibrate(8);
        break;
      case 'milestone':
        // Double pulse for milestone achievements
        navigator.vibrate([10, 50, 10]);
        break;
      case 'reset':
        // Long vibration for reset confirmation
        navigator.vibrate([15, 30, 15, 30, 15]);
        break;
      case 'select':
        // Short pulse for selection changes
        navigator.vibrate(5);
        break;
    }
  };

  const handleIncrement = () => {
    const newCount = count + 1;
    const previousCount = count;
    setCount(newCount);
    addTasbeehEntry(label);
    setTotalCount(getTasbeehTotal());
    setDailyHistory(getTasbeehHistory());
    setIsAnimating(true);

    // Enhanced haptic feedback with milestone detection
    if (newCount === 33 || newCount === 99 || newCount === 100 || (newCount % 100 === 0 && newCount > 0)) {
      triggerHapticFeedback('milestone');
    } else {
      triggerHapticFeedback('increment');
    }

    setTimeout(() => setIsAnimating(false), 100);
  };

  const handleReset = () => {
    if (confirm(t('resetCurrentCounter'))) {
      setCount(0);
      triggerHapticFeedback('reset');
    }
  };

  const handleDhikrChange = (value: string) => {
    setSelectedDhikr(value);
    setCount(0);
    triggerHapticFeedback('select');
  };

  const nextMilestone = count < 33 ? 33 : count < 99 ? 99 : count < 100 ? 100 : Math.ceil((count + 1) / 100) * 100;
  const progress = (count / nextMilestone) * 100;

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-20">
        <AppBar title={t('digitalTasbeeh')} showBack />

        <div className="max-w-lg mx-auto px-5 pt-4 space-y-6">

          {/* Dhikr Selector Hero */}
          <Card className="overflow-hidden border-border/30 shadow-lg bg-card/50 backdrop-blur-xl">
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('selectDhikr')}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 rounded-full text-[10px] font-bold text-primary">
                  <History className="w-3 h-3" />
                  {t('total')}: {totalCount.toLocaleString()}
                </div>
              </div>

              <Select value={selectedDhikr} onValueChange={handleDhikrChange}>
                <SelectTrigger className="h-16 rounded-2xl bg-card border-border/40 text-left px-5">
                  <div className="flex flex-col">
                    <span className="font-arabic text-lg text-primary leading-tight">{currentDhikr.label}</span>
                    <span className="text-xs text-muted-foreground font-medium">{currentDhikr.transliteration}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {DHIKR_OPTIONS.map((dhikr) => (
                    <SelectItem key={dhikr.value} value={dhikr.value} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-arabic text-base">{dhikr.label}</span>
                        <span className="text-xs text-muted-foreground">{dhikr.transliteration}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Main Visual Counter */}
          <div className="flex flex-col items-center justify-center py-6 space-y-8">

            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* Background Ring - Outer */}
              <div className="absolute inset-0 rounded-full border-[10px] border-muted/20" />

              {/* Progress Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="144"
                  cy="144"
                  r="134"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="10"
                  strokeDasharray={842}
                  strokeDashoffset={842 - (842 * progress) / 100}
                  className="text-primary transition-all duration-300 ease-out"
                  strokeLinecap="round"
                />
              </svg>

              {/* Animated Inner Aura */}
              <AnimatePresence>
                {isAnimating && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 0.2, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    className="absolute inset-4 rounded-full bg-primary"
                  />
                )}
              </AnimatePresence>

              {/* Main Counter Hub */}
              <button
                onClick={handleIncrement}
                onTouchStart={() => triggerHapticFeedback('increment')}
                className="relative w-[210px] h-[210px] rounded-full bg-card shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-border/10 flex flex-col items-center justify-center group active:scale-[0.9] transition-all duration-150"
              >
                {/* Background reflection */}
                <div className="absolute inset-4 border border-white/5 rounded-full" />

                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">{t('count')}</span>
                <motion.span
                  key={count}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="text-7xl font-black text-primary drop-shadow-sm font-mono"
                >
                  {count}
                </motion.span>

                <div className="absolute bottom-10 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-muted-foreground opacity-50" />
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">{t('tapToDhikr')}</span>
                </div>
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center gap-4 w-full px-4">
              <Button
                variant="outline"
                className="flex-1 h-14 rounded-2xl gap-3 text-xs font-bold border-border/40 bg-card/40 hover:bg-muted/50 transition-all"
                onClick={handleReset}
              >
                <RotateCcw className="w-4 h-4" />
                {t('resetCount')}
              </Button>

              <div className="flex-1 h-14 bg-muted/20 border border-border/20 rounded-2xl flex flex-col items-center justify-center px-4">
                <span className="text-[9px] font-black uppercase text-muted-foreground/50 tracking-widest">{t('nextGoal')}</span>
                <span className="text-sm font-bold text-primary">{nextMilestone}</span>
              </div>
            </div>
          </div>

          {/* Translation Card */}
          <Card className="p-6 bg-primary/5 border-primary/20 rounded-3xl relative overflow-hidden">
            <div className="absolute -end-4 -bottom-4 opacity-5">
              <Sparkles className="w-24 h-24 text-primary" />
            </div>
            <p className="text-center text-sm font-medium italic text-primary leading-relaxed">
              "{currentDhikr.translation}"
            </p>
          </Card>

          {/* Today's History Tab */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground ms-2">Today's Progress</h3>
            <Card className="p-4 border-border/30 bg-card/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <History className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Sessions Completed</p>
                    <p className="text-[10px] text-muted-foreground">Based on your activity today</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">
                    {dailyHistory.find(h => h.date === new Date().toLocaleDateString() && h.label === label)?.count || 0}
                  </p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase">Dhikr</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Tasbeeh;
