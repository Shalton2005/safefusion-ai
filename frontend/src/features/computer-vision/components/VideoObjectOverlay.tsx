/**
 * VideoObjectOverlay
 *
 * Draws bounding boxes for generic COCO object detections
 * (`useVideoObjectDetection`) over the Scenario Playback video. Distinct
 * from `DetectionOverlay` (which renders the real PPE Compliance Engine's
 * fixed `DetectionObjectType` vocabulary): a stock COCO model can return
 * any of 80 open-ended class names ("person", "car", "chair", …), so
 * boxes here are labelled with whatever the model returned rather than
 * forced into the PPE-specific type. Purely visual — see
 * `useVideoObjectDetection`'s docstring for why this never touches risk/
 * compliance state.
 */

import { cn } from '@/lib/cn';
import type { VideoDetection } from '../hooks/useVideoObjectDetection';

export interface VideoObjectOverlayProps {
  detections: VideoDetection[];
  className?: string;
}

/** Stable colour per label so a given class reads consistently across frames. */
function colorForLabel(label: string): string {
  const palette = ['#38bdf8', '#a78bfa', '#f97316', '#22c55e', '#f472b6', '#facc15'];
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

export function VideoObjectOverlay({ detections, className }: VideoObjectOverlayProps) {
  if (detections.length === 0) return null;

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)} aria-hidden="true">
      {detections.map((detection, index) => {
        const color = colorForLabel(detection.label);
        return (
          <div
            key={`${detection.label}-${index}`}
            className="absolute border-2 rounded-sm motion-safe:animate-fade-in"
            style={{
              left: `${detection.x_min * 100}%`,
              top: `${detection.y_min * 100}%`,
              width: `${(detection.x_max - detection.x_min) * 100}%`,
              height: `${(detection.y_max - detection.y_min) * 100}%`,
              borderColor: color,
            }}
          >
            <span
              className="absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 text-2xs font-medium leading-none rounded-t-sm text-white capitalize"
              style={{ backgroundColor: color }}
            >
              {detection.label} · {Math.round(detection.confidence * 100)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
