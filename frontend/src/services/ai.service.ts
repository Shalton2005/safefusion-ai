/**
 * aiService
 *
 * API-layer service for the AI endpoints: `POST /ai/chat`,
 * `POST /ai/query`, `POST /ai/explain`, `POST /ai/recommend`.
 *
 * None of these routes exist on the backend yet — confirmed against
 * `backend/server.py` (every mounted router is imported there; there is
 * no `ai` router) and `backend/src/routes/rag.py` (the only real
 * AI-adjacent endpoint, `/rag/query`, is retrieval-only and explicitly
 * documents that answer generation "is a deliberately separate,
 * not-yet-built step"). Per this project's standing rule to never
 * implement AI logic client-side, every method below is a real,
 * unmodified `POST` to its target path — nothing is faked, mocked, or
 * short-circuited. Calling any of them today resolves to a real 404,
 * which flows through the normal `ApiError` handling like any other
 * failed request; once the backend adds these routes, no caller needs
 * to change.
 *
 * Uses `createService('/ai')`'s shared `post` escape hatch rather than
 * hand-rolling `apiClient.post` per endpoint — same pattern as
 * `alertsService`/`complianceService`, so this feature doesn't
 * duplicate the base service's URL-joining/typing logic.
 */

import { createService } from './base.service';
import type { RequestOptions } from '@/api/types';
import type { AIReasoningData } from '@/features/ai-supervisor/types';
import type { AIRecommendation } from '@/components/recommendations';

const base = createService('/ai');

// ─── POST /ai/chat ──────────────────────────────────────────────────

export interface AIChatRequest {
  message: string;
  /** Existing conversation id, when continuing a thread. Omitted for a new conversation. */
  conversationId?: string;
}

export interface AIChatResponse {
  conversationId: string;
  /** The assistant's generated reply. */
  reply: string;
  /** Supporting sources the reply is grounded in, if the backend reports any. */
  sources?: Array<{ id: string; source: string; title: string | null; excerpt: string; similarity: number | null }>;
}

// ─── POST /ai/query ─────────────────────────────────────────────────

export interface AIQueryRequest {
  question: string;
  limit?: number;
}

export interface AIQueryResponse {
  question: string;
  results: Array<{ id: string; source: string; title: string | null; excerpt: string; similarity: number | null }>;
}

// ─── POST /ai/explain ───────────────────────────────────────────────

export interface AIExplainRequest {
  /** Id of the decision/conclusion to explain (e.g. an `AIDecision.id`). */
  decisionId: string;
}

// ─── POST /ai/recommend ─────────────────────────────────────────────

export interface AIRecommendRequest {
  /** Zone or area to scope recommendations to. Omitted for plant-wide recommendations. */
  zone?: string;
}

export interface AIRecommendResponse {
  recommendations: AIRecommendation[];
}

export const aiService = {
  /** POST /ai/chat — conversational reply, optionally continuing `conversationId`. */
  chat: (request: AIChatRequest, options?: RequestOptions) =>
    base.post<AIChatResponse, AIChatRequest>('chat', request, options),

  /** POST /ai/query — one-shot question/answer, no conversation state. */
  query: (request: AIQueryRequest, options?: RequestOptions) =>
    base.post<AIQueryResponse, AIQueryRequest>('query', request, options),

  /** POST /ai/explain — full reasoning breakdown for a decision (see `AIReasoningPanel`). */
  explain: (request: AIExplainRequest, options?: RequestOptions) =>
    base.post<AIReasoningData, AIExplainRequest>('explain', request, options),

  /** POST /ai/recommend — AI-surfaced recommendations, optionally scoped to a zone (see `AIRecommendationCardGrid`). */
  recommend: (request: AIRecommendRequest = {}, options?: RequestOptions) =>
    base.post<AIRecommendResponse, AIRecommendRequest>('recommend', request, options),
};
