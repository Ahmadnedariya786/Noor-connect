import { useState, useCallback, memo } from 'react';
import { MushafWord as MushafWordType } from '@/lib/mushaf-service';
import { useToast } from '@/hooks/use-toast';

interface MushafWordProps {
  word: MushafWordType;
  fontSize: number;
  isPlaying?: boolean;
  isHighlighted?: boolean;
  onPlayAudio?: (location: string) => void;
  onShowTooltip?: (word: MushafWordType, position: { x: number; y: number }) => void;
}

export const MushafWord = memo(function MushafWord({
  word,
  fontSize,
  isPlaying = false,
  isHighlighted = false,
  onPlayAudio,
  onShowTooltip
}: MushafWordProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const handleClick = useCallback(() => {
    if (onPlayAudio) {
      onPlayAudio(word.location);
    }
  }, [word.location, onPlayAudio]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    if (onShowTooltip) {
      const rect = e.currentTarget.getBoundingClientRect();
      onShowTooltip(word, {
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
  }, [word, onShowTooltip]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Parse location to get verse number
  const locationParts = word.location.split(':');
  const surahNumber = parseInt(locationParts[0]);
  const verseNumber = parseInt(locationParts[1]);

  // Determine if this is the last word of a verse (contains Arabic numeral)
  const isLastWord = /\d+$/.test(word.word.trim());

  return (
    <span
      className={`
        inline-block cursor-pointer transition-all duration-200
        ${isPlaying || isHighlighted 
          ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded px-0.5' 
          : ''
        }
        ${isHovered 
          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100' 
          : ''
        }
        hover:scale-105
      `}
      style={{
        fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif',
        fontSize: `${fontSize}px`,
        lineHeight: '2.2',
        letterSpacing: '0.02em'
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        setIsHovered(true);
        handleMouseEnter(e);
      }}
      onMouseLeave={handleMouseLeave}
      title={`${word.location}${isLastWord ? ` (Verse ${verseNumber})` : ''}`}
    >
      {word.word}
    </span>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.word.location === nextProps.word.location &&
    prevProps.word.word === nextProps.word.word &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.isPlaying === nextProps.isPlaying &&
    prevProps.isHighlighted === nextProps.isHighlighted
  );
});

interface WordTooltipProps {
  word: MushafWordType | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function WordTooltip({ word, position, onClose }: WordTooltipProps) {
  if (!word || !position) return null;

  const locationParts = word.location.split(':');
  const surah = locationParts[0];
  const verse = locationParts[1];
  const wordIndex = locationParts[2];

  return (
    <div
      className="fixed z-50 bg-white dark:bg-amber-950 border-2 border-amber-300 dark:border-amber-700 rounded-2xl shadow-2xl p-4 min-w-48 animate-in fade-in zoom-in duration-200"
      style={{
        left: Math.min(position.x, window.innerWidth - 200),
        top: position.y + 10,
        transform: 'translateX(-50%)'
      }}
      onClick={onClose}
    >
      <div className="space-y-3">
        <div className="text-center">
          <p 
            className="font-arabic text-2xl text-amber-900 dark:text-amber-100"
            style={{ fontFamily: 'var(--quran-font), "Uthmani", "Traditional Arabic", serif' }}
          >
            {word.word}
          </p>
        </div>
        
        <div className="border-t border-amber-200 dark:border-amber-800 pt-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-amber-600 dark:text-amber-400 text-xs">Surah</span>
              <p className="font-bold text-amber-900 dark:text-amber-100">{surah}</p>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-400 text-xs">Verse</span>
              <p className="font-bold text-amber-900 dark:text-amber-100">{verse}</p>
            </div>
            <div className="col-span-2">
              <span className="text-amber-600 dark:text-amber-400 text-xs">Word</span>
              <p className="font-bold text-amber-900 dark:text-amber-100">#{wordIndex}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            className="flex-1 bg-gradient-to-r from-emerald-400 to-teal-500 text-white py-2 px-3 rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-600 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              // Audio will be handled by parent
            }}
          >
            🔊 Play Audio
          </button>
        </div>
      </div>
    </div>
  );
}
