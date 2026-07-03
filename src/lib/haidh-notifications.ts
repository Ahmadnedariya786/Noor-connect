// ============================================================
//  Haidh Tracker — reminder scheduling
//  Thin wrapper over the app's local-notifications singleton.
//  All data stays on-device; notifications are only a nudge.
// ============================================================

import { localNotifications } from "@/lib/local-notifications";
import type { HaidhTrackerData } from "@/lib/haidh-tracker";

// Stable notification IDs (hashed to numeric IDs internally)
const ID_GHUSL = "haidh-ghusl-reminder";
const ID_PREDICT = "haidh-period-predict";
const ID_DAILY_LOG = "haidh-daily-log";

const MS_PER_DAY = 86_400_000;

const at = (h: number, m: number): { hours: number; minutes: number } => ({ hours: h, minutes: m });

const setTime = (date: Date, { hours, minutes }: { hours: number; minutes: number }): Date => {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
};

/**
 * Reconcile scheduled reminders with the user's current data & preferences.
 * Cancels anything no longer relevant and (re)schedules what is. Safe to call
 * on every data change — old notifications are cancelled by stable ID first.
 */
export const syncHaidhNotifications = async (data: HaidhTrackerData): Promise<void> => {
  // Always cancel the lot first, then reschedule what applies now.
  await Promise.all([
    localNotifications.cancelNotification(ID_GHUSL),
    localNotifications.cancelNotification(ID_PREDICT),
    localNotifications.cancelNotification(ID_DAILY_LOG),
  ]);

  const now = new Date();

  // 1) Ghusl reminder — fires the morning after the period ends, while the
  //    cycle is closed but (ideally) before salah. Only schedule if it's in
  //    the future, so a historical end date doesn't spam the user.
  const lastCycle = data.cycles[0];
  if (data.ghusulReminderEnabled && lastCycle?.endDate) {
    const end = new Date(lastCycle.endDate);
    const fire = setTime(new Date(end.getTime() + MS_PER_DAY), at(7, 0));
    if (fire.getTime() > now.getTime()) {
      await localNotifications.scheduleNotification(
        ID_GHUSL,
        "Time for Ghusl 🌊",
        "Your Haidh has ended. Perform Ghusl to resume your Salah.",
        fire,
      );
    }
  }

  // 2) Period prediction reminder — 2 days before the predicted start.
  if (data.periodPredictionReminderEnabled && data.nextPredictedStart) {
    const predicted = new Date(data.nextPredictedStart);
    const fire = setTime(new Date(predicted.getTime() - 2 * MS_PER_DAY), at(9, 0));
    if (fire.getTime() > now.getTime()) {
      await localNotifications.scheduleNotification(
        ID_PREDICT,
        "Cycle approaching",
        "Your cycle may begin in the next couple of days. Plan ahead with duʿā.",
        fire,
      );
    }
  }

  // 3) Daily log reminder — gentle evening nudge to log today's flow/symptoms.
  if (data.dailyLogReminderEnabled && data.isActive) {
    const fire = setTime(now, at(20, 0));
    // If today's slot already passed, push to tomorrow.
    const next = fire.getTime() > now.getTime() ? fire : new Date(fire.getTime() + MS_PER_DAY);
    await localNotifications.scheduleNotification(
      ID_DAILY_LOG,
      "Log your day",
      "Take a moment to log today's flow and how you're feeling.",
      next,
    );
  }
};
