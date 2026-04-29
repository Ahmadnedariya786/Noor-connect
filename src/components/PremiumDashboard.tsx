import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useDailyInspirations } from "@/lib/daily-content";
import { 
  Bell, 
  ChevronRight, 
  Wallet, 
  BookOpen, 
  Sun, 
  Moon, 
  Sunset, 
  Cloud, 
  CloudMoon, 
  Info,
  Calendar,
  MapPin,
  Compass,
  Trophy,
  Activity,
  Calculator,
  Grid3X3,
  Heart,
  MessageCircle
} from "lucide-react";

interface PrayerTime {
  name: string;
  time: string;
  icon: React.ReactNode;
  isActive?: boolean;
  isUpcoming?: boolean;
}

interface PremiumDashboardProps {
  currentTime: Date;
  hijriDate: string;
  nextPrayer: {
    name: string;
    time: string;
    timeRemaining: string;
    progress: number;
  };
  prayers: PrayerTime[];
  locationLabel: string;
  onServiceClick?: (route: string) => void;
  onVerseClick?: () => void;
  onHadithClick?: () => void;
  onNotificationClick?: () => void;
  onLocationClick?: () => void;
  showManualLocationDialog: boolean;
  setShowManualLocationDialog: (show: boolean) => void;
  LocationSearch: any;
  GeocodingService: any;
  AladhanAPI: any;
  location: any;
  prayerTimesHook: any;
  setLoadingAPI: (loading: boolean) => void;
  toast: any;
}

const faithServices = [
  {
    id: 'zakat',
    title: 'Zakat Calculator',
    subtitle: 'Financial Obligation',
    description: 'Calculate your obligatory charity with ease and precision using our modern tool.',
    icon: Wallet,
    color: 'emerald',
    route: '/zakat-calculator',
    actionText: 'Start Calculating'
  },
  {
    id: 'qibla',
    title: 'Qibla Finder',
    subtitle: 'Accurate Direction',
    description: 'Find the exact direction of the Kaaba from anywhere in the world.',
    icon: Compass,
    color: 'blue',
    route: '/qibla',
    actionText: 'Open Compass'
  },
  {
    id: 'achievements',
    title: 'Deen Journey',
    subtitle: 'Track Progress',
    description: 'Earn badges and track your spiritual growth throughout the month.',
    icon: Trophy,
    color: 'amber',
    route: '/achievements',
    actionText: 'View Journey'
  },
  {
    id: 'tasbeeh',
    title: 'Digital Tasbeeh',
    subtitle: 'Remembrance',
    description: 'Keep track of your dhikr with our elegant haptic-enabled counter.',
    icon: Activity,
    color: 'purple',
    route: '/tasbeeh',
    actionText: 'Start Dhikr'
  }
];

export const PremiumDashboard: React.FC<PremiumDashboardProps> = ({
  currentTime,
  hijriDate,
  nextPrayer,
  prayers,
  locationLabel,
  onServiceClick,
  onVerseClick,
  onHadithClick,
  onNotificationClick,
  onLocationClick,
  showManualLocationDialog,
  setShowManualLocationDialog,
  LocationSearch,
  GeocodingService,
  AladhanAPI,
  location,
  prayerTimesHook,
  setLoadingAPI,
  toast,
}) => {
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [activeInspirationIndex, setActiveInspirationIndex] = useState(0);
  const dailyInspirations = useDailyInspirations();

  // Rotation for services
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveServiceIndex((prev) => (prev + 1) % faithServices.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Rotation for inspirations
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveInspirationIndex((prev) => (prev + 1) % dailyInspirations.length);
    }, 8000); // Slightly longer for reading
    return () => clearInterval(timer);
  }, [dailyInspirations.length]);

  const activeService = faithServices[activeServiceIndex];
  const activeInspiration = dailyInspirations[activeInspirationIndex];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Manual Location Dialog - MOVED INSIDE PREMIUM DASHBOARD */}
      {showManualLocationDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-background rounded-[32px] max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden border border-border/50 shadow-2xl"
          >
            <div className="p-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black tracking-tight">Set Location</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-muted"
                  onClick={() => setShowManualLocationDialog(false)}
                >
                  <Grid3X3 className="w-5 h-5 rotate-45" />
                </Button>
              </div>
              
              <div className="space-y-6">
                {/* Automatic Detection Button */}
                <Button
                  onClick={async () => {
                    const success = await location.detectLocation();
                    if (success) {
                      toast({
                        title: "Location Detected",
                        description: `Updated to ${location.locationName}`
                      });
                      setShowManualLocationDialog(false);
                    } else {
                      toast({
                        title: "Detection Failed",
                        description: "Please enable location permissions",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={location.isDetecting}
                  className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-base shadow-lg shadow-emerald-600/20 gap-3"
                >
                  {location.isDetecting ? (
                    <Activity className="w-5 h-5 animate-spin" />
                  ) : (
                    <Compass className="w-5 h-5" />
                  )}
                  {location.isDetecting ? "Detecting..." : "Auto-Detect (GPS/IP)"}
                </Button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-border"></div>
                  <span className="flex-shrink mx-4 text-xs font-black uppercase tracking-widest text-muted-foreground/50">OR SEARCH</span>
                  <div className="flex-grow border-t border-border"></div>
                </div>

                <div className="space-y-4">
                  <p className="text-muted-foreground text-sm font-medium">
                    Search for your city to get accurate prayer times for your region.
                  </p>
                  <LocationSearch
                    onLocationSelect={async (city: string, country: string) => {
                      try {
                        setLoadingAPI(true);
                        AladhanAPI.clearCachedData();
                        const coords = await GeocodingService.getCityCoordinates(city, country);
                        const result = await AladhanAPI.getTodaysPrayerTimes(
                          coords.latitude,
                          coords.longitude,
                          1
                        );
                        const fetchedTimezone = result.timezone;

                        location.setLocation(
                          coords.latitude,
                          coords.longitude,
                          `${city}, ${country}`,
                          fetchedTimezone
                        );

                        await prayerTimesHook.setManualLocation(city, country);
                        setShowManualLocationDialog(false);
                        toast({
                          title: "Location Updated",
                          description: `Time adjusted to ${fetchedTimezone}`
                        });
                      } catch (err) {
                        console.error('[Dashboard] Location selection error:', err);
                        toast({
                          title: "Selection Failed",
                          description: "Could not sync timezone. Please try again.",
                          variant: "destructive"
                        });
                      } finally {
                        setLoadingAPI(false);
                      }
                    }}
                    isLoading={prayerTimesHook.isLoading}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="w-6" /> {/* Spacer */}
        <h1 className="text-xl font-bold text-emerald-600 dark:text-emerald-500">Noor Connect</h1>
        <button 
          onClick={onNotificationClick}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <Bell className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
        </button>
      </header>

      <main className="flex-1 px-5 pb-24 space-y-6 overflow-y-auto max-w-lg mx-auto w-full">
        {/* Time and Hijri Date with subtle glow */}
        <div className="flex flex-col items-center justify-center py-8 relative">
          <div className="absolute inset-0 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-8xl font-black tracking-tighter text-emerald-950 dark:text-white drop-shadow-sm"
          >
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </motion.h2>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold text-sm tracking-wide shadow-sm border border-emerald-100 dark:border-emerald-800/50"
          >
            <Calendar className="w-4 h-4" />
            <span>{hijriDate}</span>
          </motion.div>
        </div>

        {/* Next Prayer Card - High End Gradient */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.01 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 shadow-2xl shadow-emerald-900/20 text-white"
        >
          {/* Animated decorative element */}
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-10 -right-10 opacity-10 pointer-events-none"
          >
            <Sun className="w-48 h-48" />
          </motion.div>

          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100/70 mb-2">Up Next</p>
                <h3 className="text-3xl font-black tracking-tight">{nextPrayer.name} Prayer</h3>
              </div>
              <div className="bg-white/20 backdrop-blur-md text-white px-5 py-2 rounded-2xl text-lg font-black border border-white/10 shadow-lg">
                {nextPrayer.time}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end text-sm">
                <span className="text-emerald-100/80 font-medium">Time Remaining</span>
                <span className="text-white font-black text-lg">{nextPrayer.timeRemaining}</span>
              </div>
              <div className="h-2.5 w-full bg-black/10 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${nextPrayer.progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Prayer Schedule - Premium List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">Today's Schedule</h3>
            <button 
              onClick={onLocationClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{locationLabel}</span>
              <ChevronRight className="w-3 h-3 opacity-50" />
            </button>
          </div>

          <div className="space-y-3">
            {prayers.map((prayer, index) => (
              <motion.div
                key={prayer.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "flex items-center justify-between p-5 rounded-[24px] transition-all border group",
                  prayer.isActive 
                    ? "bg-white dark:bg-emerald-900/20 border-emerald-500 shadow-xl shadow-emerald-500/10 ring-2 ring-emerald-500/10" 
                    : "bg-card border-border/40 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300",
                    prayer.isActive 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110" 
                      : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105"
                  )}>
                    {prayer.icon}
                  </div>
                  <div>
                    <span className={cn(
                      "font-black text-lg tracking-tight block",
                      prayer.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-950 dark:text-emerald-100"
                    )}>
                      {prayer.name}
                    </span>
                    {prayer.isUpcoming && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-pulse">Upcoming</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "font-black text-xl tracking-tighter",
                    prayer.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-emerald-950/40 dark:text-emerald-100/40"
                  )}>
                    {prayer.time}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Services Section with Auto-Changing Carousel */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">Faith Services</h3>
            <div className="flex gap-1">
              {faithServices.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === activeServiceIndex ? "w-4 bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-800"
                  )}
                />
              ))}
            </div>
          </div>
          
          <div className="relative h-[280px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeService.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onClick={() => onServiceClick?.(activeService.route)}
                className={cn(
                  "absolute inset-0 overflow-hidden rounded-[32px] p-8 text-white shadow-2xl group cursor-pointer border border-white/5",
                  activeService.color === 'emerald' && "bg-emerald-950 dark:bg-emerald-900",
                  activeService.color === 'blue' && "bg-blue-950 dark:bg-blue-900",
                  activeService.color === 'amber' && "bg-amber-950 dark:bg-amber-900",
                  activeService.color === 'purple' && "bg-purple-950 dark:bg-purple-900"
                )}
              >
                {/* Dynamic Background Glow based on service color */}
                <div className={cn(
                  "absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full group-hover:scale-110 transition-all duration-700 opacity-20",
                  activeService.color === 'emerald' && "bg-emerald-500",
                  activeService.color === 'blue' && "bg-blue-500",
                  activeService.color === 'amber' && "bg-amber-500",
                  activeService.color === 'purple' && "bg-purple-500"
                )} />
                
                <div className="relative z-10 flex flex-col items-start gap-6">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-14 h-14 backdrop-blur-md rounded-2xl flex items-center justify-center border shadow-inner",
                      activeService.color === 'emerald' && "bg-emerald-500/20 border-emerald-500/30",
                      activeService.color === 'blue' && "bg-blue-500/20 border-blue-500/30",
                      activeService.color === 'amber' && "bg-amber-500/20 border-amber-500/30",
                      activeService.color === 'purple' && "bg-purple-500/20 border-purple-500/30"
                    )}>
                      <activeService.icon className={cn(
                        "w-7 h-7",
                        activeService.color === 'emerald' && "text-emerald-400",
                        activeService.color === 'blue' && "text-blue-400",
                        activeService.color === 'amber' && "text-amber-400",
                        activeService.color === 'purple' && "text-purple-400"
                      )} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black tracking-tight">{activeService.title}</h4>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-[0.2em]",
                        activeService.color === 'emerald' && "text-emerald-400/80",
                        activeService.color === 'blue' && "text-blue-400/80",
                        activeService.color === 'amber' && "text-amber-400/80",
                        activeService.color === 'purple' && "text-purple-400/80"
                      )}>{activeService.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-white/70 text-base font-medium max-w-xs leading-relaxed">
                    {activeService.description}
                  </p>
                  
                  <Button 
                    variant="secondary" 
                    className={cn(
                      "rounded-2xl font-black px-8 h-12 text-base transition-all duration-300 shadow-lg text-white",
                      activeService.color === 'emerald' && "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20",
                      activeService.color === 'blue' && "bg-blue-500 hover:bg-blue-400 shadow-blue-500/20",
                      activeService.color === 'amber' && "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20",
                      activeService.color === 'purple' && "bg-purple-500 hover:bg-purple-400 shadow-purple-500/20"
                    )}
                  >
                    {activeService.actionText}
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Daily Inspiration Section - Auto-Changing */}
        <section className="space-y-4 pb-12">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-black tracking-tight text-emerald-950 dark:text-emerald-50">Daily Inspiration</h3>
            <div className="flex gap-1">
              {dailyInspirations.map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-300",
                    i === activeInspirationIndex ? "w-4 bg-emerald-500" : "bg-emerald-200 dark:bg-emerald-800"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="relative h-[240px] sm:h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeInspiration.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                onClick={() => activeInspiration.type === 'ayah' ? onVerseClick?.() : onHadithClick?.()}
                className="absolute inset-0 rounded-[32px] bg-white dark:bg-card border border-border/40 p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-8 cursor-pointer hover:border-emerald-500/30 transition-all overflow-hidden"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center rounded-[24px] text-emerald-600 dark:text-emerald-400 shadow-inner shrink-0 group">
                  {activeInspiration.type === 'ayah' ? (
                    <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
                  ) : (
                    <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-110 transition-transform" />
                  )}
                </div>
                <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-black text-xl tracking-tight text-emerald-950 dark:text-white truncate">
                      {activeInspiration.title}
                    </h4>
                    <div className="px-3 py-1 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full self-center sm:self-auto shadow-md">
                      {activeInspiration.type === 'ayah' ? 'Verse' : 'Hadith'}
                    </div>
                  </div>
                  <p className="text-emerald-950/60 dark:text-emerald-100/60 font-medium italic text-base sm:text-lg leading-relaxed line-clamp-2">
                    "{activeInspiration.content}"
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <div className="w-6 h-0.5 bg-emerald-500/30 rounded-full" />
                    <p className="text-emerald-600 dark:text-emerald-500 text-xs font-black uppercase tracking-[0.2em] truncate">
                      {activeInspiration.subtitle}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </main>
    </div>
  );
};

export default PremiumDashboard;
