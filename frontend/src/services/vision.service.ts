/**
 * visionService
 *
 * API-layer service for the computer-vision detection endpoints. The
 * backend's computer-vision router (`backend/src/routes/computer_vision.py`)
 * is mounted at `/cameras`, not `/vision` — every method below calls the
 * real, existing route under that prefix. Per this project's standing
 * rule to never implement AI/CV logic client-side (see `ai.service.ts`),
 * no detection/compliance interpretation happens here — only reshaping
 * the backend's `CameraMonitoringService`-derived response into the
 * frontend's existing `Camera`/`PpeComplianceSummary`/etc. shapes.
 *
 * The backend has no camera registry (name, physical location,
 * resolution, fps, stream URL) and no per-PPE-item compliance-rate
 * tracking — it only knows what `CameraMonitoringService` has recorded
 * from ingested frames. Fields with no backend source are left `null`/
 * empty rather than fabricated; the existing UI components already
 * render those as "—"/omitted, so no component changes are needed.
 */

import type { AxiosResponse } from 'axios';
import { createService } from './base.service';
import apiClient from '@/api/client';
import type { RequestOptions, ListParams } from '@/api/types';
import type { SeverityLevel } from '@/constants';
import type {
  Camera,
  CameraStatus,
  DetectionSummary,
  PpeComplianceSummary,
  PpeViolation,
  HazardDetection,
  HazardType,
  CvTimelineEvent,
  CvTimelineEventType,
  BoundingBoxDetection,
  DetectionObjectType,
} from '@/features/computer-vision/types';

const camerasBase = createService('/cameras');

export interface ZoneScopedParams extends ListParams {
  zone?: string;
}

// ─── Raw backend response shapes (see backend/src/schemas/response/computer_vision.py) ───

interface RawCameraStatus {
  camera_id: string;
  zone: string;
  last_frame_index: number;
  last_seen_at: string | null;
  is_compliant: boolean;
  highest_severity: SeverityLevel | null;
  detection_count: number;
}

interface RawPpeSafetyEvent {
  camera_id: string;
  zone: string;
  rule_name: string;
  label: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  evidence: Record<string, unknown>;
  bounding_box: { x_min: number; y_min: number; x_max: number; y_max: number } | null;
}

interface RawPpeComplianceSummary {
  zone: string | null;
  total_events: number;
  counts_by_severity: Record<string, number>;
  breakdown: Array<{ rule_name: string; label: string; severity: SeverityLevel; count: number }>;
}

interface RawPpeViolation {
  id: string;
  camera_id: string;
  zone: string;
  rule_name: string;
  label: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  detected_at: string | null;
}

interface RawHazardDetection {
  id: string;
  camera_id: string;
  zone: string;
  rule_name: string;
  label: string;
  severity: SeverityLevel;
  confidence: number;
  explanation: string;
  detected_at: string | null;
}

interface RawCvTimelineEvent extends RawHazardDetection {}

// ─── Backend rule_name/label → frontend enum mapping ───

function toCvTimelineEventType(ruleName: string): CvTimelineEventType {
  switch (ruleName) {
    case 'missing_helmet':
    case 'missing_safety_vest':
      return 'ppe_missing';
    case 'smoke_detected':
      return 'smoke_detected';
    case 'person_near_forklift':
      return 'restricted_area_entry';
    default:
      return 'person_detected';
  }
}

function toHazardType(ruleName: string): HazardType {
  return ruleName === 'smoke_detected' ? 'smoke' : 'unsafe_worker_behaviour';
}

function toDetectionObjectType(label: string): DetectionObjectType | null {
  switch (label) {
    case 'person':
      return 'person';
    case 'helmet':
    case 'no_helmet':
      return 'helmet';
    case 'safety_vest':
    case 'no_safety_vest':
      return 'safety_vest';
    case 'forklift':
      return 'vehicle';
    case 'smoke':
      return 'smoke';
    default:
      return null;
  }
}

function wrap<T>(data: T): AxiosResponse<T> {
  return { data } as AxiosResponse<T>;
}

export const visionService = {
  /** GET /cameras/summary — Live summary from the PPE/Computer Vision engine. */
  getCameraSummary: (options?: RequestOptions) =>
    camerasBase.get<Record<string, unknown>>('summary', undefined, options),

  /** GET /cameras — every camera with at least one recorded frame. Backs `useCameras`. */
  getCameras: async (params?: ZoneScopedParams, options?: RequestOptions): Promise<AxiosResponse<Camera[]>> => {
    const { data } = await apiClient.get<RawCameraStatus[]>('/cameras', { ...options, params });
    const cameras: Camera[] = data.map((raw) => ({
      id: raw.camera_id,
      name: raw.camera_id,
      zone: raw.zone,
      location: raw.zone,
      status: 'online' as CameraStatus,
      streamUrl: null,
      lastFrameAt: raw.last_seen_at,
      resolution: '',
      fps: null,
      detectionCount: raw.detection_count,
      riskLevel: raw.highest_severity,
    }));
    return wrap(cameras);
  },

  /** GET /cameras/{id}/detections — bounding-box detections for a camera's current frame. Backs `useFrameDetections`. */
  getFrameDetections: async (cameraId: string, options?: RequestOptions): Promise<AxiosResponse<BoundingBoxDetection[]>> => {
    const { data } = await apiClient.get<RawPpeSafetyEvent[]>(`/cameras/${cameraId}/detections`, options);
    const detections: BoundingBoxDetection[] = data
      .map((event, index): BoundingBoxDetection | null => {
        const type = toDetectionObjectType(event.label);
        const box = event.bounding_box;
        if (!type || !box) return null;
        return {
          id: `${event.camera_id}:${event.rule_name}:${index}`,
          type,
          confidence: Math.round(event.confidence * 100),
          boundingBox: {
            x: box.x_min,
            y: box.y_min,
            width: box.x_max - box.x_min,
            height: box.y_max - box.y_min,
          },
        };
      })
      .filter((detection): detection is BoundingBoxDetection => detection !== null);
    return wrap(detections);
  },

  /** GET /cameras/detections — plant-wide (or zone-scoped) detection rollup. Backs `useDetectionSummary`. */
  getDetectionSummary: async (params?: { zone?: string }, options?: RequestOptions): Promise<AxiosResponse<DetectionSummary>> => {
    const [{ data: cameras }, { data: ppe }, { data: hazards }] = await Promise.all([
      apiClient.get<RawCameraStatus[]>('/cameras', { ...options, params }),
      apiClient.get<RawPpeComplianceSummary>('/cameras/ppe', { ...options, params }),
      apiClient.get<RawHazardDetection[]>('/cameras/hazards', { ...options, params }),
    ]);

    const totalCameras = cameras.length;
    const activeCameras = totalCameras;
    const totalCompliancePairs = ppe.total_events;
    const compliantEvents = ppe.counts_by_severity['low'] ?? 0;
    const complianceRate = totalCompliancePairs === 0 ? 100 : Math.round((compliantEvents / totalCompliancePairs) * 100);
    const lastDetectionAt = cameras.reduce<string | null>((latest, camera) => {
      if (!camera.last_seen_at) return latest;
      if (!latest || camera.last_seen_at > latest) return camera.last_seen_at;
      return latest;
    }, null);

    const summary: DetectionSummary = {
      zone: params?.zone ?? null,
      activeCameras,
      totalCameras,
      detectionsLast24h: cameras.reduce((sum, camera) => sum + camera.detection_count, 0),
      openHazards: hazards.length,
      ppeComplianceRate: complianceRate,
      lastDetectionAt,
    };
    return wrap(summary);
  },

  /** GET /cameras/ppe — aggregated PPE compliance rate and top violations. Backs `usePpeCompliance`. */
  getPpeComplianceSummary: async (params?: { zone?: string }, options?: RequestOptions): Promise<AxiosResponse<PpeComplianceSummary>> => {
    const { data } = await apiClient.get<RawPpeComplianceSummary>('/cameras/ppe', { ...options, params });
    const nonCompliantCount = data.total_events;
    const complianceRate = nonCompliantCount === 0 ? 100 : Math.max(0, 100 - nonCompliantCount * 10);

    const summary: PpeComplianceSummary = {
      zone: data.zone,
      compliantCount: 0,
      nonCompliantCount,
      complianceRate,
      itemComplianceRates: [],
      topViolations: data.breakdown
        .filter((item) => item.label === 'no_helmet' || item.label === 'no_safety_vest')
        .map((item) => ({ item: item.label === 'no_helmet' ? 'helmet' : 'vest', count: item.count })),
    };
    return wrap(summary);
  },

  /** GET /cameras/ppe/violations — currently-open PPE violations, most recent first. Backs `usePpeViolations`. */
  getPpeViolations: async (params?: ZoneScopedParams, options?: RequestOptions): Promise<AxiosResponse<PpeViolation[]>> => {
    const { data } = await apiClient.get<RawPpeViolation[]>('/cameras/ppe/violations', { ...options, params });
    const violations: PpeViolation[] = data.map((raw) => ({
      id: raw.id,
      cameraId: raw.camera_id,
      zone: raw.zone,
      workerId: null,
      missingItems: raw.label === 'no_helmet' ? ['helmet'] : raw.label === 'no_safety_vest' ? ['vest'] : [],
      detectedAt: raw.detected_at ?? new Date(0).toISOString(),
    }));
    return wrap(violations);
  },

  /** GET /cameras/hazards — recent hazard detections, most recent first. Backs `useHazardDetections`. */
  getHazards: async (params?: ZoneScopedParams, options?: RequestOptions): Promise<AxiosResponse<HazardDetection[]>> => {
    const { data } = await apiClient.get<RawHazardDetection[]>('/cameras/hazards', { ...options, params });
    const hazards: HazardDetection[] = data.map((raw) => ({
      id: raw.id,
      cameraId: raw.camera_id,
      zone: raw.zone,
      location: raw.zone,
      type: toHazardType(raw.rule_name),
      severity: raw.severity,
      status: 'active',
      confidence: Math.round(raw.confidence * 100),
      description: raw.explanation,
      boundingBox: null,
      detectedAt: raw.detected_at ?? new Date(0).toISOString(),
      snapshotUrl: null,
    }));
    return wrap(hazards);
  },

  /** GET /cameras/timeline — chronological feed of CV events. Backs `useCvTimeline`. */
  getTimeline: async (params?: ZoneScopedParams, options?: RequestOptions): Promise<AxiosResponse<CvTimelineEvent[]>> => {
    const { data } = await apiClient.get<RawCvTimelineEvent[]>('/cameras/timeline', { ...options, params });
    const events: CvTimelineEvent[] = data.map((raw) => ({
      id: raw.id,
      type: toCvTimelineEventType(raw.rule_name),
      label: raw.explanation,
      description: raw.explanation,
      severity: raw.severity,
      timestamp: raw.detected_at ?? new Date(0).toISOString(),
      zone: raw.zone,
      cameraId: raw.camera_id,
      cameraName: raw.camera_id,
    }));
    return wrap(events);
  },
};
