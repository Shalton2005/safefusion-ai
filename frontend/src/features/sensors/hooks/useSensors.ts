import { useState, useRef, useCallback } from 'react';
import { sensorsService } from '@/services/sensors.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { SensorReading } from '@/types';

export function useSensors() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSensors = useCallback(async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await sensorsService.getSensors({ limit: 1000 }, { signal });
      setSensors(data);
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
  }, []);

  const { lastUpdated, refresh } = usePolling(fetchSensors, DASHBOARD_REFRESH_INTERVAL);

  return { sensors, loading, error, lastUpdated, refresh };
}
