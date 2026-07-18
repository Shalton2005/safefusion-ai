import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { incidentsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { Incident } from '@/types';
import { IncidentCard } from './IncidentCard';

export function RecentIncidentsPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await incidentsService.getIncidents({ skip: 0, limit: 6 }, { signal });
      const sorted = [...data].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
      );
      setIncidents(sorted);
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

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchIncidents(signal);
    return () => controller.abort();
  }, []);

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Recent Incidents"
        description="Latest reported safety incidents across all zones."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && incidents.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              {incidents.length} incident{incidents.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />
      <div className="p-4">
        <QueryState
          loading={loading}
          error={error}
          data={incidents}
          onRetry={() => fetchIncidents()}
          errorTitle="Failed to load recent incidents"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} padding="sm">
                  <Skeleton className="h-4 w-32 mb-3 rounded" />
                  <Skeleton className="h-3 w-full mb-1.5 rounded" />
                  <Skeleton className="h-3 w-2/3 rounded" />
                </Card>
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={Flame}
              title="No recent incidents"
              description="No safety incidents have been reported recently."
            />
          }
        >
          {(data) => (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}
