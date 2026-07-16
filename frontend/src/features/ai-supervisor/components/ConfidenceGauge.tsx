/**
 * ConfidenceGauge
 *
 * Reusable radial gauge for a single 0-100 confidence value, built on
 * Recharts' `RadialBarChart` (the same chart library every other chart
 * in the app uses — see `components/charts/`). Color follows the
 * project's status scale (safe/caution/danger), matching
 * `ConfidenceMeter`'s linear equivalent and `WorkflowGraph`'s agent
 * status colors.
 *
 * @example
 * <ConfidenceGauge label="Detection Confidence" value={92} />
 */

import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/cn';

export interface ConfidenceGaugeProps {
  label: string;
  /** 0-100. */
  value: number;
  className?: string;
}

const SAFE_500 = '#22c55e';
const CAUTION_500 = '#f97316';
const DANGER_500 = '#ef4444';

function gaugeColor(value: number): string {
  if (value >= 75) return SAFE_500;
  if (value >= 40) return CAUTION_500;
  return DANGER_500;
}

export function ConfidenceGauge({ label, value, className }: ConfidenceGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ name: label, value: clamped, fill: gaugeColor(clamped) }];

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className="relative w-full h-28"
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={data}
            innerRadius="70%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            barSize={10}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'var(--sf-surface-sunken)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold text-[var(--sf-text-primary)] font-mono tracking-tight">
            {clamped}%
          </span>
        </div>
      </div>
      <span className="text-2xs text-center uppercase tracking-wide text-[var(--sf-text-tertiary)] leading-snug">
        {label}
      </span>
    </div>
  );
}
