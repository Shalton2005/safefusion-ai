/**
 * IncidentSummarySection
 *
 * Data-fetching wrapper around `IncidentSummary`. Fetches the most
 * recent alerts, showing skeleton placeholders while loading, a
 * retryable error alert on failure, and an empty state when there are
 * no recent incidents.
 *
 * @example
 * <IncidentSummarySection />
 */

import { useEffect, useState } from 'react';
import { Siren, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { alertsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { AlertRecord } from '@/types';
import { IncidentSummary } from './IncidentSummary';
import type { IncidentSummaryItem } from './IncidentSummary';

export interface IncidentSummarySectionProps {
  /** Maximum number of recent incidents to display. @default 5 */
  limit?: number;
  className?: string;
}

function toSummaryItem(record: AlertRecord): IncidentSummaryItem {
  return {
    id: record.id,
    message: record.message,
    severity: record.severity,
    status: record.status,
    timestamp: record.generated_at,
    zone: record.zone,
  };
}

export function IncidentSummarySection({ limit = 5, className }: IncidentSummarySectionProps) {
  const [incidents, setIncidents] = useState<IncidentSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await alertsService.getRecentAlerts({ skip: 0, limit }, { signal });
      const sorted = [...data].sort(
        (a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
      );
      setIncidents(sorted.map(toSummaryItem));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit]);

  const criticalCount = incidents.filter((i) => i.severity === 'critical').length;

  return (
    <Card padding="none" className={className}>
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
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load recent incidents"
            actions={
              <Button size="sm" variant="outline" onClick={() => fetchIncidents()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm">
                <Skeleton className="h-4 w-32 mb-3 rounded" />
                <Skeleton className="h-3 w-full mb-1.5 rounded" />
                <Skeleton className="h-3 w-2/3 rounded" />
              </Card>
            ))}
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={Siren}
            title="No recent incidents"
            description="No safety incidents have been reported recently."
          />
        ) : (
          <IncidentSummary incidents={incidents} />
        )}
      </div>
    </Card>
  );
}
