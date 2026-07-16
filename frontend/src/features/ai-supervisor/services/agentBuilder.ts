/**
 * agentBuilder
 *
 * Derives an `AIAgentSummary` (lifecycle status + confidence) from a
 * single engine's polling state. Split out of `aiSupervisor.service.ts`
 * so agent-status derivation, decision-flattening, and snapshot
 * orchestration each live in their own module.
 */

import type { AgentEngineInput, AIAgentId, AIAgentStatus, AIAgentSummary } from '../types';

export const AGENT_LABEL: Record<AIAgentId, string> = {
  compound_risk:      'Compound Risk Engine',
  emergency_response: 'Emergency Response Engine',
  recommendation:     'Recommendation Engine',
  compliance:         'Compliance Engine',
};

/** Per-agent (and per-decision) confidence, derived from lifecycle status — not a fabricated model score. */
export const AGENT_STATUS_CONFIDENCE: Record<AIAgentStatus, number> = {
  completed: 100,
  waiting: 100,
  running: 50,
  idle: 0,
  failed: 0,
};

/** Lifecycle statuses that mean the agent is healthy and reporting (used to count "active" agents and gate the overall processing state). */
export const HEALTHY_AGENT_STATUSES: readonly AIAgentStatus[] = ['completed', 'waiting'];

export function buildAgent<T>(
  id: AIAgentId,
  engine: AgentEngineInput<T>,
  findingCount: number,
): AIAgentSummary {
  const status: AIAgentStatus = engine.error
    ? 'failed'
    : engine.loading && !engine.lastUpdated
      ? 'running'
      : !engine.lastUpdated
        ? 'idle'
        : findingCount > 0
          ? 'completed'
          : 'waiting';

  return {
    id,
    label: AGENT_LABEL[id],
    status,
    findingCount,
    lastUpdated: engine.lastUpdated,
    error: engine.error,
    confidence: AGENT_STATUS_CONFIDENCE[status],
  };
}
