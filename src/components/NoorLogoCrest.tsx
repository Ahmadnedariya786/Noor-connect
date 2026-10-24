import React from 'react';

export interface NoorLogoCrestProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

export const MosqueEmblemSVG: React.FC<{ size?: number; className?: string }> = ({ size = 60, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`select-none pointer-events-none ${className}`}
  >
    {/* Central Grand Dome */}
    <path d="M 32 13 C 22.5 19.5 19.5 28 19.5 38.5 L 44.5 38.5 C 44.5 28 41.5 19.5 32 13 Z" fill="var(--accent-text)" opacity="0.95" />
    {/* Crescent & Star Finial */}
    <path d="M 32 7.2 C 30.6 7.2 29.5 8.2 29.5 9.6 C 29.5 11 30.7 12.1 32.3 12.1 C 31.9 11.5 31.7 10.9 31.9 10.2 C 32.2 9.2 33 8.5 33.9 8.4 C 33.4 7.7 32.7 7.2 32 7.2 Z" fill="var(--accent)" />
    <polygon points="34.2,6.5 34.6,7.4 35.5,7.5 34.8,8.1 35,9 34.2,8.5 33.4,9 33.6,8.1 32.9,7.5 33.8,7.4" fill="var(--accent-2, var(--accent-text))" />
    {/* Dome Windows */}
    <path d="M 27 38.5 L 27 32 C 27 29.8 28.5 28.2 30.2 28.2 C 31.9 28.2 33.4 29.8 33.4 32 L 33.4 38.5 Z" fill="var(--surface-2)" />
    <path d="M 34.5 38.5 L 34.5 33 C 34.5 31.5 35.5 30.2 37 30.2 C 38.5 30.2 39.5 31.5 39.5 33 L 39.5 38.5 Z" fill="var(--surface-2)" opacity="0.8" />
    <path d="M 20.8 38.5 L 20.8 33 C 20.8 31.5 21.8 30.2 23.3 30.2 C 24.8 30.2 25.8 31.5 25.8 33 L 25.8 38.5 Z" fill="var(--surface-2)" opacity="0.8" />
    {/* Left Minaret */}
    <rect x="12.5" y="23" width="4.5" height="26" rx="1" fill="var(--accent-text)" opacity="0.85" />
    <path d="M 11.5 23 L 18 23 L 14.75 16.5 Z" fill="var(--accent)" />
    <circle cx="14.75" cy="15.2" r="0.9" fill="var(--accent-2, var(--accent-text))" />
    <rect x="11" y="28" width="7.5" height="1.8" rx="0.5" fill="var(--accent)" />
    {/* Right Minaret */}
    <rect x="47" y="23" width="4.5" height="26" rx="1" fill="var(--accent-text)" opacity="0.85" />
    <path d="M 46 23 L 52.5 23 L 49.25 16.5 Z" fill="var(--accent)" />
    <circle cx="49.25" cy="15.2" r="0.9" fill="var(--accent-2, var(--accent-text))" />
    <rect x="45.5" y="28" width="7.5" height="1.8" rx="0.5" fill="var(--accent)" />
    {/* Main Building Base Wall */}
    <rect x="14.5" y="38.5" width="35" height="12.5" rx="1" fill="var(--accent)" opacity="0.25" />
    {/* Grand Central Arched Portal */}
    <path d="M 27.5 51 L 27.5 42 C 27.5 39.5 29.5 37.5 32 37.5 C 34.5 37.5 36.5 39.5 36.5 42 L 36.5 51 Z" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1" />
    <path d="M 29.2 51 L 29.2 43.5 C 29.2 41.8 30.5 40.2 32 40.2 C 33.5 40.2 34.8 41.8 34.8 43.5 L 34.8 51 Z" fill="var(--accent-text)" opacity="0.55" />
    {/* Base Plinth */}
    <rect x="9.5" y="51" width="45" height="2.8" rx="1" fill="var(--accent)" />
  </svg>
);

export const NoorLogoCrest: React.FC<NoorLogoCrestProps> = ({
  size = 'lg',
  animated = true,
  className = '',
}) => {
  if (size === 'sm') {
    return (
      <div className={`relative flex items-center justify-center w-[72px] h-[72px] ${className}`}>
        {/* Subtle ambient halo */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        {/* Subtle Rub el Hizb filigree ring */}
        <svg
          width="64"
          height="64"
          viewBox="0 0 100 100"
          className="absolute pointer-events-none select-none"
          style={{
            animation: animated ? 'spinSlow 28s linear infinite' : undefined,
            filter: 'drop-shadow(0 0 8px var(--accent-glow))',
          }}
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.65" />
          <rect x="22" y="22" width="56" height="56" rx="6" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
          <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
        </svg>
        {/* Elevated Squircle Jewel */}
        <div
          className="relative z-10 w-[48px] h-[48px] rounded-[14px] overflow-hidden flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, var(--surface-2) 0%, var(--surface) 55%, var(--bg-base) 100%)',
            border: '1.5px solid var(--accent)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5), inset 0 1px 0 var(--card-sheen)',
          }}
        >
          <MosqueEmblemSVG size={32} />
        </div>
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className={`relative flex items-center justify-center w-[96px] h-[96px] ${className}`}>
        <div
          className="absolute inset-0 rounded-full pointer-events-none opacity-50"
          style={{
            background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <svg
          width="86"
          height="86"
          viewBox="0 0 100 100"
          className="absolute pointer-events-none select-none"
          style={{
            animation: animated ? 'spinSlow 28s linear infinite' : undefined,
            filter: 'drop-shadow(0 0 10px var(--accent-glow))',
          }}
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.65" />
          <rect x="22" y="22" width="56" height="56" rx="6" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
          <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
        </svg>
        <div
          className="relative z-10 w-[64px] h-[64px] rounded-[18px] overflow-hidden flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, var(--surface-2) 0%, var(--surface) 55%, var(--bg-base) 100%)',
            border: '1.5px solid var(--accent)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.55), inset 0 1px 0 var(--card-sheen)',
          }}
        >
          <MosqueEmblemSVG size={44} />
        </div>
      </div>
    );
  }

  // Default: size === 'lg'
  return (
    <div className={`relative flex items-center justify-center w-[170px] h-[170px] ${className}`}>
      {/* Layer 1: Ambient Radial Halo */}
      <div
        className="w-[170px] h-[170px] absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 70%)',
          animation: animated ? 'pulseHalo 3s ease-in-out infinite' : undefined,
        }}
        aria-hidden="true"
      />

      {/* Layer 2: Slow-Rotating Geometric Filigree Ring */}
      <svg
        width="142"
        height="142"
        viewBox="0 0 100 100"
        className="absolute pointer-events-none select-none"
        style={{
          animation: animated ? 'spinSlow 28s linear infinite' : undefined,
          filter: 'drop-shadow(0 0 12px var(--accent-glow))',
        }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="46" stroke="var(--accent)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" opacity="0.65" />
        <rect x="22" y="22" width="56" height="56" rx="6" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
        <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="var(--accent-text)" strokeWidth="1.2" fill="none" opacity="0.65" />
      </svg>

      {/* Layer 3: Elevated Squircle Jewel Emblem */}
      <div
        className="relative z-10 w-[88px] h-[88px] rounded-[20px] overflow-hidden flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, var(--surface-2) 0%, var(--surface) 55%, var(--bg-base) 100%)',
          border: '1.5px solid var(--accent)',
          boxShadow: '0 0 28px var(--accent-glow), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        <MosqueEmblemSVG size={56} />
        {/* Subtle Diagonal Glass Shimmer Sweep */}
        <div
          className="absolute inset-0 pointer-events-none z-20"
          style={{
            background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
            animation: animated ? 'shimmerGlass 2.4s ease-in-out infinite' : undefined,
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default NoorLogoCrest;
