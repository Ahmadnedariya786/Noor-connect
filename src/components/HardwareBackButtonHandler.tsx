import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/**
 * Resolves the deterministic parent route for any given pathname.
 * Returns null if the current route is the root Home tab ('/' or '/dashboard').
 */
export function getParentRoute(pathname: string): string | null {
  // Normalize trailing slash and remove query/hash if present
  const raw = pathname.split('?')[0].split('#')[0];
  const p = raw.endsWith('/') && raw.length > 1 ? raw.slice(0, -1) : raw;

  // Case 4: Root Home screen
  if (p === '' || p === '/' || p === '/dashboard') {
    return null;
  }

  // Case 3: Top-level navigation tabs -> parent is Home ('/')
  if (p === '/qibla' || p === '/quran' || p === '/services' || p === '/profile' || p === '/settings') {
    return '/';
  }

  // Case 2: Sub-screens with direct parent hierarchy
  // Settings sub-pages (e.g. /settings/theme, /settings/clock-style, etc.)
  if (p.startsWith('/settings/')) {
    return '/profile';
  }

  // Quran sub-screens
  if (p.startsWith('/quran/') || p === '/quran-progress' || p === '/quran-audio' || p === '/tafsir') {
    return '/quran';
  }

  // Hadith collection hierarchy
  if (p.startsWith('/hadith/collections/')) {
    const parts = p.split('/').filter(Boolean);
    // parts: ['hadith', 'collections', collection, book, hadithNumber]
    if (parts.length >= 5) {
      return `/hadith/collections/${parts[2]}/${parts[3]}`;
    }
    if (parts.length === 4) {
      return `/hadith/collections/${parts[2]}`;
    }
    if (parts.length === 3) {
      return '/hadith/collections';
    }
    return '/hadith';
  }
  if (p === '/hadith/collections' || p === '/hadith/bookmarks') {
    return '/hadith';
  }
  if (p === '/hadith') {
    return '/services';
  }

  // Seerah sub-pages
  if (p.startsWith('/seerah/')) {
    return '/seerah';
  }
  if (p === '/seerah') {
    return '/services';
  }

  // Qisas sub-pages
  if (p.startsWith('/qisas/')) {
    return '/qisas';
  }
  if (p === '/qisas') {
    return '/services';
  }

  // User Profile / Settings accessories
  if (p === '/notification-history') {
    return '/profile';
  }

  // Dashboard customization
  if (p === '/dashboard-widgets') {
    return '/';
  }

  // All other service tools parent to /services
  // (/tasbeeh, /duas, /calendar, /ebooks, /qaza, /ramadan, /noor-cycle,
  //  /zakat, /names-of-allah, /quiz, /prayer-stats, /habit-tracker,
  //  /quran-radio, /nasheeds, /live, /radio-stats, /islamic-remedies,
  //  /remedy-favorites, /eid-checklist, /fitrana-calculator)
  return '/services';
}

/**
 * Exits the Android application cleanly across Capacitor, native AndroidBridge, and legacy WebView.
 */
export async function exitAndroidApp(): Promise<void> {
  try {
    await CapApp.exitApp();
  } catch {
    // silent fallback for Capacitor exitApp
  }

  // Native AndroidBridge interface exposed via MainActivity.java
  const androidBridge = (window as unknown as { AndroidBridge?: { closeApp?: () => void } }).AndroidBridge;
  if (androidBridge && typeof androidBridge.closeApp === 'function') {
    try {
      androidBridge.closeApp();
      return;
    } catch {
      // silent fallback for AndroidBridge.closeApp
    }
  }

  // Legacy Cordova / WebView fallback
  const navApp = (navigator as unknown as { app?: { exitApp?: () => void } }).app;
  if (navApp && typeof navApp.exitApp === 'function') {
    try {
      navApp.exitApp();
      return;
    } catch {
      // silent fallback for navigator.app.exitApp
    }
  }
}

/**
 * HardwareBackButtonHandler
 * Intercepts Android system hardware back and back-swipe gestures.
 * Works uniformly on Capacitor native backButton events and nativeBackPressed DOM events.
 */
export function HardwareBackButtonHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  // Stable references to access latest router state without re-registering event listeners
  const locationRef = useRef(location);
  locationRef.current = location;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Debounce guard to prevent double execution if both nativeBackPressed and backButton fire
  const lastHandledTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleBackButton = async () => {
      const now = Date.now();
      if (now - lastHandledTimeRef.current < 250) {
        return; // Debounce multi-dispatch
      }
      lastHandledTimeRef.current = now;

      // Case 1: Modal / Sheet / Overlay is currently open -> dismiss it and stay on current page
      const activeModal = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [data-radix-portal] [role="dialog"], .fixed.inset-0.z-50'
      );
      if (activeModal) {
        // Dispatch Escape key event to close active Radix modal/sheet
        const escapeEvent = new KeyboardEvent('keydown', {
          key: 'Escape',
          code: 'Escape',
          keyCode: 27,
          which: 27,
          bubbles: true,
          cancelable: true,
        });
        document.dispatchEvent(escapeEvent);

        // Also trigger any explicit close button if present
        const closeBtn = document.querySelector(
          '[role="dialog"] button[aria-label="Close"], [role="dialog"] button.close, [data-state="open"] button[aria-label="Close"]'
        ) as HTMLElement | null;
        if (closeBtn) {
          try {
            closeBtn.click();
          } catch {
            // silent click error fallback
          }
        }
        return;
      }

      const currentPath = locationRef.current.pathname;
      const parent = getParentRoute(currentPath);

      if (parent) {
        // Case 2 & Case 3: Sub-screen or non-home tab -> Navigate directly to parent root tab with replace
        navigateRef.current(parent, { replace: true });
        return;
      }

      // Case 4: On Home screen ('/' or '/dashboard') with no modals -> Close/exit app immediately
      await exitAndroidApp();
    };

    // Layer B: Capacitor App plugin listener
    let capListenerHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        handleBackButton();
      }).then(handle => {
        capListenerHandle = handle;
      }).catch(() => {
        // silent fallback for Capacitor backButton registration
      });
    }

    // Layer B: DOM event listener dispatched by MainActivity.java onBackPressed()
    const onNativeBackPressed = () => {
      handleBackButton();
    };
    window.addEventListener('nativeBackPressed', onNativeBackPressed);

    return () => {
      if (capListenerHandle) {
        try {
          capListenerHandle.remove();
        } catch {
          // silent cleanup fallback
        }
      }
      window.removeEventListener('nativeBackPressed', onNativeBackPressed);
    };
  }, []);

  return null;
}

export default HardwareBackButtonHandler;
