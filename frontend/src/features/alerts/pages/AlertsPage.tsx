import { Bell, Filter } from 'lucide-react';
import { Card, CardHeader, Badge, Table, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { Alert } from '@/types';
import { formatRelativeTime } from '@/utils/format';

const MOCK_ALERTS: Alert[] = [
  {
    id: '1',
    title: 'Gas leak detected',
    description: 'H₂S concentration above threshold in Zone A',
    severity: 'critical',
    status: 'active',
    deviceId: '1',
    deviceName: 'Sensor-A01',
    location: 'Zone A – Floor 1',
    triggeredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Temperature spike',
    description: 'Ambient temperature exceeded 85°C',
    severity: 'high',
    status: 'acknowledged',
    deviceId: '2',
    deviceName: 'Sensor-B04',
    location: 'Zone B – Floor 2',
    triggeredAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Pressure drop',
    description: 'Pressure fell below minimum operating level',
    severity: 'medium',
    status: 'resolved',
    deviceId: '4',
    deviceName: 'Sensor-D07',
    location: 'Zone D – Storage',
    triggeredAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    resolvedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
  },
];

const severityVariant: Record<string, 'danger' | 'warning' | 'primary' | 'success'> = {
  critical: 'danger',
  high:     'warning',
  medium:   'primary',
  low:      'success',
};

const statusVariant: Record<string, 'danger' | 'warning' | 'success'> = {
  active:       'danger',
  acknowledged: 'warning',
  resolved:     'success',
};

const columns: TableColumn<Alert>[] = [
  {
    key: 'title',
    header: 'Alert',
    accessor: 'title',
    render: (v, row) => (
      <div>
        <p className="font-medium text-[var(--color-text-primary)]">{v as string}</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate max-w-xs">
          {row.description}
        </p>
      </div>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    accessor: 'severity',
    render: (v) => (
      <Badge variant={severityVariant[v as string]} dot size="sm">
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
  { key: 'deviceName', header: 'Device',   accessor: 'deviceName' },
  { key: 'location',   header: 'Location', accessor: 'location' },
  {
    key: 'triggeredAt',
    header: 'Triggered',
    accessor: 'triggeredAt',
    render: (v) => (
      <span className="text-xs text-[var(--color-text-muted)]">
        {formatRelativeTime(v as string)}
      </span>
    ),
  },
];

export function AlertsPage() {
  return (
    <div className="page-container">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[var(--color-text-primary)]">Alerts</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Monitor, acknowledge, and resolve safety alerts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
            Filter
          </Button>
          <Badge variant="danger" dot>
            <Bell className="w-3 h-3 mr-1" />
            7 Active
          </Badge>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'All',          count: 18, variant: 'outline' as const },
          { label: 'Active',       count: 7,  variant: 'danger'  as const },
          { label: 'Acknowledged', count: 5,  variant: 'warning' as const },
          { label: 'Resolved',     count: 6,  variant: 'success' as const },
        ].map((s) => (
          <Badge key={s.label} variant={s.variant} size="md">
            {s.label} ({s.count})
          </Badge>
        ))}
      </div>

      <Card padding="none">
        <CardHeader title="Alert Log" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<Alert>
            columns={columns}
            data={MOCK_ALERTS}
            keyExtractor={(r) => r.id}
            caption="Safety alert log"
          />
        </div>
      </Card>
    </div>
  );
}
