import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  getDayStatus,
  getLogForDate,
  SYMPTOMS,
  type HaidhTrackerData,
  type DayStatus,
} from "@/lib/haidh-tracker";

interface Props { data: HaidhTrackerData }

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Status → cell base style (the day's actual phase).
const STATUS_BASE: Record<DayStatus, string> = {
  haidh:     "bg-rose-500/25 text-rose-600 dark:text-rose-300",
  tuhr:      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  predicted: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  fertile:   "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  ovulation: "bg-yellow-400/30 text-yellow-600 dark:text-yellow-300 ring-2 ring-yellow-400/50",
  future:    "bg-transparent text-muted-foreground/40",
  today:     "bg-muted text-foreground",
};

function buildCalendar(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return { first, days };
}

export function HaidhCalendarTab({ data }: Props) {
  const now = new Date();
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  const { year, month } = useMemo(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [offset]); // eslint-disable-line react-hooks/exhaustive-deps

  const { first, days } = buildCalendar(year, month);
  const todayStr = toDateStr(now);

  const cells: (number | null)[] = [
    ...Array(first).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const dateStrFor = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const legend = [
    { label: "Ḥaidh", cls: "bg-rose-500/40" },
    { label: "Ṭuhr", cls: "bg-emerald-500/30" },
    { label: "Fertile", cls: "bg-violet-500/40" },
    { label: "Ovulation", cls: "bg-yellow-400/50" },
    { label: "Predicted", cls: "bg-amber-500/40" },
    { label: "Today", cls: "ring-2 ring-foreground/60" },
  ];

  const selectedLog = selected ? getLogForDate(data, selected) : null;
  const selectedStatus = selected ? getDayStatus(data, selected) : null;

  return (
    <div className="space-y-6 pb-24">
      {/* Month navigation */}
      <div className="flex items-center justify-between bg-card border border-border rounded-[24px] p-2">
        <button
          onClick={() => setOffset(o => o - 1)}
          aria-label="Previous month"
          className="w-10 h-10 rounded-[16px] flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-foreground/70" />
        </button>
        <h3 className="font-black tracking-widest uppercase text-foreground">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={() => setOffset(o => o + 1)}
          aria-label="Next month"
          className="w-10 h-10 rounded-[16px] flex items-center justify-center bg-muted hover:bg-muted/70 transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-foreground/70" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-[32px] p-5 shadow-lg">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {DOW.map(d => (
            <div key={d} className="text-center text-xs font-black uppercase tracking-widest text-muted-foreground">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} className="aspect-square" />;
            const dateStr = dateStrFor(day);
            const status = getDayStatus(data, dateStr);
            const isToday = dateStr === todayStr;
            const log = getLogForDate(data, dateStr);

            return (
              <button
                key={day}
                onClick={() => setSelected(dateStr)}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center rounded-[14px] text-sm font-bold transition-all",
                  "hover:ring-2 hover:ring-rose-500/40",
                  STATUS_BASE[status],
                  isToday && "ring-2 ring-foreground/70"
                )}
              >
                <span>{day}</span>
                {log?.flow && log.flow !== "none" && (
                  <span className="flex gap-0.5 mt-1">
                    {log.flow === "spotting" && <span className="w-1 h-1 rounded-full bg-current opacity-40" />}
                    {log.flow === "light" && <span className="w-1 h-1 rounded-full bg-current opacity-60" />}
                    {log.flow === "medium" && <>
                      <span className="w-1 h-1 rounded-full bg-current opacity-70" />
                      <span className="w-1 h-1 rounded-full bg-current opacity-70" />
                    </>}
                    {log.flow === "heavy" && <>
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="w-1 h-1 rounded-full bg-current" />
                      <span className="w-1 h-1 rounded-full bg-current" />
                    </>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {legend.map(l => (
          <div key={l.label} className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted-foreground">
            <div className={cn("w-3.5 h-3.5 rounded-md", l.cls)} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Past cycles */}
      {data.cycles.filter(c => c.endDate).length > 0 && (
        <div className="bg-card border border-border rounded-[32px] p-6 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Past Cycles</p>
          {data.cycles.filter(c => c.endDate).slice(0, 5).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm bg-background p-3 rounded-[20px] border border-border">
              <div>
                <p className="font-bold text-foreground">
                  {new Date(c.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} → {new Date(c.endDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">{c.actualDuration} days · {c.bleedingType}</p>
              </div>
              <div className="w-10 h-10 rounded-[14px] bg-rose-500/15 border border-rose-500/20 flex items-center justify-center text-rose-500 text-xs font-black">
                {c.actualDuration}d
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Day detail dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-rose-500" />
              {selected ? new Date(selected).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedStatus === "haidh" && "Logged as a Ḥaidh day"}
              {selectedStatus === "predicted" && "Predicted period window"}
              {selectedStatus === "fertile" && "Estimated fertile window"}
              {selectedStatus === "tuhr" && "A Ṭuhr (pure) day"}
              {selectedStatus === "future" && "No data yet"}
            </DialogDescription>
          </DialogHeader>

          {selectedLog ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Flow</span>
                <span className="font-bold capitalize text-foreground">{selectedLog.flow}</span>
              </div>
              {selectedLog.mood && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mood</span>
                  <span className="font-bold capitalize text-foreground">{selectedLog.mood}</span>
                </div>
              )}
              {selectedLog.energyLevel != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Energy</span>
                  <span className="font-bold text-foreground">{selectedLog.energyLevel}/5</span>
                </div>
              )}
              {selectedLog.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedLog.symptoms.map(k => {
                    const s = SYMPTOMS.find(x => x.key === k);
                    return (
                      <span key={k} className="px-2 py-1 rounded-lg bg-muted text-xs font-medium">
                        {s ? `${s.icon} ${s.label}` : k}
                      </span>
                    );
                  })}
                </div>
              )}
              {selectedLog.notes && (
                <p className="text-foreground/80 bg-muted/50 rounded-xl p-3 italic">"{selectedLog.notes}"</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing logged for this day.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
