import React from 'react';
import noorLogo from '@/assets/noor-logo.png';

export interface NoorLogoCrestProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

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
            background: 'radial-gradient(circle, var(--accent-glow, rgba(245,185,66,0.3)) 0%, transparent 70%)',
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
          }}
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
          <rect x="22" y="22" width="56" height="56" rx="6" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
          <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
        </svg>
        {/* Elevated Squircle Jewel */}
        <div
          className="relative z-10 w-[48px] h-[48px] rounded-[14px] overflow-hidden flex items-center justify-center bg-[#150D2E]"
          style={{
            border: '1.5px solid rgba(245, 195, 90, 0.65)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.4)',
          }}
        >
          <img src={noorLogo} alt="Noor Connect Logo" className="w-[40px] h-[40px] object-contain relative z-10 rounded-lg select-none" />
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
            background: 'radial-gradient(circle, var(--accent-glow, rgba(245,185,66,0.3)) 0%, transparent 70%)',
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
          }}
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
          <rect x="22" y="22" width="56" height="56" rx="6" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
          <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
        </svg>
        <div
          className="relative z-10 w-[64px] h-[64px] rounded-[18px] overflow-hidden flex items-center justify-center bg-[#150D2E]"
          style={{
            border: '1.5px solid rgba(245, 195, 90, 0.65)',
            boxShadow: '0 12px 24px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.4)',
          }}
        >
          <img src={noorLogo} alt="Noor Connect Logo" className="w-[54px] h-[54px] object-contain relative z-10 rounded-xl select-none" />
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
          background: 'radial-gradient(circle, var(--accent-glow, rgba(245,185,66,0.28)) 0%, transparent 70%)',
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
        }}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="46" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" strokeDasharray="3 3" fill="none" />
        <rect x="22" y="22" width="56" height="56" rx="6" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
        <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" stroke="rgba(245, 195, 90, 0.45)" strokeWidth="1.2" fill="none" />
      </svg>

      {/* Layer 3: Elevated Squircle Jewel Emblem */}
      <div
        className="relative z-10 w-[96px] h-[96px] rounded-[24px] overflow-hidden flex items-center justify-center bg-[#150D2E]"
        style={{
          border: '1.5px solid rgba(245, 195, 90, 0.65)',
          boxShadow: '0 16px 36px rgba(0,0,0,0.65), inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.5)',
        }}
      >
        <img
          src={noorLogo}
          alt="Noor Connect Logo"
          className="w-[84px] h-[84px] object-contain relative z-10 select-none"
        />
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
