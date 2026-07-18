/**
 * useAIExplain
 *
 * Fetches the full reasoning breakdown for a decision via
 * `POST /ai/explain` (through `aiService.explain`) for `AIReasoningPanel`.
 * That endpoint doesn't exist on the backend yet, so this resolves to a
 * real `ApiError` today — surfaced through the normal `error` state,
 * same as any other failed request. No reasoning is generated here or
 * anywhere in this hook.
 *
 * Fetches on every `decisionId` change; clears state when `decisionId`
 * is `null` (nothing selected).
 *
 * @example
 * const { data, loading, error } = useAIExplain(selectedDecision?.id ?? null);
 */

import { useEffect, useRef, useState } from 'react';
import { aiService } from '@/services';
import { ApiError } from '@/api/errors';
import { createRequestController } from '@/api/client';
import type { AIReasoningData } from '../types';

export interface UseAIExplainResult {
  data: AIReasoningData | null;
  loading: boolean;
  error: string | null;
}

export function useAIExplain(decisionId: string | null): UseAIExplainResult {
  const [data, setData] = useState<AIReasoningData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!decisionId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    const { controller, signal } = createRequestController();

    setLoading(true);
    setError(null);

    aiService
      .explain({ text: 'explain', params: { decisionId } }, { signal })
      .then(({ data: response }) => {
        if (requestId !== requestIdRef.current) return;
        setData(response.report);
        setLoading(false);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        const apiError = ApiError.from(err);
        if (apiError.isCancelledError) return;
        setData(null);
        setError(apiError.toUserMessage());
        setLoading(false);
      });

    return () => controller.abort();
  }, [decisionId]);

  return { data, loading, error };
}
