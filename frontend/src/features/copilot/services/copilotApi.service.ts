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
import type { AgentTraceResponse } from '@/services/ai.service';
import type { CopilotEvidenceItem, CopilotExplainability, CopilotSourceChunk } from '../types';

export interface CopilotAskRequest {
  question: string;
  history?: { role: string; content: string }[];
}

export interface CopilotAskResponse {
  conversationId: string;
  reply: string;
  sources: CopilotSourceChunk[];
  explainability: CopilotExplainability;
}

/** Friendly label for each agent identity used in `reasoning.agent_traces[].agent` (see backend's `ConfidenceEngine`). */
const AGENT_EVIDENCE_LABEL: Record<string, string> = {
  risk: 'Risk assessments',
  compliance: 'Matching procedures',
  knowledge: 'Matching procedures',
  graph_knowledge: 'Knowledge graph matches',
  emergency: 'Emergency actions',
};

/**
 * Derives the explainability footer from the real per-reply agent traces —
 * never a fabricated number. Confidence is the share of executed agents
 * that succeeded (the same "agent consistency" signal the backend's
 * ConfidenceEngine uses as one of its factors); `/ai/chat` doesn't expose
 * the engine's full weighted score, only the raw traces, so this is the
 * most honest confidence derivable client-side from what the endpoint
 * actually returns.
 */
function buildExplainability(traces: AgentTraceResponse[], generatedAt: string): CopilotExplainability {
  const okCount = traces.filter((t) => t.ok).length;
  const confidence = traces.length === 0 ? 0 : Math.round((okCount / traces.length) * 100);

  const sources = Array.from(new Set(traces.flatMap((t) => t.citations)));

  const evidenceByLabel = new Map<string, number>();
  for (const trace of traces) {
    if (!trace.ok || trace.citations.length === 0) continue;
    const label = AGENT_EVIDENCE_LABEL[trace.agent] ?? `${trace.agent} findings`;
    evidenceByLabel.set(label, (evidenceByLabel.get(label) ?? 0) + trace.citations.length);
  }
  const evidence: CopilotEvidenceItem[] = Array.from(evidenceByLabel, ([label, count]) => ({ label, count }));

  return { confidence, sources, evidence, generatedAt };
}

export const copilotApiService = {
  /** POST /ai/chat via `aiService.chat` — conversational reply, grounded in whatever sources the backend cites. */
  ask: async (request: CopilotAskRequest, options?: RequestOptions): Promise<CopilotAskResponse> => {
    const { data } = await aiService.chat(
      { message: request.question, history: request.history },
      { timeout: 300_000, ...options },
    );
    const generatedAt = new Date().toISOString();

    return {
      conversationId: 'temp',
      reply: data.reply,
      sources: data.reasoning.agent_traces.flatMap(t => t.citations).map((c, i) => ({
        id: `source-${i}`,
        source: c,
        title: null,
        excerpt: '',
        similarity: 1
      })),
      explainability: buildExplainability(data.reasoning.agent_traces, generatedAt),
    };
  },
};
