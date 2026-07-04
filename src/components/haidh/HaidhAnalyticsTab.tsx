import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FileDown, TrendingUp, CalendarDays, Activity, Heart } from "lucide-react";
import { getRegularityInfo, calculateOvulationDay, type HaidhTrackerData, type CycleEntry, type DailyLog } from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
}

const COLORS = {
  rose: "#e11d48",
  emerald: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  muted: "#94a3b8",
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: "Cramps", headache: "Headache", fatigue: "Fatigue",
  bloating: "Bloating", nausea: "Nausea", backache: "Backache",
  breastTenderness: "Breast Tenderness", acne: "Acne",
  dizziness: "Dizziness", cravings: "Cravings",
};

const MOOD_LABELS: Record<string, string> = {
  happy: "Happy", neutral: "Neutral", sad: "Sad",
  irritable: "Irritable", anxious: "Anxious", emotional: "Emotional",
};

function generatePDFReport(data: HaidhTrackerData) {
  const { jsPDF } = require("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Noor Cycle - Health Report", pageW / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, pageW / 2, 28, { align: "center" });

  let y = 40;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Cycle Summary", 14, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Average cycle length: ${data.averageCycleLength} days`, 14, y); y += 6;
  doc.text(`Average period length: ${data.averagePeriodLength} days`, 14, y); y += 6;
  doc.text(`Cycles tracked: ${data.cycles.length}`, 14, y); y += 6;
  doc.text(`Madhab: ${data.madhab}`, 14, y); y += 6;
  doc.text(`Missed Ramadan fasts: ${data.missedRamadanFasts}`, 14, y); y += 6;
  doc.text(`Made up fasts: ${data.madeUpRamadanFasts}`, 14, y); y += 10;

  const completed = data.cycles.filter((c: CycleEntry) => c.endDate);
  if (completed.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Cycle History", 14, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.setFillColor(240, 240, 240);
    doc.rect(14, y, pageW - 28, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Start", 16, y + 4);
    doc.text("End", 50, y + 4);
    doc.text("Duration", 90, y + 4);
    doc.text("Type", 120, y + 4);
    doc.text("Symptoms", 150, y + 4);
    y += 8;
    doc.setFont("helvetica", "normal");

    completed.slice(-24).forEach((cycle: CycleEntry) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const allSymptoms = cycle.logs.flatMap((l: DailyLog) => l.symptoms || []);
      const uniqueSymptoms = [...new Set(allSymptoms)].slice(0, 3).map((s: string) => SYMPTOM_LABELS[s] || s).join(", ");
      doc.text(cycle.startDate, 16, y);
      doc.text(cycle.endDate || "-", 50, y);
      doc.text(cycle.actualDuration ? `${cycle.actualDuration}d` : "-", 90, y);
      doc.text(cycle.bleedingType, 120, y);
      doc.text(uniqueSymptoms || "-", 150, y);
      y += 6;
    });
  }

  doc.save(`noor-cycle-report-${new Date().toISOString().split("T")[0]}.pdf`);
}

export function HaidhAnalyticsTab({ data }: Props) {
  const completedCycles = useMemo(
    () => data.cycles.filter(c => c.endDate).slice(-24).reverse(),
    [data.cycles]
  );

  const cycleLengthData = useMemo(() => {
    return completedCycles.map((c, i) => {
      const start = new Date(c.startDate);
      const end = new Date(c.endDate!);
      const length = c.actualDuration ?? Math.round((end.getTime() - start.getTime()) / 86400000);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { name: `#${i + 1} ${label}`, length, duration: length };
    });
  }, [completedCycles]);

  const startToStartData = useMemo(() => {
    const data: { name: string; days: number }[] = [];
    for (let i = 1; i < completedCycles.length; i++) {
      const prevStart = new Date(completedCycles[i - 1].startDate).getTime();
      const currStart = new Date(completedCycles[i].startDate).getTime();
      const days = Math.round((prevStart - currStart) / 86400000);
      if (days > 0 && days < 100) {
        data.push({
          name: completedCycles[i].startDate,
          days,
        });
      }
    }
    return data.reverse();
  }, [completedCycles]);

  const symptomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.cycles.forEach(c =>
      c.logs.forEach(l =>
        (l.symptoms || []).forEach(s => {
          counts[s] = (counts[s] || 0) + 1;
        })
      )
    );
    return Object.entries(counts)
      .map(([key, value]) => ({ name: SYMPTOM_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data.cycles]);

  const moodCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data.cycles.forEach(c =>
      c.logs.forEach(l => {
        if (l.mood) counts[l.mood] = (counts[l.mood] || 0) + 1;
      })
    );
    return Object.entries(counts)
      .map(([key, value]) => ({ name: MOOD_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.cycles]);

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-foreground">Analytics</h2>
        <Button
          onClick={() => generatePDFReport(data)}
          variant="outline"
          className="rounded-xl gap-2"
          size="sm"
        >
          <FileDown className="w-4 h-4" /> PDF Report
        </Button>
      </div>

      {completedCycles.length < 2 ? (
        <div className="bg-card border border-border rounded-3xl p-8 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">
            Complete at least 2 cycles to see analytics.
          </p>
        </div>
      ) : (
        <>
          {/* Cycle insights summary */}
          {(() => {
            const r = getRegularityInfo(data);
            const ovDay = calculateOvulationDay(data);
            return (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-3xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Regularity</span>
                  <p className={cn(
                    "text-lg font-black mt-1",
                    r.score === "regular" && "text-emerald-500",
                    r.score === "slightly-irregular" && "text-amber-500",
                    r.score === "irregular" && "text-rose-500",
                  )}>
                    {r.score === "regular" ? "Regular" : r.score === "slightly-irrigular" ? "Slighty Irregular" : "Irregular"}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">±{r.variation}d · {r.trend}</p>
                </div>
                <div className="bg-card border border-border rounded-3xl p-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Avg Cycle</span>
                  <p className="text-lg font-black mt-1 text-foreground">{r.averageCycle} <span className="text-xs font-medium text-muted-foreground">days</span></p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Range {r.minCycle}–{r.maxCycle}d · {completedCycles.length} cycles</p>
                </div>
                {ovDay && (
                  <div className="bg-card border border-border rounded-3xl p-4 col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Predicted Ovulation</span>
                    <p className="text-base font-black mt-1 text-foreground">
                      {new Date(ovDay).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="bg-card border border-border rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-black uppercase tracking-widest text-rose-500">Cycle Length Trend</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={startToStartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickFormatter={(v: string) => {
                  const d = new Date(v);
                  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }} />
                <YAxis domain={["dataMin - 3", "dataMax + 3"]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(var(--card))",
                    border: "1px solid oklch(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  formatter={(value: number) => [`${value} days`, "Cycle Length"]}
                />
                <Line type="monotone" dataKey="days" stroke={COLORS.rose} strokeWidth={2} dot={{ fill: COLORS.rose, r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border border-border rounded-3xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-black uppercase tracking-widest text-amber-500">Period Duration</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cycleLengthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, "auto"]} tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(var(--card))",
                    border: "1px solid oklch(var(--border))",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [`${value} days`, "Duration"]}
                />
                <Bar dataKey="duration" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {symptomCounts.length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-black uppercase tracking-widest text-violet-500">Most Common Symptoms</span>
              </div>
              <div className="space-y-3">
                {symptomCounts.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28 truncate text-foreground">{s.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                        style={{ width: `${(s.value / symptomCounts[0].value) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-6 text-right">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {moodCounts.length > 0 && (
            <div className="bg-card border border-border rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-widest text-emerald-500">Mood Distribution</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={moodCounts}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {moodCounts.map((_, index) => (
                      <Cell key={index} fill={[COLORS.rose, COLORS.emerald, COLORS.amber, COLORS.violet, "#3b82f6", "#a855f7"][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(var(--card))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}