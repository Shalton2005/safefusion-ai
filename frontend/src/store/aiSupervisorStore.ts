/**
 * useAISupervisorStore
 *
 * Global Zustand store for the AI Supervisor feature. Unlike the
 * feature's own `useAISupervisor` hook (which composes the dashboard's
 * already-polling engine hooks so it never issues a duplicate network
 * call), this store is self-sufficient: its `fetch*` actions call the
 * four real engine services directly and reduce their results via the
 * same `aiSupervisorService.buildSnapshot` used everywhere else in this
 * feature — so both code paths agree on what a "decision" or "agent
 * status" means, and neither fabricates data the backend didn't report.
 *
 * Use this store where a global, imperative fetch (outside of a page
 * that already runs `useAISupervisor`) is more appropriate than a hook —
 * e.g. a route that only needs the decision timeline, or a background
 * refresh triggered from outside the AI Supervisor page tree.
 *
 * Usage
 * ─────
 * const { supervisorStatus, activeAgents, loading, error } = useAISupervisorStore();
 * useEffect(() => { useAISupervisorStore.getState().fetchStatus(); }, []);
 *
 * // Explain a decision from the timeline:
 * useAISupervisorStore.getState().fetchExplanation(decision.id);
 */

import { create } from 'zustand';
import { compoundRiskService } from '@/services/compoundRisk.service';
import { emergencyResponseService } from '@/services/emergencyResponse.service';
import { recommendationService } from '@/services/recommendation.service';
import { complianceService } from '@/services/compliance.service';
import { ApiError } from '@/api/errors';
import { aiSupervisorService } from '@/features/ai-supervisor/services/aiSupervisor.service';
import type {
  AIAgentSummary,
  AIDecision,
  AISupervisorProcessingState,
  ExplainableAIData,
} from '@/features/ai-supervisor/types';

/** Runs all four engine calls in parallel and reduces them into a snapshot — the single fetch path every `fetch*` action below shares. */
async function fetchSnapshot() {
  const [compoundRisk, emergencyActions, recommendationResult, compliance] = await Promise.all([
    compoundRiskService.getAssessment(),
    emergencyResponseService.getActions(),
    recommendationService.getRecommendations(),
    complianceService.getStatus(),
  ]);
  const now = new Date();

  return aiSupervisorService.buildSnapshot({
    compoundRisk: { data: compoundRisk, loading: false, error: null, lastUpdated: now },
    emergencyResponse: {
      data: emergencyResponseService.toActionItems(emergencyActions),
      loading: false,
      error: null,
      lastUpdated: now,
    },
    recommendation: { data: recommendationResult.recommendations, loading: false, error: null, lastUpdated: now },
    compliance: { data: compliance, loading: false, error: null, lastUpdated: now },
  });
}

interface AISupervisorStoreState {
  /** Overall AI Supervisor processing state, or `null` before the first fetch. */
  supervisorStatus: AISupervisorProcessingState | null;
  /** Every supervised agent, in the shape `WorkflowGraph` renders. */
  workflow: AIAgentSummary[];
  /** Subset of `workflow` currently healthy and reporting (`completed`/`waiting`). */
  activeAgents: AIAgentSummary[];
  /** Chronological decisions across all agents, most recent first. */
  decisionTimeline: AIDecision[];
  /** Overall confidence, 0-100 — see `AISupervisorSnapshot.overallConfidence`. */
  confidence: number;
  /** The decision currently selected for explanation, or `null`. */
  selectedDecision: AIDecision | null;
  /** Explainable-AI breakdown for `selectedDecision`, or `null` until `fetchExplanation` runs. */
  explanation: ExplainableAIData | null;
  loading: boolean;
  error: string | null;

  /** Fetches all four engines and populates `supervisorStatus`, `confidence`, and `decisionTimeline`. */
  fetchStatus: () => Promise<void>;
  /** Fetches all four engines and populates `workflow`/`activeAgents` (the `WorkflowGraph` data). */
  fetchWorkflow: () => Promise<void>;
  /** Fetches all four engines and populates `decisionTimeline`. */
  fetchTimeline: () => Promise<void>;
  /** Selects a decision (by id, looked up in the current `decisionTimeline`) and derives its `ExplainableAIData`. No network call — mirrors `aiSupervisorService.toExplainableAIData`. */
  fetchExplanation: (decisionId: string) => void;
  /** Resets the store back to its initial state. */
  reset: () => void;
}

const initialState = {
  supervisorStatus: null as AISupervisorProcessingState | null,
  workflow: [] as AIAgentSummary[],
  activeAgents: [] as AIAgentSummary[],
  decisionTimeline: [] as AIDecision[],
  confidence: 0,
  selectedDecision: null as AIDecision | null,
  explanation: null as ExplainableAIData | null,
  loading: false,
  error: null as string | null,
};

export const useAISupervisorStore = create<AISupervisorStoreState>()((set, get) => ({
  ...initialState,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSnapshot();
      set({
        supervisorStatus: snapshot.processingState,
        confidence: snapshot.overallConfidence,
        decisionTimeline: snapshot.decisions,
        loading: false,
      });
    } catch (err) {
      set({ error: ApiError.from(err).toUserMessage(), loading: false });
    }
  },

  fetchWorkflow: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSnapshot();
      set({
        workflow: snapshot.agents,
        activeAgents: snapshot.agents.filter((agent) => agent.status === 'completed' || agent.status === 'waiting'),
        loading: false,
      });
    } catch (err) {
      set({ error: ApiError.from(err).toUserMessage(), loading: false });
    }
  },

  fetchTimeline: async () => {
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSnapshot();
      set({ decisionTimeline: snapshot.decisions, loading: false });
    } catch (err) {
      set({ error: ApiError.from(err).toUserMessage(), loading: false });
    }
  },

  fetchExplanation: (decisionId) => {
    const decision = get().decisionTimeline.find((d) => d.id === decisionId) ?? null;
    set({
      selectedDecision: decision,
      explanation: decision ? aiSupervisorService.toExplainableAIData(decision) : null,
    });
  },

  reset: () => set({ ...initialState }),
}));
