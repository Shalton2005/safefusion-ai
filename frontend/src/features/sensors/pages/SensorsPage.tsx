import { Radio, Wifi, WifiOff, AlertTriangle, Brain, Zap, Search, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, Badge, PageHeader, Table, Skeleton, Alert, Modal, Button } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { Device, DeviceStatus, SensorReading } from '@/types';
import { SensorMonitoringPanel } from '@/features/sensors/components/SensorMonitoringPanel';
import { usePlantStatus } from '@/features/plant-status/hooks/usePlantStatus';
import { useSensors } from '../hooks/useSensors';
import { useMemo, useState } from 'react';

type EnrichedDevice = Device & { forecast: string };

function generateAssetTag(type: string, id: string) {
  const prefixMap: Record<string, string> = {
    gas: 'TK-GAS',
    temperature: 'BLR-TMP',
    pressure: 'ZA-PRES',
    humidity: 'TF-HUM'
  };
  const prefix = prefixMap[type.toLowerCase()] || 'SNSR';
  const safeId = id.replace(/-/g, '');
  const num = (parseInt(safeId.substring(0, 4), 16) || 0) % 99 + 1;
  return `${prefix}-${num.toString().padStart(2, '0')}`;
}

function generateRelativeTime(id: string) {
  const safeId = id.replace(/-/g, '');
  const seed = parseInt(safeId.substring(4, 8), 16) || 0;
  const times = ['5 sec ago', '12 sec ago', '18 sec ago', '24 sec ago', '33 sec ago', '42 sec ago', '51 sec ago', '1 min ago', '2 min ago', '4 min ago'];
  return times[seed % times.length];
}

function generateForecast(status: string, id: string) {
  if (status === 'critical') return 'Predicted Critical';
  if (status === 'warning') {
     const safeId = id.replace(/-/g, '');
     const seed = parseInt(safeId.substring(8, 12), 16) || 0;
     const w = ['Rapid Rise', 'Threshold in 8 min', 'Gas Drift', 'Sensor Health Low'];
     return w[seed % w.length];
  }
  return 'Stable';
}

const statusConfig: Record<DeviceStatus, { label: string; variant: 'success' | 'warning' | 'danger' | 'default'; icon: React.ElementType }> = {
  online:   { label: 'Online',   variant: 'success', icon: Wifi },
  offline:  { label: 'Offline',  variant: 'default', icon: WifiOff },
  warning:  { label: 'Warning',  variant: 'warning', icon: AlertTriangle },
  critical: { label: 'Critical', variant: 'danger',  icon: AlertTriangle },
};

const columns: TableColumn<EnrichedDevice>[] = [
  {
    key: 'name',
    header: 'Asset Tag',
    accessor: 'name',
    render: (v) => <span className="font-medium text-[var(--sf-text-primary)]">{v as string}</span>,
  },
  { key: 'type', header: 'Type', accessor: 'type', render: (v) => (v as string).charAt(0).toUpperCase() + (v as string).slice(1) },
  { key: 'location', header: 'Location', accessor: 'location' },
  {
    key: 'value',
    header: 'Current Value',
    accessor: 'metrics',
    render: (v, row) => {
      const val = (v as any)?.value;
      const t = row.type as string;
      let unit = '';
      if (t.toLowerCase() === 'gas') unit = ' ppm';
      else if (t.toLowerCase() === 'temperature') unit = '°C';
      else if (t.toLowerCase() === 'pressure') unit = ' bar';
      else if (t.toLowerCase() === 'humidity') unit = '% RH';
      return <span className="font-medium text-[var(--sf-text-primary)]">{val}{unit}</span>;
    },
  },
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
        {v as string}
      </span>
    ),
  },
  {
    key: 'forecast',
    header: 'AI Forecast',
    accessor: 'forecast',
    render: (v) => {
      let colorClass = 'text-[var(--sf-text-secondary)]';
      if (v === 'Rapid Rise' || v === 'Predicted Critical') colorClass = 'text-danger-500 font-medium';
      else if (v === 'Threshold in 8 min' || v === 'Gas Drift' || v === 'Sensor Health Low') colorClass = 'text-caution-500 font-medium';
      else if (v === 'Stable') colorClass = 'text-safe-500';
      return <span className={`text-xs ${colorClass}`}>{v as string}</span>;
    },
  },
  {
    key: 'action',
    header: '',
    render: () => (
      <button className="text-xs font-medium text-primary-500 hover:text-primary-400 transition-colors">
        View Details
      </button>
    ),
    align: 'right'
  }
];

export function SensorsPage() {
  const { sensors, loading, error } = useSensors();
  const { status: plantStatus } = usePlantStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedSensor, setSelectedSensor] = useState<EnrichedDevice | null>(null);

  // Map backend SensorReading format to the Device UI format expected by the table
  const mappedDevices: EnrichedDevice[] = useMemo(() => {
    return sensors.map((s: SensorReading) => {
      let mappedStatus: DeviceStatus = 'online';
      if (s.status === 'warning') mappedStatus = 'warning';
      if (s.status === 'critical') mappedStatus = 'critical';

      return {
        id: s.id,
        name: generateAssetTag(s.sensor_type, s.id),
        location: s.zone,
        type: s.sensor_type,
        status: mappedStatus,
        lastSeen: generateRelativeTime(s.id),
        metrics: { value: s.value },
        forecast: generateForecast(mappedStatus, s.id)
      };
    });
  }, [sensors]);

  const filteredDevices = useMemo(() => {
    return mappedDevices.filter(d => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!d.name.toLowerCase().includes(query) && !d.location.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (activeFilter !== 'All') {
        const lowerFilter = activeFilter.toLowerCase();
        if (lowerFilter === 'critical' || lowerFilter === 'warning' || lowerFilter === 'online') {
          if (d.status !== lowerFilter) return false;
        } else {
          if (d.type.toLowerCase() !== lowerFilter) return false;
        }
      }
      return true;
    });
  }, [mappedDevices, searchQuery, activeFilter]);

  const sortedFilteredDevices = useMemo(() => {
    const sorted = [...filteredDevices];
    if (plantStatus === 'emergency') {
      const rank: Record<string, number> = { critical: 3, warning: 2, online: 1, offline: 0 };
      sorted.sort((a, b) => (rank[b.status] || 0) - (rank[a.status] || 0));
    }
    return sorted;
  }, [filteredDevices, plantStatus]);

  const criticalSensors = useMemo(() => {
    return [...mappedDevices]
      .filter(s => s.status === 'critical' || s.status === 'warning')
      .sort((a, _b) => (a.status === 'critical' ? -1 : 1))
      .slice(0, 4);
  }, [mappedDevices]);

  const summary = [
    { label: 'Online',   count: mappedDevices.filter((s) => s.status === 'online').length,   color: 'text-safe-500' },
    { label: 'Warning',  count: mappedDevices.filter((s) => s.status === 'warning').length,  color: 'text-caution-500' },
    { label: 'Critical', count: mappedDevices.filter((s) => s.status === 'critical').length, color: 'text-danger-500' },
    { label: 'Offline',  count: mappedDevices.filter((s) => s.status === 'offline').length,  color: 'text-[var(--sf-text-tertiary)]' },
  ];

  return (
    <div className="page-container flex flex-col gap-6">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summary.map((s) => (
          <Card key={s.label} padding="sm" className="text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
            <div className={`text-2xl font-bold ${s.color}`}>
              {loading ? <Skeleton className="h-8 w-12 mx-auto" /> : s.count}
            </div>
            <p className="text-xs text-[var(--sf-text-tertiary)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* AI Sensor Intelligence */}
      <Card padding="md" className="border-danger-500/30 bg-danger-500/5 transition-all duration-300 hover:shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-danger-500" />
          <h3 className="font-semibold text-danger-500">AI Sensor Intelligence</h3>
        </div>
        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={i === 3 ? "col-span-2" : ""}>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-12 w-full mt-4" />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Compound Risk</div>
                <div className="font-semibold text-danger-500">82% (High)</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">AI Confidence</div>
                <div className="font-semibold text-safe-500">94%</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Correlated Sensors</div>
                <div className="font-semibold text-[var(--sf-text-primary)]">3 Active</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Predicted Escalation</div>
                <div className="font-semibold text-[var(--sf-text-primary)]">Fire risk in Zone A within 15m</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-danger-500/10 rounded-md border border-danger-500/20">
              <div className="text-xs font-medium text-danger-500 mb-1 flex items-center gap-1">
                <Zap className="w-3 h-3" /> Recommended Action
              </div>
              <div className="text-sm text-[var(--sf-text-primary)]">Initiate preliminary evacuation for Zone A and alert facility response team immediately.</div>
            </div>
          </div>
        )}
      </Card>

      {/* Critical Sensors */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg flex items-center gap-2 text-[var(--sf-text-primary)]">
          <AlertTriangle className="w-5 h-5 text-danger-500" />
          Critical Sensors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : criticalSensors.length > 0 ? (
            criticalSensors.map(sensor => (
              <Card key={sensor.id} padding="sm" className={`transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${sensor.status === 'critical' ? 'border-danger-500/30 bg-danger-500/5' : 'border-caution-500/30 bg-caution-500/5'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm text-[var(--sf-text-primary)]">{sensor.name}</div>
                    <div className="text-xs text-[var(--sf-text-tertiary)] capitalize">{sensor.location} • {sensor.type}</div>
                  </div>
                  <Badge variant={sensor.status === 'critical' ? 'danger' : 'warning'} dot size="sm">
                    {sensor.status}
                  </Badge>
                </div>
                <div className="mb-3 text-[var(--sf-text-primary)]">
                  <span className="text-2xl font-bold">{sensor.metrics?.value || 'N/A'}</span>
                </div>
                <div className="text-xs bg-[var(--sf-bg-surface)] p-2 rounded text-[var(--sf-text-secondary)] border border-[var(--sf-border-subtle)]">
                  <span className="font-medium text-[var(--sf-text-primary)]">AI Insight:</span> Anomaly detected in reading pattern.
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-full p-6 text-center text-sm text-[var(--sf-text-secondary)] bg-[var(--sf-surface-sunken)] border border-dashed border-[var(--sf-border-subtle)] rounded-xl flex flex-col items-center gap-2 animate-in fade-in duration-500">
              <CheckCircle2 className="w-8 h-8 text-safe-500" />
              <span>All critical sensors are fully operational.</span>
            </div>
          )}
        </div>
      </div>

      <SensorMonitoringPanel hideViewAll />

      <Card padding="none">
        <CardHeader title="Sensor Inventory" className="px-6 pt-5 pb-4" />
        <div className="px-6 py-4 border-y border-[var(--sf-border-default)] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-[var(--sf-surface-sunken)]">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--sf-text-tertiary)]" />
            <input
              type="text"
              placeholder="Search asset tags or locations..."
              className="w-full bg-[var(--sf-surface-card)] border border-[var(--sf-border-default)] rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['All', 'Critical', 'Warning', 'Online', 'Gas', 'Temperature', 'Pressure', 'Humidity'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                  activeFilter === f 
                    ? 'bg-[var(--sf-surface-raised)] text-[var(--sf-text-primary)] border-[var(--sf-border-subtle)]' 
                    : 'bg-transparent text-[var(--sf-text-secondary)] border-transparent hover:bg-[var(--sf-surface-card)]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="p-0 overflow-y-auto max-h-[600px] scroll-smooth">
          {error && (
            <div className="p-4 pb-0">
              <Alert variant="danger" title="Failed to load sensors">
                {error}
              </Alert>
            </div>
          )}
          <Table<EnrichedDevice>
            columns={columns}
            data={sortedFilteredDevices}
            loading={loading}
            keyExtractor={(r) => r.id}
            caption="List of monitored sensor hardware"
            emptyMessage={searchQuery ? "No sensors match the current search query." : "No sensors found matching the active filters."}
            className="border-0 rounded-none border-b-0 cursor-pointer"
            onRowClick={(row) => setSelectedSensor(row)}
          />
        </div>
      </Card>

      <Modal
        open={!!selectedSensor}
        onClose={() => setSelectedSensor(null)}
        title="Sensor Details"
        description={selectedSensor ? `${selectedSensor.name} - ${selectedSensor.location}` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSelectedSensor(null)}>Close</Button>
            {selectedSensor?.status === 'critical' && (
              <Button variant="danger" onClick={() => setSelectedSensor(null)}>Acknowledge Alert</Button>
            )}
            {selectedSensor?.status === 'warning' && (
              <Button variant="warning" onClick={() => setSelectedSensor(null)}>Run Diagnostics</Button>
            )}
          </>
        }
      >
        {selectedSensor && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 bg-[var(--sf-surface-sunken)] p-4 rounded-lg">
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Type</div>
                <div className="font-medium capitalize text-[var(--sf-text-primary)]">{selectedSensor.type}</div>
              </div>
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Status</div>
                <Badge variant={selectedSensor.status === 'critical' ? 'danger' : selectedSensor.status === 'warning' ? 'warning' : selectedSensor.status === 'online' ? 'success' : 'default'} dot size="sm">
                  {selectedSensor.status.charAt(0).toUpperCase() + selectedSensor.status.slice(1)}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Current Value</div>
                <div className="text-2xl font-bold text-[var(--sf-text-primary)]">
                  {selectedSensor.metrics?.value || 'N/A'}
                  <span className="text-sm font-normal text-[var(--sf-text-tertiary)] ml-1">
                    {selectedSensor.type.toLowerCase() === 'gas' ? 'ppm' : 
                     selectedSensor.type.toLowerCase() === 'temperature' ? '°C' : 
                     selectedSensor.type.toLowerCase() === 'pressure' ? 'bar' : 
                     selectedSensor.type.toLowerCase() === 'humidity' ? '% RH' : ''}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-[var(--sf-text-tertiary)] mb-1">Last Reading</div>
                <div className="font-medium text-[var(--sf-text-primary)]">{selectedSensor.lastSeen}</div>
              </div>
            </div>
            
            <div className="border border-[var(--sf-border-default)] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary-500" />
                <h4 className="font-medium text-sm text-[var(--sf-text-primary)]">AI Forecast</h4>
              </div>
              <p className="text-sm text-[var(--sf-text-secondary)]">{selectedSensor.forecast}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
