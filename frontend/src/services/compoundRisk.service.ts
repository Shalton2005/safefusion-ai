import { createService } from './base.service';
import type { CompoundRiskAssessment, RiskScoreCalculationResult, RiskStatus, ZoneRiskResult } from '@/types';
import type { SeverityLevel } from '@/constants';
import type { RequestOptions } from '@/api/types';

const base = createService<RiskScoreCalculationResult>('/risk-scores');

const RISK_LEVEL_ORDER: Record<SeverityLevel, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const STATUS_BY_LEVEL: Record<SeverityLevel, RiskStatus> = {
  low:      'safe',
  medium:   'safe',
  high:     'warning',
  critical: 'critical',
};

/** Reduces the per-zone engine output into a single card-friendly assessment, keyed on the highest-risk zone. */
function toCompoundRiskAssessment(result: RiskScoreCalculationResult): CompoundRiskAssessment {
  const worst: ZoneRiskResult | undefined = result.results.reduce<ZoneRiskResult | undefined>(
    (acc, zone) => (!acc || RISK_LEVEL_ORDER[zone.risk_level] > RISK_LEVEL_ORDER[acc.risk_level] ? zone : acc),
    undefined,
  );

  return {
    risk_score: worst?.score ?? 0,
    risk_level: worst?.risk_level ?? 'low',
    triggered_rules_count: result.results.reduce((sum, zone) => sum + zone.contributing_factors.length, 0),
    status: STATUS_BY_LEVEL[worst?.risk_level ?? 'low'],
  };
}

export const compoundRiskService = {
  /** Runs the compound risk engine and reduces it to a single overall assessment. */
  getAssessment: async (options?: RequestOptions): Promise<CompoundRiskAssessment> => {
    const { data } = await base.post<RiskScoreCalculationResult>('calculate', undefined, {
      ...options,
      params: { persist: false },
    });
    return toCompoundRiskAssessment(data);
  },
};
