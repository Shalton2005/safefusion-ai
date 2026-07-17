/**
 * useFrameDetections
 *
 * Fetches bounding-box detections for a single camera's current frame,
 * backing `DetectionOverlay`. `cameraId` of `null`/`undefined` skips
 * fetching (e.g. while no camera is selected).
 */

import { useCallback, useEffect, useState } from 'react';
import { detectionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { BoundingBoxDetection } from '../types';

export interface UseFrameDetectionsResult {
  detections: BoundingBoxDetection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFrameDetections(cameraId: string | null | undefined): UseFrameDetectionsResult {
  const [detections, setDetections] = useState<BoundingBoxDetection[]>([]);
  const [loading, setLoading] = useState(Boolean(cameraId));
  const [error, setError] = useState<string | null>(null);

  const fetchDetections = useCallback((signal?: AbortSignal) => {
    if (!cameraId) {
      setDetections([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    detectionService
      .getFrameDetections(cameraId, { signal })
      .then(({ data }) => setDetections(data))
      .catch((err) => {
        const apiError = ApiError.from(err);
        if (!apiError.isCancelledError) setError(apiError.toUserMessage());
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }, [cameraId]);

  useEffect(() => {
    const { controller, signal } = createRequestController();
    fetchDetections(signal);
    return () => controller.abort();
  }, [fetchDetections]);

  return { detections, loading, error, refetch: () => fetchDetections() };
}
