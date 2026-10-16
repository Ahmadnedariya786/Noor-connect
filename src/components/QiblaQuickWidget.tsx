import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Compass, MapPin, Navigation, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocationState } from "@/lib/location-state";
import { calculateQibla } from "@/lib/qibla";

export function QiblaQuickWidget() {
  const navigate = useNavigate();
  const location = useLocationState();

  // calculateQibla now uses getCachedDeclinationSync internally —
  // so this always returns a magnetic-corrected bearing (or WMM-lite approximation).
  const qibla = useMemo(() => {
    return calculateQibla(location.latitude, location.longitude);
  }, [location.latitude, location.longitude]);

  const bearing = Math.round(qibla.bearing);

  return (
    <Card className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[20px] pointer-events-none bg-[var(--accent)]/10" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs uppercase tracking-[0.2em] font-bold flex items-center gap-2 text-[var(--accent)]">
            <Compass className="w-4 h-4" />
            Qibla
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-soft)]"
            onClick={() => navigate("/qibla")}
          >
            Open
            <ArrowUpRight className="w-4 h-4 ms-1" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] uppercase tracking-widest mt-2">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{location.locationName}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-4xl font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>
              {bearing}°
              <span className="text-sm font-semibold ms-2 text-[var(--accent)]">
                {qibla.cardinalDirection}
              </span>
            </p>
            <p className="text-xs text-[var(--text-secondary)] uppercase tracking-widest mt-1">
              Distance{" "}
              <span className="font-bold text-[var(--text-primary)]">{qibla.formattedDistance}</span>
            </p>
            {qibla.declinationDeg !== 0 && (
              <p className="text-xs text-[var(--text-secondary)]/70 mt-0.5">
                Declination: {qibla.declinationDeg > 0 ? '+' : ''}{qibla.declinationDeg.toFixed(1)}°
              </p>
            )}
          </div>

          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-[var(--border)] bg-[var(--accent-soft)]">
            <div className="absolute inset-2 rounded-xl bg-[var(--accent)]/10" />
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)]">
              <Navigation
                className="w-5 h-5 text-[var(--accent)]"
                style={{ transform: `rotate(${bearing}deg)` }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          onClick={() => navigate("/qibla")}
        >
          <Navigation className="w-4 h-4" />
          Open Full Compass
        </Button>
      </CardContent>
    </Card>
  );
}

export default QiblaQuickWidget;
