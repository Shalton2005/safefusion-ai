/**
 * HazardDetectionSection
 *
 * Hazard Detection Panel — fire, smoke, gas leak (backend sensor/incident
 * event, not a CV detection), unsafe worker behaviour, and restricted
 * area entry, most recent first. Each entry displays severity,
 * timestamp, location, and lifecycle status.
 */

import { AlertTriangle, Droplet, Flame, ShieldAlert, UserX, DoorOpen, RotateCw } from 'lucide-react';
import type { ElementType } from 'react';
import { Alert, Badge, Button, Card, CardContent, CardHeader, EmptyState, Skeleton } from '@/components/ui';
import { formatLabel, formatRelativeTime, formatDateTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, ALERT_STATUS_BADGE_VARIANT } from '@/utils/severity';
import { useHazardDetections } from '../hooks';
import type { HazardType } from '../types';

export interface HazardDetectionSectionProps {
  zone?: string;
}

const HAZARD_ICON: Record<HazardType, ElementType> = {
  fire: Flame,
  smoke: AlertTriangle,
  gas_leak: Droplet,
  unsafe_worker_behaviour: UserX,
  restricted_area_entry: DoorOpen,
};

const STATUS_LABEL = {
  active:       'Active',
  acknowledged: 'Acknowledged',
  resolved:     'Resolved',
} as const;

export function HazardDetectionSection({ zone }: HazardDetectionSectionProps) {
  const { hazards, loading, error, refetch } = useHazardDetections(zone);
  const activeCount = hazards.filter((h) => h.status === 'active').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Hazard Detection"
        description="Fire, smoke, gas leaks, unsafe worker behaviour, and restricted area entry, detected in real time."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && hazards.length > 0 && (
            <Badge variant={activeCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={activeCount > 0}>
              {activeCount} active
            </Badge>
          )
        }
      />

      <CardContent className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load hazard detections"
            actions={
              <Button size="sm" variant="outline" onClick={refetch} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : hazards.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No hazards detected"
            description="No active hazard detections across any monitored zone."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {hazards.map((hazard) => {
              const Icon = HAZARD_ICON[hazard.type];
              return (
                <div
                  key={hazard.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 bg-danger-500/15 text-danger-500">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-[var(--sf-text-primary)]">
                        {formatLabel(hazard.type)}
                      </p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant={SEVERITY_BADGE_VARIANT[hazard.severity]} size="sm" dot pulsing={hazard.severity === 'critical'}>
                          {formatLabel(hazard.severity)}
                        </Badge>
                        <Badge variant={ALERT_STATUS_BADGE_VARIANT[hazard.status]} size="sm">
                          {STATUS_LABEL[hazard.status]}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--sf-text-secondary)] leading-relaxed">
                      {hazard.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-[var(--sf-text-tertiary)]">
                      <span>{hazard.location}</span>
                      <span title={formatDateTime(hazard.detectedAt)}>{formatRelativeTime(hazard.detectedAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
