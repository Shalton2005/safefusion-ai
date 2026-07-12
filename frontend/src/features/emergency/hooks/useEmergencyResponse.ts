/**
 * useEmergencyResponse
 *
 * Polls the emergency response engine (`GET /emergency/actions`) and
 * flattens the per-zone result into a single dispatch-ordered action list.
 *
 * @example
 * const { actions, loading, error, lastUpdated, refresh } = useEmergencyResponse();
 */

import { useRef, useState } from 'react';
import { emergencyResponseService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import type { EmergencyActionItem } from '@/types';

export interface UseEmergencyResponseResult {
  actions: EmergencyActionItem[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useEmergencyResponse(): UseEmergencyResponseResult {
  const [actions, setActions] = useState<EmergencyActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  const fetchActions = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const result = await emergencyResponseService.getActions({ signal });
      setActions(emergencyResponseService.toActionItems(result));
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

  const { lastUpdated, refresh } = usePolling(fetchActions, DASHBOARD_REFRESH_INTERVAL);

  return { actions, loading, error, lastUpdated, refresh };
}
