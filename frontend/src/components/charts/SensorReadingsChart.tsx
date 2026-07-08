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

export interface SensorReadingPoint {
  time: string;
  gas: number;
  temperature: number;
  pressure: number;
}

export interface SensorReadingsChartProps {
  data: SensorReadingPoint[];
}

const AXIS_TICK = { fill: 'var(--sf-text-tertiary)', fontSize: 10 };

// Fixed categorical order — never reassigned per series count.
const SERIES = [
  { key: 'gas',         name: 'Gas',         unit: 'ppm', color: '#3b82f6' },
  { key: 'temperature', name: 'Temperature', unit: '°C',  color: '#ea580c' },
  { key: 'pressure',    name: 'Pressure',    unit: 'kPa', color: '#16a34a' },
] as const;

export function SensorReadingsChart({ data }: SensorReadingsChartProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 h-full">
      {SERIES.map((s) => (
        <div key={s.key} className="flex flex-col min-h-0">
          <p className="text-2xs font-semibold uppercase tracking-wide mb-1 flex items-center gap-1.5" style={{ color: 'var(--sf-text-tertiary)' }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} aria-hidden="true" />
            {s.name} <span className="normal-case font-normal">({s.unit})</span>
          </p>
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
      ))}
    </div>
  );
}
