import { MapPin, Factory } from 'lucide-react';
import { Card, CardHeader, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';

// ─── Placeholder plant zone data ───────────────────────────────────
// Static, illustrative only — no backend integration until the Leaflet
// map layer replaces this placeholder.

interface PlantZone {
  name: string;
  risk: SeverityLevel;
}

const PLANT_ZONES: PlantZone[] = [
  { name: 'Tank-Farm',    risk: 'high' },
  { name: 'Boiler-Area',  risk: 'critical' },
  { name: 'Zone-A',       risk: 'medium' },
  { name: 'Zone-B',       risk: 'low' },
  { name: 'Zone-C',       risk: 'medium' },
  { name: 'Zone-D',       risk: 'low' },
];

const RISK_LEGEND: { level: SeverityLevel; label: string }[] = [
  { level: 'low',      label: 'Low' },
  { level: 'medium',   label: 'Medium' },
  { level: 'high',     label: 'High' },
  { level: 'critical', label: 'Critical' },
];

const riskDotClass: Record<SeverityLevel, string> = {
  low:      'bg-safe-500',
  medium:   'bg-primary-500',
  high:     'bg-caution-500',
  critical: 'bg-danger-500',
};

const riskBorderClass: Record<SeverityLevel, string> = {
  low:      'border-safe-500/40',
  medium:   'border-primary-500/40',
  high:     'border-caution-500/40',
  critical: 'border-danger-500/40',
};

export function SafetyHeatmapContainer() {
  return (
    <Card padding="none">
      <CardHeader
        title="Safety Heatmap"
        description="Plant-wide risk overview by zone."
        className="px-6 pt-5 pb-0"
        action={
          <Badge variant="ghost" size="sm">
            Map view coming soon
          </Badge>
        }
      />

      <div className="p-4 flex flex-col gap-4">
        {/* Risk legend */}
        <div className="flex flex-wrap items-center gap-4 px-2">
          {RISK_LEGEND.map((entry) => (
            <div key={entry.level} className="flex items-center gap-1.5">
              <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', riskDotClass[entry.level])} aria-hidden="true" />
              <span className="text-xs text-[var(--sf-text-tertiary)]">{entry.label}</span>
            </div>
          ))}
        </div>

        {/* Map placeholder — reserves space for the future Leaflet layer */}
        <div
          className={cn(
            'relative w-full aspect-video sm:aspect-[16/7] rounded-xl overflow-hidden',
            'border-2 border-dashed border-[var(--sf-border-default)]',
            'bg-[var(--sf-surface-sunken)]',
          )}
          role="img"
          aria-label="Industrial plant map placeholder — interactive map will render here"
        >
          {/* Faint industrial-plant silhouette backdrop */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.07]">
            <Factory className="w-32 h-32 sm:w-48 sm:h-48 text-[var(--sf-text-primary)]" aria-hidden="true" />
          </div>

          {/* Plant zone markers scattered across the placeholder canvas */}
          <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 gap-3 p-5 sm:p-8">
            {PLANT_ZONES.map((zone) => (
              <div key={zone.name} className="flex items-center justify-center">
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border bg-[var(--sf-surface-card)]/90 backdrop-blur-sm',
                    'px-2.5 py-1 shadow-sf-card',
                    riskBorderClass[zone.risk],
                  )}
                >
                  <MapPin className={cn('w-3 h-3 flex-shrink-0', riskDotClass[zone.risk].replace('bg-', 'text-'))} aria-hidden="true" />
                  <span className="text-2xs font-medium text-[var(--sf-text-primary)] whitespace-nowrap">
                    {zone.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Overlay caption */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 py-2 bg-[var(--sf-surface-base)]/70 backdrop-blur-sm">
            <span className="text-xs text-[var(--sf-text-tertiary)]">
              Interactive plant map (Leaflet) will render here
            </span>
          </div>
        </div>

        {/* Plant zones list */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLANT_ZONES.map((zone) => (
            <div
              key={zone.name}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] px-3 py-2"
            >
              <span className="text-xs font-medium text-[var(--sf-text-primary)] truncate">{zone.name}</span>
              <Badge variant={SEVERITY_BADGE_VARIANT[zone.risk]} size="sm" dot>
                {zone.risk}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
