import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Check, ArrowRight, Target } from 'lucide-react';
import { habitTracker, type Habit, type HabitEntry } from '@/lib/habit-tracker';
import { cn } from '@/lib/utils';

interface HabitWidgetProps {
  className?: string;
}

const CATEGORY_COLOR: Record<string, string> = {
  quran: 'var(--accent)',
  prayer: '#3b82f6',
  dhikr: '#8b5cf6',
  charity: '#ec4899',
  fasting: '#f97316',
  general: '#64748b'
};

export function HabitWidget({ className }: HabitWidgetProps) {
  const navigate = useNavigate();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const refresh = useCallback(() => {
    setHabits(habitTracker.getHabits());
    setEntries(habitTracker.getEntriesForDate(today));
  }, [today]);

  useEffect(() => {
    refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener('visibilitychange', onVisible);
    return () => window.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const toggle = useCallback(
    (habitId: string) => {
      habitTracker.toggleHabit(habitId, today);
      refresh();
    },
    [today, refresh]
  );

  const completedCount = useMemo(() => entries.length, [entries]);
  const doneIds = useMemo(() => new Set(entries.map(e => e.habitId)), [entries]);

  if (habits.length === 0) return null;

  const pct = completedCount / habits.length;
  const r = 15;
  const c = 2 * Math.PI * r;

  return (
    <Card className={cn('overflow-hidden border border-[var(--border)] bg-[var(--surface)]', className ?? '')}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 shrink-0">
            <svg width={40} height={40} className="-rotate-90">
              <circle cx={20} cy={20} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={5} />
              <circle
                cx={20}
                cy={20}
                r={r}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={5}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
                className="transition-[stroke-dashoffset] duration-500 ease-out"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
              {Math.round(pct * 100)}%
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold flex items-center gap-1">
              <Target className="w-3 h-3 text-[var(--accent)]" /> Habits
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {completedCount}/{habits.length} done today
            </p>
          </div>
        </div>

        <div className="space-y-1">
          {habits.slice(0, 4).map(h => {
            const done = doneIds.has(h.id);
            const color = CATEGORY_COLOR[h.category] ?? '#64748b';
            return (
              <button
                key={h.id}
                onClick={() => toggle(h.id)}
                className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors duration-150 text-left"
              >
                <span
                  className={cn(
                    'w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0',
                    done ? 'border-transparent' : 'border-muted-foreground/30'
                  )}
                  style={done ? { backgroundColor: color } : undefined}
                >
                  {done && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                </span>
                <span className="text-xs">{h.icon}</span>
                <span className={cn('text-xs flex-1 truncate', done ? 'text-[var(--accent)] font-medium' : 'text-foreground')}>
                  {h.name}
                </span>
              </button>
            );
          })}
        </div>
        {habits.length > 4 && (
          <p className="text-[10px] text-muted-foreground text-center">+{habits.length - 4} more</p>
        )}

        <button
          onClick={() => navigate('/habit-tracker')}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors duration-150"
        >
          Open Habit Tracker <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </button>
      </CardContent>
    </Card>
  );
}
