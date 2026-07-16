/**
 * ConfidenceOverview
 *
 * Displays the four confidence readings the AI Supervisor tracks —
 * Detection, Recommendation, Prediction, and Emergency Confidence —
 * each as a `ConfidenceGauge`. There is no backend concept named
 * "detection" or "prediction" confidence; these labels map onto the
 * four real supervised agents by the role each one actually plays:
 *
 *  - Detection Confidence      ← Compliance Engine (detects violations)
 *  - Recommendation Confidence ← Recommendation Engine
 *  - Prediction Confidence     ← Compound Risk Engine (predicts/scores risk)
 *  - Emergency Confidence      ← Emergency Response Engine
 *
 * Every value shown is the same per-agent `confidence` already computed
 * in `aiSupervisorService.buildAgent` — only the display label differs
 * here, nothing is recomputed or fabricated.
 *
 * @example
 * <ConfidenceOverview agents={snapshot.agents} />
 */

import { cn } from '@/lib/cn';
import { ConfidenceGauge } from './ConfidenceGauge';
import type { AIAgentId, AIAgentSummary } from '../types';

export interface ConfidenceOverviewProps {
  agents: AIAgentSummary[];
  className?: string;
}

const CONFIDENCE_LABEL_BY_AGENT: Record<AIAgentId, string> = {
  compliance: 'Detection Confidence',
  recommendation: 'Recommendation Confidence',
  compound_risk: 'Prediction Confidence',
  emergency_response: 'Emergency Confidence',
};

/** Fixed display order: Detection, Recommendation, Prediction, Emergency. */
const DISPLAY_ORDER: AIAgentId[] = ['compliance', 'recommendation', 'compound_risk', 'emergency_response'];

export function ConfidenceOverview({ agents, className }: ConfidenceOverviewProps) {
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-4', className)}>
      {DISPLAY_ORDER.map((agentId) => {
        const agent = agentById.get(agentId);
        return (
          <ConfidenceGauge
            key={agentId}
            label={CONFIDENCE_LABEL_BY_AGENT[agentId]}
            value={agent?.confidence ?? 0}
          />
        );
      })}
    </div>
  );
}
