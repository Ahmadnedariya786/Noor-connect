/**
 * Symptom Trend Chart Component
 * Visualizes symptom severity over time using Recharts
 */

import { useMemo, useState, lazy, Suspense } from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DailySymptoms, CycleRecord } from '@/types/menstrual';
import { format, parseISO, subDays } from 'date-fns';
import { Skeleton } from '@/components/LoadingSkeleton';

// Lazy load Recharts components to reduce bundle size
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const Legend = lazy(() => import('recharts').then(module => ({ default: module.Legend })));
const Area = lazy(() => import('recharts').then(module => ({ default: module.Area })));
const AreaChart = lazy(() => import('recharts').then(module => ({ default: module.AreaChart })));

interface SymptomTrendChartProps {
  cycles: CycleRecord[];
  days?: number; // Number of days to show, default 30
}

const SYMPTOM_COLORS: Record<string, string> = {
  cramps: '#e11d48',        // rose-600
  headaches: '#f97316',     // orange-500
  fatigue: '#8b5cf6',       // violet-500
  mood: '#ec4899',          // pink-500
  bloating: '#06b6d4',      // cyan-500
  breastTenderness: '#f43f5e', // rose-500
  backache: '#eab308',      // yellow-500
  acne: '#84cc16',          // lime-500
};

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: 'Cramps',
  headaches: 'Headaches',
  fatigue: 'Fatigue',
  mood: 'Mood',
  bloating: 'Bloating',
  breastTenderness: 'Tenderness',
  backache: 'Backache',
  acne: 'Acne',
};

type SymptomKey = keyof Omit<DailySymptoms, 'date' | 'flow' | 'notes'>;

export function SymptomTrendChart({ cycles, days = 30 }: SymptomTrendChartProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<Set<string>>(
    new Set(['cramps', 'fatigue', 'mood', 'bloating'])
  );
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  // Aggregate all symptoms across cycles within the date range
  const chartData = useMemo(() => {
    const cutoffDate = subDays(new Date(), days);
    const symptomMap = new Map<string, DailySymptoms>();

    for (const cycle of cycles) {
      for (const symptom of cycle.symptoms) {
        const date = parseISO(symptom.date);
        if (date >= cutoffDate) {
          symptomMap.set(symptom.date, symptom);
        }
      }
    }

    // Sort by date and convert to chart format
    return Array.from(symptomMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => ({
        date: format(parseISO(s.date), 'MMM d'),
        fullDate: s.date,
        cramps: s.cramps,
        headaches: s.headaches,
        fatigue: s.fatigue,
        mood: s.mood,
        bloating: s.bloating,
        breastTenderness: s.breastTenderness,
        backache: s.backache,
        acne: s.acne,
      }));
  }, [cycles, days]);

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms(prev => {
      const next = new Set(prev);
      if (next.has(symptom)) {
        next.delete(symptom);
      } else {
        next.add(symptom);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSymptoms.size === Object.keys(SYMPTOM_LABELS).length) {
      setSelectedSymptoms(new Set());
    } else {
      setSelectedSymptoms(new Set(Object.keys(SYMPTOM_LABELS)));
    }
  };

  if (chartData.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Symptom Trends
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          No symptom data yet. Log symptoms to see trends over time.
        </p>
      </Card>
    );
  }

  const Chart = chartType === 'line' ? LineChart : AreaChart;
  const ChartElement = chartType === 'line' ? Line : Area;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Symptom Trends
        </h3>
        <div className="flex gap-1">
          <Button
            variant={chartType === 'line' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setChartType('line')}
            className="text-xs h-7"
          >
            Line
          </Button>
          <Button
            variant={chartType === 'area' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setChartType('area')}
            className="text-xs h-7"
          >
            Area
          </Button>
        </div>
      </div>

      {/* Symptom toggles */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Badge
          variant={selectedSymptoms.size === Object.keys(SYMPTOM_LABELS).length ? 'default' : 'outline'}
          className="cursor-pointer text-xs"
          onClick={toggleAll}
        >
          All
        </Badge>
        {Object.entries(SYMPTOM_LABELS).map(([key, label]) => (
          <Badge
            key={key}
            variant={selectedSymptoms.has(key) ? 'default' : 'outline'}
            className="cursor-pointer text-xs"
            style={selectedSymptoms.has(key) ? { backgroundColor: SYMPTOM_COLORS[key] } : {}}
            onClick={() => toggleSymptom(key)}
          >
            {label}
          </Badge>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64">
        <Suspense fallback={<Skeleton className="h-full w-full" />}>
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                ticks={[0, 1, 2, 3, 4, 5]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ fontWeight: 'bold' }}
              />
              {selectedSymptoms.size > 0 && <Legend />}
              {Object.entries(SYMPTOM_COLORS).map(([key, color]) => {
                if (!selectedSymptoms.has(key)) return null;
                if (chartType === 'line') {
                  return (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: color }}
                      activeDot={{ r: 5 }}
                      name={SYMPTOM_LABELS[key]}
                    />
                  );
                }
                return (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    fill={color}
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name={SYMPTOM_LABELS[key]}
                  />
                );
              })}
            </Chart>
          </ResponsiveContainer>
        </Suspense>
      </div>

      <p className="text-xs text-muted-foreground mt-2 text-center">
        Showing last {days} days • {chartData.length} data points
      </p>
    </Card>
  );
}

export default SymptomTrendChart;
