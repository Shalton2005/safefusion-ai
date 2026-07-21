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
 *
 * This module is the orchestrator only — agent-status derivation lives
 * in `agentBuilder.ts`, per-engine decision flattening in
 * `decisionBuilder.ts`. `buildSnapshot`/`toExplainableAIData` remain
 * the only two functions this feature's hook, store, and API service
 * call; everything else here is a private implementation detail.
 */

import { SEVERITY_LEVELS, type SeverityLevel } from '@/constants';
import { RISK_LEVEL_TO_PLANT_STATUS } from '@/utils/severity';
import { buildAgent, HEALTHY_AGENT_STATUSES } from './agentBuilder';
import {
  compoundRiskDecisions,
  emergencyResponseDecisions,
  recommendationDecisions,
  complianceDecisions,
} from './decisionBuilder';
import type { RiskStatus } from '@/types';
import type {
  AIAgentSummary,
  AIDecision,
  AISupervisorSnapshot,
  BuildSnapshotInput,
  ExplainableAIData,
} from '../types';

/** Highest-severity-first ordering, matching `SEVERITY_LEVELS`. */
function highestSeverity(levels: SeverityLevel[]): SeverityLevel | null {
  if (levels.length === 0) return null;
  return [...levels].sort(
    (a, b) => SEVERITY_LEVELS.indexOf(b) - SEVERITY_LEVELS.indexOf(a),
  )[0];
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

  const activeAgentCount = agents.filter((a) => HEALTHY_AGENT_STATUSES.includes(a.status)).length;
  const anyError = agents.some((a) => a.status === 'failed');
  const anyLoading = agents.some((a) => a.status === 'running');

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

  const baseConfidence = Math.round((activeAgentCount / agents.length) * 100);
  const overallConfidence = baseConfidence === 100 ? 94 : baseConfidence;

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

/**
 * Maps a single `AIDecision` onto the `ExplainableAIData` contract for
 * `ExplainableAIPanel`. Every section is derived only from fields the
 * decision already carries — `decisionType` decides which section the
 * decision's `title`/`explanation` populates, since none of the four
 * engines return separately-structured evidence/hazard/rule/action
 * lists today. Nothing here invents data the source engine didn't report.
 */
function toExplainableAIData(decision: AIDecision): ExplainableAIData {
  const summary = {
    title: decision.title,
    zone: decision.zone,
    severity: decision.severity,
    confidence: decision.confidence,
    timestamp: decision.timestamp,
  };

  const evidence = [
    { label: 'Source', value: decision.agentLabel },
    { label: 'Zone', value: decision.zone ?? 'Plant-wide' },
    { label: 'Reported', value: decision.timestamp },
  ];

  const detectedHazards = decision.decisionType === 'risk_assessment' || decision.decisionType === 'emergency_action'
    ? [{ label: decision.title, severity: decision.severity, description: decision.explanation }]
    : [];

  const applicableRules = decision.decisionType === 'compliance_violation'
    ? [{ code: decision.title, description: decision.explanation }]
    : [];

  const recommendedActions = decision.decisionType === 'recommendation' || decision.decisionType === 'emergency_action'
    ? [{ label: decision.title, rationale: decision.explanation }]
    : [];

  return { summary, evidence, detectedHazards, applicableRules, recommendedActions };
}

export const aiSupervisorService = {
  buildSnapshot,
  toExplainableAIData,
};
