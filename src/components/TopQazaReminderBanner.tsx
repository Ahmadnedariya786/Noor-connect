import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import {
  getQazaStats,
  getDateWiseQazaList,
  markSingleDatePrayerCompleted,
  completeQazaPrayer,
  type QazaPrayerName,
  type DateWiseQazaRecord,
} from '@/lib/qaza-tracker';
import { evaluateMakruhState } from '@/lib/makruh-times';

interface TopQazaReminderBannerProps {
  prayers?: Array<{ name?: string; originalName?: string; time?: string; date?: Date }>;
  timeFormat?: '12' | '24' | '12h' | '24h';
}

const PRAYER_DISPLAY_NAMES: Record<QazaPrayerName, string> = {
  fajr: 'Fajr',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
  witr: 'Witr',
};

function formatPillDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export const TopQazaReminderBanner: React.FC<TopQazaReminderBannerProps> = ({
  prayers,
  timeFormat = '12h',
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState(() => getQazaStats());
  const [dateRecords, setDateRecords] = useState<DateWiseQazaRecord[]>(() => getDateWiseQazaList());
  const [rotationIdx, setRotationIdx] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());

  const refreshData = useCallback(() => {
    setStats(getQazaStats());
    setDateRecords(getDateWiseQazaList());
  }, []);

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('qaza-updated', handleUpdate);
    window.addEventListener('qaza-date-updated', handleUpdate);
    window.addEventListener('noor-qaza-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('qaza-updated', handleUpdate);
      window.removeEventListener('qaza-date-updated', handleUpdate);
      window.removeEventListener('noor-qaza-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshData]);

  // Rotate reminder message every 10 seconds and tick clock every 5 seconds for makruh check
  useEffect(() => {
    const interval = setInterval(() => {
      setRotationIdx((prev) => (prev + 1) % 2);
      setNow(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Makruh time calculation
  const makruhState = useMemo(() => {
    const normalizedFmt: '12h' | '24h' = timeFormat === '24' || timeFormat === '24h' ? '24h' : '12h';
    return evaluateMakruhState(prayers || [], now, normalizedFmt);
  }, [prayers, now, timeFormat]);

  const totalPendingQaza = stats.total;

  // Pending date-wise records
  const pendingDates = useMemo(() => {
    return dateRecords
      .filter((r) => Object.values(r.prayers).some((status) => status === 'pending'))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [dateRecords]);

  // Actions
  const handleMarkDateCompleted = useCallback((date: string, prayer: QazaPrayerName) => {
    markSingleDatePrayerCompleted(date, prayer);
    refreshData();
    const displayName = PRAYER_DISPLAY_NAMES[prayer] || prayer;
    toast({
      title: 'Alhamdulillah! ✨',
      description: `Qaza ${displayName} for ${formatPillDate(date)} marked completed.`,
    });
  }, [refreshData, toast]);

  const handleMarkCountCompleted = useCallback((prayer: QazaPrayerName) => {
    completeQazaPrayer(prayer, 1);
    refreshData();
    const displayName = PRAYER_DISPLAY_NAMES[prayer] || prayer;
    toast({
      title: 'Alhamdulillah! ✨',
      description: `1 pending Qaza ${displayName} marked completed.`,
    });
  }, [refreshData, toast]);

  if (totalPendingQaza <= 0) {
    return null;
  }

  // Dynamic context message
  let reminderMessage: string;
  if (makruhState.isMakruhNow && makruhState.activeWindow) {
    const endTime = makruhState.activeWindow.endFormatted || 'end of makruh time';
    reminderMessage = `⏳ Makruh Waqt is active right now — wait until ${endTime} to offer Qaza.`;
  } else if (rotationIdx === 0) {
    reminderMessage = `⚠️ Aapki ${totalPendingQaza} Qaza namaz baaki hai — waqt milte hi ada kar lein!`;
  } else {
    reminderMessage = `✨ Make up 1 pending Qaza prayer right now and tap below to mark it done.`;
  }

  return (
    <div
      className="w-full qaza-pending-blink rounded-2xl border transition-all duration-300 select-none overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        borderColor: 'var(--accent)',
        padding: '10px 12px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.28), 0 0 14px var(--accent-glow)',
      }}
    >
      {/* ── Row 1: Header + Quick Nav (Zero mid-title ellipsis) ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 shrink-0" style={{ flexShrink: 0 }}>
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
          </span>
          <span
            className="leading-tight"
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: 'var(--accent-text)',
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            🕌 QAZA • {totalPendingQaza} PENDING
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/qaza')}
          className="shrink-0 flex items-center gap-1 transition-all hover:scale-105 active:scale-95 shadow-sm"
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            padding: '3px 10px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: 'var(--on-accent)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <span>Tracker</span>
          <span className="text-[10px]">→</span>
        </button>
      </div>

      {/* ── Row 2: Dynamic Context Reminder Message ── */}
      <div className="mt-1.5 mb-2">
        <p
          className="leading-snug transition-opacity duration-300"
          style={{
            fontSize: '0.72rem',
            fontWeight: 600,
            color: makruhState.isMakruhNow ? 'var(--warning)' : 'var(--text-primary)',
          }}
        >
          {reminderMessage}
        </p>
      </div>

      {/* ── Row 3: Inline 1-Tap Completion Pills ── */}
      <div className="pt-1.5 border-t border-[var(--border)] flex flex-wrap items-center gap-1.5">
        {pendingDates.length > 0 ? (
          // Date-wise pending pills
          pendingDates.slice(0, 2).map((rec) => {
            const pendingPrayerEntries = (Object.entries(rec.prayers) as [QazaPrayerName, string][])
              .filter(([, status]) => status === 'pending');

            if (pendingPrayerEntries.length === 0) return null;

            return (
              <div key={rec.id} className="flex flex-wrap items-center gap-1.5 w-full">
                <span
                  className="font-bold shrink-0"
                  style={{
                    fontSize: '0.68rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  📅 {formatPillDate(rec.date)}:
                </span>
                <div className="flex flex-wrap items-center gap-1 flex-1">
                  {pendingPrayerEntries.map(([prayer]) => {
                    const label = PRAYER_DISPLAY_NAMES[prayer] || prayer;
                    return (
                      <button
                        key={`${rec.date}-${prayer}`}
                        type="button"
                        onClick={() => handleMarkDateCompleted(rec.date, prayer)}
                        className="inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 border"
                        style={{
                          background: 'var(--surface)',
                          borderColor: 'var(--accent)',
                          color: 'var(--accent-text)',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '3px 7px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                        }}
                        title={`Tap to mark ${label} for ${rec.date} completed`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        <span>{label}</span>
                        <span
                          className="px-1 py-0.2 rounded text-[9px] font-extrabold"
                          style={{
                            background: 'var(--accent-soft)',
                            color: 'var(--accent)',
                          }}
                        >
                          ✓
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          // General count-based pending pills
          <div className="flex flex-wrap items-center gap-1.5 w-full">
            <span
              className="font-bold shrink-0"
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-secondary)',
              }}
            >
              1-Tap Complete:
            </span>
            {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr'] as QazaPrayerName[])
              .filter((p) => stats.byPrayer[p] > 0)
              .map((p) => {
                const count = stats.byPrayer[p];
                const label = PRAYER_DISPLAY_NAMES[p] || p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handleMarkCountCompleted(p)}
                    className="inline-flex items-center gap-1 transition-all hover:scale-105 active:scale-95 border"
                    style={{
                      background: 'var(--surface)',
                      borderColor: 'var(--accent)',
                      color: 'var(--accent-text)',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '3px 7px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                    }}
                    title={`Tap to mark 1 ${label} completed`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                    <span>{label}</span>
                    <span className="text-[10px] opacity-80 tabular-nums">({count})</span>
                    <span
                      className="px-1 py-0.2 rounded text-[9px] font-extrabold"
                      style={{
                        background: 'var(--accent-soft)',
                        color: 'var(--accent)',
                      }}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopQazaReminderBanner;
