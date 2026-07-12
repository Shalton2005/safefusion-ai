import { createService } from './base.service';
import type { EmergencyActionItem, EmergencyResponseResult, EmergencyStatus } from '@/types';
import type { RequestOptions } from '@/api/types';

const base = createService<EmergencyResponseResult>('/emergency');

/**
 * Flattens the per-zone dispatched-action result into a single ordered
 * list. Order is exactly as returned by the backend (already priority-
 * ranked by the Emergency Response engine) — never re-sorted or
 * generated client-side.
 */
function toActionItems(result: EmergencyResponseResult): EmergencyActionItem[] {
  return result.results.flatMap((zone) =>
    zone.actions.map((match, index) => ({
      zone: zone.zone,
      risk_level: zone.risk_level,
      action: match.action,
      triggered_by_rule: match.triggered_by_rule,
      explanation: match.explanation,
      order: index + 1,
    })),
  );
}

export const emergencyResponseService = {
  /** Dispatched emergency actions for each affected zone (`GET /emergency/actions`). */
  getActions: async (options?: RequestOptions): Promise<EmergencyResponseResult> => {
    const { data } = await base.get<EmergencyResponseResult>('actions', undefined, options);
    return data;
  },

  /** Plant-wide emergency risk snapshot (`GET /emergency/status`). */
  getStatus: async (options?: RequestOptions): Promise<EmergencyStatus> => {
    const { data } = await base.get<EmergencyStatus>('status', undefined, options);
    return data;
  },

  /** Pure reducer, exported so a shared fetch can derive the flattened list without re-fetching. */
  toActionItems,
};
