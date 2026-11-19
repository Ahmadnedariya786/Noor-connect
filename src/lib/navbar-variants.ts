import { type ThemeId } from '@/types/theme';

export type NavbarVariantId =
  | 'spotlight-beam'
  | 'morph-capsule'
  | 'elevated-orb'
  | 'satin-well'
  | 'split-islands'
  | 'laser-horizon'
  | 'mihrab-arch'
  | 'celestial-orbit';

export const THEME_NAVBAR_VARIANT: Record<ThemeId, NavbarVariantId> = {
  'oxford-gold': 'spotlight-beam',
  'kiswah-noir': 'morph-capsule',
  'imperial-violet': 'elevated-orb',
  'burgundy-velvet': 'satin-well',
  'desert-scroll': 'split-islands',
  'istanbul-sapphire': 'laser-horizon',
  'madinah-emerald': 'mihrab-arch',
  'persian-indigo': 'celestial-orbit',
};

export const NAVBAR_VARIANT_NAMES: Record<NavbarVariantId, string> = {
  'spotlight-beam': 'Spotlight Beam',
  'morph-capsule': 'Morph Capsule',
  'elevated-orb': 'Elevated Orb',
  'satin-well': 'Satin Jewel Well',
  'split-islands': 'Split Islands',
  'laser-horizon': 'Laser Horizon',
  'mihrab-arch': 'Mihrab Arch',
  'celestial-orbit': 'Celestial Orbit',
};

export function getNavbarVariantForTheme(themeId?: string | null): NavbarVariantId {
  if (!themeId) return 'spotlight-beam';
  return THEME_NAVBAR_VARIANT[themeId as ThemeId] || 'spotlight-beam';
}

/**
 * Robust active-route matcher supporting root aliases (/ and /dashboard),
 * Quran subroutes, and settings/profile subroutes.
 */
export function isNavItemActive(currentPath: string, targetPath: string, exact?: boolean): boolean {
  if (targetPath === '/') {
    return currentPath === '/' || currentPath === '/dashboard';
  }
  if (targetPath === '/quran') {
    return currentPath.startsWith('/quran');
  }
  if (targetPath === '/profile') {
    return currentPath.startsWith('/profile') || currentPath.startsWith('/settings');
  }
  if (exact) {
    return currentPath === targetPath;
  }
  return currentPath.startsWith(targetPath);
}
