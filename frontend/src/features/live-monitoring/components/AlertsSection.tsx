import { useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { incidentsService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { Incident } from '@/types';
import { AlertStatusIndicator } from '@/features/alerts/components/AlertStatusIndicator';

export function AlertsSection() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchIncidents = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await incidentsService.getIncidents({ skip: 0, limit: 100 }, { signal });
      setIncidents(data);
      hasLoadedOnce.current = true;
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) {
        setError(apiError.toUserMessage());
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  const { lastUpdated, refresh } = usePolling(fetchIncidents, DASHBOARD_REFRESH_INTERVAL);

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Alerts"
        description="Safety alerts by severity, type, and location."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && incidents.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              <Bell className="w-3 h-3 mr-1" />
              {incidents.length} alert{incidents.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />

      <div className="px-6 pb-1">
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div className="p-4">
        <QueryState
          loading={loading}
          error={error}
          data={incidents}
          onRetry={refresh}
          errorTitle="Failed to load alerts"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={Bell}
              size="sm"
              title="No alerts"
              description="No safety alerts have been reported."
            />
          }
        >
          {(data) => (
            <div className="space-y-2">
              {data.map((incident) => (
                <AlertStatusIndicator
                  key={incident.id}
                  severity={incident.severity}
                  message={incident.description}
                  timestamp={incident.occurred_at}
                  source={incident.zone}
                />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
