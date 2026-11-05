/**
 * Qaza (Missed Prayer) Tracker Component
 * Track and complete missed prayers
 * Supports all 6 prayers (Fajr, Dhuhr, Asr, Maghrib, Isha, Witr)
 * Real-time Date-Wise Pending List with blinking action pills
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, AlertCircle, Check, Calendar } from "lucide-react";
import {
  getQazaPrayers,
  addQazaPrayer,
  completeQazaPrayer,
  setQazaCount,
  getQazaStats,
  getDateWiseQazaList,
  markSingleDatePrayerCompleted,
  formatHijriDate,
  getDetailedHijriDate,
  syncUnmarkedDailySalahToQaza,
  type QazaPrayerName,
  type DateWiseQazaRecord,
} from "@/lib/qaza-tracker";
import { RoyalDatePickerModal } from "@/components/RoyalDatePickerModal";
import { useToast } from "@/hooks/use-toast";

const prayerLabels: { id: QazaPrayerName; label: string; arabicLabel: string }[] = [
  { id: "fajr", label: "Fajr", arabicLabel: "الفجر" },
  { id: "dhuhr", label: "Dhuhr", arabicLabel: "الظهر" },
  { id: "asr", label: "Asr", arabicLabel: "العصر" },
  { id: "maghrib", label: "Maghrib", arabicLabel: "المغرب" },
  { id: "isha", label: "Isha", arabicLabel: "العشاء" },
  { id: "witr", label: "Witr", arabicLabel: "الوتر" },
];

interface QazaTrackerProps {
  compact?: boolean;
}

export function QazaTracker({ compact = false }: QazaTrackerProps) {
  const { t, ui, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [prayers, setPrayers] = useState<Record<QazaPrayerName, number>>({
    fajr: 0,
    dhuhr: 0,
    asr: 0,
    maghrib: 0,
    isha: 0,
    witr: 0,
  });
  const [stats, setStats] = useState({ total: 0, byPrayer: prayers });
  const [dateRecords, setDateRecords] = useState<DateWiseQazaRecord[]>(() => getDateWiseQazaList());
  const [editMode, setEditMode] = useState<QazaPrayerName | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const refresh = useCallback(() => {
    setPrayers(getQazaPrayers());
    setStats(getQazaStats());
    setDateRecords(getDateWiseQazaList());
  }, []);

  useEffect(() => {
    syncUnmarkedDailySalahToQaza();
    refresh();

    const handleUpdate = () => {
      refresh();
    };

    const handleSalahUpdate = () => {
      syncUnmarkedDailySalahToQaza();
      refresh();
    };

    window.addEventListener('qaza-updated', handleUpdate);
    window.addEventListener('qaza-date-updated', handleUpdate);
    window.addEventListener('noor-qaza-updated', handleUpdate);
    window.addEventListener('salah-updated', handleSalahUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('qaza-updated', handleUpdate);
      window.removeEventListener('qaza-date-updated', handleUpdate);
      window.removeEventListener('noor-qaza-updated', handleUpdate);
      window.removeEventListener('salah-updated', handleSalahUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refresh]);

  const handleAdd = (prayer: QazaPrayerName, count: number = 1) => {
    addQazaPrayer(prayer, count);
    refresh();
  };

  const handleComplete = (prayer: QazaPrayerName) => {
    const currentPrayers = getQazaPrayers();
    const currentCount = Math.max(0, Number(currentPrayers[prayer]) || 0);
    if (currentCount <= 0) {
      return;
    }
    completeQazaPrayer(prayer, 1);
    refresh();
    toast({
      title: "Prayer completed",
      description: `MashaAllah! ${prayerLabels.find((p) => p.id === prayer)?.label} Qaza marked as prayed.`,
    });
  };

  const handleCompleteDatePrayer = (date: string, prayer: QazaPrayerName) => {
    markSingleDatePrayerCompleted(date, prayer);
    refresh();
    const label = prayerLabels.find((p) => p.id === prayer)?.label || prayer;
    toast({
      title: "Qaza Prayer Completed",
      description: `MashaAllah! ${label} for ${date} marked as completed.`,
    });
  };

  const handleEditStart = (prayer: QazaPrayerName) => {
    setEditMode(prayer);
    setEditValue(prayers[prayer].toString());
  };

  const handleEditSave = () => {
    if (editMode) {
      const count = parseInt(editValue, 10) || 0;
      setQazaCount(editMode, count);
      setEditMode(null);
      refresh();
    }
  };

  const pendingDateRecords = useMemo(() => {
    return dateRecords.filter((r) =>
      Object.values(r.prayers).some((status) => status === 'pending')
    );
  }, [dateRecords]);

  if (compact) {
    return (
      <Card
        className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] rounded-[22px] overflow-hidden backdrop-blur-md relative"
        style={{
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 var(--card-sheen)',
        }}
      >
        <CardHeader className="pb-2 pt-4 px-4 sm:px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-[var(--accent)]" />
              {ui.qazaPrayers}
            </CardTitle>
            {stats.total > 0 ? (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold qaza-badge-blink flex items-center gap-1.5"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  border: '1px solid var(--accent)',
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#ef4444)] qaza-dot-blink inline-block shrink-0" />
                <span dir="ltr" className="inline-block tabular-nums font-mono">
                  {stats.total}
                </span>{' '}
                {ui.toMakeUp}
              </span>
            ) : (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  border: '1px solid var(--border)',
                }}
              >
                <span dir="ltr" className="inline-block tabular-nums font-mono">
                  0
                </span>{' '}
                {ui.pending}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="pb-4 px-3 sm:px-5 pt-1 space-y-3">
          {/* 6-Column Prayer Grid */}
          <div
            className="grid"
            style={{
              gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
              gap: '4px',
            }}
          >
            {prayerLabels.map((prayer) => {
              const count = prayers[prayer.id] || 0;
              const hasPending = count > 0;
              const prayerDisplayName =
                prayer.id === 'fajr'
                  ? ui.fajr
                  : prayer.id === 'dhuhr'
                  ? ui.dhuhr
                  : prayer.id === 'asr'
                  ? ui.asr
                  : prayer.id === 'maghrib'
                  ? ui.maghrib
                  : prayer.id === 'isha'
                  ? ui.isha
                  : prayer.id === 'witr'
                  ? 'Witr'
                  : prayer.label;

              return (
                <div
                  key={prayer.id}
                  className={`flex flex-col items-center justify-between gap-1.5 rounded-[12px] sm:rounded-[14px] transition-all duration-300 group ${
                    hasPending ? 'qaza-pending-blink' : ''
                  }`}
                  style={{
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 1px',
                    background: hasPending ? 'var(--accent-soft)' : 'var(--surface-2)',
                    border: hasPending ? '1px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: hasPending ? '0 4px 12px var(--accent-glow)' : 'none',
                    color: hasPending ? 'var(--accent-text)' : 'var(--success, #10b981)',
                  }}
                >
                  <button
                    onClick={() => handleComplete(prayer.id)}
                    disabled={!hasPending}
                    title={
                      hasPending
                        ? `Mark 1 ${prayer.label} Qaza as prayed`
                        : `All ${prayer.label} prayers completed`
                    }
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex flex-col items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 relative group/btn shrink-0 cursor-pointer"
                    style={
                      hasPending
                        ? {
                            background: 'var(--surface)',
                            color: 'var(--accent-text)',
                            border: '1.5px solid var(--accent)',
                            boxShadow: '0 0 10px var(--accent-glow)',
                          }
                        : {
                            background: 'var(--surface)',
                            color: 'var(--success, #10b981)',
                            border: '1px solid var(--border)',
                          }
                    }
                  >
                    {hasPending ? (
                      <span
                        dir="ltr"
                        className="text-[11px] sm:text-xs font-bold leading-none inline-block tabular-nums font-mono"
                      >
                        {Math.max(0, count)}
                      </span>
                    ) : (
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] text-[var(--success,#10b981)]" />
                    )}
                  </button>
                  <span
                    className="font-semibold text-center truncate max-w-full"
                    style={{
                      fontSize: 'clamp(0.58rem, 2.2vw, 0.68rem)',
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                      textAlign: 'center',
                      color: hasPending ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    {prayerDisplayName}
                  </span>
                  {hasPending ? (
                    <span className="text-[8px] sm:text-[9px] text-[var(--text-secondary)] font-medium tracking-tight">
                      {ui.tapMinusOne}
                    </span>
                  ) : (
                    <span className="text-[8px] sm:text-[9px] text-[var(--success,#10b981)] font-medium tracking-tight">
                      {ui.done}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Date-Wise Pending Qaza Prayers List */}
          {pendingDateRecords.length > 0 && (
            <div className="pt-2.5 mt-2.5 border-t border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Pending By Date
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: 'var(--accent-soft)',
                    color: 'var(--accent-text)',
                    border: '1px solid var(--accent)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#ef4444)] qaza-dot-blink shrink-0" />
                  <span>
                    {pendingDateRecords.length} {pendingDateRecords.length === 1 ? 'Date' : 'Dates'}
                  </span>
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {pendingDateRecords.slice(0, 4).map((record) => {
                  const pendingKeys = (Object.keys(record.prayers) as QazaPrayerName[]).filter(
                    (p) => record.prayers[p] === 'pending'
                  );
                  if (pendingKeys.length === 0) return null;

                  const detailed = getDetailedHijriDate(record.date);

                  return (
                    <div
                      key={record.id || record.date}
                      className="p-2.5 rounded-[14px] border border-[var(--border)] transition-all"
                      style={{
                        background: 'var(--surface-2)',
                      }}
                    >
                      {/* Line 1: Gregorian Date + Pending Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-extrabold text-[var(--text-primary)]"
                          style={{ fontSize: '0.80rem' }}
                        >
                          📅 {detailed.gregorian}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--accent-text)] border border-[var(--border)] shrink-0 whitespace-nowrap">
                          {pendingKeys.length} to pray
                        </span>
                      </div>

                      {/* Line 2: Full unclipped Hijri date in English and Arabic/Urdu */}
                      <div
                        className="mt-0.5 mb-2 w-full"
                        style={{ whiteSpace: 'normal', overflow: 'visible' }}
                      >
                        <p
                          className="font-semibold text-[var(--accent-text)]"
                          style={{
                            fontSize: '0.74rem',
                            lineHeight: 1.7,
                            fontFamily: 'var(--font-urdu), sans-serif',
                            whiteSpace: 'normal',
                            overflow: 'visible',
                          }}
                        >
                          {detailed.fullHijri}
                        </p>
                      </div>

                      {/* Pending Prayer Action Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pendingKeys.map((pName) => {
                          const label = prayerLabels.find((p) => p.id === pName)?.label || pName;
                          return (
                            <button
                              key={`${record.date}-${pName}`}
                              type="button"
                              onClick={() => handleCompleteDatePrayer(record.date, pName)}
                              title={`Mark ${label} for ${record.date} as completed`}
                              className="qaza-pending-blink px-2.5 py-1 rounded-full text-[10px] font-bold border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent-text)] flex items-center gap-1 cursor-pointer active:scale-95 transition-transform"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#ef4444)] qaza-dot-blink shrink-0" />
                              <span className="capitalize">{label}</span>
                              <span className="text-[9px] opacity-80 font-medium">• Tap ✓</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {pendingDateRecords.length > 4 && (
                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => navigate('/qaza')}
                      className="text-[11px] font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
                    >
                      +{pendingDateRecords.length - 4} more dates in Qaza Tracker →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Action Bar — Strict 2-Column Responsive Grid */}
          <div className="grid grid-cols-2 gap-2 w-full mt-3">
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(true)}
              className="min-w-0 w-full py-2.5 px-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer box-border whitespace-nowrap"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border)',
                fontSize: '0.74rem',
              }}
            >
              <Calendar className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="truncate">+ Select Date</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/qaza')}
              className="min-w-0 w-full py-2.5 px-2 rounded-xl font-bold border flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer box-border whitespace-nowrap shrink-0"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                borderColor: 'var(--accent)',
                fontSize: '0.74rem',
              }}
            >
              <span>Qaza Tracker</span>
              <span>{isRTL ? '←' : '→'}</span>
            </button>
          </div>
        </CardContent>

        {/* Royal Islamic Date Picker Modal */}
        <RoyalDatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          selectedDate={new Date().toISOString().split('T')[0]}
          onSelectDate={() => {
            refresh();
          }}
        />
      </Card>
    );
  }

  // Full Tracker View
  return (
    <Card className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[var(--accent)]" />
            Qaza Prayer Tracker
          </CardTitle>
          {stats.total > 0 && (
            <span className="text-sm bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)] px-3 py-1 rounded-full font-medium">
              Total: {stats.total}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Track and complete missed prayers
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {prayerLabels.map((prayer) => (
          <div
            key={prayer.id}
            className="flex items-center justify-between p-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg group"
          >
            <div className="flex items-center gap-3">
              <div className="text-center min-w-[40px]">
                <span
                  className={`text-xl font-bold ${
                    prayers[prayer.id] > 0
                      ? 'text-[var(--accent-text)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {prayers[prayer.id]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">
                  {prayer.id === 'witr' ? 'Witr' : t(prayer.id)}
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-arabic">
                  {prayer.arabicLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {editMode === prayer.id ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-16 h-8 text-center text-sm font-bold bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)]"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[var(--accent-text)]"
                    onClick={handleEditSave}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                    onClick={() => handleEditStart(prayer.id)}
                  >
                    <span className="text-xs font-bold">#</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={() => handleAdd(prayer.id)}
                    title="Add 1"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="default"
                    className="h-9 w-9 rounded-full shadow-sm bg-[var(--accent)] hover:opacity-90 text-[var(--on-accent)] disabled:opacity-30"
                    onClick={() => handleComplete(prayer.id)}
                    disabled={prayers[prayer.id] === 0}
                    title="Mark 1 as complete"
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t border-[var(--border)] mt-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Quick Actions
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                onClick={() => {
                  prayerLabels.forEach((p) => addQazaPrayer(p.id, 30));
                  refresh();
                  toast({
                    title: "Updated",
                    description: "Added 30 days worth of Qaza for all prayers.",
                  });
                }}
              >
                +30 Days (All)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                onClick={() => {
                  prayerLabels.forEach((p) => addQazaPrayer(p.id, 365));
                  refresh();
                  toast({
                    title: "Updated",
                    description: "Added 1 year worth of Qaza for all prayers.",
                  });
                }}
              >
                +1 Year (All)
              </Button>
            </div>
          </div>
        </div>

        {stats.total === 0 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Alhamdulillah!
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              All your prayers are up to date.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QazaTracker;
