import { alertsService } from './alerts.service';
import { compoundRiskService } from './compoundRisk.service';
import type { AlertRecord, RiskScoreRecord, SafetyTimelineEvent, SafetyTimelineEventType } from '@/types';
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
};

function alertToEvent(alert: AlertRecord): SafetyTimelineEvent | null {
  const type = EVENT_TYPE_BY_SOURCE[alert.source];
  if (!type) return null;

  return {
    id: alert.id,
    type,
    label: EVENT_LABEL[type],
    description: alert.message,
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
    description: record.recommendation ?? record.contributing_factors ?? 'Compound risk assessment generated.',
    severity: record.risk_level,
    timestamp: record.analyzed_at,
    zone: record.zone,
  };
}

/** Merges already-fetched alerts and risk-score records into one chronological (newest-first) feed. Pure — takes no fetch of its own, so a caller that already holds alert data (e.g. from a shared `useRecentAlerts()`) can reuse it here instead of refetching. */
function mergeTimeline(alerts: AlertRecord[], riskScores: RiskScoreRecord[], limit: number): SafetyTimelineEvent[] {
  const events = [
    ...alerts.map(alertToEvent).filter((e): e is SafetyTimelineEvent => e !== null),
    ...riskScores.map(riskScoreToEvent),
  ];

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events.slice(0, limit);
}

export const safetyTimelineService = {
  /** Pure merge of pre-fetched alert + risk-score records — see `mergeTimeline`. */
  mergeTimeline,

  /** Chronological (newest-first) feed of real safety events, merged from `GET /alerts` and `GET /risk-scores`. Fetches both itself — prefer `mergeTimeline` when the caller already has alert data from elsewhere on the page. */
  getTimeline: async (
    params?: { limit?: number },
    options?: RequestOptions,
  ): Promise<SafetyTimelineEvent[]> => {
    const limit = params?.limit ?? 50;

    const [alertsRes, riskScoresRes] = await Promise.all([
      alertsService.getRecentAlerts({ skip: 0, limit }, options),
      compoundRiskService.getRecent({ skip: 0, limit }, options),
    ]);

    return mergeTimeline(alertsRes.data, riskScoresRes.data, limit);
  },
};
