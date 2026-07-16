/**
 * copilotApiService
 *
 * API-layer service for the AI Safety Copilot chat feature.
 *
 * There is no `/copilot/chat` (or similar answer-generation) endpoint on
 * the backend yet — confirmed against `backend/src/routes/rag.py`, whose
 * module docstring is explicit that `/rag/query` is retrieval-only and
 * "answer generation is a deliberately separate, not-yet-built step".
 *
 * Per this task's scope ("Do not implement AI logic"), `ask()` below does
 * not generate an answer either. It calls the real, already-live
 * `POST /rag/query` endpoint and returns the retrieved supporting chunks
 * as-is — no text is synthesised client-side. `toPlaceholderReply` turns
 * that into a placeholder assistant message that surfaces the retrieved
 * sources so the chat UI has something real to render, clearly framed as
 * a stand-in for the future generation step (see its own doc comment).
 *
 * Swapping in a real "ask the copilot" endpoint later is a one-line
 * change to `ask()`'s body — the return type and every caller stay the same.
 */

import apiClient from '@/api/client';
import type { RequestOptions } from '@/api/types';
import type { CopilotSourceChunk } from '../types';

/** Request body for `POST /rag/query`. */
export interface CopilotAskRequest {
  question: string;
  /** Maximum number of supporting chunks to retrieve. @default 5 */
  limit?: number;
}

/** Response shape for `POST /rag/query` (`RagQueryResponse`, unwrapped). */
export interface CopilotAskResponse {
  question: string;
  sources: CopilotSourceChunk[];
}

interface RawChunk {
  id: string;
  content: string;
  source: string;
  title: string | null;
  similarity: number | null;
}

interface RawRagQueryResponse {
  question: string;
  context_chunks: RawChunk[];
}

const EXCERPT_MAX_LENGTH = 240;

function toExcerpt(content: string): string {
  const trimmed = content.trim();
  return trimmed.length > EXCERPT_MAX_LENGTH
    ? `${trimmed.slice(0, EXCERPT_MAX_LENGTH).trimEnd()}…`
    : trimmed;
}

export const copilotApiService = {
  /** POST /rag/query — retrieval only, no generated answer. */
  ask: async (request: CopilotAskRequest, options?: RequestOptions): Promise<CopilotAskResponse> => {
    const { data } = await apiClient.post<RawRagQueryResponse>(
      '/rag/query',
      { question: request.question, limit: request.limit ?? 5 },
      options,
    );

    return {
      question: data.question,
      sources: data.context_chunks.map((chunk) => ({
        id: chunk.id,
        source: chunk.source,
        title: chunk.title,
        excerpt: toExcerpt(chunk.content),
        similarity: chunk.similarity ?? 0,
      })),
    };
  },
};

/**
 * Builds a placeholder assistant reply from retrieved sources.
 *
 * This is UI scaffolding, not AI logic: no text is generated or
 * summarised here, only formatted from data the backend already
 * returned. Replace this with the real generated `answer` once an
 * answer-generation endpoint exists.
 */
export function toPlaceholderReply(response: CopilotAskResponse): string {
  if (response.sources.length === 0) {
    return "I couldn't find any supporting documents for that question yet. Answer generation isn't connected — this preview only surfaces retrieved sources.";
  }

  const list = response.sources
    .map((s, i) => `${i + 1}. **${s.title ?? s.source}** — ${s.excerpt}`)
    .join('\n\n');

  return `Answer generation isn't connected yet, so here are the most relevant retrieved sources for "${response.question}":\n\n${list}`;
}
