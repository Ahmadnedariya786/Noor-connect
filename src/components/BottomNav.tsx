import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, Compass, LayoutGrid, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { memo, useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";

const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();
  const { animationEnabled } = useSettings();
  const location = useLocation();

  const [noBlur, setNoBlur] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    const tier = document.documentElement.dataset.animationTier;
    return tier === 'minimal' || tier === 'low' || document.documentElement.classList.contains('reduce-blur');
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const tier = (e as CustomEvent<{ shouldDisableBackdropBlur: boolean }>).detail;
      setNoBlur(!!tier.shouldDisableBackdropBlur);
    };
    window.addEventListener('animation-tier-changed', handler);
    return () => window.removeEventListener('animation-tier-changed', handler);
  }, []);

  // Hide global nav on routes that have their own bottom navigation
  if (location.pathname.startsWith('/noor-cycle') || /^\/quran\/.+/.test(location.pathname)) {
    return null;
  }

  const navItems = [
    { title: (t('qibla') || 'Qibla'), path: '/qibla', icon: Compass },
    { title: (t('quran') || 'Quran'), path: '/quran', icon: BookOpen },
    { title: (t('home') || 'Home'), path: '/', icon: Home, exact: true },
    { title: (t('services') || 'Services'), path: '/services', icon: LayoutGrid },
    { title: (t('settings') || 'Settings'), path: '/profile', icon: SettingsIcon },
  ];

  return (
    <nav
      data-bottom-nav="true"
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center safe-bottom print:hidden"
      style={{
        paddingBottom: 'calc(var(--safe-bottom) + 10px)',
        paddingLeft: '16px',
        paddingRight: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="w-full max-w-sm pointer-events-auto flex flex-row items-center justify-between h-[64px] px-2 rounded-[26px]"
        style={{
          borderRadius: '26px',
          background: (!animationEnabled || noBlur)
            ? 'var(--bg-elev)'
            : 'color-mix(in srgb, var(--bg-elev) 90%, transparent)',
          backdropFilter: (!animationEnabled || noBlur) ? 'none' : 'blur(16px)',
          WebkitBackdropFilter: (!animationEnabled || noBlur) ? 'none' : 'blur(16px)',
          border: '1px solid var(--border)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 var(--card-sheen)',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            replace
            end={item.exact}
            className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0 min-h-[48px]"
            style={{ touchAction: 'manipulation' }}
          >
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center justify-center gap-[2px] w-full h-full relative ${animationEnabled ? 'active:scale-[0.88]' : ''}`}
                style={{ transition: animationEnabled ? 'transform 0.1s ease' : 'none' }}
              >
                {/* Contoured Top Accent Laser Arch Indicator */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      width: '26px',
                      height: '3px',
                      borderRadius: '0 0 999px 999px',
                      background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
                      boxShadow: '0 2px 10px var(--accent-glow)',
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}

                {/* Icon Container with Soft Pill Highlight on Active */}
                <div
                  className="relative flex items-center justify-center w-10 h-7 rounded-[14px] transition-all duration-200"
                  style={{
                    background: isActive ? 'linear-gradient(145deg, var(--accent), var(--accent-2))' : 'transparent',
                    boxShadow: isActive ? '0 4px 12px var(--accent-glow)' : 'none',
                  }}
                >
                  <item.icon
                    className="w-[20px] h-[20px] relative z-10"
                    style={{
                      color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                      opacity: isActive ? 1 : 0.75,
                      strokeWidth: isActive ? 2.4 : 1.8,
                      transition: 'color 0.2s, stroke-width 0.2s',
                    }}
                  />
                </div>

                {/* Tab Label */}
                <span
                  className="text-[11px] leading-none"
                  style={{
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.75,
                    transition: 'color 0.2s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.title}
                </span>

                {/* Glowing Dot Indicator Below Active Tab Label */}
                <div
                  aria-hidden="true"
                  style={{
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    boxShadow: '0 0 6px var(--accent-glow)',
                    opacity: isActive ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    marginTop: '1px',
                  }}
                />
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;
