import React from 'react';
import { Check, Sparkles } from 'lucide-react';
import { type ThemeId } from '@/types/theme';
import { useAppTheme } from '@/lib/theme-engine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ThemePickerProps {
  onSelected?: (themeId: ThemeId) => void;
  className?: string;
}

export const ThemePicker: React.FC<ThemePickerProps> = ({
  onSelected,
  className,
}) => {
  const { currentTheme, setTheme, themes } = useAppTheme();
  const { toast } = useToast();

  const handleSelect = (themeId: ThemeId, themeName: string) => {
    setTheme(themeId);
    if (onSelected) {
      onSelected(themeId);
    }
    toast({
      title: 'Theme Applied',
      description: `${themeName} is now active.`,
    });
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            App Themes
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Select a premium dark aesthetic. Applied instantly across the entire app.
          </p>
        </div>
      </div>

      {/* 2-Column Grid of 5 Preview Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {themes.map((theme) => {
          const isSelected = currentTheme === theme.id;

          return (
            <div
              key={theme.id}
              onClick={() => handleSelect(theme.id, theme.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(theme.id, theme.name);
                }
              }}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl transition-all duration-200 cursor-pointer select-none text-left p-3 sm:p-3.5",
                "backdrop-blur-sm",
                isSelected
                  ? "border border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-[0_0_18px_var(--accent-glow)]"
                  : "border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] active:scale-[0.98]"
              )}
              style={{
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
                      isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-primary)] group-hover:text-[var(--accent-text)]"
                    )}
                  >
                    {theme.name}
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {theme.subtitle}
                  </p>
                </div>

                {isSelected ? (
                  <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[var(--accent)] text-[var(--on-accent)] shrink-0 shadow-sm">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                    Active
                  </span>
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-[var(--border)] group-hover:border-[var(--accent)]/50 shrink-0 mt-0.5" />
                )}
              </div>

              {/* Static Mini Dashboard Mock: bg gradient + sample card + text lines + accent button */}
              <div
                className="w-full rounded-xl overflow-hidden p-2 sm:p-2.5 flex flex-col justify-between min-h-[110px] sm:min-h-[120px] pointer-events-none border"
                style={{
                  background: `linear-gradient(180deg, ${theme.tokens['--bg-base']} 0%, ${theme.tokens['--bg-elev']} 100%)`,
                  borderColor: theme.tokens['--border'],
                }}
              >
                {/* Sample Card */}
                <div
                  className="rounded-lg p-2 flex flex-col justify-between flex-1 border shadow-xs"
                  style={{
                    background: theme.tokens['--surface'],
                    borderColor: theme.tokens['--border'],
                  }}
                >
                  {/* Card Header Line */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider truncate"
                      style={{ color: theme.tokens['--accent-text'] }}
                    >
                      NEXT PRAYER
                    </span>
                    <span
                      className="text-[7.5px] font-mono px-1 py-0.5 rounded font-bold shrink-0"
                      style={{
                        background: theme.tokens['--accent-soft'],
                        color: theme.tokens['--accent-text'],
                      }}
                    >
                      In 2h 15m
                    </span>
                  </div>

                  {/* Prayer Name + Time */}
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span
                      className="text-xs font-bold italic"
                      style={{ color: theme.tokens['--text-primary'] }}
                    >
                      Dhuhr
                    </span>
                    <span
                      className="text-[9px] font-semibold"
                      style={{ color: theme.tokens['--text-secondary'] }}
                    >
                      12:30 PM
                    </span>
                  </div>

                  {/* Accent Progress & Button */}
                  <div className="flex items-center justify-between gap-1.5 mt-auto pt-1">
                    <div
                      className="h-1 rounded-full flex-1 overflow-hidden"
                      style={{ background: theme.tokens['--surface-2'] }}
                    >
                      <div
                        className="h-full rounded-full w-3/5"
                        style={{ background: theme.tokens['--accent'] }}
                      />
                    </div>
                    <span
                      className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0 shadow-xs"
                      style={{
                        background: theme.tokens['--accent'],
                        color: theme.tokens['--on-accent'],
                      }}
                    >
                      VIEW
                    </span>
                  </div>
                </div>
              </div>

              {/* Description Footer */}
              <p className="text-[10px] text-muted-foreground/90 mt-2.5 line-clamp-2 leading-tight">
                {theme.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThemePicker;
