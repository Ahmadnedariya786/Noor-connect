/**
 * Lives Display Component
 * Shows hearts/lives with regeneration timer
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { livesSystem } from '@/lib/lives-system';
import { Heart, Clock, Plus } from 'lucide-react';

interface LivesDisplayProps {
  onRefill?: () => void;
  showRefillButton?: boolean;
}

export function LivesDisplay({ onRefill, showRefillButton = true }: LivesDisplayProps) {
  const [lives, setLives] = useState(5);
  const [maxLives, setMaxLives] = useState(5);
  const [timeUntilNext, setTimeUntilNext] = useState('00:00');
  const [isLow, setIsLow] = useState(false);

  useEffect(() => {
    const updateLives = () => {
      const current = livesSystem.getCurrentLives();
      const max = livesSystem.getMaxLives();
      setLives(current);
      setMaxLives(max);
      setTimeUntilNext(livesSystem.getTimeUntilNextLife());
      setIsLow(current <= 2);
    };

    updateLives();
    const interval = setInterval(updateLives, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefill = () => {
    const result = livesSystem.refillLivesWithXP();
    if (result.success) {
      setLives(livesSystem.getMaxLives());
      onRefill?.();
    }
    return result;
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-full ${
      isLow 
        ? 'bg-red-100 dark:bg-red-900/30 border border-red-200' 
        : 'bg-pink-100 dark:bg-pink-900/30'
    }`}>
      {/* Hearts */}
      <div className="flex items-center">
        {Array.from({ length: maxLives }).map((_, i) => (
          <motion.div
            key={i}
            initial={i < lives ? { scale: 1 } : { scale: 0.8 }}
            animate={i < lives ? { scale: 1 } : { scale: 0.5, opacity: 0.3 }}
          >
            <Heart
              className={`w-5 h-5 ${
                i < lives
                  ? 'text-red-500 fill-red-500'
                  : 'text-gray-300'
              }`}
            />
          </motion.div>
        ))}
      </div>

      {/* Counter */}
      <span className={`font-bold text-sm ${isLow ? 'text-red-600' : 'text-pink-600'}`}>
        {lives}/{maxLives}
      </span>

      {/* Regeneration Timer or Full Status Badge */}
      {lives < maxLives ? (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{timeUntilNext}</span>
        </div>
      ) : (
        <span className="text-[11px] font-bold text-[var(--accent-text)] bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-0.5 rounded-full whitespace-nowrap">
          {lives}/{maxLives} Full • Ready to Play
        </span>
      )}

      {/* Refill Button */}
      {showRefillButton && lives < maxLives && (
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs"
          onClick={handleRefill}
        >
          <Plus className="w-3 h-3 mr-1" />
          100 XP
        </Button>
      )}
    </div>
  );
}

// Compact version for header
export function LivesCompact() {
  const [lives, setLives] = useState(5);
  const [maxLives, setMaxLives] = useState(5);

  useEffect(() => {
    const updateLives = () => {
      setLives(livesSystem.getCurrentLives());
      setMaxLives(livesSystem.getMaxLives());
    };

    updateLives();
    const interval = setInterval(updateLives, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  const isLow = lives <= 2;

  return (
    <Badge 
      variant={isLow ? "destructive" : "default"}
      className={`flex items-center gap-1 ${isLow ? 'animate-pulse' : ''}`}
    >
      <Heart className={`w-3 h-3 ${lives > 0 ? 'fill-current' : ''}`} />
      <span className="text-xs">{lives}</span>
    </Badge>
  );
}
