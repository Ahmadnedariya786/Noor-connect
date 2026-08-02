import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Droplets, BookOpen, BookHeart, Zap, Thermometer, GlassWater } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getCurrentCycle,
  getLogForDate,
  startCycle,
  SYMPTOMS,
  incrementMissedFast,
  markFastMadeUp,
  type HaidhTrackerData,
  type DailyLog,
  type FlowIntensity,
  type MoodType,
} from "@/lib/haidh-tracker";

interface Props {
  data: HaidhTrackerData;
  onLog: (log: Partial<DailyLog>) => void;
}

const FLOWS: { id: FlowIntensity; label: string; dots: number }[] = [
  { id: "none", label: "None", dots: 0 },
  { id: "spotting", label: "Spotting", dots: 1 },
  { id: "light", label: "Light", dots: 1 },
  { id: "medium", label: "Medium", dots: 2 },
  { id: "heavy", label: "Heavy", dots: 3 },
];

const MOODS: { id: MoodType; emoji: string; label: string }[] = [
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "neutral", emoji: "😐", label: "Neutral" },
  { id: "sad", emoji: "😔", label: "Sad" },
  { id: "irritable", emoji: "😤", label: "Irritable" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "emotional", emoji: "😭", label: "Emotional" },
];

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function HaidhLogTab({ data, onLog }: Props) {
  const cycle = getCurrentCycle(data);
  const todayStr = toDateStr(new Date());
  // A log may live on the active cycle or anywhere in history.
  const existingLog = useMemo(
    () => cycle?.logs.find(l => l.date === todayStr) ?? getLogForDate(data, todayStr),
    [cycle, data, todayStr]
  );

  const [flow, setFlow] = useState<FlowIntensity>(existingLog?.flow ?? "none");
  const [symptoms, setSymptoms] = useState<string[]>(existingLog?.symptoms ?? []);
  const [mood, setMood] = useState<MoodType | null>(existingLog?.mood ?? null);
  const [energy, setEnergy] = useState<number>(existingLog?.energyLevel ?? 3);
  const [notes, setNotes] = useState<string>(existingLog?.notes ?? "");
  const [ghusulCompleted, setGhusulCompleted] = useState(existingLog?.ghusulCompleted ?? false);
  const [missedFast, setMissedFast] = useState(existingLog?.missedFast ?? false);
  const todayStr2 = toDateStr(new Date());
  const [waterGlasses, setWaterGlasses] = useState(() => {
    const stored = localStorage.getItem(`noor-water-${todayStr2}`);
    return stored ? parseInt(stored, 10) : 0;
  });
  const [painLevel, setPainLevel] = useState(0);

  // Reset local state if today's persisted log changes externally.
  useEffect(() => {
    setFlow(existingLog?.flow ?? "none");
    setSymptoms(existingLog?.symptoms ?? []);
    setMood(existingLog?.mood ?? null);
    setEnergy(existingLog?.energyLevel ?? 3);
    setNotes(existingLog?.notes ?? "");
    setGhusulCompleted(existingLog?.ghusulCompleted ?? false);
    setMissedFast(existingLog?.missedFast ?? false);
  }, [existingLog]);

  // Debounce notes so typing doesn't thrash, but still autosaves.
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist a partial patch instantly.
  const save = (patch: Partial<DailyLog>, silent = true) => {
    onLog(patch);
    if (!silent) toast.success("Saved");
  };

  const handleFlow = (f: FlowIntensity) => {
    setFlow(f);
    // Logging bleeding while not in an active cycle = a new period has begun.
    if (f !== "none" && !cycle) {
      startCycle(new Date(), "haidh");
      toast.success("Cycle started");
    }
    save({ flow: f });
  };

  const toggleSymptom = (key: string) => {
    const next = symptoms.includes(key) ? symptoms.filter(x => x !== key) : [...symptoms, key];
    setSymptoms(next);
    save({ symptoms: next });
  };

  const handleMood = (m: MoodType) => {
    setMood(m);
    save({ mood: m });
  };

  const handleEnergy = (v: number[]) => {
    const val = v[0];
    setEnergy(val);
    save({ energyLevel: val as DailyLog["energyLevel"] });
  };

  const handleNotes = (v: string) => {
    setNotes(v);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => save({ notes: v }), 600);
  };

  const handleGhusul = () => {
    const next = !ghusulCompleted;
    setGhusulCompleted(next);
    save({ ghusulCompleted: next });
    if (next) toast.success("Ghusl logged");
  };

  const handleMissedFast = () => {
    const next = !missedFast;
    setMissedFast(next);
    save({ missedFast: next });
    if (next) incrementMissedFast();
  };

  const owed = Math.max(0, data.missedRamadanFasts - data.madeUpRamadanFasts);

  return (
    <div className="space-y-8 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center border border-border">
          <Droplets className="w-5 h-5 text-rose-500" />
        </div>
        <div>
          <h2 className="text-xl font-black tracking-tight text-foreground">Today's Log</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {!cycle && (
        <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-2xl p-3">
          Logging flow will automatically start a new cycle.
        </p>
      )}

      {/* Flow */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Flow</h3>
        <div className="flex flex-wrap gap-2">
          {FLOWS.map(f => (
            <button
              key={f.id}
              onClick={() => handleFlow(f.id)}
              className={cn(
                "px-4 py-3 rounded-2xl text-sm font-bold transition-all border",
                flow === f.id
                  ? f.id === "none"
                    ? "bg-muted border-border text-foreground"
                    : "bg-rose-500/20 border-rose-500/50 text-rose-600 dark:text-rose-400"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="flex items-center gap-1.5">
                {f.label}
                {f.dots > 0 && flow === f.id && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: f.dots }).map((_, i) => (
                      <span key={i} className="w-1 h-1 rounded-full bg-current opacity-70" />
                    ))}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Symptoms */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Symptoms</h3>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map(s => (
            <button
              key={s.key}
              onClick={() => toggleSymptom(s.key)}
              className={cn(
                "px-3 py-2 rounded-2xl text-sm font-medium transition-all border",
                symptoms.includes(s.key)
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-600 dark:text-violet-300"
                  : "bg-background border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              <span className="mr-1.5">{s.icon}</span>{s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Mood */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Mood</h3>
        <div className="grid grid-cols-6 gap-2">
          {MOODS.map(m => (
            <button
              key={m.id}
              onClick={() => handleMood(m.id)}
              aria-label={m.label}
              aria-pressed={mood === m.id}
              className={cn(
                "aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl transition-all border",
                mood === m.id
                  ? "bg-sky-500/20 border-sky-500/50 scale-105"
                  : "bg-background border-border opacity-60 hover:opacity-100 hover:bg-muted/50"
              )}
            >
              <span className="text-2xl">{m.emoji}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Energy */}
      <section className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Zap className="w-3 h-3" /> Energy
          </h3>
          <span className="text-xs font-black text-foreground">{energy}/5</span>
        </div>
        <div className="bg-background border border-border rounded-2xl p-4">
          <Slider
            value={[energy]}
            min={1}
            max={5}
            step={1}
            onValueChange={handleEnergy}
          />
          <div className="flex justify-between mt-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Low</span><span>High</span>
          </div>
        </div>
      </section>

      {/* Pain scale */}
      <section className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Thermometer className="w-3 h-3" /> Pain Scale
          </h3>
          <span className="text-xs font-black text-foreground">
            {painLevel === 0 ? 'None' : painLevel <= 3 ? 'Mild' : painLevel <= 6 ? 'Moderate' : 'Severe'}
          </span>
        </div>
        <div className="bg-background border border-border rounded-2xl p-4 space-y-3">
          <div className="flex gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => {
              const lvl = i + 1;
              const active = lvl <= painLevel;
              return (
                <button
                  key={i}
                  onClick={() => setPainLevel(lvl === painLevel ? 0 : lvl)}
                  className={`flex-1 h-7 rounded-md transition-all ${
                    active
                      ? lvl <= 3 ? 'bg-emerald-500' : lvl <= 6 ? 'bg-amber-500' : 'bg-rose-500'
                      : 'bg-muted'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
            <span>None</span><span>Mild</span><span>Moderate</span><span>Severe</span>
          </div>
        </div>
      </section>

      {/* Water intake */}
      <section className="space-y-3">
        <div className="flex items-center justify-between ml-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <GlassWater className="w-3 h-3" /> Water Intake
          </h3>
          <span className="text-xs font-black text-foreground">{waterGlasses}/8</span>
        </div>
        <div className="bg-background border border-border rounded-2xl p-4">
          <div className="flex gap-1.5 mb-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const next = i < waterGlasses ? i : i + 1;
                  setWaterGlasses(next);
                  localStorage.setItem(`noor-water-${todayStr2}`, String(next));
                }}
                className={`flex-1 h-8 rounded-lg transition-all border flex items-center justify-center ${
                  i < waterGlasses
                    ? 'bg-blue-500/20 border-blue-500/40'
                    : 'bg-muted/40 border-border'
                }`}
              >
                <GlassWater className={`w-3 h-3 transition-colors ${
                  i < waterGlasses ? 'text-blue-500' : 'text-muted-foreground/30'
                }`} />
              </button>
            ))}
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
              style={{ width: `${(waterGlasses / 8) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Notes</h3>
        <Textarea
          value={notes}
          onChange={e => handleNotes(e.target.value)}
          placeholder="Any observations for today…"
          className="resize-none bg-background border-border rounded-2xl min-h-[80px]"
        />
      </section>

      {/* Islamic actions */}
      <section className="space-y-3 pt-4 border-t border-border">
        <h3 className="text-xs font-black uppercase tracking-widest text-primary ml-1 flex items-center gap-2">
          <BookOpen className="w-3 h-3" /> Islamic Actions
        </h3>
        <div className="space-y-2">
          <button
            onClick={handleGhusul}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
              ghusulCompleted ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-background border-border text-foreground"
            )}
          >
            <span className="font-bold text-sm">Performed Ghusl (Purification)</span>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center border",
              ghusulCompleted ? "bg-emerald-500 border-emerald-500" : "border-border"
            )}>
              {ghusulCompleted && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>

          <button
            onClick={handleMissedFast}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
              missedFast ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400" : "bg-background border-border text-foreground"
            )}
          >
            <span className="font-bold text-sm">Missed a Ramadan fast today</span>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center border",
              missedFast ? "bg-amber-500 border-amber-500" : "border-border"
            )}>
              {missedFast && <Check className="w-4 h-4 text-white" />}
            </div>
          </button>

          {owed > 0 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-background border border-border">
              <div className="flex items-center gap-2">
                <BookHeart className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="font-bold text-sm text-foreground">{owed} fasts to make up</p>
                  <p className="text-xs text-muted-foreground">Tap to mark one done</p>
                </div>
              </div>
              <button
                onClick={() => { markFastMadeUp(); toast.success("Fast marked as made up"); }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
