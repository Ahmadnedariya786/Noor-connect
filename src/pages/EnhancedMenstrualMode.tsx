import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  ArrowLeft, 
  BellOff, 
  Calendar, 
  CheckCircle, 
  Clock, 
  Droplets,
  Heart,
  Activity,
  Brain,
  Moon,
  Sun,
  Flower2,
  BookOpen,
  Thermometer,
  Plus,
  Minus
} from "lucide-react";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext-new";
import EnhancedMenstrualMode from "@/components/EnhancedMenstrualMode";
import { goBackOrFallback } from "@/lib/navigation";
import {
  activateMenstrualMode,
  deactivateMenstrualMode,
  getMenstrualModeData,
  updateCycleLengthDays,
  updateMenstrualModeSettings,
  type MenstrualModeData,
} from "@/lib/menstrual-mode";
import { PRAYER_ALARM_CONTROL_EVENT, PRAYER_ALARM_TOGGLE_EVENT } from "@/lib/prayer-alarm-events";
import hapticService from '@/lib/haptic-service';

const formatDateTime = (iso: string): string => {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateOnly = (iso: string): string => {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export default function EnhancedMenstrualModePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [modeData, setModeData] = useState<MenstrualModeData>(() => getMenstrualModeData());
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const handleModeUpdate = () => {
      setModeData(getMenstrualModeData());
    };

    window.addEventListener("menstrual-mode-updated", handleModeUpdate);
    return () => window.removeEventListener("menstrual-mode-updated", handleModeUpdate);
  }, []);

  const activeDays = useMemo(() => {
    if (!modeData.isActive || !modeData.startedAt) return 0;

    const start = new Date(modeData.startedAt);
    const now = new Date();

    const startDay = new Date(start);
    startDay.setHours(0, 0, 0, 0);
    const nowDay = new Date(now);
    nowDay.setHours(0, 0, 0, 0);

    const diff = Math.floor((nowDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, diff + 1);
  }, [modeData.isActive, modeData.startedAt]);

  const expectedEndDate = useMemo(() => {
    if (!modeData.startedAt) return null;
    const expected = new Date(modeData.startedAt);
    expected.setDate(expected.getDate() + modeData.cycleLengthDays - 1);
    return expected;
  }, [modeData.startedAt, modeData.cycleLengthDays]);

  const cycleProgress = useMemo(() => {
    if (!modeData.isActive) return 0;
    return Math.min((activeDays / modeData.cycleLengthDays) * 100, 100);
  }, [activeDays, modeData.cycleLengthDays, modeData.isActive]);

  const clearPrayerNotifications = async () => {
    try {
      const { localNotifications } = await import("@/lib/local-notifications");
      await localNotifications.clearPrayerNotifications();
    } catch (error) {
      console.error("Failed to clear prayer notifications:", error);
    }
  };

  const schedulePrayerNotifications = async () => {
    try {
      const { localNotifications } = await import("@/lib/local-notifications");
      await localNotifications.schedulePrayerNotificationsFromAPI();
    } catch (error) {
      console.error("Failed to reschedule prayer notifications:", error);
    }
  };

  const handleStartMode = async () => {
    const updated = activateMenstrualMode(new Date());
    setModeData(updated);
    
    // Haptic feedback
    await hapticService.trigger('success');

    // Disable the web adhan alarm state immediately while mode is active.
    localStorage.setItem("prayer-alarm-enabled", "false");
    window.dispatchEvent(
      new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled: false } })
    );
    window.dispatchEvent(
      new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: "stop" } })
    );

    if (updated.pausePrayerNotifications) {
      await clearPrayerNotifications();
    }

    toast({
      title: "Menstrual Mode Enabled",
      description: "Prayer Reminders And Auto Qaza Sync Are Paused While This Mode Is Active.",
    });
  };

  const handleEndMode = async () => {
    const updated = deactivateMenstrualMode(new Date());
    setModeData(updated);
    
    // Haptic feedback
    await hapticService.trigger('success');

    if (updated.pausePrayerNotifications) {
      await schedulePrayerNotifications();
    }

    toast({
      title: "Menstrual Mode Ended",
      description: "Prayer Reminder Scheduling Has Resumed.",
    });
  };

  const handleCycleLengthChange = (delta: number) => {
    const updated = updateCycleLengthDays(modeData.cycleLengthDays + delta);
    setModeData(updated);
    hapticService.trigger('light');
  };

  const handlePauseNotificationsChange = async (checked: boolean) => {
    const updated = updateMenstrualModeSettings({ pausePrayerNotifications: checked });
    setModeData(updated);

    if (updated.isActive) {
      if (checked) {
        await clearPrayerNotifications();
      } else {
        await schedulePrayerNotifications();
      }
    }
    hapticService.trigger('light');
  };

  const handlePauseQazaChange = (checked: boolean) => {
    const updated = updateMenstrualModeSettings({ pauseQazaAutoSync: checked });
    setModeData(updated);
    hapticService.trigger('light');
  };

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title="Enhanced Menstrual Mode" />

        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Enhanced Menstrual Mode</h1>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                Comprehensive cycle tracking & wellness support
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                modeData.isActive 
                  ? "bg-rose-500/10 text-rose-600" 
                  : "bg-emerald-500/10 text-emerald-600"
              }`}
            >
              {modeData.isActive ? "Active" : "Inactive"}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="wellness">Wellness</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card
                className={`p-4 space-y-4 ${
                  modeData.isActive
                    ? "bg-gradient-to-br from-rose-500/15 to-rose-600/5 border-rose-500/20"
                    : "bg-muted/30"
                }`}
              >
                {modeData.isActive && modeData.startedAt ? (
                  <>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                          Menstrual Mode Active
                        </p>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">
                          Started: {formatDateTime(modeData.startedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
                          {activeDays}
                        </p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                          Day Count
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Cycle Progress</span>
                        <span>{cycleProgress.toFixed(0)}%</span>
                      </div>
                      <Progress value={cycleProgress} className="h-2" />
                    </div>

                    {expectedEndDate && (
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-rose-500/10 mb-4">
                        <Calendar className="w-4 h-4 text-rose-400" />
                        <span>Expected End: {formatDateOnly(expectedEndDate.toISOString())}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        onClick={handleEndMode}
                        className="w-full bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        End Mode
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => setActiveTab('wellness')}
                        className="w-full"
                      >
                        <Heart className="w-4 h-4 mr-2" />
                        Wellness Tips
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-rose-100 dark:bg-rose-900/20 rounded-full flex items-center justify-center">
                      <Droplets className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Start Menstrual Mode</h3>
                      <p className="text-sm text-muted-foreground">
                        Pause prayer reminders and get personalized wellness support
                      </p>
                    </div>
                    <Button 
                      onClick={handleStartMode}
                      className="w-full bg-rose-600 hover:bg-rose-700"
                    >
                      <Droplets className="w-4 h-4 mr-2" />
                      Start Mode
                    </Button>
                  </div>
                )}
              </Card>

              {/* Quick Stats */}
              {modeData.isActive && (
                <Card className="p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Quick Stats
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-rose-600">{activeDays}</p>
                      <p className="text-xs text-muted-foreground">Active Days</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {modeData.cycleLengthDays - activeDays}
                      </p>
                      <p className="text-xs text-muted-foreground">Days Remaining</p>
                    </div>
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="wellness" className="space-y-4">
              <EnhancedMenstrualMode />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-bold">Cycle Length</Label>
                  <div className="flex items-center gap-3 mt-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleCycleLengthChange(-1)}
                      disabled={modeData.cycleLengthDays <= 3}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="w-16 text-center">
                      <p className="text-2xl font-bold">{modeData.cycleLengthDays}</p>
                      <p className="text-xs text-muted-foreground">days</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => handleCycleLengthChange(1)}
                      disabled={modeData.cycleLengthDays >= 10}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Pause Prayer Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Stop prayer reminders during period
                    </p>
                  </div>
                  <Switch
                    checked={modeData.pausePrayerNotifications}
                    onCheckedChange={handlePauseNotificationsChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-bold">Pause Qaza Auto-Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Don't automatically track missed prayers
                    </p>
                  </div>
                  <Switch
                    checked={modeData.pauseQazaAutoSync}
                    onCheckedChange={handlePauseQazaChange}
                  />
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-bold mb-3">About Enhanced Mode</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Track symptoms and get personalized wellness tips</p>
                  <p>• Phase-specific nutrition and exercise recommendations</p>
                  <p>• Mental health and spiritual support</p>
                  <p>• Cycle calendar and reminders</p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </LayoutManager>
  );
}

// Named export for the component
export { EnhancedMenstrualModePage as EnhancedMenstrualMode };
