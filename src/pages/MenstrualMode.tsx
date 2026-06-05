import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, BellOff, Calendar, CheckCircle, Clock, Minus, Plus } from "lucide-react";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext-new";
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

export default function MenstrualMode() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [modeData, setModeData] = useState<MenstrualModeData>(() => getMenstrualModeData());

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
  };

  const handlePauseQazaChange = (checked: boolean) => {
    const updated = updateMenstrualModeSettings({ pauseQazaAutoSync: checked });
    setModeData(updated);
  };

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title={t("menstrualMode")} />

        <div className="max-w-lg mx-auto p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{t("menstrualMode")}</h1>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">{t("menstrualModeDescription")}</p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${modeData.isActive ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600"
                }`}
            >
              {modeData.isActive ? t("active") : t("inactive")}
            </div>
          </div>

          <Card
            className={`p-4 space-y-4 ${modeData.isActive
              ? "bg-gradient-to-br from-rose-500/15 to-rose-600/5 border-rose-500/20"
              : "bg-muted/30"
              }`}
          >
            {modeData.isActive && modeData.startedAt ? (
              <>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="text-lg font-bold text-rose-600 dark:text-rose-400">{t("menstrualMode")} {t("active")}</p>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-tight">Started: {formatDateTime(modeData.startedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{activeDays}</p>
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{t("dayCount")}</p>
                  </div>
                </div>

                {expectedEndDate && (
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white/40 dark:bg-black/20 p-2 rounded-xl border border-rose-500/10 mb-4">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    <span>{t("expectedEnd")}: {formatDateOnly(expectedEndDate.toISOString())}</span>
                  </div>
                )}

                <Button className="w-full h-11 rounded-xl font-bold shadow-sm" variant="destructive" onClick={handleEndMode}>
                  {t("endMenstrualMode")}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <p className="text-lg font-bold">{t("menstrualMode")} {t("off")}</p>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                    {t("prayerRemindersPaused")}
                  </p>
                </div>
                <Button className="w-full h-12 rounded-xl font-bold shadow-md bg-rose-500 hover:bg-rose-600 text-white transition-all" onClick={handleStartMode}>
                  {t("startMenstrualMode")}
                </Button>
              </>
            )}
          </Card>

          <Card className="p-5 space-y-4 rounded-[24px] border-border/40 shadow-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t("typicalCycleLength")}</span>
            </div>
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleCycleLengthChange(-1)}
                disabled={modeData.cycleLengthDays <= 3}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{modeData.cycleLengthDays}</p>
                <p className="text-xs text-muted-foreground">days</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => handleCycleLengthChange(1)}
                disabled={modeData.cycleLengthDays >= 15}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          <Card className="p-5 space-y-6 rounded-[24px] border-border/40 shadow-sm">
            <div className="flex items-center gap-2">
              <BellOff className="w-5 h-5 text-primary" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t("modeBehavior")}</span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-bold">{t("pausePrayerReminders")}</Label>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{t("pausePrayerRemindersDescription")}</p>
              </div>
              <Switch
                checked={modeData.pausePrayerNotifications}
                onCheckedChange={handlePauseNotificationsChange}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-bold">{t("pauseAutoQazaSync")}</Label>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight">{t("pauseAutoQazaSyncDescription")}</p>
              </div>
              <Switch checked={modeData.pauseQazaAutoSync} onCheckedChange={handlePauseQazaChange} />
            </div>
          </Card>

          <Card className="p-5 space-y-3 bg-muted/20 border-none rounded-[24px]">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ps-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>{t("notes")}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed ps-1">
              {t("menstrualModeNotes")}
            </p>
          </Card>

          {modeData.history.length > 0 && (
            <Card className="p-5 space-y-4 border-border/40 shadow-sm rounded-[24px]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{t("recentSessions")}</span>
              </div>
              <div className="space-y-2">
                {modeData.history.slice(0, 5).map((entry, index) => (
                  <div key={`${entry.startedAt}-${entry.endedAt}-${index}`} className="rounded-lg bg-muted/40 p-3">
                    <p className="text-sm font-medium">{entry.durationDays} day session</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateOnly(entry.startedAt)} to {formatDateOnly(entry.endedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </LayoutManager>
  );
}
