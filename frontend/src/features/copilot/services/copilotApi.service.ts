/**
 * copilotApiService
 *
 * Thin feature-level adapter over `aiService` (`src/services/ai.service.ts`)
 * for the AI Safety Copilot chat feature — translates between this
 * feature's `CopilotSourceChunk`/`CopilotMessage` shapes and `aiService`'s
 * generic `AIChatRequest`/`AIChatResponse`, and derives a client-side
 * conversation id when starting a new thread (the backend response
 * carries its own `conversationId` once the endpoint exists; today's
 * 404 means every call falls through the normal `ApiError` path and
 * this feature's fallback id is never actually used for a real thread).
 *
 * Does not call `apiClient` directly and does not duplicate `aiService`'s
 * request logic — every network call goes through `aiService.chat`, so
 * there is exactly one place in the app that knows how to reach
 * `POST /ai/chat`.
 */

import { aiService } from '@/services';
import type { RequestOptions } from '@/api/types';
import type { CopilotSourceChunk } from '../types';

export interface CopilotAskRequest {
  question: string;
  history?: { role: string; content: string }[];
}

export interface CopilotAskResponse {
  conversationId: string;
  reply: string;
  sources: CopilotSourceChunk[];
}

export const copilotApiService = {
  /** POST /ai/chat via `aiService.chat` — conversational reply, grounded in whatever sources the backend cites. */
  ask: async (request: CopilotAskRequest, options?: RequestOptions): Promise<CopilotAskResponse> => {
    const { data } = await aiService.chat(
      { message: request.question, history: request.history },
      options,
    );

    return {
      conversationId: 'temp',
      reply: data.reply,
      sources: data.reasoning.agent_traces.flatMap(t => t.citations.map((c, i) => ({
        id: `source-${i}`,
        source: c,
        title: null,
        excerpt: '',
        similarity: 1
      }))),
    };
  },
};
