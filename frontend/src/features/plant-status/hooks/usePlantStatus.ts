/**
 * usePlantStatus
 *
 * Polls two real backend signals and combines them into the four-state
 * plant status banner (Normal / Warning / Critical / Emergency):
 *   - `GET /emergency/status` → `in_emergency` (an emergency action has
 *     actually been dispatched somewhere) — takes precedence.
 *   - `POST /risk-scores/calculate` (Compound Risk engine, via
 *     `compoundRiskService`) → the highest-risk zone's `risk_level`,
 *     bucketed into Normal/Warning/Critical when not in emergency.
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

  const fetchStatus = async (signal?: AbortSignal) => {
    if (!hasLoadedOnce.current) setLoading(true);
    setError(null);
    try {
      const [emergencyStatus, assessment] = await Promise.all([
        emergencyResponseService.getStatus({ signal }),
        compoundRiskService.getAssessment({ signal }),
      ]);

      setInEmergency(emergencyStatus.in_emergency);
      setRiskLevel(assessment.risk_level);
      setStatus(emergencyStatus.in_emergency ? 'emergency' : RISK_LEVEL_TO_PLANT_STATUS[assessment.risk_level]);
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

  return { status, riskLevel, inEmergency, loading, error, lastUpdated, refresh };
}
