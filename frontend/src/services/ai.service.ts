/**
 * aiService
 *
 * API-layer service for the AI Copilot endpoints, all mounted by
 * `ai_copilot_router` in `backend/server.py` under `/ai`:
 * `POST /ai/chat`, `POST /ai/query`, `POST /ai/explain` (not used by
 * this service — see note below), `POST /ai/recommend`.
 *
 * `explain()` below actually calls `POST /ai/explainability`, a
 * distinct, real endpoint that returns a structured explainability
 * report (see `backend/src/routes/ai_copilot.py`), not the
 * natural-language-answer `POST /ai/explain` endpoint. Naming kept as
 * `explain`/`AIExplainRequest`/`AIExplainabilityResponse` on the
 * frontend to match this feature's actual use (explainability
 * reporting), not a 1:1 mirror of the backend's route name.
 *
 * Uses `createService('/ai')`'s shared `post` escape hatch rather than
 * hand-rolling `apiClient.post` per endpoint — same pattern as
 * `alertsService`/`complianceService`, so this feature doesn't
 * duplicate the base service's URL-joining/typing logic.
 */

import { createService } from './base.service';
import type { RequestOptions } from '@/api/types';
import type { AIReasoningData } from '@/features/ai-supervisor/types';

const base = createService('/ai');

export interface AgentTraceResponse {
  agent: string;
  ok: boolean;
  summary: string;
  citations: string[];
  error: string | null;
}

export interface ReasoningMetadataResponse {
  route: string[];
  agent_traces: AgentTraceResponse[];
  model: string | null;
  warnings: string[];
}

// ─── POST /ai/chat ──────────────────────────────────────────────────

export interface AIChatMessage {
  role: string;
  content: string;
}

export interface AIChatRequest {
  message: string;
  history?: AIChatMessage[];
  params?: Record<string, unknown>;
}

export interface AIChatResponse {
  reply: string;
  explanation: string;
  reasoning: ReasoningMetadataResponse;
}

// ─── POST /ai/query ─────────────────────────────────────────────────

export interface AIQueryRequest {
  text: string;
  params?: Record<string, unknown>;
}

export interface AIQueryResponse {
  request_text: string;
  summary: string;
  agent_data: Record<string, unknown>;
  reasoning: ReasoningMetadataResponse;
}

// ─── POST /ai/explain ───────────────────────────────────────────────

export interface AIExplainRequest {
  text: string;
  params?: Record<string, unknown>;
}

export interface AIExplainabilityResponse {
  request_text: string;
  report: AIReasoningData;
  reasoning: ReasoningMetadataResponse;
}

// ─── POST /ai/recommend ─────────────────────────────────────────────

export interface AIRecommendRequest {
  text: string;
  params?: Record<string, unknown>;
}

export interface RecommendationResponse {
  source_agent: string;
  text: string;
  zone: string | null;
}

export interface AIRecommendResponse {
  request_text: string;
  recommendations: RecommendationResponse[];
  reasoning: ReasoningMetadataResponse;
}

export const aiService = {
  /** POST /ai/chat — conversational reply. */
  chat: (request: AIChatRequest, options?: RequestOptions) =>
    base.post<AIChatResponse, AIChatRequest>('chat', request, options),

  /** POST /ai/query — one-shot question/answer, no conversation state. */
  query: (request: AIQueryRequest, options?: RequestOptions) =>
    base.post<AIQueryResponse, AIQueryRequest>('query', request, options),

  /** POST /ai/explainability — full reasoning breakdown for a decision. */
  explain: (request: AIExplainRequest, options?: RequestOptions) =>
    base.post<AIExplainabilityResponse, AIExplainRequest>('explainability', request, options),

  /** POST /ai/recommend — AI-surfaced recommendations. */
  recommend: (request: AIRecommendRequest = { text: '' }, options?: RequestOptions) =>
    base.post<AIRecommendResponse, AIRecommendRequest>('recommend', request, options),
};
