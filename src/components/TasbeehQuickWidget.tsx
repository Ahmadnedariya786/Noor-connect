import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addTasbeehEntry, getTasbeehHistory, getTasbeehTotal } from "@/lib/storage";

type TasbeehPreset = {
  label: string;
  arabic: string;
  accent: string;
};

const PRESETS: TasbeehPreset[] = [
  { label: "SubhanAllah", arabic: "سُبْحَانَ اللَّهِ", accent: "from-[var(--accent)]/20 to-[var(--accent)]/10" },
  { label: "Alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", accent: "from-[var(--accent)]/20 to-[var(--accent)]/10" },
  { label: "Allahu Akbar", arabic: "اللَّٰهُ أَكْبَرُ", accent: "from-[var(--accent)]/20 to-[var(--accent)]/10" },
  { label: "La ilaha", arabic: "لَا إِلَٰهَ إِلَّا", accent: "from-[var(--accent)]/20 to-[var(--accent)]/10" },
  { label: "Astagfirullah", arabic: "أَسْتَغْفُرُ ٱللَّٰهِ", accent: "from-[var(--accent)]/20 to-[var(--accent)]/10" },
];

const getTodayKey = () => new Date().toISOString().split('T')[0];

export function TasbeehQuickWidget() {
  const navigate = useNavigate();
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [todayByLabel, setTodayByLabel] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    const history = getTasbeehHistory();
    const today = getTodayKey();

    const nextByLabel: Record<string, number> = {};
    let nextTodayTotal = 0;

    for (const entry of history) {
      if (entry.date !== today) continue;
      nextByLabel[entry.label] = (nextByLabel[entry.label] ?? 0) + entry.count;
      nextTodayTotal += entry.count;
    }

    setTodayByLabel(nextByLabel);
    setTodayTotal(nextTodayTotal);
    setAllTimeTotal(getTasbeehTotal());
  }, []);

  useEffect(() => {
    refresh();

    const handleUpdated = () => refresh();
    window.addEventListener("tasbeeh-updated", handleUpdated);
    return () => window.removeEventListener("tasbeeh-updated", handleUpdated);
  }, [refresh]);

  const add = useCallback(
    (label: string) => {
      addTasbeehEntry(label);
      refresh();
      if ("vibrate" in navigator) navigator.vibrate(8);
    },
    [refresh],
  );

  const todayTopLabel = useMemo(() => {
    const entries = Object.entries(todayByLabel);
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }, [todayByLabel]);

  return (
    <Card className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-[var(--text-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            Tasbeeh
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-xl text-[var(--accent)] hover:bg-[var(--accent-soft)] font-bold uppercase tracking-wider text-xs"
            onClick={() => navigate("/tasbeeh")}
          >
            Open
            <ArrowUpRight className="w-4 h-4 ms-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-widest">
          <Badge variant="secondary" className="rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border-none">
            Today {todayTotal.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="rounded-full border-[var(--border)] text-[var(--text-secondary)]">
            All‑time {allTimeTotal.toLocaleString()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => {
            const count = todayByLabel[preset.label] ?? 0;

            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => add(preset.label)}
                className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/40 transition-colors active:scale-[0.98] p-2 text-start group"
                aria-label={`Add ${preset.label}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${preset.accent} opacity-5 group-hover:opacity-10`} />
                <div className="relative">
                  <p className="text-[14px] font-arabic leading-snug text-[var(--text-primary)] font-bold" dir="rtl">
                    {preset.arabic}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    {preset.label}
                  </p>
                  <p className="mt-1 text-sm font-bold font-serif italic text-[var(--accent)] tabular-nums">
                    {count.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {todayTopLabel && (
          <div className="text-xs text-[var(--text-secondary)] uppercase font-bold tracking-widest">
            Most repeated today: <span className="font-bold text-[var(--accent)]">{todayTopLabel}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] font-bold uppercase tracking-wider text-xs"
          onClick={() => navigate("/tasbeeh")}
        >
          Open Full Counter
        </Button>
      </CardContent>
    </Card>
  );
}

export default TasbeehQuickWidget;

