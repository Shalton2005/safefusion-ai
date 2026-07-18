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
