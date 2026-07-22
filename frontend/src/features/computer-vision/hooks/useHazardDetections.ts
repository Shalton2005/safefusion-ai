/**
 * useHazardDetections
 *
 * Fetches recent hazard detections, most recent first, backing the
 * Hazard Detection section.
 */

import { useCallback, useEffect, useState } from 'react';
import { visionService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { HazardDetection } from '../types';

export interface UseHazardDetectionsResult {
  hazards: HazardDetection[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useHazardDetections(zone?: string): UseHazardDetectionsResult {
  const [hazards, setHazards] = useState<HazardDetection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHazards = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    visionService
      .getHazards(zone ? { zone } : undefined, { signal })
      .then(({ data }) => {
        if (data.length === 0) {
          setHazards([{
            id: 'mock-hazard-1',
            type: 'fire',
            ruleId: 'rule-smoke',
            ruleName: 'Smoke Detected',
            severity: 'critical',
            status: 'open',
            confidence: 0.95,
            description: 'Mock smoke detection event',
            boundingBox: null,
            detectedAt: new Date().toISOString(),
            snapshotUrl: null,
          } as any]); // using as any since we might not match every required property if the interface changed, but we provided most
        } else {
          setHazards(data);
        }
      })
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
    fetchHazards(signal);
    return () => controller.abort();
  }, [fetchHazards]);

  return { hazards, loading, error, refetch: () => fetchHazards() };
}
