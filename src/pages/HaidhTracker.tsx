import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Calendar as CalIcon, Droplets, BookOpen, Settings as SettingsIcon, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { goBackOrFallback } from "@/lib/navigation";
import { PRAYER_ALARM_CONTROL_EVENT, PRAYER_ALARM_TOGGLE_EVENT } from "@/lib/prayer-alarm-events";

import {
  getHaidhData,
  getFiqhStatus,
  startCycle,
  endCycle,
  logDay,
  updateSettings,
  type HaidhTrackerData,
  type DailyLog
} from "@/lib/haidh-tracker";
import { syncHaidhNotifications } from "@/lib/haidh-notifications";

import { HaidhTodayTab as TodayTab } from "@/components/haidh/HaidhTodayTab";
import { HaidhCalendarTab as CalendarTab } from "@/components/haidh/HaidhCalendarTab";
import { HaidhLogTab as LogTab } from "@/components/haidh/HaidhLogTab";
import { HaidhIslamicTab as IslamicTab } from "@/components/haidh/HaidhIslamicTab";
import { HaidhSettingsTab as SettingsTab } from "@/components/haidh/HaidhSettingsTab";

const TABS = [
  { id: "today", icon: HeartPulse, label: "Today" },
  { id: "calendar", icon: CalIcon, label: "Calendar" },
  { id: "log", icon: Droplets, label: "Log" },
  { id: "islamic", icon: BookOpen, label: "Fiqh" },
  { id: "settings", icon: SettingsIcon, label: "Settings" },
] as const;

export default function HaidhTracker() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["id"]>("today");
  const [data, setData] = useState<HaidhTrackerData>(getHaidhData());
  const [fiqh, setFiqh] = useState(getFiqhStatus(getHaidhData()));
  const [isAuthenticated, setIsAuthenticated] = useState(!getHaidhData().pinCode);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      const newData = getHaidhData();
      setData(newData);
      setFiqh(getFiqhStatus(newData));
    };
    window.addEventListener("haidh-tracker-updated", handleUpdate);
    return () => window.removeEventListener("haidh-tracker-updated", handleUpdate);
  }, []);

  // Reconcile reminders whenever the underlying data changes.
  useEffect(() => {
    void syncHaidhNotifications(data);
  }, [data]);

  const handleStart = async (type: 'haidh' | 'nifas') => {
    const updated = startCycle(new Date(), type);

    localStorage.setItem("prayer-alarm-enabled", "false");
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: false } }));
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: "stop" } }));

    if (updated.pausePrayerNotifications) {
      try {
        const { localNotifications } = await import("@/lib/local-notifications");
        await localNotifications.clearPrayerNotifications();
      } catch (error) {
        console.error("Failed to clear prayer notifications", error);
      }
    }
  };

  const handleEnd = async () => {
    endCycle();
    const updated = getHaidhData();

    localStorage.setItem("prayer-alarm-enabled", "true");
    window.dispatchEvent(new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: true } }));

    if (updated.pausePrayerNotifications) {
      try {
        const { localNotifications } = await import("@/lib/local-notifications");
        await localNotifications.schedulePrayerNotificationsFromAPI();
      } catch (error) {
        console.error("Failed to reschedule prayer notifications", error);
      }
    }
  };
  const handleLog = (log: Partial<DailyLog>) => logDay(new Date(), log);
  const handleSettingsUpdate = (patch: Partial<HaidhTrackerData>) => updateSettings(patch);

  const goBack = () => goBackOrFallback(navigate, "/");

  const handlePinSubmit = () => {
    if (pinInput === data.pinCode) {
      setIsAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput("");
      setTimeout(() => setPinError(false), 1000);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-background text-foreground z-[100] flex flex-col items-center justify-center p-5">
        <button
          onClick={goBack}
          aria-label="Go back"
          className="absolute top-6 left-5 w-10 h-10 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors border border-border"
        >
          <ChevronLeft className="w-5 h-5 text-foreground/90" />
        </button>

        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-8 border border-rose-500/20">
          <HeartPulse className="w-10 h-10 text-rose-500" />
        </div>
        
        <h1 className="text-2xl font-black mb-2 tracking-tight">Noor Cycle</h1>
        <p className="text-muted-foreground text-center mb-8 text-sm">Enter your PIN to access your tracker</p>

        <div className="flex gap-3 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-300",
                pinInput.length > i ? "bg-rose-500 border-rose-500" : "border-border",
                pinError && "border-red-500 bg-red-500/20 animate-shake"
              )}
            />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-[280px] w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => {
                if (pinInput.length < 4) {
                  const newPin = pinInput + num;
                  setPinInput(newPin);
                  if (newPin.length === 4) {
                    setTimeout(() => {
                      if (newPin === data.pinCode) {
                        setIsAuthenticated(true);
                        setPinError(false);
                      } else {
                        setPinError(true);
                        setPinInput("");
                      }
                    }, 100);
                  }
                }
              }}
              className="w-full aspect-square rounded-full flex items-center justify-center text-2xl font-medium bg-muted/50 hover:bg-muted active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => {
              if (pinInput.length < 4) {
                const newPin = pinInput + "0";
                setPinInput(newPin);
                if (newPin.length === 4) {
                  setTimeout(() => {
                    if (newPin === data.pinCode) {
                      setIsAuthenticated(true);
                      setPinError(false);
                    } else {
                      setPinError(true);
                      setPinInput("");
                    }
                  }, 100);
                }
              }
            }}
            className="w-full aspect-square rounded-full flex items-center justify-center text-2xl font-medium bg-muted/50 hover:bg-muted active:scale-95 transition-all"
          >
            0
          </button>
          <button
            onClick={() => setPinInput((prev) => prev.slice(0, -1))}
            className="w-full aspect-square rounded-full flex items-center justify-center text-sm font-bold bg-muted/50 hover:bg-muted active:scale-95 transition-all text-muted-foreground"
          >
            DEL
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background text-foreground z-[100]">
      {/* ── Left Sidebar ─────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 z-50 w-[72px] bg-card/80 backdrop-blur-2xl border-r border-border flex flex-col items-center pt-16 pb-20">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center w-[56px] h-[56px] rounded-2xl transition-all duration-300 my-1",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="haidh-sidebar-indicator"
                  className="absolute inset-0 bg-rose-500/15 border border-rose-500/20 rounded-2xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <Icon className={cn("w-5 h-5 z-10 transition-transform", isActive && "scale-110")} />
              <span className={cn(
                "text-[8px] font-black uppercase tracking-wider mt-1 z-10 transition-opacity leading-none",
                isActive ? "opacity-100" : "opacity-0"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </aside>

      {/* ── Ambient background glow ───────────────────────── */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/5 dark:bg-rose-700/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Header ───────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-2xl border-b border-border ml-[72px]">
        <div className="flex items-center justify-between px-5 h-14">
          <button
            onClick={goBack}
            aria-label="Go back"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/60 hover:bg-muted transition-colors border border-border"
          >
            <ChevronLeft className="w-4 h-4 text-foreground/90" />
          </button>
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <h1 className="text-base font-black tracking-widest uppercase bg-gradient-to-r from-rose-500 to-rose-700 dark:from-rose-400 dark:to-rose-500 bg-clip-text text-transparent">
              Noor Cycle
            </h1>
          </div>
          <div className="w-9" />
        </div>
      </header>

      {/* ── Main scrollable content ──────────────────────── */}
      <main className="ml-[72px] px-5 py-6 pb-24 overflow-y-auto h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeTab === "today" && <TodayTab data={data} fiqh={fiqh} onStart={handleStart} onEnd={handleEnd} onTabChange={(t) => setActiveTab(t as typeof activeTab)} />}
            {activeTab === "calendar" && <CalendarTab data={data} />}
            {activeTab === "log" && <LogTab data={data} onLog={handleLog} />}
            {activeTab === "islamic" && <IslamicTab data={data} fiqh={fiqh} />}
            {activeTab === "settings" && <SettingsTab data={data} onUpdate={handleSettingsUpdate} />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
