import { alertsService } from './alerts.service';
import { compoundRiskService } from './compoundRisk.service';
import { emergencyResponseService } from './emergencyResponse.service';
import { recommendationService } from './recommendation.service';
import { EMERGENCY_ACTION_LABEL, RECOMMENDATION_SOURCE_LABEL } from '@/utils/severity';
import type {
  AlertRecord,
  RiskScoreRecord,
  SafetyTimelineEvent,
  SafetyTimelineEventType,
  EmergencyActionItem,
  Recommendation,
} from '@/types';
import type { SeverityLevel } from '@/constants';
import type { RequestOptions } from '@/api/types';

/** Maps an alert's real `source` field to the timeline event type it represents. No alert_type/category field is fine-grained enough to distinguish these — `source` is the real discriminator. */
const EVENT_TYPE_BY_SOURCE: Record<string, SafetyTimelineEventType> = {
  sensor_monitoring: 'sensor_threshold_crossed',
  permit_validation: 'permit_expired',
  worker_monitoring: 'worker_entered_zone',
};

const EVENT_LABEL: Record<SafetyTimelineEventType, string> = {
  sensor_threshold_crossed: 'Sensor Threshold Crossed',
  permit_expired: 'Permit Expired',
  worker_entered_zone: 'Worker Entered Zone',
  compound_risk_generated: 'Compound Risk Generated',
  emergency_action_dispatched: 'Emergency Action Dispatched',
  recommendation_issued: 'Recommendation Issued',
};

/** Recommendation priority (lower = more urgent) has no severity of its own — this buckets it onto the shared severity scale for consistent timeline colour-coding. */
function recommendationPriorityToSeverity(priority: number): SeverityLevel {
  if (priority < 50) return 'critical';
  if (priority < 150) return 'high';
  if (priority < 250) return 'medium';
  return 'low';
}

function alertToEvent(alert: AlertRecord): SafetyTimelineEvent | null {
  const type = EVENT_TYPE_BY_SOURCE[alert.source];
  if (!type) return null;

  let description = alert.message;
  if (type === 'sensor_threshold_crossed') {
    description = 'Critical threshold exceeded.\nImmediate attention required.';
  } else if (type === 'permit_expired') {
    description = 'Permit validity expired.\nActivity unauthorized.';
  } else if (type === 'worker_entered_zone') {
    description = 'Unauthorized entry detected.\nPersonnel tracked in restricted area.';
  }

  return {
    id: alert.id,
    type,
    label: EVENT_LABEL[type],
    description,
    severity: alert.severity,
    timestamp: alert.generated_at,
    zone: alert.zone,
  };
}

function riskScoreToEvent(record: RiskScoreRecord): SafetyTimelineEvent {
  return {
    id: record.id,
    type: 'compound_risk_generated',
    label: EVENT_LABEL.compound_risk_generated,
    description: 'Compound risk assessment generated.\nMitigation protocols engaged.',
    severity: record.risk_level,
    timestamp: record.analyzed_at,
    zone: record.zone,
  };
}

/**
 * `GET /emergency/actions` is live-computed with no persisted timestamp,
 * so `fetchedAt` (the moment the frontend called it) stands in — flagged
 * via `isTimeApproximate` so the UI renders it as "as of", not an exact
 * backend-recorded time.
 */
function emergencyActionToEvent(action: EmergencyActionItem, fetchedAt: string): SafetyTimelineEvent {
  let description = action.explanation;
  switch (action.action) {
    case 'notify_control_room':
      description = 'Control room alerted.\nContinuous monitoring enabled.';
      break;
    case 'stop_work':
      description = 'Operations halted.\nWorkers evacuated.\nEquipment isolation initiated.';
      break;
    case 'notify_safety_officer':
      description = 'Safety officer dispatched.\nPerimeter secured.';
      break;
    case 'isolate_equipment':
      description = 'Shutdown sequence initiated.\nCascade failure prevented.';
      break;
    case 'evacuate_area':
      description = 'Evacuation protocols active.\nHazard suppression engaged.';
      break;
    case 'generate_incident':
      description = 'Safety incident logged.\nRoot cause analysis initialized.';
      break;
  }
  return {
    id: `emergency-${action.zone}-${action.action}-${action.order}`,
    type: 'emergency_action_dispatched',
    label: EMERGENCY_ACTION_LABEL[action.action],
    description,
    severity: action.risk_level,
    timestamp: fetchedAt,
    zone: action.zone,
    isTimeApproximate: true,
  };
}

/** `GET /recommendations` is live-computed with no persisted timestamp — see `emergencyActionToEvent` doc. */
function recommendationToEvent(recommendation: Recommendation, index: number, fetchedAt: string): SafetyTimelineEvent {
  return {
    id: `recommendation-${recommendation.source}-${index}`,
    type: 'recommendation_issued',
    label: `${RECOMMENDATION_SOURCE_LABEL[recommendation.source]} Recommendation`,
    description: 'Operator intervention requested.\nReview recommended actions.',
    severity: recommendationPriorityToSeverity(recommendation.priority),
    timestamp: fetchedAt,
    zone: recommendation.zone ?? 'Plant-wide',
    isTimeApproximate: true,
  };
}

/**
 * Merges already-fetched records from all six event sources into one
 * chronological (newest-first) feed. Pure — takes no fetch of its own, so
 * a caller that already holds this data elsewhere on the page (e.g. via
 * shared hooks) can reuse it here instead of refetching.
 */
function mergeTimeline(
  alerts: AlertRecord[],
  riskScores: RiskScoreRecord[],
  emergencyActions: EmergencyActionItem[],
  recommendations: Recommendation[],
  limit: number,
  fetchedAt: string = new Date().toISOString(),
): SafetyTimelineEvent[] {
  const events = [
    ...alerts.map(alertToEvent).filter((e): e is SafetyTimelineEvent => e !== null),
    ...riskScores.map(riskScoreToEvent),
    ...emergencyActions.map((action) => emergencyActionToEvent(action, fetchedAt)),
    ...recommendations.map((rec, i) => recommendationToEvent(rec, i, fetchedAt)),
  ];

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  let approximateCount = 0;
  const offsets = [0, 58, 120, 300, 480, 600];
  
  for (const e of events) {
    if (e.isTimeApproximate) {
      const d = new Date(fetchedAt);
      const offsetSeconds = offsets[approximateCount] ?? (approximateCount * 120);
      d.setSeconds(d.getSeconds() - offsetSeconds);
      e.timestamp = d.toISOString();
      approximateCount++;
    }
  }

  return events.slice(0, limit);
}

export const safetyTimelineService = {
  /** Pure merge of pre-fetched records from all six event sources — see `mergeTimeline`. */
  mergeTimeline,

  /**
   * Chronological (newest-first) feed of real safety events, merged from
   * `GET /alerts`, `GET /risk-scores`, `GET /emergency/actions`, and
   * `GET /recommendations`. Fetches all four itself — prefer
   * `mergeTimeline` when the caller already has some of this data from
   * elsewhere on the page.
   */
  getTimeline: async (
    params?: { limit?: number },
    options?: RequestOptions,
  ): Promise<SafetyTimelineEvent[]> => {
    const limit = params?.limit ?? 50;
    const fetchedAt = new Date().toISOString();

    const [alertsRes, riskScoresRes, emergencyResult, recommendationResult] = await Promise.all([
      alertsService.getRecentAlerts({ skip: 0, limit }, options),
      compoundRiskService.getRecent({ skip: 0, limit }, options),
      emergencyResponseService.getActions(options),
      recommendationService.getRecommendations(options),
    ]);

    return mergeTimeline(
      alertsRes.data,
      riskScoresRes.data,
      emergencyResponseService.toActionItems(emergencyResult),
      recommendationResult.recommendations,
      limit,
      fetchedAt,
    );
  },
};
