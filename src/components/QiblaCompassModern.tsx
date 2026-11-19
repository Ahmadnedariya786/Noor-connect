import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLBACK_LOCATIONS } from '@/lib/location-state';
import { LOCATION_STORAGE_KEY } from '@/lib/location-config';
import {
  Compass,
  RefreshCw,
  Navigation,
  MapPin,
  Check,
  Sun,
  Smartphone,
  AlertTriangle,
} from 'lucide-react';
import { GeolocationService, type LocationCoordinates } from '@/lib/geolocation-service';
import {
  KAABA_LAT,
  KAABA_LNG,
  computeQiblaData,
  computeSolarAzimuthDeg,
  interpolateCircularHeading,
  computeQiblaOffset,
  computeDeviceTilt,
  normalizeDegrees,
  getCardinalDirection,
  type DetailedQiblaData,
  type SolarPosition,
  type TiltLevelData,
} from '@/lib/qibla-precision';
import { QiblaGlobeCard } from './QiblaGlobeCard';
import { QiblaCalibrationModal } from './QiblaCalibrationModal';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext-new";

// ─── Types ────────────────────────────────────────────────────
type CompassState =
  | 'idle'
  | 'activating'
  | 'active'
  | 'permission-required'
  | 'denied'
  | 'unsupported';

type DeviceOrientationConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

function isIOSPlatform(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function getFallbackLocationByTimezone(timezone: string) {
  return (
    FALLBACK_LOCATIONS[timezone as keyof typeof FALLBACK_LOCATIONS] || {
      name: 'Mecca',
      lat: KAABA_LAT,
      lon: KAABA_LNG,
    }
  );
}

function loadInitialLocation(): { coords: LocationCoordinates; name: string } {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.longitude === 'number' &&
        Number.isFinite(parsed.latitude) &&
        Number.isFinite(parsed.longitude) &&
        parsed.latitude >= -90 &&
        parsed.latitude <= 90 &&
        parsed.longitude >= -180 &&
        parsed.longitude <= 180
      ) {
        return {
          coords: { latitude: parsed.latitude, longitude: parsed.longitude, accuracy: 1000 },
          name:
            typeof parsed.locationName === 'string' && parsed.locationName
              ? parsed.locationName
              : 'Ahmedabad, India',
        };
      }
    }
  } catch (error) {
    console.warn('Qibla: failed to read stored location:', error);
  }

  const fallback = getFallbackLocationByTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return {
    coords: { latitude: fallback.lat, longitude: fallback.lon, accuracy: 1000 },
    name: fallback.name,
  };
}

// ─── Constants ────────────────────────────────────────────────
const SENSOR_FALLBACK_TIMEOUT_MS = 2500;

// Dial tick marks (72 ticks = every 5°)
const DIAL_TICKS = Array.from({ length: 72 }, (_, i) => {
  const deg = i * 5;
  const isMajor = deg % 30 === 0;
  const isMedium = deg % 15 === 0;
  return { deg, isMajor, isMedium };
});

// Major degree numbers every 30° (excluding cardinals which show N, E, S, W)
const DEGREE_LABELS = [
  { deg: 30, text: '30' },
  { deg: 60, text: '60' },
  { deg: 120, text: '120' },
  { deg: 150, text: '150' },
  { deg: 210, text: '210' },
  { deg: 240, text: '240' },
  { deg: 300, text: '300' },
  { deg: 330, text: '330' },
];

// ─── Kaaba SVG Vector Icon (Detailed Horology-Grade) ─────────────
const KaabaVector = ({ size = 28, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Base Cube Silhouette */}
    <path
      d="M16 3 L28 9 L28 23 L16 29 L4 23 L4 9 Z"
      fill="var(--bg-base)"
      stroke="var(--accent)"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Left Isometric Wall */}
    <path d="M4 9 L16 15 L16 29 L4 23 Z" fill="var(--text-primary)" fillOpacity="0.82" />
    {/* Right Isometric Wall */}
    <path d="M16 15 L28 9 L28 23 L16 29 Z" fill="var(--text-primary)" fillOpacity="0.95" />
    {/* Top Roof Surface */}
    <path d="M16 3 L28 9 L16 15 L4 9 Z" fill="var(--text-primary)" fillOpacity="0.65" />
    {/* Golden Kiswah Belt (Hizam) */}
    <path d="M4 13 L16 19 L28 13" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 14.3 L16 20.3 L28 14.3" stroke="var(--accent-2)" strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
    {/* Golden Door of the Kaaba (Bab ar-Rahmah) */}
    <rect x="18" y="18" width="4.5" height="7.5" rx="0.8" fill="var(--accent)" stroke="var(--accent-2)" strokeWidth="0.5" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────
export const QiblaCompassModern = () => {
  const { ui } = useLanguage();

  // ── Location State ───────────────────────────────────────────
  const [bootLocation] = useState(loadInitialLocation);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoordinates>(bootLocation.coords);
  const [cityName, setCityName] = useState<string>(bootLocation.name || 'Ahmedabad, India');

  // Detailed Qibla telemetries
  const qiblaData: DetailedQiblaData = useMemo(() => {
    return computeQiblaData(location.latitude, location.longitude);
  }, [location.latitude, location.longitude]);

  // NOAA Solar Azimuth & Elevation
  const [solarPos, setSolarPos] = useState<SolarPosition>(() =>
    computeSolarAzimuthDeg(location.latitude, location.longitude)
  );

  // Update solar position periodically (every 60s)
  useEffect(() => {
    const updateSolar = () => {
      setSolarPos(computeSolarAzimuthDeg(location.latitude, location.longitude));
    };
    updateSolar();
    const interval = setInterval(updateSolar, 60000);
    return () => clearInterval(interval);
  }, [location.latitude, location.longitude]);

  // ── Compass & Sensor State ───────────────────────────────────
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [compassState, setCompassState] = useState<CompassState>(() => {
    if (typeof window !== 'undefined' && isIOSPlatform() && 'DeviceOrientationEvent' in window) {
      const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
      if (typeof ctor.requestPermission === 'function') {
        return 'permission-required';
      }
    }
    return 'active';
  });
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [isSensorInactive, setIsSensorInactive] = useState(false);
  const [compassSignal, setCompassSignal] = useState<number | null>(null);
  const [tiltData, setTiltData] = useState<TiltLevelData>({
    tiltDegrees: 0,
    isFlat: true,
    needsFlattening: false,
    bubbleX: 0,
    bubbleY: 0,
  });
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────
  const locationRef = useRef<LocationCoordinates>(location);
  const isMountedRef = useRef(true);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const sensorFallbackTimerRef = useRef<number | null>(null);
  const hasReceivedSensorEventRef = useRef(false);
  const smoothedHeadingRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);
  const hapticFiredRef = useRef(false);
  const recentHeadingsRef = useRef<number[]>([]);
  const lastSignalCalcRef = useRef<number>(0);

  // ── Safe Sensor Error Handler ────────────────────────────────
  const handleSensorError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Compass sensor encountered an issue';
    console.warn('QiblaCompass safe sensor notification:', msg);
    setSensorError(msg);
    setCompassState('unsupported');
    setIsSensorInactive(true);
  }, []);

  // ── Stop Compass Tracking ─────────────────────────────────────
  const stopCompassTracking = useCallback(() => {
    if (orientationListenerRef.current) {
      try {
        window.removeEventListener('deviceorientationabsolute', orientationListenerRef.current, true);
        window.removeEventListener('deviceorientation', orientationListenerRef.current, true);
      } catch (err) {
        console.warn('Error removing orientation listeners:', err);
      }
      orientationListenerRef.current = null;
    }

    if (sensorFallbackTimerRef.current !== null) {
      window.clearTimeout(sensorFallbackTimerRef.current);
      sensorFallbackTimerRef.current = null;
    }

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    hasReceivedSensorEventRef.current = false;
    smoothedHeadingRef.current = null;
    recentHeadingsRef.current = [];
    setCompassSignal(null);
  }, []);

  // ── Attach Multi-Tier Sensor Engine ──────────────────────────
  const attachSafeSensors = useCallback(() => {
    stopCompassTracking();
    setSensorError(null);
    setCompassState('active');
    setIsSensorInactive(false);

    if (typeof window === 'undefined') {
      setCompassState('unsupported');
      setIsSensorInactive(true);
      return;
    }

    let absoluteEventFired = false;

    // Throttle & shortest-path angular smoothing handler
    const onOrientationChange = (event: DeviceOrientationEvent) => {
      try {
        if (!isMountedRef.current) return;

        // If absolute orientation is delivering data, ignore standard deviceorientation
        if (event.type === 'deviceorientation' && absoluteEventFired) return;
        if (event.type === 'deviceorientationabsolute') absoluteEventFired = true;

        const ev = event as DeviceOrientationEvent & {
          webkitCompassHeading?: number;
          webkitCompassAccuracy?: number;
        };
        let rawHeading: number | null = null;

        // 1. iOS Safari compass heading
        if (typeof ev.webkitCompassHeading === 'number' && !Number.isNaN(ev.webkitCompassHeading)) {
          rawHeading = normalizeDegrees(ev.webkitCompassHeading);
        }
        // 2. Android Chrome / WebView absolute heading
        else if (ev.alpha !== null && typeof ev.alpha === 'number' && !Number.isNaN(ev.alpha)) {
          rawHeading = normalizeDegrees(360 - ev.alpha);
        }

        // Measure pitch and roll tilt
        const currentTilt = computeDeviceTilt(event.beta, event.gamma);
        setTiltData(currentTilt);

        if (rawHeading === null) return;

        // Mark sensor as actively delivering data
        if (!hasReceivedSensorEventRef.current) {
          hasReceivedSensorEventRef.current = true;
          setIsSensorInactive(false);
          setCompassState('active');
          if (sensorFallbackTimerRef.current !== null) {
            window.clearTimeout(sensorFallbackTimerRef.current);
            sensorFallbackTimerRef.current = null;
          }
        }

        // Rolling 12-sample circular heading stability estimation
        recentHeadingsRef.current.push(rawHeading);
        if (recentHeadingsRef.current.length > 12) {
          recentHeadingsRef.current.shift();
        }

        // Throttle signal calculation to every 350ms
        const now = performance.now();
        if (now - lastSignalCalcRef.current > 350) {
          lastSignalCalcRef.current = now;
          const samples = recentHeadingsRef.current;
          let stability = 95;
          if (samples.length >= 4) {
            let sumSin = 0;
            let sumCos = 0;
            for (let i = 0; i < samples.length; i++) {
              const rad = (samples[i] * Math.PI) / 180;
              sumSin += Math.sin(rad);
              sumCos += Math.cos(rad);
            }
            const R = Math.sqrt(sumSin * sumSin + sumCos * sumCos) / samples.length;
            stability = Math.max(25, Math.min(99, Math.round(R * 100)));
          }

          let finalSig = stability;
          if (typeof ev.webkitCompassAccuracy === 'number' && ev.webkitCompassAccuracy >= 0) {
            const accDeg = ev.webkitCompassAccuracy;
            const accScore = Math.max(15, Math.min(100, Math.round(100 - accDeg * 2.5)));
            finalSig = Math.round(stability * 0.5 + accScore * 0.5);
          }
          setCompassSignal(finalSig);
        }

        // Throttle render updates to ~25fps (40ms) to prevent WebView churn
        if (now - lastFrameTimeRef.current < 40) return;
        lastFrameTimeRef.current = now;

        // Apply shortest-path circular interpolation
        const next = interpolateCircularHeading(smoothedHeadingRef.current, rawHeading, 0.22);
        smoothedHeadingRef.current = next;

        // Schedule state update via requestAnimationFrame
        if (rafIdRef.current !== null) {
          cancelAnimationFrame(rafIdRef.current);
        }
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (isMountedRef.current) {
            setDeviceHeading(next);
            setCompassState('active');
          }
        });
      } catch (err) {
        console.warn('Safe orientation handler caught exception:', err);
      }
    };

    orientationListenerRef.current = onOrientationChange;

    try {
      // 1. Immediately attach both 'deviceorientationabsolute' and 'deviceorientation'
      window.addEventListener('deviceorientationabsolute', onOrientationChange, true);
      window.addEventListener('deviceorientation', onOrientationChange, true);

      // 2. Fallback: if no sensor data arrives after 2.5 seconds, display manual/true-north fallback
      sensorFallbackTimerRef.current = window.setTimeout(() => {
        if (!hasReceivedSensorEventRef.current && isMountedRef.current) {
          setIsSensorInactive(true);
          setCompassState('active');
          if (smoothedHeadingRef.current === null) {
            smoothedHeadingRef.current = 0;
            setDeviceHeading(0);
          }
          setCompassSignal(null);
        }
      }, SENSOR_FALLBACK_TIMEOUT_MS);
    } catch (attachErr) {
      handleSensorError(attachErr);
    }
  }, [handleSensorError, stopCompassTracking]);

  // ── Auto-Start On Mount ───────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    // Check if iOS requires manual user tap for permission (strictly iOS only)
    if (isIOSPlatform() && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
      if (typeof ctor.requestPermission === 'function') {
        setCompassState('permission-required');
        return;
      }
    }

    // Modern browsers and Android WebView: Auto-start immediately!
    attachSafeSensors();

    return () => {
      isMountedRef.current = false;
      stopCompassTracking();
    };
  }, [attachSafeSensors, stopCompassTracking]);

  // ── Toggle Compass Handler ───────────────────────────────────
  const toggleCompass = useCallback(async () => {
    if (compassState === 'active') {
      stopCompassTracking();
      setCompassState('idle');
      return;
    }

    try {
      setSensorError(null);
      setCompassState('active');

      // iOS permission request (strictly guarded for iOS only)
      if (isIOSPlatform() && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
        if (typeof ctor.requestPermission === 'function') {
          try {
            const permission = await ctor.requestPermission();
            if (permission !== 'granted') {
              setCompassState('denied');
              setIsSensorInactive(true);
              return;
            }
          } catch (permErr) {
            console.warn('DeviceOrientationEvent requestPermission handled:', permErr);
            setCompassState('denied');
            setIsSensorInactive(true);
            return;
          }
        }
      }

      attachSafeSensors();
    } catch (err) {
      handleSensorError(err);
    }
  }, [attachSafeSensors, compassState, handleSensorError, stopCompassTracking]);

  // ── Refresh Location Data ─────────────────────────────────────
  const refreshLocation = useCallback(async () => {
    setIsRefreshingLocation(true);
    setLocationError(null);

    let position: LocationCoordinates | null = null;
    try {
      position = await GeolocationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      });
    } catch {
      try {
        position = await GeolocationService.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 300000,
        });
      } catch {
        position = null;
      }
    }

    if (!isMountedRef.current) return;

    if (position) {
      locationRef.current = position;
      setLocation(position);
      setCityName((prev) => prev.replace(/\s*\(Offline\)\s*$/, ''));
    } else {
      setLocationError('Could not refresh GPS. Displaying saved city location.');
    }

    setIsRefreshingLocation(false);
  }, []);

  // ── Alignment & Offset Math ───────────────────────────────────
  const qiblaAngle = qiblaData.bearing;
  const isLiveCompass = compassState === 'active' && deviceHeading !== null;

  const offsetResult = useMemo(() => {
    return computeQiblaOffset(deviceHeading, qiblaAngle);
  }, [deviceHeading, qiblaAngle]);

  const isAligned = isLiveCompass && offsetResult.isAligned;

  // ── Debounced 1-Shot Haptic Feedback ───────────────────────────
  useEffect(() => {
    if (isAligned && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60]);
        } catch {
          // Vibration failed or unsupported - safe silent fallback
        }
      }
    } else if (!isAligned) {
      hapticFiredRef.current = false;
    }
  }, [isAligned]);

  // ── Dial & Rose Rotation ─────────────────────────────────────
  const roseRotation = deviceHeading !== null ? -deviceHeading : 0;

  // ── Clockwise True-North Arc Calculation ─────────────────────
  const arcRadius = 122;
  const qiblaRad = (qiblaAngle * Math.PI) / 180;
  const arcEndX = 140 + arcRadius * Math.sin(qiblaRad);
  const arcEndY = 140 - arcRadius * Math.cos(qiblaRad);
  const largeArcFlag = qiblaAngle > 180 ? 1 : 0;
  const clockwiseArcD =
    qiblaAngle > 1 && qiblaAngle < 359
      ? `M 140,${140 - arcRadius} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${arcEndX.toFixed(
          1
        )} ${arcEndY.toFixed(1)}`
      : '';

  return (
    <div className="flex flex-col h-full min-h-0 relative overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* ── Background Subtle Islamic Pattern ───────────────────── */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, var(--accent) 1px, transparent 0)`,
            backgroundSize: '36px 36px',
          }}
        />
      </div>

      {/* ── Header Section ────────────────────────────────────────── */}
      <div className="relative z-10 px-4 pt-5 pb-2 text-center space-y-1.5">
        {/* Ornamental Divider */}
        <div className="flex items-center justify-center gap-2 opacity-50 mb-0.5">
          <div className="w-8 h-px bg-[var(--accent)]" />
          <div className="w-1.5 h-1.5 rotate-45 bg-[var(--accent)]" />
          <div className="w-8 h-px bg-[var(--accent)]" />
        </div>

        <p className="text-[var(--accent-text)] text-[11px] tracking-[0.25em] uppercase font-bold">
          {ui.qiblaDirection}
        </p>

        {/* Large Degree Display & Cardinal */}
        <div
          className="flex items-baseline justify-center gap-2 ltr-num"
          dir="ltr"
          style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
        >
          <span
            className="text-5xl font-black text-[var(--text-primary)] tracking-tight font-mono ltr-num"
            dir="ltr"
            style={{ fontStyle: 'italic', direction: 'ltr', unicodeBidi: 'isolate' }}
          >
            {Math.round(qiblaAngle)}°
          </span>
          <span
            className="text-2xl font-bold text-[var(--accent-text)] ltr-num"
            dir="ltr"
            style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
          >
            {qiblaData.cardinalDirection}
          </span>
        </div>

        {/* 1-Tap GPS Refresh Location Pill */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={refreshLocation}
            disabled={isRefreshingLocation}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium shadow-sm transition-all active:scale-95"
            title="Refresh GPS location"
          >
            <MapPin className="h-3.5 w-3.5 text-[var(--accent-text)]" />
            <span className="truncate max-w-[200px]">{cityName}</span>
            <RefreshCw
              className={cn(
                "h-3 w-3 text-[var(--accent-text)] transition-transform",
                isRefreshingLocation && "animate-spin"
              )}
            />
          </button>
        </div>

        {/* Live Alignment Status Badge */}
        <div className="pt-0.5 flex justify-center">
          {isAligned ? (
            <div
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300"
              style={{
                background: 'var(--accent-soft)',
                border: '1.5px solid var(--accent)',
                color: 'var(--accent-text)',
                boxShadow: '0 0 16px var(--accent-glow)',
              }}
            >
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>{ui.alignedWithQibla ? ui.alignedWithQibla.replace(/^✓\s*/, '') : 'Aligned with Qibla (Baitullah)'}</span>
            </div>
          ) : isLiveCompass ? (
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] shadow-sm">
              <Navigation
                className="h-3.5 w-3.5 text-[var(--accent-text)] transition-transform duration-300"
                style={{
                  transform: `rotate(${offsetResult.direction === 'right' ? 90 : -90}deg)`,
                }}
              />
              <span>
                {ui.turnPrefix || 'Turn'}{' '}
                <span className="text-[var(--accent-text)] font-bold">
                  {offsetResult.degrees}°
                </span>{' '}
                {offsetResult.direction === 'right' ? (ui.right || 'Right') : (ui.left || 'Left')}
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={toggleCompass}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--accent)] text-[var(--accent-text)] text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>
                {compassState === 'idle'
                  ? 'Compass Paused — Tap to Resume'
                  : compassState === 'permission-required'
                  ? (ui.tapEnableCompass || 'Tap Enable Live Compass')
                  : isSensorInactive
                  ? 'True North Reference'
                  : 'Starting Live Compass...'}
              </span>
            </button>
          )}
        </div>

        {/* Tilt Warning Banner */}
        {tiltData.needsFlattening && (
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-500 font-semibold animate-pulse pt-0.5">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Hold phone flat for best accuracy ({Math.round(tiltData.tiltDegrees)}° tilt)</span>
          </div>
        )}
      </div>

      {/* ── Multi-Ring Luxury Horology Compass Dial (280px × 280px) ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-1">
        <div className="relative w-[280px] h-[280px] max-w-[85vw] max-h-[85vw] flex items-center justify-center">
          {/* Compass SVG Dial */}
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="w-full h-full select-none"
            style={{
              transition: 'transform 0.2s ease-out',
            }}
          >
            <defs>
              {/* Dial Face Gradient */}
              <radialGradient id="dialGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--surface-2)" />
                <stop offset="70%" stopColor="var(--surface)" />
                <stop offset="100%" stopColor="var(--bg-base)" />
              </radialGradient>
              {/* Outer Metallic Bezel Gradient */}
              <linearGradient id="bezelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--border)" />
                <stop offset="50%" stopColor="var(--accent)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="var(--border)" />
              </linearGradient>
            </defs>

            {/* 1. OUTER FIXED BEZEL */}
            <circle
              cx="140"
              cy="140"
              r="137"
              fill="none"
              stroke="url(#bezelGrad)"
              strokeWidth="2"
            />
            <circle
              cx="140"
              cy="140"
              r="133"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeOpacity="0.35"
            />

            {/* 2. ROTATING COMPASS ROSE GROUP */}
            <g
              transform={`rotate(${roseRotation} 140 140)`}
              style={{
                transition: hasReceivedSensorEventRef.current
                  ? 'none'
                  : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
                willChange: 'transform',
              }}
            >
              {/* Dial Background Disc */}
              <circle cx="140" cy="140" r="130" fill="url(#dialGrad)" />

              {/* Chapter Track Rings */}
              <circle
                cx="140"
                cy="140"
                r="126"
                fill="none"
                stroke="var(--border)"
                strokeWidth="1"
              />
              <circle
                cx="140"
                cy="140"
                r="112"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.8"
                strokeOpacity="0.4"
              />
              <circle
                cx="140"
                cy="140"
                r="86"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.8"
                strokeDasharray="2 4"
                strokeOpacity="0.3"
              />

              {/* ── CLOCKWISE GOLDEN TRUE-NORTH ARC (0° N to Qibla) ── */}
              {clockwiseArcD && (
                <path
                  d={clockwiseArcD}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2.2"
                  strokeDasharray="4 2.5"
                  strokeOpacity="0.75"
                />
              )}

              {/* 72 Perimeter Tick Marks */}
              {DIAL_TICKS.map((tick) => (
                <line
                  key={tick.deg}
                  x1="140"
                  y1={tick.isMajor ? '14' : tick.isMedium ? '18' : '20'}
                  x2="140"
                  y2="26"
                  stroke={
                    tick.isMajor
                      ? 'var(--accent)'
                      : tick.isMedium
                      ? 'var(--text-secondary)'
                      : 'var(--border)'
                  }
                  strokeWidth={tick.isMajor ? '1.8' : tick.isMedium ? '1.2' : '0.8'}
                  strokeOpacity={tick.isMajor ? '1' : tick.isMedium ? '0.7' : '0.35'}
                  transform={`rotate(${tick.deg} 140 140)`}
                />
              ))}

              {/* Major Degree Numbers (every 30° except cardinals) */}
              {DEGREE_LABELS.map((item) => {
                const rad = ((item.deg - 90) * Math.PI) / 180;
                const x = 140 + 98 * Math.cos(rad);
                const y = 140 + 98 * Math.sin(rad);
                return (
                  <text
                    key={item.deg}
                    x={x}
                    y={y}
                    fill="var(--text-secondary)"
                    fontSize="7.5"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                    opacity="0.8"
                  >
                    {item.text}
                  </text>
                );
              })}

              {/* Bold Cardinal Markers */}
              {/* North */}
              <text
                x="140"
                y="40"
                fill="var(--accent)"
                fontSize="13"
                fontWeight="900"
                textAnchor="middle"
                dominantBaseline="central"
              >
                N
              </text>
              {/* East */}
              <text
                x="238"
                y="140"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="central"
              >
                E
              </text>
              {/* South */}
              <text
                x="140"
                y="240"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="central"
              >
                S
              </text>
              {/* West */}
              <text
                x="42"
                y="140"
                fill="var(--text-primary)"
                fontSize="11"
                fontWeight="800"
                textAnchor="middle"
                dominantBaseline="central"
              >
                W
              </text>

              {/* ── DAYTIME & CELESTIAL SUN AZIMUTH MARKER (Astronomical Alignment) ── */}
              <g
                transform={`rotate(${solarPos.azimuthDeg} 140 140)`}
                opacity={solarPos.isDaytime ? "1" : "0.4"}
              >
                <circle
                  cx="140"
                  cy="14"
                  r="8.5"
                  fill={solarPos.isDaytime ? "rgba(245, 158, 11, 0.22)" : "rgba(148, 163, 184, 0.15)"}
                  stroke={solarPos.isDaytime ? "#f59e0b" : "var(--border)"}
                  strokeWidth="1.2"
                />
                <text
                  x="140"
                  y="14"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                >
                  ☀️
                </text>
              </g>

              {/* ── GOLDEN QIBLA POINTER NEEDLE & KAABA CREST (Locked at qiblaAngle) ── */}
              <g transform={`rotate(${qiblaAngle} 140 140)`}>
                {/* Pointer Arrow Stem */}
                <polygon points="140,28 136,80 140,82" fill="var(--accent)" />
                <polygon points="140,28 144,80 140,82" fill="var(--accent-2)" />
                {/* Tail Counterweight */}
                <polygon points="140,195 137,175 143,175" fill="var(--accent)" opacity="0.4" />

                {/* Kaaba Cube Crest Badge on Perimeter Ring */}
                <g transform="translate(133, 12)">
                  <KaabaVector size={14} />
                </g>

                {/* Arrowhead pointing to the perimeter */}
                <polygon points="140,7 136,13 144,13" fill="var(--accent)" />
              </g>
            </g>

            {/* 3. CENTER MEDALLION & SPIRIT LEVEL BUBBLE */}
            <g transform="translate(140, 140)">
              {/* Medallion Hub Disc */}
              <circle
                r="34"
                fill="var(--bg-base)"
                stroke={isAligned ? 'var(--accent)' : 'var(--border)'}
                strokeWidth="2"
              />
              {/* Spirit Level Bullseye Rings */}
              <circle
                r="20"
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.8"
                strokeDasharray="2 3"
                opacity="0.6"
              />
              <circle
                r="10"
                fill={tiltData.isFlat ? 'var(--accent-soft)' : 'none'}
                stroke={tiltData.isFlat ? 'var(--accent)' : 'var(--border)'}
                strokeWidth="1"
              />

              {/* Crosshairs */}
              <line x1="-12" y1="0" x2="12" y2="0" stroke="var(--border)" strokeWidth="0.8" opacity="0.4" />
              <line x1="0" y1="-12" x2="0" y2="12" stroke="var(--border)" strokeWidth="0.8" opacity="0.4" />

              {/* Moving Spirit Bubble */}
              <circle
                cx={tiltData.bubbleX * 16}
                cy={tiltData.bubbleY * 16}
                r="4.5"
                fill={tiltData.isFlat ? 'var(--accent)' : '#f59e0b'}
                stroke="var(--bg-base)"
                strokeWidth="1.2"
                opacity="0.95"
              />

              {/* Center Sacred Rub el Hizb / Kaaba Emblem */}
              <g transform="translate(-12, -12)">
                <KaabaVector size={24} />
              </g>
            </g>

            {/* 4. FIXED TOP 12 O'CLOCK ALIGNMENT NOTCH (Phone Direction) */}
            <polygon points="135,4 145,4 140,14" fill="var(--accent)" />
            <circle cx="140" cy="3" r="1.5" fill="var(--accent)" />
          </svg>
        </div>
      </div>

      {/* ── ABOVE-THE-FOLD CONTROL STRIP (Directly Under Dial, 360px-safe) ── */}
      <div className="relative z-10 px-3 pt-1 pb-3 space-y-2">
        <div
          className="flex items-center justify-between w-full max-w-full box-border"
          style={{ gap: '6px' }}
        >
          {/* Sensor Status Pill (Taps open calibration modal) */}
          <button
            type="button"
            onClick={() => setShowCalibrationModal(true)}
            className="flex-1 min-w-0 inline-flex items-center justify-between rounded-full border font-semibold bg-[var(--surface-2)] border-[var(--border)] active:scale-98 transition-all overflow-hidden"
            style={{
              flex: '1 1 auto',
              padding: '6px 10px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
            aria-label="Compass signal accuracy and calibration guide"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    compassState !== 'active'
                      ? '#f59e0b'
                      : isSensorInactive
                      ? '#ef4444'
                      : compassSignal === null
                      ? 'var(--accent)'
                      : compassSignal >= 80
                      ? 'var(--accent)'
                      : compassSignal >= 50
                      ? '#f59e0b'
                      : '#ef4444',
                }}
              />
              <span className="text-[var(--text-primary)] font-bold truncate">
                {compassState !== 'active'
                  ? '● Standby'
                  : isSensorInactive
                  ? '● No Sensor'
                  : compassSignal !== null
                  ? `● Live ${compassSignal}%`
                  : '● Live'}
              </span>
            </div>
            <span
              className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[var(--accent)] font-bold text-[9px] border border-[var(--border)] shrink-0 ml-1"
              style={{ background: 'var(--surface)' }}
            >
              ⓘ
            </span>
          </button>

          {/* Pause / Resume Button */}
          <button
            type="button"
            onClick={toggleCompass}
            className="rounded-full border font-bold transition-all active:scale-95 shrink-0 bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] cursor-pointer"
            style={{
              flexShrink: 0,
              padding: '6px 11px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
            }}
          >
            {compassState === 'active' ? 'Pause' : 'Resume'}
          </button>

          {/* Calibrate Button (1-line, unclipped on 360px) */}
          <button
            type="button"
            onClick={() => setShowCalibrationModal(true)}
            className="rounded-full border font-bold transition-all active:scale-95 shrink-0 bg-[var(--surface)] border-[var(--border)] text-[var(--accent-text)] cursor-pointer"
            style={{
              flexShrink: 0,
              padding: '6px 11px',
              fontSize: '0.72rem',
              whiteSpace: 'nowrap',
            }}
            title="Recalibrate Compass"
          >
            Calibrate
          </button>
        </div>

        {/* Daytime / Celestial Sun Azimuth Astronomical Hint */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[var(--text-secondary)] font-medium text-center px-2">
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>
            {solarPos.isDaytime ? (
              <>
                Sun at <strong className="text-[var(--text-primary)]">{Math.round(solarPos.azimuthDeg)}°</strong> ({getCardinalDirection(solarPos.azimuthDeg)}). Point phone at the Sun to verify North.
              </>
            ) : (
              <>
                Sun below horizon ({Math.round(solarPos.azimuthDeg)}° {getCardinalDirection(solarPos.azimuthDeg)}). Astronomical Sun marker active during daytime.
              </>
            )}
          </span>
        </div>
      </div>

      {/* ── Below-The-Dial Content Area ────────────────────────────── */}
      <div className="relative z-10 px-4 pb-6 space-y-3.5">
        {/* Sensor Inactive / Fallback Notice Card */}
        {isSensorInactive && (
          <div className="rounded-2xl p-3.5 bg-[var(--surface-2)] border border-[var(--border)] text-left space-y-2.5">
            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No Magnetometer Sensor Detected</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Makkah is <strong className="text-[var(--text-primary)]">{Math.round(qiblaAngle)}° clockwise from True North (0°)</strong>. You can align using the Sun marker above, a physical compass, or rotate the manual heading slider below.
            </p>
            {/* Manual Heading Slider */}
            <div className="flex items-center gap-2.5 pt-1">
              <span className="text-xs font-bold font-mono text-[var(--accent-text)] min-w-[36px]">
                {Math.round(deviceHeading ?? 0)}°
              </span>
              <input
                type="range"
                min="0"
                max="360"
                value={Math.round(deviceHeading ?? 0)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  smoothedHeadingRef.current = val;
                  setDeviceHeading(val);
                  setCompassState('active');
                }}
                className="flex-1 accent-[var(--accent)] cursor-pointer h-1.5 bg-[var(--surface)] rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  smoothedHeadingRef.current = qiblaAngle;
                  setDeviceHeading(qiblaAngle);
                  setCompassState('active');
                }}
                className="px-2.5 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] text-[10px] font-bold border border-[var(--accent)] active:scale-95 shrink-0"
              >
                Snap Qibla
              </button>
            </div>
          </div>
        )}

        {/* ── GREAT-CIRCLE EARTH GLOBE CARD (2D Canvas Orthographic) ── */}
        <QiblaGlobeCard
          userLat={location.latitude}
          userLng={location.longitude}
          cityName={cityName}
        />

        {/* ── 2-COLUMN LIVE TELEMETRY CARD ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left Column: CURRENT HEADING */}
          <div className="rounded-2xl p-3.5 border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
            <p className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
              {ui.currentHeading}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[var(--text-primary)] font-mono">
                {deviceHeading !== null ? `${Math.round(deviceHeading)}°` : '--°'}
              </span>
              <span className="text-xs font-semibold text-[var(--accent-text)]">
                {deviceHeading !== null
                  ? getCardinalDirection(deviceHeading)
                  : compassState === 'active'
                  ? '(Active)'
                  : `(${ui.standby})`}
              </span>
            </div>
            <p className="text-[var(--text-secondary)]/70 text-[10px]">
              {compassState === 'active' ? ui.phoneAzimuth : ui.compassPaused}
            </p>
          </div>

          {/* Right Column: QIBLA OFFSET (Honest delta + clean single checkmark) */}
          <div className="rounded-2xl p-3.5 border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
            <p className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
              {ui.qiblaOffset}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[var(--text-primary)] font-mono">
                {deviceHeading !== null ? offsetResult.label : '--°'}
              </span>
            </div>
            <div className="text-[10px]">
              {deviceHeading !== null ? (
                isAligned ? (
                  <span className="text-[var(--accent-text)] font-semibold inline-flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>Aligned</span>
                  </span>
                ) : (
                  <span className="text-[var(--text-secondary)]/70">
                    {ui.turnDeviceToAlign || 'Turn device to align'}
                  </span>
                )
              ) : (
                <span className="text-[var(--text-secondary)]/70">
                  {compassState === 'active' ? 'Calibrating...' : (ui.standby || 'Standby')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error notification if any */}
        {sensorError && (
          <p className="text-center text-xs text-red-500/80 font-medium">{sensorError}</p>
        )}
        {locationError && (
          <p className="text-center text-xs text-[var(--text-secondary)]">{locationError}</p>
        )}
      </div>

      {/* ── Calibration Modal (Portal-Rendered at body root) ──────── */}
      <QiblaCalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
        compassSignal={compassSignal}
        isCompassActive={compassState === 'active'}
        isSensorInactive={isSensorInactive}
      />
    </div>
  );
};

export default QiblaCompassModern;
