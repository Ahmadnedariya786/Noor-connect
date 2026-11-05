import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Target, TrendingUp, Calendar, RotateCcw, Check, Sparkles, Clock, Trash2 } from "lucide-react";
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
  addQazaHistoryEntry,
  getQazaHistory,
  getQazaDailyGoal,
  setQazaDailyGoal,
  getTodayQazaCompleted,
  getDateWiseQazaList,
  toggleDatePrayerQaza,
  markSingleDatePrayerCompleted,
  deleteDateQazaRecord,
  formatHijriDate,
  syncUnmarkedDailySalahToQaza,
  type PrayerName,
  type QazaPrayerName,
  type DateWiseQazaRecord,
} from "@/lib/qaza-tracker";

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
  const [qazaCounts, setQazaCounts] = useState<Record<QazaPrayerName, number>>(getQazaPrayers());
  const [dailyGoal, setDailyGoal] = useState(getQazaDailyGoal());
  const [todayCompleted, setTodayCompleted] = useState(getTodayQazaCompleted());
  const [history, setHistory] = useState<QazaHistory[]>(getQazaHistory() as QazaHistory[]);
  const [editingPrayer, setEditingPrayer] = useState<QazaPrayerName | null>(null);
  const [editValue, setEditValue] = useState("");

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

  useEffect(() => {
    syncUnmarkedDailySalahToQaza();
    loadQazaData();

    const handleQazaUpdate = () => {
      setQazaCounts(getQazaPrayers());
      refreshDateRecords();
    };
    const handleSalahUpdate = () => {
      syncUnmarkedDailySalahToQaza();
      loadQazaData();
    };
    window.addEventListener('qaza-updated', handleQazaUpdate);
    window.addEventListener('qaza-date-updated', refreshDateRecords);
    window.addEventListener('salah-updated', handleSalahUpdate);
    return () => {
      window.removeEventListener('qaza-updated', handleQazaUpdate);
      window.removeEventListener('qaza-date-updated', refreshDateRecords);
      window.removeEventListener('salah-updated', handleSalahUpdate);
    };
  }, [refreshDateRecords]);

  const loadQazaData = () => {
    setQazaCounts(getQazaPrayers());
    setDailyGoal(getQazaDailyGoal());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
    setDateRecords(getDateWiseQazaList());
  };

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
    addQazaHistoryEntry(prayer as PrayerName);
    setQazaCounts(getQazaPrayers());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
    toast({ title: `Completed 1 ${prayer} Qaza`, description: "Keep up the good work!" });
  };

  const handleSetCount = (prayer: QazaPrayerName) => {
    const count = parseInt(editValue);
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
    setQazaCounts(getQazaPrayers());
    setHistory([]);
    setTodayCompleted(0);
    setDateRecords([]);
    toast({ title: "All Qaza reset", description: "Starting fresh" });
  };

  // Date-wise handlers
  const handleTogglePrayerForDate = (prayer: QazaPrayerName) => {
    toggleDatePrayerQaza(selectedDate, prayer);
    toast({
      title: "Updated Qaza Planner",
      description: `Updated ${prayer.toUpperCase()} status for ${selectedDate}`,
    });
  };

  const handleCompletePendingDatePrayer = (date: string, prayer: QazaPrayerName) => {
    markSingleDatePrayerCompleted(date, prayer);
    toast({
      title: "✓ Prayed / Completed",
      description: `Marked ${prayer.toUpperCase()} Qaza for ${date} as prayed!`,
    });
  };

  const handleDeleteDateRecord = (date: string) => {
    deleteDateQazaRecord(date);
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
  const last7Days = history.filter(h => {
    const date = new Date(h.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return date >= weekAgo;
  });
  const weeklyTotal = last7Days.reduce((sum, h) => sum + h.completed, 0);

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[var(--accent)]" />
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

          {/* Date Picker Row with Quick-Select Pills */}
          <div className="space-y-2 pt-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Input
                type="date"
                max={todayIso}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-9 w-auto text-xs font-mono font-medium border-[var(--border)] bg-[var(--surface-2)]"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedDate === todayIso ? "default" : "outline"}
                  onClick={() => setSelectedDate(todayIso)}
                  className="h-8 text-[11px] px-2.5 font-bold cursor-pointer"
                >
                  Today
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedDate === yesterdayIso ? "default" : "outline"}
                  onClick={() => setSelectedDate(yesterdayIso)}
                  className="h-8 text-[11px] px-2.5 font-bold cursor-pointer"
                >
                  Yesterday
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={selectedDate === twoDaysAgoIso ? "default" : "outline"}
                  onClick={() => setSelectedDate(twoDaysAgoIso)}
                  className="h-8 text-[11px] px-2 font-bold cursor-pointer"
                >
                  2 Days Ago
                </Button>
              </div>
            </div>

            {/* Display Hijri date header for chosen date */}
            <p className="text-[11px] font-semibold text-[var(--accent-text)] px-0.5">
              📅 {formatHijriDate(selectedDate)}
            </p>
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
                    <span className="font-arabic text-sm">{p.arabicLabel}</span>
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

                  return (
                    <div
                      key={r.date}
                      className="p-2.5 rounded-xl border bg-[var(--surface-2)] border-[var(--border)] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {formatHijriDate(r.date)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDateRecord(r.date)}
                          title="Clear date record"
                          className="text-[var(--text-secondary)] hover:text-[var(--danger)] transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

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
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, goalProgress)}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {todayCompleted} of {dailyGoal} prayers made up today
          </p>
        </Card>

        {/* Prayer Counts */}
        <div className="space-y-2">
          <h2 className="font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Prayers to Make Up
          </h2>
          
          {PRAYERS.map(prayer => (
            <Card
              key={prayer.name}
              className={`p-3 transition-all ${
                (qazaCounts[prayer.name] || 0) > 0 ? 'qaza-pending-blink' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="font-arabic text-lg">{prayer.arabicLabel}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium">{prayer.label}</p>
                  {editingPrayer === prayer.name ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 w-20"
                        placeholder="0"
                      />
                      <Button size="sm" onClick={() => handleSetCount(prayer.name)}>Set</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingPrayer(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <p 
                      className="text-2xl font-bold text-primary cursor-pointer"
                      onClick={() => {
                        setEditingPrayer(prayer.name);
                        setEditValue((qazaCounts[prayer.name] || 0).toString());
                      }}
                    >
                      {qazaCounts[prayer.name] || 0}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-10 w-10"
                    onClick={() => handleAdd(prayer.name)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="default" 
                    size="icon" 
                    className="h-10 w-10"
                    onClick={() => handleComplete(prayer.name)}
                    disabled={(qazaCounts[prayer.name] || 0) <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick Add */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Quick Add (Bulk)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10].map(count => (
              <Button 
                key={count}
                variant="outline"
                onClick={() => {
                  PRAYERS.forEach(p => handleAdd(p.name, count));
                }}
              >
                +{count} All
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Add {"{count}"} to each prayer at once
          </p>
        </Card>

        {/* History Summary */}
        <Card className="p-4 space-y-3">
          <h3 className="font-medium">Last 7 Days</h3>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (6 - i));
              const dayHistory = history.filter(h => h.date === date.toDateString());
              const count = dayHistory.reduce((sum, h) => sum + h.completed, 0);
              
              return (
                <div key={i} className="text-center">
                  <div 
                    className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                      count >= dailyGoal 
                        ? 'bg-[var(--success)] text-white' 
                        : count > 0 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted'
                    }`}
                  >
                    {count}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {date.toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Reset Button */}
        <Button 
          variant="outline" 
          className="w-full text-destructive"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4 ms-2" />
          Reset All Qaza
        </Button>
      </div>
    </div>
    </LayoutManager>
  );
}
