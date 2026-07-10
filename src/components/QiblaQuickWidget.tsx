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
    <Card className="relative overflow-hidden border-[#333333] shadow-lg" style={{ background: 'linear-gradient(145deg, #1A1A1A, #141414)' }}>
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] pointer-events-none" style={{ background: 'rgba(201,134,10,0.1)' }} />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-2" style={{ color: '#C9860A' }}>
            <Compass className="w-4 h-4" />
            Qibla
          </CardTitle>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 rounded-xl text-white/50 hover:text-white"
            onClick={() => navigate("/qibla")}
          >
            Open
            <ArrowUpRight className="w-4 h-4 ms-1" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-widest mt-2">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate">{location.locationName}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-4xl font-bold tracking-tight text-white" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
              {bearing}°
              <span className="text-sm font-semibold ms-2" style={{ color: '#C9860A' }}>
                {qibla.cardinalDirection}
              </span>
            </p>
            <p className="text-[11px] text-white/50 uppercase tracking-widest mt-1">
              Distance{" "}
              <span className="font-bold text-white/90">{qibla.formattedDistance}</span>
            </p>
            {qibla.declinationDeg !== 0 && (
              <p className="text-[10px] text-white/30 mt-0.5">
                Declination: {qibla.declinationDeg > 0 ? '+' : ''}{qibla.declinationDeg.toFixed(1)}°
              </p>
            )}
          </div>

          <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center border border-white/5" style={{ background: 'rgba(201,134,10,0.05)' }}>
            <div className="absolute inset-2 rounded-xl" style={{ background: 'radial-gradient(circle, rgba(201,134,10,0.15) 0%, transparent 70%)' }} />
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center border border-white/10" style={{ background: '#1A1A1A' }}>
              <Navigation
                className="w-5 h-5"
                style={{ transform: `rotate(${bearing}deg)`, color: '#C9860A' }}
              />
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border-white/10 hover:bg-white/5 text-white/70"
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
