/**
 * DetectionOverlay
 *
 * Reusable, purely presentational overlay that draws bounding boxes for
 * backend-returned detections on top of a camera frame or snapshot.
 * Performs no image analysis of any kind — every box position, size,
 * class, and confidence value is rendered exactly as received from the
 * backend's YOLO/OpenCV pipeline (`backend/src/ai/detection/`, not yet
 * built). This component is the single reusable renderer for that
 * output; nothing here infers or computes a detection.
 *
 * Boxes are positioned with percentage-based CSS from the backend's
 * normalised 0-1 `boundingBox` coordinates, so the overlay scales with
 * its parent regardless of the frame's native resolution — parent must
 * be `position: relative` (or similarly positioned) and size the frame
 * itself; this component only absolutely positions on top of it.
 *
 * @example
 * <div className="relative aspect-video">
 *   <img src={camera.streamUrl} className="w-full h-full object-cover" />
 *   <DetectionOverlay detections={detections} />
 * </div>
 */

import { cn } from '@/lib/cn';
import { DETECTION_TYPE_COLOR, DETECTION_TYPE_LABEL } from '../utils/detectionOverlay';
import type { BoundingBoxDetection } from '../types';

export interface DetectionOverlayProps {
  /** Detections for the currently displayed frame — one box rendered per entry. */
  detections: BoundingBoxDetection[];
  /** Shows the object type + confidence label above each box. @default true */
  showLabels?: boolean;
  className?: string;
}

export function DetectionOverlay({ detections, showLabels = true, className }: DetectionOverlayProps) {
  if (detections.length === 0) return null;

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      aria-hidden="true"
    >
      {detections.map((detection) => {
        const { x, y, width, height } = detection.boundingBox;
        const color = DETECTION_TYPE_COLOR[detection.type];

        return (
          <div
            key={detection.id}
            className="absolute border-2 rounded-sm"
            style={{
              left:        `${x * 100}%`,
              top:         `${y * 100}%`,
              width:       `${width * 100}%`,
              height:      `${height * 100}%`,
              borderColor: color,
            }}
          >
            {showLabels && (
              <span
                className="absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 text-2xs font-medium leading-none rounded-t-sm text-white"
                style={{ backgroundColor: color }}
              >
                {DETECTION_TYPE_LABEL[detection.type]} · {Math.round(detection.confidence)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
