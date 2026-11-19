import { memo, useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BookOpen, Settings as SettingsIcon, Compass, LayoutGrid, Home } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useSettings } from "@/contexts/SettingsContext";
import { useAppTheme } from "@/lib/theme-engine";
import {
  THEME_NAVBAR_VARIANT,
  type NavbarVariantId,
  isNavItemActive,
} from "@/lib/navbar-variants";

interface NavItemDef {
  id: string;
  title: string;
  path: string;
  icon: typeof Compass;
  exact?: boolean;
}

const BottomNav = memo(function BottomNav() {
  const { t } = useLanguage();
  const { animationEnabled } = useSettings();
  const { currentTheme } = useAppTheme();
  const location = useLocation();

  const variant: NavbarVariantId = THEME_NAVBAR_VARIANT[currentTheme] || 'spotlight-beam';

  const navItems: NavItemDef[] = useMemo(() => [
    { id: 'qibla', title: t('qibla') || 'Qibla', path: '/qibla', icon: Compass },
    { id: 'quran', title: t('quran') || 'Quran', path: '/quran', icon: BookOpen },
    { id: 'home', title: t('home') || 'Home', path: '/', icon: Home, exact: true },
    { id: 'services', title: t('services') || 'Services', path: '/services', icon: LayoutGrid },
    { id: 'settings', title: t('settings') || 'Settings', path: '/profile', icon: SettingsIcon },
  ], [t]);

  // Hide global nav on routes that have their own bottom navigation (e.g., Mushaf reader, cycle tracker)
  if (location.pathname.startsWith('/noor-cycle') || /^\/quran\/.+/.test(location.pathname)) {
    return null;
  }

  return (
    <nav
      data-bottom-nav="true"
      data-navbar-variant={variant}
      className="w-full fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center safe-bottom print:hidden select-none"
      style={{
        overflow: 'visible',
        boxSizing: 'border-box',
      }}
    >
      {/* =========================================================================
          VARIANT 1: SPOTLIGHT BEAM (Oxford Gold)
          Overhead spotlight lamp bar + conical beam + lifted icon
          ========================================================================= */}
      {variant === 'spotlight-beam' && (
        <div
          className="w-full max-w-[390px] pointer-events-auto flex flex-row items-center justify-between h-[64px] px-1 relative overflow-hidden"
          style={{
            margin: '0 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '24px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            boxShadow: 'inset 0 1px 0 var(--accent-soft), 0 8px 24px rgba(0, 0, 0, 0.45)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
                style={{ touchAction: 'manipulation' }}
                aria-label={item.title}
              >
                {/* Luminous Honey Gold Lamp Bar at top edge */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '3px',
                      borderRadius: '0 0 4px 4px',
                      background: 'var(--accent)',
                      boxShadow: '0 2px 8px var(--accent-glow)',
                    }}
                  />
                )}

                {/* Soft Conical Spotlight Beam */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '52px',
                      height: '46px',
                      clipPath: 'polygon(24% 0%, 76% 0%, 100% 100%, 0% 100%)',
                      background: 'linear-gradient(180deg, var(--accent-glow) 0%, transparent 92%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Icon (lifts on active) */}
                <Icon
                  className="w-5 h-5 relative z-10"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    strokeWidth: isActive ? 2.4 : 1.8,
                    opacity: isActive ? 1 : 0.75,
                    transform: isActive ? 'translateY(-2px) scale(1.08)' : 'none',
                    transition: animationEnabled ? 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), color 0.2s' : 'none',
                  }}
                />

                {/* Label */}
                <span
                  className="text-[10px] leading-tight tracking-tight relative z-10 mt-1"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.75,
                    transition: animationEnabled ? 'color 0.2s, opacity 0.2s' : 'none',
                  }}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 2: MORPH CAPSULE (Haramain Noir / Kiswah)
          Dynamic expanding morph pill: Inactive = 44px icon-only, Active = side-by-side [Icon + Label]
          ========================================================================= */}
      {variant === 'morph-capsule' && (
        <div
          className="w-full max-w-[390px] pointer-events-auto flex flex-row items-center justify-between h-[60px] px-2 relative"
          style={{
            margin: '0 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '9999px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;

            if (isActive) {
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  replace
                  end={item.exact}
                  className="flex items-center justify-center gap-1.5 h-[42px] px-3.5 rounded-full select-none"
                  style={{
                    flex: '1 1 auto',
                    minWidth: '104px',
                    maxWidth: '132px',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    boxShadow: '0 4px 12px var(--accent-glow)',
                    transition: animationEnabled ? 'all 0.25s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                    touchAction: 'manipulation',
                  }}
                  aria-label={item.title}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0 stroke-[2.4]" style={{ color: 'var(--on-accent)' }} />
                  <span
                    className="text-[11px] font-bold leading-none truncate whitespace-nowrap"
                    style={{ color: 'var(--on-accent)' }}
                  >
                    {item.title}
                  </span>
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex items-center justify-center rounded-full select-none"
                style={{
                  flex: '0 0 44px',
                  width: '44px',
                  height: '44px',
                  color: 'var(--text-secondary)',
                  opacity: 0.75,
                  transition: animationEnabled ? 'all 0.25s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                  touchAction: 'manipulation',
                }}
                aria-label={item.title}
              >
                <Icon className="w-5 h-5 stroke-[1.8]" />
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 3: ELEVATED ORB (Imperial Violet)
          Edge-to-edge dock with elevated pop-out circular jewel orb
          ========================================================================= */}
      {variant === 'elevated-orb' && (
        <div
          className="w-full max-w-lg pointer-events-auto flex flex-row items-center justify-around h-[64px] px-2 relative"
          style={{
            borderRadius: '22px 22px 0 0',
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--border)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.45)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
            overflow: 'visible',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center h-full relative min-w-0"
                style={{
                  touchAction: 'manipulation',
                  overflow: 'visible',
                  justifyContent: isActive ? 'flex-end' : 'center',
                  paddingBottom: isActive ? '6px' : '0px',
                }}
                aria-label={item.title}
              >
                {isActive ? (
                  <>
                    {/* Elevated Pop-Out Circular Jewel Orb */}
                    <div
                      aria-hidden="true"
                      className="flex items-center justify-center rounded-full"
                      style={{
                        position: 'absolute',
                        top: '-18px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '46px',
                        height: '46px',
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        border: '4px solid var(--bg-base)',
                        boxShadow: '0 6px 16px var(--accent-glow)',
                        transition: animationEnabled ? 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                      }}
                    >
                      <Icon className="w-5 h-5 stroke-[2.4]" style={{ color: 'var(--on-accent)' }} />
                    </div>

                    {/* Active Label Underneath */}
                    <span
                      className="text-[10px] leading-tight tracking-tight font-bold"
                      style={{
                        color: 'var(--accent-text)',
                        transform: 'translateY(-2px)',
                      }}
                    >
                      {item.title}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon
                      className="w-5 h-5 stroke-[1.8]"
                      style={{
                        color: 'var(--text-secondary)',
                        opacity: 0.75,
                      }}
                    />
                    <span
                      className="text-[10px] leading-tight font-medium mt-1"
                      style={{
                        color: 'var(--text-secondary)',
                        opacity: 0.75,
                      }}
                    >
                      {item.title}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 4: SATIN WELL (Burgundy Velvet)
          Tactile recessed jewel well chamber + rotated satin diamond gem
          ========================================================================= */}
      {variant === 'satin-well' && (
        <div
          className="w-full max-w-[390px] pointer-events-auto flex flex-row items-center justify-between h-[64px] p-1.5 relative"
          style={{
            margin: '0 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '20px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
            gap: '4px',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center justify-center h-[52px] relative rounded-[14px]"
                style={{
                  touchAction: 'manipulation',
                  background: isActive ? 'linear-gradient(180deg, var(--surface-2) 0%, var(--surface) 100%)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderTop: isActive ? '1.5px solid var(--accent)' : '1px solid transparent',
                  boxShadow: isActive ? 'inset 0 2px 6px rgba(0, 0, 0, 0.4)' : 'none',
                }}
                aria-label={item.title}
              >
                <Icon
                  className="w-5 h-5 relative z-10"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    strokeWidth: isActive ? 2.4 : 1.8,
                    opacity: isActive ? 1 : 0.75,
                    transform: isActive ? 'translateY(-1px)' : 'none',
                  }}
                />

                <span
                  className="text-[10px] leading-tight font-medium relative z-10 mt-1"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.75,
                  }}
                >
                  {item.title}
                </span>

                {/* Rotated Satin Diamond Gem at Bottom Center */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: '3px',
                      left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '4px',
                      height: '4px',
                      background: 'var(--accent)',
                      boxShadow: '0 0 4px var(--accent-glow)',
                    }}
                  />
                )}
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 5: SPLIT ISLANDS (Desert Scroll)
          3 detached floating islands: [Left Pill: Qibla, Quran] + [Center Orb: Home] + [Right Pill: Services, Settings]
          ========================================================================= */}
      {variant === 'split-islands' && (
        <div
          className="w-full max-w-[390px] flex flex-row items-center justify-between relative pointer-events-none"
          style={{
            margin: '0 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            height: '62px',
            gap: '8px',
            boxSizing: 'border-box',
          }}
        >
          {/* Left Island Pill: Qibla & Quran */}
          <div
            className="flex-1 flex items-center justify-around h-[56px] px-1 pointer-events-auto rounded-[28px]"
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
            }}
          >
            {navItems.slice(0, 2).map((item) => {
              const isActive = isNavItemActive(location.pathname, item.path, item.exact);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  replace
                  end={item.exact}
                  className="flex items-center justify-center rounded-[22px] select-none"
                  style={{
                    padding: isActive ? '6px 10px' : '4px 8px',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px var(--accent-glow)' : 'none',
                    gap: isActive ? '4px' : '0px',
                    touchAction: 'manipulation',
                  }}
                  aria-label={item.title}
                >
                  <Icon className="w-[18px] h-[18px] stroke-[2]" style={{ color: isActive ? 'var(--on-accent)' : 'inherit' }} />
                  {isActive ? (
                    <span className="text-[10px] font-bold leading-none truncate whitespace-nowrap">
                      {item.title}
                    </span>
                  ) : (
                    <span className="sr-only">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </div>

          {/* Center Detached Floating Home Medallion */}
          {(() => {
            const homeItem = navItems[2];
            const isHomeActive = isNavItemActive(location.pathname, homeItem.path, homeItem.exact);
            const HomeIcon = homeItem.icon;
            return (
              <NavLink
                to={homeItem.path}
                replace
                end={homeItem.exact}
                className="w-14 h-14 shrink-0 rounded-full flex flex-col items-center justify-center pointer-events-auto select-none"
                style={{
                  background: isHomeActive ? 'var(--accent)' : 'var(--surface-2)',
                  color: isHomeActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                  border: isHomeActive ? '1.5px solid var(--accent)' : '1.5px solid var(--border)',
                  boxShadow: isHomeActive ? '0 8px 24px var(--accent-glow)' : '0 6px 18px rgba(0, 0, 0, 0.45)',
                  transform: isHomeActive ? 'translateY(-4px) scale(1.04)' : 'none',
                  transition: animationEnabled ? 'all 0.25s cubic-bezier(0.2, 0, 0, 1)' : 'none',
                  touchAction: 'manipulation',
                }}
                aria-label={homeItem.title}
              >
                <HomeIcon className="w-5 h-5 stroke-[2.2]" style={{ color: isHomeActive ? 'var(--on-accent)' : 'inherit' }} />
                <span
                  className="text-[9.5px] leading-none mt-0.5"
                  style={{
                    fontWeight: isHomeActive ? 800 : 500,
                    color: isHomeActive ? 'var(--on-accent)' : 'inherit',
                  }}
                >
                  {homeItem.title}
                </span>
              </NavLink>
            );
          })()}

          {/* Right Island Pill: Services & Settings */}
          <div
            className="flex-1 flex items-center justify-around h-[56px] px-1 pointer-events-auto rounded-[28px]"
            style={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.45)',
            }}
          >
            {navItems.slice(3, 5).map((item) => {
              const isActive = isNavItemActive(location.pathname, item.path, item.exact);
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  replace
                  end={item.exact}
                  className="flex items-center justify-center rounded-[22px] select-none"
                  style={{
                    padding: isActive ? '6px 10px' : '4px 8px',
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 2px 8px var(--accent-glow)' : 'none',
                    gap: isActive ? '4px' : '0px',
                    touchAction: 'manipulation',
                  }}
                  aria-label={item.title}
                >
                  <Icon className="w-[18px] h-[18px] stroke-[2]" style={{ color: isActive ? 'var(--on-accent)' : 'inherit' }} />
                  {isActive ? (
                    <span className="text-[10px] font-bold leading-none truncate whitespace-nowrap">
                      {item.title}
                    </span>
                  ) : (
                    <span className="sr-only">{item.title}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VARIANT 6: LASER HORIZON (Royal Sapphire / Istanbul)
          Edge-to-edge razor bar + bottom laser glide rail + upward radial aura
          ========================================================================= */}
      {variant === 'laser-horizon' && (
        <div
          className="w-full max-w-lg pointer-events-auto flex flex-row items-center justify-around h-[62px] px-2 relative"
          style={{
            borderRadius: '0',
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--border)',
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.45)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
                style={{ touchAction: 'manipulation' }}
                aria-label={item.title}
              >
                {/* Soft Upward Radial Aura */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'radial-gradient(ellipse at 50% 100%, var(--accent-soft) 0%, transparent 72%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Bottom Laser Glide Rail */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '36px',
                      height: '3px',
                      borderRadius: '3px 3px 0 0',
                      background: 'var(--accent)',
                      boxShadow: '0 -2px 8px var(--accent-glow)',
                    }}
                  />
                )}

                <Icon
                  className="w-5 h-5 relative z-10"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    strokeWidth: isActive ? 2.4 : 1.8,
                    opacity: isActive ? 1 : 0.75,
                    transform: isActive ? 'scale(1.1) translateY(-2px)' : 'none',
                    transition: animationEnabled ? 'transform 0.2s, color 0.2s' : 'none',
                  }}
                />

                <span
                  className="text-[10px] leading-tight font-medium relative z-10 mt-1"
                  style={{
                    color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.75,
                  }}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 7: MIHRAB ARCH (Madinah Emerald)
          Floating emerald dock + sculpted pointed Islamic Mihrab Arch frame + leaf apex crest
          ========================================================================= */}
      {variant === 'mihrab-arch' && (
        <div
          className="w-full max-w-[390px] pointer-events-auto flex flex-row items-center justify-between h-[64px] p-1 relative"
          style={{
            margin: '0 10px calc(8px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '24px 24px 16px 16px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 var(--accent-soft)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
            gap: '4px',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center justify-center h-[54px] relative"
                style={{
                  touchAction: 'manipulation',
                  borderRadius: isActive ? '20px 20px 8px 8px' : '16px',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  border: isActive ? '1px solid var(--border)' : '1px solid transparent',
                  borderTop: isActive ? '2px solid var(--accent)' : '1px solid transparent',
                  boxShadow: isActive ? '0 2px 10px var(--accent-glow)' : 'none',
                }}
                aria-label={item.title}
              >
                {/* Glowing Bright Leaf Crest Dot at arch apex */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: 'var(--accent)',
                      boxShadow: '0 0 6px var(--accent-glow)',
                    }}
                  />
                )}

                <Icon
                  className="w-5 h-5 relative z-10"
                  style={{
                    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                    strokeWidth: isActive ? 2.4 : 1.8,
                    opacity: isActive ? 1 : 0.75,
                    transform: isActive ? 'translateY(1px)' : 'none',
                  }}
                />

                <span
                  className="text-[10px] leading-tight font-medium relative z-10 mt-1"
                  style={{
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 500,
                    opacity: isActive ? 1 : 0.75,
                  }}
                >
                  {item.title}
                </span>
              </NavLink>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          VARIANT 8: CELESTIAL ORBIT (Persian Indigo)
          Minimalist floating capsule + double-ring Celestial Halo + horizontal comet-pill
          ========================================================================= */}
      {variant === 'celestial-orbit' && (
        <div
          className="w-full max-w-[390px] pointer-events-auto flex flex-row items-center justify-between h-[60px] px-2 relative"
          style={{
            margin: '0 12px calc(8px + env(safe-area-inset-bottom, 0px))',
            borderRadius: '9999px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(184, 196, 255, 0.15)',
            boxSizing: 'border-box',
            touchAction: 'manipulation',
          }}
        >
          {navItems.map((item) => {
            const isActive = isNavItemActive(location.pathname, item.path, item.exact);
            const Icon = item.icon;
            return (
              <NavLink
                key={item.id}
                to={item.path}
                replace
                end={item.exact}
                className="flex-1 flex flex-col items-center justify-center h-full relative min-w-0"
                style={{ touchAction: 'manipulation' }}
                aria-label={item.title}
              >
                {isActive ? (
                  <>
                    {/* Double-Ring Celestial Halo */}
                    <div
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: '32px',
                        height: '32px',
                        background: 'var(--accent-soft)',
                        border: '1.5px solid var(--accent)',
                        boxShadow: '0 0 10px var(--accent-glow)',
                        transform: 'translateY(-1px)',
                      }}
                    >
                      <Icon className="w-[17px] h-[17px] stroke-[2.3]" style={{ color: 'var(--accent-text)' }} />
                    </div>

                    <span
                      className="text-[10px] leading-tight font-bold"
                      style={{ color: 'var(--accent-text)' }}
                    >
                      {item.title}
                    </span>

                    {/* Horizontal Comet-Pill Indicator */}
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '18px',
                        height: '3px',
                        borderRadius: '9999px',
                        background: 'var(--accent)',
                        boxShadow: '0 0 6px var(--accent-glow)',
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Icon
                      className="w-5 h-5 stroke-[1.8]"
                      style={{
                        color: 'var(--text-secondary)',
                        opacity: 0.75,
                      }}
                    />
                    <span
                      className="text-[10px] leading-tight font-medium mt-1"
                      style={{
                        color: 'var(--text-secondary)',
                        opacity: 0.75,
                      }}
                    >
                      {item.title}
                    </span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </nav>
  );
});

export default BottomNav;
