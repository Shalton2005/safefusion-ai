/**
 * useAISupervisor
 *
 * Composes the four already-existing engine hooks (Compound Risk,
 * Emergency Response, Recommendation, Compliance) — each of which
 * independently polls its own real backend endpoint — and derives a
 * single `AISupervisorSnapshot` via `aiSupervisorService.buildSnapshot`.
 *
 * Does not poll anything itself: each underlying hook owns its own
 * polling interval, so mounting this hook alongside (rather than
 * instead of) the dashboard's existing engine hooks does not create
 * any duplicate network calls — pass in results already fetched
 * higher up the tree where possible (see `AISupervisorCardSection`).
 *
 * @example
 * const snapshot = useAISupervisor();
 */

import { useMemo } from 'react';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { aiSupervisorService } from '../services/aiSupervisor.service';
import type { AISupervisorSnapshot } from '../types';

export interface UseAISupervisorResult {
  snapshot: AISupervisorSnapshot;
  loading: boolean;
  /** First error reported by any of the four supervised engines, or `null` when all are healthy. */
  error: string | null;
  refresh: () => void;
}

export function useAISupervisor(): UseAISupervisorResult {
  const compoundRisk = useCompoundRiskEngine();
  const emergencyResponse = useEmergencyResponse();
  const recommendation = useRecommendations();
  const compliance = useComplianceStatus();

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
