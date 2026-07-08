import { Radio, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { Device } from '@/types';

const PLACEHOLDER_SENSORS: Device[] = [
  { id: '1', name: 'Sensor-A01', location: 'Zone A – Floor 1', status: 'online',   type: 'Gas',         lastSeen: new Date().toISOString() },
  { id: '2', name: 'Sensor-B04', location: 'Zone B – Floor 2', status: 'warning',  type: 'Temperature', lastSeen: new Date(Date.now() - 60000).toISOString() },
  { id: '3', name: 'Sensor-C02', location: 'Zone C – Exit',    status: 'offline',  type: 'Humidity',    lastSeen: new Date(Date.now() - 3600000).toISOString() },
  { id: '4', name: 'Sensor-D07', location: 'Zone D – Storage', status: 'critical', type: 'Pressure',    lastSeen: new Date(Date.now() - 30000).toISOString() },
  { id: '5', name: 'Sensor-A03', location: 'Zone A – Floor 2', status: 'online',   type: 'Gas',         lastSeen: new Date().toISOString() },
  { id: '6', name: 'Sensor-E01', location: 'Zone E – Loading', status: 'online',   type: 'Motion',      lastSeen: new Date().toISOString() },
];

const statusConfig: Record<Device['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ElementType }> = {
  online:   { label: 'Online',   variant: 'success', icon: Wifi },
  offline:  { label: 'Offline',  variant: 'default', icon: WifiOff },
  warning:  { label: 'Warning',  variant: 'warning', icon: AlertTriangle },
  critical: { label: 'Critical', variant: 'danger',  icon: AlertTriangle },
};

const columns: TableColumn<Device>[] = [
  {
    key: 'name',
    header: 'Sensor',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  { key: 'type',     header: 'Type',     accessor: 'type' },
  { key: 'location', header: 'Location', accessor: 'location' },
  {
    key: 'status',
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
    key: 'lastSeen',
    header: 'Last Reading',
    accessor: 'lastSeen',
    render: (v) => (
      <span className="text-[var(--sf-text-tertiary)] text-xs">
        {new Date(v as string).toLocaleTimeString()}
      </span>
    ),
  },
];

export function SensorsPage() {
  const summary = [
    { label: 'Online',   count: PLACEHOLDER_SENSORS.filter((s) => s.status === 'online').length,   color: 'text-safe-500' },
    { label: 'Warning',  count: PLACEHOLDER_SENSORS.filter((s) => s.status === 'warning').length,  color: 'text-caution-500' },
    { label: 'Critical', count: PLACEHOLDER_SENSORS.filter((s) => s.status === 'critical').length, color: 'text-danger-500' },
    { label: 'Offline',  count: PLACEHOLDER_SENSORS.filter((s) => s.status === 'offline').length,  color: 'text-[var(--sf-text-tertiary)]' },
  ];

  return (
    <div className="page-container">
      <PageHeader
        title="Sensors"
        description="Monitor connected sensor hardware across all zones."
        border={false}
        className="px-0 pt-0"
        badge={
          <Badge variant="primary" size="sm" dot>
            <Radio className="w-3 h-3 mr-1" />
            {PLACEHOLDER_SENSORS.length} devices
          </Badge>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <CardHeader title="Sensor Inventory" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          <Table<Device>
            columns={columns}
            data={PLACEHOLDER_SENSORS}
            keyExtractor={(r) => r.id}
            caption="List of monitored sensor hardware"
          />
        </div>
      </Card>
    </div>
  );
}
