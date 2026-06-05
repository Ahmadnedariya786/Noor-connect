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
  { label: "SubhanAllah", arabic: "سُبْحَانَ اللَّهِ", accent: "from-purple-500 to-fuchsia-600" },
  { label: "Alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", accent: "from-emerald-500 to-teal-600" },
  { label: "Allahu Akbar", arabic: "اللَّٰهُ أَكْبَرُ", accent: "from-amber-500 to-orange-600" },
  { label: "La ilaha illallah", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهِ", accent: "from-blue-500 to-cyan-600" },
  { label: "Astagfirullah", arabic: "أَسْتَغْفُرُ ٱللَّٰهِ", accent: "from-rose-500 to-pink-600" },
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
    <Card className="relative overflow-hidden border-purple-200/60 bg-gradient-to-br from-purple-50/70 via-card to-transparent dark:from-purple-950/20 dark:via-card dark:to-transparent">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-400/50 to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-700 dark:text-purple-400" />
            Tasbeeh
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-xl"
            onClick={() => navigate("/tasbeeh")}
          >
            Open
            <ArrowUpRight className="w-4 h-4 ms-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Badge variant="secondary" className="rounded-full">
            Today {todayTotal.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="rounded-full">
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
                className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 hover:bg-muted/40 transition-colors active:scale-[0.98] p-2 text-start"
                aria-label={`Add ${preset.label}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${preset.accent} opacity-[0.08]`} />
                <div className="relative">
                  <p className="text-[11px] font-arabic leading-snug text-foreground" dir="rtl">
                    {preset.arabic}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-muted-foreground truncate">
                    {preset.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-foreground tabular-nums">
                    {count.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {todayTopLabel && (
          <div className="text-[10px] text-muted-foreground">
            Most repeated today: <span className="font-semibold text-foreground">{todayTopLabel}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl"
          onClick={() => navigate("/tasbeeh")}
        >
          Open Full Counter
        </Button>
      </CardContent>
    </Card>
  );
}

export default TasbeehQuickWidget;

