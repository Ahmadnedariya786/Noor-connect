import { NavLink } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, Compass, LayoutGrid } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";

// Crescent moon icon for center HOME button
const CrescentIcon = memo(({ isActive, isDark }: { isActive: boolean; isDark: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
      fill={isActive ? "white" : (isDark ? "white" : "#047857")}
      stroke={isActive ? "white" : (isDark ? "white" : "#047857")}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();
  const { animationEnabled, effectiveTheme } = useSettings();
  const isDark = effectiveTheme === 'dark';

  const sideNavItems = [
    { title: t('qibla') || 'Qibla', path: "/qibla", icon: Compass },
    { title: t('quran') || 'Quran', path: "/quran", icon: BookOpen },
  ];

  const rightNavItems = [
    { title: t('services') || 'Services', path: "/services", icon: LayoutGrid },
    { title: t('settings') || 'Settings', path: "/profile", icon: SettingsIcon },
  ];

  return (
    <nav
      className="w-full fixed bottom-0 left-0 right-0 z-[100] pointer-events-none flex justify-center"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
        paddingLeft: '16px',
        paddingRight: '16px',
      }}
    >
      {/* Floating glass pill nav */}
      <div className="w-full max-w-sm pointer-events-auto relative flex items-end justify-center">
        {/* Glass pill background */}
        <div
          className="w-full flex flex-row items-center justify-between h-[60px] px-2 rounded-[36px] relative transition-colors duration-300"
          style={{
            background: isDark ? 'rgba(10, 10, 10, 0.85)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            boxShadow: isDark 
              ? '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(16,185,129,0.08)'
              : '0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(16,185,129,0.04)',
          }}
        >
          {/* Left items: Qibla + Quran */}
          {sideNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={false}
              className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0 group"
            >
              {({ isActive }) => (
                <m.div
                  className="flex flex-col items-center justify-center gap-1"
                  whileTap={animationEnabled ? { scale: 0.88 } : undefined}
                >
                  <div className="relative flex items-center justify-center w-10 h-8">
                    <AnimatePresence>
                      {isActive && (
                        <m.div
                          layoutId="nav-active-bg"
                          className="absolute inset-0 rounded-xl"
                          style={{ background: 'rgba(16,185,129,0.15)' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                    <item.icon
                      className="w-5 h-5 transition-all duration-300"
                      style={{
                        color: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)'),
                        strokeWidth: isActive ? 2.5 : 1.8,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider transition-all duration-300"
                    style={{ color: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)') }}
                  >
                    {item.title}
                  </span>
                </m.div>
              )}
            </NavLink>
          ))}

          {/* Center HOME button spacer */}
          <div className="w-16 flex-shrink-0" />

          {/* Right items: Services + Settings */}
          {rightNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={false}
              className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0 group"
            >
              {({ isActive }) => (
                <m.div
                  className="flex flex-col items-center justify-center gap-1"
                  whileTap={animationEnabled ? { scale: 0.88 } : undefined}
                >
                  <div className="relative flex items-center justify-center w-10 h-8">
                    <AnimatePresence>
                      {isActive && (
                        <m.div
                          layoutId="nav-active-bg-right"
                          className="absolute inset-0 rounded-xl"
                          style={{ background: 'rgba(16,185,129,0.15)' }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        />
                      )}
                    </AnimatePresence>
                    <item.icon
                      className="w-5 h-5 transition-all duration-300"
                      style={{
                        color: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)'),
                        strokeWidth: isActive ? 2.5 : 1.8,
                      }}
                    />
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider transition-all duration-300"
                    style={{ color: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.4)') }}
                  >
                    {item.title}
                  </span>
                </m.div>
              )}
            </NavLink>
          ))}
        </div>

        {/* Center HOME button — elevated above the pill */}
        <NavLink
          to="/"
          end
          className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-auto z-10"
          style={{ marginBottom: '0px' }}
        >
          {({ isActive }) => (
            <m.div
              className="flex flex-col items-center gap-1"
              whileTap={animationEnabled ? { scale: 0.9 } : undefined}
            >
              {/* Glowing circle button */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center relative transition-all duration-300"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                    : isDark 
                      ? 'linear-gradient(135deg, #0D9464 0%, #065f46 100%)'
                      : 'linear-gradient(135deg, #A7F3D0 0%, #10B981 100%)',
                  boxShadow: isActive
                    ? '0 0 24px rgba(16,185,129,0.6), 0 4px 16px rgba(0,0,0,0.4)'
                    : isDark
                      ? '0 0 12px rgba(16,185,129,0.25), 0 4px 12px rgba(0,0,0,0.4)'
                      : '0 0 12px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.08)',
                  border: isDark ? '2px solid rgba(16,185,129,0.5)' : '2px solid rgba(255,255,255,0.8)',
                  transform: 'translateY(-12px)',
                }}
              >
                {/* Subtle inner glow */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.2) 0%, transparent 70%)' }}
                />
                <CrescentIcon isActive={isActive} isDark={isDark} />
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wider transition-all duration-300"
                style={{
                  color: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
                  transform: 'translateY(-10px)',
                }}
              >
                Home
              </span>
            </m.div>
          )}
        </NavLink>
      </div>
    </nav>
  );
});

export default BottomNav;