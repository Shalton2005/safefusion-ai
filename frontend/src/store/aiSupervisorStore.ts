/**
 * useAISupervisorStore
 *
 * Global Zustand store for the AI Supervisor feature. Unlike the
 * feature's own `useAISupervisor` hook (which composes the dashboard's
 * already-polling engine hooks so it never issues a duplicate network
 * call), this store is self-sufficient: its `fetch*` actions call
 * `fetchSupervisorSnapshot` (shared with `aiSupervisorApiService`),
 * which calls the four real engine services directly and reduces their
 * results via the same `aiSupervisorService.buildSnapshot` used
 * everywhere else in this feature — so every code path agrees on what
 * a "decision" or "agent status" means, and none fabricates data the
 * backend didn't report.
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
import { ApiError } from '@/api/errors';
import { aiSupervisorService } from '@/features/ai-supervisor/services/aiSupervisor.service';
import { fetchSupervisorSnapshot } from '@/features/ai-supervisor/services/fetchSupervisorSnapshot';
import type {
  AIAgentSummary,
  AIDecision,
  AISupervisorProcessingState,
  ExplainableAIData,
} from '@/features/ai-supervisor/types';

/**
 * Guards against a slower, earlier `fetch*` call overwriting state with
 * stale data after a faster, later call already resolved — e.g. a
 * component calling both `fetchStatus()` and `fetchWorkflow()` in the
 * same effect. Each `fetch*` action captures the current token before
 * awaiting, and only applies its `set()` if the token is still current
 * (no newer `fetch*` call started in the meantime) or clears `loading`
 * only when it owns the latest request.
 */
let latestRequestId = 0;

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
    const requestId = ++latestRequestId;
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSupervisorSnapshot();
      if (requestId !== latestRequestId) return;
      set({
        supervisorStatus: snapshot.processingState,
        confidence: snapshot.overallConfidence,
        decisionTimeline: snapshot.decisions,
        loading: false,
      });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ error: ApiError.from(err).toUserMessage(), loading: false });
    }
  },

  fetchWorkflow: async () => {
    const requestId = ++latestRequestId;
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSupervisorSnapshot();
      if (requestId !== latestRequestId) return;
      set({
        workflow: snapshot.agents,
        activeAgents: snapshot.agents.filter((agent) => agent.status === 'completed' || agent.status === 'waiting'),
        loading: false,
      });
    } catch (err) {
      if (requestId !== latestRequestId) return;
      set({ error: ApiError.from(err).toUserMessage(), loading: false });
    }
  },

  fetchTimeline: async () => {
    const requestId = ++latestRequestId;
    set({ loading: true, error: null });
    try {
      const snapshot = await fetchSupervisorSnapshot();
      if (requestId !== latestRequestId) return;
      set({ decisionTimeline: snapshot.decisions, loading: false });
    } catch (err) {
      if (requestId !== latestRequestId) return;
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
