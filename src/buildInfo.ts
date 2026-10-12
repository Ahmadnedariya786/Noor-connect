/**
 * Build Information
 * Injected at build time by Vite.
 */
export const BUILD_TIME: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_TIME) ||
  (typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString());

export const APP_VERSION: string =
  (typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.2.1');
