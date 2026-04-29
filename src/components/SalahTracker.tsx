/**
 * Salah Tracker Component - 5 prayer checkboxes with streak
 * All data stored locally in localStorage
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Flame, Check, Clock, AlertCircle } from "lucide-react";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import {
  getTodayPrayers,
  togglePrayer,
  getSalahStats,
  type PrayerName,
  type DailyPrayers
} from "@/lib/salah-tracker";
import { syncMissedPrayersToQaza } from "@/lib/qaza-tracker";
import { useI18n } from "@/hooks/useI18n";
import hapticService from "@/lib/haptic-service";

const prayerNames: { id: PrayerName; label: string }[] = [
  { id: "fajr", label: "Fajr" },
  { id: "dhuhr", label: "Dhuhr" },
  { id: "asr", label: "Asr" },
  { id: "maghrib", label: "Maghrib" },
  { id: "isha", label: "Isha" },
];

export function SalahTracker() {
  const { t: ti18n } = useI18n();
  const [prayers, setPrayers] = useState<DailyPrayers | null>(null);
  const [stats, setStats] = useState({ currentStreak: 0, longestStreak: 0, totalPrayers: 0, todayCompleted: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { prayerTimesWithEnd } = usePrayerTimes();

  const refreshStats = useCallback(() => {
    setPrayers(getTodayPrayers());
    setStats(getSalahStats());
  }, []);

  useEffect(() => {
    refreshStats();

    // Listen for real-time updates from other components
    window.addEventListener('salah-updated', refreshStats);
    return () => window.removeEventListener('salah-updated', refreshStats);
  }, [refreshStats]);

  // Handle Automatic Qaza Detection
  useEffect(() => {
    if (prayers && prayerTimesWithEnd) {
      const syncData = {
        fajr: prayers.fajr,
        dhuhr: prayers.dhuhr,
        asr: prayers.asr,
        maghrib: prayers.maghrib,
        isha: prayers.isha,
      };

      const syncTimes = {
        fajr: { start: prayerTimesWithEnd.fajr.start, end: prayerTimesWithEnd.fajr.end },
        dhuhr: { start: prayerTimesWithEnd.dhuhr.start, end: prayerTimesWithEnd.dhuhr.end },
        asr: { start: prayerTimesWithEnd.asr.start, end: prayerTimesWithEnd.asr.end },
        maghrib: { start: prayerTimesWithEnd.maghrib.start, end: prayerTimesWithEnd.maghrib.end },
        isha: { start: prayerTimesWithEnd.isha.start, end: prayerTimesWithEnd.isha.end },
      };

      syncMissedPrayersToQaza(syncData, syncTimes);
    }
  }, [prayers, prayerTimesWithEnd]);

  const handleToggle = (prayer: PrayerName) => {
    // Prepare prayer times object for validation
    const prayerTimes = prayerTimesWithEnd ? {
      fajr: { start: prayerTimesWithEnd.fajr.start, end: prayerTimesWithEnd.fajr.end },
      dhuhr: { start: prayerTimesWithEnd.dhuhr.start, end: prayerTimesWithEnd.dhuhr.end },
      asr: { start: prayerTimesWithEnd.asr.start, end: prayerTimesWithEnd.asr.end },
      maghrib: { start: prayerTimesWithEnd.maghrib.start, end: prayerTimesWithEnd.maghrib.end },
      isha: { start: prayerTimesWithEnd.isha.start, end: prayerTimesWithEnd.isha.end },
    } : undefined;

    const result = togglePrayer(prayer, prayerTimes);

    if (result.success) {
      setPrayers(getTodayPrayers());
      setStats(getSalahStats());
      setMessage({ type: 'success', text: result.message });
      // Trigger haptic feedback for successful prayer entry
      hapticService.trigger('success').catch(() => {});
    } else {
      setMessage({ type: 'error', text: result.message });
      // Trigger haptic feedback for error
      hapticService.trigger('error').catch(() => {});
    }

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const isPrayerTimeAvailable = (prayer: PrayerName): boolean => {
    if (!prayerTimesWithEnd) return true; // Allow if no prayer times available

    const now = new Date();
    const prayerTime = prayerTimesWithEnd[prayer as keyof typeof prayerTimesWithEnd];

    if (!prayerTime) return true;

    // Allow checking in if prayer time has started OR if it's already checked
    return now >= prayerTime.start;
  };

  if (!prayers) return null;

  const allComplete = stats.todayCompleted === 5;

  return (
    <Card className="bg-card border-border overflow-hidden">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">{ti18n('todaysSalah')}</CardTitle>
          {stats.currentStreak > 0 && (
            <div className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
              <Flame className="w-3 h-3" />
              <span className="font-semibold">{stats.currentStreak} {ti18n('dayStreak')}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Message Display */}
        {message && (
          <div className={`mb-3 p-2 rounded-lg text-xs text-center ${message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
            <div className="flex items-center justify-center gap-1">
              {message.type === 'error' && <Clock className="w-3 h-3" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {prayerNames.map((prayer) => {
            const isChecked = prayers[prayer.id];
            const isTimeAvailable = isPrayerTimeAvailable(prayer.id);
            const isDisabled = !isTimeAvailable && !isChecked; // Can't check in before time, but can uncheck anytime

            return (
              <button
                key={prayer.id}
                onClick={() => handleToggle(prayer.id)}
                disabled={isDisabled}
                className={`flex flex-col items-center gap-1.5 group transition-all duration-200 ${isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  }`}
                title={isDisabled ? `Cannot check in before ${prayer.label} time` : prayer.label}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${isChecked
                    ? "bg-primary border-primary text-primary-foreground"
                    : isDisabled
                      ? "border-muted-foreground/20 text-muted-foreground/40"
                      : "border-muted-foreground/30 text-muted-foreground group-hover:border-primary/50"
                    }`}
                >
                  {isChecked && <Check className="w-5 h-5" />}
                  {!isChecked && isDisabled && <Clock className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-medium ${isChecked
                  ? "text-primary"
                  : isDisabled
                    ? "text-muted-foreground/40"
                    : "text-muted-foreground"
                  }`}>
                  {prayer.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(stats.todayCompleted / 5) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{stats.todayCompleted}/5</span>
        </div>

        {allComplete && (
          <p className="text-center text-xs text-primary mt-3 font-medium">
            ✨ {ti18n('allPrayersCompletedToday')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SalahTracker;
