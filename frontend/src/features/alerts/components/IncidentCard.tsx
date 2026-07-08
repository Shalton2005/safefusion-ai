import { Flame, Bomb, HardHat, MapPin, Clock } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { capitalise, formatRelativeTime } from '@/utils/format';
import type { Incident, IncidentType } from '@/types';
import type { SeverityLevel } from '@/constants';

const severityVariant: Record<SeverityLevel, 'danger' | 'warning' | 'primary' | 'success'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'primary',
  low:      'success',
};

const incidentTypeConfig: Record<IncidentType, { label: string; icon: React.ElementType }> = {
  gas_leak:      { label: 'Gas Leak',      icon: Flame },
  fire:          { label: 'Fire',          icon: Flame },
  explosion:     { label: 'Explosion',     icon: Bomb },
  ppe_violation: { label: 'PPE Violation', icon: HardHat },
};

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const { label, icon: Icon } = incidentTypeConfig[incident.incident_type];

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{label}</p>
        </div>
        <Badge variant={severityVariant[incident.severity]} size="sm" dot pulsing={incident.severity === 'critical'}>
          {capitalise(incident.severity)}
        </Badge>
      </div>

      <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed line-clamp-2">
        {incident.description}
      </p>

      <div className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)]">
        <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
        {incident.zone}
      </div>

      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--sf-border-default)]">
        <div className="flex items-center gap-1.5 text-2xs text-[var(--sf-text-tertiary)]">
          <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          {formatRelativeTime(incident.occurred_at)}
        </div>
        <span className="text-2xs text-[var(--sf-text-tertiary)]">Workers Involved: —</span>
      </div>

      <Badge variant="outline" size="sm" className="self-start">
        Reported
      </Badge>
    </Card>
  );
}
