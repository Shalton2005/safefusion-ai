/**
 * fetchSupervisorSnapshot
 *
 * Runs the four real supervised engines in parallel and reduces them
 * into an `AISupervisorSnapshot` via `aiSupervisorService.buildSnapshot`.
 * The single fetch path shared by every self-sufficient AI Supervisor
 * data source that isn't `useAISupervisor` (which instead composes the
 * dashboard's already-polling engine hooks): `aiSupervisorApiService`'s
 * four endpoint functions and `useAISupervisorStore`'s three `fetch*`
 * actions all call this instead of each re-implementing the same
 * `Promise.all` + `buildSnapshot` call.
 *
 * `compoundRiskService.getAssessment()` calls the non-idempotent
 * `POST /risk-scores/calculate`. Nothing currently mounts a component
 * that calls this function AND `useCompoundRiskEngine` in the same
 * tree, so there's no live double-call today — but if
 * `aiSupervisorApiService`/`useAISupervisorStore` is ever wired into a
 * page that also uses `useCompoundRiskEngine` (e.g. the dashboard),
 * route this call through `usePlantStatusStore`'s published value
 * first, the same way `usePlantStatus` already does, instead of
 * calling `calculate()` a second time in parallel.
 */

import { compoundRiskService } from '@/services/compoundRisk.service';
import { emergencyResponseService } from '@/services/emergencyResponse.service';
import { recommendationService } from '@/services/recommendation.service';
import { complianceService } from '@/services/compliance.service';
import { aiSupervisorService } from './aiSupervisor.service';
import type { AISupervisorSnapshot } from '../types';
import type { RequestOptions } from '@/api/types';

export async function fetchSupervisorSnapshot(options?: RequestOptions): Promise<AISupervisorSnapshot> {
  const [compoundRisk, emergencyActions, recommendationResult, compliance] = await Promise.all([
    compoundRiskService.getAssessment(options),
    emergencyResponseService.getActions(options),
    recommendationService.getRecommendations(options),
    complianceService.getStatus(undefined, options),
  ]);
  const now = new Date();

  return aiSupervisorService.buildSnapshot({
    compoundRisk: { data: compoundRisk, loading: false, error: null, lastUpdated: now },
    emergencyResponse: {
      data: emergencyResponseService.toActionItems(emergencyActions),
      loading: false,
      error: null,
      lastUpdated: now,
    },
    recommendation: { data: recommendationResult.recommendations, loading: false, error: null, lastUpdated: now },
    compliance: { data: compliance, loading: false, error: null, lastUpdated: now },
  });
}
