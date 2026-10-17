/**
 * Mystery Box UI Component
 * Visual box opening animation with rewards reveal
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mysteryBoxSystem, MYSTERY_BOXES, BoxOpeningResult } from '@/lib/mystery-box';
import { feedbackSystem } from '@/lib/feedback-system';
import { Sparkles, Gift, Package, Crown, Clock, X, Coins } from 'lucide-react';

interface MysteryBoxPanelProps {
  onClose: () => void;
}

export function MysteryBoxPanel({ onClose }: MysteryBoxPanelProps) {
  const [selectedBox, setSelectedBox] = useState<string | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [results, setResults] = useState<BoxOpeningResult[] | null>(null);
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState('00:00:00');
  const [totalOpened, setTotalOpened] = useState(0);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(() => {
      setTimeUntilNext(mysteryBoxSystem.getTimeUntilNextBox());
      setCanClaimDaily(mysteryBoxSystem.canClaimDailyBox());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = () => {
    setCanClaimDaily(mysteryBoxSystem.canClaimDailyBox());
    setTimeUntilNext(mysteryBoxSystem.getTimeUntilNextBox());
    setTotalOpened(mysteryBoxSystem.getTotalBoxesOpened());
  };

  const handleOpen = async () => {
    if (!selectedBox) return;

    setIsOpening(true);
    feedbackSystem.feedbackBoxOpen();

    // Simulate opening animation
    await new Promise(resolve => setTimeout(resolve, 1500));

    const result = mysteryBoxSystem.openBox(selectedBox);
    if (result.success && result.results) {
      setResults(result.results);
      checkStatus();
    }

    setIsOpening(false);
  };

  const handleCloseResults = () => {
    setResults(null);
    setSelectedBox(null);
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-500 to-pink-500';
      case 'epic': return 'from-amber-500 to-orange-500';
      case 'rare': return 'from-blue-500 to-cyan-500';
      case 'xp': return 'from-[var(--accent)] to-[var(--accent-2)]';
      default: return 'from-slate-500 to-slate-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Mystery Boxes</h1>
              <p className="text-sm text-muted-foreground">Open for random rewards!</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Daily Free Box */}
        <Card className={`overflow-hidden ${canClaimDaily ? 'ring-2 ring-[var(--accent)]' : ''}`}>
          <div className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] p-4 text-[var(--on-accent)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎁</div>
                <div>
                  <h3 className="font-bold">Daily Free Box</h3>
                  <p className="text-sm opacity-90">
                    {canClaimDaily ? 'Ready to open!' : `Next in ${timeUntilNext}`}
                  </p>
                </div>
              </div>
              {canClaimDaily && (
                <Badge className="bg-white text-[var(--accent-text)] animate-pulse font-bold">FREE</Badge>
              )}
            </div>
          </div>
          <CardContent className="p-4">
            <Button
              className="w-full"
              disabled={!canClaimDaily || isOpening}
              onClick={() => setSelectedBox('daily_free_box')}
            >
              {canClaimDaily ? 'Open Free Box' : `Wait ${timeUntilNext}`}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Boxes */}
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Package className="w-4 h-4" />
            Premium Boxes
          </h3>

          {MYSTERY_BOXES.filter(b => b.id !== 'daily_free_box').map((box) => (
            <motion.div
              key={box.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={`cursor-pointer overflow-hidden transition-all ${
                  selectedBox === box.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedBox(box.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${getRarityColor(box.rarity)} flex items-center justify-center text-3xl`}>
                      {box.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{box.name}</h4>
                      <p className="text-sm text-muted-foreground">{box.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          <Coins className="w-3 h-3 mr-1" />
                          {box.cost} XP
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {box.rarity}
                        </Badge>
                      </div>
                    </div>
                    {selectedBox === box.id && (
                      <Sparkles className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Open Button */}
        {selectedBox && !results && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <Button
              size="lg"
              className="w-full h-16 text-lg"
              onClick={handleOpen}
              disabled={isOpening}
            >
              {isOpening ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-current border-t-transparent rounded-full mr-2"
                  />
                  Opening...
                </>
              ) : (
                <>
                  <Gift className="w-5 h-5 mr-2" />
                  Open Box
                </>
              )}
            </Button>
          </motion.div>
        )}

        {/* Opening Animation */}
        <AnimatePresence>
          {isOpening && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
            >
              <motion.div
                animate={{
                  rotate: [0, -10, 10, -10, 10, 0],
                  scale: [1, 1.1, 1, 1.1, 1, 1.2]
                }}
                transition={{ duration: 1.5 }}
                className="text-8xl"
              >
                🎁
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 p-4"
            >
              <Card className="w-full max-w-sm">
                <CardContent className="p-6 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200 }}
                    className="text-6xl mb-4"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-xl font-bold mb-4">You Got:</h3>
                  <div className="space-y-3 mb-6">
                    {results.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: -50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: i * 0.2 }}
                        className={`p-3 rounded-lg bg-gradient-to-r ${getRarityColor(result.rarity)} text-white flex items-center justify-between`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{result.icon}</span>
                          <span className="font-semibold">{result.itemName}</span>
                        </div>
                        <Badge className="bg-white/20">
                          x{result.quantity}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                  <Button onClick={handleCloseResults} className="w-full">
                    Awesome!
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <Card className="bg-muted">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Boxes Opened</span>
              <span className="font-bold">{totalOpened}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
