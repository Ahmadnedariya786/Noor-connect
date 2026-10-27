import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FALLBACK_LOCATIONS } from '@/lib/location-state';
import { LOCATION_STORAGE_KEY } from '@/lib/location-config';
import { Compass, Loader2, RefreshCw, Navigation, MapPin, Car, Plane, Sliders, Check, Info, X } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { GeolocationService, type LocationCoordinates } from '@/lib/geolocation-service';
import { Capacitor } from '@capacitor/core';
import {
  calculateDistanceToKaabaKm,
  calculateQiblaBearingMagnetic,
  calculateQibla,
  getCardinalDirection,
  normalizeDegrees,
  shortestSignedAngle,
  type QiblaResult,
} from '@/lib/qibla';
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext-new";

// ─── Types ────────────────────────────────────────────────────
type CompassState =
  | 'idle'
  | 'activating'
  | 'active'
  | 'permission-required'
  | 'denied'
  | 'unsupported'
  | 'no-data';

type DeviceOrientationConstructorWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<string>;
};

function getFallbackLocationByTimezone(timezone: string) {
  return FALLBACK_LOCATIONS[timezone as keyof typeof FALLBACK_LOCATIONS] ||
    { name: 'Mecca', lat: 21.4225, lon: 39.8262 };
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
        parsed.latitude >= -90 && parsed.latitude <= 90 &&
        parsed.longitude >= -180 && parsed.longitude <= 180
      ) {
        return {
          coords: { latitude: parsed.latitude, longitude: parsed.longitude, accuracy: 1000 },
          name: typeof parsed.locationName === 'string' && parsed.locationName ? parsed.locationName : 'Ahmedabad, India',
        };
      }
    }
  } catch (error) {
    // Ignore stored location read errors and proceed to fallback
    console.warn('Qibla: failed to read stored location:', error);
  }

  const fallback = getFallbackLocationByTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  return {
    coords: { latitude: fallback.lat, longitude: fallback.lon, accuracy: 1000 },
    name: fallback.name,
  };
}

// ─── Constants ────────────────────────────────────────────────
const ALIGNMENT_THRESHOLD_DEG = 5;
const SENSOR_INACTIVE_TIMEOUT_MS = 2500;
const ABSOLUTE_EVENT_FALLBACK_MS = 800;

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

// ─── Rub el Hizb 8-Pointed Sacred Medallion ─────────────────────
const RubElHizbStar = ({ size = 48, isAligned = false }: { size?: number; isAligned?: boolean }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="transition-transform duration-700"
    style={{
      filter: isAligned ? 'drop-shadow(0 0 10px var(--accent-glow))' : 'none',
    }}
  >
    {/* Square 1 */}
    <rect
      x="8"
      y="8"
      width="32"
      height="32"
      rx="2"
      fill="var(--accent-soft)"
      stroke="var(--accent)"
      strokeWidth="1.5"
      opacity={isAligned ? "0.9" : "0.45"}
    />
    {/* Square 2 (Rotated 45deg) */}
    <rect
      x="8"
      y="8"
      width="32"
      height="32"
      rx="2"
      transform="rotate(45 24 24)"
      fill="var(--accent-soft)"
      stroke="var(--accent)"
      strokeWidth="1.5"
      opacity={isAligned ? "0.9" : "0.45"}
    />
    {/* Center Circle */}
    <circle
      cx="24"
      cy="24"
      r="13"
      fill="var(--bg-base)"
      stroke="var(--accent)"
      strokeWidth="1.2"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────
const QiblaCompassModern = () => {
  const { t, ui, isRTL } = useLanguage();

  // ── Location State ───────────────────────────────────────────
  const [bootLocation] = useState(loadInitialLocation);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationCoordinates | null>(bootLocation.coords);
  const [qiblaResult, setQiblaResult] = useState<QiblaResult | null>(
    () => calculateQibla(bootLocation.coords.latitude, bootLocation.coords.longitude)
  );
  const [cityName, setCityName] = useState<string>(bootLocation.name || 'Ahmedabad, India');

  // ── Travel Mode State ────────────────────────────────────────
  const [travelMode, setTravelMode] = useState<'road' | 'flight'>(() => {
    const dist = qiblaResult?.distanceKm ?? 3368;
    return dist < 4500 ? 'road' : 'flight';
  });

  // ── Compass & Sensor State ───────────────────────────────────
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [compassState, setCompassState] = useState<CompassState>('idle');
  const [sensorError, setSensorError] = useState<string | null>(null);
  const [isSensorInactive, setIsSensorInactive] = useState(false);
  const [showManualSlider, setShowManualSlider] = useState(false);
  const [compassSignal, setCompassSignal] = useState<number | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  // ── Refs ─────────────────────────────────────────────────────
  const locationRef = useRef<LocationCoordinates | null>(bootLocation.coords);
  const cityNameRef = useRef(cityName);
  const isMountedRef = useRef(true);
  const orientationListenerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const fallbackTimeoutRef = useRef<number | null>(null);
  const sensorInactiveTimerRef = useRef<number | null>(null);
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
        // Defensive cleanup guard
        console.warn('Error removing orientation listeners:', err);
      }
      orientationListenerRef.current = null;
    }

    if (fallbackTimeoutRef.current !== null) {
      window.clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }

    if (sensorInactiveTimerRef.current !== null) {
      window.clearTimeout(sensorInactiveTimerRef.current);
      sensorInactiveTimerRef.current = null;
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

  // ── Pure HTML5 Crash-Proof Sensor Engine ─────────────────────
  const attachSafeHtml5Sensors = useCallback(() => {
    stopCompassTracking();
    setSensorError(null);
    setCompassState('activating');
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

        const ev = event as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };
        let rawHeading: number | null = null;

        // 1. iOS Safari compass heading
        if (typeof ev.webkitCompassHeading === 'number' && !Number.isNaN(ev.webkitCompassHeading)) {
          rawHeading = normalizeDegrees(ev.webkitCompassHeading);
        }
        // 2. Android Chrome / WebView heading (alpha is counter-clockwise degrees from North)
        else if (ev.alpha !== null && typeof ev.alpha === 'number' && !Number.isNaN(ev.alpha)) {
          rawHeading = normalizeDegrees(360 - ev.alpha);
        }

        if (rawHeading === null) return;

        // Mark sensor as actively delivering data
        if (!hasReceivedSensorEventRef.current) {
          hasReceivedSensorEventRef.current = true;
          setIsSensorInactive(false);
          setCompassState('active');
          if (sensorInactiveTimerRef.current !== null) {
            window.clearTimeout(sensorInactiveTimerRef.current);
            sensorInactiveTimerRef.current = null;
          }
        }

        // Rolling 12-sample circular heading stability estimation
        recentHeadingsRef.current.push(rawHeading);
        if (recentHeadingsRef.current.length > 12) {
          recentHeadingsRef.current.shift();
        }

        // Throttle updates to at most once every ~40ms (~25fps) to prevent WebView renderer churn
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

        if (now - lastFrameTimeRef.current < 40) return;
        lastFrameTimeRef.current = now;

        // Apply shortest-path angular smoothing:
        // delta = ((target - current + 540) % 360) - 180; smoothed = (current + delta * 0.22 + 360) % 360
        const current = smoothedHeadingRef.current;
        let next: number;
        if (current === null) {
          next = rawHeading;
        } else {
          const delta = ((rawHeading - current + 540) % 360) - 180;
          next = (current + delta * 0.22 + 360) % 360;
        }

        smoothedHeadingRef.current = next;

        // Schedule state update via requestAnimationFrame for silky 60fps rendering
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
        // Defensive catch prevents renderer crashes
        console.warn('Safe orientation handler caught exception:', err);
      }
    };

    orientationListenerRef.current = onOrientationChange;

    try {
      // 1. Prefer 'deviceorientationabsolute' on Android Chrome / WebView
      window.addEventListener('deviceorientationabsolute', onOrientationChange, true);

      // 2. Fall back cleanly to 'deviceorientation' if absolute does not fire within 800ms
      fallbackTimeoutRef.current = window.setTimeout(() => {
        if (!absoluteEventFired && isMountedRef.current) {
          try {
            window.addEventListener('deviceorientation', onOrientationChange, true);
          } catch (listenErr) {
            // Defensive listener attachment catch
            console.warn('Fallback deviceorientation attachment failed:', listenErr);
          }
        }
      }, ABSOLUTE_EVENT_FALLBACK_MS);

      // 3. Fallback: if no sensor data arrives after 2.5 seconds, display manual slider
      sensorInactiveTimerRef.current = window.setTimeout(() => {
        if (!hasReceivedSensorEventRef.current && isMountedRef.current) {
          setIsSensorInactive(true);
          setShowManualSlider(true);
          setCompassState('active');
          if (smoothedHeadingRef.current === null) {
            smoothedHeadingRef.current = 0;
            setDeviceHeading(0);
          }
          setCompassSignal(null);
        }
      }, SENSOR_INACTIVE_TIMEOUT_MS);
    } catch (attachErr) {
      handleSensorError(attachErr);
    }
  }, [handleSensorError, stopCompassTracking]);

  // ── Enable Compass Click Handler ──────────────────────────────
  const toggleCompass = useCallback(async () => {
    // If compass is currently active, pause it cleanly
    if (compassState === 'active') {
      stopCompassTracking();
      setCompassState('idle');
      return;
    }

    try {
      setSensorError(null);
      setCompassState('activating');

      // Check for iOS permission request requirement safely
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        const ctor = window.DeviceOrientationEvent as DeviceOrientationConstructorWithPermission;
        if (typeof ctor.requestPermission === 'function') {
          try {
            const permission = await ctor.requestPermission();
            if (permission !== 'granted') {
              setCompassState('denied');
              setIsSensorInactive(true);
              setShowManualSlider(true);
              return;
            }
          } catch (permErr) {
            console.warn('DeviceOrientationEvent requestPermission handled:', permErr);
            setCompassState('denied');
            setIsSensorInactive(true);
            setShowManualSlider(true);
            return;
          }
        }
      }

      attachSafeHtml5Sensors();
    } catch (err) {
      handleSensorError(err);
    }
  }, [attachSafeHtml5Sensors, compassState, handleSensorError, stopCompassTracking]);

  // ── Refresh Location Data ─────────────────────────────────────
  const applyLocationData = useCallback((nextLocation: LocationCoordinates, nextCityName?: string) => {
    if (
      !nextLocation ||
      typeof nextLocation.latitude !== 'number' ||
      typeof nextLocation.longitude !== 'number' ||
      Number.isNaN(nextLocation.latitude) ||
      Number.isNaN(nextLocation.longitude)
    ) {
      return;
    }

    const resolvedCity = nextCityName ?? cityNameRef.current;
    locationRef.current = nextLocation;
    cityNameRef.current = resolvedCity;

    setLocation(nextLocation);
    setCityName(resolvedCity);

    try {
      const qiblaCalc = calculateQibla(nextLocation.latitude, nextLocation.longitude);
      setQiblaResult(qiblaCalc);
    } catch (e) {
      // Keep existing calculation on error
      console.warn('calculateQibla safe catch:', e);
    }

    // Refine magnetic bearing with geomagnetic declination
    calculateQiblaBearingMagnetic(nextLocation.latitude, nextLocation.longitude)
      .then((magneticBearing) => {
        if (!isMountedRef.current || typeof magneticBearing !== 'number' || Number.isNaN(magneticBearing)) return;
        setQiblaResult((prev) =>
          prev
            ? {
                ...prev,
                bearing: magneticBearing,
                cardinalDirection: getCardinalDirection(magneticBearing),
                formattedBearing: `${Math.round(magneticBearing)}°`,
              }
            : null
        );
      })
      .catch((e) => {
        // Safe declination fallback
        console.warn('Declination calculation fallback:', e);
      });
  }, []);

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
      // Safe fallback: try cached low-accuracy location
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
      applyLocationData(position, cityNameRef.current.replace(/\s*\(Offline\)\s*$/, ''));
    } else {
      setLocationError('Could not refresh location. Displaying saved city location.');
    }

    setIsRefreshingLocation(false);
  }, [applyLocationData]);

  // ── Lifecycle Cleanup ─────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    if (locationRef.current) {
      applyLocationData(locationRef.current, cityNameRef.current);
    }

    return () => {
      isMountedRef.current = false;
      stopCompassTracking();
    };
  }, [applyLocationData, stopCompassTracking]);

  // ── Calculations & Alignment ──────────────────────────────────
  const qiblaAngle = qiblaResult?.bearing ?? 284;
  const isLiveCompass = compassState === 'active' && deviceHeading !== null;

  // Shortest signed angle from current device heading to Qibla bearing
  // Positive delta = Qibla is to the Right; Negative delta = Qibla is to the Left
  const angleDelta = useMemo(() => {
    if (deviceHeading === null) return 0;
    return shortestSignedAngle(deviceHeading, qiblaAngle);
  }, [deviceHeading, qiblaAngle]);

  const isAligned = isLiveCompass && Math.abs(angleDelta) <= ALIGNMENT_THRESHOLD_DEG;

  // ── Gentle Haptic Feedback on Alignment ───────────────────────
  useEffect(() => {
    if (isAligned && !hapticFiredRef.current) {
      hapticFiredRef.current = true;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([70, 40, 70]);
        } catch {
          // Vibration failed or unsupported - safe silent fallback
        }
      }
    } else if (!isAligned) {
      hapticFiredRef.current = false;
    }
  }, [isAligned]);

  // ── Dial & Qibla Pointer Rotation Math ─────────────────────────
  // When deviceHeading changes, the whole 360° compass rose group rotates by -deviceHeading.
  // The golden Qibla needle & Kaaba badge is placed at `qiblaAngle` ON the rose group.
  // When deviceHeading == qiblaAngle, (-qiblaAngle + qiblaAngle) = 0° (points straight to top 12 o'clock pointer)!
  const roseRotation = deviceHeading !== null ? -deviceHeading : 0;
  const distanceKm = qiblaResult?.distanceKm ?? 3368;

  // Travel time calculations
  const drivingHours = Math.max(1, Math.round(distanceKm / 65));
  const flightHours = Math.max(1, Math.round(distanceKm / 800));

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
      <div className="relative z-10 px-5 pt-6 pb-2 text-center space-y-2">
        {/* Ornamental Divider */}
        <div className="flex items-center justify-center gap-2 opacity-50 mb-1">
          <div className="w-8 h-px bg-[var(--accent)]" />
          <div className="w-1.5 h-1.5 rotate-45 bg-[var(--accent)]" />
          <div className="w-8 h-px bg-[var(--accent)]" />
        </div>

        <p className="text-[var(--accent-text)] text-xs tracking-[0.25em] uppercase font-bold">
          {ui.qiblaDirection}
        </p>

        {/* Large Degree Display */}
        <div className="flex items-baseline justify-center gap-2 ltr-num" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
          <span
            className="text-5xl font-black text-[var(--text-primary)] tracking-tight font-mono ltr-num"
            dir="ltr"
            style={{ fontStyle: 'italic', direction: 'ltr', unicodeBidi: 'isolate' }}
          >
            {Math.round(qiblaAngle)}°
          </span>
          <span className="text-2xl font-bold text-[var(--accent-text)] ltr-num" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
            {qiblaResult?.cardinalDirection || 'W'}
          </span>
        </div>

        {/* Location Pill */}
        <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs font-medium shadow-sm">
          <MapPin className="h-3.5 w-3.5 text-[var(--accent-text)]" />
          <span>{cityName}</span>
        </div>

        {/* Live Alignment Status Badge */}
        <div className="pt-1 flex justify-center">
          {isAligned ? (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300"
              style={{
                background: 'var(--accent-soft)',
                border: '1.5px solid var(--accent)',
                color: 'var(--accent-text)',
                boxShadow: '0 0 18px var(--accent-glow)',
              }}
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>✓ {ui.alignedWithQibla}</span>
            </div>
          ) : isLiveCompass ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] text-xs font-semibold text-[var(--text-primary)] shadow-sm">
              <Navigation
                className="h-3.5 w-3.5 text-[var(--accent-text)] transition-transform duration-300"
                style={{
                  transform: `rotate(${angleDelta > 0 ? 90 : -90}deg)`,
                }}
              />
              <span>
                {ui.turnPrefix}{' '}
                <span className="text-[var(--accent-text)] font-bold">
                  {Math.abs(Math.round(angleDelta))}°
                </span>{' '}
                {angleDelta > 0 ? ui.right : ui.left}
              </span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] text-xs">
              <Compass className="h-3.5 w-3.5 text-[var(--accent-text)]" />
              <span>{ui.tapEnableCompass}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Multi-Ring Luxury Horology Compass Dial (280px × 280px) ── */}
      <div className="flex-1 flex items-center justify-center relative z-10 py-3">
        <div className="relative w-[280px] h-[280px] max-w-[85vw] max-h-[85vw] flex items-center justify-center">
          {/* Compass SVG Dial */}
          <svg
            width="280"
            height="280"
            viewBox="0 0 280 280"
            className="w-full h-full select-none"
            style={{
              filter: isAligned ? 'drop-shadow(0 0 14px var(--accent-glow))' : 'none',
              transition: 'filter 0.4s ease',
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
            {/* Outer metallic rim */}
            <circle
              cx="140"
              cy="140"
              r="137"
              fill="none"
              stroke="url(#bezelGrad)"
              strokeWidth="2"
            />
            {/* Inner bezel accent track */}
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
                transition: hasReceivedSensorEventRef.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)',
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

              {/* 72 Perimeter Tick Marks */}
              {DIAL_TICKS.map((tick) => (
                <line
                  key={tick.deg}
                  x1="140"
                  y1={tick.isMajor ? '14' : tick.isMedium ? '18' : '20'}
                  x2="140"
                  y2="26"
                  stroke={tick.isMajor ? 'var(--accent)' : tick.isMedium ? 'var(--text-secondary)' : 'var(--border)'}
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
                style={{ filter: 'drop-shadow(0 0 3px var(--accent-glow))' }}
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

              {/* ── GOLDEN QIBLA POINTER NEEDLE & KAABA CREST (Locked at qiblaAngle) ── */}
              <g transform={`rotate(${qiblaAngle} 140 140)`}>
                {/* Pointer Arrow Stem (faceted gold/accent) */}
                <polygon
                  points="140,28 136,80 140,82"
                  fill="var(--accent)"
                />
                <polygon
                  points="140,28 144,80 140,82"
                  fill="var(--accent-2)"
                />
                {/* Tail Counterweight */}
                <polygon
                  points="140,195 137,175 143,175"
                  fill="var(--accent)"
                  opacity="0.4"
                />

                {/* Kaaba Cube Crest Badge on Perimeter Ring */}
                <g transform="translate(133, 12)">
                  <KaabaVector size={14} />
                </g>

                {/* Arrowhead pointing to the perimeter */}
                <polygon
                  points="140,7 136,13 144,13"
                  fill="var(--accent)"
                  filter="drop-shadow(0 0 4px var(--accent-glow))"
                />
              </g>
            </g>

            {/* 3. CENTER MEDALLION (Recessed Jewel Hub & Rub el Hizb Star) */}
            {/* Medallion Hub Disc */}
            <circle
              cx="140"
              cy="140"
              r="34"
              fill="var(--bg-base)"
              stroke={isAligned ? 'var(--accent)' : 'var(--border)'}
              strokeWidth="2"
            />
            {/* Center Rub el Hizb Vector Emblem */}
            <g transform="translate(116, 116)">
              <RubElHizbStar size={48} isAligned={isAligned} />
            </g>
            {/* Center Kaaba Emblem */}
            <g transform="translate(128, 128)">
              <KaabaVector size={24} />
            </g>

            {/* 4. FIXED TOP LUBBER LINE / 12 O'CLOCK POINTER (Phone Direction) */}
            <polygon
              points="135,4 145,4 140,14"
              fill="var(--accent)"
              filter="drop-shadow(0 0 4px var(--accent-glow))"
            />
            <circle cx="140" cy="3" r="1.5" fill="var(--accent)" />
          </svg>
        </div>
      </div>

      {/* ── Real-Time Compass Signal Meter (Part 4.1) ───────────────── */}
      <div className="flex flex-col items-center justify-center gap-1.5 -mt-3 mb-2 px-4">
        <button
          type="button"
          onClick={() => setShowCalibrationModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold backdrop-blur-md transition-all active:scale-95 shadow-sm"
          style={{
            background: 'var(--surface-2)',
            borderColor:
              compassSignal === null
                ? 'var(--border)'
                : compassSignal >= 80
                ? 'var(--accent)'
                : compassSignal >= 50
                ? '#f59e0b'
                : '#ef4444',
          }}
          aria-label="Compass signal accuracy and calibration guide"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor:
                compassSignal === null
                  ? 'var(--text-secondary)'
                  : compassSignal >= 80
                  ? 'var(--accent)'
                  : compassSignal >= 50
                  ? '#f59e0b'
                  : '#ef4444',
              boxShadow:
                compassSignal !== null && compassSignal >= 80
                  ? '0 0 6px var(--accent)'
                  : 'none',
            }}
          />
          <span className="text-[var(--text-primary)] font-bold">
            {compassSignal !== null ? ui.compassSignal.replace('{n}', String(compassSignal)) : ui.compassSensorOffline}
          </span>
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center text-[var(--accent)] font-bold text-[11px] border border-[var(--border)]"
            style={{ background: 'var(--surface)' }}
          >
            ⓘ
          </span>
        </button>

        {compassSignal !== null && compassSignal < 80 && (
          <p
            className="text-[11px] text-center font-medium leading-tight px-3"
            style={{ color: compassSignal >= 50 ? '#f59e0b' : '#ef4444' }}
          >
            {compassSignal >= 50
              ? 'Move away from metal/cases & tilt in a figure-8'
              : 'Low sensor accuracy. Tap ⓘ for figure-8 calibration.'}
          </p>
        )}
      </div>

      {/* ── Status & Sensor Controls ──────────────────────────────── */}
      <div className="relative z-10 px-5 pb-6 space-y-3.5">
        {/* Sensor Inactive / Fallback Notice */}
        {isSensorInactive && (
          <div className="rounded-2xl p-3 bg-[var(--surface-2)] border border-[var(--border)] text-center space-y-2">
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              Magnetometer sensor inactive — use manual heading slider or calibrate phone in a figure-8
            </p>
            {/* Manual Heading Slider */}
            <div className="flex items-center gap-3 px-2">
              <span className="text-xs font-bold text-[var(--accent-text)] min-w-[36px]">
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
                className="px-2 py-1 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] text-[10px] font-bold border border-[var(--accent)] active:scale-95"
              >
                Snap Qibla
              </button>
            </div>
          </div>
        )}

        {/* ── DISTANCE TO BAITULLAH CARD (Zero Raw Emojis) ──────────── */}
        <Card className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] shadow-sm">
          <CardContent className="p-4 space-y-4">
            {/* Header: Title + Travel Mode Segmented Control */}
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-[11px] font-bold text-[var(--accent-text)] uppercase tracking-wider flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5" />
                  {ui.distanceToBaitullah}
                </p>
                <div className="flex items-baseline gap-1.5 ltr-num" dir="ltr" style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>
                  <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight ltr-num" dir="ltr">
                    {Math.round(distanceKm).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-secondary)] ltr-num" dir="ltr">km</span>
                </div>
              </div>

              {/* Travel Mode Toggle Button */}
              <div className="flex items-center p-0.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setTravelMode('road')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                    travelMode === 'road'
                      ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Car className="w-3 h-3" />
                  <span>{ui.road}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMode('flight')}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all",
                    travelMode === 'flight'
                      ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Plane className="w-3 h-3" />
                  <span>{ui.flight}</span>
                </button>
              </div>
            </div>

            {/* Travel Path Visualization */}
            <div className="relative pt-2 pb-1">
              <div className="flex items-center w-full">
                {/* Left Node: YOU */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shadow-sm">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1.5 truncate max-w-[70px]">
                    {ui.you}
                  </span>
                </div>

                {/* Connective Dashed Route Line */}
                <div className="flex-1 relative flex items-center justify-center mx-2">
                  <div className="w-full border-t-2 border-dashed border-[var(--border)]" />
                  {/* Floating Travel Badge */}
                  <div className="absolute px-2.5 py-1 rounded-full border border-[var(--border)] text-[11px] font-bold text-[var(--accent-text)] flex items-center gap-1.5 transform -translate-y-1/2 bg-[var(--surface-2)] shadow-sm">
                    {travelMode === 'road' ? (
                      <Car className="w-3.5 h-3.5" />
                    ) : (
                      <Plane className="w-3.5 h-3.5" />
                    )}
                    <span>{Math.round(distanceKm).toLocaleString()} km</span>
                  </div>
                </div>

                {/* Right Node: KAABA */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)] shadow-sm">
                    <KaabaVector size={18} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-1.5">
                    {ui.makkah}
                  </span>
                </div>
              </div>

              {/* Journey Estimate Banner */}
              <div className="mt-4 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-1">
                <p className="text-[11px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
                  {ui.theJourneyEstimate}
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {travelMode === 'road'
                    ? ui.roadEstimate(drivingHours)
                    : ui.flightEstimate(flightHours)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── 2-COLUMN LIVE TELEMETRY CARD ──────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Left Column: CURRENT HEADING */}
          <div className="rounded-2xl p-3.5 border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
            <p className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
              {ui.currentHeading}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[var(--text-primary)]">
                {isLiveCompass && deviceHeading !== null
                  ? `${Math.round(deviceHeading)}°`
                  : '--°'}
              </span>
              <span className="text-xs font-semibold text-[var(--accent-text)]">
                {isLiveCompass && deviceHeading !== null
                  ? getCardinalDirection(deviceHeading)
                  : `(${ui.standby})`}
              </span>
            </div>
            <p className="text-[var(--text-secondary)]/70 text-[10px]">
              {isLiveCompass ? ui.phoneAzimuth : ui.compassPaused}
            </p>
          </div>

          {/* Right Column: QIBLA OFFSET */}
          <div className="rounded-2xl p-3.5 border border-[var(--border)] bg-[var(--surface)] shadow-sm space-y-1">
            <p className="text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
              {ui.qiblaOffset}
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-[var(--text-primary)]">
                {isLiveCompass && deviceHeading !== null
                  ? isAligned
                    ? '0°'
                    : `${Math.abs(Math.round(angleDelta))}°`
                  : '--°'}
              </span>
              <span className="text-xs font-semibold text-[var(--accent-text)]">
                {isLiveCompass && deviceHeading !== null
                  ? isAligned
                    ? ui.locked
                    : angleDelta > 0
                    ? ui.right
                    : ui.left
                  : ui.sensorIdle}
              </span>
            </div>
            <p className="text-[var(--text-secondary)]/70 text-[10px]">
              {isLiveCompass
                ? isAligned
                  ? `✓ ${ui.perfectlyAligned}`
                  : ui.turnDeviceToAlign
                : ui.standby}
            </p>
          </div>
        </div>

        {/* ── PRIMARY ACTION BUTTON (ENABLE / PAUSE COMPASS) ───────── */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              try {
                navigator.vibrate(40);
              } catch {
                // Ignore vibration failure
              }
            }
            void toggleCompass();
          }}
          disabled={compassState === 'activating'}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
          style={{
            background:
              compassState === 'active'
                ? 'var(--surface-2)'
                : 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color:
              compassState === 'active'
                ? 'var(--text-primary)'
                : 'var(--on-accent)',
            border: `1px solid ${compassState === 'active' ? 'var(--border)' : 'var(--accent)'}`,
            boxShadow:
              compassState === 'active'
                ? 'none'
                : '0 4px 18px var(--accent-glow)',
          }}
        >
          {compassState === 'activating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{ui.startingCompass}</span>
            </>
          ) : compassState === 'active' ? (
            <>
              <Compass className="h-4 w-4" />
              <span>{ui.pauseLiveCompass}</span>
            </>
          ) : (
            <>
              <Compass className="h-4 w-4" />
              <span>{ui.enableLiveCompass}</span>
            </>
          )}
        </button>

        {/* Error notification if any */}
        {sensorError && (
          <p className="text-center text-xs text-red-500/80 font-medium">
            {sensorError}
          </p>
        )}
        {locationError && (
          <p className="text-center text-xs text-[var(--text-secondary)]">
            {locationError}
          </p>
        )}
      </div>

      {/* ── Calibration Guide Modal (Part 4.1) ── */}
      {showCalibrationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCalibrationModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-5 border space-y-4 shadow-2xl"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-[var(--accent)]" />
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Compass Signal & Calibration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCalibrationModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center border text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-[var(--text-secondary)]">
              <div className="p-3 rounded-2xl border space-y-1.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                  <span className="font-bold text-[var(--text-primary)]">≥ 80% — High Accuracy</span>
                </div>
                <p>Sensor is properly calibrated with minimal electromagnetic interference.</p>
              </div>

              <div className="p-3 rounded-2xl border space-y-1.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="font-bold text-[var(--text-primary)]">50%–79% — Moderate Interference</span>
                </div>
                <p>Metal tables, phone cases, or electronic devices nearby are warping magnetic field lines.</p>
              </div>

              <div className="p-3 rounded-2xl border space-y-1.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="font-bold text-[var(--text-primary)]">&lt; 50% — Recalibration Required</span>
                </div>
                <p>To calibrate: hold your device flat in your hand and move it in a slow <strong>figure-8 motion (∞)</strong> for 5–10 seconds.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCalibrationModal(false)}
              className="w-full py-2.5 rounded-xl font-bold text-xs"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QiblaCompassModern;
