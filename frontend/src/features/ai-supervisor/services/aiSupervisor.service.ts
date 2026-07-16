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
import type { AIAgentId, AIAgentSummary, AIDecision, AISupervisorSnapshot } from '../types';

const AGENT_LABEL: Record<AIAgentId, string> = {
  compound_risk:      'Compound Risk Engine',
  emergency_response: 'Emergency Response Engine',
  recommendation:     'Recommendation Engine',
  compliance:         'Compliance Engine',
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

function compoundRiskDecisions(engine: AgentEngineInput<CompoundRiskAssessment | null>): AIDecision[] {
  if (!engine.data) return [];
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return [
    {
      id: 'compound-risk-latest',
      agentId: 'compound_risk',
      agentLabel: AGENT_LABEL.compound_risk,
      zone: null,
      severity: engine.data.risk_level,
      title: `${engine.data.triggered_rules_count} rule(s) triggered`,
      explanation: `Highest zone risk score reached ${engine.data.risk_score}/100.`,
      timestamp,
      isTimeApproximate: true,
    },
  ];
}

function emergencyResponseDecisions(engine: AgentEngineInput<EmergencyActionItem[]>): AIDecision[] {
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return engine.data.map((item) => ({
    id: `emergency-${item.zone}-${item.order}`,
    agentId: 'emergency_response',
    agentLabel: AGENT_LABEL.emergency_response,
    zone: item.zone,
    severity: item.risk_level,
    title: item.action,
    explanation: item.explanation,
    timestamp,
    isTimeApproximate: true,
  }));
}

function recommendationDecisions(engine: AgentEngineInput<Recommendation[]>): AIDecision[] {
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return engine.data.map((rec, index) => ({
    id: `recommendation-${index}`,
    agentId: 'recommendation',
    agentLabel: AGENT_LABEL.recommendation,
    zone: rec.zone,
    severity: 'medium',
    title: rec.message,
    explanation: rec.reason,
    timestamp,
    isTimeApproximate: true,
  }));
}

function complianceDecisions(engine: AgentEngineInput<ComplianceStatusSnapshot | null>): AIDecision[] {
  if (!engine.data || engine.data.status === 'compliant') return [];
  const timestamp = (engine.lastUpdated ?? new Date()).toISOString();
  return [
    {
      id: 'compliance-latest',
      agentId: 'compliance',
      agentLabel: AGENT_LABEL.compliance,
      zone: null,
      severity: 'high',
      title: `${engine.data.non_compliant_count} non-compliant incident(s)`,
      explanation: `Frameworks violated: ${engine.data.violated_frameworks.join(', ') || 'none reported'}.`,
      timestamp,
      isTimeApproximate: true,
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

  const decisions = [
    ...compoundRiskDecisions(input.compoundRisk),
    ...emergencyResponseDecisions(input.emergencyResponse),
    ...recommendationDecisions(input.recommendation),
    ...complianceDecisions(input.compliance),
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
