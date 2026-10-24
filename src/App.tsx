import { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import { markStartupStep, completeStartupStep } from "@/lib/startup-breadcrumb";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BottomNav from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { notificationManager } from "@/lib/notification-manager";
import { serviceWorkerManager } from "@/lib/service-worker-registration";

import { islamicEventsService } from "@/lib/islamic-events-service";
import { LayoutManager } from "@/components/LayoutManager";
import { SplashScreen, forceReleaseSplashScrollLock } from "@/components/SplashScreen";
import { THEME_BG_HEX_MAP, ThemeId } from "@/lib/theme-engine";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AnimatePresence, MotionConfig, m } from "framer-motion";
import { LazyMotionWrapper } from "@/components/LazyMotionWrapper";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n-new";
import { LOCATION_STORAGE_KEY } from "@/lib/location-config";
import { useWidgetSync } from "@/hooks/useWidgetSync";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AutoBackupRestoreDialog } from "@/components/AutoBackupRestoreDialog";
import { initBackupService } from "@/lib/backup-service";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { useAnimationTier } from "@/hooks/useAnimationTier";
import { preloadCriticalResources, isLowEndDevice, monitorFPS } from "@/lib/performance-optimizations";
import { applyTieredVisualOverrides, getAnimationTier } from "@/lib/device-performance";
import { runFirstLaunchPermissionOnboarding } from "@/lib/onboarding-permissions";
import { ExactAlarmPermissionDialog } from "@/components/ExactAlarmPermissionDialog";
import { HardwareBackButtonHandler } from "@/components/HardwareBackButtonHandler";
import { recordBreadcrumb } from "@/lib/diagnostics-engine";

/**
 * RouteBreadcrumbTracker — automatically logs timestamped breadcrumbs on every route change.
 */
function RouteBreadcrumbTracker() {
  const location = useLocation();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    const current = (location.pathname || '/') + (location.search || '') + (location.hash || '');
    if (prevPathRef.current !== null && prevPathRef.current !== current) {
      recordBreadcrumb('ROUTE_CHANGE', `${prevPathRef.current} -> ${current}`);
    } else if (prevPathRef.current === null) {
      recordBreadcrumb('ROUTE_INITIAL', current);
    }
    prevPathRef.current = current;
  }, [location]);

  return null;
}

/**
 * DeepLinkListener — subscribes to widget deep-links (noorconnect://app/<path>?<query>)
 * and routes them through React Router. Must live inside <BrowserRouter> so useNavigate works.

 *
 * Handles both cold start (Capacitor delivers the launch URL on appUrlOpen) and warm start
 * (MainActivity.onNewIntent forwards the intent to the App plugin). No-op on web.
 */
function DeepLinkListener() {
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    const routeFromUrl = (rawUrl: string) => {
      if (!rawUrl) return;
      // Accept "noorconnect://app/<path>" and bare "/<path>"
      const path = rawUrl.replace(/^noorconnect:\/\/app/, '').replace(/^https?:\/\/[^/]+/, '');
      if (!path || path === '/' || cancelled) return;
      try {
        navigate(path, { replace: true });
      } catch (e) {
        // ignore navigation errors (e.g. unknown route)
        console.warn('DeepLinkListener: could not navigate to', path, e);
      }
    };

    // Warm start: subsequent URL opens while app is running
    const cleanupPromise = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      routeFromUrl(url);
    });

    // Cold start: if app was launched from a widget tap, get the launch URL
    CapacitorApp.getLaunchUrl()
      .then(({ url }) => routeFromUrl(url))
      .catch(() => {});

    return () => {
      cancelled = true;
      cleanupPromise.then(h => h?.remove?.()).catch(() => {});
    };
  }, [navigate]);
  return null;
}

// Create QueryClient for React Query with performance optimizations
const isLowEndForQuery = isLowEndDevice();
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: isLowEndForQuery ? 5 * 60 * 1000 : 60 * 60 * 1000, // 5 min for low-end, 1 hour for others
      gcTime: isLowEndForQuery ? 2 * 60 * 1000 : 5 * 60 * 1000, // 2 min for low-end, 5 min for others
      retry: isLowEndForQuery ? 0 : 1, // No retry for low-end devices
      refetchOnWindowFocus: false,
      refetchOnReconnect: !isLowEndForQuery, // Disable reconnection refetch on low-end
    },
    mutations: {
      retry: isLowEndForQuery ? 0 : 1,
    },
  },
});

// Global Players - Lazy loaded
const GlobalRadioPlayer = lazy(() => import("@/components/GlobalRadioPlayer").then(m => ({ default: m.GlobalRadioPlayer })));
const GlobalQuranPlayer = lazy(() => import("@/components/GlobalQuranPlayer").then(m => ({ default: m.GlobalQuranPlayer })));
const GlobalNasheedPlayer = lazy(() => import("@/components/GlobalNasheedPlayer").then(m => ({ default: m.GlobalNasheedPlayer })));
import { EidChecklistNotification } from "@/components/EidChecklistNotification";
import { FitranaCalculatorNotification } from "@/components/FitranaCalculatorNotification";

// Lazy load critical components
const GlobalPrayerAlarm = lazy(() => import("@/components/GlobalPrayerAlarm").then(module => ({ default: module.GlobalPrayerAlarm })));
const SalamGreeting = lazy(() => import("@/components/SalamGreeting").then(module => ({ default: module.SalamGreeting })));
const FestivePopup = lazy(() => import("@/components/FestivePopup").then(module => ({ default: module.FestivePopup })));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(module => ({ default: module.PWAInstallPrompt })));

import Dashboard from "./pages/Dashboard";

// Lazy load route components
const DashboardWidgets = lazy(() => import("./pages/DashboardWidgets"));
const SurahList = lazy(() => import("./pages/SurahList"));
const QuranReader = lazy(() => import("./pages/QuranReader"));
const QuranProgress = lazy(() => import("./pages/QuranProgress"));
const Tasbeeh = lazy(() => import("./pages/Tasbeeh"));
const Qibla = lazy(() => import("./pages/Qibla"));
const Duas = lazy(() => import("./pages/Duas"));
const Hadith = lazy(() => import("./pages/Hadith"));
const HadithCollections = lazy(() => import("./pages/HadithCollections"));
const HadithBook = lazy(() => import("./pages/HadithBook"));
const HadithBookContent = lazy(() => import("./pages/HadithBookContent"));
const HadithDetail = lazy(() => import("./pages/HadithDetail"));
const HadithBookmarksPage = lazy(() => import("./pages/HadithBookmarks"));
const Profile = lazy(() => import("./pages/Profile"));
const IslamicCalendar = lazy(() => import("./pages/IslamicCalendar"));
const Ebooks = lazy(() => import("./pages/EbooksModern"));
const QazaPage = lazy(() => import("./pages/QazaPage"));
const RamadanMode = lazy(() => import("./pages/RamadanMode"));

const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const ZakatCalculator = lazy(() => import("./pages/ZakatCalculator"));
const NamesOfAllah = lazy(() => import("./pages/NamesOfAllah"));
const IslamicQuiz = lazy(() => import("./pages/EnhancedIslamicQuiz"));
const PrayerStats = lazy(() => import("./pages/PrayerStats"));
const HabitTracker = lazy(() => import("./pages/HabitTracker"));
const QuranRadio = lazy(() => import("./pages/QuranRadio"));
const QuranAudio = lazy(() => import("./pages/QuranAudio"));
const NasheedPlayer = lazy(() => import("./pages/NasheedPlayer"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const RadioStats = lazy(() => import("./pages/RadioStats"));
const Services = lazy(() => import("./pages/Services"));
const IslamicRemedies = lazy(() => import("./pages/IslamicRemedies"));
const RemedyFavorites = lazy(() => import("./pages/RemedyFavorites"));
const Tafsir = lazy(() => import("./pages/Tafsir-New"));
const EidChecklist = lazy(() => import("./pages/EidChecklist"));
const FitranaCalculator = lazy(() => import("./pages/FitranaCalculator"));
const Settings = lazy(() => import("./pages/Settings"));
const SettingsSubPage = lazy(() => import("./pages/SettingsSubPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SeerahHome = lazy(() => import("./pages/SeerahHome"));
const SeerahReader = lazy(() => import("./pages/SeerahReader"));
const HaidhTracker = lazy(() => import("./pages/HaidhTracker"));
const QisasHome = lazy(() => import("./pages/QisasHome"));
const QisasReader = lazy(() => import("./pages/QisasReader"));

function AnimationInitializer() {
  useEffect(() => {
    const storedAnimationPreference = localStorage.getItem("animations_enabled");
    const isLowEndDeviceCheck = isLowEndDevice();
    let isAnimationDisabled: boolean;

    if (storedAnimationPreference === null) {
      isAnimationDisabled = isLowEndDeviceCheck;
      localStorage.setItem("animations_enabled", isAnimationDisabled.toString());
    } else {
      isAnimationDisabled = storedAnimationPreference === "false";
    }

    if (isAnimationDisabled) {
      document.documentElement.classList.add("no-animations");
    }
    document.documentElement.dataset.animations = isAnimationDisabled ? "off" : "on";
  }, []);
  return null;
}

function AppRoutes() {
  const location = useLocation();
  const { animationEnabled } = useSettings();
  const { t } = useTranslation(undefined, { i18n });

  // Scroll to top on navigation — single pass, no repeated layout thrashing
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      // Only reset the main scroll container instead of querySelectorAll('.overflow-y-auto')
      // which forces a layout query across the whole DOM on every navigation.
      const scrollContainer = document.getElementById("main-content");
      if (scrollContainer) scrollContainer.scrollTop = 0;
    };
    resetScroll();
    // A single deferred reset handles containers that mount after navigation.
    const id = requestAnimationFrame(resetScroll);
    return () => cancelAnimationFrame(id);
  }, [location.pathname]);

  return (
    <Suspense fallback={
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div
            className="animate-spin rounded-full h-12 w-12 border-[3px]"
            style={{
              borderColor: 'var(--surface-2)',
              borderTopColor: 'var(--accent)',
            }}
          />
          <p
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ color: 'var(--accent-text)' }}
          >
            {t('loading')}
          </p>
        </div>
      </div>
    }>
      <AnimatePresence mode="wait" initial={false}>
        {animationEnabled ? (
          <m.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.11, ease: "easeInOut" }}
            className="w-full h-full"
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-widgets" element={<DashboardWidgets />} />
              {/* Widget deep-link targets (WidgetDeeplink.kt) that have no dedicated page */}
              <Route path="/prayers" element={<Navigate to="/dashboard" replace />} />
              <Route path="/quran/reading" element={<Navigate to="/quran-progress" replace />} />
              <Route path="/quran" element={<SurahList />} />
              <Route path="/quran-reader/:surahNumber" element={<Navigate to="/quran" replace />} />
              <Route path="/quran/:surahName" element={<QuranReader />} />
              <Route path="/quran-progress" element={<QuranProgress />} />
              <Route path="/tasbeeh" element={<Tasbeeh />} />
              <Route path="/tasbih" element={<Navigate to="/tasbeeh" replace />} />
              <Route path="/services/tasbih" element={<Navigate to="/tasbeeh" replace />} />
              <Route path="/services/calendar" element={<Navigate to="/calendar" replace />} />
              <Route path="/qibla" element={<Qibla />} />
              <Route path="/duas" element={<Duas />} />
              <Route path="/hadith" element={<Hadith />} />
              <Route path="/hadith/collections" element={<HadithCollections />} />
              <Route path="/hadith/collections/:collection" element={<HadithBook />} />
              <Route path="/hadith/collections/:collection/:book" element={<HadithBookContent />} />
              <Route path="/hadith/collections/:collection/:book/:hadithNumber" element={<HadithDetail />} />
              <Route path="/hadith/bookmarks" element={<HadithBookmarksPage />} />
              <Route path="/seerah" element={<SeerahHome />} />
              <Route path="/seerah/:chapterId" element={<SeerahReader />} />
              <Route path="/qisas" element={<QisasHome />} />
              <Route path="/qisas/:prophetId" element={<QisasReader />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/calendar" element={<IslamicCalendar />} />
              <Route path="/ebooks" element={<Ebooks />} />
              <Route path="/qaza" element={<QazaPage />} />
              <Route path="/ramadan" element={<RamadanMode />} />
              <Route path="/menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
              <Route path="/enhanced-menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
              <Route path="/noor-cycle" element={<HaidhTracker />} />
              <Route path="/notification-history" element={<NotificationHistory />} />
              <Route path="/zakat" element={<ZakatCalculator />} />
              <Route path="/names-of-allah" element={<NamesOfAllah />} />
              <Route path="/quiz" element={<IslamicQuiz />} />
              <Route path="/prayer-stats" element={<PrayerStats />} />
              <Route path="/habit-tracker" element={<HabitTracker />} />
              <Route path="/quran-radio" element={<QuranRadio />} />
              <Route path="/quran-audio" element={<QuranAudio />} />
              <Route path="/nasheeds" element={<NasheedPlayer />} />
              <Route path="/live" element={<LiveStreams />} />
              <Route path="/radio-stats" element={<RadioStats />} />
              <Route path="/services" element={<Services />} />
              <Route path="/islamic-remedies" element={<IslamicRemedies />} />
              <Route path="/remedy-favorites" element={<RemedyFavorites />} />
              <Route path="/tafsir" element={<Tafsir />} />
              <Route path="/eid-checklist" element={<EidChecklist />} />
              <Route path="/fitrana-calculator" element={<FitranaCalculator />} />
              <Route path="/support" element={<Navigate to="/settings/about" replace />} />
              <Route path="/donate" element={<Navigate to="/settings/about" replace />} />
              <Route path="/settings" element={<Navigate to="/profile" replace />} />
              <Route path="/settings/:sectionId" element={<SettingsSubPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </m.div>
        ) : (
          <div key={location.pathname} className="w-full h-full">
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard-widgets" element={<DashboardWidgets />} />
              {/* Widget deep-link targets (WidgetDeeplink.kt) that have no dedicated page */}
              <Route path="/prayers" element={<Navigate to="/dashboard" replace />} />
              <Route path="/quran/reading" element={<Navigate to="/quran-progress" replace />} />
              <Route path="/quran" element={<SurahList />} />
              <Route path="/quran-reader/:surahNumber" element={<Navigate to="/quran" replace />} />
              <Route path="/quran/:surahName" element={<QuranReader />} />
              <Route path="/quran-progress" element={<QuranProgress />} />
              <Route path="/tasbeeh" element={<Tasbeeh />} />
              <Route path="/tasbih" element={<Navigate to="/tasbeeh" replace />} />
              <Route path="/services/tasbih" element={<Navigate to="/tasbeeh" replace />} />
              <Route path="/services/calendar" element={<Navigate to="/calendar" replace />} />
              <Route path="/qibla" element={<Qibla />} />
              <Route path="/duas" element={<Duas />} />
              <Route path="/hadith" element={<Hadith />} />
              <Route path="/hadith/collections" element={<HadithCollections />} />
              <Route path="/hadith/collections/:collection" element={<HadithBook />} />
              <Route path="/hadith/collections/:collection/:book" element={<HadithBookContent />} />
              <Route path="/hadith/collections/:collection/:book/:hadithNumber" element={<HadithDetail />} />
              <Route path="/hadith/bookmarks" element={<HadithBookmarksPage />} />
              <Route path="/seerah" element={<SeerahHome />} />
              <Route path="/seerah/:chapterId" element={<SeerahReader />} />
              <Route path="/qisas" element={<QisasHome />} />
              <Route path="/qisas/:prophetId" element={<QisasReader />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/calendar" element={<IslamicCalendar />} />
              <Route path="/ebooks" element={<Ebooks />} />
              <Route path="/qaza" element={<QazaPage />} />
              <Route path="/ramadan" element={<RamadanMode />} />
              <Route path="/menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
              <Route path="/enhanced-menstrual-mode" element={<Navigate to="/noor-cycle" replace />} />
              <Route path="/noor-cycle" element={<HaidhTracker />} />
              <Route path="/notification-history" element={<NotificationHistory />} />
              <Route path="/zakat" element={<ZakatCalculator />} />
              <Route path="/names-of-allah" element={<NamesOfAllah />} />
              <Route path="/quiz" element={<IslamicQuiz />} />
              <Route path="/prayer-stats" element={<PrayerStats />} />
              <Route path="/habit-tracker" element={<HabitTracker />} />
              <Route path="/quran-radio" element={<QuranRadio />} />
              <Route path="/quran-audio" element={<QuranAudio />} />
              <Route path="/nasheeds" element={<NasheedPlayer />} />
              <Route path="/live" element={<LiveStreams />} />
              <Route path="/radio-stats" element={<RadioStats />} />
              <Route path="/services" element={<Services />} />
              <Route path="/islamic-remedies" element={<IslamicRemedies />} />
              <Route path="/remedy-favorites" element={<RemedyFavorites />} />
              <Route path="/tafsir" element={<Tafsir />} />
              <Route path="/eid-checklist" element={<EidChecklist />} />
              <Route path="/fitrana-calculator" element={<FitranaCalculator />} />
              <Route path="/support" element={<Navigate to="/settings/about" replace />} />
              <Route path="/donate" element={<Navigate to="/settings/about" replace />} />
              <Route path="/settings" element={<Navigate to="/profile" replace />} />
              <Route path="/settings/:sectionId" element={<SettingsSubPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        )}
      </AnimatePresence>
    </Suspense>
  );
}

function AppContent({ splashActive }: { splashActive?: boolean }) {
  const { animationEnabled, greetingEnabled } = useSettings();
  const tier = useAnimationTier();
  const reduceMotion = tier.shouldReduceAnimations;

  return (
    <MotionConfig reducedMotion={(!animationEnabled || reduceMotion) ? "always" : "user"}>
      <LazyMotionWrapper>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="flex flex-col min-h-screen overflow-x-hidden">
            <div className="flex-shrink-0">
              <Suspense fallback={null}>
                <GlobalPrayerAlarm />
                {greetingEnabled && <SalamGreeting splashActive={splashActive} />}
                <FestivePopup />
                <PWAInstallPrompt />
                <EidChecklistNotification />
                <FitranaCalculatorNotification />
                <AutoBackupRestoreDialog />
              </Suspense>
            </div>

            <LayoutManager>
              <ErrorBoundary>
                <HardwareBackButtonHandler />
                <RouteBreadcrumbTracker />
                <DeepLinkListener />
                <AppRoutes />
              </ErrorBoundary>
            </LayoutManager>
          </div>

          <BottomNav />
          <Suspense fallback={null}>
            <GlobalRadioPlayer />
            <GlobalQuranPlayer />
            <GlobalNasheedPlayer />
          </Suspense>
        </BrowserRouter>
      </LazyMotionWrapper>
    </MotionConfig>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { animationEnabled, splashGreetingEnabled, splashEnabled } = useSettings();
  // Always-on auto backup: runs immediately, then every 20 minutes of app use
  // while any page is open (not just the Settings page).
  useAutoBackup();
  // Push Quran-progress + tasbeeh state to native widgets when they change
  useWidgetSync();

  // Sync native Android window and WebView background color immediately on startup
  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem('noor-theme') || localStorage.getItem('noor_theme') || 'oxford-gold') as ThemeId;
      const bgHex = THEME_BG_HEX_MAP[savedTheme] || '#000000';
      (window as any).AndroidBridge?.setNativeThemeBg?.(bgHex);
    } catch {
      // Safe fallback when AndroidBridge is unavailable
    }
  }, []);
  
  // Initialize animation preference (deferred from module scope)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      const storedAnimationPreference = localStorage.getItem("animations_enabled");
      const isLowEndDeviceCheck = isLowEndDevice();
      let isAnimationDisabled: boolean;

      if (storedAnimationPreference === null) {
        isAnimationDisabled = isLowEndDeviceCheck;
        localStorage.setItem("animations_enabled", isAnimationDisabled.toString());
      } else {
        isAnimationDisabled = storedAnimationPreference === "false";
      }

      if (isAnimationDisabled) {
        document.documentElement.classList.add("no-animations");
      }
      document.documentElement.dataset.animations = isAnimationDisabled ? "off" : "on";
    }
  }, []);

  // Apply tiered visual overrides (deferred from module scope)
  const tierInitializedRef = useRef(false);
  useEffect(() => {
    if (!tierInitializedRef.current) {
      tierInitializedRef.current = true;
      applyTieredVisualOverrides(getAnimationTier());
    }
  }, []);

  const splashHandoffDoneRef = useRef(false);
  const handleSplashComplete = useCallback(() => {
    if (splashHandoffDoneRef.current) return;
    splashHandoffDoneRef.current = true;

    markStartupStep('splash-handoff');
    try {
      setShowSplash(false);
      forceReleaseSplashScrollLock();
    } catch (e) {
      console.warn('Splash handoff error', e);
    } finally {
      completeStartupStep('splash-handoff');
    }
  }, []);

  // Safety fallback: ensure splash screen handoff always completes cleanly within 2.5s
  useEffect(() => {
    if (!splashEnabled) {
      handleSplashComplete();
      forceReleaseSplashScrollLock();
      return;
    }
    const timer = setTimeout(() => {
      if (!splashHandoffDoneRef.current) {
        handleSplashComplete();
        forceReleaseSplashScrollLock();
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [splashEnabled, handleSplashComplete]);

  // Initialize performance optimizations
  useEffect(() => {
    try {
      preloadCriticalResources();
    } catch (e) {
      console.warn('preloadCriticalResources failed', e);
    }

    // ── FPS monitor: DEV only ─────────────────────────────────────────────
    if (import.meta.env.DEV) {
      try {
        const stopFPS = monitorFPS((fps: number) => {
          const style =
            fps >= 55
              ? 'color:#4ade80;font-weight:bold'
              : fps >= 30
              ? 'color:#facc15;font-weight:bold'
              : 'color:#f87171;font-weight:bold';
          console.debug(`%c[FPS] ${fps}`, style);
        });
        return () => {
          stopFPS();
        };
      } catch {
        // silent fallback - intentional, see stability hardening notes
      }
    }
  }, []);

  useEffect(() => {
    markStartupStep('app-shell-mount');
    completeStartupStep('app-shell-mount');

    // 1. Notification service init
    markStartupStep('notification-service-init');
    try {
      notificationManager.start();
    } catch (e) {
      console.warn('Startup: notificationManager.start failed', e);
    } finally {
      completeStartupStep('notification-service-init');
    }

    // 2. Backup service init & auto snapshot
    markStartupStep('backup-restore');
    try {
      initBackupService();
    } catch (e) {
      console.warn('Startup: initBackupService failed', e);
    } finally {
      completeStartupStep('backup-restore');
    }
    
    // 3. Safety clear for Ramadan notifications if it's not Ramadan
    try {
      import('@/lib/islamic-calendar-service').then(async ({ islamicCalendarService }) => {
        try {
          const info = await islamicCalendarService.getIslamicCalendarInfo();
          if (info.hijriMonth !== 9) {
            const { RamadanNotifications } = await import('@/lib/ramadan-notifications');
            const instance = RamadanNotifications.getInstance();
            await instance.clearRamadanNotifications();
          }
        } catch (e) {
          console.warn('Failed to safety clear Ramadan notifications', e);
        }
      }).catch(e => console.warn('Failed to import islamic-calendar-service', e));
    } catch (e) {
      console.warn('Startup: islamic-calendar-service failed', e);
    }

    // 4. Schedule upcoming Islamic events
    markStartupStep('islamic-events-init');
    try {
      islamicEventsService.scheduleUpcomingEvents()
        .catch(error => {
          console.warn('Failed to schedule Islamic events:', error);
        })
        .finally(() => {
          completeStartupStep('islamic-events-init');
        });
    } catch (e) {
      completeStartupStep('islamic-events-init');
      console.warn('Startup: islamicEventsService failed', e);
    }

    // 5. Service worker registration (PWA - web production only)
    markStartupStep('service-worker-init');
    try {
      if (!Capacitor.isNativePlatform() && import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !navigator.serviceWorker.controller) {
        serviceWorkerManager.register()
          .catch((err) => {
            // Handled service worker registration error
            console.warn('Service worker registration failed:', err);
          })
          .finally(() => {
            completeStartupStep('service-worker-init');
          });
      } else {
        completeStartupStep('service-worker-init');
      }
    } catch (e) {
      completeStartupStep('service-worker-init');
      console.warn('Startup: serviceWorkerManager failed', e);
    }

    // 6. Widget auto-update initialization
    markStartupStep('widget-auto-update-init');
    try {
      const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (savedLocation) {
        const { latitude, longitude, locationName } = JSON.parse(savedLocation);
        import('@/lib/widget-service').then(({ WidgetService }) => {
          try {
            WidgetService.startAutoUpdate(latitude, longitude, locationName);
          } catch (e) {
            console.warn('Failed to start widget auto-update', e);
          } finally {
            completeStartupStep('widget-auto-update-init');
          }
        }).catch(err => {
          console.warn('Failed to import widget-service', err);
          completeStartupStep('widget-auto-update-init');
        });
      } else {
        completeStartupStep('widget-auto-update-init');
      }
    } catch (err) {
      completeStartupStep('widget-auto-update-init');
      console.warn('Startup: widget auto-update failed', err);
    }

    // 7. First-launch permission onboarding sequence (Step A: background dialog -> Step B: exact alarm settings)
    markStartupStep('onboarding-permissions-init');
    try {
      if (Capacitor.isNativePlatform()) {
        runFirstLaunchPermissionOnboarding()
          .catch((err) => {
            // Handled non-critical error during first-launch permission onboarding
            console.warn('Startup permission onboarding error:', err);
          })
          .finally(() => {
            completeStartupStep('onboarding-permissions-init');
          });
      } else {
        completeStartupStep('onboarding-permissions-init');
      }
    } catch (e) {
      completeStartupStep('onboarding-permissions-init');
      console.warn('Startup: onboarding permissions failed', e);
    }

    // ── Defensive Resume Handler (idempotent, guarded) ──
    const handleResume = () => {
      // Check pending onboarding Step B (if Step A completed but Step B was interrupted/missed)
      try {
        if (Capacitor.isNativePlatform()) {
          import('@/lib/onboarding-permissions').then(({ checkPendingOnboardingStepB }) => {
            checkPendingOnboardingStepB?.().catch((err) => {
              // Handled resume pending onboarding check error
              console.warn('Resume onboarding check error:', err);
            });
          }).catch((err) => {
            // Handled onboarding-permissions import error
            console.warn('Resume onboarding import failed:', err);
          });
        }
      } catch (e) {
        // Handled resume handler exception
        console.warn('Resume: onboarding step B check error', e);
      }

      // Re-check exact alarms
      try {
        if (Capacitor.isNativePlatform()) {
          import('@/lib/native-adhan').then(({ isExactAlarmPermissionGranted }) => {
            isExactAlarmPermissionGranted?.().catch((err) => {
              // Handled resume exact alarm verification error
              console.warn('Resume exact alarm check skipped:', err);
            });
          }).catch((err) => {
            // Handled resume native adhan import error
            console.warn('Resume native-adhan import failed:', err);
          });
        }
      } catch (e) {
        // Handled resume handler exception
        console.warn('Resume: exact-alarm check error', e);
      }

      // Re-sync widgets
      try {
        const loc = localStorage.getItem(LOCATION_STORAGE_KEY);
        if (loc) {
          const { latitude, longitude, locationName } = JSON.parse(loc);
          import('@/lib/widget-service').then(({ WidgetService }) => {
            WidgetService.startAutoUpdate?.(latitude, longitude, locationName);
          }).catch(() => {
            // Handled background widget resume update error
          });
        }
      } catch (e) {
        console.warn('Resume: widget sync error', e);
      }

      // Re-check missed notifications
      try {
        notificationManager.checkMissedNotifications?.();
      } catch (e) {
        console.warn('Resume: notification check error', e);
      }
    };

    let resumeSubCleanup: (() => void) | null = null;
    try {
      const subPromise = CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          handleResume();
        }
      });
      resumeSubCleanup = () => {
        subPromise.then(handle => handle.remove?.()).catch(() => {});
      };
    } catch {
      // silent fallback - intentional, see stability hardening notes
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      try {
        notificationManager.stop();
      } catch (e) {
        console.warn('Cleanup: notificationManager.stop failed', e);
      }
      if (resumeSubCleanup) {
        resumeSubCleanup();
      }
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      {/* Exact-alarm rationale modal — singleton, shown before system settings */}
      <ExactAlarmPermissionDialog />
      <AnimatePresence>
        {showSplash && splashEnabled && (
          <SplashScreen
            animationsEnabled={animationEnabled}
            showGreeting={splashGreetingEnabled}
            onComplete={handleSplashComplete}
          />
        )}
      </AnimatePresence>
      <AppContent splashActive={showSplash && splashEnabled} />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <AppShell />
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
