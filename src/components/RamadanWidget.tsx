import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Moon, Sunrise, Sunset, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrayerTime } from "@/lib/time-formatter";
import type { PrayerTimesWithEnd } from "@/hooks/usePrayerTimes";

export interface RamadanWidgetProps {
  isRamadan: boolean;
  ramadanDay: number;
  prayerTimesWithEnd: PrayerTimesWithEnd | null;
  timeFormat?: "12" | "24" | "12h" | "24h";
  timeZone?: string;
}

const formatCountdown = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

interface NextInfo {
  label: string;
  time: Date | null;
  countdown: string;
}

export function RamadanWidget({
  isRamadan,
  ramadanDay,
  prayerTimesWithEnd,
  timeFormat,
  timeZone,
}: RamadanWidgetProps) {
  const navigate = useNavigate();
  const [nextInfo, setNextInfo] = useState<NextInfo>({ label: "", time: null, countdown: "" });

  const fajrStart = prayerTimesWithEnd?.fajr?.start ?? null;
  const maghribStart = prayerTimesWithEnd?.maghrib?.start ?? null;

  const suhoorTimeText = useMemo(() => {
    if (!fajrStart) return "";
    return formatPrayerTime(fajrStart, timeFormat, timeZone);
  }, [fajrStart, timeFormat, timeZone]);

  const iftarTimeText = useMemo(() => {
    if (!maghribStart) return "";
    return formatPrayerTime(maghribStart, timeFormat, timeZone);
  }, [maghribStart, timeFormat, timeZone]);

  const computeNext = useCallback(() => {
    if (!isRamadan || !fajrStart || !maghribStart) {
      setNextInfo(prev =>
        prev.label === "" && prev.time === null && prev.countdown === ""
          ? prev
          : { label: "", time: null, countdown: "" }
      );
      return;
    }

    const now = new Date();

    // Ramadan day events:
    // - Before Fajr: Suhoor ends at Fajr
    // - Between Fajr and Maghrib: Iftar at Maghrib
    // - After Maghrib: Suhoor ends tomorrow (approx. +24h from today's Fajr)
    let label: string;
    let time: Date;
    if (now < fajrStart) {
      label = "Suhoor ends";
      time = fajrStart;
    } else if (now < maghribStart) {
      label = "Iftar";
      time = maghribStart;
    } else {
      label = "Suhoor ends (tomorrow)";
      time = new Date(fajrStart.getTime() + 24 * 60 * 60 * 1000);
    }
    const countdown = formatCountdown(time.getTime() - now.getTime());

    setNextInfo(prev => {
      if (
        prev.label === label &&
        prev.countdown === countdown &&
        ((prev.time === null && time === null) || prev.time?.getTime() === time.getTime())
      ) {
        return prev;
      }
      return { label, time, countdown };
    });
  }, [isRamadan, fajrStart, maghribStart]);

  useEffect(() => {
    if (!isRamadan) return;
    computeNext();
    const id = window.setInterval(computeNext, 1000);
    return () => window.clearInterval(id);
  }, [isRamadan, computeNext]);

  const fastingProgress = useMemo(() => {
    if (!isRamadan || !fajrStart || !maghribStart) return null;
    const now = new Date();
    if (now <= fajrStart) return 0;
    if (now >= maghribStart) return 100;
    const total = maghribStart.getTime() - fajrStart.getTime();
    const done = now.getTime() - fajrStart.getTime();
    return Math.round((done / Math.max(1, total)) * 100);
  }, [isRamadan, fajrStart, maghribStart]);

  if (!isRamadan) {
    return (
      <Card className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-[var(--text-primary)]">
              <Moon className="w-4 h-4 text-[var(--accent)]" />
              Ramadan
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 rounded-xl text-[var(--accent)] hover:bg-[var(--accent-soft)] font-bold uppercase tracking-wider text-xs"
              onClick={() => navigate("/ramadan")}
            >
              Open
              <ArrowUpRight className="w-4 h-4 ms-1" />
            </Button>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mt-2">
            Set goals, track fasting, and get Suhoor/Iftar times.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs uppercase font-bold tracking-widest">
            <Badge variant="secondary" className="rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border-none">
              Not in Ramadan
            </Badge>
            <Badge variant="outline" className="rounded-full border-[var(--border)] text-[var(--text-secondary)]">
              Plan ahead
            </Badge>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full rounded-xl bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 font-bold uppercase tracking-wider text-xs"
            onClick={() => navigate("/ramadan")}
          >
            Open Ramadan Mode
          </Button>
        </CardContent>
      </Card>
    );
  }

  const hasTimes = Boolean(fajrStart && maghribStart);

  return (
    <Card className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-[var(--text-primary)]">
            <Moon className="w-4 h-4 text-[var(--accent)]" />
            Ramadan
          </CardTitle>
          <Badge variant="secondary" className="rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border-none uppercase tracking-widest font-bold text-xs">
            Day {ramadanDay || "—"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!hasTimes ? (
          <div className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] text-center">
            Loading Suhoor and Iftar times…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-secondary)] mb-1">
                  <Sunrise className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Suhoor ends
                </div>
                <div className="text-xl font-bold font-serif italic tabular-nums text-[var(--text-primary)]">
                  {suhoorTimeText}
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-[var(--text-secondary)] mb-1">
                  <Sunset className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Iftar
                </div>
                <div className="text-xl font-bold font-serif italic tabular-nums text-[var(--text-primary)]">
                  {iftarTimeText}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[var(--accent-soft)] border border-[var(--border)]">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-primary)]">{nextInfo.label || "Next"}</span>
                </div>
                <span className="text-sm font-bold tabular-nums text-[var(--accent)]">
                  {nextInfo.countdown || "—"}
                </span>
              </div>

              {typeof fastingProgress === "number" && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                    <span>Fasting progress</span>
                    <span className="font-bold text-[var(--accent)]">{fastingProgress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden border border-[var(--border)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${fastingProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] font-bold uppercase tracking-wider text-xs"
              onClick={() => navigate("/ramadan")}
            >
              Open Ramadan Mode
              <ArrowUpRight className="w-4 h-4 ms-2" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default RamadanWidget;

