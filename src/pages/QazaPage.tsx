import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Minus, Target, TrendingUp, Calendar, RotateCcw } from "lucide-react";
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
  type PrayerName 
} from "@/lib/qaza-tracker";

const PRAYERS: { name: PrayerName; label: string; arabicLabel: string }[] = [
  { name: "fajr", label: "Fajr", arabicLabel: "الفجر" },
  { name: "dhuhr", label: "Dhuhr", arabicLabel: "الظهر" },
  { name: "asr", label: "Asr", arabicLabel: "العصر" },
  { name: "maghrib", label: "Maghrib", arabicLabel: "المغرب" },
  { name: "isha", label: "Isha", arabicLabel: "العشاء" },
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
  const [qazaCounts, setQazaCounts] = useState<Record<PrayerName, number>>(getQazaPrayers());
  const [dailyGoal, setDailyGoal] = useState(getQazaDailyGoal());
  const [todayCompleted, setTodayCompleted] = useState(getTodayQazaCompleted());
  const [history, setHistory] = useState<QazaHistory[]>(getQazaHistory() as QazaHistory[]);
  const [editingPrayer, setEditingPrayer] = useState<PrayerName | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    loadQazaData();

    const handleQazaUpdate = () => {
      setQazaCounts(getQazaPrayers());
    };
    window.addEventListener('qaza-updated', handleQazaUpdate);
    return () => window.removeEventListener('qaza-updated', handleQazaUpdate);
  }, []);

  const loadQazaData = () => {
    setQazaCounts(getQazaPrayers());
    setDailyGoal(getQazaDailyGoal());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
  };

  const totalQaza = Object.values(qazaCounts).reduce((a, b) => a + b, 0);
  const goalProgress = Math.min((todayCompleted / dailyGoal) * 100, 100);

  const handleAdd = (prayer: PrayerName, count: number = 1) => {
    addQazaPrayer(prayer, count);
    setQazaCounts(getQazaPrayers());
    toast({ title: `Added ${count} ${prayer} Qaza` });
  };

  const handleComplete = (prayer: PrayerName) => {
    if (qazaCounts[prayer] <= 0) return;
    
    completeQazaPrayer(prayer, 1);
    addQazaHistoryEntry(prayer);
    setQazaCounts(getQazaPrayers());
    setHistory(getQazaHistory() as QazaHistory[]);
    setTodayCompleted(getTodayQazaCompleted());
    toast({ title: `Completed 1 ${prayer} Qaza`, description: "Keep up the good work!" });
  };

  const handleSetCount = (prayer: PrayerName) => {
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
    toast({ title: "All Qaza reset", description: "Starting fresh" });
  };

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
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalQaza}</div>
            <div className="text-xs text-muted-foreground">Total Qaza</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-[var(--success)]">{todayCompleted}</div>
            <div className="text-xs text-muted-foreground">Today</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">{weeklyTotal}</div>
            <div className="text-xs text-muted-foreground">This Week</div>
          </Card>
        </div>

        {/* Daily Goal */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-medium">Daily Goal</span>
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
              <span className="w-8 text-center font-bold">{dailyGoal}</span>
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
            <Card key={prayer.name} className="p-3">
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
                        setEditValue(qazaCounts[prayer.name].toString());
                      }}
                    >
                      {qazaCounts[prayer.name]}
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
                    disabled={qazaCounts[prayer.name] <= 0}
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
