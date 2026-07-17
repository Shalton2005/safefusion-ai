/**
 * statusColor
 *
 * Single source of truth for the raw color values this feature needs
 * outside of `Badge` (inline SVG/canvas styling in `WorkflowGraph` and
 * `ConfidenceGauge`, where a Tailwind class or `Badge` variant string
 * can't be used). Resolves to this project's real status CSS custom
 * properties — `--sf-safe` / `--sf-caution` / `--sf-danger` (defined in
 * `src/styles/globals.css`, themed per light/dark mode) — never a
 * project-invented `-500` suffix, which does not exist and would
 * silently fall back to the hardcoded default value in both themes.
 */

import { confidenceTier } from '@/utils/severity';
import type { AIAgentStatus, AISupervisorProcessingState } from '../types';

/**
 * Re-exported for this feature's existing import path
 * (`../utils/statusColor`) — the actual thresholds live in
 * `@/utils/severity` (the app-wide single source of truth), not here.
 */
export { confidenceTier };

/** CSS-variable color for a confidence tier, with the same fallback hex used elsewhere in this feature. */
export const CONFIDENCE_TIER_COLOR: Record<ReturnType<typeof confidenceTier>, string> = {
  safe: 'var(--sf-safe, #22c55e)',
  caution: 'var(--sf-caution, #f97316)',
  danger: 'var(--sf-danger, #ef4444)',
};

/** Agent lifecycle status → raw color, for `WorkflowGraph`'s SVG node/edge styling. Semantically matches `AIStatusBadge`'s `AGENT_STATUS_VARIANT` (success/warning/primary/danger/secondary), just expressed as a color instead of a `Badge` variant. */
export const AGENT_STATUS_COLOR: Record<AIAgentStatus, string> = {
  completed: 'var(--sf-safe, #22c55e)',
  waiting: 'var(--sf-caution, #f97316)',
  running: 'var(--sf-info, #3b82f6)',
  failed: 'var(--sf-danger, #ef4444)',
  idle: 'var(--sf-text-tertiary)',
};

/** Overall processing state → raw color, for `WorkflowGraph`'s supervisor node. Semantically matches `AIStatusBadge`'s `PROCESSING_STATE_VARIANT`. */
export const PROCESSING_STATE_COLOR: Record<AISupervisorProcessingState, string> = {
  idle: 'var(--sf-safe, #22c55e)',
  processing: 'var(--sf-info, #3b82f6)',
  action_required: 'var(--sf-danger, #ef4444)',
  error: 'var(--sf-danger, #ef4444)',
};
