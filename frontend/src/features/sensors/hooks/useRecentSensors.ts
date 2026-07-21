/**
 * useRecentSensors
 *
 * Fetches recent sensor readings.
 *
 * @example
 * const { sensors, loading, error, refresh } = useRecentSensors();
 */

import { useRef, useState } from 'react';
import { sensorsService } from '@/services/sensors.service';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { FAST_REFRESH_INTERVAL } from '@/constants';
import type { SensorReading } from '@/types';

export interface UseRecentSensorsOptions {
  limit?: number;
}

export interface UseRecentSensorsResult {
  sensors: SensorReading[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useRecentSensors({ limit = 20 }: UseRecentSensorsOptions = {}): UseRecentSensorsResult {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchSensors = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const { data } = await sensorsService.getSensors({ skip: 0, limit }, { signal });
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
  };

  const { lastUpdated, refresh } = usePolling(fetchSensors, FAST_REFRESH_INTERVAL);

  return { sensors, loading, error, lastUpdated, refresh };
}
