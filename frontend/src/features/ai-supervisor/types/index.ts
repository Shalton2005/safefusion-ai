// ─── AI Supervisor ──────────────────────────────────────────────────
//
// The "AI Supervisor" is not a single backend service — it is a
// client-side synthesis over the real engines that already run
// server-side: the Compound Risk engine, the Emergency Response
// engine, the Recommendation engine, and the Compliance engine.
// Every field here is derived from one of those real responses;
// nothing is fabricated client-side.

import type { SeverityLevel } from '@/constants';
import type { RiskStatus } from '@/types';

/** One real backend engine, modelled as a supervised "agent". */
export const AI_AGENT_IDS = [
  'compound_risk',
  'emergency_response',
  'recommendation',
  'compliance',
] as const;
export type AIAgentId = (typeof AI_AGENT_IDS)[number];

/**
 * Per-agent health, derived from whether its underlying engine call
 * most recently succeeded, failed, or hasn't reported yet.
 */
export const AI_AGENT_STATUSES = ['active', 'degraded', 'offline'] as const;
export type AIAgentStatus = (typeof AI_AGENT_STATUSES)[number];

/** Overall AI Supervisor processing state, derived from the loading/error state of all agents. */
export const AI_SUPERVISOR_PROCESSING_STATES = ['idle', 'processing', 'action_required', 'error'] as const;
export type AISupervisorProcessingState = (typeof AI_SUPERVISOR_PROCESSING_STATES)[number];

/** Snapshot of a single supervised agent. */
export interface AIAgentSummary {
  id: AIAgentId;
  /** Human-readable agent name, e.g. "Compound Risk Engine". */
  label: string;
  status: AIAgentStatus;
  /** Number of findings/items this agent last reported (rules triggered, actions dispatched, recommendations issued, violations found). */
  findingCount: number;
  lastUpdated: Date | null;
  /** Present only when the agent's most recent call failed. */
  error: string | null;
}

/**
 * The kind of decision each agent produces — one per supervised
 * engine's output shape (not a generic label; it names what the
 * engine actually computed).
 */
export const AI_DECISION_TYPES = [
  'risk_assessment',
  'emergency_action',
  'recommendation',
  'compliance_violation',
] as const;
export type AIDecisionType = (typeof AI_DECISION_TYPES)[number];

/**
 * Whether a decision has actually been carried out. Derived from what
 * each engine does, not a real execution/approval workflow (none
 * exists in the backend yet):
 *  - `emergency_action`      → 'executed'  (the engine dispatches it directly)
 *  - `compliance_violation`  → 'flagged'   (raised for follow-up, not auto-resolved)
 *  - `recommendation`        → 'pending'   (advisory only, awaits an operator)
 *  - `risk_assessment`       → 'logged'    (recorded, no action taken by itself)
 */
export const AI_DECISION_EXECUTION_STATUSES = ['executed', 'pending', 'flagged', 'logged'] as const;
export type AIDecisionExecutionStatus = (typeof AI_DECISION_EXECUTION_STATUSES)[number];

/**
 * A single explainable decision surfaced by one of the supervised
 * agents, flattened into a common shape for the timeline / explain
 * panel. Every field traces back to a real engine response field —
 * see the `source` engine's own types for the untransformed shape.
 */
export interface AIDecision {
  id: string;
  agentId: AIAgentId;
  agentLabel: string;
  /** What kind of decision this is — mirrors the source engine's output. */
  decisionType: AIDecisionType;
  zone: string | null;
  severity: SeverityLevel;
  /** Short label for the decision, e.g. "Isolate Equipment" or a triggered rule name. */
  title: string;
  /** Backend-authored explanation/reason text for this decision. */
  explanation: string;
  timestamp: string;
  /** True when `timestamp` is the client fetch time rather than a backend-recorded event time (mirrors `SafetyTimelineEvent.isTimeApproximate`). */
  isTimeApproximate?: boolean;
  /**
   * 0-100 confidence in this decision. Derived from the source agent's
   * health at fetch time (active=100, degraded=50, offline=0) — the
   * same system-health confidence measure as `AISupervisorSnapshot.overallConfidence`,
   * applied per-decision. Not a per-decision model score (no such
   * backend signal exists yet).
   */
  confidence: number;
  /** Whether this decision has been carried out — see `AIDecisionExecutionStatus` doc for how each value is derived. */
  executionStatus: AIDecisionExecutionStatus;
}

/** Full AI Supervisor snapshot, aggregating all supervised agents. */
export interface AISupervisorSnapshot {
  processingState: AISupervisorProcessingState;
  /** Highest risk level across all agents reporting a severity; `null` when no agent has reported yet. */
  overallRiskLevel: SeverityLevel | null;
  overallRiskStatus: RiskStatus | null;
  agents: AIAgentSummary[];
  /** Count of agents currently `active`. */
  activeAgentCount: number;
  /** Most recent `lastUpdated` across all agents; `null` before any agent has reported. */
  lastDecisionTime: Date | null;
  /**
   * Overall confidence, 0-100 — the proportion of supervised agents
   * currently `active` (i.e. reporting successfully). Not a model
   * confidence score (no such backend signal exists yet); this is a
   * system-health confidence measure and is labelled as such in the UI.
   */
  overallConfidence: number;
  decisions: AIDecision[];
}
