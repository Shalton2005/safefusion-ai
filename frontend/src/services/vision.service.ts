/**
 * visionService
 *
 * API-layer service for the computer-vision detection endpoints:
 * `GET /vision/cameras`, `GET /vision/cameras/{id}/detections`,
 * `GET /vision/detections`, `GET /vision/ppe`, `GET /vision/ppe/violations`,
 * `GET /vision/hazards`, `GET /vision/timeline`.
 *
 * None of these routes exist on the backend yet — `backend/src/ai/detection/`
 * is currently an empty stub package ("Computer-vision pipelines for
 * real-time hazard detection, PPE compliance checking, and zone-intrusion
 * alerting will be implemented here") and `backend/server.py` mounts no
 * `vision`/`detection` router. Per this project's standing rule to never
 * implement AI/CV logic client-side (see `ai.service.ts`), every method
 * below is a real, unmodified request to its target path — nothing is
 * faked, mocked, or short-circuited. Calling any of them today resolves
 * to a real 404, which flows through the normal `ApiError` handling like
 * any other failed request; once the backend adds these routes, no
 * caller needs to change.
 *
 * Uses `createService('/vision')`'s shared `get` escape hatch rather
 * than hand-rolling `apiClient.get` per endpoint — same pattern as
 * `aiService`/`sensorsService`. One method per distinct backend
 * resource, each called from exactly one hook (see `hooks/index.ts`),
 * so no two parts of the CCTV Monitoring page ever request the same
 * endpoint independently.
 */

import { createService } from './base.service';
import type { RequestOptions, ListParams } from '@/api/types';
import type {
  Camera,
  DetectionSummary,
  PpeComplianceSummary,
  PpeViolation,
  HazardDetection,
  CvTimelineEvent,
  BoundingBoxDetection,
} from '@/features/computer-vision/types';

const base = createService('/vision');

export interface ZoneScopedParams extends ListParams {
  zone?: string;
}

export const visionService = {
  /** GET /vision/cameras — every registered camera and its live status. Backs `useCameras`. */
  getCameras: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<Camera[]>('cameras', params, options),

  /** GET /vision/cameras/{id}/detections — bounding-box detections for a camera's current frame. Backs `useFrameDetections`. */
  getFrameDetections: (cameraId: string, options?: RequestOptions) =>
    base.get<BoundingBoxDetection[]>(`cameras/${cameraId}/detections`, undefined, options),

  /** GET /vision/detections — plant-wide (or zone-scoped) detection rollup. Backs `useDetectionSummary`. */
  getDetectionSummary: (params?: { zone?: string }, options?: RequestOptions) =>
    base.get<DetectionSummary>('detections', params, options),

  /** GET /vision/ppe — aggregated PPE compliance rate, per-item rates, and top violations. Backs `usePpeCompliance`. */
  getPpeComplianceSummary: (params?: { zone?: string }, options?: RequestOptions) =>
    base.get<PpeComplianceSummary>('ppe', params, options),

  /** GET /vision/ppe/violations — currently-open PPE violations, most recent first. Backs `usePpeViolations`. */
  getPpeViolations: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<PpeViolation[]>('ppe/violations', params, options),

  /** GET /vision/hazards — recent hazard detections, most recent first. Backs `useHazardDetections`. */
  getHazards: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<HazardDetection[]>('hazards', params, options),

  /** GET /vision/timeline — chronological feed of CV events. Backs `useCvTimeline`. */
  getTimeline: (params?: ZoneScopedParams, options?: RequestOptions) =>
    base.get<CvTimelineEvent[]>('timeline', params, options),
};
