/**
 * AlertDistributionChart
 *
 * Donut chart showing the share of alerts by severity. Categorical palette
 * validated for CVD separation and dark/light contrast (see project palette
 * mapping — status colors, fixed order: critical, high, medium, low).
 * Always paired with a legend and a direct % label per slice.
 *
 * @example
 * <AlertDistributionChart data={ALERT_DISTRIBUTION_DATA} />
 */

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { ChartTooltip } from './ChartTooltip';

export interface AlertDistributionSlice {
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  count: number;
}

export interface AlertDistributionChartProps {
  data: AlertDistributionSlice[];
}

// Fixed severity → color order (never reassigned when a filter changes counts).
const SEVERITY_COLOR: Record<AlertDistributionSlice['severity'], string> = {
  Critical: '#dc2626',
  High:     '#ea580c',
  Medium:   '#3b82f6',
  Low:      '#16a34a',
};

const RADIAN = Math.PI / 180;

// Direct % label anchored just outside the donut's outer edge, along
// each slice's mid-angle.
function renderLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, outerRadius, percent } = props;
  if (cx === undefined || cy === undefined || midAngle === undefined || outerRadius === undefined) {
    return null;
  }
  const radius = Number(outerRadius) + 16;
  const x = Number(cx) + radius * Math.cos(-midAngle * RADIAN);
  const y = Number(cy) + radius * Math.sin(-midAngle * RADIAN);
  const pct = percent ? Math.round(percent * 100) : 0;

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > Number(cx) ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      fill="var(--sf-text-secondary)"
    >
      {pct}%
    </text>
  );
}

export function AlertDistributionChart({ data }: AlertDistributionChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 16, right: 32, bottom: 0, left: 32 }}>
        <Tooltip content={<ChartTooltip />} />
        <Legend
          // Preserve fixed severity order — identity must never
          // reshuffle alphabetically or by slice size.
          itemSorter={null}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: 'var(--sf-text-secondary)', paddingTop: 8 }}
        />
        <Pie
          data={data}
          dataKey="count"
          nameKey="severity"
          innerRadius="50%"
          outerRadius="70%"
          paddingAngle={2}
          cornerRadius={4}
          stroke="var(--sf-surface-card)"
          strokeWidth={2}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((entry) => (
            <Cell key={entry.severity} fill={SEVERITY_COLOR[entry.severity]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
