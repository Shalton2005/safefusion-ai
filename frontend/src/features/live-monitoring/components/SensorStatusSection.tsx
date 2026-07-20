import { useRef, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Radio, ChevronRight, ChevronDown, TrendingUp } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState, Skeleton, QueryState } from '@/components/ui';
import { LastUpdated } from '@/components/common/LastUpdated';
import { sensorsService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { SensorReading, SensorStatus, SensorType } from '@/types';
import { SensorStatusIndicator } from '@/features/sensors/components/SensorStatusIndicator';
import { cn } from '@/lib/cn';
import { capitalise } from '@/utils/format';

const STATUS_RANK: Record<SensorStatus, number> = { normal: 0, warning: 1, critical: 2 };

const sensorTypeLabel: Record<SensorType, string> = {
  gas:         'Gas',
  temperature: 'Temperature',
  pressure:    'Pressure',
  humidity:    'Humidity',
};

function sensorName(reading: SensorReading): string {
  return sensorTypeLabel[reading.sensor_type];
}

function sensorValue(reading: SensorReading): string {
  return `${reading.value}${reading.unit}`;
}

type ZoneHealth = {
  zone: string;
  status: SensorStatus;
  abnormalCount: number;
  abnormalTypes: SensorType[];
  sensors: SensorReading[];
};

function ZoneHealthCard({ zoneHealth }: { zoneHealth: ZoneHealth }) {
  const [expanded, setExpanded] = useState(false);
  const { zone, status, abnormalCount, abnormalTypes, sensors } = zoneHealth;
  
  const isCritical = status === 'critical';
  const isWarning = status === 'warning';
  
  const badgeVariant = isCritical ? 'danger' : isWarning ? 'warning' : 'success';
  const statusLabel = status === 'normal' ? 'Healthy' : capitalise(status);
  
  const typeBadgeColor = isCritical ? 'text-danger-500 bg-danger-500/10' : 'text-caution-500 bg-caution-500/10';

  return (
    <div className={cn(
      "flex flex-col rounded-xl border transition-colors",
      isCritical ? "border-danger-500/30 bg-danger-500/5" :
      isWarning ? "border-caution-500/30 bg-caution-500/5" :
      "border-[var(--sf-border-default)] bg-[var(--sf-surface-raised)]"
    )}>
      <button 
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded-xl"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[var(--sf-text-primary)]">{zone}</span>
            <Badge variant={badgeVariant} size="sm" dot pulsing={isCritical}>{statusLabel}</Badge>
          </div>
          
          {abnormalCount > 0 && (
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <span className="text-sm font-medium text-[var(--sf-text-secondary)]">
                {abnormalCount} abnormal sensor{abnormalCount !== 1 && 's'}
              </span>
              <div className="flex items-center gap-2">
                {abnormalTypes.map(type => (
                  <div key={type} className={cn("flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded", typeBadgeColor)}>
                    {sensorTypeLabel[type]} <TrendingUp className="w-3 h-3" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sf-text-tertiary)] uppercase tracking-wider mt-3 sm:mt-0">
          {expanded ? 'Collapse' : 'Expand'}
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-2 border-t border-[var(--sf-border-default)]">
          {sensors.map(reading => (
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
  );
}

export function SensorStatusSection() {
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const fetchSensors = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await sensorsService.getSensors({ skip: 0, limit: 100 }, { signal });
      setReadings(data);
      hasLoadedOnce.current = true;
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

  const { lastUpdated, refresh } = usePolling(fetchSensors, DASHBOARD_REFRESH_INTERVAL);

  const zones = useMemo(() => {
    const map = new Map<string, ZoneHealth>();
    readings.forEach(r => {
      if (!map.has(r.zone)) {
        map.set(r.zone, {
          zone: r.zone,
          status: 'normal',
          abnormalCount: 0,
          abnormalTypes: [],
          sensors: [],
        });
      }
      const z = map.get(r.zone)!;
      z.sensors.push(r);
      
      if (r.status === 'critical') z.status = 'critical';
      else if (r.status === 'warning' && z.status !== 'critical') z.status = 'warning';
      
      if (r.status !== 'normal') {
        z.abnormalCount += 1;
        if (!z.abnormalTypes.includes(r.sensor_type)) {
          z.abnormalTypes.push(r.sensor_type);
        }
      }
    });
    
    return Array.from(map.values()).sort((a, b) => STATUS_RANK[b.status] - STATUS_RANK[a.status] || a.zone.localeCompare(b.zone));
  }, [readings]);

  const criticalZoneCount = zones.filter(z => z.status === 'critical').length;

  return (
    <Card padding="none" className="h-full flex flex-col">
      <CardHeader
        title="Zone Health"
        description="Enterprise health summary by zone."
        className="px-6 pt-5 pb-0"
        action={
          !loading && !error && zones.length > 0 && (
            <Badge variant={criticalZoneCount > 0 ? 'danger' : 'primary'} size="sm" dot pulsing={criticalZoneCount > 0}>
              {zones.length} zone{zones.length === 1 ? '' : 's'}
            </Badge>
          )
        }
      />

      <div className="px-6 pb-1">
        <LastUpdated timestamp={lastUpdated} />
      </div>

      <div ref={parentRef} className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar flex flex-col">
        <QueryState
          loading={loading}
          error={error}
          data={zones}
          onRetry={refresh}
          errorTitle="Failed to load sensor data"
          isEmpty={(d) => d.length === 0}
          loadingFallback={
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          }
          emptyState={
            <EmptyState
              icon={Radio}
              size="sm"
              title="No zone data"
              description="No sensor readings are currently available."
            />
          }
        >
          {(data) => {
            const rowVirtualizer = useVirtualizer({
              count: data.length,
              getScrollElement: () => parentRef.current,
              estimateSize: () => 100, // Approximate height of ZoneHealthCard
              overscan: 3,
            });

            return (
              <div 
                className="relative w-full"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const zoneHealth = data[virtualRow.index];
                  return (
                    <div
                      key={zoneHealth.zone}
                      data-index={virtualRow.index}
                      ref={rowVirtualizer.measureElement}
                      className="absolute top-0 left-0 w-full"
                      style={{
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="pb-3">
                        <ZoneHealthCard zoneHealth={zoneHealth} />
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }}
        </QueryState>
      </div>
    </Card>
  );
}
