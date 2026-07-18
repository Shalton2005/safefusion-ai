/**
 * AIRecommendationCard types
 *
 * A dedicated contract for AI-surfaced recommendations — distinct from
 * the existing `Recommendation` type in `@/types` (which mirrors
 * `GET /recommendations` exactly: a numeric sort-order `priority`,
 * `message`/`reason`/`zone`/`source`, no title/confidence/action-type).
 * This shape favours generality so it can render a recommendation from
 * any AI-surfaced source — an engine result, a Copilot answer, a future
 * dedicated recommendations API — without forcing today's simpler
 * `/recommendations` response into fields it doesn't have.
 *
 * Purely a display contract: `AIRecommendationCard` never generates or
 * infers any of these fields, only renders what it's given.
 */

import type { SeverityLevel } from '@/constants';

/** Bucketed priority — reuses the app-wide `SeverityLevel` vocabulary (low/medium/high/critical) and its existing badge colour mapping. */
type AIRecommendationPriority = SeverityLevel;

export interface AIRecommendation {
  id: string;
  priority: AIRecommendationPriority;
  title: string;
  description: string;
  /** Zone, system, or plant area this recommendation applies to. */
  affectedArea: string;
  /** 0-100 confidence the backend reports for this recommendation. */
  confidence: number;
  /** Free-text action category, e.g. "Inspection", "Maintenance", "Policy Update" — open-ended, not a closed enum, since a recommendation can call for any kind of action. */
  actionType: string;
}
