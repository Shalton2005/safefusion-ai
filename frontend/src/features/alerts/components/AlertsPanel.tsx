import { useEffect, useState } from 'react';
import { Bell, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, Table, EmptyState, Alert as AlertBanner, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { alertsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import { capitalise, formatLabel, formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT, ALERT_STATUS_BADGE_VARIANT, SEVERITY_PRIORITY_LABEL } from '@/utils/severity';
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

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await alertsService.getRecentAlerts({ skip: 0, limit: 100 }, { signal });
      setAlerts(data);
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
    fetchAlerts(signal);
    return () => controller.abort();
  }, []);

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Alerts"
        description="Safety alerts by severity, category, source, and location."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && alerts.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              <Bell className="w-3 h-3 mr-1" />
              {alerts.length} alert{alerts.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />
      <div className="p-4">
        {error ? (
          <AlertBanner
            variant="danger"
            title="Failed to load alerts"
            actions={
              <Button size="sm" variant="outline" onClick={() => fetchAlerts()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </AlertBanner>
        ) : !loading && alerts.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No alerts"
            description="No safety alerts have been reported."
          />
        ) : (
          <Table<AlertRecord>
            columns={columns}
            data={alerts}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="Safety alerts by severity, category, source, and location"
            emptyMessage="No alerts found."
          />
        )}
      </div>
    </Card>
  );
}
