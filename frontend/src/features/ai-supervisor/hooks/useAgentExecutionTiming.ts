/**
 * useAgentExecutionTiming
 *
 * Measures how long an engine hook's most recent fetch actually took,
 * in milliseconds. No backend endpoint reports its own execution time
 * today, so this is a real, client-measured wall-clock duration
 * (`performance.now()` around the fetch's `loading` transition) rather
 * than a fabricated number — see `AIAgentSummary.executionTimeMs`'s doc
 * comment for the same caveat.
 *
 * Works with any hook whose shape includes `loading`/`lastUpdated`
 * (every engine hook built on `usePolling`, plus `useKnowledgeGraph`),
 * without modifying those hooks — it watches their exposed state rather
 * than instrumenting the fetch itself.
 *
 * @example
 * const compoundRisk = useCompoundRiskEngine();
 * const executionTimeMs = useAgentExecutionTiming(compoundRisk.loading, compoundRisk.lastUpdated);
 */

import { useEffect, useRef, useState } from 'react';

export function useAgentExecutionTiming(loading: boolean, lastUpdated: Date | null): number | null {
  const [executionTimeMs, setExecutionTimeMs] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (loading && !wasLoadingRef.current) {
      startedAtRef.current = performance.now();
    } else if (!loading && wasLoadingRef.current && startedAtRef.current !== null) {
      setExecutionTimeMs(Math.round(performance.now() - startedAtRef.current));
      startedAtRef.current = null;
    }
    wasLoadingRef.current = loading;
  }, [loading, lastUpdated]);

  return executionTimeMs;
}
