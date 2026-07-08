import { Flame, Bomb, HardHat, MapPin, Clock } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { capitalise, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, INCIDENT_TYPE_LABEL } from '@/utils/severity';
import type { Incident, IncidentType } from '@/types';

const incidentTypeIcon: Record<IncidentType, React.ElementType> = {
  gas_leak:      Flame,
  fire:          Flame,
  explosion:     Bomb,
  ppe_violation: HardHat,
};

interface IncidentCardProps {
  incident: Incident;
}

export function IncidentCard({ incident }: IncidentCardProps) {
  const label = INCIDENT_TYPE_LABEL[incident.incident_type];
  const Icon = incidentTypeIcon[incident.incident_type];

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
          <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{label}</p>
        </div>
        <Badge variant={SEVERITY_BADGE_VARIANT[incident.severity]} size="sm" dot pulsing={incident.severity === 'critical'}>
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
