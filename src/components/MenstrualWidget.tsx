/**
 * Menstrual Widget Component
 * PWA-compatible quick-access widget for home screen and in-app dashboard
 */

import { useState, useMemo } from 'react';
import { Droplets, Heart, Moon, Sun, Flower2, AlertCircle, Pill, Plus, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import type { DailySymptoms, CyclePhase, FlowIntensity } from '@/types/menstrual';
import { determinePhase, getCycleDay, getPhaseColor as getPhaseHex } from '@/lib/menstrual-storage';

interface MenstrualWidgetProps {
  isActive: boolean;
  cycleStartDate?: string;
  cycleLength?: number;
  todaySymptoms?: DailySymptoms | null;
  onLogSymptom?: (symptoms: Partial<DailySymptoms>) => void;
  onLogPeriod?: () => void;
  onOpenFull?: () => void;
  size?: 'compact' | 'wide' | 'full';
}

const PHASE_ICONS: Record<CyclePhase, React.ComponentType<any>> = {
  menstrual: Droplets,
  follicular: Flower2,
  ovulatory: Sun,
  luteal: Moon,
  premenstrual: AlertCircle,
};

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual: 'Period',
  follicular: 'Follicular',
  ovulatory: 'Ovulation',
  luteal: 'Luteal',
  premenstrual: 'PMS',
};

const MOOD_EMOJIS = ['😔', '😐', '🙂', '😊', '😄'];
const FLOW_OPTIONS: { value: FlowIntensity; label: string; color: string }[] = [
  { value: 'none', label: 'None', color: 'bg-gray-200' },
  { value: 'spotting', label: 'Spot', color: 'bg-rose-200' },
  { value: 'light', label: 'Light', color: 'bg-rose-300' },
  { value: 'medium', label: 'Med', color: 'bg-rose-400' },
  { value: 'heavy', label: 'Heavy', color: 'bg-rose-500' },
];

export function MenstrualWidget({
  isActive,
  cycleStartDate,
  cycleLength = 28,
  todaySymptoms,
  onLogSymptom,
  onLogPeriod,
  onOpenFull,
  size = 'compact',
}: MenstrualWidgetProps) {
  const [quickMood, setQuickMood] = useState<number>(todaySymptoms?.mood || 3);
  const [quickCramps, setQuickCramps] = useState<number>(todaySymptoms?.cramps || 0);
  const [quickFlow, setQuickFlow] = useState<FlowIntensity>(todaySymptoms?.flow || 'none');

  // Calculate current phase
  const phaseInfo = useMemo(() => {
    if (!isActive || !cycleStartDate) return null;
    const cycleDay = getCycleDay(new Date(cycleStartDate));
    const phase = determinePhase(cycleDay, cycleLength);
    return { ...phase, cycleDay };
  }, [isActive, cycleStartDate, cycleLength]);

  const handleQuickLog = () => {
    onLogSymptom?.({
      mood: quickMood,
      cramps: quickCramps,
      flow: quickFlow,
      date: new Date().toISOString().split('T')[0],
    });
  };

  // ===== COMPACT WIDGET (2x2) =====
  if (size === 'compact') {
    return (
      <Card className="p-3 relative overflow-hidden">
        {isActive && phaseInfo ? (
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = PHASE_ICONS[phaseInfo.phase];
              return (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getPhaseHex(phaseInfo.phase) + '20' }}
                >
                  <Icon className="w-6 h-6" style={{ color: getPhaseHex(phaseInfo.phase) }} />
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{PHASE_LABELS[phaseInfo.phase]} Phase</p>
              <p className="text-xs text-muted-foreground">Day {phaseInfo.cycleDay} of cycle</p>
            </div>
            <Button size="sm" variant="ghost" onClick={onOpenFull} className="h-8 w-8 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Droplets className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Cycle Tracking</p>
              <p className="text-xs text-muted-foreground">Tap to start</p>
            </div>
            <Button size="sm" onClick={onLogPeriod} className="h-8">
              <Plus className="w-4 h-4 mr-1" /> Start
            </Button>
          </div>
        )}
      </Card>
    );
  }

  // ===== WIDE WIDGET (4x2) =====
  if (size === 'wide') {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isActive && phaseInfo ? (
              <>
                {(() => {
                  const Icon = PHASE_ICONS[phaseInfo.phase];
                  return <Icon className="w-5 h-5" style={{ color: getPhaseHex(phaseInfo.phase) }} />;
                })()}
                <div>
                  <p className="text-sm font-bold">{PHASE_LABELS[phaseInfo.phase]}</p>
                  <p className="text-xs text-muted-foreground">Day {phaseInfo.cycleDay}</p>
                </div>
              </>
            ) : (
              <p className="text-sm font-bold">Quick Log</p>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={onOpenFull} className="h-7 text-xs">
            Open
          </Button>
        </div>

        {/* Quick symptom buttons */}
        <div className="space-y-3">
          {/* Flow */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Flow</p>
            <div className="flex gap-1">
              {FLOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQuickFlow(opt.value)}
                  className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                    quickFlow === opt.value
                      ? `${opt.color} text-foreground`
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick mood */}
          <div>
            <p className="text-xs text-muted-foreground mb-1">Mood</p>
            <div className="flex gap-1">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setQuickMood(i + 1)}
                  className={`flex-1 py-1.5 rounded text-lg transition-transform ${
                    quickMood === i + 1 ? 'scale-110 bg-primary/10' : 'opacity-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Quick cramps */}
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground w-12">Cramps</p>
            <Slider
              value={[quickCramps]}
              onValueChange={([v]) => setQuickCramps(v)}
              max={5}
              step={1}
              className="flex-1"
            />
            <span className="text-xs font-medium w-6 text-right">{quickCramps}/5</span>
          </div>

          <Button size="sm" onClick={handleQuickLog} className="w-full h-8 text-xs">
            <Heart className="w-3 h-3 mr-1" /> Log
          </Button>
        </div>
      </Card>
    );
  }

  // ===== FULL WIDGET (4x4) =====
  return (
    <Card className="p-4 space-y-4">
      {/* Phase header */}
      {isActive && phaseInfo ? (
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: getPhaseHex(phaseInfo.phase) + '15' }}>
          {(() => {
            const Icon = PHASE_ICONS[phaseInfo.phase];
            return <Icon className="w-8 h-8" style={{ color: getPhaseHex(phaseInfo.phase) }} />;
          })()}
          <div className="flex-1">
            <p className="font-bold">{PHASE_LABELS[phaseInfo.phase]} Phase</p>
            <p className="text-sm text-muted-foreground">Day {phaseInfo.cycleDay} of your cycle</p>
          </div>
          <Badge style={{ backgroundColor: getPhaseHex(phaseInfo.phase), color: 'white' }}>
            {phaseInfo.dayOfPhase}/{phaseInfo.phaseLength}
          </Badge>
        </div>
      ) : (
        <div className="text-center p-4">
          <Droplets className="w-10 h-10 mx-auto text-rose-500 mb-2" />
          <p className="font-bold">Start Cycle Tracking</p>
          <p className="text-sm text-muted-foreground mb-3">Log your period to begin</p>
          <Button onClick={onLogPeriod} className="bg-rose-600 hover:bg-rose-700">
            <Droplets className="w-4 h-4 mr-2" /> Log Period Start
          </Button>
        </div>
      )}

      {/* Symptom logging */}
      {isActive && (
        <div className="space-y-4">
          {/* Flow */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Today's Flow</p>
            <div className="flex gap-1.5">
              {FLOW_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setQuickFlow(opt.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    quickFlow === opt.value
                      ? `${opt.color} text-foreground ring-2 ring-primary`
                      : 'bg-muted/30 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Mood</p>
            <div className="flex gap-2">
              {MOOD_EMOJIS.map((emoji, i) => (
                <button
                  key={i}
                  onClick={() => setQuickMood(i + 1)}
                  className={`flex-1 py-2 rounded-lg text-2xl transition-all ${
                    quickMood === i + 1 ? 'scale-110 bg-primary/10 ring-2 ring-primary' : 'opacity-40 hover:opacity-70'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Cramps */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Cramps</p>
              <span className="text-xs font-bold">{quickCramps}/5</span>
            </div>
            <Slider
              value={[quickCramps]}
              onValueChange={([v]) => setQuickCramps(v)}
              max={5}
              step={1}
            />
          </div>

          {/* Log button */}
          <Button onClick={handleQuickLog} className="w-full bg-rose-600 hover:bg-rose-700">
            <Heart className="w-4 h-4 mr-2" /> Log Today's Symptoms
          </Button>

          {/* Open full view */}
          <Button variant="ghost" onClick={onOpenFull} className="w-full text-xs">
            Open Full Tracker <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </Card>
  );
}

export default MenstrualWidget;
