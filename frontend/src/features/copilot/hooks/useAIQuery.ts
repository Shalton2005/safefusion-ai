/**
 * useAIQuery
 *
 * One-shot question/answer via `POST /ai/query` (through `aiService.query`)
 * — distinct from `useCopilotStore`'s multi-turn, conversation-persisted
 * `POST /ai/chat`. Use this for a single lookup that doesn't need a saved
 * thread (e.g. a quick "ask" box outside the full chat UI).
 *
 * That endpoint doesn't exist on the backend yet, so calling `ask` today
 * resolves to a real `ApiError` — surfaced through `error`, same as any
 * other failed request. No answer is generated here.
 *
 * @example
 * const { result, loading, error, ask } = useAIQuery();
 * ask('What is the confined space entry procedure?');
 */

import { useCallback, useRef, useState } from 'react';
import { aiService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { AIQueryResponse } from '@/services/ai.service';

export interface UseAIQueryResult {
  result: AIQueryResponse | null;
  loading: boolean;
  error: string | null;
  ask: (question: string) => void;
  reset: () => void;
}

export function useAIQuery(): UseAIQueryResult {
  const [result, setResult] = useState<AIQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback((question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const { controller, signal } = createRequestController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    aiService
      .query({ question: trimmed }, { signal })
      .then(({ data }) => {
        setResult(data);
        setLoading(false);
      })
      .catch((err) => {
        const apiError = ApiError.from(err);
        if (apiError.isCancelledError) return;
        setResult(null);
        setError(apiError.toUserMessage());
        setLoading(false);
      });
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setResult(null);
    setLoading(false);
    setError(null);
  }, []);

  return { result, loading, error, ask, reset };
}
