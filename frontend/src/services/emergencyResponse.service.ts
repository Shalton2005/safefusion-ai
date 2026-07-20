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
    zone.actions.map((match, index) => {
      let explanation = match.explanation;
      switch (match.action) {
        case 'stop_work':
          explanation = `Operations halted in ${zone.zone} after compound risk exceeded operational safety threshold. Safety personnel notified and equipment isolation initiated.`;
          break;
        case 'evacuate_area':
          explanation = `Mandatory evacuation protocols initiated for ${zone.zone}. Area containment and hazard suppression systems have been engaged.`;
          break;
        case 'notify_safety_officer':
          explanation = `Safety officer and on-site responders dispatched to ${zone.zone} to verify hazard containment and secure the perimeter.`;
          break;
        case 'notify_control_room':
          explanation = `Control room alerted to elevated risk vectors in ${zone.zone}. Monitoring protocols escalated to continuous feed.`;
          break;
        case 'isolate_equipment':
          explanation = `Automated shutdown sequence initiated for critical machinery in ${zone.zone} to prevent cascade failure.`;
          break;
        case 'generate_incident':
          explanation = `Formal safety incident logged for ${zone.zone}. Regulatory compliance tracking and root cause analysis initialized.`;
          break;
      }
      return {
        zone: zone.zone,
        risk_level: zone.risk_level,
        action: match.action,
        triggered_by_rule: match.triggered_by_rule,
        explanation,
        order: index + 1,
      };
    }),
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
