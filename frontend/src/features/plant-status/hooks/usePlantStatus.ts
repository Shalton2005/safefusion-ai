/**
 * usePlantStatus
 *
 * Combines two real backend signals into the four-state plant status
 * banner (Normal / Warning / Critical / Emergency):
 *   - `GET /emergency/status` → `in_emergency` (an emergency action has
 *     actually been dispatched somewhere) — takes precedence. Always
 *     polled here; nothing else on the page fetches it.
 *   - The highest-risk zone's `risk_level`, bucketed into
 *     Normal/Warning/Critical when not in emergency — read from
 *     `usePlantStatusStore` if a page (e.g. `DashboardPage`, via its own
 *     `useDashboardStore`) has already published a fresh one, since a
 *     live Compound Risk poll should not be duplicated. Only self-fetches
 *     via `compoundRiskService.getRealAssessment()` (the same real 9-rule
 *     camera-aware engine the dashboard uses — `GET /monitoring/compound-risk`)
 *     when nothing has been published — the common case for pages other than
 *     the dashboard.
 *
 * Never fabricates a status the backend didn't produce — Emergency Mode
 * and Risk Level are both surfaced verbatim alongside the derived status.
 *
 * @example
 * const { status, riskLevel, inEmergency, lastUpdated, loading, error, refresh } = usePlantStatus();
 */

import { useRef, useState } from 'react';
import { compoundRiskService, emergencyResponseService } from '@/services';
import { ApiError } from '@/api/errors';
import { usePolling } from '@/hooks/usePolling';
import { usePlantStatusStore } from '@/store';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import { RISK_LEVEL_TO_PLANT_STATUS } from '@/utils/severity';
import type { SeverityLevel } from '@/constants';
import type { PlantStatus } from '@/types';

export interface UsePlantStatusResult {
  status: PlantStatus | null;
  riskLevel: SeverityLevel | null;
  inEmergency: boolean | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function usePlantStatus(): UsePlantStatusResult {
  const [status, setStatus] = useState<PlantStatus | null>(null);
  const [riskLevel, setRiskLevel] = useState<SeverityLevel | null>(null);
  const [inEmergency, setInEmergency] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedOnce = useRef(false);

  // Subscribes so a later publish (e.g. the dashboard's risk card finishing
  // its own fetch after this hook's first tick) re-renders the banner with
  // the shared value instead of waiting for this hook's own next interval.
  const publishedRiskLevel = usePlantStatusStore((s) => s.riskLevel);
  const publishedInEmergency = usePlantStatusStore((s) => s.inEmergency);
  const publishedLastUpdated = usePlantStatusStore((s) => s.lastUpdated);

  const fetchStatus = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const published = usePlantStatusStore.getState();
      const [emergencyStatus, resolvedRiskLevel] = await Promise.all([
        emergencyResponseService.getStatus({ signal }),
        published.riskLevel !== null
          ? Promise.resolve(published.riskLevel)
          : compoundRiskService.getRealAssessment({ signal }).then((a) => a.risk_level),
      ]);

      setInEmergency(emergencyStatus.in_emergency);
      setRiskLevel(resolvedRiskLevel);
      setStatus(RISK_LEVEL_TO_PLANT_STATUS[resolvedRiskLevel]);
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

  const { lastUpdated, refresh } = usePolling(fetchStatus, DASHBOARD_REFRESH_INTERVAL);

  // A fresher publish arriving between this hook's own polls should win.
  const effectiveRiskLevel = publishedRiskLevel ?? riskLevel;
  const effectiveInEmergency = publishedInEmergency ?? inEmergency;
  const effectiveLastUpdated =
    publishedLastUpdated && (!lastUpdated || publishedLastUpdated > lastUpdated) ? publishedLastUpdated : lastUpdated;
  const effectiveStatus =
    effectiveInEmergency === null || effectiveRiskLevel === null
      ? status
      : effectiveInEmergency
        ? 'emergency'
        : RISK_LEVEL_TO_PLANT_STATUS[effectiveRiskLevel];

  return {
    status: effectiveStatus,
    riskLevel: effectiveRiskLevel,
    inEmergency: effectiveInEmergency,
    loading,
    error,
    lastUpdated: effectiveLastUpdated,
    refresh,
  };
}
