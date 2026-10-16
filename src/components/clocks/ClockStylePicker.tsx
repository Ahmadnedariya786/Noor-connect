import React, { useMemo } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { type ClockStyleId, CLOCK_STYLES } from '@/types/clock';
import { useClockStyle } from '@/lib/clock-style';
import { useSettings } from '@/contexts/SettingsContext';
import { ClockRenderer } from './ClockRenderer';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Fixed static preview time: exactly 10:08 (zero ticker overhead)
const STATIC_PREVIEW_NOW = new Date(2026, 0, 1, 10, 8, 30);

const STATIC_PREVIEW_NEXT = {
  name: 'Dhuhr',
  time: '12:30',
  progress: 0.55,
  targetTime: new Date(2026, 0, 1, 12, 30, 0),
};

const STATIC_PREVIEW_PREV = {
  name: 'Fajr',
  time: '05:30',
  date: new Date(2026, 0, 1, 5, 30, 0),
};

interface ClockStylePickerProps {
  onSelected?: (styleId: ClockStyleId) => void;
  className?: string;
}

export const ClockStylePicker: React.FC<ClockStylePickerProps> = ({
  onSelected,
  className,
}) => {
  const { clockStyle, setClockStyle } = useClockStyle();
  const { timeFormat } = useSettings();
  const { toast } = useToast();

  const normalizedTimeFormat: '12h' | '24h' =
    (timeFormat as string) === '24' || timeFormat === '24h' ? '24h' : '12h';

  const handleSelect = (styleId: ClockStyleId, styleName: string) => {
    setClockStyle(styleId);
    if (onSelected) {
      onSelected(styleId);
    }
    toast({
      title: 'Clock Style Applied',
      description: `${styleName} is now active on your Home dashboard.`,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            Clock Display Styles
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select a design for your home dashboard. Applied instantly.
          </p>
        </div>
      </div>

      {/* 2-Column Grid of 6 Preview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {CLOCK_STYLES.map((style) => {
          const isSelected = clockStyle === style.id;

          return (
            <div
              key={style.id}
              onClick={() => handleSelect(style.id, style.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(style.id, style.name);
                }
              }}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl transition-all duration-200 cursor-pointer select-none text-left p-3 sm:p-3.5",
                "border backdrop-blur-sm",
                isSelected
                  ? "ring-1 shadow-lg"
                  : "border-border/70 hover:bg-card active:scale-[0.98]"
              )}
              style={{
                borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                boxShadow: isSelected ? '0 0 16px var(--accent-glow)' : undefined,
                background: isSelected
                  ? 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)'
                  : 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)',
              }}
            >
              {/* Top Row: Name and Active Badge */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="min-w-0 flex-1">
                  <h3
                    className={cn(
                      "text-xs sm:text-sm font-bold tracking-tight truncate",
                      isSelected ? "text-amber-400" : "text-foreground"
                    )}
                    style={{ color: isSelected ? 'var(--accent-text)' : undefined }}
                  >
                    {style.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {style.subtitle}
                  </p>
                </div>

                {isSelected ? (
                  <span
                    className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black shrink-0 shadow-sm"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--on-accent)',
                    }}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    Active
                  </span>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-border/80 shrink-0 mt-0.5" />
                )}
              </div>

              {/* Static Preview Canvas Fixed at 10:08 (No live ticker) */}
              <div className="w-full flex items-center justify-center py-2 px-1 min-h-[110px] sm:min-h-[120px] rounded-xl bg-background/50 border border-border/40 overflow-hidden pointer-events-none">
                <ClockRenderer
                  styleId={style.id}
                  now={STATIC_PREVIEW_NOW}
                  timeFormat={normalizedTimeFormat}
                  hijriDate="14 Shawwal 1447"
                  nextPrayer={STATIC_PREVIEW_NEXT}
                  previousPrayer={STATIC_PREVIEW_PREV}
                  isStaticPreview={true}
                />
              </div>

              {/* Description Footer */}
              <p className="text-[10px] text-muted-foreground/90 mt-2.5 line-clamp-2 leading-tight">
                {style.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClockStylePicker;
