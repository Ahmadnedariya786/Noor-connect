import IslamicStreamPlayer from '@/components/IslamicStreamPlayer';
import { Radio, Wifi, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function LiveStreams() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">

        {/* Page Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Live Transmission</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Makkah · Madinah</p>
          </div>
        </div>

        {/* Player */}
        <IslamicStreamPlayer />

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center">
              <Wifi className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <p className="text-xs font-bold text-foreground">Live Sources</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Live from the Two Holy Mosques — Makkah (Al-Quran Al-Kareem) &amp; Madinah (As-Sunnah).
              Source: SBA via Globecast/Akamai CDN (HTTPS, global, CORS-enabled).
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-foreground">Auto Fallback</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If the primary stream fails, it switches to a secondary source once (Makkah only),
              then shows a friendly error with Retry.
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/50 leading-relaxed">
          If a stream fails, tap Retry. Switch locations using the Makkah / Madinah tabs.
        </p>

      </div>
    </div>
  );
}
