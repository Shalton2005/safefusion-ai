// ─── Computer Vision domain types ─────────────────────────────────
//
// Mirrors the shape the backend's YOLO/OpenCV detection pipeline
// (`backend/src/ai/detection/`) is expected to expose once built —
// see `services/detection.service.ts` for the exact endpoints these
// types back. No detection logic is computed client-side; every value
// here is either a real backend field or a client-side presentational
// bucket of one (documented inline where that applies).

import type { SeverityLevel } from '@/constants';

// ─── Camera ────────────────────────────────────────────────────────

export type CameraStatus = 'online' | 'offline' | 'degraded';

export interface Camera {
  id: string;
  name: string;
  zone: string;
  location: string;
  status: CameraStatus;
  /** Live/preview frame URL, or `null` when the feed is unavailable. */
  streamUrl: string | null;
  /** ISO timestamp of the camera's last received frame. */
  lastFrameAt: string | null;
  resolution: string;
  fps: number | null;
  /** Detections (hazards + PPE violations) attributed to this camera in the current window. */
  detectionCount: number;
  /** Bucketed risk level for this camera's zone, or `null` when no risk assessment has been recorded yet. */
  riskLevel: SeverityLevel | null;
}

// ─── PPE Compliance ────────────────────────────────────────────────

export const PPE_ITEM_TYPES = ['helmet', 'vest', 'gloves', 'goggles', 'mask', 'boots'] as const;
export type PpeItemType = (typeof PPE_ITEM_TYPES)[number];

export interface PpeItemStatus {
  item: PpeItemType;
  detected: boolean;
  confidence: number;
}

/** A single worker's PPE detection result for one camera frame. */
export interface PpeDetection {
  id: string;
  cameraId: string;
  zone: string;
  /** `null` when the detected worker could not be matched to a known worker record. */
  workerId: string | null;
  items: PpeItemStatus[];
  compliant: boolean;
  detectedAt: string;
}

/** Compliance rate for a single PPE item type, backend-computed. */
export interface PpeItemComplianceRate {
  item: PpeItemType;
  /** Compliance rate 0-100 for this item across all detected workers. */
  complianceRate: number;
}

/** Aggregated PPE compliance summary, plant-wide or scoped to a zone. */
export interface PpeComplianceSummary {
  zone: string | null;
  compliantCount: number;
  nonCompliantCount: number;
  /** Overall compliance rate 0-100, backend-computed. */
  complianceRate: number;
  /** Per-item compliance rate, one entry per `PpeItemType` the backend tracks. */
  itemComplianceRates: PpeItemComplianceRate[];
  /** Per-item detection miss counts, most-violated first. */
  topViolations: Array<{ item: PpeItemType; count: number }>;
}

/** A single currently-open PPE violation, backing the "Current Violations" list. */
export interface PpeViolation {
  id: string;
  cameraId: string;
  zone: string;
  /** `null` when the detected worker could not be matched to a known worker record. */
  workerId: string | null;
  /** PPE items the worker was missing at detection time. */
  missingItems: PpeItemType[];
  detectedAt: string;
}

// ─── Hazard Detection ──────────────────────────────────────────────

export const HAZARD_TYPES = [
  'fire',
  'smoke',
  'spill',
  'unauthorized_zone_entry',
  'restricted_area_intrusion',
  'equipment_malfunction',
  'fall_detected',
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export interface HazardDetection {
  id: string;
  cameraId: string;
  zone: string;
  type: HazardType;
  severity: SeverityLevel;
  confidence: number;
  description: string;
  /** Bounding box of the detection in the source frame, normalised 0-1. */
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  detectedAt: string;
  /** Snapshot frame captured at detection time, or `null` if unavailable. */
  snapshotUrl: string | null;
}

// ─── Detection Summary ─────────────────────────────────────────────

/** Plant-wide (or zone-scoped) rollup of detection activity, backing the Detection Summary section. */
export interface DetectionSummary {
  zone: string | null;
  activeCameras: number;
  totalCameras: number;
  detectionsLast24h: number;
  openHazards: number;
  ppeComplianceRate: number;
  /** ISO timestamp of the most recent detection across all cameras. */
  lastDetectionAt: string | null;
}

// ─── Detection Overlay ──────────────────────────────────────────────

/**
 * Object classes the backend's YOLO model is expected to detect and
 * localise with a bounding box. Distinct from `PpeItemType`/`HazardType`
 * (which classify compliance state / hazard category for the summary
 * sections) — this is the raw per-frame object class the overlay draws,
 * one box per detected instance.
 */
export const DETECTION_OBJECT_TYPES = [
  'helmet',
  'safety_vest',
  'person',
  'fire',
  'smoke',
  'vehicle',
  'restricted_area_entry',
] as const;
export type DetectionObjectType = (typeof DETECTION_OBJECT_TYPES)[number];

/** Bounding box in normalised 0-1 frame coordinates, exactly as returned by the backend — never computed client-side. */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single localised detection instance for one frame, as returned by the backend's detection pipeline. */
export interface BoundingBoxDetection {
  id: string;
  type: DetectionObjectType;
  /** Model confidence, 0-100. */
  confidence: number;
  boundingBox: BoundingBox;
}

// ─── AI Timeline ───────────────────────────────────────────────────

export type CvTimelineEventType = 'hazard_detected' | 'ppe_violation' | 'zone_intrusion' | 'camera_status_changed';

/** A single chronological CV event — same shape/intent as `SafetyTimelineEvent`, scoped to computer-vision sources. */
export interface CvTimelineEvent {
  id: string;
  type: CvTimelineEventType;
  label: string;
  description: string;
  severity: SeverityLevel;
  timestamp: string;
  zone: string;
  cameraId: string | null;
}
