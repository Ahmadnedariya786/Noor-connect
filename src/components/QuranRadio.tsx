import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Play, Pause, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { radioStations } from "@/data/radio-stations";
import { extraRadioStations } from "@/data/radio-stations-extra";
import { useGlobalRadio } from "@/lib/global-radio";

/** Featured reciter URLs shown as quick-picks in the dashboard widget. */
const QUICK_SLUGS = new Set([
  "mishary_alafasi", "shaik_abu_bakr_al_shatri", "abdulrahman_alsudaes",
]);

interface QuickStation {
  id: number;
  name: string;
  nameEn: string;
  url: string;
}

const quickStations: QuickStation[] = [
  ...radioStations.map((s) => ({
    id: s.id,
    name: s.name,
    nameEn: "",
    url: s.url,
  })),
  ...extraRadioStations.map((s) => ({
    id: s.id,
    name: s.nameAr,
    nameEn: s.nameEn,
    url: s.url,
  })),
].filter((s) => QUICK_SLUGS.has(s.url.split("/").filter(Boolean).pop() ?? ""));

/** Staggered opacity-pulse bars — GPU-only, static when paused. */
const Equalizer = ({ playing, className = "" }: { playing: boolean; className?: string }) => (
  <span className={`flex items-end gap-[3px] h-3.5 ${className}`} aria-hidden="true">
    {[0, 150, 300, 450].map((d) => (
      <span
        key={d}
        className={`w-[3px] rounded-full bg-current ${playing ? "animate-pulse motion-reduce:animate-none" : "opacity-40"}`}
        style={{ height: playing ? undefined : "45%", animationDelay: `${d}ms` }}
      />
    ))}
  </span>
);

const DashboardQuranRadio = () => {
  const navigate = useNavigate();
  const globalRadio = useGlobalRadio();

  // Optimistic tap feedback, cleared when playback starts (or after timeout).
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
  }, []);

  const markPending = useCallback((url: string) => {
    setPendingUrl(url);
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => setPendingUrl(null), 6000);
  }, []);

  useEffect(() => {
    if (pendingUrl && globalRadio.isPlaying && globalRadio.currentStation?.url === pendingUrl) {
      setPendingUrl(null);
    }
  }, [globalRadio.isPlaying, globalRadio.currentStation?.url, pendingUrl]);

  const handleSelect = useCallback((station: QuickStation) => {
    if (globalRadio.currentStation?.url === station.url && globalRadio.isPlaying) {
      globalRadio.pauseRadio();
      return;
    }
    markPending(station.url);
    globalRadio.playRadio({ id: station.id, name: station.name, url: station.url });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable lib actions only
  }, [globalRadio.currentStation?.url, globalRadio.isPlaying, globalRadio.playRadio]);

  const isPlaying = useCallback(
    (station: QuickStation) => globalRadio.currentStation?.url === station.url && globalRadio.isPlaying,
    [globalRadio.currentStation?.url, globalRadio.isPlaying]
  );

  return (
    <Card className="relative overflow-hidden rounded-2xl border-border shadow-md bg-card">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-4 pb-3">
        <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Radio className="w-[18px] h-[18px] text-primary" aria-hidden="true" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground leading-tight">Quran Radio</h3>
          <p className="text-[11px] text-muted-foreground">Live recitation 24/7</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border border-red-500/30 bg-red-500/10 text-red-500">
          <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${globalRadio.isPlaying ? "animate-pulse motion-reduce:animate-none" : "opacity-50"}`} />
          Live
        </span>
      </div>

      {/* Quick stations */}
      <div className="px-2.5 pb-1 space-y-1">
        {quickStations.map((station) => {
          const playing = isPlaying(station);
          const pending = !playing && pendingUrl === station.url;
          return (
            <button
              key={station.url}
              onClick={() => handleSelect(station)}
              aria-label={`${playing ? "Pause" : "Play"} ${station.nameEn || station.name}`}
              className={`w-full flex items-center gap-2.5 rounded-xl px-2 py-2 text-start transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                playing ? "bg-primary/10" : "hover:bg-muted/60"
              }`}
            >
              <span
                className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-colors duration-150 ${
                  playing
                    ? "bg-primary text-primary-foreground border-primary/60"
                    : "bg-muted border-transparent text-foreground"
                }`}
                aria-hidden="true"
              >
                {pending ? (
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin motion-reduce:animate-none" />
                ) : playing ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ms-0.5" />
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[13px] font-semibold truncate ${playing ? "text-primary" : "text-foreground"}`} lang="ar">
                  {station.name}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">{station.nameEn || "Islamic Radio"}</span>
              </span>
              {playing && <Equalizer playing className="shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-2.5 pt-1">
        <Button
          variant="ghost"
          onClick={() => navigate("/quran-radio")}
          className="w-full h-9 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 justify-between px-3"
        >
          Browse all stations
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
};

export { DashboardQuranRadio as QuranRadio };
export default DashboardQuranRadio;
