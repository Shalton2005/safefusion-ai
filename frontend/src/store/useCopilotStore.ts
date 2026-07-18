/**
 * useCopilotStore
 *
 * Single source of truth for the AI Safety Copilot workspace: the
 * active conversation thread, its messages, the evidence currently
 * selected for inspection, AI-surfaced recommendations, and the
 * reasoning breakdown for a selected decision. Same shape as
 * `aiSupervisorStore` — request-id staleness guards around every
 * network action, `ApiError.toUserMessage()` for error text, and a
 * `reset()` back to initial state.
 *
 * Every network action goes through the real, already-built service
 * layer (`copilotApiService.ask` → `aiService.chat`; `aiService.explain`;
 * `aiService.recommend`) — this store adds no new request logic of its
 * own, only orchestrates calls that already exist. None of the backing
 * `/ai/*` routes exist yet (see `src/services/ai.service.ts`'s doc
 * comment), so these actions resolve to a real `ApiError` today,
 * handled the same way as any other failed request.
 *
 * `conversation` is the active thread's metadata (id/title/timestamps)
 * — `messages` is tracked as its own sibling array per this store's
 * field contract, not nested inside `conversation` the way the on-disk
 * `CopilotConversation` (used for the persisted history list) shapes it.
 * `syncActiveIntoHistory()` reconciles the two after every mutation.
 *
 * Persisted to localStorage (conversation history + `id`/`title` only —
 * `selectedEvidence`/`recommendations`/`reasoning` are always re-fetched,
 * never persisted stale).
 *
 * @example
 * const { conversation, messages, sendMessage } = useCopilotStore();
 * sendMessage('What is the confined space entry procedure?');
 *
 * // Imperative, outside a component:
 * useCopilotStore.getState().fetchReasoning(decisionId);
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ApiError } from '@/api/errors';
import { aiService } from '@/services';
import { LS_COPILOT_KEY } from '@/constants';
import { copilotApiService } from '@/features/copilot/services/copilotApi.service';
import { createConversation, createMessage, deriveConversationTitle } from '@/features/copilot/utils/conversation';
import type { CopilotConversation, CopilotMessage } from '@/features/copilot/types';
import type { AIReasoningData } from '@/features/ai-supervisor/types';
import type { AIRecommendation } from '@/components/recommendations';
import type { EvidenceViewerData } from '@/components/evidence';

/** Active thread's metadata — `messages` lives in its own top-level field, see module doc comment. */
export type CopilotConversationMeta = Pick<CopilotConversation, 'id' | 'title' | 'createdAt' | 'updatedAt'>;

/**
 * Guards against a slower, earlier action's response overwriting state
 * after a faster, later action of the same kind already resolved —
 * same pattern as `aiSupervisorStore`'s `latestRequestId`.
 */
let latestRequestId = 0;

interface CopilotStoreState {
  /** Every saved conversation, most recently updated first — powers the history sidebar. */
  conversationHistory: CopilotConversation[];
  /** Active thread's metadata, or `null` when no conversation is selected/started. */
  conversation: CopilotConversationMeta | null;
  /** Active thread's messages. */
  messages: CopilotMessage[];
  /** Evidence currently selected for inspection (e.g. from an `EvidenceViewer` group) — pure UI selection, never fetched. */
  selectedEvidence: EvidenceViewerData | null;
  /** Most recent AI-surfaced recommendations, from `POST /ai/recommend`. */
  recommendations: AIRecommendation[];
  /** Reasoning breakdown for the most recently explained decision, from `POST /ai/explain`. */
  reasoning: AIReasoningData | null;
  /**
   * True while `sendMessage` is in flight. Deliberately independent from
   * `recommendationsLoading`/`reasoningLoading` — these three actions can
   * run concurrently (e.g. a page fetching recommendations while the user
   * is mid-chat), so they must not share one flag or one action's fetch
   * would silently block/reset another's.
   */
  loading: boolean;
  /** Message from `sendMessage`'s most recently failed call, or `null` when the last one succeeded. */
  error: string | null;
  /** True while `fetchRecommendations` is in flight. */
  recommendationsLoading: boolean;
  /** Message from `fetchRecommendations`'s most recently failed call, or `null` when the last one succeeded. */
  recommendationsError: string | null;
  /** True while `fetchReasoning` is in flight. */
  reasoningLoading: boolean;
  /** Message from `fetchReasoning`'s most recently failed call, or `null` when the last one succeeded. */
  reasoningError: string | null;

  /** Sends a user message in the active conversation (starting a new one if none is active) via `POST /ai/chat`. */
  sendMessage: (content: string) => Promise<void>;
  /** Starts a new, empty conversation and makes it active. */
  startNewConversation: () => void;
  /** Makes a previously saved conversation active. */
  selectConversation: (id: string) => void;
  /** Removes a conversation from history; clears the active thread if it was the one deleted. */
  deleteConversation: (id: string) => void;
  /** Sets (or clears, with `null`) the evidence currently selected for inspection. */
  selectEvidence: (evidence: EvidenceViewerData | null) => void;
  /** Fetches AI-surfaced recommendations via `POST /ai/recommend`, optionally scoped to a zone. */
  fetchRecommendations: (zone?: string) => Promise<void>;
  /** Fetches the reasoning breakdown for a decision via `POST /ai/explain`. */
  fetchReasoning: (decisionId: string) => Promise<void>;
  /** Resets the store back to its initial state (conversation history included). */
  reset: () => void;
}

const initialState = {
  conversationHistory: [] as CopilotConversation[],
  conversation: null as CopilotConversationMeta | null,
  messages: [] as CopilotMessage[],
  selectedEvidence: null as EvidenceViewerData | null,
  recommendations: [] as AIRecommendation[],
  reasoning: null as AIReasoningData | null,
  loading: false,
  error: null as string | null,
  recommendationsLoading: false,
  recommendationsError: null as string | null,
  reasoningLoading: false,
  reasoningError: null as string | null,
};

/** Merges the active `conversation`/`messages` back into `conversationHistory` (upsert by id), title re-derived from the messages. */
function syncActiveIntoHistory(
  history: CopilotConversation[],
  conversation: CopilotConversationMeta,
  messages: CopilotMessage[],
): CopilotConversation[] {
  const merged: CopilotConversation = {
    ...conversation,
    messages,
    title: deriveConversationTitle(messages),
    updatedAt: new Date().toISOString(),
  };
  const withoutCurrent = history.filter((c) => c.id !== conversation.id);
  return [merged, ...withoutCurrent];
}

export const useCopilotStore = create<CopilotStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startNewConversation: () => {
        const conversation = createConversation();
        set({
          conversation: { id: conversation.id, title: conversation.title, createdAt: conversation.createdAt, updatedAt: conversation.updatedAt },
          messages: [],
          error: null,
        });
      },

      selectConversation: (id) => {
        const saved = get().conversationHistory.find((c) => c.id === id);
        if (!saved) return;
        set({
          conversation: { id: saved.id, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt },
          messages: saved.messages,
          error: null,
        });
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversationHistory: state.conversationHistory.filter((c) => c.id !== id),
          ...(state.conversation?.id === id ? { conversation: null, messages: [] } : {}),
        }));
      },

      sendMessage: async (content) => {
        const trimmed = content.trim();
        if (!trimmed || get().loading) return;

        const existing = get().conversation;
        const activeConversation: CopilotConversationMeta = existing ?? (() => {
          const created = createConversation();
          return { id: created.id, title: created.title, createdAt: created.createdAt, updatedAt: created.updatedAt };
        })();
        if (!existing) set({ conversation: activeConversation });

        const userMessage = createMessage('user', trimmed);
        const pendingReply = createMessage('assistant', '');
        const messagesWithPending = [...get().messages, userMessage, pendingReply];

        set((state) => ({
          messages: messagesWithPending,
          conversationHistory: syncActiveIntoHistory(state.conversationHistory, activeConversation, messagesWithPending),
          loading: true,
          error: null,
        }));

        const requestId = ++latestRequestId;

        const history = get().messages
          .filter(m => m.status === 'complete' || m.status === 'error')
          .map((m) => ({ role: m.role, content: m.content }));

        try {
          const response = await copilotApiService.ask({ question: trimmed, history });
          if (requestId !== latestRequestId) return;

          const messages = get().messages.map((m) =>
            m.id === pendingReply.id
              ? { ...m, content: response.reply, status: 'complete' as const, sources: response.sources }
              : m,
          );
          set((state) => ({
            messages,
            conversationHistory: syncActiveIntoHistory(state.conversationHistory, activeConversation, messages),
            loading: false,
          }));
        } catch (err) {
          if (requestId !== latestRequestId) return;
          const message = ApiError.from(err).toUserMessage();

          const messages = get().messages.map((m) =>
            m.id === pendingReply.id ? { ...m, content: message, status: 'error' as const } : m,
          );
          set((state) => ({
            messages,
            conversationHistory: syncActiveIntoHistory(state.conversationHistory, activeConversation, messages),
            loading: false,
            error: message,
          }));
        }
      },

      selectEvidence: (evidence) => set({ selectedEvidence: evidence }),

      fetchRecommendations: async (zone) => {
        const requestId = ++latestRequestId;
        set({ recommendationsLoading: true, recommendationsError: null });
        try {
          const { data } = await aiService.recommend({ text: 'recommend', params: { zone } });
          if (requestId !== latestRequestId) return;
          const mapped: AIRecommendation[] = data.recommendations.map((r, i) => ({
            id: `rec-${i}`,
            title: 'Recommendation',
            description: r.text,
            priority: 'medium',
            affectedArea: r.zone ?? 'Plant-wide',
            confidence: 100,
            actionType: r.source_agent
          }));
          set({ recommendations: mapped, recommendationsLoading: false });
        } catch (err) {
          if (requestId !== latestRequestId) return;
          set({ recommendations: [], recommendationsError: ApiError.from(err).toUserMessage(), recommendationsLoading: false });
        }
      },

      fetchReasoning: async (decisionId) => {
        const requestId = ++latestRequestId;
        set({ reasoningLoading: true, reasoningError: null });
        try {
          const { data } = await aiService.explain({ text: 'explain', params: { decisionId } });
          if (requestId !== latestRequestId) return;
          const reasoningData: AIReasoningData = data.report;
          set({ reasoning: reasoningData, reasoningLoading: false });
        } catch (err) {
          if (requestId !== latestRequestId) return;
          set({ reasoning: null, reasoningError: ApiError.from(err).toUserMessage(), reasoningLoading: false });
        }
      },

      reset: () => set({ ...initialState }),
    }),
    {
      name: LS_COPILOT_KEY,
      partialize: (state) => ({
        conversationHistory: state.conversationHistory,
        conversation: state.conversation,
        messages: state.messages,
      }),
    },
  ),
);
