import IslamicStreamPlayer from '@/components/IslamicStreamPlayer';
import { Radio, Wifi, Shield } from 'lucide-react';

export default function LiveStreams() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">

        {/* Page Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">Live Transmission</h1>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Makkah · Madinah</p>
            </div>
          </div>
        </div>

        {/* Player */}
        <IslamicStreamPlayer />

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Wifi className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-foreground">HLS Stream</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Official Saudi streams via Akamai CDN (hls_roku). Direct HLS streaming for reliability.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xs font-bold text-foreground">Privacy First</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              No tracking, no YouTube. Streams play directly via open-source HLS.js (MIT).
            </p>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 leading-relaxed">
          If a stream fails, tap Retry. Switch locations using the Makkah / Madinah tabs.
        </p>

      </div>
    </div>
  );
}
