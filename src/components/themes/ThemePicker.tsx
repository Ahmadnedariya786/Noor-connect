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
    // Synchronous DOM + storage update in current frame
    setTheme(themeId);
    if (onSelected) {
      onSelected(themeId);
    }
    // Defer toast and non-critical work
    setTimeout(() => {
      toast({
        title: 'Theme Applied',
        description: `${themeName} is now active.`,
      });
    }, 0);
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

      {/* 2-Column Grid of 7 Preview Cards */}
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
                "group relative flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer select-none text-left p-2.5 sm:p-3 h-auto min-h-full",
                "backdrop-blur-sm",
                isSelected
                  ? "border border-[var(--accent)] ring-1 ring-[var(--accent)]"
                  : "border border-[var(--border)] hover:border-[var(--accent)]/40 hover:bg-[var(--surface-2)] active:scale-[0.98]"
              )}
              style={{
                borderRadius: theme.signature ? theme.signature.radius : '16px',
                padding: '10px 10px',
                height: 'auto',
                minHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: isSelected
                  ? 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)'
                  : 'linear-gradient(180deg, var(--surface) 0%, var(--bg-base) 100%)',
                boxShadow: isSelected
                  ? (theme.signature ? theme.signature.glow : '0 0 18px var(--accent-glow)')
                  : undefined,
              }}
            >
              {/* Row 1: Name and Active Badge (Zero Truncation at 360px) */}
              <div className="flex items-center justify-between mb-1 w-full min-w-0" style={{ gap: '4px' }}>
                <h3
                  className={cn(
                    "leading-snug whitespace-nowrap",
                    isSelected ? "text-[var(--accent-text)]" : "text-[var(--text-primary)] group-hover:text-[var(--accent-text)]"
                  )}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {theme.name}
                </h3>

                {isSelected ? (
                  <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 bg-[var(--accent)] text-[var(--on-accent)] shadow-sm">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-[var(--border)] group-hover:border-[var(--accent)]/50 shrink-0 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-transparent group-hover:bg-[var(--accent)]/30" />
                  </div>
                )}
              </div>

              {/* Row 2: Full-Width Subtitle (Concise 2-line max string with zero truncation) */}
              <p className="text-[10px] text-[var(--text-secondary)] font-medium mb-2.5 w-full leading-tight min-h-[26px] line-clamp-2">
                {theme.subtitle}
              </p>

              {/* Static Mini Dashboard Mock: bg gradient + sample card with per-theme signature silhouette, border & motif */}
              <div
                className="w-full overflow-hidden p-2 sm:p-2.5 flex flex-col justify-between min-h-[115px] sm:min-h-[120px] pointer-events-none border"
                style={{
                  borderRadius: theme.signature ? theme.signature.radius : '12px',
                  background: `radial-gradient(ellipse 100% 60% at 50% -10%, ${theme.tokens['--accent-soft']} 0%, transparent 70%), linear-gradient(180deg, ${theme.tokens['--bg-base']} 0%, ${theme.tokens['--bg-elev']} 100%)`,
                  borderColor: theme.tokens['--border'],
                }}
              >
                {/* Sample Card consuming Theme Signature properties */}
                <div
                  className="p-2 flex flex-col justify-between flex-1 relative overflow-hidden min-h-[96px]"
                  style={{
                    borderRadius: theme.signature ? theme.signature.radius : '10px',
                    border: `1px solid ${theme.tokens['--border']}`,
                    borderTop: `1px solid ${theme.tokens['--sig-thread'] || theme.tokens['--accent']}`,
                    boxShadow: theme.tokens['--card-sheen-line']
                      ? `inset 0 1px 0 ${theme.tokens['--card-sheen-line']}, 0 4px 14px rgba(0,0,0,0.35)`
                      : `inset 0 1px 0 ${theme.tokens['--card-sheen']}, 0 4px 14px rgba(0,0,0,0.35)`,
                    background: theme.tokens['--surface'],
                  }}
                >
                  {/* Tiny Theme Signature Motif Watermark with Guarded Layer Class */}
                  {theme.tokens['--sig-motif'] && (
                    <div
                      className="sig-motif-layer pointer-events-none select-none"
                      style={{
                        position: 'absolute',
                        ...(theme.id === 'kiswah-noir'
                          ? {
                              top: 0,
                              left: 0,
                              right: 0,
                              height: '10px',
                              backgroundColor: theme.tokens['--sig-thread'] || theme.tokens['--accent'],
                              opacity: 0.35,
                              WebkitMaskImage: theme.tokens['--sig-motif'],
                              maskImage: theme.tokens['--sig-motif'],
                              WebkitMaskSize: '36px 10px',
                              maskSize: '36px 10px',
                              WebkitMaskRepeat: 'repeat-x',
                              maskRepeat: 'repeat-x',
                              WebkitMaskPosition: 'top center',
                              maskPosition: 'top center',
                            }
                          : {
                              right: '2px',
                              bottom: '2px',
                              width: '36px',
                              height: '36px',
                              backgroundColor: theme.tokens['--accent'],
                              opacity: 0.18,
                              WebkitMaskImage: theme.tokens['--sig-motif'],
                              maskImage: theme.tokens['--sig-motif'],
                              WebkitMaskSize: 'contain',
                              maskSize: 'contain',
                              WebkitMaskRepeat: 'no-repeat',
                              maskRepeat: 'no-repeat',
                              WebkitMaskPosition: 'center',
                              maskPosition: 'center',
                            }),
                      }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Card Header Line (NEXT badge + countdown) */}
                  <div
                    className="mb-1 relative z-10"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px',
                      width: '100%',
                      minWidth: 0,
                    }}
                  >
                    <span
                      className="rounded-full uppercase"
                      style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        overflow: 'visible',
                        fontSize: '0.56rem',
                        fontWeight: 800,
                        padding: '2px 6px',
                        background: `linear-gradient(135deg, ${theme.tokens['--accent']} 0%, ${theme.tokens['--accent-2']} 100%)`,
                        color: theme.tokens['--on-accent'],
                        boxShadow: `0 1px 4px ${theme.tokens['--accent-glow']}`,
                      }}
                    >
                      NEXT
                    </span>
                    <span
                      className="font-mono rounded font-bold"
                      style={{
                        minWidth: 0,
                        flexShrink: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '0.56rem',
                        padding: '2px 4px',
                        background: theme.tokens['--accent-soft'],
                        color: theme.tokens['--accent-text'],
                      }}
                    >
                      In 2h 15m
                    </span>
                  </div>

                  {/* Prayer Name + Time with Per-Theme Signature Heading Typography */}
                  <div className="flex items-baseline justify-between mb-1.5 relative z-10">
                    <span
                      className="text-xs font-bold"
                      style={{
                        color: theme.tokens['--text-primary'],
                        fontFamily: theme.signature ? theme.signature.headingFamily : undefined,
                        letterSpacing: theme.signature ? theme.signature.headingTracking : undefined,
                        textTransform: (theme.signature ? theme.signature.headingTransform : undefined) as any,
                        fontStyle: theme.signature ? theme.signature.headingStyle : undefined,
                      }}
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
                  <div className="flex items-center justify-between gap-1.5 mt-auto pt-1 relative z-10">
                    <div
                      className="h-1 rounded-full flex-1 overflow-hidden"
                      style={{ background: theme.tokens['--surface-2'] }}
                    >
                      <div
                        className="h-full rounded-full w-3/5"
                        style={{
                          background: `linear-gradient(90deg, ${theme.tokens['--accent']} 0%, ${theme.tokens['--accent-2']} 100%)`,
                        }}
                      />
                    </div>
                    <span
                      className="text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${theme.tokens['--accent']} 0%, ${theme.tokens['--accent-2']} 100%)`,
                        color: theme.tokens['--on-accent'],
                        boxShadow: `0 2px 8px ${theme.tokens['--accent-glow']}`,
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
