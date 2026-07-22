/**
 * SensorReadingsChart
 *
 * Small multiples: one mini line chart per sensor type, each with its own
 * appropriately-scaled axis. Gas (ppm), temperature (°C), and pressure (kPa)
 * live on incompatible scales, so they never share a single Y-axis — that
 * would flatten the smaller series against the larger one's range.
 *
 * @example
 * <SensorReadingsChart data={SENSOR_READINGS_DATA} />
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { cn } from '@/lib/cn';

interface SensorReadingPoint {
  time: string;
  gas: number;
  temperature: number;
  pressure: number;
}

export interface SensorReadingsChartProps {
  data: SensorReadingPoint[];
}

const AXIS_TICK = { fill: 'var(--sf-text-tertiary)', fontSize: 10 };

const SERIES = [
  { key: 'gas',         name: 'Gas',         unit: 'ppm', color: '#3b82f6', warning: 20, critical: 50 },
  { key: 'temperature', name: 'Temperature', unit: '°C',  color: '#ea580c', warning: 35, critical: 50 },
  { key: 'pressure',    name: 'Pressure',    unit: 'kPa', color: '#16a34a', warning: 105, critical: 120 },
] as const;

export function SensorReadingsChart({ data }: SensorReadingsChartProps) {
  const getDynamicStatus = (key: 'gas' | 'temperature' | 'pressure', series: typeof SERIES[number]) => {
    if (!data || data.length === 0) return { status: 'Unknown', statusColor: 'text-[var(--sf-text-tertiary)]' };
    const latest = data[data.length - 1][key];
    if (latest >= series.critical) return { status: 'Critical', statusColor: 'text-danger-500' };
    if (latest >= series.warning) return { status: 'Warning', statusColor: 'text-caution-500' };
    return { status: 'Stable', statusColor: 'text-safe-500' };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
      {SERIES.map((s) => {
        const { status, statusColor } = getDynamicStatus(s.key, s);
        return (
          <div key={s.key} className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-2xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: 'var(--sf-text-tertiary)' }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
                {s.name} <span className="normal-case font-normal">({s.unit})</span>
              </p>
              <span className={cn("text-2xs font-bold uppercase tracking-wider", statusColor)}>
                {status}
              </span>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-border-default)" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--sf-border-default)' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={AXIS_TICK}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip
                    content={<ChartTooltip valueFormatter={(v) => `${v} ${s.unit}`} />}
                    cursor={{ stroke: 'var(--sf-border-strong)', strokeDasharray: '3 3' }}
                  />
                  <Line
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--sf-surface-card)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );
}
