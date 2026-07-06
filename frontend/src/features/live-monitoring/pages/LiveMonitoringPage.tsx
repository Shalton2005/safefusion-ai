import { Activity, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Badge, Table } from '@/components/ui';
import type { TableColumn, Device } from '@/types';

const MOCK_DEVICES: Device[] = [
  { id: '1', name: 'Sensor-A01', location: 'Zone A – Floor 1', status: 'online',   type: 'Gas',         lastSeen: new Date().toISOString() },
  { id: '2', name: 'Sensor-B04', location: 'Zone B – Floor 2', status: 'warning',  type: 'Temperature', lastSeen: new Date(Date.now() - 60000).toISOString() },
  { id: '3', name: 'Camera-C02', location: 'Zone C – Exit',    status: 'offline',  type: 'Camera',      lastSeen: new Date(Date.now() - 3600000).toISOString() },
  { id: '4', name: 'Sensor-D07', location: 'Zone D – Storage', status: 'critical', type: 'Pressure',    lastSeen: new Date(Date.now() - 30000).toISOString() },
  { id: '5', name: 'Sensor-A03', location: 'Zone A – Floor 2', status: 'online',   type: 'Gas',         lastSeen: new Date().toISOString() },
];

const statusConfig: Record<Device['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ElementType }> = {
  online:   { label: 'Online',   variant: 'success', icon: Wifi },
  offline:  { label: 'Offline',  variant: 'default', icon: WifiOff },
  warning:  { label: 'Warning',  variant: 'warning', icon: AlertTriangle },
  critical: { label: 'Critical', variant: 'danger',  icon: AlertTriangle },
};

const columns: TableColumn<Device>[] = [
  {
    key:    'name',
    header: 'Device',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--color-text-primary)]">{v as string}</span>,
  },
  { key: 'type',     header: 'Type',     accessor: 'type' },
  { key: 'location', header: 'Location', accessor: 'location' },
  {
    key:    'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => {
      const cfg = statusConfig[v as Device['status']];
      return (
        <Badge variant={cfg.variant} dot size="sm">
          {cfg.label}
        </Badge>
      );
    },
  },
  {
    key:    'lastSeen',
    header: 'Last Seen',
    accessor: 'lastSeen',
    render: (v) => (
      <span className="text-[var(--color-text-muted)] text-xs">
        {new Date(v as string).toLocaleTimeString()}
      </span>
    ),
  },
];

export function LiveMonitoringPage() {
  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[var(--color-text-primary)]">Live Monitoring</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Real-time status of all connected devices and sensors.
          </p>
        </div>
        <Badge variant="danger" dot>
          <Activity className="w-3 h-3 mr-1" />
          Live
        </Badge>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Online',   count: 142, color: 'text-safe-500' },
          { label: 'Warning',  count: 4,   color: 'text-caution-500' },
          { label: 'Critical', count: 2,   color: 'text-danger-500' },
          { label: 'Offline',  count: 6,   color: 'text-[var(--color-text-muted)]' },
        ].map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Device table */}
      <Card padding="none">
        <CardHeader title="Device List" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<Device>
            columns={columns}
            data={MOCK_DEVICES}
            keyExtractor={(r) => r.id}
            caption="List of monitored devices"
          />
        </div>
      </Card>
    </div>
  );
}
