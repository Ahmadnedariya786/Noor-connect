import { Capacitor } from '@capacitor/core';

function getPageUrl(page: number): string {
  const padded = String(page).padStart(3, '0');
  
  if (Capacitor.isNativePlatform()) {
    // On Android Capacitor, assets outside public are accessed via android_asset
    return `http://localhost/android_asset/mushaf/${padded}.webp`;
  }
  
  // On Web/Browser, we fetch from a relative path which we'll configure Vite to serve
  return `/android_asset/mushaf/${padded}.webp`;
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
