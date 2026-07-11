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
  { label: "SubhanAllah", arabic: "سُبْحَانَ اللَّهِ", accent: "from-[#C9860A] to-[#E8A020]" },
  { label: "Alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", accent: "from-[#C9860A] to-[#E8A020]" },
  { label: "Allahu Akbar", arabic: "اللَّٰهُ أَكْبَرُ", accent: "from-[#C9860A] to-[#E8A020]" },
  { label: "La ilaha", arabic: "لَا إِلَٰهَ إِلَّا", accent: "from-[#C9860A] to-[#E8A020]" },
  { label: "Astagfirullah", arabic: "أَسْتَغْفُرُ ٱللَّٰهِ", accent: "from-[#C9860A] to-[#E8A020]" },
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
    <Card className="relative overflow-hidden bg-[#1A1A1A] border border-[#C9860A]/30 shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#C9860A]/50 to-transparent" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-white">
            <Sparkles className="w-4 h-4 text-[#C9860A]" />
            Tasbeeh
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-xl text-[#C9860A] hover:text-[#E8A020] hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
            onClick={() => navigate("/tasbeeh")}
          >
            Open
            <ArrowUpRight className="w-4 h-4 ms-1" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs uppercase font-bold tracking-widest">
          <Badge variant="secondary" className="rounded-full bg-[#C9860A]/10 text-[#C9860A] border-none">
            Today {todayTotal.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="rounded-full border-[#C9860A]/30 text-white/60">
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
                className="relative overflow-hidden rounded-2xl border border-[#C9860A]/20 bg-card hover:border-[#C9860A]/40 transition-colors active:scale-[0.98] p-2 text-start group"
                aria-label={`Add ${preset.label}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${preset.accent} opacity-[0.02] group-hover:opacity-[0.05]`} />
                <div className="relative">
                  <p className="text-[14px] font-arabic leading-snug text-white font-bold" dir="rtl">
                    {preset.arabic}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
                    {preset.label}
                  </p>
                  <p className="mt-1 text-sm font-bold font-serif italic text-[#C9860A] tabular-nums">
                    {count.toLocaleString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {todayTopLabel && (
          <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">
            Most repeated today: <span className="font-bold text-[#C9860A]">{todayTopLabel}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full rounded-xl border-[#C9860A]/30 text-white hover:bg-[#C9860A]/10 font-bold uppercase tracking-wider text-xs"
          onClick={() => navigate("/tasbeeh")}
        >
          Open Full Counter
        </Button>
      </CardContent>
    </Card>
  );
}

export default TasbeehQuickWidget;

