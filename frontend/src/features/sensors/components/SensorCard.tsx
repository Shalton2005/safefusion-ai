import { Flame, Thermometer, Gauge, Droplets } from 'lucide-react';
import { Card, CardHeader, Badge } from '@/components/ui';
import type { SensorReading, SensorStatus, SensorType } from '@/types';

export interface ZoneSensorGroup {
  zone: string;
  status: SensorStatus;
  lastReading: string;
  readings: Partial<Record<SensorType, SensorReading>>;
}

const statusVariant: Record<SensorStatus, 'success' | 'warning' | 'danger'> = {
  normal:   'success',
  warning:  'warning',
  critical: 'danger',
};

const statusLabel: Record<SensorStatus, string> = {
  normal:   'Normal',
  warning:  'Warning',
  critical: 'Critical',
};

const metricConfig: Record<SensorType, { label: string; icon: React.ElementType }> = {
  gas:         { label: 'Gas',         icon: Flame },
  temperature: { label: 'Temperature', icon: Thermometer },
  pressure:    { label: 'Pressure',    icon: Gauge },
  humidity:    { label: 'Humidity',    icon: Droplets },
};

const METRIC_ORDER: SensorType[] = ['gas', 'temperature', 'pressure', 'humidity'];

interface SensorCardProps {
  group: ZoneSensorGroup;
}

export function SensorCard({ group }: SensorCardProps) {
  return (
    <Card padding="sm">
      <CardHeader
        title={group.zone}
        description={`Last reading: ${new Date(group.lastReading).toLocaleString()}`}
        action={
          <Badge variant={statusVariant[group.status]} size="sm" dot pulsing={group.status === 'critical'}>
            {statusLabel[group.status]}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        {METRIC_ORDER.map((type) => {
          const reading = group.readings[type];
          const { label, icon: Icon } = metricConfig[type];

          return (
            <div
              key={type}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)] px-3 py-2.5"
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-[var(--sf-text-tertiary)]" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-2xs font-semibold uppercase tracking-wider text-[var(--sf-text-tertiary)] leading-none">
                  {label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--sf-text-primary)] leading-none">
                  {reading ? `${reading.value}${reading.unit}` : '—'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
