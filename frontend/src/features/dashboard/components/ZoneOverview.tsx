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

import { HardHat, Radio, FileCheck2, Gauge, MapPin, ArrowRight, Activity } from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { ZoneOverview as ZoneOverviewData } from '@/types';
import { useNavigate } from 'react-router-dom';

export interface ZoneOverviewProps {
  zones: ZoneOverviewData[];
  className?: string;
}

function ZoneCard({ zone, workers_present, active_sensors, active_permits, risk_level }: ZoneOverviewData) {
  const navigate = useNavigate();
  const isCritical = risk_level === 'critical';
  const isElevated = risk_level === 'high' || risk_level === 'medium';
  const healthLabel = isCritical ? 'Emergency' : isElevated ? 'Monitoring' : 'Operational';
  const healthColor = isCritical ? 'text-danger-500' : isElevated ? 'text-caution-500' : 'text-success-500';

  return (
    <Card 
      onClick={() => navigate(`/live-monitoring?zone=${encodeURIComponent(zone)}`)}
      className="relative group flex flex-col gap-0 overflow-hidden bg-[var(--sf-surface-card)] hover:bg-[var(--sf-surface-hover)] hover:border-[var(--sf-border-hover)] transition-all duration-300 ease-in-out cursor-pointer p-0"
    >
      
      {/* Zone Header Row */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3 border-b border-[var(--sf-border-subtle)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-900/20 text-primary-400 flex items-center justify-center border border-primary-900/30">
            <MapPin className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <h3 className="text-sm font-bold text-[var(--sf-text-primary)] truncate">{zone}</h3>
            <span className="text-xs text-[var(--sf-text-tertiary)] flex items-center gap-1 mt-0.5">
              <Activity className={cn("w-3 h-3", healthColor)} />
              {healthLabel}
            </span>
          </div>
        </div>
        <Badge variant={risk_level ? SEVERITY_BADGE_VARIANT[risk_level] : 'default'} size="sm" dot pulsing={risk_level === 'critical' || risk_level === 'high'}>
          {risk_level ? capitalise(risk_level) : 'Unknown'}
        </Badge>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-px bg-[var(--sf-border-subtle)]">
        <div className="flex flex-col items-center justify-center gap-1 text-center bg-[var(--sf-surface-card)] group-hover:bg-[var(--sf-surface-hover)] p-3 transition-colors duration-300">
          <HardHat className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)] mb-0.5" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none tracking-tight">
            {workers_present}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wider font-semibold">Workers</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 text-center bg-[var(--sf-surface-card)] group-hover:bg-[var(--sf-surface-hover)] p-3 transition-colors duration-300">
          <Radio className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)] mb-0.5" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none tracking-tight">
            {active_sensors}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wider font-semibold">Sensors</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 text-center bg-[var(--sf-surface-card)] group-hover:bg-[var(--sf-surface-hover)] p-3 transition-colors duration-300">
          <FileCheck2 className="w-3.5 h-3.5 text-[var(--sf-text-tertiary)] mb-0.5" aria-hidden="true" />
          <span className="text-lg font-bold text-[var(--sf-text-primary)] font-mono leading-none tracking-tight">
            {active_permits}
          </span>
          <span className="text-2xs text-[var(--sf-text-tertiary)] uppercase tracking-wider font-semibold">Permits</span>
        </div>
      </div>

      {/* Quick Open Overlay */}
      <div className="absolute inset-0 bg-primary-900/50 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 pointer-events-none">
        <div className="flex items-center gap-2 px-4 py-2 bg-[var(--sf-surface-overlay)] text-primary-100 rounded-full font-medium text-sm shadow-xl transform scale-95 group-hover:scale-100 transition-transform duration-300">
          Quick Open <ArrowRight className="w-4 h-4" />
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
