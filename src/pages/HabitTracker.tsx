import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import {
  Check,
  Flame,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  Download,
  RotateCcw,
  Sparkles,
  CalendarDays,
  TrendingUp,
  Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { cn } from "@/lib/utils";
import { habitTracker, HabitTracker, type Habit } from "@/lib/habit-tracker";
import { feedbackSystem } from "@/lib/feedback-system";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useToast } from "@/hooks/use-toast";

/* ------------------------------------------------------------------ */
/*  Dates (local-time, no Date.now drift, zero deps)                   */
/* ------------------------------------------------------------------ */
const DAY_MS = 86400000;

const toKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fromKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const addDays = (key: string, days: number): string => {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
};

const todayKey = (): string => toKey(new Date());

const dayOfYear = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / DAY_MS);
};

/* ------------------------------------------------------------------ */
/*  Static content (self-contained, no network, no i18n files)         */
/* ------------------------------------------------------------------ */
interface Quote {
  ar: string;
  en: string;
  source: string;
}

const QUOTES: Quote[] = [
  {
    ar: "أَحَبُّ الأَعْمَالِ إِلَى اللهِ أَدْوَمُهَا وَإِنْ قَلَّ",
    en: "The most beloved deeds to Allah are the most consistent, even if small.",
    source: "Sahih al-Bukhari 6464"
  },
  {
    ar: "لَنْ تَزُولَ قَدَمَا عَبْدٍ يَوْمَ الْقِيَامَةِ حَتَّى يُسْأَلَ عَنْ عُمُرِهِ فِيمَ أَفْنَاهُ",
    en: "A servant's feet will not move until asked about his life and how he spent it.",
    source: "Jami' at-Tirmidhi 2416"
  },
  {
    ar: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
    en: "Actions are only by intentions.",
    source: "Sahih al-Bukhari 1"
  },
  {
    ar: "مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ",
    en: "Whoever travels a path seeking knowledge, Allah eases for him a path to Paradise.",
    source: "Sahih Muslim 2699"
  },
  {
    ar: "لَا تَحْقِرَنَّ مِنَ الْمَعْرُوفِ شَيْئًا",
    en: "Do not belittle any good deed, even meeting your brother with a cheerful face.",
    source: "Sahih Muslim 2626"
  },
  {
    ar: "الطُّهُورُ شَطْرُ الْإِيمَانِ",
    en: "Purity is half of faith.",
    source: "Sahih Muslim 223"
  }
];

interface CategoryMeta {
  icon: string;
  color: string;
  soft: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  quran: { icon: "📖", color: "var(--accent)", soft: "bg-[var(--accent-soft)]" },
  prayer: { icon: "🕌", color: "#3b82f6", soft: "bg-blue-500/10" },
  dhikr: { icon: "📿", color: "#8b5cf6", soft: "bg-violet-500/10" },
  charity: { icon: "💝", color: "#ec4899", soft: "bg-pink-500/10" },
  fasting: { icon: "🌙", color: "#f97316", soft: "bg-orange-500/10" },
  general: { icon: "🌟", color: "#64748b", soft: "bg-slate-500/10" }
};

const CATEGORY_ORDER = ["quran", "prayer", "dhikr", "charity", "fasting", "general"];

const GOLD = "201, 134, 10";

const tEdit = "Edit";
const tHide = "Hide";
const tDelete = "Delete";

/* ------------------------------------------------------------------ */
/*  Small presentational pieces (module-level, stable refs)            */
/* ------------------------------------------------------------------ */
interface RingProps {
  pct: number;
  size?: number;
  stroke?: number;
  label?: string;
}

const Ring = memo(function Ring({ pct, size = 88, stroke = 9, label }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(201,134,10,0.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`rgba(${GOLD},0.95)`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      {label !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{label}</span>
        </div>
      )}
    </div>
  );
});

interface WeekStripProps {
  weekDates: string[];
  today: string;
  selected: string;
  doneCounts: number[];
  total: number;
  canPrev: boolean;
  canNext: boolean;
  onSelect: (date: string) => void;
  onShift: (dir: -1 | 1) => void;
  weekdayLabels: string[];
}

const WeekStrip = memo(function WeekStrip({
  weekDates,
  today,
  selected,
  doneCounts,
  total,
  canPrev,
  canNext,
  onSelect,
  onShift,
  weekdayLabels
}: WeekStripProps) {
  return (
    <Card className="p-3 border-border/40">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onShift(-1)}
          disabled={!canPrev}
          aria-label="Previous week"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekDates.map((date, i) => {
            const isToday = date === today;
            const isSelected = date === selected;
            const isFuture = date > today;
            const done = doneCounts[i];
            const full = total > 0 && done >= total;
            return (
              <button
                key={date}
                disabled={isFuture}
                onClick={() => onSelect(date)}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all duration-200",
                  isFuture && "opacity-25 pointer-events-none",
                  isSelected && "bg-[#C9860A]/15 ring-1 ring-[#C9860A]/40",
                  !isSelected && !isFuture && "hover:bg-muted/60"
                )}
              >
                <span className={cn("text-[10px] uppercase tracking-wide", isSelected ? "text-[#C9860A]" : "text-muted-foreground")}>
                  {weekdayLabels[i]}
                </span>
                <span
                  className={cn(
                    "w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors duration-200",
                    isSelected ? "bg-[#C9860A] text-white shadow-[0_2px_8px_rgba(201,134,10,0.45)]" : "text-foreground",
                    isToday && !isSelected && "ring-2 ring-[#C9860A]/50"
                  )}
                >
                  {fromKey(date).getDate()}
                </span>
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors duration-200",
                    isFuture ? "bg-transparent" : full ? "bg-[#C9860A]" : done > 0 ? "bg-[#C9860A]/40" : "bg-muted-foreground/20"
                  )}
                />
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onShift(1)}
          disabled={!canNext}
          aria-label="Next week"
          className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60 disabled:opacity-30 disabled:pointer-events-none transition-colors duration-150"
        >
          <ChevronRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>
    </Card>
  );
});

interface HeatmapProps {
  cells: { key: string; level: number; isToday: boolean; future: boolean }[];
  monthLabels: { col: number; label: string }[];
  onSelect: (date: string) => void;
}

const Heatmap = memo(function Heatmap({ cells, monthLabels, onSelect }: HeatmapProps) {
  const cols = cells.length / 7;
  return (
    <Card className="p-4 border-border/40">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
        <CalendarDays className="w-4 h-4 text-[#C9860A]" />
        Consistency
      </h3>
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }, (_, i) => (
          <div key={i} className="h-3 text-[8px] leading-3 text-muted-foreground truncate px-[1px]">
            {monthLabels.find(m => m.col === i)?.label ?? ""}
          </div>
        ))}
      </div>
      <div className="grid gap-[2px] mt-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: "minmax(0, 1fr)" }}>
        {cells.map(cell => (
          <button
            key={cell.key}
            onClick={() => !cell.future && onSelect(cell.key)}
            disabled={cell.future}
            aria-label={cell.key}
            className={cn("aspect-square rounded-[3px] transition-transform duration-100 active:scale-75", cell.future && "pointer-events-none")}
            style={{
              backgroundColor: cell.level > 0 ? `rgba(${GOLD},${[0.22, 0.45, 0.72, 0.95][cell.level]})` : "hsl(var(--muted) / 0.55)",
              boxShadow: cell.isToday ? "inset 0 0 0 1.5px rgba(255,255,255,0.9), inset 0 0 0 3px rgba(201,134,10,0.8)" : undefined,
              opacity: cell.future ? 0.25 : 1
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground justify-end">
        Less
        {[0, 1, 2, 3].map(l => (
          <span
            key={l}
            className="w-2.5 h-2.5 rounded-[3px]"
            style={{ backgroundColor: l > 0 ? `rgba(${GOLD},${[0.22, 0.45, 0.72, 0.95][l]})` : "hsl(var(--muted) / 0.55)" }}
          />
        ))}
        More
      </div>
    </Card>
  );
});

interface MonthBarsProps {
  bars: { key: string; ratio: number; isToday: boolean; day: number }[];
  startLabel: string;
  endLabel: string;
}

const MonthBars = memo(function MonthBars({ bars, startLabel, endLabel }: MonthBarsProps) {
  return (
    <Card className="p-4 border-border/40">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#C9860A]" />
        Last 30 days
      </h3>
      <div className="flex items-end gap-[3px] h-24">
        {bars.map(bar => (
          <div key={bar.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className={cn(
                "w-full rounded-t-[3px] transition-[height] duration-500 ease-out",
                bar.isToday && "ring-1 ring-[#C9860A]"
              )}
              style={{
                height: `${Math.max(4, bar.ratio * 100)}%`,
                background: `linear-gradient(to top, rgba(${GOLD},0.55), rgba(${GOLD},0.9))`,
                opacity: bar.isToday ? 1 : 0.75
              }}
              title={`${bar.key} — ${Math.round(bar.ratio * 100)}%`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
        <span>{startLabel}</span>
        <span>{endLabel}</span>
      </div>
    </Card>
  );
});

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

const StatCard = memo(function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <Card className="p-3 border-border/40 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#C9860A]/10 flex items-center justify-center shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-lg font-bold leading-tight tabular-nums truncate">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
      </div>
    </Card>
  );
});

interface HabitRowProps {
  habit: Habit;
  done: boolean;
  last7: boolean[];
  current: number;
  rate: number;
  canEdit: boolean;
  canHide: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onRemove: (habit: Habit) => void;
}

const HabitRow = memo(function HabitRow({
  habit,
  done,
  last7,
  current,
  rate,
  canEdit,
  canHide,
  disabled,
  onToggle,
  onEdit,
  onRemove
}: HabitRowProps) {
  const meta = CATEGORY_META[habit.category] ?? CATEGORY_META.general;
  return (
    <Card
      className={cn("border-border/40 transition-all duration-200 active:scale-[0.99] overflow-hidden", done && "border-[#C9860A]/25")}
      style={done ? { backgroundColor: `rgba(${GOLD},0.04)` } : undefined}
    >
      <div className="p-3.5 flex items-center gap-3">
        <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0", meta.soft)}>
          {habit.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold text-sm truncate", done && "text-[#C9860A]")}>{habit.name}</h3>
            {current > 0 && (
              <span
                className="flex items-center gap-0.5 text-xs font-bold text-orange-500 shrink-0"
                title={`Best streak: ${current}`}
              >
                <Flame className="w-3.5 h-3.5 fill-orange-400 text-orange-500" />
                {current}
              </span>
            )}
          </div>
          {habit.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{habit.description}</p>}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-[3px]">
              {last7.map((d, i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full transition-colors duration-300"
                  style={{ backgroundColor: d ? meta.color : "hsl(var(--muted-foreground) / 0.25)" }}
                />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">{rate}% · 30d</span>
            {habit.targetCount !== undefined && habit.unit && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ms-auto">
                <Target className="w-3 h-3" />
                {habit.targetCount} {habit.unit}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <button
            onClick={() => onToggle(habit.id)}
            disabled={disabled}
            aria-label={done ? "Mark as not done" : "Mark as done"}
            className={cn(
              "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-200 active:scale-90",
              done ? "border-transparent" : "border-border hover:border-[#C9860A]/40"
            )}
            style={done ? { backgroundColor: meta.color, boxShadow: `0 4px 14px ${meta.color}55` } : undefined}
          >
            <span
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full transition-transform duration-200",
                done ? "scale-100" : "scale-0"
              )}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3.5} />
            </span>
          </button>
          <div className="flex items-center gap-0.5" />
        </div>
      </div>

      <div className="flex justify-end px-3.5 pb-3 gap-1">
        {canEdit && (
          <button
            onClick={() => onEdit(habit)}
            className="text-[11px] text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 hover:text-foreground transition-colors duration-150"
          >
            <Pencil className="w-3 h-3" />
            {tEdit}
          </button>
        )}
        <button
          onClick={() => onRemove(habit)}
          className="text-[11px] text-muted-foreground flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40 transition-colors duration-150"
        >
          <Trash2 className="w-3 h-3" />
          {canHide ? tHide : tDelete}
        </button>
      </div>
    </Card>
  );
});

/* Module-level static labels (page-level t unavailable at module scope) */

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
interface FormState {
  name: string;
  description: string;
  category: string;
  targetCount: string;
  unit: string;
}

const EMPTY_FORM: FormState = { name: "", description: "", category: "quran", targetCount: "", unit: "" };

const RANGE_DAYS = 365;

export default function HabitTrackerPage() {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<{ id: string; habitId: string; date: string; timestamp: number }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Habit | null>(null);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [formError, setFormError] = useState("");

  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const today = useMemo(() => todayKey(), []);

  /* ------------------------- data loading ------------------------- */
  const reload = useCallback(() => {
    setHabits(habitTracker.getHabits());
    setHiddenCount(habitTracker.getHiddenHabits().length);
    const end = todayKey();
    const start = addDays(end, -RANGE_DAYS);
    setEntries(habitTracker.getEntries(start, end));
  }, []);

  useEffect(() => {
    reload();
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    const onStorage = () => reload();
    window.addEventListener("visibilitychange", onVisible);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
    };
  }, [reload]);

  /* ----------------------- derived data ---------------------------- */
  const doneByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of entries) {
      let set = map.get(e.date);
      if (!set) {
        set = new Set();
        map.set(e.date, set);
      }
      set.add(e.habitId);
    }
    return map;
  }, [entries]);

  const selectedEntries = useMemo(() => {
    return new Set(doneByDay.get(selectedDate) ?? []);
  }, [doneByDay, selectedDate]);

  const datesByHabit = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const e of entries) {
      let arr = map.get(e.habitId);
      if (!arr) {
        arr = [];
        map.set(e.habitId, arr);
      }
      arr.push(e.date);
    }
    return map;
  }, [entries]);

  const rowsData = useMemo(() => {
    const weekStart = addDays(selectedDate, -6);
    return habits.map(habit => {
      const streak = HabitTracker.computeStreakFromDates(datesByHabit.get(habit.id) ?? [], today);
      const last7 = Array.from({ length: 7 }, (_, i) => doneByDay.get(addDays(weekStart, i))?.has(habit.id) ?? false);
      let done30 = 0;
      for (let i = 0; i < 30; i++) {
        if (doneByDay.get(addDays(selectedDate, -i))?.has(habit.id)) done30++;
      }
      return {
        habit,
        done: selectedEntries.has(habit.id),
        last7,
        current: streak.current,
        longest: streak.longest,
        rate: Math.round((done30 / 30) * 100)
      };
    });
  }, [habits, doneByDay, selectedEntries, selectedDate, today]);

  const totals = useMemo(() => {
    const active = rowsData.filter(r => r.current > 0).length;
    const best = rowsData.reduce((m, r) => Math.max(m, r.longest), 0);
    const rate = rowsData.length ? Math.round(rowsData.reduce((s, r) => s + r.rate, 0) / rowsData.length) : 0;
    let deeds30 = 0;
    for (let i = 0; i < 30; i++) {
      deeds30 += doneByDay.get(addDays(selectedDate, -i))?.size ?? 0;
    }
    return { active, best, rate, deeds30 };
  }, [rowsData, doneByDay, selectedDate]);

  const weekDates = useMemo(() => {
    const d = fromKey(selectedDate);
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return Array.from({ length: 7 }, (_, i) => {
      const dd = new Date(d);
      dd.setDate(dd.getDate() + i);
      return toKey(dd);
    });
  }, [selectedDate]);

  const weekdayLabels = useMemo(() => {
    const base = fromKey(weekDates[0]);
    const fmt = new Intl.DateTimeFormat(language, { weekday: "narrow" });
    return weekDates.map((date, i) => {
      const dd = new Date(base);
      dd.setDate(base.getDate() + i);
      return fmt.format(dd);
    });
  }, [weekDates, language]);

  const doneCounts = useMemo(
    () => weekDates.map(date => doneByDay.get(date)?.size ?? 0),
    [weekDates, doneByDay]
  );

  const minDate = addDays(today, -RANGE_DAYS);
  const canPrev = selectedDate > minDate;
  const canNext = selectedDate < today;

  const heatmap = useMemo(() => {
    const end = fromKey(selectedDate);
    const dow = (end.getDay() + 6) % 7;
    end.setDate(end.getDate() - dow);
    const start = new Date(end);
    start.setDate(start.getDate() - 25 * 7);
    const cells: { key: string; level: number; isToday: boolean; future: boolean }[] = [];
    let lastMonth = -1;
    const monthLabels: { col: number; label: string }[] = [];
    const fmt = new Intl.DateTimeFormat(language, { month: "short" });
    for (let w = 0; w < 26; w++) {
      for (let dowI = 0; dowI < 7; dowI++) {
        const d = new Date(start);
        d.setDate(start.getDate() + w * 7 + dowI);
        const key = toKey(d);
        const month = d.getMonth();
        if (dowI === 0 && month !== lastMonth) {
          monthLabels.push({ col: w, label: fmt.format(d) });
          lastMonth = month;
        }
        const count = doneByDay.get(key)?.size ?? 0;
        const future = key > today;
        let level = 0;
        if (count > 0 && habits.length > 0) {
          level = count >= habits.length ? 3 : count / habits.length >= 0.5 ? 2 : 1;
        }
        cells.push({ key, level, isToday: key === today, future });
      }
    }
    return { cells, monthLabels };
  }, [selectedDate, doneByDay, habits.length, today, language]);

  const bars = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(language, { day: "numeric", month: "short" });
    const arr = Array.from({ length: 30 }, (_, i) => {
      const key = addDays(selectedDate, -(29 - i));
      const count = doneByDay.get(key)?.size ?? 0;
      return {
        key,
        ratio: habits.length ? count / habits.length : 0,
        isToday: key === today
      };
    });
    return { arr, startLabel: fmt.format(fromKey(arr[0].key)), endLabel: fmt.format(fromKey(arr[29].key)) };
  }, [selectedDate, doneByDay, habits.length, today, language]);

  const quote = useMemo(() => QUOTES[dayOfYear() % QUOTES.length], []);

  const completedToday = totals.rate > 0 ? rowsData.filter(r => r.done).length : 0;
  const todayPct = habits.length ? completedToday / habits.length : 0;
  const allDone = habits.length > 0 && completedToday === habits.length;

  /* --------------------------- actions ---------------------------- */
  const toggleHabit = useCallback((habitId: string) => {
    const date = selectedDate;
    const wasDone = entriesRef.current.some(e => e.habitId === habitId && e.date === date);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.habitId === habitId && e.date === date);
      if (idx >= 0) {
        const next = prev.slice();
        next.splice(idx, 1);
        return next;
      }
      return [...prev, { id: `${date}-${habitId}`, habitId, date, timestamp: Date.now() }];
    });
    habitTracker.toggleHabit(habitId, date);
    if (!wasDone) {
      feedbackSystem.hapticCorrect();
      const dates = entriesRef.current.filter(e => e.habitId === habitId).map(e => e.date);
      dates.push(date);
      const s = HabitTracker.computeStreakFromDates(dates, today);
      if (s.current > 0 && s.current % 7 === 0) {
        toast({ title: `${s.current}-day streak!`, description: "Consistency is beloved to Allah." });
      }
    }
  }, [selectedDate, today, toast]);

  const openAdd = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setFormMode("add");
  }, []);

  const openEdit = useCallback((habit: Habit) => {
    setForm({
      name: habit.name,
      description: habit.description ?? "",
      category: habit.category,
      targetCount: habit.targetCount !== undefined ? String(habit.targetCount) : "",
      unit: habit.unit ?? ""
    });
    setEditingId(habit.id);
    setFormError("");
    setFormMode("edit");
  }, []);

  const saveForm = useCallback(() => {
    const name = form.name.trim();
    if (!name) {
      setFormError("Please give this deed a name.");
      return;
    }
    const meta = CATEGORY_META[form.category] ?? CATEGORY_META.general;
    const habit: Habit = {
      id: editingId ?? "",
      name,
      description: form.description.trim(),
      category: form.category as Habit["category"],
      icon: meta.icon,
      color: meta.color,
      targetCount: form.targetCount ? Math.max(1, parseInt(form.targetCount, 10) || 1) : undefined,
      unit: form.unit.trim() || undefined
    };
    if (formMode === "edit" && editingId) {
      habitTracker.updateHabit(habit);
    } else {
      habitTracker.addCustomHabit(habit);
    }
    setFormMode(null);
    reload();
    feedbackSystem.hapticButton();
    toast({
      title: formMode === "edit" ? "Deed updated" : "Deed added",
      description: `"${name}" ${formMode === "edit" ? "has been updated." : "has been planted."}`
    });
  }, [form, formMode, editingId, reload, toast]);

  const confirmRemove = useCallback(() => {
    if (!removeTarget) return;
    habitTracker.deleteHabit(removeTarget.id);
    setRemoveTarget(null);
    reload();
    toast({
      title: removeTarget.id.startsWith("custom-") ? "Deed deleted" : "Deed hidden",
      description: removeTarget.id.startsWith("custom-")
        ? `"${removeTarget.name}" and its history were removed.`
        : `"${removeTarget.name}" was hidden. You can restore it anytime.`
    });
  }, [removeTarget, reload, toast]);

  const restoreHidden = useCallback(() => {
    for (const id of habitTracker.getHiddenHabits()) {
      habitTracker.restoreHabit(id);
    }
    reload();
    toast({ title: "Deeds restored", description: "All hidden habits are back." });
  }, [reload, toast]);

  const exportData = useCallback(() => {
    const data = habitTracker.exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `habit-tracker-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported", description: "Your habit data has been exported." });
  }, [today, toast]);

  const isCustom = (id: string) => id.startsWith("custom-");

  /* --------------------------- render ----------------------------- */
  const dateLabel = useMemo(() => {
    return new Intl.DateTimeFormat(language, { weekday: "long", day: "numeric", month: "long" }).format(fromKey(selectedDate));
  }, [selectedDate, language]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "May your night be blessed" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <LayoutManager>
      <AppBar
        title="Habit Tracker"
        showBack
        actions={
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        }
      />
      <div className="max-w-lg mx-auto px-4 pt-4 pb-32 space-y-3">

        {/* ------------------------- Hero ------------------------- */}
        <Card className="relative overflow-hidden border-border/40">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(120% 90% at 85% -10%, rgba(${GOLD},0.18), transparent 55%), radial-gradient(90% 80% at -10% 110%, rgba(${GOLD},0.1), transparent 50%)`
            }}
          />
          <div className="relative p-5 flex items-center gap-4">
            <Ring pct={todayPct} size={84} stroke={8} label={`${completedToday}/${habits.length || 0}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[#C9860A] font-semibold tracking-wide uppercase">{greeting}</p>
              <h2 className="text-base font-bold leading-snug">{dateLabel}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allDone
                  ? selectedDate === today ? "All deeds complete — MashaAllah!" : "All deeds complete on this day"
                  : habits.length
                    ? selectedDate === today
                      ? `${habits.length - completedToday} deed${habits.length - completedToday === 1 ? "" : "s"} remaining today`
                      : `${completedToday} of ${habits.length} deeds on this day`
                    : "Plant your first deed below"}
              </p>
            </div>
          </div>
          <div className="relative px-5 pb-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C9860A] mt-1 shrink-0" />
              <p className="text-xs leading-relaxed">
                <span className="font-arabic text-[#C9860A]">{quote.ar}</span>
                <span className="text-muted-foreground"> — “{quote.en}”</span>
              </p>
            </div>
            <div className="mt-1 text-right text-[10px] text-muted-foreground">{quote.source}</div>
          </div>
        </Card>

        {/* ---------------------- Week strip ----------------------- */}
        <WeekStrip
          weekDates={weekDates}
          today={today}
          selected={selectedDate}
          doneCounts={doneCounts}
          total={habits.length}
          canPrev={canPrev}
          canNext={canNext}
          onSelect={setSelectedDate}
          onShift={(dir: -1 | 1) => {
            const next = addDays(selectedDate, dir * 7);
            if (next >= minDate && next <= today) setSelectedDate(next);
          }}
          weekdayLabels={weekdayLabels}
        />

        {/* ------------------------- Stats -------------------------- */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard
            label="Active streaks"
            value={String(totals.active)}
            icon={<Flame className="w-4 h-4 text-orange-500" />}
          />
          <StatCard
            label="Best streak"
            value={`${totals.best}d`}
            icon={<Target className="w-4 h-4 text-blue-500" />}
          />
          <StatCard
            label="30-day consistency"
            value={`${totals.rate}%`}
            icon={<TrendingUp className="w-4 h-4 text-[var(--accent)]" />}
          />
          <StatCard
            label="Deeds · last 30 days"
            value={String(totals.deeds30)}
            icon={<Sparkles className="w-4 h-4 text-[#C9860A]" />}
          />
        </div>

        {/* ---------------------- Habit list ------------------------ */}
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-semibold">
            {selectedDate === today ? "Today's deeds" : "Deeds"}
            {selectedDate !== today && (
              <button onClick={() => setSelectedDate(today)} className="ms-2 text-[10px] text-[#C9860A] font-medium underline underline-offset-2">
                Back to today
              </button>
            )}
          </h3>
          <span className="text-[10px] text-muted-foreground">tap the circle to check in</span>
        </div>

        <div className="space-y-2">
          {rowsData.map(row => (
            <HabitRow
              key={row.habit.id}
              habit={row.habit}
              done={row.done}
              last7={row.last7}
              current={row.current}
              rate={row.rate}
              canEdit={isCustom(row.habit.id)}
              canHide={!isCustom(row.habit.id)}
              disabled={selectedDate > today}
              onToggle={toggleHabit}
              onEdit={openEdit}
              onRemove={setRemoveTarget}
            />
          ))}
          {rowsData.length === 0 && (
            <Card className="p-8 text-center border-dashed border-border/60">
              <div className="text-4xl mb-2">🌱</div>
              <h3 className="font-bold text-sm">No deeds yet</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                Plant your first habit — small consistent deeds are the most beloved to Allah.
              </p>
              <Button onClick={openAdd} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Add your first deed
              </Button>
            </Card>
          )}
        </div>

        {hiddenCount > 0 && (
          <button
            onClick={restoreHidden}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors duration-150"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {hiddenCount} hidden habit{hiddenCount === 1 ? "" : "s"} — restore
          </button>
        )}

        {/* ----------------------- Charts ---------------------------- */}
        {habits.length > 0 && selectedDate === today && (
          <>
            <MonthBars bars={bars.arr} startLabel={bars.startLabel} endLabel={bars.endLabel} />
            <Heatmap cells={heatmap.cells} monthLabels={heatmap.monthLabels} onSelect={setSelectedDate} />
          </>
        )}

        {/* --------------------- Data management -------------------- */}
        <Card className="p-3.5 border-border/40 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Data</h3>
            <p className="text-[10px] text-muted-foreground">Export your tracking history as JSON</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportData} className="gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </Card>
      </div>

      {/* ---------------------- Add / Edit dialog -------------------- */}
      <Dialog open={formMode !== null} onOpenChange={(open) => !open && setFormMode(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formMode === "edit" ? <Pencil className="w-4 h-4 text-[#C9860A]" /> : <Plus className="w-4 h-4 text-[#C9860A]" />}
              {formMode === "edit" ? "Edit deed" : "Plant a new deed"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="deed-name">Name</Label>
              <Input
                id="deed-name"
                value={form.name}
                onChange={(e) => {
                  setForm(f => ({ ...f, name: e.target.value }));
                  if (formError) setFormError("");
                }}
                placeholder="e.g., Read one page of Quran"
                autoFocus
              />
              {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
            </div>

            <div>
              <Label>Category</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {CATEGORY_ORDER.map(cat => {
                  const meta = CATEGORY_META[cat];
                  const selected = form.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all duration-200 active:scale-95",
                        selected ? "border-[#C9860A] bg-[#C9860A]/10" : "border-border hover:border-[#C9860A]/30"
                      )}
                    >
                      <span className="text-lg">{meta.icon}</span>
                      <span className={cn("text-[10px] font-medium capitalize", selected ? "text-[#C9860A]" : "text-muted-foreground")}>
                        {cat}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="deed-target">Daily target</Label>
                <Input
                  id="deed-target"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={form.targetCount}
                  onChange={(e) => setForm(f => ({ ...f, targetCount: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label htmlFor="deed-unit">Unit</Label>
                <Input
                  id="deed-unit"
                  value={form.unit}
                  onChange={(e) => setForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="pages, minutes…"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deed-desc">Note</Label>
              <Textarea
                id="deed-desc"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Why this deed matters to you…"
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button onClick={saveForm} className="flex-1">
                {formMode === "edit" ? "Save changes" : "Plant deed"}
              </Button>
              <Button variant="outline" onClick={() => setFormMode(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ---------------------- Delete confirm ----------------------- */}
      <AlertDialog open={removeTarget !== null} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removeTarget && isCustom(removeTarget.id) ? "Delete this deed?" : "Hide this deed?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && isCustom(removeTarget.id)
                ? `"${removeTarget.name}" and all of its tracking history will be permanently removed.`
                : `"${removeTarget?.name}" will be hidden from your list. You can restore it anytime.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700 text-white">
              {removeTarget && isCustom(removeTarget.id) ? "Delete" : "Hide"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutManager>
  );
}
