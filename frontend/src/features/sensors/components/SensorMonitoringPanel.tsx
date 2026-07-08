import { useEffect, useState } from 'react';
import { Radio, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { sensorsService } from '@/services';
import { ApiError } from '@/api/errors';
import type { SensorReading, SensorStatus } from '@/types';
import { SensorCard, type ZoneSensorGroup } from './SensorCard';

const STATUS_RANK: Record<SensorStatus, number> = { normal: 0, warning: 1, critical: 2 };

function groupByZone(readings: SensorReading[]): ZoneSensorGroup[] {
  const zones = new Map<string, ZoneSensorGroup>();

  for (const reading of readings) {
    let group = zones.get(reading.zone);
    if (!group) {
      group = { zone: reading.zone, status: 'normal', lastReading: reading.timestamp, readings: {} };
      zones.set(reading.zone, group);
    }

    const existing = group.readings[reading.sensor_type];
    if (!existing || new Date(reading.timestamp) > new Date(existing.timestamp)) {
      group.readings[reading.sensor_type] = reading;
    }

    if (STATUS_RANK[reading.status] > STATUS_RANK[group.status]) {
      group.status = reading.status;
    }
    if (new Date(reading.timestamp) > new Date(group.lastReading)) {
      group.lastReading = reading.timestamp;
    }
  }

  return Array.from(zones.values()).sort((a, b) => a.zone.localeCompare(b.zone));
}

export function SensorMonitoringPanel() {
  const [groups, setGroups] = useState<ZoneSensorGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await sensorsService.getSensors({ skip: 0, limit: 500 });
      setGroups(groupByZone(data));
    } catch (err) {
      setError(ApiError.from(err).toUserMessage());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  const criticalCount = groups.filter((g) => g.status === 'critical').length;

  return (
    <Card padding="none">
      <CardHeader
        title="Sensor Monitoring"
        description="Live gas, temperature, pressure, and humidity readings by zone."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && groups.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              {groups.length} zone{groups.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />

      <div className="p-4">
        {error ? (
          <Alert
            variant="danger"
            title="Failed to load sensor data"
            actions={
              <Button size="sm" variant="outline" onClick={fetchSensors} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} padding="sm">
                <Skeleton className="h-4 w-24 mb-3 rounded" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <Skeleton key={j} className="h-12 rounded-lg" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="No sensor data"
            description="No sensor readings are currently available for any zone."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <SensorCard key={group.zone} group={group} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
