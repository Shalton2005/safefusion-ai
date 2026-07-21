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

/** One scripted or real bounding-box detection — shape shared by `cv_events` and `/demo/video-detections`. */
export interface DemoDetection {
  label: string;
  confidence: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DemoScenarioStatus {
  running: boolean;
  scenario: string | null;
  elapsed_seconds: number;
  total_seconds: number;
  current_row_index: number;
  current_row_label: string | null;
  zone: string | null;
  video_url: string | null;
  /** Scripted CV overlay boxes for the current row (helmet/vest/smoke/fire/restricted-zone) — see `backend/demo_scenarios/*.json`'s `cv_events`. Hand-authored, not live model inference. */
  cv_events: DemoDetection[];
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

  /** POST /demo/start — load and begin replaying the named scenario, optionally looping indefinitely. */
  start: async (scenario: string, loop = false, options?: RequestOptions): Promise<DemoScenarioStatus> => {
    const { data } = await base.post<DemoScenarioStatus>('start', { scenario, loop }, options);
    return data;
  },

  /** POST /demo/stop — cancel whatever scenario is currently playing. */
  stop: async (options?: RequestOptions): Promise<DemoScenarioStatus> => {
    const { data } = await base.post<DemoScenarioStatus>('stop', undefined, options);
    return data;
  },
};
