/**
 * Qaza (Missed Prayer) Tracker Component
 * Track and complete missed prayers
 */
import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Minus, AlertCircle, Check } from "lucide-react";
import {
  getQazaPrayers,
  addQazaPrayer,
  completeQazaPrayer,
  setQazaCount,
  getQazaStats,
  type PrayerName
} from "@/lib/qaza-tracker";
import { useToast } from "@/hooks/use-toast";

const prayerLabels: { id: PrayerName; label: string; arabicLabel: string }[] = [
  { id: "fajr", label: "Fajr", arabicLabel: "الفجر" },
  { id: "dhuhr", label: "Dhuhr", arabicLabel: "الظهر" },
  { id: "asr", label: "Asr", arabicLabel: "العصر" },
  { id: "maghrib", label: "Maghrib", arabicLabel: "المغرب" },
  { id: "isha", label: "Isha", arabicLabel: "العشاء" },
];

interface QazaTrackerProps {
  compact?: boolean;
}

export function QazaTracker({ compact = false }: QazaTrackerProps) {
  const { t } = useLanguage();
  const [prayers, setPrayers] = useState<Record<PrayerName, number>>({
    fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0
  });
  const [stats, setStats] = useState({ total: 0, byPrayer: prayers });
  const [editMode, setEditMode] = useState<PrayerName | null>(null);
  const [editValue, setEditValue] = useState("");
  const { toast } = useToast();

  const refresh = useCallback(() => {
    setPrayers(getQazaPrayers());
    setStats(getQazaStats());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('qaza-updated', refresh);
    return () => window.removeEventListener('qaza-updated', refresh);
  }, [refresh]);

  const handleAdd = (prayer: PrayerName, count: number = 1) => {
    addQazaPrayer(prayer, count);
    refresh();
  };

  const handleComplete = (prayer: PrayerName) => {
    if (prayers[prayer] > 0) {
      completeQazaPrayer(prayer, 1);
      refresh();
      toast({
        title: "Prayer completed",
        description: `MashaAllah! ${prayerLabels.find(p => p.id === prayer)?.label} Qaza marked as prayed.`
      });
    }
  };

  const handleEditStart = (prayer: PrayerName) => {
    setEditMode(prayer);
    setEditValue(prayers[prayer].toString());
  };

  const handleEditSave = () => {
    if (editMode) {
      const count = parseInt(editValue) || 0;
      setQazaCount(editMode, count);
      setEditMode(null);
      refresh();
    }
  };

  if (compact) {
    return (
      <Card className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Qaza Prayers
            </CardTitle>
            {stats.total > 0 && (
              <span className="text-xs bg-destructive/10 text-destructive px-2 py-1 rounded-full font-medium">
                {stats.total} to make up
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {stats.total === 0 ? (
            <p className="text-center text-xs text-[var(--text-secondary)] py-2">
              ✨ No Qaza prayers pending. Alhamdulillah!
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {prayerLabels.map((prayer) => (
                <div key={prayer.id} className="text-center">
                  <button
                    onClick={() => handleComplete(prayer.id)}
                    disabled={prayers[prayer.id] === 0}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all mx-auto ${prayers[prayer.id] > 0
                      ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                      : "bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                      }`}
                  >
                    {prayers[prayer.id]}
                  </button>
                  <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                    {prayer.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Qaza Prayer Tracker
          </CardTitle>
          {stats.total > 0 && (
            <span className="text-sm bg-destructive/10 text-destructive px-3 py-1 rounded-full font-medium">
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
                <span className={`text-xl font-bold ${prayers[prayer.id] > 0 ? 'text-destructive' : 'text-[var(--text-secondary)]'}`}>
                  {prayers[prayer.id]}
                </span>
              </div>
              <div>
                <p className="font-semibold text-sm text-[var(--text-primary)]">{t(prayer.id)}</p>
                <p className="text-xs text-[var(--text-secondary)] font-arabic">{prayer.arabicLabel}</p>
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
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-[var(--accent-text)]" onClick={handleEditSave}>
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
                    className="h-9 w-9 rounded-full shadow-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30"
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
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Quick Actions</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                onClick={() => {
                  prayerLabels.forEach(p => addQazaPrayer(p.id, 30));
                  refresh();
                  toast({ title: "Updated", description: "Added 30 days worth of Qaza for all prayers." });
                }}
              >
                +30 Days (All)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs h-8 border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--text-primary)]"
                onClick={() => {
                  prayerLabels.forEach(p => addQazaPrayer(p.id, 365));
                  refresh();
                  toast({ title: "Updated", description: "Added 1 year worth of Qaza for all prayers." });
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
