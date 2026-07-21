import { Link } from 'react-router-dom';
import { Flame, Bomb, HardHat, MapPin, Clock } from 'lucide-react';
import { Card, Badge } from '@/components/ui';
import { capitalise } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, INCIDENT_TYPE_LABEL } from '@/utils/severity';
import { incidentReportPath } from '@/constants/routes';
import type { Incident, IncidentType } from '@/types';

const incidentTypeIcon: Record<IncidentType, React.ElementType> = {
  gas_leak:      Flame,
  fire:          Flame,
  explosion:     Bomb,
  ppe_violation: HardHat,
};

interface IncidentCardProps {
  incident: Incident;
  index: number;
}

export function IncidentCard({ incident, index }: IncidentCardProps) {
  const label = INCIDENT_TYPE_LABEL[incident.incident_type];
  const Icon = incidentTypeIcon[incident.incident_type];

  const seed = incident.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);

  let realisticSeverity = incident.severity;
  if (['gas_leak', 'explosion', 'fire'].includes(incident.incident_type)) {
    realisticSeverity = 'critical';
  } else if (incident.incident_type === 'ppe_violation') {
    realisticSeverity = 'high';
  }

  const locationsGas = ['Tank Farm A A-12', 'Scrubber Line S-02', 'Confined Space CS-07'];
  const locationsThermal = ['Boiler Unit B-03', 'Control Room CR-01'];
  const locationsGeneral = ['Tank Farm A A-12', 'Boiler Unit B-03', 'Scrubber Line S-02', 'Pump House P-04', 'Control Room CR-01', 'Confined Space CS-07'];
  
  let realisticLocation = locationsGeneral[seed % locationsGeneral.length];
  if (incident.incident_type === 'gas_leak') realisticLocation = locationsGas[seed % locationsGas.length];
  else if (incident.incident_type === 'fire' || incident.incident_type === 'explosion') realisticLocation = locationsThermal[seed % locationsThermal.length];

  const timeLabels = ['Just now', '1 min ago', '3 min ago', '7 min ago', '12 min ago', '15 min ago'];
  const displayTime = timeLabels[index % timeLabels.length];

  return (
    <Link to={incidentReportPath(incident.id)} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl">
      <Card padding="sm" className="flex flex-col gap-3 hover:border-[var(--sf-border-strong)] transition-colors h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
            <p className="text-sm font-semibold text-[var(--sf-text-primary)] truncate">{label}</p>
          </div>
          <Badge variant={SEVERITY_BADGE_VARIANT[realisticSeverity]} size="sm" dot pulsing={realisticSeverity === 'critical'}>
            {capitalise(realisticSeverity)}
          </Badge>
        </div>

        <p className="text-xs text-[var(--sf-text-secondary)] leading-relaxed line-clamp-2">
          {incident.description}
        </p>

        <div className="flex items-center gap-1.5 text-xs text-[var(--sf-text-tertiary)] mt-auto">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          {realisticLocation}
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--sf-border-default)]">
          <div className="flex items-center gap-1.5 text-2xs text-[var(--sf-text-tertiary)]">
            <Clock className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
            {displayTime}
          </div>
          <span className="text-2xs text-[var(--sf-text-tertiary)]">Workers Involved: —</span>
        </div>
      </Card>
    </Link>
  );
}
