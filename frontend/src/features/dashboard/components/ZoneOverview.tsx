/**
 * ZoneOverview
 *
 * Reusable, presentational grid of per-zone cards — each showing Zone
 * Name, Workers Present, Active Sensors, Active Permits, and Current
 * Risk Level. Purely props-driven, no data fetching; every value is
 * rendered exactly as received, with no client-side aggregation. Pair
 * with `ZoneOverviewSection` for the fetching wrapper.
 *
 * @example
 * <ZoneOverview
 *   zones={[
 *     { zone: 'Zone A', workers_present: 12, active_sensors: 8, active_permits: 3, risk_level: 'medium' },
 *   ]}
 * />
 */

import { HardHat, Radio, FileCheck2, Gauge, MapPin } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { ZoneOverview as ZoneOverviewData } from '@/types';

export interface ZoneOverviewProps {
  zones: ZoneOverviewData[];
  className?: string;
}

function ZoneCard({ zone, workers_present, active_sensors, active_permits, risk_level }: ZoneOverviewData) {
  return (
    <Card className="flex flex-col gap-4">
      {/* Zone name + risk level */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary-600/15 text-primary-400 flex items-center justify-center">
            <MapPin className="w-4.5 h-4.5" aria-hidden="true" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{zone}</h3>
        </div>
        <Badge variant={risk_level ? SEVERITY_BADGE_VARIANT[risk_level] : 'default'} size="sm" dot>
          {risk_level ? capitalise(risk_level) : 'Unknown'}
        </Badge>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--sf-border-default)]">
        <div className="flex flex-col items-center gap-1 text-center">
          <HardHat className="w-4 h-4 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none">
            {workers_present}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Workers</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Radio className="w-4 h-4 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none">
            {active_sensors}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Sensors</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <FileCheck2 className="w-4 h-4 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none">
            {active_permits}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wide">Permits</span>
        </div>
      </div>
    </Card>
  );
}

export function ZoneOverview({ zones, className }: ZoneOverviewProps) {
  if (zones.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="No zones found"
        description="No plant zones have been recorded yet."
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
        className,
      )}
    >
      {zones.map((zone) => (
        <ZoneCard key={zone.zone} {...zone} />
      ))}
    </div>
  );
}
