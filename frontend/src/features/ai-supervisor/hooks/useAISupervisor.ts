/**
 * useAISupervisor
 *
 * Derives a single `AISupervisorSnapshot` via
 * `aiSupervisorService.buildSnapshot` from the four engine hook results
 * (Compound Risk, Emergency Response, Recommendation, Compliance)
 * passed in by the caller.
 *
 * Takes those results as parameters — rather than calling the four
 * hooks itself — so every consumer on a page shares one polling
 * instance of each engine instead of each `useAISupervisor()` call
 * creating its own independent set (that used to multiply every
 * engine's network call once per consumer). Mount the four engine
 * hooks once, high enough in the tree to cover every consumer (see
 * `AISupervisorPage`), and pass the results down.
 *
 * @example
 * const compoundRisk = useCompoundRiskEngine();
 * const emergencyResponse = useEmergencyResponse();
 * const recommendation = useRecommendations();
 * const compliance = useComplianceStatus();
 * const supervisor = useAISupervisor({ compoundRisk, emergencyResponse, recommendation, compliance });
 */

import { useMemo } from 'react';
import { aiSupervisorService } from '../services/aiSupervisor.service';
import type { AISupervisorSnapshot } from '../types';
import type { UseCompoundRiskEngineResult } from '@/features/risk/hooks/useCompoundRiskEngine';
import type { UseEmergencyResponseResult } from '@/features/emergency/hooks/useEmergencyResponse';
import type { UseRecommendationsResult } from '@/features/recommendations/hooks/useRecommendations';
import type { UseComplianceStatusResult } from '@/features/compliance/hooks/useComplianceStatus';

export interface UseAISupervisorParams {
  compoundRisk: UseCompoundRiskEngineResult;
  emergencyResponse: UseEmergencyResponseResult;
  recommendation: UseRecommendationsResult;
  compliance: UseComplianceStatusResult;
}

export interface UseAISupervisorResult {
  snapshot: AISupervisorSnapshot;
  loading: boolean;
  /** First error reported by any of the four supervised engines, or `null` when all are healthy. */
  error: string | null;
  refresh: () => void;
}

export function useAISupervisor({
  compoundRisk,
  emergencyResponse,
  recommendation,
  compliance,
}: UseAISupervisorParams): UseAISupervisorResult {
  const snapshot = useMemo(
    () =>
      aiSupervisorService.buildSnapshot({
        compoundRisk: {
          data: compoundRisk.assessment,
          loading: compoundRisk.loading,
          error: compoundRisk.error,
          lastUpdated: compoundRisk.lastUpdated,
        },
        emergencyResponse: {
          data: emergencyResponse.actions,
          loading: emergencyResponse.loading,
          error: emergencyResponse.error,
          lastUpdated: emergencyResponse.lastUpdated,
        },
        recommendation: {
          data: recommendation.recommendations,
          loading: recommendation.loading,
          error: recommendation.error,
          lastUpdated: recommendation.lastUpdated,
        },
        compliance: {
          data: compliance.snapshot,
          loading: compliance.loading,
          error: compliance.error,
          lastUpdated: compliance.lastUpdated,
        },
      }),
    [
      compoundRisk.assessment, compoundRisk.loading, compoundRisk.error, compoundRisk.lastUpdated,
      emergencyResponse.actions, emergencyResponse.loading, emergencyResponse.error, emergencyResponse.lastUpdated,
      recommendation.recommendations, recommendation.loading, recommendation.error, recommendation.lastUpdated,
      compliance.snapshot, compliance.loading, compliance.error, compliance.lastUpdated,
    ],
  );

  const loading = compoundRisk.loading || emergencyResponse.loading || recommendation.loading || compliance.loading;
  const error = compoundRisk.error ?? emergencyResponse.error ?? recommendation.error ?? compliance.error;

  const refresh = () => {
    compoundRisk.refresh();
    emergencyResponse.refresh();
    recommendation.refresh();
    compliance.refresh();
  };

  return { snapshot, loading, error, refresh };
}
