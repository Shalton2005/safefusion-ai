/**
 * useDemoPlayback
 *
 * Polls the Demo Scenario Playback Engine's status
 * (`GET /demo/status`, see `backend/src/routes/demo.py`) once per second
 * — matching `DASHBOARD_REFRESH_INTERVAL` — and exposes it alongside
 * `start`/`stop` actions. This is the only hook that talks to the demo
 * engine; every other dashboard panel reflects its effect indirectly by
 * polling its own real endpoint.
 */

import { useCallback, useState } from 'react';
import { demoService } from '@/services';
import type { DemoScenarioStatus } from '@/services/demo.service';
import { usePolling } from '@/hooks/usePolling';
import { DASHBOARD_REFRESH_INTERVAL } from '@/constants';
import { ApiError } from '@/api/errors';

export interface UseDemoPlaybackResult {
  status: DemoScenarioStatus | null;
  error: string | null;
  starting: boolean;
  start: (scenario: string, loop?: boolean) => Promise<void>;
  stop: () => Promise<void>;
}

const IDLE_STATUS: DemoScenarioStatus = {
  running: false,
  scenario: null,
  elapsed_seconds: 0,
  total_seconds: 0,
  current_row_index: -1,
  current_row_label: null,
  video_url: null,
  cv_events: [],
};

export function useDemoPlayback(): UseDemoPlaybackResult {
  const [status, setStatus] = useState<DemoScenarioStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await demoService.getStatus({ signal });
      setStatus(data);
      setError(null);
    } catch (err) {
      const apiError = ApiError.from(err);
      if (!apiError.isCancelledError) setError(apiError.toUserMessage());
    }
  }, []);

  usePolling(fetchStatus, DASHBOARD_REFRESH_INTERVAL);

  const start = useCallback(async (scenario: string, loop = false) => {
    setStarting(true);
    try {
      const data = await demoService.start(scenario, loop);
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(ApiError.from(err).toUserMessage());
    } finally {
      setStarting(false);
    }
  }, []);

  const stop = useCallback(async () => {
    try {
      const data = await demoService.stop();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(ApiError.from(err).toUserMessage());
    }
  }, []);

  return { status: status ?? IDLE_STATUS, error, starting, start, stop };
}
