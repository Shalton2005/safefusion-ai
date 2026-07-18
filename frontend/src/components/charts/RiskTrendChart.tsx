/**
 * RiskTrendChart
 *
 * Area chart showing the overall risk score trend over time.
 * Single series → sequential brand hue, no legend needed (the
 * ChartCard title above it names the series).
 *
 * @example
 * <RiskTrendChart data={RISK_TREND_DATA} />
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';

interface RiskTrendPoint {
  date: string;
  score: number;
}

export interface RiskTrendChartProps {
  data: RiskTrendPoint[];
}

const AXIS_TICK = { fill: 'var(--sf-text-tertiary)', fontSize: 11 };

export function RiskTrendChart({ data }: RiskTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="riskTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--sf-border-default)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: 'var(--sf-border-default)' }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, 100]}
        />
        <Tooltip
          content={<ChartTooltip valueFormatter={(v) => `${v}`} />}
          cursor={{ stroke: 'var(--sf-border-strong)', strokeDasharray: '3 3' }}
        />
        <Area
          type="monotone"
          dataKey="score"
          name="Risk Score"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#riskTrendFill)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--sf-surface-card)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
