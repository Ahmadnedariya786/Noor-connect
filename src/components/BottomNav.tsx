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
  if (location.pathname.startsWith('/noor-cycle')) {
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
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center safe-bottom"
      style={{
        paddingBottom: 'calc(var(--safe-bottom) + 10px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div
        className="w-full max-w-sm pointer-events-auto flex flex-row items-center justify-between h-[62px] px-3 rounded-[36px]"
        style={{
          background: (!animationEnabled || noBlur)
            ? 'var(--bg-elev)'
            : 'color-mix(in srgb, var(--bg-elev) 80%, transparent)',
          backdropFilter: (!animationEnabled || noBlur) ? 'none' : 'blur(16px) saturate(1.2)',
          WebkitBackdropFilter: (!animationEnabled || noBlur) ? 'none' : 'blur(16px) saturate(1.2)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
            style={{ touchAction: 'manipulation' }}
          >
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center justify-center gap-[3px] ${animationEnabled ? 'active:scale-[0.86]' : ''}`}
                style={{ transition: animationEnabled ? 'transform 0.1s ease' : 'none' }}
              >
                <div className="relative flex items-center justify-center w-10 h-8">
                  <div
                    className="absolute inset-0 rounded-xl transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                      boxShadow: '0 2px 10px var(--accent-glow)',
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <item.icon
                    className="w-[22px] h-[22px] relative z-10"
                    style={{
                      color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                      opacity: isActive ? 1 : 0.75,
                      strokeWidth: isActive ? 2.5 : 1.8,
                      transition: 'color 0.2s, stroke-width 0.2s',
                    }}
                  />
                </div>
                <span
                  className="text-xs leading-none"
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
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;
