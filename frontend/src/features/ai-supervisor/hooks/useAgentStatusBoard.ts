/**
 * useAgentStatusBoard
 *
 * Composes every supervised agent — the four real engines, the
 * Knowledge Graph query, and the Supervisor's own synthesis step — into
 * one `AIAgentSummary[]` for `AIAgentStatusBoard`. Reuses the same
 * already-polling engine hooks `useAISupervisor` does (so no duplicate
 * network calls), adding real client-measured `executionTimeMs` per
 * agent via `useAgentExecutionTiming`, plus two rows `useAISupervisor`
 * doesn't produce:
 *   - `knowledge_graph` — `useKnowledgeGraph`'s one-shot fetch, wrapped
 *     the same way the polling engines are.
 *   - `supervisor`      — no network call of its own; status/confidence
 *     mirror the aggregate `AISupervisorSnapshot` `useAISupervisor`
 *     already computes, so "is the Supervisor healthy" always agrees
 *     with the rest of the AI Supervisor page.
 *
 * @example
 * const { agents, loading, error, refresh } = useAgentStatusBoard();
 */

import { useMemo } from 'react';
import { useCompoundRiskEngine } from '@/features/risk/hooks/useCompoundRiskEngine';
import { useEmergencyResponse } from '@/features/emergency/hooks/useEmergencyResponse';
import { useRecommendations } from '@/features/recommendations/hooks/useRecommendations';
import { useComplianceStatus } from '@/features/compliance/hooks/useComplianceStatus';
import { useKnowledgeGraph } from '@/features/knowledge-graph/hooks/useKnowledgeGraph';
import { useAISupervisor } from './useAISupervisor';
import { useAgentExecutionTiming } from './useAgentExecutionTiming';
import { buildAgent, AGENT_STATUS_CONFIDENCE } from '../services/agentBuilder';
import type { AIAgentSummary } from '../types';

export interface UseAgentStatusBoardResult {
  agents: AIAgentSummary[];
  /** True until every agent has reported at least once. */
  loading: boolean;
  /** First error reported by any agent, or `null` when all are healthy. */
  error: string | null;
  refresh: () => void;
}

export function useAgentStatusBoard(): UseAgentStatusBoardResult {
  const compoundRisk = useCompoundRiskEngine();
  const emergencyResponse = useEmergencyResponse();
  const recommendation = useRecommendations();
  const compliance = useComplianceStatus();
  const knowledgeGraph = useKnowledgeGraph();
  const supervisor = useAISupervisor();

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
        confidence: supervisor.snapshot.overallConfidence || AGENT_STATUS_CONFIDENCE[supervisorStatus],
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
    compoundRisk.refresh();
    emergencyResponse.refresh();
    recommendation.refresh();
    compliance.refresh();
    knowledgeGraph.refresh();
    supervisor.refresh();
  };

  return { agents, loading, error, refresh };
}
