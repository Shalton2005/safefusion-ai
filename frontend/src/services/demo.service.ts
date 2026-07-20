/**
 * demoService
 *
 * API-layer service for the Demo Scenario Playback Engine
 * (`backend/src/routes/demo.py`, mounted at `/demo`). Starts/stops/reads
 * the status of a scripted scenario replay — this is the only place the
 * frontend touches the demo engine; every other dashboard panel keeps
 * polling its own real endpoint and simply reflects whatever the engine
 * has written to the database.
 */

import { createService } from './base.service';
import type { RequestOptions } from '@/api/types';

const base = createService<unknown>('/demo');

export interface DemoScenarioStatus {
  running: boolean;
  scenario: string | null;
  elapsed_seconds: number;
  total_seconds: number;
  current_row_index: number;
  current_row_label: string | null;
  video_url: string | null;
}

export const demoService = {
  /** GET /demo/scenarios — every scenario timeline available to play. */
  listScenarios: async (options?: RequestOptions): Promise<string[]> => {
    const { data } = await base.get<{ scenarios: string[] }>('scenarios', undefined, options);
    return data.scenarios;
  },

  /** GET /demo/status — current playback progress, polled by `useDemoPlayback`. */
  getStatus: async (options?: RequestOptions): Promise<DemoScenarioStatus> => {
    const { data } = await base.get<DemoScenarioStatus>('status', undefined, options);
    return data;
  },

  /** POST /demo/start — load and begin replaying the named scenario. */
  start: async (scenario: string, options?: RequestOptions): Promise<DemoScenarioStatus> => {
    const { data } = await base.post<DemoScenarioStatus>('start', { scenario }, options);
    return data;
  },

  /** POST /demo/stop — cancel whatever scenario is currently playing. */
  stop: async (options?: RequestOptions): Promise<DemoScenarioStatus> => {
    const { data } = await base.post<DemoScenarioStatus>('stop', undefined, options);
    return data;
  },
};
