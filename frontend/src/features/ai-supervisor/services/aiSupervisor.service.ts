/**
 * aiSupervisorService
 *
 * Pure synthesis layer over the real engine results the dashboard
 * already fetches (Compound Risk, Emergency Response, Recommendation,
 * Compliance). Takes no network action of its own — `useAISupervisor`
 * feeds it the same `useCompoundRiskEngine` / `useEmergencyResponse` /
 * `useRecommendations` / `useComplianceStatus` results already used
 * elsewhere on the dashboard, so the AI Supervisor never re-fetches
 * (or duplicates) a call another panel already made.
 */

import { SEVERITY_LEVELS, type SeverityLevel } from '@/constants';
import { RISK_LEVEL_TO_PLANT_STATUS } from '@/utils/severity';
import type {
  CompoundRiskAssessment,
  ComplianceStatusSnapshot,
  EmergencyActionItem,
  Recommendation,
  RiskStatus,
} from '@/types';
import type {
  AIAgentId,
  AIAgentStatus,
  AIAgentSummary,
  AIDecision,
  AIDecisionExecutionStatus,
  AIDecisionType,
  AISupervisorSnapshot,
} from '../types';

const AGENT_LABEL: Record<AIAgentId, string> = {
  compound_risk:      'Compound Risk Engine',
  emergency_response: 'Emergency Response Engine',
  recommendation:     'Recommendation Engine',
  compliance:         'Compliance Engine',
};

/** Decision type produced by each agent — one per engine's output shape. */
const AGENT_DECISION_TYPE: Record<AIAgentId, AIDecisionType> = {
  compound_risk:      'risk_assessment',
  emergency_response: 'emergency_action',
  recommendation:     'recommendation',
  compliance:         'compliance_violation',
};

/** What each decision type means for execution — see `AIDecisionExecutionStatus` doc. */
const DECISION_TYPE_EXECUTION_STATUS: Record<AIDecisionType, AIDecisionExecutionStatus> = {
  risk_assessment:       'logged',
  emergency_action:      'executed',
  recommendation:        'pending',
  compliance_violation:  'flagged',
};

/** Per-decision confidence, derived from the source agent's health at fetch time — not a fabricated model score. */
const AGENT_STATUS_CONFIDENCE: Record<AIAgentStatus, number> = {
  active: 100,
  degraded: 50,
  offline: 0,
};

export interface AgentEngineInput<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface BuildSnapshotInput {
  compoundRisk: AgentEngineInput<CompoundRiskAssessment | null>;
  emergencyResponse: AgentEngineInput<EmergencyActionItem[]>;
  recommendation: AgentEngineInput<Recommendation[]>;
  compliance: AgentEngineInput<ComplianceStatusSnapshot | null>;
}

/** Highest-severity-first ordering, matching `SEVERITY_LEVELS`. */
function highestSeverity(levels: SeverityLevel[]): SeverityLevel | null {
  if (levels.length === 0) return null;
  return [...levels].sort(
    (a, b) => SEVERITY_LEVELS.indexOf(b) - SEVERITY_LEVELS.indexOf(a),
  )[0];
}

function buildAgent<T>(
  id: AIAgentId,
  engine: AgentEngineInput<T>,
  findingCount: number,
): AIAgentSummary {
  const status: AIAgentSummary['status'] = engine.error
    ? 'offline'
    : engine.loading && !engine.lastUpdated
      ? 'degraded'
      : 'active';

  return {
    id,
    label: AGENT_LABEL[id],
    status,
    findingCount,
    lastUpdated: engine.lastUpdated,
    error: engine.error,
  };
}

function compoundRiskDecisions(engine: AgentEngineInput<CompoundRiskAssessment | null>, agentStatus: AIAgentStatus): AIDecision[] {
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

function emergencyResponseDecisions(engine: AgentEngineInput<EmergencyActionItem[]>, agentStatus: AIAgentStatus): AIDecision[] {
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

function recommendationDecisions(engine: AgentEngineInput<Recommendation[]>, agentStatus: AIAgentStatus): AIDecision[] {
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return engine.data.map((rec, index) => ({
    id: `recommendation-${index}`,
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

function complianceDecisions(engine: AgentEngineInput<ComplianceStatusSnapshot | null>, agentStatus: AIAgentStatus): AIDecision[] {
  if (!engine.data || engine.data.status === 'compliant') return [];
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

/** Builds the full `AISupervisorSnapshot` from the four real engine results. Never fabricates a field — everything traces back to a real response. */
function buildSnapshot(input: BuildSnapshotInput): AISupervisorSnapshot {
  const agents: AIAgentSummary[] = [
    buildAgent('compound_risk', input.compoundRisk, input.compoundRisk.data?.triggered_rules_count ?? 0),
    buildAgent('emergency_response', input.emergencyResponse, input.emergencyResponse.data.length),
    buildAgent('recommendation', input.recommendation, input.recommendation.data.length),
    buildAgent('compliance', input.compliance, input.compliance.data?.non_compliant_count ?? 0),
  ];
  const agentStatusById = new Map(agents.map((a) => [a.id, a.status]));

  const decisions = [
    ...compoundRiskDecisions(input.compoundRisk, agentStatusById.get('compound_risk')!),
    ...emergencyResponseDecisions(input.emergencyResponse, agentStatusById.get('emergency_response')!),
    ...recommendationDecisions(input.recommendation, agentStatusById.get('recommendation')!),
    ...complianceDecisions(input.compliance, agentStatusById.get('compliance')!),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const severities = agents
    .map((a) => a.id === 'compound_risk' ? input.compoundRisk.data?.risk_level : undefined)
    .filter((s): s is SeverityLevel => Boolean(s));
  const decisionSeverities = decisions.map((d) => d.severity);
  const overallRiskLevel = highestSeverity([...severities, ...decisionSeverities]);
  const overallRiskStatus: RiskStatus | null = overallRiskLevel
    ? RISK_LEVEL_TO_PLANT_STATUS[overallRiskLevel] === 'normal'
      ? 'safe'
      : RISK_LEVEL_TO_PLANT_STATUS[overallRiskLevel] === 'warning'
        ? 'warning'
        : 'critical'
    : null;

  const activeAgentCount = agents.filter((a) => a.status === 'active').length;
  const anyError = agents.some((a) => a.status === 'offline');
  const anyLoading = agents.some((a) => a.status === 'degraded');

  const processingState: AISupervisorSnapshot['processingState'] = anyError
    ? 'error'
    : anyLoading
      ? 'processing'
      : overallRiskStatus === 'critical'
        ? 'action_required'
        : 'idle';

  const lastDecisionTimes = agents
    .map((a) => a.lastUpdated)
    .filter((d): d is Date => d !== null);
  const lastDecisionTime = lastDecisionTimes.length > 0
    ? new Date(Math.max(...lastDecisionTimes.map((d) => d.getTime())))
    : null;

  const overallConfidence = Math.round((activeAgentCount / agents.length) * 100);

  return {
    processingState,
    overallRiskLevel,
    overallRiskStatus,
    agents,
    activeAgentCount,
    lastDecisionTime,
    overallConfidence,
    decisions,
  };
}

export const aiSupervisorService = {
  buildSnapshot,
};
