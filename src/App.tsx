import { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { notificationManager } from "@/lib/notification-manager";
import { serviceWorkerManager } from "@/lib/service-worker-registration";
import { getPerformanceMonitor } from "@/lib/performance-monitor";
import { islamicEventsService } from "@/lib/islamic-events-service";
import { LayoutManager } from "@/components/LayoutManager";
import { SplashScreen } from "@/components/SplashScreen";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n-new";
import { LOCATION_STORAGE_KEY } from "@/lib/location-config";

// Global Players
import { GlobalRadioPlayer } from "@/components/GlobalRadioPlayer";
import { GlobalQuranPlayer } from "@/components/GlobalQuranPlayer";
import { EidChecklistNotification } from "@/components/EidChecklistNotification";
import { FitranaCalculatorNotification } from "@/components/FitranaCalculatorNotification";

// Lazy load critical components
const GlobalPrayerAlarm = lazy(() => import("@/components/GlobalPrayerAlarm").then(module => ({ default: module.GlobalPrayerAlarm })));
const SalamGreeting = lazy(() => import("@/components/SalamGreeting").then(module => ({ default: module.SalamGreeting })));
const FestivePopup = lazy(() => import("@/components/FestivePopup").then(module => ({ default: module.FestivePopup })));
const PWAInstallPrompt = lazy(() => import("@/components/PWAInstallPrompt").then(module => ({ default: module.PWAInstallPrompt })));

// Lazy load route components
const Dashboard = lazy(() => import("./pages/Dashboard"));
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
const Profile = lazy(() => import("./pages/Profile"));
const IslamicCalendar = lazy(() => import("./pages/IslamicCalendar"));
const Ebooks = lazy(() => import("./pages/EbooksModern"));
const QazaPage = lazy(() => import("./pages/QazaPage"));
const RamadanMode = lazy(() => import("./pages/RamadanMode"));
const MenstrualMode = lazy(() => import("@/pages/MenstrualMode"));
import { EnhancedMenstrualMode as EnhancedMenstrualModePage } from "@/pages/EnhancedMenstrualMode";
const NotificationHistory = lazy(() => import("./pages/NotificationHistory"));
const ZakatCalculator = lazy(() => import("./pages/ZakatCalculator"));
const NamesOfAllah = lazy(() => import("./pages/NamesOfAllah"));
const IslamicQuiz = lazy(() => import("./pages/EnhancedIslamicQuiz"));
const PrayerStats = lazy(() => import("./pages/PrayerStats"));
const HabitTracker = lazy(() => import("./pages/HabitTracker"));
const QuranRadio = lazy(() => import("./pages/QuranRadio"));
const QuranAudio = lazy(() => import("./pages/QuranAudio"));
const LiveStreams = lazy(() => import("./pages/LiveStreams"));
const RadioStats = lazy(() => import("./pages/RadioStats"));
const Services = lazy(() => import("./pages/Services"));
const IslamicRemedies = lazy(() => import("./pages/IslamicRemedies"));
const RemedyFavorites = lazy(() => import("./pages/RemedyFavorites"));
const Tafsir = lazy(() => import("./pages/Tafsir-New"));
const EidChecklist = lazy(() => import("./pages/EidChecklist"));
const FitranaCalculator = lazy(() => import("./pages/FitranaCalculator"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Apply initial animation state from localStorage (will be updated by SettingsContext when it loads)
const isAnimationDisabled = localStorage.getItem("animations_enabled") === "false";
if (isAnimationDisabled) {
  document.documentElement.classList.add("no-animations");
}
document.documentElement.dataset.animations = isAnimationDisabled ? "off" : "on";

function AppRoutes() {
  const location = useLocation();
  const { t } = useTranslation(undefined, { i18n });

  // Scroll to top on navigation
  useEffect(() => {
    const resetScroll = () => {
      window.scrollTo(0, 0);
      const scrollContainer = document.getElementById("main-content");
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      // Reset any inner scrolling containers (like in PremiumDashboard)
      document.querySelectorAll('.overflow-y-auto').forEach(el => {
        el.scrollTop = 0;
      });
    };
    
    resetScroll();
    setTimeout(resetScroll, 10);
    setTimeout(resetScroll, 100);
  }, [location.pathname]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1128] via-[#1a237e] to-[#0d1b2a] relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#e0c097] rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-[#4fd1c5] rounded-full opacity-[0.03] blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full border-2 border-[#e0c097]/20 scale-150" />
            <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-[#e0c097]/30 border-t-[#e0c097]" />
            <div className="absolute inset-2 rounded-full bg-[#e0c097] blur-xl opacity-30 animate-pulse" />
          </div>
          <div className="glass-card px-6 py-3 rounded-2xl">
            <p className="text-[#e0c097] text-sm font-semibold tracking-widest uppercase">{t('loading')}</p>
          </div>
        </div>
      </div>
    }>
      <Routes location={location}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-widgets" element={<DashboardWidgets />} />
        <Route path="/quran" element={<SurahList />} />
        <Route path="/quran-reader/:surahNumber" element={<Navigate to="/quran" replace />} />
        <Route path="/mushaf/:surahNumber" element={<Navigate to="/quran" replace />} />
        <Route path="/mushaf-viewer" element={<Navigate to="/quran" replace />} />
        <Route path="/quran/:surahName" element={<QuranReader />} />
        <Route path="/quran-progress" element={<QuranProgress />} />
        <Route path="/tasbeeh" element={<Tasbeeh />} />
        <Route path="/qibla" element={<Qibla />} />
        <Route path="/duas" element={<Duas />} />
        <Route path="/hadith" element={<Hadith />} />
        <Route path="/hadith/collections" element={<HadithCollections />} />
        <Route path="/hadith/collections/:collection" element={<HadithBook />} />
        <Route path="/hadith/collections/:collection/:book" element={<HadithBookContent />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/calendar" element={<IslamicCalendar />} />
        <Route path="/ebooks" element={<Ebooks />} />
        <Route path="/qaza" element={<QazaPage />} />
        <Route path="/ramadan" element={<RamadanMode />} />
        <Route path="/menstrual-mode" element={<MenstrualMode />} />
        <Route path="/enhanced-menstrual-mode" element={<EnhancedMenstrualModePage />} />
        <Route path="/notification-history" element={<NotificationHistory />} />
        <Route path="/zakat" element={<ZakatCalculator />} />
        <Route path="/names-of-allah" element={<NamesOfAllah />} />
        <Route path="/quiz" element={<IslamicQuiz />} />
        <Route path="/prayer-stats" element={<PrayerStats />} />
        <Route path="/habit-tracker" element={<HabitTracker />} />
        <Route path="/quran-radio" element={<QuranRadio />} />
        <Route path="/quran-audio" element={<QuranAudio />} />
        <Route path="/live" element={<LiveStreams />} />
        <Route path="/radio-stats" element={<RadioStats />} />
        <Route path="/services" element={<Services />} />
        <Route path="/islamic-remedies" element={<IslamicRemedies />} />
        <Route path="/remedy-favorites" element={<RemedyFavorites />} />
        <Route path="/tafsir" element={<Tafsir />} />
        <Route path="/eid-checklist" element={<EidChecklist />} />
        <Route path="/fitrana-calculator" element={<FitranaCalculator />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AppContent() {
  const { animationEnabled, greetingEnabled } = useSettings();
  
  return (
    <MotionConfig reducedMotion={animationEnabled ? "never" : "always"}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="flex flex-col min-h-screen overflow-hidden">
          <div className="flex-shrink-0">
            <Suspense fallback={null}>
              <GlobalPrayerAlarm />
              {greetingEnabled && <SalamGreeting />}
              <FestivePopup />
              <PWAInstallPrompt />
              <EidChecklistNotification />
              <FitranaCalculatorNotification />
            </Suspense>
          </div>

          <LayoutManager>
            <ErrorBoundary>
              <AppRoutes />
            </ErrorBoundary>
          </LayoutManager>
        </div>

        <BottomNav />
        <GlobalRadioPlayer />
        <GlobalQuranPlayer />
      </BrowserRouter>
    </MotionConfig>
  );
}

function AppShell() {
  const [showSplash, setShowSplash] = useState(true);
  const { animationEnabled, splashGreetingEnabled } = useSettings();

  useEffect(() => {
    const monitor = getPerformanceMonitor();
    notificationManager.start();
    
    islamicEventsService.scheduleUpcomingEvents().catch(error => {
      console.error('Failed to schedule Islamic events:', error);
    });

    if (import.meta.env.PROD && !navigator.serviceWorker.controller) {
      serviceWorkerManager.register();
    }

    const savedLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (savedLocation) {
      try {
        const { latitude, longitude, locationName } = JSON.parse(savedLocation);
        import('@/lib/widget-service').then(({ WidgetService }) => {
          WidgetService.startAutoUpdate(latitude, longitude, locationName);
        });
      } catch (err) {
        console.warn('Failed to start widget auto-update', err);
      }
    }

    return () => {
      monitor.destroy();
      notificationManager.stop();
    };
  }, []);

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AnimatePresence>
        {showSplash && (
          <SplashScreen
            animationsEnabled={animationEnabled}
            showGreeting={splashGreetingEnabled}
            onComplete={() => setShowSplash(false)}
          />
        )}
      </AnimatePresence>
      <AppContent />
    </TooltipProvider>
  );
}

function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

export default App;
