import React, { memo, useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppTheme } from '@/lib/theme-engine';
import {
  ALL_NAVBAR_VARIANTS,
  NAVBAR_VARIANT_NAMES,
  NAVBAR_STYLE_CHANGE_EVENT,
  type NavbarVariantId,
  getNavbarOverrideConfig,
  setNavbarOverrideConfig,
} from '@/lib/navbar-variants';
import { useHaptic } from '@/hooks/useHaptic';

/**
 * Pure-CSS lightweight mini wireframe illustration of each dock geometry.
 * ZERO backdrop-filter, ZERO drop-shadow, 100% GPU-composited CSS primitives.
 */
const MiniDockWireframe: React.FC<{ variantId: NavbarVariantId; isSelected: boolean }> = memo(({ variantId, isSelected }) => {
  switch (variantId) {
    case 'spotlight-beam':
      return (
        <div
          className="w-full h-6 rounded-full relative flex items-center justify-center overflow-hidden border"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          {/* Top Lamp Bar */}
          <div
            className="absolute top-0 w-4 h-0.5 rounded-b"
            style={{ background: 'var(--accent)' }}
          />
          {/* Downward Spotlight Cone */}
          <div
            className="absolute top-0.5 w-6 h-3 pointer-events-none"
            style={{
              clipPath: 'polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%)',
              background: 'linear-gradient(180deg, var(--accent-glow) 0%, transparent 95%)',
            }}
          />
          {/* Lifted Center Dot */}
          <div
            className="w-1.5 h-1.5 rounded-full relative z-10"
            style={{
              background: 'var(--accent)',
              transform: 'translateY(-1px)',
            }}
          />
        </div>
      );

    case 'morph-capsule':
      return (
        <div
          className="w-full h-6 rounded-full flex items-center justify-between px-2 border"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          <div className="w-1 h-1 rounded-full opacity-40" style={{ background: 'var(--text-secondary)' }} />
          <div className="w-1 h-1 rounded-full opacity-40" style={{ background: 'var(--text-secondary)' }} />
          {/* Active Expanding Pill */}
          <div
            className="w-6 h-3.5 rounded-full flex items-center justify-center gap-0.5"
            style={{ background: 'var(--accent)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--on-accent)' }} />
            <div className="w-2 h-0.5 rounded-full" style={{ background: 'var(--on-accent)' }} />
          </div>
          <div className="w-1 h-1 rounded-full opacity-40" style={{ background: 'var(--text-secondary)' }} />
          <div className="w-1 h-1 rounded-full opacity-40" style={{ background: 'var(--text-secondary)' }} />
        </div>
      );

    case 'elevated-orb':
      return (
        <div
          className="w-full h-5 rounded-t-lg relative flex items-center justify-center mt-1 border-t border-x"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
            overflow: 'visible',
          }}
        >
          {/* Pop-Out Circular Jewel Orb */}
          <div
            className="w-4 h-4 rounded-full absolute -top-2 flex items-center justify-center border-2 shadow-sm"
            style={{
              background: 'var(--accent)',
              borderColor: 'var(--bg-base)',
            }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--on-accent)' }} />
          </div>
        </div>
      );

    case 'satin-well':
      return (
        <div
          className="w-full h-6 rounded-md flex items-center justify-center p-0.5 border"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          {/* Recessed Jewel Chamber */}
          <div
            className="w-7 h-4 rounded relative flex flex-col items-center justify-center border"
            style={{
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              borderTopColor: 'var(--accent)',
            }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent)' }} />
            {/* Satin Diamond */}
            <div
              className="w-1 h-1 absolute bottom-0.5"
              style={{
                background: 'var(--accent)',
                transform: 'rotate(45deg)',
              }}
            />
          </div>
        </div>
      );

    case 'split-islands':
      return (
        <div className="w-full h-6 flex items-center justify-between gap-1">
          {/* Left Pill */}
          <div
            className="flex-1 h-4 rounded-full flex items-center justify-around px-1 border"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="w-1 h-1 rounded-full opacity-50" style={{ background: 'var(--text-secondary)' }} />
            <div className="w-1 h-1 rounded-full opacity-50" style={{ background: 'var(--text-secondary)' }} />
          </div>
          {/* Center Detached Orb */}
          <div
            className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center shadow-sm"
            style={{ background: 'var(--accent)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--on-accent)' }} />
          </div>
          {/* Right Pill */}
          <div
            className="flex-1 h-4 rounded-full flex items-center justify-around px-1 border"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="w-1 h-1 rounded-full opacity-50" style={{ background: 'var(--text-secondary)' }} />
            <div className="w-1 h-1 rounded-full opacity-50" style={{ background: 'var(--text-secondary)' }} />
          </div>
        </div>
      );

    case 'laser-horizon':
      return (
        <div
          className="w-full h-5 relative flex items-center justify-center overflow-hidden border-t"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          {/* Upward Radial Aura */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, var(--accent-soft) 0%, transparent 80%)',
            }}
          />
          {/* Center Icon Dot */}
          <div
            className="w-1.5 h-1.5 rounded-full relative z-10"
            style={{
              background: 'var(--accent)',
              transform: 'translateY(-1px)',
            }}
          />
          {/* Bottom Laser Glide Rail */}
          <div
            className="w-8 h-0.5 rounded-t absolute bottom-0 shadow-sm"
            style={{ background: 'var(--accent)' }}
          />
        </div>
      );

    case 'mihrab-arch':
      return (
        <div
          className="w-full h-6 rounded-t-xl rounded-b-md flex items-center justify-center p-0.5 border"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          {/* Pointed Arch Frame */}
          <div
            className="w-6 h-4.5 rounded-t-lg rounded-b-xs relative flex items-center justify-center border"
            style={{
              background: 'var(--accent-soft)',
              borderColor: 'var(--border)',
              borderTopColor: 'var(--accent)',
              borderTopWidth: '1.5px',
            }}
          >
            {/* Apex Dot */}
            <div
              className="w-1 h-1 rounded-full absolute top-0.5"
              style={{ background: 'var(--accent)' }}
            />
            {/* Center Icon Dot */}
            <div
              className="w-1.5 h-1.5 rounded-full mt-1"
              style={{ background: 'var(--accent)' }}
            />
          </div>
        </div>
      );

    case 'celestial-orbit':
      return (
        <div
          className="w-full h-6 rounded-full relative flex items-center justify-center border"
          style={{
            background: 'var(--surface-2)',
            borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
          }}
        >
          {/* Celestial Halo */}
          <div
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center border"
            style={{
              background: 'var(--accent-soft)',
              borderColor: 'var(--accent)',
            }}
          >
            <div className="w-1 h-1 rounded-full" style={{ background: 'var(--accent-text)' }} />
          </div>
          {/* Comet Pill */}
          <div
            className="w-3.5 h-0.5 rounded-full absolute bottom-0.5"
            style={{ background: 'var(--accent)' }}
          />
        </div>
      );

    default:
      return null;
  }
});

MiniDockWireframe.displayName = 'MiniDockWireframe';

export const NavbarOverrideSection: React.FC = memo(() => {
  const { currentTheme } = useAppTheme();
  const { triggerUI } = useHaptic();

  const [overrideConfig, setOverrideConfigState] = useState(() =>
    getNavbarOverrideConfig(currentTheme)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setOverrideConfigState(getNavbarOverrideConfig(currentTheme));
    };
    window.addEventListener(NAVBAR_STYLE_CHANGE_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(NAVBAR_STYLE_CHANGE_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [currentTheme]);

  const handleToggle = useCallback((checked: boolean) => {
    try {
      triggerUI();
    } catch (err) {
      console.debug('[NavbarOverrideSection] Haptic error:', err);
    }
    setNavbarOverrideConfig(checked, overrideConfig.style);
    setOverrideConfigState((prev) => ({ ...prev, enabled: checked }));
  }, [overrideConfig.style, triggerUI]);

  const handleSelectStyle = useCallback((styleId: NavbarVariantId) => {
    try {
      triggerUI();
    } catch (err) {
      console.debug('[NavbarOverrideSection] Haptic error:', err);
    }
    setNavbarOverrideConfig(true, styleId);
    setOverrideConfigState({ enabled: true, style: styleId });
  }, [triggerUI]);

  const lockedStyleName = NAVBAR_VARIANT_NAMES[overrideConfig.style] || 'Custom';

  return (
    <div className="border-t border-[var(--border)] pt-3 space-y-3">
      {/* Exact 2-Line Full-Width Row Pattern */}
      <div className="flex flex-col gap-1 w-full">
        {/* Line 1: Left Title + Right Controls (Status Chip + Toggle Switch) */}
        <div className="flex items-center justify-between gap-2 w-full">
          <Label
            htmlFor="navbar-override-switch"
            className="text-[0.84rem] font-bold text-[var(--text-primary)] whitespace-nowrap cursor-pointer select-none"
          >
            Navbar Style Override
          </Label>

          <div className="flex items-center gap-2 shrink-0">
            {/* Status Chip */}
            <span
              className="text-[0.62rem] font-bold px-2 py-0.5 rounded-full tracking-wide select-none transition-colors"
              style={{
                background: overrideConfig.enabled ? 'var(--accent-soft)' : 'var(--surface-2)',
                color: overrideConfig.enabled ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: overrideConfig.enabled ? '1px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              {overrideConfig.enabled ? lockedStyleName : 'Auto'}
            </span>

            {/* Toggle Switch */}
            <Switch
              id="navbar-override-switch"
              checked={overrideConfig.enabled}
              onCheckedChange={handleToggle}
              aria-label="Toggle Navbar Style Override"
            />
          </div>
        </div>

        {/* Line 2: Full-Width Subtitle */}
        <p className="text-xs text-[var(--text-secondary)] leading-tight select-none">
          {overrideConfig.enabled
            ? 'Locked across all themes • Tap a dock style below'
            : 'Auto (Matches Theme) • Tap to lock custom dock'}
        </p>
      </div>

      {/* Expandable 8-Style Dock Picker (Shown when Toggle is ON) */}
      {overrideConfig.enabled && (
        <div
          className="grid grid-cols-2 gap-2 pt-2.5 pb-1 select-none animate-in fade-in duration-200"
          style={{ touchAction: 'manipulation' }}
        >
          {ALL_NAVBAR_VARIANTS.map((v) => {
            const isSelected = overrideConfig.style === v.id;
            return (
              <div
                key={v.id}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectStyle(v.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectStyle(v.id);
                  }
                }}
                className="flex flex-col justify-between p-2.5 rounded-[14px] cursor-pointer transition-all border text-left"
                style={{
                  background: isSelected
                    ? 'linear-gradient(180deg, var(--accent-soft) 0%, var(--surface) 100%)'
                    : 'var(--surface)',
                  borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                  borderWidth: '1.5px',
                  boxShadow: isSelected ? '0 2px 8px var(--accent-glow)' : 'none',
                }}
              >
                {/* Mini Dock Wireframe Preview */}
                <div className="mb-2 w-full flex items-center justify-center">
                  <MiniDockWireframe variantId={v.id} isSelected={isSelected} />
                </div>

                {/* Title + Checkmark */}
                <div className="flex items-center justify-between gap-1 w-full min-w-0">
                  <span
                    className="text-[0.76rem] font-bold truncate block flex-1"
                    style={{
                      color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)',
                    }}
                  >
                    {v.name}
                  </span>
                  {isSelected && (
                    <Check
                      className="w-3.5 h-3.5 shrink-0 stroke-[3]"
                      style={{ color: 'var(--accent)' }}
                    />
                  )}
                </div>

                {/* Subtitle */}
                <span
                  className="text-[0.64rem] truncate block mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {v.subtitle}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

NavbarOverrideSection.displayName = 'NavbarOverrideSection';

export default NavbarOverrideSection;
