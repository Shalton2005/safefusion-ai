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

/** Aggregated PPE compliance summary, plant-wide or scoped to a zone. */
export interface PpeComplianceSummary {
  zone: string | null;
  compliantCount: number;
  nonCompliantCount: number;
  /** Compliance rate 0-100, backend-computed. */
  complianceRate: number;
  /** Per-item detection miss counts, most-violated first. */
  topViolations: Array<{ item: PpeItemType; count: number }>;
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
