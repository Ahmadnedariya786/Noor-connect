/**
 * Cycle Length Chart Component
 * Displays cycle length history and symptom correlation heatmap
 */

import { useMemo, useState, lazy, Suspense } from 'react';
import { BarChart3, Grid3X3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { CycleRecord } from '@/types/menstrual';
import { generateCycleLengthChartData, generateCorrelationHeatmap, analyzeCorrelations } from '@/lib/pattern-analysis';
import { Skeleton } from '@/components/LoadingSkeleton';

// Lazy load Recharts components to reduce bundle size
const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const Bar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const Cell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));
const ReferenceLine = lazy(() => import('recharts').then(module => ({ default: module.ReferenceLine })));

interface CycleLengthChartProps {
  cycles: CycleRecord[];
}

type ViewMode = 'bars' | 'heatmap';

export function CycleLengthChart({ cycles }: CycleLengthChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('bars');

  const chartData = useMemo(() => generateCycleLengthChartData(cycles), [cycles]);
  const { matrix, keys } = useMemo(() => generateCorrelationHeatmap(cycles), [cycles]);
  const correlations = useMemo(() => analyzeCorrelations(cycles), [cycles]);

  const averageLength = useMemo(() => {
    if (chartData.length === 0) return 28;
    return Math.round(chartData.reduce((sum, d) => sum + d.length, 0) / chartData.length);
  }, [chartData]);

  const getBarColor = (length: number) => {
    const diff = Math.abs(length - averageLength);
    if (diff <= 2) return '#10b981'; // emerald - regular
    if (diff <= 4) return '#f59e0b'; // amber - slight variation
    return '#ef4444'; // red - irregular
  };

  const getHeatmapColor = (value: number) => {
    const abs = Math.abs(value);
    if (abs < 0.2) return 'bg-muted';
    if (value > 0) {
      if (abs < 0.4) return 'bg-rose-200 dark:bg-rose-900/30';
      if (abs < 0.6) return 'bg-rose-300 dark:bg-rose-800/40';
      if (abs < 0.8) return 'bg-rose-400 dark:bg-rose-700/50';
      return 'bg-rose-500 text-white';
    } else {
      if (abs < 0.4) return 'bg-blue-200 dark:bg-blue-900/30';
      if (abs < 0.6) return 'bg-blue-300 dark:bg-blue-800/40';
      if (abs < 0.8) return 'bg-blue-400 dark:bg-blue-700/50';
      return 'bg-blue-500 text-white';
    }
  };

  const formatSymptomLabel = (key: string) => {
    const labels: Record<string, string> = {
      cramps: 'Cramps',
      headaches: 'Head',
      fatigue: 'Fatigue',
      mood: 'Mood',
      bloating: 'Bloat',
      breastTenderness: 'Brst',
      backache: 'Back',
      acne: 'Acne',
    };
    return labels[key] || key.slice(0, 4);
  };

  if (chartData.length === 0 && keys.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Cycle Analysis
        </h3>
        <p className="text-sm text-muted-foreground text-center py-8">
          Complete a few cycles to see length analysis and correlations.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-2">
          {viewMode === 'bars' ? <BarChart3 className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
          {viewMode === 'bars' ? 'Cycle Length History' : 'Symptom Correlations'}
        </h3>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'bars' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('bars')}
            className="text-xs h-7"
          >
            Lengths
          </Button>
          <Button
            variant={viewMode === 'heatmap' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('heatmap')}
            className="text-xs h-7"
          >
            Correlations
          </Button>
        </div>
      </div>

      {viewMode === 'bars' && chartData.length > 0 && (
        <>
          <div className="h-48">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    domain={[20, 40]}
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`${value} days`, 'Cycle Length']}
                  />
                  <ReferenceLine
                    y={averageLength}
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                    label={{ value: `Avg: ${averageLength}d`, position: 'right', fontSize: 10 }}
                  />
                  <Bar dataKey="length" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.length)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Suspense>
          </div>

          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Regular (±2d)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span>Slight variation</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Irregular</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Showing last {chartData.length} cycles • Average: {averageLength} days
          </p>
        </>
      )}

      {viewMode === 'bars' && chartData.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Complete a few cycles to see length history.
        </p>
      )}

      {viewMode === 'heatmap' && (
        <>
          {/* Heatmap grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[400px]">
              {/* Header row */}
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `80px repeat(${keys.length}, 1fr)` }}>
                <div />
                {keys.map(key => (
                  <div key={key} className="text-[10px] text-center text-muted-foreground p-1 truncate">
                    {formatSymptomLabel(key)}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {keys.map(rowKey => (
                <div
                  key={rowKey}
                  className="grid gap-0.5"
                  style={{ gridTemplateColumns: `80px repeat(${keys.length}, 1fr)` }}
                >
                  <div className="text-[10px] text-right text-muted-foreground p-1 pr-2 truncate">
                    {formatSymptomLabel(rowKey)}
                  </div>
                  {keys.map(colKey => {
                    const value = matrix[rowKey]?.[colKey] ?? 0;
                    return (
                      <div
                        key={colKey}
                        className={`aspect-square rounded-sm flex items-center justify-center text-[10px] font-medium ${getHeatmapColor(value)}`}
                        title={`${rowKey} vs ${colKey}: ${value.toFixed(2)}`}
                      >
                        {rowKey === colKey ? '-' : value.toFixed(1)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Negative</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-muted" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span>Positive</span>
            </div>
          </div>

          {/* Top correlations list */}
          {correlations.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Strongest Correlations:</p>
              <div className="space-y-1">
                {correlations.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="capitalize">
                      {c.symptom1.replace(/([A-Z])/g, ' $1')} ↔ {c.symptom2.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className={`font-medium ${c.correlation > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                      {c.correlation > 0 ? '+' : ''}{c.correlation.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mt-2 text-center">
            Based on {correlations.length > 0 ? correlations[0].sampleSize : 0} symptom entries
          </p>
        </>
      )}
    </Card>
  );
}

export default CycleLengthChart;
