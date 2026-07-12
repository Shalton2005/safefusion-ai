import { ShieldAlert, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert as AlertBanner, Button } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { EmergencyResponsePanel } from './EmergencyResponsePanel';
import type { EmergencyActionItem } from '@/types';

export interface EmergencyResponsePanelSectionViewProps {
  actions: EmergencyActionItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational emergency response section — accepts already-fetched
 * actions so a parent (e.g. `DashboardPage` via a shared
 * `useEmergencyResponse()` call) can avoid refetching the same
 * `GET /emergency/actions` endpoint this panel would otherwise call on
 * its own. Use `EmergencyResponsePanelSection` below for standalone,
 * self-fetching usage.
 */
export function EmergencyResponsePanelSectionView({
  actions,
  loading,
  error,
  lastUpdated,
  refresh,
  className,
}: EmergencyResponsePanelSectionViewProps) {
  return (
    <Card padding="none" className={className}>
      <CardHeader
        title="Emergency Response"
        description="Actions dispatched by the Emergency Response engine, in recommended order."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && actions.length > 0 && (
            <Badge variant="danger" size="sm" dot pulsing>
              {actions.length} action{actions.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />
      <div className="p-4 flex flex-col gap-2">
        {error ? (
          <AlertBanner
            variant="danger"
            title="Failed to load emergency actions"
            actions={
              <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </AlertBanner>
        ) : !loading && actions.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No emergency actions"
            description="No emergency actions have been dispatched. All zones are within safe thresholds."
          />
        ) : (
          <EmergencyResponsePanel actions={actions} />
        )}
        {!error && <LastUpdated timestamp={lastUpdated} className="px-1" />}
      </div>
    </Card>
  );
}

export interface EmergencyResponsePanelSectionProps {
  className?: string;
}

/** Standalone, self-fetching `EmergencyResponsePanelSection` — fetches its own `GET /emergency/actions` data. Use `EmergencyResponsePanelSectionView` instead when the data is already fetched elsewhere on the page. */
export function EmergencyResponsePanelSection({ className }: EmergencyResponsePanelSectionProps) {
  const { actions, loading, error, lastUpdated, refresh } = useEmergencyResponse();
  return (
    <EmergencyResponsePanelSectionView
      actions={actions}
      loading={loading}
      error={error}
      lastUpdated={lastUpdated}
      refresh={refresh}
      className={className}
    />
  );
}
