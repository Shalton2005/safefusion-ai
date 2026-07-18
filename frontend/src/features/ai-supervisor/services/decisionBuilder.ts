/**
 * decisionBuilder
 *
 * Flattens each engine's raw result into the common `AIDecision` shape.
 * Split out of `aiSupervisor.service.ts` so agent-status derivation,
 * decision-flattening, and snapshot orchestration each live in their
 * own module.
 */

import { AGENT_LABEL, AGENT_STATUS_CONFIDENCE } from './agentBuilder';
import type {
  AgentEngineInput,
  AIAgentStatus,
  AIDecision,
  AIDecisionExecutionStatus,
  AIDecisionType,
} from '../types';
import type {
  CompoundRiskAssessment,
  ComplianceStatusSnapshot,
  EmergencyActionItem,
  Recommendation,
} from '@/types';

/** Decision type produced by each agent — one per engine's output shape. */
const AGENT_DECISION_TYPE = {
  compound_risk:      'risk_assessment',
  emergency_response: 'emergency_action',
  recommendation:     'recommendation',
  compliance:         'compliance_violation',
} as const satisfies Record<string, AIDecisionType>;

/** What each decision type means for execution — see `AIDecisionExecutionStatus` doc. */
const DECISION_TYPE_EXECUTION_STATUS: Record<AIDecisionType, AIDecisionExecutionStatus> = {
  risk_assessment:       'logged',
  emergency_action:      'executed',
  recommendation:        'pending',
  compliance_violation:  'flagged',
};

export function compoundRiskDecisions(engine: AgentEngineInput<CompoundRiskAssessment | null>, agentStatus: AIAgentStatus): AIDecision[] {
  if (!engine.data) return [];
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return [
    {
      id: 'compound-risk-latest',
      agentId: 'compound_risk',
      agentLabel: AGENT_LABEL.compound_risk,
      decisionType: AGENT_DECISION_TYPE.compound_risk,
      zone: null,
      severity: engine.data.risk_level,
      title: `${engine.data.triggered_rules_count} rule(s) triggered`,
      explanation: `Highest zone risk score reached ${engine.data.risk_score}/100.`,
      timestamp,
      isTimeApproximate: true,
      confidence: AGENT_STATUS_CONFIDENCE[agentStatus],
      executionStatus: DECISION_TYPE_EXECUTION_STATUS[AGENT_DECISION_TYPE.compound_risk],
    },
  ];
}

export function emergencyResponseDecisions(engine: AgentEngineInput<EmergencyActionItem[]>, agentStatus: AIAgentStatus): AIDecision[] {
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return engine.data.map((item) => ({
    id: `emergency-${item.zone}-${item.order}`,
    agentId: 'emergency_response',
    agentLabel: AGENT_LABEL.emergency_response,
    decisionType: AGENT_DECISION_TYPE.emergency_response,
    zone: item.zone,
    severity: item.risk_level,
    title: item.action,
    explanation: item.explanation,
    timestamp,
    isTimeApproximate: true,
    confidence: AGENT_STATUS_CONFIDENCE[agentStatus],
    executionStatus: DECISION_TYPE_EXECUTION_STATUS[AGENT_DECISION_TYPE.emergency_response],
  }));
}

export function recommendationDecisions(engine: AgentEngineInput<Recommendation[]>, agentStatus: AIAgentStatus): AIDecision[] {
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return engine.data.map((rec) => ({
    // Stable across refetches (unlike an array index): keyed on the
    // backend's own zone + priority + message, which together identify
    // a specific recommendation, so a poll that reorders or drops
    // entries doesn't relabel a still-present recommendation with a
    // different id (which would silently break a selected/highlighted row).
    id: `recommendation-${rec.zone ?? 'plant'}-${rec.priority}-${rec.message}`,
    agentId: 'recommendation',
    agentLabel: AGENT_LABEL.recommendation,
    decisionType: AGENT_DECISION_TYPE.recommendation,
    zone: rec.zone,
    severity: 'medium',
    title: rec.message,
    explanation: rec.reason,
    timestamp,
    isTimeApproximate: true,
    confidence: AGENT_STATUS_CONFIDENCE[agentStatus],
    executionStatus: DECISION_TYPE_EXECUTION_STATUS[AGENT_DECISION_TYPE.recommendation],
  }));
}

export function complianceDecisions(engine: AgentEngineInput<ComplianceStatusSnapshot | null>, agentStatus: AIAgentStatus): AIDecision[] {
  // Gated on `non_compliant_count` (the same field `buildSnapshot` uses as
  // this agent's `findingCount`) rather than `status`, so the two can never
  // disagree about whether this engine has something to report.
  if (!engine.data || engine.data.non_compliant_count === 0) return [];
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return [
    {
      id: 'compliance-latest',
      agentId: 'compliance',
      agentLabel: AGENT_LABEL.compliance,
      decisionType: AGENT_DECISION_TYPE.compliance,
      zone: null,
      severity: 'high',
      title: `${engine.data.non_compliant_count} non-compliant incident(s)`,
      explanation: `Frameworks violated: ${engine.data.violated_frameworks.join(', ') || 'none reported'}.`,
      timestamp,
      isTimeApproximate: true,
      confidence: AGENT_STATUS_CONFIDENCE[agentStatus],
      executionStatus: DECISION_TYPE_EXECUTION_STATUS[AGENT_DECISION_TYPE.compliance],
    },
  ];
}
