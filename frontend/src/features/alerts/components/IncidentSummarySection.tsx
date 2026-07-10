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

import { Siren, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
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

export interface IncidentSummarySectionViewProps {
  incidents: IncidentSummaryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  className?: string;
}

/**
 * Presentational recent-incidents card — accepts already-fetched alert
 * data so a parent (e.g. `DashboardPage` via a shared `useRecentAlerts()`
 * call) can avoid refetching the same `GET /alerts` endpoint this section
 * would otherwise call on its own.
 */
export function IncidentSummarySectionView({ incidents, loading, error, refresh, className }: IncidentSummarySectionViewProps) {
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
              <Button size="sm" variant="outline" onClick={refresh} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
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

/** Standalone, self-fetching `IncidentSummarySection` — fetches its own `GET /alerts` data. Use `IncidentSummarySectionView` instead when the data is already fetched elsewhere on the page. */
export function IncidentSummarySection({ limit = 5, className }: IncidentSummarySectionProps) {
  const { alerts, loading, error, refresh } = useRecentAlerts({ limit });
  const incidents = [...alerts]
    .sort((a, b) => new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime())
    .map(toSummaryItem);

  return (
    <IncidentSummarySectionView
      incidents={incidents}
      loading={loading}
      error={error}
      refresh={refresh}
      className={className}
    />
  );
}
