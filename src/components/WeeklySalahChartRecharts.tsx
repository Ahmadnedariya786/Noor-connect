/**
 * Weekly Salah History Chart (recharts renderer)
 * Split into its own module so the recharts chunk only loads for users who
 * have animations enabled on a capable device.
 */
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";

export interface ChartData {
  day: string;
  fullDate: string;
  completed: number;
  total: number;
}

function getBarColor(completed: number): string {
  if (completed === 5) return "var(--accent)";
  if (completed >= 3) return "var(--accent-soft)";
  if (completed >= 1) return "var(--surface-2)";
  return "var(--surface-2)";
}

export function WeeklySalahChartRecharts({ chartData, dataVersion }: { chartData: ChartData[]; dataVersion: number }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart key={dataVersion} data={chartData} barCategoryGap="20%">
        <XAxis
          dataKey="day"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
        />
        <YAxis hide domain={[0, 5]} />
        <Bar
          dataKey="completed"
          radius={[4, 4, 0, 0]}
          maxBarSize={28}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(entry.completed)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default WeeklySalahChartRecharts;
