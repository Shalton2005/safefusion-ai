import { useEffect, useState } from 'react';
import { Radio, RotateCw } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Alert, Button, Skeleton } from '@/components/ui';
import { sensorsService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { SensorReading, SensorStatus, SensorType } from '@/types';
import { SensorStatusIndicator } from '@/features/sensors/components/SensorStatusIndicator';

const STATUS_RANK: Record<SensorStatus, number> = { normal: 0, warning: 1, critical: 2 };

const sensorTypeLabel: Record<SensorType, string> = {
  gas:         'Gas',
  temperature: 'Temperature',
  pressure:    'Pressure',
  humidity:    'Humidity',
};

function sensorName(reading: SensorReading): string {
  return `${sensorTypeLabel[reading.sensor_type]} – ${reading.zone}`;
}

function sensorValue(reading: SensorReading): string {
  return `${reading.value}${reading.unit}`;
}

export function SensorStatusSection() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSensors = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await sensorsService.getSensors({ skip: 0, limit: 100 }, { signal });
      setReadings(data);
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
    fetchSensors(signal);
    return () => controller.abort();
  }, []);

  const criticalCount = readings.filter((r) => r.status === 'critical').length;
  const sorted = [...readings].sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status]);

  return (
    <Card padding="none">
      <CardHeader
        title="Sensor Status"
        description="Live gas, temperature, pressure, and humidity readings by zone."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && readings.length > 0 && (
            <Badge variant={criticalCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalCount > 0}>
              {readings.length} sensor{readings.length === 1 ? '' : 's'}
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
              <Button size="sm" variant="outline" onClick={() => fetchSensors()} leftIcon={<RotateCw className="w-3.5 h-3.5" />}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Radio}
            size="sm"
            title="No sensor data"
            description="No sensor readings are currently available."
          />
        ) : (
          <div className="space-y-2">
            {sorted.map((reading) => (
              <SensorStatusIndicator
                key={reading.id}
                name={sensorName(reading)}
                value={sensorValue(reading)}
                status={reading.status}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
