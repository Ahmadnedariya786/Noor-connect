import { NavLink } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, Compass, LayoutGrid, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";

const AMBER = '#C9860A';
const AMBER_DARK = '#E8A020';

const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();
  const { animationEnabled, effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  const activeColor = isDark ? AMBER_DARK : AMBER;

  const navItems = [
    { title: (t('qibla') || 'Qibla'), path: '/qibla', icon: Compass },
    { title: (t('quran') || 'Quran'), path: '/quran', icon: BookOpen },
    { title: 'Home', path: '/', icon: Home, exact: true },
    { title: 'Services', path: '/services', icon: LayoutGrid },
    { title: 'Settings', path: '/profile', icon: SettingsIcon },
  ];

  return (
    <nav
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      <div
        className="w-full max-w-sm pointer-events-auto flex flex-row items-center justify-between h-[62px] px-3 rounded-[36px]"
        style={{
          background: isDark ? 'rgba(28,32,48,0.95)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.05)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)'
            : '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.exact}
            className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
          >
            {({ isActive }) => (
              <m.div
                className="flex flex-col items-center justify-center gap-[3px]"
                whileTap={animationEnabled ? { scale: 0.86 } : undefined}
              >
                <div className="relative flex items-center justify-center w-10 h-8">
                  <AnimatePresence>
                    {isActive && (
                      <m.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 rounded-xl"
                        style={{ background: `${activeColor}18` }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                  <item.icon
                    className="w-[22px] h-[22px]"
                    style={{
                      color: isActive ? activeColor : (isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)'),
                      strokeWidth: isActive ? 2.5 : 1.8,
                      transition: 'color 0.2s, stroke-width 0.2s',
                    }}
                  />
                </div>
                <span
                  className="text-[10px] font-semibold leading-none"
                  style={{
                    color: isActive ? activeColor : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.38)'),
                    transition: 'color 0.2s',
                    letterSpacing: '0.01em',
                  }}
                >
                  {item.title}
                </span>
              </m.div>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
});

export default BottomNav;