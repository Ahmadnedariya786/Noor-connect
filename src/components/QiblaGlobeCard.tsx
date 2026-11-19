import { useEffect, useRef, useState, useMemo } from 'react';
import { Plane, Car, Navigation, MapPin } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import {
  KAABA_LAT,
  KAABA_LNG,
  toRad,
  toDeg,
  computeQiblaData,
  type DetailedQiblaData,
} from '@/lib/qibla-precision';
import { WORLD_CONTINENTS_MINI } from '@/lib/world-continents-mini';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext-new";

interface QiblaGlobeCardProps {
  userLat: number;
  userLng: number;
  cityName: string;
}

// ─── Orthographic Projection Math ──────────────────────────────────
function projectOrthographic(
  lat: number,
  lon: number,
  centerLat: number,
  centerLon: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number; visible: boolean } {
  const phi = toRad(lat);
  const lambda = toRad(lon);
  const phi0 = toRad(centerLat);
  const lambda0 = toRad(centerLon);

  const cosC =
    Math.sin(phi0) * Math.sin(phi) +
    Math.cos(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0);

  // If cosC < 0, the point is on the far hemisphere of the Earth
  if (cosC < -0.05) {
    return { x: 0, y: 0, visible: false };
  }

  const x = cx + radius * Math.cos(phi) * Math.sin(lambda - lambda0);
  const y =
    cy -
    radius *
      (Math.cos(phi0) * Math.sin(phi) -
        Math.sin(phi0) * Math.cos(phi) * Math.cos(lambda - lambda0));

  return { x, y, visible: true };
}

// ─── Spherical Linear Slerp along Great-Circle Path ───────────────
function slerpGreatCircle(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  t: number
): { lat: number; lon: number } {
  const p1 = toRad(lat1);
  const l1 = toRad(lon1);
  const p2 = toRad(lat2);
  const l2 = toRad(lon2);

  const x1 = Math.cos(p1) * Math.cos(l1);
  const y1 = Math.cos(p1) * Math.sin(l1);
  const z1 = Math.sin(p1);

  const x2 = Math.cos(p2) * Math.cos(l2);
  const y2 = Math.cos(p2) * Math.sin(l2);
  const z2 = Math.sin(p2);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);

  if (Math.abs(omega) < 1e-5) {
    return { lat: lat1, lon: lon1 };
  }

  const sinOmega = Math.sin(omega);
  const a = Math.sin((1 - t) * omega) / sinOmega;
  const b = Math.sin(t * omega) / sinOmega;

  const x = a * x1 + b * x2;
  const y = a * y1 + b * y2;
  const z = a * z1 + b * z2;

  const lat = toDeg(Math.asin(Math.max(-1, Math.min(1, z))));
  const lon = toDeg(Math.atan2(y, x));

  return { lat, lon };
}

export const QiblaGlobeCard = ({ userLat, userLng, cityName }: QiblaGlobeCardProps) => {
  const { ui } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [travelMode, setTravelMode] = useState<'flight' | 'road'>('flight');
  const animProgressRef = useRef(1);
  const rafIdRef = useRef<number | null>(null);

  // Compute Qibla telemetries
  const qiblaData: DetailedQiblaData = useMemo(() => {
    return computeQiblaData(userLat, userLng);
  }, [userLat, userLng]);

  // Center orthographic globe on spherical midpoint between User and Kaaba
  const centerPoint = useMemo(() => {
    return slerpGreatCircle(userLat, userLng, KAABA_LAT, KAABA_LNG, 0.5);
  }, [userLat, userLng]);

  // Render Earth globe on Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let startTime: number | null = null;
    const animDuration = 900; // ms 1-shot draw-in animation

    const renderGlobe = (progress: number) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const displaySize = 220;
      canvas.width = displaySize * dpr;
      canvas.height = displaySize * dpr;
      canvas.style.width = `${displaySize}px`;
      canvas.style.height = `${displaySize}px`;

      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = displaySize / 2;
      const cy = displaySize / 2;
      const radius = displaySize * 0.44;

      // Extract current theme CSS variables
      const computedStyle = getComputedStyle(canvas);
      const accent = computedStyle.getPropertyValue('--accent').trim() || '#10b981';
      const accent2 = computedStyle.getPropertyValue('--accent-2').trim() || accent;
      const border = computedStyle.getPropertyValue('--border').trim() || 'rgba(255,255,255,0.12)';
      const surface = computedStyle.getPropertyValue('--surface').trim() || '#1e293b';
      const surface2 = computedStyle.getPropertyValue('--surface-2').trim() || '#334155';
      const textPrimary = computedStyle.getPropertyValue('--text-primary').trim() || '#f8fafc';
      const textSecondary = computedStyle.getPropertyValue('--text-secondary').trim() || '#94a3b8';

      ctx.clearRect(0, 0, displaySize, displaySize);

      // ── 1. Earth Disc & Atmospheric Glow ──
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = surface;
      ctx.fill();

      // Atmospheric limb ring
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = border;
      ctx.stroke();

      // Inner space shadow gradient
      const limbGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius);
      limbGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      limbGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = limbGrad;
      ctx.fill();

      // ── 2. Latitude & Longitude Graticules ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = border;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);

      // Latitudes: Equator, ±30°, ±60°
      const latParallels = [-60, -30, 0, 30, 60];
      for (const lat of latParallels) {
        ctx.beginPath();
        let first = true;
        for (let lon = -180; lon <= 180; lon += 5) {
          const pt = projectOrthographic(lat, lon, centerPoint.lat, centerPoint.lon, radius, cx, cy);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }

      // Meridians: every 45°
      for (let lon = -180; lon < 180; lon += 45) {
        ctx.beginPath();
        let first = true;
        for (let lat = -80; lat <= 80; lat += 5) {
          const pt = projectOrthographic(lat, lon, centerPoint.lat, centerPoint.lon, radius, cx, cy);
          if (pt.visible) {
            if (first) {
              ctx.moveTo(pt.x, pt.y);
              first = false;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          } else {
            first = true;
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // ── 3. Continent Polygons ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = surface2;
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.8;

      for (const continent of WORLD_CONTINENTS_MINI) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < continent.points.length; i++) {
          const [lat, lon] = continent.points[i];
          const pt = projectOrthographic(lat, lon, centerPoint.lat, centerPoint.lon, radius, cx, cy);
          if (pt.visible) {
            if (!started) {
              ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
        }
        if (started) {
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── 4. User Pin & True North Meridian Line ──
      const userProj = projectOrthographic(
        userLat,
        userLng,
        centerPoint.lat,
        centerPoint.lon,
        radius,
        cx,
        cy
      );
      const kaabaProj = projectOrthographic(
        KAABA_LAT,
        KAABA_LNG,
        centerPoint.lat,
        centerPoint.lon,
        radius,
        cx,
        cy
      );

      if (userProj.visible) {
        // True North meridian dashed guide line from User pin
        const northGuideProj = projectOrthographic(
          Math.min(userLat + 18, 85),
          userLng,
          centerPoint.lat,
          centerPoint.lon,
          radius,
          cx,
          cy
        );

        if (northGuideProj.visible) {
          ctx.beginPath();
          ctx.setLineDash([2, 3]);
          ctx.strokeStyle = textSecondary;
          ctx.lineWidth = 1;
          ctx.moveTo(userProj.x, userProj.y);
          ctx.lineTo(northGuideProj.x, northGuideProj.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // North symbol
          ctx.font = 'bold 8px system-ui, sans-serif';
          ctx.fillStyle = textSecondary;
          ctx.textAlign = 'center';
          ctx.fillText('N', northGuideProj.x, northGuideProj.y - 3);
        }
      }

      // ── 5. Golden Great-Circle Geodesic Arc (User -> Kaaba) ──
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const numSteps = 48;
      const maxStep = Math.max(1, Math.round(numSteps * progress));
      ctx.beginPath();
      let arcStarted = false;

      for (let s = 0; s <= maxStep; s++) {
        const t = s / numSteps;
        const interp = slerpGreatCircle(userLat, userLng, KAABA_LAT, KAABA_LNG, t);
        const pt = projectOrthographic(
          interp.lat,
          interp.lon,
          centerPoint.lat,
          centerPoint.lon,
          radius,
          cx,
          cy
        );
        if (pt.visible) {
          if (!arcStarted) {
            ctx.moveTo(pt.x, pt.y);
            arcStarted = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
      }

      // Geodesic curve stroke
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // Subtle glow over the curve
      ctx.strokeStyle = accent2;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ── 6. Pins: User and Kaaba ──
      if (userProj.visible) {
        // User marker
        ctx.beginPath();
        ctx.arc(userProj.x, userProj.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillStyle = textPrimary;
        ctx.textAlign = userProj.x > cx ? 'right' : 'left';
        const labelX = userProj.x > cx ? userProj.x - 7 : userProj.x + 7;
        ctx.fillText(cityName.split(',')[0], labelX, userProj.y - 4);
      }

      if (kaabaProj.visible) {
        // Kaaba marker (Holy Gold)
        ctx.beginPath();
        ctx.arc(kaabaProj.x, kaabaProj.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#18181b';
        ctx.stroke();

        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.fillStyle = '#fbbf24';
        ctx.textAlign = kaabaProj.x > cx ? 'right' : 'left';
        const kLabelX = kaabaProj.x > cx ? kaabaProj.x - 7 : kaabaProj.x + 7;
        ctx.fillText('Makkah', kLabelX, kaabaProj.y + 11);
      }

      // Compass Bearing Tag
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = accent;
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(qiblaData.bearing)}° Qibla`, cx, displaySize - 6);

      ctx.restore();
    };

    // 1-shot smooth entrance animation
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / animDuration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      animProgressRef.current = eased;
      renderGlobe(eased);

      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(animate);
      } else {
        rafIdRef.current = null;
      }
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [userLat, userLng, cityName, centerPoint, qiblaData]);

  const activeDistance = travelMode === 'road' ? qiblaData.roadKm : qiblaData.flightKm;
  const activeDuration = travelMode === 'road' ? qiblaData.roadDurationText : qiblaData.flightDurationText;

  return (
    <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm">
      <CardContent className="p-3.5 sm:p-4 space-y-4">
        {/* Card Header (1-line title with segmented toggle, 360px safe with >= 12px spare room) */}
        <div
          className="flex items-center justify-between gap-2 w-full box-border"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <p
            className="text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-1.5"
            style={{
              fontSize: '0.70rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              whiteSpace: 'nowrap',
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            <Navigation className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">QIBLA ROUTE</span>
          </p>

          {/* Segmented Travel Mode Toggle */}
          <div
            className="flex items-center p-0.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] shrink-0"
            style={{ flexShrink: 0 }}
          >
            <button
              type="button"
              onClick={() => setTravelMode('flight')}
              className={cn(
                "flex items-center gap-1 rounded-lg font-bold transition-all",
                travelMode === 'flight'
                  ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Plane className="w-3 h-3 shrink-0" />
              <span>{ui.flight}</span>
            </button>
            <button
              type="button"
              onClick={() => setTravelMode('road')}
              className={cn(
                "flex items-center gap-1 rounded-lg font-bold transition-all",
                travelMode === 'road'
                  ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Car className="w-3 h-3 shrink-0" />
              <span>{ui.road}</span>
            </button>
          </div>
        </div>

        {/* Big Distance Display (Tight comma kerning) */}
        <div className="flex items-baseline gap-1.5 ltr-num" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
          <bdi>
            <span
              dir="ltr"
              style={{
                direction: 'ltr',
                unicodeBidi: 'isolate',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
              className="inline-block text-3xl font-black text-[var(--text-primary)]"
            >
              {activeDistance.toLocaleString('en-US')}
            </span>
          </bdi>
          <span className="text-sm font-bold text-[var(--text-secondary)]">km</span>
        </div>

        {/* 2D HTML5 Canvas Orthographic Globe */}
        <div className="flex flex-col items-center justify-center pt-1 pb-1">
          <div className="relative rounded-full border border-[var(--border)] p-1 bg-[var(--bg-base)] shadow-inner">
            <canvas
              ref={canvasRef}
              className="block rounded-full"
              style={{ width: '220px', height: '220px' }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-2 font-medium tracking-wide">
            Orthographic Geodesic Shortest Path from {cityName.split(',')[0]} to Baitullah
          </p>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--accent-text)] text-[10px] font-bold uppercase tracking-wider">
              {travelMode === 'flight' ? <Plane className="w-3 h-3" /> : <Car className="w-3 h-3" />}
              <span>{travelMode === 'flight' ? 'Air Flight Path' : 'Overland Route'}</span>
            </div>
            <p
              className="text-base font-black text-[var(--text-primary)] mt-0.5 tabular-nums"
              style={{ letterSpacing: '-0.02em' }}
            >
              {activeDistance.toLocaleString('en-US')} km
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {travelMode === 'flight' ? 'Great-circle straight geodesic' : 'Road network estimate (+34%)'}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
            <div className="flex items-center gap-1.5 text-[var(--accent-text)] text-[10px] font-bold uppercase tracking-wider">
              <MapPin className="w-3 h-3" />
              <span>Est. Travel Time</span>
            </div>
            <p className="text-base font-black text-[var(--text-primary)] font-mono mt-0.5">
              ~{activeDuration}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]">
              {travelMode === 'flight' ? 'At ~800 km/h commercial cruising' : 'At ~75 km/h driving speed'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QiblaGlobeCard;
