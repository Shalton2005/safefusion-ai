/**
 * Presentational config for `CameraStatus` — badge variant and label,
 * shared by `CameraTile` and `CameraDetails`. Single source of truth,
 * reuse instead of redefining per component (same convention as
 * `utils/detectionOverlay.ts`).
 */

import type { CameraStatus } from '../types';

/** Badge colour variant for each camera status. */
export const CAMERA_STATUS_BADGE_VARIANT: Record<CameraStatus, 'success' | 'default' | 'warning'> = {
  online:   'success',
  offline:  'default',
  degraded: 'warning',
};

/** Human-readable label for each camera status. */
export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  online:   'Live',
  offline:  'Offline',
  degraded: 'Degraded',
};
