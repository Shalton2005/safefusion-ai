/**
 * usePolling
 *
 * Runs an async fetcher immediately on mount, then again on a fixed
 * interval, cancelling the in-flight request (via AbortSignal) and
 * clearing the timer on unmount or when `intervalMs`/`fetcher` change —
 * so no fetch ever resolves into a removed component and no timer or
 * request ever leaks past the component's lifetime.
 *
 * The fetcher owns its own success/error state (same shape as a
 * one-shot `useEffect` fetch); this hook only owns the "when" —
 * making it reusable across any panel that needs periodic refresh.
 *
 * @example
 * const { lastUpdated, refresh } = usePolling(fetchSensors, DASHBOARD_REFRESH_INTERVAL);
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { createRequestController } from '@/api/client';
import { useAppStore } from '@/store';

export interface UsePollingResult {
  /** Timestamp of the most recently completed fetch, or `null` before the first one resolves. */
  lastUpdated: Date | null;
  /** Manually triggers an immediate fetch, resetting the interval timer. */
  refresh: () => void;
}

export function usePolling(
  fetcher: (signal?: AbortSignal) => Promise<void>,
  intervalMs: number,
): UsePollingResult {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runTick = useCallback((signal?: AbortSignal) => {
    fetcherRef.current(signal).then(() => {
      if (!signal?.aborted) {
        setLastUpdated(new Date());
        // Every polling panel funnels through here, so this is the single
        // choke point for the app-wide "last synced" indicator in
        // useAppStore — no per-panel wiring needed.
        useAppStore.getState().recordSync();
      }
    });
  }, []);

  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let { controller, signal } = createRequestController();
    let id: ReturnType<typeof setInterval>;

    const tick = () => {
      controller.abort();
      ({ controller, signal } = createRequestController());
      runTick(signal);
    };

    const startInterval = () => {
      id = setInterval(tick, intervalMs);
    };

    runTick(signal);
    startInterval();

    refreshRef.current = () => {
      clearInterval(id);
      tick();
      startInterval();
    };

    return () => {
      clearInterval(id);
      controller.abort();
    };
  }, [intervalMs, runTick]);

  const refresh = useCallback(() => refreshRef.current(), []);

  return { lastUpdated, refresh };
}
