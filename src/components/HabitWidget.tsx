import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Circle, Flame, Target, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { habitTracker, habitIntegration, type Habit, type HabitEntry, type IntegratedPrayerInfo } from '@/lib/habit-tracker';
import { cn } from '@/lib/utils';

interface HabitWidgetProps {
  className?: string;
}

const PRAYER_LABELS: Record<string, string> = { fajr: 'F', dhuhr: 'D', asr: 'A', maghrib: 'M', isha: 'I' };

export function HabitWidget({ className }: HabitWidgetProps) {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [prayers, setPrayers] = useState<IntegratedPrayerInfo[]>([]);

  const refresh = () => {
    setHabits(habitTracker.getHabits());
    setEntries(habitTracker.getEntriesForDate(today));
    habitIntegration.getIntegratedPrayerStatus().then(setPrayers);
  };

  useEffect(() => { refresh(); }, []);

  const completedCount = useMemo(() => entries.length, [entries]);
  const prayersDone = useMemo(() => prayers.filter(p => p.completed).length, [prayers]);

  const toggle = (habitId: string) => {
    habitTracker.toggleHabit(habitId, today);
    refresh();
  };

  const isToday = true;

  if ((habits.length === 0 && prayers.length === 0)) return null;

  return (
    <Card className={`overflow-hidden border-border/40 ${className ?? ''}`}>
      <CardContent className="p-4 space-y-3">

        {/* Prayer mini-status */}
        {prayers.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" /> Salah
              </h4>
              <span className="text-[10px] font-medium text-muted-foreground">{prayersDone}/5</span>
            </div>
            <div className="flex gap-1">
              {prayers.map(p => (
                <div
                  key={p.name}
                  className={cn(
                    "w-6 h-6 rounded text-[9px] font-bold flex items-center justify-center",
                    p.completed ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                  )}
                  title={p.label}
                >
                  {PRAYER_LABELS[p.name]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits mini-list */}
        {habits.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                <Target className="w-3 h-3" /> Habits
              </h4>
              <span className="text-[10px] font-medium text-muted-foreground">{completedCount}/{habits.length}</span>
            </div>
            <div className="space-y-1">
              {habits.slice(0, 4).map(h => {
                const done = entries.some(e => e.habitId === h.id);
                return (
                  <button key={h.id} onClick={() => toggle(h.id)} className="w-full flex items-center gap-2 p-1 rounded hover:bg-muted/50 transition-colors text-left">
                    {done ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                    )}
                    <span className="text-[11px]">{h.icon}</span>
                    <span className={`text-[11px] flex-1 truncate ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{h.name}</span>
                  </button>
                );
              })}
            </div>
            {habits.length > 4 && (
              <p className="text-[9px] text-muted-foreground text-center mt-1">+{habits.length - 4} more</p>
            )}
          </div>
        )}

        <Button variant="ghost" size="sm" onClick={() => navigate('/habit-tracker')} className="w-full text-xs gap-1 text-muted-foreground">
          Open Habit Tracker <ArrowRight className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
