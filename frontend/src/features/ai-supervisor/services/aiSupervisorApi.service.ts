/**
 * aiSupervisorApiService
 *
 * API-layer service for the AI Supervisor feature, matching the
 * suggested REST contract:
 *
 *   GET /api/ai/supervisor/status
 *   GET /api/ai/supervisor/workflow
 *   GET /api/ai/supervisor/decisions
 *   GET /api/ai/supervisor/explanations/:id
 *
 * No such backend endpoints exist yet (confirmed against
 * `backend/src/routes/` — there is no `/ai` or `/supervisor` router).
 * Rather than hardcode fixture data, each function below computes its
 * response by calling the four real, already-live engine endpoints
 * (Compound Risk, Emergency Response, Recommendation, Compliance) and
 * reducing them through the same `aiSupervisorService.buildSnapshot` /
 * `toExplainableAIData` used everywhere else in this feature — so every
 * value returned still traces back to a real backend response, and
 * nothing here is invented UI data.
 *
 * Each function's signature and return type match what the real
 * endpoint would return once built — swapping the body for a direct
 * `apiClient.get(...)` call is a one-line change per function, with no
 * change required to any caller.
 */

import { compoundRiskService } from '@/services/compoundRisk.service';
import { emergencyResponseService } from '@/services/emergencyResponse.service';
import { recommendationService } from '@/services/recommendation.service';
import { complianceService } from '@/services/compliance.service';
import { aiSupervisorService } from './aiSupervisor.service';
import type {
  AIAgentSummary,
  AIDecision,
  AISupervisorProcessingState,
  ExplainableAIData,
} from '../types';
import type { SeverityLevel } from '@/constants';
import type { RiskStatus } from '@/types';
import type { RequestOptions } from '@/api/types';

/** Runs all four supervised engines in parallel and reduces them into a snapshot — the single computation every endpoint function below shares. */
async function fetchSnapshot(options?: RequestOptions) {
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

/** Response shape for `GET /api/ai/supervisor/status`. */
export interface AISupervisorStatusResponse {
  processingState: AISupervisorProcessingState;
  overallRiskLevel: SeverityLevel | null;
  overallRiskStatus: RiskStatus | null;
  activeAgentCount: number;
  totalAgentCount: number;
  overallConfidence: number;
  lastDecisionTime: string | null;
}

/** Response shape for `GET /api/ai/supervisor/workflow`. */
export interface AISupervisorWorkflowResponse {
  agents: AIAgentSummary[];
}

/** Response shape for `GET /api/ai/supervisor/decisions`. */
export interface AISupervisorDecisionsResponse {
  decisions: AIDecision[];
}

/** Response shape for `GET /api/ai/supervisor/explanations/:id`. `null` when no decision with that id exists in the current decision set. */
export type AISupervisorExplanationResponse = ExplainableAIData | null;

export const aiSupervisorApiService = {
  /** GET /api/ai/supervisor/status */
  getStatus: async (options?: RequestOptions): Promise<AISupervisorStatusResponse> => {
    const snapshot = await fetchSnapshot(options);
    return {
      processingState: snapshot.processingState,
      overallRiskLevel: snapshot.overallRiskLevel,
      overallRiskStatus: snapshot.overallRiskStatus,
      activeAgentCount: snapshot.activeAgentCount,
      totalAgentCount: snapshot.agents.length,
      overallConfidence: snapshot.overallConfidence,
      lastDecisionTime: snapshot.lastDecisionTime ? snapshot.lastDecisionTime.toISOString() : null,
    };
  },

  /** GET /api/ai/supervisor/workflow */
  getWorkflow: async (options?: RequestOptions): Promise<AISupervisorWorkflowResponse> => {
    const snapshot = await fetchSnapshot(options);
    return { agents: snapshot.agents };
  },

  /** GET /api/ai/supervisor/decisions */
  getDecisions: async (options?: RequestOptions): Promise<AISupervisorDecisionsResponse> => {
    const snapshot = await fetchSnapshot(options);
    return { decisions: snapshot.decisions };
  },

  /** GET /api/ai/supervisor/explanations/:id */
  getExplanation: async (id: string, options?: RequestOptions): Promise<AISupervisorExplanationResponse> => {
    const snapshot = await fetchSnapshot(options);
    const decision = snapshot.decisions.find((d) => d.id === id);
    return decision ? aiSupervisorService.toExplainableAIData(decision) : null;
  },
};
