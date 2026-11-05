import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Target, Calendar, RotateCcw, Check, Clock, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { useToast } from "@/hooks/use-toast";
import { goBackOrFallback } from "@/lib/navigation";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { 
  getQazaPrayers, 
  addQazaPrayer, 
  completeQazaPrayer, 
  setQazaCount,
  clearAllQaza,
  getQazaHistory,
  getQazaDailyGoal,
  setQazaDailyGoal,
  getTodayQazaCompleted,
  getDateWiseQazaList,
  toggleDatePrayerQaza,
  markSingleDatePrayerCompleted,
  deleteDateQazaRecord,
  formatHijriDate,
  getDetailedHijriDate,
  syncUnmarkedDailySalahToQaza,
  type PrayerName,
  type QazaPrayerName,
  type DateWiseQazaRecord,
} from "@/lib/qaza-tracker";
import { RoyalDatePickerModal } from "@/components/RoyalDatePickerModal";

const PRAYERS: { name: QazaPrayerName; label: string; arabicLabel: string }[] = [
  { name: "fajr", label: "Fajr", arabicLabel: "الفجر" },
  { name: "dhuhr", label: "Dhuhr", arabicLabel: "الظهر" },
  { name: "asr", label: "Asr", arabicLabel: "العصر" },
  { name: "maghrib", label: "Maghrib", arabicLabel: "المغرب" },
  { name: "isha", label: "Isha", arabicLabel: "العشاء" },
  { name: "witr", label: "Witr (Salat-ul-Witr)", arabicLabel: "الوتر" },
];

interface QazaHistory {
  date: string;
  completed: number;
  prayer: PrayerName;
}

export default function QazaPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [qazaCounts, setQazaCounts] = useState<Record<QazaPrayerName, number>>(() => getQazaPrayers());
  const [dailyGoal, setDailyGoal] = useState(() => getQazaDailyGoal());
  const [todayCompleted, setTodayCompleted] = useState(() => getTodayQazaCompleted());
  const [history, setHistory] = useState<QazaHistory[]>(() => getQazaHistory() as QazaHistory[]);
  const [editingPrayer, setEditingPrayer] = useState<QazaPrayerName | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Date-Wise Qaza state
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);
  const twoDaysAgoIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return d.toISOString().split('T')[0];
  }, []);

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [dateRecords, setDateRecords] = useState<DateWiseQazaRecord[]>(() => getDateWiseQazaList());

  const refreshDateRecords = useCallback(() => {
    setDateRecords(getDateWiseQazaList());
  }, []);

  const loadQazaData = useCallback(() => {
    setQazaCounts(getQazaPrayers());
    setDailyGoal(getQazaDailyGoal());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
    setDateRecords(getDateWiseQazaList());
  }, []);

  useEffect(() => {
    syncUnmarkedDailySalahToQaza();
    loadQazaData();

    const handleQazaUpdate = () => {
      loadQazaData();
    };
    const handleSalahUpdate = () => {
      syncUnmarkedDailySalahToQaza();
      loadQazaData();
    };

    window.addEventListener('qaza-updated', handleQazaUpdate);
    window.addEventListener('qaza-date-updated', refreshDateRecords);
    window.addEventListener('noor-qaza-updated', handleQazaUpdate);
    window.addEventListener('salah-updated', handleSalahUpdate);
    return () => {
      window.removeEventListener('qaza-updated', handleQazaUpdate);
      window.removeEventListener('qaza-date-updated', refreshDateRecords);
      window.removeEventListener('noor-qaza-updated', handleQazaUpdate);
      window.removeEventListener('salah-updated', handleSalahUpdate);
    };
  }, [refreshDateRecords, loadQazaData]);

  const totalQaza = Object.values(qazaCounts).reduce((a, b) => a + b, 0);
  const goalProgress = Math.min((todayCompleted / dailyGoal) * 100, 100);

  const handleAdd = (prayer: QazaPrayerName, count: number = 1) => {
    addQazaPrayer(prayer, count);
    setQazaCounts(getQazaPrayers());
    toast({ title: `Added ${count} ${prayer} Qaza` });
  };

  const handleComplete = (prayer: QazaPrayerName) => {
    const latestPrayers = getQazaPrayers();
    if ((Number(latestPrayers[prayer]) || 0) <= 0) return;
    
    completeQazaPrayer(prayer, 1);
    setQazaCounts(getQazaPrayers());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
    toast({ title: `Completed 1 ${prayer} Qaza`, description: "Keep up the good work!" });
  };

  const handleSetCount = (prayer: QazaPrayerName) => {
    const count = parseInt(editValue, 10);
    if (isNaN(count) || count < 0) {
      toast({ title: "Invalid number", variant: "destructive" });
      return;
    }
    setQazaCount(prayer, count);
    setQazaCounts(getQazaPrayers());
    setEditingPrayer(null);
    setEditValue("");
    toast({ title: `Set ${prayer} Qaza to ${count}` });
  };

  const handleGoalChange = (goal: number) => {
    setDailyGoal(goal);
    setQazaDailyGoal(goal);
  };

  const handleReset = () => {
    clearAllQaza();
    loadQazaData();
    toast({ title: "All Qaza reset", description: "Starting fresh" });
  };

  // Date-wise handlers
  const handleTogglePrayerForDate = (prayer: QazaPrayerName) => {
    toggleDatePrayerQaza(selectedDate, prayer);
    loadQazaData();
    toast({
      title: "Updated Qaza Planner",
      description: `Updated ${prayer.toUpperCase()} status for ${selectedDate}`,
    });
  };

  const handleCompletePendingDatePrayer = (date: string, prayer: QazaPrayerName) => {
    markSingleDatePrayerCompleted(date, prayer);
    loadQazaData();
    toast({
      title: "Qaza Prayer Completed",
      description: `Marked ${prayer.toUpperCase()} for ${date} as prayed!`,
    });
  };

  const handleDeleteDateRecord = (date: string) => {
    deleteDateQazaRecord(date);
    loadQazaData();
    toast({
      title: "Record Deleted",
      description: `Cleared date record for ${date}`,
    });
  };

  const currentRecord = dateRecords.find((r) => r.date === selectedDate);
  const pendingDatesList = dateRecords.filter((r) =>
    Object.values(r.prayers).some((status) => status === 'pending')
  );

  // Calculate stats
  const last7Days = history.filter((h) => {
    const date = new Date(h.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  });
  const weeklyTotal = last7Days.reduce((sum, h) => sum + (Number(h.completed) || 1), 0);

  const selectedDetailed = useMemo(() => {
    return getDetailedHijriDate(selectedDate);
  }, [selectedDate]);

  return (
    <LayoutManager>
      <div className="min-h-screen bg-background">
        <AppBar title={t("qazaTracker") || "Qada Tracker"} />
      
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => goBackOrFallback(navigate, '/dashboard')} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Qaza Management</h1>
            <p className="text-sm text-muted-foreground">Track and make up missed prayers</p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <Card className={`p-3 text-center transition-all ${totalQaza > 0 ? 'qaza-pending-blink' : ''}`}>
            <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
              {totalQaza > 0 && <span className="w-2 h-2 rounded-full bg-[var(--danger,#ef4444)] qaza-dot-blink" />}
              {totalQaza}
            </div>
            <div className="text-xs text-muted-foreground">Total Qaza</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-[var(--success)]">{todayCompleted}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-[var(--accent-text)]">{weeklyTotal}</div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </Card>
        </div>

        {/* ── DATE-WISE QAZA PLANNER & LOG CARD ── */}
        <Card className="p-4 space-y-3.5 border border-[var(--border)] shadow-md bg-[var(--surface)]">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)] flex items-center justify-center text-[var(--accent)]">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-[var(--text-primary)]">
                  Date-Wise Qaza Planner & Log
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                  Select any date to record which specific prayers of that day are remaining as Qaza so you never forget.
                </p>
              </div>
            </div>
          </div>

          {/* Theme-Adaptive Royal Date Picker Trigger Button */}
          <div className="space-y-2 pt-1 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => setIsDatePickerOpen(true)}
              className="w-full p-2.5 sm:p-3 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)] transition-all flex items-center justify-between text-left cursor-pointer group shadow-sm gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-8 h-8 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)] flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[var(--accent-text)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {selectedDetailed.gregorianDay}, {selectedDetailed.gregorian}
                  </p>
                  <p
                    className="font-semibold text-[var(--accent-text)] truncate"
                    style={{ fontSize: '0.70rem', whiteSpace: 'nowrap', lineHeight: 1.5 }}
                  >
                    🌙 {selectedDetailed.hijriEn}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-[var(--surface)] text-[var(--accent-text)] border border-[var(--border)] group-hover:border-[var(--accent)] transition-colors shrink-0 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Select ▾</span>
              </span>
            </button>

            {/* Quick Preset Pills */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
              <Button
                type="button"
                size="sm"
                variant={selectedDate === todayIso ? "default" : "outline"}
                onClick={() => setSelectedDate(todayIso)}
                className="h-7 text-[11px] px-2.5 font-bold cursor-pointer"
              >
                Today
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === yesterdayIso ? "default" : "outline"}
                onClick={() => setSelectedDate(yesterdayIso)}
                className="h-7 text-[11px] px-2.5 font-bold cursor-pointer"
              >
                Yesterday
              </Button>
              <Button
                type="button"
                size="sm"
                variant={selectedDate === twoDaysAgoIso ? "default" : "outline"}
                onClick={() => setSelectedDate(twoDaysAgoIso)}
                className="h-7 text-[11px] px-2 font-bold cursor-pointer"
              >
                2 Days Ago
              </Button>
            </div>
          </div>

          {/* Prayer Selection Grid for the Chosen Date */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-[var(--text-secondary)]">
              Tap any prayer to cycle: [ None → ● Pending Qaza → ✓ Completed ]
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRAYERS.map((p) => {
                const status = currentRecord?.prayers[p.name] || 'none';
                const isPending = status === 'pending';
                const isCompleted = status === 'completed';

                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleTogglePrayerForDate(p.name)}
                    className={`py-2 px-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                      isPending
                        ? 'qaza-pending-blink bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                        : isCompleted
                        ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
                        : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="font-arabic text-sm" style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 1.4 }}>
                      {p.arabicLabel}
                    </span>
                    <span className="text-[11px] font-bold capitalize mt-0.5">{p.name}</span>
                    <span className="text-[9px] font-mono mt-1 font-bold">
                      {isPending ? '● PENDING' : isCompleted ? '✓ PRAYED' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Pending Dates List (Below the Picker) */}
          {pendingDatesList.length > 0 && (
            <div className="pt-3 border-t border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[var(--text-primary)]">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--accent)]" />
                  Active Pending Dates ({pendingDatesList.length})
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Tap pill to mark prayed
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {pendingDatesList.map((r) => {
                  const pendingPrayers = (Object.keys(r.prayers) as QazaPrayerName[]).filter(
                    (p) => r.prayers[p] === 'pending'
                  );
                  if (pendingPrayers.length === 0) return null;

                  const detailed = getDetailedHijriDate(r.date);

                  return (
                    <div
                      key={r.date}
                      className="p-2.5 rounded-xl border bg-[var(--surface-2)] border-[var(--border)] space-y-1.5"
                    >
                      {/* Line 1: Gregorian Date + Pending Badge + Trash */}
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-extrabold text-[var(--text-primary)]"
                          style={{ fontSize: '0.80rem' }}
                        >
                          📅 {detailed.gregorian}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--surface)] text-[var(--accent-text)] border border-[var(--border)] shrink-0 whitespace-nowrap">
                            {pendingPrayers.length} to pray
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteDateRecord(r.date)}
                            title="Clear date record"
                            className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Line 2: Balanced Hijri + Urdu date row */}
                      <div
                        className="w-full flex items-center justify-between gap-2 flex-wrap"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                          marginTop: '2px',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          dir="ltr"
                          className="font-semibold"
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--accent-text)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🌙 {detailed.hijriEn}
                        </span>
                        <span
                          dir="rtl"
                          className="font-semibold"
                          style={{
                            fontFamily: 'var(--font-urdu), sans-serif',
                            fontSize: '0.80rem',
                            color: 'var(--accent-text)',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.4,
                          }}
                        >
                          {detailed.hijriArUr}
                        </span>
                      </div>

                      {/* Pending Action Pills */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {pendingPrayers.map((pName) => (
                          <button
                            key={pName}
                            type="button"
                            onClick={() => handleCompletePendingDatePrayer(r.date, pName)}
                            className="qaza-pending-blink px-2.5 py-1 rounded-full text-[10px] font-bold border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent-text)] flex items-center gap-1 cursor-pointer active:scale-95"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--danger,#ef4444)] qaza-dot-blink" />
                            <span className="capitalize">{pName}</span> Pending • Tap ✓
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Daily Goal */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--accent)]" />
              <span className="font-medium text-[var(--text-primary)]">Daily Goal</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleGoalChange(Math.max(1, dailyGoal - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-bold text-[var(--text-primary)]">{dailyGoal}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => handleGoalChange(dailyGoal + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={goalProgress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{todayCompleted} completed today</span>
            <span>{Math.round(goalProgress)}% of goal</span>
          </div>
        </Card>

        {/* Prayer Cards */}
        <div className="space-y-3">
          {PRAYERS.map((prayer) => {
            const count = qazaCounts[prayer.name] || 0;
            const isEditing = editingPrayer === prayer.name;

            return (
              <Card 
                key={prayer.name} 
                className={`p-4 transition-all ${
                  count > 0 ? 'border-[var(--accent)] shadow-sm' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-arabic text-lg text-[var(--accent-text)]">{prayer.arabicLabel}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{prayer.label}</span>
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 h-8 text-sm"
                          placeholder="Count"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleSetCount(prayer.name)}>
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setEditingPrayer(null);
                            setEditValue("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingPrayer(prayer.name);
                          setEditValue(count.toString());
                        }}
                        className="text-2xl font-bold text-left hover:text-primary transition-colors cursor-pointer"
                      >
                        {count}
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => handleAdd(prayer.name, 1)}
                    >
                      <Plus className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="default"
                      size="icon"
                      className="h-10 w-10 rounded-full"
                      onClick={() => handleComplete(prayer.name)}
                      disabled={count === 0}
                    >
                      <Check className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Quick Add Presets */}
        <Card className="p-4 space-y-3">
          <div className="font-medium text-sm text-[var(--text-primary)]">Quick Add (All Prayers)</div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                PRAYERS.forEach(p => addQazaPrayer(p.name, 1));
                setQazaCounts(getQazaPrayers());
                toast({ title: "Added 1 day for all prayers" });
              }}
            >
              +1 Day
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                PRAYERS.forEach(p => addQazaPrayer(p.name, 7));
                setQazaCounts(getQazaPrayers());
                toast({ title: "Added 1 week for all prayers" });
              }}
            >
              +1 Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                PRAYERS.forEach(p => addQazaPrayer(p.name, 30));
                setQazaCounts(getQazaPrayers());
                toast({ title: "Added 1 month for all prayers" });
              }}
            >
              +1 Month
            </Button>
          </div>
        </Card>

        {/* Reset Button */}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset All Qaza
        </Button>

        {/* History Summary */}
        <Card className="p-4 space-y-3">
          <div className="font-medium text-sm text-[var(--text-primary)]">Recent Activity</div>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5, 6].map((daysAgo) => {
              const date = new Date();
              date.setDate(date.getDate() - daysAgo);
              const dateStr = date.toDateString();
              const dayHistory = history.filter((h) => h.date === dateStr);
              const count = dayHistory.reduce((sum, h) => sum + (Number(h.completed) || 1), 0);

              return (
                <div key={daysAgo} className="flex justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <span className="text-muted-foreground">
                    {daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {count} {count === 1 ? "prayer" : "prayers"} completed
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Royal Islamic Date Picker Modal */}
        <RoyalDatePickerModal
          isOpen={isDatePickerOpen}
          onClose={() => setIsDatePickerOpen(false)}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => {
            setSelectedDate(newDate);
            loadQazaData();
          }}
        />
      </div>
      </div>
    </LayoutManager>
  );
}
