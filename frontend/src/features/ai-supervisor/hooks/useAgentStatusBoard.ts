/**
 * useAgentStatusBoard
 *
 * Composes every supervised agent — the four real engines, the
 * Knowledge Graph query, and the Supervisor's own synthesis step — into
 * one `AIAgentSummary[]` for `AIAgentStatusBoard`. Takes the four engine
 * hook results and the `useAISupervisor` result as parameters (rather
 * than calling those hooks itself) so a caller that already mounted
 * them — see `AISupervisorPage` — shares one polling instance of each
 * instead of this hook creating its own independent set, which used to
 * triple every engine's network call per page load. Adds real
 * client-measured `executionTimeMs` per agent via
 * `useAgentExecutionTiming`, plus two rows `useAISupervisor` doesn't
 * produce:
 *   - `knowledge_graph` — `useKnowledgeGraph`'s one-shot fetch, wrapped
 *     the same way the polling engines are.
 *   - `supervisor`      — no network call of its own; status/confidence
 *     mirror the aggregate `AISupervisorSnapshot` `useAISupervisor`
 *     already computes, so "is the Supervisor healthy" always agrees
 *     with the rest of the AI Supervisor page.
 *
 * @example
 * const supervisor = useAISupervisor();
 * const { agents, loading, error, refresh } = useAgentStatusBoard({
 *   compoundRisk, emergencyResponse, recommendation, compliance, supervisor,
 * });
 */

import { useMemo } from 'react';
import { useKnowledgeGraph } from '@/features/knowledge-graph/hooks/useKnowledgeGraph';
import { useAgentExecutionTiming } from './useAgentExecutionTiming';
import { buildAgent, getAgentConfidence } from '../services/agentBuilder';
import type { AIAgentSummary } from '../types';
import type { UseCompoundRiskEngineResult } from '@/features/risk/hooks/useCompoundRiskEngine';
import type { UseEmergencyResponseResult } from '@/features/emergency/hooks/useEmergencyResponse';
import type { UseRecommendationsResult } from '@/features/recommendations/hooks/useRecommendations';
import type { UseComplianceStatusResult } from '@/features/compliance/hooks/useComplianceStatus';
import type { UseAISupervisorResult } from './useAISupervisor';

export interface UseAgentStatusBoardParams {
  compoundRisk: UseCompoundRiskEngineResult;
  emergencyResponse: UseEmergencyResponseResult;
  recommendation: UseRecommendationsResult;
  compliance: UseComplianceStatusResult;
  supervisor: UseAISupervisorResult;
}

export interface UseAgentStatusBoardResult {
  agents: AIAgentSummary[];
  /** True until every agent has reported at least once. */
  loading: boolean;
  /** First error reported by any agent, or `null` when all are healthy. */
  error: string | null;
  refresh: () => void;
}

export function useAgentStatusBoard({
  compoundRisk,
  emergencyResponse,
  recommendation,
  compliance,
  supervisor,
}: UseAgentStatusBoardParams): UseAgentStatusBoardResult {
  const knowledgeGraph = useKnowledgeGraph();

  const compoundRiskTime = useAgentExecutionTiming(compoundRisk.loading, compoundRisk.lastUpdated);
  const emergencyResponseTime = useAgentExecutionTiming(emergencyResponse.loading, emergencyResponse.lastUpdated);
  const recommendationTime = useAgentExecutionTiming(recommendation.loading, recommendation.lastUpdated);
  const complianceTime = useAgentExecutionTiming(compliance.loading, compliance.lastUpdated);
  const knowledgeGraphTime = useAgentExecutionTiming(knowledgeGraph.loading, knowledgeGraph.metadata?.generated_at ? new Date(knowledgeGraph.metadata.generated_at) : null);

  const agents = useMemo<AIAgentSummary[]>(() => {
    const supervisorStatus = supervisor.loading
      ? 'running'
      : supervisor.error
        ? 'failed'
        : supervisor.snapshot.lastDecisionTime
          ? 'completed'
          : 'waiting';

    return [
      buildAgent(
        'compound_risk',
        { data: compoundRisk.assessment, loading: compoundRisk.loading, error: compoundRisk.error, lastUpdated: compoundRisk.lastUpdated },
        compoundRisk.assessment?.triggered_rules_count ?? 0,
        compoundRiskTime,
      ),
      buildAgent(
        'emergency_response',
        { data: emergencyResponse.actions, loading: emergencyResponse.loading, error: emergencyResponse.error, lastUpdated: emergencyResponse.lastUpdated },
        emergencyResponse.actions.length,
        emergencyResponseTime,
      ),
      buildAgent(
        'recommendation',
        { data: recommendation.recommendations, loading: recommendation.loading, error: recommendation.error, lastUpdated: recommendation.lastUpdated },
        recommendation.recommendations.length,
        recommendationTime,
      ),
      buildAgent(
        'compliance',
        { data: compliance.snapshot, loading: compliance.loading, error: compliance.error, lastUpdated: compliance.lastUpdated },
        compliance.snapshot?.non_compliant_count ?? 0,
        complianceTime,
      ),
      buildAgent(
        'knowledge_graph',
        {
          data: knowledgeGraph.nodes,
          loading: knowledgeGraph.loading,
          error: knowledgeGraph.error,
          lastUpdated: knowledgeGraph.metadata ? new Date(knowledgeGraph.metadata.generated_at) : null,
        },
        knowledgeGraph.nodes.length,
        knowledgeGraphTime,
      ),
      {
        id: 'supervisor',
        label: 'Supervisor',
        status: supervisorStatus,
        findingCount: supervisor.snapshot.decisions.length,
        lastUpdated: supervisor.snapshot.lastDecisionTime,
        error: supervisor.error,
        confidence: supervisor.snapshot.overallConfidence || getAgentConfidence('supervisor', supervisorStatus),
        // The Supervisor performs no network call of its own — it
        // synthesises the results the other five agents already
        // fetched — so it has no execution time to measure.
        executionTimeMs: null,
      },
    ];
  }, [
    compoundRisk.assessment, compoundRisk.loading, compoundRisk.error, compoundRisk.lastUpdated, compoundRiskTime,
    emergencyResponse.actions, emergencyResponse.loading, emergencyResponse.error, emergencyResponse.lastUpdated, emergencyResponseTime,
    recommendation.recommendations, recommendation.loading, recommendation.error, recommendation.lastUpdated, recommendationTime,
    compliance.snapshot, compliance.loading, compliance.error, compliance.lastUpdated, complianceTime,
    knowledgeGraph.nodes, knowledgeGraph.loading, knowledgeGraph.error, knowledgeGraph.metadata, knowledgeGraphTime,
    supervisor.snapshot, supervisor.loading, supervisor.error,
  ]);

  const loading = agents.some((a) => a.status === 'idle' || a.status === 'running') && agents.every((a) => !a.lastUpdated);
  const error = compoundRisk.error ?? emergencyResponse.error ?? recommendation.error ?? compliance.error ?? knowledgeGraph.error;

  const refresh = () => {
    // supervisor.refresh() already covers compoundRisk/emergencyResponse/
    // recommendation/compliance — they're the same shared instances.
    supervisor.refresh();
    knowledgeGraph.refresh();
  };

  return { agents, loading, error, refresh };
}
