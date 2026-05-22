import { Capacitor } from '@capacitor/core';

function getPageUrl(page: number): string {
  const padded = String(page).padStart(3, '0');
  
  // Capacitor automatically serves public folder assets on both web and native
  // Use the same path for both platforms
  return `/mushaf/${padded}.webp`;
}

export function getMushafPageUrl(page: number): string {
  return getPageUrl(page);
}

export function markPageAsLoaded(page: number): void {
  // No-op - local assets don't need caching
}

export async function clearQuranMushafImageCache(): Promise<void> {
  // No-op - local assets don't need caching
}
