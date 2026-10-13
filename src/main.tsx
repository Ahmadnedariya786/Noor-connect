import { initCrashLogger } from "@/lib/crash-logger";
import {
  checkAndRecordStartupCrash,
  markStartupStep,
  completeStartupStep,
} from "@/lib/startup-breadcrumb";

// 1. Initialize crash loggers and inspect breadcrumb from previous launch BEFORE anything else
try {
  initCrashLogger();
  checkAndRecordStartupCrash();
} catch (e) {
  console.warn("Crash logger / startup breadcrumb check failed:", e);
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { localNotifications } from "@/lib/local-notifications";
import { whenIdle } from "@/lib/performance-optimizations";
import './lib/i18n-new'; // Initialize new offline-first i18n

// Initialize local notifications on the first idle slice so it doesn't compete
// with the initial paint / Capacitor bridge startup (reduces startup jank).
whenIdle(() => {
  markStartupStep('notification-service-init-idle');
  try {
    void localNotifications.initialize();
  } catch (e) {
    console.warn("localNotifications.initialize failed:", e);
  } finally {
    completeStartupStep('notification-service-init-idle');
  }
});

import { LanguageProvider } from "@/contexts/LanguageContext-new";
import { Capacitor } from "@capacitor/core";

// 2. Mount React application root with breadcrumb tracing
markStartupStep('boot-main');
try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </StrictMode>
    );
  } else {
    console.error("Root element not found");
  }
} catch (e) {
  console.error("boot-main rendering threw:", e);
} finally {
  completeStartupStep('boot-main');
}

// Defer low-end device detection until after React root is created
import { isLowEndDevice } from "@/lib/performance-optimizations";
try {
  if (isLowEndDevice()) {
    document.documentElement.classList.add("low-end-device");
  }
} catch (e) {
  console.warn("isLowEndDevice failed:", e);
}

// Service worker is web-only. On native platforms, completely skip.
if (!Capacitor.isNativePlatform() && import.meta.env.DEV && 'serviceWorker' in navigator) {
  (async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length === 0) return;

      await Promise.all(registrations.map((r) => r.unregister()));

      // Remove any PWA caches that can interfere with Vite dev (stale chunks/assets).
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }

      // A controlling SW continues until reload; reload once to fully detach.
      if (navigator.serviceWorker.controller) {
        const reloadKey = "dev-sw-detach-reload";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          window.location.reload();
        }
      }
    } catch (err) {
      console.warn("Failed to unregister Service Worker in development mode:", err);
    }
  })();
}
