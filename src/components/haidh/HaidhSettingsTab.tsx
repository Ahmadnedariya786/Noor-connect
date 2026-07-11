import { Download, Upload, AlertTriangle, Lock, Trash2, Settings, BookOpen, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  exportData,
  importData,
  clearAllData,
  MADHAB_RULES,
  type HaidhTrackerData,
} from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
  onUpdate: (patch: Partial<HaidhTrackerData>) => void;
}

const MADHABS = [
  { id: 'hanafi' as const, label: "Hanafi", desc: "Max 10 days Ḥaidh" },
  { id: 'maliki' as const, label: "Maliki", desc: "Max 15 days Ḥaidh" },
  { id: 'shafii' as const, label: "Shafiʿi", desc: "Max 15 days Ḥaidh" },
  { id: 'hanbali' as const, label: "Hanbali", desc: "Max 15 days Ḥaidh" },
];

function Card({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-[32px] overflow-hidden">
      <div className="p-5 border-b border-border bg-muted/40">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Icon className="w-3 h-3" /> {title}
        </h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ToggleRow({ label, sub, checked, on }: {
  label: string; sub: string; checked: boolean; on: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between p-4 border-b border-border last:border-0 cursor-pointer">
      <div className="pr-3">
        <span className="font-bold text-sm block text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{sub}</span>
      </div>
      <Switch checked={checked} onCheckedChange={on} />
    </label>
  );
}

export function HaidhSettingsTab({ data, onUpdate }: Props) {
  const handleExport = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `noor-cycle-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = importData(String(ev.target?.result ?? ""));
        if (ok) toast.success("Data imported");
        else toast.error("Invalid data file");
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDelete = () => {
    if (window.confirm("Delete ALL cycle data? This cannot be undone.")) {
      clearAllData();
      toast.success("All data cleared");
    }
  };

  const rules = MADHAB_RULES[data.madhab];

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center border border-border">
          <Settings className="w-5 h-5 text-foreground/70" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">Preferences</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Configuration & Privacy</p>
        </div>
      </div>

      {/* Fiqh / Madhab */}
      <Card icon={BookOpen} title="Fiqh Settings">
        <p className="text-sm font-bold text-foreground mb-3">School of Thought (Madhab)</p>
        <div className="grid grid-cols-2 gap-2">
          {MADHABS.map(m => (
            <button
              key={m.id}
              onClick={() => onUpdate({ madhab: m.id })}
              className={cn(
                "p-3 rounded-2xl text-left border transition-all",
                data.madhab === m.id
                  ? "bg-primary/15 border-primary/50 text-primary"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <div className="font-bold">{m.label}</div>
              <div className="text-xs uppercase tracking-widest opacity-70 mt-1">{m.desc}</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed mt-3">
          Determines the maximum days of Ḥaidh before bleeding is considered Istiḥāḍah ({rules.minHaidh}–{rules.maxHaidh} days; Nifās up to {rules.maxNifas} days).
        </p>
      </Card>

      {/* Cycle configuration */}
      <Card icon={Settings} title="Cycle Configuration">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold text-foreground">Period duration</span>
              <span className="text-sm font-black text-primary">{data.averagePeriodLength} days</span>
            </div>
            <Slider
              value={[data.averagePeriodLength]}
              min={3} max={15} step={1}
              onValueChange={v => onUpdate({ averagePeriodLength: v[0] })}
            />
            <div className="flex justify-between mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              <span>3d</span><span>15d</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-3">
              <span className="text-sm font-bold text-foreground">Total cycle length</span>
              <span className="text-sm font-black text-primary">{data.averageCycleLength} days</span>
            </div>
            <Slider
              value={[data.averageCycleLength]}
              min={21} max={40} step={1}
              onValueChange={v => onUpdate({ averageCycleLength: v[0] })}
            />
            <div className="flex justify-between mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              <span>21d</span><span>40d</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Reminders */}
      <Card icon={BellRing} title="Reminders">
        <div className="p-0 -m-1">
          <ToggleRow
            label="Ghusl reminder"
            sub="Nudge to purify when your period ends"
            checked={data.ghusulReminderEnabled}
            on={v => onUpdate({ ghusulReminderEnabled: v })}
          />
          <ToggleRow
            label="Period prediction"
            sub="Alert 2 days before a predicted start"
            checked={data.periodPredictionReminderEnabled}
            on={v => onUpdate({ periodPredictionReminderEnabled: v })}
          />
          <ToggleRow
            label="Daily log reminder"
            sub="Evening nudge to log during your period"
            checked={data.dailyLogReminderEnabled}
            on={v => onUpdate({ dailyLogReminderEnabled: v })}
          />
        </div>
      </Card>

      {/* Automation */}
      <Card icon={AlertTriangle} title="Automation">
        <div className="p-0 -m-1">
          <ToggleRow
            label="Auto-pause Prayer Alerts"
            sub="Mute adhan notifications during Ḥaidh"
            checked={data.pausePrayerNotifications}
            on={v => onUpdate({ pausePrayerNotifications: v })}
          />
          <ToggleRow
            label="Pause Qaza auto-sync"
            sub="Don't add missed prayers during Ḥaidh"
            checked={data.pauseQazaAutoSync}
            on={v => onUpdate({ pauseQazaAutoSync: v })}
          />
        </div>
      </Card>

      {/* Privacy & data */}
      <Card icon={Lock} title="Security & Privacy">
        <div className="mb-6 pb-6 border-b border-border">
          <p className="text-sm font-bold text-foreground mb-1">Passcode Lock</p>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Require a 4-digit PIN to open the Noor Cycle tracker.
          </p>
          {data.pinCode ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground/80">PIN is set</span>
              <Button size="sm" variant="outline" className="text-rose-500 hover:text-rose-600 font-bold" onClick={() => {
                if (window.confirm("Remove PIN lock?")) {
                  onUpdate({ pinCode: null });
                  toast.success("PIN removed");
                }
              }}>
                Remove PIN
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="default" className="w-full font-bold" onClick={() => {
              const pin = window.prompt("Enter a new 4-digit PIN:");
              if (pin && /^\d{4}$/.test(pin)) {
                onUpdate({ pinCode: pin });
                toast.success("PIN set successfully");
              } else if (pin) {
                toast.error("PIN must be exactly 4 digits");
              }
            }}>
              Set PIN
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Your data is stored 100% locally on this device. Noor Connect never syncs your sensitive health data to any cloud.
        </p>
        <div className="space-y-3">
          <Button variant="outline" onClick={handleExport} className="w-full h-12 rounded-2xl font-bold">
            <Download className="w-4 h-4 mr-2" /> Export Data (JSON)
          </Button>
          <Button variant="outline" onClick={handleImport} className="w-full h-12 rounded-2xl font-bold">
            <Upload className="w-4 h-4 mr-2" /> Import Data
          </Button>
          <Button variant="ghost" onClick={handleDelete} className="w-full h-12 rounded-2xl text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 font-bold">
            <Trash2 className="w-4 h-4 mr-2" /> Delete All Data
          </Button>
        </div>
      </Card>
    </div>
  );
}
