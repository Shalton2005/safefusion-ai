/**
 * useCameras
 *
 * Fetches every registered camera and its live status for the
 * Live Camera Grid section. Standalone fetch hook (no Zustand) — this
 * data is page-local and doesn't need to be shared/persisted across
 * routes, same rationale as `SensorMonitoringPanel`'s inline fetch.
 */

import { useCallback, useEffect, useState } from 'react';
import { detectionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { Camera } from '../types';

export interface UseCamerasResult {
  cameras: Camera[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCameras(zone?: string): UseCamerasResult {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    detectionService
      .getCameras(zone ? { zone } : undefined, { signal })
      .then(({ data }) => setCameras(data))
      .catch((err) => {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) setError(apiError.toUserMessage());
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [zone]);

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchCameras(signal);
    return () => controller.abort();
  }, [fetchCameras]);

  return { cameras, loading, error, refetch: () => fetchCameras() };
}
