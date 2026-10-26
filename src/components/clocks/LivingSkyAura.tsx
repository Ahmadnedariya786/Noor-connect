// Noor Connect — Living Sky Aura Component
// Mihrab-inspired 60fps pure SVG/CSS celestial backdrop reflecting the active prayer phase
// (Dawn / Morning Star, Solar Zenith, Maghrib Twilight, or Midnight Starfield & Crescent)

import React, { useMemo } from 'react';

interface LivingSkyAuraProps {
  nextPrayerName?: string;
  currentHour?: number;
}

type SkyPhase = 'dawn' | 'zenith' | 'twilight' | 'night';

export const LivingSkyAura: React.FC<LivingSkyAuraProps> = ({
  nextPrayerName = '',
  currentHour = new Date().getHours(),
}) => {
  const phase = useMemo<SkyPhase>(() => {
    const p = nextPrayerName.toLowerCase();
    if (p.includes('sunrise') || p.includes('shuruq')) {
      return 'dawn';
    }
    if (p.includes('dhuhr') || p.includes('asr') || p.includes('zuhr')) {
      return 'zenith';
    }
    if (p.includes('maghrib') || p.includes('sunset')) {
      return 'twilight';
    }
    if (p.includes('isha') || p.includes('fajr')) {
      return 'night';
    }

    // Fallback by current local hour
    if (currentHour >= 4 && currentHour < 7) return 'dawn';
    if (currentHour >= 7 && currentHour < 17) return 'zenith';
    if (currentHour >= 17 && currentHour < 19) return 'twilight';
    return 'night';
  }, [nextPrayerName, currentHour]);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden rounded-[26px] transition-all duration-1000"
      style={{
        opacity: 0.28,
        zIndex: 0,
      }}
      aria-hidden="true"
    >
      {/* ── DAWN HORIZON + MORNING STAR (Fajr -> Sunrise) ── */}
      {phase === 'dawn' && (
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="dawnGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FB923C" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#F43F5E" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.0" />
            </linearGradient>
            <radialGradient id="morningStarGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FDE047" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#FDE047" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="240" fill="url(#dawnGrad)" />
          {/* Morning Star (Venus) */}
          <circle cx="320" cy="50" r="14" fill="url(#morningStarGlow)" />
          <polygon
            points="320,38 323,47 332,50 323,53 320,62 317,53 308,50 317,47"
            fill="#FFFFFF"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* ── SOLAR ZENITH AURA (Sunrise -> Asr) ── */}
      {phase === 'zenith' && (
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="zenithGlow" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.75" />
              <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </radialGradient>
          </defs>
          <rect width="400" height="240" fill="url(#zenithGlow)" />
          {/* Subtle radiating solar corona rings */}
          <circle cx="200" cy="0" r="85" fill="none" stroke="#FDE68A" strokeWidth="1.5" strokeOpacity="0.35" />
          <circle cx="200" cy="0" r="130" fill="none" stroke="#FBBF24" strokeWidth="1" strokeOpacity="0.2" />
        </svg>
      )}

      {/* ── MAGHRIB TWILIGHT HORIZON (Maghrib) ── */}
      {phase === 'twilight' && (
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="twilightGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.9" />
              <stop offset="35%" stopColor="#9333EA" stopOpacity="0.5" />
              <stop offset="80%" stopColor="#1E1B4B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0F172A" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill="url(#twilightGrad)" />
          {/* Soft sinking solar arc */}
          <ellipse cx="200" cy="240" rx="140" ry="45" fill="#FED7AA" fillOpacity="0.45" />
        </svg>
      )}

      {/* ── CALM NIGHT SKY + STARFIELD & CRESCENT (Isha -> Fajr) ── */}
      {phase === 'night' && (
        <svg
          className="w-full h-full object-cover"
          viewBox="0 0 400 240"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="nightNebula" cx="75%" cy="30%" r="60%">
              <stop offset="0%" stopColor="#4338CA" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#1E1B4B" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.0" />
            </radialGradient>
          </defs>
          <rect width="400" height="240" fill="url(#nightNebula)" />

          {/* Twinkling Stars */}
          <circle cx="65" cy="45" r="1.5" fill="#FFFFFF" opacity="0.8" className="animate-pulse" />
          <circle cx="120" cy="70" r="1" fill="#E0E7FF" opacity="0.6" />
          <circle cx="175" cy="35" r="2" fill="#FFFFFF" opacity="0.9" className="animate-ping" style={{ animationDuration: '4s' }} />
          <circle cx="230" cy="85" r="1.2" fill="#C7D2FE" opacity="0.7" />
          <circle cx="340" cy="65" r="1.5" fill="#FFFFFF" opacity="0.85" />
          <circle cx="295" cy="110" r="1" fill="#E0E7FF" opacity="0.5" />

          {/* Crescent Moon */}
          <path
            d="M 315 35 A 12 12 0 1 0 327 56 A 15 15 0 0 1 315 35 Z"
            fill="#FEF08A"
            fillOpacity="0.85"
            style={{ filter: 'drop-shadow(0 0 6px rgba(254, 240, 138, 0.6))' }}
          />
        </svg>
      )}
    </div>
  );
};
