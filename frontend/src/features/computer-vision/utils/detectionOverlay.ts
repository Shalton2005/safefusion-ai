/**
 * Presentational config for `DetectionOverlay` — label and colour per
 * detected object class. Single source of truth, reuse instead of
 * redefining per component (same convention as `src/utils/severity.ts`).
 */

import type { DetectionObjectType } from '../types';

/** Human-readable label for each detection object type. */
export const DETECTION_TYPE_LABEL: Record<DetectionObjectType, string> = {
  helmet:                 'Helmet',
  safety_vest:            'Safety Vest',
  person:                 'Person',
  fire:                   'Fire',
  smoke:                  'Smoke',
  vehicle:                'Vehicle',
  restricted_area_entry:  'Restricted Area Entry',
};

/**
 * Bounding-box + label colour per detection type — compliant PPE items
 * render green, hazards render red/orange, neutral tracking classes
 * (person, vehicle) render blue. Fixed hex values, not `--sf-*` theme
 * tokens: these annotate a live video frame, not app chrome, so they
 * must stay the same vivid, legible colour in both light and dark mode
 * rather than following the surface/text palette shift.
 */
export const DETECTION_TYPE_COLOR: Record<DetectionObjectType, string> = {
  helmet:                 '#22c55e',
  safety_vest:            '#22c55e',
  person:                 '#38bdf8',
  fire:                   '#ef4444',
  smoke:                  '#f97316',
  vehicle:                '#a78bfa',
  restricted_area_entry:  '#ef4444',
};
