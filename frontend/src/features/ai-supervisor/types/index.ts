// ─── AI Supervisor ──────────────────────────────────────────────────
//
// The "AI Supervisor" is not a single backend service — it is a
// client-side synthesis over the real engines that already run
// server-side: the Compound Risk engine, the Emergency Response
// engine, the Recommendation engine, and the Compliance engine.
// Every field here is derived from one of those real responses;
// nothing is fabricated client-side.

import type { SeverityLevel } from '@/constants';
import type {
  CompoundRiskAssessment,
  ComplianceStatusSnapshot,
  EmergencyActionItem,
  Recommendation,
  RiskStatus,
} from '@/types';

/**
 * One supervised "agent". The first four map 1:1 onto the real backend
 * engines above; `knowledge_graph` maps onto `GET /graph/visualization`
 * (the closest real backend capability to a "Knowledge Agent" — the
 * backend has no dedicated knowledge-graph *engine*, just this query
 * endpoint, so it's modelled as an agent the same way the other
 * read-only engines are); `supervisor` is not a backend call at all —
 * it represents the client-side synthesis step itself (see
 * `AISupervisorSnapshot`), included as a peer row so the panel that
 * lists agents can show the Supervisor's own aggregate health alongside
 * what it supervises.
 */
export type AIAgentId = 'compound_risk' | 'emergency_response' | 'recommendation' | 'compliance' | 'knowledge_graph' | 'supervisor';

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
export type AIAgentStatus = 'idle' | 'running' | 'completed' | 'waiting' | 'failed';

/** Overall AI Supervisor processing state, derived from the loading/error state of all agents. */
export type AISupervisorProcessingState = 'idle' | 'processing' | 'action_required' | 'error';

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
  /**
   * Wall-clock duration of the agent's most recent fetch, in
   * milliseconds — measured client-side with `performance.now()`
   * around the actual request (see `useAgentExecutionTiming`). This is
   * a real measured network+processing duration, not a backend-reported
   * figure (no backend endpoint reports its own execution time yet).
   * `null` before the agent's first fetch resolves, or for `supervisor`
   * (a client-side synthesis step with no network call of its own).
   */
  executionTimeMs: number | null;
}

/**
 * The kind of decision each agent produces — one per supervised
 * engine's output shape (not a generic label; it names what the
 * engine actually computed).
 */
export type AIDecisionType = 'risk_assessment' | 'emergency_action' | 'recommendation' | 'compliance_violation';

/**
 * Whether a decision has actually been carried out. Derived from what
 * each engine does, not a real execution/approval workflow (none
 * exists in the backend yet):
 *  - `emergency_action`      → 'executed'  (the engine dispatches it directly)
 *  - `compliance_violation`  → 'flagged'   (raised for follow-up, not auto-resolved)
 *  - `recommendation`        → 'pending'   (advisory only, awaits an operator)
 *  - `risk_assessment`       → 'logged'    (recorded, no action taken by itself)
 */
export type AIDecisionExecutionStatus = 'executed' | 'pending' | 'flagged' | 'logged';

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

// ─── Engine synthesis inputs ────────────────────────────────────────
//
// Shared by every service module that builds an `AIAgentSummary` or
// `AISupervisorSnapshot` (`agentBuilder.ts`, `decisionBuilder.ts`,
// `aiSupervisor.service.ts`) — kept here, not in any one service file,
// so those modules can depend on this shape without depending on each
// other.

/** One engine's polling state, in the shape every `useXEngine` hook already exposes. */
export interface AgentEngineInput<T> {
  data: T;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

/** The four real engine results `aiSupervisorService.buildSnapshot` reduces into one `AISupervisorSnapshot`. */
export interface BuildSnapshotInput {
  compoundRisk: AgentEngineInput<CompoundRiskAssessment | null>;
  emergencyResponse: AgentEngineInput<EmergencyActionItem[]>;
  recommendation: AgentEngineInput<Recommendation[]>;
  compliance: AgentEngineInput<ComplianceStatusSnapshot | null>;
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
interface ExplainableEvidenceItem {
  label: string;
  value: string;
}

/** One hazard the decision identified. */
interface DetectedHazard {
  label: string;
  severity: SeverityLevel;
  description: string;
}

/** One safety rule or framework the decision was checked against. */
interface ApplicableSafetyRule {
  code: string;
  description: string;
}

/** One action recommended (not necessarily executed) as a result of the decision. */
interface RecommendedAction {
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

// ─── AI Reasoning Panel ─────────────────────────────────────────────
//
// A dedicated, API-shaped contract for `AIReasoningPanel` — a general
// "why did the AI conclude this" display, distinct from
// `ExplainableAIData` above (which is specific to one AI Supervisor
// decision's evidence/hazards/rules/actions breakdown). This panel is
// meant to render whatever a reasoning/explainability endpoint returns
// for any AI-surfaced conclusion — a Copilot answer, a risk assessment,
// an incident analysis — so its shape favours generality: a narrative
// summary, confidence, risk level, the rules that fired, the evidence
// sources behind them, retrieved regulatory text, and the knowledge
// graph entities referenced. The panel never generates any of this
// itself — every field is rendered as received.

/** One rule the reasoning engine reports as triggered. */
interface ReasoningTriggeredRule {
  id: string;
  /** Rule code/name, e.g. "critical_sensors" or "OISD-STD-118-4.2". */
  name: string;
  detail: string;
}

/** One underlying data point the reasoning cites as evidence, e.g. a sensor reading or a risk score. */
interface ReasoningEvidenceSource {
  id: string;
  /** What kind of evidence this is, e.g. "Sensor Reading", "Risk Score", "Incident Report". */
  type: string;
  label: string;
  value: string;
  /** ISO timestamp the evidence was recorded/observed, if the backend reports one. */
  timestamp: string | null;
}

/** One regulatory document chunk retrieved to support the reasoning (mirrors RAG retrieval output). */
interface ReasoningRetrievedRegulation {
  id: string;
  /** Source document name, e.g. "OISD-STD-118". */
  source: string;
  title: string | null;
  excerpt: string;
  /** Cosine similarity, 0-1 — higher is more relevant. `null` when the backend doesn't rank results. */
  similarity: number | null;
}

/** One knowledge graph node the reasoning references. */
interface ReasoningGraphReference {
  id: string;
  /** Node label, e.g. "Worker", "Zone", "Sensor", "Permit", "Incident". */
  label: string;
  /** Human-readable name/identifier for the node, e.g. a worker's name or a zone code. */
  name: string;
  /** How this node relates to the reasoning, e.g. "LOCATED_IN Zone-A". `null` when the backend doesn't report a relationship. */
  relationship: string | null;
}

/** Full payload for `AIReasoningPanel` — mirrors what a real reasoning/explainability API would return. */
export interface AIReasoningData {
  /** Backend-authored narrative explaining the conclusion. Never generated client-side. */
  summary: string;
  /** 0-100 confidence the backend reports for this conclusion. */
  confidence: number;
  riskLevel: SeverityLevel;
  triggeredRules: ReasoningTriggeredRule[];
  evidenceSources: ReasoningEvidenceSource[];
  retrievedRegulations: ReasoningRetrievedRegulation[];
  knowledgeGraphReferences: ReasoningGraphReference[];
}
