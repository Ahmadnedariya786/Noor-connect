import { useMemo } from "react";
import { motion } from "framer-motion";
import { Droplets, CheckCircle, Moon, AlertTriangle, Sparkles, Wind, BookOpen, Star, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HaidhGhuslChecklist as GhuslChecklist } from "@/components/haidh/HaidhGhuslChecklist";
import {
  getCurrentCycle,
  getPredictionConfidence,
  calculateOvulationDay,
  getRegularityInfo,
  type HaidhTrackerData,
  type FiqhStatus,
} from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
  fiqh: FiqhStatus;
  onStart: (type: 'haidh' | 'nifas') => void;
  onEnd: () => void;
  onTabChange: (t: string) => void;
}

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function HaidhTodayTab({ data, fiqh, onStart, onEnd, onTabChange }: Props) {
  const cycle = getCurrentCycle(data);
  const today = toDateStr(new Date());

  const activeDays = useMemo(() => {
    if (!cycle) return 0;
    const diff = Math.round((new Date(today).getTime() - new Date(cycle.startDate).getTime()) / 86400000);
    return Math.max(1, diff + 1);
  }, [cycle, today]);

  const progress = cycle ? Math.min((activeDays / cycle.expectedDuration) * 100, 100) : 0;
  const dashOffset = 283 - (283 * progress) / 100;

  const expectedEnd = useMemo(() => {
    if (!cycle) return null;
    const d = new Date(cycle.startDate);
    d.setDate(d.getDate() + cycle.expectedDuration - 1);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }, [cycle]);

  const nextPredictedDate = data.nextPredictedStart ? new Date(data.nextPredictedStart) : null;
  const nextPredicted = nextPredictedDate
    ? nextPredictedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const daysToNext = nextPredictedDate
    ? Math.round((nextPredictedDate.getTime() - new Date(today).getTime()) / 86400000)
    : null;

  // Predict phase relative to the current cycle (only meaningful while pure).
  // Ovulation ~14 days before next period; fertile window is ~5 days before ovulation.
  let currentPhase: "tuhr" | "premenstrual" | "fertile" = "tuhr";
  if (!data.isActive && daysToNext !== null) {
    if (daysToNext <= 7 && daysToNext > 0) currentPhase = "premenstrual";
    else if (daysToNext >= 14 && daysToNext <= 19) currentPhase = "fertile";
  }

  // Has the most recent cycle just ended (and ghusl not yet logged today)?
  const lastCycle = data.cycles[0];
  const justEnded = !data.isActive && lastCycle?.endDate && daysToNext !== null && daysToNext < 2;

  // Cycle insights
  const regularity = useMemo(() => getRegularityInfo(data), [data]);
  const ovulationDay = useMemo(() => calculateOvulationDay(data), [data]);
  const daysToOvulation = ovulationDay
    ? Math.round((new Date(ovulationDay).getTime() - new Date(today).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-6 pb-24">
      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[32px] bg-card border border-border p-6 shadow-lg"
      >
        {/* Glow effects — phase-tinted, theme-safe */}
        {data.isActive ? (
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 dark:bg-rose-700/20 rounded-full blur-[20px] pointer-events-none" />
        ) : (
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[20px] pointer-events-none" />
        )}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/10 rounded-full blur-[20px] pointer-events-none" />

        {data.isActive && cycle ? (
          <div className="relative z-10 flex flex-col items-center">
            {/* Phase strip */}
            <div className="flex items-center gap-2 mb-6 w-full justify-center">
              <div className="h-1.5 w-1/4 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
            </div>

            {/* Circular progress ring */}
            <div className="relative w-48 h-48 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted" />
                <motion.circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="url(#gradient-rose)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  initial={{ strokeDashoffset: 283 }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="gradient-rose" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#9f1239" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500 mb-1">Day</span>
                <span className="text-[5rem] font-bold text-foreground font-serif italic tracking-tight leading-none">{activeDays}</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground mt-2">of {cycle.expectedDuration}</span>
              </div>
            </div>

            <div className="text-center w-full mb-6 overflow-hidden">
              <h2 className="text-2xl font-bold font-serif italic text-foreground tracking-tight truncate">{fiqh.label}</h2>
              {expectedEnd && (
                <p className="text-sm text-muted-foreground mt-1.5 font-medium truncate">
                  Expected end: {expectedEnd}
                </p>
              )}
            </div>

            {fiqh.istihadhahDetected && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-6 text-sm text-amber-600 dark:text-amber-400 w-full text-left">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>Bleeding exceeds the {data.madhab} limit. This may be Istiḥāḍah — please perform Ghusl and resume prayers.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => onTabChange("log")}
                className="h-12 rounded-2xl border-rose-500/30 font-bold"
              >
                <Droplets className="w-4 h-4 mr-2" /> Log Today
              </Button>
              <Button
                onClick={onEnd}
                className="h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-900/20 whitespace-nowrap"
              >
                <CheckCircle className="w-4 h-4 mr-2 shrink-0" /> End Period
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Phase strip */}
            <div className="flex items-center gap-2 mb-8 w-full justify-center">
              <div className="h-1.5 w-1/4 rounded-full bg-border" />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "tuhr" && "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]", currentPhase !== "tuhr" && "bg-border")} />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "fertile" && "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", currentPhase !== "fertile" && "bg-border")} />
              <div className={cn("h-1.5 w-1/4 rounded-full", currentPhase === "premenstrual" && "bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]", currentPhase !== "premenstrual" && "bg-border")} />
            </div>

            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-500/10 animate-pulse" />
              <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Moon className="w-10 h-10 text-emerald-500" />
              </div>
            </div>

            <h2 className="text-4xl font-bold font-serif italic tracking-tight mb-2 text-foreground">Ṭuhr</h2>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs tracking-[0.2em] uppercase mb-6">Purity Phase</p>

            <div className="bg-card border border-border rounded-2xl p-4 w-full mb-6 shadow-sm">
              {nextPredicted ? (
                <div className="flex items-center justify-center gap-2 text-sm text-foreground/80 font-medium">
                  <CalendarClock className="w-4 h-4 text-muted-foreground" />
                  Next cycle ~{nextPredicted}
                  {daysToNext !== null && daysToNext > 0 && (
                    <span className="text-muted-foreground">· in {daysToNext}d</span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-medium">
                  Log more cycles to enable predictions
                </p>
              )}
              {nextPredicted && (
                <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mt-2">
                  {getPredictionConfidence(data)}
                </p>
              )}
            </div>

            <div className="flex gap-3 w-full">
              <Button
                onClick={() => onStart('haidh')}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-rose-700 to-rose-500 hover:from-rose-600 hover:to-rose-400 font-bold text-base shadow-xl"
              >
                <Droplets className="w-5 h-5 mr-2" /> Start Ḥaidh
              </Button>
              <Button
                onClick={() => onStart('nifas')}
                variant="outline"
                className="flex-1 h-14 rounded-2xl font-bold"
              >
                Start Nifās
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Ghusl checklist — appears right after a period ends */}
      {justEnded && <GhuslChecklist data={data} />}

      {/* Islamic Status Banner */}
      <div className="bg-card border border-primary/20 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute -right-6 -top-6 text-primary/5">
          <BookOpen className="w-32 h-32" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Fiqh Exemption Status</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2">
            {[
              { label: "Ṣalāh", exempt: fiqh.salahExempt, icon: Sparkles },
              { label: "Fasting", exempt: fiqh.fastingExempt, icon: Moon },
              { label: "Ṭawāf", exempt: !fiqh.tawafPermitted, icon: Wind },
              { label: "Dhikr", exempt: false, icon: Star },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  item.exempt ? "bg-rose-500/15 text-rose-500" : "bg-emerald-500/15 text-emerald-500"
                )}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium truncate">{item.label}</p>
                  <p className={cn("font-bold text-sm truncate", item.exempt ? "text-rose-500" : "text-emerald-500")}>
                    {item.exempt ? "Exempt" : "Active"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fertile window info */}
      {currentPhase === "fertile" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌱</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400">
              Fertile Window
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">
            You may be in your fertile window.
            {daysToOvulation !== null && daysToOvulation >= 0
              ? ` Ovulation predicted in ~${daysToOvulation} day${daysToOvulation !== 1 ? "s" : ""}.`
              : ` Ovulation typically occurs around ${daysToNext !== null ? daysToNext - 14 : "~14"} days before your next cycle.`}
          </p>
        </div>
      )}

      {/* Cycle insights */}
      {regularity.variation > 0 && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Cycle Insights</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              regularity.score === "regular" && "bg-emerald-500/15 text-emerald-500",
              regularity.score === "slightly-irregular" && "bg-amber-500/15 text-amber-500",
              regularity.score === "irregular" && "bg-rose-500/15 text-rose-500",
            )}>
              {regularity.score === "regular" ? "Regular" : regularity.score === "slightly-irregular" ? "Slightly Irregular" : "Irregular"}
            </span>
            <span className="text-xs text-muted-foreground">
              ±{regularity.variation}d variation
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {regularity.trend === "increasing" ? "📈" : regularity.trend === "decreasing" ? "📉" : "➡️"} {regularity.trend}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Avg {regularity.averageCycle}d · Range {regularity.minCycle}–{regularity.maxCycle}d · Based on last {data.cycles.filter(c => c.endDate).length} cycles
          </p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg Cycle", value: `${data.averageCycleLength}d`, icon: "🔄", highlight: false },
          { label: "Avg Period", value: `${data.averagePeriodLength}d`, icon: "📅", highlight: false },
          { label: "Fasts Owed", value: `${Math.max(0, data.missedRamadanFasts - data.madeUpRamadanFasts)}`, icon: "🌙", highlight: (data.missedRamadanFasts - data.madeUpRamadanFasts) > 0 },
        ].map(s => (
          <div key={s.label} className={cn(
            "bg-card border rounded-2xl p-4 text-center shadow-sm",
            s.highlight ? "border-amber-500/30" : "border-border"
          )}>
            <div className="text-xl mb-1">{s.icon}</div>
            <p className={cn("text-2xl font-bold font-serif italic", s.highlight ? "text-amber-500" : "text-foreground")}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
