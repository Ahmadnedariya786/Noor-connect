import { useState, useEffect } from "react";
import { Droplets, Hand, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { markGhusulComplete, getTodayLog, type HaidhTrackerData } from "@/lib/haidh-tracker";

/**
 * Post-cycle purification checklist. Shows the three steps to fully resume
 * ʿibādah after Haidh/Nifās ends. Completing it records today's ghusl log.
 * Reused by the Today and Islamic tabs so the wording stays consistent.
 */
export function HaidhGhuslChecklist({ data }: { data: HaidhTrackerData }) {
  const todayLog = getTodayLog(data);
  const [done, setDone] = useState({
    ghusl: Boolean(todayLog?.ghusulCompleted),
    wudu: false,
    salah: false,
  });

  // Re-sync when the underlying data changes (e.g. cleared elsewhere).
  useEffect(() => {
    setDone({
      ghusl: Boolean(getTodayLog(data)?.ghusulCompleted),
      wudu: false,
      salah: false,
    });
  }, [data]);

  const toggle = (key: keyof typeof done) =>
    setDone(prev => ({ ...prev, [key]: !prev[key] }));

  const handleGhusl = () => {
    const next = !done.ghusl;
    toggle("ghusl");
    if (next) markGhusulComplete(new Date());
  };

  const allDone = done.ghusl && done.wudu && done.salah;

  const items = [
    { key: "ghusl" as const, label: "Performed Ghusl", sub: "Full ritual bath", icon: Droplets, on: handleGhusl },
    { key: "wudu" as const, label: "Renewed Wudu", sub: "Ablution after Ghusl", icon: Hand, on: () => toggle("wudu") },
    { key: "salah" as const, label: "Resumed Salah", sub: "Prayers are due again", icon: Sparkles, on: () => toggle("salah") },
  ];

  return (
    <div className={cn(
      "rounded-3xl border p-5 transition-colors",
      allDone ? "bg-[var(--success)]/10 border-[var(--success)]/30" : "bg-card border-border"
    )}>
      <div className="flex items-center gap-2 mb-4">
        <Droplets className={cn("w-4 h-4", allDone ? "text-[var(--success)]" : "text-rose-500")} />
        <h3 className={cn(
          "text-xs font-black uppercase tracking-widest",
          allDone ? "text-[var(--success)]" : "text-muted-foreground"
        )}>
          {allDone ? "Purification Complete" : "Complete Your Ghusl"}
        </h3>
      </div>
      <div className="space-y-2">
        {items.map(({ key, label, sub, icon: Icon, on }) => {
          const checked = done[key];
          return (
            <button
              key={key}
              onClick={on}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                checked
                  ? "bg-[var(--success)]/15 border-[var(--success)]/30"
                  : "bg-background/50 border-border hover:bg-muted/50"
              )}
            >
              <div className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                checked ? "bg-[var(--success)]/20 text-[var(--success)]" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn("font-bold text-sm", checked ? "text-[var(--success)]" : "text-foreground")}>
                  {label}
                </p>
                <p className="text-xs text-muted-foreground truncate">{sub}</p>
              </div>
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border shrink-0",
                checked ? "bg-[var(--success)] border-[var(--success)]" : "border-border"
              )}>
                {checked && <Check className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
      {allDone && (
        <p className="text-center text-sm font-medium text-[var(--success)] mt-4">
          Māshā’Allāh — your ʿibādah is at full strength again.
        </p>
      )}
    </div>
  );
}
