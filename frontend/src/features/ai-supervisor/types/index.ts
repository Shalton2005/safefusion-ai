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
 * Per-agent lifecycle status, derived entirely from the polling state
 * each engine hook already exposes (`loading` / `error` / `lastUpdated`)
 * — never a fabricated job-queue state:
 *  - `idle`      — not yet polled (no `lastUpdated`, not loading)
 *  - `running`   — a fetch is currently in flight
 *  - `completed` — most recent fetch succeeded and reported findings
 *  - `waiting`   — most recent fetch succeeded with zero findings (healthy, nothing to act on)
 *  - `failed`    — most recent fetch errored
 */
export const AI_AGENT_STATUSES = ['idle', 'running', 'completed', 'waiting', 'failed'] as const;
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
  /**
   * 0-100 confidence in this agent's current output. Derived from its
   * lifecycle status (completed/waiting=100, running=50, idle/failed=0)
   * — a system-health confidence measure, not a fabricated model score
   * (mirrors `AIDecision.confidence`'s convention).
   */
  confidence: number;
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

// ─── Explainable AI Panel ───────────────────────────────────────────
//
// A dedicated, API-shaped contract for `ExplainableAIPanel` — distinct
// from `AIDecision` above. `AIDecision` is this feature's internal
// synthesis type (client-derived from four engine hooks); this section
// models what a real explainability endpoint would return for a single
// decision, so the panel can be dropped in as-is once such an endpoint
// exists, and can also be fed today via `toExplainableAIData` (see
// `aiSupervisor.service.ts`), which maps an `AIDecision` onto this
// shape using only fields already present on it — nothing fabricated.

/** One piece of supporting data behind a decision, e.g. a sensor reading or a risk score. */
export interface ExplainableEvidenceItem {
  label: string;
  value: string;
}

/** One hazard the decision identified. */
export interface DetectedHazard {
  label: string;
  severity: SeverityLevel;
  description: string;
}

/** One safety rule or framework the decision was checked against. */
export interface ApplicableSafetyRule {
  code: string;
  description: string;
}

/** One action recommended (not necessarily executed) as a result of the decision. */
export interface RecommendedAction {
  label: string;
  rationale: string;
}

/** Full payload for `ExplainableAIPanel` — mirrors what a real explainability API would return for one decision. */
export interface ExplainableAIData {
  /** High-level summary of what was decided and why. */
  summary: {
    title: string;
    zone: string | null;
    severity: SeverityLevel;
    confidence: number;
    timestamp: string;
  };
  evidence: ExplainableEvidenceItem[];
  detectedHazards: DetectedHazard[];
  applicableRules: ApplicableSafetyRule[];
  recommendedActions: RecommendedAction[];
}
