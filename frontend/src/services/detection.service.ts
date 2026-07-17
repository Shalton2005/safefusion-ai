/**
 * detectionService
 *
 * API-layer service for the computer-vision detection endpoints:
 * `GET /detection/cameras`, `GET /detection/summary`,
 * `GET /detection/ppe`, `GET /detection/hazards`,
 * `GET /detection/timeline`.
 *
 * None of these routes exist on the backend yet — `backend/src/ai/detection/`
 * is currently an empty stub package ("Computer-vision pipelines for
 * real-time hazard detection, PPE compliance checking, and zone-intrusion
 * alerting will be implemented here") and `backend/server.py` mounts no
 * `detection` router. Per this project's standing rule to never implement
 * AI/CV logic client-side (see `ai.service.ts`), every method below is a
 * real, unmodified request to its target path — nothing is faked, mocked,
 * or short-circuited. Calling any of them today resolves to a real 404,
 * which flows through the normal `ApiError` handling like any other failed
 * request; once the backend adds these routes, no caller needs to change.
 *
 * Uses `createService('/detection')`'s shared `get` escape hatch rather
 * than hand-rolling `apiClient.get` per endpoint — same pattern as
 * `aiService`/`sensorsService`.
 */

import { createService } from './base.service';
import type { RequestOptions, ListParams } from '@/api/types';
import type {
  Camera,
  DetectionSummary,
  PpeDetection,
  PpeComplianceSummary,
  HazardDetection,
  CvTimelineEvent,
} from '@/features/computer-vision/types';

const base = createService('/detection');

export interface ZoneScopedParams extends ListParams {
  zone?: string;
}

export const detectionService = {
  /** GET /detection/cameras — every registered camera and its live status. */
  getCameras: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<Camera[]>('cameras', params, options),

  /** GET /detection/summary — plant-wide (or zone-scoped) detection rollup for the summary section. */
  getSummary: (params?: { zone?: string }, options?: RequestOptions) =>
    base.get<DetectionSummary>('summary', params, options),

  /** GET /detection/ppe — recent per-worker PPE detections. */
  getPpeDetections: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<PpeDetection[]>('ppe', params, options),

  /** GET /detection/ppe/summary — aggregated PPE compliance rate and top violations. */
  getPpeComplianceSummary: (params?: { zone?: string }, options?: RequestOptions) =>
    base.get<PpeComplianceSummary>('ppe/summary', params, options),

  /** GET /detection/hazards — recent hazard detections, most recent first. */
  getHazards: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<HazardDetection[]>('hazards', params, options),

  /** GET /detection/timeline — chronological feed of CV events for the AI Timeline section. */
  getTimeline: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<CvTimelineEvent[]>('timeline', params, options),
};
