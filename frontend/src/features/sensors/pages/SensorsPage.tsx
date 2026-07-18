import { Radio, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { Device, DeviceStatus, SensorReading } from '@/types';
import { SensorMonitoringPanel } from '@/features/sensors/components/SensorMonitoringPanel';
import { useSensors } from '../hooks/useSensors';
import { useMemo } from 'react';

const statusConfig: Record<DeviceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ElementType }> = {
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
  { key: 'type',     header: 'Type',     accessor: 'type', render: (v) => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'location', header: 'Location', accessor: 'location' },
  {
    key: 'status',
    header: 'Status',
    accessor: 'status',
    render: (v) => {
      const cfg = statusConfig[v as DeviceStatus] || statusConfig.offline;
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
  const { sensors, loading, error } = useSensors();

  // Map backend SensorReading format to the Device UI format expected by the table
  const mappedDevices: Device[] = useMemo(() => {
    return sensors.map((s: SensorReading) => {
      let mappedStatus: DeviceStatus = 'online';
      if (s.status === 'warning') mappedStatus = 'warning';
      if (s.status === 'critical') mappedStatus = 'critical';

      return {
        id: s.id,
        name: `Sensor-${s.id.substring(0, 5).toUpperCase()}`,
        location: s.zone,
        type: s.sensor_type,
        status: mappedStatus,
        lastSeen: s.timestamp,
        metrics: { value: s.value }
      };
    });
  }, [sensors]);

  const summary = [
    { label: 'Online',   count: mappedDevices.filter((s) => s.status === 'online').length,   color: 'text-safe-500' },
    { label: 'Warning',  count: mappedDevices.filter((s) => s.status === 'warning').length,  color: 'text-caution-500' },
    { label: 'Critical', count: mappedDevices.filter((s) => s.status === 'critical').length, color: 'text-danger-500' },
    { label: 'Offline',  count: mappedDevices.filter((s) => s.status === 'offline').length,  color: 'text-[var(--sf-text-tertiary)]' },
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
            {mappedDevices.length} devices
          </Badge>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {summary.map((s) => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className={`text-2xl font-bold ${s.color}`}>
              {loading ? <Skeleton className="h-8 w-12 mx-auto" /> : s.count}
            </p>
            <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <Card padding="none">
        <CardHeader title="Sensor Inventory" className="px-6 pt-5 pb-0" />
        <div className="p-4">
          {error && (
            <Alert variant="danger" title="Failed to load sensors" className="mb-4">
              {error}
            </Alert>
          )}
          <Table<Device>
            columns={columns}
            data={mappedDevices}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="List of monitored sensor hardware"
            emptyMessage="No sensors found."
          />
        </div>
      </Card>

      <SensorMonitoringPanel />
    </div>
  );
}
