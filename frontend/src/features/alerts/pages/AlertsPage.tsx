import { Bell, Filter } from 'lucide-react';
import { Card, CardHeader, Badge, Table, Button, PageHeader } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { AlertRecord } from '@/types';
import { formatRelativeTime } from '@/utils/format';
import { SEVERITY_BADGE_VARIANT } from '@/utils/severity';
import { AlertsPanelView } from '@/features/alerts/components/AlertsPanel';
import { RecentIncidentsPanel } from '@/features/alerts/components/RecentIncidentsPanel';
import { useRecentAlerts } from '@/features/alerts/hooks/useRecentAlerts';
import { useMemo } from 'react';

const statusVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  active:       'danger',
  acknowledged: 'warning',
  resolved:     'success',
};

const columns: TableColumn<AlertRecord>[] = [
  {
    key: 'alert_type',
    header: 'Alert',
    accessor: 'alert_type',
    render: (v, row) => (
      <div>
        <p className="font-medium text-[var(--color-text-primary)]">{v as string}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-xs">
          {row.message}
        </p>
      </div>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    accessor: 'severity',
    render: (v) => (
      <Badge variant={SEVERITY_BADGE_VARIANT[v as AlertRecord['severity']]} dot size="sm">
        {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
      </Badge>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => (
      <Badge variant={statusVariant[v as string]} size="sm">
        {(v as string).charAt(0).toUpperCase() + (v as string).slice(1)}
      </Badge>
    ),
  },
  { key: 'source', header: 'Device',   accessor: 'source' },
  { key: 'zone',   header: 'Location', accessor: 'zone' },
  {
    key: 'generated_at',
    header: 'Triggered',
    accessor: 'generated_at',
    render: (v) => (
      <span className="text-xs text-[var(--color-text-muted)]">
        {formatRelativeTime(v as string)}
      </span>
    ),
  },
];

export function AlertsPage() {
  const { alerts, loading, error, lastUpdated, refresh } = useRecentAlerts({ limit: 100 });

  const summary = useMemo(() => {
    const counts = { all: alerts.length, active: 0, acknowledged: 0, resolved: 0 };
    alerts.forEach(a => {
      if (a.status === 'active') counts.active++;
      else if (a.status === 'acknowledged') counts.acknowledged++;
      else if (a.status === 'resolved') counts.resolved++;
    });
    return counts;
  }, [alerts]);

  return (
    <div className="page-container">
      <PageHeader
        title="Alerts"
        description="Monitor, acknowledge, and resolve safety alerts."
        actions={
          <>
            <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
            <Badge variant="danger" dot>
              <Bell className="w-3 h-3 mr-1" />
              {summary.active} Active
            </Badge>
          </>
        }
        border={false}
        className="px-0 pt-0"
      />

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All',          count: summary.all,          variant: 'outline' as const },
          { label: 'Active',       count: summary.active,       variant: 'danger'  as const },
          { label: 'Acknowledged', count: summary.acknowledged, variant: 'warning' as const },
          { label: 'Resolved',     count: summary.resolved,     variant: 'success' as const },
        ].map((s) => (
          <Badge key={s.label} variant={s.variant} size="md">
            {s.label} ({s.count})
          </Badge>
        ))}
      </div>

      <Card padding="none">
        <CardHeader title="Alert Log" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<AlertRecord>
            columns={columns}
            data={alerts}
            keyExtractor={(r) => r.id}
            caption="Safety alert log"
          />
        </div>
      </Card>

      <AlertsPanelView alerts={alerts} loading={loading} error={error} lastUpdated={lastUpdated} refresh={refresh} />

      <RecentIncidentsPanel />
    </div>
  );
}
