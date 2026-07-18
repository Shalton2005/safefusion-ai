import { capitalise, formatLabel, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, ALERT_STATUS_BADGE_VARIANT, SEVERITY_PRIORITY_LABEL } from '@/utils/severity';
import { Bell } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, QueryState } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { CardHeaderLink } from '@/components/common/CardHeaderLink';
import { LastUpdated } from '@/components/common/LastUpdated';
import { ROUTES } from '@/constants/routes';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import type { AlertRecord } from '@/types';

const columns: TableColumn<AlertRecord>[] = [
  {
    key: 'severity',
    header: 'Severity',
    accessor: 'severity',
    render: (v) => (
      <Badge variant={SEVERITY_BADGE_VARIANT[v as AlertRecord['severity']]} size="sm" dot pulsing={v === 'critical'}>
        {capitalise(v as string)}
      </Badge>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    accessor: 'severity',
    render: (v) => (
      <span className="text-[var(--sf-text-secondary)]">
        {SEVERITY_PRIORITY_LABEL[v as AlertRecord['severity']]}
      </span>
    ),
  },
  {
    key: 'alert_type',
    header: 'Category',
    accessor: 'alert_type',
    render: (v) => <span className="text-[var(--sf-text-secondary)]">{formatLabel(v as string)}</span>,
  },
  {
    key: 'source',
    header: 'Source',
    accessor: 'source',
    render: (v) => <span className="text-[var(--sf-text-secondary)]">{formatLabel(v as string)}</span>,
  },
  {
    key: 'zone',
    header: 'Location',
    accessor: 'zone',
  },
  {
    key: 'generated_at',
    header: 'Timestamp',
    accessor: 'generated_at',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">
        {formatRelativeTime(v as string)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={ALERT_STATUS_BADGE_VARIANT[v as AlertRecord['status']]} size="sm">
        {capitalise(v as string)}
      </Badge>
    ),
  },
];

export interface AlertsPanelViewProps {
  alerts: AlertRecord[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

/**
 * Presentational alerts table — accepts already-fetched data so a parent
 * (e.g. `DashboardPage` via a shared `useRecentAlerts()` call) can avoid
 * refetching the same `GET /alerts` endpoint this panel would otherwise
 * call on its own. Use `AlertsPanel` below for standalone, self-fetching
 * usage.
 */
export function AlertsPanelView({ alerts, loading, error, lastUpdated, refresh }: AlertsPanelViewProps) {
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Alerts"
        description="Safety alerts by severity, category, source, and location."
        className="px-6 pt-5 pb-0"
        action={
          <div className="flex items-center gap-3">
            {!loading && !error && alerts.length > 0 && (
              <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
                <Bell className="w-3 h-3 mr-1" />
                {alerts.length} alert{alerts.length === 1 ? '' : 's'}
              </Badge>
            )}
            <CardHeaderLink to={ROUTES.ALERTS} label="View all alerts" />
          </div>
        }
      />
      <div className="p-4">
        <QueryState
          loading={loading}
          error={error}
          data={alerts}
          onRetry={refresh}
          errorTitle="Failed to load alerts"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <Table<AlertRecord>
              columns={columns}
              data={alerts}
              loading
              keyExtractor={(r) => r.id}
              caption="Safety alerts by severity, category, source, and location"
              emptyMessage="No alerts found."
            />
          }
          emptyState={
            <EmptyState
              icon={Bell}
              title="No alerts"
              description="No safety alerts have been reported."
            />
          }
        >
          {(data) => (
            <div className="flex flex-col gap-1.5">
              <Table<AlertRecord>
                columns={columns}
                data={data}
                loading={false}
                keyExtractor={(r) => r.id}
                caption="Safety alerts by severity, category, source, and location"
                emptyMessage="No alerts found."
              />
              <LastUpdated timestamp={lastUpdated} className="px-1" />
            </div>
          )}
        </QueryState>
      </div>
    </Card>
  );
}

/** Standalone, self-fetching `AlertsPanel` — fetches its own `GET /alerts` data. Use `AlertsPanelView` instead when the data is already fetched elsewhere on the page. */
export function AlertsPanel() {
  const { alerts, loading, error, lastUpdated, refresh } = useRecentAlerts({ limit: 100 });
  return <AlertsPanelView alerts={alerts} loading={loading} error={error} lastUpdated={lastUpdated} refresh={refresh} />;
}
